import * as THREE from './public/vendor/three.module.js';
import { FrontLidShader } from './jewelCaseShader.js';
import { loginWithSpotify, logoutSpotify, checkAuthCallback, getAccessToken, getUserProduct } from './spotifyAuth.js';
import { 
  searchSpotifyAlbums, 
  getSpotifyAlbumDetails, 
  playSpotifyTrack, 
  pauseSpotifyPlayback, 
  skipSpotifyNext, 
  skipSpotifyPrevious,
  addTrackToSpotifyQueue,
  getSpotifyQueue,
  getPlaybackState,
  setVolumeRemote,
  seekPlaybackRemote
} from './spotifyApi.js';
import { initSpotifySDK, getActiveDeviceId, onPlaybackStateChange } from './spotifyPlayback.js';

// Pre-configured albums with tracklists forming a full 360-degree carousel
const albums = [
  {
    id: 'snatch',
    spotifyId: '512dQp7hBb03q4q84bX499',
    spotifyUri: 'spotify:album:512dQp7hBb03q4q84bX499',
    title: 'Snatch (Original Soundtrack)',
    artist: 'Various Artists • Oasis, Massive Attack, Madonna',
    cover: '/covers/snatch.png',
    trackCount: '15 Tracks',
    year: '2000',
    caseTint: [0.96, 0.98, 1.0],
    thickness: 0.06,
    gloss: 0.40,
    iridescence: 0.13,
    sampleSong: 'Diamond - Klint',
    audioPreview: '/audio/snatch_preview.wav',
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
    cover: '/covers/stayin_alive.png',
    trackCount: 'Single',
    year: '2023',
    caseTint: [0.97, 0.98, 1.0],
    thickness: 0.06,
    gloss: 0.40,
    iridescence: 0.13,
    sampleSong: 'Stayin Alive (Club Mix)',
    audioPreview: '/audio/stayin_alive_preview.wav',
    tracklist: [
      '1. Stayin Alive in da Club (Radio Edit)',
      '2. Stayin Alive in da Club (Extended Mix)',
      '3. Stayin Alive in da Club (Dub Instrumental)',
      '4. Stayin Alive in da Club (VIP Bass Rework)'
    ]
  },
  {
    id: 'ram',
    spotifyId: '4m2880jivSbbyEGAKfITCa',
    spotifyUri: 'spotify:album:4m2880jivSbbyEGAKfITCa',
    title: 'Random Access Memories',
    artist: 'Daft Punk',
    cover: '/covers/ram.png',
    trackCount: '13 Tracks',
    year: '2013',
    caseTint: [0.95, 0.98, 1.0],
    thickness: 0.06,
    gloss: 0.45,
    iridescence: 0.18,
    sampleSong: 'Get Lucky (feat. Pharrell Williams)',
    audioPreview: '/audio/snatch_preview.wav',
    tracklist: [
      '1. Give Life Back to Music',
      '2. Giorgio by Moroder',
      '3. Within',
      '4. Instant Crush (feat. Julian Casablancas)',
      '5. Lose Yourself to Dance',
      '6. Touch (feat. Paul Williams)',
      '7. Get Lucky (feat. Pharrell Williams)',
      '8. Beyond',
      '9. Motherboard',
      '10. Fragments of Time',
      '11. Doin\' It Right (feat. Panda Bear)',
      '12. Contact'
    ]
  },
  {
    id: 'dark_side',
    spotifyId: '4LH4d3cOWNNXdsqFd4O7ja',
    spotifyUri: 'spotify:album:4LH4d3cOWNNXdsqFd4O7ja',
    title: 'The Dark Side of the Moon',
    artist: 'Pink Floyd',
    cover: '/covers/dark_side.png',
    trackCount: '10 Tracks',
    year: '1973',
    caseTint: [0.94, 0.96, 1.0],
    thickness: 0.06,
    gloss: 0.38,
    iridescence: 0.22,
    sampleSong: 'Time',
    audioPreview: '/audio/snatch_preview.wav',
    tracklist: [
      '1. Speak to Me',
      '2. Breathe (In the Air)',
      '3. On the Run',
      '4. Time',
      '5. The Great Gig in the Sky',
      '6. Money',
      '7. Us and Them',
      '8. Any Colour You Like',
      '9. Brain Damage',
      '10. Eclipse'
    ]
  },
  {
    id: 'currents',
    spotifyId: '79dL7FLiJFOO0EoehUHQBv',
    spotifyUri: 'spotify:album:79dL7FLiJFOO0EoehUHQBv',
    title: 'Currents',
    artist: 'Tame Impala',
    cover: '/covers/currents.png',
    trackCount: '13 Tracks',
    year: '2015',
    caseTint: [0.98, 0.95, 1.0],
    thickness: 0.06,
    gloss: 0.42,
    iridescence: 0.16,
    sampleSong: 'The Less I Know the Better',
    audioPreview: '/audio/stayin_alive_preview.wav',
    tracklist: [
      '1. Let It Happen',
      '2. Nangs',
      '3. The Moment',
      '4. Yes I\'m Changing',
      '5. Eventually',
      '6. Gossip',
      '7. The Less I Know the Better',
      '8. Past Life',
      '9. Disciples',
      '10. Cause I\'m a Man',
      '11. Reality in Motion',
      '12. Love/Paranoia',
      '13. New Person, Same Old Mistakes'
    ]
  },
  {
    id: 'discovery',
    spotifyId: '2noRn2Aes5aoNVsU6iWThc',
    spotifyUri: 'spotify:album:2noRn2Aes5aoNVsU6iWThc',
    title: 'Discovery',
    artist: 'Daft Punk',
    cover: '/covers/discovery.png',
    trackCount: '14 Tracks',
    year: '2001',
    caseTint: [0.96, 0.98, 1.0],
    thickness: 0.06,
    gloss: 0.44,
    iridescence: 0.15,
    sampleSong: 'One More Time',
    audioPreview: '/audio/stayin_alive_preview.wav',
    tracklist: [
      '1. One More Time',
      '2. Aerodynamic',
      '3. Digital Love',
      '4. Harder, Better, Faster, Stronger',
      '5. Crescendolls',
      '6. Nightvision',
      '7. Superheroes',
      '8. High Life',
      '9. Something About Us',
      '10. Voyager',
      '11. Veridis Quo',
      '12. Short Circuit',
      '13. Face to Face',
      '14. Too Long'
    ]
  }
];

