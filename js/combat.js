// ═══════════ COMBAT ═══════════

/**
 * Process a settler attacking an enemy.
 * Settler must be adjacent (within 1.5 tiles) and cooldown must be ready.
 */
function processSettlerAttack(settler, enemy, delta) {
  if (!settler.attackCooldown) settler.attackCooldown = 0;
  settler.attackCooldown -= delta;
  if (settler.attackCooldown > 0) return;

  // Calculate damage: base strength + weapon power
  let damage = settler.strength;
  if (settler.equippedWeapon) {
    damage += settler.equippedWeapon.power;
  }

  enemy.hp -= damage;
  settler.attackCooldown = 1000; // 1 second cooldown
  if (typeof playSound === 'function') playSound('hit');

  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.isDead = true;
    if (typeof playSound === 'function') playSound('enemyDeath');
  }
}


/**
 * Process an enemy attacking a settler or building.
 * Enemy must be adjacent and cooldown must be ready.
 */
function processEnemyAttack(enemy, target, delta) {
  enemy.attackCooldown -= delta;
  if (enemy.attackCooldown > 0) return;

  const damage = enemy.damage;
  enemy.attackCooldown = 1500; // 1.5 second cooldown

  if (target.health !== undefined) {
    // Target is a settler
    target.health -= damage;
    target.health = clamp(target.health, 0, target.maxHealth);
    if (typeof playSound === 'function') playSound('settlerHurt');
    if (target.health <= 0) {
      checkSettlerKnockout(target);
    }
  } else if (target.hp !== undefined) {
    // Target is a building
    target.hp -= damage;
    if (target.hp <= 0) {
      target.hp = 0;
      destroyBuilding(target);
    }
  }
}


/**
 * Check if a settler should be knocked out or permanently die.
 */
function checkSettlerKnockout(settler) {
  if (settler.lives > 1) {
    settler.isKnockedOut = true;
    settler.knockedOutAt = Date.now();
    settler.lives -= 1;
    settler.currentTask = null;
    settler.path = null;
    settler.pathIndex = 0;
    settler.currentActivity = 'knockedOut';
    settler.currentPriority = AI_PRIORITY.IDLE;
  } else {
    // Permadeath
    settlerPermadeath(settler);
  }
}


/**
 * Permanently remove a settler from the game.
 */
function settlerPermadeath(settler) {
  settler.isDead = true;
  settler.currentActivity = 'dead';
  if (typeof playSound === 'function') playSound('settlerDeath');

  // Remove from any building occupants
  if (settler.shelterBuildingId) {
    const building = _state.buildings.find(b => b.id === settler.shelterBuildingId);
    if (building) {
      building.occupants = building.occupants.filter(id => id !== settler.id);
    }
  }

  // Store name for death notification before removal
  settler._deathName = settler.name;

  // Remove from settlers array
  _state.settlers = _state.settlers.filter(s => s.id !== settler.id);
}


/**
 * Process a rescue of a knocked-out settler by an adjacent rescuer.
 * Takes 3 seconds to complete. Returns true if rescue is still in progress.
 */
function processRescue(rescuer, knockedOut, delta) {
  if (!rescuer.currentTask || rescuer.currentTask.type !== 'rescuing') return false;

  // Check adjacency
  const d = dist(rescuer.col, rescuer.row, knockedOut.col, knockedOut.row);
  if (d > 1.5) return true; // still walking, not rescuing yet

  // Stop moving and rescue
  rescuer.path = null;
  rescuer.pathIndex = 0;
  rescuer.currentActivity = 'rescuing';

  rescuer.currentTask.progress = (rescuer.currentTask.progress || 0) + (delta / 1000);

  if (rescuer.currentTask.progress >= 3) {
    // Rescue complete
    knockedOut.isKnockedOut = false;
    knockedOut.knockedOutAt = null;
    knockedOut.health = 20;
    knockedOut.currentActivity = 'idle';
    knockedOut.currentTask = null;
    knockedOut.currentPriority = AI_PRIORITY.IDLE;
    return false; // rescue done
  }

  return true; // still rescuing
}


/**
 * Destroy a building — remove from state when hp <= 0.
 */
function destroyBuilding(building) {
  // Remove occupants first
  for (const occupantId of building.occupants) {
    const settler = _state.settlers.find(s => s.id === occupantId);
    if (settler) {
      settler.shelterBuildingId = null;
      if (settler.currentActivity === 'sleeping') {
        settler.currentActivity = 'idle';
        settler.currentTask = null;
      }
    }
  }
  _state.buildings = _state.buildings.filter(b => b.id !== building.id);
}


/**
 * Main combat update — runs each frame during night.
 */
