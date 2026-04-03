// ═══════════ PLAYER ACTIONS ═══════════

let _playerScene = null;
let _dropTooltip = null;

/**
 * Store a reference to the active GameScene for creating visuals.
 */
function initPlayerActions(scene) {
  _playerScene = scene;
}


/**
 * Set the active drop action and change cursor to crosshair.
 */
function startDropAction(resourceType) {
  _state.activeAction = resourceType;
  document.getElementById('gameContainer').style.cursor = 'crosshair';

  // Highlight the active action button
  document.querySelectorAll('.action-btn').forEach((btn) => {
    if (btn.dataset.action === resourceType) {
      btn.classList.add('action-btn-active');
    } else {
      btn.classList.remove('action-btn-active');
    }
  });

  // Show drop tooltip
  updateDropTooltip(resourceType);
}


/**
 * Execute a resource drop at the given world position.
 * Returns true if the drop succeeded.
 */
function executeDropAction(worldX, worldY) {
  if (!_state.activeAction) return false;

  const tile = worldToTile(worldX, worldY);
  if (!isWalkable(tile.col, tile.row)) return false;

  const action = _state.activeAction;
  const amounts = {
    dropWood: { key: 'wood', amount: 10 },
    dropStone: { key: 'stone', amount: 10 },
    dropFood: { key: 'food', amount: 10 },
    dropIron: { key: 'iron', amount: 5 },
  };

  const drop = amounts[action];
  if (!drop) return false;

  // Add resources to stockpile
  _state.resources[drop.key] += drop.amount;

  // Visual indicator at drop location
  if (_playerScene) {
    const colorMap = {
      dropWood: 0x8b6914,
      dropStone: 0x888888,
      dropFood: 0xe03030,
      dropIron: 0x505060,
    };
    const color = colorMap[action] || 0xffffff;
    const gfx = _playerScene.add.graphics();
    gfx.setDepth(55);
    gfx.fillStyle(color, 0.8);
    gfx.fillCircle(worldX, worldY, 14);

    // Amount text
    const txt = _playerScene.add.text(worldX, worldY, '+' + drop.amount, {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(56);

    // Fade out over 1 second
    _playerScene.tweens.add({
      targets: [gfx, txt],
      alpha: 0,
      y: worldY - 20,
      duration: 1000,
      onComplete: () => {
        gfx.destroy();
        txt.destroy();
      },
    });
  }

  // Play notification sound
  if (typeof playSound === 'function') playSound('notification');

  return true;
}


/**
 * Cancel the active drop action and reset cursor.
 */
function cancelDropAction() {
  _state.activeAction = null;
  document.getElementById('gameContainer').style.cursor = '';

  // Remove active highlight from all action buttons
  document.querySelectorAll('.action-btn').forEach((btn) => {
    btn.classList.remove('action-btn-active');
  });

  // Hide drop tooltip
  hideDropTooltip();
}


/**
 * Show/update the drop tooltip near the cursor.
 */
function updateDropTooltip(action) {
  if (!_dropTooltip) {
    _dropTooltip = document.createElement('div');
    _dropTooltip.id = 'dropTooltip';
    _dropTooltip.className = 'drop-tooltip';
    document.body.appendChild(_dropTooltip);
  }

  const names = {
    dropWood: 'Wood',
    dropStone: 'Stone',
    dropFood: 'Food',
    dropIron: 'Iron',
  };
  _dropTooltip.textContent = 'Click to drop ' + (names[action] || '');
  _dropTooltip.classList.remove('hidden');
}


/**
 * Hide the drop tooltip.
 */
function hideDropTooltip() {
  if (_dropTooltip) {
    _dropTooltip.classList.add('hidden');
  }
}


/**
 * Update tooltip position — called on pointer move.
 */
function moveDropTooltip(screenX, screenY) {
  if (!_dropTooltip || _dropTooltip.classList.contains('hidden')) return;
  _dropTooltip.style.left = (screenX + 16) + 'px';
  _dropTooltip.style.top = (screenY + 16) + 'px';
}


// ── Public API ────────────────────────────────────────────────
window.AX.playerActions = {
  initPlayerActions,
  startDropAction,
  executeDropAction,
  cancelDropAction,
  updateDropTooltip,
  hideDropTooltip,
  moveDropTooltip,
};
