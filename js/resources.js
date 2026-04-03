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
 * Find the nearest harvestable object of whichever resource is most needed
 * (lowest count in _state.resources). Skips fiber since it's not harvestable.
 */
function findNearestAnyResource(col, row) {
  const gatherableTypes = ['wood', 'stone', 'food', 'iron'];

  // Sort by lowest stockpile count
  const sorted = gatherableTypes.slice().sort((a, b) => _state.resources[a] - _state.resources[b]);

  // Try each resource type starting from most needed
  for (const resType of sorted) {
    const obj = findNearestResource(col, row, resType);
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
  if (settler.equippedTool && settler.equippedTool.subtype === info.tool) {
    harvestPower += settler.equippedTool.power * 5;
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


// ── Public API ────────────────────────────────────────────────
window.AX.resources = {
  findNearestResource,
  findNearestAnyResource,
  harvestObject,
  updateNatureObjects,
};
