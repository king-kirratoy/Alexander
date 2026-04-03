// ═══════════ CAMERA ═══════════

let _cameraScene = null;
let _followText = null;

/**
 * Initialize camera system with a scene reference.
 */
function initCamera(scene) {
  _cameraScene = scene;
}


/**
 * Toggle follow mode for the currently selected settler.
 */
function toggleFollowCamera() {
  if (_state.cameraFollowing !== null) {
    stopFollowCamera();
    return;
  }

  if (_state.selectedSettler === null) return;

  const settler = typeof getSettlerById === 'function' ? getSettlerById(_state.selectedSettler) : null;
  if (!settler) return;

  _state.cameraFollowing = settler.id;

  // Show follow indicator
  showFollowIndicator(settler.name);
}


/**
 * Stop following the current settler.
 */
function stopFollowCamera() {
  _state.cameraFollowing = null;

  if (_cameraScene) {
    _cameraScene.cameras.main.stopFollow();
  }

  hideFollowIndicator();
}


/**
 * Update follow camera each frame — called from GameScene.update().
 */
function updateFollowCamera() {
  if (_state.cameraFollowing === null) return;

  const settler = typeof getSettlerById === 'function' ? getSettlerById(_state.cameraFollowing) : null;
  if (!settler) {
    // Settler died or no longer exists
    stopFollowCamera();
    return;
  }

  if (_cameraScene) {
    const cam = _cameraScene.cameras.main;
    // Smooth lerp toward settler position
    const lerpFactor = 0.05;
    const targetX = settler.x - cam.width / (2 * cam.zoom);
    const targetY = settler.y - cam.height / (2 * cam.zoom);
    cam.scrollX += (targetX - cam.scrollX) * lerpFactor;
    cam.scrollY += (targetY - cam.scrollY) * lerpFactor;
  }
}


/**
 * Show the follow indicator text in the HUD area.
 */
function showFollowIndicator(name) {
  hideFollowIndicator();

  _followText = document.createElement('div');
  _followText.id = 'followIndicator';
  _followText.className = 'follow-indicator';
  _followText.textContent = 'Following ' + name + ' [F]';
  document.body.appendChild(_followText);
}


/**
 * Hide the follow indicator.
 */
function hideFollowIndicator() {
  if (_followText) {
    _followText.remove();
    _followText = null;
  }
}


// ── Public API ────────────────────────────────────────────────
window.AX.camera = {
  initCamera,
  toggleFollowCamera,
  stopFollowCamera,
  updateFollowCamera,
};
