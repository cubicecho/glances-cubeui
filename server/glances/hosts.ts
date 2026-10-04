/** One Glances server to watch. */
export interface GlancesHost {
  /** The operator's name for it: unique, and what the URL of its page is built from. */
  name: string;
  /** Where its REST API is, without credentials or a trailing slash. */
  baseUrl: string;
  /** The `Authorization` header to send, or null when the server asks for none. */
  authorization: string | null;
}

/** What `GLANCES_HOSTS` should look like, for error messages. */
const EXPECTED_FORM = 'GLANCES_HOSTS="nas=http://nas:61208,pi=http://user:password@pi:61208"';
const PAIR_SEPARATOR = ',';
const NAME_SEPARATOR = '=';
/** Letters, digits, dot, dash and underscore: safe in a URL path without escaping. */
const HOST_NAME = /^[\w.-]+$/;
const WEB_PROTOCOLS = ['http:', 'https:'];

/**
 * Builds the error for a `GLANCES_HOSTS` value that can't be used.
 *
 * @param problem - What is wrong, as a sentence.
 * @returns The error, ending with the expected form.
 */
function hostsError(problem: string): Error {
  return new Error(`${problem} Expected comma-separated name=url pairs, for example ${EXPECTED_FORM}.`);
}

/**
 * Builds a basic-auth header from the credentials in a URL.
 *
 * @param url - The URL as the operator wrote it.
 * @returns The header value, or null when the URL has no username.
 */
function authorizationOf(url: URL): string | null {
  if (url.username === '') {
    return null;
  }
  const credentials = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Parses one `name=url` pair.
 *
 * @param pair - The pair, trimmed.
 * @returns The host.
 * @throws When the name or the URL can't be used.
 */
function parseHost(pair: string): GlancesHost {
  const separatorAt = pair.indexOf(NAME_SEPARATOR);
  if (separatorAt < 0) {
    throw hostsError(`"${pair}" has no "=" between a name and a URL.`);
  }
  const name = pair.slice(0, separatorAt).trim();
  const rawUrl = pair.slice(separatorAt + 1).trim();
  const isNameUsable = HOST_NAME.test(name);
  if (isNameUsable === false) {
    throw hostsError(`The host name "${name}" may only hold letters, digits, ".", "-" and "_".`);
  }
  const isUrlParseable = URL.canParse(rawUrl);
  if (isUrlParseable === false) {
    throw hostsError(`The URL "${rawUrl}" for host "${name}" is not a URL.`);
  }
  const url = new URL(rawUrl);
  const isWebUrl = WEB_PROTOCOLS.includes(url.protocol);
  if (isWebUrl === false) {
    throw hostsError(`The URL for host "${name}" must start with http:// or https://.`);
  }
  const path = url.pathname.replace(/\/+$/, '');
  return { name, baseUrl: `${url.origin}${path}`, authorization: authorizationOf(url) };
}

/**
 * Parses the list of Glances servers to watch.
 *
 * @param value - The raw `GLANCES_HOSTS` value.
 * @returns The hosts, in the order written.
 * @throws When the value is empty, malformed, or names a host twice.
 */
export function parseHosts(value: string): GlancesHost[] {
  const pairs = value
    .split(PAIR_SEPARATOR)
    .map((pair) => pair.trim())
    .filter((pair) => pair !== '');
  if (pairs.length === 0) {
    throw hostsError('GLANCES_HOSTS is not set, so there is nothing to watch.');
  }
  const hosts = pairs.map(parseHost);
  const names = hosts.map((host) => host.name);
  const repeated = names.find((name, index) => names.indexOf(name) !== index);
  if (repeated !== undefined) {
    throw hostsError(`The host name "${repeated}" is used twice.`);
  }
  return hosts;
}
