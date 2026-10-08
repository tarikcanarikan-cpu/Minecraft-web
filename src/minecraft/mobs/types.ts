import { Vector3D, BlockType } from '../types';

export type MobType = 'zombie' | 'creeper' | 'sheep' | 'villager';

export interface MobDefinition {
  type: MobType;
  nameNl: string;
  nameEn: string;
  maxHealth: number;
  speed: number;
  attackDamage: number;
  isHostile: boolean;
  drops: { type: BlockType; count: number; chance: number }[];
}

export interface MobEntity {
  id: string;
  type: MobType;
  position: Vector3D;
  velocity: Vector3D;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  isGrounded: boolean;
  isHostile: boolean;
  walkCycle: number;
  hurtTimer: number; // red flash on damage
  soundTimer: number; // delay between vocal groans/bleats
  fuseTimer?: number; // for creeper
  attackCooldown: number;
  isFollowingPlayer?: boolean; // Follows player when clicked!
  heartParticleTimer?: number;
}
