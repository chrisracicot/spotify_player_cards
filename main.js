import * as THREE from './public/vendor/three.module.js';
import { FrontLidShader } from './jewelCaseShader.js';
import { loginWithSpotify, logoutSpotify, checkAuthCallback, getAccessToken } from './spotifyAuth.js';
import { searchSpotifyAlbums, getSpotifyAlbumDetails, playSpotifyTrack, pauseSpotifyPlayback, skipSpotifyNext, skipSpotifyPrevious } from './spotifyApi.js';
import { initSpotifySDK, getActiveDeviceId, onPlaybackStateChange } from './spotifyPlayback.js';


// Pre-configured albums with tracklists
const albums = [
  {
    id: 'snatch',
    spotifyId: '512dQp7hBb03q4q84bX499',
    spotifyUri: 'spotify:album:512dQp7hBb03q4q84bX499',
    title: 'Snatch (Original Soundtrack)',
    artist: 'Various Artists • Oasis, Massive Attack, Madonna',
    cover: './public/covers/snatch.png',
    trackCount: '15 Tracks',
    year: '2000',
    caseTint: [0.96, 0.98, 1.0],
    thickness: 0.06,      // 6%
    gloss: 0.40,          // 40%
    iridescence: 0.13,    // 13%
    sampleSong: 'Diamond - Klint',
    audioPreview: './public/audio/snatch_preview.wav',
    tracklist: [
      '1. Diamond - Klint',
      '2. Supermoves - Overseer',
      '3. Hernando\'s Hideaway - The Johnston Brothers',
      '4. Golden Brown - The Stranglers',
      '5. Dreadlock Holiday - 10cc',
      '6. Hava Nagila - John Murphy & Daniel L. Griffiths',
      '7. Cross The Tracks - Maceo & The Macks',
      '8. Disco Science - Mirwais',
      '9. Spinners - The Herbaliser',
      '10. Angel - Massive Attack',
      '11. F**kin\' in the Bushes - Oasis',
      '12. Don\'t You Just Know It - Huey Piano Smith'
    ]
  },
  {
    id: 'stayin_alive',
    spotifyId: '1btWl43FmKkP2qV1E3U1Wk',
    spotifyUri: 'spotify:album:1btWl43FmKkP2qV1E3U1Wk',
    title: 'Stayin Alive in da Club',
    artist: 'Antifarox x DJ Kuff',
    cover: './public/covers/stayin_alive.png',
    trackCount: 'Single',
    year: '2023',
    caseTint: [0.97, 0.98, 1.0],
    thickness: 0.06,      // 6%
    gloss: 0.40,          // 40%
    iridescence: 0.13,    // 13%
    sampleSong: 'Stayin Alive (Club Mix)',
    audioPreview: './public/audio/stayin_alive_preview.wav',
    tracklist: [
      '1. Stayin Alive in da Club (Radio Edit)',
      '2. Stayin Alive in da Club (Extended Mix)',
      '3. Stayin Alive in da Club (Dub Instrumental)',
      '4. Stayin Alive in da Club (VIP Bass Rework)'
    ]
  }
];


let currentAlbumIndex = 0;
let scene, camera, renderer, textureLoader;
let caseGroup, frontLidGroup, backTrayGroup, tracklistMesh;
let isDragging = false;
let previousPointerPosition = { x: 0, y: 0 };
let pointerDownPosition = { x: 0, y: 0 };
let targetRotation = { x: 0.10, y: -0.35 };
let currentRotation = { x: 0.10, y: -0.35 };
let autoRotate = false;
let isPlaying = false;

// Audio Preview Engine (guarantees audible sound in all browsers)
const previewAudio = new Audio();
previewAudio.volume = 0.8;
let spotifyEmbedController = null;

// Spotify IFrame API Callback
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const container = document.getElementById('spotify-embed-container');
  if (!container) return;
  const album = albums[currentAlbumIndex];
  const options = {
    width: '100%',
    height: '152',
    uri: album?.spotifyUri || 'spotify:album:512dQp7hBb03q4q84bX499'
  };

  IFrameAPI.createController(container, options, (controller) => {
    spotifyEmbedController = controller;
    console.log("✅ Spotify Embed Controller created successfully");

    controller.addListener('playback_update', (e) => {
      if (e.data) {
        if (!e.data.isPaused) {
          // Spotify embed started playback, pause local audio preview to avoid conflict
          if (!previewAudio.paused) {
            previewAudio.pause();
          }
          setPlayUI(true);
        } else if (e.data.isPaused && previewAudio.paused) {
          setPlayUI(false);
        }
        if (e.data.position && e.data.duration) {
          updateProgress(e.data.position / 1000, e.data.duration / 1000);
        }
      }
    });
  });
};

