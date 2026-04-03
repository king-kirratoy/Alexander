// ═══════════ WORLD ═══════════

/**
 * Generate the procedural tile map and place nature objects.
 * Uses layered noise for terrain types and object placement.
 */
function generateWorld(seed) {
  const terrainNoise = makeNoise(seed);
  const moistureNoise = makeNoise(seed + 1000);
  const detailNoise = makeNoise(seed + 2000);

  // ── Generate base tile map ──────────────────────────────────
  _state.tileMap = [];
  for (let row = 0; row < WORLD_ROWS; row++) {
    _state.tileMap[row] = [];
    for (let col = 0; col < WORLD_COLS; col++) {
      const t = terrainNoise(col * 0.06, row * 0.06);
      const m = moistureNoise(col * 0.04, row * 0.04);
      const d = detailNoise(col * 0.15, row * 0.15);

      let tile;
      if (t < 0.25) {
        // Water zones
        tile = t < 0.18 ? TILE.WATER_DEEP : TILE.WATER_SHALLOW;
      } else if (t < 0.30) {
        // Shore / transition
        tile = m > 0.5 ? TILE.WATER_SHORE : TILE.DIRT_1;
      } else if (t < 0.45) {
        // Dirt areas
        if (d > 0.7) {
          tile = TILE.DIRT_PEBBLES;
        } else if (d > 0.5) {
          tile = TILE.DIRT_2;
        } else if (d > 0.3) {
          tile = TILE.DIRT_PATH;
        } else {
          tile = TILE.DIRT_1;
        }
      } else {
        // Grass areas (majority)
        if (d > 0.85 && m > 0.5) {
          tile = TILE.GRASS_FLOWERS;
        } else if (d > 0.6) {
          tile = TILE.GRASS_2;
        } else if (d > 0.3) {
          tile = TILE.GRASS_3;
        } else {
          tile = TILE.GRASS_1;
        }
      }

      _state.tileMap[row][col] = tile;
    }
  }

  // ── Clear starting area (center of map) ─────────────────────
  const startCol = Math.floor(WORLD_COLS / 2);
  const startRow = Math.floor(WORLD_ROWS / 2);
  const clearRadius = 6;

  for (let r = startRow - clearRadius; r <= startRow + clearRadius; r++) {
    for (let c = startCol - clearRadius; c <= startCol + clearRadius; c++) {
      if (!inBounds(c, r)) continue;
      const d = dist(c, r, startCol, startRow);
      if (d <= clearRadius) {
        // Make it nice grass
        const dNoise = detailNoise(c * 0.2, r * 0.2);
        if (dNoise > 0.7) {
          _state.tileMap[r][c] = TILE.GRASS_FLOWERS;
        } else if (dNoise > 0.4) {
          _state.tileMap[r][c] = TILE.GRASS_2;
        } else {
          _state.tileMap[r][c] = TILE.GRASS_1;
        }
      }
    }
  }

  // ── Place nature objects ────────────────────────────────────
  _state.natureObjects = [];
  const objectNoise = makeNoise(seed + 3000);
  const treeNoise = makeNoise(seed + 4000);

  for (let row = 0; row < WORLD_ROWS; row++) {
    for (let col = 0; col < WORLD_COLS; col++) {
      const tile = _state.tileMap[row][col];
      if (!WALKABLE_TILES.has(tile)) continue;

      // Don't place in starting area
      if (dist(col, row, startCol, startRow) < clearRadius + 2) continue;

      const objVal = objectNoise(col * 0.1, row * 0.1);
      const treeVal = treeNoise(col * 0.08, row * 0.08);

      // Trees — cluster in areas with high tree noise
      if (treeVal > 0.55 && objVal > 0.5 && Math.random() < 0.35) {
        const treeTypes = [NATURE.TREE_SMALL, NATURE.TREE_LARGE, NATURE.TREE_PINE, NATURE.TREE_AUTUMN];
        const weights = [0.3, 0.25, 0.3, 0.15];
        const type = weightedPick(treeTypes, weights);
        placeNatureObject(type, col, row);
        continue;
      }

      // Rocks — on dirt or sparse grass
      if (tile >= TILE.DIRT_1 && tile <= TILE.DIRT_PATH && objVal > 0.65 && Math.random() < 0.15) {
        const type = Math.random() < 0.8 ? NATURE.ROCK_SMALL : NATURE.ROCK_LARGE;
        placeNatureObject(type, col, row);
        continue;
      }

      // Iron ore — rare, on dirt/pebble tiles
      if ((tile === TILE.DIRT_PEBBLES || tile === TILE.DIRT_2) && objVal > 0.8 && Math.random() < 0.03) {
        placeNatureObject(NATURE.IRON_ORE, col, row);
        continue;
      }

      // Berry bushes — scattered on grass
      if (tile <= TILE.GRASS_FLOWERS && objVal > 0.6 && Math.random() < 0.04) {
        placeNatureObject(NATURE.BUSH_BERRY, col, row);
        continue;
      }

      // Shrubs and tall grass — decorative
      if (tile <= TILE.GRASS_FLOWERS && objVal > 0.45 && Math.random() < 0.03) {
        const type = Math.random() < 0.5 ? NATURE.BUSH_SHRUB : NATURE.TALL_GRASS;
        placeNatureObject(type, col, row);
      }
    }
  }

  // ── Ensure resources near starting area ─────────────────────
  ensureNearbyResources(startCol, startRow);
}


