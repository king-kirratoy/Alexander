// ═══════════ INIT ═══════════

// ── Tile Color Map (placeholder rendering) ────────────────────
const TILE_COLORS = {
  [TILE.GRASS_1]: 0x6aa84f,
  [TILE.GRASS_2]: 0x5a8f3c,
  [TILE.GRASS_3]: 0x4a7a30,
  [TILE.GRASS_FLOWERS]: 0x7ec850,
  [TILE.DIRT_1]: 0xb4854a,
  [TILE.DIRT_2]: 0xa07040,
  [TILE.DIRT_PEBBLES]: 0x8a6535,
  [TILE.DIRT_PATH]: 0x9b7040,
  [TILE.WATER_DEEP]: 0x285aa0,
  [TILE.WATER_SHALLOW]: 0x468cd2,
  [TILE.WATER_RIPPLE]: 0x5096d5,
  [TILE.WATER_SHORE]: 0x5ba0d8,
};


const BUILDING_COLORS = {
  [BUILDING.CAMPFIRE]: 0xe06020,
  [BUILDING.HUT]: 0x8b6914,
  [BUILDING.STORAGE]: 0x7a6030,
  [BUILDING.WORKBENCH]: 0x6e5020,
  [BUILDING.WALL_WOOD]: 0x6e4a20,
  [BUILDING.WALL_STONE]: 0x888888,
  [BUILDING.WATCHTOWER]: 0x7a5a28,
  [BUILDING.HOUSE]: 0xa07040,
  [BUILDING.FORGE]: 0x4a4040,
  [BUILDING.FARM]: 0x5a8f3c,
  [BUILDING.GATE]: 0x8a6a30,
};


// ── Tile → texture key mapping ─────────────────────────────────
const TILE_TEXTURE_MAP = {
  [TILE.GRASS_1]:       'tile_grass1',
  [TILE.GRASS_2]:       'tile_grass2',
  [TILE.GRASS_3]:       'tile_grass3',
  [TILE.GRASS_FLOWERS]: 'tile_grass_flowers',
  [TILE.DIRT_1]:        'tile_dirt1',
  [TILE.DIRT_2]:        'tile_dirt2',
  [TILE.DIRT_PEBBLES]:  'tile_dirt_pebbles',
  [TILE.DIRT_PATH]:     'tile_dirt_path',
  [TILE.WATER_DEEP]:    'tile_water_deep',
  [TILE.WATER_SHALLOW]: 'tile_water_shallow',
  [TILE.WATER_RIPPLE]:  'tile_water_ripple',
  [TILE.WATER_SHORE]:   'tile_water_shore',
};

// ── Nature type → display size mapping ─────────────────────────
const NATURE_DISPLAY_SIZE = {
  [NATURE.TREE_SMALL]:  { w: 48, h: 56 },
  [NATURE.TREE_LARGE]:  { w: 56, h: 64 },
  [NATURE.TREE_PINE]:   { w: 44, h: 60 },
  [NATURE.TREE_AUTUMN]: { w: 48, h: 56 },
  [NATURE.ROCK_SMALL]:  { w: 32, h: 28 },
  [NATURE.ROCK_LARGE]:  { w: 44, h: 36 },
  [NATURE.IRON_ORE]:    { w: 36, h: 32 },
  [NATURE.BUSH_BERRY]:  { w: 40, h: 36 },
  [NATURE.BUSH_SHRUB]:  { w: 38, h: 34 },
  [NATURE.TALL_GRASS]:  { w: 36, h: 34 },
  [NATURE.STUMP]:       { w: 32, h: 28 },
};

/**
 * Return the correct texture key for a settler based on gender/activity/direction.
 */
function getSettlerTexture(settler) {
  const g = settler.gender; // 'male' or 'female'
  const act = settler.currentActivity;

  if (act === 'sleeping' || act === 'knockedOut') return g + '_sleep';
  if (act === 'chopping')                          return 'male_chop';
  if (act === 'mining')                            return 'male_mine';
  if (act === 'foraging')                          return 'female_forage';
  if (act === 'building')                          return 'female_build';
  if (act === 'carrying' || act === 'crafting')    return g + '_carry';

  // Directional idle / walking
  const dir = settler.direction;
  if (dir === 'up')    return g + '_back';
  if (dir === 'left')  return g + '_left';
  if (dir === 'right') return g + '_right';
  return g + '_front';
}