// Case Open/Close State
let isOpen = false;
let targetOpenAngle = 0; // 0 = closed, ~2.5 rad (~145 deg) = open
let currentOpenAngle = 0;

// Geometry generators
function createBoxGeometryWithUVs(width, height, depth, radius = 0.02) {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  const r = radius;

  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  const extrudeSettings = {
    steps: 1,
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelOffset: 0,
    bevelSegments: 3
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  geom.computeVertexNormals();

  const pos = geom.attributes.position;
  const normals = geom.attributes.normal;
  const uvs = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nz = normals.getZ(i);

    if (nz > 0.45) {
      uvs[i * 2] = (x / width) + 0.5;
      uvs[i * 2 + 1] = (y / height) + 0.5;
    } else if (nz < -0.45) {
      uvs[i * 2] = (-x / width) + 0.5;
      uvs[i * 2 + 1] = (y / height) + 0.5;
    } else {
      uvs[i * 2] = (z / depth) + 0.5;
      uvs[i * 2 + 1] = (y / height) + 0.5;
    }
  }

  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geom;
}

// Generate high-resolution canvas texture for the matte paper tracklist insert
function createTracklistTexture(album) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Matte textured paper background (natural off-white/cream)
  ctx.fillStyle = '#f3f1ec';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle paper grain
  ctx.fillStyle = 'rgba(0, 0, 0, 0.025)';
  for (let i = 0; i < 5000; i++) {
    const gx = Math.random() * 1024;
    const gy = Math.random() * 1024;
    ctx.fillRect(gx, gy, 2, 2);
  }

  // Left spine margin / fold accent line
  ctx.strokeStyle = '#d4cfc5';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(90, 60);
  ctx.lineTo(90, 964);
  ctx.stroke();

  // Album Title & Header
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(album.title, 130, 130);

  ctx.fillStyle = '#6b7280';
  ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(album.artist, 130, 180);

  // Decorative divider
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(130, 215);
  ctx.lineTo(940, 215);
  ctx.stroke();

  // "TRACKLIST" subheader
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('OFFICIAL TRACKLIST', 130, 260);

  // Songs
  ctx.fillStyle = '#1f2937';
  ctx.font = '26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  let y = 310;
  album.tracklist.forEach((track) => {
    ctx.fillText(track, 130, y);
    y += 48;
  });

  // Footer / Catalog notes
  ctx.fillStyle = '#9ca3af';
  ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`STEREO COMPACT DISC • © ${album.year} ALL RIGHTS RESERVED`, 130, 930);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function init() {
  const container = document.getElementById('viewport-container');
  const canvas = document.getElementById('canvas3d');

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 6.4);

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // Studio lighting
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(3, 4, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x88ccff, 0.8);
  fillLight.position.set(-3, -2, 2);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  backLight.position.set(0, 3, -4);
  scene.add(backLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  textureLoader = new THREE.TextureLoader();

  // Root case container
  caseGroup = new THREE.Group();
  scene.add(caseGroup);

  // Build the complete CD Jewel Case assembly
  buildJewelCaseAssembly();

  // Interaction & UI
  setupInteraction(canvas);
  setupUI();
  window.addEventListener('resize', onWindowResize);

  loadAlbum(0);
  animate();
}

