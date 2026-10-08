import * as THREE from 'three';
import { Vector3D, BlockType } from '../types';
import { VoxelWorld, CHUNK_HEIGHT } from '../world';
import { sound } from '../sound';
import { VehicleEntity, CarColor } from './types';
import { CarModelFactory, CarMeshInstance } from './carModel';

export class VehicleManager {
  public vehicles: VehicleEntity[] = [];
  public activeVehicleId: string | null = null;
  private meshMap = new Map<string, CarMeshInstance>();
  private factory: CarModelFactory;
  private scene: THREE.Scene;
  private nextCarId = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.factory = new CarModelFactory();
  }

  // Spawn car at position
  public spawnCar(pos: Vector3D, color: CarColor = 'red', yaw = 0): VehicleEntity {
    const id = `car_${this.nextCarId++}_${color}`;
    const vehicle: VehicleEntity = {
      id,
      color,
      modelName: `${color.toUpperCase()} Sportscar`,
      position: { ...pos },
      velocity: { x: 0, y: 0, z: 0 },
      yaw,
      pitch: 0,
      roll: 0,
      speed: 0,
      steering: 0,
      fuel: 100,
      maxFuel: 100,
      isDriverInside: false,
      engineRunning: false,
      engineSoundTimer: 0,
      wheelRotation: 0,
    };

    const meshInst = this.factory.createCar(color);
    meshInst.group.position.set(pos.x, pos.y, pos.z);
    meshInst.group.rotation.y = yaw;
    this.scene.add(meshInst.group);
    this.meshMap.set(id, meshInst);

    this.vehicles.push(vehicle);
    return vehicle;
  }

  public getActiveVehicle(): VehicleEntity | null {
    if (!this.activeVehicleId) return null;
    return this.vehicles.find((v) => v.id === this.activeVehicleId) || null;
  }

  // Find nearest vehicle to player
  public getNearestVehicle(playerPos: Vector3D, maxDist = 3.5): VehicleEntity | null {
    let nearest: VehicleEntity | null = null;
    let minDist = maxDist;

    for (const v of this.vehicles) {
      const d = Math.hypot(v.position.x - playerPos.x, v.position.z - playerPos.z);
      if (d < minDist && Math.abs(v.position.y - playerPos.y) < 2.5) {
        minDist = d;
        nearest = v;
      }
    }
    return nearest;
  }

  // Enter vehicle
  public enterVehicle(vehicleId: string): boolean {
    const v = this.vehicles.find((veh) => veh.id === vehicleId);
    if (!v) return false;

    v.isDriverInside = true;
    v.engineRunning = true;
    this.activeVehicleId = v.id;
    sound.playCarHorn();
    return true;
  }

  // Exit vehicle
  public exitVehicle(playerPos: Vector3D): Vector3D {
    const v = this.getActiveVehicle();
    if (!v) return playerPos;

    v.isDriverInside = false;
    v.engineRunning = false;
    this.activeVehicleId = null;

    // Place player beside the car (driver side)
    const exitAngle = v.yaw - Math.PI / 2;
    return {
      x: v.position.x + Math.sin(exitAngle) * 1.8,
      y: v.position.y + 0.5,
      z: v.position.z + Math.cos(exitAngle) * 1.8,
    };
  }

  // Honk horn
  public honk() {
    sound.playCarHorn();
  }

  // Refuel nearest car
  public refuel(carId?: string): boolean {
    const v = carId ? this.vehicles.find((veh) => veh.id === carId) : this.getActiveVehicle();
    if (!v) return false;
    if (v.fuel >= 99) return false;

    v.fuel = 100;
    sound.playRefuel();
    return true;
  }

  // Update physics and driving
  public update(
    dt: number,
    world: VoxelWorld,
    input: { forward: number; strafe: number; jump: boolean; brake?: boolean }
  ) {
    for (const v of this.vehicles) {
      const mesh = this.meshMap.get(v.id);
      if (!mesh) continue;

      if (v.isDriverInside) {
        // Player is driving this vehicle!
        const hasFuel = v.fuel > 0;
        const forwardInput = hasFuel ? input.forward : 0;
        const steerInput = input.strafe;

        // Acceleration / Deceleration
        const accel = 14.0;
        const maxSpeed = 16.0;
        const maxReverse = -6.0;

        if (forwardInput > 0) {
          v.speed += accel * dt;
          if (v.speed > maxSpeed) v.speed = maxSpeed;
          v.fuel = Math.max(0, v.fuel - dt * 0.7); // consume fuel
        } else if (forwardInput < 0) {
          v.speed -= accel * dt * 0.8;
          if (v.speed < maxReverse) v.speed = maxReverse;
          v.fuel = Math.max(0, v.fuel - dt * 0.7);
        } else {
          // Natural rolling friction
          if (v.speed > 0) {
            v.speed = Math.max(0, v.speed - 6.0 * dt);
          } else if (v.speed < 0) {
            v.speed = Math.min(0, v.speed + 6.0 * dt);
          }
        }

        // Handbrake / Space
        if (input.brake) {
          v.speed *= Math.max(0, 1 - 10.0 * dt);
        }

        // Steering angle target
        const targetSteer = -steerInput * 0.55;
        v.steering += (targetSteer - v.steering) * Math.min(1, 12 * dt);

        // Turn yaw when moving
        if (Math.abs(v.speed) > 0.3) {
          const turnDir = v.speed >= 0 ? 1 : -1;
          v.yaw += v.steering * (Math.abs(v.speed) / maxSpeed) * 2.8 * dt * turnDir;
        }

        // Engine sound while driving
        v.engineSoundTimer -= dt;
        if (Math.abs(v.speed) > 0.5 && v.engineSoundTimer <= 0) {
          v.engineSoundTimer = 0.22;
          const ratio = Math.min(1, Math.abs(v.speed) / maxSpeed);
          sound.playCarEngineSound(ratio);
        }

        // Jump over 1-block steps with Space
        if (input.jump && Math.abs(v.velocity.y) < 0.1) {
          v.velocity.y = 5.5;
        }
      } else {
        // Idle friction
        v.speed *= Math.max(0, 1 - 8.0 * dt);
        v.steering *= Math.max(0, 1 - 10.0 * dt);
      }

      // Convert speed to velocity vector along yaw
      v.velocity.x = Math.sin(v.yaw) * v.speed;
      v.velocity.z = Math.cos(v.yaw) * v.speed;

      // Gravity
      v.velocity.y -= 20.0 * dt;
      v.velocity.y = Math.max(-25.0, v.velocity.y);

      // Next position
      const nextX = v.position.x + v.velocity.x * dt;
      const nextZ = v.position.z + v.velocity.z * dt;
      const nextY = v.position.y + v.velocity.y * dt;

      // Obstacle detection ahead: autostep up 1 block if driving forward!
      const blockAhead = world.getBlock(Math.floor(nextX), Math.floor(v.position.y), Math.floor(nextZ));
      const spaceAbove = world.getBlock(Math.floor(nextX), Math.floor(v.position.y + 1.2), Math.floor(nextZ));
      if (blockAhead !== BlockType.AIR && blockAhead !== BlockType.WATER && spaceAbove === BlockType.AIR) {
        // Auto-climb step
        v.position.y = Math.floor(v.position.y) + 1.05;
        v.velocity.y = 0;
      }

      v.position.x = nextX;
      v.position.z = nextZ;
      v.position.y = nextY;

      // Ground collision
      const floorBlock = world.getBlock(
        Math.floor(v.position.x),
        Math.floor(v.position.y - 0.05),
        Math.floor(v.position.z)
      );
      if (floorBlock !== BlockType.AIR && floorBlock !== BlockType.WATER) {
        v.position.y = Math.floor(v.position.y);
        v.velocity.y = 0;
      }

      // Wheel animation
      v.wheelRotation += v.speed * dt * 3.5;
      mesh.frontLeftWheel.rotation.x = v.wheelRotation;
      mesh.frontRightWheel.rotation.x = v.wheelRotation;
      mesh.rearLeftWheel.rotation.x = v.wheelRotation;
      mesh.rearRightWheel.rotation.x = v.wheelRotation;

      // Steering pivot on front wheels
      mesh.frontLeftWheel.rotation.y = v.steering;
      mesh.frontRightWheel.rotation.y = v.steering;

      // Update 3D Group Transform
      mesh.group.position.set(v.position.x, v.position.y, v.position.z);
      mesh.group.rotation.y = v.yaw;
    }
  }
}
