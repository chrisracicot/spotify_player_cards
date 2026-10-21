// Spotify Web Playback SDK & Audio Bridge
// Enables streaming audio directly inside the browser

import { getAccessToken } from './spotifyAuth.js';

let player = null;
let activeDeviceId = null;
let stateChangeCallback = null;

export function onPlaybackStateChange(cb) {
  stateChangeCallback = cb;
}

export function getActiveDeviceId() {
  return activeDeviceId;
}

export function initSpotifySDK() {
  return new Promise((resolve, reject) => {
    const token = getAccessToken();
    if (!token) {
      console.warn("No Spotify token available for SDK init.");
      return resolve(null);
    }

    const setupPlayer = () => {
      try {
        player = new window.Spotify.Player({
          name: '3D Jewel Case Player',
          getOAuthToken: cb => { cb(getAccessToken()); },
          volume: 0.7
        });

        player.addListener('initialization_error', ({ message }) => {
          console.warn('Spotify SDK Init Error:', message);
        });

        player.addListener('authentication_error', ({ message }) => {
          console.warn('Spotify SDK Auth Error (Token expired or revoked):', message);
          localStorage.removeItem('spotify_access_token');
          localStorage.removeItem('spotify_token_expires_at');
        });

        player.addListener('account_error', ({ message }) => {
          console.warn('Spotify SDK Account Notice (Requires Spotify Premium to stream directly):', message);
          localStorage.setItem('spotify_user_product', 'free');
        });

        player.addListener('playback_error', ({ message }) => {
          console.warn('Spotify SDK Playback Error:', message);
        });

        player.addListener('player_state_changed', state => {
          if (state && stateChangeCallback) {
            stateChangeCallback(state);
          }
        });

        player.addListener('ready', ({ device_id }) => {
          console.log('✅ Spotify Web Playback SDK Ready on device:', device_id);
          activeDeviceId = device_id;
          resolve(device_id);
        });

        player.addListener('not_ready', ({ device_id }) => {
          console.log('Spotify device has gone offline:', device_id);
          if (activeDeviceId === device_id) activeDeviceId = null;
        });

        player.connect().then(success => {
          if (!success) {
            console.warn("Failed to connect Spotify Web Playback SDK.");
            resolve(null);
          }
        });
      } catch (err) {
        console.warn("Error setting up Spotify Player instance:", err);
        resolve(null);
      }
    };

    if (window.Spotify) {
      setupPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        setupPlayer();
      };
    }
  });
}
