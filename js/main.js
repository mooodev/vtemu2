/* ============================================================
   В ТЕМУ! — main.js
   Boot: pixel cursors, TV noise texture, settings persistence,
   power-on sequence, screen registry.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;

  /* ---------------- settings ---------------- */

  VT.settings = {
    save() {
      localStorage.setItem('vtemu-settings', JSON.stringify({
        sound: VT.audio.enabled,
        crt: !document.body.classList.contains('no-crt'),
        fx: VT.fx.enabled,
      }));
    },
    load() {
      try {
        const s = JSON.parse(localStorage.getItem('vtemu-settings') || '{}');
        if (s.sound === false) VT.audio.setEnabled(false);
        if (s.crt === false) document.body.classList.add('no-crt');
        if (s.fx === false) VT.fx.setEnabled(false);
      } catch (e) { /* fresh start */ }
    },
  };

  /* ---------------- pixel cursors ---------------- */

  function installCursors() {
    const arrow = VT.sprites.url('cursor', { scale: 2 });
    const hand = VT.sprites.url('cursorHand', { scale: 2 });
    const style = document.createElement('style');
    style.textContent = `
      body { cursor: url(${arrow}) 2 2, auto; }
      button, .ptoggle, .tile, .mbtn, .cbtn, #menu-logo {
        cursor: url(${hand}) 12 4, pointer;
      }
    `;
    document.head.appendChild(style);
  }

  /* ---------------- boot ---------------- */

  function boot() {
    VT.settings.load();
    VT.profile.load();
    VT.fx.init();
    installCursors();
    VT.hud.build();

    document.getElementById('tv-static').style.backgroundImage =
      `url(${VT.sprites.noiseTile(140)})`;

    VT.menuScreen.init();
    VT.gameScreen.init();
    VT.shopScreen.init();
    VT.profileScreen.init();

    /* audio requires a user gesture — unlock on first input */
    const unlock = () => { VT.audio.unlock(); document.removeEventListener('pointerdown', unlock); };
    document.addEventListener('pointerdown', unlock);

    /* CRT power-on sequence. The body starts as `tv-dead boot` straight
       from the HTML, so nothing is visible until the tube fires up.
       Dev shortcuts: index.html#game boots into the game,
       #demo also pre-selects three tiles (for screenshots). */
    const route = location.hash.replace('#', '');
    const off = document.getElementById('tv-off');
    off.style.opacity = '1';
    setTimeout(() => {
      document.body.classList.remove('tv-dead', 'boot');
      off.style.opacity = '';
      off.classList.add('on');
      VT.audio.play('powerOn');
      setTimeout(() => off.classList.remove('on'), 750);
      const gameRoutes = ['game', 'demo', 'solve', 'fail', 'win', 'lose'];
      VT.screens.go(gameRoutes.includes(route) ? 'game' : 'menu', { instant: true });
      if (route === 'demo') {
        setTimeout(() => {
          document.querySelectorAll('#grid .tile').forEach((t, i) => {
            if ([0, 5, 10].includes(i)) t.click();
          });
          /* headless screenshots starve rAF — force one grown frame */
          setTimeout(() => { VT.debug.wires.update(1); VT.debug.wires.draw(); }, 600);
        }, 1400);
      } else if (['solve', 'fail', 'win', 'lose'].includes(route)) {
        const G = [
          ['САД', 'СЕРДЦЕ', 'ЛАГЕРЬ', 'ПАРК'],
          ['МОТОР', 'БУДИЛЬНИК', 'СОБАКУ', 'ПРИВЫЧКУ'],
          ['ВРЕМЯ', 'ФИЛЬМ', 'СНЕГ', 'ПОЕЗД'],
          ['РЫБКА', 'ОСЕНЬ', 'СЕРЕДИНА', 'СВАДЬБА'],
        ];
        const BAD = [
          ['САД', 'СЕРДЦЕ', 'ЛАГЕРЬ', 'РЫБКА'],
          ['САД', 'СЕРДЦЕ', 'ЛАГЕРЬ', 'ОСЕНЬ'],
          ['САД', 'СЕРДЦЕ', 'ЛАГЕРЬ', 'МОТОР'],
          ['САД', 'СЕРДЦЕ', 'ЛАГЕРЬ', 'СНЕГ'],
        ];
        const plan = { solve: [G[0]], fail: [BAD[0]], win: G, lose: BAD }[route];
        let t = 1400;
        plan.forEach((set) => {
          setTimeout(() => set.forEach((w) =>
            document.querySelector(`#grid .tile[data-word="${w}"]`).click()), t);
          setTimeout(() => document.getElementById('btn-submit').click(), t + 350);
          t += 2600;
        });
      }
    }, 350);
  }

  if (document.fonts && document.fonts.ready) {
    /* wait for the pixel font so nothing flashes in a fallback face */
    Promise.race([document.fonts.ready, VT.util.wait(1500)]).then(boot);
  } else {
    window.addEventListener('load', boot);
  }
})();
