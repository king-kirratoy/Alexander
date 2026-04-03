// ═══════════ EVENTS ═══════════

/**
 * Wire up all DOM event listeners.
 * Called once from init.js after all systems are loaded.
 */
function initEvents() {
  const el = (id) => document.getElementById(id);

  // ── Main Menu ───────────────────────────────────────────────
  const usernameInput = el('usernameInput');
  const btnNewGame = el('btnNewGame');
  const btnContinue = el('btnContinue');

  usernameInput.addEventListener('input', () => {
    const val = usernameInput.value.trim();
    btnNewGame.disabled = val.length < 1;
    // TODO: check Supabase for existing save to enable Continue
  });

  usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !btnNewGame.disabled) {
      btnNewGame.click();
    }
  });

  btnNewGame.addEventListener('click', () => {
    if (typeof playSound === 'function') playSound('uiClick');
    const username = usernameInput.value.trim();
    if (!username) return;
    _state.username = username;
    startNewGame();
  });

  btnContinue.addEventListener('click', () => {
    // TODO: load save from Supabase
  });

  // ── HUD Menu Button ────────────────────────────────────────
  el('hudMenuBtn').addEventListener('click', () => {
    if (typeof playSound === 'function') playSound('uiClick');
    toggleGameMenu();
  });

  // ── In-Game Menu ───────────────────────────────────────────
  el('menuResume').addEventListener('click', () => {
    if (typeof playSound === 'function') playSound('uiClick');
    toggleGameMenu();
  });

  el('menuSettings').addEventListener('click', () => {
    // TODO: settings panel
  });

  el('menuSaveQuit').addEventListener('click', () => {
    if (typeof playSound === 'function') playSound('uiClick');
    // TODO: save to Supabase
    toggleGameMenu();
    stopGame();
    hideHUD();
    showMainMenu();
  });

  // ── Action Panel ───────────────────────────────────────────
  el('actionToggle').addEventListener('click', () => {
    if (typeof playSound === 'function') playSound('uiClick');
    toggleActionPanel();
  });

  document.querySelectorAll('.action-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof playSound === 'function') playSound('uiClick');
      if (typeof startDropAction === 'function') {
        startDropAction(btn.dataset.action);
      }
    });
  });

  // ── Settler Info Close ─────────────────────────────────────
  el('settlerInfoClose').addEventListener('click', () => {
    hideSettlerInfo();
  });

  // ── Right-click to cancel drop action ──────────────────────
  document.addEventListener('contextmenu', (e) => {
    if (_state.activeAction) {
      e.preventDefault();
      if (typeof cancelDropAction === 'function') cancelDropAction();
    }
  });

  // ── Tooltip follows cursor ────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    if (typeof moveDropTooltip === 'function') {
      moveDropTooltip(e.clientX, e.clientY);
    }
  });

  // ── Keyboard Shortcuts ─────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (!_state.gameRunning) return;

    if (e.key === 'f' || e.key === 'F') {
      if (typeof toggleFollowCamera === 'function') {
        toggleFollowCamera();
      }
    }

    if (e.key === 'Escape') {
      if (_state.menuOpen) {
        toggleGameMenu();
      } else if (_state.activeAction) {
        if (typeof cancelDropAction === 'function') cancelDropAction();
      } else if (_state.selectedSettler !== null) {
        hideSettlerInfo();
      }
    }
  });
}


// ── Public API ────────────────────────────────────────────────
window.AX.events = {
  initEvents,
};
