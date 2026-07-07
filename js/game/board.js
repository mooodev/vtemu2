/* ============================================================
   В ТЕМУ! — game/board.js
   Board controller: deals tiles, tracks the selection chain,
   feeds the wire layer, resolves guesses, runs the collapse /
   shuffle / reveal animations. Emits events upward via `on`.

   Events: select(n), mistake(left), solved(group, idx),
           win(), lose(), locked(bool)
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el, shuffle, flip, wait, fitText, screenPos } = VT.util;

  const MAX_MISTAKES = 4;

  /* base font size by word length; fitText then fine-tunes so the
     word always fits its tile, whatever the screen width */
  function sizeFor(word) {
    const n = word.length;
    if (n <= 5) return 16;
    if (n <= 7) return 15;
    if (n <= 9) return 13;
    if (n <= 11) return 11;
    return 10;
  }

  class Board {
    constructor({ puzzle, grid, wrap, solvedStack, wires, on }) {
      this.puzzle = puzzle;
      this.grid = grid;
      this.wrap = wrap;
      this.solvedStack = solvedStack;
      this.wires = wires;
      this.on = on || (() => {});

      this.selection = [];   // tile elements, in selection order
      this.pickHandler = null; // when set, intercepts tile taps (ОБЪЯСНИТЬ mode)
      this.solvedCount = 0;
      this.mistakes = 0;
      this.guesses = [];     // per-submit group-diff rows (share grid)
      this.history = new Set();
      this.locked = false;
      this.groupOf = new Map();
      puzzle.groups.forEach((g) => g.words.forEach((w) => this.groupOf.set(w, g)));
    }

    /* ------------------------------------------------ setup */

    deal() {
      this.grid.innerHTML = '';
      this.solvedStack.innerHTML = '';
      this.wires.hardClear();
      const words = shuffle(this.puzzle.groups.flatMap((g) => g.words));
      words.forEach((word, i) => {
        const tile = el('button', 'tile deal');
        tile.dataset.word = word;
        tile.style.animationDelay = i * 35 + 'ms';
        /* a bit of typographic variety: some tiles bold, some italic */
        const r = Math.random();
        if (r < 0.16) tile.classList.add('t-italic');
        else if (r < 0.34) tile.classList.add('t-bold');
        tile.appendChild(el('span', '', word));
        tile.addEventListener('click', () => this.toggle(tile));
        tile.addEventListener('mouseenter', () => VT.audio.play('hover'));
        this.grid.appendChild(tile);
        setTimeout(() => VT.audio.play('deal'), i * 35);
        setTimeout(() => tile.classList.remove('deal'), i * 35 + 500);
      });
      requestAnimationFrame(() => this.refit());
    }

    /** (Re)fit every tile label — called on deal and on resize. */
    refit() {
      this.grid.querySelectorAll('.tile > span').forEach((s) =>
        fitText(s, sizeFor(s.textContent), 7)
      );
    }

    tiles() { return [...this.grid.querySelectorAll('.tile')]; }

    /* ------------------------------------------------ selection */

    toggle(tile) {
      if (this.locked) return;
      if (this.pickHandler && this.pickHandler(tile)) return;
      const idx = this.selection.indexOf(tile);
      if (idx >= 0) {
        this.selection.splice(idx, 1);
        tile.classList.remove('sel');
        delete tile.dataset.order;
        VT.audio.play('deselect');
      } else {
        if (this.selection.length >= 4) { VT.audio.play('error'); return; }
        this.selection.push(tile);
        tile.classList.add('sel');
        VT.audio.play(this.selection.length === 4 ? 'chain' : 'select');
        const p = screenPos(tile);
        VT.fx.sparkle(p.x, p.y - p.h / 2, { size: 6 });
      }
      this.selection.forEach((t, i) => (t.dataset.order = i + 1));
      this.wires.setChain(this.selection);
      this.on('select', this.selection.length);
    }

    deselectAll(silent) {
      this.selection.forEach((t) => { t.classList.remove('sel'); delete t.dataset.order; });
      this.selection = [];
      this.wires.clear();
      if (!silent) VT.audio.play('deselect');
      this.on('select', 0);
    }

    shuffleTiles() {
      if (this.locked) return;
      VT.audio.play('shuffle');
      const tiles = this.tiles();
      flip(tiles, () => {
        shuffle(tiles).forEach((t) => this.grid.appendChild(t));
      });
    }

    /* ------------------------------------------------ guessing */

    async submit() {
      if (this.locked || this.selection.length !== 4) return;
      const words = this.selection.map((t) => t.dataset.word);
      const key = words.slice().sort().join('|');
      if (this.history.has(key)) {
        VT.toast('УЖЕ ПРОБОВАЛИ!', '', 1300);
        VT.audio.play('almost');
        this.on('dejavu');
        return;
      }
      this.history.add(key);
      this.guesses.push(words.map((w) => this.groupOf.get(w).diff));

      const counts = new Map();
      words.forEach((w) => {
        const g = this.groupOf.get(w);
        counts.set(g, (counts.get(g) || 0) + 1);
      });
      const best = Math.max(...counts.values());

      if (best === 4) await this.correct([...counts.keys()][0]);
      else await this.wrong(best);
    }

    async correct(group) {
      this.locked = true;
      this.on('locked', true);
      const tiles = this.selection.slice();
      VT.audio.play('solve');
      this.wires.flash('#f6d87c', 0.55);
      tiles.forEach((t) => t.classList.add('won'));

      await wait(160);
      for (const pt of this.wires.sparkPoints()) {
        VT.fx.burst(pt.x, pt.y, { count: 5, speed: 90, size: [2, 4] });
      }
      await wait(380);

      // banner + collapse
      this.selection = [];
      this.wires.clear();
      const diff = VT.data.DIFF[group.diff];
      const banner = el('div', 'solved-banner');
      banner.style.setProperty('--gc', diff.color);
      banner.appendChild(el('div', 'sg-title', group.title));
      banner.appendChild(el('div', 'sg-words', group.words.join(' • ')));

      // flying clones from tiles to the banner slot
      const clones = tiles.map((t) => this.makeClone(t));
      const rest = this.tiles().filter((t) => !tiles.includes(t));
      flip(rest, () => {
        tiles.forEach((t) => t.remove());
        this.solvedStack.appendChild(banner);
      });
      const bp = screenPos(banner);
      clones.forEach((c, i) => {
        setTimeout(() => {
          c.style.transform =
            `translate(${bp.x - c._x}px, ${bp.y - c._y}px) scale(.35)`;
          c.style.opacity = '0';
        }, 30 + i * 40);
        setTimeout(() => c.remove(), 600 + i * 40);
      });

      VT.fx.burst(bp.x, bp.y, { count: 26, speed: 220 });
      VT.fx.heart(bp.x - bp.w / 2 + 20, bp.y - 10);
      VT.fx.heart(bp.x + bp.w / 2 - 20, bp.y - 10);

      this.solvedCount++;
      this.on('solved', group, this.solvedCount);
      this.on('select', 0);

      await wait(420);
      this.locked = false;
      this.on('locked', false);
      if (this.solvedCount === 4) {
        await wait(500);
        this.on('win');
      }
    }

    async wrong(best) {
      this.locked = true;
      this.on('locked', true);
      this.wires.flash('#e06a50', 0.5);
      VT.audio.play('error');
      this.wrap.classList.add('board-shake');
      this.selection.forEach((t) => t.classList.add('shake'));

      this.mistakes++;
      this.on('mistake', MAX_MISTAKES - this.mistakes);
      if (best === 3) {
        VT.toast('ПОЧТИ! 3 ИЗ 4', '', 1400);
        VT.audio.play('almost');
      }

      await wait(480);
      this.wrap.classList.remove('board-shake');
      this.selection.forEach((t) => t.classList.remove('shake'));
      this.deselectAll(true);
      this.locked = false;
      this.on('locked', false);

      if (this.mistakes >= MAX_MISTAKES) {
        await wait(350);
        await this.revealRest();
        this.on('lose');
      }
    }

    /* reveal unsolved groups one by one (defeat) */
    async revealRest() {
      this.locked = true;
      this.on('locked', true);
      const remaining = this.puzzle.groups.filter((g) =>
        this.tiles().some((t) => g.words.includes(t.dataset.word))
      );
      for (const group of remaining) {
        const tiles = this.tiles().filter((t) => group.words.includes(t.dataset.word));
        tiles.forEach((t) => t.classList.add('won'));
        VT.audio.play('deal');
        await wait(350);
        const diff = VT.data.DIFF[group.diff];
        const banner = el('div', 'solved-banner');
        banner.style.setProperty('--gc', diff.color);
        banner.appendChild(el('div', 'sg-title', group.title));
        banner.appendChild(el('div', 'sg-words', group.words.join(' • ')));
        const rest = this.tiles().filter((t) => !tiles.includes(t));
        flip(rest, () => {
          tiles.forEach((t) => t.remove());
          this.solvedStack.appendChild(banner);
        });
        await wait(450);
      }
    }

    /* absolutely-positioned copy of a tile, in #screen space */
    makeClone(tile) {
      const p = screenPos(tile);
      const c = tile.cloneNode(true);
      c.className = 'tile won';
      c.style.cssText = `
        position:absolute; z-index:36; pointer-events:none; margin:0;
        left:${p.x - p.w / 2}px; top:${p.y - p.h / 2}px;
        width:${p.w}px; height:${p.h}px;
        transition: transform .5s cubic-bezier(.5,-0.05,.3,1), opacity .45s ease .1s;
      `;
      c._x = p.x; c._y = p.y;
      document.getElementById('screen').appendChild(c);
      return c;
    }
  }

  VT.Board = Board;
  VT.MAX_MISTAKES = MAX_MISTAKES;
})();