// ═══════════ BOOT SCENE ═══════════

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // ── Loading progress bar ──────────────────────────────────
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x333333, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Loading sprites...', {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    this.load.on('progress', function (value) {
      progressBar.clear();
      progressBar.fillStyle(0x44aa88, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
      percentText.setText(Math.round(value * 100) + '%');
    });

    this.load.on('complete', function () {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // ── Ground tiles (64×64 solid-color PNGs) ─────────────────
    this.load.image('tile_grass1',       'assets/sprites/individual/tiles/grass1.png');
    this.load.image('tile_grass2',       'assets/sprites/individual/tiles/grass2.png');
    this.load.image('tile_grass3',       'assets/sprites/individual/tiles/grass3.png');
    this.load.image('tile_grass_flowers','assets/sprites/individual/tiles/grass_flowers.png');
    this.load.image('tile_dirt1',        'assets/sprites/individual/tiles/dirt1.png');
    this.load.image('tile_dirt2',        'assets/sprites/individual/tiles/dirt2.png');
    this.load.image('tile_dirt_pebbles', 'assets/sprites/individual/tiles/dirt_pebbles.png');
    this.load.image('tile_dirt_path',    'assets/sprites/individual/tiles/dirt_path.png');
    this.load.image('tile_water_deep',   'assets/sprites/individual/tiles/water_deep.png');
    this.load.image('tile_water_shallow','assets/sprites/individual/tiles/water_shallow.png');
    this.load.image('tile_water_ripple', 'assets/sprites/individual/tiles/water_ripple.png');
    this.load.image('tile_water_shore',  'assets/sprites/individual/tiles/water_shore.png');
    this.load.image('tile_transition1',  'assets/sprites/individual/tiles/transition1.png');
    this.load.image('tile_transition2',  'assets/sprites/individual/tiles/transition2.png');
    this.load.image('tile_transition3',  'assets/sprites/individual/tiles/transition3.png');
    this.load.image('tile_transition4',  'assets/sprites/individual/tiles/transition4.png');

    // ── Nature objects ─────────────────────────────────────────
    this.load.image('tree_small',  'assets/sprites/individual/nature/tree_small.png');
    this.load.image('tree_large',  'assets/sprites/individual/nature/tree_large.png');
    this.load.image('tree_pine',   'assets/sprites/individual/nature/tree_pine.png');
    this.load.image('tree_autumn', 'assets/sprites/individual/nature/tree_autumn.png');
    this.load.image('rock_small',  'assets/sprites/individual/nature/rock_small.png');
    this.load.image('rock_large',  'assets/sprites/individual/nature/rock_large.png');
    this.load.image('rock_mossy',  'assets/sprites/individual/nature/rock_mossy.png');
    this.load.image('iron_ore',    'assets/sprites/individual/nature/iron_ore.png');
    this.load.image('bush_berry',  'assets/sprites/individual/nature/bush_berry.png');
    this.load.image('bush_shrub',  'assets/sprites/individual/nature/bush_shrub.png');
    this.load.image('tall_grass',  'assets/sprites/individual/nature/tall_grass.png');
    this.load.image('flower_bush', 'assets/sprites/individual/nature/flower_bush.png');
    this.load.image('stump',       'assets/sprites/individual/nature/stump.png');
    this.load.image('fallen_log',  'assets/sprites/individual/nature/fallen_log.png');
    this.load.image('pond',        'assets/sprites/individual/nature/pond.png');
    this.load.image('mushrooms',   'assets/sprites/individual/nature/mushrooms.png');

    // ── Settlers ───────────────────────────────────────────────
    this.load.image('male_front',    'assets/sprites/individual/settlers/male_front.png');
    this.load.image('male_back',     'assets/sprites/individual/settlers/male_back.png');
    this.load.image('male_left',     'assets/sprites/individual/settlers/male_left.png');
    this.load.image('male_right',    'assets/sprites/individual/settlers/male_right.png');
    this.load.image('male_chop',     'assets/sprites/individual/settlers/male_chop.png');
    this.load.image('male_mine',     'assets/sprites/individual/settlers/male_mine.png');
    this.load.image('male_carry',    'assets/sprites/individual/settlers/male_carry.png');
    this.load.image('male_sleep',    'assets/sprites/individual/settlers/male_sleep.png');
    this.load.image('female_front',  'assets/sprites/individual/settlers/female_front.png');
    this.load.image('female_back',   'assets/sprites/individual/settlers/female_back.png');
    this.load.image('female_left',   'assets/sprites/individual/settlers/female_left.png');
    this.load.image('female_right',  'assets/sprites/individual/settlers/female_right.png');
    this.load.image('female_forage', 'assets/sprites/individual/settlers/female_forage.png');
    this.load.image('female_build',  'assets/sprites/individual/settlers/female_build.png');
    this.load.image('female_carry',  'assets/sprites/individual/settlers/female_carry.png');
    this.load.image('female_sleep',  'assets/sprites/individual/settlers/female_sleep.png');

    // ── Enemies ────────────────────────────────────────────────
    this.load.image('zombie_idle',    'assets/sprites/individual/enemies/zombie_1.png');
    this.load.image('zombie_attack',  'assets/sprites/individual/enemies/zombie_6.png');
    this.load.image('skeleton_idle',  'assets/sprites/individual/enemies/skeleton_1.png');
    this.load.image('skeleton_attack','assets/sprites/individual/enemies/skeleton_6.png');
    this.load.image('wolf_idle',      'assets/sprites/individual/enemies/wolf_1.png');
    this.load.image('wolf_attack',    'assets/sprites/individual/enemies/wolf_5.png');

    // ── Buildings (hut & house construction phases) ────────────
    this.load.image('hut_foundation',  'assets/sprites/individual/buildings/hut_foundation.png');
    this.load.image('hut_frame',       'assets/sprites/individual/buildings/hut_frame.png');
    this.load.image('hut_complete',    'assets/sprites/individual/buildings/hut_complete.png');
    this.load.image('house_foundation','assets/sprites/individual/buildings/house_foundation.png');
    this.load.image('house_frame',     'assets/sprites/individual/buildings/house_frame.png');
    this.load.image('house_complete',  'assets/sprites/individual/buildings/house_complete.png');
  }

  create() {
    this.scene.start('GameScene');
  }
}


