/* ============================================================
   В ТЕМУ! — core/avatars.js
   Avatar catalog. assets/img/avatars.png is a COLS×ROWS grid of
   portraits; each avatar is shown by CSS background-cropping the
   sheet (no canvas — keeps file:// working and needs no loading
   logic). To add avatars: extend the sheet, bump ROWS/COLS,
   append entries to META.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;

  const COLS = 5;
  const ROWS = 4;
  const SRC = 'assets/img/avatars.png';

  /* Index 0 is the built-in computer mascot (the original status-bar
     face) — free default. Sheet portraits follow, left→right,
     top→bottom, so sheet cell = index - 1. */
  const META = [
    { name: 'СИСТЕМА 128', price: 0, builtin: 'mascot' },
    { name: 'ВИХРАСТЫЙ',   price: 100 },
    { name: 'ОТЛИЧНИЦА',   price: 100 },
    { name: 'КЕПКА',       price: 100 },
    { name: 'СТАРОСТА',    price: 100 },
    { name: 'ПРОФЕССОР',   price: 100 },
    { name: 'КУДРЯШКА',    price: 200 },
    { name: 'УСАЧ',        price: 200 },
    { name: 'РЫЖИК',       price: 200 },
    { name: 'ПРОГРАММИСТ', price: 200 },
    { name: 'ХИПСТЕР',     price: 200 },
    { name: 'ПЛЮШКИ',      price: 350 },
    { name: 'БУНТАРЬ',     price: 350 },
    { name: 'ГОТЕССА',     price: 350 },
    { name: 'СПРИНТЕР',    price: 350 },
    { name: 'КНИЖНИЦА',    price: 350 },
    { name: 'ЛАБОРАНТ',    price: 500 },
    { name: 'ЛЯГУШОНОК',   price: 500 },
    { name: 'ЗАДИРА',      price: 500 },
    { name: 'ДЕТЕКТИВ',    price: 500 },
    { name: 'ЗВЁЗДОЧКА',   price: 500 },
  ];

  VT.avatars = {
    META,
    get count() { return META.length; },

    /** Fill-parent element showing avatar i (drop into a sized frame). */
    img(i) {
      const s = document.createElement('span');
      s.className = 'ava-crop';
      const meta = META[i] || META[0];
      if (meta.builtin) {
        /* generated pixel sprite, not a sheet cell */
        s.classList.add('ava-builtin');
        s.style.backgroundImage = `url(${VT.sprites.url(meta.builtin, { scale: 8 })})`;
        return s;
      }
      const c = i - 1; // sheet cell
      s.style.backgroundImage = `url(${SRC})`;
      s.style.backgroundSize = `${COLS * 100}% ${ROWS * 100}%`;
      s.style.backgroundPosition =
        `${((c % COLS) / (COLS - 1)) * 100}% ${(Math.floor(c / COLS) / (ROWS - 1)) * 100}%`;
      return s;
    },
  };
})();