function buildJewelCaseAssembly() {
  // Clear previous meshes
  while (caseGroup.children.length > 0) {
    caseGroup.remove(caseGroup.children[0]);
  }

  const album = albums[currentAlbumIndex];
  const caseWidth = 3.0;
  const caseHeight = 3.0;
  const halfDepth = 0.08; // half thickness for each shell (front & back)
  const spineWidth = 0.22;

  // 1. Black Spine / Pivot Bar on the left
  // Dimensions: tall as case, depth of both shells combined, distinct black molded plastic
  const spineGeom = new THREE.BoxGeometry(spineWidth, caseHeight + 0.02, halfDepth * 2 + 0.03);
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0x141416, // Matte deep black molded plastic
    roughness: 0.55,
    metalness: 0.05
  });
  const spineMesh = new THREE.Mesh(spineGeom, spineMat);
  // Positioned along the left hinge axis
  spineMesh.position.set(-caseWidth / 2 - spineWidth / 2 + 0.06, 0, 0);
  caseGroup.add(spineMesh);

  // 2. Back Tray Group (Stationary base when opening)
  backTrayGroup = new THREE.Group();
  caseGroup.add(backTrayGroup);

  // Back tray clear plastic shell
  const backGeom = createBoxGeometryWithUVs(caseWidth, caseHeight, halfDepth, 0.02);
  const backPlasticMat = new THREE.MeshStandardMaterial({
    color: 0x222428,
    roughness: 0.35,
    metalness: 0.1,
    transparent: true,
    opacity: 0.95
  });
  const backShell = new THREE.Mesh(backGeom, backPlasticMat);
  backShell.position.set(0, 0, -halfDepth / 2);
  backTrayGroup.add(backShell);

  // Matte Paper Tracklist Insert placed inside the back tray
  const paperGeom = new THREE.PlaneGeometry(caseWidth - 0.08, caseHeight - 0.08);
  const paperMat = new THREE.MeshBasicMaterial({
    map: createTracklistTexture(album),
    side: THREE.FrontSide
  });
  tracklistMesh = new THREE.Mesh(paperGeom, paperMat);
  tracklistMesh.position.set(0, 0, 0.005); // Sitting right on the inside floor of the tray
  backTrayGroup.add(tracklistMesh);

  // 3. Front Lid Group (Hinged at the left edge: x = -caseWidth / 2)
  // Pivot placed at the left hinge line so rotation around Y opens the case cleanly!
  frontLidGroup = new THREE.Group();
  const hingeX = -caseWidth / 2 + 0.04;
  frontLidGroup.position.set(hingeX, 0, halfDepth / 2);
  caseGroup.add(frontLidGroup);

  // Lid mesh offset relative to the hinge pivot
  const lidGeom = createBoxGeometryWithUVs(caseWidth, caseHeight, halfDepth, 0.02);
  const lidShaderMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(FrontLidShader.uniforms),
    vertexShader: FrontLidShader.vertexShader,
    fragmentShader: FrontLidShader.fragmentShader
  });
  lidShaderMat.uniforms.uPlasticGloss.value = album.gloss;
  lidShaderMat.uniforms.uPlasticIridescence.value = album.iridescence;
  lidShaderMat.uniforms.uCaseTint.value = new THREE.Color(...album.caseTint);

  const lidMesh = new THREE.Mesh(lidGeom, lidShaderMat);
  lidMesh.name = 'frontLidMesh';
  lidMesh.position.set(caseWidth / 2 - 0.04, 0, 0); // Center relative to hinge
  frontLidGroup.add(lidMesh);
}

function setPlayUI(playing) {
  isPlaying = playing;
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const equalizer = document.getElementById('audio-equalizer');
  if (playIcon && pauseIcon) {
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
  }
  if (equalizer) {
    equalizer.classList.toggle('playing', playing);
  }
}

function updateProgress(currentTimeSec, durationSec) {
  const progressFill = document.getElementById('progress-fill');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');
  if (!durationSec || isNaN(durationSec) || durationSec <= 0) durationSec = 25;
  const pct = Math.min(100, Math.max(0, (currentTimeSec / durationSec) * 100));
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (timeCurrent) {
    const cur = Math.floor(currentTimeSec || 0);
    const m = Math.floor(cur / 60);
    const s = String(cur % 60).padStart(2, '0');
    timeCurrent.textContent = `${m}:${s}`;
  }
  if (timeTotal) {
    const dur = Math.floor(durationSec);
    const dm = Math.floor(dur / 60);
    const ds = String(dur % 60).padStart(2, '0');
    timeTotal.textContent = `${dm}:${ds}`;
  }
}

