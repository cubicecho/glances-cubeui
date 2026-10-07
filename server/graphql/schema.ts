import type { GraphQLSchema } from 'graphql';
import { createSchema } from 'graphql-yoga';
import type { Context } from '../core/context.ts';
import { notFound } from '../core/errors.ts';
import type { HostState } from '../monitor/host-state.ts';
import { paced, paceInterval } from '../monitor/paced-watch.ts';
import { TYPE_DEFS } from './type-defs.ts';

/** Arguments of `Query.host`. */
interface HostArgs {
  name: string;
}

/** Arguments of `Subscription.hostChanged`. */
interface HostChangedArgs {
  name?: string | null;
  intervalSeconds?: number | null;
}

/**
 * Loads a host by name.
 *
 * @param ctx - Request context.
 * @param name - The host's configured name.
 * @returns The host's state.
 * @throws NOT_FOUND when no host has that name.
 */
function loadHost(ctx: Context, name: string): HostState {
  const host = ctx.store.find(name);
  if (host === null) {
    const known = ctx.store
      .all()
      .map((state) => state.name)
      .join(', ');
    throw notFound(`No host is named "${name}". Known hosts: ${known}.`);
  }
  return host;
}

const resolvers = {
  Query: {
    /**
     * Resolves `Query.hosts`.
     *
     * @param _parent - Unused.
     * @param _args - Unused.
     * @param ctx - Request context.
     * @returns Every host's state.
     */
    hosts: (_parent: unknown, _args: unknown, ctx: Context): HostState[] => ctx.store.all(),
    /**
     * Resolves `Query.host`.
     *
     * @param _parent - Unused.
     * @param args - The host's name.
     * @param ctx - Request context.
     * @returns The host's state.
     */
    host: (_parent: unknown, args: HostArgs, ctx: Context): HostState => loadHost(ctx, args.name),
    /**
     * Resolves `Query.sampleIntervalSeconds`.
     *
     * @param _parent - Unused.
     * @param _args - Unused.
     * @param ctx - Request context.
     * @returns The sampler's interval, in seconds.
     */
    sampleIntervalSeconds: (_parent: unknown, _args: unknown, ctx: Context): number => ctx.sampleIntervalSeconds,
  },
  Subscription: {
    hostChanged: {
      /**
       * Subscribes to `Subscription.hostChanged`, until the client leaves.
       *
       * @param _parent - Unused.
       * @param args - The host to follow, or none for all, and how often to hear of each.
       * @param ctx - Request context.
       * @returns The stream of host states.
       */
      subscribe: (_parent: unknown, args: HostChangedArgs, ctx: Context): AsyncGenerator<HostState, void, void> => {
        const name = args.name ?? null;
        if (name !== null) {
          loadHost(ctx, name);
        }
        const events = ctx.bus.watch(name, ctx.request?.signal);
        const sampleIntervalSeconds = ctx.sampleIntervalSeconds;
        const intervalSeconds = paceInterval(args.intervalSeconds ?? null, sampleIntervalSeconds);
        return paced(events, { intervalSeconds, sampleIntervalSeconds });
      },
      /**
       * Resolves each event to the host it carries.
       *
       * @param state - The published state.
       * @returns The same state.
       */
      resolve: (state: HostState): HostState => state,
    },
  },
};

/** The schema this server serves. */
export const schema: GraphQLSchema = createSchema<Context>({ typeDefs: TYPE_DEFS, resolvers });
