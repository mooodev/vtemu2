/* ============================================================
   В ТЕМУ! — core/screens.js
   View manager (menu/game) with TV-static transitions,
   plus shared toast + modal systems that live inside the tube.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el, wait } = VT.util;

  /* ---------------- screens ---------------- */

  const registry = new Map();
  let current = null;

  VT.screens = {
    register(name, api) { registry.set(name, api); },
    get current() { return current; },

    async go(name, { instant = false } = {}) {
      const next = registry.get(name);
      if (!next || current === name) return;
      const prev = registry.get(current);

      if (!instant) {
        VT.audio.play('static');
        const st = document.getElementById('tv-static');
        st.classList.remove('on'); void st.offsetWidth; st.classList.add('on');
        if (prev) {
          prev.el.classList.add('glitch-out');
          await wait(200);
        }
      }
      if (prev) {
        prev.el.classList.remove('glitch-out');
        prev.onExit && prev.onExit();
      }
      for (const api of registry.values()) if (api !== next) api.el.hidden = true;
      current = name;
      next.el.hidden = false;
      if (!instant) {
        next.el.classList.add('glitch-in');
        setTimeout(() => next.el.classList.remove('glitch-in'), 300);
      }
      next.onEnter && next.onEnter();
    },
  };

  /* ---------------- toasts ---------------- */

  VT.toast = (msg, kind = '', dur = 1500) => {
    const root = document.getElementById('toast-root');
    const t = el('div', 'toast ' + kind, msg);
    root.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 250);
    }, dur);
    return t;
  };

  /* ---------------- modals ---------------- */

  VT.modal = {
    open({ title, icon, sub, body, buttons = [], onClose, veilClose = true }) {
      const root = document.getElementById('modal-root');
      root.innerHTML = '';
      const veil = el('div', 'modal-veil');
      const box = el('div', 'modal');
      box.appendChild(el('div', 'corner-b'));

      const titleRow = el('div', 'modal-title');
      if (icon) titleRow.appendChild(VT.sprites.img(icon, { scale: 3 }));
      titleRow.appendChild(el('span', '', title));
      if (icon) titleRow.appendChild(VT.sprites.img(icon, { scale: 3 }));
      box.appendChild(titleRow);
      if (sub) box.appendChild(el('div', 'modal-sub', sub));
      box.appendChild(el('div', 'dotted-rule'));

      const bodyEl = el('div', 'modal-body');
      if (typeof body === 'string') bodyEl.innerHTML = body;
      else if (body) bodyEl.appendChild(body);
      box.appendChild(bodyEl);

      const close = () => {
        veil.classList.add('out');
        box.classList.add('out');
        setTimeout(() => { root.innerHTML = ''; }, 200);
        onClose && onClose();
      };

      if (buttons.length) {
        const btnRow = el('div', 'modal-btns');
        buttons.forEach((b) => {
          const btn = el('button', 'cbtn' + (b.primary ? ' primary' : ''));
          if (b.icon) btn.appendChild(VT.sprites.img(b.icon, { scale: 2 }));
          btn.appendChild(el('span', '', b.label));
          btn.addEventListener('mouseenter', () => VT.audio.play('hover'));
          btn.addEventListener('click', () => {
            VT.audio.play('click');
            if (!b.keepOpen) close();
            b.onClick && b.onClick();
          });
          btnRow.appendChild(btn);
        });
        box.appendChild(btnRow);
      }

      if (veilClose) veil.addEventListener('click', close);
      root.appendChild(veil);
      root.appendChild(box);
      VT.audio.play('modal');
      return { close, box };
    },
  };

  /* ---------------- shared status bar ---------------- */

  VT.buildStatusBars = () => {
    document.querySelectorAll('[data-statusbar]').forEach((bar) => {
      bar.innerHTML = '';

      const player = el('div', 'sb-cell sb-player');
      player.appendChild(VT.sprites.img('mascot', { scale: 3 }));
      const col = el('div', 'sb-col');
      const row1 = el('div', 'sb-row', '<span>ИГРОК 1</span>');
      const pips = el('span', 'sb-pips');
      for (let i = 0; i < 7; i++) pips.appendChild(el('i', i < 5 ? '' : 'dim'));
      row1.appendChild(pips);
      const row2 = el('div', 'sb-row');
      row2.appendChild(VT.sprites.img('star', { scale: 2 }));
      row2.appendChild(el('span', '', '23'));
      row2.appendChild(VT.sprites.img('coin', { scale: 2 }));
      row2.appendChild(el('span', '', '1250'));
      row2.appendChild(VT.sprites.img('trophy', { scale: 2 }));
      row2.appendChild(el('span', '', '015'));
      col.appendChild(row1); col.appendChild(row2);
      player.appendChild(col);

      const level = el('div', 'sb-cell sb-level');
      level.appendChild(el('span', 'sb-cap', '-- УРОВЕНЬ --'));
      level.appendChild(el('span', 'sb-num', '01'));

      const sys = el('div', 'sb-cell sb-sys');
      const sysCol = el('div', 'sb-col');
      sysCol.appendChild(el('span', '', '<b>СИСТЕМА 128</b>'));
      sysCol.appendChild(el('span', '', 'ВЕР. 1.90'));
      sysCol.appendChild(el('span', '', '© 1990'));
      sys.appendChild(sysCol);
      sys.appendChild(VT.sprites.img('flagRu', { scale: 3 }));

      bar.appendChild(player);
      bar.appendChild(level);
      bar.appendChild(sys);
    });
  };
})();
