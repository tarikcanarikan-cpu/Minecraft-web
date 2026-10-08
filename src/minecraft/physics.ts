import { Vector3D, BlockType, PlayerStats } from './types';
import { VoxelWorld } from './world';
import { BLOCK_DEFS } from './blocks';

export interface BoundingBox {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export class PlayerPhysics {
  public position: Vector3D = { x: 0, y: 20, z: 0 };
  public velocity: Vector3D = { x: 0, y: 0, z: 0 };
  public yaw = 0;
  public pitch = 0;

  public width = 0.6;
  public height = 1.8;
  public eyeHeight = 1.62;

  public stats: PlayerStats = {
    health: 20,
    maxHealth: 20,
    hunger: 20,
    saturation: 5,
    isFlying: false,
    isGrounded: false,
    isSneaking: false,
    isSprinting: false,
    isSwimming: false,
  };

  private fallDistance = 0;
  public onHurtCallback?: (damage: number) => void;

  constructor(spawn: Vector3D) {
    this.position = { ...spawn };
  }

  public getAABB(pos = this.position): BoundingBox {
    const hw = this.width / 2;
    return {
      minX: pos.x - hw,
      minY: pos.y,
      minZ: pos.z - hw,
      maxX: pos.x + hw,
      maxY: pos.y + this.height,
      maxZ: pos.z + hw,
    };
  }

  public getEyePosition(): Vector3D {
    return {
      x: this.position.x,
      y: this.position.y + this.eyeHeight,
      z: this.position.z,
    };
  }

  private isBlockSolid(world: VoxelWorld, x: number, y: number, z: number): boolean {
    const b = world.getBlock(x, y, z);
    if (b === BlockType.AIR || b === BlockType.WATER) return false;
    const def = BLOCK_DEFS[b];
    return def ? def.isSolid !== false : true;
  }

  // Check collision between bounding box and world voxels
  public checkCollision(world: VoxelWorld, aabb: BoundingBox): boolean {
    const minX = Math.floor(aabb.minX);
    const maxX = Math.floor(aabb.maxX);
    const minY = Math.floor(aabb.minY);
    const maxY = Math.floor(aabb.maxY);
    const minZ = Math.floor(aabb.minZ);
    const maxZ = Math.floor(aabb.maxZ);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isBlockSolid(world, x, y, z)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public update(
    world: VoxelWorld,
    dt: number,
    input: { forward: number; strafe: number; jump: boolean; sneak: boolean; sprint: boolean },
    gameMode: 'creative' | 'survival'
  ) {
    // Clamp delta time to avoid large tunnel steps
    const delta = Math.min(dt, 0.05);

    this.stats.isSneaking = input.sneak;
    this.stats.isSprinting = input.sprint && !input.sneak;

    // Movement direction from yaw
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const strafeX = Math.cos(this.yaw);
    const strafeZ = -Math.sin(this.yaw);

    let moveX = forwardX * input.forward + strafeX * input.strafe;
    let moveZ = forwardZ * input.forward + strafeZ * input.strafe;

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) {
      moveX /= len;
      moveZ /= len;
    }

    let speed = 4.3; // base walking speed in m/s
    if (this.stats.isSprinting) speed = 6.2;
    if (this.stats.isSneaking) speed = 1.8;
    if (this.stats.isFlying) speed = 10.0;

    // FLYING MODE (Creative only)
    if (this.stats.isFlying) {
      this.velocity.x = moveX * speed;
      this.velocity.z = moveZ * speed;
      this.velocity.y = 0;
      if (input.jump) this.velocity.y = speed;
      if (input.sneak) this.velocity.y = -speed;

      this.position.x += this.velocity.x * delta;
      this.position.y += this.velocity.y * delta;
      this.position.z += this.velocity.z * delta;
      this.fallDistance = 0;
      return;
    }

    // NORMAL WALKING & PHYSICS
    // Friction & Acceleration
    const targetVx = moveX * speed;
    const targetVz = moveZ * speed;
    const accel = this.stats.isGrounded ? 15.0 : 4.0;
    this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, accel * delta);
    this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, accel * delta);

