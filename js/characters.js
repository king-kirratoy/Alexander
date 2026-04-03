// ═══════════ CHARACTERS ═══════════

/**
 * Create a new settler with randomized attributes.
 */
function createSettler(col, row, isChild) {
  const gender = Math.random() < 0.5 ? 'male' : 'female';
  const namePool = gender === 'male' ? SETTLER_NAMES_MALE : SETTLER_NAMES_FEMALE;
  const name = randPick(namePool);
  const personality = randPick(PERSONALITIES);

  const settler = {
    id: _state.nextSettlerId++,
    name: name,
    gender: gender,
    personality: personality,
    isChild: isChild || false,
    age: isChild ? 0 : 1,

    // Stats
    health: SETTLER_BASE_STATS.health,
    maxHealth: SETTLER_BASE_STATS.maxHealth,
    hunger: SETTLER_BASE_STATS.maxHunger,
    maxHunger: SETTLER_BASE_STATS.maxHunger,
    speed: SETTLER_BASE_STATS.speed + randInt(-10, 10),
    strength: SETTLER_BASE_STATS.strength + randInt(-3, 3),
    lives: SETTLER_BASE_STATS.lives,

    // Position (tile coords)
    col: col,
    row: row,
    // Position (world pixel — for smooth movement)
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,

    // AI state
    currentActivity: 'idle',
    currentPriority: AI_PRIORITY.IDLE,
    currentTask: null,       // { type: 'gathering'|'eating'|'wandering', targetId }
    aiCooldown: 0,           // ms until next AI re-evaluation
    gatherProgress: 0,       // accumulator for harvest work
    targetCol: null,
    targetRow: null,
    path: null,
    pathIndex: 0,

    // Equipment
    equippedTool: null,
    equippedWeapon: null,
    equippedShield: null,
    carrying: null, // { resource, amount }

    // Visual
    sprite: null,
    statusIcon: null,
    direction: 'down', // 'up', 'down', 'left', 'right'

    // Shelter
    shelterBuildingId: null,

    // Combat
    attackCooldown: 0,

    // Flags
    isKnockedOut: false,
    knockedOutAt: null,
    isDead: false,
  };

  // Apply personality stat modifiers
  if (personality.effect === 'maxHealth') {
    settler.maxHealth = Math.floor(settler.maxHealth * personality.mod);
    settler.health = settler.maxHealth;
  }
  if (personality.effect === 'moveSpeed') {
    settler.speed = Math.floor(settler.speed * personality.mod);
  }

  _state.settlers.push(settler);
  return settler;
}


/**
 * Spawn the initial group of settlers near the center of the map.
 */
function spawnStartingSettlers() {
  const count = randInt(STARTING_SETTLERS_MIN, STARTING_SETTLERS_MAX);
  const centerCol = Math.floor(WORLD_COLS / 2);
  const centerRow = Math.floor(WORLD_ROWS / 2);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 2;
    const col = Math.round(centerCol + Math.cos(angle) * radius);
    const row = Math.round(centerRow + Math.sin(angle) * radius);

    if (inBounds(col, row) && isWalkable(col, row)) {
      createSettler(col, row, false);
    } else {
      createSettler(centerCol, centerRow, false);
    }
  }
}


/**
 * Update all settlers (called each frame).
 */
function updateSettlers(delta) {
  for (const settler of _state.settlers) {
    if (settler.isKnockedOut) continue;

    // Drain hunger (75% reduced when sleeping)
    const hungerMod = settler.currentActivity === 'sleeping' ? 0.25 : 1;
    settler.hunger -= HUNGER_DRAIN_RATE * hungerMod * (delta / 1000);
    if (settler.personality.effect === 'hungerRate') {
      settler.hunger -= HUNGER_DRAIN_RATE * (settler.personality.mod - 1) * hungerMod * (delta / 1000);
    }
    settler.hunger = clamp(settler.hunger, 0, settler.maxHunger);

    // Starving damage
    if (settler.hunger <= 0) {
      settler.health -= HUNGER_DAMAGE_RATE * (delta / 1000);
      settler.health = clamp(settler.health, 0, settler.maxHealth);
    } else if (settler.health < settler.maxHealth && settler.hunger > 20) {
      // Regen when fed
      settler.health += HEALTH_REGEN_RATE * (delta / 1000);
      settler.health = clamp(settler.health, 0, settler.maxHealth);
    }

    // AI decision-making
    updateSettlerAI(settler, delta);

    // Move along path
    moveSettlerAlongPath(settler, delta);

    // Update tile position
    const tilePos = worldToTile(settler.x, settler.y);
    settler.col = tilePos.col;
    settler.row = tilePos.row;
  }
}


