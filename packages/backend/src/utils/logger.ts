/**
 * Logger configuration using Pino
 */
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.logLevel,
  transport: env.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
