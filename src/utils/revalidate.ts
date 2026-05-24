import axios from 'axios';
import { config } from '../config/env.config';
import { logger } from './logger';

export type RevalidateType = 'blog' | 'category' | 'tag' | 'home';

/**
 * Triggers an on-demand Incremental Static Regeneration (ISR) cache purge on the frontend.
 * This runs asynchronously and does not block the thread.
 */
export const triggerFrontendRevalidation = async (type: RevalidateType, slug?: string): Promise<void> => {
  const secret = process.env.REVALIDATE_SECRET;
  const frontendUrl = config.server.frontendUrl;

  if (!secret || !frontendUrl) {
    logger.warn('Skipping frontend revalidation: REVALIDATE_SECRET or FRONTEND_URL is missing in environment.');
    return;
  }

  try {
    // Fire and forget - don't await this if calling from controller to keep response times fast
    axios.post(
      `${frontendUrl}/api/revalidate`,
      { type, slug },
      {
        headers: {
          'x-revalidate-secret': secret,
          'Content-Type': 'application/json',
        },
        timeout: 5000 // Don't hang indefinitely if frontend is down
      }
    ).then((response) => {
      logger.info(`Frontend revalidation successful for type: ${type} ${slug ? `(slug: ${slug})` : ''}`, response.data);
    }).catch((error) => {
      logger.error(`Frontend revalidation failed for type: ${type}`, error.message);
    });

  } catch (error: any) {
    logger.error('Unexpected error triggering frontend revalidation', error.message);
  }
};
