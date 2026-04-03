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
      _state.activeAction = btn.dataset.action;
      // TODO: change cursor, wait for map click
    });
  });

  // ── Settler Info Close ─────────────────────────────────────
  el('settlerInfoClose').addEventListener('click', () => {
    hideSettlerInfo();
  });

  // ── Keyboard Shortcuts ─────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (!_state.gameRunning) return;

    if (e.key === 'Escape') {
      if (_state.menuOpen) {
        toggleGameMenu();
      } else if (_state.selectedSettler !== null) {
        hideSettlerInfo();
      } else if (_state.activeAction) {
        _state.activeAction = null;
        const panel = document.getElementById('actionPanel');
        panel.classList.add('hidden');
        document.getElementById('actionToggle').classList.remove('active');
      }
    }
  });
}


// ── Public API ────────────────────────────────────────────────
window.AX.events = {
  initEvents,
};
