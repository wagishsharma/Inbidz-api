'use client';

import { useEffect } from 'react';

type Props = {
  code: string;
  scheme: string;
  webUrl: string;
  title: string;
  /** Skip native deep link — go straight to the web app (until store builds are live). */
  webOnly?: boolean;
};

export function OpenInApp({ code, scheme, webUrl, title, webOnly = false }: Props) {
  const appUrl = `${scheme}://p/${code}`;

  useEffect(() => {
    if (webOnly) {
      window.location.replace(webUrl);
      return;
    }

    const timer = setTimeout(() => {
      window.location.href = appUrl;
    }, 100);
    return () => clearTimeout(timer);
  }, [appUrl, webOnly, webUrl]);

  if (webOnly) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <p style={{ margin: 0, color: '#a3a3a3', fontSize: 14 }}>Opening in your browser…</p>
        <a
          href={webUrl}
          style={{
            display: 'inline-block',
            background: '#4630EB',
            color: '#fff',
            padding: '14px 28px',
            borderRadius: 10,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: 16,
          }}
        >
          Continue in browser
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <a
        href={appUrl}
        style={{
          display: 'inline-block',
          background: '#4630EB',
          color: '#fff',
          padding: '14px 28px',
          borderRadius: 10,
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: 16,
        }}
      >
        Open in INBIDZ app
      </a>
      <a
        href={webUrl}
        style={{
          color: '#a3a3a3',
          fontSize: 14,
          textDecoration: 'underline',
        }}
      >
        Continue in browser
      </a>
      <p style={{ margin: 0, color: '#737373', fontSize: 12, maxWidth: 320 }}>
        Tap “Open in INBIDZ app” if you are not redirected automatically.
      </p>
    </div>
  );
}
