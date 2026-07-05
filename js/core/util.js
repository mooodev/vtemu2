/* ============================================================
   В ТЕМУ! — core/util.js
   Namespace bootstrap + tiny helpers used everywhere.
   ============================================================ */
(function () {
  'use strict';
  const VT = (window.VT = window.VT || {});

  const util = (VT.util = {});

  util.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  util.lerp = (a, b, t) => a + (b - a) * t;
  util.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  util.randi = (a, b) => Math.floor(util.rand(a, b + 1));
  util.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  util.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  util.easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
  util.easeInQuad = (t) => t * t;
  util.easeOutBack = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  /** DOM helper: el('div', 'cls a', '<b>html</b>') */
  util.el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  /** Current scale factor of the monitor (CSS transform). */
  util.monScale = () => {
    const mon = document.getElementById('monitor');
    return mon.getBoundingClientRect().width / mon.offsetWidth;
  };

  /** Position of an element's center in #screen-local coordinates. */
  util.screenPos = (el) => {
    const s = document.getElementById('screen').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = util.monScale();
    return {
      x: (r.left - s.left + r.width / 2) / k,
      y: (r.top - s.top + r.height / 2) / k,
      w: r.width / k,
      h: r.height / k,
    };
  };

  /**
   * FLIP animation: capture positions, run `mutate()` (which reflows
   * the elements), then animate each element from old to new position.
   */
  util.flip = (els, mutate, dur = 420) => {
    const before = new Map();
    els.forEach((el) => before.set(el, el.getBoundingClientRect()));
    mutate();
    els.forEach((el) => {
      const b = before.get(el);
      const a = el.getBoundingClientRect();
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      if (!dx && !dy) return;
      const k = util.monScale();
      el.style.transition = 'none';
      el.style.transform = `translate(${dx / k}px, ${dy / k}px)`;
      el.getBoundingClientRect(); // force reflow
      el.classList.add('fliping');
      el.style.transition = '';
      el.style.transform = '';
      setTimeout(() => el.classList.remove('fliping'), dur + 40);
    });
  };

  util.wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Shrink a tile label's font-size until it fits its box. */
  util.fitText = (span, max = 15, min = 9) => {
    const box = span.parentElement;
    let size = max;
    span.style.fontSize = size + 'px';
    while (size > min && span.offsetWidth > box.clientWidth - 10) {
      size -= 1;
      span.style.fontSize = size + 'px';
    }
  };
})();
