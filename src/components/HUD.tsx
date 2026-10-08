import React, { useState, useEffect } from 'react';
import { ItemStack, GameMode } from '../minecraft/types';
import { BLOCK_DEFS } from '../minecraft/blocks';
import { iconDataUrls } from '../minecraft/textures';
import { sound } from '../minecraft/sound';
import { MinecraftGame } from '../minecraft/game';
import { MiniMap } from './MiniMap';
import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Feather,
  Backpack,
  Compass,
  Menu,
  ShieldAlert,
  Gamepad2,
  Bomb,
} from 'lucide-react';

interface HUDProps {
  hotbar: (ItemStack | null)[];
  selectedSlot: number;
  onSelectSlot: (index: number) => void;
  gameMode: GameMode;
  onToggleGameMode: () => void;
  health: number;
  hunger: number;
  isFlying: boolean;
  onToggleFly: () => void;
  onOpenInventory: () => void;
  onOpenMenu: () => void;
  debugInfo: {
    x: number;
    y: number;
    z: number;
    fps: number;
    biome: string;
    targetBlock: string;
    dayTime: string;
  } | null;
  onToggleTime: () => void;
  isLocked: boolean;
  onRequestLock: () => void;
  isTouchMode?: boolean;
  onToggleTouchMode?: () => void;
  tntCountdown?: number | null;
  vehicleInfo?: {
    isDriving: boolean;
    speedKmh: number;
    fuel: number;
    canEnter: boolean;
    canRefuel: boolean;
  };
  onToggleVehicle?: () => void;
  onHonkVehicle?: () => void;
  onRefuelVehicle?: () => void;
  game?: MinecraftGame | null;
  playerPos?: { x: number; y: number; z: number };
  playerYaw?: number;
  animalToast?: string | null;
}

