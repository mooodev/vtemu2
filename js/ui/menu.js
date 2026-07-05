/* ============================================================
   В ТЕМУ! — ui/menu.js
   Main menu: hovering logo with sparkle/heart emitters,
   floating side props, vibrant buttons, settings modal,
   placeholder modals, CRT power-off easter egg.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el, screenPos, rand } = VT.util;

  let emitters = [];

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

    /* floating side props */
    const side = document.getElementById('side-deco');
    side.innerHTML = '';
    const props = [
      { s: 'magnifier', sc: 5, x: '7%',  y: '38%', dur: 4.2 },
      { s: 'books',     sc: 5, x: '5%',  y: '64%', dur: 5.1 },
      { s: 'bulb',      sc: 5, x: '86%', y: '40%', dur: 3.6 },
      { s: 'mug',       sc: 5, x: '85%', y: '66%', dur: 4.8, id: 'deco-mug' },
    ];
    props.forEach((p, i) => {
      const d = el('span', 'sd');
      if (p.id) d.id = p.id;
      d.style.left = p.x; d.style.top = p.y;
      d.style.setProperty('--sd-dur', p.dur + 's');
      d.style.setProperty('--sd-delay', i * -1.3 + 's');
      d.appendChild(VT.sprites.img(p.s, { scale: p.sc }));
      side.appendChild(d);
    });
    [['12%', '20%'], ['74%', '22%'], ['10%', '84%'], ['78%', '84%']].forEach(([x, y]) => {
      const dots = el('span', 'dots');
      dots.style.left = x; dots.style.top = y;
      side.appendChild(dots);
    });
  }

  function startAmbient() {
    const logo = document.getElementById('menu-logo');
    const mug = document.getElementById('deco-mug');
    emitters = [
      VT.fx.zoneSparkler(() => {
        const p = screenPos(logo);
        return { x: p.x - p.w / 2 - 30, y: p.y - p.h / 2 - 20, w: p.w + 60, h: p.h + 40 };
      }, 2.4),
      VT.fx.zoneHearts(() => {
        const p = screenPos(logo);
        return { x: p.x + rand(-p.w / 3, p.w / 3), y: p.y - p.h / 2 };
      }, 0.35),
      VT.fx.steam(() => {
        if (!mug) return null;
        const p = screenPos(mug);
        return { x: p.x - 6, y: p.y - p.h / 2 - 4 };
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
    const off = document.getElementById('tv-off');
    off.classList.remove('on'); off.classList.add('off');
    document.getElementById('power-led').classList.add('off');
    setTimeout(() => document.body.classList.add('tv-dead'), 350);
  }

  window.VT.powerOn = async () => {
    const off = document.getElementById('tv-off');
    document.body.classList.remove('tv-dead');
    document.getElementById('power-led').classList.remove('off');
    VT.audio.play('powerOn');
    off.classList.remove('off'); off.classList.add('on');
    setTimeout(() => off.classList.remove('on'), 750);
    if (VT.screens.current === 'menu') startAmbient();
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
    document.getElementById('power-btn').addEventListener('click', () => {
      if (document.body.classList.contains('tv-dead')) VT.powerOn();
      else powerOff();
    });
    /* logo reacts to petting */
    const logo = document.getElementById('menu-logo');
    logo.addEventListener('click', () => {
      const p = screenPos(logo);
      VT.audio.play('chain');
      VT.fx.burst(p.x, p.y, { count: 22, speed: 200 });
      for (let i = 0; i < 3; i++) VT.fx.heart(p.x + rand(-80, 80), p.y + rand(-20, 20), 3);
    });
  }

  VT.menuScreen = {
    init() {
      decorate();
      bind();
      VT.screens.register('menu', {
        el: document.getElementById('view-menu'),
        onEnter: startAmbient,
        onExit: stopAmbient,
      });
    },
  };
})();
