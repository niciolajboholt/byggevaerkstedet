import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import geometry from './brick-geometry.cjs';

const { brickOutline, tilePosition, modelBounds } = geometry;
const DEPTH = .55;

export function createViewer(container, options = {}) {
  if (!container || typeof container.appendChild !== 'function') throw new TypeError('A viewer container is required');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) throw new Error('WebGL2 is unavailable');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  } catch (error) {
    context.getExtension('WEBGL_lose_context')?.loseContext();
    throw error;
  }
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D-model af Plus-Plus-brikker');
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 1000);
  const model = new THREE.Group();
  scene.add(model);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa5a9b0, 2.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-25, 40, 65);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, .6);
  fill.position.set(30, -10, 20);
  scene.add(fill);

  const geometries = new Map(['h', 'v'].map(orientation => {
    const outline = brickOutline(orientation, .04);
    // Invert image Y so the front view reads exactly like the instructions.
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, -y)));
    const solid = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH - .04, steps: 1, bevelEnabled: true,
      bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 1
    });
    solid.translate(0, 0, -DEPTH / 2 + .02);
    solid.computeVertexNormals();
    return [orientation, solid];
  }));
  const materials = new Map();
  let disposed = false, lost = false, bounds = null, width = 1, height = 1;
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minZoom = .55;
  controls.maxZoom = 5;
  controls.rotateSpeed = .7;
  controls.zoomSpeed = .8;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  function render() {
    if (!disposed && !lost && width > 0 && height > 0) renderer.render(scene, camera);
  }
  controls.addEventListener('change', render);

  function radius() {
    return bounds ? Math.max(2, Math.hypot(bounds.maxX-bounds.minX, bounds.maxY-bounds.minY, DEPTH) / 2) : 3;
  }
  function fit() {
    camera.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    let halfWidth = 2, halfHeight = 2;
    if (!box.isEmpty()) {
      halfWidth = .1; halfHeight = .1;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        halfWidth = Math.max(halfWidth, Math.abs(p.x));
        halfHeight = Math.max(halfHeight, Math.abs(p.y));
      }
    }
    const aspect = width / height;
    const top = Math.max(halfHeight, halfWidth / aspect) * 1.16;
    camera.top = top; camera.bottom = -top;
    camera.right = top * aspect; camera.left = -top * aspect;
    camera.near = .01; camera.far = Math.max(100, radius() * 12);
    camera.updateProjectionMatrix();
  }
  function reset(view = 'angle') {
    if (disposed) return;
    const distance = radius() * 4;
    camera.position.copy(view === 'front' ? new THREE.Vector3(0, 0, distance) : new THREE.Vector3(.25, .32, 1).normalize().multiplyScalar(distance));
    camera.up.set(0, 1, 0);
    controls.target.set(0, 0, 0);
    camera.zoom = 1;
    camera.lookAt(controls.target);
    fit();
    controls.update();
    render();
  }
  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width)); height = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    fit();
    render();
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  if (!observer) globalThis.addEventListener('resize', resize);
  function contextLost(event) {
    event.preventDefault();
    if (disposed || lost) return;
    lost = true;
    options.onContextLost?.();
  }
  canvas.addEventListener('webglcontextlost', contextLost);

  function update({ tiles = [], palette = {}, name = '' } = {}) {
    if (disposed) return;
    // Validate before changing the current scene; one source tile is one mesh.
    const nextBounds = modelBounds(tiles);
    for (const tile of tiles) {
      if (!geometries.has(tile.o) || !palette[tile.c]?.[1]) throw new TypeError('Invalid 3D brick or palette');
    }
    model.clear();
    for (const material of materials.values()) material.dispose();
    materials.clear();
    bounds = nextBounds;
    model.position.set(0, 0, 0);
    if (bounds) model.position.set(-(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, 0);
    for (const tile of tiles) {
      if (!materials.has(tile.c)) materials.set(tile.c, new THREE.MeshStandardMaterial({
        color: palette[tile.c][1], roughness: .47, metalness: 0
      }));
      const mesh = new THREE.Mesh(geometries.get(tile.o), materials.get(tile.c));
      const [x, y] = tilePosition(tile);
      mesh.position.set(x, -y, 0);
      model.add(mesh);
    }
    canvas.setAttribute('aria-label', `${name || 'Plus-Plus-model'} i 3D, ${tiles.length} brikker`);
    resize();
    reset();
  }
  function zoom(factor) {
    if (disposed || !Number.isFinite(factor) || factor <= 0) return;
    camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom);
    camera.updateProjectionMatrix();
    controls.update();
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    if (!observer) globalThis.removeEventListener('resize', resize);
    canvas.removeEventListener('webglcontextlost', contextLost);
    controls.removeEventListener('change', render);
    controls.dispose();
    model.clear();
    for (const solid of geometries.values()) solid.dispose();
    for (const material of materials.values()) material.dispose();
    geometries.clear(); materials.clear();
    scene.clear();
    renderer.renderLists.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  resize();
  reset();
  return { update, reset, zoom, dispose };
}
