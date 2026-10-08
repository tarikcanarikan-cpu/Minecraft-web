import { VoxelWorld, CHUNK_HEIGHT } from './world';
import { BlockType } from './types';

// Helper to get surface Y
function getSurfaceY(world: VoxelWorld, x: number, z: number): number {
  for (let y = CHUNK_HEIGHT - 2; y >= 2; y--) {
    const b = world.getBlock(x, y, z);
    if (b !== BlockType.AIR && b !== BlockType.LEAVES) {
      return y;
    }
  }
  return 12;
}

// Helper to level ground area
function levelArea(
  world: VoxelWorld,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  floorY: number,
  floorBlock = BlockType.COBBLESTONE
) {
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      // Clear space above floor
      for (let y = floorY + 1; y <= floorY + 6; y++) {
        world.setBlock(x, y, z, BlockType.AIR);
      }
      // Fill floor
      world.setBlock(x, floorY, z, floorBlock);
      // Support underneath down to solid ground
      for (let y = floorY - 1; y >= floorY - 4; y--) {
        const cur = world.getBlock(x, y, z);
        if (cur === BlockType.AIR || cur === BlockType.WATER) {
          world.setBlock(x, y, z, BlockType.DIRT);
        } else {
          break;
        }
      }
    }
  }
}

// 1. Dorpshuisje (Village House)
export function buildVillageHouse(
  world: VoxelWorld,
  originX: number,
  floorY: number,
  originZ: number,
  houseType: 'normal' | 'blacksmith' | 'library' = 'normal'
) {
  const w = 5;
  const d = 5;
  const h = 4;

  // Foundation & floor
  levelArea(world, originX, originX + w - 1, originZ, originZ + d - 1, floorY, BlockType.COBBLESTONE);

  // Walls & Corner Wood Logs
  for (let dy = 1; dy <= h; dy++) {
    const y = floorY + dy;
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const isCorner = (dx === 0 || dx === w - 1) && (dz === 0 || dz === d - 1);
        const isWall = dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1;
        const x = originX + dx;
        const z = originZ + dz;

        if (isCorner) {
          world.setBlock(x, y, z, BlockType.WOOD_LOG);
        } else if (isWall) {
          // Doorway at front center
          if (dz === 0 && dx === 2 && dy <= 2) {
            world.setBlock(x, y, z, BlockType.AIR);
          }
          // Windows
          else if (dy === 2 && (dx === 1 || dx === 3 || dz === 2)) {
            world.setBlock(x, y, z, BlockType.GLASS);
          } else {
            world.setBlock(x, y, z, BlockType.WOOD_PLANKS);
          }
        }
      }
    }
  }

  // Wooden Plank Roof with overhang
  const roofY = floorY + h + 1;
  for (let dx = -1; dx <= w; dx++) {
    for (let dz = -1; dz <= d; dz++) {
      world.setBlock(originX + dx, roofY, originZ + dz, BlockType.WOOD_PLANKS);
    }
  }

  // Interior Furniture & Lighting
  world.setBlock(originX + 2, floorY + h, originZ + 2, BlockType.GLOWSTONE); // ceiling light

  if (houseType === 'blacksmith') {
    world.setBlock(originX + 1, floorY + 1, originZ + 3, BlockType.FURNACE);
    world.setBlock(originX + 2, floorY + 1, originZ + 3, BlockType.FURNACE);
    world.setBlock(originX + 3, floorY + 1, originZ + 3, BlockType.CRAFTING_TABLE);
    world.setBlock(originX + 1, floorY + 1, originZ + 1, BlockType.CHEST);
  } else if (houseType === 'library') {
    world.setBlock(originX + 1, floorY + 1, originZ + 3, BlockType.BOOKSHELF);
    world.setBlock(originX + 1, floorY + 2, originZ + 3, BlockType.BOOKSHELF);
    world.setBlock(originX + 2, floorY + 1, originZ + 3, BlockType.BOOKSHELF);
    world.setBlock(originX + 3, floorY + 1, originZ + 3, BlockType.BOOKSHELF);
    world.setBlock(originX + 3, floorY + 1, originZ + 1, BlockType.CRAFTING_TABLE);
    world.setBlock(originX + 1, floorY + 1, originZ + 1, BlockType.CHEST);
  } else {
    // Normal cottage
    world.setBlock(originX + 1, floorY + 1, originZ + 3, BlockType.CRAFTING_TABLE);
    world.setBlock(originX + 3, floorY + 1, originZ + 3, BlockType.CHEST);
    world.setBlock(originX + 1, floorY + 1, originZ + 1, BlockType.FURNACE);
  }
}

