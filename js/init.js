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

const NATURE_COLORS = {
  [NATURE.TREE_SMALL]: { color: 0x3c8c32, radius: 12 },
  [NATURE.TREE_LARGE]: { color: 0x2e7a28, radius: 16 },
  [NATURE.TREE_PINE]: { color: 0x1e6e30, radius: 10 },
  [NATURE.TREE_AUTUMN]: { color: 0xc86420, radius: 12 },
  [NATURE.ROCK_SMALL]: { color: 0x8c8c8c, radius: 8 },
  [NATURE.ROCK_LARGE]: { color: 0x6e6e6e, radius: 14 },
  [NATURE.IRON_ORE]: { color: 0x504848, radius: 10 },
  [NATURE.BUSH_BERRY]: { color: 0x4aa040, radius: 10 },
  [NATURE.BUSH_SHRUB]: { color: 0x50a848, radius: 9 },
  [NATURE.TALL_GRASS]: { color: 0x60b850, radius: 7 },
  [NATURE.STUMP]: { color: 0x7a5a28, radius: 8 },
};

const SETTLER_COLORS = {
  male: 0x4488aa,
  female: 0xaa4488,
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


// ═══════════ BOOT SCENE ═══════════

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // TODO: Load spritesheet assets here
    // For Phase 1, we use colored shapes as placeholders
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

    const radius = 11;
    const gfx = this.add.graphics();
    gfx.setDepth(10);

    // Shadow
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillCircle(2, 2, radius);

    // Body
    gfx.fillStyle(def.color, 1);
    gfx.fillCircle(0, 0, radius);

    // Eyes (menacing red dots)
    gfx.fillStyle(0xff0000, 1);
    gfx.fillCircle(-3, -3, 2);
    gfx.fillCircle(3, -3, 2);

    const container = this.add.container(enemy.x, enemy.y, [gfx]);
    container.setDepth(10);
    container.setData('enemyId', enemy.id);

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
    container.setData('gfx', gfx);

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
    this._tileGraphics = this.add.graphics();
    this._tileGraphics.setDepth(0);

    for (let row = 0; row < WORLD_ROWS; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        const tileType = _state.tileMap[row][col];
        const color = TILE_COLORS[tileType] || 0x333333;
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        this._tileGraphics.fillStyle(color, 1);
        this._tileGraphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Add subtle grid lines
        this._tileGraphics.lineStyle(1, 0x000000, 0.08);
        this._tileGraphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }


  renderNatureObjects() {
    for (const obj of _state.natureObjects) {
      const info = NATURE_COLORS[obj.type];
      if (!info) continue;

      const worldPos = tileToWorld(obj.col, obj.row);
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Draw as colored circle with slight shadow
      gfx.fillStyle(0x000000, 0.2);
      gfx.fillCircle(worldPos.x + 2, worldPos.y + 2, info.radius);
      gfx.fillStyle(info.color, 1);
      gfx.fillCircle(worldPos.x, worldPos.y, info.radius);

      // Berry indicator for berry bushes
      if (obj.type === NATURE.BUSH_BERRY) {
        gfx.fillStyle(0xe03030, 1);
        gfx.fillCircle(worldPos.x - 4, worldPos.y - 3, 2.5);
        gfx.fillCircle(worldPos.x + 3, worldPos.y + 2, 2.5);
        gfx.fillCircle(worldPos.x + 1, worldPos.y - 5, 2.5);
      }

      // Tree trunk for trees
      if (obj.type.startsWith('tree_')) {
        gfx.fillStyle(0x6e4a20, 1);
        gfx.fillRect(worldPos.x - 3, worldPos.y + info.radius - 4, 6, 8);
      }

      obj.sprite = gfx;
      this._natureSprites.push(gfx);
    }
  }


  createSettlerSprites() {
    for (const settler of _state.settlers) {
      this.createSettlerSprite(settler);
    }
  }


  createSettlerSprite(settler) {
    const color = SETTLER_COLORS[settler.gender];
    const scale = settler.isChild ? 0.6 : 1.0;
    const gfx = this.add.graphics();
    gfx.setDepth(10);

    // Body
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(-8, -6, 16, 20, 3);

    // Head
    gfx.fillStyle(0xf0c8a0, 1);
    gfx.fillCircle(0, -10, 7);

    // Hair (top half of head)
    const hairColor = settler.gender === 'male' ? 0x5a3a1a : 0x6a3020;
    gfx.fillStyle(hairColor, 1);
    gfx.slice(0, -10, 7, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    gfx.fillPath();

    if (settler.isChild) {
      gfx.setScale(scale);
    }

    const container = this.add.container(settler.x, settler.y, [gfx]);
    container.setDepth(10);
    container.setSize(24, 32);
    container.setInteractive();

    // Name label
    const nameText = this.add.text(0, -22, settler.name, {
      fontFamily: 'VT323',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    container.add(nameText);

    // Activity label (below name)
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
    this._settlerSprites[settler.id] = container;
    settler.sprite = container;

    // Click to select
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
        // Mark as visually depleted
        obj._visualDepleted = true;
        const info = NATURE_COLORS[obj.type];
        const worldPos = tileToWorld(obj.col, obj.row);

        obj.sprite.clear();

        if (obj.type.startsWith('tree_')) {
          // Show stump
          obj.sprite.fillStyle(0x000000, 0.2);
          obj.sprite.fillCircle(worldPos.x + 2, worldPos.y + 2, 6);
          obj.sprite.fillStyle(0x7a5a28, 1);
          obj.sprite.fillCircle(worldPos.x, worldPos.y, 6);
        } else if (obj.type === NATURE.BUSH_BERRY) {
          // Plain green bush, no berries
          obj.sprite.fillStyle(0x000000, 0.2);
          obj.sprite.fillCircle(worldPos.x + 2, worldPos.y + 2, info.radius);
          obj.sprite.fillStyle(0x3a7a30, 1);
          obj.sprite.fillCircle(worldPos.x, worldPos.y, info.radius);
        } else {
          // Rocks/iron — hide
          obj.sprite.setVisible(false);
        }
      } else if (!obj.depleted && obj._visualDepleted) {
        // Regrown — restore original visual
        obj._visualDepleted = false;
        const info = NATURE_COLORS[obj.type];
        if (!info) continue;
        const worldPos = tileToWorld(obj.col, obj.row);

        obj.sprite.clear();
        obj.sprite.setVisible(true);

        obj.sprite.fillStyle(0x000000, 0.2);
        obj.sprite.fillCircle(worldPos.x + 2, worldPos.y + 2, info.radius);
        obj.sprite.fillStyle(info.color, 1);
        obj.sprite.fillCircle(worldPos.x, worldPos.y, info.radius);

        if (obj.type === NATURE.BUSH_BERRY) {
          obj.sprite.fillStyle(0xe03030, 1);
          obj.sprite.fillCircle(worldPos.x - 4, worldPos.y - 3, 2.5);
          obj.sprite.fillCircle(worldPos.x + 3, worldPos.y + 2, 2.5);
          obj.sprite.fillCircle(worldPos.x + 1, worldPos.y - 5, 2.5);
        }

        if (obj.type.startsWith('tree_')) {
          obj.sprite.fillStyle(0x6e4a20, 1);
          obj.sprite.fillRect(worldPos.x - 3, worldPos.y + info.radius - 4, 6, 8);
        }
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

    const color = BUILDING_COLORS[building.type] || 0x888888;
    const w = def.size.w * TILE_SIZE;
    const h = def.size.h * TILE_SIZE;
    const x = building.col * TILE_SIZE;
    const y = building.row * TILE_SIZE;

    const opacity = this.getBuildPhaseOpacity(building.phase);

    const gfx = this.add.graphics();
    gfx.setDepth(2);

    // Shadow
    gfx.fillStyle(0x000000, 0.15 * opacity);
    gfx.fillRect(x + 3, y + 3, w, h);

    // Main rect
    gfx.fillStyle(color, opacity);
    gfx.fillRect(x, y, w, h);

    // Border
    gfx.lineStyle(1, 0x000000, 0.3 * opacity);
    gfx.strokeRect(x, y, w, h);

    building.sprite = gfx;
    gfx.setData('phase', building.phase);
    this._buildingSprites[building.id] = gfx;
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
      const gfx = this._buildingSprites[building.id];
      if (!gfx) continue;

      const trackedPhase = gfx.getData('phase');
      if (trackedPhase !== building.phase) {
        // Phase changed — redraw
        gfx.clear();
        const def = BUILDING_DEFS[building.type];
        if (!def) continue;

        const color = BUILDING_COLORS[building.type] || 0x888888;
        const w = def.size.w * TILE_SIZE;
        const h = def.size.h * TILE_SIZE;
        const x = building.col * TILE_SIZE;
        const y = building.row * TILE_SIZE;
        const opacity = this.getBuildPhaseOpacity(building.phase);

        gfx.fillStyle(0x000000, 0.15 * opacity);
        gfx.fillRect(x + 3, y + 3, w, h);
        gfx.fillStyle(color, opacity);
        gfx.fillRect(x, y, w, h);
        gfx.lineStyle(1, 0x000000, 0.3 * opacity);
        gfx.strokeRect(x, y, w, h);

        gfx.setData('phase', building.phase);
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
