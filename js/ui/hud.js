/* ============================================================
   В ТЕМУ! — ui/hud.js
   Live HUD: the status bars at the bottom of every view and the
   coin chips in headers now show real profile data (avatar,
   level, XP pips, coins, wins, achievements).

   Also owns the money/glory theatre:
     earnCoins(from)  — PNG coins fly INTO the counter
     spendCoins(to)   — coins fly OUT of the counter
     achUnlocked(a) / levelUp(n) — queued celebration toasts
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el, clamp, screenPos } = VT.util;

  /* ---------------- status bars ---------------- */

  function buildStatusBars() {
    document.querySelectorAll('[data-statusbar]').forEach((bar) => {
      bar.innerHTML = '';

      const player = el('div', 'sb-cell sb-player');
      const ava = el('span', 'sb-ava');
      ava.dataset.avatar = '';
      player.appendChild(ava);
      const col = el('div', 'sb-col');
      const row1 = el('div', 'sb-row', '<span>ИГРОК 1</span>');
      const pips = el('span', 'sb-pips');
      pips.dataset.xpPips = '';
      for (let i = 0; i < 7; i++) pips.appendChild(el('i'));
      row1.appendChild(pips);
      const row2 = el('div', 'sb-row');
      row2.appendChild(VT.sprites.img('star', { scale: 2 }));
      row2.appendChild(el('span', '', '0')).dataset.achCount = '';
      const coinImg = VT.sprites.img('coin', { scale: 2 });
      coinImg.dataset.coinAnchor = '';
      row2.appendChild(coinImg);
      row2.appendChild(el('span', '', '0')).dataset.coinCount = '';
      row2.appendChild(VT.sprites.img('trophy', { scale: 2 }));
      row2.appendChild(el('span', '', '000')).dataset.winCount = '';
      col.appendChild(row1); col.appendChild(row2);
      player.appendChild(col);

      const level = el('div', 'sb-cell sb-level');
      level.appendChild(el('span', 'sb-cap', '-- УРОВЕНЬ --'));
      level.appendChild(el('span', 'sb-num', '01')).dataset.levelNum = '';

      const sys = el('div', 'sb-cell sb-sys');
      const sysCol = el('div', 'sb-col');
      sysCol.appendChild(el('span', '', '<b>СИСТЕМА 128</b>'));
      sysCol.appendChild(el('span', '', 'ВЕР. 1.90'));
      sysCol.appendChild(el('span', '', '© 1990'));
      sys.appendChild(sysCol);
      sys.appendChild(VT.sprites.img('flagRu', { scale: 3 }));

      bar.appendChild(player);
      bar.appendChild(level);
      bar.appendChild(sys);
    });

    document.querySelectorAll('[data-coinchip]').forEach((chip) => {
      chip.innerHTML = '';
      const img = VT.sprites.img('coin', { scale: 2 });
      img.dataset.coinAnchor = '';
      chip.appendChild(img);
      chip.appendChild(el('span', '', '0')).dataset.coinCount = '';
    });
  }

  /* ---------------- live values ---------------- */

  /* coin counters count up/down smoothly instead of snapping */
  const tweens = new Map();
  function tweenNumber(span, to) {
    const from = parseInt(span.textContent.replace(/\D/g, ''), 10) || 0;
    if (from === to) { span.textContent = String(to); return; }
    cancelAnimationFrame(tweens.get(span));
    const t0 = performance.now();
    const dur = clamp(Math.abs(to - from) * 6, 220, 700);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      span.textContent = String(Math.round(from + (to - from) * VT.util.easeOutQuad(k)));
      if (k < 1) tweens.set(span, requestAnimationFrame(step));
    };
    tweens.set(span, requestAnimationFrame(step));
  }

  function refresh() {
    const p = VT.profile;
    if (!p || !p.ready) return;
    document.querySelectorAll('[data-coin-count]').forEach((s) => tweenNumber(s, p.coins));
    document.querySelectorAll('[data-ach-count]').forEach((s) => (s.textContent = String(p.achCount)));
    document.querySelectorAll('[data-win-count]').forEach((s) => (s.textContent = String(p.stats.wins).padStart(3, '0')));
    document.querySelectorAll('[data-level-num]').forEach((s) => (s.textContent = String(p.level).padStart(2, '0')));
    document.querySelectorAll('[data-xp-pips]').forEach((pips) => {
      const lit = Math.floor((p.xp / p.xpNeed) * 7);
      [...pips.children].forEach((i, idx) => i.classList.toggle('dim', idx >= lit));
    });
    document.querySelectorAll('[data-avatar]').forEach((slot) => {
      const want = String(p.avatar);
      if (slot.dataset.avatarIdx === want) return;
      slot.dataset.avatarIdx = want;
      slot.innerHTML = '';
      slot.appendChild(VT.avatars.img(p.avatar));
    });
  }

  /* ---------------- coin flight ---------------- */

  /** Screen position of the best visible coin counter icon. */
  function coinAnchor() {
    const els = [
      ...document.querySelectorAll('[data-statusbar] [data-coin-anchor]'),
      ...document.querySelectorAll('[data-coinchip] [data-coin-anchor]'),
    ];
    for (const e of els) {
      if (e.offsetParent !== null) return screenPos(e);
    }
    const scr = document.getElementById('screen');
    return { x: scr.offsetWidth - 46, y: 34, w: 0, h: 0 };
  }

  function coinsFor(amount) { return clamp(Math.round(amount / 15), 5, 13); }

  function earnCoins(amount, from) {
    const to = coinAnchor();
    VT.fx.coinFly({
      from, to,
      count: coinsFor(amount),
      onArrive: () => VT.audio.play('coin'),
    });
  }

  function spendCoins(amount, to) {
    const from = coinAnchor();
    VT.fx.coinFly({
      from, to,
      count: Math.min(6, coinsFor(amount)),
      size: 22,
      onArrive: (i) => { if (i === 0) VT.audio.play('coin'); },
    });
  }

  /* ---------------- celebration queue ----------------
     Achievements / level-ups can unlock in bursts (or mid-modal);
     spacing them out keeps each one legible. */

  const queue = [];
  let pumping = false;

  function pump() {
    if (pumping) return;
    pumping = true;
    const next = () => {
      if (document.body.classList.contains('tv-dead')) { setTimeout(next, 1000); return; }
      const job = queue.shift();
      if (!job) { pumping = false; return; }
      job();
      setTimeout(next, 1650);
    };
    setTimeout(next, 500);
  }

  function achUnlocked(a) {
    queue.push(() => {
      VT.audio.play('ach');
      const t = VT.toast('', 'ach', 3000);
      t.appendChild(el('span', 'ach-t-ico')).appendChild(VT.sprites.img(a.icon, { scale: 3 }));
      const col = el('span', 'ach-t-col');
      col.appendChild(el('b', '', 'ДОСТИЖЕНИЕ!'));
      col.appendChild(el('i', '', a.name));
      const rw = el('em');
      rw.appendChild(VT.sprites.img('coin', { scale: 2 }));
      rw.appendChild(el('span', '', '+' + a.reward));
      col.appendChild(rw);
      t.appendChild(col);
      const p = screenPos(t);
      VT.fx.burst(p.x, p.y, { count: 14, speed: 150, size: [2, 4] });
      setTimeout(() => earnCoins(a.reward, screenPos(t)), 550);
    });
    pump();
  }

  function levelUp(lvl) {
    queue.push(() => {
      VT.audio.play('level');
      VT.fx.confettiRain(1.6);
      const t = VT.toast('', 'ach', 3000);
      t.appendChild(el('span', 'ach-t-ico')).appendChild(VT.sprites.img('star', { scale: 3 }));
      const col = el('span', 'ach-t-col');
      col.appendChild(el('b', '', `УРОВЕНЬ ${lvl}!`));
      col.appendChild(el('i', '', 'ТАК ДЕРЖАТЬ, ИГРОК 1'));
      const rw = el('em');
      rw.appendChild(VT.sprites.img('coin', { scale: 2 }));
      rw.appendChild(el('span', '', '+' + lvl * 25));
      col.appendChild(rw);
      t.appendChild(col);
      setTimeout(() => earnCoins(lvl * 25, screenPos(t)), 550);
    });
    pump();
  }

  VT.hud = {
    build() {
      buildStatusBars();
      refresh();
      VT.profile.onChange(() => refresh());
    },
    refresh,
    coinAnchor,
    earnCoins,
    spendCoins,
    achUnlocked,
    levelUp,
  };
})();