/**
 * Priority-based AI decision-making.
 * Re-evaluates when aiCooldown reaches 0 or current task completes.
 */
function updateSettlerAI(settler, delta) {
  // Count down AI cooldown
  settler.aiCooldown -= delta;

  // If currently harvesting at target, keep working
  if (settler.currentTask && settler.currentTask.type === 'gathering') {
    if (handleGathering(settler, delta)) return;
  }

  // If currently eating from forage target, keep working
  if (settler.currentTask && settler.currentTask.type === 'foraging') {
    if (handleForaging(settler, delta)) return;
  }

  // If currently building, keep working
  if (settler.currentTask && settler.currentTask.type === 'building') {
    if (handleBuilding(settler, delta)) return;
  }

  // If currently crafting, keep working
  if (settler.currentTask && settler.currentTask.type === 'crafting') {
    if (handleCrafting(settler, delta)) return;
  }

  // If sleeping, keep sleeping until dawn
  if (settler.currentTask && settler.currentTask.type === 'sleeping') {
    if (handleSleeping(settler, delta)) return;
  }

  // If guarding, keep guarding until dawn
  if (settler.currentTask && settler.currentTask.type === 'guarding') {
    if (handleGuarding(settler, delta)) return;
  }

  // If fighting, keep fighting
  if (settler.currentTask && settler.currentTask.type === 'fighting') {
    if (handleFighting(settler, delta)) return;
  }

  // If fleeing, keep fleeing
  if (settler.currentTask && settler.currentTask.type === 'fleeing') {
    if (handleFleeing(settler, delta)) return;
  }

  // If rescuing, keep rescuing
  if (settler.currentTask && settler.currentTask.type === 'rescuing') {
    if (handleRescuing(settler, delta)) return;
  }

  // If still moving toward a destination, keep going
  if (settler.path && settler.pathIndex < settler.path.length) return;

  // If cooldown hasn't elapsed, don't re-evaluate
  if (settler.aiCooldown > 0 && settler.currentTask) return;

  // ── Evaluate priorities ──────────────────────────────────────

  // Priority: FLEE (100) — unarmed settlers near enemies at night
  if (typeof isNight === 'function' && isNight() && !settler.equippedWeapon) {
    if (typeof findNearestEnemy === 'function') {
      const nearEnemy = findNearestEnemy(settler.col, settler.row, 4);
      if (nearEnemy) {
        if (typeof tryFlee === 'function') {
          tryFlee(settler);
          settler.aiCooldown = randInt(1000, 2000);
          return;
        }
      }
    }
  }

  // Priority: FIGHT (90) — armed settlers engage enemies at night
  if (typeof isNight === 'function' && isNight() && settler.equippedWeapon) {
    if (tryFight(settler)) {
      settler.aiCooldown = randInt(1000, 2000);
      return;
    }
  }

  // Priority 1: EAT (hunger < 30)
  if (settler.hunger < 30) {
    if (tryEat(settler)) {
      settler.aiCooldown = randInt(1000, 2000);
      return;
    }
  }

  // Priority: RESCUE (60) — revive knocked-out settlers
  if (typeof findKnockedOutSettler === 'function') {
    if (tryRescue(settler)) {
      settler.aiCooldown = randInt(1000, 2000);
      return;
    }
  }

  // Priority 2: SLEEP (70) — during dusk/night
  if (typeof isDusk === 'function' && (isDusk() || isNight())) {
    if (trySleep(settler)) {
      settler.aiCooldown = randInt(1000, 2000);
      return;
    }
  }

  // Priority 3: BUILD (40) — only during day/dawn
  if (typeof decideBuildPriority === 'function') {
    if (tryBuild(settler)) {
      settler.aiCooldown = randInt(1000, 2000);
      return;
    }
  }

  // Priority 3: GATHER (30)
  if (tryGather(settler)) {
    settler.aiCooldown = randInt(1000, 2000);
    return;
  }

  // Priority 4: CRAFT (20)
  if (typeof decideWhatToCraft === 'function') {
    if (tryCraft(settler)) {
      settler.aiCooldown = randInt(1000, 2000);
      return;
    }
  }

  // Priority 5: IDLE (wander)
  tryWander(settler);
  settler.aiCooldown = randInt(1000, 2000);
}


