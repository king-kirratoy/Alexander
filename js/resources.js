// ═══════════ RESOURCES ═══════════

// Resource type to nature object type mapping
const RESOURCE_TO_NATURE = {
  wood: ['tree_small', 'tree_large', 'tree_pine', 'tree_autumn'],
  stone: ['rock_small', 'rock_large'],
  food: ['bush_berry'],
  iron: ['iron_ore'],
};


/**
 * Find the nearest non-depleted harvestable nature object matching a resource type.
 * Returns the object or null.
 */
function findNearestResource(col, row, resourceType) {
  const validTypes = RESOURCE_TO_NATURE[resourceType];
  if (!validTypes) return null;

  let nearest = null;
  let nearestDist = Infinity;

  for (const obj of _state.natureObjects) {
    if (obj.depleted) continue;
    if (!validTypes.includes(obj.type)) continue;
    if (!HARVESTABLE[obj.type]) continue;

    const d = dist(col, row, obj.col, obj.row);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = obj;
    }
  }

  return nearest;
}


/**
 * Find the nearest harvestable object of whichever resource is most needed.
 * Factors in both stockpile levels and how many settlers are already gathering
 * each type, so settlers spread across different resources instead of clustering.
 * Skips fiber since it's not harvestable.
 */
function findNearestAnyResource(col, row, gatherCounts) {
  const gatherableTypes = ['wood', 'stone', 'food', 'iron'];

  // Score each resource type: lower = more needed
  // Combine stockpile count with active gatherer count as a penalty
  const counts = gatherCounts || {};
  const scored = gatherableTypes.map(type => {
    const stockpile = _state.resources[type] || 0;
    const gatherers = counts[type] || 0;
    // Penalize types that 2+ settlers are already gathering
    const gathererPenalty = gatherers >= 2 ? gatherers * 15 : 0;
    return { type, score: stockpile + gathererPenalty };
  });

  // Sort by lowest score (most needed)
  scored.sort((a, b) => a.score - b.score);

  // Try each resource type starting from most needed
  for (const entry of scored) {
    const obj = findNearestResource(col, row, entry.type);
    if (obj) return obj;
  }

  return null;
}


/**
 * Harvest a nature object over time. Reduces HP based on settler strength and tool.
 * When HP reaches 0, marks depleted, adds resources to stockpile, sets regrow timer.
 * Returns true if the object was just depleted this call.
 */
function harvestObject(natureObj, settler, delta) {
  const info = HARVESTABLE[natureObj.type];
  if (!info || natureObj.depleted) return false;

  // Base harvest rate: strength per second
  let harvestPower = settler.strength;

  // Tool bonus: if settler has the right tool, multiply power
  // Multiplier of 8 gives: wooden axe ~3s, stone axe ~2s, iron axe ~1.5s on small tree
  if (settler.equippedTool && settler.equippedTool.subtype === info.tool) {
    harvestPower += settler.equippedTool.power * 8;
  }

  // Personality: workSpeed affects harvest rate
  if (settler.personality.effect === 'workSpeed') {
    harvestPower *= settler.personality.mod;
  }
  // Gentle personality: gatherBonus
  if (settler.personality.effect === 'gatherBonus') {
    harvestPower *= settler.personality.mod;
  }

  const damage = harvestPower * (delta / 1000);
  natureObj.hp -= damage;

  if (natureObj.hp <= 0) {
    natureObj.hp = 0;
    natureObj.depleted = true;

    // Add resources to stockpile
    _state.resources[info.resource] = (_state.resources[info.resource] || 0) + info.amount;

    // Queue floating text for visual feedback
    if (!_state._floatingTextQueue) _state._floatingTextQueue = [];
    const worldPos = tileToWorld(natureObj.col, natureObj.row);
    _state._floatingTextQueue.push({
      x: worldPos.x,
      y: worldPos.y,
      resource: info.resource,
      amount: info.amount,
    });

    // Set regrow timer if applicable
    if (info.regrows && info.regrowTime) {
      natureObj.regrowAt = Date.now() + info.regrowTime;
    }

    return true;
  }

  return false;
}


/**
 * Check depleted nature objects and restore them if their regrow timer has elapsed.
 */
function updateNatureObjects(currentTime) {
  for (const obj of _state.natureObjects) {
    if (!obj.depleted) continue;
    if (obj.regrowAt === null) continue;
    if (currentTime < obj.regrowAt) continue;

    // Regrow this object
    const info = HARVESTABLE[obj.type];
    if (info) {
      obj.hp = info.hp;
    } else {
      obj.hp = obj.maxHp;
    }
    obj.depleted = false;
    obj.regrowAt = null;
  }
}


/**
 * Update farms — completed farms passively generate food during daytime.
 * foodRate is per second (0.05 = 1 food every 20 seconds per farm).
 */
function updateFarms(delta) {
  // Only produce food during daytime
  if (typeof isNight === 'function' && isNight()) return;
  if (typeof isDusk === 'function' && isDusk()) return;

  for (const b of _state.buildings) {
    if (b.type !== BUILDING.FARM) continue;
    if (b.phase < BUILD_PHASE.COMPLETE) continue;

    const def = BUILDING_DEFS[b.type];
    if (!def || !def.foodRate) continue;

    _state.resources.food += def.foodRate * (delta / 1000);
  }
}


// ── Public API ────────────────────────────────────────────────
window.AX.resources = {
  findNearestResource,
  findNearestAnyResource,
  harvestObject,
  updateNatureObjects,
  updateFarms,
};
