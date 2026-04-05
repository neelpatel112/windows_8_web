/**
 * BIOS CONFIG — Windows 8 Web OS
 * Machine specs tuned for the Windows 8 Web project
 */
window.BIOS_CONFIG = {

  /* ── Machine Identity ─────────────────────────────── */
  cpu:          'Intel(R) Core(TM) i7-2600 CPU @ 3.40GHz',
  cpuSpeed:     '3400MHz',
  ramMB:        8192,
  ramFrequency: '1600 MHz DDR3',
  biosDate:     '04/25/11 09:12:53',
  biosVer:      '08.00.15',
  motherboard:  'ASUS P8Z68-V PRO',

  /* ── Disk Drives ──────────────────────────────────── */
  drives: {
    priMaster: 'LBA, ATA 133, 120.0 GB SSD',
    priSlave:  'LBA, ATA 133, 500.1 GB HDD',
    secMaster: 'Not Detected',
    secSlave:  'Not Detected',
  },

  /* ── Boot Order ───────────────────────────────────── */
  bootOrder: [
    'SATA: Samsung SSD 850 EVO',
    'USB: Not Detected',
    'CD/DVD: Not Detected',
  ],

  /* ── Timing (ms) ──────────────────────────────────── */
  timing: {
    blackFlash:       350,
    memCountDuration: 3800,   /* memory test speed */
    postLinePace:     290,
    summaryHold:      4500,   /* how long summary screen stays */
    handoffDelay:     500,    /* black before Windows boots */
  },

  /* ── Effects ──────────────────────────────────────── */
  effects: {
    scanlines:       true,
    phosphorGlow:    true,
    crtFlicker:      true,
    screenJitter:    true,
    postBeep:        true,
    typewriterSound: true,
    hdSeekSound:     true,
    glitchLines:     true,
  },

  /* ── Easter Eggs ──────────────────────────────────── */
  easterEggs: {
    failChance:   0.10,
    konamiUnlock: true,
  },

};
 