// 2. Dorpsput (Village Town Well)
export function buildVillageWell(world: VoxelWorld, centerX: number, groundY: number, centerZ: number) {
  // 4x4 Cobblestone well
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const isRim = Math.abs(dx) === 2 || Math.abs(dz) === 2;
      const isCorner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
      const x = centerX + dx;
      const z = centerZ + dz;

      // Rim
      if (isRim) {
        world.setBlock(x, groundY, z, BlockType.COBBLESTONE);
        world.setBlock(x, groundY + 1, z, BlockType.COBBLESTONE);
      } else {
        // Deep water pool
        world.setBlock(x, groundY, z, BlockType.WATER);
        world.setBlock(x, groundY - 1, z, BlockType.WATER);
        world.setBlock(x, groundY - 2, z, BlockType.COBBLESTONE);
      }

      // Pillars on 4 corners
      if (isCorner) {
        for (let dy = 1; dy <= 3; dy++) {
          world.setBlock(x, groundY + dy, z, BlockType.WOOD_LOG);
        }
      }
    }
  }

  // Roof over well with lantern
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      world.setBlock(centerX + dx, groundY + 4, centerZ + dz, BlockType.WOOD_PLANKS);
    }
  }
  world.setBlock(centerX, groundY + 3, centerZ, BlockType.GLOWSTONE);
}

// 3. Dorpsboerderij / Moestuin (Village Farm Field)
export function buildVillageFarm(world: VoxelWorld, startX: number, groundY: number, startZ: number) {
  const size = 6;
  // Wooden perimeter
  for (let dx = 0; dx < size; dx++) {
    for (let dz = 0; dz < size; dz++) {
      const isEdge = dx === 0 || dx === size - 1 || dz === 0 || dz === size - 1;
      const isTrench = dz === 3 && !isEdge;
      const x = startX + dx;
      const z = startZ + dz;

      if (isEdge) {
        world.setBlock(x, groundY, z, BlockType.WOOD_LOG);
        world.setBlock(x, groundY + 1, z, BlockType.AIR);
      } else if (isTrench) {
        world.setBlock(x, groundY, z, BlockType.WATER);
        world.setBlock(x, groundY + 1, z, BlockType.AIR);
      } else {
        world.setBlock(x, groundY, z, BlockType.DIRT);
        // Decorative crops/flowers
        if ((dx + dz) % 2 === 0) {
          world.setBlock(x, groundY + 1, z, BlockType.DANDELION);
        } else {
          world.setBlock(x, groundY + 1, z, BlockType.POPPY);
        }
      }
    }
  }
}

// 4. Lantaarnpaal (Street Lamp)
export function buildLampPost(world: VoxelWorld, x: number, groundY: number, z: number) {
  world.setBlock(x, groundY + 1, z, BlockType.COBBLESTONE);
  world.setBlock(x, groundY + 2, z, BlockType.WOOD_LOG);
  world.setBlock(x, groundY + 3, z, BlockType.WOOD_LOG);
  world.setBlock(x, groundY + 4, z, BlockType.GLOWSTONE);
}

