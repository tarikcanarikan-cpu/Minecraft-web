import * as THREE from 'three';
import { BlockType, ItemStack, GameMode, Vector3D, ItemDrop } from './types';
import { VoxelWorld, WorldPreset } from './world';
import { PlayerPhysics } from './physics';
import { GameRenderer } from './renderer';
import { sound } from './sound';
import { BLOCK_DEFS } from './blocks';
import { MobManager } from './mobs/mobSystem';
import { VehicleManager } from './vehicles/vehicleManager';
import { VehicleEntity } from './vehicles/types';

export interface GameStateListener {
  onHotbarChange?: (slots: (ItemStack | null)[], selectedIndex: number) => void;
  onStatsChange?: (health: number, hunger: number, isFlying: boolean, isGrounded: boolean) => void;
  onDebugChange?: (info: { x: number; y: number; z: number; fps: number; biome: string; targetBlock: string; dayTime: string }) => void;
  onModalChange?: (modal: 'none' | 'inventory' | 'crafting' | 'settings' | 'pause') => void;
  onGameModeChange?: (mode: GameMode) => void;
  onTNTChange?: (fuse: number | null) => void;
  onVehicleChange?: (info: {
    isDriving: boolean;
    speedKmh: number;
    fuel: number;
    canEnter: boolean;
    canRefuel: boolean;
  }) => void;
  onAnimalFollowChange?: (message: string) => void;
}

export class MinecraftGame {
  public world: VoxelWorld;
  public physics: PlayerPhysics;
  public renderer: GameRenderer;
  public mobManager: MobManager;
  public vehicleManager: VehicleManager;
  public gameMode: GameMode = 'creative';

  // Inventory: 9 hotbar slots + 27 main inventory slots
  public hotbar: (ItemStack | null)[] = new Array(9).fill(null);
  public inventory: (ItemStack | null)[] = new Array(27).fill(null);
  public selectedHotbarSlot = 0;

  // Active modal
  public activeModal: 'none' | 'inventory' | 'crafting' | 'settings' | 'pause' = 'none';

  // Input states
  private keys: Record<string, boolean> = {};
  public isPointerLocked = false;
  private wasEverPointerLocked = false;
  public isTouchMode = false;
  public touchInput = {
    forward: 0,
    strafe: 0,
    jump: false,
    sneak: false,
    sprint: false,
  };
  private canvas: HTMLCanvasElement;
  private listeners: GameStateListener = {};

  // Space double-tap detection for fly toggle
  private lastSpaceTime = 0;

  // Mining / breaking state
  private isMining = false;
  private miningTarget: Vector3D | null = null;
  private miningProgress = 0; // 0 to 1

  // Item drops
  public itemDrops: ItemDrop[] = [];

  // Active TNT fuses
  public primedTNTs: { id: string; pos: Vector3D; fuse: number; soundPlayed: boolean }[] = [];

  // Loop & FPS
  private isRunning = false;
  private lastTime = 0;
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentFps = 60;

  constructor(canvas: HTMLCanvasElement, preset: WorldPreset = 'standard', seed = 12345) {
    this.canvas = canvas;
    this.world = new VoxelWorld(seed, preset);
    this.physics = new PlayerPhysics(this.world.spawnPoint);
    this.renderer = new GameRenderer(canvas);
    this.mobManager = new MobManager(this.renderer.scene);
    this.mobManager.spawnInitialFauna(this.world);
    if (this.gameMode === 'creative') {
      this.mobManager.clearHostileMobs();
    }
    this.vehicleManager = new VehicleManager(this.renderer.scene);
    this.setupInitialVehicles();

    // Initial hotbar load
    this.setupInitialHotbar();

    // Setup hurt callback
    this.physics.onHurtCallback = () => {
      sound.playHit();
      this.notifyStats();
    };

    this.bindEvents();
    this.renderer.updateDirtyChunks(this.world);
  }

  private setupInitialHotbar() {
    this.hotbar[0] = { id: BlockType.DIAMOND_SWORD, count: 1 };
    this.hotbar[1] = { id: BlockType.COOKED_BEEF, count: 5 };
    this.hotbar[2] = { id: BlockType.GRASS, count: 64 };
    this.hotbar[3] = { id: BlockType.WOOD_PLANKS, count: 64 };
    this.hotbar[4] = { id: BlockType.COBBLESTONE, count: 64 };
    this.hotbar[5] = { id: BlockType.BRICK, count: 64 };
    this.hotbar[6] = { id: BlockType.TORCH, count: 64 };
    this.hotbar[7] = { id: BlockType.TNT, count: 64 };
    this.hotbar[8] = { id: BlockType.CRAFTING_TABLE, count: 1 };
  }

  public setListeners(listeners: GameStateListener) {
    this.listeners = listeners;
    this.notifyHotbar();
    this.notifyStats();
  }

