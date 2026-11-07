import { createServer } from 'node:http';
import { createApp } from './app';
import { config } from './config';
import { prisma } from './db';
import { logger } from './lib/logger';
import { redis } from './lib/redis';
import { attachRealtime, closeRealtime } from './realtime';
import { startBackgroundWorker, stopBackgroundWorker } from './sms/worker';

// Express handles normal requests; Socket.IO shares the same HTTP server (and port)
// and takes over connections to /socket.io/.
const server = createServer(createApp());
await attachRealtime(server);
startBackgroundWorker(); // sends queued SMS, cleans up old idempotency keys

server.listen(config.port, () => {
  logger.info(`CrisisLink API listening on http://localhost:${config.port}`);
});

/**
 * GRACEFUL SHUTDOWN. When a host deploys a new version it sends SIGTERM to the old container
 * and waits a few seconds. Stop taking new work, let in-flight requests finish, close database
 * and Redis connections, then exit - instead of cutting requests off mid-way.
 */
let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  logger.info(`${signal} received, shutting down`);
  stopBackgroundWorker();
  const force = setTimeout(() => process.exit(1), 10_000); // don't hang forever
  force.unref();
  await closeRealtime(); // also stops the HTTP server accepting connections
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  await redis?.quit();
  process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => void shutdown(signal));

// Crash loudly (and let the orchestrator restart us) rather than limp on in an unknown state.
process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'unhandled promise rejection');
  process.exit(1);
});
