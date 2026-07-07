# В ТЕМУ! — agent guide

Russian *Connections*-style word game with a 90s-CRT look. **No build, no
dependencies, no framework** — plain scripts, one global namespace `VT`,
loaded in dependency order from `index.html`. Works from `file://` and any
static server. All UI text is UPPERCASE Russian; all sizing uses `clamp()`
(must look right on phones and desktop); every feature ships with sound +
animation — this is a polished game, not a prototype.

## Run & verify

- Serve: `python3 -m http.server <port> --directory .` (port 8123 is often
  taken on this machine by another app; pick e.g. 8917). Or just open
  `index.html`.
- Headless check (macOS, no `timeout` cmd): install `playwright-core` in the
  scratchpad, `chromium.launch({ channel: 'chrome', headless: true })`,
  screenshot + collect `pageerror`. Boot takes ~2.5s (font wait + CRT
  power-on) before the menu is clickable.
- Dev routes via URL hash: `#game` (straight to board), `#demo` (3 tiles
  pre-linked), `#solve` / `#fail` (one submit), `#win` / `#lose` (full
  auto-playthrough; `#win` ends at the bouncing ПОБЕДА button).
- Reset player state in console: `localStorage.clear()` (keys:
  `vtemu-profile`, `vtemu-settings`, `vtemu-puzzles-*` — the last are
  offline caches of the GitHub puzzle pools).

## File map — edit here for X

| Task | File |
|---|---|
| Official daily/weekly puzzle words | edit `*puzzles.json` on GitHub (`VT_ENV.PUZZLES_BASE`) — fetched on boot, cache-busted once per Moscow day; local `easypuzzles.json` etc. are the bundled fallbacks |
| Rotation start date, puzzles repo URL, archive price, ОБЪЯСНИТЬ base price | `env.js` (`window.VT_ENV`, loaded before everything) |
| Daily/weekly schedule math (Moscow midnight, weekday→difficulty, file order) | `js/game/daily.js` (`VT.daily`) |
| ИГРАТЬ mode modal, АРХИВ screen, result modal, ПОДЕЛИТЬСЯ share grid | `js/ui/daily.js` (`VT.dailyUI`) |
| Demo puzzle for dev routes (4 groups × 4 words) | `js/game/data.js` → `VT.data.puzzles` |
| Humorous word definition (ОБЪЯСНИТЬ) | `js/game/data.js` → `LORE` map (word → text, no group spoilers) |
| New achievement | `js/core/profile.js` → `ACH` array (`cond(stats, state)`, optional `prog`, `secret`, `reward`); add a counter to `ZERO_STATS` and call `VT.profile.track('name')` from where it happens |
| Coin/XP economy numbers | `js/core/profile.js` → `recordGame` (win rewards, weekly ×3), `xpNeed`, level-up bonus in `addXP`; ОБЪЯСНИТЬ starts at `VT_ENV.EXPLAIN_BASE_COST` and doubles per use in a round (`js/ui/game.js`) |
| More avatars | extend sheet `assets/img/avatars.png`, bump `ROWS`/`COLS` + append `META` in `js/core/avatars.js` — everything else adapts. Index 0 = built-in computer mascot (free default), sheet cell = index − 1 |
| New pixel-art icon | `js/core/sprites.js` → string grid in `DEFS` (`.` transparent, `x` = recolorable, palette chars in `PAL`); use `VT.sprites.img('name', {scale, color})` |
| New sound | `js/core/audio.js` → one line in `SFX` (freq-sweep recipes); play with `VT.audio.play('name')` |
| New full-screen view | `<section class="view">` in `index.html` + `VT.screens.register(name, {el, onEnter, onExit})` + `VT.screens.go(name)` (pattern: `js/ui/shop.js`) |
| Board rules / guess resolution | `js/game/board.js` (emits events up: `select/mistake/solved/win/lose/dejavu`) |
| Game screen flow (timer, hearts, ПОБЕДА button, ОБЪЯСНИТЬ mode, win/lose modals) | `js/ui/game.js` |
| Profile UI (tabs: achievements/archive/stats) | `js/ui/profileView.js` |
| Shop UI | `js/ui/shop.js` |
| Status bar / coin counters / celebration toasts | `js/ui/hud.js` |
| Menu buttons & floating props | `js/ui/menu.js` |
| Wire (chain) rendering | `js/game/wires.js` |
| Particles incl. flying PNG coins | `js/core/particles.js` |
| CRT overlays, boot/power fx, design tokens | `css/base.css` |
| Profile/shop/achievement/coin styles | `css/meta.css` |

