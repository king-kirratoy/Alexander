// ═══════════ SPRITE LOADER ═══════════
// Canvas-based sprite extraction from AI-generated spritesheets.
// Uses auto-detection of sprite bounds within each grid cell to handle
// irregular spacing in AI-generated sheets.

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

// ── Sheet configurations for auto-detection ───────────────────
// bgColor: 'black' = background r<30,g<30,b<30; 'white' = r>225,g>225,b>225
const SHEET_CONFIGS = [
  {
    key: SHEET_KEYS.NATURE,
    cols: 4, rows: 4,
    bgColor: 'black',
    names: [
      'tree_small',  'tree_large',  'tree_pine',   'tree_autumn',
      'rock_small',  'rock_large',  'rock_mossy',  'iron_ore',
      'bush_berry',  'bush_shrub',  'tall_grass',  'flower_bush',
      'stump',       'fallen_log',  'pond',        'mushrooms',
    ],
  },
  {
    key: SHEET_KEYS.SETTLERS,
    cols: 8, rows: 4,
    bgColor: 'black',
    names: [
      'settler_male_front',   'settler_male_back',    'settler_male_left',    'settler_male_right',
      'settler_male_chop',    'settler_male_mine',    'settler_male_carry',   'settler_male_sleep',
      'settler_female_front', 'settler_female_back',  'settler_female_left',  'settler_female_right',
      'settler_female_forage','settler_female_build', 'settler_female_carry', 'settler_female_sleep',
      'settler_male_walk1',   'settler_male_walk2',   'settler_male_walk3',   'settler_male_walk4',
      'settler_male_walkr1',  'settler_male_walkr2',  'settler_male_walkr3',  'settler_male_walkr4',
      'settler_female_walk1', 'settler_female_walk2', 'settler_female_walk3', 'settler_female_walk4',
      'settler_female_walkr1','settler_female_walkr2','settler_female_walkr3','settler_female_walkr4',
    ],
  },
  {
    key: SHEET_KEYS.ENEMIES,
    cols: 8, rows: 4,
    bgColor: 'black',
    names: [
      'zombie_idle',     'zombie_walk1',    'zombie_walk2',    'zombie_attack',
      'zombie_hit',      'zombie_idle2',    'zombie_walk3',    'zombie_attack2',
      'skeleton_idle',   'skeleton_walk1',  'skeleton_walk2',  'skeleton_attack',
      'skeleton_hit',    'skeleton_idle2',  'skeleton_walk3',  'skeleton_attack2',
      'wolf_idle',       'wolf_walk1',      'wolf_walk2',      'wolf_attack',
      'wolf_hit',        'wolf_idle2',      'wolf_walk3',      'wolf_attack2',
      'zombie_death1',   'zombie_death2',   'skeleton_death1', 'skeleton_death2',
      'wolf_death1',     'wolf_death2',     null,              null,
    ],
  },
  {
    key: SHEET_KEYS.ITEMS,
    cols: 4, rows: 5,
    bgColor: 'black',
    names: [
      'item_wood',          'item_stone',          'item_food',              'item_iron',
      'item_wooden_axe',    'item_stone_pickaxe',  'item_wooden_spear',      'item_wooden_shield',
      'item_stone_axe',     'item_stone_pickaxe2', 'item_stone_sword',       'item_reinforced_shield',
      'item_iron_axe',      'item_iron_pickaxe',   'item_iron_sword',        'item_iron_shield',
      'item_rope',          'item_torch',          'item_meat',              'item_herbs',
    ],
  },
  {
    key: SHEET_KEYS.ICONS,
    cols: 8, rows: 4,
    bgColor: 'black',
    names: [
      'icon_axe',    'icon_pickaxe', 'icon_apple',  'icon_hammer',
      'icon_sword',  'icon_wrench',  'icon_sleep',  'icon_food',
      'icon_heart',  'icon_alert',   'icon_shield', 'icon_danger',
      'icon_question','icon_baby',   'icon_skull',  'icon_star',
      'icon_wood',   'icon_stone',   'icon_apple2', 'icon_iron',
      'icon_person', 'icon_sun',     'icon_moon',   'icon_health',
      'icon_gear',   'icon_save',    'icon_play',   'icon_door',
      'icon_plus',   'icon_minus',   'icon_zoomin', 'icon_zoomout',
    ],
  },
  {
    key: SHEET_KEYS.HUT_HOUSE,
    cols: 3, rows: 2,
    bgColor: 'white',
    names: [
      'hut_foundation',  'hut_frame',  'hut_complete',
      'house_foundation','house_frame','house_complete',
    ],
  },
];

// Track which sprites were successfully extracted
const _extractedSprites = new Set();

// Legacy SPRITE_ATLAS kept for any external consumers
const SPRITE_ATLAS = {};


