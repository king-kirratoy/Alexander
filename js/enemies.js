// ═══════════ ENEMIES ═══════════

/**
 * Spawn enemies when NIGHT phase begins.
 * Called once per night transition, not every frame.
 */
function spawnEnemies() {
  const pop = _state.settlers.filter(s => !s.isDead).length;
  if (pop < 3) return;

  // Night 1-3: very easy (1-2 enemies). By night 10: challenging but manageable.
  // Scale with both day number and population.
  const day = _state.dayNumber || 1;
  let minCount, maxCount;
  if (day <= 3) {
    minCount = 1; maxCount = 2; // Very easy early nights
  } else if (day <= 6) {
    minCount = 2; maxCount = 3;
  } else if (day <= 10) {
    minCount = 2; maxCount = Math.min(5, 2 + Math.floor(pop / 4));
  } else {
    // Late game scales with population
    minCount = 3; maxCount = Math.min(8, 3 + Math.floor(pop / 3));
  }

  const count = randInt(minCount, maxCount);

  // Determine available enemy types based on day number
  const availableTypes = [ENEMY_TYPE.ZOMBIE];
  if (day >= 5) availableTypes.push(ENEMY_TYPE.SKELETON);
  if (day >= 10) availableTypes.push(ENEMY_TYPE.WOLF);

  for (let i = 0; i < count; i++) {
    const type = randPick(availableTypes);
    const spawnTile = findEdgeSpawnTile();
    if (!spawnTile) continue;

    const def = ENEMY_DEFS[type];
    const worldPos = tileToWorld(spawnTile.col, spawnTile.row);

    const enemy = {
      id: _state.nextEnemyId++,
      type: type,
      hp: def.hp,
      maxHp: def.hp,
      damage: def.damage,
      speed: def.speed,
      col: spawnTile.col,
      row: spawnTile.row,
      x: worldPos.x,
      y: worldPos.y,
      path: null,
      pathIndex: 0,
      targetSettler: null,
      targetBuilding: null,
      sprite: null,
      isDead: false,
      pathCooldown: 0,
      attackCooldown: 0,
    };

    _state.enemies.push(enemy);
  }
}


/**
 * Find a walkable tile along a random map edge for enemy spawning.
 * Tries up to 4 edges if no walkable tile found on the first pick.
 */
function findEdgeSpawnTile() {
  const edges = shuffle(['top', 'bottom', 'left', 'right']);

  for (const edge of edges) {
    const attempts = 20;
    for (let i = 0; i < attempts; i++) {
      let col, row;
      if (edge === 'top') {
        col = randInt(0, WORLD_COLS - 1);
        row = 0;
      } else if (edge === 'bottom') {
        col = randInt(0, WORLD_COLS - 1);
        row = WORLD_ROWS - 1;
      } else if (edge === 'left') {
        col = 0;
        row = randInt(0, WORLD_ROWS - 1);
      } else {
        col = WORLD_COLS - 1;
        row = randInt(0, WORLD_ROWS - 1);
      }

      if (isWalkable(col, row)) {
        return { col, row };
      }
    }
  }

  return null;
}


/**
 * Update all enemies each frame during night.
 */
function updateEnemies(delta) {
  for (const enemy of _state.enemies) {
    if (enemy.isDead) continue;

    // Decrement cooldowns
    enemy.pathCooldown -= delta;
    enemy.attackCooldown -= delta;

    // Find a target if we don't have one or target is gone
    if (!hasValidTarget(enemy)) {
      findEnemyTarget(enemy);
    }

    // Re-pathfind on cooldown
    if (enemy.pathCooldown <= 0) {
      pathfindToTarget(enemy);
      enemy.pathCooldown = randInt(2000, 3000);
    }

    // Move along path
    moveEnemyAlongPath(enemy, delta);

    // Update tile position
    const tilePos = worldToTile(enemy.x, enemy.y);
    enemy.col = tilePos.col;
    enemy.row = tilePos.row;
  }
}


/**
 * Check if enemy has a valid living target.
 */
function hasValidTarget(enemy) {
  if (enemy.targetSettler) {
    const settler = _state.settlers.find(s => s.id === enemy.targetSettler);
    if (settler && !settler.isKnockedOut) return true;
    enemy.targetSettler = null;
  }
  if (enemy.targetBuilding) {
    const building = _state.buildings.find(b => b.id === enemy.targetBuilding);
    if (building) return true;
    enemy.targetBuilding = null;
  }
  return false;
}


