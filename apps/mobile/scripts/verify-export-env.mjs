#!/usr/bin/env node
/**
 * Fail fast if LAN/dev URLs would be baked into the static web bundle.
 * Run automatically before `npm run export:web`.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const api = process.env.EXPO_PUBLIC_API_URL ?? '';
const auth = process.env.EXPO_PUBLIC_AUTH_LOGIN_URL ?? '';
const appEnv = process.env.APP_ENV ?? 'development';

const bad =
  /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.\d+\.|172\.(1[6-9]|2\d|3[01])\./i;

function check(label, value) {
  if (!value) return;
  if (bad.test(value)) {
    console.error(
      `\n❌ ${label} looks like a dev/LAN URL: ${value}\n` +
        `   Use production/staging URLs for web export.\n` +
        `   Example: npm run export:web:production\n`
    );
    process.exit(1);
  }
}

check('EXPO_PUBLIC_API_URL', api);
check('EXPO_PUBLIC_AUTH_LOGIN_URL', auth);

if (appEnv === 'development' && !api.startsWith('https://')) {
  console.warn(
    `\n⚠️  APP_ENV=development and no HTTPS EXPO_PUBLIC_API_URL.\n` +
      `   For app.inbidz.com use: npm run export:web:production\n`
  );
}

// Warn if app.config development still has LAN (read source only)
try {
  const cfg = readFileSync(join(root, 'app.config.ts'), 'utf8');
  if (/192\.168\.|172\.\d+\./.test(cfg)) {
    console.warn('⚠️  app.config.ts contains a LAN IP — remove before production export.');
  }
} catch {
  /* ignore */
}

console.log(`✓ Export env OK (APP_ENV=${appEnv}, API=${api || '(from app.config)'})`);