// ═══════════ GAME SCENE ═══════════

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this._tileGraphics = null;
    this._natureSprites = [];
    this._settlerSprites = {};
    this._buildingSprites = {};
    this._hudUpdateTimer = 0;
    this._nightOverlay = null;
    this._lightGraphics = [];
    this._isDragging = false;
    this._dragStart = { x: 0, y: 0 };
    this._camStart = { x: 0, y: 0 };
    this._enemySprites = {};
    this._prevPhase = null;
    this._prevDayNumber = 1;
    this._deathNotifications = [];
    this._knockoutIndicators = {};
    this._notificationTexts = [];
    this._minimapGraphics = null;
    this._minimapBg = null;
    this._minimapViewport = null;
    this._minimapTimer = 0;
    this._minimapContainer = null;
    // Visual feedback (Phase 10)
    this._settlerHealthBars = {};
    this._buildingProgressBars = {};
    this._floatingTextPool = [];
    this._floatingTextPoolSize = 20;
    this._activeFloatingTexts = [];
    this._phaseNotifications = [];
    this._dayCounterText = null;
    // Performance (Phase 10)
    this._cullingTimer = 0;
    this._aiRoundRobinIndex = 0;
  }

  create() {
    const isLoadedFromSave = _state.gameStarted && _state.tileMap.length > 0;

    if (isLoadedFromSave) {
      // ── Loading from save — skip generation ───────────────
      initPathfinding();
      this.renderTileMap();
      this.renderNatureObjects();
      this.renderBuildings();
      this.createSettlerSprites();
    } else {
      // ── New game — generate fresh world ───────────────────
      const seed = Date.now();
      generateWorld(seed);
      initPathfinding();
      this.renderTileMap();
      this.renderNatureObjects();
      this.renderBuildings();
      spawnStartingSettlers();
      this.createSettlerSprites();
    }

    // ── Camera setup ────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const centerX = Math.floor(WORLD_COLS / 2) * TILE_SIZE;
    const centerY = Math.floor(WORLD_ROWS / 2) * TILE_SIZE;
    this.cameras.main.centerOn(centerX, centerY);
    this.cameras.main.setZoom(1.0);

    // ── Camera controls: drag to pan ────────────────────────
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) return;
      this._isDragging = true;
      this._dragStart.x = pointer.x;
      this._dragStart.y = pointer.y;
      this._camStart.x = this.cameras.main.scrollX;
      this._camStart.y = this.cameras.main.scrollY;
    });

    this.input.on('pointermove', (pointer) => {
      if (!this._isDragging || !pointer.isDown) return;
      const zoom = this.cameras.main.zoom;
      const dx = (this._dragStart.x - pointer.x) / zoom;
      const dy = (this._dragStart.y - pointer.y) / zoom;

      // Cancel follow mode if player drags camera
      if ((Math.abs(dx) > 4 || Math.abs(dy) > 4) && _state.cameraFollowing !== null) {
        if (typeof stopFollowCamera === 'function') stopFollowCamera();
      }

      this.cameras.main.scrollX = this._camStart.x + dx;
      this.cameras.main.scrollY = this._camStart.y + dy;
    });

    this.input.on('pointerup', (pointer) => {
      // If barely moved, treat as a click (for settler selection)
      const movedDist = dist(this._dragStart.x, this._dragStart.y, pointer.x, pointer.y);
      if (movedDist < 8) {
        this.handleMapClick(pointer);
      }
      this._isDragging = false;
    });

    // ── Camera controls: scroll to zoom ─────────────────────
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const cam = this.cameras.main;
      if (deltaY > 0) {
        cam.zoom = clamp(cam.zoom - CAMERA_ZOOM_STEP, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
      } else {
        cam.zoom = clamp(cam.zoom + CAMERA_ZOOM_STEP, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
      }
    });

    // ── Night overlay ──────────────────────────────────────
    this._nightOverlay = this.add.graphics();
    this._nightOverlay.setDepth(50);
    this._nightOverlay.setVisible(false);

    // ── Initialize day/night cycle (skip on load — resume from saved cycleTime) ──
    if (!isLoadedFromSave && typeof initDayNight === 'function') {
      initDayNight();
    }

    // ── Show HUD ────────────────────────────────────────────
    showHUD();
    updateHUD();

    // ── Initialize minimap ───────────────────────────────────
    this.initMinimap();

    // ── Initialize camera system ──────────────────────────────
    if (typeof initCamera === 'function') {
      initCamera(this);
    }

    // ── Initialize player actions ─────────────────────────────
    if (typeof initPlayerActions === 'function') {
      initPlayerActions(this);
    }

    // ── Initialize floating text pool ───────────��───────────
    this.initFloatingTextPool();

    // ── Mark game as running ────────────────────────────────
    _state.gameRunning = true;
    _state.gameStarted = true;

    // ── Hide loading screen ─────────────────────────────────
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      if (loadingScreen._dotInterval) clearInterval(loadingScreen._dotInterval);
      loadingScreen.classList.add('hidden');
    }
  }


  update(time, delta) {
    if (!_state.gameRunning || _state.menuOpen) return;

    // ── Update nature objects (regrowth) ────────────────────
    if (typeof updateNatureObjects === 'function') {
      updateNatureObjects(Date.now());
    }

    // ── Update settlers ─────────────────────────────────────
    updateSettlers(delta);

    // ── Update population growth ───────────────────────────
    if (typeof updatePopulationGrowth === 'function') {
      updatePopulationGrowth(delta);
    }

    // ── Update farms (passive food) ────────────────────────
    if (typeof updateFarms === 'function') {
      updateFarms(delta);
    }

    // ── Update follow camera ──────────────────────────────────
    if (typeof updateFollowCamera === 'function') {
      updateFollowCamera();
    }

    // ── Update settler sprites ──────────────────────────────
    this.updateSettlerSprites();

    // ── Update building sprites ─────────────────────────────
    this.updateBuildingSprites();

    // ── Update nature object visuals ────────────────────────
    this.updateNatureVisuals();

    // ── Update day/night cycle ────────────────────────────
    if (typeof updateDayNight === 'function') {
      updateDayNight(delta);
    }
    this.handlePhaseTransitions();
    this.updateNightOverlay();
    this.updateLightSources();

    // ── Update enemies ──────────────────────────────────────
    if (typeof isNight === 'function' && isNight()) {
      if (typeof updateEnemies === 'function') {
        updateEnemies(delta);
      }
      if (typeof updateCombat === 'function') {
        updateCombat(delta);
      }
    }
    this.updateEnemySprites();
    this.updateKnockoutIndicators();
    this.updateDeathNotifications(delta);
    this.updateNotifications();

    // ── Visual feedback (Phase 10) ──────────────────────────
    this.updateSettlerHealthBars();
    this.updateBuildingProgressBars();
    this.updateFloatingTexts(delta);

    // Process floating text queue from resource deposits
    if (_state._floatingTextQueue && _state._floatingTextQueue.length > 0) {
      for (const ft of _state._floatingTextQueue) {
        this.showFloatingText(ft.x, ft.y, ft.resource, ft.amount);
      }
      _state._floatingTextQueue = [];
    }

    // ── Update HUD every 500ms ──────────────────────────────
    this._hudUpdateTimer += delta;
    if (this._hudUpdateTimer > 500) {
      this._hudUpdateTimer = 0;
      updateHUD();
      updateSettlerInfoPanel();
    }

    // ── Cull off-screen nature objects every 500ms ─────────
    this._cullingTimer += delta;
    if (this._cullingTimer > 500) {
      this._cullingTimer = 0;
      this.cullOffscreenNature();
    }

    // ── Update minimap every 500ms ─────────────────────────
    this._minimapTimer += delta;
    if (this._minimapTimer > 500) {
      this._minimapTimer = 0;
      this.updateMinimap();
    }
    this.updateMinimapViewport();

    // Reposition minimap on window resize
    if (this._minimapContainer) {
      const expectedY = this.cameras.main.height - 135 - 10;
      if (Math.abs(this._minimapContainer.y - expectedY) > 1) {
        this._minimapContainer.y = expectedY;
      }
    }
  }


  // ── Night Overlay & Lighting ───────────────────────────────

  updateNightOverlay() {
    if (typeof getDaylightTint !== 'function') return;

    const tint = getDaylightTint();
    if (!tint) {
      this._nightOverlay.setVisible(false);
      return;
    }

    this._nightOverlay.clear();
    this._nightOverlay.fillStyle(tint.color, tint.alpha);
    this._nightOverlay.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this._nightOverlay.setVisible(true);
  }


  updateLightSources() {
    // Clear previous light graphics
    for (const lg of this._lightGraphics) {
      lg.destroy();
    }
    this._lightGraphics = [];

    if (typeof isNight !== 'function') return;
    if (!isNight() && !isDusk() && !isDawn()) return;

    // Calculate light intensity based on phase
    let lightAlpha = 0;
    if (typeof getDaylightTint === 'function') {
      const tint = getDaylightTint();
      if (tint) lightAlpha = tint.alpha;
    }
    if (lightAlpha < 0.1) return;

    // Gather light source positions
    const sources = [];

    // Completed campfires — large radius
    for (const b of _state.buildings) {
      if (b.phase < BUILD_PHASE.COMPLETE) continue;
      const def = BUILDING_DEFS[b.type];
      if (!def) continue;
      const cx = b.col * TILE_SIZE + (def.size.w * TILE_SIZE) / 2;
      const cy = b.row * TILE_SIZE + (def.size.h * TILE_SIZE) / 2;

      if (b.type === BUILDING.CAMPFIRE) {
        sources.push({ x: cx, y: cy, radius: 150, color: 0xffaa44 });
      } else {
        sources.push({ x: cx, y: cy, radius: 100, color: 0xeebb66 });
      }
    }

    // Draw light circles
    for (const src of sources) {
      const gfx = this.add.graphics();
      gfx.setDepth(51);

      // Draw concentric circles with decreasing alpha for soft glow
      const steps = 8;
      for (let i = steps; i >= 0; i--) {
        const r = src.radius * (i / steps);
        const a = (1 - i / steps) * 0.25 * (lightAlpha / 0.5);
        gfx.fillStyle(src.color, a);
        gfx.fillCircle(src.x, src.y, r);
      }

      this._lightGraphics.push(gfx);
    }
  }


  // ── Phase Transitions ───────────────────────────────────────

  handlePhaseTransitions() {
    const currentPhase = _state.currentPhase;
    if (this._prevPhase === currentPhase) return;

    const prevPhase = this._prevPhase;
    this._prevPhase = currentPhase;

    if (prevPhase === null) {
      // Set initial ambient layer
      if (typeof setAmbientLayer === 'function') {
        const ambientMap = {};
        ambientMap[DAY_PHASE.DAY] = 'dayAmbient';
        ambientMap[DAY_PHASE.DUSK] = 'duskAmbient';
        ambientMap[DAY_PHASE.NIGHT] = 'nightAmbient';
        ambientMap[DAY_PHASE.DAWN] = 'dawnAmbient';
        setAmbientLayer(ambientMap[currentPhase] || 'dayAmbient');
      }
      return;
    }

    // Switch ambient layer on phase change
    if (typeof setAmbientLayer === 'function') {
      const ambientMap = {};
      ambientMap[DAY_PHASE.DAY] = 'dayAmbient';
      ambientMap[DAY_PHASE.DUSK] = 'duskAmbient';
      ambientMap[DAY_PHASE.NIGHT] = 'nightAmbient';
      ambientMap[DAY_PHASE.DAWN] = 'dawnAmbient';
      setAmbientLayer(ambientMap[currentPhase] || 'dayAmbient');
    }

    // DUSK begins — warn player
    if (currentPhase === DAY_PHASE.DUSK && prevPhase === DAY_PHASE.DAY) {
      this.showPhaseNotification('Night is approaching...', '#ff9944', 2500);
    }

    // NIGHT begins — spawn enemies, notify
    if (currentPhase === DAY_PHASE.NIGHT && prevPhase !== DAY_PHASE.NIGHT) {
      this.showPhaseNotification('Night has fallen', '#4466aa', 2500);
      if (typeof spawnEnemies === 'function') {
        spawnEnemies();
      }
    }

    // DAWN begins — despawn enemies, notify
    if (currentPhase === DAY_PHASE.DAWN && prevPhase === DAY_PHASE.NIGHT) {
      this.showPhaseNotification('A new day begins', '#ffcc44', 2500);
      if (typeof despawnAllEnemies === 'function') {
        despawnAllEnemies();
      }
      this.clearAllEnemySprites();
    }

    // New day — handle day transition, show day counter
    if (_state.dayNumber !== this._prevDayNumber) {
      this._prevDayNumber = _state.dayNumber;
      this.showDayCounter(_state.dayNumber);
      if (typeof handleDayTransition === 'function') {
        handleDayTransition();
      }
    }
  }


  // ── Enemy Rendering ────────────────────────────────────────

  createEnemySprite(enemy) {
    const def = ENEMY_DEFS[enemy.type];
    if (!def) return;

    const ENEMY_IDLE_KEY = {
      [ENEMY_TYPE.ZOMBIE]:   'zombie_idle',
      [ENEMY_TYPE.SKELETON]: 'skeleton_idle',
      [ENEMY_TYPE.WOLF]:     'wolf_idle',
    };

    const idleKey = ENEMY_IDLE_KEY[enemy.type] || 'zombie_idle';
    const ew = enemy.type === ENEMY_TYPE.WOLF ? 36 : 30;
    const eh = enemy.type === ENEMY_TYPE.WOLF ? 30 : 38;

    const bodyObj = this.add.image(0, 0, idleKey);
    bodyObj.setDisplaySize(ew, eh);
    bodyObj.setDepth(10);
    bodyObj.setData('currentTexture', idleKey);

    const container = this.add.container(enemy.x, enemy.y, [bodyObj]);
    container.setDepth(10);
    container.setData('enemyId', enemy.id);
    container.setData('bodyObj', bodyObj);
    container.setData('enemyType', enemy.type);

    // Type label
    const label = this.add.text(0, -16, def.name, {
      fontFamily: 'VT323',
      fontSize: '11px',
      color: '#ff6666',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    container.add(label);

    // HP bar background
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x333333, 0.8);
    hpBg.fillRect(-12, -22, 24, 3);
    container.add(hpBg);

    // HP bar fill
    const hpBar = this.add.graphics();
    hpBar.fillStyle(0xff3333, 1);
    hpBar.fillRect(-12, -22, 24, 3);
    container.add(hpBar);
    container.setData('hpBar', hpBar);
    container.setData('gfx', bodyObj);

    this._enemySprites[enemy.id] = container;
    enemy.sprite = container;
  }


  updateEnemySprites() {
    // Create sprites for new enemies
    for (const enemy of _state.enemies) {
      if (!enemy.isDead && !this._enemySprites[enemy.id]) {
        this.createEnemySprite(enemy);
      }
    }

    // Update positions and HP bars
    for (const enemy of _state.enemies) {
      const container = this._enemySprites[enemy.id];
      if (!container) continue;

      if (enemy.isDead) {
        // Fade out and destroy
        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            container.destroy();
          }
        });
        delete this._enemySprites[enemy.id];
        continue;
      }

      container.x = enemy.x;
      container.y = enemy.y;

      // Swap between idle and attack textures
      const bodyObj = container.getData('bodyObj');
      if (bodyObj) {
        const etype = container.getData('enemyType');
        const isAttacking = enemy.target != null && enemy.attackCooldown != null && enemy.attackCooldown <= 0;
        const desiredKey = etype + (isAttacking ? '_attack' : '_idle');
        if (bodyObj.getData('currentTexture') !== desiredKey) {
          bodyObj.setTexture(desiredKey);
          bodyObj.setData('currentTexture', desiredKey);
        }
      }

      // Update HP bar
      const hpBar = container.getData('hpBar');
      if (hpBar) {
        hpBar.clear();
        const ratio = enemy.hp / enemy.maxHp;
        const barWidth = Math.max(0, 24 * ratio);
        hpBar.fillStyle(ratio > 0.5 ? 0xff3333 : 0xff0000, 1);
        hpBar.fillRect(-12, -22, barWidth, 3);
      }
    }

    // Remove dead enemies from state after fade-out is triggered
    if (typeof removeDeadEnemies === 'function') {
      removeDeadEnemies();
    }

    // Clean up sprites for enemies no longer in state
    for (const id in this._enemySprites) {
      const exists = _state.enemies.some(e => e.id === parseInt(id));
      if (!exists) {
        const container = this._enemySprites[id];
        if (container) container.destroy();
        delete this._enemySprites[id];
      }
    }
  }


  clearAllEnemySprites() {
    for (const id in this._enemySprites) {
      const container = this._enemySprites[id];
      if (container) container.destroy();
    }
    this._enemySprites = {};
  }


  // ── Knockout & Death Visuals ───────────────────────────────

  updateKnockoutIndicators() {
    // Create indicators for knocked-out settlers
    for (const settler of _state.settlers) {
      if (settler.isKnockedOut && !this._knockoutIndicators[settler.id]) {
        this.createKnockoutIndicator(settler);
      }
      if (!settler.isKnockedOut && this._knockoutIndicators[settler.id]) {
        this._knockoutIndicators[settler.id].destroy();
        delete this._knockoutIndicators[settler.id];
        // Restore settler sprite appearance
        const container = this._settlerSprites[settler.id];
        if (container) {
          container.setScale(1, 1);
          container.setAlpha(1);
        }
      }
    }

    // Update positions of existing indicators
    for (const settler of _state.settlers) {
      if (!settler.isKnockedOut) continue;

      const indicator = this._knockoutIndicators[settler.id];
      if (indicator) {
        indicator.x = settler.x;
        indicator.y = settler.y - 30;
      }

      // Flatten settler sprite to show they're down
      const container = this._settlerSprites[settler.id];
      if (container) {
        container.setScale(1, 0.4);
        container.setAlpha(0.7);
      }
    }

    // Clean up indicators for settlers no longer in state
    for (const id in this._knockoutIndicators) {
      const exists = _state.settlers.some(s => s.id === parseInt(id));
      if (!exists) {
        this._knockoutIndicators[id].destroy();
        delete this._knockoutIndicators[id];
      }
    }
  }


  createKnockoutIndicator(settler) {
    const text = this.add.text(settler.x, settler.y - 30, '!', {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    text.setDepth(15);

    // Pulsing animation
    this.tweens.add({
      targets: text,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this._knockoutIndicators[settler.id] = text;
  }


  showDeathNotification(name) {
    const cam = this.cameras.main;
    const screenX = cam.width / 2;
    const screenY = cam.height * 0.3;

    const text = this.add.text(screenX, screenY, 'RIP ' + name, {
      fontFamily: 'VT323',
      fontSize: '28px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    text.setDepth(100);
    text.setScrollFactor(0);

    this._deathNotifications.push({ text: text, timer: 2000 });
  }


  updateDeathNotifications(delta) {
    for (let i = this._deathNotifications.length - 1; i >= 0; i--) {
      const notif = this._deathNotifications[i];
      notif.timer -= delta;
      notif.text.setAlpha(clamp(notif.timer / 500, 0, 1));
      if (notif.timer <= 0) {
        notif.text.destroy();
        this._deathNotifications.splice(i, 1);
      }
    }
  }


  // ── Notifications ──────────────────────────────────────────

  updateNotifications() {
    const now = Date.now();

    // Remove expired notifications from state
    for (let i = _state.notifications.length - 1; i >= 0; i--) {
      const notif = _state.notifications[i];
      if (now - notif.time >= notif.duration) {
        _state.notifications.splice(i, 1);
      }
    }

    // Destroy old text objects
    for (const textObj of this._notificationTexts) {
      textObj.destroy();
    }
    this._notificationTexts = [];

    // Create text objects for active notifications
    const cam = this.cameras.main;
    const startY = 40;
    const spacing = 30;

    for (let i = 0; i < _state.notifications.length; i++) {
      const notif = _state.notifications[i];
      const elapsed = now - notif.time;
      const remaining = notif.duration - elapsed;
      const alpha = remaining < 500 ? remaining / 500 : 1;

      const text = this.add.text(cam.width / 2, startY + i * spacing, notif.text, {
        fontFamily: 'VT323',
        fontSize: '22px',
        color: '#ffdd44',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 0.5);
      text.setDepth(100);
      text.setScrollFactor(0);
      text.setAlpha(alpha);

      this._notificationTexts.push(text);
    }
  }


  // ── Rendering ───────────────────────────────────────────────

  renderTileMap() {
    // Render all tiles to a single RenderTexture for performance.
    // Tile PNGs are 64×64 and drawn at their natural size.
    this._groundLayer = this.add.renderTexture(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this._groundLayer.setDepth(0);

    for (let row = 0; row < WORLD_ROWS; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        const tileType = _state.tileMap[row][col];
        const key = TILE_TEXTURE_MAP[tileType];
        if (key) {
          this._groundLayer.drawFrame(key, undefined, col * TILE_SIZE, row * TILE_SIZE);
        } else {
          // Unmapped tile type: draw solid dark rect as fallback
          const color = TILE_COLORS[tileType] || 0x333333;
          const tempGfx = this.add.graphics();
          tempGfx.setVisible(false);
          tempGfx.fillStyle(color, 1);
          tempGfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          this._groundLayer.draw(tempGfx, col * TILE_SIZE, row * TILE_SIZE);
          tempGfx.destroy();
        }
      }
    }
  }


  renderNatureObjects() {
    for (const obj of _state.natureObjects) {
      const worldPos = tileToWorld(obj.col, obj.row);
      const key = obj.type; // NATURE constants match texture keys
      const size = NATURE_DISPLAY_SIZE[obj.type];
      if (!size) continue;

      const img = this.add.image(worldPos.x, worldPos.y, key);
      img.setDisplaySize(size.w, size.h);
      img.setDepth(1);
      img.setData('natureType', obj.type);
      img.setData('origW', size.w);
      img.setData('origH', size.h);
      obj.sprite = img;
      this._natureSprites.push(img);
    }
  }


  createSettlerSprites() {
    for (const settler of _state.settlers) {
      this.createSettlerSprite(settler);
    }
  }


  createSettlerSprite(settler) {
    const initKey = getSettlerTexture(settler);
    const sw = settler.isChild ? 20 : 28;
    const sh = settler.isChild ? 26 : 36;

    const bodyObj = this.add.image(0, 0, initKey);
    bodyObj.setDisplaySize(sw, sh);
    bodyObj.setDepth(10);
    bodyObj.setData('currentTexture', initKey);

    const container = this.add.container(settler.x, settler.y, [bodyObj]);
    container.setDepth(10);
    container.setSize(24, 32);
    container.setInteractive();
    container.setData('bodyObj', bodyObj);

    // Name label
    const nameText = this.add.text(0, -22, settler.name, {
      fontFamily: 'VT323',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    container.add(nameText);

    // Activity label
    const activityText = this.add.text(0, -10, '', {
      fontFamily: 'VT323',
      fontSize: '11px',
      color: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5, 1);
    activityText.setVisible(false);
    container.add(activityText);
    container.setData('activityLabel', activityText);

    container.setData('settlerName', settler.name);
    container.setData('isChild', settler.isChild);
    container.setData('settlerGender', settler.gender);
    this._settlerSprites[settler.id] = container;
    settler.sprite = container;

    container.on('pointerdown', (pointer) => {
      if (dist(this._dragStart.x, this._dragStart.y, pointer.x, pointer.y) < 8) {
        showSettlerInfo(settler);
      }
    });
  }


  updateSettlerSprites() {
    // Remove sprites for settlers no longer in state (permadeath)
    for (const id in this._settlerSprites) {
      const exists = _state.settlers.some(s => s.id === parseInt(id));
      if (!exists) {
        const container = this._settlerSprites[id];
        if (container) {
          // Find the settler name from the container before destroying
          const nameLabel = container.list ? container.list.find(c => c.type === 'Text' && c.style && c.style.fontSize === '14px') : null;
          const deathName = container.getData('settlerName');
          if (deathName) {
            this.showDeathNotification(deathName);
            _state.notifications.push({
              text: 'RIP ' + deathName,
              time: Date.now(),
              duration: 3000,
            });
          }
          container.destroy();
        }
        delete this._settlerSprites[id];
      }
    }

    for (const settler of _state.settlers) {
      let container = this._settlerSprites[settler.id];
      if (!container) {
        // New settler appeared — create sprite
        this.createSettlerSprite(settler);
        continue;
      }

      // Recreate sprite when child grows into adult
      if (container.getData('isChild') && !settler.isChild) {
        container.destroy();
        delete this._settlerSprites[settler.id];
        this.createSettlerSprite(settler);
        container = this._settlerSprites[settler.id];
      }

      container.x = settler.x;
      container.y = settler.y;

      // Update sprite texture based on activity/direction
      const bodyObj = container.getData('bodyObj');
      if (bodyObj) {
        const desiredKey = getSettlerTexture(settler);
        if (bodyObj.getData('currentTexture') !== desiredKey) {
          bodyObj.setTexture(desiredKey);
          bodyObj.setData('currentTexture', desiredKey);
        }
      }

      // Update activity label
      const actLabel = container.getData('activityLabel');
      if (actLabel) {
        const act = settler.currentActivity;
        if (act === 'chopping' || act === 'mining' || act === 'foraging' || act === 'eating' || act === 'building' || act === 'crafting' || act === 'sleeping' || act === 'guarding' || act === 'fighting' || act === 'fleeing' || act === 'rescuing' || act === 'knockedOut') {
          actLabel.setText('[' + act + ']');
          actLabel.setVisible(true);
          // Color the label based on activity
          if (act === 'fighting') actLabel.setColor('#ff6666');
          else if (act === 'fleeing') actLabel.setColor('#ffaa44');
          else if (act === 'knockedOut') actLabel.setColor('#ff0000');
          else if (act === 'rescuing') actLabel.setColor('#44ff44');
          else actLabel.setColor('#aaaaaa');
        } else {
          actLabel.setVisible(false);
        }
      }
    }
  }


  updateNatureVisuals() {
    for (const obj of _state.natureObjects) {
      if (!obj.sprite) continue;

      if (obj.depleted && !obj._visualDepleted) {
        obj._visualDepleted = true;

        if (obj.type.startsWith('tree_')) {
          // Swap depleted tree to stump texture
          obj.sprite.setTexture('stump');
          obj.sprite.setDisplaySize(32, 28);
        } else if (obj.type === NATURE.BUSH_BERRY) {
          // Darken berry bush to show it's empty
          obj.sprite.setTint(0x666666);
        } else {
          obj.sprite.setVisible(false);
        }
      } else if (!obj.depleted && obj._visualDepleted) {
        obj._visualDepleted = false;

        // Restore original texture and size
        const key = obj.sprite.getData('natureType') || obj.type;
        obj.sprite.setTexture(key);
        obj.sprite.clearTint();
        const origW = obj.sprite.getData('origW') || 48;
        const origH = obj.sprite.getData('origH') || 48;
        obj.sprite.setDisplaySize(origW, origH);
        obj.sprite.setVisible(true);
      }
    }
  }


  // ── Building Rendering ──────────────────────────────────────

  renderBuildings() {
    for (const building of _state.buildings) {
      this.createBuildingSprite(building);
    }
  }


  createBuildingSprite(building) {
    const def = BUILDING_DEFS[building.type];
    if (!def) return;

    const w = def.size.w * TILE_SIZE;
    const h = def.size.h * TILE_SIZE;
    const x = building.col * TILE_SIZE;
    const y = building.row * TILE_SIZE;

    // Check if this building type has sprite phases (hut/house only)
    const spriteKey = this._getBuildingPhaseSprite(building.type, building.phase);

    if (spriteKey) {
      const displayW = building.type === BUILDING.HOUSE ? 112 : 80;
      const displayH = building.type === BUILDING.HOUSE ? 112 : 80;
      const img = this.add.image(x + w / 2, y + h / 2, spriteKey);
      img.setDisplaySize(displayW, displayH);
      img.setDepth(2);
      img.setData('phase', building.phase);
      img.setData('isSprite', true);
      img.setData('buildingType', building.type);
      building.sprite = img;
      this._buildingSprites[building.id] = img;
    } else {
      // Fallback: colored rectangle
      const color = BUILDING_COLORS[building.type] || 0x888888;
      const opacity = this.getBuildPhaseOpacity(building.phase);
      const gfx = this.add.graphics();
      gfx.setDepth(2);

      gfx.fillStyle(0x000000, 0.15 * opacity);
      gfx.fillRect(x + 3, y + 3, w, h);
      gfx.fillStyle(color, opacity);
      gfx.fillRect(x, y, w, h);
      gfx.lineStyle(1, 0x000000, 0.3 * opacity);
      gfx.strokeRect(x, y, w, h);

      building.sprite = gfx;
      gfx.setData('phase', building.phase);
      gfx.setData('isSprite', false);
      this._buildingSprites[building.id] = gfx;
    }
  }

  _getBuildingPhaseSprite(buildingType, phase) {
    // Only hut and house have sprite phases
    if (buildingType !== BUILDING.HUT && buildingType !== BUILDING.HOUSE) return null;

    const prefix = buildingType === BUILDING.HUT ? 'hut' : 'house';
    if (phase === BUILD_PHASE.FOUNDATION) return prefix + '_foundation';
    if (phase === BUILD_PHASE.FRAME) return prefix + '_frame';
    // WALLS and COMPLETE both use the complete sprite
    if (phase >= BUILD_PHASE.WALLS) return prefix + '_complete';
    return prefix + '_foundation';
  }


  getBuildPhaseOpacity(phase) {
    if (phase === BUILD_PHASE.FOUNDATION) return 0.3;
    if (phase === BUILD_PHASE.FRAME) return 0.5;
    if (phase === BUILD_PHASE.WALLS) return 0.75;
    return 1.0;
  }


  updateBuildingSprites() {
    // Remove sprites for destroyed buildings
    for (const id in this._buildingSprites) {
      const exists = _state.buildings.some(b => b.id === parseInt(id));
      if (!exists) {
        const gfx = this._buildingSprites[id];
        if (gfx) gfx.destroy();
        delete this._buildingSprites[id];
      }
    }

    // Create sprites for any new buildings
    for (const building of _state.buildings) {
      if (!this._buildingSprites[building.id]) {
        this.createBuildingSprite(building);
      }
    }

    // Update existing building sprites when phase changes
    for (const building of _state.buildings) {
      const obj = this._buildingSprites[building.id];
      if (!obj) continue;

      const trackedPhase = obj.getData('phase');
      if (trackedPhase !== building.phase) {
        if (obj.getData('isSprite')) {
          // Sprite-based (hut/house): swap texture
          const spriteKey = this._getBuildingPhaseSprite(building.type, building.phase);
          if (spriteKey) {
            obj.setTexture(spriteKey);
          }
          obj.setData('phase', building.phase);
        } else {
          // Graphics-based: redraw colored rectangle
          obj.clear();
          const def = BUILDING_DEFS[building.type];
          if (!def) continue;

          const color = BUILDING_COLORS[building.type] || 0x888888;
          const w = def.size.w * TILE_SIZE;
          const h = def.size.h * TILE_SIZE;
          const x = building.col * TILE_SIZE;
          const y = building.row * TILE_SIZE;
          const opacity = this.getBuildPhaseOpacity(building.phase);

          obj.fillStyle(0x000000, 0.15 * opacity);
          obj.fillRect(x + 3, y + 3, w, h);
          obj.fillStyle(color, opacity);
          obj.fillRect(x, y, w, h);
          obj.lineStyle(1, 0x000000, 0.3 * opacity);
          obj.strokeRect(x, y, w, h);

          obj.setData('phase', building.phase);
        }
      }
    }
  }


  // ── Interaction ─────────────────────────────────────────────

  handleMapClick(pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // If drop action is active, execute it instead of selecting
    if (_state.activeAction && typeof executeDropAction === 'function') {
      executeDropAction(worldPoint.x, worldPoint.y);
      return;
    }

    // Check if clicking a settler
    let clickedSettler = null;
    for (const settler of _state.settlers) {
      const d = dist(worldPoint.x, worldPoint.y, settler.x, settler.y);
      if (d < 20) {
        clickedSettler = settler;
        break;
      }
    }

    if (clickedSettler) {
      showSettlerInfo(clickedSettler);
    } else {
      // Cancel follow mode when clicking empty ground
      if (_state.cameraFollowing !== null && typeof stopFollowCamera === 'function') {
        stopFollowCamera();
      }
      hideSettlerInfo();
    }
  }


  // ── Minimap ─────────────────────────────────────────────────

  initMinimap() {
    const MINIMAP_W = 180;
    const MINIMAP_H = 135;
    const PADDING = 10;

    // Container positioned bottom-left, fixed to camera
    this._minimapContainer = this.add.container(PADDING, this.cameras.main.height - MINIMAP_H - PADDING);
    this._minimapContainer.setDepth(110);
    this._minimapContainer.setScrollFactor(0);

    // Semi-transparent background
    this._minimapBg = this.add.graphics();
    this._minimapBg.fillStyle(0x111122, 0.85);
    this._minimapBg.fillRect(-2, -2, MINIMAP_W + 4, MINIMAP_H + 4);
    this._minimapBg.lineStyle(1, 0x888888, 0.6);
    this._minimapBg.strokeRect(-2, -2, MINIMAP_W + 4, MINIMAP_H + 4);
    this._minimapContainer.add(this._minimapBg);

    // Minimap content graphics
    this._minimapGraphics = this.add.graphics();
    this._minimapContainer.add(this._minimapGraphics);

    // Viewport rectangle
    this._minimapViewport = this.add.graphics();
    this._minimapContainer.add(this._minimapViewport);

    // Make minimap interactive for click-to-move
    const hitArea = new Phaser.Geom.Rectangle(0, 0, MINIMAP_W, MINIMAP_H);
    this._minimapContainer.setSize(MINIMAP_W, MINIMAP_H);
    this._minimapContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    this._minimapContainer.on('pointerdown', (pointer) => {
      const localX = pointer.x - this._minimapContainer.x;
      const localY = pointer.y - this._minimapContainer.y;
      const worldX = (localX / MINIMAP_W) * WORLD_WIDTH;
      const worldY = (localY / MINIMAP_H) * WORLD_HEIGHT;
      this.cameras.main.centerOn(worldX, worldY);

      // Cancel follow mode
      if (_state.cameraFollowing !== null && typeof stopFollowCamera === 'function') {
        stopFollowCamera();
      }
    });

    // Initial draw
    this.updateMinimap();
  }


  updateMinimap() {
    if (!this._minimapGraphics) return;
    this._minimapGraphics.clear();

    const MINIMAP_W = 180;
    const MINIMAP_H = 135;
    const scaleX = MINIMAP_W / WORLD_COLS;
    const scaleY = MINIMAP_H / WORLD_ROWS;

    // Draw terrain — sample every tile as a small rectangle
    for (let row = 0; row < WORLD_ROWS; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        const tileType = _state.tileMap[row][col];
        const color = TILE_COLORS[tileType] || 0x333333;
        this._minimapGraphics.fillStyle(color, 1);
        this._minimapGraphics.fillRect(
          col * scaleX, row * scaleY,
          Math.ceil(scaleX), Math.ceil(scaleY)
        );
      }
    }

    // Draw buildings (brown/tan dots)
    for (const b of _state.buildings) {
      const def = BUILDING_DEFS[b.type];
      if (!def) continue;
      const bColor = BUILDING_COLORS[b.type] || 0x888888;
      this._minimapGraphics.fillStyle(bColor, 1);
      this._minimapGraphics.fillRect(
        b.col * scaleX, b.row * scaleY,
        def.size.w * scaleX, def.size.h * scaleY
      );
    }

    // Draw settlers (green dots)
    for (const settler of _state.settlers) {
      const tile = worldToTile(settler.x, settler.y);
      this._minimapGraphics.fillStyle(0x44ff44, 1);
      this._minimapGraphics.fillCircle(
        tile.col * scaleX + scaleX / 2,
        tile.row * scaleY + scaleY / 2,
        1.5
      );
    }

    // Draw enemies (red dots) during night
    if (typeof isNight === 'function' && (isNight() || isDusk())) {
      for (const enemy of _state.enemies) {
        if (enemy.isDead) continue;
        const tile = worldToTile(enemy.x, enemy.y);
        this._minimapGraphics.fillStyle(0xff4444, 1);
        this._minimapGraphics.fillCircle(
          tile.col * scaleX + scaleX / 2,
          tile.row * scaleY + scaleY / 2,
          1.5
        );
      }
    }
  }


  updateMinimapViewport() {
    if (!this._minimapViewport) return;
    this._minimapViewport.clear();

    const MINIMAP_W = 180;
    const MINIMAP_H = 135;
    const cam = this.cameras.main;

    const vx = (cam.scrollX / WORLD_WIDTH) * MINIMAP_W;
    const vy = (cam.scrollY / WORLD_HEIGHT) * MINIMAP_H;
    const vw = (cam.width / cam.zoom / WORLD_WIDTH) * MINIMAP_W;
    const vh = (cam.height / cam.zoom / WORLD_HEIGHT) * MINIMAP_H;

    this._minimapViewport.lineStyle(1, 0xffffff, 0.8);
    this._minimapViewport.strokeRect(vx, vy, vw, vh);
  }


  // ── Visual Feedback (Phase 10) ─────────────────────────────

  /**
   * Initialize the floating text pool for resource deposit numbers.
   */
  initFloatingTextPool() {
    for (let i = 0; i < this._floatingTextPoolSize; i++) {
      const text = this.add.text(0, 0, '', {
        fontFamily: 'VT323',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 1);
      text.setDepth(100);
      text.setVisible(false);
      this._floatingTextPool.push(text);
    }
  }


  /**
   * Show a floating "+N Resource" text that rises and fades.
   * Color-coded: brown=wood, gray=stone, red=food, dark gray=iron.
   */
  showFloatingText(worldX, worldY, resourceType, amount) {
    const RESOURCE_COLORS = {
      wood: '#a0744a',
      stone: '#999999',
      food: '#dd4444',
      iron: '#666666',
    };

    // Get a text object from the pool
    let textObj = null;
    for (let i = 0; i < this._floatingTextPool.length; i++) {
      if (!this._floatingTextPool[i].visible) {
        textObj = this._floatingTextPool[i];
        break;
      }
    }
    if (!textObj) return; // Pool exhausted

    const label = '+' + amount + ' ' + resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
    textObj.setText(label);
    textObj.setColor(RESOURCE_COLORS[resourceType] || '#ffffff');
    textObj.setPosition(worldX, worldY - 10);
    textObj.setAlpha(1);
    textObj.setVisible(true);

    this._activeFloatingTexts.push({
      textObj: textObj,
      startY: worldY - 10,
      timer: 0,
      duration: 1000,
    });
  }


  /**
   * Update active floating texts — rise and fade over duration.
   */
  updateFloatingTexts(delta) {
    for (let i = this._activeFloatingTexts.length - 1; i >= 0; i--) {
      const ft = this._activeFloatingTexts[i];
      ft.timer += delta;
      const progress = ft.timer / ft.duration;

      if (progress >= 1) {
        ft.textObj.setVisible(false);
        this._activeFloatingTexts.splice(i, 1);
        continue;
      }

      ft.textObj.setY(ft.startY - progress * 30); // Rise 30px
      ft.textObj.setAlpha(1 - progress); // Fade out
    }
  }


  /**
   * Update settler health bars — only show when health < 100%.
   * Red bar, 20px wide, 3px tall, above the name label.
   */
  updateSettlerHealthBars() {
    for (const settler of _state.settlers) {
      if (settler.isKnockedOut || settler.isDead) {
        // Remove health bar if settler is down
        if (this._settlerHealthBars[settler.id]) {
          this._settlerHealthBars[settler.id].destroy();
          delete this._settlerHealthBars[settler.id];
        }
        continue;
      }

      const ratio = settler.health / settler.maxHealth;
      if (ratio >= 1) {
        // Full health — hide bar
        if (this._settlerHealthBars[settler.id]) {
          this._settlerHealthBars[settler.id].setVisible(false);
        }
        continue;
      }

      // Create bar if needed
      if (!this._settlerHealthBars[settler.id]) {
        const gfx = this.add.graphics();
        gfx.setDepth(15);
        this._settlerHealthBars[settler.id] = gfx;
      }

      const bar = this._settlerHealthBars[settler.id];
      bar.clear();
      bar.setVisible(true);

      const barWidth = 20;
      const barHeight = 3;
      const x = settler.x - barWidth / 2;
      const y = settler.y - 32;

      // Background
      bar.fillStyle(0x333333, 0.8);
      bar.fillRect(x, y, barWidth, barHeight);

      // Red fill
      const fillWidth = Math.max(0, barWidth * ratio);
      bar.fillStyle(0xff3333, 1);
      bar.fillRect(x, y, fillWidth, barHeight);
    }

    // Clean up bars for settlers no longer in state
    for (const id in this._settlerHealthBars) {
      const exists = _state.settlers.some(s => s.id === parseInt(id));
      if (!exists) {
        this._settlerHealthBars[id].destroy();
        delete this._settlerHealthBars[id];
      }
    }
  }


  /**
   * Update building progress bars — show above buildings under construction.
   * Blue fill, hide when complete.
   */
  updateBuildingProgressBars() {
    for (const building of _state.buildings) {
      if (building.phase >= BUILD_PHASE.COMPLETE) {
        if (this._buildingProgressBars[building.id]) {
          this._buildingProgressBars[building.id].destroy();
          delete this._buildingProgressBars[building.id];
        }
        continue;
      }

      // Create bar if needed
      if (!this._buildingProgressBars[building.id]) {
        const gfx = this.add.graphics();
        gfx.setDepth(15);
        this._buildingProgressBars[building.id] = gfx;
      }

      const bar = this._buildingProgressBars[building.id];
      bar.clear();

      const def = BUILDING_DEFS[building.type];
      if (!def) continue;

      const barWidth = def.size.w * TILE_SIZE * 0.8;
      const barHeight = 3;
      const centerX = building.col * TILE_SIZE + (def.size.w * TILE_SIZE) / 2;
      const y = building.row * TILE_SIZE - 6;

      // Background
      bar.fillStyle(0x333333, 0.8);
      bar.fillRect(centerX - barWidth / 2, y, barWidth, barHeight);

      // Blue fill
      const ratio = building.buildProgress / building.maxBuildWork;
      const fillWidth = Math.max(0, barWidth * ratio);
      bar.fillStyle(0x4488ff, 1);
      bar.fillRect(centerX - barWidth / 2, y, fillWidth, barHeight);
    }

    // Clean up bars for buildings no longer in state
    for (const id in this._buildingProgressBars) {
      const exists = _state.buildings.some(b => b.id === parseInt(id));
      if (!exists) {
        this._buildingProgressBars[id].destroy();
        delete this._buildingProgressBars[id];
      }
    }
  }


  /**
   * Show a phase notification (night warning, dawn message, etc.)
   */
  showPhaseNotification(message, color, duration) {
    const cam = this.cameras.main;
    const text = this.add.text(cam.width / 2, cam.height * 0.35, message, {
      fontFamily: 'VT323',
      fontSize: '32px',
      color: color,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);
    text.setDepth(120);
    text.setScrollFactor(0);
    text.setAlpha(0);

    // Fade in
    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        // Hold, then fade out
        this.tweens.add({
          targets: text,
          alpha: 0,
          delay: duration - 600,
          duration: 300,
          onComplete: () => {
            text.destroy();
          }
        });
      }
    });
  }


  /**
   * Show a large centered "Day X" counter that fades in and out.
   */
  showDayCounter(dayNumber) {
    if (this._dayCounterText) {
      this._dayCounterText.destroy();
    }

    const cam = this.cameras.main;
    const text = this.add.text(cam.width / 2, cam.height * 0.25, 'Day ' + dayNumber, {
      fontFamily: 'VT323',
      fontSize: '48px',
      color: '#ffdd88',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5);
    text.setDepth(120);
    text.setScrollFactor(0);
    text.setAlpha(0);
    this._dayCounterText = text;

    // Fade in and out over 2 seconds
    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          delay: 1000,
          duration: 500,
          onComplete: () => {
            text.destroy();
            if (this._dayCounterText === text) {
              this._dayCounterText = null;
            }
          }
        });
      }
    });
  }


  // ── Performance Optimization (Phase 10) ────────────────────

  /**
   * Hide nature object sprites that are far off-screen, show those in view.
   * Uses camera viewport + 2 tile buffer to avoid pop-in.
   */
  cullOffscreenNature() {
    const cam = this.cameras.main;
    const buffer = TILE_SIZE * 2;
    const left = cam.scrollX - buffer;
    const right = cam.scrollX + cam.width / cam.zoom + buffer;
    const top = cam.scrollY - buffer;
    const bottom = cam.scrollY + cam.height / cam.zoom + buffer;

    for (const obj of _state.natureObjects) {
      if (!obj.sprite) continue;
      const wx = obj.col * TILE_SIZE + TILE_SIZE / 2;
      const wy = obj.row * TILE_SIZE + TILE_SIZE / 2;
      const inView = wx >= left && wx <= right && wy >= top && wy <= bottom;

      if (!inView) {
        obj.sprite.setVisible(false);
      } else if (obj.depleted && !obj.type.startsWith('tree_') && obj.type !== 'bush_berry') {
        // Depleted rocks/iron stay hidden (handled by updateNatureVisuals)
        obj.sprite.setVisible(false);
      } else {
        obj.sprite.setVisible(true);
      }
    }
  }
}

// ═══════════ GAME STARTUP ═══════════

let _phaserGame = null;

/**
 * Start a new game — called from main menu.
 */
function startNewGame() {
  hideMainMenu();

  // Show loading screen
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.classList.remove('hidden');
    // Animate the loading dots
    let dotCount = 0;
    const loadingText = document.getElementById('loadingText');
    const dotInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      const dots = '.'.repeat(dotCount || 1);
      if (loadingText) loadingText.textContent = 'Generating world' + dots;
    }, 400);
    // Store interval so we can clear it when loading finishes
    if (loadingScreen) loadingScreen._dotInterval = dotInterval;
  }

  // Initialize audio system
  if (typeof initAudio === 'function') {
    initAudio();
  }

  // Reset state
  _state.dayNumber = 1;
  _state.cycleTime = 0;
  _state.currentPhase = DAY_PHASE.DAY;
  _state.settlers = [];
  _state.buildings = [];
  _state.enemies = [];
  _state.natureObjects = [];
  _state.resources = { wood: 0, stone: 0, food: 20, iron: 0, fiber: 0 };
  _state.nextSettlerId = 1;
  _state.nextBuildingId = 1;
  _state.nextEnemyId = 1;
  _state.inventory = [];
  _state.selectedSettler = null;
  _state.cameraFollowing = null;
  _state.activeAction = null;
  _state.birthCooldown = 4; // First child possible around day 5-8
  _state.notifications = [];

  // Start or restart Phaser
  if (_phaserGame) {
    _phaserGame.destroy(true);
  }

  _phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'gameContainer',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene],
  });
}


/**
 * Stop the game — return to main menu.
 */
function stopGame() {
  _state.gameRunning = false;
  _state.gameStarted = false;

  if (typeof stopAutosave === 'function') {
    stopAutosave();
  }

  if (_phaserGame) {
    _phaserGame.destroy(true);
    _phaserGame = null;
  }
}


// ═══════════ BOOT ═══════════

/**
 * Application entry point — runs when page loads.
 */
function bootApp() {
  initEvents();
  showMainMenu();

  // Set version display
  const versionEl = document.getElementById('mainMenuVersion');
  if (versionEl) versionEl.textContent = GAME_VERSION;
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
