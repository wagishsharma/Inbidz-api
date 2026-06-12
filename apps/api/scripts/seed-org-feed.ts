import path from 'path';
import { config } from 'dotenv';

// Load env before database module reads ORG_DB_* / DB_*.
config({ path: path.join(__dirname, '../.env.local') });
config({ path: path.join(__dirname, '../.env') });

function parseArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return fallback;
  const n = Number(hit.slice(prefix.length));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function main() {
  const { isOrgDbConfigured } = await import('../lib/database');
  const { seedOrgFeed } = await import('../lib/org-feed-seed');

  const dryRun = process.argv.includes('--dry-run');
  const orgUrlsOnly = process.argv.includes('--org-urls-only');
  const maxArtists = parseArg('max-artists', 40);
  const artworksPerArtist = parseArg('per-artist', 3);

  if (!isOrgDbConfigured()) {
    console.error(
      'ORG_DB_USER and ORG_DB_NAME must be set in apps/api/.env.local (connection to inbidz_org).'
    );
    process.exit(1);
  }

  console.log(
    `Seeding org artists → app feed (artists=${maxArtists}, per-artist=${artworksPerArtist}${dryRun ? ', dry-run' : ''}${orgUrlsOnly ? ', org-urls-only' : ''})…`
  );
  console.log(
    `Org DB: ${process.env.ORG_DB_USER}@${process.env.ORG_DB_HOST || process.env.DB_HOST || 'localhost'}/${process.env.ORG_DB_NAME}`
  );

  const result = await seedOrgFeed({ maxArtists, artworksPerArtist, dryRun, orgUrlsOnly });

  console.log(JSON.stringify(result, null, 2));

  if (result.postsCreated === 0 && !dryRun && result.artistsConsidered === 0) {
    console.error('No org artists found. Check ORG_DB_* credentials and grants on artworks.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
