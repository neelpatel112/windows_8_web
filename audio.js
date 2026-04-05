/**
 * BIOS Sound Engine
 * All sounds synthesized via Web Audio API — zero audio files needed.
 */
window.BiosAudio = (function () {
  'use strict';

  let ctx = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /**
   * Single square-wave beep — the classic POST beep
   * freq: Hz, duration: seconds, volume: 0-1
   */
  function beep(freq = 800, duration = 0.18, volume = 0.35) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(volume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration + 0.02);
    } catch (_) {}
  }

  /**
   * POST startup beep — 1 short high beep (all clear)
   */
  function postBeep() {
    beep(1050, 0.14, 0.3);
  }

  /**
   * Error beep sequence — 3 low beeps
   */
  function errorBeep() {
    try {
      const c = getCtx();
      [0, 0.22, 0.44].forEach(t => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, c.currentTime + t);
        gain.gain.setValueAtTime(0.28, c.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.18);
        osc.start(c.currentTime + t);
        osc.stop(c.currentTime + t + 0.22);
      });
    } catch (_) {}
  }

  /**
   * Typewriter tick — subtle click per character
   */
  function tick() {
    try {
      const c = getCtx();
      const bufSize = Math.floor(c.sampleRate * 0.012);
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 6) * 0.18;
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.5, c.currentTime);
      src.connect(gain);
      gain.connect(c.destination);
      src.start();
    } catch (_) {}
  }

  /**
   * Hard drive seek noise — scratchy sweep
   */
  function hdSeek() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      const dist = c.createWaveShaper();

      // Distortion curve for the scratchy feel
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
      }
      dist.curve = curve;

      osc.connect(dist);
      dist.connect(gain);
      gain.connect(c.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, c.currentTime);
      osc.frequency.linearRampToValueAtTime(60, c.currentTime + 0.09);
      osc.frequency.linearRampToValueAtTime(110, c.currentTime + 0.18);

      gain.gain.setValueAtTime(0.07, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);

      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.25);
    } catch (_) {}
  }

  /**
   * Memory test tick — subtle high-freq sweep as memory counts
   */
  function memTick() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4200 + Math.random() * 800, c.currentTime);
      gain.gain.setValueAtTime(0.025, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.045);
    } catch (_) {}
  }

  /**
   * CRT power-on crackle
   */
  function crtOn() {
    try {
      const c = getCtx();
      const bufSize = Math.floor(c.sampleRate * 0.3);
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        const t = i / bufSize;
        data[i] = (Math.random() * 2 - 1) * 0.25 * Math.pow(1 - t, 2);
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.6, c.currentTime);
      src.connect(gain);
      gain.connect(c.destination);
      src.start();

      // Add a low hum
      const hum = c.createOscillator();
      const humGain = c.createGain();
      hum.connect(humGain);
      humGain.connect(c.destination);
      hum.type = 'sine';
      hum.frequency.setValueAtTime(60, c.currentTime);
      humGain.gain.setValueAtTime(0.04, c.currentTime);
      humGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
      hum.start(c.currentTime);
      hum.stop(c.currentTime + 0.55);
    } catch (_) {}
  }

  /**
   * CRT power-off implosion sound
   */
  function crtOff() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.22);
      gain.gain.setValueAtTime(0.18, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.28);
    } catch (_) {}
  }

  /**
   * Navigation beep for BIOS setup menu
   */
  function navBeep(dir = 'move') {
    const freq = dir === 'select' ? 1200 : dir === 'back' ? 600 : 900;
    beep(freq, 0.06, 0.15);
  }

  return { postBeep, errorBeep, tick, hdSeek, memTick, crtOn, crtOff, navBeep, beep };
})();
  