/**
 * Place a nature object at a tile position.
 */
function placeNatureObject(type, col, row) {
  const info = HARVESTABLE[type] || {};
  _state.natureObjects.push({
    id: uid(),
    type: type,
    col: col,
    row: row,
    hp: info.hp || 0,
    maxHp: info.hp || 0,
    depleted: false,
    regrowAt: null,
    sprite: null,
  });
}


/**
 * Ensure there are enough resources near the starting area.
 */
function ensureNearbyResources(centerCol, centerRow) {
  const radius = 12;
  let nearbyTrees = 0;
  let nearbyRocks = 0;
  let nearbyBerries = 0;

  // Count existing resources
  for (const obj of _state.natureObjects) {
    if (dist(obj.col, obj.row, centerCol, centerRow) > radius) continue;
    if (obj.type.startsWith('tree_')) nearbyTrees++;
    if (obj.type.startsWith('rock_')) nearbyRocks++;
    if (obj.type === NATURE.BUSH_BERRY) nearbyBerries++;
  }

  // Add missing resources in a ring around the starting area
  const minTrees = 8;
  const minRocks = 4;
  const minBerries = 3;

  const ringMin = 7;
  const ringMax = 11;

  while (nearbyTrees < minTrees) {
    const angle = Math.random() * Math.PI * 2;
    const r = randFloat(ringMin, ringMax);
    const c = Math.round(centerCol + Math.cos(angle) * r);
    const rr = Math.round(centerRow + Math.sin(angle) * r);
    if (inBounds(c, rr) && isWalkable(c, rr) && !getNatureAt(c, rr)) {
      placeNatureObject(randPick([NATURE.TREE_SMALL, NATURE.TREE_LARGE, NATURE.TREE_PINE]), c, rr);
      nearbyTrees++;
    }
  }

  while (nearbyRocks < minRocks) {
    const angle = Math.random() * Math.PI * 2;
    const r = randFloat(ringMin, ringMax);
    const c = Math.round(centerCol + Math.cos(angle) * r);
    const rr = Math.round(centerRow + Math.sin(angle) * r);
    if (inBounds(c, rr) && isWalkable(c, rr) && !getNatureAt(c, rr)) {
      placeNatureObject(randPick([NATURE.ROCK_SMALL, NATURE.ROCK_LARGE]), c, rr);
      nearbyRocks++;
    }
  }

  while (nearbyBerries < minBerries) {
    const angle = Math.random() * Math.PI * 2;
    const r = randFloat(ringMin - 1, ringMax);
    const c = Math.round(centerCol + Math.cos(angle) * r);
    const rr = Math.round(centerRow + Math.sin(angle) * r);
    if (inBounds(c, rr) && isWalkable(c, rr) && !getNatureAt(c, rr)) {
      placeNatureObject(NATURE.BUSH_BERRY, c, rr);
      nearbyBerries++;
    }
  }
}


/**
 * Get nature object at a specific tile, if any.
 */
function getNatureAt(col, row) {
  return _state.natureObjects.find(o => o.col === col && o.row === row && !o.depleted);
}


/**
 * Weighted random pick from parallel arrays.
 */
function weightedPick(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}


// ── Public API ────────────────────────────────────────────────
window.AX.world = {
  generateWorld,
  getNatureAt,
  placeNatureObject,
};