/**
 * Try to eat — from stockpile first, then forage.
 * Returns true if an action was taken.
 */
function tryEat(settler) {
  // Try stockpile first
  if (_state.resources.food > 0) {
    _state.resources.food -= 1;
    settler.hunger = clamp(settler.hunger + 40, 0, settler.maxHunger);
    settler.currentActivity = 'eating';
    settler.currentTask = { type: 'eating' };
    settler.currentPriority = AI_PRIORITY.EAT;
    settler.path = null;
    settler.pathIndex = 0;
    settler.aiCooldown = 1500; // brief pause while "eating"
    return true;
  }

  // No stockpile food — find nearest berry bush
  if (typeof findNearestResource === 'function') {
    const berryBush = findNearestResource(settler.col, settler.row, 'food');
    if (berryBush) {
      const path = findPath(settler.col, settler.row, berryBush.col, berryBush.row);
      if (path && path.length > 0) {
        settler.path = path;
        settler.pathIndex = 0;
        settler.currentTask = { type: 'foraging', targetId: berryBush.id };
        settler.currentActivity = 'walking';
        settler.currentPriority = AI_PRIORITY.EAT;
        settler.gatherProgress = 0;
        return true;
      }
    }
  }

  return false;
}


/**
 * Try to gather the most-needed resource.
 * Returns true if an action was taken.
 */
function tryGather(settler) {
  if (typeof findNearestAnyResource !== 'function') return false;

  const target = findNearestAnyResource(settler.col, settler.row);
  if (!target) return false;

  const path = findPath(settler.col, settler.row, target.col, target.row);
  if (!path || path.length === 0) return false;

  // Auto-equip best tool for this resource
  autoEquipTool(settler, target);

  settler.path = path;
  settler.pathIndex = 0;
  settler.gatherProgress = 0;
  settler.currentPriority = AI_PRIORITY.GATHER;

  // Set activity based on resource type
  const info = HARVESTABLE[target.type];
  if (info) {
    if (info.resource === 'wood') settler.currentActivity = 'walking';
    else if (info.resource === 'stone') settler.currentActivity = 'walking';
    else if (info.resource === 'food') settler.currentActivity = 'walking';
    else if (info.resource === 'iron') settler.currentActivity = 'walking';
    else settler.currentActivity = 'walking';
  } else {
    settler.currentActivity = 'walking';
  }

  settler.currentTask = { type: 'gathering', targetId: target.id };
  return true;
}


/**
 * Handle active gathering when settler is near their target.
 * Returns true if still busy (should not re-evaluate AI).
 */
function handleGathering(settler, delta) {
  const target = _state.natureObjects.find(o => o.id === settler.currentTask.targetId);

  // Target gone or depleted — clear task
  if (!target || target.depleted) {
    clearTask(settler);
    return false;
  }

  // Check if within 1 tile distance
  const d = dist(settler.col, settler.row, target.col, target.row);
  if (d > 1.5) {
    // Not close enough yet — might need a new path
    if (!settler.path || settler.pathIndex >= settler.path.length) {
      const path = findPath(settler.col, settler.row, target.col, target.row);
      if (path && path.length > 0) {
        settler.path = path;
        settler.pathIndex = 0;
      } else {
        clearTask(settler);
        return false;
      }
    }
    return true;
  }

  // We're adjacent — stop moving and harvest
  settler.path = null;
  settler.pathIndex = 0;

  // Set activity label based on resource
  const info = HARVESTABLE[target.type];
  if (info) {
    if (info.resource === 'wood') settler.currentActivity = 'chopping';
    else if (info.resource === 'stone') settler.currentActivity = 'mining';
    else if (info.resource === 'food') settler.currentActivity = 'foraging';
    else if (info.resource === 'iron') settler.currentActivity = 'mining';
  }

  // Harvest the object
  if (typeof harvestObject === 'function') {
    const justDepleted = harvestObject(target, settler, delta);
    if (justDepleted) {
      clearTask(settler);
      return false;
    }
  }

  return true;
}


