/* 3D Visual Foundation · stylized-characters.js — a rounded, friendly explorer for the Game Kit's animated character.
   Replaces the boxy 'heroPart' / 'hero' models (load AFTER assets/models/people.js). Same joints and sizes as GK.HERO, so
   walking, aiming and the third-person camera work unchanged. Big round head and eyes, soft limbs, short sleeves, boots,
   an optional scarf (look.scarf, default the accent colour) and backpack (look.pack: true | '#colour').
   A character look: { body: 'm' | 'f', skin, hair, hairStyle: 'short' | 'spiky' | 'long' | 'ponytail', shirt, pants, shoes,
                       accent, scarf, pack, skirt } */
(function () {
  'use strict';
  const M = GK.Models, G = () => new GK.Geo(), U = GK.util, V = GK.vec;
  const dk = (c, f) => U.shade(c, f == null ? 0.7 : f);
  const HERO = GK.HERO || (GK.HERO = { hip: 0.86, shoulder: 1.38, neck: 1.42, arm: 0.68, height: 1.8 });
  const D = { body: 'm', skin: '#e0ac69', hair: '#3b2a1a', hairStyle: 'short', shirt: '#2f80ed', pants: '#2d3436', shoes: '#6b4a2b', accent: '#4cc9f0' };
  const L = o => Object.assign({}, D, o);
  const shoulderX = o => (o.body === 'f' ? 0.255 : 0.285);
  const S = { seg: 10, rings: 7 };

  /** A rounded limb from a to b: a smooth tapered cylinder with ball ends. */
  function limb(g, a, b, r0, r1, col) {
    const d = V.sub(b, a), len = V.len(d), z = V.norm(d);
    const s = G().cyl(0, 0, 0, r0, len, col, { seg: 9, rTop: r1, noBottom: true });
    // turn +y onto the limb direction
    const ang = Math.acos(U.clamp(z[1], -1, 1)), ax = V.norm(V.cross([0, 1, 0], z));
    if (ang > 1e-4 && V.len(V.cross([0, 1, 0], z)) > 1e-6) {
      const c = Math.cos(ang), sn = Math.sin(ang), k = ax, rot = v => {   // Rodrigues
        const kv = V.cross(k, v), kd = V.dot(k, v);
        return [v[0] * c + kv[0] * sn + k[0] * kd * (1 - c), v[1] * c + kv[1] * sn + k[1] * kd * (1 - c), v[2] * c + kv[2] * sn + k[2] * kd * (1 - c)];
      };
      s.map(rot, rot);
    } else if (z[1] < 0) s.rotX(Math.PI);
    g.add(s.move(a[0], a[1], a[2]));
    return g.sphere(b[0], b[1], b[2], r1, col, { seg: 8, rings: 5 });
  }

  function torso(o) {
    const g = G(), f = o.body === 'f', w = f ? 0.2 : 0.225, top = HERO.shoulder + 0.03, shirt = o.shirt;
    g.add(G().cyl(0, 0, 0, w * 0.9, top - HERO.hip, shirt, { seg: 12, rTop: w * 1.08 }).scale(1, 1, 0.62).move(0, HERO.hip, 0));
    g.add(G().sphere(0, 0, 0, w * 1.08, dk(shirt, 1.06), S).scale(1, 0.38, 0.62).move(0, top, 0));                           // rounded shoulders
    g.add(G().cyl(0, 0, 0, w * 0.93, 0.07, dk(o.pants, 0.75), { seg: 12 }).scale(1, 1, 0.66).move(0, HERO.hip, 0));         // belt
    g.box(0, HERO.hip + 0.012, w * 0.6, 0.07, 0.05, 0.02, '#e9c46a');                                                        // buckle
    g.add(G().cyl(0, 0, 0, w * 0.95, 0.16, o.pants, { seg: 12 }).scale(1, 1, 0.66).move(0, HERO.hip - 0.12, 0));   // hips
    g.box(f ? 0.07 : 0.09, HERO.hip + 0.34, w * 0.62 + 0.005, 0.06, 0.06, 0.012, o.accent, { glow: 1 });                    // glowing badge
    const scarf = o.scarf || o.accent;
    g.add(G().cyl(0, 0, 0, 0.115, 0.08, scarf, { seg: 12 }).scale(1, 1, 0.9).move(0, top - 0.01, 0));                       // scarf
    g.add(G().box(0, -0.16, 0, 0.09, 0.17, 0.03, dk(scarf, 0.9)).rotX(-0.15).move(0.05, top + 0.02, 0.1));                  // scarf tail
    if (o.pack !== false) {
      const p = typeof o.pack === 'string' ? o.pack : '#8b5a2b';
      g.box(0, HERO.hip + 0.12, -0.2, 0.3, 0.36, 0.14, p, { top: dk(p, 1.12) });
      g.blob(0, HERO.hip + 0.47, -0.2, 0.15, dk(p, 1.08), { seed: 5, rough: 0.05, seg: 8, rings: 5, squash: 0.55 });          // rolled top
      g.box(0, HERO.hip + 0.18, -0.28, 0.2, 0.14, 0.04, dk(p, 0.85)).box(0, HERO.hip + 0.3, -0.3, 0.05, 0.05, 0.02, '#e9c46a');  // pocket + clasp
      g.add(G().cyl(0, 0, 0, 0.065, 0.32, '#c9b27a', { seg: 8 }).rotZ(Math.PI / 2).move(-0.16, HERO.hip + 0.05, -0.2));     // bedroll
      for (const x of [-0.1, 0.1]) g.box(x, HERO.hip + 0.12, w * 0.6, 0.04, 0.42, 0.015, dk(p, 0.8));                          // straps
    }
    if (o.skirt) g.add(G().cyl(0, 0, 0, w * 1.25, 0.3, dk(o.pants, 1.15), { seg: 12, rTop: w * 0.95 }).scale(1, 1, 0.75).move(0, HERO.hip - 0.26, 0));
    return g;
  }
  function head(o) {
    const g = G(), hs = o.hairStyle, h = o.hair, s = o.skin, R = 0.19, cy = 0.21;
    g.cyl(0, -0.03, 0, 0.065, 0.1, dk(s, 0.92), { seg: 8 });                                                                  // neck
    g.add(G().sphere(0, 0, 0, R, s, S).scale(1, 1.02, 0.95).move(0, cy, 0));                                                 // head
    for (const x of [-1, 1]) g.add(G().sphere(0, 0, 0, 0.045, dk(s, 0.95), { seg: 7, rings: 5 }).scale(0.6, 1, 0.9).move(x * R * 0.98, cy, 0));   // ears
    for (const x of [-0.072, 0.072]) {                                                                                        // big friendly eyes
      g.add(G().sphere(0, 0, 0, 0.05, '#ffffff', { seg: 8, rings: 6 }).scale(0.85, 1.05, 0.45).move(x, cy + 0.02, R * 0.88));
      g.add(G().sphere(0, 0, 0, 0.032, '#3b2a1a', { seg: 8, rings: 5 }).scale(0.9, 1.1, 0.5).move(x, cy + 0.015, R * 0.93));
      g.sphere(x + 0.012, cy + 0.035, R * 0.96, 0.01, '#ffffff', { seg: 4, rings: 3, glow: 0.8 });                            // sparkle
      g.add(G().box(0, 0, 0, 0.07, 0.016, 0.02, dk(h, 0.95)).rotZ(x > 0 ? -0.12 : 0.12).move(x, cy + 0.095, R * 0.88));      // eyebrows
    }
    g.add(G().sphere(0, 0, 0, 0.022, dk(s, 0.9), { seg: 6, rings: 4 }).move(0, cy - 0.025, R * 0.97));                      // nose
    g.add(G().box(0, 0, 0, 0.06, 0.014, 0.02, '#9e4a3c').move(0, cy - 0.075, R * 0.9));                                     // smile
    g.add(G().sphere(0, 0, 0, 0.026, '#f08a8a', { seg: 6, rings: 4 }).scale(1.2, 0.7, 0.4).move(-0.11, cy - 0.04, R * 0.82))
      .add(G().sphere(0, 0, 0, 0.026, '#f08a8a', { seg: 6, rings: 4 }).scale(1.2, 0.7, 0.4).move(0.11, cy - 0.04, R * 0.82));   // rosy cheeks
    // hair: a cap over the top and back, then the style
    g.add(G().sphere(0, 0, 0, R * 1.06, h, S).scale(1, 0.78, 1).move(0, cy + 0.05, -0.02));
    g.add(G().sphere(0, 0, 0, R * 1.02, h, S).scale(1, 0.95, 0.7).move(0, cy - 0.02, -0.07));
    g.add(G().blob(0, 0, 0, 0.11, dk(h, 1.1), { seed: 3, rough: 0.2, seg: 8, rings: 5 }).scale(1.5, 0.55, 0.7).rotX(0.35).move(0.03, cy + 0.15, R * 0.62));   // fringe
    if (hs === 'spiky' || hs === 'short') {
      const n = hs === 'spiky' ? 9 : 5, len = hs === 'spiky' ? 0.16 : 0.09;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, rx = Math.cos(a) * 0.09, rz = Math.sin(a) * 0.09 - 0.02;
        g.add(G().cone(0, 0, 0, 0.055, len, i % 2 ? h : dk(h, 1.12), { seg: 6 }).rotX(-0.5 + Math.sin(a) * 0.4).rotZ(-Math.cos(a) * 0.55).move(rx, cy + 0.17, rz));
      }
      g.add(G().cone(0, 0, 0, 0.06, len * 1.1, dk(h, 1.12), { seg: 6 }).rotX(-0.35).move(0.02, cy + 0.2, 0.03));
    } else if (hs === 'long') {
      g.add(G().blob(0, 0, 0, 0.2, h, { seed: 7, rough: 0.1, seg: 9, rings: 6 }).scale(1, 1.5, 0.45).move(0, cy - 0.15, -0.12));
      for (const x of [-1, 1]) g.add(G().blob(0, 0, 0, 0.07, h, { seed: 8, rough: 0.1, seg: 7, rings: 5 }).scale(0.8, 2.4, 1).move(x * 0.17, cy - 0.09, 0.03));
    } else if (hs === 'ponytail') {
      g.add(G().cyl(0, 0, 0, 0.045, 0.05, o.accent, { seg: 8 }).rotX(1.3).move(0, cy + 0.06, -0.19));                          // hair band
      limb(g, [0, cy + 0.06, -0.22], [0, cy - 0.3, -0.3], 0.07, 0.04, h);                                                      // the tail
    }
    return g;
  }
  function arm(o, right) {
    const g = G(), s = o.shirt, sk = o.skin;
    g.sphere(0, -0.03, 0, 0.085, dk(s, 1.04), { seg: 8, rings: 5 });                                                         // shoulder ball
    limb(g, [0, -0.03, 0], [0, -0.3, 0], 0.08, 0.072, s);                                                                     // short sleeve
    g.cyl(0, -0.31, 0, 0.074, 0.04, dk(s, 0.8), { seg: 9 });                                                                  // cuff
    limb(g, [0, -0.3, 0], [0, -HERO.arm + 0.06, 0], 0.056, 0.05, sk);                                                         // forearm
    if (right) g.cyl(0, -0.5, 0, 0.06, 0.04, '#5c4a2e', { seg: 8 });                                                          // wrist band
    return g.blob(0, -HERO.arm + 0.02, 0.005, 0.062, sk, { seed: right ? 2 : 3, rough: 0.08, seg: 8, rings: 5 });             // hand
  }
  function leg(o) {
    const g = G(), p = o.pants, sh = o.shoes;
    limb(g, [0, 0, 0], [0, -0.42, 0], 0.095, 0.082, p);                                                                       // thigh (shorts)
    g.cyl(0, -0.44, 0, 0.084, 0.04, dk(p, 0.85), { seg: 9 });                                                                 // hem
    limb(g, [0, -0.42, 0], [0, -HERO.hip + 0.17, 0], 0.062, 0.056, o.skin);                                                   // shin
    g.cyl(0, -HERO.hip + 0.07, 0.01, 0.075, 0.17, sh, { seg: 9, rTop: 0.068 });                                               // boot cuff
    g.add(G().blob(0, 0, 0, 0.1, dk(sh, 1.08), { seed: 4, rough: 0.05, seg: 9, rings: 5 }).scale(0.85, 0.55, 1.45).move(0, -HERO.hip + 0.06, 0.05));   // boot toe
    return g.box(0, -HERO.hip, 0.04, 0.17, 0.035, 0.29, dk(sh, 0.6));                                                         // sole
  }
  function part(name, o) {
    if (name === 'torso') return torso(o);
    if (name === 'head') return head(o);
    if (name === 'armL') return arm(o, false);
    if (name === 'armR') return arm(o, true);
    return leg(o);
  }

  M.add('heroPart', look => { const o = L(look); return part(o.part || 'torso', o); });
  M.add('hero', look => {
    const o = L(look), g = torso(o), sx = shoulderX(o);
    g.add(head(o).move(0, HERO.neck, 0));
    g.add(arm(o, false).move(sx, HERO.shoulder, 0)).add(arm(o, true).move(-sx, HERO.shoulder, 0));
    g.add(leg(o).move(-0.105, HERO.hip, 0)).add(leg(o).move(0.105, HERO.hip, 0));
    return g;
  });
  GK.heroShoulderX = o => shoulderX(L(o));
})();
