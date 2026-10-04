// Runs before anything listens, so a misconfigured instance fails with a sentence, not a stack trace.
import { parseHosts } from '../glances/hosts.ts';
import { glancesHosts } from './config.ts';
import { errorMessage } from './errors.ts';

try {
  parseHosts(glancesHosts());
} catch (error) {
  console.error(`[preflight] ${errorMessage(error)}`);
  process.exit(1);
}
