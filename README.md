# В ТЕМУ! — пиксельная «Connections» на русском

A polished 90s-CRT prototype of a Russian *Connections*-style word game:
find 4 groups of 4 words linked by a hidden meaning. Selected words are
physically linked with animated pixel wires; link all 4 and the whole
chain heats up. Fully responsive — the CRT tube fills the viewport and
works on phones (portrait and landscape).

**Run it:** just open `index.html` in a browser (no build, no dependencies).

## Controls

- Click/tap tiles to link them into a chain (max 4). Click again to unlink.
- `ПРОВЕРИТЬ` / **Enter** — submit the chain.
- `МЕШАТЬ` / **S** — shuffle tiles. `СБРОС` / **Esc** — clear selection.
- `ОБЪЯСНИТЬ` (10 coins, price doubles with every hint bought in a round)
  — arm it, tap any word, get a mock-wiki humorous definition
  (`lore` in `js/game/data.js`).
- 4 mistakes = defeat. ВЫХОД in the menu actually powers the CRT down —
  tap the dead screen to turn it back on.
- Solving all 4 groups turns ПРОВЕРИТЬ into a bouncing gold **ПОБЕДА**
  button — review your groups, then press it to collect coins/XP.

## Official puzzles

ИГРАТЬ offers two live modes: **ПАЗЛ ДНЯ** — one official puzzle for
everyone, rolling over at midnight Moscow time (difficulty follows the
weekday: пн easy, вт mid, ср hard, чт mid, пт easy, сб mid, вс hard) —
and the **ПАЗЛ НЕДЕЛИ**, an "unsolvable" expert monster that changes
every Monday and pays ×3 when beaten. Words are fetched on boot from
the GitHub repo configured in `env.js` (`easypuzzles.json` etc. — edit
them online, no redeploy), consumed in file order from
`VT_ENV.START_DATE`; the last good copy is cached for offline play.
Every puzzle is one attempt; missed or lost days can be bought back in
the АРХИВ for coins. Finished puzzles get a ПОДЕЛИТЬСЯ button that
copies a spoiler-free colored-square grid (Wordle-style) to the
clipboard.

## Meta-game

Persistent profile (`localStorage`, `js/core/profile.js`): coins, XP +
levels, ~30 achievements (some secret, some with progress bars), archive
of finished rounds, day streaks. ПРОФИЛЬ view shows it all; МАГАЗИН sells
avatars CSS-cropped from `assets/img/avatars.png` (5×4 sheet — to add
more, extend `META` + bump `ROWS` in `js/core/avatars.js`). Status bars
and coin chips are live (`js/ui/hud.js`), earnings/purchases fly PNG
coins (`assets/sprites/coin1.png`, `coin2.png`) to and from the counter.

## Dev routes (URL hash)

| hash | boots into |
|---|---|
| `#game` | game screen directly |
| `#demo` | game + 3 tiles pre-linked (screenshot helper) |
| `#solve` / `#fail` | one correct / wrong submit |
| `#win` / `#lose` | full playthrough to either ending |

## Architecture

Plain ES5-friendly scripts (work over `file://`), one global namespace `VT`,
loaded in dependency order from `index.html`:

```
css/
  base.css        tokens, font-face, fullscreen tube, overlays, power fx
  ui.css          buttons, chips, status bar, toasts, modals, toggles
  screens.css     text logo, menu + game layouts, tiles, banners, badges
  meta.css        profile & shop views, achievements, XP bar, coin FX
js/
  core/util.js       helpers: rand/easing/DOM, FLIP, fitText
  core/sprites.js    pixel-art factory — sprites are text grids → canvas
  core/audio.js      chiptune SFX from raw WebAudio oscillators
  core/particles.js  sparkles / hearts / confetti / steam / coin flights
  core/screens.js    view manager + static transition, toasts, modals
  core/avatars.js    avatar sheet CSS-cropper + names/prices
  core/profile.js    persistent player: coins, XP, achievements, archive
  ui/hud.js          live status bars, coin chips, celebration queue
  game/data.js       puzzle definitions + humorous word lore
  game/wires.js      WireLayer — animated pixel connections canvas
  game/board.js      Board — selection chain, guesses, collapse/reveal
  ui/logo.js         live text logo: per-letter animation, text swaps
  ui/menu.js         menu props (random per visit), ambient FX, settings
  ui/game.js         HUD, ПОБЕДА flow, ОБЪЯСНИТЬ mode, win-lose modals
  ui/shop.js         МАГАЗИН — buy & equip avatars
  ui/profileView.js  ПРОФИЛЬ — achievements / archive / stats tabs
  main.js            boot, cursors, settings persistence
```

### Extending it

- **New puzzle** — push an object into `VT.data.puzzles` (`js/game/data.js`);
  4 groups × 4 words, `diff` picks the banner color.
- **New sprite** — add a string grid to `DEFS` in `js/core/sprites.js`
  (`.` transparent, `x` recolorable wildcard, palette chars in `PAL`),
  then `VT.sprites.img('name', {scale})` anywhere.
- **New sound** — one line in `SFX` (`js/core/audio.js`): a frequency sweep
  recipe, e.g. `tone({f0: 400, f1: 800, dur: .1})`.
- **New screen** — add a `<section class="view">`, register it via
  `VT.screens.register(name, {el, onEnter, onExit})`, go with
  `VT.screens.go(name)`.

Assets live under `assets/` only: `assets/sprites/` (PNG pixel props for
the menu + the two flying coins), `assets/img/` (avatar sheet, logo),
`assets/fonts/` (Press Start 2P, Cyrillic + Latin subsets, loaded
locally). The title logo is generated from font letters at runtime
(`js/ui/logo.js`) — in-game it occasionally swaps to congrats/snarky
remarks. Settings (sound / CRT / particles) persist in `localStorage`.

**For AI agents / contributors:** `CLAUDE.md` has the edit-here-for-X
file map, the `VT.*` API cheat sheet, dev routes and gotchas — start
there instead of reading the sources.
