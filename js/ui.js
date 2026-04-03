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

  // Phase-appropriate day display
  const phase = _state.currentPhase;
  if (phase === DAY_PHASE.DAY) {
    el('hudDay').textContent = 'Day ' + _state.dayNumber;
  } else if (phase === DAY_PHASE.DUSK) {
    el('hudDay').textContent = 'Dusk';
  } else if (phase === DAY_PHASE.NIGHT) {
    el('hudDay').textContent = 'Night ' + _state.dayNumber;
  } else if (phase === DAY_PHASE.DAWN) {
    el('hudDay').textContent = 'Dawn';
  }

  // Update day icon image based on phase
  const dayIcon = document.querySelector('.hud-icon-day');
  if (dayIcon) {
    if (phase === DAY_PHASE.NIGHT || phase === DAY_PHASE.DUSK) {
      dayIcon.style.backgroundImage = "url('assets/sprites/individual/icons/icon_moon.png')";
    } else {
      dayIcon.style.backgroundImage = "url('assets/sprites/individual/icons/icon_sun.png')";
    }
  }
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
  el('settlerRole').textContent = getSettlerRole(settler);
  el('settlerActivity').textContent = settler.currentActivity;

  // Red hearts for lives
  let heartsHTML = '';
  for (let i = 0; i < settler.lives; i++) {
    heartsHTML += '<span class="heart-red">&#10084;</span>';
  }
  el('settlerLives').innerHTML = heartsHTML;

  const healthPct = (settler.health / settler.maxHealth) * 100;
  const hungerPct = (settler.hunger / settler.maxHunger) * 100;
  el('settlerHealthBar').style.width = healthPct + '%';
  el('settlerHungerBar').style.width = hungerPct + '%';

  // Equipped tool & weapon
  el('settlerTool').textContent = settler.equippedTool ? settler.equippedTool.name : 'None';
  el('settlerWeapon').textContent = settler.equippedWeapon ? settler.equippedWeapon.name : 'None';

  // Child age progress
  const ageRow = el('settlerAgeRow');
  if (settler.isChild) {
    ageRow.classList.remove('hidden');
    el('settlerAge').textContent = settler.age + '/5 cycles';
  } else {
    ageRow.classList.add('hidden');
  }

  el('settlerInfo').classList.remove('hidden');
}


/**
 * Determine a settler's natural role based on stats and personality.
 */
function getSettlerRole(settler) {
  if (settler.isChild) return 'Child';

  const strength = settler.strength;
  const speed = settler.speed;
  const personality = settler.personality.name;

  if (personality === 'Brave') return 'Fighter';
  if (personality === 'Industrious' && strength >= 10) return 'Builder';
  if (personality === 'Swift' || speed > 90) return 'Forager';
  if (strength >= 12) return 'Woodcutter';
  if (strength >= 8) return 'Miner';
  if (personality === 'Gentle') return 'Forager';
  return 'Laborer';
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
    if (typeof cancelDropAction === 'function') {
      cancelDropAction();
    } else {
      _state.activeAction = null;
    }
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
