// ═══════════ CONSTANTS ═══════════

window.AX = {};

const GAME_VERSION = 'v1.4';
const DEBUG = false; // Set to true for diagnostic logging

// ── World ──────────────────────────────────────────────────────
const TILE_SIZE = 64;
const WORLD_COLS = 80;
const WORLD_ROWS = 60;
const WORLD_WIDTH = WORLD_COLS * TILE_SIZE;
const WORLD_HEIGHT = WORLD_ROWS * TILE_SIZE;

// ── Tile Types ─────────────────────────────────────────────────
const TILE = {
  GRASS_1: 0,
  GRASS_2: 1,
  GRASS_3: 2,
  GRASS_FLOWERS: 3,
  DIRT_1: 4,
  DIRT_2: 5,
  DIRT_PEBBLES: 6,
  DIRT_PATH: 7,
  WATER_DEEP: 8,
  WATER_SHALLOW: 9,
  WATER_RIPPLE: 10,
  WATER_SHORE: 11,
};

const WALKABLE_TILES = new Set([
  TILE.GRASS_1, TILE.GRASS_2, TILE.GRASS_3, TILE.GRASS_FLOWERS,
  TILE.DIRT_1, TILE.DIRT_2, TILE.DIRT_PEBBLES, TILE.DIRT_PATH,
]);

// ── Nature Object Types ────────────────────────────────────────
const NATURE = {
  TREE_SMALL: 'tree_small',
  TREE_LARGE: 'tree_large',
  TREE_PINE: 'tree_pine',
  TREE_AUTUMN: 'tree_autumn',
  ROCK_SMALL: 'rock_small',
  ROCK_LARGE: 'rock_large',
  IRON_ORE: 'iron_ore',
  BUSH_BERRY: 'bush_berry',
  BUSH_SHRUB: 'bush_shrub',
  TALL_GRASS: 'tall_grass',
  STUMP: 'stump',
};

const HARVESTABLE = {
  // Gathering speeds tuned so: small tree ~5s bare, ~3s wooden axe, ~2s stone axe, ~1.5s iron axe
  // Mining slightly slower. Berry foraging fast (~2s).
  [NATURE.TREE_SMALL]: { resource: 'wood', amount: 3, hp: 50, tool: 'axe', regrows: true, regrowTime: 180000 },
  [NATURE.TREE_LARGE]: { resource: 'wood', amount: 5, hp: 80, tool: 'axe', regrows: true, regrowTime: 300000 },
  [NATURE.TREE_PINE]: { resource: 'wood', amount: 4, hp: 65, tool: 'axe', regrows: true, regrowTime: 240000 },
  [NATURE.TREE_AUTUMN]: { resource: 'wood', amount: 3, hp: 50, tool: 'axe', regrows: true, regrowTime: 180000 },
  [NATURE.ROCK_SMALL]: { resource: 'stone', amount: 2, hp: 60, tool: 'pickaxe', regrows: false },
  [NATURE.ROCK_LARGE]: { resource: 'stone', amount: 5, hp: 100, tool: 'pickaxe', regrows: false },
  [NATURE.IRON_ORE]: { resource: 'iron', amount: 3, hp: 80, tool: 'pickaxe', regrows: false },
  [NATURE.BUSH_BERRY]: { resource: 'food', amount: 2, hp: 20, tool: null, regrows: true, regrowTime: 120000 },
};

// ── Resource Types ─────────────────────────────────────────────
const RESOURCE = {
  WOOD: 'wood',
  STONE: 'stone',
  FOOD: 'food',
  IRON: 'iron',
  FIBER: 'fiber',
};

// ── Camera ─────────────────────────────────────────────────────
const CAMERA_MIN_ZOOM = 0.3;
const CAMERA_MAX_ZOOM = 2.0;
const CAMERA_ZOOM_STEP = 0.1;
const CAMERA_PAN_SPEED = 10;
const CAMERA_EDGE_THRESHOLD = 40;

