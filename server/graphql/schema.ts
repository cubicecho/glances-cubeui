import type { GraphQLSchema } from 'graphql';
import { createSchema } from 'graphql-yoga';
import type { Context } from '../core/context.ts';
import { notFound } from '../core/errors.ts';
import type { DetailLevel } from '../glances/detail-level.ts';
import { type FilesystemRow, tidyFilesystems, viewFilesystems } from '../glances/filesystem-view.ts';
import type { Disk, NetworkInterface, Reading } from '../glances/reading.ts';
import { viewDisks, viewInterfaces } from '../glances/traffic-view.ts';
import type { HostState } from '../monitor/host-state.ts';
import { TYPE_DEFS } from './type-defs.ts';

/** Arguments of `Query.host`. */
interface HostArgs {
  name: string;
}

/** Arguments of `Subscription.hostChanged`. */
interface HostChangedArgs {
  name?: string | null;
}

/** Arguments of the `Reading` fields that take a detail level. */
interface DetailArgs {
  detail: DetailLevel;
}

/** Arguments of `Reading.filesystems`. */
interface FilesystemArgs extends DetailArgs {
  hideSystem: boolean;
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
  },
  Reading: {
    /**
     * Resolves `Reading.filesystems`.
     *
     * @param reading - The reading.
     * @param args - How much to show, and whether system storage is hidden.
     * @returns The rows of that view.
     */
    filesystems: (reading: Reading, args: FilesystemArgs): FilesystemRow[] =>
      viewFilesystems(reading.filesystems, args),
    /**
     * Resolves `Reading.filesystemCount`.
     *
     * @param reading - The reading.
     * @returns How many filesystems the fullest view has.
     */
    filesystemCount: (reading: Reading): number => tidyFilesystems(reading.filesystems).length,
    /**
     * Resolves `Reading.networkInterfaces`.
     *
     * @param reading - The reading.
     * @param args - How much to show.
     * @returns The interfaces of that view.
     */
    networkInterfaces: (reading: Reading, args: DetailArgs): NetworkInterface[] =>
      viewInterfaces(reading.networkInterfaces, args.detail),
    /**
     * Resolves `Reading.networkInterfaceCount`.
     *
     * @param reading - The reading.
     * @returns How many interfaces the fullest view has.
     */
    networkInterfaceCount: (reading: Reading): number => reading.networkInterfaces.length,
    /**
     * Resolves `Reading.disks`.
     *
     * @param reading - The reading.
     * @param args - How much to show.
     * @returns The disks of that view.
     */
    disks: (reading: Reading, args: DetailArgs): Disk[] => viewDisks(reading.disks, args.detail),
  },
  Subscription: {
    hostChanged: {
      /**
       * Subscribes to `Subscription.hostChanged`, until the client leaves.
       *
       * @param _parent - Unused.
       * @param args - The host to follow, or none for all.
       * @param ctx - Request context.
       * @returns The stream of host states.
       */
      subscribe: (_parent: unknown, args: HostChangedArgs, ctx: Context): AsyncGenerator<HostState, void, void> => {
        const name = args.name ?? null;
        if (name !== null) {
          loadHost(ctx, name);
        }
        return ctx.bus.watch(name, ctx.request?.signal);
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
