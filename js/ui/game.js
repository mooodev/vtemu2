/* ============================================================
   В ТЕМУ! — ui/game.js
   Game screen controller: hearts HUD, timer, control buttons,
   the ПОБЕДА button flow, paid ОБЪЯСНИТЬ mode, win/lose modals
   with coin/XP rewards. Owns Board + WireLayer lifecycles.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el, screenPos } = VT.util;

  /* ОБЪЯСНИТЬ: base price doubles with each hint bought in a round */
  const EXPLAIN_BASE = (window.VT_ENV && window.VT_ENV.EXPLAIN_BASE_COST) || 10;
  const EMO = { easy: '🟩', medium: '🟨', hard: '🟦', expert: '🟪' };

  let board = null;
  let wires = null;
  let timerId = null;
  let seconds = 0;
  let finished = false;
  let victory = false;        // board solved, waiting for the ПОБЕДА press
  let victorySparkT = null;
  let explaining = false;
  let explainUses = 0;        // hints bought this round → price = base × 2^uses
  let solvedOrder = [];       // group diffs in solve order (achievements)
  let pending = null;         // official puzzle meta from VT.daily (null = demo round)

  /* ---------------- talking logo ---------------- */

  const TITLE = 'В ТЕМУ!';
  const PHRASES = {
    congrats: ['КРАСАВА!', 'В ТОЧКУ!', 'ОГОНЬ!', 'ГЕНИЙ!', 'МОЩНО!'],
    snark:    ['НУ-НУ...', 'СЕРЬЁЗНО?', 'МИМО!', 'ОЙ-ОЙ...', 'НЕ В ТЕМУ!', 'ХМ-М-М...'],
    idle:     ['ДУМАЙ!', 'НЕ СПИ!', 'ТИК-ТАК...', 'СЛОВА ЖДУТ', 'НУ ЧТО?'],
  };
  let gameLogo = null;
  let revertT = null;
  let idleT = null;

  /** Show a remark on the header logo, then swap back to the title. */
  function flashPhrase(kind, hold = 2800) {
    if (!gameLogo) return;
    const tone = kind === 'congrats' ? 'tone-gold' : kind === 'snark' ? 'tone-red' : '';
    clearTimeout(revertT);
    gameLogo.setText(VT.util.choice(PHRASES[kind]), tone);
    revertT = setTimeout(() => gameLogo.setText(TITLE), hold);
  }

  /* an occasional unprompted remark while the player is thinking */
  function scheduleIdle() {
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      if (!finished && VT.screens.current === 'game' && gameLogo.text === TITLE) {
        flashPhrase('idle');
      }
      scheduleIdle();
    }, VT.util.rand(14000, 24000));
  }

  function stopLogoTalk() {
    clearTimeout(revertT); revertT = null;
    clearTimeout(idleT); idleT = null;
  }

  /* ---------------- HUD ---------------- */

  function renderHearts(left) {
    const row = document.getElementById('hearts-row');
    row.innerHTML = '';
    for (let i = 0; i < VT.MAX_MISTAKES; i++) {
      const hp = el('span', 'hp' + (i >= left ? ' lost' : ''));
      hp.appendChild(VT.sprites.img(i < left ? 'heart' : 'heartDead', { scale: 3 }));
      row.appendChild(hp);
    }
  }

  function loseHeart(left) {
    const row = document.getElementById('hearts-row');
    const hp = row.children[left];
    if (!hp) return renderHearts(left);
    hp.classList.add('lost');
    const p = VT.util.screenPos(hp);
    VT.fx.burst(p.x, p.y, { count: 10, colors: ['#c8402f', '#e06a50', '#6f6a58'], speed: 120, size: [2, 4] });
    setTimeout(() => {
      hp.innerHTML = '';
      hp.appendChild(VT.sprites.img('heartDead', { scale: 3 }));
    }, 550);
  }

  function setHint(n) {
    if (victory) return;
    const hint = document.getElementById('game-hint');
    if (explaining) { hint.textContent = 'ТКНИ В СЛОВО — ОБЪЯСНЮ'; hint.classList.add('lit'); return; }
    if (n === 0) { hint.textContent = 'СОБЕРИ ЦЕПЬ ИЗ 4 СЛОВ'; hint.classList.remove('lit'); }
    else if (n < 4) { hint.textContent = `В ЦЕПИ: ${n} ИЗ 4`; hint.classList.remove('lit'); }
    else { hint.textContent = 'ЦЕПЬ ЗАМКНУТА! ПРОВЕРЯЕМ?'; hint.classList.add('lit'); }
    document.getElementById('btn-submit').disabled = n !== 4;
  }

  function startTimer() {
    stopTimer();
    seconds = 0;
    tickTimer();
    timerId = setInterval(() => { seconds++; tickTimer(); }, 1000);
  }
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }
  function tickTimer() {
    const m = Math.floor(seconds / 60), s = String(seconds % 60).padStart(2, '0');
    document.getElementById('timer-val').textContent = `${m}:${s}`;
  }

  /* ---------------- ПОБЕДА button ----------------
     The board is solved but we don't yank the player away:
     ПРОВЕРИТЬ turns into a happily bouncing gold ПОБЕДА button,
     and the win screen waits until they press it. */

  function enterVictory() {
    finished = true;
    victory = true;
    stopTimer();
    stopLogoTalk();
    cancelExplain();
    gameLogo.setText('ПОБЕДА!', 'tone-gold');
    VT.audio.play('solve');
    VT.fx.confettiRain(1.6);
    navigator.vibrate && navigator.vibrate([30, 50, 30]);

    const btn = document.getElementById('btn-submit');
    btn.classList.add('victory');
    btn.disabled = false;
    VT.sprites.mount(btn.querySelector('[data-ico]'), 'trophy', { scale: 2 });
    btn.querySelector('.lbl').textContent = 'ПОБЕДА';
    document.getElementById('btn-shuffle').disabled = true;
    document.getElementById('btn-clear').disabled = true;
    document.getElementById('btn-explain').disabled = true;

    const hint = document.getElementById('game-hint');
    hint.textContent = 'КРАСОТА! ОСМОТРИСЬ — И ЖМИ, КОГДА ГОТОВ';
    hint.classList.add('lit');

    /* the button softly sheds sparkles while it waits */
    victorySparkT = setInterval(() => {
      if (VT.screens.current !== 'game') return;
      const p = screenPos(btn);
      VT.fx.sparkle(p.x + VT.util.rand(-p.w / 2, p.w / 2), p.y + VT.util.rand(-p.h / 2, p.h / 2), { size: 5 });
    }, 420);
  }

  function resetControls() {
    clearInterval(victorySparkT); victorySparkT = null;
    victory = false;
    const btn = document.getElementById('btn-submit');
    btn.classList.remove('victory');
    btn.disabled = true;
    VT.sprites.mount(btn.querySelector('[data-ico]'), 'check', { scale: 2, color: '#1b1914' });
    btn.querySelector('.lbl').textContent = 'ПРОВЕРИТЬ';
    document.getElementById('btn-shuffle').disabled = false;
    document.getElementById('btn-clear').disabled = false;
    document.getElementById('btn-explain').disabled = false;
  }

  /* ---------------- win / lose ---------------- */

  function statsBody(rewards) {
    const body = el('div', '');
    body.style.width = '100%';
    const stats = el('div', 'result-stats');
    stats.innerHTML = `
      <div class="rs"><b>${document.getElementById('timer-val').textContent}</b><span>ВРЕМЯ</span></div>
      <div class="rs"><b>${board.mistakes}</b><span>ОШИБКИ</span></div>
      <div class="rs"><b>${board.solvedCount}/4</b><span>ГРУППЫ</span></div>`;
    body.appendChild(stats);
    if (rewards) {
      const row = el('div', 'reward-row');
      row.id = 'reward-row';
      const c = el('span', 'rw');
      c.appendChild(VT.sprites.img('coin', { scale: 2 }));
      c.appendChild(el('b', '', '+' + rewards.coins));
      const x = el('span', 'rw');
      x.appendChild(VT.sprites.img('star', { scale: 2 }));
      x.appendChild(el('b', '', '+' + rewards.xp + ' ОП'));
      row.appendChild(el('span', 'rw-cap', 'НАГРАДА'));
      row.appendChild(c);
      row.appendChild(x);
      body.appendChild(row);
    }
    return body;
  }

  /** Persist an official (daily/weekly) result — feeds archive + share. */
  function saveOfficialResult(win) {
    if (!pending) return;
    VT.profile.setDailyResult(pending.key, {
      win, seconds, mistakes: board.mistakes, solved: board.solvedCount,
      rows: board.guesses.map((g) => g.map((d) => EMO[d]).join('')),
      num: pending.num, kind: pending.kind, diff: pending.diff, date: pending.date,
      ts: Date.now(),
    });
  }

  /* official puzzles are one-shot: no free replay, share instead */
  function resultButtons(retryLabel) {
    return pending ? [
      { label: 'ПОДЕЛИТЬСЯ', icon: 'star', primary: true, keepOpen: true, onClick: () => VT.dailyUI.share(pending.key) },
      { label: 'В МЕНЮ', icon: 'back', onClick: () => VT.screens.go('menu') },
    ] : [
      { label: retryLabel, icon: 'shuffle', primary: true, onClick: restart },
      { label: 'В МЕНЮ', icon: 'back', onClick: () => VT.screens.go('menu') },
    ];
  }

  function showWin() {
    clearInterval(victorySparkT); victorySparkT = null;
    const rewards = VT.profile.recordGame({
      win: true, seconds, mistakes: board.mistakes,
      order: solvedOrder, puzzle: board.puzzle, solvedCount: board.solvedCount,
      mode: pending ? pending.kind : 'free',
    });
    saveOfficialResult(true);
    VT.audio.play('win');
    VT.fx.confettiRain(3);
    setTimeout(() => VT.fx.confettiRain(2), 800);
    VT.modal.open({
      title: 'ПОБЕДА!', icon: 'trophy',
      sub: pending ? `${pending.puzzle.title} РЕШЁН!` : 'ВСЕ ГРУППЫ НАЙДЕНЫ',
      body: statsBody(rewards),
      veilClose: false,
      buttons: resultButtons('ЕЩЁ РАЗ'),
    });
    /* coins pour from the reward row into the counter */
    setTimeout(() => {
      const row = document.getElementById('reward-row');
      if (row) VT.hud.earnCoins(rewards.coins, screenPos(row));
    }, 650);
  }

  function onLose() {
    finished = true;
    stopTimer();
    stopLogoTalk();
    cancelExplain();
    gameLogo.setText('УВЫ...', 'tone-red');
    VT.audio.play('lose');
    const rewards = VT.profile.recordGame({
      win: false, seconds, mistakes: board.mistakes,
      order: solvedOrder, puzzle: board.puzzle, solvedCount: board.solvedCount,
      mode: pending ? pending.kind : 'free',
    });
    saveOfficialResult(false);
    VT.modal.open({
      title: 'ПОРАЖЕНИЕ', icon: 'heartDead',
      sub: pending && pending.kind === 'weekly' ? 'МОНСТР ПОБЕДИЛ. МЫ ПРЕДУПРЕЖДАЛИ' : 'ПОПЫТКИ ЗАКОНЧИЛИСЬ',
      body: statsBody(rewards),
      veilClose: false,
      buttons: resultButtons('РЕВАНШ'),
    });
  }

  /* ---------------- paid ОБЪЯСНИТЬ ---------------- */

  const explainCost = () => EXPLAIN_BASE * Math.pow(2, explainUses);

  function updateExplainCost() {
    const span = document.querySelector('#explain-cost span');
    if (span) span.textContent = String(explainCost());
  }

  function armExplain() {
    if (!board || finished || board.locked) return;
    if (explaining) return cancelExplain();
    if (VT.profile.coins < explainCost()) {
      VT.audio.play('denied');
      VT.toast(`НУЖНО ${explainCost()} МОНЕТ`, 'err', 1500);
      const btn = document.getElementById('btn-explain');
      btn.classList.add('shake-no');
      setTimeout(() => btn.classList.remove('shake-no'), 450);
      return;
    }
    explaining = true;
    VT.audio.play('toggle');
    document.getElementById('btn-explain').classList.add('armed');
    document.getElementById('view-game').classList.add('explaining');
    setHint(board.selection.length);
  }

  function cancelExplain() {
    if (!explaining) return;
    explaining = false;
    document.getElementById('btn-explain').classList.remove('armed');
    document.getElementById('view-game').classList.remove('explaining');
    if (!victory && board) setHint(board.selection.length);
  }

  function explainTile(tile) {
    cancelExplain();
    const cost = explainCost();
    if (!VT.profile.spendCoins(cost)) return;
    explainUses++;           // the next hint costs twice as much
    updateExplainCost();
    VT.profile.track('explains');
    VT.audio.play('buy');
    const word = tile.dataset.word;
    VT.hud.spendCoins(cost, screenPos(tile));

    setTimeout(() => {
      const body = el('div', 'lore-body');
      const m = VT.sprites.img('mascot', { scale: 4 });
      m.style.flex = '0 0 auto';
      body.appendChild(m);
      body.appendChild(el('p', 'lore-text', VT.data.lore(word)));
      VT.modal.open({
        title: word, icon: 'books', sub: 'ЭНЦИКЛОПЕДИЯ СИСТЕМЫ 128',
        body,
        buttons: [{ label: 'ЯСНО-ПОНЯТНО', primary: true }],
      });
    }, 420);
  }

  /* ---------------- lifecycle ---------------- */

  function restart() {
    finished = false;
    solvedOrder = [];
    explainUses = 0;
    updateExplainCost();
    resetControls();
    cancelExplain();
    stopLogoTalk();
    if (gameLogo.text !== TITLE) gameLogo.setText(TITLE);
    scheduleIdle();
    board = new VT.Board({
      puzzle: (pending && pending.puzzle) || VT.data.puzzles[0],
      grid: document.getElementById('grid'),
      wrap: document.getElementById('board-wrap'),
      solvedStack: document.getElementById('solved-stack'),
      wires,
      on: onBoardEvent,
    });
    board.pickHandler = (tile) => {
      if (!explaining) return false;
      explainTile(tile);
      return true;
    };
    renderHearts(VT.MAX_MISTAKES);
    setHint(0);
    board.deal();
    startTimer();
    if (pending) {
      VT.toast(`${pending.puzzle.title} — ${VT.data.DIFF[pending.diff].name}`, pending.kind === 'weekly' ? 'err' : 'good', 2000);
    }
  }

  function onBoardEvent(name, a, b) {
    if (name === 'select') setHint(a);
    else if (name === 'mistake') { loseHeart(a); if (a > 0) flashPhrase('snark'); }
    else if (name === 'win') enterVictory();
    else if (name === 'lose') onLose();
    else if (name === 'dejavu') VT.profile.track('dejavu');
    else if (name === 'solved') {
      solvedOrder.push(a.diff);
      VT.toast(`НАЙДЕНО: ${a.title}`, 'good', 1400);
      if (board.solvedCount < 4) flashPhrase('congrats');
      wires.resize();
    }
  }

  function bind() {
    const hov = (id) => document.getElementById(id).addEventListener('mouseenter', () => VT.audio.play('hover'));
    ['btn-shuffle', 'btn-clear', 'btn-submit', 'btn-back', 'btn-explain'].forEach(hov);

    document.getElementById('btn-shuffle').addEventListener('click', () => {
      if (!board || finished || board.locked) return;
      VT.profile.track('shuffles');
      board.shuffleTiles();
    });
    document.getElementById('btn-clear').addEventListener('click', () => {
      cancelExplain();
      board && board.deselectAll();
    });
    document.getElementById('btn-submit').addEventListener('click', () => {
      if (victory) return showWin();
      board && board.submit();
    });
    document.getElementById('btn-explain').addEventListener('click', armExplain);
    document.getElementById('btn-back').addEventListener('click', () => {
      VT.audio.play('click');
      VT.screens.go('menu');
    });

    VT.sprites.mount(document.querySelector('#btn-back [data-ico]'), 'back', { scale: 2, color: '#1b1914' });
    VT.sprites.mount(document.querySelector('#chip-timer [data-ico]'), 'clock', { scale: 2, color: '#a9c86f' });
    VT.sprites.mount(document.querySelector('#btn-shuffle [data-ico]'), 'shuffle', { scale: 2, color: '#1b1914' });
    VT.sprites.mount(document.querySelector('#btn-clear [data-ico]'), 'cross', { scale: 2, color: '#1b1914' });
    VT.sprites.mount(document.querySelector('#btn-submit [data-ico]'), 'check', { scale: 2, color: '#1b1914' });
    VT.sprites.mount(document.querySelector('#btn-explain [data-ico]'), 'bulb', { scale: 2 });
    const cost = document.getElementById('explain-cost');
    cost.appendChild(VT.sprites.img('coin', { scale: 1 }));
    cost.appendChild(el('span', '', String(EXPLAIN_BASE)));

    /* keyboard niceties */
    document.addEventListener('keydown', (e) => {
      if (VT.screens.current !== 'game' || !board) return;
      if (victory && e.key === 'Enter') return showWin();
      if (finished) return;
      if (e.key === 'Enter') board.submit();
      else if (e.key === 'Escape') { cancelExplain(); board.deselectAll(); }
      else if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'ы') board.shuffleTiles();
    });

    /* refit tile labels when the viewport changes (rotation etc.) */
    let refitT = null;
    window.addEventListener('resize', () => {
      clearTimeout(refitT);
      refitT = setTimeout(() => board && board.refit(), 140);
    });
  }

  VT.gameScreen = {
    /** Launch an official puzzle (meta from VT.daily: puzzle/kind/key/...). */
    play(meta) {
      pending = meta || null;
      if (VT.screens.current === 'game') restart();
      else VT.screens.go('game');
    },

    init() {
      gameLogo = VT.logo.mount(document.getElementById('game-logo'), TITLE);
      wires = new VT.WireLayer(
        document.getElementById('wires'),
        document.getElementById('board-wrap')
      );
      VT.debug = { get board() { return board; }, wires };
      bind();
      VT.screens.register('game', {
        el: document.getElementById('view-game'),
        onEnter() {
          wires.start();
          gameLogo.startTicker(2.2, 5);
          restart();
        },
        onExit() {
          stopTimer();
          stopLogoTalk();
          cancelExplain();
          resetControls();
          gameLogo.stopTicker();
          wires.stop();
          document.getElementById('modal-root').innerHTML = '';
        },
      });
    },
  };
})();
