import * as THREE from './public/vendor/three.module.js';
import { JewelCaseShader } from './jewelCaseShader.js';

// Pre-configured albums
const albums = [
  {
    id: 'snatch',
    title: 'Snatch (Original Soundtrack)',
    artist: 'Various Artists • Oasis, Massive Attack, Madonna',
    cover: './public/covers/snatch.png',
    trackCount: '15 Tracks',
    year: '2000',
    caseTint: [0.95, 0.98, 1.0],
    thickness: 0.12,
    gloss: 0.88,
    iridescence: 0.35,
    sampleSong: 'Diamond - Klint'
  },
  {
    id: 'stayin_alive',
    title: 'Stayin Alive in da Club',
    artist: 'Antifarox x DJ Kuff',
    cover: './public/covers/stayin_alive.png',
    trackCount: 'Single',
    year: '2023',
    caseTint: [0.98, 0.95, 1.0],
    thickness: 0.10,
    gloss: 0.92,
    iridescence: 0.50,
    sampleSong: 'Stayin Alive (Club Mix)'
  }
];

let currentAlbumIndex = 0;
let scene, camera, renderer, cdMesh, textureLoader;
let isDragging = false;
let previousPointerPosition = { x: 0, y: 0 };
let targetRotation = { x: 0.15, y: -0.35 };
let currentRotation = { x: 0.15, y: -0.35 };
let autoRotate = false;
let isPlaying = false;
let playbackInterval = null;
let currentProgress = 32;

// Rounded box generator for authentic CD Jewel Case
function createJewelCaseGeometry(width = 3.0, height = 3.0, depth = 0.32, radius = 0.08, smoothness = 8) {
  // Use a clean beveled box shape
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  const r = radius;

  // Clockwise rounded rectangle
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
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelOffset: 0,
    bevelSegments: smoothness
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  geom.computeVertexNormals();

  // Generate UVs mapped cleanly for front (z > 0), back (z < 0), and edges
  const pos = geom.attributes.position;
  const normals = geom.attributes.normal;
  const uvs = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nz = normals.getZ(i);

    if (nz > 0.5) {
      // Front face
      uvs[i * 2] = (x / width) + 0.5;
      uvs[i * 2 + 1] = (y / height) + 0.5;
    } else if (nz < -0.5) {
      // Back face
      uvs[i * 2] = (-x / width) + 0.5;
      uvs[i * 2 + 1] = (y / height) + 0.5;
    } else {
      // Edge side walls
      uvs[i * 2] = (z / depth) + 0.5;
      uvs[i * 2 + 1] = (y / height) + 0.5;
    }
  }

  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geom;
}


function init() {
  console.log('INIT CALLED! Three version:', THREE.REVISION);
  const container = document.getElementById('viewport-container');
  const canvas = document.getElementById('canvas3d');
  console.log('Container dimensions:', container.clientWidth, container.clientHeight);


  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  // Renderer
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

  // Lights
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(3, 4, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x88ccff, 0.8);
  fillLight.position.set(-3, -2, 2);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  backLight.position.set(0, 3, -4);
  scene.add(backLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  // Loaders
  textureLoader = new THREE.TextureLoader();

  // Create a default placeholder canvas texture so shader has a valid sampler2D immediately
  const dummyCanvas = document.createElement('canvas');
  dummyCanvas.width = 64; dummyCanvas.height = 64;
  const ctx = dummyCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);
  const defaultTex = new THREE.CanvasTexture(dummyCanvas);
  JewelCaseShader.uniforms.tCover.value = defaultTex;


  // Build the Jewel Case Mesh
  createCaseMesh();

  // Event Listeners
  setupInteraction(canvas);
  setupUI();
  window.addEventListener('resize', onWindowResize);

  // Initial Album Setup
  loadAlbum(0);

  // Animation Loop
  animate();
}

