/* ============================================================
   В ТЕМУ! — ui/shop.js
   МАГАЗИН: avatar showcase. Cards show owned / equipped /
   priced states; buying opens a confirm modal, pays with a
   flying-coin animation and auto-equips the new face.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el, screenPos } = VT.util;

  let grid = null;
  let sub = null;

  function card(i) {
    const meta = VT.avatars.META[i];
    const owned = VT.profile.ownsAvatar(i);
    const equipped = VT.profile.avatar === i;

    const c = el('div', 'ava-card' + (equipped ? ' equipped' : owned ? ' owned' : ''));
    c.dataset.idx = i;

    const frame = el('div', 'ava-frame');
    frame.appendChild(VT.avatars.img(i));
    if (equipped) frame.appendChild(el('span', 'ava-tag', 'ТЫ'));
    c.appendChild(frame);
    c.appendChild(el('div', 'ava-name', meta.name));

    const btn = el('button', 'cbtn ava-btn' + (equipped ? '' : owned ? ' primary' : ''));
    if (equipped) {
      btn.disabled = true;
      btn.appendChild(VT.sprites.img('check', { scale: 1, color: '#1b1914' }));
      btn.appendChild(el('span', '', 'ВЫБРАН'));
    } else if (owned) {
      btn.appendChild(el('span', '', 'НАДЕТЬ'));
      btn.addEventListener('click', () => equip(i, c));
    } else {
      btn.classList.add('price');
      btn.appendChild(VT.sprites.img('coin', { scale: 1 }));
      btn.appendChild(el('span', '', String(meta.price)));
      btn.addEventListener('click', () => confirmBuy(i));
      if (VT.profile.coins < meta.price) btn.classList.add('too-rich');
    }
    btn.addEventListener('mouseenter', () => VT.audio.play('hover'));
    c.appendChild(btn);
    return c;
  }

  function render() {
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < VT.avatars.count; i++) grid.appendChild(card(i));
  }

  function equip(i, cardEl) {
    if (!VT.profile.equipAvatar(i)) return;
    VT.audio.play('toggle');
    const p = screenPos(cardEl);
    VT.fx.burst(p.x, p.y - 20, { count: 12, speed: 120, size: [2, 4] });
    /* render happens via the profile change subscription */
  }

  function confirmBuy(i) {
    const meta = VT.avatars.META[i];
    const body = el('div', 'buy-body');
    const frame = el('div', 'ava-frame big');
    frame.appendChild(VT.avatars.img(i));
    body.appendChild(frame);
    const price = el('div', 'buy-price');
    price.appendChild(el('span', '', 'ЦЕНА:'));
    price.appendChild(VT.sprites.img('coin', { scale: 2 }));
    price.appendChild(el('b', '', String(meta.price)));
    body.appendChild(price);

    const canPay = VT.profile.coins >= meta.price;
    if (!canPay) body.appendChild(el('div', 'buy-warn', 'НЕ ХВАТАЕТ МОНЕТ — ИГРАЙ И ЗАРАБАТЫВАЙ!'));

    VT.modal.open({
      title: meta.name, icon: 'cart', sub: 'ОТДЕЛ АВАТАРОВ',
      body,
      buttons: canPay ? [
        {
          label: 'КУПИТЬ', icon: 'coin', primary: true,
          onClick: () => buy(i),
        },
        { label: 'ПОТОМ' },
      ] : [{ label: 'ПОНЯТНО', primary: true }],
    });
  }

  function buy(i) {
    const meta = VT.avatars.META[i];
    if (!VT.profile.buyAvatar(i)) { VT.audio.play('denied'); return; }
    VT.audio.play('buy');
    /* profile change already re-rendered the grid — find the new card */
    requestAnimationFrame(() => {
      const cardEl = grid.querySelector(`.ava-card[data-idx="${i}"]`);
      if (!cardEl) return;
      const p = screenPos(cardEl);
      VT.hud.spendCoins(meta.price, p);
      cardEl.classList.add('just-bought');
      setTimeout(() => {
        VT.fx.burst(p.x, p.y, { count: 22, speed: 190 });
        VT.fx.heart(p.x, p.y - 30, 3);
      }, 500);
    });
  }

  VT.shopScreen = {
    init() {
      const bodyEl = document.getElementById('shop-body');
      grid = el('div', 'shop-grid');
      bodyEl.appendChild(grid);

      const back = document.getElementById('btn-shop-back');
      VT.sprites.mount(back.querySelector('[data-ico]'), 'back', { scale: 2, color: '#1b1914' });
      back.addEventListener('click', () => { VT.audio.play('click'); VT.screens.go('menu'); });
      back.addEventListener('mouseenter', () => VT.audio.play('hover'));

      VT.screens.register('shop', {
        el: document.getElementById('view-shop'),
        onEnter() {
          render();
          sub = VT.profile.onChange(() => render());
        },
        onExit() {
          if (sub) { VT.profile.offChange(sub); sub = null; }
        },
      });
    },
  };
})();