/**
 * Handle active foraging (eating from a berry bush when hungry).
 * Returns true if still busy.
 */
function handleForaging(settler, delta) {
  const target = _state.natureObjects.find(o => o.id === settler.currentTask.targetId);

  if (!target || target.depleted) {
    clearTask(settler);
    return false;
  }

  // Check if within 1 tile distance
  const d = dist(settler.col, settler.row, target.col, target.row);
  if (d > 1.5) {
    if (!settler.path || settler.pathIndex >= settler.path.length) {
      const path = findPath(settler.col, settler.row, target.col, target.row);
      if (path && path.length > 0) {
        settler.path = path;
        settler.pathIndex = 0;
      } else {
        clearTask(settler);
        return false;
      }
    }
    return true;
  }

  // Adjacent — forage (harvest the bush, then eat the result)
  settler.path = null;
  settler.pathIndex = 0;
  settler.currentActivity = 'foraging';

  if (typeof harvestObject === 'function') {
    const justDepleted = harvestObject(target, settler, delta);
    if (justDepleted) {
      // Eat the food we just harvested (it was added to stockpile, consume it)
      const info = HARVESTABLE[target.type];
      if (info && _state.resources.food >= info.amount) {
        _state.resources.food -= info.amount;
        settler.hunger = clamp(settler.hunger + info.amount * 20, 0, settler.maxHunger);
      } else {
        // At least restore some hunger
        settler.hunger = clamp(settler.hunger + 40, 0, settler.maxHunger);
      }
      clearTask(settler);
      return false;
    }
  }

  return true;
}


/**
 * Try to start or continue building.
 * Returns true if an action was taken.
 */
function tryBuild(settler) {
  // Check if another settler is already building
  for (const s of _state.settlers) {
    if (s.id !== settler.id && s.currentTask && s.currentTask.type === 'building') {
      return false; // Only one builder at a time
    }
  }

  // Check for incomplete building first
  let target = typeof findIncompleteBuilding === 'function' ? findIncompleteBuilding() : null;

  if (!target) {
    // See if we need a new building
    const buildType = decideBuildPriority();
    if (!buildType) return false;
    if (typeof canAffordBuilding !== 'function' || !canAffordBuilding(buildType)) return false;

    // Find a build site
    const centerCol = Math.floor(WORLD_COLS / 2);
    const centerRow = Math.floor(WORLD_ROWS / 2);
    const site = findBuildSite(centerCol, centerRow, buildType);
    if (!site) return false;

    // Pay the cost and place the building
    payBuildingCost(buildType);
    target = createBuilding(buildType, site.col, site.row);
    if (!target) return false;
  }

  // Path to the building
  const path = findPath(settler.col, settler.row, target.col, target.row);
  if (!path || path.length === 0) {
    // Try adjacent tile
    const adjPath = findPath(settler.col, settler.row, target.col + 1, target.row);
    if (adjPath && adjPath.length > 0) {
      settler.path = adjPath;
    } else {
      return false;
    }
  } else {
    settler.path = path;
  }

  settler.pathIndex = 0;
  settler.currentTask = { type: 'building', targetId: target.id };
  settler.currentActivity = 'walking';
  settler.currentPriority = AI_PRIORITY.BUILD;
  return true;
}


/**
 * Handle active building when settler is near the target building.
 * Returns true if still busy.
 */
function handleBuilding(settler, delta) {
  const building = _state.buildings.find(b => b.id === settler.currentTask.targetId);

  if (!building || building.phase >= BUILD_PHASE.COMPLETE) {
    clearTask(settler);
    return false;
  }

  // Check if within range (adjacent to building footprint)
  const def = BUILDING_DEFS[building.type];
  let minDist = Infinity;
  if (def) {
    for (let dr = 0; dr < def.size.h; dr++) {
      for (let dc = 0; dc < def.size.w; dc++) {
        const d = dist(settler.col, settler.row, building.col + dc, building.row + dr);
        if (d < minDist) minDist = d;
      }
    }
  } else {
    minDist = dist(settler.col, settler.row, building.col, building.row);
  }

  if (minDist > 2) {
    // Need to path closer
    if (!settler.path || settler.pathIndex >= settler.path.length) {
      const path = findPath(settler.col, settler.row, building.col, building.row);
      if (path && path.length > 0) {
        settler.path = path;
        settler.pathIndex = 0;
      } else {
        clearTask(settler);
        return false;
      }
    }
    return true;
  }

  // We're close enough — stop moving and build
  settler.path = null;
  settler.pathIndex = 0;
  settler.currentActivity = 'building';

  if (typeof advanceBuild === 'function') {
    advanceBuild(building, settler, delta);
    if (building.phase >= BUILD_PHASE.COMPLETE) {
      clearTask(settler);
      return false;
    }
  }

  return true;
}


