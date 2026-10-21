// Spotify OAuth with PKCE (Proof Key for Code Exchange)
// Configured for https://127.0.0.1:5173/

export const clientId = 'f7832c9be85f44dab49e9f988b57bc1f';
export const redirectUri = 'https://127.0.0.1:5173/';

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export async function loginWithSpotify() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  window.localStorage.setItem('code_verifier', codeVerifier);

  const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state user-read-currently-playing user-library-read';
  const authUrl = new URL("https://accounts.spotify.com/authorize");

  window.localStorage.setItem('spotify_auth_state', 'redirected');

  const params = {
    response_type: 'code',
    client_id: clientId,
    scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
}

export function getAccessToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiresAt = localStorage.getItem('spotify_token_expires_at');
  if (token && expiresAt && Date.now() >= parseInt(expiresAt)) {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expires_at');
    return null;
  }
  return token;
}

export async function fetchUserProfile(token) {
  try {
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      // Token expired or revoked
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_token_expires_at');
      return null;
    }
    if (!res.ok) throw new Error('Failed to fetch profile');
    const profile = await res.json();
    if (profile) {
      if (profile.product) localStorage.setItem('spotify_user_product', profile.product);
      if (profile.display_name) localStorage.setItem('spotify_user_display_name', profile.display_name);
      if (profile.images && profile.images.length > 0) {
        localStorage.setItem('spotify_user_image', profile.images[0].url);
      }
      return profile;
    }
  } catch (err) {
    console.warn("Spotify user profile status:", err);
  }
  return null;
}

export function logoutSpotify() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_token_expires_at');
  localStorage.removeItem('spotify_user_product');
  localStorage.removeItem('spotify_user_display_name');
  localStorage.removeItem('spotify_user_image');
  window.location.href = redirectUri;
}

export async function getToken(code) {
  const codeVerifier = localStorage.getItem('code_verifier');

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  };

  try {
    const body = await fetch("https://accounts.spotify.com/api/token", payload);
    const response = await body.json();

    if (response.access_token) {
      localStorage.setItem('spotify_access_token', response.access_token);
      localStorage.setItem('spotify_token_expires_at', Date.now() + (response.expires_in * 1000));
      return response.access_token;
    } else {
      console.error("Failed to get Spotify token:", response);
    }
  } catch (e) {
    console.error("Token fetch network error:", e);
  }
  return null;
}

// Check for OAuth callback code in URL params
export async function checkAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    const token = await getToken(code);
    if (token) {
      await fetchUserProfile(token);
    }
    // Clean up code from the URL cleanly without reloading
    window.history.replaceState({}, document.title, window.location.pathname);
    return token;
  }

  const existingToken = getAccessToken();
  if (existingToken) {
    await fetchUserProfile(existingToken);
    return existingToken;
  }

  return null;
}
