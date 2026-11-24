import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { context, createServer, getServerPort, reddit, redis } from '@devvit/web/server';
import { createApiRouter } from './routes/api';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';
import { scheduler } from './routes/scheduler';

const app = new Hono();
const internal = new Hono();

const api = createApiRouter({
  redis: {
    get: (key) => redis.get(key),
    set: (key, value) => redis.set(key, value),
    incrBy: (key, value) => redis.incrBy(key, value),
  },
  reddit: {
    getCurrentUsername: () => reddit.getCurrentUsername(),
    submitComment: (opts) =>
      reddit.submitComment({
        id: opts.id as `t3_${string}` | `t1_${string}`,
        text: opts.text,
        runAs: 'USER',
      }),
    submitCustomPost: (opts) => reddit.submitCustomPost(opts),
  },
  getContext: () => ({
    postId: context.postId,
    subredditName: context.subredditName,
    userId: context.userId,
    username: context.username,
  }),
});

internal.route('/menu', menu);
internal.route('/triggers', triggers);
internal.route('/cron', scheduler);

app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
