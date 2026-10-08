import * as THREE from 'three';
import { BlockType, Vector3D, ItemDrop } from './types';
import { VoxelWorld, CHUNK_SIZE, CHUNK_HEIGHT, Chunk } from './world';
import { BLOCK_DEFS } from './blocks';
import { generateBlockTextures } from './textures';

// Face definition helpers: [dx, dy, dz]
const FACES = [
  { dir: [1, 0, 0], name: 'right', corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { dir: [-1, 0, 0], name: 'left', corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { dir: [0, 1, 0], name: 'top', corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], name: 'bottom', corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [0, 0, 1], name: 'front', corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { dir: [0, 0, -1], name: 'back', corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];

export class GameRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private chunkMeshes = new Map<string, THREE.Mesh>();
  private materials = new Map<string, THREE.Material>();
  private textures: ReturnType<typeof generateBlockTextures>;

  // Lighting & Day-Night
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private skyColor = new THREE.Color(0x78a7ff);
  private nightSkyColor = new THREE.Color(0x0b0e1b);
  private sunsetSkyColor = new THREE.Color(0xff8547);
  private starsParticles: THREE.Points;

  // Hand / Held item in first person
  private handPivot: THREE.Group;
  private heldItemMesh: THREE.Object3D | null = null;
  public isSwinging = false;
  private swingProgress = 0;
  private walkBob = 0;

  // Selection outline
  private selectionBox: THREE.LineSegments;

  // Particles
  private breakParticles: THREE.Points;
  private particlePositions: Float32Array;
  private particleVelocities: Float32Array;
  private particleCount = 200;
  private particleIndex = 0;

  // Item drops
  private itemDropMeshes = new Map<string, THREE.Mesh>();

  // Primed TNT meshes
  private primedTNTMeshes = new Map<string, THREE.Mesh>();
  private tntWhiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Time & Day
  public dayTime = 0.25; // 0.25 = noon, 0.5 = sunset, 0.75 = midnight, 1.0 = dawn
  public daySpeed = 1 / 180; // 1 full cycle = 180 seconds

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = this.skyColor.clone();
    this.scene.fog = new THREE.FogExp2(this.skyColor.getHex(), 0.015);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = false; // keep fast 60fps

    this.textures = generateBlockTextures();

    // Lighting setup
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    this.sunLight.position.set(50, 100, 50);
    this.scene.add(this.sunLight);

    // Stars in night sky
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 150;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 10; // keep above horizon
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false });
    this.starsParticles = new THREE.Points(starsGeo, starMat);
    this.scene.add(this.starsParticles);

    // Block Selection outline
    const boxGeo = new THREE.BoxGeometry(1.003, 1.003, 1.003);
    const wireGeo = new THREE.EdgesGeometry(boxGeo);
    this.selectionBox = new THREE.LineSegments(
      wireGeo,
      new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 })
    );
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    // Particles system for block breaking
    const pGeo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleVelocities = new Float32Array(this.particleCount * 3);
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x8a6e50,
      size: 4,
      sizeAttenuation: true,
    });
    this.breakParticles = new THREE.Points(pGeo, pMat);
    this.scene.add(this.breakParticles);

    // First person hand & held item
    this.handPivot = new THREE.Group();
    this.camera.add(this.handPivot);
    this.scene.add(this.camera);

    this.createHand();
    this.initMaterials();
  }

  private initMaterials() {
    // Generate materials for all block types
    for (const [key, faces] of Object.entries(this.textures)) {
      const id = Number(key) as BlockType;
      const def = BLOCK_DEFS[id];
      if (!def) continue;

      const isWater = id === BlockType.WATER;
      const isGlass = id === BlockType.GLASS;
      const isLeaves = id === BlockType.LEAVES;
      const isFlora = id === BlockType.POPPY || id === BlockType.DANDELION || id === BlockType.TORCH;

      const topMat = new THREE.MeshLambertMaterial({
        map: faces.top,
        transparent: isWater || isGlass || isLeaves || isFlora,
        opacity: isWater ? 0.75 : 1.0,
        side: isFlora ? THREE.DoubleSide : THREE.FrontSide,
        depthWrite: !isWater,
      });

      const sideMat = new THREE.MeshLambertMaterial({
        map: faces.side,
        transparent: isWater || isGlass || isLeaves || isFlora,
        opacity: isWater ? 0.75 : 1.0,
        side: isFlora ? THREE.DoubleSide : THREE.FrontSide,
        depthWrite: !isWater,
      });

      const bottomMat = new THREE.MeshLambertMaterial({
        map: faces.bottom,
        transparent: isWater || isGlass || isLeaves,
        opacity: isWater ? 0.75 : 1.0,
      });

      this.materials.set(`${id}_top`, topMat);
      this.materials.set(`${id}_side`, sideMat);
      this.materials.set(`${id}_bottom`, bottomMat);
      if (faces.front) {
        this.materials.set(`${id}_front`, new THREE.MeshLambertMaterial({ map: faces.front }));
      }
    }
  }

  private createHand() {
    // Player right forearm / fist
    const armGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    // Steve skin tone / sleeve
    const armMat = new THREE.MeshLambertMaterial({ color: 0x228888 }); // turquoise Steve shirt
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0.35, -0.35, -0.55);
    arm.rotation.set(-0.3, -0.2, 0.1);
    this.handPivot.add(arm);
  }

  public updateHeldItem(item: BlockType | null) {
    if (this.heldItemMesh) {
      this.handPivot.remove(this.heldItemMesh);
      this.heldItemMesh = null;
    }

    if (item && item !== (BlockType.AIR as BlockType)) {
      if (item === BlockType.DIAMOND_SWORD) {
        const swordGroup = new THREE.Group();
        const bladeMat = new THREE.MeshLambertMaterial({ color: 0x33ebcb });
        const edgeMat = new THREE.MeshLambertMaterial({ color: 0x18b5a0 });
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x5c3c1b });

        // Handle
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), handleMat);
        handle.position.set(0, -0.12, 0);
        swordGroup.add(handle);

        // Pommel
        const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), edgeMat);
        pommel.position.set(0, -0.21, 0);
        swordGroup.add(pommel);

        // Crossguard
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.07), edgeMat);
        guard.position.set(0, -0.02, 0);
        swordGroup.add(guard);

        // Diamond Blade
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.03), bladeMat);
        blade.position.set(0, 0.22, 0);
        swordGroup.add(blade);

        // Blade tip
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), bladeMat);
        tip.position.set(0, 0.46, 0);
        swordGroup.add(tip);

        swordGroup.position.set(0.32, -0.22, -0.48);
        swordGroup.rotation.set(-0.55, 0.25, 0.15);
        this.heldItemMesh = swordGroup;
        this.handPivot.add(this.heldItemMesh);
        return;
      }

      const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const faces = this.textures[item];
      const mat = faces?.side
        ? new THREE.MeshLambertMaterial({
            map: faces.side,
            transparent: item === BlockType.COOKED_BEEF,
          })
        : new THREE.MeshLambertMaterial({ color: 0x888888 });

      this.heldItemMesh = new THREE.Mesh(geo, mat);
      this.heldItemMesh.position.set(0.3, -0.25, -0.45);
      this.heldItemMesh.rotation.set(0.2, 0.6, 0);
      this.handPivot.add(this.heldItemMesh);
    }
  }

  // Trigger punch swing
  public swingHand() {
    if (!this.isSwinging) {
      this.isSwinging = true;
      this.swingProgress = 0;
    }
  }

  public triggerBreakParticles(pos: Vector3D, block: BlockType) {
    const def = BLOCK_DEFS[block];
    const color =
      def?.sound === 'grass' ? 0x599b35
      : def?.sound === 'wood' ? 0x6e4f2b
      : def?.sound === 'sand' ? 0xdbce98
      : def?.sound === 'glass' ? 0xcbe9fc
      : 0x7d7d7d;

    (this.breakParticles.material as THREE.PointsMaterial).color.setHex(color);

    for (let i = 0; i < 16; i++) {
      const idx = (this.particleIndex + i) % this.particleCount;
      this.particlePositions[idx * 3] = pos.x + Math.random();
      this.particlePositions[idx * 3 + 1] = pos.y + Math.random();
      this.particlePositions[idx * 3 + 2] = pos.z + Math.random();

      this.particleVelocities[idx * 3] = (Math.random() - 0.5) * 3;
      this.particleVelocities[idx * 3 + 1] = Math.random() * 3 + 1;
      this.particleVelocities[idx * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    this.particleIndex = (this.particleIndex + 16) % this.particleCount;
    (this.breakParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // Update chunks that have been modified or need initial meshing
  public updateDirtyChunks(world: VoxelWorld) {
    for (const [, chunk] of world.chunks.entries()) {
      if (chunk.isDirty) {
        this.meshChunk(world, chunk);
        chunk.isDirty = false;
      }
    }
  }

  // Mesh a single chunk into an optimized geometry
  private meshChunk(world: VoxelWorld, chunk: Chunk) {
    const key = world.getChunkKey(chunk.cx, chunk.cz);
    const existingMesh = this.chunkMeshes.get(key);
    if (existingMesh) {
      this.scene.remove(existingMesh);
      existingMesh.geometry.dispose();
      this.chunkMeshes.delete(key);
    }

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const groupIndices: { start: number; count: number; materialIndex: number }[] = [];

    const matKeys: string[] = [];
    const getMatIndex = (matKey: string) => {
      let idx = matKeys.indexOf(matKey);
      if (idx === -1) {
        idx = matKeys.length;
        matKeys.push(matKey);
      }
      return idx;
    };

    const isTransparent = (b: BlockType) => {
      if (b === BlockType.AIR) return true;
      const def = BLOCK_DEFS[b];
      return !!def?.isTransparent;
    };

    const { cx, cz } = chunk;
    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    // Temporary grouping per material
    const matGeomMap = new Map<number, { pos: number[]; norm: number[]; uv: number[] }>();

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const wx = startX + lx;
          const wz = startZ + lz;
          const block = world.getBlock(wx, y, wz);
          if (block === BlockType.AIR) continue;

          // Special flora rendering (X quads for Poppy, Dandelion, Torch)
          if (block === BlockType.POPPY || block === BlockType.DANDELION || block === BlockType.TORCH) {
            const matIdx = getMatIndex(`${block}_top`);
            if (!matGeomMap.has(matIdx)) matGeomMap.set(matIdx, { pos: [], norm: [], uv: [] });
            const data = matGeomMap.get(matIdx)!;

            // Quad 1: (0,0,0) to (1,1,1)
            data.pos.push(
              wx, y, wz,
              wx + 1, y, wz + 1,
              wx + 1, y + 1, wz + 1,
              wx, y, wz,
              wx + 1, y + 1, wz + 1,
              wx, y + 1, wz
            );
            for (let i = 0; i < 6; i++) data.norm.push(0, 1, 0);
            data.uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);

            // Quad 2: (0,0,1) to (1,1,0)
            data.pos.push(
              wx, y, wz + 1,
              wx + 1, y, wz,
              wx + 1, y + 1, wz,
              wx, y, wz + 1,
              wx + 1, y + 1, wz,
              wx, y + 1, wz + 1
            );
            for (let i = 0; i < 6; i++) data.norm.push(0, 1, 0);
            data.uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
            continue;
          }

          // Standard 6 faces
          for (const face of FACES) {
            const nx = wx + face.dir[0];
            const ny = y + face.dir[1];
            const nz = wz + face.dir[2];
            const neighbor = world.getBlock(nx, ny, nz);

            // Face exposed if neighbor is air or transparent (and not same transparent type)
            const expose =
              neighbor === BlockType.AIR ||
              (isTransparent(neighbor) && neighbor !== block);

            if (expose) {
              let matKey = `${block}_side`;
              if (face.name === 'top') matKey = `${block}_top`;
              else if (face.name === 'bottom') matKey = `${block}_bottom`;
              else if (face.name === 'front' && this.materials.has(`${block}_front`)) {
                matKey = `${block}_front`;
              }

              const matIdx = getMatIndex(matKey);
              if (!matGeomMap.has(matIdx)) {
                matGeomMap.set(matIdx, { pos: [], norm: [], uv: [] });
              }
              const data = matGeomMap.get(matIdx)!;

              // Compute corner vertices
              const c = face.corners;
              const yOffset = block === BlockType.WATER && face.name === 'top' ? -0.15 : 0;

              // Two triangles: (c0, c1, c2) and (c0, c2, c3)
              data.pos.push(
                wx + c[0][0], y + c[0][1] + yOffset, wz + c[0][2],
                wx + c[1][0], y + c[1][1] + yOffset, wz + c[1][2],
                wx + c[2][0], y + c[2][1] + yOffset, wz + c[2][2],
                wx + c[0][0], y + c[0][1] + yOffset, wz + c[0][2],
                wx + c[2][0], y + c[2][1] + yOffset, wz + c[2][2],
                wx + c[3][0], y + c[3][1] + yOffset, wz + c[3][2]
              );

              for (let i = 0; i < 6; i++) {
                data.norm.push(face.dir[0], face.dir[1], face.dir[2]);
              }

              data.uv.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
            }
          }
        }
      }
    }

    if (matGeomMap.size === 0) return;

    // Assemble unified BufferGeometry with material groups
    let offset = 0;
    const geometry = new THREE.BufferGeometry();
    const materialArray: THREE.Material[] = [];

    for (const [matIdx, data] of matGeomMap.entries()) {
      const count = data.pos.length / 3;
      geometry.addGroup(offset, count, matIdx);
      offset += count;

      positions.push(...data.pos);
      normals.push(...data.norm);
      uvs.push(...data.uv);
    }

    for (const key of matKeys) {
      materialArray.push(this.materials.get(key) || new THREE.MeshBasicMaterial());
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const chunkMesh = new THREE.Mesh(geometry, materialArray);
    this.scene.add(chunkMesh);
    this.chunkMeshes.set(key, chunkMesh);
  }

  // Update item drop meshes
  public updateItemDrops(drops: ItemDrop[]) {
    const activeIds = new Set(drops.map((d) => d.id));

    // Remove expired drops
    for (const [id, mesh] of this.itemDropMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        this.itemDropMeshes.delete(id);
      }
    }

    // Update or add drops
    for (const drop of drops) {
      let mesh = this.itemDropMeshes.get(drop.id);
      if (!mesh) {
        const geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
        const faces = this.textures[drop.type];
        const mat = faces?.side
          ? new THREE.MeshLambertMaterial({ map: faces.side })
          : new THREE.MeshLambertMaterial({ color: 0x999999 });
        mesh = new THREE.Mesh(geo, mat);
        this.scene.add(mesh);
        this.itemDropMeshes.set(drop.id, mesh);
      }

      mesh.position.set(drop.position.x, drop.position.y + Math.sin(Date.now() * 0.005) * 0.05, drop.position.z);
      mesh.rotation.y = drop.rotation;
    }
  }

  // Update Primed TNT blocks in 3D world with 10s countdown flashing animation
  public updatePrimedTNTs(tnts: { id: string; pos: Vector3D; fuse: number }[]) {
    const activeIds = new Set(tnts.map((t) => t.id));

    // Remove exploded TNT meshes
    for (const [id, mesh] of this.primedTNTMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        this.primedTNTMeshes.delete(id);
      }
    }

    const tntFaces = this.textures[BlockType.TNT];
    const normalSideMat = this.materials.get(`${BlockType.TNT}_side`) || new THREE.MeshBasicMaterial({ color: 0xcc2222 });
    const normalTopMat = this.materials.get(`${BlockType.TNT}_top`) || normalSideMat;

    // Normal 6-material cube for TNT [right, left, top, bottom, front, back]
    const normalMatArray = [
      normalSideMat, normalSideMat, normalTopMat, normalTopMat, normalSideMat, normalSideMat
    ];
    // White flash 6-material cube
    const whiteMatArray = [
      this.tntWhiteMaterial, this.tntWhiteMaterial, this.tntWhiteMaterial,
      this.tntWhiteMaterial, this.tntWhiteMaterial, this.tntWhiteMaterial
    ];

    for (const tnt of tnts) {
      let mesh = this.primedTNTMeshes.get(tnt.id);
      if (!mesh) {
        const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
        mesh = new THREE.Mesh(geo, normalMatArray);
        this.scene.add(mesh);
        this.primedTNTMeshes.set(tnt.id, mesh);
      }

      // Position: centered at block with a gentle idle bounce
      const hop = Math.sin((10.0 - tnt.fuse) * 4) * 0.05;
      mesh.position.set(tnt.pos.x, tnt.pos.y + hop, tnt.pos.z);

      // Flash calculation: frequency speeds up as fuse nears 0 (from 1 Hz up to 8 Hz)
      const elapsed = 10.0 - tnt.fuse;
      const freq = 2.0 + (elapsed / 10.0) * 8.0;
      const isWhite = Math.sin(elapsed * freq * Math.PI) > 0.2;

      mesh.material = isWhite ? whiteMatArray : normalMatArray;

      // Pulse expansion: grows slightly before detonation
      const scale = 1.0 + (elapsed / 10.0) * 0.12;
      mesh.scale.set(scale, scale, scale);
    }
  }

  // Target outline
  public setTargetBlock(pos: Vector3D | null) {
    if (!pos) {
      this.selectionBox.visible = false;
    } else {
      this.selectionBox.visible = true;
      this.selectionBox.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
    }
  }

  // Animate Day / Night cycle
  public updateDayNight(dt: number) {
    this.dayTime = (this.dayTime + dt * this.daySpeed) % 1.0;

    // Sun angle
    const angle = this.dayTime * Math.PI * 2;
    const sunDist = 120;
    this.sunLight.position.set(Math.cos(angle) * sunDist, Math.sin(angle) * sunDist, 30);

    const sunHeight = Math.sin(angle); // 1 = noon, -1 = midnight, 0 = horizon

    if (sunHeight > 0.1) {
      // Day
      const t = Math.min(1, (sunHeight - 0.1) / 0.4);
      this.skyColor.setHex(0x78a7ff);
      this.sunLight.color.setHex(0xfff5e6);
      this.sunLight.intensity = 1.0 + t * 0.3;
      this.ambientLight.intensity = 0.5 + t * 0.35;
      this.starsParticles.visible = false;
    } else if (sunHeight > -0.1) {
      // Dawn / Dusk transition
      this.skyColor.copy(this.sunsetSkyColor);
      this.sunLight.color.setHex(0xff8844);
      this.sunLight.intensity = 0.5;
      this.ambientLight.intensity = 0.35;
      this.starsParticles.visible = true;
    } else {
      // Night
      this.skyColor.copy(this.nightSkyColor);
      this.sunLight.color.setHex(0x3a4f88);
      this.sunLight.intensity = 0.15;
      this.ambientLight.intensity = 0.18;
      this.starsParticles.visible = true;
    }

    this.scene.background = this.skyColor;
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.skyColor);
    }
  }

  // Frame tick
  public render(
    dt: number,
    camPos: Vector3D,
    yaw: number,
    pitch: number,
    isMoving: boolean
  ) {
    this.camera.position.set(camPos.x, camPos.y, camPos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = yaw;
    this.camera.rotation.x = pitch;

    // Walking bob
    if (isMoving) {
      this.walkBob += dt * 10;
      const bobY = Math.sin(this.walkBob) * 0.02;
      const bobX = Math.cos(this.walkBob * 0.5) * 0.015;
      this.handPivot.position.set(bobX, bobY, 0);
    } else {
      this.handPivot.position.set(0, 0, 0);
    }

    // Hand swing animation
    if (this.isSwinging) {
      this.swingProgress += dt * 6; // quick punch
      if (this.swingProgress >= Math.PI) {
        this.isSwinging = false;
        this.swingProgress = 0;
        this.handPivot.rotation.set(0, 0, 0);
      } else {
        const swing = Math.sin(this.swingProgress);
        this.handPivot.rotation.x = -swing * 0.6;
        this.handPivot.rotation.y = swing * 0.4;
      }
    }

    // Particles physics tick
    for (let i = 0; i < this.particleCount; i++) {
      if (this.particleVelocities[i * 3 + 1] !== 0) {
        this.particlePositions[i * 3] += this.particleVelocities[i * 3] * dt;
        this.particlePositions[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * dt;
        this.particlePositions[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * dt;
        this.particleVelocities[i * 3 + 1] -= 9.8 * dt; // gravity

        // Fade after falling
        if (this.particlePositions[i * 3 + 1] < 0) {
          this.particleVelocities[i * 3 + 1] = 0;
        }
      }
    }
    (this.breakParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public dispose() {
    this.renderer.dispose();
  }
}
