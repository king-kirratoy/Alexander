// ═══════════ BUILDINGS ═══════════

/**
 * Create a new building and add it to _state.buildings.
 */
function createBuilding(type, col, row) {
  const def = BUILDING_DEFS[type];
  if (!def) return null;

  // Calculate maxBuildWork from total cost * 10
  let totalCost = 0;
  for (const res in def.cost) {
    totalCost += def.cost[res];
  }

  const building = {
    id: _state.nextBuildingId++,
    type: type,
    col: col,
    row: row,
    phase: BUILD_PHASE.FOUNDATION,
    buildProgress: 0,
    maxBuildWork: totalCost * 10,
    hp: def.hp,
    maxHp: def.hp,
    variant: randInt(0, 3),
    occupants: [],
    sprite: null,
  };

  _state.buildings.push(building);
  return building;
}


/**
 * Find a valid location to place a building near existing buildings.
 * Prefers tiles adjacent to existing buildings (cluster the settlement).
 * For multi-tile buildings, all tiles in the footprint must be clear.
 */
function findBuildSite(centerCol, centerRow, buildingType) {
  const def = BUILDING_DEFS[buildingType];
  if (!def) return null;

  const w = def.size.w;
  const h = def.size.h;

  // Check if a footprint starting at (col, row) is valid
  function isFootprintClear(col, row) {
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const c = col + dc;
        const r = row + dr;
        if (!inBounds(c, r)) return false;
        if (!WALKABLE_TILES.has(_state.tileMap[r][c])) return false;
        if (getBuildingAt(c, r)) return false;
        if (typeof getNatureAt === 'function' && getNatureAt(c, r)) return false;
      }
    }
    return true;
  }

  // Score a site: prefer adjacency to existing buildings
  function scoreSite(col, row) {
    let score = 0;
    for (const b of _state.buildings) {
      const bDef = BUILDING_DEFS[b.type];
      if (!bDef) continue;
      const bw = bDef.size.w;
      const bh = bDef.size.h;
      // Check if any tile in our footprint is adjacent to any tile in this building
      for (let dr = 0; dr < h; dr++) {
        for (let dc = 0; dc < w; dc++) {
          for (let bdr = 0; bdr < bh; bdr++) {
            for (let bdc = 0; bdc < bw; bdc++) {
              const d = dist(col + dc, row + dr, b.col + bdc, b.row + bdr);
              if (d <= 2) score += 10;
              else if (d <= 4) score += 3;
            }
          }
        }
      }
    }
    // Prefer closer to center
    score -= dist(col, row, centerCol, centerRow) * 0.5;
    return score;
  }

  let bestSite = null;
  let bestScore = -Infinity;

  // Search in expanding rings around center
  for (let radius = 1; radius <= 15; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
        const c = centerCol + dc;
        const r = centerRow + dr;
        if (!isFootprintClear(c, r)) continue;

        const score = scoreSite(c, r);
        if (score > bestScore) {
          bestScore = score;
          bestSite = { col: c, row: r };
        }
      }
    }
    // Once we've found at least one site and scanned 2 rings beyond, stop
    if (bestSite && radius >= 3) break;
  }

  return bestSite;
}


/**
 * Advance build progress on a building. Settler adds work based on strength and delta.
 * When progress crosses a phase threshold, the phase advances.
 */
function advanceBuild(building, settler, delta) {
  if (building.phase >= BUILD_PHASE.COMPLETE) return;

  let workRate = settler.strength;

  // Personality: workSpeed affects build rate
  if (settler.personality.effect === 'workSpeed') {
    workRate *= settler.personality.mod;
  }

  building.buildProgress += workRate * (delta / 1000);

  // Check phase advancement
  let accumulated = 0;
  for (let p = 0; p <= BUILD_PHASE.COMPLETE; p++) {
    accumulated += BUILD_PHASE_RATIOS[p] * building.maxBuildWork;
    if (building.buildProgress < accumulated) {
      building.phase = p;
      return;
    }
  }

  // All phases complete
  building.phase = BUILD_PHASE.COMPLETE;
  building.buildProgress = building.maxBuildWork;
}


/**
 * Determine what building the settlement needs most.
 * Returns a BUILDING type string or null.
 */
