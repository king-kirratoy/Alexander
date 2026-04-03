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
    this._isDragging = false;
    this._dragStart = { x: 0, y: 0 };
    this._camStart = { x: 0, y: 0 };
  }

  create() {
    // ── Generate world ──────────────────────────────────────
    const seed = Date.now();
    generateWorld(seed);
    initPathfinding();

    // ── Render tile map ─────────────────────────────────────
    this.renderTileMap();

    // ── Render nature objects ───────────────────────────────
    this.renderNatureObjects();

    // ── Render buildings ────────────────────────────────────
    this.renderBuildings();

    // ── Spawn settlers ──────────────────────────────────────
    spawnStartingSettlers();
    this.createSettlerSprites();

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

    // ── Show HUD ────────────────────────────────────────────
    showHUD();
    updateHUD();

    // ── Mark game as running ────────────────────────────────
    _state.gameRunning = true;
    _state.gameStarted = true;
  }


  update(time, delta) {
    if (!_state.gameRunning || _state.menuOpen) return;

    // ── Update nature objects (regrowth) ────────────────────
    if (typeof updateNatureObjects === 'function') {
      updateNatureObjects(Date.now());
    }

    // ── Update settlers ─────────────────────────────────────
    updateSettlers(delta);

    // ── Update settler sprites ──────────────────────────────
    this.updateSettlerSprites();

    // ── Update building sprites ─────────────────────────────
    this.updateBuildingSprites();

    // ── Update nature object visuals ────────────────────────
    this.updateNatureVisuals();

    // ── Update HUD every 500ms ──────────────────────────────
    this._hudUpdateTimer += delta;
    if (this._hudUpdateTimer > 500) {
      this._hudUpdateTimer = 0;
      updateHUD();
      updateSettlerInfoPanel();
    }

    // ── Edge scrolling ──────────────────────────────────────
    this.handleEdgeScroll();
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
    for (const settler of _state.settlers) {
      const container = this._settlerSprites[settler.id];
      if (!container) continue;
      container.x = settler.x;
      container.y = settler.y;

      // Update activity label
      const actLabel = container.getData('activityLabel');
      if (actLabel) {
        const act = settler.currentActivity;
        if (act === 'chopping' || act === 'mining' || act === 'foraging' || act === 'eating' || act === 'building' || act === 'crafting') {
          actLabel.setText('[' + act + ']');
          actLabel.setVisible(true);
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
    const tilePos = worldToTile(worldPoint.x, worldPoint.y);

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
      hideSettlerInfo();
    }
  }


  // ── Edge Scrolling ──────────────────────────────────────────

  handleEdgeScroll() {
    const pointer = this.input.activePointer;
    const cam = this.cameras.main;
    const speed = CAMERA_PAN_SPEED / cam.zoom;

    if (pointer.x < CAMERA_EDGE_THRESHOLD) {
      cam.scrollX -= speed;
    } else if (pointer.x > this.scale.width - CAMERA_EDGE_THRESHOLD) {
      cam.scrollX += speed;
    }

    if (pointer.y < CAMERA_EDGE_THRESHOLD) {
      cam.scrollY -= speed;
    } else if (pointer.y > this.scale.height - CAMERA_EDGE_THRESHOLD) {
      cam.scrollY += speed;
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