let currentAlbumIndex = 0;
let scene, camera, renderer, textureLoader;
let carouselGroup;
const caseInstances = [];
const raycaster = new THREE.Raycaster();

// Interaction & Physics state
let isDragging = false;
let previousPointerPosition = { x: 0, y: 0 };
let pointerDownPosition = { x: 0, y: 0 };
let targetCarouselRotationY = 0;
let currentCarouselRotationY = 0;
let targetCarouselTiltX = 0.04; // subtle resting forward perspective
let currentCarouselTiltX = 0.04;
let spinVelocity = 0;
let isPlaying = false;

// Shared Geometries & Materials for efficiency
let sharedBoxGeom = null;
let sharedPaperGeom = null;
let sharedSpineGeom = null;
let sharedSpineMat = null;
let sharedBackMat = null;

// Audio Preview Engine (guarantees audible sound in all browsers)
const previewAudio = new Audio();
previewAudio.volume = 0.8;
let spotifyEmbedController = null;

// Playlist Queue State (Adapted from algorithm_web)
const playlistQueue = [];
let isQueuePolling = false;

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
  ctx.fillText(album.title.length > 28 ? album.title.slice(0, 26) + '...' : album.title, 130, 130);

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
  (album.tracklist || []).slice(0, 12).forEach((track) => {
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
  camera.position.set(0, 0.35, 7.8);

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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  textureLoader = new THREE.TextureLoader();

  // Initialize shared geometries
  const caseWidth = 3.0;
  const caseHeight = 3.0;
  const halfDepth = 0.08;
  const spineWidth = 0.22;

  sharedBoxGeom = createBoxGeometryWithUVs(caseWidth, caseHeight, halfDepth, 0.02);
  sharedPaperGeom = new THREE.PlaneGeometry(caseWidth - 0.08, caseHeight - 0.08);
  sharedSpineGeom = new THREE.BoxGeometry(spineWidth, caseHeight + 0.02, halfDepth * 2 + 0.03);

  sharedSpineMat = new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.55,
    metalness: 0.05
  });

  sharedBackMat = new THREE.MeshStandardMaterial({
    color: 0x222428,
    roughness: 0.35,
    metalness: 0.1,
    transparent: true,
    opacity: 0.95
  });

  // Carousel Group container
  carouselGroup = new THREE.Group();
  scene.add(carouselGroup);

  // Build the carousel ring with CD case instances
  buildCarousel();

  // Interaction & UI
  setupInteraction(canvas);
  setupUI();
  window.addEventListener('resize', onWindowResize);

  syncActiveAlbum(0);
  animate();
}