/**
 * Try to start crafting an item.
 * Returns true if an action was taken.
 */
function tryCraft(settler) {
  const recipeKey = decideWhatToCraft();
  if (!recipeKey) return false;

  const recipe = RECIPES[recipeKey];
  if (!recipe) return false;

  // Check if recipe requires a workbench — if so, walk to it
  if (recipe.tier === RECIPE_TIER.WORKBENCH || recipe.tier === RECIPE_TIER.FORGE) {
    const stationType = recipe.tier === RECIPE_TIER.FORGE ? BUILDING.FORGE : BUILDING.WORKBENCH;
    const stations = typeof getBuildingsOfType === 'function' ? getBuildingsOfType(stationType) : [];
    if (stations.length === 0) return false;

    // Find nearest station
    let nearestStation = null;
    let nearestD = Infinity;
    for (const s of stations) {
      const d = dist(settler.col, settler.row, s.col, s.row);
      if (d < nearestD) {
        nearestD = d;
        nearestStation = s;
      }
    }

    if (!nearestStation) return false;

    // If not adjacent, path to it
    if (nearestD > 2) {
      const path = findPath(settler.col, settler.row, nearestStation.col, nearestStation.row);
      if (!path || path.length === 0) return false;
      settler.path = path;
      settler.pathIndex = 0;
    }
  }

  settler.currentTask = { type: 'crafting', recipeKey: recipeKey, progress: 0 };
  settler.currentActivity = 'walking';
  settler.currentPriority = AI_PRIORITY.CRAFT;
  return true;
}


/**
 * Handle active crafting. Settler spends a few seconds, then produces the item.
 * Returns true if still busy.
 */
function handleCrafting(settler, delta) {
  const task = settler.currentTask;
  const recipe = RECIPES[task.recipeKey];

  if (!recipe) {
    clearTask(settler);
    return false;
  }

  // If recipe needs a station and we're not near it, keep walking
  if (recipe.tier === RECIPE_TIER.WORKBENCH || recipe.tier === RECIPE_TIER.FORGE) {
    const stationType = recipe.tier === RECIPE_TIER.FORGE ? BUILDING.FORGE : BUILDING.WORKBENCH;
    const stations = typeof getBuildingsOfType === 'function' ? getBuildingsOfType(stationType) : [];
    let nearStation = false;
    for (const s of stations) {
      if (dist(settler.col, settler.row, s.col, s.row) <= 2) {
        nearStation = true;
        break;
      }
    }
    if (!nearStation) {
      if (settler.path && settler.pathIndex < settler.path.length) return true;
      // Lost our way — give up
      clearTask(settler);
      return false;
    }
  }

  // We're in position — stop and craft
  settler.path = null;
  settler.pathIndex = 0;
  settler.currentActivity = 'crafting';

  // Accumulate crafting progress (takes ~3 seconds)
  let craftSpeed = 1;
  if (settler.personality.effect === 'workSpeed') {
    craftSpeed = settler.personality.mod;
  }
  task.progress += craftSpeed * (delta / 1000);

  if (task.progress >= 3) {
    // Check we can still afford it
    if (typeof canAffordRecipe === 'function' && canAffordRecipe(task.recipeKey)) {
      if (typeof craftItem === 'function') {
        craftItem(task.recipeKey);
      }
    }
    clearTask(settler);
    return false;
  }

  return true;
}


/**
 * Auto-equip the best available tool for a gather task.
 */
function autoEquipTool(settler, natureObj) {
  if (typeof findBestTool !== 'function') return;

  const info = HARVESTABLE[natureObj.type];
  if (!info || !info.tool) return;

  const best = findBestTool(info.tool);
  if (best) {
    settler.equippedTool = best;
  }
}


