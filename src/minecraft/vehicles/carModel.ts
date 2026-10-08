import * as THREE from 'three';
import { CarColor } from './types';

const COLOR_MAP: Record<CarColor, number> = {
  red: 0xd32f2f,
  blue: 0x1976d2,
  yellow: 0xfbc02d,
  green: 0x388e3c,
  black: 0x263238,
};

export interface CarMeshInstance {
  group: THREE.Group;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
}

export class CarModelFactory {
  private wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
  private rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.24, 8);
  private wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  private rimMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae });

  private createWheelGroup(): THREE.Group {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(this.wheelGeo, this.wheelMat);
    tire.rotation.z = Math.PI / 2;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(this.rimGeo, this.rimMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    return wheelGroup;
  }

  public createCar(color: CarColor = 'red'): CarMeshInstance {
    const root = new THREE.Group();
    const carColorHex = COLOR_MAP[color] || COLOR_MAP.red;

    const paintMat = new THREE.MeshLambertMaterial({ color: carColorHex });
    const darkPaintMat = new THREE.MeshLambertMaterial({ color: 0x1c2833 });
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x81d4fa,
      transparent: true,
      opacity: 0.65,
    });
    const glowYellowMat = new THREE.MeshBasicMaterial({ color: 0xfff59d });
    const glowRedMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0xb0bec5 });

    // 1. Lower Chassis (Undercarriage)
    const chassisGeo = new THREE.BoxGeometry(1.6, 0.25, 2.7);
    const chassis = new THREE.Mesh(chassisGeo, darkPaintMat);
    chassis.position.set(0, 0.35, 0);
    root.add(chassis);

    // 2. Main Car Body (Fenders & Hood)
    const bodyGeo = new THREE.BoxGeometry(1.65, 0.45, 2.6);
    const body = new THREE.Mesh(bodyGeo, paintMat);
    body.position.set(0, 0.65, 0);
    root.add(body);

    // Front Hood Slope / Grille
    const grilleGeo = new THREE.BoxGeometry(1.4, 0.28, 0.15);
    const grille = new THREE.Mesh(grilleGeo, chromeMat);
    grille.position.set(0, 0.58, 1.35);
    root.add(grille);

    // Front Bumper
    const bumperGeo = new THREE.BoxGeometry(1.7, 0.18, 0.2);
    const bumper = new THREE.Mesh(bumperGeo, darkPaintMat);
    bumper.position.set(0, 0.38, 1.38);
    root.add(bumper);

    // Rear Bumper
    const rearBumper = new THREE.Mesh(bumperGeo, darkPaintMat);
    rearBumper.position.set(0, 0.38, -1.38);
    root.add(rearBumper);

    // 3. Cabin (Windshield, Roof, Windows)
    // Windshield (Front Glass)
    const frontGlassGeo = new THREE.BoxGeometry(1.45, 0.5, 0.1);
    const frontGlass = new THREE.Mesh(frontGlassGeo, glassMat);
    frontGlass.position.set(0, 1.05, 0.4);
    frontGlass.rotation.x = -Math.PI / 10;
    root.add(frontGlass);

    // Cabin Roof
    const roofGeo = new THREE.BoxGeometry(1.45, 0.1, 1.2);
    const roof = new THREE.Mesh(roofGeo, paintMat);
    roof.position.set(0, 1.3, -0.15);
    root.add(roof);

    // Side Windows
    const sideGlassGeo = new THREE.BoxGeometry(0.08, 0.45, 1.1);
    const leftGlass = new THREE.Mesh(sideGlassGeo, glassMat);
    leftGlass.position.set(-0.7, 1.05, -0.15);
    root.add(leftGlass);

    const rightGlass = new THREE.Mesh(sideGlassGeo, glassMat);
    rightGlass.position.set(0.7, 1.05, -0.15);
    root.add(rightGlass);

    // Rear Window
    const rearGlassGeo = new THREE.BoxGeometry(1.45, 0.45, 0.08);
    const rearGlass = new THREE.Mesh(rearGlassGeo, glassMat);
    rearGlass.position.set(0, 1.05, -0.72);
    rearGlass.rotation.x = Math.PI / 12;
    root.add(rearGlass);

    // 4. Interior (Seats & Steering Wheel)
    const seatGeo = new THREE.BoxGeometry(0.5, 0.45, 0.5);
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    const driverSeat = new THREE.Mesh(seatGeo, seatMat);
    driverSeat.position.set(-0.35, 0.72, -0.15);
    root.add(driverSeat);

    const passengerSeat = new THREE.Mesh(seatGeo, seatMat);
    passengerSeat.position.set(0.35, 0.72, -0.15);
    root.add(passengerSeat);

    // Steering Wheel
    const wheelRingGeo = new THREE.TorusGeometry(0.12, 0.025, 6, 12);
    const steeringWheel = new THREE.Mesh(wheelRingGeo, darkPaintMat);
    steeringWheel.position.set(-0.35, 1.0, 0.22);
    steeringWheel.rotation.x = Math.PI / 4;
    root.add(steeringWheel);

    // 5. Headlights & Taillights
    const lightGeo = new THREE.BoxGeometry(0.28, 0.18, 0.08);

    // Front Headlights
    const leftHeadlight = new THREE.Mesh(lightGeo, glowYellowMat);
    leftHeadlight.position.set(-0.6, 0.65, 1.32);
    root.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(lightGeo, glowYellowMat);
    rightHeadlight.position.set(0.6, 0.65, 1.32);
    root.add(rightHeadlight);

    // Rear Taillights
    const leftTaillight = new THREE.Mesh(lightGeo, glowRedMat);
    leftTaillight.position.set(-0.6, 0.65, -1.32);
    root.add(leftTaillight);

    const rightTaillight = new THREE.Mesh(lightGeo, glowRedMat);
    rightTaillight.position.set(0.6, 0.65, -1.32);
    root.add(rightTaillight);

    // Sporty Rear Spoiler
    const spoilerWingGeo = new THREE.BoxGeometry(1.6, 0.08, 0.25);
    const spoilerWing = new THREE.Mesh(spoilerWingGeo, paintMat);
    spoilerWing.position.set(0, 1.15, -1.2);
    root.add(spoilerWing);

    const spoilerStandGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
    const stand1 = new THREE.Mesh(spoilerStandGeo, darkPaintMat);
    stand1.position.set(-0.55, 0.98, -1.2);
    root.add(stand1);

    const stand2 = new THREE.Mesh(spoilerStandGeo, darkPaintMat);
    stand2.position.set(0.55, 0.98, -1.2);
    root.add(stand2);

    // 6. 4 Wheels (with independent turning & rolling)
    const wheelY = 0.32;
    const wheelTrack = 0.88;
    const wheelBase = 0.85;

    const frontLeftWheel = this.createWheelGroup();
    frontLeftWheel.position.set(-wheelTrack, wheelY, wheelBase);
    root.add(frontLeftWheel);

    const frontRightWheel = this.createWheelGroup();
    frontRightWheel.position.set(wheelTrack, wheelY, wheelBase);
    root.add(frontRightWheel);

    const rearLeftWheel = this.createWheelGroup();
    rearLeftWheel.position.set(-wheelTrack, wheelY, -wheelBase);
    root.add(rearLeftWheel);

    const rearRightWheel = this.createWheelGroup();
    rearRightWheel.position.set(wheelTrack, wheelY, -wheelBase);
    root.add(rearRightWheel);

    return {
      group: root,
      frontLeftWheel,
      frontRightWheel,
      rearLeftWheel,
      rearRightWheel,
      headlights: [leftHeadlight, rightHeadlight],
      taillights: [leftTaillight, rightTaillight],
    };
  }
}