// 5. Connect paths between two coordinates
export function buildPath(world: VoxelWorld, x1: number, z1: number, x2: number, z2: number) {
  let currX = x1;
  let currZ = z1;

  while (currX !== x2 || currZ !== z2) {
    const gy = getSurfaceY(world, currX, currZ);
    world.setBlock(currX, gy, currZ, BlockType.COBBLESTONE);
    world.setBlock(currX, gy + 1, currZ, BlockType.AIR);
    world.setBlock(currX, gy + 2, currZ, BlockType.AIR);

    if (currX < x2) currX++;
    else if (currX > x2) currX--;
    else if (currZ < z2) currZ++;
    else if (currZ > z2) currZ--;
  }
  const gy = getSurfaceY(world, x2, z2);
  world.setBlock(x2, gy, z2, BlockType.COBBLESTONE);
}

// 6. Complete Village Generator
export function generateVillage(world: VoxelWorld, centerX = 16, centerZ = 16) {
  const groundY = getSurfaceY(world, centerX, centerZ);

  // 1. Center Well
  buildVillageWell(world, centerX, groundY, centerZ);

  // 2. North Cottage
  const northY = getSurfaceY(world, centerX - 2, centerZ - 10);
  buildVillageHouse(world, centerX - 2, northY, centerZ - 10, 'normal');

  // 3. West Library House
  const westY = getSurfaceY(world, centerX - 12, centerZ - 2);
  buildVillageHouse(world, centerX - 12, westY, centerZ - 2, 'library');

  // 4. South Blacksmith
  const southY = getSurfaceY(world, centerX - 2, centerZ + 7);
  buildVillageHouse(world, centerX - 2, southY, centerZ + 7, 'blacksmith');

  // 5. East Farm (Moestuin)
  const eastY = getSurfaceY(world, centerX + 7, centerZ - 3);
  buildVillageFarm(world, centerX + 7, eastY, centerZ - 3);

  // 6. Cobblestone Paths
  buildPath(world, centerX, centerZ - 3, centerX, centerZ - 10);
  buildPath(world, centerX, centerZ + 3, centerX, centerZ + 7);
  buildPath(world, centerX - 3, centerZ, centerX - 10, centerZ);
  buildPath(world, centerX + 3, centerZ, centerX + 7, centerZ);

  // 7. Street Lamps
  buildLampPost(world, centerX + 4, getSurfaceY(world, centerX + 4, centerZ + 4), centerZ + 4);
  buildLampPost(world, centerX - 4, getSurfaceY(world, centerX - 4, centerZ - 4), centerZ - 4);
}