function createCaseMesh() {
  if (cdMesh) {
    scene.remove(cdMesh);
    cdMesh.geometry.dispose();
  }

  const album = albums[currentAlbumIndex];
  const depth = album.thickness * 2.2;
  const geometry = createJewelCaseGeometry(3.0, 3.0, depth, 0.08, 4);

  // Material with custom JewelCaseShader
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(JewelCaseShader.uniforms),
    vertexShader: JewelCaseShader.vertexShader,
    fragmentShader: JewelCaseShader.fragmentShader
  });

  material.uniforms.uThickness.value = album.thickness;
  material.uniforms.uPlasticGloss.value = album.gloss;
  material.uniforms.uPlasticIridescence.value = album.iridescence;
  material.uniforms.uCaseTint.value = new THREE.Color(...album.caseTint);
  material.uniforms.uSpineRibs.value = 1.0;

  cdMesh = new THREE.Mesh(geometry, material);
  scene.add(cdMesh);
}


function loadAlbum(index) {
  currentAlbumIndex = index;
  const album = albums[index];

  // Load cover texture
  textureLoader.load(album.cover, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.generateMipmaps = true;

    if (cdMesh && cdMesh.material.uniforms) {
      cdMesh.material.uniforms.tCover.value = tex;
      cdMesh.material.uniforms.uThickness.value = album.thickness;
      cdMesh.material.uniforms.uPlasticGloss.value = album.gloss;
      cdMesh.material.uniforms.uPlasticIridescence.value = album.iridescence;
      cdMesh.material.uniforms.uCaseTint.value = new THREE.Color(...album.caseTint);
    }

  });

  // Update UI Elements
  document.getElementById('track-title').textContent = album.title;
  document.getElementById('track-artist').textContent = album.artist;
  document.getElementById('track-badge').textContent = `${album.trackCount} • ${album.year}`;
  document.getElementById('track-cover-mini').src = album.cover;
  document.getElementById('now-playing-sample').textContent = album.sampleSong;

  // Sliders sync
  document.getElementById('slider-thickness').value = album.thickness * 100;
  document.getElementById('val-thickness').textContent = `${Math.round(album.thickness * 100)}%`;

  document.getElementById('slider-gloss').value = album.gloss * 100;
  document.getElementById('val-gloss').textContent = `${Math.round(album.gloss * 100)}%`;

  document.getElementById('slider-irid').value = album.iridescence * 100;
  document.getElementById('val-irid').textContent = `${Math.round(album.iridescence * 100)}%`;

  // Highlight active thumb
  document.querySelectorAll('.album-thumb-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
}

function setupInteraction(canvas) {
  let isPointerDown = false;

  canvas.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    previousPointerPosition = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return;

    const deltaX = e.clientX - previousPointerPosition.x;
    const deltaY = e.clientY - previousPointerPosition.y;

    targetRotation.y += deltaX * 0.008;
    targetRotation.x += deltaY * 0.008;

    // Constrain pitch to avoid flipping upside down
    targetRotation.x = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, targetRotation.x));

    previousPointerPosition = { x: e.clientX, y: e.clientY };
  });

  const endDrag = (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}
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
  // Preset Angles
  document.getElementById('btn-view-front').addEventListener('click', () => {
    targetRotation = { x: 0, y: 0 };
    setActiveHudBtn('btn-view-front');
  });

  document.getElementById('btn-view-tilt').addEventListener('click', () => {
    targetRotation = { x: 0.22, y: -0.45 };
    setActiveHudBtn('btn-view-tilt');
  });

  document.getElementById('btn-view-edge').addEventListener('click', () => {
    // 82° edge view to inspect thick plastic spine
    targetRotation = { x: 0.05, y: -Math.PI * 0.45 };
    setActiveHudBtn('btn-view-edge');
  });

  document.getElementById('btn-view-back').addEventListener('click', () => {
    targetRotation = { x: 0, y: Math.PI };
    setActiveHudBtn('btn-view-back');
  });

  function setActiveHudBtn(id) {
    document.querySelectorAll('.hud-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // Thumb clicks
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
        caseTint: [0.95, 0.98, 1.0],
        thickness: 0.11,
        gloss: 0.88,
        iridescence: 0.42,
        sampleSong: 'Track 01'
      };

      albums.push(customAlbum);
      addAlbumThumb(customAlbum, albums.length - 1);
      loadAlbum(albums.length - 1);
    };
    reader.readAsDataURL(file);
  });

  // Sliders
  const thicknessSlider = document.getElementById('slider-thickness');
  thicknessSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 100;
    albums[currentAlbumIndex].thickness = val;
    document.getElementById('val-thickness').textContent = `${Math.round(val * 100)}%`;
    createCaseMesh();
    loadAlbum(currentAlbumIndex);
  });

  const glossSlider = document.getElementById('slider-gloss');
  glossSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 100;
    albums[currentAlbumIndex].gloss = val;
    document.getElementById('val-gloss').textContent = `${Math.round(val * 100)}%`;
    if (cdMesh && cdMesh.material.uniforms) {
      cdMesh.material.uniforms.uPlasticGloss.value = val;
    }
  });

  const iridSlider = document.getElementById('slider-irid');
  iridSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 100;
    albums[currentAlbumIndex].iridescence = val;
    document.getElementById('val-irid').textContent = `${Math.round(val * 100)}%`;
    if (cdMesh && cdMesh.material.uniforms) {
      cdMesh.material.uniforms.uPlasticIridescence.value = val;
    }
  });

  // Spine ribs toggle
  const ribToggle = document.getElementById('toggle-ribs');
  ribToggle.addEventListener('change', (e) => {
    if (cdMesh && cdMesh.material.uniforms) {
      cdMesh.material.uniforms.uSpineRibs.value = e.target.checked ? 1.0 : 0.0;
    }
  });

  // Auto-rotate toggle
  const autoRotateToggle = document.getElementById('toggle-autorotate');
  autoRotateToggle.addEventListener('change', (e) => {
    autoRotate = e.target.checked;
  });

  // Material Presets
  setupMaterialPresets();

  // Audio Playback Simulation
  setupAudioPlayer();
}