// Factory to create a single complete 3D CD Jewel Case instance
function createCDCaseInstance(album, index) {
  const caseMeshGroup = new THREE.Group();
  caseMeshGroup.userData = { albumIndex: index };

  const caseWidth = 3.0;
  const halfDepth = 0.08;
  const spineWidth = 0.22;

  // 1. Black Spine hinge bar on left
  const spineMesh = new THREE.Mesh(sharedSpineGeom, sharedSpineMat);
  spineMesh.position.set(-caseWidth / 2 - spineWidth / 2 + 0.06, 0, 0);
  caseMeshGroup.add(spineMesh);

  // 2. Back Tray Group
  const backTrayGroup = new THREE.Group();
  caseMeshGroup.add(backTrayGroup);

  const backShell = new THREE.Mesh(sharedBoxGeom, sharedBackMat);
  backShell.position.set(0, 0, -halfDepth / 2);
  backTrayGroup.add(backShell);

  const paperMat = new THREE.MeshBasicMaterial({
    map: createTracklistTexture(album),
    side: THREE.FrontSide
  });
  const tracklistMesh = new THREE.Mesh(sharedPaperGeom, paperMat);
  tracklistMesh.position.set(0, 0, 0.005);
  backTrayGroup.add(tracklistMesh);

  // 3. Front Lid Group (Closed, locked as requested)
  const frontLidGroup = new THREE.Group();
  const hingeX = -caseWidth / 2 + 0.04;
  frontLidGroup.position.set(hingeX, 0, halfDepth / 2);
  caseMeshGroup.add(frontLidGroup);

  const lidShaderMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(FrontLidShader.uniforms),
    vertexShader: FrontLidShader.vertexShader,
    fragmentShader: FrontLidShader.fragmentShader
  });
  lidShaderMat.uniforms.uPlasticGloss.value = album.gloss;
  lidShaderMat.uniforms.uPlasticIridescence.value = album.iridescence;
  lidShaderMat.uniforms.uCaseTint.value = new THREE.Color(...album.caseTint);

  const lidMesh = new THREE.Mesh(sharedBoxGeom, lidShaderMat);
  lidMesh.name = 'frontLidMesh';
  lidMesh.position.set(caseWidth / 2 - 0.04, 0, 0);
  frontLidGroup.add(lidMesh);

  // Load cover texture asynchronously
  textureLoader.load(album.cover, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.generateMipmaps = true;
    lidShaderMat.uniforms.tCover.value = tex;
  });

  return caseMeshGroup;
}

