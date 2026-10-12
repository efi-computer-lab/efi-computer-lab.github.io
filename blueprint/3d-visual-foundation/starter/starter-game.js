/* STARTER ISLAND — a tiny Game Kit game that shows the 3D Visual Foundation working end to end.
   COPY THIS FILE to start a new 3D game: change the world (grid, locations, decorations), the words, the puzzles and
   the objectives. tools/make_starter.py puts it inside Starter_3D_Game.html with the Game Kit runtime and the foundation.
   Flow: talk to Pip the parrot → find 3 shells → open the locked box (2 computer questions) → walk to the boat. */
(function () {
  'use strict';

  // ===================== the world (built by worlds/_wild.js; 2 m per grid cell) =====================
  // Symbols:  ~ sea   , sand   . grass   : path   p pool (water you cannot enter)   T jungle wall   S spawn
  GK.Worlds.add('starter-island', GK.Wild.world({
    name: 'Starter Island',
    description: 'A small tropical island: jungle edge, grass clearing with a pool, a sandy beach and a boat.',
    seed: 5,
    // tropical day (src/lighting-presets.js: GK.LightingPresets.tropicalDay)
    lighting: { sky: ['#2f7fd6', '#6fb6ef', '#bfe2f8'], fogColor: '#b7dcf5', fog: [70, 280],
      sun: { dir: [-0.6, 0.75, 0.32], color: '#fff1d6', intensity: 0.68 }, ambient: { sky: '#a9c2dc', ground: '#6b5d45' },
      clouds: { cover: 0.38 }, grid: false },
    grid: [
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 0
      '~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~', // 1
      '~~TTT......................TTTTT~~', // 2
      '~~TT..........................TT~~', // 3
      '~~T.............::::...........T~~', // 4
      '~~T.............::::...ppppp...T~~', // 5
      '~~T.............::::...ppppp...T~~', // 6
      '~~T.............::::...ppppp...T~~', // 7
      '~~T.............::::...........T~~', // 8
      '~~TT............::::..........TT~~', // 9
      '~~TTTT.......,,,::::,,,.....TTTT~~', // 10
      '~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~', // 11
      '~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~', // 12
      '~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~', // 13
      '~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~', // 14
      '~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~', // 15
      '~~,,,,,,S,,,,,,,,,,,,,,,,,,,,,,,~~', // 16
      '~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~', // 17
      '~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~', // 18
      '~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~', // 19
      '~~,~,,,,~,,,,~,,,,~,,,,~,,,,,,,,~~', // 20
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 21
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 22
    ],
    keep: [[17, 33, 4], [24, 28, 3], [40, 28, 3], [57, 41, 5]],   // [x, z, radius]: no scattered scenery here
    decorations: [
      { model: 'escapeBoat', pos: [57, 0, 44], look: { parts: 9 }, rot: 'e', solid: false, merge: false },
      { model: 'wreck', pos: [8, 0, 38], rot: 's' }, { model: 'driftwood', pos: [30, 0, 39], rot: 'e', solid: false },
      { model: 'crate', pos: [12, 0, 36], color: '#a0703c' }, { model: 'barrel', pos: [14, 0, 37.5], color: '#6b4a2b' },
      { model: 'tent', pos: [10, 0, 10], rot: 'e' }, { model: 'campfire', pos: [16, 0, 12], look: { lit: true }, solid: false, merge: false },
      { model: 'seaRock', pos: [66, 0, 30], look: { s: 1.4 }, solid: false },
      { model: 'island', pos: [-60, 0, 110], look: { r: 12 }, solid: false }, { model: 'island', pos: [150, 0, 120], look: { r: 9 }, solid: false },
      { model: 'mountain', pos: [40, 0, -70], look: { h: 45, r: 38, color: '#5c7a4a', snow: '#7d9b67' }, solid: false },
    ],
    locations: {
      parrotSpot: { pos: [24, 0, 28], rot: 's' }, boxSpot: { pos: [40, 0, 28], rot: 's' },
      shell1: { pos: [10, 0, 16] }, shell2: { pos: [56, 0, 18] }, shell3: { pos: [60, 0, 36] }, dock: { pos: [57, 0, 40] },
    },
    spawns: { default: { pos: [17, 0, 33], rot: 'n' } },
    areas: { dock: { pos: [57, 0, 40], size: [6, 4, 4] } },
  }));

  // ===================== every word the player sees =====================
  const W = {
    title: 'STARTER ISLAND',
    subtitle: 'A tiny 3D adventure made with the 3D Visual Foundation',
    intro: 'You landed on a small island. Talk to Pip the parrot, find 3 shells, open the locked box and sail home!',
    pip: [
      'SQUAWK! Hello {{playerName}}! I am Pip!',
      'The boat key is in the locked box by the palm trees. It has a COMPUTER LOCK!',
      'First find 3 shells on the island: the lock needs them. Then answer its questions. SQUAWK!',
    ],
    shell: '🐚 A shell! Keep looking.',
    boxDone: '🔑 The box opens: the boat key! Walk to the boat.',
  };

  window.GAME = {
    id: 'starter-island',
    type: 'first-person-3d',
    world: 'starter-island',
    mechanics: ['interaction', 'inventory', 'objectives', 'dialogue', 'puzzles', 'world-objects', 'npcs', 'music'],
    title: W.title, subtitle: W.subtitle, description: W.intro,
    grade: 'any', subject: 'Computing · starter template',
    player: { health: 100 },
    vars: { playerName: 'Explorer' },
    ui: { accent: '#ffd166', askName: true },
    characters: { default: 'leo', title: 'Your explorer', choices: [
      { id: 'leo', label: 'Leo', text: 'Map reader', look: { body: 'm', skin: '#f1c27d', hair: '#3b2a1a', hairStyle: 'spiky', shirt: '#9fc9ef', pants: '#34495e', shoes: '#7a5232', accent: '#ffd166', scarf: '#1c7ed6' } },
      { id: 'mia', label: 'Mia', text: 'Problem solver', look: { body: 'f', skin: '#e0ac69', hair: '#6b3e26', hairStyle: 'ponytail', shirt: '#ff8787', pants: '#5c4a2e', shoes: '#7a5232', accent: '#ffd166', scarf: '#20c997' } },
    ] },
    music: { bpm: 100, root: 196, mode: 'major', prog: [0, 4, 5, 3], wave: 'triangle', arpWave: 'sine', drums: true, volume: 0.05 },
    items: { shell: { name: 'Shell', icon: '🐚', color: '#f783ac' } },

    entities: [
      { id: 'parrot', type: 'npc', model: 'parrot', name: 'Pip', at: 'parrotSpot', faceRange: 8, interact: [{ type: 'talk', lines: W.pip }] },
      { id: 'shell1', type: 'collectible', model: 'cache', item: 'shell', at: 'shell1', name: 'shell', points: 5, hover: 0, spin: 0, bob: 0, message: W.shell, light: { color: '#ffd166', range: 2.5, intensity: 0.5 } },
      { id: 'shell2', type: 'collectible', model: 'cache', item: 'shell', at: 'shell2', name: 'shell', points: 5, hover: 0, spin: 0, bob: 0, message: W.shell, light: { color: '#ffd166', range: 2.5, intensity: 0.5 } },
      { id: 'shell3', type: 'collectible', model: 'cache', item: 'shell', at: 'shell3', name: 'shell', points: 5, hover: 0, spin: 0, bob: 0, message: W.shell, light: { color: '#ffd166', range: 2.5, intensity: 0.5 } },
      { id: 'lockBox', type: 'terminal', model: 'supplyBox', name: 'locked box', at: 'boxSpot',
        interact: { type: 'puzzle', puzzle: 'boxQuiz', prompt: 'Open the', if: { has: 'shell', count: 3 } } },
    ],

    puzzles: {
      boxQuiz: {
        type: 'quiz', retry: true, pass: 0, points: 20, revealPoints: 10, kind: 'challenge', wide: true,
        title: '🔒 The Locked Box', story: 'The lock shows two questions. Answer both to open it.',
        reward: '🔑 The boat key',
        why: 'Input devices put information INTO a computer; output devices show the result. A strong password is long and mixes kinds of characters.',
        questions: [
          { type: 'choice', question: 'Which one is an INPUT device?', options: ['Monitor', 'Keyboard', 'Speaker'], correct: 1,
            hint: 'Input = you put something IN.', why: 'You type on the keyboard: information goes IN.' },
          { type: 'choice', question: 'Which password is the strongest?', options: ['password', 'pip123', 'Blue!Parrot7Sails'], correct: 2,
            hint: 'Longer, with mixed characters.', why: 'Long passwords with capitals, numbers and symbols are hardest to guess.' },
        ],
        onSolve: [{ do: 'flag', set: 'boxOpen' }, { do: 'say', text: W.boxDone, style: 'good' }],
      },
    },

    objectives: [
      { id: 'meetPip', type: 'talk', target: 'parrot', title: 'Talk to Pip the parrot', points: 0, hints: ['Pip is on a perch near the palm trees.'] },
      { id: 'shells', type: 'collect', item: 'shell', count: 3, title: 'Find 3 shells', points: 0, hints: ['One is in the grass, one near the pool, one on the beach.'] },
      { id: 'box', type: 'solve', puzzle: 'boxQuiz', target: 'lockBox', title: 'Open the locked box', points: 0, hints: ['Walk to the box and press E.'] },
      { id: 'sail', type: 'reach', zone: 'dock', title: 'Walk to the boat', points: 0, hints: ['The boat is at the east end of the beach.'] },
    ],
    ordered: true,
  };
})();