function setupMaterialPresets() {
  const presets = {
    standard: { gloss: 0.85, iridescence: 0.40, thickness: 0.11, tint: [0.95, 0.98, 1.0] },
    crystal: { gloss: 0.96, iridescence: 0.65, thickness: 0.14, tint: [1.0, 1.0, 1.0] },
    matte: { gloss: 0.35, iridescence: 0.15, thickness: 0.09, tint: [0.92, 0.94, 0.96] },
    smoke: { gloss: 0.90, iridescence: 0.50, thickness: 0.12, tint: [0.65, 0.70, 0.80] }
  };

  document.querySelectorAll('.mat-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mat-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const presetKey = card.dataset.preset;
      const p = presets[presetKey];
      if (p && cdMesh && cdMesh.material.uniforms) {
        cdMesh.material.uniforms.uPlasticGloss.value = p.gloss;
        cdMesh.material.uniforms.uPlasticIridescence.value = p.iridescence;
        cdMesh.material.uniforms.uCaseTint.value = p.tint;

        document.getElementById('slider-gloss').value = p.gloss * 100;
        document.getElementById('val-gloss').textContent = `${Math.round(p.gloss * 100)}%`;

        document.getElementById('slider-irid').value = p.iridescence * 100;
        document.getElementById('val-irid').textContent = `${Math.round(p.iridescence * 100)}%`;
      }
    });
  });
}

function setupAudioPlayer() {
  const playBtn = document.getElementById('btn-play');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const progressFill = document.getElementById('progress-fill');
  const timeCurrent = document.getElementById('time-current');

  playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      playbackInterval = setInterval(() => {
        currentProgress = (currentProgress + 0.5) % 100;
        progressFill.style.width = `${currentProgress}%`;
        const totalSeconds = Math.floor((currentProgress / 100) * 215);
        const mins = Math.floor(totalSeconds / 60);
        const secs = String(totalSeconds % 60).padStart(2, '0');
        timeCurrent.textContent = `${mins}:${secs}`;
      }, 500);
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      clearInterval(playbackInterval);
    }
  });

  // Track skip
  document.getElementById('btn-prev').addEventListener('click', () => {
    const prev = (currentAlbumIndex - 1 + albums.length) % albums.length;
    loadAlbum(prev);
  });
  document.getElementById('btn-next').addEventListener('click', () => {
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

  // Smooth lerp damping rotation for silky smooth feel
  currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
  currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;

  if (cdMesh) {
    cdMesh.rotation.x = currentRotation.x;
    cdMesh.rotation.y = currentRotation.y;
  }

  renderer.render(scene, camera);
}

// Start on load
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