// ── Day/Night Cycle ────────────────────────────────────────────
const DAY_CYCLE_DURATION = 720000; // 12 minutes per full cycle
const DAY_PHASE = {
  DAY: 'day',
  DUSK: 'dusk',
  NIGHT: 'night',
  DAWN: 'dawn',
};
const DAY_PHASE_RATIOS = {
  [DAY_PHASE.DAY]: 0.55,
  [DAY_PHASE.DUSK]: 0.10,
  [DAY_PHASE.NIGHT]: 0.25,
  [DAY_PHASE.DAWN]: 0.10,
};

// ── Settler ────────────────────────────────────────────────────
const SETTLER_NAMES_MALE = [
  'Aldric', 'Bram', 'Cedric', 'Dorin', 'Edmund', 'Finn', 'Gareth',
  'Hale', 'Ivor', 'Jareth', 'Kael', 'Leif', 'Magnus', 'Nolan',
  'Osric', 'Penn', 'Quinn', 'Rowan', 'Silas', 'Theron',
];

const SETTLER_NAMES_FEMALE = [
  'Aria', 'Brenna', 'Cora', 'Dahlia', 'Elara', 'Faye', 'Gwendolyn',
  'Hazel', 'Iris', 'Juniper', 'Kira', 'Luna', 'Maren', 'Nell',
  'Opal', 'Petra', 'Rowan', 'Sage', 'Thea', 'Wren',
];

const PERSONALITIES = [
  { name: 'Brave', effect: 'fightPriority', mod: 1.5 },
  { name: 'Lazy', effect: 'workSpeed', mod: 0.75 },
  { name: 'Industrious', effect: 'workSpeed', mod: 1.3 },
  { name: 'Glutton', effect: 'hungerRate', mod: 1.4 },
  { name: 'Swift', effect: 'moveSpeed', mod: 1.25 },
  { name: 'Sturdy', effect: 'maxHealth', mod: 1.2 },
  { name: 'Gentle', effect: 'gatherBonus', mod: 1.2 },
  { name: 'Cautious', effect: 'fleePriority', mod: 1.5 },
];

const SETTLER_BASE_STATS = {
  health: 100,
  maxHealth: 100,
  hunger: 100,
  maxHunger: 100,
  speed: 80,
  strength: 10,
  lives: 2,
};

const HUNGER_DRAIN_RATE = 0.18; // per second — settler can work ~70% of a day cycle before needing food
const HUNGER_DAMAGE_RATE = 0.5; // HP per second when starving
const HEALTH_REGEN_RATE = 0.2; // per second when fed

// ── Starting Settlers ──────────────────────────────────────────
const STARTING_SETTLERS_MIN = 3;
const STARTING_SETTLERS_MAX = 5;

// ── AI Priorities ──────────────────────────────────────────────
const AI_PRIORITY = {
  FLEE: 100,
  FIGHT: 90,
  EAT: 80,
  SLEEP: 70,
  RESCUE: 60,
  PREPARE_DEFENSE: 50,
  BUILD: 40,
  GATHER: 30,
  CRAFT: 20,
  IDLE: 0,
};

// ── Building Types ─────────────────────────────────────────────
const BUILDING = {
  CAMPFIRE: 'campfire',
  HUT: 'hut',
  STORAGE: 'storage',
  WORKBENCH: 'workbench',
  WALL_WOOD: 'wall_wood',
  WALL_STONE: 'wall_stone',
  WATCHTOWER: 'watchtower',
  HOUSE: 'house',
  FORGE: 'forge',
  FARM: 'farm',
  GATE: 'gate',
};