/**
 * Wander randomly (fallback idle behavior).
 */
function tryWander(settler) {
  if (Math.random() < 0.3) {
    const wanderRadius = 6;
    const targetCol = settler.col + randInt(-wanderRadius, wanderRadius);
    const targetRow = settler.row + randInt(-wanderRadius, wanderRadius);

    if (inBounds(targetCol, targetRow) && isWalkable(targetCol, targetRow)) {
      const path = findPath(settler.col, settler.row, targetCol, targetRow);
      if (path && path.length > 0) {
        settler.path = path;
        settler.pathIndex = 0;
        settler.currentActivity = 'walking';
        settler.currentTask = { type: 'wandering' };
        settler.currentPriority = AI_PRIORITY.IDLE;
        return;
      }
    }
  }

  settler.currentActivity = 'idle';
  settler.currentTask = null;
  settler.currentPriority = AI_PRIORITY.IDLE;
}


/**
 * Try to find shelter and sleep during dusk/night.
 * Armed settlers guard instead. Returns true if action taken.
 */
function trySleep(settler) {
  // Armed settlers guard instead of sleeping
  if (settler.equippedWeapon) {
    return tryGuard(settler);
  }

  // Find nearest shelter (hut or house) with available capacity
  let bestBuilding = null;
  let bestDist = Infinity;

  for (const b of _state.buildings) {
    if (b.phase < BUILD_PHASE.COMPLETE) continue;
    const def = BUILDING_DEFS[b.type];
    if (!def || def.capacity <= 0) continue;
    if (!def.provides || !def.provides.includes('shelter')) continue;

    // Check if there's room
    if (b.occupants.length >= def.capacity) continue;

    const d = dist(settler.col, settler.row, b.col, b.row);
    if (d < bestDist) {
      bestDist = d;
      bestBuilding = b;
    }
  }

  if (bestBuilding) {
    // Path to the building
    const path = findPath(settler.col, settler.row, bestBuilding.col, bestBuilding.row);
    if (path && path.length > 0) {
      settler.path = path;
      settler.pathIndex = 0;
    }
    settler.currentTask = { type: 'sleeping', targetId: bestBuilding.id };
    settler.currentActivity = 'walking';
    settler.currentPriority = AI_PRIORITY.SLEEP;
    return true;
  }

  // No shelter — stay near campfire
  const campfires = _state.buildings.filter(b =>
    b.type === BUILDING.CAMPFIRE && b.phase >= BUILD_PHASE.COMPLETE
  );
  if (campfires.length > 0) {
    const fire = campfires[0];
    const d = dist(settler.col, settler.row, fire.col, fire.row);
    if (d > 3) {
      const path = findPath(settler.col, settler.row, fire.col, fire.row);
      if (path && path.length > 0) {
        settler.path = path;
        settler.pathIndex = 0;
      }
    }
    settler.currentTask = { type: 'sleeping', targetId: null };
    settler.currentActivity = 'sleeping';
    settler.currentPriority = AI_PRIORITY.SLEEP;
    return true;
  }

  return false;
}


/**
 * Handle sleeping — settler stays in building until dawn.
 * Returns true if still sleeping.
 */
function handleSleeping(settler, delta) {
  // Wake up at dawn
  if (typeof isDawn === 'function' && isDawn()) {
    wakeSettler(settler);
    return false;
  }

  // If still walking to shelter, keep going
  if (settler.path && settler.pathIndex < settler.path.length) {
    return true;
  }

  // Arrived at shelter — enter building
  if (settler.currentTask.targetId && !settler.shelterBuildingId) {
    const building = _state.buildings.find(b => b.id === settler.currentTask.targetId);
    if (building) {
      const def = BUILDING_DEFS[building.type];
      if (def && building.occupants.length < def.capacity) {
        building.occupants.push(settler.id);
        settler.shelterBuildingId = building.id;
      }
    }
  }

  settler.currentActivity = 'sleeping';
  settler.path = null;
  settler.pathIndex = 0;
  return true;
}


/**
 * Wake a settler from sleep — remove from building occupants.
 */
