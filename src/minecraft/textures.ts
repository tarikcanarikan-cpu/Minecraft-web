import * as THREE from 'three';
import { BlockType } from './types';

// Helper to generate a 16x16 procedural pixel canvas
function create16x16Canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

// Pseudo random seeded helper for deterministic texture noise
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Draw noise pattern on canvas
function fillNoise(
  ctx: CanvasRenderingContext2D,
  baseColor: [number, number, number],
  variance: number,
  seed = 42
) {
  let s = seed;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = (pseudoRandom(s++) - 0.5) * variance;
      const r = Math.min(255, Math.max(0, Math.floor(baseColor[0] + v)));
      const g = Math.min(255, Math.max(0, Math.floor(baseColor[1] + v)));
      const b = Math.min(255, Math.max(0, Math.floor(baseColor[2] + v)));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// Cache of generated textures and icons
const textureCache = new Map<string, THREE.CanvasTexture>();
export const iconDataUrls = new Map<BlockType, string>();

export function generateBlockTextures() {
  const faceTextures: Record<BlockType, {
    top: THREE.CanvasTexture;
    bottom: THREE.CanvasTexture;
    side: THREE.CanvasTexture;
    front?: THREE.CanvasTexture;
  }> = {} as any;

  function makeTex(id: string, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    if (textureCache.has(id)) return textureCache.get(id)!;
    const [canvas, ctx] = create16x16Canvas();
    draw(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    textureCache.set(id, tex);
    return tex;
  }

  // --- DIRT ---
  const dirtTex = makeTex('dirt', (ctx) => {
    fillNoise(ctx, [134, 96, 67], 35, 101);
  });

  // --- GRASS TOP ---
  const grassTopTex = makeTex('grass_top', (ctx) => {
    fillNoise(ctx, [89, 155, 53], 30, 202);
  });

  // --- GRASS SIDE ---
  const grassSideTex = makeTex('grass_side', (ctx) => {
    // Dirt base
    fillNoise(ctx, [134, 96, 67], 35, 303);
    // Green hanging jagged grass top
    let s = 404;
    for (let x = 0; x < 16; x++) {
      const hang = 2 + Math.floor(pseudoRandom(s++) * 3);
      for (let y = 0; y < hang; y++) {
        const v = (pseudoRandom(s++) - 0.5) * 20;
        ctx.fillStyle = `rgb(${Math.floor(89 + v)},${Math.floor(155 + v)},${Math.floor(53 + v)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // --- STONE ---
  const stoneTex = makeTex('stone', (ctx) => {
    fillNoise(ctx, [125, 125, 125], 30, 505);
    // subtle darker cracks
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(3, 4, 3, 1);
    ctx.fillRect(5, 5, 2, 1);
    ctx.fillRect(10, 11, 4, 1);
  });

  // --- COBBLESTONE ---
  const cobbleTex = makeTex('cobble', (ctx) => {
    fillNoise(ctx, [110, 110, 110], 40, 606);
    // Stone outlines
    ctx.fillStyle = '#444444';
    ctx.strokeRect(1, 1, 6, 5);
    ctx.strokeRect(8, 2, 6, 4);
    ctx.strokeRect(3, 8, 7, 6);
    ctx.strokeRect(11, 8, 4, 7);
  });

  // --- OAK LOG TOP ---
  const logTopTex = makeTex('log_top', (ctx) => {
    fillNoise(ctx, [178, 142, 93], 25, 707);
    ctx.strokeStyle = '#6e4f2b';
    ctx.lineWidth = 1;
    ctx.strokeRect(2.5, 2.5, 11, 11);
    ctx.strokeRect(4.5, 4.5, 7, 7);
    ctx.fillStyle = '#5a3d1c';
    ctx.fillRect(7, 7, 2, 2);
  });

  // --- OAK LOG SIDE ---
  const logSideTex = makeTex('log_side', (ctx) => {
    fillNoise(ctx, [103, 76, 43], 25, 808);
    // Vertical bark strips
    for (let x = 0; x < 16; x += 3) {
      ctx.fillStyle = '#4f361a';
      ctx.fillRect(x, 0, 1, 16);
    }
  });

  // --- WOOD PLANKS ---
  const planksTex = makeTex('planks', (ctx) => {
    fillNoise(ctx, [168, 130, 83], 25, 909);
    ctx.fillStyle = '#5c4121';
    // 4 horizontal plank lines
    ctx.fillRect(0, 3, 16, 1);
    ctx.fillRect(0, 7, 16, 1);
    ctx.fillRect(0, 11, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    // vertical nail splits
    ctx.fillRect(4, 0, 1, 3);
    ctx.fillRect(11, 4, 1, 3);
    ctx.fillRect(6, 8, 1, 3);
    ctx.fillRect(13, 12, 1, 3);
  });

  // --- LEAVES ---
  const leavesTex = makeTex('leaves', (ctx) => {
    fillNoise(ctx, [55, 125, 35], 40, 1010);
    // Some transparent/darker pixel holes
    ctx.fillStyle = '#1e4812';
    for (let i = 0; i < 20; i++) {
      ctx.fillRect((i * 7) % 16, (i * 11) % 16, 1, 1);
    }
  });

  // --- BEDROCK ---
  const bedrockTex = makeTex('bedrock', (ctx) => {
    fillNoise(ctx, [60, 60, 60], 50, 1111);
    ctx.fillStyle = '#151515';
    ctx.fillRect(2, 2, 3, 3);
    ctx.fillRect(9, 7, 4, 4);
    ctx.fillRect(3, 12, 4, 2);
  });

  // --- SAND ---
  const sandTex = makeTex('sand', (ctx) => {
    fillNoise(ctx, [219, 206, 152], 25, 1212);
  });

  // --- GLASS ---
  const glassTex = makeTex('glass', (ctx) => {
    ctx.fillStyle = 'rgba(210, 240, 255, 0.2)';
    ctx.fillRect(0, 0, 16, 16);
    // Glass frame border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeRect(0.5, 0.5, 15, 15);
    // Diagonal glint
    ctx.fillRect(2, 2, 2, 1);
    ctx.fillRect(3, 3, 2, 1);
    ctx.fillRect(4, 4, 2, 1);
  });

  // --- BRICKS ---
  const bricksTex = makeTex('bricks', (ctx) => {
    ctx.fillStyle = '#a64f3b';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#dcd6cd';
    ctx.fillRect(0, 3, 16, 1);
    ctx.fillRect(0, 7, 16, 1);
    ctx.fillRect(0, 11, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(4, 0, 1, 3);
    ctx.fillRect(12, 0, 1, 3);
    ctx.fillRect(8, 4, 1, 3);
    ctx.fillRect(0, 4, 1, 3);
    ctx.fillRect(4, 8, 1, 3);
    ctx.fillRect(12, 8, 1, 3);
    ctx.fillRect(8, 12, 1, 3);
  });

  // --- TNT ---
  const tntSideTex = makeTex('tnt_side', (ctx) => {
    // Red body
    ctx.fillStyle = '#db3224';
    ctx.fillRect(0, 0, 16, 16);
    // White label band
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 6, 16, 5);
    // "TNT" black pixel text
    ctx.fillStyle = '#111111';
    // T
    ctx.fillRect(2, 7, 3, 1);
    ctx.fillRect(3, 8, 1, 2);
    // N
    ctx.fillRect(6, 7, 1, 3);
    ctx.fillRect(7, 8, 1, 1);
    ctx.fillRect(8, 7, 1, 3);
    // T
    ctx.fillRect(10, 7, 3, 1);
    ctx.fillRect(11, 8, 1, 2);
  });

  const tntTopTex = makeTex('tnt_top', (ctx) => {
    ctx.fillStyle = '#db3224';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(6, 6, 4, 4);
    ctx.fillStyle = '#111111';
    ctx.fillRect(7, 7, 2, 2);
  });

  // --- CRAFTING TABLE ---
  const craftTopTex = makeTex('craft_top', (ctx) => {
    fillNoise(ctx, [168, 130, 83], 20, 1313);
    ctx.strokeStyle = '#5a3d1c';
    ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, 13, 13);
    ctx.beginPath();
    ctx.moveTo(8, 2); ctx.lineTo(8, 14);
    ctx.moveTo(2, 8); ctx.lineTo(14, 8);
    ctx.stroke();
  });

  const craftSideTex = makeTex('craft_side', (ctx) => {
    fillNoise(ctx, [168, 130, 83], 20, 1414);
    // Saw / Hammer miniature tools icon
    ctx.fillStyle = '#3a2512';
    ctx.fillRect(3, 4, 10, 2);
    ctx.fillRect(7, 6, 2, 6);
  });

  // --- FURNACE ---
  const furnaceFrontTex = makeTex('furnace_front', (ctx) => {
    fillNoise(ctx, [110, 110, 110], 25, 1515);
    ctx.fillStyle = '#222222';
    ctx.fillRect(3, 5, 10, 8);
    // Ash & opening
    ctx.fillStyle = '#111111';
    ctx.fillRect(4, 9, 8, 4);
  });

  // --- CHEST ---
  const chestTopTex = makeTex('chest_top', (ctx) => {
    fillNoise(ctx, [150, 105, 55], 20, 1616);
    ctx.fillStyle = '#3a220b';
    ctx.strokeRect(1.5, 1.5, 13, 13);
  });
  const chestSideTex = makeTex('chest_side', (ctx) => {
    fillNoise(ctx, [150, 105, 55], 20, 1717);
    ctx.fillStyle = '#3a220b';
    ctx.fillRect(0, 5, 16, 1);
  });
  const chestFrontTex = makeTex('chest_front', (ctx) => {
    fillNoise(ctx, [150, 105, 55], 20, 1818);
    ctx.fillStyle = '#3a220b';
    ctx.fillRect(0, 5, 16, 1);
    // Latch
    ctx.fillStyle = '#dcd6cd';
    ctx.fillRect(7, 4, 2, 3);
  });

  // --- BOOKSHELF ---
  const bookshelfTex = makeTex('bookshelf', (ctx) => {
    // Wood plank backing
    fillNoise(ctx, [168, 130, 83], 20, 1919);
    // 2 rows of colorful book spines
    const bookColors = ['#9e2a2b', '#335c67', '#e09f3e', '#540b0e', '#3f37c9', '#40916c'];
    for (let r = 0; r < 2; r++) {
      const y0 = r === 0 ? 2 : 9;
      ctx.fillStyle = '#2b1e10';
      ctx.fillRect(1, y0 + 5, 14, 1); // shelf board
      for (let x = 2; x < 14; x += 2) {
        ctx.fillStyle = bookColors[(x + r * 3) % bookColors.length];
        ctx.fillRect(x, y0, 2, 5);
      }
    }
  });

  // --- ORES HELPER ---
  function makeOreTex(id: string, fleckColor: string) {
    return makeTex(id, (ctx) => {
      fillNoise(ctx, [125, 125, 125], 30, 2020);
      ctx.fillStyle = fleckColor;
      ctx.fillRect(3, 4, 2, 2);
      ctx.fillRect(9, 3, 3, 2);
      ctx.fillRect(5, 9, 2, 3);
      ctx.fillRect(11, 10, 2, 2);
      ctx.fillRect(2, 12, 2, 2);
    });
  }
  const coalOreTex = makeOreTex('ore_coal', '#262626');
  const ironOreTex = makeOreTex('ore_iron', '#d8af93');
  const goldOreTex = makeOreTex('ore_gold', '#fcee4b');
  const diamondOreTex = makeOreTex('ore_diamond', '#5decf5');
  const emeraldOreTex = makeOreTex('ore_emerald', '#17dd62');

  // --- GLOWSTONE ---
  const glowstoneTex = makeTex('glowstone', (ctx) => {
    fillNoise(ctx, [243, 203, 117], 45, 2121);
    ctx.fillStyle = '#fff4a3';
    ctx.fillRect(4, 4, 3, 3);
    ctx.fillRect(10, 8, 3, 3);
  });

  // --- OBSIDIAN ---
  const obsidianTex = makeTex('obsidian', (ctx) => {
    fillNoise(ctx, [24, 18, 36], 15, 2222);
    ctx.fillStyle = '#3c245c';
    ctx.fillRect(4, 5, 3, 2);
    ctx.fillRect(10, 11, 2, 3);
  });

  // --- WATER ---
  const waterTex = makeTex('water', (ctx) => {
    fillNoise(ctx, [44, 94, 206], 30, 2323);
  });

  // --- TORCH ---
  const torchTex = makeTex('torch', (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    // Stick
    ctx.fillStyle = '#6e4f2b';
    ctx.fillRect(7, 5, 2, 10);
    // Flame
    ctx.fillStyle = '#ffcf00';
    ctx.fillRect(6, 2, 4, 3);
    ctx.fillStyle = '#ff5500';
    ctx.fillRect(7, 1, 2, 2);
  });

  // --- POPPY FLOWER ---
  const poppyTex = makeTex('poppy', (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    // Stem
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(7, 6, 2, 10);
    // Flower head
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillStyle = '#111111';
    ctx.fillRect(7, 3, 2, 2);
  });

  // --- DANDELION FLOWER ---
  const dandelionTex = makeTex('dandelion', (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(7, 7, 2, 9);
    ctx.fillStyle = '#fbc02d';
    ctx.fillRect(6, 3, 4, 4);
    ctx.fillStyle = '#fff59d';
    ctx.fillRect(7, 4, 2, 2);
  });

  // --- SNOW ---
  const snowTex = makeTex('snow', (ctx) => {
    fillNoise(ctx, [240, 245, 250], 15, 2424);
  });

  // --- ICE ---
  const iceTex = makeTex('ice', (ctx) => {
    fillNoise(ctx, [155, 205, 250], 25, 2525);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(3, 4, 4, 1);
    ctx.fillRect(8, 10, 5, 1);
  });

  // --- DIAMOND SWORD ---
  const diamondSwordTex = makeTex('diamond_sword', (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    // Wooden handle (bottom-left)
    ctx.fillStyle = '#5c3c1b';
    ctx.fillRect(2, 12, 2, 2);
    ctx.fillRect(3, 11, 2, 2);
    // Diamond pommel (bottom-left tip)
    ctx.fillStyle = '#18b5a0';
    ctx.fillRect(1, 13, 2, 2);
    // Crossguard
    ctx.fillStyle = '#18b5a0';
    ctx.fillRect(2, 9, 2, 2);
    ctx.fillRect(4, 10, 2, 2);
    ctx.fillRect(5, 11, 2, 2);
    ctx.fillStyle = '#33ebcb';
    ctx.fillRect(3, 10, 2, 2);
    // Blade (diagonal up-right)
    for (let i = 0; i < 9; i++) {
      const bx = 5 + i;
      const by = 9 - i;
      // Dark outer edge
      ctx.fillStyle = '#148f7d';
      ctx.fillRect(bx - 1, by, 3, 2);
      // Bright diamond core
      ctx.fillStyle = '#33ebcb';
      ctx.fillRect(bx, by, 2, 2);
      // White shine highlight
      ctx.fillStyle = '#bffcf2';
      ctx.fillRect(bx, by, 1, 1);
    }
  });

  // --- COOKED BEEF (ETEN) ---
  const cookedBeefTex = makeTex('cooked_beef', (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    // Outer crust of steak
    ctx.fillStyle = '#4a210f';
    ctx.fillRect(3, 3, 10, 10);
    ctx.fillRect(2, 5, 12, 6);
    // Juicy roasted beef center
    ctx.fillStyle = '#8b4222';
    ctx.fillRect(4, 4, 8, 8);
    ctx.fillRect(3, 5, 10, 6);
    // Grill marks & highlights
    ctx.fillStyle = '#a85632';
    ctx.fillRect(5, 5, 6, 4);
    ctx.fillStyle = '#592711';
    ctx.fillRect(5, 6, 5, 1);
    ctx.fillRect(6, 9, 5, 1);
    // Bone / fat marbling
    ctx.fillStyle = '#f2e2c9';
    ctx.fillRect(9, 4, 2, 2);
  });

  // Construct block faces mapping
  const uniform = (tex: THREE.CanvasTexture) => ({
    top: tex,
    bottom: tex,
    side: tex,
  });

  faceTextures[BlockType.DIRT] = uniform(dirtTex);
  faceTextures[BlockType.GRASS] = {
    top: grassTopTex,
    bottom: dirtTex,
    side: grassSideTex,
  };
  faceTextures[BlockType.STONE] = uniform(stoneTex);
  faceTextures[BlockType.COBBLESTONE] = uniform(cobbleTex);
  faceTextures[BlockType.WOOD_LOG] = {
    top: logTopTex,
    bottom: logTopTex,
    side: logSideTex,
  };
  faceTextures[BlockType.WOOD_PLANKS] = uniform(planksTex);
  faceTextures[BlockType.LEAVES] = uniform(leavesTex);
  faceTextures[BlockType.BEDROCK] = uniform(bedrockTex);
  faceTextures[BlockType.SAND] = uniform(sandTex);
  faceTextures[BlockType.GLASS] = uniform(glassTex);
  faceTextures[BlockType.BRICK] = uniform(bricksTex);
  faceTextures[BlockType.TNT] = {
    top: tntTopTex,
    bottom: tntTopTex,
    side: tntSideTex,
  };
  faceTextures[BlockType.CRAFTING_TABLE] = {
    top: craftTopTex,
    bottom: planksTex,
    side: craftSideTex,
  };
  faceTextures[BlockType.FURNACE] = {
    top: cobbleTex,
    bottom: cobbleTex,
    side: cobbleTex,
    front: furnaceFrontTex,
  };
  faceTextures[BlockType.CHEST] = {
    top: chestTopTex,
    bottom: chestTopTex,
    side: chestSideTex,
    front: chestFrontTex,
  };
  faceTextures[BlockType.BOOKSHELF] = {
    top: planksTex,
    bottom: planksTex,
    side: bookshelfTex,
  };
  faceTextures[BlockType.COAL_ORE] = uniform(coalOreTex);
  faceTextures[BlockType.IRON_ORE] = uniform(ironOreTex);
  faceTextures[BlockType.GOLD_ORE] = uniform(goldOreTex);
  faceTextures[BlockType.DIAMOND_ORE] = uniform(diamondOreTex);
  faceTextures[BlockType.EMERALD_ORE] = uniform(emeraldOreTex);
  faceTextures[BlockType.GLOWSTONE] = uniform(glowstoneTex);
  faceTextures[BlockType.OBSIDIAN] = uniform(obsidianTex);
  faceTextures[BlockType.WATER] = uniform(waterTex);
  faceTextures[BlockType.TORCH] = uniform(torchTex);
  faceTextures[BlockType.POPPY] = uniform(poppyTex);
  faceTextures[BlockType.DANDELION] = uniform(dandelionTex);
  faceTextures[BlockType.SNOW] = uniform(snowTex);
  faceTextures[BlockType.ICE] = uniform(iceTex);
  faceTextures[BlockType.DIAMOND_SWORD] = uniform(diamondSwordTex);
  faceTextures[BlockType.COOKED_BEEF] = uniform(cookedBeefTex);

  // Generate data URLs for 2D UI icons
  for (const blockIdStr of Object.keys(faceTextures)) {
    const id = Number(blockIdStr) as BlockType;
    const faces = faceTextures[id];
    if (faces) {
      // Pick front or side or top for icon
      const tex = faces.front || faces.side || faces.top;
      const canvas = (tex.image as HTMLCanvasElement);
      if (canvas && canvas.toDataURL) {
        iconDataUrls.set(id, canvas.toDataURL('image/png'));
      }
    }
  }

  return faceTextures;
}