// Build or rebuild the cylindrical carousel ring of CD cases
function buildCarousel() {
  while (carouselGroup.children.length > 0) {
    carouselGroup.remove(carouselGroup.children[0]);
  }
  caseInstances.length = 0;

  const N = albums.length;
  const deltaTheta = (2 * Math.PI) / N;
  const caseWidth = 3.0;

  // Dynamic radius based on item count to avoid clipping and keep natural spacing
  const radius = Math.max(4.2, (caseWidth * 1.25) / (2 * Math.sin(Math.PI / Math.max(N, 3))));

  for (let i = 0; i < N; i++) {
    const caseInstance = createCDCaseInstance(albums[i], i);
    const angle = i * deltaTheta;

    // Position around cylindrical ring
    caseInstance.position.set(
      radius * Math.sin(angle),
      0,
      radius * Math.cos(angle)
    );

    // Orient case radially outward
    caseInstance.rotation.y = angle;

    carouselGroup.add(caseInstance);
    caseInstances.push(caseInstance);
  }

  // Anchor carousel so the active front case (angle = 0) sits comfortably at Z = 0
  carouselGroup.position.set(0, -0.05, -radius);
}

// Smoothly rotate the carousel ring to bring a specific album to the front
function rotateToAlbum(targetIndex) {
  const N = albums.length;
  const deltaTheta = (2 * Math.PI) / N;
  const targetAngle = -targetIndex * deltaTheta;

  // Shortest angular path
  const diff = (targetAngle - targetCarouselRotationY) % (2 * Math.PI);
  const shortestDiff = ((diff + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;

  targetCarouselRotationY += shortestDiff;
  spinVelocity = 0;
  syncActiveAlbum(targetIndex);
}

function syncActiveAlbum(index) {
  currentAlbumIndex = index;
  const album = albums[index];
  if (!album) return;

  // Sync Spotify Embed Controller if active
  if (spotifyEmbedController && album.spotifyUri) {
    try {
      spotifyEmbedController.loadUri(album.spotifyUri);
    } catch (e) {
      console.warn("Spotify Embed loadUri notice:", e);
    }
  }

  // If local preview audio is currently playing, update source and continue
  if (isPlaying && album.audioPreview) {
    const targetUrl = new URL(album.audioPreview, window.location.href).href;
    if (previewAudio.src !== targetUrl) {
      previewAudio.src = album.audioPreview;
      previewAudio.play().catch(e => console.warn(e));
    }
  }

  // Update Sidebar UI elements
  document.getElementById('track-title').textContent = album.title;
  document.getElementById('track-artist').textContent = album.artist;
  document.getElementById('track-badge').textContent = `${album.trackCount} • ${album.year}`;
  document.getElementById('track-cover-mini').src = album.cover;
  document.getElementById('now-playing-sample').textContent = album.sampleSong;

  // Highlight active thumbnail button
  document.querySelectorAll('.album-thumb-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
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

function setupInteraction(canvas) {
  let hasMoved = false;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    hasMoved = false;
    previousPointerPosition = { x: e.clientX, y: e.clientY };
    pointerDownPosition = { x: e.clientX, y: e.clientY };
    spinVelocity = 0;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - previousPointerPosition.x;
    const deltaY = e.clientY - previousPointerPosition.y;

    if (Math.hypot(e.clientX - pointerDownPosition.x, e.clientY - pointerDownPosition.y) > 6) {
      hasMoved = true;
    }

    // Horizontal spin with cursor
    targetCarouselRotationY += deltaX * 0.007;
    spinVelocity = deltaX * 0.007;

    // Very slight vertical tilt (user requested)
    targetCarouselTiltX += deltaY * 0.003;
    const maxVerticalTilt = (10 * Math.PI) / 180; // ±10 degrees
    targetCarouselTiltX = Math.max(-maxVerticalTilt, Math.min(maxVerticalTilt, targetCarouselTiltX));

    previousPointerPosition = { x: e.clientX, y: e.clientY };
  });

  const endDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}

    // If clean click without dragging: raycast to see if user clicked a specific CD case!
    if (!hasMoved) {
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(carouselGroup.children, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && obj.parent !== carouselGroup) {
          obj = obj.parent;
        }
        if (obj.userData && typeof obj.userData.albumIndex === 'number') {
          rotateToAlbum(obj.userData.albumIndex);
        }
      }
    }
  };

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Subtle wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.position.z += e.deltaY * 0.003;
    camera.position.z = Math.max(6.0, Math.min(10.5, camera.position.z));
  }, { passive: false });
}

