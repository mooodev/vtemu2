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
- 4 mistakes = defeat. ВЫХОД in the menu actually powers the CRT down —
  tap the dead screen to turn it back on.

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
js/
  core/util.js       helpers: rand/easing/DOM, FLIP, fitText
  core/sprites.js    pixel-art factory — sprites are text grids → canvas
  core/audio.js      chiptune SFX from raw WebAudio oscillators
  core/particles.js  sparkles / hearts / confetti / steam + emitters
  core/screens.js    view manager + static transition, toasts, modals
  game/data.js       puzzle definitions
  game/wires.js      WireLayer — animated pixel connections canvas
  game/board.js      Board — selection chain, guesses, collapse/reveal
  ui/logo.js         live text logo: per-letter animation, text swaps
  ui/menu.js         menu props (random per visit), ambient FX, settings
  ui/game.js         HUD (hearts/timer), logo remarks, win-lose modals
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

Assets: `sprites/` (PNG pixel props for the menu — cup, lightbulb,
magnifying glass, books, speech bubble), `assets/fonts/` (Press Start 2P,
Cyrillic + Latin subsets, loaded locally). The title logo is generated
from font letters at runtime (`js/ui/logo.js`) — in-game it occasionally
swaps to congrats/snarky remarks. Reference art lives in the repo root.
Settings (sound / CRT / particles) persist in `localStorage`.
