import React, { useRef, useEffect, useState } from 'react';
import { Compass, ZoomIn, ZoomOut, ChevronDown, ChevronUp } from 'lucide-react';
import { MinecraftGame } from '../minecraft/game';
import { BlockType } from '../minecraft/types';

interface MiniMapProps {
  game: MinecraftGame | null;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
}

const BLOCK_COLORS: Record<number, string> = {
  [BlockType.AIR]: '#000000',
  [BlockType.GRASS]: '#4caf50',
  [BlockType.DIRT]: '#795548',
  [BlockType.STONE]: '#78909c',
  [BlockType.COBBLESTONE]: '#607d8b',
  [BlockType.WOOD_LOG]: '#5d4037',
  [BlockType.WOOD_PLANKS]: '#8d6e63',
  [BlockType.LEAVES]: '#2e7d32',
  [BlockType.WATER]: '#1976d2',
  [BlockType.SAND]: '#fbc02d',
  [BlockType.GLASS]: '#b2ebf2',
  [BlockType.BRICK]: '#c62828',
  [BlockType.BOOKSHELF]: '#a1887f',
  [BlockType.CRAFTING_TABLE]: '#bcaaa4',
  [BlockType.FURNACE]: '#455a64',
  [BlockType.CHEST]: '#ffb300',
  [BlockType.TNT]: '#e53935',
  [BlockType.COAL_ORE]: '#37474f',
  [BlockType.IRON_ORE]: '#d7ccc8',
  [BlockType.GOLD_ORE]: '#ffd54f',
  [BlockType.DIAMOND_ORE]: '#4dd0e1',
  [BlockType.GLOWSTONE]: '#fff59d',
  [BlockType.BEDROCK]: '#212121',
  [BlockType.SNOW]: '#ffffff',
  [BlockType.ICE]: '#90caf9',
  [BlockType.POPPY]: '#e91e63',
  [BlockType.DANDELION]: '#ffeb3b',
  [BlockType.TORCH]: '#ffca28',
};

