import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>
        <div id="inbidz-safe-area-probe" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

const globalStyles = `
html, body, #root {
  height: 100%;
  min-height: 100dvh;
}
body {
  background-color: #F4F5F7;
  font-family: Inter, system-ui, -apple-system, sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#inbidz-safe-area-probe {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 0;
  height: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  pointer-events: none;
  visibility: hidden;
}
* {
  box-sizing: border-box;
}
input, textarea, button {
  font-family: inherit;
}
@media (max-width: 959px) {
  /* Keep tab labels above the home-indicator filler (RN web bottom tabs) */
  [role="tablist"] {
    overflow: visible !important;
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
  }
}
`;
