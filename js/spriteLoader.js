// ═══════════ SPRITE LOADER ═══════════
// Canvas-based sprite extraction from AI-generated spritesheets.
// Loads full sheet images, extracts individual sprites by defined
// bounding rectangles, and registers them as named Phaser textures.

// ── Spritesheet keys loaded in BootScene ──────────────────────
const SHEET_KEYS = {
  GROUND: 'sheet_ground',
  NATURE: 'sheet_nature',
  ITEMS: 'sheet_items',
  SETTLERS: 'sheet_settlers',
  ENEMIES: 'sheet_enemies',
  ICONS: 'sheet_icons',
  HUT_HOUSE: 'sheet_hut_house',
};

// ── Sprite Atlas: maps sprite names to sheet regions ──────────
// Each entry: { sheet, x, y, w, h }
// Coordinates are approximate bounding boxes within the sheet.
// All sheets are 677×369 unless noted otherwise.

// Helper to generate grid-based definitions
function _gridSprites(sheet, cols, rows, names, sheetW, sheetH) {
  sheetW = sheetW || 677;
  sheetH = sheetH || 369;
  const cellW = Math.floor(sheetW / cols);
  const cellH = Math.floor(sheetH / rows);
  const result = {};
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (idx >= names.length) break;
      if (names[idx]) {
        result[names[idx]] = {
          sheet: sheet,
          x: c * cellW,
          y: r * cellH,
          w: cellW,
          h: cellH,
        };
      }
      idx++;
    }
  }
  return result;
}

// ── Nature Objects (677×369, 4×4 grid) ────────────────────────
const NATURE_SPRITE_DEFS = _gridSprites(SHEET_KEYS.NATURE, 4, 4, [
  // Row 1: Trees
  'tree_small', 'tree_large', 'tree_pine', 'tree_autumn',
  // Row 2: Rocks & ore
  'rock_small', 'rock_large', 'rock_mossy', 'iron_ore',
  // Row 3: Bushes & grass
  'bush_berry', 'bush_shrub', 'tall_grass', 'flower_bush',
  // Row 4: Misc
  'stump', 'fallen_log', 'pond', 'mushrooms',
]);

// ── Settler Characters (677×369, 8×4 grid) ───────────────────
const SETTLER_SPRITE_DEFS = _gridSprites(SHEET_KEYS.SETTLERS, 8, 4, [
  // Row 1: Male poses
  'settler_male_front', 'settler_male_back', 'settler_male_left', 'settler_male_right',
  'settler_male_chop', 'settler_male_mine', 'settler_male_carry', 'settler_male_sleep',
  // Row 2: Female poses
  'settler_female_front', 'settler_female_back', 'settler_female_left', 'settler_female_right',
  'settler_female_forage', 'settler_female_build', 'settler_female_carry', 'settler_female_sleep',
  // Row 3: Male walking
  'settler_male_walk1', 'settler_male_walk2', 'settler_male_walk3', 'settler_male_walk4',
  'settler_male_walkr1', 'settler_male_walkr2', 'settler_male_walkr3', 'settler_male_walkr4',
  // Row 4: Female walking
  'settler_female_walk1', 'settler_female_walk2', 'settler_female_walk3', 'settler_female_walk4',
  'settler_female_walkr1', 'settler_female_walkr2', 'settler_female_walkr3', 'settler_female_walkr4',
]);

// ── Enemy Characters (677×369, 8×4 grid) ─────────────────────
const ENEMY_SPRITE_DEFS = _gridSprites(SHEET_KEYS.ENEMIES, 8, 4, [
  // Row 1: Zombie
  'zombie_idle', 'zombie_walk1', 'zombie_walk2', 'zombie_attack',
  'zombie_hit', 'zombie_idle2', 'zombie_walk3', 'zombie_attack2',
  // Row 2: Skeleton
  'skeleton_idle', 'skeleton_walk1', 'skeleton_walk2', 'skeleton_attack',
  'skeleton_hit', 'skeleton_idle2', 'skeleton_walk3', 'skeleton_attack2',
  // Row 3: Wolf
  'wolf_idle', 'wolf_walk1', 'wolf_walk2', 'wolf_attack',
  'wolf_hit', 'wolf_idle2', 'wolf_walk3', 'wolf_attack2',
  // Row 4: Death animations
  'zombie_death1', 'zombie_death2', 'skeleton_death1', 'skeleton_death2',
  'wolf_death1', 'wolf_death2', null, null,
]);

// ── Resource Items (677×369, 4×5 grid) ────────────────────────
const ITEM_SPRITE_DEFS = _gridSprites(SHEET_KEYS.ITEMS, 4, 5, [
  // Row 1: Raw resources
  'item_wood', 'item_stone', 'item_food', 'item_iron',
  // Row 2: Basic tools/weapons
  'item_wooden_axe', 'item_stone_pickaxe', 'item_wooden_spear', 'item_wooden_shield',
  // Row 3: Workbench tier
  'item_stone_axe', 'item_stone_pickaxe2', 'item_stone_sword', 'item_reinforced_shield',
  // Row 4: Forge tier
  'item_iron_axe', 'item_iron_pickaxe', 'item_iron_sword', 'item_iron_shield',
  // Row 5: Misc
  'item_rope', 'item_torch', 'item_meat', 'item_herbs',
]);

// ── Hut & House Construction (677×369, 3×2 grid) ─────────────
const HUT_HOUSE_SPRITE_DEFS = _gridSprites(SHEET_KEYS.HUT_HOUSE, 3, 2, [
  // Row 1: Hut phases
  'hut_foundation', 'hut_frame', 'hut_complete',
  // Row 2: House phases
  'house_foundation', 'house_frame', 'house_complete',
]);

