/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createApp } from './server/app.ts';
import { config } from './server/config.ts';
import { initializeDatabase, sqlite } from './server/db/index.ts';

initializeDatabase();

async function startServer() {
  const app = await createApp();
  const server = app.listen(config.port, config.host, () => {
    console.log(
      `[MTA University Library Collector] ${config.nodeEnv} server listening on http://${config.host}:${config.port}`,
    );
    console.log('[MTA University Library Collector] Learn • Search • Explore');
  });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => {
      try {
        sqlite.close();
      } catch {
        // already closed
      }
      process.exit(0);
    });
    // Do not hang forever on an open keep-alive connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[MTA University Library Collector] Server failed to start:', (err as Error).message);
  process.exit(1);
});
