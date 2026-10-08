/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MinecraftGame } from './minecraft/game';
import { ItemStack, GameMode } from './minecraft/types';
import { WorldPreset } from './minecraft/world';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { CraftingTableModal } from './components/CraftingTableModal';
import { PauseMenu } from './components/PauseMenu';
import { SettingsModal } from './components/SettingsModal';
import { MobileControls } from './components/MobileControls';
import { sound } from './minecraft/sound';
import { Play, Sparkles, Tablet } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<MinecraftGame | null>(null);

  const [hasStarted, setHasStarted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hotbar, setHotbar] = useState<(ItemStack | null)[]>(new Array(9).fill(null));
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('creative');
  const [health, setHealth] = useState(20);
  const [hunger, setHunger] = useState(20);
  const [isFlying, setIsFlying] = useState(false);
  const [isSneaking, setIsSneaking] = useState(false);
  const [tntCountdown, setTntCountdown] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'inventory' | 'crafting' | 'settings' | 'pause'>('none');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [fov, setFov] = useState(70);
  const [daySpeed, setDaySpeed] = useState(1 / 180);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [animalToast, setAnimalToast] = useState<string | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<{
    isDriving: boolean;
    speedKmh: number;
    fuel: number;
    canEnter: boolean;
    canRefuel: boolean;
  }>({
    isDriving: false,
    speedKmh: 0,
    fuel: 100,
    canEnter: false,
    canRefuel: false,
  });

  // Initialize Game on Mount
  useEffect(() => {
    if (!canvasRef.current) return;

    // Detect iPad, iPadOS Safari (which identifies as MacIntel with touch), or mobile
    const isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isTouch) {
      setIsTouchDevice(true);
    }

    const game = new MinecraftGame(canvasRef.current, 'standard', 12345);
    game.isTouchMode = isTouch;
    gameRef.current = game;

    // Try loading saved world if exists
    game.loadFromStorage('minecraft_autosave');

    // Register listeners
    game.setListeners({
      onHotbarChange: (slots, selectedIdx) => {
        setHotbar([...slots]);
        setSelectedSlot(selectedIdx);
      },
      onStatsChange: (hp, hg, fly) => {
        setHealth(hp);
        setHunger(hg);
        setIsFlying(fly);
      },
      onDebugChange: (info) => {
        setDebugInfo(info);
      },
      onModalChange: (modal) => {
        setActiveModal(modal);
      },
      onGameModeChange: (mode) => {
        setGameMode(mode);
      },
      onTNTChange: (fuse) => {
        setTntCountdown(fuse);
      },
      onVehicleChange: (info) => {
        setVehicleInfo(info);
      },
      onAnimalFollowChange: (msg) => {
        setAnimalToast(msg);
        setTimeout(() => setAnimalToast(null), 3200);
      },
    });

    game.start();

    const handlePointerLockChange = () => {
      setIsLocked(document.pointerLockElement === canvasRef.current);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Auto save world every 60 seconds
    const autoSaveTimer = setInterval(() => {
      game.saveToStorage('minecraft_autosave');
    }, 60000);

    return () => {
      clearInterval(autoSaveTimer);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      game.dispose();
    };
  }, []);

  const handleStartGame = () => {
    setHasStarted(true);
    sound.initCtx();
    if (!isTouchDevice) {
      gameRef.current?.requestLock();
    }
  };

  const handleSelectSlot = useCallback((idx: number) => {
    if (gameRef.current) {
      gameRef.current.selectedHotbarSlot = idx;
      setSelectedSlot(idx);
      const item = gameRef.current.hotbar[idx];
      gameRef.current.renderer.updateHeldItem(item ? item.id : null);
    }
  }, []);

  const handleToggleGameMode = useCallback(() => {
    if (gameRef.current) {
      const next = gameMode === 'creative' ? 'survival' : 'creative';
      gameRef.current.setGameMode(next);
      setGameMode(next);
    }
  }, [gameMode]);

  const handleToggleFly = useCallback(() => {
    if (gameRef.current) {
      const flying = gameRef.current.physics.toggleFly();
      setIsFlying(flying);
    }
  }, []);

  const handleToggleTouchMode = useCallback(() => {
    setIsTouchDevice((prev) => {
      const next = !prev;
      if (gameRef.current) {
        gameRef.current.isTouchMode = next;
      }
      return next;
    });
  }, []);

  const handleToggleTime = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.renderer.dayTime = (gameRef.current.renderer.dayTime + 0.5) % 1.0;
    }
  }, []);

  const handleNewWorld = useCallback((preset: WorldPreset, seed: number) => {
    if (gameRef.current) {
      gameRef.current.world = new (gameRef.current.world.constructor as any)(seed, preset);
      gameRef.current.physics.position = { ...gameRef.current.world.spawnPoint };
      gameRef.current.physics.velocity = { x: 0, y: 0, z: 0 };
      gameRef.current.renderer.updateDirtyChunks(gameRef.current.world);
      // Respawn mobs and vehicles
      for (const m of [...gameRef.current.mobManager.mobs]) {
        gameRef.current.mobManager.killMob(m.id);
      }
      gameRef.current.mobManager.spawnInitialFauna(gameRef.current.world);
      gameRef.current.setupInitialVehicles();
      setActiveModal('none');
      if (!isTouchDevice) {
        gameRef.current.requestLock();
      }
    }
  }, [isTouchDevice]);

  const handleSaveWorld = useCallback(() => {
    gameRef.current?.saveToStorage('minecraft_saved_slot_1');
  }, []);

  const handleLoadWorld = useCallback((): boolean => {
    if (gameRef.current) {
      const ok = gameRef.current.loadFromStorage('minecraft_saved_slot_1');
      if (ok) {
        setActiveModal('none');
        if (!isTouchDevice) {
          gameRef.current.requestLock();
        }
        return true;
      }
    }
    return false;
  }, [isTouchDevice]);

  const handleTeleport = useCallback((x: number, y: number, z: number) => {
    if (gameRef.current) {
      gameRef.current.physics.position = { x, y, z };
      gameRef.current.physics.velocity = { x: 0, y: 0, z: 0 };
      setActiveModal('none');
      if (!isTouchDevice) {
        gameRef.current.requestLock();
      }
    }
  }, [isTouchDevice]);

  const handleToggleVehicle = useCallback(() => {
    gameRef.current?.toggleVehicle();
  }, []);

  const handleHonkVehicle = useCallback(() => {
    gameRef.current?.vehicleManager.honk();
  }, []);

  const handleRefuelVehicle = useCallback(() => {
    gameRef.current?.tryRefuel();
  }, []);

  const handleChangeFov = useCallback((val: number) => {
    setFov(val);
    if (gameRef.current) {
      gameRef.current.renderer.camera.fov = val;
      gameRef.current.renderer.camera.updateProjectionMatrix();
    }
  }, []);

  const handleChangeDaySpeed = useCallback((val: number) => {
    setDaySpeed(val);
    if (gameRef.current) {
      gameRef.current.renderer.daySpeed = val;
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair touch-none"
        onClick={() => {
          if (!hasStarted) {
            handleStartGame();
          } else if (activeModal === 'none' && !isLocked && !isTouchDevice) {
            gameRef.current?.requestLock();
          }
        }}
      />

      {/* Initial Welcome & Start Screen Overlay */}
      {!hasStarted && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="mc-panel w-full max-w-lg p-6 rounded text-center flex flex-col gap-4 shadow-2xl animate-scale-up text-[#111]">
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl md:text-4xl font-extrabold mc-font text-amber-400 mc-text-shadow tracking-wider">
                MINECRAFT WEB
              </span>
              <span className="text-xs text-neutral-800 mc-font font-bold">
                Speelbaar op iPad, Tablet & Desktop!
              </span>
            </div>

            <div className="bg-[#b5b5b5] p-3 rounded border border-[#666] text-xs text-left space-y-2">
              <div className="font-bold text-[#111] flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600" /> Kenmerken:
              </div>
              <ul className="list-disc list-inside text-neutral-800 text-[11px] space-y-1">
                <li>Volledige 3D Voxel Wereld met Heuvels, Bergen & Grotten</li>
                <li>🚗 Bestuurbare Auto's (Sportwagen, Cabrio, Jeep)</li>
                <li>⛽ Tankstation met benzinepompen, winkel en asfaltwegen</li>
                <li>🏘️ Gezellig Dorpje & 🏰 Luxe Villa met Zwembad</li>
                <li>🧟 Nachtmonsters (Zombies & Creepers), schapen en dorpelingen</li>
                <li>📱 Geoptimaliseerd voor iPad aanraakscherm & multitouch</li>
              </ul>
            </div>

            {/* iPad vs Desktop Controls Helper */}
            <div className="bg-[#a3a3a3] p-2.5 rounded border border-[#777] text-[11px] font-mono text-[#222] text-left">
              {isTouchDevice ? (
                <div>
                  <div className="font-bold mb-1 flex items-center gap-1.5 text-emerald-950">
                    <Tablet size={14} /> iPad Aanraakbesturing:
                  </div>
                  <div className="space-y-0.5 text-[10px] text-neutral-900">
                    <div>• <span className="font-bold">Linker duim:</span> Virtuele joystick om te lopen</div>
                    <div>• <span className="font-bold">Rechter duim:</span> Veeg over het scherm om rond te kijken</div>
                    <div>• <span className="font-bold">Rode knop:</span> Hakken / breken</div>
                    <div>• <span className="font-bold">Groene knop:</span> Blokken plaatsen</div>
                    <div>• <span className="font-bold">Gele knop:</span> Springen</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-bold mb-1">Desktop Besturing:</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div><span className="bg-[#333] text-white px-1 py-0.5 rounded">WASD</span> Lopen</div>
                    <div><span className="bg-[#333] text-white px-1 py-0.5 rounded">Muis</span> Rondkijken</div>
                    <div><span className="bg-[#333] text-white px-1 py-0.5 rounded">Links</span> Hakken</div>
                    <div><span className="bg-[#333] text-white px-1 py-0.5 rounded">Rechts</span> Plaatsen</div>
                    <div><span className="bg-[#333] text-white px-1 py-0.5 rounded">E</span> Inventaris</div>
                    <div><span className="bg-[#333] text-white px-1 py-0.5 rounded">Spatie</span> Springen</div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleStartGame}
              className="mc-button py-3 text-sm md:text-base font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-transform"
            >
              <Play size={18} />
              <span>Start het Spel!</span>
            </button>
          </div>
        </div>
      )}

      {/* iPad / Touch Controls Overlay */}
      {hasStarted && isTouchDevice && activeModal === 'none' && (
        <MobileControls
          onMove={(forward, strafe) => {
            if (gameRef.current) {
              gameRef.current.touchInput.forward = forward;
              gameRef.current.touchInput.strafe = strafe;
            }
          }}
          onRotate={(dx, dy) => {
            gameRef.current?.rotateCamera(dx, dy, 0.004);
          }}
          onJumpStart={() => {
            if (gameRef.current) {
              gameRef.current.touchInput.jump = true;
            }
          }}
          onJumpEnd={() => {
            if (gameRef.current) {
              gameRef.current.touchInput.jump = false;
            }
          }}
          onSneakToggle={() => {
            if (gameRef.current) {
              const next = !gameRef.current.touchInput.sneak;
              gameRef.current.touchInput.sneak = next;
              setIsSneaking(next);
            }
          }}
          isSneaking={isSneaking}
          isFlying={isFlying}
          onFlyUpStart={() => {
            if (gameRef.current) gameRef.current.touchInput.jump = true;
          }}
          onFlyUpEnd={() => {
            if (gameRef.current) gameRef.current.touchInput.jump = false;
          }}
          onFlyDownStart={() => {
            if (gameRef.current) gameRef.current.touchInput.sneak = true;
          }}
          onFlyDownEnd={() => {
            if (gameRef.current) gameRef.current.touchInput.sneak = false;
          }}
          onBreakStart={() => {
            gameRef.current?.startTouchMining();
          }}
          onBreakEnd={() => {
            gameRef.current?.stopTouchMining();
          }}
          onPlace={() => {
            gameRef.current?.handleRightClick();
          }}
        />
      )}

      {/* In-Game HUD Layer (On top of mobile controls) */}
      {hasStarted && (
        <HUD
          hotbar={hotbar}
          selectedSlot={selectedSlot}
          onSelectSlot={handleSelectSlot}
          gameMode={gameMode}
          onToggleGameMode={handleToggleGameMode}
          health={health}
          hunger={hunger}
          isFlying={isFlying}
          onToggleFly={handleToggleFly}
          onOpenInventory={() => gameRef.current?.toggleModal('inventory')}
          onOpenMenu={() => gameRef.current?.toggleModal('pause')}
          debugInfo={debugInfo}
          onToggleTime={handleToggleTime}
          isLocked={isLocked}
          onRequestLock={() => gameRef.current?.requestLock()}
          isTouchMode={isTouchDevice}
          onToggleTouchMode={handleToggleTouchMode}
          tntCountdown={tntCountdown}
          vehicleInfo={vehicleInfo}
          onToggleVehicle={handleToggleVehicle}
          onHonkVehicle={handleHonkVehicle}
          onRefuelVehicle={handleRefuelVehicle}
          game={gameRef.current}
          playerPos={debugInfo ? { x: debugInfo.x, y: debugInfo.y, z: debugInfo.z } : undefined}
          playerYaw={gameRef.current?.physics.yaw || 0}
          animalToast={animalToast}
        />
      )}

      {/* Inventory & 2x2 Crafting Modal */}
      {activeModal === 'inventory' && (
        <InventoryModal
          hotbar={hotbar}
          inventory={gameRef.current ? gameRef.current.inventory : []}
          selectedHotbarIndex={selectedSlot}
          onUpdateHotbar={(newHotbar) => {
            if (gameRef.current) {
              gameRef.current.hotbar = newHotbar;
              setHotbar([...newHotbar]);
              const item = newHotbar[selectedSlot];
              gameRef.current.renderer.updateHeldItem(item ? item.id : null);
            }
          }}
          onUpdateInventory={(newInv) => {
            if (gameRef.current) {
              gameRef.current.inventory = newInv;
            }
          }}
          onClose={() => gameRef.current?.toggleModal('none')}
        />
      )}

      {/* Crafting Table 3x3 Modal */}
      {activeModal === 'crafting' && (
        <CraftingTableModal
          hotbar={hotbar}
          selectedHotbarIndex={selectedSlot}
          onUpdateHotbar={(newHotbar) => {
            if (gameRef.current) {
              gameRef.current.hotbar = newHotbar;
              setHotbar([...newHotbar]);
              const item = newHotbar[selectedSlot];
              gameRef.current.renderer.updateHeldItem(item ? item.id : null);
            }
          }}
          onClose={() => gameRef.current?.toggleModal('none')}
        />
      )}

      {/* Pause Menu Modal */}
      {activeModal === 'pause' && (
        <PauseMenu
          onResume={() => gameRef.current?.toggleModal('none')}
          onNewWorld={handleNewWorld}
          onSaveWorld={handleSaveWorld}
          onLoadWorld={handleLoadWorld}
          onOpenSettings={() => setActiveModal('settings')}
          onTeleport={handleTeleport}
        />
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <SettingsModal
          onClose={() => setActiveModal('pause')}
          fov={fov}
          onChangeFov={handleChangeFov}
          daySpeed={daySpeed}
          onChangeDaySpeed={handleChangeDaySpeed}
        />
      )}
    </div>
  );
}