/**
 * Auto-detect the bounding box of sprite content within each grid cell.
 * Divides the image into expectedCols × expectedRows equal cells, then
 * scans pixels in each cell to find the tightest bounding box around
 * non-background content.
 *
 * @param {Phaser.Scene} scene
 * @param {string} imageKey - Loaded texture key
 * @param {number} expectedCols
 * @param {number} expectedRows
 * @param {string} bgColor - 'black' or 'white'
 * @returns {Array<{x,y,w,h}>|null} Regions in row-major order, or null on failure
 */
function autoDetectSpriteGrid(scene, imageKey, expectedCols, expectedRows, bgColor) {
  const sourceTexture = scene.textures.get(imageKey);
  if (!sourceTexture || sourceTexture.key === '__MISSING') {
    if (DEBUG) console.warn('SpriteLoader autoDetect: sheet not found:', imageKey);
    return null;
  }

  const sourceImage = sourceTexture.getSourceImage();
  if (!sourceImage || sourceImage.width === 0) {
    if (DEBUG) console.warn('SpriteLoader autoDetect: sheet image empty:', imageKey);
    return null;
  }

  // Draw full image to an off-screen canvas to access pixel data
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceImage, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const iw = canvas.width;

  const cellW = sourceImage.width / expectedCols;
  const cellH = sourceImage.height / expectedRows;

  const regions = [];

  for (let row = 0; row < expectedRows; row++) {
    for (let col = 0; col < expectedCols; col++) {
      const cellLeft  = Math.round(col * cellW);
      const cellTop   = Math.round(row * cellH);
      const cellRight = Math.round((col + 1) * cellW);
      const cellBottom= Math.round((row + 1) * cellH);

      let minX = cellRight;
      let maxX = cellLeft - 1;
      let minY = cellBottom;
      let maxY = cellTop - 1;

      for (let py = cellTop; py < cellBottom; py++) {
        for (let px = cellLeft; px < cellRight; px++) {
          const i = (py * iw + px) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

          if (a < 10) continue; // ignore fully transparent

          let isBg;
          if (bgColor === 'black') {
            isBg = (r < 30 && g < 30 && b < 30);
          } else {
            isBg = (r > 225 && g > 225 && b > 225);
          }

          if (!isBg) {
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }

      let region;
      if (minX > maxX || minY > maxY) {
        // No content found — use full cell
        region = { x: cellLeft, y: cellTop, w: cellRight - cellLeft, h: cellBottom - cellTop };
      } else {
        // Add 2px padding, clamped to cell bounds
        const PAD = 2;
        const x  = Math.max(cellLeft,   minX - PAD);
        const y  = Math.max(cellTop,    minY - PAD);
        const x2 = Math.min(cellRight,  maxX + PAD + 1);
        const y2 = Math.min(cellBottom, maxY + PAD + 1);
        region = { x, y, w: x2 - x, h: y2 - y };
      }

      regions.push(region);

      if (DEBUG) {
        const idx = row * expectedCols + col;
        console.log('SpriteLoader autoDetect [' + imageKey + '][' + idx + ']:', region);
      }
    }
  }

  return regions;
}


/**
 * Flood-fill from the edges of the canvas, making any background-coloured
 * pixels transparent. Stops at non-background pixels, preserving interior
 * black/white that is part of the sprite art (e.g. outlines).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {function} isBgFn - (r,g,b,a) => boolean
 */
function floodFillEdgeTransparent(canvas, ctx, isBgFn) {
  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) return;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const visited = new Uint8Array(w * h);

  // Use typed array queue for performance (px, py interleaved)
  // Pre-allocate; worst case is the whole image
  const queue = new Int32Array(w * h * 2);
  let qHead = 0;
  let qTail = 0;

  function enqueue(px, py) {
    const idx = py * w + px;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue[qTail++] = px;
    queue[qTail++] = py;
  }

  // Seed from all four edges
  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  while (qHead < qTail) {
    const px = queue[qHead++];
    const py = queue[qHead++];

    const pi = (py * w + px) * 4;
    const r = data[pi], g = data[pi + 1], b = data[pi + 2], a = data[pi + 3];

    if (!isBgFn(r, g, b, a)) continue;

    data[pi + 3] = 0; // make transparent

    if (px > 0)     enqueue(px - 1, py);
    if (px < w - 1) enqueue(px + 1, py);
    if (py > 0)     enqueue(px, py - 1);
    if (py < h - 1) enqueue(px, py + 1);
  }

  ctx.putImageData(imageData, 0, 0);
}


/**
 * Extract sprites from a sheet using pre-computed auto-detected regions.
 * Applies edge flood-fill to remove background bleed.
 *
 * @param {Phaser.Scene} scene
 * @param {string} sheetKey
 * @param {Array<string|null>} names  - Sprite names in row-major order (null = skip)
 * @param {Array<{x,y,w,h}>} regions  - One region per cell, row-major order
 * @param {string} bgColor - 'black' or 'white'
 */
function extractSpritesFromSheetAuto(scene, sheetKey, names, regions, bgColor) {
  const sourceTexture = scene.textures.get(sheetKey);
  if (!sourceTexture || sourceTexture.key === '__MISSING') return;

  const sourceImage = sourceTexture.getSourceImage();
  if (!sourceImage || sourceImage.width === 0) return;

  const isBgFn = bgColor === 'black'
    ? (r, g, b, a) => (a > 5 && r < 30 && g < 30 && b < 30)
    : (r, g, b, a) => (a > 5 && r > 225 && g > 225 && b > 225);

  for (let i = 0; i < names.length && i < regions.length; i++) {
    const name = names[i];
    if (!name) continue;

    const reg = regions[i];
    if (!reg || reg.w <= 0 || reg.h <= 0) continue;

    // Clamp region to source bounds
    const sx = Math.max(0, Math.min(reg.x, sourceImage.width));
    const sy = Math.max(0, Math.min(reg.y, sourceImage.height));
    const sw = Math.min(reg.w, sourceImage.width  - sx);
    const sh = Math.min(reg.h, sourceImage.height - sy);
    if (sw <= 0 || sh <= 0) continue;

    // Create extraction canvas
    const canvas = document.createElement('canvas');
    canvas.width  = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, sw, sh);

    // Remove edge background bleed via flood-fill
    floodFillEdgeTransparent(canvas, ctx, isBgFn);

    // Register as Phaser texture
    if (!scene.textures.exists(name)) {
      scene.textures.addCanvas(name, canvas);
      _extractedSprites.add(name);

      // Also populate legacy SPRITE_ATLAS entry
      SPRITE_ATLAS[name] = { sheet: sheetKey, x: sx, y: sy, w: sw, h: sh };
    }
  }
}


