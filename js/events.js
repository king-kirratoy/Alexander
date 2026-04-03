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

  let _saveCheckTimer = null;
  let _cachedSaveData = null;

  usernameInput.addEventListener('input', () => {
    const val = usernameInput.value.trim();
    btnNewGame.disabled = val.length < 1;
    btnContinue.disabled = true;
    _cachedSaveData = null;

    // Debounced save check
    if (_saveCheckTimer) clearTimeout(_saveCheckTimer);
    if (val.length < 1) return;

    _saveCheckTimer = setTimeout(async () => {
      if (typeof checkForExistingSave !== 'function') return;
      btnContinue.textContent = 'Checking...';
      const save = await checkForExistingSave(val);
      // Only update if input hasn't changed since
      if (usernameInput.value.trim() === val) {
        if (save) {
          _cachedSaveData = save;
          btnContinue.disabled = false;
          btnContinue.textContent = 'Continue';
        } else {
          _cachedSaveData = null;
          btnContinue.disabled = true;
          btnContinue.textContent = 'Continue';
        }
      }
    }, 500);
  });

  usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !btnNewGame.disabled) {
      btnNewGame.click();
    }
  });

  btnNewGame.addEventListener('click', async () => {
    if (typeof playSound === 'function') playSound('uiClick');
    const username = usernameInput.value.trim();
    if (!username) return;

    // Check if save exists and confirm overwrite
    if (_cachedSaveData) {
      const confirmed = confirm('A save already exists for this name. Start a new game? This will overwrite your save.');
      if (!confirmed) return;
    }

    _state.username = username;
    startNewGame();
    // Save initial state after game starts
    if (typeof saveGame === 'function') {
      saveGame();
    }
    if (typeof startAutosave === 'function') {
      startAutosave();
    }
  });

  btnContinue.addEventListener('click', () => {
    if (typeof playSound === 'function') playSound('uiClick');
    if (!_cachedSaveData) return;

    const username = usernameInput.value.trim();
    if (!username) return;

    _state.username = username;

    // Load save data into state
    if (typeof loadGame === 'function') {
      loadGame(_cachedSaveData);
    }

    // Mark state as loaded so GameScene knows to skip generation
    _state.gameStarted = true;

    hideMainMenu();

    // Initialize audio system
    if (typeof initAudio === 'function') {
      initAudio();
    }

    // Start Phaser — GameScene.create() will detect loaded state
    if (typeof _phaserGame !== 'undefined' && _phaserGame) {
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

    if (typeof startAutosave === 'function') {
      startAutosave();
    }
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

  el('menuSaveQuit').addEventListener('click', async () => {
    if (typeof playSound === 'function') playSound('uiClick');

    // Save before exiting
    if (typeof showSaveIndicator === 'function') showSaveIndicator('Saving...');
    if (typeof saveGame === 'function') {
      await saveGame();
    }
    if (typeof stopAutosave === 'function') {
      stopAutosave();
    }

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

  // ── Initialize Supabase ────────────────────────────────────
  if (typeof initSupabase === 'function') {
    initSupabase();
  }
}


// ── Public API ────────────────────────────────────────────────
window.AX.events = {
  initEvents,
};
