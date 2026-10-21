// Spotify Web API helper for searching albums, fetching tracks, and playback control

import { getAccessToken } from './spotifyAuth.js';

export async function searchSpotifyAlbums(query) {
  const token = getAccessToken();
  if (!token) return [];

  try {
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=8`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.albums?.items || [];
  } catch (err) {
    console.error('Spotify album search error:', err);
    return [];
  }
}

export async function getSpotifyAlbumDetails(albumId) {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Album details request failed');
    return await res.json();
  } catch (err) {
    console.error('Spotify album details error:', err);
    return null;
  }
}

export async function playSpotifyTrack(uri, contextUri = null, offsetPosition = 0, deviceId = null) {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const body = {};
    if (contextUri) {
      body.context_uri = contextUri;
      body.offset = { position: offsetPosition };
    } else if (uri) {
      body.uris = [uri];
    }

    const query = deviceId ? `?device_id=${deviceId}` : '';
    const res = await fetch(`https://api.spotify.com/v1/me/player/play${query}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (res.status === 404) {
      // No active device found. Attempt to transfer playback to deviceId if available
      if (deviceId) {
        await transferPlaybackToDevice(deviceId);
        // Retry play
        await fetch(`https://api.spotify.com/v1/me/player/play${query}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      }
    }
    return res.ok;
  } catch (err) {
    console.warn('Spotify play call failed:', err);
    return false;
  }
}

export async function transferPlaybackToDevice(deviceId) {
  const token = getAccessToken();
  if (!token || !deviceId) return false;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: true
      })
    });
    return res.ok;
  } catch (e) {
    console.warn('Failed to transfer playback:', e);
    return false;
  }
}


export async function pauseSpotifyPlayback() {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch (err) {
    console.warn('Spotify pause call error:', err);
    return false;
  }
}

export async function skipSpotifyNext() {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch (err) {
    console.warn('Spotify next call error:', err);
    return false;
  }
}

export async function skipSpotifyPrevious() {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch (err) {
    console.warn('Spotify previous call error:', err);
    return false;
  }
}

export async function getMySavedAlbums() {
  const token = getAccessToken();
  if (!token) return [];

  try {
    const res = await fetch('https://api.spotify.com/v1/me/albums?limit=8', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(item => item.album);
  } catch (e) {
    console.warn('Failed to load user saved albums:', e);
    return [];
  }
}
