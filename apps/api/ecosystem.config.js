const path = require('path');
const fs = require('fs');

const apiDir = path.resolve(__dirname);
const repoRoot = path.resolve(apiDir, '../..');

/** Monorepo hoists `next` to repo root — not apps/api/node_modules. */
function resolveNextBin() {
  const candidates = [
    path.join(repoRoot, 'node_modules/next/dist/bin/next'),
    path.join(apiDir, 'node_modules/next/dist/bin/next'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

module.exports = {
  apps: [
    {
      name: 'inbidz-api',
      script: resolveNextBin(),
      args: 'start -p 3003',
      cwd: apiDir,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3003,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003,
        // Prefer apps/api/.env.local on the server for DB, JWT, R2, Razorpay, etc.
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', '.next', '.next-staging', 'logs', '.git'],
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000,
    },
  ],
};