// 7. LUXURY MODERN VILLA GENERATOR (1 Grote Moderne Villa met Zwembad!)
export function generateVilla(world: VoxelWorld, startX = -26, startZ = -22) {
  const groundY = Math.max(12, getSurfaceY(world, startX + 6, startZ + 6));
  const villaWidth = 14;
  const villaDepth = 12;

  // Level the main plot
  levelArea(
    world,
    startX - 1,
    startX + villaWidth + 4,
    startZ - 1,
    startZ + villaDepth + 1,
    groundY,
    BlockType.STONE
  );

  // 1. Luxury Outdoor Swimming Pool (8 x 5 blocks, 2 deep)
  const poolX = startX + villaWidth;
  const poolZ = startZ + 2;
  const poolW = 7;
  const poolD = 5;

  for (let px = poolX; px < poolX + poolW; px++) {
    for (let pz = poolZ; pz < poolZ + poolD; pz++) {
      const isPoolBorder = px === poolX || px === poolX + poolW - 1 || pz === poolZ || pz === poolZ + poolD - 1;
      if (isPoolBorder) {
        world.setBlock(px, groundY, pz, BlockType.STONE);
      } else {
        world.setBlock(px, groundY - 2, pz, BlockType.GLOWSTONE); // underwater lights!
        world.setBlock(px, groundY - 1, pz, BlockType.WATER);
        world.setBlock(px, groundY, pz, BlockType.WATER);
        world.setBlock(px, groundY + 1, pz, BlockType.AIR);
        world.setBlock(px, groundY + 2, pz, BlockType.AIR);
      }
    }
  }
  // Pool Diving Board
  world.setBlock(poolX, groundY + 1, poolZ + 2, BlockType.WOOD_PLANKS);
  world.setBlock(poolX + 1, groundY + 1, poolZ + 2, BlockType.WOOD_PLANKS);

  // 2. Villa Ground Floor (Height: 4 blocks)
  const floor1Y = groundY;
  const floorHeight = 4;

  // Floor: Polished Wood Planks
  for (let x = startX; x < startX + villaWidth; x++) {
    for (let z = startZ; z < startZ + villaDepth; z++) {
      world.setBlock(x, floor1Y, z, BlockType.WOOD_PLANKS);
      for (let y = floor1Y + 1; y <= floor1Y + floorHeight; y++) {
        world.setBlock(x, y, z, BlockType.AIR);
      }
    }
  }

  // Pillars & Glass Panoramic Exterior Walls (Ground Floor)
  for (let dy = 1; dy <= floorHeight; dy++) {
    const y = floor1Y + dy;
    for (let x = startX; x < startX + villaWidth; x++) {
      for (let z = startZ; z < startZ + villaDepth; z++) {
        const isCorner =
          (x === startX || x === startX + villaWidth - 1) &&
          (z === startZ || z === startZ + villaDepth - 1);
        const isWall =
          x === startX || x === startX + villaWidth - 1 ||
          z === startZ || z === startZ + villaDepth - 1;

        if (isCorner) {
          world.setBlock(x, y, z, BlockType.WOOD_LOG);
        } else if (isWall) {
          // Double Grand Entrance on front wall (z === startZ)
          if (z === startZ && (x === startX + 6 || x === startX + 7) && dy <= 3) {
            world.setBlock(x, y, z, BlockType.AIR); // Grand Doorway
          }
          // Patio door to Swimming Pool (x === startX + villaWidth - 1)
          else if (x === startX + villaWidth - 1 && (z === startZ + 4 || z === startZ + 5) && dy <= 2) {
            world.setBlock(x, y, z, BlockType.AIR); // Walkout to pool
          }
          // Panoramic Floor-to-Ceiling Glass Windows
          else if (dy >= 2 && dy <= 3) {
            world.setBlock(x, y, z, BlockType.GLASS);
          } else {
            world.setBlock(x, y, z, BlockType.BRICK);
          }
        }
      }
    }
  }

  // Ground Floor Interior
  // Grand Fireplace on West Wall
  world.setBlock(startX + 1, floor1Y + 1, startZ + 5, BlockType.STONE);
  world.setBlock(startX + 1, floor1Y + 1, startZ + 6, BlockType.GLOWSTONE); // glowing fire
  world.setBlock(startX + 1, floor1Y + 1, startZ + 7, BlockType.STONE);
  world.setBlock(startX + 1, floor1Y + 2, startZ + 6, BlockType.STONE);
  world.setBlock(startX + 1, floor1Y + 3, startZ + 6, BlockType.BRICK); // chimney

  // Lounge Furniture: Bookshelves, Chests, Crafting Table, Furnace
  world.setBlock(startX + 3, floor1Y + 1, startZ + 10, BlockType.BOOKSHELF);
  world.setBlock(startX + 4, floor1Y + 1, startZ + 10, BlockType.BOOKSHELF);
  world.setBlock(startX + 5, floor1Y + 1, startZ + 10, BlockType.BOOKSHELF);
  world.setBlock(startX + 6, floor1Y + 1, startZ + 10, BlockType.CRAFTING_TABLE);
  world.setBlock(startX + 7, floor1Y + 1, startZ + 10, BlockType.FURNACE);
  world.setBlock(startX + 8, floor1Y + 1, startZ + 10, BlockType.CHEST);
  world.setBlock(startX + 9, floor1Y + 1, startZ + 10, BlockType.CHEST);

  // Chandeliers
  world.setBlock(startX + 4, floor1Y + floorHeight, startZ + 5, BlockType.GLOWSTONE);
  world.setBlock(startX + 10, floor1Y + floorHeight, startZ + 5, BlockType.GLOWSTONE);

  // 3. Wooden Staircase to 2nd Floor
  const stairX = startX + 2;
  const stairZ = startZ + 2;
  for (let s = 0; s < 4; s++) {
    world.setBlock(stairX, floor1Y + 1 + s, stairZ + s, BlockType.WOOD_PLANKS);
    world.setBlock(stairX, floor1Y + 2 + s, stairZ + s, BlockType.AIR);
    world.setBlock(stairX, floor1Y + 3 + s, stairZ + s, BlockType.AIR);
  }

  // 4. Second Floor (Master Suite & Panoramic Balcony)
  const floor2Y = floor1Y + floorHeight + 1;
  const floor2Height = 4;

  // Floor 2 Slabs/Planks
  for (let x = startX; x < startX + villaWidth; x++) {
    for (let z = startZ; z < startZ + villaDepth; z++) {
      // Leave stairwell open
      if (x === stairX && z >= stairZ && z <= stairZ + 3) {
        world.setBlock(x, floor2Y, z, BlockType.AIR);
      } else {
        world.setBlock(x, floor2Y, z, BlockType.WOOD_PLANKS);
      }
      for (let y = floor2Y + 1; y <= floor2Y + floor2Height; y++) {
        world.setBlock(x, y, z, BlockType.AIR);
      }
    }
  }

  // Second Floor Walls & Balcony
  for (let dy = 1; dy <= floor2Height; dy++) {
    const y = floor2Y + dy;
    for (let x = startX; x < startX + villaWidth; x++) {
      for (let z = startZ; z < startZ + villaDepth; z++) {
        const isCorner =
          (x === startX || x === startX + villaWidth - 1) &&
          (z === startZ || z === startZ + villaDepth - 1);
        const isWall =
          x === startX || x === startX + villaWidth - 1 ||
          z === startZ || z === startZ + villaDepth - 1;

        if (isCorner) {
          world.setBlock(x, y, z, BlockType.WOOD_LOG);
        } else if (isWall) {
          // East Balcony overlooking pool: glass railing only at bottom
          if (x === startX + villaWidth - 1 && z >= startZ + 2 && z <= startZ + 8) {
            if (dy === 1) {
              world.setBlock(x, y, z, BlockType.GLASS); // Glass balcony railing
            } else {
              world.setBlock(x, y, z, BlockType.AIR); // Open balcony view!
            }
          }
          // Panoramic Master Suite Glass
          else if (dy >= 1 && dy <= 3) {
            world.setBlock(x, y, z, BlockType.GLASS);
          } else {
            world.setBlock(x, y, z, BlockType.BRICK);
          }
        }
      }
    }
  }

  // Master Bedroom Furniture
  world.setBlock(startX + 10, floor2Y + 1, startZ + 10, BlockType.CHEST);
  world.setBlock(startX + 11, floor2Y + 1, startZ + 10, BlockType.BOOKSHELF);
  world.setBlock(startX + 11, floor2Y + 2, startZ + 10, BlockType.BOOKSHELF);
  world.setBlock(startX + 9, floor2Y + 1, startZ + 10, BlockType.SNOW); // Bed pillows / wool
  world.setBlock(startX + 8, floor2Y + 1, startZ + 10, BlockType.SNOW);

  // Ceiling Lights on 2nd Floor
  world.setBlock(startX + 5, floor2Y + floor2Height, startZ + 6, BlockType.GLOWSTONE);
  world.setBlock(startX + 9, floor2Y + floor2Height, startZ + 6, BlockType.GLOWSTONE);

  // 5. Villa Roof & Rooftop Terrace
  const roofY = floor2Y + floor2Height + 1;
  for (let x = startX - 1; x <= startX + villaWidth; x++) {
    for (let z = startZ - 1; z <= startZ + villaDepth; z++) {
      const isEdge = x === startX - 1 || x === startX + villaWidth || z === startZ - 1 || z === startZ + villaDepth;
      if (isEdge) {
        world.setBlock(x, roofY, z, BlockType.STONE);
      } else {
        world.setBlock(x, roofY, z, BlockType.STONE);
      }
    }
  }

  // Rooftop Garden Terrace
  world.setBlock(startX + 2, roofY + 1, startZ + 2, BlockType.POPPY);
  world.setBlock(startX + 11, roofY + 1, startZ + 2, BlockType.DANDELION);
  world.setBlock(startX + 6, roofY + 1, startZ + 6, BlockType.GLOWSTONE); // rooftop spotlight
}

