// ═══════════ CRAFTING ═══════════

/**
 * Get all recipes whose tier requirements are met.
 * BASIC = always available, WORKBENCH = requires workbench, FORGE = requires forge.
 */
function getAvailableRecipes() {
  const available = {};
  const hasWorkbench = typeof hasBuilding === 'function' && hasBuilding(BUILDING.WORKBENCH);
  const hasForge = typeof hasBuilding === 'function' && hasBuilding(BUILDING.FORGE);

  for (const key in RECIPES) {
    const recipe = RECIPES[key];
    if (recipe.tier === RECIPE_TIER.BASIC) {
      available[key] = recipe;
    } else if (recipe.tier === RECIPE_TIER.WORKBENCH && hasWorkbench) {
      available[key] = recipe;
    } else if (recipe.tier === RECIPE_TIER.FORGE && hasForge) {
      available[key] = recipe;
    }
  }

  return available;
}


/**
 * Check if _state.resources has enough of each material in the recipe cost.
 */
function canAffordRecipe(recipeKey) {
  const recipe = RECIPES[recipeKey];
  if (!recipe) return false;

  for (const res in recipe.cost) {
    if ((_state.resources[res] || 0) < recipe.cost[res]) return false;
  }
  return true;
}


/**
 * Subtract the recipe cost from resources and add the crafted item to inventory.
 */
function craftItem(recipeKey) {
  const recipe = RECIPES[recipeKey];
  if (!recipe) return null;

  // Deduct cost
  for (const res in recipe.cost) {
    _state.resources[res] -= recipe.cost[res];
  }

  // Create item
  const item = {
    id: uid(),
    name: recipe.name,
    type: recipe.type,
    subtype: recipe.subtype,
    power: recipe.power,
  };

  _state.inventory.push(item);
  return item;
}


/**
 * Find the highest-power item of a given tool subtype in inventory.
 */
function findBestTool(subtype) {
  let best = null;
  for (const item of _state.inventory) {
    if (item.type === 'tool' && item.subtype === subtype) {
      if (!best || item.power > best.power) {
        best = item;
      }
    }
  }
  return best;
}


/**
 * Find the highest-power weapon in inventory.
 */
function findBestWeapon() {
  let best = null;
  for (const item of _state.inventory) {
    if (item.type === 'weapon') {
      if (!best || item.power > best.power) {
        best = item;
      }
    }
  }
  return best;
}


/**
 * Determine what the settlement needs most to craft.
 * Returns a recipe key or null.
 */
function decideWhatToCraft() {
  const available = getAvailableRecipes();

  // If no axe in inventory and can afford wooden_axe, craft it
  if (!findBestTool('axe') && available['wooden_axe'] && canAffordRecipe('wooden_axe')) {
    return 'wooden_axe';
  }

  // If no pickaxe and can afford stone_pickaxe, craft it
  if (!findBestTool('pickaxe') && available['stone_pickaxe'] && canAffordRecipe('stone_pickaxe')) {
    return 'stone_pickaxe';
  }

  // If settler count > weapon count and can afford a weapon, craft one
  const weaponCount = _state.inventory.filter(i => i.type === 'weapon').length;
  if (_state.settlers.length > weaponCount) {
    // Try best available weapon
    const weaponKeys = Object.keys(available).filter(k => available[k].type === 'weapon');
    // Sort by power descending
    weaponKeys.sort((a, b) => available[b].power - available[a].power);
    for (const key of weaponKeys) {
      if (canAffordRecipe(key)) return key;
    }
  }

  // Try upgrading tools if better recipes are available
  const bestAxe = findBestTool('axe');
  if (bestAxe) {
    const axeKeys = Object.keys(available).filter(
      k => available[k].type === 'tool' && available[k].subtype === 'axe' && available[k].power > bestAxe.power
    );
    for (const key of axeKeys) {
      if (canAffordRecipe(key)) return key;
    }
  }

  const bestPick = findBestTool('pickaxe');
  if (bestPick) {
    const pickKeys = Object.keys(available).filter(
      k => available[k].type === 'tool' && available[k].subtype === 'pickaxe' && available[k].power > bestPick.power
    );
    for (const key of pickKeys) {
      if (canAffordRecipe(key)) return key;
    }
  }

  return null;
}


// ── Public API ────────────────────────────────────────────────
window.AX.crafting = {
  getAvailableRecipes,
  canAffordRecipe,
  craftItem,
  findBestTool,
  findBestWeapon,
  decideWhatToCraft,
};