/**
 * Find the nearest settler or building for this enemy to target.
 */
function findEnemyTarget(enemy) {
  // Prefer targeting settlers
  let bestSettler = null;
  let bestSettlerDist = Infinity;

  for (const settler of _state.settlers) {
    if (settler.isKnockedOut) continue;
    const d = dist(enemy.col, enemy.row, settler.col, settler.row);
    if (d < bestSettlerDist) {
      bestSettlerDist = d;
      bestSettler = settler;
    }
  }

  if (bestSettler) {
    enemy.targetSettler = bestSettler.id;
    enemy.targetBuilding = null;
    return;
  }

  // No settlers available — target a building
  let bestBuilding = null;
  let bestBuildingDist = Infinity;

  for (const building of _state.buildings) {
    if (building.phase < BUILD_PHASE.COMPLETE) continue;
    const d = dist(enemy.col, enemy.row, building.col, building.row);
    if (d < bestBuildingDist) {
      bestBuildingDist = d;
      bestBuilding = building;
    }
  }

  if (bestBuilding) {
    enemy.targetBuilding = bestBuilding.id;
    enemy.targetSettler = null;
  }
}


/**
 * Pathfind toward the enemy's current target.
 * If path is blocked (e.g., by walls), target the nearest wall instead.
 */
function pathfindToTarget(enemy) {
  let targetCol, targetRow;

  if (enemy.targetSettler) {
    const settler = _state.settlers.find(s => s.id === enemy.targetSettler);
    if (settler) {
      targetCol = settler.col;
      targetRow = settler.row;
    }
  } else if (enemy.targetBuilding) {
    const building = _state.buildings.find(b => b.id === enemy.targetBuilding);
    if (building) {
      targetCol = building.col;
      targetRow = building.row;
    }
  }

  if (targetCol === undefined) return;

  const path = findPath(enemy.col, enemy.row, targetCol, targetRow);
  if (path && path.length > 0) {
    enemy.path = path;
    enemy.pathIndex = 0;
  } else {
    // Path blocked — look for a wall/building to attack
    let nearestWall = null;
    let nearestWallDist = Infinity;
    for (const b of _state.buildings) {
      const def = BUILDING_DEFS[b.type];
      if (!def || !def.provides || !def.provides.includes('defense')) continue;
      const d = dist(enemy.col, enemy.row, b.col, b.row);
      if (d < nearestWallDist) {
        nearestWallDist = d;
        nearestWall = b;
      }
    }
    if (nearestWall) {
      enemy.targetBuilding = nearestWall.id;
      enemy.targetSettler = null;
      // Try to path adjacent to the wall
      const wallPath = findPath(enemy.col, enemy.row, nearestWall.col, nearestWall.row);
      if (wallPath && wallPath.length > 0) {
        enemy.path = wallPath;
        enemy.pathIndex = 0;
      }
    }
  }
}


/**
 * Move an enemy along their current path.
 */
function moveEnemyAlongPath(enemy, delta) {
  if (!enemy.path || enemy.pathIndex >= enemy.path.length) return;

  const target = enemy.path[enemy.pathIndex];
  const targetX = target.x * TILE_SIZE + TILE_SIZE / 2;
  const targetY = target.y * TILE_SIZE + TILE_SIZE / 2;

  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 4) {
    enemy.x = targetX;
    enemy.y = targetY;
    enemy.pathIndex++;
    return;
  }

  const speed = enemy.speed * (delta / 1000);
  enemy.x += (dx / distance) * speed;
  enemy.y += (dy / distance) * speed;
}


/**
 * Remove dead enemies from state.
 */
function removeDeadEnemies() {
  _state.enemies = _state.enemies.filter(e => !e.isDead);
}


/**
 * Despawn all enemies at dawn. Mark as dead and clean up.
 */
function despawnAllEnemies() {
  for (const enemy of _state.enemies) {
    enemy.isDead = true;
  }
  removeDeadEnemies();
}


/**
 * Find an enemy at a given tile position.
 */
function getEnemyAt(col, row) {
  return _state.enemies.find(e => !e.isDead && e.col === col && e.row === row) || null;
}


// ── Public API ────────────────────────────────────────────────
window.AX.enemies = {
  spawnEnemies,
  updateEnemies,
  removeDeadEnemies,
  despawnAllEnemies,
  getEnemyAt,
};
