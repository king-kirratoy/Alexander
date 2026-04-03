// ═══════════ PATHFINDING ═══════════

let _pathfinder = null;

/**
 * Initialize the EasyStar pathfinder with the current tile map.
 */
function initPathfinding() {
  _pathfinder = new EasyStar.js();

  // Build grid from tile map (0 = walkable, 1 = blocked)
  const grid = [];
  for (let row = 0; row < WORLD_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < WORLD_COLS; col++) {
      grid[row][col] = WALKABLE_TILES.has(_state.tileMap[row][col]) ? 0 : 1;
    }
  }

  _pathfinder.setGrid(grid);
  _pathfinder.setAcceptableTiles([0]);
  _pathfinder.enableDiagonals();
  _pathfinder.enableSync();
}


/**
 * Block a tile (when a building is placed or object is impassable).
 */
function blockTile(col, row) {
  if (!_pathfinder) return;
  // Mark as blocked by setting to 1 in the internal grid
  // EasyStar doesn't have a direct "block tile" method,
  // so we rebuild when needed or manage a custom blocked set
}


/**
 * Find a path from (startCol, startRow) to (endCol, endRow).
 * Returns array of { x: col, y: row } or null if no path found.
 */
function findPath(startCol, startRow, endCol, endRow) {
  if (!_pathfinder) return null;
  if (!inBounds(startCol, startRow) || !inBounds(endCol, endRow)) return null;
  if (!isWalkable(endCol, endRow)) return null;

  let result = null;
  _pathfinder.findPath(startCol, startRow, endCol, endRow, (path) => {
    result = path;
  });
  _pathfinder.calculate();
  return result;
}


/**
 * Find the nearest walkable tile to target from source.
 * Useful when the exact target is blocked.
 */
function findNearestWalkable(col, row, searchRadius) {
  searchRadius = searchRadius || 5;
  let bestDist = Infinity;
  let best = null;

  for (let r = row - searchRadius; r <= row + searchRadius; r++) {
    for (let c = col - searchRadius; c <= col + searchRadius; c++) {
      if (!inBounds(c, r)) continue;
      if (!isWalkable(c, r)) continue;
      const d = dist(c, r, col, row);
      if (d < bestDist) {
        bestDist = d;
        best = { col: c, row: r };
      }
    }
  }
  return best;
}


// ── Public API ────────────────────────────────────────────────
window.AX.pathfinding = {
  initPathfinding,
  findPath,
  findNearestWalkable,
  blockTile,
};