function wakeSettler(settler) {
  if (settler.shelterBuildingId) {
    const building = _state.buildings.find(b => b.id === settler.shelterBuildingId);
    if (building) {
      building.occupants = building.occupants.filter(id => id !== settler.id);
    }
    settler.shelterBuildingId = null;
  }
  clearTask(settler);
}


/**
 * Try to guard the settlement perimeter (armed settlers during night).
 */
function tryGuard(settler) {
  // Patrol near the settlement center
  const centerCol = Math.floor(WORLD_COLS / 2);
  const centerRow = Math.floor(WORLD_ROWS / 2);
  const patrolRadius = 8;
  const targetCol = centerCol + randInt(-patrolRadius, patrolRadius);
  const targetRow = centerRow + randInt(-patrolRadius, patrolRadius);

  if (inBounds(targetCol, targetRow) && isWalkable(targetCol, targetRow)) {
    const path = findPath(settler.col, settler.row, targetCol, targetRow);
    if (path && path.length > 0) {
      settler.path = path;
      settler.pathIndex = 0;
    }
  }

  settler.currentTask = { type: 'guarding' };
  settler.currentActivity = 'guarding';
  settler.currentPriority = AI_PRIORITY.SLEEP;
  return true;
}


/**
 * Handle guarding — patrol until dawn. Engage enemies if found.
 * Returns true if still guarding.
 */
function handleGuarding(settler, delta) {
  // Stop guarding at dawn
  if (typeof isDawn === 'function' && isDawn()) {
    clearTask(settler);
    return false;
  }

  // Check for nearby enemies — guards should engage
  if (typeof findNearestEnemy === 'function' && settler.equippedWeapon) {
    const enemy = findNearestEnemy(settler.col, settler.row, 5);
    if (enemy) {
      clearTask(settler);
      settler.aiCooldown = 0; // re-evaluate immediately → will pick FIGHT
      return false;
    }
  }

  // If done with current patrol path, pick a new patrol point
  if (!settler.path || settler.pathIndex >= settler.path.length) {
    settler.aiCooldown = 0;
    return false; // Let AI re-evaluate (will pick trySleep → tryGuard again)
  }

  return true;
}


/**
 * Try to fight the nearest enemy (armed settlers only).
 * Returns true if action taken.
 */
