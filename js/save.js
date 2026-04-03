// ═══════════ SAVE SYSTEM ═══════════

let _saveEnabled = false;
let _autosaveIntervalId = null;

// ── Supabase REST helpers ────────────────────────────────────

function _supabaseHeaders(prefer) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
  };
  if (prefer) headers['Prefer'] = prefer;
  return headers;
}

function _supabaseUrl() {
  return SUPABASE_URL + '/rest/v1/alexander_saves';
}

// ── Init ─────────────────────────────────────────────────────

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase not configured — save/load disabled.');
    _saveEnabled = false;
    return;
  }
  _saveEnabled = true;
  if (DEBUG) console.log('Supabase save system initialized.');
}

// ── Check for existing save ──────────────────────────────────

async function checkForExistingSave(username) {
  if (!_saveEnabled) return null;
  if (!username) return null;

  try {
    const url = _supabaseUrl() + '?username=eq.' + encodeURIComponent(username) + '&select=*';
    const resp = await fetch(url, {
      method: 'GET',
      headers: _supabaseHeaders(),
    });
    if (!resp.ok) {
      console.error('checkForExistingSave failed:', resp.status, resp.statusText);
      return null;
    }
    const rows = await resp.json();
    if (rows.length > 0) {
      return rows[0];
    }
    return null;
  } catch (err) {
    console.error('checkForExistingSave error:', err);
    return null;
  }
}

// ── Save game ────────────────────────────────────────────────

