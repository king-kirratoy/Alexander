// ═══════════ DAY/NIGHT CYCLE ═══════════

/**
 * Initialize day/night cycle state.
 */
function initDayNight() {
  _state.cycleTime = 0;
  _state.currentPhase = DAY_PHASE.DAY;
  _state.dayNumber = 1;
}


/**
 * Advance the day/night cycle by delta ms each frame.
 * When cycleTime exceeds DAY_CYCLE_DURATION, reset and increment dayNumber.
 */
function updateDayNight(delta) {
  _state.cycleTime += delta;
  if (_state.cycleTime >= DAY_CYCLE_DURATION) {
    _state.cycleTime -= DAY_CYCLE_DURATION;
    _state.dayNumber++;
  }
  getCurrentPhase();
}


/**
 * Calculate and return the current phase based on cycleTime position
 * within DAY_CYCLE_DURATION using DAY_PHASE_RATIOS.
 * Day: 0-55%, Dusk: 55-65%, Night: 65-90%, Dawn: 90-100%.
 */
function getCurrentPhase() {
  const ratio = _state.cycleTime / DAY_CYCLE_DURATION;
  let accumulated = 0;

  accumulated += DAY_PHASE_RATIOS[DAY_PHASE.DAY];
  if (ratio < accumulated) {
    _state.currentPhase = DAY_PHASE.DAY;
    return DAY_PHASE.DAY;
  }

  accumulated += DAY_PHASE_RATIOS[DAY_PHASE.DUSK];
  if (ratio < accumulated) {
    _state.currentPhase = DAY_PHASE.DUSK;
    return DAY_PHASE.DUSK;
  }

  accumulated += DAY_PHASE_RATIOS[DAY_PHASE.NIGHT];
  if (ratio < accumulated) {
    _state.currentPhase = DAY_PHASE.NIGHT;
    return DAY_PHASE.NIGHT;
  }

  _state.currentPhase = DAY_PHASE.DAWN;
  return DAY_PHASE.DAWN;
}


/**
 * Return how far through the current phase we are (0.0 to 1.0).
 */
function getPhaseProgress() {
  const ratio = _state.cycleTime / DAY_CYCLE_DURATION;
  let accumulated = 0;

  const phases = [DAY_PHASE.DAY, DAY_PHASE.DUSK, DAY_PHASE.NIGHT, DAY_PHASE.DAWN];
  for (const phase of phases) {
    const phaseRatio = DAY_PHASE_RATIOS[phase];
    if (ratio < accumulated + phaseRatio) {
      return (ratio - accumulated) / phaseRatio;
    }
    accumulated += phaseRatio;
  }
  return 1.0;
}


/**
 * Returns true if current phase is NIGHT.
 */
function isNight() {
  return _state.currentPhase === DAY_PHASE.NIGHT;
}


/**
 * Returns true if current phase is DUSK.
 */
function isDusk() {
  return _state.currentPhase === DAY_PHASE.DUSK;
}


/**
 * Returns true if current phase is DAWN.
 */
function isDawn() {
  return _state.currentPhase === DAY_PHASE.DAWN;
}


/**
 * Return a tint color and alpha for the current time of day.
 * DAY: null (no tint). DUSK: orange fading in. NIGHT: dark blue. DAWN: fading out.
 * Returns { color, alpha } or null.
 */
function getDaylightTint() {
  const phase = _state.currentPhase;
  const progress = getPhaseProgress();

  if (phase === DAY_PHASE.DAY) {
    return null;
  }

  if (phase === DAY_PHASE.DUSK) {
    // Orange tint fading in: alpha 0.0 to 0.3
    return { color: 0x2a1a0e, alpha: progress * 0.3 };
  }

  if (phase === DAY_PHASE.NIGHT) {
    // Dark blue/purple tint at alpha 0.4-0.5
    return { color: 0x1a1a3e, alpha: 0.4 + progress * 0.1 };
  }

  if (phase === DAY_PHASE.DAWN) {
    // Night tint fading out: alpha 0.5 to 0.0
    return { color: 0x1a1a3e, alpha: 0.5 * (1 - progress) };
  }

  return null;
}


// ── Public API ────────────────────────────────────────────────
window.AX.dayNight = {
  initDayNight,
  updateDayNight,
  getCurrentPhase,
  getPhaseProgress,
  isNight,
  isDusk,
  isDawn,
  getDaylightTint,
};
