export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  WOOD_LOG = 5,
  WOOD_PLANKS = 6,
  LEAVES = 7,
  BEDROCK = 8,
  SAND = 9,
  GLASS = 10,
  BRICK = 11,
  TNT = 12,
  CRAFTING_TABLE = 13,
  FURNACE = 14,
  CHEST = 15,
  BOOKSHELF = 16,
  COAL_ORE = 17,
  IRON_ORE = 18,
  GOLD_ORE = 19,
  DIAMOND_ORE = 20,
  EMERALD_ORE = 21,
  GLOWSTONE = 22,
  OBSIDIAN = 23,
  WATER = 24,
  TORCH = 25,
  POPPY = 26,
  DANDELION = 27,
  SNOW = 28,
  ICE = 29,
  DIAMOND_SWORD = 30,
  COOKED_BEEF = 31,
}

export type SoundType = 'grass' | 'dirt' | 'stone' | 'wood' | 'glass' | 'sand' | 'tnt' | 'metal';

export interface BlockDefinition {
  id: BlockType;
  nameEn: string;
  nameNl: string;
  hardness: number; // break time in seconds (creative is instant)
  sound: SoundType;
  isTransparent?: boolean;
  isSolid?: boolean;
  lightLevel?: number; // 0-15
  category: 'building' | 'natural' | 'functional' | 'ores' | 'decorative';
}

export interface ItemStack {
  id: BlockType;
  count: number;
}

export type GameMode = 'creative' | 'survival';

export interface PlayerStats {
  health: number; // max 20 (10 hearts)
  maxHealth: number;
  hunger: number; // max 20
  saturation: number;
  isFlying: boolean;
  isGrounded: boolean;
  isSneaking: boolean;
  isSprinting: boolean;
  isSwimming: boolean;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BlockIntersection {
  blockPos: Vector3D;
  faceNormal: Vector3D;
  distance: number;
}

export interface ItemDrop {
  id: string;
  type: BlockType;
  position: Vector3D;
  velocity: Vector3D;
  rotation: number;
  createdAt: number;
}
