import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createDailyPost } from '../core/post';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req
      .json<Partial<OnAppInstallRequest>>()
      .catch(() => ({ type: 'OnAppInstall' as const }));
    const post = await createDailyPost();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Daily check posted in r/${context.subredditName} (${post.id}, trigger: ${input.type ?? 'OnAppInstall'})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error on app install trigger: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create initial daily check post',
      },
      400
    );
  }
});