function decideBuildPriority() {
  const pop = _state.settlers.filter(s => !s.isDead).length;

  // 1. Campfire (if none exists)
  if (!hasBuilding(BUILDING.CAMPFIRE)) return BUILDING.CAMPFIRE;

  // 2. Storage shed (if none exists)
  if (!hasBuilding(BUILDING.STORAGE)) return BUILDING.STORAGE;

  // 3. Hut (if no shelter exists)
  if (!hasBuilding(BUILDING.HUT) && !hasBuilding(BUILDING.HOUSE)) return BUILDING.HUT;

  // 4. Workbench (if none exists)
  if (!hasBuilding(BUILDING.WORKBENCH)) return BUILDING.WORKBENCH;

  // 5. Additional huts (if population is within 1 of total bed capacity)
  const totalBeds = getTotalBedCapacity();
  if (totalBeds - pop <= 1) {
    if (pop >= BUILDING_DEFS[BUILDING.HOUSE].unlockPop) return BUILDING.HOUSE;
    return BUILDING.HUT;
  }

  // 6. House (if population >= 8 and upgrading makes sense)
  if (pop >= BUILDING_DEFS[BUILDING.HOUSE].unlockPop && !hasBuilding(BUILDING.HOUSE)) {
    return BUILDING.HOUSE;
  }

  // 7. Farm (if population >= 6 and no farm exists)
  if (pop >= BUILDING_DEFS[BUILDING.FARM].unlockPop && !hasBuilding(BUILDING.FARM)) {
    return BUILDING.FARM;
  }

  // 8. Forge (if population >= 6, workbench exists, iron ore > 0, no forge)
  if (pop >= 6 && hasBuilding(BUILDING.WORKBENCH) && _state.resources.iron > 0 && !hasBuilding(BUILDING.FORGE)) {
    return BUILDING.FORGE;
  }

  // 9. Watchtower (if population >= 10 and no watchtower exists)
  if (pop >= BUILDING_DEFS[BUILDING.WATCHTOWER].unlockPop && !hasBuilding(BUILDING.WATCHTOWER)) {
    return BUILDING.WATCHTOWER;
  }

  // 10. Additional houses/huts as population grows (keep capacity >= population + 2)
  if (totalBeds < pop + 2) {
    if (pop >= BUILDING_DEFS[BUILDING.HOUSE].unlockPop) return BUILDING.HOUSE;
    return BUILDING.HUT;
  }

  // 11. Additional farms as population grows (one farm per 8 settlers)
  const farmCount = getBuildingsOfType(BUILDING.FARM).length;
  const neededFarms = Math.floor(pop / 8);
  if (pop >= BUILDING_DEFS[BUILDING.FARM].unlockPop && farmCount < neededFarms) {
    return BUILDING.FARM;
  }

  return null;
}


/**
 * Get total bed capacity across all completed shelter buildings.
 */
function getTotalBedCapacity() {
  let total = 0;
  for (const b of _state.buildings) {
    if (b.phase < BUILD_PHASE.COMPLETE) continue;
    const def = BUILDING_DEFS[b.type];
    if (def && def.capacity > 0) {
      total += def.capacity;
    }
  }
  return total;
}


/**
 * Get the building occupying a given tile position, considering multi-tile footprints.
 */
function getBuildingAt(col, row) {
  for (const b of _state.buildings) {
    const def = BUILDING_DEFS[b.type];
    if (!def) continue;
    if (col >= b.col && col < b.col + def.size.w &&
        row >= b.row && row < b.row + def.size.h) {
      return b;
    }
  }
  return null;
}


/**
 * Get all completed buildings of a given type.
 */
function getBuildingsOfType(type) {
  return _state.buildings.filter(b => b.type === type && b.phase >= BUILD_PHASE.COMPLETE);
}


/**
 * Returns true if at least one completed building of the given type exists.
 */
function hasBuilding(type) {
  return _state.buildings.some(b => b.type === type && b.phase >= BUILD_PHASE.COMPLETE);
}


/**
 * Check if the settlement can afford a building's cost.
 */
function canAffordBuilding(type) {
  const def = BUILDING_DEFS[type];
  if (!def) return false;
  for (const res in def.cost) {
    if ((_state.resources[res] || 0) < def.cost[res]) return false;
  }
  return true;
}


/**
 * Deduct a building's cost from the resource stockpile.
 */
function payBuildingCost(type) {
  const def = BUILDING_DEFS[type];
  if (!def) return;
  for (const res in def.cost) {
    _state.resources[res] -= def.cost[res];
  }
}


/**
 * Find a building that is currently under construction (not yet complete).
 */
function findIncompleteBuilding() {
  return _state.buildings.find(b => b.phase < BUILD_PHASE.COMPLETE) || null;
}


// ── Public API ────────────────────────────────────────────────
window.AX.buildings = {
  createBuilding,
  findBuildSite,
  advanceBuild,
  decideBuildPriority,
  getBuildingAt,
  getBuildingsOfType,
  hasBuilding,
  canAffordBuilding,
  payBuildingCost,
  findIncompleteBuilding,
  getTotalBedCapacity,
};
