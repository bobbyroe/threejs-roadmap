import * as THREE from "three";

import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { UltraHDRLoader } from 'jsm/loaders/UltraHDRLoader.js';
import { TeapotGeometry } from 'jsm/geometries/TeapotGeometry.js';
import { RoundedBoxGeometry } from 'jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
import getBgSphere from './src/getBgSphere.js';
import { LineMaterial } from 'jsm/lines/LineMaterial.js';
import { Line2 } from 'jsm/lines/Line2.js';
import { LineSegmentsGeometry } from 'jsm/lines/LineSegmentsGeometry.js';

const w = window.innerWidth;
const h = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const hdrLoader = new UltraHDRLoader();
hdrLoader.load('src/envs/san_giuseppe_bridge_2k.jpg', (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr;
});

const glbLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();

// load duck
const duckGlb = await glbLoader.loadAsync('./src/duck.glb');
let duckMaterial = null;
let duckGeometry = null;
duckGlb.scene.traverse((child) => {
  if (child.isMesh) {
    duckMaterial = child.material.clone();
    duckGeometry = child.geometry.clone();
    duckGeometry.scale(0.01, 0.01, 0.01);
  }
});

// MATERIALS
const materials = [
  // chrome material
  new THREE.MeshPhysicalMaterial({
    roughness: 0.0,
    metalness: 1.0,
    thickness: 1.0,
    side: THREE.DoubleSide,
  }),
  // wood material
  new THREE.MeshStandardMaterial({
    map: texLoader.load('./src/wood/baseColor.png'),
    roughnessMap: texLoader.load('./src/wood/roughness.png'),
    normalMap: texLoader.load('./src/wood/normal.png'),
    normalScale: new THREE.Vector2(6, 6),
  }),
  // glass material
  new THREE.MeshPhysicalMaterial({
    roughness: 0.0,
    transmission: 1.0,
    thickness: 1.0,
    flatShading: true,
    side: THREE.DoubleSide,
  }),
  duckMaterial,
  // wireframe material
  new THREE.MeshBasicMaterial({
    color: 0x44ccff,
    wireframe: true,
  }),
  // blue chrome material
  new THREE.MeshPhysicalMaterial({
    roughness: 0.0,
    metalness: 1.0,
    thickness: 1.0,
    color: 0x0099ff,
    side: THREE.DoubleSide,
  })
];

// GEOMETRIES
const geometries = [
  new THREE.TorusKnotGeometry(0.5, 0.2, 128, 64),
  new RoundedBoxGeometry(1, 1, 1, 4, 0.02),
  new THREE.IcosahedronGeometry(0.75, 2),
  duckGeometry,
  new THREE.SphereGeometry(0.75, 16, 16),
  new TeapotGeometry(0.6),
];
const offsets = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5, Math.PI * 2, 0, 0];
const zPos = [0, 0, 0, 0, 2, -2];
const radius = 2;
let rate = 0.0005;

const sceneGroup = new THREE.Group();
sceneGroup.userData.update = (t) => {
  sceneGroup.children.forEach(child => {
    child.userData.update?.(t);
  });
  sceneGroup.rotation.y = t * rate;
};
scene.add(sceneGroup);

for (let i = 0; i < geometries.length; i++) {
  const mesh = getAnimatedInteractiveMesh(i);
  sceneGroup.add(mesh);
}

function getAnimatedInteractiveMesh(index) {
  const mesh = new THREE.Mesh(geometries[index], materials[index]);
  mesh.position.z = zPos[index];
  function update(t) {
    if (index < 4) {
      mesh.position.x = Math.cos(t * rate + offsets[index]) * radius;
      mesh.position.y = Math.sin(t * rate + offsets[index]) * radius;
    }
  }
  function toggle(isPointerDown) {
    mesh.material.wireframe = isPointerDown;
  }
  mesh.userData = {
    update,
    toggle,
  }
  return mesh;
}
const bg = getBgSphere();
scene.add(bg);

// INTERACTIVITY
const rayCaster = new THREE.Raycaster();
const pointerPos = new THREE.Vector2(100, 100);
let isPointerDown = false;
function handleRaycast() {
  rayCaster.setFromCamera(pointerPos, camera);
  const intersects = rayCaster.intersectObjects(sceneGroup.children, false);
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    obj.userData.toggle?.(isPointerDown);

  }
}

function animate(t = 0) {
  requestAnimationFrame(animate);
  sceneGroup.userData.update(t);
  handleRaycast();
  renderer.render(scene, camera);
  controls.update();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('pointermove', (e) => {
  pointerPos.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerPos.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('pointerdown', (e) => {
  isPointerDown = !isPointerDown;
});

// click and hold to enter *bullet time* mode
// release to return to normal speed

