/* ============================================================
   В ТЕМУ! — ui/game.js
   Game screen controller: hearts HUD, timer, control buttons,
   win/lose modals. Owns Board + WireLayer lifecycles.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el, wait } = VT.util;

  let board = null;
  let wires = null;
  let timerId = null;
  let seconds = 0;
  let finished = false;

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
    const hint = document.getElementById('game-hint');
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

  /* ---------------- win / lose ---------------- */

  function statsBody(extra) {
    const body = el('div', '');
    body.style.width = '100%';
    const stats = el('div', 'result-stats');
    stats.innerHTML = `
      <div class="rs"><b>${document.getElementById('timer-val').textContent}</b><span>ВРЕМЯ</span></div>
      <div class="rs"><b>${board.mistakes}</b><span>ОШИБКИ</span></div>
      <div class="rs"><b>${board.solvedCount}/4</b><span>ГРУППЫ</span></div>`;
    body.appendChild(stats);
    if (extra) body.appendChild(extra);
    return body;
  }

  function onWin() {
    finished = true;
    stopTimer();
    VT.audio.play('win');
    VT.fx.confettiRain(3);
    setTimeout(() => VT.fx.confettiRain(2), 800);
    VT.modal.open({
      title: 'ПОБЕДА!', icon: 'trophy', sub: 'ВСЕ ГРУППЫ НАЙДЕНЫ',
      body: statsBody(),
      veilClose: false,
      buttons: [
        { label: 'ЕЩЁ РАЗ', icon: 'shuffle', primary: true, onClick: restart },
        { label: 'В МЕНЮ', icon: 'back', onClick: () => VT.screens.go('menu') },
      ],
    });
  }

  function onLose() {
    finished = true;
    stopTimer();
    VT.audio.play('lose');
    VT.modal.open({
      title: 'ПОРАЖЕНИЕ', icon: 'heartDead', sub: 'ПОПЫТКИ ЗАКОНЧИЛИСЬ',
      body: statsBody(),
      veilClose: false,
      buttons: [
        { label: 'РЕВАНШ', icon: 'shuffle', primary: true, onClick: restart },
        { label: 'В МЕНЮ', icon: 'back', onClick: () => VT.screens.go('menu') },
      ],
    });
  }

  /* ---------------- lifecycle ---------------- */

  function restart() {
    finished = false;
    board = new VT.Board({
      puzzle: VT.data.puzzles[0],
      grid: document.getElementById('grid'),
      wrap: document.getElementById('board-wrap'),
      solvedStack: document.getElementById('solved-stack'),
      wires,
      on: onBoardEvent,
    });
    renderHearts(VT.MAX_MISTAKES);
    setHint(0);
    board.deal();
    startTimer();
  }

  function onBoardEvent(name, a, b) {
    if (name === 'select') setHint(a);
    else if (name === 'mistake') loseHeart(a);
    else if (name === 'win') onWin();
    else if (name === 'lose') onLose();
    else if (name === 'solved') {
      VT.toast(`НАЙДЕНО: ${a.title}`, 'good', 1400);
      wires.resize();
    }
  }

  function bind() {
    const hov = (id) => document.getElementById(id).addEventListener('mouseenter', () => VT.audio.play('hover'));
    ['btn-shuffle', 'btn-clear', 'btn-submit', 'btn-back'].forEach(hov);

    document.getElementById('btn-shuffle').addEventListener('click', () => board && board.shuffleTiles());
    document.getElementById('btn-clear').addEventListener('click', () => board && board.deselectAll());
    document.getElementById('btn-submit').addEventListener('click', () => board && board.submit());
    document.getElementById('btn-back').addEventListener('click', () => {
      VT.audio.play('click');
      VT.screens.go('menu');
    });

    VT.sprites.mount(document.querySelector('#btn-back [data-ico]'), 'back', { scale: 2, color: '#1b1914' });
    VT.sprites.mount(document.querySelector('#chip-timer [data-ico]'), 'clock', { scale: 2, color: '#a9c86f' });
    VT.sprites.mount(document.querySelector('#btn-shuffle [data-ico]'), 'shuffle', { scale: 2, color: '#1b1914' });
    VT.sprites.mount(document.querySelector('#btn-clear [data-ico]'), 'cross', { scale: 2, color: '#1b1914' });
    VT.sprites.mount(document.querySelector('#btn-submit [data-ico]'), 'check', { scale: 2, color: '#1b1914' });

    /* keyboard niceties */
    document.addEventListener('keydown', (e) => {
      if (VT.screens.current !== 'game' || !board || finished) return;
      if (e.key === 'Enter') board.submit();
      else if (e.key === 'Escape') board.deselectAll();
      else if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'ы') board.shuffleTiles();
    });
  }

  VT.gameScreen = {
    init() {
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
          restart();
        },
        onExit() {
          stopTimer();
          wires.stop();
          document.getElementById('modal-root').innerHTML = '';
        },
      });
    },
  };
})();
