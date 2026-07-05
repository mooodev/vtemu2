/* ============================================================
   В ТЕМУ! — core/audio.js
   Chiptune SFX from raw WebAudio oscillators. No assets.
   Every sound is a tiny recipe of (freq sweep, wave, envelope).
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;

  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** One bleep. f0→f1 sweep over dur seconds. */
  function tone({ f0 = 440, f1, dur = 0.08, type = 'square', vol = 1, delay = 0, curve = 'exp' }) {
    if (!enabled) return;
    const ac = ensure();
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(f1, t0 + dur);
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst({ dur = 0.15, vol = 0.5, delay = 0 }) {
    if (!enabled) return;
    const ac = ensure();
    const t0 = ac.currentTime + delay;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.value = vol;
    src.connect(g).connect(master);
    src.start(t0);
  }

  /* note helper: semitone offsets from A4 */
  const N = (semi) => 440 * Math.pow(2, semi / 12);

  const SFX = {
    hover:    () => tone({ f0: 1250, dur: 0.03, type: 'square', vol: 0.25 }),
    click:    () => tone({ f0: 620, f1: 520, dur: 0.06, vol: 0.6 }),
    select:   () => { tone({ f0: 430, f1: 830, dur: 0.07, vol: 0.7 }); tone({ f0: 860, f1: 1660, dur: 0.07, vol: 0.2, delay: 0.02 }); },
    deselect: () => tone({ f0: 700, f1: 380, dur: 0.08, vol: 0.55 }),
    chain:    () => { tone({ f0: 520, f1: 1040, dur: 0.1, vol: 0.6 }); tone({ f0: 1040, f1: 2080, dur: 0.12, vol: 0.3, delay: 0.05 }); },
    error:    () => { tone({ f0: 160, f1: 90, dur: 0.22, type: 'sawtooth', vol: 0.8 }); tone({ f0: 120, f1: 70, dur: 0.26, type: 'square', vol: 0.5, delay: 0.03 }); },
    almost:   () => { tone({ f0: 500, f1: 460, dur: 0.1, vol: 0.6 }); tone({ f0: 400, f1: 360, dur: 0.14, vol: 0.6, delay: 0.1 }); },
    solve:    () => [0, 4, 7, 12].forEach((s, i) => tone({ f0: N(s), dur: 0.11, vol: 0.7, delay: i * 0.07, type: 'square' })),
    win:      () => [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => { tone({ f0: N(s), dur: 0.13, vol: 0.65, delay: i * 0.09 }); tone({ f0: N(s + 12), dur: 0.1, vol: 0.2, delay: i * 0.09 + 0.02 }); }),
    lose:     () => [12, 7, 4, 0, -5].forEach((s, i) => tone({ f0: N(s - 12), dur: 0.2, vol: 0.6, delay: i * 0.16, type: 'triangle' })),
    shuffle:  () => { for (let i = 0; i < 5; i++) tone({ f0: 300 + Math.random() * 500, dur: 0.03, vol: 0.35, delay: i * 0.04 }); },
    deal:     () => tone({ f0: 340, f1: 520, dur: 0.04, vol: 0.3 }),
    toggle:   () => tone({ f0: 800, f1: 1100, dur: 0.05, vol: 0.5 }),
    modal:    () => { tone({ f0: 520, f1: 780, dur: 0.09, vol: 0.5 }); tone({ f0: 260, dur: 0.07, vol: 0.3 }); },
    powerOn:  () => { tone({ f0: 60, f1: 120, dur: 0.5, type: 'sawtooth', vol: 0.4 }); tone({ f0: 400, f1: 1800, dur: 0.4, vol: 0.25, delay: 0.15 }); noiseBurst({ dur: 0.2, vol: 0.2, delay: 0.05 }); },
    powerOff: () => { tone({ f0: 900, f1: 40, dur: 0.4, type: 'sawtooth', vol: 0.5 }); noiseBurst({ dur: 0.25, vol: 0.3 }); },
    static:   () => noiseBurst({ dur: 0.18, vol: 0.25 }),
    pulse:    () => tone({ f0: 1500, f1: 2400, dur: 0.05, vol: 0.12, type: 'sine' }),
  };

  VT.audio = {
    play(name) { if (SFX[name]) SFX[name](); },
    unlock() { ensure(); },
    setEnabled(v) { enabled = v; },
    get enabled() { return enabled; },
  };
})();
