// ═══════════ AUDIO ═══════════

// Web Audio API-based procedural audio system.
// All sounds generated programmatically — no audio files needed.

let _audioCtx = null;
let _masterGain = null;
let _audioEnabled = true;
let _audioInitialized = false;
let _currentAmbientLayer = null;
let _ambientNodes = [];
let _ambientTimers = [];
let _soundThrottles = {};

const MASTER_VOLUME = 0.3;
const AMBIENT_VOLUME = 0.15;
const SFX_VOLUME = 0.25;
const CROSSFADE_DURATION = 2.0;

// ── Initialization ────────────────────────────────────────────

function initAudio() {
  if (_audioInitialized) return;
  _audioInitialized = true;

  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _masterGain = _audioCtx.createGain();
    _masterGain.gain.value = MASTER_VOLUME;
    _masterGain.connect(_audioCtx.destination);
  } catch (e) {
    console.warn('Web Audio API not supported:', e);
    _audioInitialized = false;
    return;
  }

  // Resume on first user interaction (browser autoplay policy)
  const resumeAudio = function() {
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume();
    }
    document.removeEventListener('click', resumeAudio);
    document.removeEventListener('keydown', resumeAudio);
  };

  if (_audioCtx.state === 'suspended') {
    document.addEventListener('click', resumeAudio);
    document.addEventListener('keydown', resumeAudio);
  }
}

// ── Master Volume ─────────────────────────────────────────────

function setMasterVolume(vol) {
  if (!_masterGain) return;
  _masterGain.gain.value = clamp(vol, 0.0, 1.0);
}

// ── Toggle Audio ──────────────────────────────────────────────

function toggleAudio() {
  _audioEnabled = !_audioEnabled;
  if (_masterGain) {
    _masterGain.gain.value = _audioEnabled ? MASTER_VOLUME : 0;
  }
  if (!_audioEnabled) {
    stopAmbientLayer();
  } else if (_currentAmbientLayer) {
    var layer = _currentAmbientLayer;
    _currentAmbientLayer = null;
    setAmbientLayer(layer);
  }
  return _audioEnabled;
}

// ── Sound Throttle ────────────────────────────────────────────

function canPlaySound(soundName) {
  var now = performance.now();
  var last = _soundThrottles[soundName] || 0;
  if (now - last < 1000) return false;
  _soundThrottles[soundName] = now;
  return true;
}

// ── Play Sound ────────────────────────────────────────────────

function playSound(soundName) {
  if (!_audioCtx || !_audioEnabled || _audioCtx.state === 'suspended') return;

  var generator = _soundGenerators[soundName];
  if (typeof generator === 'function') {
    generator();
  }
}

// ── Ambient Layer Control ─────────────────────────────────────

function setAmbientLayer(layerName) {
  if (!_audioCtx || !_audioEnabled) return;
  if (_currentAmbientLayer === layerName) return;

  stopAmbientLayer();
  _currentAmbientLayer = layerName;

  var generator = _ambientGenerators[layerName];
  if (typeof generator === 'function') {
    generator();
  }
}

function stopAmbientLayer() {
  // Fade out existing ambient nodes
  for (var i = 0; i < _ambientNodes.length; i++) {
    var node = _ambientNodes[i];
    if (node && node.gain) {
      try {
        node.gain.linearRampToValueAtTime(0, _audioCtx.currentTime + CROSSFADE_DURATION);
      } catch (e) { /* ignore */ }
    }
    // Schedule stop after crossfade
    setTimeout(function(n) {
      try {
        if (n.stop) n.stop();
        if (n.disconnect) n.disconnect();
      } catch (e) { /* ignore */ }
    }.bind(null, node), (CROSSFADE_DURATION + 0.1) * 1000);
  }
  _ambientNodes = [];

  // Clear ambient timers
  for (var j = 0; j < _ambientTimers.length; j++) {
    clearTimeout(_ambientTimers[j]);
  }
  _ambientTimers = [];
}

