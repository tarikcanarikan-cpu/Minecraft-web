import * as THREE from 'three';
import { MobType, MobEntity } from './types';

// Helper to create small procedural pixel canvas texture
function createPixelTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

export interface MobMeshInstance {
  group: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  leftArm?: THREE.Mesh;
  rightArm?: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  rearLeftLeg?: THREE.Mesh;
  rearRightLeg?: THREE.Mesh;
  materials: THREE.Material[];
  hurtMaterial: THREE.MeshBasicMaterial;
}

export class MobModelFactory {
  private hurtMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });

  // 1. ZOMBIE MODEL
  public createZombie(): MobMeshInstance {
    const group = new THREE.Group();
    const mats: THREE.Material[] = [];

    // Zombie Head Texture (16x16: green skin, black sunken eyes, dark mouth)
    const headTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#49753e';
      ctx.fillRect(0, 0, 16, 16);
      // Dark mottled spots
      ctx.fillStyle = '#365a2d';
      ctx.fillRect(2, 2, 3, 2);
      ctx.fillRect(10, 4, 3, 3);
      // Dark eyes
      ctx.fillStyle = '#1c2e17';
      ctx.fillRect(2, 6, 3, 2);
      ctx.fillRect(11, 6, 3, 2);
      // Mouth
      ctx.fillRect(5, 11, 6, 2);
    });
    const headMat = new THREE.MeshLambertMaterial({ map: headTex });
    mats.push(headMat);

    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.45, 0);
    group.add(head);

    // Torso (Cyan/turquoise torn shirt)
    const shirtTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#2b7878';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#1d5757';
      ctx.fillRect(0, 12, 16, 4); // torn hem
    });
    const bodyMat = new THREE.MeshLambertMaterial({ map: shirtTex });
    mats.push(bodyMat);

    const bodyGeo = new THREE.BoxGeometry(0.5, 0.7, 0.28);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.85, 0);
    group.add(body);

    // Zombie Arms: Extended horizontally straight forward!
    const armMat = new THREE.MeshLambertMaterial({ color: 0x49753e });
    mats.push(armMat);

    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);

    // Left Arm
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.35, 0.95, 0.25);
    leftArm.rotation.x = -Math.PI / 2; // outstretched forward
    group.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.35, 0.95, 0.25);
    rightArm.rotation.x = -Math.PI / 2; // outstretched forward
    group.add(rightArm);

    // Legs (Dark Indigo Blue pants)
    const legMat = new THREE.MeshLambertMaterial({ color: 0x242e54 });
    mats.push(legMat);

    const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.14, 0.32, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.14, 0.32, 0);
    group.add(rightLeg);

    return {
      group,
      head,
      body,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      materials: mats,
      hurtMaterial: this.hurtMat,
    };
  }

  // 2. CREEPER MODEL
  public createCreeper(): MobMeshInstance {
    const group = new THREE.Group();
    const mats: THREE.Material[] = [];

    // Creeper Face Texture (16x16: mottled green with iconic sad/angry black face)
    const faceTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#429e3a';
      ctx.fillRect(0, 0, 16, 16);
      // Mottled pattern
      ctx.fillStyle = '#2f7a29';
      ctx.fillRect(1, 1, 3, 3);
      ctx.fillRect(11, 2, 4, 3);
      ctx.fillRect(3, 11, 4, 3);
      // Black eyes
      ctx.fillStyle = '#111111';
      ctx.fillRect(2, 4, 3, 3);
      ctx.fillRect(11, 4, 3, 3);
      // Creeper mouth/frown
      ctx.fillRect(6, 6, 4, 5);
      ctx.fillRect(4, 9, 8, 4);
      ctx.fillRect(4, 12, 2, 3);
      ctx.fillRect(10, 12, 2, 3);
    });
    const headMat = new THREE.MeshLambertMaterial({ map: faceTex });
    mats.push(headMat);

    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.25, 0);
    group.add(head);

    // Body
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3d9435 });
    mats.push(bodyMat);

    const bodyGeo = new THREE.BoxGeometry(0.45, 0.7, 0.28);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.65, 0);
    group.add(body);

    // 4 Stubby Feet
    const footMat = new THREE.MeshLambertMaterial({ color: 0x2f7a29 });
    mats.push(footMat);

    const footGeo = new THREE.BoxGeometry(0.2, 0.32, 0.2);

    const leftLeg = new THREE.Mesh(footGeo, footMat); // Front Left
    leftLeg.position.set(-0.15, 0.16, 0.16);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(footGeo, footMat); // Front Right
    rightLeg.position.set(0.15, 0.16, 0.16);
    group.add(rightLeg);

    const rearLeftLeg = new THREE.Mesh(footGeo, footMat); // Back Left
    rearLeftLeg.position.set(-0.15, 0.16, -0.16);
    group.add(rearLeftLeg);

    const rearRightLeg = new THREE.Mesh(footGeo, footMat); // Back Right
    rearRightLeg.position.set(0.15, 0.16, -0.16);
    group.add(rearRightLeg);

    return {
      group,
      head,
      body,
      leftLeg,
      rightLeg,
      rearLeftLeg,
      rearRightLeg,
      materials: mats,
      hurtMaterial: this.hurtMat,
    };
  }

  // 3. SCHAAP (SHEEP) MODEL
  public createSheep(): MobMeshInstance {
    const group = new THREE.Group();
    const mats: THREE.Material[] = [];

    // Fluffy Wool texture
    const woolTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#dcdcdc';
      ctx.fillRect(2, 2, 4, 3);
      ctx.fillRect(9, 6, 4, 4);
      ctx.fillRect(3, 11, 5, 3);
    });
    const woolMat = new THREE.MeshLambertMaterial({ map: woolTex });
    mats.push(woolMat);

    // Big fluffy wool torso
    const bodyGeo = new THREE.BoxGeometry(0.72, 0.62, 0.95);
    const body = new THREE.Mesh(bodyGeo, woolMat);
    body.position.set(0, 0.72, 0);
    group.add(body);

    // Head (Beige face with black/white eyes & pink snout)
    const headTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#d5b99a';
      ctx.fillRect(0, 0, 16, 16);
      // Wool cap
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(0, 0, 16, 4);
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 6, 4, 3);
      ctx.fillRect(11, 6, 4, 3);
      ctx.fillStyle = '#111111';
      ctx.fillRect(3, 6, 2, 2);
      ctx.fillRect(11, 6, 2, 2);
      // Pink nose
      ctx.fillStyle = '#e5989b';
      ctx.fillRect(6, 11, 4, 2);
    });
    const headMat = new THREE.MeshLambertMaterial({ map: headTex });
    mats.push(headMat);

    const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.45);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.95, 0.58);
    group.add(head);

    // 4 Stick Legs
    const legMat = new THREE.MeshLambertMaterial({ color: 0xc4a482 });
    mats.push(legMat);

    const legGeo = new THREE.BoxGeometry(0.18, 0.52, 0.18);

    const leftLeg = new THREE.Mesh(legGeo, legMat); // Front Left
    leftLeg.position.set(-0.25, 0.26, 0.32);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat); // Front Right
    rightLeg.position.set(0.25, 0.26, 0.32);
    group.add(rightLeg);

    const rearLeftLeg = new THREE.Mesh(legGeo, legMat); // Back Left
    rearLeftLeg.position.set(-0.25, 0.26, -0.32);
    group.add(rearLeftLeg);

    const rearRightLeg = new THREE.Mesh(legGeo, legMat); // Back Right
    rearRightLeg.position.set(0.25, 0.26, -0.32);
    group.add(rearRightLeg);

    return {
      group,
      head,
      body,
      leftLeg,
      rightLeg,
      rearLeftLeg,
      rearRightLeg,
      materials: mats,
      hurtMaterial: this.hurtMat,
    };
  }

  // 4. MENS / DORPELING (VILLAGER) MODEL
  public createVillager(): MobMeshInstance {
    const group = new THREE.Group();
    const mats: THREE.Material[] = [];

    // Head with unibrow & iconic big nose
    const headTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#b88157';
      ctx.fillRect(0, 0, 16, 16);
      // Unibrow
      ctx.fillStyle = '#3a2414';
      ctx.fillRect(3, 4, 10, 2);
      // Eyes (green emerald irises)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 6, 3, 2);
      ctx.fillRect(10, 6, 3, 2);
      ctx.fillStyle = '#1e753b';
      ctx.fillRect(4, 6, 2, 2);
      ctx.fillRect(10, 6, 2, 2);
    });
    const headMat = new THREE.MeshLambertMaterial({ map: headTex });
    mats.push(headMat);

    const headGeo = new THREE.BoxGeometry(0.46, 0.48, 0.46);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.48, 0);

    // Iconic Villager 3D Nose
    const noseMat = new THREE.MeshLambertMaterial({ color: 0xaa744c });
    mats.push(noseMat);
    const noseGeo = new THREE.BoxGeometry(0.12, 0.22, 0.15);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.06, 0.28);
    head.add(nose);
    group.add(head);

    // Brown Robes Torso
    const robeTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#5c3e21';
      ctx.fillRect(0, 0, 16, 16);
      // Collar / belt
      ctx.fillStyle = '#3a2512';
      ctx.fillRect(4, 0, 8, 3);
      ctx.fillRect(0, 13, 16, 3);
    });
    const bodyMat = new THREE.MeshLambertMaterial({ map: robeTex });
    mats.push(bodyMat);

    const bodyGeo = new THREE.BoxGeometry(0.5, 0.78, 0.3);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.85, 0);
    group.add(body);

    // Crossed Arms block in front of chest
    const armsMat = new THREE.MeshLambertMaterial({ color: 0x4d341b });
    mats.push(armsMat);

    const armsGeo = new THREE.BoxGeometry(0.54, 0.24, 0.24);
    const crossedArms = new THREE.Mesh(armsGeo, armsMat);
    crossedArms.position.set(0, 0.88, 0.2);
    group.add(crossedArms);

    // Robe Skirt & Legs
    const legMat = new THREE.MeshLambertMaterial({ color: 0x3d2915 });
    mats.push(legMat);

    const legGeo = new THREE.BoxGeometry(0.2, 0.58, 0.2);

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.13, 0.29, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.13, 0.29, 0);
    group.add(rightLeg);

    return {
      group,
      head,
      body,
      leftLeg,
      rightLeg,
      materials: mats,
      hurtMaterial: this.hurtMat,
    };
  }
}
