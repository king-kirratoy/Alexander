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

    // Flags
    isKnockedOut: false,
    knockedOutAt: null,
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

    // Drain hunger
    settler.hunger -= HUNGER_DRAIN_RATE * (delta / 1000);
    if (settler.personality.effect === 'hungerRate') {
      settler.hunger -= HUNGER_DRAIN_RATE * (settler.personality.mod - 1) * (delta / 1000);
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

  // If still moving toward a destination, keep going
  if (settler.path && settler.pathIndex < settler.path.length) return;

  // If cooldown hasn't elapsed, don't re-evaluate
  if (settler.aiCooldown > 0 && settler.currentTask) return;

  // ── Evaluate priorities ──────────────────────────────────────

  // Priority 1: EAT (hunger < 30)
  if (settler.hunger < 30) {
    if (tryEat(settler)) {
      settler.aiCooldown = randInt(1000, 2000);
      return;
    }
  }

  // Priority 2: GATHER (find most-needed resource)
  if (tryGather(settler)) {
    settler.aiCooldown = randInt(1000, 2000);
    return;
  }

  // Priority 3: IDLE (wander)
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
