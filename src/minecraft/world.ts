import { BlockType, Vector3D, BlockIntersection } from './types';
import { SimplexNoise } from './noise';
import { generateVillage, generateVilla, generateGasStation, buildRoad } from './structures';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 40;
export const SEA_LEVEL = 12;

export interface Chunk {
  cx: number;
  cz: number;
  blocks: Uint8Array;
  isDirty: boolean;
}

export type WorldPreset = 'standard' | 'flat' | 'mountains';

export class VoxelWorld {
  public chunks = new Map<string, Chunk>();
  public noise: SimplexNoise;
  public seed: number;
  public preset: WorldPreset;
  public worldRadius = 3; // 7x7 chunks = 112x112 blocks
  public spawnPoint: Vector3D = { x: 0, y: 20, z: 0 };

  constructor(seed = 12345, preset: WorldPreset = 'standard') {
    this.seed = seed;
    this.preset = preset;
    this.noise = new SimplexNoise(seed);
    this.generateInitialWorld();
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.getChunkKey(cx, cz));
  }

  public getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = {
        cx,
        cz,
        blocks: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT),
        isDirty: true,
      };
      this.chunks.set(key, chunk);
      this.generateChunkTerrain(chunk);
    }
    return chunk;
  }

  private getBlockIndex(lx: number, ly: number, lz: number): number {
    return ly * (CHUNK_SIZE * CHUNK_SIZE) + lz * CHUNK_SIZE + lx;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= CHUNK_HEIGHT) return BlockType.AIR;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BlockType.AIR;

    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const idx = this.getBlockIndex(lx, y, lz);
    return chunk.blocks[idx] as BlockType;
  }

  public setBlock(x: number, y: number, z: number, type: BlockType): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getOrCreateChunk(cx, cz);

    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const idx = this.getBlockIndex(lx, y, lz);

    if (chunk.blocks[idx] === type) return false;
    chunk.blocks[idx] = type;
    chunk.isDirty = true;

    // If on chunk border, mark neighbor chunk dirty so exposed faces re-render
    if (lx === 0) this.markNeighborDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markNeighborDirty(cx + 1, cz);
    if (lz === 0) this.markNeighborDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markNeighborDirty(cx, cz + 1);

    return true;
  }

  private markNeighborDirty(cx: number, cz: number) {
    const neighbor = this.getChunk(cx, cz);
    if (neighbor) neighbor.isDirty = true;
  }

  public generateInitialWorld() {
    this.chunks.clear();
    const r = this.worldRadius;
    for (let cx = -r; cx <= r; cx++) {
      for (let cz = -r; cz <= r; cz++) {
        this.getOrCreateChunk(cx, cz);
      }
    }

    // Add trees and flora in second pass so tree leaves can cross chunk boundaries
    for (let cx = -r; cx <= r; cx++) {
      for (let cz = -r; cz <= r; cz++) {
        this.populateFeatures(cx, cz);
      }
    }

    // Generate the Village, Luxury Villa, and Tankstation
    if (this.preset !== 'flat') {
      generateVillage(this, 16, 16);
      generateVilla(this, -26, -22);
      generateGasStation(this, 2, -12);

      // Connect with roads
      buildRoad(this, 2, -5, 14, 12, 3); // Gas Station to Village
      buildRoad(this, 2, -10, -20, -18, 3); // Gas Station to Villa
    }

    // Set spawn point on highest ground near (0, 0)
    let highestY = 0;
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const b = this.getBlock(0, y, 0);
      if (b !== BlockType.AIR && b !== BlockType.WATER && b !== BlockType.LEAVES) {
        highestY = y;
        break;
      }
    }
    this.spawnPoint = { x: 0.5, y: highestY + 2.5, z: 0.5 };
  }

  private generateChunkTerrain(chunk: Chunk) {
    const { cx, cz } = chunk;

    if (this.preset === 'flat') {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          chunk.blocks[this.getBlockIndex(lx, 0, lz)] = BlockType.BEDROCK;
          chunk.blocks[this.getBlockIndex(lx, 1, lz)] = BlockType.DIRT;
          chunk.blocks[this.getBlockIndex(lx, 2, lz)] = BlockType.DIRT;
          chunk.blocks[this.getBlockIndex(lx, 3, lz)] = BlockType.GRASS;
        }
      }
      return;
    }

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;

        // Base height calculation using Simplex Noise
        let height: number;
        if (this.preset === 'mountains') {
          const raw = this.noise.fbm2D(wx * 0.02, wz * 0.02, 5, 0.5, 2.0);
          height = Math.floor(14 + (raw * 0.5 + 0.5) * 22);
        } else {
          // Standard rolling hills
          const raw = this.noise.fbm2D(wx * 0.025, wz * 0.025, 4, 0.5, 2.0);
          height = Math.floor(13 + (raw * 0.5 + 0.5) * 11);
        }
        height = Math.max(3, Math.min(CHUNK_HEIGHT - 6, height));

        // Fill column
        for (let y = 0; y <= height; y++) {
          const idx = this.getBlockIndex(lx, y, lz);
          if (y === 0) {
            chunk.blocks[idx] = BlockType.BEDROCK;
          } else if (y < height - 3) {
            // Stone base with occasional ores
            const oreRoll = Math.sin(wx * 17 + y * 31 + wz * 43);
            if (y < 6 && oreRoll > 0.88) {
              chunk.blocks[idx] = BlockType.DIAMOND_ORE;
            } else if (y < 10 && oreRoll > 0.82) {
              chunk.blocks[idx] = BlockType.GOLD_ORE;
            } else if (y < 18 && oreRoll > 0.72) {
              chunk.blocks[idx] = BlockType.IRON_ORE;
            } else if (oreRoll > 0.65) {
              chunk.blocks[idx] = BlockType.COAL_ORE;
            } else {
              chunk.blocks[idx] = BlockType.STONE;
            }
          } else if (y < height) {
            // Under-layer
            if (height <= SEA_LEVEL + 1) {
              chunk.blocks[idx] = BlockType.SAND;
            } else {
              chunk.blocks[idx] = BlockType.DIRT;
            }
          } else {
            // Top layer
            if (height <= SEA_LEVEL + 1) {
              chunk.blocks[idx] = BlockType.SAND;
            } else if (this.preset === 'mountains' && height > 28) {
              chunk.blocks[idx] = BlockType.SNOW;
            } else {
              chunk.blocks[idx] = BlockType.GRASS;
            }
          }
        }

        // Fill water up to SEA_LEVEL
        for (let y = height + 1; y <= SEA_LEVEL; y++) {
          const idx = this.getBlockIndex(lx, y, lz);
          chunk.blocks[idx] = BlockType.WATER;
        }
      }
    }
  }

  // Populate trees, flowers, and decorations
  private populateFeatures(cx: number, cz: number) {
    if (this.preset === 'flat') return;

    for (let lx = 2; lx < CHUNK_SIZE - 2; lx += 2) {
      for (let lz = 2; lz < CHUNK_SIZE - 2; lz += 2) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;

        // Tree placement chance
        const treeRoll = Math.abs(Math.sin(wx * 113.7 + wz * 311.9));
        if (treeRoll > 0.94) {
          // Find ground height
          for (let y = CHUNK_HEIGHT - 6; y > SEA_LEVEL + 1; y--) {
            if (this.getBlock(wx, y, wz) === BlockType.GRASS) {
              this.buildTree(wx, y + 1, wz);
              break;
            }
          }
        } else if (treeRoll > 0.88) {
          // Flower placement
          for (let y = CHUNK_HEIGHT - 2; y > SEA_LEVEL + 1; y--) {
            if (this.getBlock(wx, y, wz) === BlockType.GRASS && this.getBlock(wx, y + 1, wz) === BlockType.AIR) {
              this.setBlock(wx, y + 1, wz, treeRoll > 0.91 ? BlockType.POPPY : BlockType.DANDELION);
              break;
            }
          }
        }
      }
    }
  }

  private buildTree(x: number, y: number, z: number) {
    const trunkHeight = 4 + Math.floor(Math.abs(Math.sin(x * 51 + z * 19)) * 2);
    // Trunk
    for (let dy = 0; dy < trunkHeight; dy++) {
      this.setBlock(x, y + dy, z, BlockType.WOOD_LOG);
    }
    // Leaves canopy
    const topY = y + trunkHeight;
    for (let ly = topY - 2; ly <= topY + 1; ly++) {
      const radius = ly >= topY ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && ly === topY) continue;
          if (dx === 0 && dz === 0 && ly < topY) continue; // keep log in center
          if (this.getBlock(x + dx, ly, z + dz) === BlockType.AIR) {
            this.setBlock(x + dx, ly, z + dz, BlockType.LEAVES);
          }
        }
      }
    }
  }

  // Raycast through voxels using fast Amanatides & Woo 3D grid traversal (DDA)
  public raycast(
    origin: Vector3D,
    direction: Vector3D,
    maxDistance = 6.0
  ): BlockIntersection | null {
    let px = origin.x;
    let py = origin.y;
    let pz = origin.z;

    const dx = direction.x;
    const dy = direction.y;
    const dz = direction.z;

    let mapX = Math.floor(px);
    let mapY = Math.floor(py);
    let mapZ = Math.floor(pz);

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const deltaDistX = Math.abs(dx) < 1e-6 ? 1e30 : Math.abs(1 / dx);
    const deltaDistY = Math.abs(dy) < 1e-6 ? 1e30 : Math.abs(1 / dy);
    const deltaDistZ = Math.abs(dz) < 1e-6 ? 1e30 : Math.abs(1 / dz);

    let sideDistX = (dx > 0 ? (mapX + 1 - px) : (px - mapX)) * deltaDistX;
    let sideDistY = (dy > 0 ? (mapY + 1 - py) : (py - mapY)) * deltaDistY;
    let sideDistZ = (dz > 0 ? (mapZ + 1 - pz) : (pz - mapZ)) * deltaDistZ;

    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;

    let dist = 0;

    while (dist < maxDistance) {
      if (sideDistX < sideDistY) {
        if (sideDistX < sideDistZ) {
          dist = sideDistX;
          sideDistX += deltaDistX;
          mapX += stepX;
          normalX = -stepX;
          normalY = 0;
          normalZ = 0;
        } else {
          dist = sideDistZ;
          sideDistZ += deltaDistZ;
          mapZ += stepZ;
          normalX = 0;
          normalY = 0;
          normalZ = -stepZ;
        }
      } else {
        if (sideDistY < sideDistZ) {
          dist = sideDistY;
          sideDistY += deltaDistY;
          mapY += stepY;
          normalX = 0;
          normalY = -stepY;
          normalZ = 0;
        } else {
          dist = sideDistZ;
          sideDistZ += deltaDistZ;
          mapZ += stepZ;
          normalX = 0;
          normalY = 0;
          normalZ = -stepZ;
        }
      }

      if (dist > maxDistance) break;

      const block = this.getBlock(mapX, mapY, mapZ);
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return {
          blockPos: { x: mapX, y: mapY, z: mapZ },
          faceNormal: { x: normalX, y: normalY, z: normalZ },
          distance: dist,
        };
      }
    }

    return null;
  }

  // Explode TNT with spherical radius
  public explode(center: Vector3D, radius = 3.5): Vector3D[] {
    const destroyed: Vector3D[] = [];
    const rInt = Math.ceil(radius);

    for (let dx = -rInt; dx <= rInt; dx++) {
      for (let dy = -rInt; dy <= rInt; dy++) {
        for (let dz = -rInt; dz <= rInt; dz++) {
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq <= radius * radius) {
            const bx = Math.floor(center.x + dx);
            const by = Math.floor(center.y + dy);
            const bz = Math.floor(center.z + dz);
            const block = this.getBlock(bx, by, bz);
            if (block !== BlockType.AIR && block !== BlockType.BEDROCK) {
              this.setBlock(bx, by, bz, BlockType.AIR);
              destroyed.push({ x: bx, y: by, z: bz });
            }
          }
        }
      }
    }

    return destroyed;
  }

  // Serialize modified world to JSON string
  public serialize(): string {
    const data: Record<string, number[]> = {};
    for (const [key, chunk] of this.chunks.entries()) {
      data[key] = Array.from(chunk.blocks);
    }
    return JSON.stringify({
      seed: this.seed,
      preset: this.preset,
      chunks: data,
    });
  }

  // Load from JSON
  public deserialize(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr);
      this.seed = parsed.seed || 12345;
      this.preset = parsed.preset || 'standard';
      this.noise = new SimplexNoise(this.seed);
      this.chunks.clear();

      for (const [key, arr] of Object.entries(parsed.chunks)) {
        const [cx, cz] = key.split(',').map(Number);
        const chunk: Chunk = {
          cx,
          cz,
          blocks: new Uint8Array(arr as number[]),
          isDirty: true,
        };
        this.chunks.set(key, chunk);
      }
    } catch (e) {
      console.error('Failed to deserialize world', e);
    }
  }
}
