import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function walkFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

describe('devvit.json official schema v1 & production bundle guardrails', () => {
  const devvitPath = path.join(rootDir, 'devvit.json');
  const pkgPath = path.join(rootDir, 'package.json');
  const config = JSON.parse(fs.readFileSync(devvitPath, 'utf-8'));
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  it('matches official Devvit config-file.v1.json constraints strictly', () => {
    expect(config.$schema).toBe('https://developers.reddit.com/schema/config-file.v1.json');

    // Guardrail #1: name <= 20 chars, >= 3 chars, ^[a-z][a-z0-9-]*$
    expect(typeof config.name).toBe('string');
    expect(config.name.length).toBeGreaterThanOrEqual(3);
    expect(config.name.length).toBeLessThanOrEqual(20);
    expect(config.name).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(config.name).toBe('turing-border-daily');

    // Entrypoints
    expect(config.post.dir).toBe('dist/client');
    expect(config.post.entrypoints.default).toMatchObject({
      inline: true,
      entry: 'splash.html',
    });
    expect(config.post.entrypoints.game).toMatchObject({
      entry: 'game.html',
    });

    // Server bundle
    expect(config.server).toEqual({
      dir: 'dist/server',
      entry: 'index.cjs',
    });

    // Permissions: Redis + Reddit user SUBMIT_COMMENT, ZERO external HTTP
    expect(config.permissions.redis).toBe(true);
    expect(config.permissions.reddit).toEqual({
      enable: true,
      scope: 'user',
      asUser: ['SUBMIT_COMMENT'],
    });
    expect(config.permissions.http).toBeUndefined();

    // Menu, triggers, scheduler endpoints strictly match ^/internal/.+
    expect(Array.isArray(config.menu.items)).toBe(true);
    expect(config.menu.items.length).toBeGreaterThanOrEqual(1);
    for (const item of config.menu.items) {
      expect(item.endpoint).toMatch(/^\/internal\/.+/);
      expect(['subreddit', 'post', 'comment']).toContain(item.location);
    }

    expect(config.triggers.onAppInstall).toMatch(/^\/internal\/.+/);

    const tasks = config.scheduler?.tasks ?? {};
    const taskKeys = Object.keys(tasks);
    expect(taskKeys.length).toBeGreaterThanOrEqual(1);
    for (const key of taskKeys) {
      expect(tasks[key].endpoint).toMatch(/^\/internal\/.+/);
      expect(tasks[key].cron.split(/\s+/).length).toBeGreaterThanOrEqual(5);
    }

    // No unknown top-level keys outside official config-file.v1.json schema
    const allowedTopLevel = new Set([
      '$schema',
      'name',
      'ad',
      'media',
      'permissions',
      'post',
      'server',
      'triggers',
      'blocks',
      'menu',
      'payments',
      'forms',
      'dev',
      'scripts',
      'scheduler',
      'settings',
      'marketingAssets',
      'additionalSourceRoots',
      'sourceIgnores',
      'featureConfig',
    ]);
    for (const k of Object.keys(config)) {
      expect(allowedTopLevel.has(k)).toBe(true);
    }
  });

  it('validates against bundled official @devvit/shared-types config-file.v1.json via Ajv2020', () => {
    const schemaPath = path.join(
      rootDir,
      'node_modules',
      '@devvit',
      'shared-types',
      'schemas',
      'config-file.v1.json'
    );
    expect(fs.existsSync(schemaPath)).toBe(true);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    delete schema.properties?.payments;

    const ajv = new Ajv2020({ strict: false, allErrors: true });
    ajv.addFormat('https-url', /^https:\/\/.+/);
    const validate = ajv.compile(schema);
    const valid = validate(config);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it('declares Node >=22.12.0 engine in package.json', () => {
    expect(pkg.engines?.node).toBe('>=22.12.0');
  });

  it('emits clean built client/server bundles with ZERO dev mocks in dist/server/index.cjs', () => {
    const splashHtml = path.join(rootDir, config.post.dir, config.post.entrypoints.default.entry);
    const gameHtml = path.join(rootDir, config.post.dir, config.post.entrypoints.game.entry);
    const serverBundle = path.join(rootDir, config.server.dir, config.server.entry);

    expect(fs.existsSync(splashHtml)).toBe(true);
    expect(fs.existsSync(gameHtml)).toBe(true);
    expect(fs.existsSync(serverBundle)).toBe(true);

    const bundleText = fs.readFileSync(serverBundle, 'utf-8');
    expect(bundleText).not.toContain('preview-local');
    expect(bundleText).not.toContain('local_inspector');
    expect(bundleText).not.toContain('t3_local_daily_preview');
    expect(bundleText).not.toContain('__preview/comments');
  });

  it('enforces Anti-AI-Slop minimal-white UI rules across all client sources (AI_SLOP_HITS=0)', () => {
    const clientFiles = walkFiles(path.join(rootDir, 'src', 'client')).filter((f) =>
      /\.(tsx|ts|css|html)$/.test(f)
    );
    expect(clientFiles.length).toBeGreaterThan(0);

    const bannedPatterns = [
      /\bdark:/,
      /linear-gradient/i,
      /radial-gradient/i,
      /conic-gradient/i,
      /backdrop-filter/i,
      /backdrop-blur/i,
      /#0b1020/i,
      /#0f172a/i,
      /bg-slate-900|bg-gray-900|bg-zinc-950/,
      /box-shadow\s*:\s*(?!none)/i,
    ];

    const hits: string[] = [];
    for (const file of clientFiles) {
      const text = fs.readFileSync(file, 'utf-8');
      for (const rx of bannedPatterns) {
        if (rx.test(text)) {
          hits.push(`${path.basename(file)} matched ${rx}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
