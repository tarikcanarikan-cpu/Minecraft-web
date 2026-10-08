import React, { useState } from 'react';
import { BlockType, ItemStack } from '../minecraft/types';
import { BLOCK_DEFS } from '../minecraft/blocks';
import { iconDataUrls } from '../minecraft/textures';
import { matchRecipe } from '../minecraft/crafting';
import { sound } from '../minecraft/sound';
import { X } from 'lucide-react';

interface CraftingTableModalProps {
  hotbar: (ItemStack | null)[];
  selectedHotbarIndex: number;
  onUpdateHotbar: (slots: (ItemStack | null)[]) => void;
  onClose: () => void;
}

export const CraftingTableModal: React.FC<CraftingTableModalProps> = ({
  hotbar,
  selectedHotbarIndex,
  onUpdateHotbar,
  onClose,
}) => {
  // 3x3 Crafting Matrix
  const [grid, setGrid] = useState<(BlockType | null)[][]>([
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]);

  const craftResult = matchRecipe(grid);

  const handleCellClick = (r: number, c: number) => {
    sound.playBlockPlace('wood');
    const current = grid[r][c];
    const active = hotbar[selectedHotbarIndex];

    const newGrid = grid.map((row, ri) =>
      row.map((val, ci) => {
        if (ri === r && ci === c) {
          return current ? null : (active ? active.id : null);
        }
        return val;
      })
    );
    setGrid(newGrid);
  };

  const handleTakeResult = () => {
    if (!craftResult) return;
    sound.playPickup();

    const newHotbar = [...hotbar];
    let placed = false;
    for (let i = 0; i < 9; i++) {
      if (!newHotbar[i]) {
        newHotbar[i] = { ...craftResult };
        placed = true;
        break;
      } else if (newHotbar[i]?.id === craftResult.id && newHotbar[i]!.count < 64) {
        newHotbar[i]!.count = Math.min(64, newHotbar[i]!.count + craftResult.count);
        placed = true;
        break;
      }
    }

    if (placed) {
      onUpdateHotbar(newHotbar);
      // Clear matrix
      setGrid([
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="mc-panel w-full max-w-md p-4 rounded text-[#222] flex flex-col gap-4 relative shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#888] pb-2">
          <span className="mc-font text-base md:text-lg font-bold text-[#111]">
            Werkbank (3x3 Crafting)
          </span>
          <button onClick={onClose} className="mc-button w-7 h-7 flex items-center justify-center rounded text-white">
            <X size={16} />
          </button>
        </div>

        {/* 3x3 Grid and Output */}
        <div className="flex items-center justify-center gap-6 py-3 bg-[#a3a3a3] rounded border border-[#666]">
          {/* 3x3 Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((r) =>
              [0, 1, 2].map((c) => {
                const blockId = grid[r][c];
                const iconUrl = blockId ? iconDataUrls.get(blockId) : null;
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    className="w-11 h-11 mc-slot flex items-center justify-center cursor-pointer"
                    title={blockId ? BLOCK_DEFS[blockId]?.nameNl : 'Klik om item te plaatsen'}
                  >
                    {iconUrl && (
                      <img
                        src={iconUrl}
                        alt="Craft item"
                        className="w-8 h-8 object-contain pixelated"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Arrow */}
          <div className="text-2xl font-bold text-[#333]">➜</div>

          {/* Result Slot */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleTakeResult}
              disabled={!craftResult}
              className={`w-14 h-14 mc-slot flex items-center justify-center relative ${
                craftResult ? 'ring-2 ring-amber-400 cursor-pointer animate-pulse' : 'opacity-60'
              }`}
              title={craftResult ? `${BLOCK_DEFS[craftResult.id]?.nameNl} (Pakken)` : 'Geen recept'}
            >
              {craftResult && iconDataUrls.get(craftResult.id) && (
                <>
                  <img
                    src={iconDataUrls.get(craftResult.id)}
                    alt="Result"
                    className="w-9 h-9 object-contain pixelated"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1 right-1.5 mc-font text-xs text-white mc-text-shadow font-bold">
                    {craftResult.count}
                  </span>
                </>
              )}
            </button>
            <span className="text-[10px] mc-font text-[#333]">Vervaardigd</span>
          </div>
        </div>

        {/* Helpful Tips */}
        <div className="text-[11px] bg-[#d9d9d9] p-2.5 rounded border border-[#888] text-[#333] space-y-1">
          <div className="font-bold">Recepten:</div>
          <div>• 8 Keisteen in een vierkant ➔ Oven (Furnace)</div>
          <div>• 8 Houtplanken in een vierkant ➔ Kist (Chest)</div>
          <div>• 6 Houtplanken (2 rijen) ➔ Boekenkast (Bookshelf)</div>
          <div>• 4 Zand + 1 Steenkool ➔ TNT</div>
        </div>

        {/* Active Hotbar */}
        <div className="border-t-2 border-[#888] pt-2">
          <div className="text-[11px] mc-font text-[#333] mb-1">Geselecteerd item in slot {selectedHotbarIndex + 1}:</div>
          <div className="flex items-center gap-1">
            {hotbar.map((slot, idx) => {
              const iconUrl = slot ? iconDataUrls.get(slot.id) : null;
              return (
                <div
                  key={`craft-hotbar-${idx}`}
                  className={`w-9 h-9 mc-slot flex items-center justify-center relative ${
                    idx === selectedHotbarIndex ? 'mc-slot-active' : ''
                  }`}
                >
                  {slot && iconUrl && (
                    <img src={iconUrl} alt="Item" className="w-6 h-6 object-contain pixelated" referrerPolicy="no-referrer" />
                  )}
                  {slot && slot.count > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 mc-font text-[9px] text-white mc-text-shadow font-bold">
                      {slot.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