function updateCombat(delta) {
  if (typeof isNight !== 'function' || !isNight()) return;

  // Process armed settlers fighting enemies
  for (const settler of _state.settlers) {
    if (settler.isKnockedOut) continue;
    if (settler.currentActivity === 'sleeping') continue;

    // Armed settler — engage nearby enemies
    if (settler.equippedWeapon) {
      const nearestEnemy = findNearestEnemy(settler.col, settler.row, 5);
      if (nearestEnemy) {
        const d = dist(settler.col, settler.row, nearestEnemy.col, nearestEnemy.row);
        if (d <= 1.5) {
          // Adjacent — attack
          processSettlerAttack(settler, nearestEnemy, delta);
          settler.currentActivity = 'fighting';
        }
      }
    } else {
      // Unarmed settler — check for nearby enemies to flee from
      const nearestEnemy = findNearestEnemy(settler.col, settler.row, 4);
      if (nearestEnemy && settler.currentActivity !== 'fleeing') {
        tryFlee(settler);
      }
    }
  }

  // Process enemy attacks on adjacent targets
  for (const enemy of _state.enemies) {
    if (enemy.isDead) continue;

    // Check for adjacent settlers
    if (enemy.targetSettler) {
      const settler = _state.settlers.find(s => s.id === enemy.targetSettler);
      if (settler && !settler.isKnockedOut) {
        const d = dist(enemy.col, enemy.row, settler.col, settler.row);
        if (d <= 1.5) {
          enemy.path = null;
          enemy.pathIndex = 0;
          processEnemyAttack(enemy, settler, delta);
          continue;
        }
      }
    }

    // Check for adjacent buildings (walls)
    if (enemy.targetBuilding) {
      const building = _state.buildings.find(b => b.id === enemy.targetBuilding);
      if (building) {
        const d = dist(enemy.col, enemy.row, building.col, building.row);
        if (d <= 1.5) {
          enemy.path = null;
          enemy.pathIndex = 0;
          processEnemyAttack(enemy, building, delta);
        }
      }
    }
  }

  // Process rescue of knocked-out settlers
  for (const settler of _state.settlers) {
    if (settler.currentTask && settler.currentTask.type === 'rescuing') {
      const knockedOut = _state.settlers.find(s => s.id === settler.currentTask.targetId && s.isKnockedOut);
      if (knockedOut) {
        processRescue(settler, knockedOut, delta);
      } else {
        // Target no longer knocked out or gone
        settler.currentTask = null;
        settler.currentActivity = 'idle';
        settler.currentPriority = AI_PRIORITY.IDLE;
        settler.aiCooldown = 0;
      }
    }
  }

  // Note: dead enemy cleanup is handled in updateEnemySprites after fade-out
}


/**
 * Find nearest living enemy within range of a tile position.
 */
function findNearestEnemy(col, row, range) {
  let best = null;
  let bestDist = Infinity;

  for (const enemy of _state.enemies) {
    if (enemy.isDead) continue;
    const d = dist(col, row, enemy.col, enemy.row);
    if (d <= range && d < bestDist) {
      bestDist = d;
      best = enemy;
    }
  }

  return best;
}


/**
 * Make an unarmed settler flee toward the nearest building or campfire.
 */
function tryFlee(settler) {
  let bestBuilding = null;
  let bestDist = Infinity;

  for (const b of _state.buildings) {
    if (b.phase < BUILD_PHASE.COMPLETE) continue;
    const d = dist(settler.col, settler.row, b.col, b.row);
    if (d < bestDist) {
      bestDist = d;
      bestBuilding = b;
    }
  }

  if (bestBuilding) {
    const path = findPath(settler.col, settler.row, bestBuilding.col, bestBuilding.row);
    if (path && path.length > 0) {
      settler.path = path;
      settler.pathIndex = 0;
      settler.currentActivity = 'fleeing';
      settler.currentTask = { type: 'fleeing' };
      settler.currentPriority = AI_PRIORITY.FLEE;
      return;
    }
  }

  // No building — run away from nearest enemy
  const nearestEnemy = findNearestEnemy(settler.col, settler.row, 10);
  if (nearestEnemy) {
    const awayCol = clamp(settler.col + (settler.col - nearestEnemy.col) * 3, 0, WORLD_COLS - 1);
    const awayRow = clamp(settler.row + (settler.row - nearestEnemy.row) * 3, 0, WORLD_ROWS - 1);
    if (isWalkable(awayCol, awayRow)) {
      const path = findPath(settler.col, settler.row, awayCol, awayRow);
      if (path && path.length > 0) {
        settler.path = path;
        settler.pathIndex = 0;
        settler.currentActivity = 'fleeing';
        settler.currentTask = { type: 'fleeing' };
        settler.currentPriority = AI_PRIORITY.FLEE;
      }
    }
  }
}


/**
 * Find a knocked-out settler that needs rescue.
 */
function findKnockedOutSettler() {
  return _state.settlers.find(s => s.isKnockedOut) || null;
}


// ── Public API ────────────────────────────────────────────────
window.AX.combat = {
  processSettlerAttack,
  processEnemyAttack,
  checkSettlerKnockout,
  processRescue,
  updateCombat,
  findNearestEnemy,
  tryFlee,
  findKnockedOutSettler,
  destroyBuilding,
};
