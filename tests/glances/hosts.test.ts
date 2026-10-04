import { parseHosts } from '../../server/glances/hosts.ts';

describe('parseHosts', () => {
  it('reads name=url pairs in the order written', () => {
    const hosts = parseHosts('nas=http://nas:61208, pi=https://pi.lan/glances/');
    expect(hosts).toEqual([
      { name: 'nas', baseUrl: 'http://nas:61208', authorization: null },
      { name: 'pi', baseUrl: 'https://pi.lan/glances', authorization: null },
    ]);
  });

  it('moves credentials out of the URL into a basic-auth header', () => {
    const [host] = parseHosts('nas=http://glances:s3cret@nas:61208');
    const expected = `Basic ${Buffer.from('glances:s3cret').toString('base64')}`;
    expect(host).toEqual({ name: 'nas', baseUrl: 'http://nas:61208', authorization: expected });
  });

  it.each([
    ['an empty value', '', /not set/],
    ['a pair with no name', 'http://nas:61208', /may only hold|no "="/],
    ['a value that is not a URL', 'nas=not a url', /is not a URL/],
    ['a URL that is not http', 'nas=ftp://nas', /must start with http/],
    ['a name used twice', 'nas=http://a,nas=http://b', /used twice/],
  ])('refuses %s and shows the expected form', (_case, value, problem) => {
    expect(() => parseHosts(value)).toThrow(problem);
    expect(() => parseHosts(value)).toThrow(/GLANCES_HOSTS="nas=/);
  });
});
