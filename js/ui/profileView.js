/* ============================================================
   В ТЕМУ! — ui/profileView.js
   ПРОФИЛЬ: player card (avatar + level + XP bar), then three
   tabs — ДОСТИЖЕНИЯ (grid with secrets & progress bars),
   АРХИВ (finished rounds, tap for a full group reveal),
   СТАТИСТИКА (lifetime numbers).
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el } = VT.util;

  let bodyEl = null;
  let tab = 'ach';
  let sub = null;

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const fmtDate = (ts) => {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  /* ---------------- player card ---------------- */

  function playerCard() {
    const p = VT.profile;
    const card = el('div', 'pcard');

    const frame = el('div', 'ava-frame pcard-ava');
    frame.appendChild(VT.avatars.img(p.avatar));
    frame.title = 'Сменить в магазине';
    frame.addEventListener('click', () => { VT.audio.play('click'); VT.screens.go('shop'); });
    card.appendChild(frame);

    const col = el('div', 'pcard-col');
    const nameRow = el('div', 'pcard-name');
    nameRow.appendChild(el('span', '', 'ИГРОК 1'));
    nameRow.appendChild(el('span', 'pcard-lvl', `УР. ${p.level}`));
    col.appendChild(nameRow);

    const bar = el('div', 'xpbar');
    const fill = el('div', 'fill');
    fill.style.width = Math.min(100, (p.xp / p.xpNeed) * 100).toFixed(1) + '%';
    bar.appendChild(fill);
    bar.appendChild(el('span', 'cap', `${p.xp} / ${p.xpNeed} ОП`));
    col.appendChild(bar);

    const meta = el('div', 'pcard-meta');
    const ach = el('span', 'pm');
    ach.appendChild(VT.sprites.img('trophy', { scale: 2 }));
    ach.appendChild(el('span', '', `${p.achCount}/${VT.profile.ACH.length}`));
    const coin = el('span', 'pm');
    coin.appendChild(VT.sprites.img('coin', { scale: 2 }));
    coin.appendChild(el('span', '', String(p.coins)));
    const streak = el('span', 'pm');
    streak.appendChild(VT.sprites.img('heart', { scale: 2 }));
    streak.appendChild(el('span', '', `${p.stats.dayStreak || 0} ДН.`));
    meta.appendChild(ach); meta.appendChild(coin); meta.appendChild(streak);
    col.appendChild(meta);

    card.appendChild(col);
    return card;
  }

  /* ---------------- achievements tab ---------------- */

  function achTab() {
    const p = VT.profile;
    const wrap = el('div', '');
    wrap.appendChild(el('p', 'tab-cap', `ОТКРЫТО ${p.achCount} ИЗ ${VT.profile.ACH.length}`));
    const grid = el('div', 'ach-grid');

    for (const a of VT.profile.ACH) {
      const when = p.achUnlocked[a.id];
      const cardEl = el('div', 'ach-card ' + (when ? 'unlocked' : 'locked'));

      const ico = el('div', 'ico');
      if (when) ico.appendChild(VT.sprites.img(a.icon, { scale: 3 }));
      else if (a.secret) ico.appendChild(el('b', 'q', '?'));
      else ico.appendChild(VT.sprites.img(a.icon, { scale: 3 }));
      cardEl.appendChild(ico);

      const col = el('div', 'col');
      if (!when && a.secret) {
        col.appendChild(el('div', 't', '???'));
        col.appendChild(el('div', 'd', 'СЕКРЕТНОЕ ДОСТИЖЕНИЕ'));
      } else {
        col.appendChild(el('div', 't', a.name));
        col.appendChild(el('div', 'd', a.desc));
        if (!when && a.prog) {
          const [cur, max] = a.prog(p.stats, p);
          const pb = el('div', 'ach-prog');
          const f = el('i');
          f.style.width = Math.min(100, (cur / max) * 100).toFixed(0) + '%';
          pb.appendChild(f);
          col.appendChild(pb);
          col.appendChild(el('div', 'pnum', `${Math.min(cur, max)}/${max}`));
        }
        if (when) col.appendChild(el('div', 'when', fmtDate(when)));
      }
      const rw = el('div', 'rw');
      rw.appendChild(VT.sprites.img('coin', { scale: 1 }));
      rw.appendChild(el('span', '', '+' + a.reward));
      col.appendChild(rw);

      cardEl.appendChild(col);
      grid.appendChild(cardEl);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  /* ---------------- archive tab ---------------- */

  function emptyState(msg) {
    const e = el('div', 'meta-empty');
    e.appendChild(VT.sprites.img('mascot', { scale: 5 }));
    e.appendChild(el('p', '', msg));
    return e;
  }

  function archiveTab() {
    const arch = VT.profile.archive;
    const wrap = el('div', '');
    if (!arch.length) {
      wrap.appendChild(emptyState('АРХИВ ПУСТ.<br>СЫГРАЙ ПАРТИЮ — БУДЕТ ЧТО ВСПОМНИТЬ!'));
      return wrap;
    }
    wrap.appendChild(el('p', 'tab-cap', `СЫГРАНО ПАРТИЙ: ${VT.profile.stats.games}`));
    const list = el('div', 'arch-list');
    arch.forEach((g) => {
      const row = el('button', 'arch-row ' + (g.win ? 'w' : 'l'));
      const ico = el('span', 'ico');
      ico.appendChild(VT.sprites.img(g.win ? 'trophy' : 'heartDead', { scale: 2 }));
      row.appendChild(ico);
      const col = el('span', 'col');
      col.appendChild(el('b', '', `${g.title || g.id} — ${g.win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}`));
      col.appendChild(el('i', '', fmtDate(g.date)));
      row.appendChild(col);
      const st = el('span', 'st');
      st.appendChild(el('span', '', fmtTime(g.seconds)));
      st.appendChild(el('span', '', `ОШИБКИ: ${g.mistakes}`));
      row.appendChild(st);
      row.addEventListener('click', () => showArchived(g));
      row.addEventListener('mouseenter', () => VT.audio.play('hover'));
      list.appendChild(row);
    });
    wrap.appendChild(list);
    return wrap;
  }

  function showArchived(g) {
    VT.audio.play('click');
    const body = el('div', '');
    body.style.width = '100%';
    const stats = el('div', 'result-stats');
    stats.innerHTML = `
      <div class="rs"><b>${fmtTime(g.seconds)}</b><span>ВРЕМЯ</span></div>
      <div class="rs"><b>${g.mistakes}</b><span>ОШИБКИ</span></div>
      <div class="rs"><b>${g.solved ?? '?'}/4</b><span>ГРУППЫ</span></div>`;
    body.appendChild(stats);

    const puzzle = VT.data.puzzles.find((p) => p.id === g.id) || VT.daily.puzzleById(g.id);
    if (puzzle) {
      const list = el('div', 'reveal-list');
      list.style.marginTop = '14px';
      puzzle.groups.forEach((gr) => {
        const b = el('div', 'solved-banner');
        b.style.setProperty('--gc', VT.data.DIFF[gr.diff].color);
        b.style.animation = 'none';
        b.appendChild(el('div', 'sg-title', gr.title));
        b.appendChild(el('div', 'sg-words', gr.words.join(' • ')));
        list.appendChild(b);
      });
      body.appendChild(list);
    }

    VT.modal.open({
      title: g.title || g.id, icon: g.win ? 'trophy' : 'heartDead',
      sub: fmtDate(g.date),
      body,
      buttons: [{ label: 'ЗАКРЫТЬ', primary: true }],
    });
  }

  /* ---------------- stats tab ---------------- */

  function statsTab() {
    const s = VT.profile.stats;
    const wrap = el('div', '');
    const winRate = s.games ? Math.round((s.wins / s.games) * 100) + '%' : '—';
    const items = [
      ['ИГРЫ', s.games], ['ПОБЕДЫ', s.wins], ['ПРОЦЕНТ ПОБЕД', winRate],
      ['БЕЗ ОШИБОК', s.perfectWins],
      ['ЛУЧШЕЕ ВРЕМЯ', s.bestTime ? fmtTime(s.bestTime) : '—'],
      ['ЛУЧШАЯ СЕРИЯ', s.bestWinStreak],
      ['ДНЕЙ ПОДРЯД', s.dayStreak],
      ['МОНЕТ ЗАРАБОТАНО', s.coinsEarned],
      ['СЛОВ ОБЪЯСНЕНО', s.explains],
      ['ПЕРЕМЕШИВАНИЙ', s.shuffles],
    ];
    const grid = el('div', 'stat-grid');
    items.forEach(([cap, val]) => {
      const t = el('div', 'stat-tile');
      t.appendChild(el('b', '', String(val)));
      t.appendChild(el('span', '', cap));
      grid.appendChild(t);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  /* ---------------- assembly ---------------- */

  const TABS = [
    ['ach', 'ДОСТИЖЕНИЯ', achTab],
    ['arch', 'АРХИВ', archiveTab],
    ['stats', 'СТАТИСТИКА', statsTab],
  ];

  function render() {
    if (!bodyEl) return;
    bodyEl.innerHTML = '';
    bodyEl.appendChild(playerCard());

    const tabs = el('div', 'ptabs');
    TABS.forEach(([id, label]) => {
      const b = el('button', 'ptab' + (tab === id ? ' on' : ''), label);
      b.addEventListener('click', () => {
        if (tab === id) return;
        tab = id;
        VT.audio.play('click');
        render();
      });
      b.addEventListener('mouseenter', () => VT.audio.play('hover'));
      tabs.appendChild(b);
    });
    bodyEl.appendChild(tabs);

    const content = el('div', 'ptab-content');
    content.appendChild(TABS.find(([id]) => id === tab)[2]());
    bodyEl.appendChild(content);
  }

  VT.profileScreen = {
    init() {
      bodyEl = document.getElementById('profile-body');
      const back = document.getElementById('btn-profile-back');
      VT.sprites.mount(back.querySelector('[data-ico]'), 'back', { scale: 2, color: '#1b1914' });
      back.addEventListener('click', () => { VT.audio.play('click'); VT.screens.go('menu'); });
      back.addEventListener('mouseenter', () => VT.audio.play('hover'));

      VT.screens.register('profile', {
        el: document.getElementById('view-profile'),
        onEnter() {
          render();
          sub = VT.profile.onChange(() => render());
        },
        onExit() {
          if (sub) { VT.profile.offChange(sub); sub = null; }
        },
      });
    },
  };
})();
