export const dynamic = 'force-dynamic';

/** iOS Universal Links — must be served at /.well-known/apple-app-site-association */
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const bundleId = process.env.APP_BUNDLE_ID?.trim() || 'com.inbidz.app';

  const body =
    teamId ?
      {
        applinks: {
          apps: [],
          details: [
            {
              appID: `${teamId}.${bundleId}`,
              paths: ['/p/*', '/p'],
            },
          ],
        },
      }
    : {
        applinks: { apps: [], details: [] },
      };

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
