import { CanvasTexture, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { tileColors } from './palette';

export const TILE_HEIGHT = 0.34;
export const NUMERAL_FONT = 'Archivo';
const TEXTURE_PX = 256;

export type TileFactory = {
  create(value: number): Group;
  dispose(): void;
};

function numeralTexture(value: number, ink: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_PX;
  canvas.height = TEXTURE_PX;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('2D canvas context unavailable');
  const digits = String(value).length;
  const size = TEXTURE_PX * (digits <= 2 ? 0.52 : digits === 3 ? 0.42 : 0.32);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px ${NUMERAL_FONT}, system-ui, sans-serif`;
  ctx.fillText(String(value), TEXTURE_PX / 2, TEXTURE_PX / 2 + size * 0.04);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Builds tile meshes; geometry is shared and materials are cached per value. */
export function createTileFactory(): TileFactory {
  const bodyGeometry = new RoundedBoxGeometry(0.94, TILE_HEIGHT, 0.94, 4, 0.12);
  const faceGeometry = new PlaneGeometry(0.86, 0.86);
  const materials = new Map<number, { body: MeshStandardMaterial; face: MeshStandardMaterial }>();

  const materialsFor = (value: number) => {
    const cached = materials.get(value);
    if (cached !== undefined) return cached;
    const { body, ink } = tileColors(value);
    const created = {
      body: new MeshStandardMaterial({ color: body, roughness: 0.42, metalness: 0.02 }),
      face: new MeshStandardMaterial({ map: numeralTexture(value, ink), transparent: true, roughness: 0.6 }),
    };
    materials.set(value, created);
    return created;
  };

  return {
    create(value) {
      const { body, face } = materialsFor(value);
      const group = new Group();
      const bodyMesh = new Mesh(bodyGeometry, body);
      bodyMesh.position.y = TILE_HEIGHT / 2;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      const faceMesh = new Mesh(faceGeometry, face);
      faceMesh.rotation.x = -Math.PI / 2;
      faceMesh.position.y = TILE_HEIGHT + 0.001;
      group.add(bodyMesh, faceMesh);
      return group;
    },
    dispose() {
      bodyGeometry.dispose();
      faceGeometry.dispose();
      for (const { body, face } of materials.values()) {
        face.map?.dispose();
        face.dispose();
        body.dispose();
      }
    },
  };
}
