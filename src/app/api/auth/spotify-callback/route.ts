import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SONARA — Spotify Authentication</title>
        <style>
          body {
            background-color: #05060A;
            color: #F3F4F8;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #0B0D14;
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 16px;
            padding: 32px;
            text-align: center;
            max-width: 400px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>${error ? 'Authentication Failed' : 'Connecting to SONARA...'}</h2>
          <p>${error ? error : 'Authorization received. Returning to SoundGalaxy...'}</p>
        </div>
        <script>
          const code = ${JSON.stringify(code)};
          const state = ${JSON.stringify(state)};
          const error = ${JSON.stringify(error)};
          
          if (code && state) {
            window.opener?.postMessage({ type: 'SPOTIFY_AUTH_SUCCESS', code, state }, window.location.origin);
            setTimeout(() => {
              window.location.href = '/';
            }, 1000);
          } else {
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          }
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