// 8. TANKSTATION (GAS STATION VOOR AUTO'S)
export function generateGasStation(world: VoxelWorld, startX = 2, startZ = -12) {
  const groundY = Math.max(12, getSurfaceY(world, startX + 6, startZ + 6));
  const stationWidth = 18;
  const stationDepth = 15;

  // 1. Asphalt Ground Plot
  levelArea(
    world,
    startX - 1,
    startX + stationWidth,
    startZ - 1,
    startZ + stationDepth,
    groundY,
    BlockType.STONE
  );

  // 2. Large Fuel Island Canopy (Overkapping over de benzinepompen)
  const canopyX = startX + 1;
  const canopyZ = startZ + 2;
  const canopyW = 9;
  const canopyD = 11;
  const canopyHeight = 4;
  const canopyRoofY = groundY + canopyHeight + 1;

  // Canopy 4 Support Columns
  const columns = [
    { x: canopyX + 1, z: canopyZ + 1 },
    { x: canopyX + canopyW - 2, z: canopyZ + 1 },
    { x: canopyX + 1, z: canopyZ + canopyD - 2 },
    { x: canopyX + canopyW - 2, z: canopyZ + canopyD - 2 },
  ];
  for (const col of columns) {
    for (let dy = 1; dy <= canopyHeight; dy++) {
      world.setBlock(col.x, groundY + dy, col.z, BlockType.COBBLESTONE);
    }
  }

  // Canopy Roof & Red Branding Border
  for (let cx = canopyX; cx < canopyX + canopyW; cx++) {
    for (let cz = canopyZ; cz < canopyZ + canopyD; cz++) {
      const isCanopyBorder =
        cx === canopyX || cx === canopyX + canopyW - 1 ||
        cz === canopyZ || cz === canopyZ + canopyD - 1;

      if (isCanopyBorder) {
        world.setBlock(cx, canopyRoofY, cz, BlockType.BRICK); // Red brand stripe
      } else {
        world.setBlock(cx, canopyRoofY, cz, BlockType.STONE);
      }
    }
  }

  // Bright Overhead Canopy Floodlights
  world.setBlock(canopyX + 4, canopyRoofY - 1, canopyZ + 3, BlockType.GLOWSTONE);
  world.setBlock(canopyX + 4, canopyRoofY - 1, canopyZ + 7, BlockType.GLOWSTONE);

  // 3. Two Fuel Islands with Gas Pumps (Brandstofpompen)
  const pumpIslands = [
    { x: canopyX + 4, z: canopyZ + 3 },
    { x: canopyX + 4, z: canopyZ + 7 },
  ];

  for (const pump of pumpIslands) {
    // Concrete safety island curb
    for (let pz = pump.z - 1; pz <= pump.z + 1; pz++) {
      world.setBlock(pump.x, groundY + 1, pz, BlockType.COBBLESTONE);
    }
    // Pump 1: Euro 95 & Super (Red & Yellow blocks)
    world.setBlock(pump.x, groundY + 2, pump.z, BlockType.BRICK); // Red pump body
    world.setBlock(pump.x, groundY + 3, pump.z, BlockType.GLOWSTONE); // Lit price display!
  }

  // 4. Gas Station Mini-Market Shop (Winkel)
  const shopX = startX + 11;
  const shopZ = startZ + 3;
  const shopW = 7;
  const shopD = 8;
  const shopH = 4;

  // Shop floor: Wood Planks
  for (let x = shopX; x < shopX + shopW; x++) {
    for (let z = shopZ; z < shopZ + shopD; z++) {
      world.setBlock(x, groundY, z, BlockType.WOOD_PLANKS);
      for (let y = groundY + 1; y <= groundY + shopH; y++) {
        world.setBlock(x, y, z, BlockType.AIR);
      }
    }
  }

  // Shop Walls & Large Glass Front
  for (let dy = 1; dy <= shopH; dy++) {
    const y = groundY + dy;
    for (let x = shopX; x < shopX + shopW; x++) {
      for (let z = shopZ; z < shopZ + shopD; z++) {
        const isWall = x === shopX || x === shopX + shopW - 1 || z === shopZ || z === shopZ + shopD - 1;
        if (isWall) {
          // Front Glass entrance on west wall (x === shopX)
          if (x === shopX && (z === shopZ + 3 || z === shopZ + 4) && dy <= 2) {
            world.setBlock(x, y, z, BlockType.AIR); // Automatic Doorway
          } else if (x === shopX && dy >= 2 && dy <= 3) {
            world.setBlock(x, y, z, BlockType.GLASS); // Panoramic storefront glass
          } else {
            world.setBlock(x, y, z, BlockType.BRICK);
          }
        }
      }
    }
  }

  // Shop Flat Roof
  for (let x = shopX; x < shopX + shopW; x++) {
    for (let z = shopZ; z < shopZ + shopD; z++) {
      world.setBlock(x, groundY + shopH + 1, z, BlockType.STONE);
    }
  }
  // Shop Ceiling Lamp
  world.setBlock(shopX + 3, groundY + shopH, shopZ + 4, BlockType.GLOWSTONE);

  // Shop Interior (Counter, shelves, coffee, snacks)
  world.setBlock(shopX + 2, groundY + 1, shopZ + 2, BlockType.WOOD_PLANKS); // Cashier desk
  world.setBlock(shopX + 2, groundY + 2, shopZ + 2, BlockType.CRAFTING_TABLE); // Cash register
  world.setBlock(shopX + 5, groundY + 1, shopZ + 2, BlockType.BOOKSHELF); // Magazine & snack rack
  world.setBlock(shopX + 5, groundY + 2, shopZ + 2, BlockType.CHEST); // Stored goods
  world.setBlock(shopX + 5, groundY + 1, shopZ + 5, BlockType.FURNACE); // Coffee / hot snack machine

  // 5. Tall Roadside Price Totem (Prijzenbord)
  const totemX = startX - 1;
  const totemZ = startZ + 1;
  for (let dy = 1; dy <= 5; dy++) {
    world.setBlock(totemX, groundY + dy, totemZ, BlockType.COBBLESTONE);
  }
  world.setBlock(totemX, groundY + 4, totemZ, BlockType.GLOWSTONE); // Glowing 95 price
  world.setBlock(totemX, groundY + 5, totemZ, BlockType.BRICK); // Brand logo
}

