// ═══════════ UTILS ═══════════

/**
 * Random integer between min and max (inclusive).
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random float between min and max.
 */
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Pick a random element from an array.
 */
function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle an array in place (Fisher-Yates).
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Clamp a value between min and max.
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Distance between two points.
 */
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Convert tile col/row to world pixel position (center of tile).
 */
function tileToWorld(col, row) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

/**
 * Convert world pixel position to tile col/row.
 */
function worldToTile(x, y) {
  return {
    col: Math.floor(x / TILE_SIZE),
    row: Math.floor(y / TILE_SIZE),
  };
}

/**
 * Check if a tile position is within world bounds.
 */
function inBounds(col, row) {
  return col >= 0 && col < WORLD_COLS && row >= 0 && row < WORLD_ROWS;
}

/**
 * Check if a tile is walkable.
 */
function isWalkable(col, row) {
  if (!inBounds(col, row)) return false;
  return WALKABLE_TILES.has(_state.tileMap[row][col]);
}

/**
 * Simple 2D Perlin-like noise using value noise with interpolation.
 * Returns value between 0 and 1.
 */
function makeNoise(seed) {
  const perm = new Uint8Array(512);
  let s = seed || 42;
  for (let i = 0; i < 256; i++) {
    s = (s * 16807 + 1) & 0x7fffffff;
    perm[i] = s & 255;
    perm[i + 256] = perm[i];
  }

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a, b, t) {
    return a + t * (b - a);
  }

  function grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  return function noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    return (lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v,
    ) + 1) / 2;
  };
}

/**
 * Generate a unique ID.
 */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