/**
 * Legacy extraction function — kept for backward compatibility.
 * New code uses extractSpritesFromSheetAuto via extractAllSprites.
 *
 * @param {Phaser.Scene} scene
 * @param {string} sheetKey
 * @param {Object} spriteDefs
 * @param {boolean} removeWhiteBg
 */
function extractSpritesFromSheet(scene, sheetKey, spriteDefs, removeWhiteBg) {
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

  const isBgFn = removeWhiteBg
    ? (r, g, b, a) => (a > 5 && r > 225 && g > 225 && b > 225)
    : (r, g, b, a) => (a > 5 && r < 30 && g < 30 && b < 30);

  for (const name in spriteDefs) {
    const def = spriteDefs[name];
    if (def.sheet !== sheetKey) continue;

    const sx = Math.max(0, Math.min(def.x, sourceImage.width));
    const sy = Math.max(0, Math.min(def.y, sourceImage.height));
    const sw = Math.min(def.w, sourceImage.width - sx);
    const sh = Math.min(def.h, sourceImage.height - sy);
    if (sw <= 0 || sh <= 0) continue;

    const canvas = document.createElement('canvas');
    canvas.width  = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, sw, sh);

    floodFillEdgeTransparent(canvas, ctx, isBgFn);

    if (!scene.textures.exists(name)) {
      scene.textures.addCanvas(name, canvas);
      _extractedSprites.add(name);
    }
  }
}


/**
 * Extract all sprites from all loaded sheets using auto-detection.
 * Call this from BootScene.create() after all sheets are loaded.
 *
 * @param {Phaser.Scene} scene
 */
function extractAllSprites(scene) {
  let totalExtracted = 0;

  for (const config of SHEET_CONFIGS) {
    // Auto-detect sprite bounds within each grid cell
    const regions = autoDetectSpriteGrid(
      scene, config.key, config.cols, config.rows, config.bgColor
    );

    if (!regions) {
      if (DEBUG) console.warn('SpriteLoader: skipping', config.key, '(not loaded or empty)');
      continue;
    }

    // Extract sprites using detected bounds + flood-fill background removal
    extractSpritesFromSheetAuto(scene, config.key, config.names, regions, config.bgColor);

    const extracted = config.names.filter(n => n && _extractedSprites.has(n)).length;
    totalExtracted += extracted;

    if (DEBUG) {
      console.log('SpriteLoader: extracted', extracted, 'sprites from', config.key);
    }
  }

  if (DEBUG) console.log('SpriteLoader: total extracted', totalExtracted, 'sprites');
}


/**
 * Check if a sprite was successfully extracted and is available.
 *
 * @param {string} name
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
  autoDetectSpriteGrid: autoDetectSpriteGrid,
  SPRITE_ATLAS: SPRITE_ATLAS,
  SHEET_KEYS: SHEET_KEYS,
};