// ── Helper: create noise buffer ───────────────────────────────

function createNoiseBuffer(duration) {
  var sampleRate = _audioCtx.sampleRate;
  var length = sampleRate * duration;
  var buffer = _audioCtx.createBuffer(1, length, sampleRate);
  var data = buffer.getChannelData(0);
  for (var i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ── Sound Effect Generators ───────────────────────────────────

var _soundGenerators = {

  chop: function() {
    var t = _audioCtx.currentTime;
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
    gain.gain.setValueAtTime(SFX_VOLUME * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  },

  mine: function() {
    var t = _audioCtx.currentTime;
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);
    gain.gain.setValueAtTime(SFX_VOLUME * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  },

  forage: function() {
    var t = _audioCtx.currentTime;
    var noise = _audioCtx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.15);
    var filter = _audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.5;
    var gain = _audioCtx.createGain();
    gain.gain.setValueAtTime(SFX_VOLUME * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(_masterGain);
    noise.start(t);
    noise.stop(t + 0.17);
  },

  build: function() {
    var t = _audioCtx.currentTime;
    for (var i = 0; i < 2; i++) {
      var osc = _audioCtx.createOscillator();
      var gain = _audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(120, t + i * 0.08 + 0.06);
      gain.gain.setValueAtTime(SFX_VOLUME * 0.4, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.06);
      osc.connect(gain);
      gain.connect(_masterGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.08);
    }
  },

  craft: function() {
    var t = _audioCtx.currentTime;
    for (var i = 0; i < 2; i++) {
      var osc = _audioCtx.createOscillator();
      var gain = _audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, t + i * 0.1);
      osc.frequency.exponentialRampToValueAtTime(300, t + i * 0.1 + 0.08);
      gain.gain.setValueAtTime(SFX_VOLUME * 0.35, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.08);
      osc.connect(gain);
      gain.connect(_masterGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.1);
    }
  },

  eat: function() {
    var t = _audioCtx.currentTime;
    var noise = _audioCtx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.05);
    var filter = _audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    var gain = _audioCtx.createGain();
    gain.gain.setValueAtTime(SFX_VOLUME * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(_masterGain);
    noise.start(t);
    noise.stop(t + 0.07);
  },

  hit: function() {
    var t = _audioCtx.currentTime;
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    gain.gain.setValueAtTime(SFX_VOLUME * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.17);
  },

  enemyDeath: function() {
    var t = _audioCtx.currentTime;
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
    gain.gain.setValueAtTime(SFX_VOLUME * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.32);
  },

  settlerHurt: function() {
    var t = _audioCtx.currentTime;
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
    gain.gain.setValueAtTime(SFX_VOLUME * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  },

  settlerDeath: function() {
    var t = _audioCtx.currentTime;
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.5);
    gain.gain.setValueAtTime(SFX_VOLUME * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.52);
  },

  buildComplete: function() {
    var t = _audioCtx.currentTime;
    var notes = [400, 500, 600];
    for (var i = 0; i < notes.length; i++) {
      var osc = _audioCtx.createOscillator();
      var gain = _audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], t + i * 0.1);
      gain.gain.setValueAtTime(SFX_VOLUME * 0.35, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.15);
      osc.connect(gain);
      gain.connect(_masterGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.17);
    }
  },

  birthChime: function() {
    var t = _audioCtx.currentTime;
    var notes = [350, 500];
    for (var i = 0; i < notes.length; i++) {
      var osc = _audioCtx.createOscillator();
      var gain = _audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], t + i * 0.15);
      gain.gain.setValueAtTime(SFX_VOLUME * 0.3, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.25);
      osc.connect(gain);
      gain.connect(_masterGain);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.27);
    }
  },

  uiClick: function() {
    var t = _audioCtx.currentTime;
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(SFX_VOLUME * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  },

  notification: function() {
    var t = _audioCtx.currentTime;
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    gain.gain.setValueAtTime(SFX_VOLUME * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }
};

// ── Ambient Helper: create wind noise node ────────────────────

function createWindNoise(volume, lowFreq) {
  var noise = _audioCtx.createBufferSource();
  noise.buffer = createNoiseBuffer(4.0);
  noise.loop = true;
  var filter = _audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowFreq || 400;
  filter.Q.value = 0.5;
  var gain = _audioCtx.createGain();
  gain.gain.setValueAtTime(0, _audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, _audioCtx.currentTime + CROSSFADE_DURATION);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(_masterGain);
  noise.start();
  _ambientNodes.push(noise);
  _ambientNodes.push(gain);
  return gain;
}

// ── Ambient Helper: schedule random blips ─────────────────────

function scheduleRandomBlip(minPitch, maxPitch, duration, minInterval, maxInterval, vol) {
  function playBlip() {
    if (!_audioCtx || !_audioEnabled) return;
    var t = _audioCtx.currentTime;
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.type = 'sine';
    var freq = minPitch + Math.random() * (maxPitch - minPitch);
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function scheduleNext() {
    var delay = (minInterval + Math.random() * (maxInterval - minInterval)) * 1000;
    var timer = setTimeout(function() {
      playBlip();
      scheduleNext();
    }, delay);
    _ambientTimers.push(timer);
  }
  scheduleNext();
}

// ── Ambient Helper: continuous high-freq noise (crickets) ─────

function createCricketNoise(volume) {
  var noise = _audioCtx.createBufferSource();
  noise.buffer = createNoiseBuffer(4.0);
  noise.loop = true;
  var filter = _audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 5000;
  filter.Q.value = 2.0;
  var gain = _audioCtx.createGain();
  gain.gain.setValueAtTime(0, _audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, _audioCtx.currentTime + CROSSFADE_DURATION);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(_masterGain);
  noise.start();
  _ambientNodes.push(noise);
  _ambientNodes.push(gain);
  return gain;
}

// ── Ambient Generators ────────────────────────────────────────

var _ambientGenerators = {

  dayAmbient: function() {
    // Soft wind
    createWindNoise(AMBIENT_VOLUME * 0.4, 300);
    // Bird chirps every 3-8 seconds
    scheduleRandomBlip(2000, 4000, 0.05, 3, 8, AMBIENT_VOLUME * 0.3);
  },

  nightAmbient: function() {
    // Low wind
    createWindNoise(AMBIENT_VOLUME * 0.3, 200);
    // Crickets
    createCricketNoise(AMBIENT_VOLUME * 0.25);
    // Owl hoots every 5-12 seconds
    scheduleRandomBlip(300, 400, 0.2, 5, 12, AMBIENT_VOLUME * 0.2);
  },

  duskAmbient: function() {
    // Medium wind
    createWindNoise(AMBIENT_VOLUME * 0.35, 250);
    // Muted birds (less frequent)
    scheduleRandomBlip(2000, 3500, 0.04, 6, 12, AMBIENT_VOLUME * 0.15);
    // Beginning crickets (quiet)
    createCricketNoise(AMBIENT_VOLUME * 0.1);
  },

  dawnAmbient: function() {
    // Medium wind
    createWindNoise(AMBIENT_VOLUME * 0.35, 280);
    // Returning birds
    scheduleRandomBlip(2200, 4000, 0.05, 3, 7, AMBIENT_VOLUME * 0.25);
    // Fading crickets (very quiet)
    createCricketNoise(AMBIENT_VOLUME * 0.05);
  }
};

// ── Public API ────────────────────────────────────────────────

window.AX.audio = {
  initAudio: initAudio,
  setMasterVolume: setMasterVolume,
  playSound: playSound,
  setAmbientLayer: setAmbientLayer,
  toggleAudio: toggleAudio,
  canPlaySound: canPlaySound
};
