import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SIZE } from '../../game/types';
import { CELL_PITCH, cellToWorld } from './motion';

const COLORS = { page: '#B9C2B5', tray: '#2E3A33', well: '#3F4D44', light: '#FFE9C7' } as const;
const TRAY_SPAN = SIZE * CELL_PITCH + 0.25;
const TRAY_DEPTH = 0.3;

export type Stage = {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  /** Everything that tilts: tray body, wells, and tiles. */
  readonly tray: Group;
  /** Parent for tile meshes; sits on the tray floor. */
  readonly tileLayer: Group;
  render(): void;
  dispose(): void;
};

/** Throws when WebGL is unavailable; callers fall back to the DOM renderer. */
export function createStage(host: HTMLElement): Stage {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(COLORS.page);

  const camera = new PerspectiveCamera(30, 1.25, 0.1, 100);
  camera.position.set(0, 8.4, 5.4);
  camera.lookAt(0, 0, 0.15);

  scene.add(new HemisphereLight('#FFFFFF', COLORS.tray, 1.4));
  const key = new DirectionalLight(COLORS.light, 2.2);
  key.position.set(-3, 8, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.radius = 4;
  scene.add(key);

  const tray = new Group();
  const bodyGeometry = new RoundedBoxGeometry(TRAY_SPAN + 0.3, TRAY_DEPTH, TRAY_SPAN + 0.3, 4, 0.14);
  const bodyMaterial = new MeshStandardMaterial({ color: COLORS.tray, roughness: 0.35, metalness: 0.05 });
  const body = new Mesh(bodyGeometry, bodyMaterial);
  body.position.y = -TRAY_DEPTH / 2;
  body.receiveShadow = true;
  tray.add(body);

  const wellGeometry = new PlaneGeometry(1, 1);
  const wellMaterial = new MeshStandardMaterial({ color: COLORS.well, roughness: 0.8 });
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const well = new Mesh(wellGeometry, wellMaterial);
      const { x, z } = cellToWorld(row, col);
      well.rotation.x = -Math.PI / 2;
      well.position.set(x, 0.002, z);
      well.receiveShadow = true;
      tray.add(well);
    }
  }

  const tileLayer = new Group();
  tray.add(tileLayer);
  scene.add(tray);

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    renderer,
    scene,
    camera,
    tray,
    tileLayer,
    render: () => renderer.render(scene, camera),
    dispose: () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      wellGeometry.dispose();
      wellMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
