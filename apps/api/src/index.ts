import { createServer } from 'node:http';
import { createApp } from './app';
import { config } from './config';
import { attachRealtime, closeRealtime } from './realtime';

// Express handles normal requests; Socket.IO shares the same HTTP server (and port)
// and takes over connections to /socket.io/.
const server = createServer(createApp());
attachRealtime(server);

server.listen(config.port, () => {
  console.log(`CrisisLink API listening on http://localhost:${config.port}`);
});

// Graceful shutdown: close sockets, finish in-flight requests, then exit (matters in Docker/hosting).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down...`);
    void closeRealtime().then(() => server.close(() => process.exit(0)));
  });
}