function tryFight(settler) {
  if (typeof findNearestEnemy !== 'function') return false;
  if (!settler.equippedWeapon) {
    // Try to equip a weapon from inventory
    if (typeof findBestWeapon === 'function') {
      const weapon = findBestWeapon();
      if (weapon) {
        settler.equippedWeapon = weapon;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  const enemy = findNearestEnemy(settler.col, settler.row, 5);
  if (!enemy) return false;

  const path = findPath(settler.col, settler.row, enemy.col, enemy.row);
  if (path && path.length > 0) {
    settler.path = path;
    settler.pathIndex = 0;
  }

  settler.currentTask = { type: 'fighting', targetId: enemy.id };
  settler.currentActivity = 'fighting';
  settler.currentPriority = AI_PRIORITY.FIGHT;
  if (!settler.attackCooldown) settler.attackCooldown = 0;
  return true;
}


/**
 * Handle fighting — settler attacks adjacent enemy.
 * Returns true if still busy.
 */
function handleFighting(settler, delta) {
  // If it's no longer night, stop fighting
  if (typeof isNight === 'function' && !isNight()) {
    clearTask(settler);
    return false;
  }

  const enemy = _state.enemies.find(e => e.id === settler.currentTask.targetId && !e.isDead);
  if (!enemy) {
    // Target dead — look for another
    clearTask(settler);
    return false;
  }

  const d = dist(settler.col, settler.row, enemy.col, enemy.row);
  if (d <= 1.5) {
    // Adjacent — attack
    settler.path = null;
    settler.pathIndex = 0;
    settler.currentActivity = 'fighting';
    if (typeof processSettlerAttack === 'function') {
      processSettlerAttack(settler, enemy, delta);
    }
    return true;
  }

  // Not adjacent — path to enemy
  if (!settler.path || settler.pathIndex >= settler.path.length) {
    const path = findPath(settler.col, settler.row, enemy.col, enemy.row);
    if (path && path.length > 0) {
      settler.path = path;
      settler.pathIndex = 0;
    } else {
      clearTask(settler);
      return false;
    }
  }

  return true;
}


/**
 * Handle fleeing — settler runs to building.
 * Returns true if still busy.
 */
function handleFleeing(settler, delta) {
  // If no more enemies nearby, stop fleeing
  if (typeof findNearestEnemy === 'function') {
    const nearEnemy = findNearestEnemy(settler.col, settler.row, 6);
    if (!nearEnemy) {
      clearTask(settler);
      return false;
    }
  }

  // If it's no longer night, stop fleeing
  if (typeof isNight === 'function' && !isNight()) {
    clearTask(settler);
    return false;
  }

  // If still moving, keep going
  if (settler.path && settler.pathIndex < settler.path.length) {
    return true;
  }

  // Arrived or no path — re-evaluate
  clearTask(settler);
  return false;
}


/**
 * Try to rescue a knocked-out settler.
 * Returns true if action taken.
 */
function tryRescue(settler) {
  if (settler.isKnockedOut) return false;
  if (settler.currentActivity === 'fighting') return false;

  const knockedOut = findKnockedOutSettler();
  if (!knockedOut) return false;

  // Check if someone else is already rescuing this settler
  for (const s of _state.settlers) {
    if (s.id !== settler.id && s.currentTask && s.currentTask.type === 'rescuing' && s.currentTask.targetId === knockedOut.id) {
      return false;
    }
  }

  const path = findPath(settler.col, settler.row, knockedOut.col, knockedOut.row);
  if (path && path.length > 0) {
    settler.path = path;
    settler.pathIndex = 0;
  }

  settler.currentTask = { type: 'rescuing', targetId: knockedOut.id, progress: 0 };
  settler.currentActivity = 'walking';
  settler.currentPriority = AI_PRIORITY.RESCUE;
  return true;
}


/**
 * Handle rescuing — settler revives knocked-out settler.
 * Returns true if still busy.
 */
function handleRescuing(settler, delta) {
  const knockedOut = _state.settlers.find(s => s.id === settler.currentTask.targetId && s.isKnockedOut);
  if (!knockedOut) {
    clearTask(settler);
    return false;
  }

  if (typeof processRescue === 'function') {
    const stillRescuing = processRescue(settler, knockedOut, delta);
    if (!stillRescuing) {
      clearTask(settler);
      return false;
    }
  }

  // If still walking to knocked-out settler
  if (settler.path && settler.pathIndex < settler.path.length) {
    return true;
  }

  return true;
}


/**
 * Clear a settler's current task and reset to idle.
 */
function clearTask(settler) {
  settler.currentTask = null;
  settler.currentActivity = 'idle';
  settler.currentPriority = AI_PRIORITY.IDLE;
  settler.gatherProgress = 0;
  settler.aiCooldown = 0; // re-evaluate immediately
}


/**
 * Move a settler along their current path.
 */
function moveSettlerAlongPath(settler, delta) {
  if (!settler.path || settler.pathIndex >= settler.path.length) {
    // Only set idle if not actively gathering/foraging
    if (!settler.currentTask || settler.currentTask.type === 'wandering') {
      if (settler.currentActivity === 'walking') {
        settler.currentActivity = 'idle';
      }
    }
    return;
  }

  const target = settler.path[settler.pathIndex];
  const targetX = target.x * TILE_SIZE + TILE_SIZE / 2;
  const targetY = target.y * TILE_SIZE + TILE_SIZE / 2;

  const dx = targetX - settler.x;
  const dy = targetY - settler.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 4) {
    // Reached this waypoint
    settler.x = targetX;
    settler.y = targetY;
    settler.pathIndex++;
    return;
  }

  // Move toward target
  const speed = settler.speed * (delta / 1000);
  const moveX = (dx / distance) * speed;
  const moveY = (dy / distance) * speed;

  settler.x += moveX;
  settler.y += moveY;

  // Update facing direction
  if (Math.abs(dx) > Math.abs(dy)) {
    settler.direction = dx > 0 ? 'right' : 'left';
  } else {
    settler.direction = dy > 0 ? 'down' : 'up';
  }
}


/**
 * Get a settler by ID.
 */
function getSettlerById(id) {
  return _state.settlers.find(s => s.id === id);
}


// ── Public API ────────────────────────────────────────────────
window.AX.characters = {
  createSettler,
  spawnStartingSettlers,
  updateSettlers,
  getSettlerById,
};
