import Fastify from 'fastify';
import { env } from './env';
import { logger } from './logger';
import { registerRoutes } from './routes';

/** Starts the HTTP server. */
async function main(): Promise<void> {
  const app = Fastify({ loggerInstance: logger });
  registerRoutes(app);
  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Server failed to start');
  process.exit(1);
});