// ── UI Icons (677×369, 8×4 grid) ─────────────────────────────
const ICON_SPRITE_DEFS = _gridSprites(SHEET_KEYS.ICONS, 8, 4, [
  // Row 1
  'icon_axe', 'icon_pickaxe', 'icon_apple', 'icon_hammer',
  'icon_sword', 'icon_wrench', 'icon_sleep', 'icon_food',
  // Row 2
  'icon_heart', 'icon_alert', 'icon_shield', 'icon_danger',
  'icon_question', 'icon_baby', 'icon_skull', 'icon_star',
  // Row 3
  'icon_wood', 'icon_stone', 'icon_apple2', 'icon_iron',
  'icon_person', 'icon_sun', 'icon_moon', 'icon_health',
  // Row 4
  'icon_gear', 'icon_save', 'icon_play', 'icon_door',
  'icon_plus', 'icon_minus', 'icon_zoomin', 'icon_zoomout',
]);

// ── Combined atlas for extraction ─────────────────────────────
const SPRITE_ATLAS = Object.assign({},
  NATURE_SPRITE_DEFS,
  SETTLER_SPRITE_DEFS,
  ENEMY_SPRITE_DEFS,
  ITEM_SPRITE_DEFS,
  HUT_HOUSE_SPRITE_DEFS,
  ICON_SPRITE_DEFS
);

// All sheets have white backgrounds from the AI generator — need white-to-transparent
const WHITE_BG_SHEETS = new Set([
  SHEET_KEYS.NATURE,
  SHEET_KEYS.ITEMS,
  SHEET_KEYS.SETTLERS,
  SHEET_KEYS.ENEMIES,
  SHEET_KEYS.ICONS,
  SHEET_KEYS.HUT_HOUSE,
]);

// Track which sprites were successfully extracted
const _extractedSprites = new Set();

/**
 * Extract individual sprites from a loaded spritesheet image.
 * Creates a canvas for each defined region, optionally converts
 * white background to transparent, and registers as a Phaser texture.
 *
 * @param {Phaser.Scene} scene - The active scene with texture manager
 * @param {string} sheetKey - The texture key of the loaded full sheet
 * @param {Object} spriteDefs - Map of { name: { sheet, x, y, w, h } }
 * @param {boolean} removeWhiteBg - If true, convert near-white pixels to transparent
 */
function extractSpritesFromSheet(scene, sheetKey, spriteDefs, removeWhiteBg) {
  // Get the source image from Phaser's texture manager
  const sourceTexture = scene.textures.get(sheetKey);
  if (!sourceTexture || sourceTexture.key === '__MISSING') {
    if (DEBUG) console.warn('SpriteLoader: sheet not found:', sheetKey);
    return;
  }

  const sourceImage = sourceTexture.getSourceImage();
  if (!sourceImage || sourceImage.width === 0) {
    if (DEBUG) console.warn('SpriteLoader: sheet image empty:', sheetKey);
    return;
  }

  for (const name in spriteDefs) {
    const def = spriteDefs[name];
    if (def.sheet !== sheetKey) continue;

    // Clamp region to source bounds
    const sx = Math.max(0, Math.min(def.x, sourceImage.width));
    const sy = Math.max(0, Math.min(def.y, sourceImage.height));
    const sw = Math.min(def.w, sourceImage.width - sx);
    const sh = Math.min(def.h, sourceImage.height - sy);

    if (sw <= 0 || sh <= 0) continue;

    // Create extraction canvas
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');

    // Draw the region from the source
    ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, sw, sh);

    // Convert white background to transparent if needed
    if (removeWhiteBg) {
      const imageData = ctx.getImageData(0, 0, sw, sh);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // If pixel is near-white (all channels > 240), make transparent
        if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Register as a new Phaser texture
    if (!scene.textures.exists(name)) {
      scene.textures.addCanvas(name, canvas);
      _extractedSprites.add(name);
    }
  }
}

/**
 * Extract all sprites from all loaded sheets.
 * Call this from BootScene.create() after all sheets are loaded.
 *
 * @param {Phaser.Scene} scene - The active scene
 */
function extractAllSprites(scene) {
  // Get unique sheet keys from all defs
  const sheetGroups = {};
  for (const name in SPRITE_ATLAS) {
    const def = SPRITE_ATLAS[name];
    if (!sheetGroups[def.sheet]) sheetGroups[def.sheet] = {};
    sheetGroups[def.sheet][name] = def;
  }

  for (const sheetKey in sheetGroups) {
    const removeWhite = WHITE_BG_SHEETS.has(sheetKey);
    extractSpritesFromSheet(scene, sheetKey, sheetGroups[sheetKey], removeWhite);
  }

  if (DEBUG) console.log('SpriteLoader: extracted', _extractedSprites.size, 'sprites');
}

/**
 * Check if a sprite was successfully extracted and is available.
 *
 * @param {string} name - The sprite texture key
 * @returns {boolean}
 */
function hasSpriteTexture(name) {
  return _extractedSprites.has(name);
}

// ── Public API ────────────────────────────────────────────────
window.AX.spriteLoader = {
  extractAllSprites: extractAllSprites,
  extractSpritesFromSheet: extractSpritesFromSheet,
  hasSpriteTexture: hasSpriteTexture,
  SPRITE_ATLAS: SPRITE_ATLAS,
  SHEET_KEYS: SHEET_KEYS,
};