  private notifyHotbar() {
    this.listeners.onHotbarChange?.([...this.hotbar], this.selectedHotbarSlot);
    const activeItem = this.hotbar[this.selectedHotbarSlot];
    this.renderer.updateHeldItem(activeItem ? activeItem.id : null);
  }

  private notifyStats() {
    this.listeners.onStatsChange?.(
      this.physics.stats.health,
      this.physics.stats.hunger,
      this.physics.stats.isFlying,
      this.physics.stats.isGrounded
    );
  }

  public setupInitialVehicles() {
    const findSurface = (x: number, z: number) => {
      for (let y = 38; y >= 2; y--) {
        const b = this.world.getBlock(x, y, z);
        if (b !== BlockType.AIR && b !== BlockType.LEAVES) return y + 1;
      }
      return 15;
    };

    // 1. Red Sports car at the Gas Station fuel pump
    const pumpCarY = findSurface(5, -9);
    this.vehicleManager.spawnCar({ x: 5.5, y: pumpCarY, z: -9.0 }, 'red', 0);

    // 2. Blue Convertible at the Gas Station parking bay
    const bayCarY = findSurface(10, -5);
    this.vehicleManager.spawnCar({ x: 10.5, y: bayCarY, z: -5.0 }, 'blue', Math.PI / 2);

    // 3. Yellow Sports car at the Villa driveway
    const villaCarY = findSurface(-20, -14);
    this.vehicleManager.spawnCar({ x: -20.5, y: villaCarY, z: -14.5 }, 'yellow', -Math.PI / 4);

    // 4. Green Jeep near the Village road
    const villageCarY = findSurface(14, 8);
    this.vehicleManager.spawnCar({ x: 14.5, y: villageCarY, z: 8.5 }, 'green', Math.PI);
  }

  public toggleVehicle() {
    if (this.vehicleManager.activeVehicleId) {
      const exitPos = this.vehicleManager.exitVehicle(this.physics.position);
      this.physics.position = exitPos;
      this.physics.velocity = { x: 0, y: 0, z: 0 };
    } else {
      const nearest = this.vehicleManager.getNearestVehicle(this.physics.position, 4.0);
      if (nearest) {
        this.vehicleManager.enterVehicle(nearest.id);
      }
    }
  }

  public tryRefuel(): boolean {
    const pumpPos = { x: 5.0, z: -8.0 };
    const distToPump = Math.hypot(this.physics.position.x - pumpPos.x, this.physics.position.z - pumpPos.z);
    if (distToPump < 9.0) {
      return this.vehicleManager.refuel();
    }
    return false;
  }

  public setGameMode(mode: GameMode) {
    this.gameMode = mode;
    if (mode === 'creative') {
      this.mobManager.clearHostileMobs();
    } else if (mode === 'survival') {
      this.physics.stats.isFlying = false;
      // Ensure player has Diamond Sword in hotbar
      const hasSword = this.hotbar.some((s) => s && s.id === BlockType.DIAMOND_SWORD);
      if (!hasSword) {
        this.hotbar[0] = { id: BlockType.DIAMOND_SWORD, count: 1 };
        this.selectedHotbarSlot = 0;
        this.notifyHotbar();
      }
      // Set hunger slightly below max if full so food gain is immediately visible
      if (this.physics.stats.hunger >= 20) {
        this.physics.stats.hunger = 14;
      }
    }
    this.listeners.onGameModeChange?.(mode);
    this.notifyStats();
  }

  public toggleAnimalFollow(mobId: string) {
    const result = this.mobManager.toggleFollow(mobId, this.physics.position);
    if (result) {
      const message = result.following
        ? `❤️ ${result.mobName} volgt je nu!`
        : `🛑 ${result.mobName} stopt met volgen.`;
      this.listeners.onAnimalFollowChange?.(message);
    }
  }

  public toggleModal(modal: 'none' | 'inventory' | 'crafting' | 'settings' | 'pause') {
    if (this.activeModal === modal) {
      this.activeModal = 'none';
      this.requestLock();
    } else {
      this.activeModal = modal;
      this.exitLock();
    }
    this.listeners.onModalChange?.(this.activeModal);
  }

  // Pointer lock handling
  public requestLock() {
    if (this.activeModal === 'none' && !this.isTouchMode) {
      try {
        this.canvas.requestPointerLock?.();
      } catch {
        // Safe fallback on mobile/iPad Safari
      }
    }
  }

