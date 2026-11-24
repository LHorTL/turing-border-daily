import { register } from 'tsx/esm/api';
register();

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const clientDistDir = path.join(projectRoot, 'dist', 'client');

const { createApiRouter } = await import('../src/server/routes/api.ts');

// In-memory Redis matching @devvit/web/server redis semantics (returns undefined on missing key!)
const kv = new Map();
const mockComments = [];

const mockRedis = {
  async get(key) {
    return kv.has(key) ? kv.get(key) : undefined;
  },
  async set(key, value) {
    kv.set(key, String(value));
    return 'OK';
  },
  async incrBy(key, delta) {
    const cur = kv.has(key) ? Number.parseInt(kv.get(key), 10) || 0 : 0;
    const next = cur + delta;
    kv.set(key, String(next));
    return next;
  },
};

const mockReddit = {
  async getCurrentUsername() {
    return process.env.PREVIEW_USERNAME || 'local_inspector';
  },
  async submitComment({ id, text }) {
    const commentId = `t1_local_${mockComments.length + 1}`;
    mockComments.push({ id: commentId, postId: id, text, createdAt: new Date().toISOString() });
    return { id: commentId };
  },
  async submitCustomPost({ title }) {
    return { id: `t3_local_${Date.now()}`, title };
  },
};

const app = new Hono();

const api = createApiRouter({
  redis: mockRedis,
  reddit: mockReddit,
  getContext: () => ({
    postId: 't3_local_daily_preview',
    subredditName: 'r/TuringBorderPreview',
    userId: 'u_local_inspector',
    username: process.env.PREVIEW_USERNAME || 'local_inspector',
  }),
});

app.route('/api', api);

// Local preview diagnostic endpoint (ONLY in preview-local.mjs, never in production bundle)
app.get('/__preview/comments', (c) => c.json({ comments: mockComments }));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

app.get('*', (c) => {
  const reqPath = c.req.path === '/' ? '/splash.html' : c.req.path;
  const safePath = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(clientDistDir, safePath);

  if (!fullPath.startsWith(clientDistDir) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    return c.text('Not Found. Run `npm run build` before `npm run preview:local`.', 404);
  }

  const ext = path.extname(fullPath).toLowerCase();
  const body = fs.readFileSync(fullPath);
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' },
  });
});

const port = Number(process.env.PORT || 4173);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Turing Border local preview listening at http://127.0.0.1:${info.port}`);
  console.log(`  Splash (inline card): http://127.0.0.1:${info.port}/splash.html`);
  console.log(`  Game (expanded desk): http://127.0.0.1:${info.port}/game.html`);
});
