import * as THREE from 'three';
import { Vector3D, BlockType } from '../types';
import { VoxelWorld, CHUNK_HEIGHT } from '../world';
import { sound } from '../sound';
import { MobType, MobEntity, MobDefinition } from './types';
import { MobModelFactory, MobMeshInstance } from './models';

export const MOB_DEFS: Record<MobType, MobDefinition> = {
  zombie: {
    type: 'zombie',
    nameNl: 'Zombie',
    nameEn: 'Zombie',
    maxHealth: 20,
    speed: 2.5,
    attackDamage: 2, // 2 HP = 1 full heart out of 10 hearts!
    isHostile: true,
    drops: [
      { type: BlockType.COOKED_BEEF, count: 2, chance: 1.0 },
      { type: BlockType.IRON_ORE, count: 1, chance: 0.3 },
    ],
  },
  creeper: {
    type: 'creeper',
    nameNl: 'Creeper',
    nameEn: 'Creeper',
    maxHealth: 16,
    speed: 2.1,
    attackDamage: 12,
    isHostile: true,
    drops: [
      { type: BlockType.TNT, count: 1, chance: 0.6 },
      { type: BlockType.SAND, count: 2, chance: 0.8 },
    ],
  },
  sheep: {
    type: 'sheep',
    nameNl: 'Schaap',
    nameEn: 'Sheep',
    maxHealth: 8,
    speed: 1.4,
    attackDamage: 0,
    isHostile: false,
    drops: [
      { type: BlockType.SNOW, count: 2, chance: 1.0 }, // Wool substitute
    ],
  },
  villager: {
    type: 'villager',
    nameNl: 'Dorpeling',
    nameEn: 'Villager',
    maxHealth: 20,
    speed: 1.5,
    attackDamage: 0,
    isHostile: false,
    drops: [
      { type: BlockType.WOOD_PLANKS, count: 2, chance: 0.5 },
    ],
  },
};

