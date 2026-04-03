// ═══════════ STATE ═══════════

const _state = {
  // ── Game Meta ──
  username: '',
  dayNumber: 1,
  cycleTime: 0,
  currentPhase: DAY_PHASE.DAY,
  gameRunning: false,
  gameStarted: false,

  // ── World ──
  tileMap: [],        // 2D array [row][col] of tile type IDs
  natureObjects: [],  // Array of { type, col, row, hp, depleted, regrowAt }

  // ── Settlers ──
  settlers: [],       // Array of settler objects
  nextSettlerId: 1,

  // ── Buildings ──
  buildings: [],      // Array of building objects
  nextBuildingId: 1,

  // ── Resources (stockpile totals) ──
  resources: {
    wood: 0,
    stone: 0,
    food: 20,
    iron: 0,
    fiber: 0,
  },

  // ── Enemies ──
  enemies: [],
  nextEnemyId: 1,

  // ── Crafted Items in Storage ──
  inventory: [],      // Array of { id, name, type, subtype, power }

  // ── Camera ──
  cameraFollowing: null,  // settler ID or null

  // ── Player Actions ──
  activeAction: null,     // 'dropWood', 'dropStone', etc. or null

  // ── Population Growth ──
  birthCooldown: 0,       // day/night cycles remaining until next birth is possible
  notifications: [],      // Array of { text, time, duration }

  // ── UI ──
  selectedSettler: null,  // settler ID or null
  menuOpen: false,
};
