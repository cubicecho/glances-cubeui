/** How the HTTP server listens and stops. */
export interface HttpSettings {
  /** Port to listen on. `PORT` overrides it. */
  port: number;
  /** Largest request body, in the form express parses. */
  bodyLimit: string;
  /** How long in-flight requests get to finish on shutdown, in seconds. */
  drainSeconds: number;
  /** When shutdown gives up and exits, in seconds. Below Docker's 10 s stop grace. */
  shutdownDeadlineSeconds: number;
  /** Express `trust proxy`. `TRUST_PROXY` overrides it. */
  trustProxy: boolean | number | string;
}

export const HTTP_DEFAULTS: Readonly<HttpSettings> = Object.freeze({
  port: 3000,
  bodyLimit: '1mb',
  drainSeconds: 5,
  shutdownDeadlineSeconds: 8,
  trustProxy: false,
});

/** Bounds on one GraphQL operation. */
export interface OperationLimitSettings {
  /** Deepest selection allowed. */
  maxDepth: number;
  /** Most aliases in one document. */
  maxAliases: number;
  /** Highest cost an operation may have. */
  maxCost: number;
  /** Cost of a field with no hint of its own. */
  defaultFieldCost: number;
}

export const OPERATION_LIMIT_DEFAULTS: Readonly<OperationLimitSettings> = Object.freeze({
  maxDepth: 8,
  maxAliases: 15,
  maxCost: 10_000,
  defaultFieldCost: 1,
});

/** How Glances hosts are sampled and how much is remembered. */
export interface SamplerSettings {
  /** Time between two samples of a host, in seconds. */
  intervalSeconds: number;
  /** How long one Glances request may take, in seconds. */
  requestTimeoutSeconds: number;
  /** How many samples are kept per host. At the default interval this is ten minutes. */
  historySampleCount: number;
  /** How many processes a reading keeps, busiest first. */
  topProcessCount: number;
}

export const SAMPLER_DEFAULTS: Readonly<SamplerSettings> = Object.freeze({
  intervalSeconds: 3,
  requestTimeoutSeconds: 5,
  historySampleCount: 200,
  topProcessCount: 15,
});