function renderThumbnails() {
  const bar = document.getElementById('album-bar');
  const uploadBtn = document.getElementById('btn-upload');
  if (!bar || !uploadBtn) return;

  // Remove existing thumb buttons
  bar.querySelectorAll('.album-thumb-btn').forEach(b => b.remove());

  albums.forEach((album, index) => {
    const btn = document.createElement('button');
    btn.className = `album-thumb-btn ${index === currentAlbumIndex ? 'active' : ''}`;
    btn.title = album.title;
    btn.innerHTML = `<img src="${album.cover}" alt="${album.title}">`;
    btn.addEventListener('click', () => rotateToAlbum(index));
    bar.insertBefore(btn, uploadBtn);
  });
}

function setupUI() {
  renderThumbnails();

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
        audioPreview: '/audio/snatch_preview.wav',
        tracklist: [
          '1. Track 01 - Intro',
          '2. Track 02 - Album Single',
          '3. Track 03 - Interlude',
          '4. Track 04 - Outro'
        ]
      };

      albums.push(customAlbum);
      buildCarousel();
      renderThumbnails();
      rotateToAlbum(albums.length - 1);
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
  setupSpotifySearch();
  setupAudioPlayer();
  renderQueueUI();
  startSpotifyQueuePolling();

  // Clear queue button listener
  const clearQueueBtn = document.getElementById('btn-clear-queue');
  if (clearQueueBtn) {
    clearQueueBtn.addEventListener('click', () => {
      playlistQueue.length = 0;
      renderQueueUI();
    });
  }
}

// Queue Management Functions (Copied & adapted from algorithm_web)
export async function enqueueTrack(track) {
  const isPremium = getUserProduct() === 'premium';
  const token = getAccessToken();
  const deviceId = getActiveDeviceId();

  if (token && isPremium && track.spotifyUri) {
    // Add directly to Spotify's live remote queue
    const success = await addTrackToSpotifyQueue(track.spotifyUri, deviceId);
    if (success) {
      console.log(`✅ Track added to Spotify remote queue: ${track.title}`);
    }
  }

  // Always keep in local playlist queue UI as well
  playlistQueue.push(track);
  renderQueueUI();

  // If nothing is playing, play immediately
  if (!isPlaying) {
    playNextQueueTrack();
  }
}

export function playNextQueueTrack() {
  if (playlistQueue.length === 0) return;
  const nextTrack = playlistQueue.shift();
  renderQueueUI();
  playTrackItem(nextTrack);
}

export async function playTrackItem(track) {
  const isPremium = getUserProduct() === 'premium';
  const token = getAccessToken();
  const deviceId = getActiveDeviceId();

  // If this track belongs to one of our carousel albums, spin the carousel to match!
  if (track.albumIndex !== undefined && track.albumIndex >= 0 && track.albumIndex < albums.length) {
    rotateToAlbum(track.albumIndex);
  }

  // 1. If Spotify Web Playback SDK / Premium is active
  if (token && isPremium && track.spotifyUri) {
    await playSpotifyTrack(track.spotifyUri, null, 0, deviceId);
    setPlayUI(true);
    return;
  }

  // 2. Fallback to Spotify Embed controller
  if (spotifyEmbedController && track.spotifyUri) {
    spotifyEmbedController.loadUri(track.spotifyUri);
    spotifyEmbedController.play();
    setPlayUI(true);
    return;
  }

  // 3. Fallback to local audio preview
  if (track.audioPreview) {
    const targetUrl = new URL(track.audioPreview, window.location.href).href;
    if (previewAudio.src !== targetUrl) {
      previewAudio.src = track.audioPreview;
    }
    previewAudio.play().then(() => setPlayUI(true)).catch(e => console.warn(e));
  }
}

