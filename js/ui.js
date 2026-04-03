// ═══════════ UI ═══════════

/**
 * Update HUD resource counts from state.
 */
function updateHUD() {
  const el = (id) => document.getElementById(id);
  el('hudWood').textContent = Math.floor(_state.resources.wood);
  el('hudStone').textContent = Math.floor(_state.resources.stone);
  el('hudFood').textContent = Math.floor(_state.resources.food);
  el('hudIron').textContent = Math.floor(_state.resources.iron);
  el('hudPopulation').textContent = _state.settlers.length;
  el('hudDay').textContent = 'Day ' + _state.dayNumber;
}


/**
 * Show the settler info panel for a given settler.
 */
function showSettlerInfo(settler) {
  if (!settler) return;
  _state.selectedSettler = settler.id;

  const el = (id) => document.getElementById(id);
  el('settlerName').textContent = settler.name + (settler.isChild ? ' (child)' : '');
  el('settlerPersonality').textContent = settler.personality.name;
  el('settlerRole').textContent = settler.currentActivity;
  el('settlerActivity').textContent = settler.currentActivity;
  el('settlerLives').textContent = '❤'.repeat(settler.lives);

  const healthPct = (settler.health / settler.maxHealth) * 100;
  const hungerPct = (settler.hunger / settler.maxHunger) * 100;
  el('settlerHealthBar').style.width = healthPct + '%';
  el('settlerHungerBar').style.width = hungerPct + '%';

  el('settlerInfo').classList.remove('hidden');
}


/**
 * Hide the settler info panel.
 */
function hideSettlerInfo() {
  _state.selectedSettler = null;
  document.getElementById('settlerInfo').classList.add('hidden');
}


/**
 * Update the settler info panel if one is selected (called per frame).
 */
function updateSettlerInfoPanel() {
  if (_state.selectedSettler === null) return;
  const settler = getSettlerById(_state.selectedSettler);
  if (!settler) {
    hideSettlerInfo();
    return;
  }
  showSettlerInfo(settler);
}


/**
 * Show the HUD overlay.
 */
function showHUD() {
  document.getElementById('hud').classList.remove('hidden');
}


/**
 * Hide the HUD overlay.
 */
function hideHUD() {
  document.getElementById('hud').classList.add('hidden');
}


/**
 * Show the main menu.
 */
function showMainMenu() {
  document.getElementById('mainMenu').classList.remove('hidden');
}


/**
 * Hide the main menu.
 */
function hideMainMenu() {
  document.getElementById('mainMenu').classList.add('hidden');
}


/**
 * Toggle the in-game menu overlay.
 */
function toggleGameMenu() {
  const menu = document.getElementById('gameMenu');
  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    menu.classList.remove('hidden');
    _state.menuOpen = true;
  } else {
    menu.classList.add('hidden');
    _state.menuOpen = false;
  }
}


/**
 * Toggle the action panel.
 */
function toggleActionPanel() {
  const panel = document.getElementById('actionPanel');
  const toggle = document.getElementById('actionToggle');
  const isHidden = panel.classList.contains('hidden');

  if (isHidden) {
    panel.classList.remove('hidden');
    toggle.classList.add('active');
  } else {
    panel.classList.add('hidden');
    toggle.classList.remove('active');
    _state.activeAction = null;
  }
}


// ── Public API ────────────────────────────────────────────────
window.AX.ui = {
  updateHUD,
  showSettlerInfo,
  hideSettlerInfo,
  updateSettlerInfoPanel,
  showHUD,
  hideHUD,
  showMainMenu,
  hideMainMenu,
  toggleGameMenu,
  toggleActionPanel,
};
