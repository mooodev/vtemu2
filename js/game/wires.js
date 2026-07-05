/* ============================================================
   В ТЕМУ! — game/wires.js
   The connection layer: chunky animated pixel "wires" drawn
   between selected tiles, in selection order. Wires grow in,
   retract out, run marching-dash animation, send energy
   pulses down the line, and close into a glowing circuit
   when 4 tiles are linked.

   Canvas covers #board-wrap with PAD margin on all sides.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { clamp, rand } = VT.util;

  const PAD = 20;    // canvas overhang around the board (css inset -20px)
  const CELL = 4;    // wire pixel size
  const GROW_T = 0.20;
  const RETRACT_T = 0.15;

  const THEME = {
    outline: '#0a0d07',
    base:    '#9dc157',
    march:   '#d7f29b',
    baseHot: '#c8ec84',
    marchHot:'#f6d87c',
    node:    '#c8ec84',
  };

  class WireLayer {
    constructor(canvas, wrap) {
      this.canvas = canvas;
      this.wrap = wrap;
      this.ctx = canvas.getContext('2d');
      this.wires = [];          // {a,b,key,t,state,phase,pulse,path}
      this.flashCol = null;
      this.flashT = 0;
      this.complete = false;
      this.time = 0;
      this._raf = null;
      this._last = 0;
    }

    resize() {
      this.canvas.width = this.wrap.offsetWidth + PAD * 2;
      this.canvas.height = this.wrap.offsetHeight + PAD * 2;
    }

    start() {
      this.resize();
      this._last = performance.now();
      const loop = (t) => {
        this._raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (t - this._last) / 1000 || 0.016);
        this._last = t;
        this.update(dt);
        this.draw();
      };
      this._raf = requestAnimationFrame(loop);
    }

    stop() {
      cancelAnimationFrame(this._raf);
      this._raf = null;
      this.wires = [];
      this.ctx && this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /* ------------------------------------------------ topology */

    /** Rebuild wire set from the ordered selection chain.
        The chain stays open — no wire from the 4th tile back
        to the 1st; a full chain just heats the existing wires. */
    setChain(tiles) {
      const want = [];
      for (let i = 1; i < tiles.length; i++) want.push([tiles[i - 1], tiles[i]]);

      const wantKeys = new Set(want.map(([a, b]) => keyOf(a, b)));

      // retract wires that are no longer wanted
      for (const w of this.wires) {
        if (!wantKeys.has(w.key) && w.state !== 'retract') w.state = 'retract';
      }
      // grow wires that are new
      for (const [a, b] of want) {
        const k = keyOf(a, b);
        const existing = this.wires.find((w) => w.key === k && w.state !== 'retract');
        if (!existing) {
          this.wires.push({
            a, b, key: k, t: 0, state: 'grow',
            phase: rand(6), pulse: -rand(0.4, 1.4), path: null,
          });
        }
      }
      this.complete = tiles.length === 4;
    }

    /** Retract everything (deselect-all / after submit). */
    clear() {
      for (const w of this.wires) w.state = 'retract';
      this.complete = false;
    }

    /** Instantly drop all wires (board rebuild). */
    hardClear() {
      this.wires = [];
      this.complete = false;
    }

    flash(color, dur = 0.5) {
      this.flashCol = color;
      this.flashT = dur;
      this._flashDur = dur;
    }

    /** Mid-points of every wire, in screen coords (for FX bursts). */
    sparkPoints() {
      const s = VT.util.screenPos(this.wrap);
      const ox = s.x - s.w / 2 - PAD;
      const oy = s.y - s.h / 2 - PAD;
      const pts = [];
      for (const w of this.wires) {
        if (!w.path) continue;
        for (const f of [0.25, 0.5, 0.75]) {
          const c = w.path[Math.floor(f * (w.path.length - 1))];
          pts.push({ x: ox + c[0] * CELL, y: oy + c[1] * CELL });
        }
      }
      return pts;
    }

    /* ------------------------------------------------ sim */

    update(dt) {
      this.time += dt;
      // the board reflows as groups solve — keep the backing store in sync
      if (this.canvas.width !== this.wrap.offsetWidth + PAD * 2 ||
          this.canvas.height !== this.wrap.offsetHeight + PAD * 2) this.resize();
      if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);

      const speed = this.complete ? 14 : 7; // march cells/sec
      for (const w of this.wires) {
        w.phase += dt * speed;
        if (w.state === 'grow') {
          w.t = clamp(w.t + dt / GROW_T, 0, 1);
          if (w.t >= 1) w.state = 'idle';
        } else if (w.state === 'retract') {
          w.t = clamp(w.t - dt / RETRACT_T, 0, 1);
        } else {
          // energy pulse rides the wire every couple of seconds
          w.pulse += dt / (this.complete ? 0.9 : 2.2);
          if (w.pulse > 1) w.pulse = -rand(0.1, 0.9);
        }
        w.path = this.pathFor(w.a, w.b); // cheap; tiles can move (FLIP)
      }
      this.wires = this.wires.filter((w) => !(w.state === 'retract' && w.t <= 0));
      if (!this.wires.length) this.complete = false;
    }

    /* ------------------------------------------------ geometry */

    /* visual rect (follows FLIP/hover transforms), in canvas coords */
    rectFor(tile) {
      const k = VT.util.monScale();
      const wr = this.wrap.getBoundingClientRect();
      const tr = tile.getBoundingClientRect();
      return {
        x: (tr.left - wr.left) / k + PAD,
        y: (tr.top - wr.top) / k + PAD,
        w: tr.width / k,
        h: tr.height / k,
      };
    }

    pathFor(a, b) {
      const ra = this.rectFor(a), rb = this.rectFor(b);
      const ax = ra.x + ra.w / 2, ay = ra.y + ra.h / 2;
      const bx = rb.x + rb.w / 2, by = rb.y + rb.h / 2;
      // trim segment so it attaches at tile edges, not centers
      const t0 = exitT(ax, ay, bx, by, deflate(ra, 10));
      const t1 = 1 - exitT(bx, by, ax, ay, deflate(rb, 10));
      const p0x = ax + (bx - ax) * t0, p0y = ay + (by - ay) * t0;
      const p1x = ax + (bx - ax) * t1, p1y = ay + (by - ay) * t1;
      return bresenham(
        Math.round(p0x / CELL), Math.round(p0y / CELL),
        Math.round(p1x / CELL), Math.round(p1y / CELL)
      );
    }

    /* ------------------------------------------------ paint */

    draw() {
      const { ctx, canvas } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!this.wires.length) return;

      const flashK = this.flashT > 0 ? this.flashT / this._flashDur : 0;
      const base = this.complete ? THEME.baseHot : THEME.base;
      const march = this.complete ? THEME.marchHot : THEME.march;

      // pass 1: dark outline under every wire
      for (const w of this.wires) this.strokeWire(w, null, true);
      // pass 2: colored core
      for (const w of this.wires) this.strokeWire(w, { base, march, flashK });
      // pass 3: endpoint nodes
      for (const w of this.wires) this.drawNodes(w, flashK);
    }

    strokeWire(w, style, outline = false) {
      const { ctx } = this;
      const path = w.path;
      if (!path || path.length < 2) return;
      const n = Math.max(1, Math.round(w.t * path.length));
      const grow = w.state === 'grow';

      for (let i = 0; i < n && i < path.length; i++) {
        const [cx, cy] = path[i];
        if (outline) {
          ctx.fillStyle = THEME.outline;
          ctx.fillRect(cx * CELL - 1, cy * CELL - 1, CELL + 2, CELL + 2);
          continue;
        }
        let col;
        if (style.flashK > 0) {
          col = (i + (this.time * 30 | 0)) % 2 ? this.flashCol : '#fdf6dd';
        } else {
          const m = ((i - Math.floor(w.phase)) % 6 + 6) % 6;
          col = m < 2 ? style.march : style.base;
        }
        ctx.fillStyle = col;
        ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
      }

      if (!outline && style.flashK === 0 && w.state === 'idle' && w.pulse >= 0 && w.pulse <= 1) {
        // energy pulse: 3 bright cells gliding down the wire
        const head = Math.floor(w.pulse * (path.length - 1));
        for (let j = 0; j < 3; j++) {
          const idx = head - j;
          if (idx < 0 || idx >= path.length) continue;
          const [cx, cy] = path[idx];
          this.ctx.fillStyle = j === 0 ? '#ffffff' : THEME.marchHot;
          const g = j === 0 ? 2 : 1;
          this.ctx.fillRect(cx * CELL - g, cy * CELL - g, CELL + g * 2, CELL + g * 2);
        }
      }

      if (!outline && grow && n > 0 && n <= path.length) {
        // bright spark at the growing head
        const [cx, cy] = path[Math.min(n, path.length) - 1];
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx * CELL - 3, cy * CELL - 3, CELL + 6, CELL + 6);
      }
    }

    drawNodes(w, flashK) {
      const path = w.path;
      if (!path || !path.length) return;
      const { ctx } = this;
      const pulse = 1 + Math.sin(this.time * 6) * 0.5;
      const size = CELL + 4 + Math.round(pulse * 2);
      const col = flashK > 0 ? this.flashCol : THEME.node;
      const ends = w.state === 'retract' ? [path[0]] : [path[0], path[path.length - 1]];
      for (const [cx, cy] of ends) {
        const px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
        ctx.fillStyle = THEME.outline;
        ctx.fillRect(px - size / 2 - 1, py - size / 2 - 1, size + 2, size + 2);
        ctx.fillStyle = col;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
        ctx.fillStyle = '#fdf6dd';
        ctx.fillRect(px - 1, py - 1, 3, 3);
      }
    }
  }

  /* ------------------------------------------------ helpers */

  function keyOf(a, b) {
    const ka = a.dataset.word, kb = b.dataset.word;
    return ka < kb ? ka + '~' + kb : kb + '~' + ka;
  }

  function deflate(r, d) {
    return { x: r.x + d, y: r.y + d, w: r.w - d * 2, h: r.h - d * 2 };
  }

  /** Param t at which segment (x0,y0)->(x1,y1) exits rect r. */
  function exitT(x0, y0, x1, y1, r) {
    const dx = x1 - x0, dy = y1 - y0;
    let t = 1;
    if (dx > 0) t = Math.min(t, (r.x + r.w - x0) / dx);
    else if (dx < 0) t = Math.min(t, (r.x - x0) / dx);
    if (dy > 0) t = Math.min(t, (r.y + r.h - y0) / dy);
    else if (dy < 0) t = Math.min(t, (r.y - y0) / dy);
    return clamp(t, 0, 1);
  }

  function bresenham(x0, y0, x1, y1) {
    const pts = [];
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let guard = 4000;
    while (guard-- > 0) {
      pts.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return pts;
  }

  VT.WireLayer = WireLayer;
})();