## API cheat sheet (the 90% you need)

```js
VT.screens.go('menu'|'game'|'profile'|'shop'|'archive')   // CRT-static transition
VT.gameScreen.play(meta)       // launch an official puzzle (meta from VT.daily.today()/thisWeek()/byDay(i))
VT.daily.today() / .thisWeek() // {kind, key, num, diff, date, puzzle} or null until .load() resolves
VT.profile.dailyResult(key) / .setDailyResult(key, res)   // official results (win, rows for share, ...)
VT.dailyUI.openPlayModal() / .share(key)
VT.toast('ТЕКСТ', 'good'|'err'|'ach'|'', ms)
VT.modal.open({ title, icon, sub, body, buttons:[{label, icon, primary, onClick}], veilClose })
VT.audio.play('click'|'coin'|'buy'|'denied'|'ach'|'level'|'win'|'lose'|...)
VT.fx.burst(x,y,{count,speed}); VT.fx.sparkle(x,y); VT.fx.confettiRain(sec)
VT.fx.coinFly({from:{x,y}, to:{x,y}, count, onArrive})
VT.util.screenPos(el)          // element center in #screen coords (for fx)
VT.profile.coins / .level / .stats / .addCoins(n) / .spendCoins(n)→bool
VT.profile.track('shuffles'|'explains'|...)     // counters + auto-achievements
VT.profile.recordGame({win, seconds, mistakes, order, puzzle, solvedCount})
VT.hud.earnCoins(amount, fromPos) / .spendCoins(amount, toPos)  // coin flight
VT.avatars.img(i)              // fill-parent CSS-cropped portrait
```

Everything persistent lives in `VT.profile` (localStorage `vtemu-profile`);
achievement unlocks and level-ups announce themselves automatically through
`VT.hud`'s queued toasts — callers never toast manually.

## Gotchas

- Script order in `index.html` **is** the dependency graph — new core files
  go before their consumers.
- `<body class="tv-dead boot">` in HTML hides everything until the power-on
  effect; don't remove, it fixes the menu-flash-before-boot bug.
- z-ladder inside `#screen`: views 2 < fx-canvas/toasts 39 > modals 38 >
  scanlines 40 — coins/confetti must fly OVER modal veils.
- CRT scanlines are intentionally faint and get fainter on
  `(pointer: coarse)` — don't strengthen them; tile readability wins.
- `.cbtn.primary:not(:disabled)` has higher specificity than 2-class
  overrides — style button states with 3 classes (see `.cbtn.primary.victory`).
- Board emits `win` ~0.5s after the 4th solve; `ui/game.js` turns ПРОВЕРИТЬ
  into ПОБЕДА and only opens the win modal on click — keep that order
  (rewards are granted in `showWin`, not on solve).
- `env.js` must stay the first script tag — it defines `window.VT_ENV`
  without touching `VT`; everything else reads it at call time.
- Official puzzles are one-shot: win OR lose marks the day done
  (`profile.daily[key]`); replays of lost days are sold via the archive
  price. Result keys are index-based (`daily-N`/`weekly-N`), so changing
  `VT_ENV.START_DATE` after launch remaps players' saved results.
- Fetched puzzles get group diffs by position (cat 1→easy … cat 4→expert)
  — order the categories in the JSON from freebie to mind-bender.
- The share grid is built from `board.guesses` (diff rows per submit);
  dejavu submits are not counted.
