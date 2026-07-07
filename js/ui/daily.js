/* ============================================================
   В ТЕМУ! — ui/daily.js
   The official-puzzle UI: the ИГРАТЬ mode-select modal (daily +
   weekly monster + archive), the АРХИВ screen (missed puzzles
   unlock for coins), result modals for finished puzzles and the
   ПОДЕЛИТЬСЯ button — copies a spoiler-free colored-square grid
   to the clipboard, Wordle-style.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const ENV = window.VT_ENV || {};
  const { el, choice } = VT.util;

  const COST = ENV.ARCHIVE_COST || 25;
  const EMO = { easy: '🟩', medium: '🟨', hard: '🟦', expert: '🟪' };
  const HYPE = [
    'СОСТАВЛЕН БЕЗ КАПЛИ ЖАЛОСТИ',
    'ЕГО НЕ РЕШИЛ ДАЖЕ АВТОР',
    'ШАНС ПОБЕДЫ: 2%. НУ ПОПРОБУЙ',
    'ТЫ ЕГО НЕ РЕШИШЬ. ДОКАЖИ, ЧТО МЫ НЕПРАВЫ',
    'ЧЕТЫРЕ ГРУППЫ. НОЛЬ НАДЕЖДЫ',
  ];

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const pad = (n) => String(n).padStart(2, '0');
  const priceOf = (meta) => meta.kind === 'weekly' ? COST * 2 : COST;

  function fmtCountdown(ms) {
    ms = Math.max(0, ms);
    const d = Math.floor(ms / 864e5);
    const h = Math.floor(ms / 3600e3) % 24;
    const m = Math.floor(ms / 60e3) % 60;
    const s = Math.floor(ms / 1e3) % 60;
    return d > 0 ? `${d}Д ${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function screenCenter() {
    const scr = document.getElementById('screen');
    return { x: scr.offsetWidth / 2, y: scr.offsetHeight / 2, w: 0, h: 0 };
  }

  /* ---------------- share ---------------- */

  function shareText(res) {
    const name = res.kind === 'weekly' ? `ПАЗЛ НЕДЕЛИ №${res.num}` : `ПАЗЛ ДНЯ №${res.num}`;
    const head = `В ТЕМУ! — ${name} (${VT.data.DIFF[res.diff].name})`;
    const grid = (res.rows || []).join('\n');
    const tail = res.win
      ? `РЕШЕНО ЗА ${fmtTime(res.seconds)} · ОШИБКИ: ${res.mistakes}`
      : `НЕ РЕШЁН 💀 ГРУППЫ: ${res.solved}/4`;
    return head + '\n' + grid + '\n' + tail;
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      /* file:// or old browsers — textarea fallback */
      const ta = el('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { /* denied */ }
      ta.remove();
      return ok;
    }
  }

  async function share(key) {
    const res = VT.profile.dailyResult(key);
    if (!res) return;
    if (await copy(shareText(res))) {
      VT.audio.play('ach');
      VT.fx.confettiRain(0.8);
      VT.toast('СКОПИРОВАНО — КИДАЙ ДРУЗЬЯМ!', 'good', 2200);
      VT.profile.track('shares');
    } else {
      VT.audio.play('denied');
      VT.toast('НЕ ВЫШЛО СКОПИРОВАТЬ', 'err', 1600);
    }
  }

  /* ---------------- countdown ticker (one at a time) ---------------- */

  let cdT = null;
  function stopCd() { if (cdT) clearInterval(cdT); cdT = null; }
  function startCd(update) {
    stopCd();
    update();
    cdT = setInterval(update, 1000);
  }

  /* ---------------- paid entry ---------------- */

  function confirmPaid(meta) {
    stopCd();
    const price = priceOf(meta);
    const res = VT.profile.dailyResult(meta.key);
    const body = el('div', 'buy-body');
    const price0 = el('div', 'buy-price');
    price0.appendChild(el('span', '', 'ЦЕНА:'));
    price0.appendChild(VT.sprites.img('coin', { scale: 2 }));
    price0.appendChild(el('b', '', String(price)));
    body.appendChild(price0);
    body.appendChild(el('div', 'mc-note center',
      `${VT.data.DIFF[meta.diff].name} · ${meta.date}` + (res ? ' · ПОВТОРНАЯ ПОПЫТКА' : '')));

    const canPay = VT.profile.coins >= price;
    if (!canPay) body.appendChild(el('div', 'buy-warn', 'НЕ ХВАТАЕТ МОНЕТ — ИГРАЙ И ЗАРАБАТЫВАЙ!'));

    VT.modal.open({
      title: meta.puzzle.title, icon: 'lock', sub: 'АРХИВ СИСТЕМЫ 128',
      body,
      buttons: canPay ? [
        {
          label: 'ОТКРЫТЬ', icon: 'coin', primary: true,
          onClick() {
            if (!VT.profile.spendCoins(price)) { VT.audio.play('denied'); return; }
            VT.profile.track('archiveBuys');
            VT.audio.play('buy');
            VT.hud.spendCoins(price, screenCenter());
            setTimeout(() => VT.gameScreen.play(meta), 600);
          },
        },
        { label: 'ПОТОМ' },
      ] : [{ label: 'ПОНЯТНО', primary: true }],
    });
  }

  /* ---------------- result modal (finished puzzles) ---------------- */

  function resultModal(meta) {
    stopCd();
    const res = VT.profile.dailyResult(meta.key);
    if (!res) return;
    const body = el('div', '');
    body.style.width = '100%';
    const stats = el('div', 'result-stats');
    stats.innerHTML = `
      <div class="rs"><b>${fmtTime(res.seconds)}</b><span>ВРЕМЯ</span></div>
      <div class="rs"><b>${res.mistakes}</b><span>ОШИБКИ</span></div>
      <div class="rs"><b>${res.solved}/4</b><span>ГРУППЫ</span></div>`;
    body.appendChild(stats);
    if (res.rows && res.rows.length) {
      body.appendChild(el('div', 'share-grid', res.rows.join('<br>')));
    }

    const buttons = [
      { label: 'ПОДЕЛИТЬСЯ', icon: 'star', primary: true, keepOpen: true, onClick: () => share(meta.key) },
    ];
    if (!res.win) buttons.push({ label: `РЕВАНШ ЗА ${priceOf(meta)}`, icon: 'coin', onClick: () => confirmPaid(meta) });
    buttons.push({ label: 'ЗАКРЫТЬ' });

    VT.modal.open({
      title: meta.puzzle.title,
      icon: res.win ? 'trophy' : 'heartDead',
      sub: res.win ? 'РЕШЕНО! ' + meta.date : 'НЕ ПОДДАЛСЯ... ' + meta.date,
      body, buttons,
    });
  }

  /* ---------------- ИГРАТЬ mode-select modal ---------------- */

  function modeCard({ icon, cls, title, sub, note, status, statusCls, onClick }) {
    const c = el('button', 'mode-card' + (cls ? ' ' + cls : ''));
    const ico = el('span', 'mc-ico');
    ico.appendChild(VT.sprites.img(icon, { scale: 3 }));
    c.appendChild(ico);
    const col = el('span', 'mc-col');
    col.appendChild(el('b', 'mc-t', title));
    col.appendChild(el('i', 'mc-d', sub));
    const noteEl = el('i', 'mc-note', note || '');
    col.appendChild(noteEl);
    c.appendChild(col);
    c.appendChild(el('span', 'mc-status ' + (statusCls || ''), status));
    c.addEventListener('mouseenter', () => VT.audio.play('hover'));
    c.addEventListener('click', () => { VT.audio.play('click'); onClick(); });
    c._note = noteEl;
    return c;
  }

  function statusFor(res) {
    if (!res) return { status: 'В БОЙ!', statusCls: 'go' };
    return res.win ? { status: 'РЕШЕНО', statusCls: 'won' } : { status: 'МИМО', statusCls: 'lost' };
  }

  function openPlayModal() {
    if (!VT.daily.ready) {
      VT.toast('ЛОВЛЮ СЛОВА СО СПУТНИКА...', '', 1400);
      VT.daily.load().then(() => {
        if (VT.screens.current === 'menu') openPlayModal();
      }).catch(() => {
        VT.audio.play('denied');
        VT.toast('НЕТ СВЯЗИ СО СЛОВАРЁМ! ПРОВЕРЬ ИНТЕРНЕТ', 'err', 2400);
      });
      return;
    }
    const today = VT.daily.today();
    const week = VT.daily.thisWeek();
    if (!today || !week) {
      VT.toast('СЛОВАРЬ ПУСТ — ЗАГЛЯНИ ПОЗЖЕ', 'err', 2000);
      return;
    }

    const body = el('div', 'mode-list');
    let ref = null; // set after modal.open — cards must close the veil themselves
    const leaveTo = (fn) => { stopCd(); if (ref) ref.close(); fn(); };

    const dRes = VT.profile.dailyResult(today.key);
    const dCard = modeCard({
      icon: 'clock',
      title: `ПАЗЛ ДНЯ №${today.num}`,
      sub: `${VT.data.DIFF[today.diff].name} · ОДИН НА ВСЕХ · ${today.date}`,
      status: statusFor(dRes).status,
      statusCls: statusFor(dRes).statusCls,
      onClick: () => dRes ? resultModal(today) : leaveTo(() => VT.gameScreen.play(today)),
    });
    body.appendChild(dCard);

    const wRes = VT.profile.dailyResult(week.key);
    const wCard = modeCard({
      icon: 'heartDead',
      cls: 'monster',
      title: `ПАЗЛ НЕДЕЛИ №${week.num}`,
      sub: choice(HYPE),
      status: statusFor(wRes).status,
      statusCls: statusFor(wRes).statusCls,
      onClick: () => wRes ? resultModal(week) : leaveTo(() => VT.gameScreen.play(week)),
    });
    body.appendChild(wCard);

    const aCard = modeCard({
      icon: 'lock',
      cls: 'slim',
      title: 'АРХИВ',
      sub: 'ПРОПУЩЕННЫЕ ПАЗЛЫ — ЗА МОНЕТЫ',
      status: '→',
      onClick: () => leaveTo(() => VT.screens.go('archive')),
    });
    body.appendChild(aCard);

    ref = VT.modal.open({
      title: 'ИГРАТЬ', icon: 'play', sub: 'ОФИЦИАЛЬНЫЕ ПАЗЛЫ СИСТЕМЫ 128',
      body,
      buttons: [{ label: 'ПОТОМ', onClick: stopCd }],
      onClose: stopCd,
    });

    startCd(() => {
      dCard._note.textContent = `НОВЫЙ ЧЕРЕЗ ${fmtCountdown(VT.daily.msToMidnight())} (МСК)`;
      wCard._note.textContent = `СЛЕДУЮЩИЙ МОНСТР ЧЕРЕЗ ${fmtCountdown(VT.daily.msToNextMonday())}`;
    });
  }

  /* ---------------- АРХИВ screen ---------------- */

  let archBody = null;
  let sub = null;

  function emptyState(msg) {
    const e = el('div', 'meta-empty');
    e.appendChild(VT.sprites.img('mascot', { scale: 5 }));
    e.appendChild(el('p', '', msg));
    return e;
  }

  function archRow(meta) {
    const res = VT.profile.dailyResult(meta.key);
    const row = el('button', 'arch-row ' + (res ? (res.win ? 'w' : 'l') : 'lk'));
    const ico = el('span', 'ico');
    ico.appendChild(VT.sprites.img(res ? (res.win ? 'trophy' : 'heartDead') : 'lock', { scale: 2 }));
    row.appendChild(ico);
    const col = el('span', 'col');
    col.appendChild(el('b', '', `${meta.puzzle.title} — ${VT.data.DIFF[meta.diff].name}`));
    col.appendChild(el('i', '', meta.date));
    row.appendChild(col);
    const st = el('span', 'st');
    if (res) {
      st.appendChild(el('span', '', res.win ? 'РЕШЕНО' : 'МИМО'));
      st.appendChild(el('span', '', fmtTime(res.seconds)));
    } else {
      const price = el('span', 'price-tag');
      price.appendChild(VT.sprites.img('coin', { scale: 1 }));
      price.appendChild(el('span', '', String(priceOf(meta))));
      st.appendChild(price);
    }
    row.appendChild(st);
    row.addEventListener('mouseenter', () => VT.audio.play('hover'));
    row.addEventListener('click', () => {
      VT.audio.play('click');
      res ? resultModal(meta) : confirmPaid(meta);
    });
    return row;
  }

  function renderArchive() {
    if (!archBody) return;
    archBody.innerHTML = '';
    if (!VT.daily.ready) {
      archBody.appendChild(emptyState('НАСТРАИВАЮ АНТЕННУ...<br>СЛОВА ЕЩЁ ЛЕТЯТ СО СПУТНИКА'));
      VT.daily.load().then(renderArchive).catch(() => {
        archBody.innerHTML = '';
        archBody.appendChild(emptyState('НЕТ СВЯЗИ СО СЛОВАРЁМ.<br>ПРОВЕРЬ ИНТЕРНЕТ И ЗАЙДИ СНОВА'));
      });
      return;
    }
    const { days, weeks } = VT.daily.archiveEntries();
    if (!days.length && !weeks.length) {
      archBody.appendChild(emptyState('АРХИВ ПОКА ПУСТ.<br>ПЕРВЫЙ ПАЗЛ УЙДЁТ СЮДА В ПОЛНОЧЬ!'));
      return;
    }
    if (weeks.length) {
      archBody.appendChild(el('p', 'tab-cap', 'НЕДЕЛЬНЫЕ МОНСТРЫ'));
      const wl = el('div', 'arch-list');
      weeks.forEach((m) => wl.appendChild(archRow(m)));
      archBody.appendChild(wl);
    }
    if (days.length) {
      archBody.appendChild(el('p', 'tab-cap', 'ДНЕВНЫЕ ПАЗЛЫ'));
      const dl = el('div', 'arch-list');
      days.forEach((m) => dl.appendChild(archRow(m)));
      archBody.appendChild(dl);
    }
  }

  /* ---------------- init ---------------- */

  VT.dailyUI = {
    openPlayModal,
    resultModal,
    share,

    init() {
      archBody = document.getElementById('archive-body');
      const back = document.getElementById('btn-archive-back');
      VT.sprites.mount(back.querySelector('[data-ico]'), 'back', { scale: 2, color: '#1b1914' });
      back.addEventListener('click', () => { VT.audio.play('click'); VT.screens.go('menu'); });
      back.addEventListener('mouseenter', () => VT.audio.play('hover'));

      VT.screens.register('archive', {
        el: document.getElementById('view-archive'),
        onEnter() {
          renderArchive();
          sub = VT.profile.onChange(() => renderArchive());
        },
        onExit() {
          if (sub) { VT.profile.offChange(sub); sub = null; }
          document.getElementById('modal-root').innerHTML = '';
        },
      });
    },
  };
})();
