/* ============================================================
   В ТЕМУ! — core/profile.js
   Persistent player: coins, XP/levels, owned avatars,
   achievements, game archive, day streaks. localStorage-backed.

   All celebration visuals are delegated to VT.hud (queued
   toasts + flying coins); this module only mutates state and
   announces changes via onChange subscribers.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;

  const KEY = 'vtemu-profile';
  const MAX_ARCHIVE = 60;

  /* ---------------- achievements ----------------
     cond(s, p) → bool; s = stats, p = full state.
     prog(s, p) → [current, goal] for the progress bar.
     secret achievements hide name/desc until unlocked. */
  const ACH = [
    { id: 'first-win',  icon: 'trophy',    name: 'С ПОЧИНОМ!',      desc: 'Выиграй первую игру', reward: 50,  cond: (s) => s.wins >= 1 },
    { id: 'perfect',    icon: 'sparkle4',  name: 'ЧИСТАЯ РАБОТА',   desc: 'Победа без единой ошибки', reward: 100, cond: (s) => s.perfectWins >= 1 },
    { id: 'edge',       icon: 'heart',     name: 'НА ВОЛОСКЕ',      desc: 'Победа с последним сердцем', reward: 75, cond: (s) => s.edgeWins >= 1 },
    { id: 'fast60',     icon: 'clock',     name: 'СПИДРАН',         desc: 'Победа быстрее минуты', reward: 80, cond: (s) => s.fastWin60 >= 1 },
    { id: 'fast30',     icon: 'clock',     name: 'МОЛНИЯ',          desc: 'Победа быстрее 30 секунд', reward: 150, cond: (s) => s.fastWin30 >= 1 },
    { id: 'zen',        icon: 'mug',       name: 'ДЗЕН',            desc: 'Победа после 10+ минут раздумий', reward: 40, cond: (s) => s.slowWin >= 1 },
    { id: 'streak3',    icon: 'star',      name: 'ХЕТ-ТРИК',        desc: '3 победы подряд', reward: 70, cond: (s) => s.bestWinStreak >= 3, prog: (s) => [s.bestWinStreak, 3] },
    { id: 'streak10',   icon: 'star',      name: 'НЕУДЕРЖИМЫЙ',     desc: '10 побед подряд', reward: 250, cond: (s) => s.bestWinStreak >= 10, prog: (s) => [s.bestWinStreak, 10] },
    { id: 'revenge',    icon: 'check',     name: 'РЕВАНШ',          desc: 'Победа сразу после поражения', reward: 50, cond: (s) => s.revengeWins >= 1 },
    { id: 'firstloss',  icon: 'heartDead', name: 'ПЕРВЫЙ БЛИН',     desc: 'Проиграть — это тоже опыт', reward: 20, cond: (s) => s.losses >= 1 },
    { id: 'games10',    icon: 'grid',      name: 'РАЗЫГРАЛСЯ',      desc: 'Сыграй 10 партий', reward: 50, cond: (s) => s.games >= 10, prog: (s) => [s.games, 10] },
    { id: 'games50',    icon: 'grid',      name: 'ВЕТЕРАН',         desc: 'Сыграй 50 партий', reward: 150, cond: (s) => s.games >= 50, prog: (s) => [s.games, 50] },
    { id: 'games100',   icon: 'trophy',    name: 'ЛЕГЕНДА 128',     desc: 'Сыграй 100 партий', reward: 300, cond: (s) => s.games >= 100, prog: (s) => [s.games, 100] },
    { id: 'rich',       icon: 'coin',      name: 'СКРУДЖ',          desc: 'Накопи 1000 монет', reward: 100, cond: (s) => s.maxCoins >= 1000, prog: (s) => [s.maxCoins, 1000] },
    { id: 'spender',    icon: 'coin',      name: 'ТРАНЖИРА',        desc: 'Потрать 500 монет', reward: 60, cond: (s) => s.spentTotal >= 500, prog: (s) => [s.spentTotal, 500] },
    { id: 'firstbuy',   icon: 'cart',      name: 'ОБНОВКА',         desc: 'Купи первый аватар', reward: 30, cond: (s) => s.avatarsBought >= 1 },
    { id: 'collector',  icon: 'cart',      name: 'КОЛЛЕКЦИОНЕР',    desc: 'Купи 5 аватаров', reward: 100, cond: (s) => s.avatarsBought >= 5, prog: (s) => [s.avatarsBought, 5] },
    { id: 'fashion',    icon: 'person',    name: 'МОДНИК',          desc: 'Смени аватар 10 раз', reward: 40, cond: (s) => s.avatarSwaps >= 10, prog: (s) => [s.avatarSwaps, 10] },
    { id: 'curious',    icon: 'bulb',      name: 'ПОЧЕМУЧКА',       desc: 'Купи объяснение слова', reward: 10, cond: (s) => s.explains >= 1 },
    { id: 'bookworm',   icon: 'books',     name: 'КНИЖНЫЙ ЧЕРВЬ',   desc: 'Узнай объяснение 10 слов', reward: 60, cond: (s) => s.explains >= 10, prog: (s) => [s.explains, 10] },
    { id: 'shuffler',   icon: 'shuffle',   name: 'ТАСУЙ-ТАСУЙ',     desc: 'Перемешай доску 50 раз', reward: 40, cond: (s) => s.shuffles >= 50, prog: (s) => [s.shuffles, 50] },
    { id: 'dejavu',     icon: 'cross',     name: 'ДЕЖАВЮ',          desc: 'Проверь одну и ту же комбинацию дважды', reward: 15, secret: true, cond: (s) => s.dejavu >= 1 },
    { id: 'expert1',    icon: 'magnifier', name: 'С КОЗЫРЕЙ',       desc: 'Реши самую сложную группу первой', reward: 60, cond: (s) => s.expertFirst >= 1 },
    { id: 'reverse',    icon: 'chevron',   name: 'ПРОТИВ ШЕРСТИ',   desc: 'Реши все группы от сложной к простой', reward: 120, secret: true, cond: (s) => s.reverseOrder >= 1 },
    { id: 'textbook',   icon: 'chevron',   name: 'ПО УЧЕБНИКУ',     desc: 'Реши все группы от простой к сложной', reward: 60, cond: (s) => s.straightOrder >= 1 },
    { id: 'night',      icon: 'star',      name: 'НОЧНАЯ СМЕНА',    desc: 'Победа глубокой ночью (00–04)', reward: 40, secret: true, cond: (s) => s.nightWin >= 1 },
    { id: 'early',      icon: 'mug',       name: 'РАННЯЯ ПТАШКА',   desc: 'Победа ранним утром (05–07)', reward: 40, secret: true, cond: (s) => s.earlyWin >= 1 },
    { id: 'week',       icon: 'heart',     name: 'СЕМЬ ДНЕЙ',       desc: 'Играй 7 дней подряд', reward: 150, cond: (s) => s.bestDayStreak >= 7, prog: (s) => [s.bestDayStreak, 7] },
    { id: 'logofan',    icon: 'heart',     name: 'ТИСКАТЕЛЬ',       desc: 'Потискай логотип 20 раз', reward: 25, secret: true, cond: (s) => s.logoClicks >= 20 },
    { id: 'tvoff',      icon: 'exit',      name: 'ВЫКЛ/ВКЛ',        desc: 'Выключи телевизор... и включи обратно', reward: 15, secret: true, cond: (s) => s.powerCycles >= 1 },
    { id: 'lvl5',       icon: 'star',      name: 'ПЯТЁРКА',         desc: 'Достигни 5 уровня', reward: 100, cond: (s, p) => p.level >= 5 },
    { id: 'lvl10',      icon: 'trophy',    name: 'ДЕСЯТКА',         desc: 'Достигни 10 уровня', reward: 250, cond: (s, p) => p.level >= 10 },
    { id: 'daily1',     icon: 'clock',     name: 'В ЭФИРЕ',         desc: 'Реши официальный пазл дня', reward: 40, cond: (s) => s.dailyWins >= 1 },
    { id: 'daily10',    icon: 'clock',     name: 'ПОСТОЯННЫЙ ЗРИТЕЛЬ', desc: 'Реши 10 пазлов дня', reward: 150, cond: (s) => s.dailyWins >= 10, prog: (s) => [s.dailyWins, 10] },
    { id: 'weekly1',    icon: 'trophy',    name: 'УКРОТИТЕЛЬ',      desc: 'Реши «нерешаемый» пазл недели', reward: 300, cond: (s) => s.weeklyWins >= 1 },
    { id: 'share1',     icon: 'star',      name: 'ГЛАШАТАЙ',        desc: 'Поделись результатом с друзьями', reward: 25, cond: (s) => s.shares >= 1 },
    { id: 'digger',     icon: 'lock',      name: 'АРХИВАРИУС',      desc: 'Выкупи пазл из архива', reward: 30, cond: (s) => s.archiveBuys >= 1 },
  ];

  const ZERO_STATS = () => ({
    games: 0, wins: 0, losses: 0,
    perfectWins: 0, edgeWins: 0, fastWin60: 0, fastWin30: 0, slowWin: 0,
    winStreak: 0, bestWinStreak: 0, revengeWins: 0,
    bestTime: 0, totalTime: 0,
    dejavu: 0, shuffles: 0, explains: 0,
    logoClicks: 0, powerCycles: 0,
    avatarsBought: 0, avatarSwaps: 0, spentTotal: 0, maxCoins: 0,
    coinsEarned: 0,
    nightWin: 0, earlyWin: 0, expertFirst: 0, reverseOrder: 0, straightOrder: 0,
    dayStreak: 0, bestDayStreak: 0, lastDay: '',
    dailyWins: 0, weeklyWins: 0, shares: 0, archiveBuys: 0,
  });

  let state = null;
  const subs = [];

  function fresh() {
    return {
      coins: 120, xp: 0, level: 1,
      avatar: 0, owned: [0],
      ach: {},                // id → unlock timestamp
      archive: [],            // most recent first
      daily: {},              // official puzzles: key → result (win, rows, ...)
      stats: ZERO_STATS(),
      lastResult: '',
    };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }

  function emit(type) {
    subs.forEach((fn) => { try { fn(type); } catch (e) { /* subscriber bug */ } });
  }

  /* XP needed to go from `level` to the next one */
  function xpNeed(level) { return 100 + (level - 1) * 60; }

  /** Coins added without triggering achievement re-eval (rewards). */
  function grant(n) {
    state.coins += n;
    state.stats.coinsEarned += n;
    state.stats.maxCoins = Math.max(state.stats.maxCoins, state.coins);
  }

  /** Unlock pass; loops so an unlock's coin reward can chain-unlock. */
  function evalAch() {
    const all = [];
    let found = true;
    let guard = 4;
    while (found && guard-- > 0) {
      found = false;
      for (const a of ACH) {
        if (state.ach[a.id]) continue;
        if (!a.cond(state.stats, state)) continue;
        state.ach[a.id] = Date.now();
        grant(a.reward);
        all.push(a);
        found = true;
        VT.hud && VT.hud.achUnlocked(a);
      }
    }
    if (all.length) { save(); emit('ach'); }
    return all;
  }

  function touchDayStreak() {
    const s = state.stats;
    const today = new Date().toDateString();
    if (s.lastDay === today) return;
    const yest = new Date(Date.now() - 864e5).toDateString();
    s.dayStreak = s.lastDay === yest ? s.dayStreak + 1 : 1;
    s.bestDayStreak = Math.max(s.bestDayStreak, s.dayStreak);
    s.lastDay = today;
  }

  VT.profile = {
    ACH,

    load() {
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
        state = raw ? Object.assign(fresh(), raw) : fresh();
        state.stats = Object.assign(ZERO_STATS(), state.stats || {});
        state.daily = state.daily || {};
      } catch (e) {
        state = fresh();
      }
      save();
    },

    /* guards consumers that might poke the profile before boot() */
    get ready() { return !!state; },

    onChange(fn) { subs.push(fn); return fn; },
    offChange(fn) { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); },

    get coins() { return state.coins; },
    get level() { return state.level; },
    get xp() { return state.xp; },
    get xpNeed() { return xpNeed(state.level); },
    get avatar() { return state.avatar; },
    get owned() { return state.owned.slice(); },
    get stats() { return state.stats; },
    get archive() { return state.archive; },
    get achUnlocked() { return state.ach; },

    /* official daily/weekly puzzle results */
    dailyResult(key) { return state.daily[key] || null; },
    setDailyResult(key, res) {
      const prev = state.daily[key];
      if (prev && prev.win && !res.win) return; // a win is never downgraded
      state.daily[key] = res;
      save();
      emit('daily');
    },
    get achCount() { return Object.keys(state.ach).length; },

    addCoins(n) {
      if (n <= 0) return;
      grant(n);
      evalAch();
      save();
      emit('coins');
    },

    spendCoins(n) {
      if (state.coins < n) return false;
      state.coins -= n;
      state.stats.spentTotal += n;
      evalAch();
      save();
      emit('coins');
      return true;
    },

    /** Add XP; every crossed threshold levels up and pays level*25 coins.
        Returns the list of freshly reached levels. */
    addXP(n) {
      state.xp += n;
      const ups = [];
      while (state.xp >= xpNeed(state.level)) {
        state.xp -= xpNeed(state.level);
        state.level++;
        grant(state.level * 25);
        ups.push(state.level);
        VT.hud && VT.hud.levelUp(state.level);
      }
      if (ups.length) evalAch();
      save();
      emit('xp');
      return ups;
    },

    /** Generic counters (shuffles, explains, logo petting...). */
    track(name, inc = 1) {
      if (!(name in state.stats)) return;
      state.stats[name] += inc;
      evalAch();
      save();
      emit('stats');
    },

    /** Full end-of-round accounting. Returns the reward summary.
        mode: 'free' | 'daily' | 'weekly' — the weekly monster pays ×3. */
    recordGame({ win, seconds, mistakes, order = [], puzzle, solvedCount, mode = 'free' }) {
      const s = state.stats;
      const prev = state.lastResult;
      s.games++;
      s.totalTime += seconds;
      touchDayStreak();

      const hour = new Date().getHours();
      if (win) {
        s.wins++;
        s.winStreak++;
        s.bestWinStreak = Math.max(s.bestWinStreak, s.winStreak);
        if (mistakes === 0) s.perfectWins++;
        if (mistakes === VT.MAX_MISTAKES - 1) s.edgeWins++;
        if (seconds < 60) s.fastWin60++;
        if (seconds < 30) s.fastWin30++;
        if (seconds >= 600) s.slowWin++;
        if (prev === 'lose') s.revengeWins++;
        if (hour < 4) s.nightWin++;
        if (hour >= 5 && hour < 7) s.earlyWin++;
        if (!s.bestTime || seconds < s.bestTime) s.bestTime = seconds;
        if (order[0] === 'expert') s.expertFirst++;
        const key = order.join('>');
        if (key === 'expert>hard>medium>easy') s.reverseOrder++;
        if (key === 'easy>medium>hard>expert') s.straightOrder++;
        if (mode === 'daily') s.dailyWins++;
        if (mode === 'weekly') s.weeklyWins++;
      } else {
        s.losses++;
        s.winStreak = 0;
      }
      state.lastResult = win ? 'win' : 'lose';

      state.archive.unshift({
        id: puzzle.id, title: puzzle.title,
        date: Date.now(), win, seconds, mistakes,
        solved: solvedCount,
      });
      if (state.archive.length > MAX_ARCHIVE) state.archive.length = MAX_ARCHIVE;

      /* rewards; the "impossible" weekly pays triple when beaten */
      const hearts = VT.MAX_MISTAKES - mistakes;
      const timeBonus = seconds < 60 ? 30 : seconds < 120 ? 20 : seconds < 300 ? 10 : 0;
      const mult = win && mode === 'weekly' ? 3 : 1;
      const coins = win ? (50 + hearts * 15 + timeBonus) * mult : 5;
      const xp = win ? (80 + hearts * 12 + (mistakes === 0 ? 40 : 0)) * mult : 15;

      grant(coins);
      const newLevels = this.addXP(xp); // addXP saves + emits
      const unlocked = evalAch();
      save();
      emit('game');
      return { coins, xp, newLevels, unlocked };
    },

    /* ---------------- avatars ---------------- */

    ownsAvatar(i) { return state.owned.includes(i); },

    buyAvatar(i) {
      const meta = VT.avatars.META[i];
      if (!meta || state.owned.includes(i)) return false;
      if (!this.spendCoins(meta.price)) return false;
      state.owned.push(i);
      state.stats.avatarsBought++;
      save();
      this.equipAvatar(i);
      evalAch();
      emit('avatar');
      return true;
    },

    equipAvatar(i) {
      if (!state.owned.includes(i) || state.avatar === i) return false;
      state.avatar = i;
      state.stats.avatarSwaps++;
      evalAch();
      save();
      emit('avatar');
      return true;
    },
  };
})();
