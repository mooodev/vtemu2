/* ============================================================
   В ТЕМУ! — core/sprites.js
   Pixel-art sprite factory. Sprites are drawn as text grids;
   each character maps to a palette color ('.' = transparent,
   'x' = wildcard, recolorable per instance). Rendered to
   canvases, cached, and served as <img> / dataURL / canvas.

   Adding art = adding a string array. Keep pixels chunky.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;

  const PAL = {
    '0': '#1b1914', // ink outline
    'c': '#eee1b3', // cream
    'C': '#fdf6dd', // cream bright
    'k': '#d3c493', // khaki
    'K': '#b3a476', // khaki dark
    'g': '#9dc157', // green
    'G': '#c8ec84', // green bright
    'd': '#55702f', // green deep
    's': '#7fae54', // screen green
    'r': '#c8402f', // red
    'R': '#e06a50', // red bright
    'b': '#4a76b4', // blue
    'B': '#7fa8de', // blue bright
    'y': '#e9b840', // gold
    'Y': '#f6d87c', // gold bright
    'w': '#ffffff',
    'u': '#6f6a58', // dead grey
    'U': '#8d8875',
    'm': '#8a6d43', // brown
    'n': '#5d4a2e', // dark brown
  };

  const DEFS = {
    /* ------------------------------------------------ decor */
    star: [
      '.....y.....',
      '....yYy....',
      '....yYy....',
      '.yyyYYYyyy.',
      '..yYYYYYy..',
      '...yYYYy...',
      '...yYYYy...',
      '..yYy.yYy..',
      '..y.....y..',
    ],
    sparkle: [
      '..x..',
      '..x..',
      'xxwxx',
      '..x..',
      '..x..',
    ],
    sparkle4: [
      '...x...',
      '...x...',
      '..xwx..',
      'xxwwwxx',
      '..xwx..',
      '...x...',
      '...x...',
    ],
    dot: [
      'xx',
      'xx',
    ],
    heart: [
      '.rr...rr.',
      'rwRr.rRRr',
      'rRRRrRRRr',
      'rRRRRRRRr',
      '.rRRRRRr.',
      '..rRRRr..',
      '...rRr...',
      '....r....',
    ],
    heartDead: [
      '.uu...uu.',
      'uUU..uUUu',
      'uUUu..UUu',
      'uUU..UUUu',
      '.uU.uUUu.',
      '..u..Uu..',
      '...u.u...',
      '....u....',
    ],
    /* ------------------------------------------------ cursors */
    cursor: [
      '0..........',
      '00.........',
      '0c0........',
      '0cc0.......',
      '0ccc0......',
      '0cccc0.....',
      '0ccccc0....',
      '0cccccc0...',
      '0ccccccc0..',
      '0cccccccc0.',
      '0ccccc0000.',
      '0cc0cc0....',
      '0c0.0cc0...',
      '00..0cc0...',
      '.....0cc0..',
      '......00...',
    ],
    cursorHand: [
      '......00........',
      '.....0gg0.......',
      '.....0gg0.......',
      '.....0gg0.......',
      '.....0gg000.....',
      '.....0gg0gg00...',
      '.....0gg0gg0g0..',
      '.00..0gg0gg0gg0.',
      '0gg0.0gggggggg0.',
      '0ggg00gggggggg0.',
      '.0ggg0gggggggg0.',
      '..0ggggggggggg0.',
      '..0gggggggggg0..',
      '...0gggggggg00..',
      '....0ggggggg0...',
      '....000000000...',
    ],
    /* ------------------------------------------------ mascots & props */
    mascot: [
      '.00000000000000.',
      '0kkkkkkkkkkkkkk0',
      '0k000000000000k0',
      '0k0ssssssssss0k0',
      '0k0ss0ssss0ss0k0',
      '0k0ssssssssss0k0',
      '0k0s0ssssss0s0k0',
      '0k0ss000000ss0k0',
      '0k0ssssssssss0k0',
      '0k000000000000k0',
      '0kkkkkkkkkkkkkk0',
      '.00000000000000.',
      '.....0kkkk0.....',
      '...00kkkkkk00...',
      '...0000000000...',
    ],
    mug: [
      '.000000000...',
      '0ccccccccc0..',
      '0ccccccccc00.',
      '0cccrcrccc0c0',
      '0cccrrrccc0c0',
      '0ccccrcccc0c0',
      '0ccccccccc00.',
      '0ccccccccc0..',
      '.0ccccccc0...',
      '..0000000....',
    ],
    bulb: [
      '..00000..',
      '.0YYYYY0.',
      '0YwYYYYY0',
      '0YwYYYYY0',
      '0YYYYYYY0',
      '0YYYYYYY0',
      '.0YYYYY0.',
      '..0YYY0..',
      '..0kkk0..',
      '..0kkk0..',
      '..00000..',
      '...0k0...',
      '....0....',
    ],
    books: [
      '..000000000000..',
      '.0gGgggggggggg0.',
      '.0gggggggggggg0.',
      '.0000000000000..',
      '0rRrrrrrrrrrrr0.',
      '0rrrrrrrrrrrrr0.',
      '00000000000000..',
      '.0bBbbbbbbbbbbb0',
      '.0bbbbbbbbbbbbb0',
      '.000000000000000',
    ],
    magnifier: [
      '..0000......',
      '.0bBBb0.....',
      '0bBwwBb0....',
      '0BwwBBB0....',
      '0BwBBBB0....',
      '0bBBBBb0....',
      '.0bbbb00....',
      '..00000r0...',
      '......0rr0..',
      '.......0rr0.',
      '........0r0.',
      '.........00.',
    ],
    flagRu: [
      '00000000000000',
      '0wwwwwwwwwwww0',
      '0wwwwwwwwwwww0',
      '0wwwwwwwwwwww0',
      '0bbbbbbbbbbbb0',
      '0bbbbbbbbbbbb0',
      '0bbbbbbbbbbbb0',
      '0rrrrrrrrrrrr0',
      '0rrrrrrrrrrrr0',
      '0rrrrrrrrrrrr0',
      '00000000000000',
    ],
    trophy: [
      '.0000000000.',
      '00yYyyyyyy00',
      '0y0yYyyyy0y0',
      '0y0yyyyyy0y0',
      '.00yyyyyy00.',
      '..0yyyyyy0..',
      '...0yyyy0...',
      '....0yy0....',
      '...0yyyy0...',
      '..0yyyyyy0..',
      '..00000000..',
    ],
    coin: [
      '..000000..',
      '.0yyyyyy0.',
      '0yYyyyyyy0',
      '0yyyYYyyy0',
      '0yyYYYYyy0',
      '0yyyYYyyy0',
      '0yyyyyyyy0',
      '.0yyyyyy0.',
      '..000000..',
    ],
    /* ------------------------------------------------ ui icons (wildcard) */
    play: [
      'xx......',
      'xxxx....',
      'xxxxxx..',
      'xxxxxxxx',
      'xxxxxx..',
      'xxxx....',
      'xx......',
    ],
    grid: [
      'xxxx.xxxx',
      'xxxx.xxxx',
      'xxxx.xxxx',
      'xxxx.xxxx',
      '.........',
      'xxxx.xxxx',
      'xxxx.xxxx',
      'xxxx.xxxx',
      'xxxx.xxxx',
    ],
    person: [
      '...xxx...',
      '..xxxxx..',
      '..xxxxx..',
      '...xxx...',
      '..xxxxx..',
      '.xxxxxxx.',
      'xxxxxxxxx',
      'xxxxxxxxx',
      'xxxxxxxxx',
    ],
    gear: [
      '.x..xx..x.',
      'xxx.xx.xxx',
      '.xxxxxxxx.',
      '..xx..xx..',
      'xxx....xxx',
      'xxx....xxx',
      '..xx..xx..',
      '.xxxxxxxx.',
      'xxx.xx.xxx',
      '.x..xx..x.',
    ],
    exit: [
      'xxxxxx....',
      'x....x....',
      'x....x.x..',
      'x....x.xx.',
      'x....xxxxx',
      'x....x.xx.',
      'x....x.x..',
      'x....x....',
      'xxxxxx....',
    ],
    back: [
      '...x.....',
      '..xx.....',
      '.xxxxxxxx',
      'xxxxxxxxx',
      '.xxxxxxxx',
      '..xx.....',
      '...x.....',
    ],
    check: [
      '.......xx',
      '......xxx',
      '.....xxx.',
      'xx..xxx..',
      'xxxxxx...',
      '.xxxx....',
      '..xx.....',
    ],
    cross: [
      'xx....xx',
      'xxx..xxx',
      '.xxxxxx.',
      '..xxxx..',
      '..xxxx..',
      '.xxxxxx.',
      'xxx..xxx',
      'xx....xx',
    ],
    shuffle: [
      '..x.......',
      '.xx.......',
      'xxxxxxxxx.',
      '.xx.......',
      '..x.......',
      '.......x..',
      '.......xx.',
      '.xxxxxxxxx',
      '.......xx.',
      '.......x..',
    ],
    clock: [
      '..xxxxxx..',
      '.x......x.',
      'x....x...x',
      'x....x...x',
      'x....xxx.x',
      'x........x',
      'x........x',
      '.x......x.',
      '..xxxxxx..',
    ],
    chevron: [
      'x...x...x...',
      '.x...x...x..',
      '..x...x...x.',
      '...x...x...x',
      '..x...x...x.',
      '.x...x...x..',
      'x...x...x...',
    ],
  };

  const cache = new Map();

  /** Render a sprite def to a canvas (1px per cell). */
  function buildCanvas(name, color) {
    const def = DEFS[name];
    if (!def) throw new Error('no sprite: ' + name);
    const h = def.length;
    const w = Math.max(...def.map((r) => r.length));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < def[y].length; x++) {
        const ch = def[y][x];
        if (ch === '.' || ch === ' ') continue;
        ctx.fillStyle = ch === 'x' ? (color || PAL['0']) : PAL[ch] || color || PAL['0'];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }

  const sprites = (VT.sprites = {
    PAL,

    canvas(name, color) {
      const key = name + '|' + (color || '');
      if (!cache.has(key)) cache.set(key, buildCanvas(name, color));
      return cache.get(key);
    },

    url(name, { scale = 3, color } = {}) {
      const key = 'url:' + name + '|' + scale + '|' + (color || '');
      if (!cache.has(key)) {
        const src = sprites.canvas(name, color);
        const cv = document.createElement('canvas');
        cv.width = src.width * scale;
        cv.height = src.height * scale;
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(src, 0, 0, cv.width, cv.height);
        cache.set(key, cv.toDataURL());
      }
      return cache.get(key);
    },

    /** <img> element, pixel-perfect scaled. */
    img(name, { scale = 3, color, cls } = {}) {
      const src = sprites.canvas(name, color);
      const im = new Image();
      im.src = sprites.url(name, { scale, color });
      im.width = src.width * scale;
      im.height = src.height * scale;
      im.draggable = false;
      im.alt = '';
      if (cls) im.className = cls;
      return im;
    },

    /** Fill an element (e.g. [data-ico]) with a sprite image. */
    mount(el, name, opts) {
      el.textContent = '';
      el.appendChild(sprites.img(name, opts));
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
    },

    /** Random static-noise tile for the TV transition. */
    noiseTile(size = 120) {
      const cv = document.createElement('canvas');
      cv.width = size; cv.height = size;
      const ctx = cv.getContext('2d');
      const safe = ['#0a0d08', '#1c2414', '#2c3520', '#4a5731', '#141a10', '#61713f'];
      for (let y = 0; y < size; y += 3) {
        for (let x = 0; x < size; x += 3) {
          ctx.fillStyle = safe[(Math.random() * safe.length) | 0];
          ctx.fillRect(x, y, 3, 3);
        }
      }
      return cv.toDataURL();
    },
  });
})();
