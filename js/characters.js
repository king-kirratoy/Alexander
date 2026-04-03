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
 * Phase 1: simple random wandering.
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

    // Simple AI: random wander for Phase 1
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
 * Basic AI decision-making.
 * Phase 1: just wander randomly.
 */
function updateSettlerAI(settler, delta) {
  // If already moving toward a target, keep going
  if (settler.path && settler.pathIndex < settler.path.length) return;

  // Pick a random nearby walkable tile to wander to
  if (Math.random() < 0.02) { // ~2% chance per frame to pick new target
    const wanderRadius = 6;
    const targetCol = settler.col + randInt(-wanderRadius, wanderRadius);
    const targetRow = settler.row + randInt(-wanderRadius, wanderRadius);

    if (inBounds(targetCol, targetRow) && isWalkable(targetCol, targetRow)) {
      const path = findPath(settler.col, settler.row, targetCol, targetRow);
      if (path && path.length > 0) {
        settler.path = path;
        settler.pathIndex = 0;
        settler.currentActivity = 'walking';
      }
    }
  }
}


/**
 * Move a settler along their current path.
 */
function moveSettlerAlongPath(settler, delta) {
  if (!settler.path || settler.pathIndex >= settler.path.length) {
    settler.currentActivity = 'idle';
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