function loadAlbum(index) {
  currentAlbumIndex = index;
  const album = albums[index];

  // Reset Audio
  previewAudio.pause();
  setPlayUI(false);
  previewAudio.currentTime = 0;
  if (album.audioPreview) {
    previewAudio.src = album.audioPreview;
    previewAudio.load();
  }
  updateProgress(0, 25);

  // Sync Spotify Embed Controller if initialized
  if (spotifyEmbedController && album.spotifyUri) {
    try {
      spotifyEmbedController.loadUri(album.spotifyUri);
    } catch (e) {
      console.warn("Spotify Embed loadUri notice:", e);
    }
  }

  // Load front album cover
  textureLoader.load(album.cover, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.generateMipmaps = true;

    const lidMesh = frontLidGroup.getObjectByName('frontLidMesh');
    if (lidMesh && lidMesh.material.uniforms) {
      lidMesh.material.uniforms.tCover.value = tex;
      lidMesh.material.uniforms.uPlasticGloss.value = album.gloss;
      lidMesh.material.uniforms.uPlasticIridescence.value = album.iridescence;
      lidMesh.material.uniforms.uCaseTint.value = new THREE.Color(...album.caseTint);
    }
  });

  // Update inside tracklist paper
  if (tracklistMesh) {
    if (tracklistMesh.material.map) {
      tracklistMesh.material.map.dispose();
    }
    tracklistMesh.material.map = createTracklistTexture(album);
    tracklistMesh.material.needsUpdate = true;
  }

  // Update UI Elements
  document.getElementById('track-title').textContent = album.title;
  document.getElementById('track-artist').textContent = album.artist;
  document.getElementById('track-badge').textContent = `${album.trackCount} • ${album.year}`;
  document.getElementById('track-cover-mini').src = album.cover;
  document.getElementById('now-playing-sample').textContent = album.sampleSong;

  // Highlight active thumb
  document.querySelectorAll('.album-thumb-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
}

function toggleCaseOpen() {
  isOpen = !isOpen;
  // Open 145 degrees (~2.53 radians) to fully display tracklist booklet and lid
  targetOpenAngle = isOpen ? -2.53 : 0.0;

  const hintText = document.getElementById('hint-text');
  if (hintText) {
    hintText.textContent = isOpen ? 'Click case to close • Drag to rotate in 3D' : 'Click case to open • Drag to rotate in 3D';
  }
}

function setupInteraction(canvas) {
  let isPointerDown = false;
  let hasMoved = false;

  canvas.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    hasMoved = false;
    previousPointerPosition = { x: e.clientX, y: e.clientY };
    pointerDownPosition = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return;

    const deltaX = e.clientX - previousPointerPosition.x;
    const deltaY = e.clientY - previousPointerPosition.y;

    if (Math.hypot(e.clientX - pointerDownPosition.x, e.clientY - pointerDownPosition.y) > 6) {
      hasMoved = true;
    }

    targetRotation.y += deltaX * 0.008;
    targetRotation.x += deltaY * 0.008;

    // Maximize vertical tilt strictly to 20 degrees (±20° = ±0.349 rad)
    const maxVerticalTilt = (20 * Math.PI) / 180;
    targetRotation.x = Math.max(-maxVerticalTilt, Math.min(maxVerticalTilt, targetRotation.x));

    previousPointerPosition = { x: e.clientX, y: e.clientY };
  });

  const endDrag = (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}

    // If it was a clean click without dragging, toggle Open / Close!
    if (!hasMoved) {
      toggleCaseOpen();
    }
  };

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.position.z += e.deltaY * 0.003;
    camera.position.z = Math.max(3.5, Math.min(10.0, camera.position.z));
  }, { passive: false });
}

function setupUI() {
  document.getElementById('thumb-snatch').addEventListener('click', () => loadAlbum(0));
  document.getElementById('thumb-stayin').addEventListener('click', () => loadAlbum(1));

  // Custom User Image Upload
  const uploadInput = document.getElementById('cover-file-input');
  document.getElementById('btn-upload').addEventListener('click', () => uploadInput.click());

  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const customUrl = event.target.result;
      const customAlbum = {
        id: 'custom_' + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Custom Upload',
        cover: customUrl,
        trackCount: 'User Track',
        year: '2026',
        caseTint: [0.96, 0.98, 1.0],
        thickness: 0.06,
        gloss: 0.40,
        iridescence: 0.13,
        sampleSong: 'Track 01',
        audioPreview: './public/audio/snatch_preview.wav',
        tracklist: [
          '1. Track 01 - Intro',
          '2. Track 02 - Album Single',
          '3. Track 03 - Interlude',
          '4. Track 04 - Outro'
        ]
      };

      albums.push(customAlbum);
      addAlbumThumb(customAlbum, albums.length - 1);
      loadAlbum(albums.length - 1);
    };
    reader.readAsDataURL(file);
  });

  // Spotify Authentication Button
  const authBtn = document.getElementById('btn-spotify-login');
  const authText = document.getElementById('spotify-auth-text');

  const updateAuthUI = () => {
    const token = getAccessToken();
    const displayName = localStorage.getItem('spotify_user_display_name');
    if (token) {
      authBtn.classList.add('connected');
      authText.textContent = displayName ? `${displayName} (Logout)` : 'Connected (Logout)';
      authBtn.onclick = () => logoutSpotify();
    } else {
      authBtn.classList.remove('connected');
      authText.textContent = 'Connect Spotify';
      authBtn.onclick = () => loginWithSpotify();
    }
  };

  // Check OAuth callback code on page load
  checkAuthCallback().then(async (token) => {
    updateAuthUI();
    if (token) {
      console.log("Initializing in-browser Spotify Web Playback SDK...");
      await initSpotifySDK();
    }
  });

  if (getAccessToken()) {
    initSpotifySDK();
  }

  // Sync player UI directly with Spotify Playback state if active
  onPlaybackStateChange((state) => {
    if (!state) return;
    const isPaused = state.paused;
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const timeCurrent = document.getElementById('time-current');
    const progressFill = document.getElementById('progress-fill');

    isPlaying = !isPaused;
    if (playIcon && pauseIcon) {
      playIcon.style.display = isPlaying ? 'none' : 'block';
      pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }

    if (state.position && state.duration) {
      const pct = (state.position / state.duration) * 100;
      if (progressFill) progressFill.style.width = `${pct}%`;
      const curSec = Math.floor(state.position / 1000);
      const m = Math.floor(curSec / 60);
      const s = String(curSec % 60).padStart(2, '0');
      if (timeCurrent) timeCurrent.textContent = `${m}:${s}`;
    }
  });

  updateAuthUI();


  // Spotify Album Search
  setupSpotifySearch();

  setupAudioPlayer();
}