export const MiniMap: React.FC<MiniMapProps> = ({ game, playerPos, playerYaw }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0); // 0.6x, 1.0x, 1.5x
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Compass cardinal heading (N, NE, E, SE, S, SW, W, NW)
  const getHeading = (yaw: number): string => {
    // Normalize yaw to [0, 2PI)
    let angle = (yaw % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const deg = (angle * 180) / Math.PI;
    if (deg >= 337.5 || deg < 22.5) return 'Z'; // South in Minecraft coordinate system (positive Z)
    if (deg >= 22.5 && deg < 67.5) return 'ZW';
    if (deg >= 67.5 && deg < 112.5) return 'W'; // West (negative X)
    if (deg >= 112.5 && deg < 157.5) return 'NW';
    if (deg >= 157.5 && deg < 202.5) return 'N'; // North (negative Z)
    if (deg >= 202.5 && deg < 247.5) return 'NO';
    if (deg >= 247.5 && deg < 292.5) return 'O'; // East (positive X)
    return 'ZO';
  };

  useEffect(() => {
    if (!canvasRef.current || !game || isCollapsed) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;
    const radius = center - 4;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Save clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    // Default fill
    ctx.fillStyle = '#1c2833';
    ctx.fillRect(0, 0, width, height);

    const world = game.world;
    const range = Math.round(22 / zoom);
    const step = (range * 2) / width;

    // 1. Draw Terrain Pixels
    for (let px = 0; px < width; px += 2) {
      for (let pz = 0; pz < height; pz += 2) {
        // Distance check from center
        const dxCenter = px - center;
        const dzCenter = pz - center;
        if (dxCenter * dxCenter + dzCenter * dzCenter > radius * radius) continue;

        const wx = Math.floor(playerPos.x + (px - center) * step);
        const wz = Math.floor(playerPos.z + (pz - center) * step);

        // Scan downwards from surface
        let topBlock = BlockType.AIR;
        let topY = Math.floor(playerPos.y);

        for (let y = 38; y >= 1; y--) {
          const b = world.getBlock(wx, y, wz);
          if (b !== BlockType.AIR) {
            topBlock = b;
            topY = y;
            break;
          }
        }

        const colorHex = BLOCK_COLORS[topBlock] || '#546e7a';
        ctx.fillStyle = colorHex;

        // Elevation shade: higher is slightly brighter, lower is darker
        ctx.fillRect(px, pz, 2, 2);

        if (topY > playerPos.y + 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.fillRect(px, pz, 2, 2);
        } else if (topY < playerPos.y - 2) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.fillRect(px, pz, 2, 2);
        }
      }
    }

    // 2. Draw Landmark POIs if within range
    const pois = [
      { name: '⛽ Tankstation', x: 5, z: -8, color: '#e53935' },
      { name: '🏘️ Dorp', x: 16, z: 16, color: '#43a047' },
      { name: '🏰 Villa', x: -22, z: -18, color: '#f57c00' },
    ];

    for (const poi of pois) {
      const poiPx = center + (poi.x - playerPos.x) / step;
      const poiPz = center + (poi.z - playerPos.z) / step;
      const d = Math.hypot(poiPx - center, poiPz - center);

      if (d < radius - 6) {
        ctx.fillStyle = poi.color;
        ctx.beginPath();
        ctx.arc(poiPx, poiPz, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 3;
        ctx.fillText(poi.name.split(' ')[0], poiPx - 6, poiPz - 5);
        ctx.shadowBlur = 0;
      }
    }

    // 3. Draw Cars on Mini-Map
    if (game.vehicleManager && game.vehicleManager.vehicles) {
      for (const car of game.vehicleManager.vehicles) {
        const carPx = center + (car.position.x - playerPos.x) / step;
        const carPz = center + (car.position.z - playerPos.z) / step;
        const distToCenter = Math.hypot(carPx - center, carPz - center);

        if (distToCenter < radius - 4) {
          ctx.fillStyle = car.color === 'yellow' ? '#fdd835' : car.color === 'blue' ? '#1e88e5' : car.color === 'green' ? '#43a047' : '#e53935';
          ctx.beginPath();
          ctx.arc(carPx, carPz, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // 4. Draw Animals & Mobs on Mini-Map
    if (game.mobManager && game.mobManager.mobs) {
      for (const mob of game.mobManager.mobs) {
        const mobPx = center + (mob.position.x - playerPos.x) / step;
        const mobPz = center + (mob.position.z - playerPos.z) / step;
        const d = Math.hypot(mobPx - center, mobPz - center);

        if (d < radius - 4) {
          if (mob.isFollowingPlayer) {
            // Tamable Follower Animal: Pulsing Emerald Green with Heart!
            ctx.fillStyle = '#00e676';
            ctx.beginPath();
            ctx.arc(mobPx, mobPz, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (mob.isHostile) {
            // Hostile monster: Red dot
            ctx.fillStyle = '#ff1744';
            ctx.beginPath();
            ctx.arc(mobPx, mobPz, 2.8, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Peaceful wild animal: White dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(mobPx, mobPz, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 5. Draw Player Marker at Center
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-playerYaw + Math.PI); // Arrow direction matches player view

    // Player Direction Arrow
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = '#00e5ff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();

    ctx.restore(); // Restore circular clip

    // 6. Draw Compass Outer Rim & Cardinal Points (N, E, S, W)
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Cardinal Points
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff5252';
    ctx.fillText('N', center, 9); // North

    ctx.fillStyle = '#ffffff';
    ctx.fillText('Z', center, height - 9); // South
    ctx.fillText('W', 9, center); // West
    ctx.fillText('O', width - 9, center); // East
  }, [game, playerPos, playerYaw, zoom, isCollapsed]);

  const toggleZoom = () => {
    if (zoom === 1.0) setZoom(1.6);
    else if (zoom === 1.6) setZoom(0.65);
    else setZoom(1.0);
  };

  return (
    <div className="flex flex-col items-end pointer-events-auto select-none">
      <div className="bg-[#1b1b1b]/90 backdrop-blur-md rounded-xl border-2 border-[#555] shadow-2xl p-1.5 flex flex-col items-center gap-1 text-white">
        {/* Top Header: Coordinates & Heading */}
        <div className="flex items-center justify-between w-full px-1 text-[10px] font-mono text-neutral-300 gap-2">
          <span className="font-bold text-amber-300">
            X:{Math.round(playerPos.x)} Y:{Math.round(playerPos.y)} Z:{Math.round(playerPos.z)}
          </span>
          <div className="flex items-center gap-1">
            <span className="px-1 py-0.2 bg-white/10 rounded text-[9px] font-bold text-cyan-300">
              {getHeading(playerYaw)}
            </span>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hover:text-amber-400 p-0.5 rounded cursor-pointer"
              title={isCollapsed ? 'Mini-map uitklappen' : 'Mini-map inklappen'}
            >
              {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
          </div>
        </div>

        {/* Circular Radar Canvas */}
        {!isCollapsed && (
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={124}
              height={124}
              className="rounded-full shadow-inner border border-white/20 bg-neutral-900"
            />

            {/* Quick Zoom Toggle Overlay Button */}
            <button
              onClick={toggleZoom}
              className="absolute bottom-1 right-1 p-1 bg-black/70 hover:bg-black/90 text-white/80 hover:text-white rounded-full border border-white/30 text-[9px] font-mono flex items-center justify-center cursor-pointer shadow"
              title="Zoom wisselen"
            >
              {zoom}x
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