const BUILDING_DEFS = {
  [BUILDING.CAMPFIRE]: {
    name: 'Campfire',
    cost: { wood: 3, stone: 1 },  // Affordable in first 1-2 minutes
    size: { w: 1, h: 1 },
    hp: 50,
    provides: ['light', 'cooking'],
    capacity: 0,
    unlockPop: 0,
  },
  [BUILDING.HUT]: {
    name: 'Hut',
    cost: { wood: 8, stone: 4 },  // Buildable within 3-4 minutes
    size: { w: 2, h: 2 },
    hp: 100,
    provides: ['shelter'],
    capacity: 2,
    unlockPop: 0,
  },
  [BUILDING.STORAGE]: {
    name: 'Storage Shed',
    cost: { wood: 6, stone: 3 },  // Slightly cheaper for smooth early game
    size: { w: 2, h: 2 },
    hp: 80,
    provides: ['storage'],
    capacity: 0,
    storageCapacity: 100,
    unlockPop: 0,
  },
  [BUILDING.WORKBENCH]: {
    name: 'Workbench',
    cost: { wood: 5, stone: 3 },  // Slightly cheaper for smooth early game
    size: { w: 1, h: 1 },
    hp: 60,
    provides: ['advancedCrafting'],
    capacity: 0,
    unlockPop: 0,
  },
  [BUILDING.WALL_WOOD]: {
    name: 'Wooden Wall',
    cost: { wood: 3 },
    size: { w: 1, h: 1 },
    hp: 60,
    provides: ['defense'],
    capacity: 0,
    unlockPop: 0,
  },
  [BUILDING.WALL_STONE]: {
    name: 'Stone Wall',
    cost: { stone: 5 },
    size: { w: 1, h: 1 },
    hp: 120,
    provides: ['defense'],
    capacity: 0,
    unlockPop: 0,
    requires: [BUILDING.WORKBENCH],
  },
  [BUILDING.WATCHTOWER]: {
    name: 'Watchtower',
    cost: { wood: 8, stone: 6 },
    size: { w: 2, h: 2 },
    hp: 100,
    provides: ['defense', 'vision'],
    capacity: 1,
    unlockPop: 10,
  },
  [BUILDING.HOUSE]: {
    name: 'House',
    cost: { wood: 15, stone: 10 },
    size: { w: 3, h: 3 },
    hp: 150,
    provides: ['shelter'],
    capacity: 4,
    unlockPop: 8,
  },
  [BUILDING.FORGE]: {
    name: 'Forge',
    cost: { stone: 10, iron: 5, wood: 5 },
    size: { w: 2, h: 2 },
    hp: 120,
    provides: ['forgeCrafting'],
    capacity: 0,
    unlockPop: 0,
    requires: [BUILDING.WORKBENCH],
  },
  [BUILDING.FARM]: {
    name: 'Farm Plot',
    cost: { wood: 5, stone: 2 },
    size: { w: 2, h: 2 },
    hp: 40,
    provides: ['food'],
    capacity: 0,
    foodRate: 0.05,
    unlockPop: 6,
  },
  [BUILDING.GATE]: {
    name: 'Gate',
    cost: { wood: 6, stone: 2 },
    size: { w: 1, h: 1 },
    hp: 80,
    provides: ['defense', 'passage'],
    capacity: 0,
    unlockPop: 0,
  },
};

// ── Construction Phases ────────────────────────────────────────
const BUILD_PHASE = {
  FOUNDATION: 0,
  FRAME: 1,
  WALLS: 2,
  COMPLETE: 3,
};

const BUILD_PHASE_RATIOS = [0.2, 0.4, 0.3, 0.1];

// ── Crafting Recipes ───────────────────────────────────────────
const RECIPE_TIER = {
  BASIC: 'basic',
  WORKBENCH: 'workbench',
  FORGE: 'forge',
};