function setupSpotifySearch() {
  const searchInput = document.getElementById('spotify-search-input');
  const dropdown = document.getElementById('search-dropdown');
  let debounceTimeout = null;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(debounceTimeout);

    if (!query) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    debounceTimeout = setTimeout(async () => {
      const token = getAccessToken();
      if (!token) {
        dropdown.innerHTML = `<div style="padding: 0.75rem; font-size: 0.8125rem; color: #9ca3af; text-align: center;">Click <b>Connect Spotify</b> above to search live albums!</div>`;
        dropdown.style.display = 'flex';
        return;
      }

      const results = await searchSpotifyAlbums(query);
      if (results.length === 0) {
        dropdown.innerHTML = `<div style="padding: 0.75rem; font-size: 0.8125rem; color: #9ca3af;">No albums found.</div>`;
        dropdown.style.display = 'flex';
        return;
      }

      dropdown.innerHTML = '';
      results.forEach((alb) => {
        const item = document.createElement('div');
        item.className = 'search-item';
        const imgUrl = alb.images?.[0]?.url || './public/covers/snatch.png';
        const artistName = alb.artists?.map(a => a.name).join(', ') || 'Unknown Artist';

        item.innerHTML = `
          <img src="${imgUrl}" class="search-item-img" alt="${alb.name}">
          <div class="search-item-info">
            <span class="search-item-title">${alb.name}</span>
            <span class="search-item-artist">${artistName} • ${alb.release_date?.slice(0, 4) || ''}</span>
          </div>
        `;

        item.addEventListener('click', async () => {
          dropdown.style.display = 'none';
          searchInput.value = '';

          // Fetch full album details for tracklist
          const details = await getSpotifyAlbumDetails(alb.id);
          const tracks = (details?.tracks?.items || []).map((t, idx) => `${idx + 1}. ${t.name}`);

          const newAlbum = {
            id: alb.id,
            title: alb.name,
            artist: artistName,
            cover: imgUrl,
            trackCount: `${alb.total_tracks} Tracks`,
            year: alb.release_date?.slice(0, 4) || '2026',
            caseTint: [0.96, 0.98, 1.0],
            thickness: 0.06,
            gloss: 0.40,
            iridescence: 0.13,
            sampleSong: details?.tracks?.items?.[0]?.name || alb.name,
            audioPreview: details?.tracks?.items?.[0]?.preview_url || './public/audio/snatch_preview.wav',
            spotifyUri: alb.uri,
            tracklist: tracks.length > 0 ? tracks : [`1. ${alb.name}`]
          };

          albums.push(newAlbum);
          addAlbumThumb(newAlbum, albums.length - 1);
          loadAlbum(albums.length - 1);
        });

        dropdown.appendChild(item);
      });

      dropdown.style.display = 'flex';
    }, 350);
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

function setupAudioPlayer() {
  const playBtn = document.getElementById('btn-play');
  const progressTrack = document.getElementById('progress-track');
  const volumeSlider = document.getElementById('volume-slider');

  // Preview Audio Element Events
  previewAudio.addEventListener('timeupdate', () => {
    if (previewAudio.duration && !isNaN(previewAudio.duration)) {
      updateProgress(previewAudio.currentTime, previewAudio.duration);
    }
  });

  previewAudio.addEventListener('ended', () => {
    setPlayUI(false);
    updateProgress(0, previewAudio.duration || 25);
  });

  previewAudio.addEventListener('play', () => {
    setPlayUI(true);
  });

  previewAudio.addEventListener('pause', () => {
    if (!isPlaying) {
      setPlayUI(false);
    }
  });

  previewAudio.addEventListener('error', (e) => {
    console.warn("Audio element event notice:", e);
  });

  // Click on progress track to seek
  if (progressTrack) {
    progressTrack.addEventListener('click', (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const dur = previewAudio.duration || 25;
      previewAudio.currentTime = clickRatio * dur;
      updateProgress(previewAudio.currentTime, dur);
    });
  }

  // Volume slider control
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const vol = e.target.value / 100;
      previewAudio.volume = vol;
    });
  }

  // Play / Pause Button - Guarantees audible sound
  playBtn.addEventListener('click', async () => {
    const album = albums[currentAlbumIndex];

    if (isPlaying) {
      // 1. Pause everything
      setPlayUI(false);
      previewAudio.pause();

      if (spotifyEmbedController) {
        try {
          spotifyEmbedController.pause();
        } catch (e) {
          console.warn("Embed pause notice:", e);
        }
      }

      if (getAccessToken()) {
        await pauseSpotifyPlayback();
      }
    } else {
      // 2. Start playback
      setPlayUI(true);

      // Tier A: If user is connected via Spotify Premium SDK, trigger Spotify playback
      let sdkSuccess = false;
      if (getAccessToken() && album.spotifyUri) {
        const deviceId = getActiveDeviceId();
        if (deviceId) {
          sdkSuccess = await playSpotifyTrack(null, album.spotifyUri, 0, deviceId);
        }
      }

      // Tier B: Command Spotify Embed Controller
      if (spotifyEmbedController) {
        try {
          spotifyEmbedController.play();
        } catch (e) {
          console.warn("Spotify Embed controller play notice:", e);
        }
      }

      // Tier C: Guaranteed audible sound via local Audio Preview!
      // If SDK is not actively playing, stream local high-quality audio
      if (!sdkSuccess && album.audioPreview) {
        const targetUrl = new URL(album.audioPreview, window.location.href).href;
        if (previewAudio.src !== targetUrl) {
          previewAudio.src = album.audioPreview;
        }
        previewAudio.play().catch(err => {
          console.warn("Audio play notice (user interaction required):", err);
        });
      }
    }
  });

  document.getElementById('btn-prev').addEventListener('click', async () => {
    if (getAccessToken()) {
      await skipSpotifyPrevious();
    }
    const prev = (currentAlbumIndex - 1 + albums.length) % albums.length;
    loadAlbum(prev);
  });

  document.getElementById('btn-next').addEventListener('click', async () => {
    if (getAccessToken()) {
      await skipSpotifyNext();
    }
    const next = (currentAlbumIndex + 1) % albums.length;
    loadAlbum(next);
  });
}


function addAlbumThumb(album, index) {
  const bar = document.getElementById('album-bar');
  const uploadBtn = document.getElementById('btn-upload');

  const btn = document.createElement('button');
  btn.className = 'album-thumb-btn';
  btn.title = album.title;
  btn.innerHTML = `<img src="${album.cover}" alt="${album.title}">`;
  btn.addEventListener('click', () => loadAlbum(index));

  bar.insertBefore(btn, uploadBtn);
}

function onWindowResize() {
  const container = document.getElementById('viewport-container');
  if (!container || !renderer || !camera) return;

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (autoRotate && !isDragging) {
    targetRotation.y += 0.005;
  }

  // Smooth rotation lerp
  currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
  currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;

  if (caseGroup) {
    caseGroup.rotation.x = currentRotation.x;
    caseGroup.rotation.y = currentRotation.y;
  }

  // Smooth case open/close hinge animation
  if (frontLidGroup) {
    currentOpenAngle += (targetOpenAngle - currentOpenAngle) * 0.1;
    frontLidGroup.rotation.y = currentOpenAngle;
  }

  renderer.render(scene, camera);
}

// Start on load
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
