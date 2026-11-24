import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import { createDailyPost } from '../core/post';

export const scheduler = new Hono();

scheduler.post('/daily-post', async (c) => {
  try {
    const post = await createDailyPost();
    return c.json(
      {
        status: 'success',
        postId: post.id,
        subreddit: context.subredditName,
      },
      200
    );
  } catch (error) {
    console.error(`Scheduled daily post failed: ${error}`);
    return c.json(
      {
        status: 'error',
        message: 'Scheduled daily post failed',
      },
      500
    );
  }
});