export const HUD: React.FC<HUDProps> = ({
  hotbar,
  selectedSlot,
  onSelectSlot,
  gameMode,
  onToggleGameMode,
  health,
  hunger,
  isFlying,
  onToggleFly,
  onOpenInventory,
  onOpenMenu,
  debugInfo,
  onToggleTime,
  isLocked,
  onRequestLock,
  isTouchMode,
  onToggleTouchMode,
  tntCountdown,
  vehicleInfo,
  onToggleVehicle,
  onHonkVehicle,
  onRefuelVehicle,
  game,
  playerPos,
  playerYaw,
  animalToast,
}) => {
  const [showF3, setShowF3] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [activeItemToast, setActiveItemToast] = useState<string | null>(null);

  // Show active item name banner whenever selected slot changes
  useEffect(() => {
    const item = hotbar[selectedSlot];
    if (item) {
      const def = BLOCK_DEFS[item.id];
      if (def) {
        setActiveItemToast(def.nameNl);
        const timer = setTimeout(() => setActiveItemToast(null), 1800);
        return () => clearTimeout(timer);
      }
    } else {
      setActiveItemToast(null);
    }
  }, [selectedSlot, hotbar]);

  // Listen for F3 key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setShowF3((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-30 flex flex-col justify-between p-3 md:p-4">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between w-full pointer-events-auto">
        {/* Brand / Game Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRequestLock}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded border border-white/20 text-white hover:bg-black/80 transition-colors"
          >
            <span className="text-sm font-bold text-amber-400">MINECRAFT</span>
            <span className="text-xs text-white/70">Web Edition</span>
          </button>

          {!isLocked && !isTouchMode && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded text-amber-300 text-xs animate-pulse">
              Klik om rond te kijken (Muis vergrendelen)
            </div>
          )}
        </div>

        {/* Quick Actions Control Strip */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Touch Mode Toggle Button */}
          {onToggleTouchMode && (
            <button
              onClick={onToggleTouchMode}
              title="Aanraakbesturing voor iPad/mobiel in- of uitschakelen"
              className={`mc-button px-2.5 py-1 text-xs flex items-center gap-1.5 rounded-sm ${
                isTouchMode ? 'bg-emerald-700 text-white font-bold' : ''
              }`}
            >
              <Gamepad2 size={14} className={isTouchMode ? 'text-emerald-300' : 'text-neutral-400'} />
              <span className="hidden sm:inline">
                {isTouchMode ? 'Touch (Aan)' : 'Touch'}
              </span>
            </button>
          )}
          {/* GameMode Toggle */}
          <button
            onClick={onToggleGameMode}
            title="Wissel spelmodus (Creatief / Overleven)"
            className="mc-button px-2.5 py-1 text-xs flex items-center gap-1.5 rounded-sm"
          >
            <ShieldAlert size={14} className={gameMode === 'survival' ? 'text-red-400' : 'text-emerald-400'} />
            <span className="hidden sm:inline">
              {gameMode === 'survival' ? 'Overleven' : 'Creatief'}
            </span>
          </button>

          {/* Fly Toggle */}
          <button
            onClick={onToggleFly}
            title="Vliegen aan/uit"
            className={`mc-button px-2 py-1 text-xs flex items-center gap-1 rounded-sm ${
              isFlying ? 'bg-amber-600 text-yellow-200' : ''
            }`}
          >
            <Feather size={14} />
            <span className="hidden md:inline">{isFlying ? 'Vliegen (Aan)' : 'Vliegen'}</span>
          </button>

          {/* Day / Night Toggle */}
          <button
            onClick={onToggleTime}
            title="Wissel dag/nacht"
            className="mc-button px-2 py-1 text-xs flex items-center gap-1 rounded-sm"
          >
            {debugInfo?.dayTime === 'Nacht' ? <Moon size={14} className="text-indigo-300" /> : <Sun size={14} className="text-yellow-400" />}
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleSound}
            title={isMuted ? 'Geluid aanzetten' : 'Geluid dempen'}
            className="mc-button px-2 py-1 text-xs rounded-sm"
          >
            {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
          </button>

          {/* F3 Toggle */}
          <button
            onClick={() => setShowF3(!showF3)}
            title="F3 Informatiescherm"
            className={`mc-button px-2 py-1 text-xs rounded-sm ${showF3 ? 'bg-emerald-700' : ''}`}
          >
            <Compass size={14} />
            <span className="hidden lg:inline">F3</span>
          </button>

          {/* Inventory Button */}
          <button
            onClick={onOpenInventory}
            title="Inventaris (E)"
            className="mc-button px-2 py-1 text-xs flex items-center gap-1 rounded-sm"
          >
            <Backpack size={14} />
            <span className="hidden sm:inline">Inventaris (E)</span>
          </button>

          {/* Menu Button */}
          <button
            onClick={onOpenMenu}
            title="Pauzemenu (Esc)"
            className="mc-button px-2 py-1 text-xs rounded-sm"
          >
            <Menu size={14} />
          </button>
        </div>
      </header>

      {/* F3 Debug Information Overlay */}
      {showF3 && debugInfo && (
        <div className="absolute top-14 left-4 bg-black/75 p-3 rounded border border-white/20 text-xs font-mono space-y-1 text-white/90 shadow-xl max-w-xs pointer-events-none">
          <div className="text-yellow-400 font-bold">Minecraft Web 1.20</div>
          <div>FPS: <span className="text-emerald-400 font-bold">{debugInfo.fps}</span></div>
          <div>XYZ: <span className="text-cyan-300">{debugInfo.x} / {debugInfo.y} / {debugInfo.z}</span></div>
          <div>Bioom: <span className="text-green-300">{debugInfo.biome}</span></div>
          <div>Licht: <span className="text-amber-300">{debugInfo.dayTime}</span></div>
          <div>Doelblok: <span className="text-pink-300">{debugInfo.targetBlock}</span></div>
          <div className="text-[10px] text-white/50 pt-1 border-t border-white/10">
            Druk op F3 om te sluiten
          </div>
        </div>
      )}

      {/* Persistent Mini-Map Overlay in Corner of HUD */}
      <div className="absolute top-14 right-3 md:right-4 pointer-events-auto z-20">
        <MiniMap
          game={game || null}
          playerPos={playerPos || { x: debugInfo?.x || 0, y: debugInfo?.y || 0, z: debugInfo?.z || 0 }}
          playerYaw={playerYaw || 0}
        />
      </div>

      {/* Animal Taming / Following Alert Toast */}
      {animalToast && (
        <div className="absolute top-16 inset-x-0 flex justify-center pointer-events-none z-30 animate-bounce">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-800/90 text-white rounded-xl border-2 border-emerald-300 shadow-2xl mc-font mc-text-shadow text-xs md:text-sm">
            <span>{animalToast}</span>
          </div>
        </div>
      )}

      {/* 10-Second TNT Countdown Alert Banner */}
      {tntCountdown !== null && tntCountdown !== undefined && tntCountdown > 0 && (
        <div className="absolute top-16 inset-x-0 flex justify-center pointer-events-none z-30">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-700/90 text-white rounded-lg border-2 border-yellow-300 shadow-2xl animate-pulse mc-font mc-text-shadow">
            <Bomb size={20} className="text-yellow-300 animate-spin" />
            <span className="text-xs md:text-sm font-bold tracking-wide">
              TNT EXPLODEERT OVER: {tntCountdown.toFixed(1)}s!
            </span>
          </div>
        </div>
      )}

      {/* Center Screen Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-4 h-4">
          <div className="absolute left-[7px] top-0 w-[2px] h-4 bg-white/90 shadow-[0_0_2px_#000]"></div>
          <div className="absolute left-0 top-[7px] w-4 h-[2px] bg-white/90 shadow-[0_0_2px_#000]"></div>
        </div>
      </div>

      {/* Bottom Interface Zone */}
      <div className="w-full flex flex-col items-center justify-end pointer-events-none pb-2 gap-2">
        {/* Floating Active Item Toast */}
        {activeItemToast && (
          <div className="mc-font text-white text-sm md:text-base mc-text-shadow px-3 py-1 bg-black/60 rounded border border-white/20 animate-fade-in">
            {activeItemToast}
          </div>
        )}

        {/* Vehicle Dashboard / Interaction Prompts */}
        {vehicleInfo && (
          <div className="pointer-events-auto flex flex-col items-center gap-1.5 animate-scale-up">
            {/* 1. When Driving: Speedometer, Fuel Gauge, Horn, Exit */}
            {vehicleInfo.isDriving ? (
              <div className="flex items-center gap-2 p-2 bg-black/80 backdrop-blur-md rounded-xl border border-white/25 shadow-2xl text-white">
                {/* Speedometer */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg">
                  <span className="text-base">🚗</span>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold font-mono leading-none">{vehicleInfo.speedKmh}</span>
                    <span className="text-[9px] text-white/70 uppercase">km/u</span>
                  </div>
                </div>

                {/* Fuel Gauge */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg">
                  <span className="text-base">⛽</span>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold font-mono">{vehicleInfo.fuel}%</span>
                      <span className="text-[9px] text-white/60">Benzine</span>
                    </div>
                    {/* Fuel Progress Bar */}
                    <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-0.5">
                      <div
                        className={`h-full transition-all duration-300 ${
                          vehicleInfo.fuel > 40
                            ? 'bg-emerald-500'
                            : vehicleInfo.fuel > 15
                            ? 'bg-amber-400'
                            : 'bg-red-500 animate-pulse'
                        }`}
                        style={{ width: `${vehicleInfo.fuel}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Toeter (Horn) Button */}
                {onHonkVehicle && (
                  <button
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      onHonkVehicle();
                    }}
                    onClick={onHonkVehicle}
                    className="mc-button py-1 px-2.5 text-xs rounded-lg flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                    title="Toeteren (H)"
                  >
                    <span>🔊 Toeter</span>
                  </button>
                )}

                {/* Refuel Button if near gas station */}
                {vehicleInfo.canRefuel && onRefuelVehicle && (
                  <button
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      onRefuelVehicle();
                    }}
                    onClick={onRefuelVehicle}
                    className="mc-button py-1 px-2.5 text-xs rounded-lg bg-emerald-600 active:bg-emerald-500 text-white flex items-center gap-1 animate-bounce cursor-pointer"
                    title="Tanken (R)"
                  >
                    <span>⛽ Tanken</span>
                  </button>
                )}

                {/* Uitstappen (Exit) Button */}
                {onToggleVehicle && (
                  <button
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      onToggleVehicle();
                    }}
                    onClick={onToggleVehicle}
                    className="mc-button py-1 px-2.5 text-xs rounded-lg bg-red-600/80 active:bg-red-500 text-white flex items-center gap-1 active:scale-95 cursor-pointer"
                    title="Uitstappen (F)"
                  >
                    <span>🚪 Uitstappen</span>
                  </button>
                )}
              </div>
            ) : (
              /* 2. When Near Car: Instappen prompt / button */
              <div className="flex items-center gap-2">
                {vehicleInfo.canEnter && onToggleVehicle && (
                  <button
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      onToggleVehicle();
                    }}
                    onClick={onToggleVehicle}
                    className="mc-button py-2 px-3 text-xs md:text-sm rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white flex items-center gap-2 shadow-2xl animate-bounce cursor-pointer"
                  >
                    <span className="text-base">🚗</span>
                    <span className="font-bold">Instappen in Auto [F]</span>
                  </button>
                )}

                {vehicleInfo.canRefuel && onRefuelVehicle && (
                  <button
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      onRefuelVehicle();
                    }}
                    onClick={onRefuelVehicle}
                    className="mc-button py-2 px-3 text-xs md:text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-2xl cursor-pointer"
                  >
                    <span className="text-base">⛽</span>
                    <span className="font-bold">Benzine Vullen [R]</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Survival Status Bars (Hearts & Hunger) */}
        {gameMode === 'survival' && (
          <div className="w-full max-w-md flex items-center justify-between px-2 mb-1">
            {/* Hearts (Health) */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => {
                const heartVal = (i + 1) * 2;
                const isFull = health >= heartVal;
                const isHalf = health === heartVal - 1;
                return (
                  <div
                    key={`heart-${i}`}
                    className={`w-3.5 h-3.5 flex items-center justify-center text-[10px] ${
                      isFull ? 'text-red-500' : isHalf ? 'text-red-300' : 'text-neutral-700'
                    }`}
                  >
                    ❤️
                  </div>
                );
              })}
            </div>

            {/* Hunger Drumsticks */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => {
                const drumVal = (i + 1) * 2;
                const isFull = hunger >= drumVal;
                return (
                  <div
                    key={`hunger-${i}`}
                    className={`w-3.5 h-3.5 flex items-center justify-center text-[10px] ${
                      isFull ? 'text-amber-600' : 'text-neutral-700'
                    }`}
                  >
                    🍗
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hotbar (9 Slots) */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 bg-[#1b1b1b]/90 border-2 border-[#555] rounded shadow-2xl">
          {hotbar.map((slot, index) => {
            const isSelected = index === selectedSlot;
            const iconUrl = slot ? iconDataUrls.get(slot.id) : null;
            const def = slot ? BLOCK_DEFS[slot.id] : null;

            return (
              <button
                key={`hotbar-slot-${index}`}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onSelectSlot(index);
                }}
                onClick={() => onSelectSlot(index)}
                className={`relative w-10 h-10 md:w-12 md:h-12 mc-slot flex items-center justify-center transition-transform cursor-pointer ${
                  isSelected ? 'mc-slot-active scale-105 z-10' : 'opacity-90 hover:opacity-100'
                }`}
                title={def ? `${def.nameNl} (${index + 1})` : `Slot ${index + 1}`}
              >
                {/* Hotkey Number in corner */}
                <span className="absolute top-0.5 left-1 text-[9px] text-white/50 font-mono">
                  {index + 1}
                </span>

                {/* Block Icon */}
                {slot && iconUrl && (
                  <img
                    src={iconUrl}
                    alt={def?.nameNl || 'Item'}
                    className="w-7 h-7 md:w-8 md:h-8 object-contain pixelated pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Stack Count Number */}
                {slot && slot.count > 1 && (
                  <span className="absolute bottom-0.5 right-1 mc-font text-[10px] md:text-xs text-white mc-text-shadow font-bold">
                    {slot.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