function renderQueueUI() {
  const queueContainer = document.getElementById('queue-list');
  if (!queueContainer) return;

  queueContainer.innerHTML = '';

  if (playlistQueue.length === 0) {
    queueContainer.innerHTML = '<div class="queue-empty">Queue is empty. Search songs or click "Add to Queue" below!</div>';
    return;
  }

  playlistQueue.forEach((track, index) => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.title = `Click to play: ${track.title}`;

    const coverSrc = track.cover || '/covers/snatch.png';
    item.innerHTML = `
      <img src="${coverSrc}" alt="${track.title}">
      <div class="queue-item-details">
        <span class="queue-item-title">${track.title}</span>
        <span class="queue-item-artist">${track.artist || 'Unknown Artist'}</span>
      </div>
      <div class="queue-item-action">▶</div>
    `;

    item.addEventListener('click', () => {
      playlistQueue.splice(index, 1);
      renderQueueUI();
      playTrackItem(track);
    });

    queueContainer.appendChild(item);
  });
}

// Background sync to poll real Spotify queue for Premium users (from algorithm_web)
function startSpotifyQueuePolling() {
  if (isQueuePolling) return;
  isQueuePolling = true;

  setInterval(async () => {
    const token = getAccessToken();
    const isPremium = getUserProduct() === 'premium';
    if (!token || !isPremium) return;

    try {
      const queueData = await getSpotifyQueue();
      if (queueData && queueData.queue && queueData.queue.length > 0) {
        // Sync remote Spotify queue tracks into our local queue representation
        const remoteQueue = queueData.queue.slice(0, 8).map(q => ({
          title: q.name,
          artist: q.artists.map(a => a.name).join(', '),
          cover: q.album?.images?.[0]?.url || '/covers/snatch.png',
          spotifyUri: q.uri
        }));
        
        // Merge without duplicate URIs
        remoteQueue.forEach(rq => {
          if (!playlistQueue.some(lq => lq.spotifyUri === rq.spotifyUri)) {
            playlistQueue.push(rq);
          }
        });
        renderQueueUI();
      }
    } catch (err) {
      console.warn("Queue polling note:", err);
    }
  }, 5000);
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
          <div class="search-item-actions">
            <button class="queue-add-btn" title="Add first track to queue">+ Queue</button>
          </div>
        `;

        // Queue button click
        const queueBtn = item.querySelector('.queue-add-btn');
        queueBtn.addEventListener('click', async (evt) => {
          evt.stopPropagation();
          dropdown.style.display = 'none';
          const details = await getSpotifyAlbumDetails(alb.id);
          const firstTrack = details?.tracks?.items?.[0];
          enqueueTrack({
            title: firstTrack?.name || alb.name,
            artist: artistName,
            cover: imgUrl,
            spotifyUri: firstTrack?.uri || alb.uri,
            audioPreview: firstTrack?.preview_url
          });
        });

        item.addEventListener('click', async () => {
          dropdown.style.display = 'none';
          searchInput.value = '';

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
            audioPreview: details?.tracks?.items?.[0]?.preview_url || '/audio/snatch_preview.wav',
            spotifyUri: alb.uri,
            tracklist: tracks.length > 0 ? tracks : [`1. ${alb.name}`]
          };

          albums.push(newAlbum);
          buildCarousel();
          renderThumbnails();
          rotateToAlbum(albums.length - 1);
        });

        dropdown.appendChild(item);
      });

      dropdown.style.display = 'flex';
    }, 350);
  });

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

  previewAudio.addEventListener('timeupdate', () => {
    if (previewAudio.duration && !isNaN(previewAudio.duration)) {
      updateProgress(previewAudio.currentTime, previewAudio.duration);
    }
  });

  previewAudio.addEventListener('ended', () => {
    setPlayUI(false);
    updateProgress(0, previewAudio.duration || 25);
    // If tracks are in queue, automatically advance to next queued track
    if (playlistQueue.length > 0) {
      playNextQueueTrack();
    }
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

  if (progressTrack) {
    progressTrack.addEventListener('click', (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const dur = previewAudio.duration || 25;
      previewAudio.currentTime = clickRatio * dur;
      updateProgress(previewAudio.currentTime, dur);
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const vol = e.target.value / 100;
      previewAudio.volume = vol;
    });
  }

  playBtn.addEventListener('click', async () => {
    const album = albums[currentAlbumIndex];

    if (isPlaying) {
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
      setPlayUI(true);

      let sdkSuccess = false;
      if (getAccessToken() && album.spotifyUri) {
        const deviceId = getActiveDeviceId();
        if (deviceId) {
          sdkSuccess = await playSpotifyTrack(null, album.spotifyUri, 0, deviceId);
        }
      }

      if (spotifyEmbedController) {
        try {
          spotifyEmbedController.play();
        } catch (e) {
          console.warn("Spotify Embed controller play notice:", e);
        }
      }

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

  // Previous & Next buttons in the player smoothly spin the carousel or advance queue
  document.getElementById('btn-prev').addEventListener('click', async () => {
    if (getAccessToken()) {
      await skipSpotifyPrevious();
    }
    const prev = (currentAlbumIndex - 1 + albums.length) % albums.length;
    rotateToAlbum(prev);
  });

  document.getElementById('btn-next').addEventListener('click', async () => {
    if (playlistQueue.length > 0) {
      playNextQueueTrack();
      return;
    }
    if (getAccessToken()) {
      await skipSpotifyNext();
    }
    const next = (currentAlbumIndex + 1) % albums.length;
    rotateToAlbum(next);
  });
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

  const N = albums.length;
  const deltaTheta = (2 * Math.PI) / N;

  if (!isDragging) {
    if (Math.abs(spinVelocity) > 0.0004) {
      // Coasting with inertia / momentum
      targetCarouselRotationY += spinVelocity;
      spinVelocity *= 0.93; // Exponential friction decay
    } else {
      // Magnetic Snap to nearest album when spin settles
      spinVelocity = 0;
      const snappedSlot = Math.round(-targetCarouselRotationY / deltaTheta);
      const snapTargetAngle = -snappedSlot * deltaTheta;
      targetCarouselRotationY += (snapTargetAngle - targetCarouselRotationY) * 0.12;

      // Settle active album index
      const activeIndex = ((snappedSlot % N) + N) % N;
      if (activeIndex !== currentAlbumIndex && Math.abs(snapTargetAngle - targetCarouselRotationY) < 0.08) {
        syncActiveAlbum(activeIndex);
      }
    }

    // Subtle gentle spring for vertical tilt back towards resting angle (0.04 rad)
    targetCarouselTiltX += (0.04 - targetCarouselTiltX) * 0.04;
  }

  // Smooth rotation interpolation
  currentCarouselRotationY += (targetCarouselRotationY - currentCarouselRotationY) * 0.12;
  currentCarouselTiltX += (targetCarouselTiltX - currentCarouselTiltX) * 0.12;

  if (carouselGroup) {
    carouselGroup.rotation.y = currentCarouselRotationY;
    carouselGroup.rotation.x = currentCarouselTiltX;

    // Subtle floating levitation bob (aesthetic polish)
    carouselGroup.position.y = -0.05 + Math.sin(Date.now() * 0.0018) * 0.035;

    // Dynamic depth hierarchy (Pokemon TCGP effect): front case is sharp and primary
    for (let i = 0; i < caseInstances.length; i++) {
      const caseObj = caseInstances[i];
      const caseAngle = i * deltaTheta + currentCarouselRotationY;
      const cosAngle = Math.cos(caseAngle); // 1.0 when facing front, -1.0 when in back

      // Gentle scale boost for foreground cases (0.94 -> 1.02)
      const scale = 0.95 + 0.07 * Math.max(0, cosAngle);
      caseObj.scale.set(scale, scale, scale);
    }
  }

  renderer.render(scene, camera);
}

// Start on load
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
