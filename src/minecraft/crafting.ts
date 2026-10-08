import { BlockType, ItemStack } from './types';

export interface CraftingRecipe {
  pattern: (BlockType | null)[][]; // 2x2 or 3x3
  result: ItemStack;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // 1 Log -> 4 Planks (any single slot)
  {
    pattern: [[BlockType.WOOD_LOG]],
    result: { id: BlockType.WOOD_PLANKS, count: 4 },
  },
  // 4 Planks -> 1 Crafting Table
  {
    pattern: [
      [BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS],
      [BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS],
    ],
    result: { id: BlockType.CRAFTING_TABLE, count: 1 },
  },
  // 8 Cobblestone (ring) -> 1 Furnace
  {
    pattern: [
      [BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE],
      [BlockType.COBBLESTONE, null, BlockType.COBBLESTONE],
      [BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE],
    ],
    result: { id: BlockType.FURNACE, count: 1 },
  },
  // 8 Planks (ring) -> 1 Chest
  {
    pattern: [
      [BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS],
      [BlockType.WOOD_PLANKS, null, BlockType.WOOD_PLANKS],
      [BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS],
    ],
    result: { id: BlockType.CHEST, count: 1 },
  },
  // 1 Coal + 1 Wood Planks -> 4 Torches
  {
    pattern: [
      [BlockType.COAL_ORE],
      [BlockType.WOOD_PLANKS],
    ],
    result: { id: BlockType.TORCH, count: 4 },
  },
  // 4 Sand + 1 Coal -> 1 TNT
  {
    pattern: [
      [BlockType.SAND, BlockType.COAL_ORE, BlockType.SAND],
      [BlockType.COAL_ORE, BlockType.SAND, BlockType.COAL_ORE],
      [BlockType.SAND, BlockType.COAL_ORE, BlockType.SAND],
    ],
    result: { id: BlockType.TNT, count: 1 },
  },
  // 6 Planks -> 1 Bookshelf
  {
    pattern: [
      [BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS],
      [BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS, BlockType.WOOD_PLANKS],
    ],
    result: { id: BlockType.BOOKSHELF, count: 1 },
  },
];

// Helper to match grid against recipe pattern
export function matchRecipe(grid: (BlockType | null)[][]): ItemStack | null {
  // Trim grid to bounding box of non-null items
  let minR = 99, maxR = -1, minC = 99, maxC = -1;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== null) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  // Empty grid
  if (maxR === -1) return null;

  const height = maxR - minR + 1;
  const width = maxC - minC + 1;

  for (const recipe of CRAFTING_RECIPES) {
    const patH = recipe.pattern.length;
    const patW = recipe.pattern[0].length;
    if (patH === height && patW === width) {
      let match = true;
      for (let r = 0; r < patH; r++) {
        for (let c = 0; c < patW; c++) {
          const gridVal = grid[minR + r][minC + c];
          const patVal = recipe.pattern[r][c];
          if (gridVal !== patVal) {
            match = false;
            break;
          }
        }
        if (!match) break;
      }
      if (match) return recipe.result;
    }
  }

  return null;
}
