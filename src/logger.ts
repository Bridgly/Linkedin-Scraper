import type { FastifyBaseLogger } from 'fastify';
import { pino } from 'pino';

export const logger: FastifyBaseLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});
