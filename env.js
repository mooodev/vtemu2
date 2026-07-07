/* ============================================================
   В ТЕМУ! — env.js
   Deployment knobs. Loaded before every other script; nothing
   here may depend on the VT namespace.
   ============================================================ */
window.VT_ENV = {
  /* day 1 of the official rotation — Moscow calendar, YYYY-MM-DD.
     Daily puzzle N and weekly puzzle N are counted from here. */
  START_DATE: '2026-07-07',

  /* where the puzzle JSONs live; edited on GitHub — the game
     re-fetches them on boot, no redeploy needed */
  PUZZLES_BASE: 'https://raw.githubusercontent.com/mrmoogler/VTEMU/main/',

  /* coins to unlock a missed archive puzzle (weekly costs ×2) */
  ARCHIVE_COST: 25,

  /* ОБЪЯСНИТЬ: price of the first hint; doubles with each use
     inside one round (10 → 20 → 40 → ...) */
  EXPLAIN_BASE_COST: 10,
};