  public exitLock() {
    if (document.pointerLockElement === this.canvas) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Safe fallback
      }
    }
  }

  // Rotate camera from touch swipe
  public rotateCamera(deltaX: number, deltaY: number, sensitivity = 0.0035) {
    this.physics.yaw -= deltaX * sensitivity;
    this.physics.pitch -= deltaY * sensitivity;

    const maxPitch = Math.PI / 2 - 0.02;
    this.physics.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.physics.pitch));
  }

  private bindEvents() {
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    // Mouse movement for camera look (works with Pointer Lock AND with Click & Drag!)
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas) {
        const sensitivity = 0.0024;
        this.physics.yaw -= e.movementX * sensitivity;
        this.physics.pitch -= e.movementY * sensitivity;

        const maxPitch = Math.PI / 2 - 0.02;
        this.physics.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.physics.pitch));
      } else if (isMouseDown && this.activeModal === 'none') {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        const sensitivity = 0.0035;
        this.physics.yaw -= dx * sensitivity;
        this.physics.pitch -= dy * sensitivity;

        const maxPitch = Math.PI / 2 - 0.02;
        this.physics.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.physics.pitch));
      }
    });

    // Direct Canvas Touch look fallback for touch devices
    let canvasTouchId: number | null = null;
    let lastTouchX = 0;
    let lastTouchY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (canvasTouchId !== null || this.activeModal !== 'none') return;
      const touch = e.changedTouches[0];
      canvasTouchId = touch.identifier;
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (canvasTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === canvasTouchId) {
          const dx = touch.clientX - lastTouchX;
          const dy = touch.clientY - lastTouchY;
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          this.rotateCamera(dx, dy, 0.004);
          break;
        }
      }
    }, { passive: true });

    const endCanvasTouch = (e: TouchEvent) => {
      if (canvasTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === canvasTouchId) {
          canvasTouchId = null;
          break;
        }
      }
    };
    window.addEventListener('touchend', endCanvasTouch, { passive: true });
    window.addEventListener('touchcancel', endCanvasTouch, { passive: true });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
      if (this.isPointerLocked) {
        this.wasEverPointerLocked = true;
      }
      if (!this.isPointerLocked && this.wasEverPointerLocked && !this.isTouchMode && this.activeModal === 'none') {
        // Paused on lock loss only if user actually used mouse pointer lock
        this.activeModal = 'pause';
        this.listeners.onModalChange?.('pause');
      }
    });

    // Keyboard handlers
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      this.keys[code] = true;

      // Number keys 1-9 for hotbar selection
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        this.selectedHotbarSlot = idx;
        this.notifyHotbar();
        return;
      }

      // Space double-tap for flying
      if (code === 'Space') {
        const now = performance.now();
        if (now - this.lastSpaceTime < 280) {
          if (this.gameMode === 'creative') {
            this.physics.toggleFly();
            this.notifyStats();
          }
        }
        this.lastSpaceTime = now;
      }

      // 'E' for inventory toggle
      if (code === 'KeyE') {
        if (this.activeModal === 'none') {
          this.toggleModal('inventory');
        } else if (this.activeModal === 'inventory' || this.activeModal === 'crafting') {
          this.toggleModal('none');
        }
        return;
      }

      // Escape for pause menu
      if (code === 'Escape') {
        if (this.activeModal !== 'none') {
          this.toggleModal('none');
        } else {
          this.toggleModal('pause');
        }
        return;
      }

      // Drop item with 'Q'
      if (code === 'KeyQ') {
        this.dropSelectedItem();
      }

      // Enter / Exit car with 'F'
      if (code === 'KeyF') {
        this.toggleVehicle();
        return;
      }

      // Car horn with 'H'
      if (code === 'KeyH') {
        this.vehicleManager.honk();
        return;
      }

      // Refuel with 'R'
      if (code === 'KeyR') {
        this.tryRefuel();
        return;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse scroll for hotbar cycle
    this.canvas.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) {
        this.selectedHotbarSlot = (this.selectedHotbarSlot + 1) % 9;
      } else {
        this.selectedHotbarSlot = (this.selectedHotbarSlot + 8) % 9;
      }
      this.notifyHotbar();
    });

    // Mouse clicks
    this.canvas.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== this.canvas) {
        this.requestLock();
        return;
      }

      if (e.button === 0) {
        // Left click: start mining / punch
        this.renderer.swingHand();
        this.isMining = true;
        this.handleLeftClick();
      } else if (e.button === 2) {
        // Right click: place block or interact
        e.preventDefault();
        this.handleRightClick();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMining = false;
        this.miningProgress = 0;
        this.miningTarget = null;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Window resize
    window.addEventListener('resize', () => {
      this.renderer.handleResize();
    });
  }

  // Raycast to find target voxel
  public getTargetIntersection() {
    const eyePos = this.physics.getEyePosition();
    const forwardX = -Math.sin(this.physics.yaw) * Math.cos(this.physics.pitch);
    const forwardY = Math.sin(this.physics.pitch);
    const forwardZ = -Math.cos(this.physics.yaw) * Math.cos(this.physics.pitch);

    return this.world.raycast(eyePos, { x: forwardX, y: forwardY, z: forwardZ }, 6.0);
  }

  // Left click: attack mob or mine block
  public handleLeftClick() {
    const eyePos = this.physics.getEyePosition();
    const forwardX = -Math.sin(this.physics.yaw) * Math.cos(this.physics.pitch);
    const forwardY = Math.sin(this.physics.pitch);
    const forwardZ = -Math.cos(this.physics.yaw) * Math.cos(this.physics.pitch);

    // 1. Attack mob if in range OR interact with peaceful animal in creative mode
    const selectedItem = this.hotbar[this.selectedHotbarSlot];
    const isHoldingSword = selectedItem?.id === BlockType.DIAMOND_SWORD;
    if (isHoldingSword) {
      sound.playSwordSlash();
    }

    const mobHit = this.mobManager.raycastMobs(eyePos, { x: forwardX, y: forwardY, z: forwardZ }, 4.8);
    if (mobHit) {
      this.renderer.swingHand();
      const mob = this.mobManager.mobs.find((m) => m.id === mobHit.mobId);
      if (mob && !mob.isHostile && this.gameMode === 'creative') {
        this.toggleAnimalFollow(mob.id);
        return;
      }

      const dmg = isHoldingSword ? 10 : 5;
      this.mobManager.hitMob(mobHit.mobId, dmg, eyePos, (pos, type) => {
        this.spawnItemDrop(pos, type);
      });

      // When hitting with sword (or hitting a mob), give food (Eten) and restore hunger!
      this.collectItem(BlockType.COOKED_BEEF);
      this.physics.stats.hunger = Math.min(20, this.physics.stats.hunger + 2);
      this.notifyStats();
      sound.playPickup();
      this.listeners.onAnimalFollowChange?.('⚔️ Raak! +1 🍖 Eten gekregen!');
      return;
    }

    // If holding sword and swinging, don't break blocks accidentally in survival
    if (isHoldingSword && this.gameMode === 'survival') {
      return;
    }

    // Check click on Car to enter it
    const carHit = this.vehicleManager.getNearestVehicle(eyePos, 3.8);
    if (carHit && !this.vehicleManager.activeVehicleId) {
      this.vehicleManager.enterVehicle(carHit.id);
      return;
    }

    // 2. Otherwise interact with voxels
    const hit = this.getTargetIntersection();
    if (!hit) return;

    const { x, y, z } = hit.blockPos;
    const block = this.world.getBlock(x, y, z);
    if (block === BlockType.AIR || block === BlockType.BEDROCK) return;

    if (this.gameMode === 'creative') {
      this.breakBlock(hit.blockPos, block);
    } else {
      this.miningTarget = hit.blockPos;
      this.miningProgress = 0;
    }
  }

  // Break a block completely
  private breakBlock(pos: Vector3D, block: BlockType) {
    const def = BLOCK_DEFS[block];
    sound.playBlockBreak(def ? def.sound : 'stone');

    // Trigger visual particles
    this.renderer.triggerBreakParticles(pos, block);

    // Remove block
    this.world.setBlock(pos.x, pos.y, pos.z, BlockType.AIR);

    // Drop item in survival
    if (this.gameMode === 'survival') {
      this.spawnItemDrop(pos, block);
    }

    this.renderer.updateDirtyChunks(this.world);
  }

  // Spawn floating 3D item pickup
  private spawnItemDrop(pos: Vector3D, type: BlockType) {
    this.itemDrops.push({
      id: `${Date.now()}_${Math.random()}`,
      type,
      position: { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 },
      velocity: {
        x: (Math.random() - 0.5) * 2,
        y: Math.random() * 2 + 1,
        z: (Math.random() - 0.5) * 2,
      },
      rotation: 0,
      createdAt: performance.now(),
    });
  }

  // Drop selected hotbar item
  private dropSelectedItem() {
    const slot = this.hotbar[this.selectedHotbarSlot];
    if (!slot || slot.count <= 0) return;

    const eyePos = this.physics.getEyePosition();
    const forwardX = -Math.sin(this.physics.yaw);
    const forwardZ = -Math.cos(this.physics.yaw);

    this.itemDrops.push({
      id: `${Date.now()}_${Math.random()}`,
      type: slot.id,
      position: { x: eyePos.x, y: eyePos.y - 0.2, z: eyePos.z },
      velocity: { x: forwardX * 4, y: 2, z: forwardZ * 4 },
      rotation: 0,
      createdAt: performance.now(),
    });

    slot.count--;
    if (slot.count <= 0) {
      this.hotbar[this.selectedHotbarSlot] = null;
    }
    this.notifyHotbar();
  }

  // Right click: place block or interact
  public handleRightClick() {
    const eyePos = this.physics.getEyePosition();
    const forwardX = -Math.sin(this.physics.yaw) * Math.cos(this.physics.pitch);
    const forwardY = Math.sin(this.physics.pitch);
    const forwardZ = -Math.cos(this.physics.yaw) * Math.cos(this.physics.pitch);

    // 1. Check interaction with Villager or Sheep / Peaceful animals (Follow / Stay) or Hostile mob
    const mobHit = this.mobManager.raycastMobs(eyePos, { x: forwardX, y: forwardY, z: forwardZ }, 4.5);
    if (mobHit) {
      const mob = this.mobManager.mobs.find((m) => m.id === mobHit.mobId);
      if (mob && !mob.isHostile) {
        this.renderer.swingHand();
        this.toggleAnimalFollow(mob.id);
        return;
      } else if (mob && mob.isHostile) {
        // Right-clicking a zombie also attacks it with sword and gives food!
        this.handleLeftClick();
        return;
      }
    }

    // Check if holding Eten (Cooked Beef) -> Eat food to restore 1 Heart and Hunger!
    const heldStack = this.hotbar[this.selectedHotbarSlot];
    if (heldStack && heldStack.id === BlockType.COOKED_BEEF && heldStack.count > 0) {
      this.renderer.swingHand();
      sound.playEat();
      this.physics.stats.health = Math.min(20, this.physics.stats.health + 2);
      this.physics.stats.hunger = Math.min(20, this.physics.stats.hunger + 4);
      if (this.gameMode === 'survival') {
        heldStack.count--;
        if (heldStack.count <= 0) {
          this.hotbar[this.selectedHotbarSlot] = null;
        }
      }
      this.notifyHotbar();
      this.notifyStats();
      this.listeners.onAnimalFollowChange?.('🍖 Eten gegeten! +1 ❤️ Hartje & +2 🍗');
      return;
    }

    // If holding Diamond Sword, don't place it as a block
    if (heldStack && heldStack.id === BlockType.DIAMOND_SWORD) {
      this.handleLeftClick();
      return;
    }

    // 2. Check interaction with Car to enter it
    const carHit = this.vehicleManager.getNearestVehicle(eyePos, 4.0);
    if (carHit && !this.vehicleManager.activeVehicleId) {
      this.vehicleManager.enterVehicle(carHit.id);
      return;
    }

    const hit = this.getTargetIntersection();
    if (!hit) return;

    const { x, y, z } = hit.blockPos;
    const targetBlock = this.world.getBlock(x, y, z);

    // Interacting with functional blocks:
    if (targetBlock === BlockType.CRAFTING_TABLE) {
      this.toggleModal('crafting');
      return;
    }

    if (targetBlock === BlockType.TNT) {
      // Ignite TNT!
      this.igniteTNT(hit.blockPos);
      return;
    }

    // Otherwise place selected block
    const selected = this.hotbar[this.selectedHotbarSlot];
    if (!selected || selected.count <= 0 || selected.id === BlockType.AIR) return;

    const placePos: Vector3D = {
      x: x + hit.faceNormal.x,
      y: y + hit.faceNormal.y,
      z: z + hit.faceNormal.z,
    };

    // Prevent placing inside player body
    const playerAABB = this.physics.getAABB();
    const blockAABB = {
      minX: placePos.x,
      minY: placePos.y,
      minZ: placePos.z,
      maxX: placePos.x + 1,
      maxY: placePos.y + 1,
      maxZ: placePos.z + 1,
    };

    const isIntersectingPlayer =
      playerAABB.minX < blockAABB.maxX &&
      playerAABB.maxX > blockAABB.minX &&
      playerAABB.minY < blockAABB.maxY &&
      playerAABB.maxY > blockAABB.minY &&
      playerAABB.minZ < blockAABB.maxZ &&
      playerAABB.maxZ > blockAABB.minZ;

    const def = BLOCK_DEFS[selected.id];
    if (isIntersectingPlayer && def?.isSolid !== false) return;

    // Place block
    this.world.setBlock(placePos.x, placePos.y, placePos.z, selected.id);
    sound.playBlockPlace(def ? def.sound : 'stone');
    this.renderer.swingHand();

    if (this.gameMode === 'survival') {
      selected.count--;
      if (selected.count <= 0) {
        this.hotbar[this.selectedHotbarSlot] = null;
      }
      this.notifyHotbar();
    }

    this.renderer.updateDirtyChunks(this.world);
  }

  // Touch Mining helpers for iPad/mobile
  public startTouchMining() {
    this.renderer.swingHand();
    this.isMining = true;
    this.handleLeftClick();
  }

  public stopTouchMining() {
    this.isMining = false;
    this.miningProgress = 0;
    this.miningTarget = null;
  }

  // Ignite TNT (explodes in 10 seconds)
  public igniteTNT(pos: Vector3D) {
    this.world.setBlock(pos.x, pos.y, pos.z, BlockType.AIR);
    this.renderer.updateDirtyChunks(this.world);
    sound.playFuse(10.0);
    this.primedTNTs.push({
      id: `${Date.now()}_${Math.random()}`,
      pos: { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 },
      fuse: 10.0,
      soundPlayed: true,
    });
  }

  // Start game loop
  public start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastFpsTime = performance.now();
    this.loop();
    sound.startAmbientMusic();
  }

  public stop() {
    this.isRunning = false;
  }

  private loop = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // FPS calculation
    this.frameCount++;
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    // Input collection: merge keyboard and touch controls
    const kbForward = (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0);
    const kbStrafe = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);

    // Keyboard look around with Arrow Keys or I/J/K/L
    if (this.activeModal === 'none') {
      const keyLookSpeed = 2.4 * dt;
      if (this.keys['ArrowLeft'] || this.keys['KeyJ']) {
        this.physics.yaw += keyLookSpeed;
      }
      if (this.keys['ArrowRight'] || this.keys['KeyL']) {
        this.physics.yaw -= keyLookSpeed;
      }
      if (this.keys['ArrowUp'] || this.keys['KeyI']) {
        this.physics.pitch += keyLookSpeed;
        this.physics.pitch = Math.min(Math.PI / 2 - 0.02, this.physics.pitch);
      }
      if (this.keys['ArrowDown'] || this.keys['KeyK']) {
        this.physics.pitch -= keyLookSpeed;
        this.physics.pitch = Math.max(-Math.PI / 2 + 0.02, this.physics.pitch);
      }
    }

    const input = {
      forward: Math.max(-1, Math.min(1, kbForward + this.touchInput.forward)),
      strafe: Math.max(-1, Math.min(1, kbStrafe + this.touchInput.strafe)),
      jump: !!this.keys['Space'] || this.touchInput.jump,
      sneak: !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'] || this.touchInput.sneak,
      sprint: !!this.keys['ControlLeft'] || !!this.keys['ControlRight'] || this.touchInput.sprint,
    };

    // Vehicle Physics & Driving
    const activeCar = this.vehicleManager.getActiveVehicle();
    this.vehicleManager.update(dt, this.world, {
      forward: input.forward,
      strafe: input.strafe,
      jump: input.jump,
      brake: !!this.keys['Space'],
    });

    if (activeCar) {
      // Sync player position inside vehicle
      this.physics.position.x = activeCar.position.x;
      this.physics.position.y = activeCar.position.y + 0.9;
      this.physics.position.z = activeCar.position.z;
      this.physics.velocity.x = activeCar.velocity.x;
      this.physics.velocity.y = activeCar.velocity.y;
      this.physics.velocity.z = activeCar.velocity.z;

      // Align camera smoothly with vehicle orientation when moving
      if (Math.abs(activeCar.speed) > 0.8) {
        let diff = activeCar.yaw - this.physics.yaw;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.physics.yaw += diff * Math.min(1, 4.0 * dt);
      }
    } else {
      // Normal player walking physics if not driving
      if (this.activeModal === 'none') {
        this.physics.update(this.world, dt, input, this.gameMode);
      }
    }

    // Handle continuous mining in survival
    if (this.isMining && this.gameMode === 'survival' && this.miningTarget) {
      const currentHit = this.getTargetIntersection();
      if (
        currentHit &&
        currentHit.blockPos.x === this.miningTarget.x &&
        currentHit.blockPos.y === this.miningTarget.y &&
        currentHit.blockPos.z === this.miningTarget.z
      ) {
        const b = this.world.getBlock(this.miningTarget.x, this.miningTarget.y, this.miningTarget.z);
        const def = BLOCK_DEFS[b];
        const hardness = def ? Math.max(0.1, def.hardness) : 1.0;
        this.miningProgress += dt / hardness;

        // Swing hand continuously
        this.renderer.swingHand();

        if (this.miningProgress >= 1.0) {
          this.breakBlock(this.miningTarget, b);
          this.isMining = false;
          this.miningProgress = 0;
          this.miningTarget = null;
        }
      } else {
        this.miningProgress = 0;
        this.miningTarget = null;
      }
    }

    // Update Primed TNT fuses (10.0 seconds countdown)
    for (let i = this.primedTNTs.length - 1; i >= 0; i--) {
      const tnt = this.primedTNTs[i];
      tnt.fuse -= dt;
      if (tnt.fuse <= 0) {
        // EXPLODE!
        sound.playExplosion();
        const destroyed = this.world.explode(tnt.pos, 4.5);
        for (const bPos of destroyed) {
          this.renderer.triggerBreakParticles(bPos, BlockType.DIRT);
          if (this.gameMode === 'survival' && Math.random() < 0.5) {
            this.spawnItemDrop(bPos, BlockType.COBBLESTONE);
          }
        }

        // Blast knockback to player if nearby
        const pPos = this.physics.position;
        const blastDist = Math.hypot(pPos.x - tnt.pos.x, pPos.y - tnt.pos.y, pPos.z - tnt.pos.z);
        if (blastDist < 7.0) {
          const knockbackStrength = (7.0 - blastDist) * 3.0;
          const kx = (pPos.x - tnt.pos.x) / (blastDist || 1);
          const kz = (pPos.z - tnt.pos.z) / (blastDist || 1);
          this.physics.velocity.x += kx * knockbackStrength;
          this.physics.velocity.y += 6.5;
          this.physics.velocity.z += kz * knockbackStrength;

          if (this.gameMode === 'survival') {
            const dmg = Math.floor((7.0 - blastDist) * 2.5);
            if (dmg > 0) {
              this.physics.stats.health = Math.max(0, this.physics.stats.health - dmg);
              this.physics.onHurtCallback?.(dmg);
            }
          }
        }

        this.renderer.updateDirtyChunks(this.world);
        this.primedTNTs.splice(i, 1);
      }
    }

    // Update 3D Primed TNT meshes in renderer
    this.renderer.updatePrimedTNTs(this.primedTNTs);

    // Update Item drops physics & collection
    const eyePos = this.physics.getEyePosition();
    for (let i = this.itemDrops.length - 1; i >= 0; i--) {
      const drop = this.itemDrops[i];
      drop.rotation += dt * 3;

      // Item gravity & friction
      drop.velocity.y -= 9.8 * dt;
      drop.position.y += drop.velocity.y * dt;
      drop.position.x += drop.velocity.x * dt;
      drop.position.z += drop.velocity.z * dt;
      drop.velocity.x *= 0.95;
      drop.velocity.z *= 0.95;

      // Ground check
      const floorB = this.world.getBlock(
        Math.floor(drop.position.x),
        Math.floor(drop.position.y - 0.1),
        Math.floor(drop.position.z)
      );
      if (floorB !== BlockType.AIR && floorB !== BlockType.WATER) {
        drop.velocity.y = 0;
        drop.position.y = Math.floor(drop.position.y) + 0.3;
      }

      // Check distance to player for collection
      const dist = Math.hypot(
        eyePos.x - drop.position.x,
        eyePos.y - drop.position.y,
        eyePos.z - drop.position.z
      );

      // Gravitate toward player when close
      if (dist < 2.5) {
        const pullSpeed = 4.5 * dt;
        drop.position.x += (eyePos.x - drop.position.x) * pullSpeed;
        drop.position.y += (eyePos.y - drop.position.y) * pullSpeed;
        drop.position.z += (eyePos.z - drop.position.z) * pullSpeed;
      }

      if (dist < 1.0) {
        // Collect!
        this.collectItem(drop.type);
        sound.playPickup();
        this.itemDrops.splice(i, 1);
      }
    }

    // Update item drop meshes in renderer
    this.renderer.updateItemDrops(this.itemDrops);

    // Update target block highlight outline
    const hit = this.getTargetIntersection();
    this.renderer.setTargetBlock(hit ? hit.blockPos : null);

    // Update Day/Night progression
    this.renderer.updateDayNight(dt);

    // Update Mobs (Zombies, Creepers, Sheep, Villagers)
    if (this.activeModal === 'none') {
      this.mobManager.update(
        dt,
        this.world,
        this.physics.position,
        this.renderer.dayTime,
        this.gameMode,
        (amount) => {
          this.physics.stats.health = Math.max(0, this.physics.stats.health - amount);
          this.physics.onHurtCallback?.(amount);
          if (this.physics.stats.health <= 0) {
            // Respawn player with full 10 hearts
            this.physics.stats.health = 20;
            this.physics.stats.hunger = 20;
            this.physics.position = { ...this.world.spawnPoint };
            this.listeners.onAnimalFollowChange?.('💀 Verslagen door zombie! Opnieuw gespawnd met 10 ❤️');
          } else {
            const heartsLeft = Math.ceil(this.physics.stats.health / 2);
            this.listeners.onAnimalFollowChange?.(`🧟 Zombie heeft je! -1 ❤️ (${heartsLeft}/10 hartjes over)`);
          }
          this.notifyStats();
        },
        (center, radius) => {
          const destroyed = this.world.explode(center, radius);
          for (const bPos of destroyed) {
            this.renderer.triggerBreakParticles(bPos, BlockType.DIRT);
            if (this.gameMode === 'survival' && Math.random() < 0.5) {
              this.spawnItemDrop(bPos, BlockType.COBBLESTONE);
            }
          }
          this.renderer.updateDirtyChunks(this.world);
        },
        (pos, type) => {
          this.spawnItemDrop(pos, type);
        }
      );
    }

    // Render 3D Frame
    const isMoving =
      Math.abs(this.physics.velocity.x) > 0.2 || Math.abs(this.physics.velocity.z) > 0.2;
    this.renderer.render(
      dt,
      this.physics.getEyePosition(),
      this.physics.yaw,
      this.physics.pitch,
      isMoving
    );

    // Notify debug overlay
    const forwardX = -Math.sin(this.physics.yaw) * Math.cos(this.physics.pitch);
    const forwardY = Math.sin(this.physics.pitch);
    const forwardZ = -Math.cos(this.physics.yaw) * Math.cos(this.physics.pitch);
    const mobHit = this.mobManager.raycastMobs(this.physics.getEyePosition(), { x: forwardX, y: forwardY, z: forwardZ }, 5.0);
    let targetDesc = hit ? (BLOCK_DEFS[this.world.getBlock(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z)]?.nameNl || 'Onbekend') : 'Geen';
    if (mobHit) {
      const mob = this.mobManager.mobs.find(m => m.id === mobHit.mobId);
      if (mob) targetDesc = `${mob.type.toUpperCase()} (${Math.ceil(mob.health)}/${mob.maxHealth} HP)`;
    }

    this.listeners.onDebugChange?.({
      x: Math.round(this.physics.position.x * 10) / 10,
      y: Math.round(this.physics.position.y * 10) / 10,
      z: Math.round(this.physics.position.z * 10) / 10,
      fps: this.currentFps,
      biome: this.world.preset === 'mountains' ? 'Berglandschap' : 'Vlaktes (Plains)',
      targetBlock: targetDesc,
      dayTime: this.renderer.dayTime > 0.2 && this.renderer.dayTime < 0.8 ? `Dag (${this.mobManager.mobs.length} entiteiten)` : `Nacht (${this.mobManager.mobs.length} entiteiten)`,
    });

    // Notify TNT countdown
    if (this.primedTNTs.length > 0) {
      let minFuse = 999;
      for (const t of this.primedTNTs) {
        if (t.fuse < minFuse) minFuse = t.fuse;
      }
      this.listeners.onTNTChange?.(minFuse);
    } else {
      this.listeners.onTNTChange?.(null);
    }

    // Notify vehicle dashboard & interactions
    const nearestCar = this.vehicleManager.getNearestVehicle(this.physics.position, 4.0);
    const pumpPos = { x: 5.0, z: -8.0 };
    const distToPump = Math.hypot(this.physics.position.x - pumpPos.x, this.physics.position.z - pumpPos.z);
    const canRefuel = distToPump < 9.0 && (activeCar !== null || nearestCar !== null);

    this.listeners.onVehicleChange?.({
      isDriving: activeCar !== null,
      speedKmh: activeCar ? Math.round(Math.abs(activeCar.speed) * 3.6) : 0,
      fuel: activeCar ? Math.round(activeCar.fuel) : (nearestCar ? Math.round(nearestCar.fuel) : 100),
      canEnter: activeCar === null && nearestCar !== null,
      canRefuel,
    });
  };

  // Collect item into hotbar or main inventory
  private collectItem(type: BlockType) {
    // 1. Try stacking into hotbar
    for (let i = 0; i < 9; i++) {
      const slot = this.hotbar[i];
      if (slot && slot.id === type && slot.count < 64) {
        slot.count++;
        this.notifyHotbar();
        return;
      }
    }
    // 2. Try empty hotbar slot
    for (let i = 0; i < 9; i++) {
      if (!this.hotbar[i]) {
        this.hotbar[i] = { id: type, count: 1 };
        this.notifyHotbar();
        return;
      }
    }
    // 3. Try main inventory
    for (let i = 0; i < 27; i++) {
      const slot = this.inventory[i];
      if (slot && slot.id === type && slot.count < 64) {
        slot.count++;
        return;
      }
    }
    for (let i = 0; i < 27; i++) {
      if (!this.inventory[i]) {
        this.inventory[i] = { id: type, count: 1 };
        return;
      }
    }
  }

  // Set selected item in hotbar slot directly
  public setHotbarItem(slotIndex: number, item: ItemStack | null) {
    if (slotIndex >= 0 && slotIndex < 9) {
      this.hotbar[slotIndex] = item;
      this.notifyHotbar();
    }
  }

  // Teleport player
  public teleport(x: number, y: number, z: number) {
    this.physics.position = { x, y, z };
    this.physics.velocity = { x: 0, y: 0, z: 0 };
  }

  // Save world to LocalStorage
  public saveToStorage(saveName = 'minecraft_web_world') {
    const worldData = this.world.serialize();
    const playerData = {
      pos: this.physics.position,
      yaw: this.physics.yaw,
      pitch: this.physics.pitch,
      hotbar: this.hotbar,
      inventory: this.inventory,
      gameMode: this.gameMode,
    };
    localStorage.setItem(saveName, JSON.stringify({ world: worldData, player: playerData }));
  }

  // Load world from LocalStorage
  public loadFromStorage(saveName = 'minecraft_web_world'): boolean {
    const raw = localStorage.getItem(saveName);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      this.world.deserialize(data.world);
      this.physics.position = data.player.pos || { x: 0, y: 25, z: 0 };
      this.physics.yaw = data.player.yaw || 0;
      this.physics.pitch = data.player.pitch || 0;
      this.hotbar = data.player.hotbar || this.hotbar;
      this.inventory = data.player.inventory || this.inventory;
      this.setGameMode(data.player.gameMode || 'creative');
      this.renderer.updateDirtyChunks(this.world);
      this.notifyHotbar();
      this.notifyStats();
      return true;
    } catch (e) {
      console.error('Failed to load world', e);
      return false;
    }
  }

  public dispose() {
    this.stop();
    this.renderer.dispose();
  }
}