// 9. ROAD SYSTEM (Asfaltwegen die Tankstation, Dorp en Villa verbinden)
export function buildRoad(world: VoxelWorld, x1: number, z1: number, x2: number, z2: number, width = 3) {
  let cx = x1;
  let cz = z1;
  const halfW = Math.floor(width / 2);
  let step = 0;

  while (cx !== x2 || cz !== z2) {
    step++;
    const isStepX = Math.abs(x2 - cx) > Math.abs(z2 - cz);
    const gy = getSurfaceY(world, cx, cz);

    for (let offset = -halfW; offset <= halfW; offset++) {
      const rx = isStepX ? cx : cx + offset;
      const rz = isStepX ? cz + offset : cz;
      const rgy = getSurfaceY(world, rx, rz);

      // Paved road surface
      const isCenterLine = offset === 0 && step % 3 === 0;
      world.setBlock(rx, rgy, rz, isCenterLine ? BlockType.SNOW : BlockType.STONE);
      world.setBlock(rx, rgy + 1, rz, BlockType.AIR);
      world.setBlock(rx, rgy + 2, rz, BlockType.AIR);
    }

    if (cx < x2) cx++;
    else if (cx > x2) cx--;
    else if (cz < z2) cz++;
    else if (cz > z2) cz--;
  }
}

