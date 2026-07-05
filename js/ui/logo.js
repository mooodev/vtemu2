/* ============================================================
   В ТЕМУ! — ui/logo.js
   Live text logo: the title is built from real font letters,
   each one an animated span (staggered bob, random squish /
   jump / wobble pokes). Text can be swapped letter-by-letter,
   which the game screen uses for congrats / snarky remarks.

   VT.logo.mount(el, text) -> {
     text, setText(text, tone), poke(), wave(),
     startTicker(), stopTicker()
   }
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;
  const { el, rand, choice } = VT.util;

  const TONES = ['tone-gold', 'tone-red'];
  const POKES = ['lg-squish', 'lg-jump', 'lg-wob', 'lg-squish'];

  function build(inst, text, entering) {
    inst.text = text;
    inst.root.innerHTML = '';
    [...text].forEach((ch, i) => {
      const l = el('span', 'lg-l');
      l.style.setProperty('--i', i);
      if (ch === ' ') { l.classList.add('lg-sp'); inst.root.appendChild(l); return; }
      const c = el('span', 'lg-c');
      c.textContent = ch;
      if (entering) {
        c.classList.add('lg-in');
        c.style.animationDelay = i * 36 + 'ms';
        c.addEventListener('animationend', () => {
          c.classList.remove('lg-in');
          c.style.animationDelay = '';
        }, { once: true });
      }
      l.appendChild(c);
      inst.root.appendChild(l);
    });
  }

  function swap(inst, text, tone) {
    if (inst.swapT) clearTimeout(inst.swapT);
    const cs = inst.root.querySelectorAll('.lg-c');
    cs.forEach((c, i) => {
      c.style.animationDelay = i * 26 + 'ms';
      c.className = 'lg-c lg-out';
    });
    inst.swapT = setTimeout(() => {
      inst.swapT = null;
      inst.root.classList.remove(...TONES);
      if (tone) inst.root.classList.add(tone);
      build(inst, text, true);
    }, cs.length * 26 + 190);
  }

  function poke(inst) {
    const cs = [...inst.root.querySelectorAll('.lg-c')]
      .filter((c) => !c.classList.contains('lg-out') && !c.classList.contains('lg-in'));
    if (!cs.length) return;
    const c = choice(cs);
    c.classList.remove(...new Set(POKES));
    void c.offsetWidth;
    const anim = choice(POKES);
    c.classList.add(anim);
    c.addEventListener('animationend', () => c.classList.remove(anim), { once: true });
  }

  /* every letter jumps in a cascade (logo petting) */
  function wave(inst) {
    inst.root.querySelectorAll('.lg-c').forEach((c, i) => {
      setTimeout(() => {
        c.classList.remove('lg-jump');
        void c.offsetWidth;
        c.classList.add('lg-jump');
        c.addEventListener('animationend', () => c.classList.remove('lg-jump'), { once: true });
      }, i * 70);
    });
  }

  VT.logo = {
    mount(root, text) {
      const inst = { root, text: '', swapT: null, tickT: null };
      root.classList.add('logo-text');
      build(inst, text);
      return {
        el: root,
        get text() { return inst.text; },
        setText(t, tone) { swap(inst, t, tone); },
        poke() { poke(inst); },
        wave() { wave(inst); },
        /* random letter pokes on a loose interval */
        startTicker(minS = 1.4, maxS = 3.8) {
          this.stopTicker();
          const tick = () => {
            poke(inst);
            inst.tickT = setTimeout(tick, rand(minS * 1000, maxS * 1000));
          };
          inst.tickT = setTimeout(tick, rand(500, 1600));
        },
        stopTicker() {
          if (inst.tickT) clearTimeout(inst.tickT);
          inst.tickT = null;
        },
      };
    },
  };
})();
