import Bull from 'bull';
import { env } from '../config/env';

function createQueue(name: string): Bull.Queue | null {
  if (!env.REDIS_URL) return null;

  // Upstash Redis uses rediss:// (TLS); ioredis handles it automatically from the URL
  return new Bull(name, env.REDIS_URL, {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });
}

export const notifyNewCaseQueue = createQueue('notify-new-case');
export const contactRequestQueue = createQueue('contact-request');
