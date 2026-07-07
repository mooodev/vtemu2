/* ============================================================
   В ТЕМУ! — game/daily.js
   The "official puzzle" scheduler. One daily puzzle for everyone,
   rolling over at midnight MOSCOW time; one weekly monster puzzle
   rolling over every Monday. Pools are fetched from GitHub on
   boot (see VT_ENV.PUZZLES_BASE) so words can be edited online
   without touching the game; the last good copy is cached in
   localStorage, with the bundled JSONs as a final fallback.

   Weekday difficulty: ПН easy, ВТ medium, СР hard, ЧТ medium,
   ПТ easy, СБ medium, ВС hard. The weekly is always expert.
   Each difficulty file is consumed in order from START_DATE and
   wraps around when it runs out.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const ENV = window.VT_ENV || {};

  const MSK = 3 * 3600e3; // Moscow is UTC+3, no DST
  const DAY = 864e5;
  const WEEK = 7 * DAY;

  /* getUTCDay(): 0=ВС 1=ПН 2=ВТ 3=СР 4=ЧТ 5=ПТ 6=СБ */
  const WEEKDAY_DIFF = ['hard', 'easy', 'medium', 'hard', 'medium', 'easy', 'medium'];
  const FILES = {
    easy: 'easypuzzles.json',
    medium: 'mediumpuzzles.json',
    hard: 'hardpuzzles.json',
    expert: 'weeklypuzzles.json',
  };
  /* banner colors inside one puzzle, top to bottom */
  const GROUP_ORDER = ['easy', 'medium', 'hard', 'expert'];

  /* ---------------- Moscow calendar ---------------- */

  const pad = (n) => String(n).padStart(2, '0');

  /** "virtual" start-of-day timestamp of the Moscow day containing ts */
  function mskDayStart(ts = Date.now()) {
    return Math.floor((ts + MSK) / DAY) * DAY;
  }

  function startDayStart() {
    const [y, m, d] = (ENV.START_DATE || '2026-07-07').split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }

  /** 0-based day counter since START_DATE (never negative) */
  function dayIndex(ts = Date.now()) {
    return Math.max(0, Math.round((mskDayStart(ts) - startDayStart()) / DAY));
  }

  function mondayOf(dayStart) {
    const wd = new Date(dayStart).getUTCDay();
    return dayStart - ((wd + 6) % 7) * DAY;
  }

  /** 0-based week counter since START_DATE's week (never negative) */
  function weekIndex(ts = Date.now()) {
    return Math.max(0, Math.round((mondayOf(mskDayStart(ts)) - mondayOf(startDayStart())) / WEEK));
  }

  function diffForDay(idx) {
    return WEEKDAY_DIFF[new Date(startDayStart() + idx * DAY).getUTCDay()];
  }

  /** how many earlier days shared this day's difficulty → file position */
  function seqInFile(idx) {
    const diff = diffForDay(idx);
    let n = 0;
    for (let i = 0; i < idx; i++) if (diffForDay(i) === diff) n++;
    return n;
  }

  function dayLabel(idx) {
    const d = new Date(startDayStart() + idx * DAY);
    return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}`;
  }

  function weekLabel(w) {
    const mon = mondayOf(startDayStart()) + w * WEEK;
    const a = new Date(mon), b = new Date(mon + 6 * DAY);
    return `${pad(a.getUTCDate())}.${pad(a.getUTCMonth() + 1)}–${pad(b.getUTCDate())}.${pad(b.getUTCMonth() + 1)}`;
  }

  /** real ms until the next Moscow midnight */
  function msToMidnight(now = Date.now()) {
    return mskDayStart(now) + DAY - MSK - now;
  }

  /** real ms until the next Moscow Monday 00:00 */
  function msToNextMonday(now = Date.now()) {
    return mondayOf(mskDayStart(now)) + WEEK - MSK - now;
  }

  /* ---------------- puzzle pools ---------------- */

  let pools = null;   // diff → array of {difficulty, categories}
  let loading = null;

  function validRaw(raw) {
    return raw && Array.isArray(raw.categories) && raw.categories.length === 4 &&
      raw.categories.every((c) => c && c.theme && Array.isArray(c.words) && c.words.length === 4);
  }

  async function fetchPool(diff) {
    const name = FILES[diff];
    try {
      /* cache-bust once per Moscow day so GitHub edits land by midnight */
      const res = await fetch((ENV.PUZZLES_BASE || '') + name + '?v' + mskDayStart(), { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      try { localStorage.setItem('vtemu-puzzles-' + diff, JSON.stringify(data)); } catch (e) { /* quota */ }
      return data;
    } catch (e) {
      /* offline / GitHub down → last good copy, then the bundled file */
      try {
        const cached = JSON.parse(localStorage.getItem('vtemu-puzzles-' + diff) || 'null');
        if (cached) return cached;
      } catch (e2) { /* corrupt cache */ }
      const res = await fetch(name);
      return res.json();
    }
  }

  function toPuzzle(raw, id, title) {
    return {
      id, title,
      groups: raw.categories.map((c, i) => ({
        title: String(c.theme).toUpperCase(),
        diff: GROUP_ORDER[i],
        words: c.words.map((w) => String(w).toUpperCase()),
      })),
    };
  }

  function daily(idx) {
    if (!pools) return null;
    const diff = diffForDay(idx);
    const pool = pools[diff];
    if (!pool || !pool.length) return null;
    return {
      kind: 'daily', key: 'daily-' + idx, num: idx + 1, diff,
      date: dayLabel(idx),
      puzzle: toPuzzle(pool[seqInFile(idx) % pool.length], 'daily-' + idx, `ПАЗЛ ДНЯ №${idx + 1}`),
    };
  }

  function weekly(w) {
    if (!pools) return null;
    const pool = pools.expert;
    if (!pool || !pool.length) return null;
    return {
      kind: 'weekly', key: 'weekly-' + w, num: w + 1, diff: 'expert',
      date: weekLabel(w),
      puzzle: toPuzzle(pool[w % pool.length], 'weekly-' + w, `ПАЗЛ НЕДЕЛИ №${w + 1}`),
    };
  }

  /* ---------------- public API ---------------- */

  VT.daily = {
    get ready() { return !!pools; },

    load() {
      if (!loading) {
        loading = Promise.all(GROUP_ORDER.map(fetchPool)).then((lists) => {
          pools = {};
          GROUP_ORDER.forEach((diff, i) => { pools[diff] = lists[i].filter(validRaw); });
          return pools;
        }).catch((e) => { loading = null; throw e; }); // a failed load may be retried
      }
      return loading;
    },

    dayIndex, weekIndex, diffForDay,
    msToMidnight, msToNextMonday,

    today: () => daily(dayIndex()),
    thisWeek: () => weekly(weekIndex()),
    byDay: daily,
    byWeek: weekly,

    /** rebuild a puzzle from an archive id ('daily-N' / 'weekly-N') */
    puzzleById(id) {
      const m = /^(daily|weekly)-(\d+)$/.exec(id || '');
      if (!m) return null;
      const meta = m[1] === 'daily' ? daily(+m[2]) : weekly(+m[2]);
      return meta && meta.puzzle;
    },

    /** past puzzles, newest first (today / this week excluded) */
    archiveEntries() {
      const days = [], weeks = [];
      for (let i = dayIndex() - 1; i >= 0 && days.length < 60; i--) {
        const m = daily(i);
        if (m) days.push(m);
      }
      for (let w = weekIndex() - 1; w >= 0 && weeks.length < 26; w--) {
        const m = weekly(w);
        if (m) weeks.push(m);
      }
      return { days, weeks };
    },
  };
})();
