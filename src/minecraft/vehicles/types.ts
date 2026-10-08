import { Vector3D } from '../types';

export type CarColor = 'red' | 'blue' | 'yellow' | 'green' | 'black';

export interface VehicleEntity {
  id: string;
  color: CarColor;
  modelName: string;
  position: Vector3D;
  velocity: Vector3D;
  yaw: number;
  pitch: number;
  roll: number;
  speed: number; // forward/backward velocity in m/s
  steering: number; // current wheel turn angle
  fuel: number; // 0 - 100
  maxFuel: number;
  isDriverInside: boolean;
  engineRunning: boolean;
  engineSoundTimer: number;
  wheelRotation: number;
}