export class MobManager {
  public mobs: MobEntity[] = [];
  private meshMap = new Map<string, MobMeshInstance>();
  private factory: MobModelFactory;
  private scene: THREE.Scene;
  private spawnCooldown = 3.0; // spawn check every 3s
  private nextMobId = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.factory = new MobModelFactory();
  }

  // Spawn a mob at world position
  public spawnMob(type: MobType, pos: Vector3D): MobEntity {
    const def = MOB_DEFS[type];
    const mob: MobEntity = {
      id: `mob_${this.nextMobId++}_${type}`,
      type,
      position: { ...pos },
      velocity: { x: 0, y: 0, z: 0 },
      yaw: Math.random() * Math.PI * 2,
      pitch: 0,
      health: def.maxHealth,
      maxHealth: def.maxHealth,
      isGrounded: false,
      isHostile: def.isHostile,
      walkCycle: 0,
      hurtTimer: 0,
      soundTimer: 2.0 + Math.random() * 5.0,
      fuseTimer: type === 'creeper' ? 0 : undefined,
      attackCooldown: 0,
    };

    // Create 3D Mesh
    let meshInst: MobMeshInstance;
    if (type === 'zombie') meshInst = this.factory.createZombie();
    else if (type === 'creeper') meshInst = this.factory.createCreeper();
    else if (type === 'sheep') meshInst = this.factory.createSheep();
    else meshInst = this.factory.createVillager();

    meshInst.group.position.set(pos.x, pos.y, pos.z);
    this.scene.add(meshInst.group);
    this.meshMap.set(mob.id, meshInst);

    this.mobs.push(mob);
    return mob;
  }

  // Initial population of peaceful mobs (Sheep, Villagers in Village and Villa)
  public spawnInitialFauna(world: VoxelWorld) {
    const findSurface = (x: number, z: number) => {
      for (let y = CHUNK_HEIGHT - 2; y >= 2; y--) {
        const b = world.getBlock(x, y, z);
        if (b !== BlockType.AIR && b !== BlockType.LEAVES) {
          return y + 1;
        }
      }
      return 15;
    };

    // 1. Villagers living in the Village (Town well, houses, and farm)
    const villagePositions = [
      { x: 16.5, z: 14.5 },
      { x: 13.5, z: 16.5 },
      { x: 18.5, z: 18.5 },
      { x: 15.5, z: 22.5 },
    ];
    for (const pos of villagePositions) {
      const y = findSurface(Math.floor(pos.x), Math.floor(pos.z));
      this.spawnMob('villager', { x: pos.x, y, z: pos.z });
    }

    // 2. Villager resident at the Luxury Villa (on the patio / lounge)
    const villaResidentY = findSurface(-20, -18);
    this.spawnMob('villager', { x: -20.5, y: villaResidentY, z: -18.5 });

    // 3. Sheep grazing in the countryside near the village
    const sheepPositions = [
      { x: 22.5, z: 12.5 },
      { x: 24.5, z: 20.5 },
      { x: 8.5, z: 20.5 },
      { x: 10.5, z: 8.5 },
    ];
    for (const pos of sheepPositions) {
      const y = findSurface(Math.floor(pos.x), Math.floor(pos.z));
      this.spawnMob('sheep', { x: pos.x, y, z: pos.z });
    }
  }

  // Hit mob with sword/fist
  public hitMob(mobId: string, damage: number, attackerPos: Vector3D, onDrop?: (pos: Vector3D, type: BlockType) => void): boolean {
    const mob = this.mobs.find((m) => m.id === mobId);
    if (!mob) return false;

    sound.playMobHurt();
    mob.health -= damage;
    mob.hurtTimer = 0.25;

    // Knockback
    const dx = mob.position.x - attackerPos.x;
    const dz = mob.position.z - attackerPos.z;
    const dist = Math.hypot(dx, dz) || 1;
    mob.velocity.x += (dx / dist) * 5.0;
    mob.velocity.y += 3.5;
    mob.velocity.z += (dz / dist) * 5.0;

    // Check death
    if (mob.health <= 0) {
      this.killMob(mob.id, onDrop);
    }

    return true;
  }

  // Kill mob and spawn drops
  public killMob(mobId: string, onDrop?: (pos: Vector3D, type: BlockType) => void) {
    const idx = this.mobs.findIndex((m) => m.id === mobId);
    if (idx === -1) return;
    const mob = this.mobs[idx];

    // Vocal sound
    if (mob.type === 'zombie') sound.playZombieGroan();
    else if (mob.type === 'sheep') sound.playSheepBleat();
    else if (mob.type === 'villager') sound.playVillagerHrmm();

    // Spawn item drops
    const def = MOB_DEFS[mob.type];
    if (def && onDrop) {
      for (const d of def.drops) {
        if (Math.random() <= d.chance) {
          onDrop(mob.position, d.type);
        }
      }
    }

    // Remove 3D mesh
    const mesh = this.meshMap.get(mob.id);
    if (mesh) {
      this.scene.remove(mesh.group);
      this.meshMap.delete(mob.id);
    }

    this.mobs.splice(idx, 1);
  }

  // Clear all hostile monsters (Zombies & Creepers) when in creative mode
  public clearHostileMobs() {
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      if (mob.isHostile) {
        const mesh = this.meshMap.get(mob.id);
        if (mesh) {
          this.scene.remove(mesh.group);
          this.meshMap.delete(mob.id);
        }
        this.mobs.splice(i, 1);
      }
    }
  }

  // Toggle follow mode for animals / passive mobs
  public toggleFollow(mobId: string, playerPos: Vector3D): { following: boolean; mobName: string } | null {
    const mob = this.mobs.find((m) => m.id === mobId);
    if (!mob) return null;
    if (mob.isHostile) return null; // Only peaceful animals follow

    mob.isFollowingPlayer = !mob.isFollowingPlayer;
    mob.heartParticleTimer = 2.5;

    const def = MOB_DEFS[mob.type];
    const name = def ? def.nameNl : 'Dier';

    if (mob.isFollowingPlayer) {
      if (mob.type === 'sheep') sound.playSheepBleat();
      else if (mob.type === 'villager') sound.playVillagerHrmm();
      sound.playPickup(); // friendly chime
    } else {
      sound.playClick();
    }

    return { following: !!mob.isFollowingPlayer, mobName: name };
  }

  // Spawn zombies around the player for evening/night survival mode
  public spawnZombiesNearPlayer(world: VoxelWorld, playerPos: Vector3D, count = 3) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const dist = 10 + Math.random() * 8;
      const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
      const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);

      for (let sy = CHUNK_HEIGHT - 4; sy > 2; sy--) {
        const b = world.getBlock(sx, sy, sz);
        const above1 = world.getBlock(sx, sy + 1, sz);
        const above2 = world.getBlock(sx, sy + 2, sz);
        if (b !== BlockType.AIR && b !== BlockType.WATER && above1 === BlockType.AIR && above2 === BlockType.AIR) {
          this.spawnMob('zombie', { x: sx + 0.5, y: sy + 1, z: sz + 0.5 });
          break;
        }
      }
    }
  }

  // Main Mob Tick
  public update(
    dt: number,
    world: VoxelWorld,
    playerPos: Vector3D,
    dayTime: number,
    gameMode: 'creative' | 'survival',
    onPlayerDamage?: (amount: number) => void,
    onExplode?: (center: Vector3D, radius: number) => void,
    onDrop?: (pos: Vector3D, type: BlockType) => void
  ) {
    // In creative mode, ensure absolutely NO monsters exist!
    if (gameMode === 'creative') {
      const hasHostile = this.mobs.some((m) => m.isHostile);
      if (hasHostile) {
        this.clearHostileMobs();
      }
    }

    // Sun height from dayTime (0.0 = dawn, 0.25 = noon, 0.50 = evening/sunset, 0.75 = midnight)
    const sunHeight = Math.sin(dayTime * Math.PI * 2);
    const isNight = sunHeight <= 0.15; // Covers Evening (avond) and Night (nacht)
    const isBrightDay = sunHeight > 0.25;

    // If it is evening/night in survival mode and no zombies exist yet, spawn a group immediately!
    if (gameMode === 'survival' && isNight) {
      const zombieCount = this.mobs.filter((m) => m.type === 'zombie').length;
      if (zombieCount === 0) {
        this.spawnZombiesNearPlayer(world, playerPos, 3);
      }
    }

    // 1. Spawning Routine
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.spawnCooldown = 3.5;

      // Count monsters vs animals
      const monsterCount = this.mobs.filter((m) => m.isHostile).length;
      const animalCount = this.mobs.filter((m) => !m.isHostile).length;

      // Spawn Evening/Night Monsters (Zombies & Creepers) ONLY in survival mode!
      if (gameMode === 'survival' && isNight && monsterCount < 8) {
        // Find ground position 12-24 blocks from player
        const angle = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * 12;
        const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
        const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);

        for (let sy = CHUNK_HEIGHT - 4; sy > 2; sy--) {
          const b = world.getBlock(sx, sy, sz);
          const above1 = world.getBlock(sx, sy + 1, sz);
          const above2 = world.getBlock(sx, sy + 2, sz);
          if (b !== BlockType.AIR && b !== BlockType.WATER && above1 === BlockType.AIR && above2 === BlockType.AIR) {
            const mType: MobType = Math.random() < 0.8 ? 'zombie' : 'creeper';
            this.spawnMob(mType, { x: sx + 0.5, y: sy + 1, z: sz + 0.5 });
            break;
          }
        }
      }

      // Spawn Peaceful animals during day
      if (!isNight && animalCount < 8) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 15;
        const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
        const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);

        for (let sy = CHUNK_HEIGHT - 4; sy > 2; sy--) {
          const b = world.getBlock(sx, sy, sz);
          if (b === BlockType.GRASS && world.getBlock(sx, sy + 1, sz) === BlockType.AIR) {
            const mType: MobType = Math.random() < 0.6 ? 'sheep' : 'villager';
            this.spawnMob(mType, { x: sx + 0.5, y: sy + 1, z: sz + 0.5 });
            break;
          }
        }
      }
    }

    // 2. Individual Mob Update Loop
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      const mesh = this.meshMap.get(mob.id);
      if (!mesh) continue;

      const def = MOB_DEFS[mob.type];

      // Hurt timer
      if (mob.hurtTimer > 0) {
        mob.hurtTimer -= dt;
      }

      // Vocal Sounds Timer
      mob.soundTimer -= dt;
      if (mob.soundTimer <= 0) {
        mob.soundTimer = 5.0 + Math.random() * 8.0;
        const distToPlayer = Math.hypot(playerPos.x - mob.position.x, playerPos.z - mob.position.z);
        if (distToPlayer < 20) {
          if (mob.type === 'zombie') sound.playZombieGroan();
          else if (mob.type === 'sheep') sound.playSheepBleat();
          else if (mob.type === 'villager') sound.playVillagerHrmm();
        }
      }

      // Bright daytime behavior for Zombies: burn & take damage if under direct bright sunlight
      if (isBrightDay && mob.type === 'zombie') {
        const ceilAir = world.getBlock(Math.floor(mob.position.x), Math.floor(mob.position.y + 2), Math.floor(mob.position.z)) === BlockType.AIR;
        if (ceilAir) {
          mob.health -= 3.0 * dt;
          mob.hurtTimer = 0.15;
          if (mob.health <= 0) {
            this.killMob(mob.id, onDrop);
            continue;
          }
        }
      }

      // Vector to player
      const dx = playerPos.x - mob.position.x;
      const dy = playerPos.y - mob.position.y;
      const dz = playerPos.z - mob.position.z;
      const distToPlayer = Math.hypot(dx, dz);

      let targetMoveX = 0;
      let targetMoveZ = 0;

      // AI Decision
      if (mob.isHostile) {
        // Night monsters chase player if within 26 blocks
        if (distToPlayer < 26 && distToPlayer > 0.7) {
          mob.yaw = Math.atan2(dx, dz);
          targetMoveX = Math.sin(mob.yaw) * def.speed;
          targetMoveZ = Math.cos(mob.yaw) * def.speed;
        }

        // Zombie attack player when it catches you -> lose 1 heart (2 HP)!
        if (mob.type === 'zombie') {
          if (mob.attackCooldown > 0) {
            mob.attackCooldown -= dt;
          }
          if (distToPlayer < 1.65 && Math.abs(dy) < 2.0 && mob.attackCooldown <= 0) {
            mob.attackCooldown = 1.25;
            if (gameMode === 'survival') {
              onPlayerDamage?.(def.attackDamage); // 2 HP = 1 heart less
              sound.playHit();
              sound.playZombieGroan();
            }
          }
        }

        // Creeper countdown & explosion logic
        if (mob.type === 'creeper') {
          if (distToPlayer < 3.0) {
            if (mob.fuseTimer === 0) {
              sound.playCreeperHiss();
            }
            mob.fuseTimer = (mob.fuseTimer || 0) + dt;

            // Flash white rapidly when about to blow
            const flash = Math.sin(mob.fuseTimer * 20) > 0;
            mesh.head.material = flash ? mesh.hurtMaterial : mesh.materials[0];

            if (mob.fuseTimer >= 1.6) {
              // EXPLODE!
              sound.playExplosion();
              onExplode?.(mob.position, 3.6);
              this.killMob(mob.id, onDrop);
              continue;
            }
          } else {
            // Cancel fuse if player ran away
            mob.fuseTimer = 0;
            mesh.head.material = mesh.materials[0];
          }
        }
      } else {
        // Peaceful animals (Sheep, Villager)
        if (mob.isFollowingPlayer) {
          // Look directly at player
          mob.yaw = Math.atan2(dx, dz);

          if (distToPlayer > 2.2 && distToPlayer < 35.0) {
            // Walk faithfully towards player
            const followSpeed = def.speed * 1.5;
            targetMoveX = Math.sin(mob.yaw) * followSpeed;
            targetMoveZ = Math.cos(mob.yaw) * followSpeed;
          } else if (distToPlayer >= 35.0) {
            // Teleport near player like Minecraft pets!
            mob.position.x = playerPos.x - Math.sin(mob.yaw) * 3;
            mob.position.y = playerPos.y + 0.2;
            mob.position.z = playerPos.z - Math.cos(mob.yaw) * 3;
            mob.velocity.x = 0;
            mob.velocity.y = 0;
            mob.velocity.z = 0;
          } else {
            // Very close: stay and watch player
            targetMoveX = 0;
            targetMoveZ = 0;
          }
        } else {
          // Normal peaceful wander around
          if (Math.random() < 0.02) {
            mob.yaw += (Math.random() - 0.5) * 1.5;
          }
          if (Math.sin(Date.now() * 0.001 + i) > -0.2) {
            targetMoveX = Math.sin(mob.yaw) * def.speed;
            targetMoveZ = Math.cos(mob.yaw) * def.speed;
          }
        }
      }

      // Physics: Smooth acceleration
      mob.velocity.x += (targetMoveX - mob.velocity.x) * Math.min(1, 8.0 * dt);
      mob.velocity.z += (targetMoveZ - mob.velocity.z) * Math.min(1, 8.0 * dt);

      // Gravity
      mob.velocity.y -= 22.0 * dt;
      mob.velocity.y = Math.max(-25.0, mob.velocity.y);

      // Movement & Voxel Obstacle Autostep
      const nextX = mob.position.x + mob.velocity.x * dt;
      const nextZ = mob.position.z + mob.velocity.z * dt;

      // Obstacle check: if there is a 1-block wall ahead and mob is on ground, autostep / jump!
      const blockAhead = world.getBlock(Math.floor(nextX), Math.floor(mob.position.y), Math.floor(nextZ));
      const spaceAbove = world.getBlock(Math.floor(nextX), Math.floor(mob.position.y + 1.2), Math.floor(nextZ));
      if (blockAhead !== BlockType.AIR && blockAhead !== BlockType.WATER && spaceAbove === BlockType.AIR && mob.isGrounded) {
        mob.velocity.y = 6.8; // jump over step
        mob.isGrounded = false;
      }

      mob.position.x = nextX;
      mob.position.z = nextZ;
      mob.position.y += mob.velocity.y * dt;

      // Ground collision
      const floorBlock = world.getBlock(Math.floor(mob.position.x), Math.floor(mob.position.y), Math.floor(mob.position.z));
      if (floorBlock !== BlockType.AIR && floorBlock !== BlockType.WATER) {
        mob.position.y = Math.floor(mob.position.y) + 1.0;
        mob.velocity.y = 0;
        mob.isGrounded = true;
      } else {
        mob.isGrounded = false;
      }

      // Walking leg swing animation
      const isWalking = Math.hypot(mob.velocity.x, mob.velocity.z) > 0.2;
      if (isWalking) {
        mob.walkCycle += dt * 8.0;
        const swing = Math.sin(mob.walkCycle) * 0.55;
        mesh.leftLeg.rotation.x = swing;
        mesh.rightLeg.rotation.x = -swing;
        if (mesh.rearLeftLeg && mesh.rearRightLeg) {
          mesh.rearLeftLeg.rotation.x = -swing;
          mesh.rearRightLeg.rotation.x = swing;
        }
      } else {
        mesh.leftLeg.rotation.x = 0;
        mesh.rightLeg.rotation.x = 0;
        if (mesh.rearLeftLeg && mesh.rearRightLeg) {
          mesh.rearLeftLeg.rotation.x = 0;
          mesh.rearRightLeg.rotation.x = 0;
        }
      }

      // Update 3D Mesh Position & Rotation
      mesh.group.position.set(mob.position.x, mob.position.y, mob.position.z);
      mesh.group.rotation.y = mob.yaw;

      // Red Hurt Flash
      const isRed = mob.hurtTimer > 0;
      mesh.body.material = isRed ? mesh.hurtMaterial : mesh.materials[1] || mesh.materials[0];
    }
  }

  // Find if ray hits any mob (for combat / punching)
  public raycastMobs(eyePos: Vector3D, dir: Vector3D, maxDist = 4.5): { mobId: string; distance: number } | null {
    let closestDist = maxDist;
    let hitMobId: string | null = null;

    for (const mob of this.mobs) {
      // Approximate mob AABB with sphere radius 0.6
      const dx = mob.position.x - eyePos.x;
      const dy = (mob.position.y + 0.9) - eyePos.y;
      const dz = mob.position.z - eyePos.z;

      // Project onto ray
      const dot = dx * dir.x + dy * dir.y + dz * dir.z;
      if (dot > 0 && dot < closestDist) {
        const perpSq = (dx * dx + dy * dy + dz * dz) - (dot * dot);
        if (perpSq < 0.6 * 0.6) {
          closestDist = dot;
          hitMobId = mob.id;
        }
      }
    }

    return hitMobId ? { mobId: hitMobId, distance: closestDist } : null;
  }
}
