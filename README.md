# В ТЕМУ! — пиксельная «Connections» на русском

A polished 90s-CRT prototype of a Russian *Connections*-style word game:
find 4 groups of 4 words linked by a hidden meaning. Selected words are
physically linked with animated pixel wires; close the chain of 4 and the
circuit lights up.

**Run it:** just open `index.html` in a browser (no build, no dependencies).

## Controls

- Click tiles to link them into a chain (max 4). Click again to unlink.
- `ПРОВЕРИТЬ` / **Enter** — submit the chain.
- `МЕШАТЬ` / **S** — shuffle tiles. `СБРОС` / **Esc** — clear selection.
- 4 mistakes = defeat. ВЫХОД in the menu actually powers the CRT down —
  the power button on the bezel turns it back on.

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
  base.css        tokens, font-face, CRT shell, tube overlays, power fx
  ui.css          buttons, chips, status bar, toasts, modals, toggles
  screens.css     menu + game layouts, tiles, banners, badges
js/
  core/util.js       helpers: rand/easing/DOM, monitor-scale math, FLIP
  core/sprites.js    pixel-art factory — sprites are text grids → canvas
  core/audio.js      chiptune SFX from raw WebAudio oscillators
  core/particles.js  sparkles / hearts / confetti / steam + emitters
  core/screens.js    view manager + static transition, toasts, modals
  game/data.js       puzzle definitions
  game/wires.js      WireLayer — animated pixel connections canvas
  game/board.js      Board — selection chain, guesses, collapse/reveal
  ui/menu.js         menu decorations, ambient FX, settings, power-off
  ui/game.js         HUD (hearts/timer), win-lose modals, lifecycles
  main.js            boot, cursors, monitor scaling, settings persistence
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

Assets: `assets/img/logo.png` (title logo), `assets/fonts/` (Press Start 2P,
Cyrillic + Latin subsets, loaded locally). Reference art lives in the repo
root. Settings (sound / CRT / particles) persist in `localStorage`.
