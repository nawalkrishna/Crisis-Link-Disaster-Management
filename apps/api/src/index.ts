import { createApp } from './app';
import { config } from './config';

const server = createApp().listen(config.port, () => {
  console.log(`CrisisLink API listening on http://localhost:${config.port}`);
});

// Graceful shutdown: finish in-flight requests before exiting (matters in Docker/hosting).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  });
}