async function saveGame() {
  if (!_saveEnabled) {
    console.warn('Save skipped — Supabase not configured.');
    return false;
  }

  try {
    const data = serializeState();
    const payload = {
      username: _state.username,
      save_data: data,
      updated_at: new Date().toISOString(),
    };

    const resp = await fetch(_supabaseUrl(), {
      method: 'POST',
      headers: _supabaseHeaders('return=representation,resolution=merge-duplicates'),
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      console.error('saveGame failed:', resp.status, resp.statusText);
      return false;
    }
    if (DEBUG) console.log('Game saved successfully.');
    return true;
  } catch (err) {
    console.error('saveGame error:', err);
    return false;
  }
}

// ── Load game ────────────────────────────────────────────────

function loadGame(saveData) {
  if (!saveData || !saveData.save_data) {
    console.error('loadGame: no save data provided.');
    return false;
  }
  try {
    deserializeState(saveData.save_data);
    if (DEBUG) console.log('Game loaded successfully.');
    return true;
  } catch (err) {
    console.error('loadGame error:', err);
    return false;
  }
}

// ── Delete save ──────────────────────────────────────────────

async function deleteSave(username) {
  if (!_saveEnabled) return false;
  if (!username) return false;

  try {
    const url = _supabaseUrl() + '?username=eq.' + encodeURIComponent(username);
    const resp = await fetch(url, {
      method: 'DELETE',
      headers: _supabaseHeaders(),
    });
    if (!resp.ok) {
      console.error('deleteSave failed:', resp.status, resp.statusText);
      return false;
    }
    if (DEBUG) console.log('Save deleted for:', username);
    return true;
  } catch (err) {
    console.error('deleteSave error:', err);
    return false;
  }
}

// ── Serialization ────────────────────────────────────────────

function serializeState() {
  return {
    username: _state.username,
    dayNumber: _state.dayNumber,
    cycleTime: _state.cycleTime,
    currentPhase: _state.currentPhase,

    tileMap: _state.tileMap,

    natureObjects: _state.natureObjects.map(function(obj) {
      return {
        id: obj.id,
        type: obj.type,
        col: obj.col,
        row: obj.row,
        hp: obj.hp,
        maxHp: obj.maxHp,
        depleted: obj.depleted,
        regrowAt: obj.regrowAt || null,
      };
    }),

    settlers: _state.settlers.map(function(s) {
      return {
        id: s.id,
        name: s.name,
        gender: s.gender,
        personality: s.personality,
        isChild: s.isChild,
        age: s.age,
        health: s.health,
        maxHealth: s.maxHealth,
        hunger: s.hunger,
        maxHunger: s.maxHunger,
        speed: s.speed,
        strength: s.strength,
        lives: s.lives,
        col: s.col,
        row: s.row,
        x: s.x,
        y: s.y,
        currentActivity: s.currentActivity,
        equippedTool: s.equippedTool,
        equippedWeapon: s.equippedWeapon,
        equippedShield: s.equippedShield,
        isKnockedOut: s.isKnockedOut,
        direction: s.direction,
        carrying: s.carrying,
        shelterBuildingId: s.shelterBuildingId,
        isDead: s.isDead,
      };
    }),

    buildings: _state.buildings.map(function(b) {
      return {
        id: b.id,
        type: b.type,
        col: b.col,
        row: b.row,
        phase: b.phase,
        buildProgress: b.buildProgress,
        maxBuildWork: b.maxBuildWork,
        hp: b.hp,
        maxHp: b.maxHp,
        variant: b.variant,
        occupants: b.occupants,
      };
    }),

    resources: Object.assign({}, _state.resources),
    inventory: _state.inventory.slice(),

    nextSettlerId: _state.nextSettlerId,
    nextBuildingId: _state.nextBuildingId,
    nextEnemyId: _state.nextEnemyId,

    birthCooldown: _state.birthCooldown,
  };
}

// ── Deserialization ──────────────────────────────────────────

function deserializeState(data) {
  _state.username = data.username;
  _state.dayNumber = data.dayNumber;
  _state.cycleTime = data.cycleTime;
  _state.currentPhase = data.currentPhase;

  _state.tileMap = data.tileMap;

  // Restore nature objects — reset transient properties
  _state.natureObjects = data.natureObjects.map(function(obj) {
    obj.sprite = null;
    obj._visualDepleted = false;
    return obj;
  });

  // Restore settlers — reset transient properties
  _state.settlers = data.settlers.map(function(s) {
    s.path = null;
    s.pathIndex = 0;
    s.sprite = null;
    s.statusIcon = null;
    s.currentTask = null;
    s.aiCooldown = 0;
    s.gatherProgress = 0;
    s.targetCol = null;
    s.targetRow = null;
    s.currentPriority = typeof AI_PRIORITY !== 'undefined' ? AI_PRIORITY.IDLE : 0;
    s.attackCooldown = 0;
    s.knockedOutAt = s.isKnockedOut ? Date.now() : null;
    return s;
  });

  // Restore buildings — reset transient properties
  _state.buildings = data.buildings.map(function(b) {
    b.sprite = null;
    return b;
  });

  _state.resources = data.resources;
  _state.inventory = data.inventory;

  _state.nextSettlerId = data.nextSettlerId;
  _state.nextBuildingId = data.nextBuildingId;
  _state.nextEnemyId = data.nextEnemyId;

  _state.birthCooldown = data.birthCooldown || 0;

  // Clear enemies — they respawn at night
  _state.enemies = [];

  // Clear transient UI state
  _state.selectedSettler = null;
  _state.cameraFollowing = null;
  _state.activeAction = null;
  _state.menuOpen = false;
  _state.notifications = [];
}

// ── Auto-save ────────────────────────────────────────────────

function startAutosave() {
  stopAutosave();
  _autosaveIntervalId = setInterval(async function() {
    if (!_state.gameRunning) return;
    showSaveIndicator('Saving...');
    var success = await saveGame();
    if (!success && _saveEnabled) {
      showSaveIndicator('Save failed');
    }
  }, AUTOSAVE_INTERVAL);
}

function stopAutosave() {
  if (_autosaveIntervalId !== null) {
    clearInterval(_autosaveIntervalId);
    _autosaveIntervalId = null;
  }
}

function showSaveIndicator(text) {
  var existing = document.getElementById('saveIndicator');
  if (existing) existing.remove();

  var el = document.createElement('div');
  el.id = 'saveIndicator';
  el.textContent = text;
  el.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);' +
    'font-family:VT323,monospace;font-size:18px;color:#ffdd44;' +
    'background:rgba(0,0,0,0.7);padding:4px 14px;border-radius:4px;' +
    'z-index:9999;pointer-events:none;transition:opacity 0.5s;';
  document.body.appendChild(el);

  setTimeout(function() {
    el.style.opacity = '0';
    setTimeout(function() {
      if (el.parentNode) el.remove();
    }, 500);
  }, 1000);
}

// ── Public API ───────────────────────────────────────────────

window.AX.save = {
  initSupabase,
  checkForExistingSave,
  saveGame,
  loadGame,
  deleteSave,
  serializeState,
  deserializeState,
  startAutosave,
  stopAutosave,
};
