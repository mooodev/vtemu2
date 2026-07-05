/* ============================================================
   В ТЕМУ! — core/particles.js
   One pixel-particle canvas covering the CRT screen.
   Handles: twinkle sparkles, floating hearts, confetti rain,
   radial pixel bursts, steam wisps + ambient emitters.
   All coordinates are in #screen-local pixels.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { rand, randi, choice } = VT.util;

  const COLORS = {
    sparkle: ['#f6d87c', '#c8ec84', '#7fa8de', '#e06a50', '#fdf6dd'],
    confetti: ['#e9b840', '#9dc157', '#4a76b4', '#c8402f', '#eee1b3', '#e06a50', '#c8ec84'],
  };

  let canvas, ctx;
  let parts = [];
  let emitters = [];
  let enabled = true;
  let running = false;
  let lastT = 0;

  function resize() {
    const screen = document.getElementById('screen');
    canvas.width = screen.offsetWidth;
    canvas.height = screen.offsetHeight;
  }

  /* ---------------- particle behaviours ---------------- */

  const BEHAVIOURS = {
    /* plus-shaped twinkle that grows, spins colors, dies */
    sparkle(p, dt) {
      p.age += dt;
      const t = p.age / p.life;
      const s = Math.sin(Math.PI * t); // 0→1→0
      const px = Math.round(p.size * s);
      if (px <= 0) return;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1, p.y - px - 1, 2, px * 2 + 2);  // vertical arm
      ctx.fillRect(p.x - px - 1, p.y - 1, px * 2 + 2, 2);  // horizontal arm
      if (s > 0.6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - 1, p.y - 1, 2, 2); }
    },

    /* pixel square with velocity + gravity (bursts, confetti) */
    px(p, dt) {
      p.age += dt;
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.sway) p.x += Math.sin(p.age * 6 + p.seed) * p.sway;
      const t = p.age / p.life;
      const s = p.size * (t > 0.75 ? (1 - t) * 4 : 1);
      if (s <= 0.4) return;
      ctx.fillStyle = p.color;
      const flip = p.spin ? Math.abs(Math.sin(p.age * p.spin + p.seed)) : 1;
      ctx.fillRect(p.x - (s * flip) / 2, p.y - s / 2, Math.max(1, s * flip), s);
    },

    /* sprite that floats upward, swaying (hearts, steam) */
    floaty(p, dt) {
      p.age += dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.age * 3 + p.seed) * p.sway;
      const t = p.age / p.life;
      const alpha = t < 0.15 ? t / 0.15 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      ctx.globalAlpha = Math.max(0, alpha);
      const cv = VT.sprites.canvas(p.sprite, p.color);
      const w = cv.width * p.scale, h = cv.height * p.scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, Math.round(p.x - w / 2), Math.round(p.y - h / 2), w, h);
      ctx.globalAlpha = 1;
    },
  };

  /* ---------------- main loop ---------------- */

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (enabled) {
      for (const em of emitters) {
        if (em.paused) continue;
        em.acc = (em.acc || 0) + dt * em.rate;
        while (em.acc >= 1) { em.acc -= 1; em.make(); }
      }
      parts = parts.filter((p) => p.age < p.life);
      for (const p of parts) BEHAVIOURS[p.type](p, dt);
    } else {
      parts = [];
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- public API ---------------- */

  const fx = (VT.fx = {
    init() {
      canvas = document.getElementById('fx-canvas');
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
      running = true;
      requestAnimationFrame((t) => { lastT = t; frame(t); });
    },

    setEnabled(v) { enabled = v; },
    get enabled() { return enabled; },

    sparkle(x, y, opts = {}) {
      parts.push({
        type: 'sparkle', x: Math.round(x), y: Math.round(y),
        age: 0, life: opts.life || rand(0.5, 1),
        size: opts.size || randi(3, 6),
        color: opts.color || choice(COLORS.sparkle),
      });
    },

    burst(x, y, { count = 18, colors = COLORS.confetti, speed = 160, g = 260, size = [3, 6] } = {}) {
      for (let i = 0; i < count; i++) {
        const a = rand(Math.PI * 2);
        const v = rand(speed * 0.3, speed);
        parts.push({
          type: 'px', x, y,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.35,
          g, age: 0, life: rand(0.5, 1.1),
          size: randi(size[0], size[1]),
          color: choice(colors), seed: rand(10), spin: rand(4, 9),
        });
      }
    },

    confettiRain(dur = 2.2) {
      const em = {
        rate: 60,
        make() {
          parts.push({
            type: 'px', x: rand(canvas.width), y: -8,
            vx: rand(-30, 30), vy: rand(70, 170), g: 60,
            age: 0, life: rand(1.6, 2.6),
            size: randi(4, 7), color: choice(COLORS.confetti),
            seed: rand(10), spin: rand(3, 8), sway: rand(0.4, 1),
          });
        },
      };
      emitters.push(em);
      setTimeout(() => fx.removeEmitter(em), dur * 1000);
      return em;
    },

    heart(x, y, scale = 2) {
      parts.push({
        type: 'floaty', sprite: 'heart', x, y,
        vy: rand(-46, -26), sway: rand(0.3, 0.7),
        age: 0, life: rand(1.4, 2.2), scale, seed: rand(10),
      });
    },

    /** ambient emitter; returns handle for removeEmitter */
    addEmitter(em) { emitters.push(em); return em; },
    removeEmitter(em) { emitters = emitters.filter((e) => e !== em); },
    clearEmitters() { emitters = []; },

    /** sparkles inside a rect zone (used around the logo) */
    zoneSparkler(getRect, rate = 2.2) {
      return fx.addEmitter({
        rate,
        make() {
          const r = getRect();
          if (!r) return;
          fx.sparkle(rand(r.x, r.x + r.w), rand(r.y, r.y + r.h));
        },
      });
    },

    /** occasional floating hearts from a point-ish zone */
    zoneHearts(getPos, rate = 0.4) {
      return fx.addEmitter({
        rate,
        make() {
          const p = getPos();
          if (!p) return;
          fx.heart(p.x + rand(-30, 30), p.y + rand(-8, 8), choice([2, 2, 3]));
        },
      });
    },

    /** steam pixels rising from the mug */
    steam(getPos, rate = 3) {
      return fx.addEmitter({
        rate,
        make() {
          const p = getPos();
          if (!p) return;
          parts.push({
            type: 'px', x: p.x + rand(-4, 4), y: p.y,
            vx: 0, vy: rand(-30, -14), g: -6,
            age: 0, life: rand(0.8, 1.6), size: randi(2, 4),
            color: choice(['#e6ddc0', '#cabf9b', '#fdf6dd']),
            seed: rand(10), sway: rand(0.3, 0.8),
          });
        },
      });
    },
  });
})();
