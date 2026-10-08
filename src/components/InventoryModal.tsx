import React, { useState } from 'react';
import { BlockType, ItemStack } from '../minecraft/types';
import { CREATIVE_BLOCKS, BLOCK_DEFS } from '../minecraft/blocks';
import { iconDataUrls } from '../minecraft/textures';
import { matchRecipe } from '../minecraft/crafting';
import { sound } from '../minecraft/sound';
import { X, Search, Sparkles, Hammer } from 'lucide-react';

interface InventoryModalProps {
  hotbar: (ItemStack | null)[];
  inventory: (ItemStack | null)[];
  selectedHotbarIndex: number;
  onUpdateHotbar: (slots: (ItemStack | null)[]) => void;
  onUpdateInventory: (slots: (ItemStack | null)[]) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  hotbar,
  inventory,
  selectedHotbarIndex,
  onUpdateHotbar,
  onUpdateInventory,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'creative' | 'crafting'>('creative');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // 2x2 Survival Crafting Matrix
  const [craftGrid, setCraftGrid] = useState<(BlockType | null)[][]>([
    [null, null],
    [null, null],
  ]);

  // Crafting result preview
  const craftResult = matchRecipe(craftGrid);

  // Creative blocks filtered
  const filteredBlocks = CREATIVE_BLOCKS.filter((id) => {
    const def = BLOCK_DEFS[id];
    if (!def) return false;
    const matchesSearch =
      def.nameNl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.nameEn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || def.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Pick item in creative mode: puts 64 in currently selected hotbar slot
  const handlePickCreativeItem = (blockId: BlockType) => {
    sound.playPickup();
    const newHotbar = [...hotbar];
    newHotbar[selectedHotbarIndex] = { id: blockId, count: 64 };
    onUpdateHotbar(newHotbar);
  };

  // Click crafting result slot to take crafted items
  const handleTakeCraftResult = () => {
    if (!craftResult) return;
    sound.playPickup();

    // Add to hotbar or inventory
    let added = false;
    const newHotbar = [...hotbar];
    for (let i = 0; i < 9; i++) {
      if (!newHotbar[i] || (newHotbar[i]?.id === craftResult.id && newHotbar[i]!.count < 64)) {
        if (!newHotbar[i]) {
          newHotbar[i] = { ...craftResult };
        } else {
          newHotbar[i]!.count = Math.min(64, newHotbar[i]!.count + craftResult.count);
        }
        onUpdateHotbar(newHotbar);
        added = true;
        break;
      }
    }

    if (!added) {
      const newInv = [...inventory];
      for (let i = 0; i < 27; i++) {
        if (!newInv[i]) {
          newInv[i] = { ...craftResult };
          onUpdateInventory(newInv);
          break;
        }
      }
    }

    // Consume 1 item from each used slot in 2x2 grid
    const newGrid = craftGrid.map((row) =>
      row.map((slot) => (slot !== null ? null : null))
    );
    setCraftGrid(newGrid);
  };

  // Put item into 2x2 grid slot
  const handleSetCraftSlot = (r: number, c: number, item: BlockType | null) => {
    sound.playBlockPlace('wood');
    const newGrid = craftGrid.map((row, ri) =>
      row.map((col, ci) => (ri === r && ci === c ? item : col))
    );
    setCraftGrid(newGrid);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="mc-panel w-full max-w-xl p-4 rounded text-[#222] flex flex-col gap-3 relative shadow-2xl animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-[#888] pb-2">
          <div className="flex items-center gap-2">
            <span className="mc-font text-base md:text-lg font-bold text-[#111]">
              {activeTab === 'creative' ? 'Creatieve Blokken' : 'Vervaardigen (2x2)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex items-center gap-1 bg-[#888] p-1 rounded">
              <button
                onClick={() => setActiveTab('creative')}
                className={`px-3 py-1 text-xs mc-font rounded ${
                  activeTab === 'creative' ? 'bg-[#c6c6c6] text-[#000] font-bold' : 'text-white hover:text-yellow-200'
                }`}
              >
                <span className="flex items-center gap-1"><Sparkles size={12} /> Creatief</span>
              </button>
              <button
                onClick={() => setActiveTab('crafting')}
                className={`px-3 py-1 text-xs mc-font rounded ${
                  activeTab === 'crafting' ? 'bg-[#c6c6c6] text-[#000] font-bold' : 'text-white hover:text-yellow-200'
                }`}
              >
                <span className="flex items-center gap-1"><Hammer size={12} /> Vervaardigen</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="mc-button w-7 h-7 flex items-center justify-center rounded text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* CREATIVE TAB */}
        {activeTab === 'creative' && (
          <div className="flex flex-col gap-3">
            {/* Search and Category Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[140px]">
                <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Zoek blok..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#efefef] border-2 border-[#555] rounded pl-8 pr-2 py-1 text-xs font-mono text-black outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center gap-1 text-[11px] mc-font">
                {['all', 'building', 'natural', 'functional', 'ores'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2 py-1 rounded text-xs ${
                      categoryFilter === cat
                        ? 'bg-[#373737] text-white font-bold'
                        : 'bg-[#a0a0a0] text-[#111] hover:bg-[#b0b0b0]'
                    }`}
                  >
                    {cat === 'all'
                      ? 'Alles'
                      : cat === 'building'
                      ? 'Bouw'
                      : cat === 'natural'
                      ? 'Natuur'
                      : cat === 'functional'
                      ? 'Functie'
                      : 'Ertsen'}
                  </button>
                ))}
              </div>
            </div>

            {/* Creative Blocks Grid */}
            <div className="bg-[#8b8b8b] border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] p-2 h-56 overflow-y-auto grid grid-cols-6 sm:grid-cols-9 gap-1.5 rounded">
              {filteredBlocks.map((blockId) => {
                const def = BLOCK_DEFS[blockId];
                const iconUrl = iconDataUrls.get(blockId);
                return (
                  <button
                    key={blockId}
                    onClick={() => handlePickCreativeItem(blockId)}
                    className="w-10 h-10 mc-slot flex items-center justify-center hover:scale-105 transition-transform"
                    title={`${def.nameNl} (Klik om te kiezen)`}
                  >
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={def.nameNl}
                        className="w-7 h-7 object-contain pixelated pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[9px] font-mono text-white">{def.nameNl.slice(0, 2)}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-[#444] mc-font">
              Klik op een blok om een stapel van 64 in je geselecteerde balk (slot {selectedHotbarIndex + 1}) te plaatsen.
            </div>
          </div>
        )}

        {/* CRAFTING TAB */}
        {activeTab === 'crafting' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-6 py-2 bg-[#a3a3a3] rounded border border-[#666]">
              {/* 2x2 Crafting Matrix */}
              <div className="grid grid-cols-2 gap-1.5">
                {[0, 1].map((r) =>
                  [0, 1].map((c) => {
                    const blockId = craftGrid[r][c];
                    const iconUrl = blockId ? iconDataUrls.get(blockId) : null;
                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => {
                          // Toggle item in slot using currently active hotbar item
                          const active = hotbar[selectedHotbarIndex];
                          if (blockId) {
                            handleSetCraftSlot(r, c, null);
                          } else if (active) {
                            handleSetCraftSlot(r, c, active.id);
                          }
                        }}
                        className="w-12 h-12 mc-slot flex items-center justify-center cursor-pointer"
                        title={blockId ? `${BLOCK_DEFS[blockId]?.nameNl} (Klik om te verwijderen)` : 'Klik met item om te plaatsen'}
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

              {/* Crafting Result Slot */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={handleTakeCraftResult}
                  disabled={!craftResult}
                  className={`w-14 h-14 mc-slot flex items-center justify-center relative ${
                    craftResult ? 'ring-2 ring-amber-400 cursor-pointer animate-pulse' : 'opacity-60'
                  }`}
                  title={craftResult ? `${BLOCK_DEFS[craftResult.id]?.nameNl} (Klik om te pakken)` : 'Geen resultaat'}
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
                <span className="text-[10px] mc-font text-[#333]">Resultaat</span>
              </div>
            </div>

            {/* Quick Crafting Recipes Guide */}
            <div className="text-[11px] bg-[#d9d9d9] p-2 rounded border border-[#888] space-y-1">
              <div className="font-bold text-[#222]">Recepten:</div>
              <div className="text-neutral-700">
                • 1 Houtstam ➔ 4 Houtplanken<br />
                • 4 Houtplanken (2x2) ➔ 1 Werkbank (Crafting Table)<br />
                • 1 Steenkool + 1 Planken ➔ 4 Fakkels<br />
                • 4 Zand + 1 Steenkool ➔ 1 TNT
              </div>
            </div>
          </div>
        )}

        {/* Player Hotbar View at bottom */}
        <div className="border-t-2 border-[#888] pt-2 flex flex-col gap-1">
          <div className="text-[11px] mc-font text-[#333]">Snelle Toegangsbalk (Hotbar):</div>
          <div className="flex items-center justify-between gap-1">
            {hotbar.map((slot, idx) => {
              const iconUrl = slot ? iconDataUrls.get(slot.id) : null;
              return (
                <div
                  key={`inv-hotbar-${idx}`}
                  className={`w-10 h-10 md:w-11 md:h-11 mc-slot flex items-center justify-center relative ${
                    idx === selectedHotbarIndex ? 'mc-slot-active' : ''
                  }`}
                >
                  {slot && iconUrl && (
                    <img
                      src={iconUrl}
                      alt="Hotbar item"
                      className="w-7 h-7 object-contain pixelated"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  {slot && slot.count > 1 && (
                    <span className="absolute bottom-0.5 right-1 mc-font text-[9px] text-white mc-text-shadow font-bold">
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