const RECIPES = {
  wooden_axe: { name: 'Wooden Axe', tier: RECIPE_TIER.BASIC, cost: { wood: 3, stone: 1 }, type: 'tool', subtype: 'axe', power: 1 },
  stone_pickaxe: { name: 'Stone Pickaxe', tier: RECIPE_TIER.BASIC, cost: { wood: 2, stone: 3 }, type: 'tool', subtype: 'pickaxe', power: 1 },
  wooden_spear: { name: 'Wooden Spear', tier: RECIPE_TIER.BASIC, cost: { wood: 2, stone: 1 }, type: 'weapon', subtype: 'melee', power: 8 },
  wooden_shield: { name: 'Wooden Shield', tier: RECIPE_TIER.BASIC, cost: { wood: 4, fiber: 1 }, type: 'armor', subtype: 'shield', power: 3 },
  torch: { name: 'Torch', tier: RECIPE_TIER.BASIC, cost: { wood: 1, fiber: 1 }, type: 'light', subtype: 'torch', power: 0 },
  rope: { name: 'Rope', tier: RECIPE_TIER.BASIC, cost: { fiber: 3 }, type: 'material', subtype: 'rope', power: 0 },
  stone_axe: { name: 'Stone Axe', tier: RECIPE_TIER.WORKBENCH, cost: { wood: 2, stone: 4 }, type: 'tool', subtype: 'axe', power: 2 },
  stone_sword: { name: 'Stone Sword', tier: RECIPE_TIER.WORKBENCH, cost: { wood: 1, stone: 5 }, type: 'weapon', subtype: 'melee', power: 15 },
  reinforced_shield: { name: 'Reinforced Shield', tier: RECIPE_TIER.WORKBENCH, cost: { wood: 3, stone: 3 }, type: 'armor', subtype: 'shield', power: 6 },
  wooden_bow: { name: 'Wooden Bow', tier: RECIPE_TIER.WORKBENCH, cost: { wood: 3, fiber: 2 }, type: 'weapon', subtype: 'ranged', power: 10 },
  iron_axe: { name: 'Iron Axe', tier: RECIPE_TIER.FORGE, cost: { wood: 1, iron: 3 }, type: 'tool', subtype: 'axe', power: 3 },
  iron_pickaxe: { name: 'Iron Pickaxe', tier: RECIPE_TIER.FORGE, cost: { wood: 1, iron: 3 }, type: 'tool', subtype: 'pickaxe', power: 3 },
  iron_sword: { name: 'Iron Sword', tier: RECIPE_TIER.FORGE, cost: { wood: 1, iron: 4 }, type: 'weapon', subtype: 'melee', power: 25 },
  iron_shield: { name: 'Iron Shield', tier: RECIPE_TIER.FORGE, cost: { iron: 2, wood: 1 }, type: 'armor', subtype: 'shield', power: 10 },
};

// ── Enemy Types ────────────────────────────────────────────────
const ENEMY_TYPE = {
  ZOMBIE: 'zombie',
  SKELETON: 'skeleton',
  WOLF: 'wolf',
};

const ENEMY_DEFS = {
  [ENEMY_TYPE.ZOMBIE]: {
    name: 'Zombie',
    hp: 30,
    damage: 5,
    speed: 25,       // Slow — manageable for early nights
    unlockDay: 1,
    color: 0x44aa44,
  },
  [ENEMY_TYPE.SKELETON]: {
    name: 'Skeleton',
    hp: 35,
    damage: 12,      // Hits harder than zombie
    speed: 40,       // Medium speed
    unlockDay: 5,
    color: 0xddddaa,
  },
  [ENEMY_TYPE.WOLF]: {
    name: 'Wolf',
    hp: 20,          // Less HP than zombie — glass cannon
    damage: 8,
    speed: 80,       // Noticeably faster than zombies
    unlockDay: 10,
    color: 0x555566,
  },
};

// ── Save System ────────────────────────────────────────────────
const AUTOSAVE_INTERVAL = 60000; // 60 seconds
const SUPABASE_URL = ''; // TODO: configure
const SUPABASE_KEY = ''; // TODO: configure
