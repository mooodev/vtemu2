/* ============================================================
   В ТЕМУ! — game/data.js
   Puzzle definitions. Each puzzle = 4 groups × 4 words,
   grouped by a hidden meaning. Difficulty drives banner color.

   To add puzzles, push more objects into VT.data.puzzles.
   ============================================================ */
(function () {
  'use strict';
  const VT = window.VT;

  const DIFF = {
    easy:   { color: '#9dc157', name: 'ПРОСТАЯ' },
    medium: { color: '#e9b840', name: 'СРЕДНЯЯ' },
    hard:   { color: '#7fa8de', name: 'СЛОЖНАЯ' },
    expert: { color: '#e06a50', name: 'ЭКСПЕРТ' },
  };

  VT.data = {
    DIFF,
    puzzles: [
      {
        id: 'demo-01',
        title: 'РАУНД 01',
        groups: [
          {
            title: 'РАЗБИТЬ ...',
            diff: 'easy',
            words: ['САД', 'СЕРДЦЕ', 'ЛАГЕРЬ', 'ПАРК'],
          },
          {
            title: 'ЗАВЕСТИ ...',
            diff: 'medium',
            words: ['МОТОР', 'БУДИЛЬНИК', 'СОБАКУ', 'ПРИВЫЧКУ'],
          },
          {
            title: 'ИДЁТ ...',
            diff: 'hard',
            words: ['ВРЕМЯ', 'ФИЛЬМ', 'СНЕГ', 'ПОЕЗД'],
          },
          {
            title: 'ЗОЛОТАЯ ...',
            diff: 'expert',
            words: ['РЫБКА', 'ОСЕНЬ', 'СЕРЕДИНА', 'СВАДЬБА'],
          },
        ],
      },
    ],
  };
})();
