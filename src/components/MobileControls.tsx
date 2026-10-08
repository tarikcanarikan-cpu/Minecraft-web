import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pickaxe,
  Box,
  ArrowUpCircle,
  Eye,
  Feather,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { sound } from '../minecraft/sound';

interface MobileControlsProps {
  onMove: (forward: number, strafe: number) => void;
  onRotate: (deltaX: number, deltaY: number) => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onSneakToggle: () => void;
  isSneaking: boolean;
  isFlying: boolean;
  onFlyUpStart: () => void;
  onFlyUpEnd: () => void;
  onFlyDownStart: () => void;
  onFlyDownEnd: () => void;
  onBreakStart: () => void;
  onBreakEnd: () => void;
  onPlace: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onRotate,
  onJumpStart,
  onJumpEnd,
  onSneakToggle,
  isSneaking,
  isFlying,
  onFlyUpStart,
  onFlyUpEnd,
  onFlyDownStart,
  onFlyDownEnd,
  onBreakStart,
  onBreakEnd,
  onPlace,
}) => {
  // Joystick State
  const joystickContainerRef = useRef<HTMLDivElement | null>(null);
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera Touch Drag State (Right side swipe to look)
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Unlock Web Audio on first touch for iPad
  useEffect(() => {
    const unlockAudio = () => {
      sound.initCtx();
    };
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    return () => window.removeEventListener('touchstart', unlockAudio);
  }, []);

  // Joystick touch handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    if (joystickContainerRef.current) {
      const rect = joystickContainerRef.current.getBoundingClientRect();
      joystickCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  };

  const handleJoystickTouchMove = useCallback((e: TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;
        const maxRadius = 45;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let clampedX = dx;
        let clampedY = dy;
        if (dist > maxRadius) {
          clampedX = (dx / dist) * maxRadius;
          clampedY = (dy / dist) * maxRadius;
        }

        setJoystickPos({ x: clampedX, y: clampedY });

        // Normalized move vector: up is forward (-dy), right is strafe (+dx)
        const forward = -clampedY / maxRadius;
        const strafe = clampedX / maxRadius;
        onMove(forward, strafe);
        break;
      }
    }
  }, [onMove]);

  const handleJoystickTouchEnd = useCallback((e: TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  }, [onMove]);

  // Touch Swipe to Look (Anywhere on screen outside joystick & buttons)
  const handleScreenTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== joystickTouchIdRef.current && lookTouchIdRef.current === null) {
        lookTouchIdRef.current = touch.identifier;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  const handleScreenTouchMove = useCallback((e: TouchEvent) => {
    if (lookTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const deltaX = touch.clientX - lastLookPosRef.current.x;
        const deltaY = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

        if (deltaX !== 0 || deltaY !== 0) {
          onRotate(deltaX, deltaY);
        }
        break;
      }
    }
  }, [onRotate]);

  const handleScreenTouchEnd = useCallback((e: TouchEvent) => {
    if (lookTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  }, []);

  // Global touch listeners for smooth tracking even if finger leaves container
  useEffect(() => {
    window.addEventListener('touchmove', handleJoystickTouchMove, { passive: false });
    window.addEventListener('touchend', handleJoystickTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleJoystickTouchEnd, { passive: false });

    window.addEventListener('touchmove', handleScreenTouchMove, { passive: false });
    window.addEventListener('touchend', handleScreenTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleScreenTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('touchmove', handleJoystickTouchMove);
      window.removeEventListener('touchend', handleJoystickTouchEnd);
      window.removeEventListener('touchcancel', handleJoystickTouchEnd);

      window.removeEventListener('touchmove', handleScreenTouchMove);
      window.removeEventListener('touchend', handleScreenTouchEnd);
      window.removeEventListener('touchcancel', handleScreenTouchEnd);
    };
  }, [
    handleJoystickTouchMove,
    handleJoystickTouchEnd,
    handleScreenTouchMove,
    handleScreenTouchEnd,
  ]);

  return (
    <div className="absolute inset-0 select-none z-10 pointer-events-none overflow-hidden">
      {/* Touch-to-Look Surface: only covers middle screen area, leaving header and hotbar free */}
      <div
        className="absolute inset-x-0 top-16 bottom-28 pointer-events-auto touch-none"
        onTouchStart={handleScreenTouchStart}
      />

      {/* Bottom Controls Bar (above hotbar) */}
      <div className="absolute inset-x-0 bottom-18 md:bottom-20 px-4 md:px-8 flex items-end justify-between z-20 pointer-events-none">
        {/* Left Side: Virtual Analog Joystick */}
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <div
            ref={joystickContainerRef}
            onTouchStart={handleJoystickTouchStart}
            className="relative w-32 h-32 md:w-36 md:h-36 rounded-full bg-black/45 backdrop-blur-md border-2 border-white/30 flex items-center justify-center touch-none shadow-2xl active:border-white/60"
          >
            {/* Direction hints */}
            <div className="absolute top-2 text-[10px] text-white/40 font-bold">▲</div>
            <div className="absolute bottom-2 text-[10px] text-white/40 font-bold">▼</div>
            <div className="absolute left-2 text-[10px] text-white/40 font-bold">◀</div>
            <div className="absolute right-2 text-[10px] text-white/40 font-bold">▶</div>

            {/* Inner thumbstick knob */}
            <div
              className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-b from-white/80 to-white/40 shadow-[0_0_15px_rgba(255,255,255,0.4)] border border-white flex items-center justify-center"
              style={{
                transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                transition: joystickTouchIdRef.current === null ? 'transform 0.15s ease-out' : 'none',
              }}
            >
              <div className="w-5 h-5 rounded-full bg-black/30" />
            </div>
          </div>

          <div className="text-[10px] mc-font text-white/70 bg-black/50 px-2 py-0.5 rounded shadow">
            Lopen / Bewegen
          </div>
        </div>

        {/* Center Hint for iPad (Fades out) */}
        <div className="hidden lg:flex flex-col items-center pb-2 text-[11px] text-white/60 mc-font bg-black/40 px-3 py-1 rounded-full border border-white/10 pointer-events-none">
          Swipe op het scherm om rond te kijken
        </div>

        {/* Right Side: Action Cluster */}
        <div className="pointer-events-auto flex flex-col items-end gap-2.5">
          {/* Top action row: Break & Place */}
          <div className="flex items-center gap-2.5">
            {/* Break / Mine button (hold or tap) */}
            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                onBreakStart();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                onBreakEnd();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onBreakStart();
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                onBreakEnd();
              }}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-red-600/85 active:bg-red-500 border-2 border-red-300 text-white flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer"
            >
              <Pickaxe size={22} className="md:w-6 md:h-6" />
              <span className="text-[9px] mc-font font-bold mt-0.5">Hakken</span>
            </button>

            {/* Place Block button */}
            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                onPlace();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onPlace();
              }}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-600/85 active:bg-emerald-500 border-2 border-emerald-300 text-white flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer"
            >
              <Box size={22} className="md:w-6 md:h-6" />
              <span className="text-[9px] mc-font font-bold mt-0.5">Plaatsen</span>
            </button>
          </div>

          {/* Bottom action row: Sneak, Fly Up/Down, Jump */}
          <div className="flex items-center gap-2">
            {/* Sneak toggle */}
            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                onSneakToggle();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSneakToggle();
              }}
              className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex flex-col items-center justify-center border shadow-lg transition-colors cursor-pointer ${
                isSneaking
                  ? 'bg-amber-600 text-white border-amber-300'
                  : 'bg-black/55 text-white/80 border-white/20 active:bg-white/20'
              }`}
            >
              <Eye size={18} />
              <span className="text-[8px] mc-font">Buk</span>
            </button>

            {/* If flying: show Fly Up & Fly Down */}
            {isFlying ? (
              <div className="flex gap-1.5">
                <button
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onFlyDownStart();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    onFlyDownEnd();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onFlyDownStart();
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    onFlyDownEnd();
                  }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-blue-600/80 active:bg-blue-500 border border-blue-300 text-white flex flex-col items-center justify-center shadow-lg cursor-pointer"
                >
                  <ChevronDown size={22} />
                  <span className="text-[8px] mc-font">Omlaag</span>
                </button>
                <button
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onFlyUpStart();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    onFlyUpEnd();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onFlyUpStart();
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    onFlyUpEnd();
                  }}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-amber-500 active:bg-amber-400 border-2 border-yellow-200 text-white flex flex-col items-center justify-center shadow-2xl cursor-pointer"
                >
                  <ChevronUp size={24} />
                  <span className="text-[9px] mc-font font-bold">Omhoog</span>
                </button>
              </div>
            ) : (
              /* Big Jump button */
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onJumpStart();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  onJumpEnd();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onJumpStart();
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  onJumpEnd();
                }}
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-amber-600/90 active:bg-amber-500 border-2 border-amber-300 text-white flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowUpCircle size={26} className="md:w-7 md:h-7" />
                <span className="text-[10px] md:text-xs mc-font font-bold mt-0.5">Springen</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