    // Gravity
    const gravity = -26.0;
    this.velocity.y += gravity * delta;
    this.velocity.y = Math.max(-40.0, this.velocity.y); // terminal velocity

    // Jump
    if (input.jump && this.stats.isGrounded) {
      this.velocity.y = 8.5; // reaches ~1.25 blocks jump
      this.stats.isGrounded = false;
    }

    // SNEAK LEDGE PROTECTION: prevents walking off edge
    if (this.stats.isSneaking && this.stats.isGrounded) {
      const stepDistX = this.velocity.x * delta;
      const stepDistZ = this.velocity.z * delta;
      const testPos = {
        x: this.position.x + stepDistX,
        y: this.position.y - 0.5,
        z: this.position.z + stepDistZ,
      };
      if (!this.checkCollision(world, this.getAABB(testPos))) {
        // Stop movement if it would lead off a cliff
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    // Collision Resolution per Axis
    const dx = this.velocity.x * delta;
    const dy = this.velocity.y * delta;
    const dz = this.velocity.z * delta;

    // 1. Move X
    this.position.x += dx;
    if (this.checkCollision(world, this.getAABB())) {
      // Step-assist: try moving up 0.5 blocks if stepping onto a single step
      if (this.stats.isGrounded) {
        this.position.y += 0.5;
        if (this.checkCollision(world, this.getAABB())) {
          this.position.y -= 0.5;
          this.position.x -= dx;
          this.velocity.x = 0;
        }
      } else {
        this.position.x -= dx;
        this.velocity.x = 0;
      }
    }

    // 2. Move Z
    this.position.z += dz;
    if (this.checkCollision(world, this.getAABB())) {
      if (this.stats.isGrounded) {
        this.position.y += 0.5;
        if (this.checkCollision(world, this.getAABB())) {
          this.position.y -= 0.5;
          this.position.z -= dz;
          this.velocity.z = 0;
        }
      } else {
        this.position.z -= dz;
        this.velocity.z = 0;
      }
    }

    // 3. Move Y
    const wasInAir = !this.stats.isGrounded;
    this.position.y += dy;
    if (this.checkCollision(world, this.getAABB())) {
      if (this.velocity.y < 0) {
        // Hit floor
        this.position.y = Math.ceil(this.position.y);
        // Fall damage in survival
        if (gameMode === 'survival' && wasInAir && this.fallDistance > 3.5) {
          const dmg = Math.floor(this.fallDistance - 3.0);
          if (dmg > 0) {
            this.stats.health = Math.max(0, this.stats.health - dmg);
            this.onHurtCallback?.(dmg);
          }
        }
        this.fallDistance = 0;
        this.stats.isGrounded = true;
      } else {
        // Hit ceiling
        this.position.y = Math.floor(this.position.y + this.height) - this.height;
      }
      this.velocity.y = 0;
    } else {
      if (dy < 0) {
        this.fallDistance += Math.abs(dy);
      }
      // Check if grounded by testing slightly below feet
      const footCheck = this.getAABB({
        x: this.position.x,
        y: this.position.y - 0.05,
        z: this.position.z,
      });
      this.stats.isGrounded = this.checkCollision(world, footCheck);
    }

    // Void fallback: if fallen below y = -10, teleport back up
    if (this.position.y < -10) {
      this.position.x = 0.5;
      this.position.y = 25;
      this.position.z = 0.5;
      this.velocity = { x: 0, y: 0, z: 0 };
    }
  }

  public toggleFly(enable?: boolean) {
    this.stats.isFlying = enable !== undefined ? enable : !this.stats.isFlying;
    if (this.stats.isFlying) {
      this.velocity.y = 0;
    }
    return this.stats.isFlying;
  }
}
