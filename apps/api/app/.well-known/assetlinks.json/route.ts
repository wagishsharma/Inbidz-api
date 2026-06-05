export const dynamic = 'force-dynamic';

/** Android App Links — must be served at /.well-known/assetlinks.json */
export async function GET() {
  const packageName = process.env.APP_BUNDLE_ID?.trim() || 'com.inbidz.app';
  const fingerprint = process.env.ANDROID_SHA256_FINGERPRINT?.trim();

  const body =
    fingerprint ?
      [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: packageName,
            sha256_cert_fingerprints: [fingerprint],
          },
        },
      ]
    : [];

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
