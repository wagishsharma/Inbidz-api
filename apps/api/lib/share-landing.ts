/** Social / preview crawlers must receive the OG HTML page, not a redirect to the web app. */
export function isSharePreviewCrawler(userAgent: string): boolean {
  return /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Applebot|Pinterest|Embedly|Iframely/i.test(
    userAgent
  );
}

/**
 * When false (default), share links skip the native deep link and send users to the web app.
 * Set NATIVE_APP_READY=true after App Store / Play Store builds are live.
 */
export function isNativeAppReady(): boolean {
  const raw = process.env.NATIVE_APP_READY?.trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}
