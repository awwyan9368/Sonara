# Spotify PKCE Integration Guide

SONARA includes a production-grade Spotify provider adapter using **Authorization Code Flow with Proof Key for Code Exchange (PKCE)**.

## Security Principles

1. **Zero Client Secret in Client Bundle**: PKCE creates a dynamic `code_verifier` and SHA-256 `code_challenge` directly in the browser's SubtleCrypto subsystem.
2. **Minimal Scopes**: Requests only the exact permissions needed to display user library nodes:
   - `user-read-private`: Fetch display name and profile image.
   - `user-top-read`: Fetch user's top artists to plot in the universe.
   - `playlist-read-private`: Discover library track affinities.
3. **Honest Fallback**: When Spotify credentials are omitted or not configured, SONARA operates in full **Demo Universe** mode with zero broken UI states.

---

## Setup Steps

### 1. Register a Spotify Developer App
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Log in and click **Create App**.
3. Set the **App Name** (e.g. `SONARA Music Universe`) and **App Description**.
4. Set the **Redirect URI** to:
   ```
   http://127.0.0.1:3001/api/auth/spotify-callback
   ```
   *(Note: Spotify requires loopback IP `127.0.0.1`. The string `localhost` is rejected by Spotify's validator).*
   Click **Add** to add a secondary URI if running on port 3000:
   ```
   http://127.0.0.1:3000/api/auth/spotify-callback
   ```
5. Select **Web API** under APIs used, accept Spotify's Developer Terms, and click **Save**.

### 2. Configure Environment Variables
Create `.env.local` in the project root:
```bash
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
```

### 3. Connect in SONARA
1. Launch the application with `npm run dev`.
2. Go to **Settings** > **Data Source**.
3. Click **Connect Spotify**. You will be redirected to Spotify's authorization consent screen and safely returned to SONARA.

