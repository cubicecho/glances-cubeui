import { HttpStatus } from '../../server/core/wire.ts';
import { createGlancesClient } from '../../server/glances/client.ts';
import { fixtureReading, GLANCES_PAYLOAD, hostNamed, SAMPLED_AT, TOP_PROCESS_COUNT } from '../helpers.ts';

/** One call the fake fetch received. */
interface FetchCall {
  url: string;
  authorization: string | null;
}

/**
 * Builds a fetch that records its calls and answers with one response.
 *
 * @param respond - Builds the response.
 * @returns The fetch and the calls it saw.
 */
function recordingFetch(respond: () => Response): { fetch: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fake: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), authorization: new Headers(init?.headers).get('authorization') });
    return respond();
  };
  return { fetch: fake, calls };
}

const settings = { topProcessCount: TOP_PROCESS_COUNT };
const now = () => SAMPLED_AT;

describe('createGlancesClient', () => {
  it('reads /api/4/all into a reading stamped by the clock', async () => {
    const { fetch, calls } = recordingFetch(() => Response.json(GLANCES_PAYLOAD));
    const reading = await createGlancesClient({ fetch, now }, settings).read(hostNamed('nas'));
    expect(calls).toEqual([{ url: 'http://nas:61208/api/4/all', authorization: null }]);
    expect(reading).toEqual(fixtureReading());
  });

  it("sends the host's credentials", async () => {
    const { fetch, calls } = recordingFetch(() => Response.json(GLANCES_PAYLOAD));
    const host = { ...hostNamed('nas'), authorization: 'Basic abc' };
    await createGlancesClient({ fetch, now }, settings).read(host);
    expect(calls[0]?.authorization).toBe(host.authorization);
  });

  it('fails with the status when Glances refuses', async () => {
    const { fetch } = recordingFetch(() => new Response('nope', { status: HttpStatus.NotFound }));
    const client = createGlancesClient({ fetch, now }, settings);
    await expect(client.read(hostNamed('nas'))).rejects.toThrow(`HTTP ${HttpStatus.NotFound}`);
  });
});
