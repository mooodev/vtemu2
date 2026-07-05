/* ============================================================
   В ТЕМУ! — ui/menu.js
   Main menu: live text logo with sparkle/heart emitters,
   floating PNG pixel props (reshuffled every visit), vibrant
   buttons, settings modal, placeholder modals, CRT power-off
   easter egg (tap the dead screen to power back on).
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el, screenPos, rand, shuffle } = VT.util;

  let emitters = [];
  let menuLogo = null;

  /* PNG pixel-art props (sprites/ folder). The mug keeps its id so
     the steam emitter can find it wherever it lands. */
  const PROPS = [
    { src: 'sprites/cup.png',             w: 92,  id: 'deco-mug' },
    { src: 'sprites/lightbulb.png',       w: 88 },
    { src: 'sprites/magnifyingglass.png', w: 94 },
    { src: 'sprites/books.png',           w: 104 },
    { src: 'sprites/speechbubble.png',    w: 78 },
  ];
  /* anchor points (percent, element centered on them) */
  const SLOTS = [
    { x: 10, y: 36 },
    { x: 8,  y: 63 },
    { x: 90, y: 38 },
    { x: 88, y: 64 },
    { x: 82, y: 12 },
  ];

  /** Drop the props into randomly assigned slots — new layout
      every time the menu is entered. */
  function placeProps() {
    const side = document.getElementById('side-deco');
    side.querySelectorAll('.sd').forEach((s) => s.remove());
    const slots = shuffle(SLOTS);
    PROPS.forEach((p, i) => {
      const s = slots[i];
      const d = el('span', 'sd');
      if (p.id) d.id = p.id;
      d.style.left = (s.x + rand(-2, 2)).toFixed(1) + '%';
      d.style.top = (s.y + rand(-2, 2)).toFixed(1) + '%';
      const bob = el('span', 'sd-bob');
      bob.style.setProperty('--sd-dur', rand(3.4, 5.2).toFixed(2) + 's');
      bob.style.setProperty('--sd-delay', (-rand(0, 4)).toFixed(2) + 's');
      const img = el('img');
      img.src = p.src;
      img.alt = '';
      img.draggable = false;
      img.style.width = `clamp(44px, 11vw, ${p.w}px)`;
      bob.appendChild(img);
      d.appendChild(bob);
      side.appendChild(d);
    });
  }

  function decorate() {
    /* deterministic twinkles pinned around the logo */
    const deco = document.getElementById('menu-deco');
    deco.innerHTML = '';
    const spots = [
      { x: 2,  y: 18, s: 'star',     sc: 3, d: 0 },
      { x: 8,  y: 62, s: 'sparkle',  sc: 3, d: .5, c: '#7fa8de' },
      { x: 16, y: 8,  s: 'sparkle4', sc: 2, d: 1.1, c: '#e06a50' },
      { x: 82, y: 6,  s: 'sparkle',  sc: 3, d: .3, c: '#f6d87c' },
      { x: 90, y: 30, s: 'star',     sc: 2, d: .8 },
      { x: 95, y: 66, s: 'sparkle4', sc: 2, d: 1.4, c: '#7fa8de' },
      { x: 75, y: 88, s: 'heart',    sc: 2, d: .6 },
      { x: 26, y: 92, s: 'sparkle',  sc: 2, d: 1.8, c: '#c8ec84' },
    ];
    spots.forEach((p) => {
      const tw = el('span', 'tw');
      tw.style.left = p.x + '%';
      tw.style.top = p.y + '%';
      tw.style.setProperty('--tw-delay', p.d + 's');
      tw.style.setProperty('--tw-dur', rand(1.8, 3) + 's');
      tw.appendChild(VT.sprites.img(p.s, { scale: p.sc, color: p.c }));
      deco.appendChild(tw);
    });

    /* chevrons beside the tagline */
    document.querySelectorAll('.chev').forEach((c, i) => {
      c.innerHTML = '';
      const img = VT.sprites.img('chevron', { scale: 2, color: i ? '#c8402f' : '#4a76b4' });
      if (i === 0) img.style.transform = 'scaleX(-1)';
      c.appendChild(img);
    });

    /* dotted texture patches in the corners */
    const side = document.getElementById('side-deco');
    [['12%', '20%'], ['74%', '22%'], ['10%', '84%'], ['78%', '84%']].forEach(([x, y]) => {
      const dots = el('span', 'dots');
      dots.style.left = x; dots.style.top = y;
      side.appendChild(dots);
    });
  }

  function startAmbient() {
    const logo = document.getElementById('menu-logo');
    emitters = [
      VT.fx.zoneSparkler(() => {
        const p = screenPos(logo);
        return { x: p.x - p.w / 2 - 30, y: p.y - p.h / 2 - 20, w: p.w + 60, h: p.h + 40 };
      }, 2.4),
      VT.fx.zoneHearts(() => {
        const p = screenPos(logo);
        return { x: p.x + rand(-p.w / 3, p.w / 3), y: p.y - p.h / 2 };
      }, 0.35),
      /* steam stays particle-generated, rising off the sprite mug */
      VT.fx.steam(() => {
        const mug = document.getElementById('deco-mug');
        if (!mug) return null;
        const p = screenPos(mug);
        return { x: p.x - p.w * 0.1, y: p.y - p.h * 0.42 };
      }, 2.5),
    ];
  }

  function stopAmbient() {
    emitters.forEach((e) => VT.fx.removeEmitter(e));
    emitters = [];
  }

  /* ---------------- modals ---------------- */

  function comingSoon(title, icon) {
    const body = el('div', '');
    body.style.textAlign = 'center';
    const mascot = VT.sprites.img('mascot', { scale: 6 });
    mascot.style.marginBottom = '14px';
    body.appendChild(mascot);
    body.appendChild(el('div', '', '<span style="font-size:13px;color:var(--cream-dark)">РАЗДЕЛ В РАЗРАБОТКЕ</span>'));
    body.appendChild(el('div', '', '<span style="font-size:10px;color:var(--dim);display:block;margin-top:10px">ЗАГЛЯНИ ПОЗЖЕ, ИГРОК 1</span>'));
    VT.modal.open({
      title, icon, sub: 'СИСТЕМА 128 СООБЩАЕТ',
      body,
      buttons: [{ label: 'ПОНЯТНО', primary: true }],
    });
  }

  function settingsModal() {
    const body = el('div', '');
    body.style.width = '100%';
    const rows = [
      { key: 'sound', label: 'ЗВУК', icon: 'bulb', get: () => VT.audio.enabled, set: (v) => VT.audio.setEnabled(v) },
      { key: 'crt', label: 'CRT-ЭФФЕКТ', icon: 'mascot', get: () => !document.body.classList.contains('no-crt'), set: (v) => document.body.classList.toggle('no-crt', !v) },
      { key: 'fx', label: 'ЧАСТИЦЫ', icon: 'star', get: () => VT.fx.enabled, set: (v) => VT.fx.setEnabled(v) },
    ];
    rows.forEach((r) => {
      const row = el('div', 'set-row');
      const lab = el('div', 'set-label');
      lab.appendChild(VT.sprites.img(r.icon, { scale: 2 }));
      lab.appendChild(el('span', '', r.label));
      row.appendChild(lab);
      const tg = el('div', 'ptoggle' + (r.get() ? ' on' : ''));
      tg.innerHTML = '<span class="t-cap t-on">ВКЛ</span><span class="t-cap t-off">ВЫКЛ</span><span class="knob"></span>';
      tg.addEventListener('click', () => {
        const v = !r.get();
        r.set(v);
        tg.classList.toggle('on', v);
        VT.audio.play('toggle');
        VT.settings.save();
      });
      row.appendChild(tg);
      body.appendChild(row);
      body.appendChild(el('div', '', '<div style="height:10px"></div>'));
    });
    VT.modal.open({
      title: 'НАСТРОЙКИ', icon: 'gear', sub: 'КОНФИГУРАЦИЯ СИСТЕМЫ',
      body,
      buttons: [{ label: 'ГОТОВО', primary: true }],
    });
  }

  async function powerOff() {
    VT.audio.play('powerOff');
    stopAmbient();
    menuLogo && menuLogo.stopTicker();
    const off = document.getElementById('tv-off');
    off.classList.remove('on'); off.classList.add('off');
    setTimeout(() => document.body.classList.add('tv-dead'), 350);
  }

  window.VT.powerOn = async () => {
    const off = document.getElementById('tv-off');
    document.body.classList.remove('tv-dead');
    VT.audio.play('powerOn');
    off.classList.remove('off'); off.classList.add('on');
    setTimeout(() => off.classList.remove('on'), 750);
    if (VT.screens.current === 'menu') {
      startAmbient();
      menuLogo && menuLogo.startTicker();
    }
  };

  /* ---------------- wiring ---------------- */

  function bind() {
    document.getElementById('menu-buttons').addEventListener('click', (e) => {
      const btn = e.target.closest('.mbtn');
      if (!btn) return;
      VT.audio.play('click');
      const p = screenPos(btn);
      VT.fx.burst(p.x - p.w / 2 + 20, p.y, { count: 6, speed: 80, size: [2, 4] });
      const act = btn.dataset.action;
      if (act === 'play') VT.screens.go('game');
      else if (act === 'modes') comingSoon('РЕЖИМЫ', 'grid');
      else if (act === 'profile') comingSoon('ПРОФИЛЬ', 'person');
      else if (act === 'settings') settingsModal();
      else if (act === 'exit') powerOff();
    });
    document.querySelectorAll('.mbtn').forEach((b) => {
      b.addEventListener('mouseenter', () => VT.audio.play('hover'));
      const ico = b.querySelector('.mbtn-ico');
      VT.sprites.mount(ico, ico.dataset.ico, { scale: 3, color: '#1b1914' });
    });
    /* tap the dead tube to power it back on */
    document.getElementById('wake-hint').addEventListener('click', () => {
      if (document.body.classList.contains('tv-dead')) VT.powerOn();
    });
    /* logo reacts to petting */
    const logo = document.getElementById('menu-logo');
    logo.addEventListener('click', () => {
      const p = screenPos(logo);
      VT.audio.play('chain');
      menuLogo.wave();
      VT.fx.burst(p.x, p.y, { count: 22, speed: 200 });
      for (let i = 0; i < 3; i++) VT.fx.heart(p.x + rand(-80, 80), p.y + rand(-20, 20), 3);
    });
  }

  VT.menuScreen = {
    init() {
      menuLogo = VT.logo.mount(document.getElementById('menu-logo'), 'В ТЕМУ!');
      decorate();
      bind();
      VT.screens.register('menu', {
        el: document.getElementById('view-menu'),
        onEnter() {
          placeProps();
          startAmbient();
          menuLogo.startTicker();
        },
        onExit() {
          stopAmbient();
          menuLogo.stopTicker();
        },
      });
    },
  };
})();
