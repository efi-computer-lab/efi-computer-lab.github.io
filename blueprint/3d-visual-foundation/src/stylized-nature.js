/* 3D Visual Foundation · stylized-nature.js — rounded, colourful nature models in the style of
   blueprint/3d-visual-foundation/ART_DIRECTION.md. Load AFTER the Game Kit model libraries: models with the same name
   replace the older flat ones, so every world that already places 'palm' or 'bush' gets the new look with no other change.
   Front = +z, standing on y = 0, sizes in metres. Needs GK.Geo (src/gk-geo.js: smooth normals, blob, addData).
     palm {h, lean, color} · bush {s, color, flower, lite} · fern {color} · bigTree {h, color, trunk, glow}
     kenneyTree {h, color} · canopy {s, color} (a big leafy clump for the top edge of jungle walls)
     grassTuft {s, small} · flowerPatch {color} · pebbles {color} · seaRock {s, color} · cliffRock {h, color}
     mountain {h, r, color, snow} · island {r, color} (a little sea islet with palms) · skyCloud {seed} (for sky props)
   Kenney models (CC0, see ASSET_CREDITS.md) come from GK.ModelData (assets/kenney-models.js); when that file is not
   loaded, grassTuft / kenneyTree / skyCloud fall back to hand-built shapes, so nothing breaks. */
(function () {
  'use strict';
  const U = GK.util, V = GK.vec, M = GK.Models, G = () => new GK.Geo();
  const dk = (c, f) => U.shade(c, f == null ? 0.7 : f);
  const seedOf = (...v) => Math.abs(Math.round(v.reduce((a, x) => a * 31 + (typeof x === 'string' ? x.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) : (x || 0) * 997), 7))) % 2147483647 || 1;
  const data = name => GK.ModelData && GK.ModelData[name];
  /** Shift the greens of an imported model toward a warmer, sunnier green (Kenney greens are minty). */
  const warmGreens = (d, k) => {
    const map = {};
    for (const h of d.pal) {
      const c = U.color(h);
      if (c[1] >= c[0] && c[1] >= c[2]) map[h] = [Math.min(1, c[0] * (k || 1.35)), c[1] * 1.02, c[2] * 0.62];
    }
    return map;
  };

  /** A leafy frond along +x: a spine that rises then droops, with jagged leaflets on both sides (palms, ferns). */
  function frond(len, width, droop, col, col2) {
    const g = G(), n = 6, spine = [];
    for (let s = 0; s <= n; s++) { const u = s / n; spine.push([len * u, len * (0.28 * u - droop * u * u), 0]); }
    for (let s = 0; s < n; s++) {
      const u0 = s / n, u1 = (s + 1) / n;
      const w = u => width * Math.sin(Math.PI * Math.min(1, u * 1.08 + 0.02)) * (s % 2 ? 1 : 0.78);
      const a = spine[s], b = spine[s + 1], wa = w(u0), wb = w(u1) * 0.9;
      for (const sd of [1, -1]) {
        const ea = [a[0] + 0.12 * len / n, a[1] - wa * 0.22, a[2] + sd * wa], eb = [b[0] + 0.12 * len / n, b[1] - wb * 0.22, b[2] + sd * wb];
        let nrm = V.norm(V.cross(V.sub(b, a), V.sub(ea, a)));
        if (nrm[1] < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
        const c = sd > 0 ? col : col2;
        g.triN(a, b, eb, nrm, c).triN(a, eb, ea, nrm, c);
      }
    }
    return g;
  }

  // ----- palms: curved ringed trunk, drooping two-tone fronds, coconuts -----
  M.add('palm', o => {
    const h = o.h || 7, lean = o.lean == null ? 0.18 : o.lean, c = o.color || '#3fae49', g = G(), rnd = U.rng(seedOf(h, lean, c));
    const n = 6, pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([lean * h * t * t, h * t, 0]); }
    for (let i = 0; i < n; i++) {   // ringed segments: each one a little wider at the bottom
      const a = pts[i], b = pts[i + 1], r0 = 0.27 - i * 0.018, r1 = 0.27 - (i + 1) * 0.018, d = V.sub(b, a), len = V.len(d), ang = Math.atan2(d[0], d[1]);
      g.add(G().cyl(0, 0, 0, r0 * 1.06, len + 0.03, i % 2 ? '#a57d50' : '#8f6a42', { seg: 7, rTop: r1 * 0.9, noBottom: true, noTop: i < n - 1 }).rotZ(-ang).move(a[0], a[1], a[2]));
    }
    const top = pts[n], k = 8;
    for (let i = 0; i < k; i++) {
      const yaw = i / k * Math.PI * 2 + rnd() * 0.35, L = 2.5 + rnd() * 0.7, light = U.shade(c, 1.12 + rnd() * 0.1);
      g.add(frond(L, 0.42, 0.75 + rnd() * 0.35, light, dk(c, 0.88)).rotZ(0.1 - rnd() * 0.15).rotY(yaw).move(top[0], top[1] - 0.05, top[2]));
    }
    for (let i = 0; i < 3; i++) { const a = i * 2.1; g.sphere(top[0] + Math.cos(a) * 0.2, top[1] - 0.26 - (i % 2) * 0.08, top[2] + Math.sin(a) * 0.2, 0.17, i % 2 ? '#6b4a2b' : '#5c3d22', { seg: 6, rings: 4 }); }
    return g;
  });

  // ----- bushes and hedges: soft lumpy leaf balls, sometimes flowering -----
  M.add('bush', o => {
    const s = o.s || 1, c = o.color || '#2f8f3e', seed = seedOf(s, c, o.flower || ''), g = G();
    const q = { seed, rough: 0.24, seg: 7, rings: o.lite ? 4 : 5 };
    g.blob(0, 0.58 * s, 0, 0.8 * s, c, q).blob(0.58 * s, 0.42 * s, 0.18 * s, 0.56 * s, dk(c, 1.16), Object.assign({}, q, { seed: seed + 1 }));
    if (!o.lite) g.blob(-0.55 * s, 0.4 * s, -0.12 * s, 0.52 * s, dk(c, 0.9), Object.assign({}, q, { seed: seed + 2 }));
    if (o.flower) {
      const rnd = U.rng(seed + 3);
      for (let i = 0; i < (o.lite ? 3 : 5); i++) {
        const a = rnd() * Math.PI * 2, y = 0.5 + rnd() * 0.6;
        g.sphere(Math.cos(a) * 0.62 * s, y * s, Math.sin(a) * 0.62 * s + 0.15 * s, 0.1 * s, o.flower, { seg: 6, rings: 4, glow: 0.15 }).sphere(Math.cos(a) * 0.62 * s, y * s, Math.sin(a) * 0.62 * s + 0.2 * s, 0.045 * s, '#ffe066', { seg: 4, rings: 3, glow: 0.3 });
      }
    }
    return g;
  });
  M.add('canopy', o => {   // a big leafy clump: hides the flat top edge of a jungle wall
    const s = o.s || 1.6, c = o.color || '#2f7d32', seed = seedOf(s, c, 'canopy'), q = { seed, rough: 0.28, seg: 7, rings: 4, squash: 0.8 };
    return G().blob(0, 0, 0, s, c, q).blob(s * 0.75, s * 0.25, s * 0.2, s * 0.68, dk(c, 1.18), Object.assign({}, q, { seed: seed + 1 }));
  });
  M.add('fern', o => {
    const c = o.color || '#40c057', g = G(), rnd = U.rng(seedOf(c, 'fern'));
    for (let k = 0; k < 7; k++) g.add(frond(0.95 + rnd() * 0.3, 0.16, 0.55, U.shade(c, 1.05), dk(c, 0.85)).rotY(k / 7 * Math.PI * 2 + rnd() * 0.4).move(0, 0.05, 0));
    return g;
  });

  // ----- trees -----
  M.add('bigTree', o => {
    const h = o.h || 9, c = o.color || '#2f9e44', tr = o.trunk || '#7a5636', g = G(), seed = seedOf(h, c), rnd = U.rng(seed);
    g.cyl(0, 0, 0, h * 0.065, h * 0.58, tr, { seg: 7, rTop: h * 0.035, noBottom: true, noTop: true });
    for (let i = 0; i < 3; i++) g.add(G().cone(0, 0, 0, h * 0.035, h * 0.16, dk(tr, 0.9), { seg: 6, noBottom: true }).rotZ(1.0).rotY(i * Math.PI * 2 / 3 + 0.4).move(0, h * 0.06, 0));   // root flares
    const q = { rough: 0.22, seg: 7, rings: 5, squash: 0.82 };
    g.blob(0, h * 0.64, 0, h * 0.27, c, Object.assign({ seed }, q));
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + rnd() * 0.6, d = h * (0.17 + rnd() * 0.05), y = h * (0.56 + rnd() * 0.12);
      g.blob(Math.cos(a) * d, y, Math.sin(a) * d, h * (0.15 + rnd() * 0.05), dk(c, 0.88 + rnd() * 0.12), Object.assign({ seed: seed + i + 1 }, q));
    }
    g.blob(h * 0.04, h * 0.84, -h * 0.02, h * 0.17, dk(c, 1.18), Object.assign({ seed: seed + 9 }, q));
    if (o.glow) g.sphere(-h * 0.14, h * 0.7, h * 0.2, h * 0.06, o.glow, { glow: 1, seg: 6, rings: 4 }).sphere(h * 0.18, h * 0.55, -h * 0.12, h * 0.05, o.glow, { glow: 1, seg: 6, rings: 4 });
    return g;
  });
  M.add('kenneyTree', o => {   // Kenney Mini Arena tree (CC0), scaled to h metres, greens warmed up
    const h = o.h || 6, d = data('kenney-tree');
    if (!d) return M.get('bigTree')({ h, color: o.color });
    const s = h / 1.917;
    return G().addData(d, { scale: s, colors: warmGreens(d, 1.3) });
  });

  // ----- ground cover -----
  M.add('grassTuft', o => {   // Kenney grass (CC0), tinted to match the island grass
    const s = o.s || 1.7, d = data(o.small ? 'kenney-grass-small' : 'kenney-grass');
    if (!d) { const g = G(); for (let i = 0; i < 5; i++) g.add(G().cone(0, 0, 0, 0.05, 0.35, '#5fae46', { seg: 4 }).rotZ((i - 2) * 0.25).rotY(i * 1.3)); return g.scale(s); }
    return G().addData(d, { scale: s, colors: warmGreens(d, 1.45) });
  });
  M.add('flowerPatch', o => {
    const c = o.color || '#ff6b6b', g = G(), rnd = U.rng(seedOf(c, 'flowers'));
    for (let i = 0; i < 4; i++) {
      const x = (rnd() - 0.5) * 0.7, z = (rnd() - 0.5) * 0.7, hh = 0.18 + rnd() * 0.15;
      g.box(x, 0, z, 0.02, hh, 0.02, '#3f8f3a').sphere(x, hh + 0.03, z, 0.065, c, { seg: 5, rings: 3, glow: 0.12 }).sphere(x, hh + 0.06, z + 0.03, 0.025, '#fff3bf', { seg: 4, rings: 2, glow: 0.3 });
    }
    return g;
  });
  M.add('pebbles', o => {
    const c = o.color || '#b8ab98', g = G(), rnd = U.rng(seedOf(c, 'pebbles'));
    for (let i = 0; i < 4; i++) g.blob((rnd() - 0.5) * 0.8, 0.02, (rnd() - 0.5) * 0.8, 0.07 + rnd() * 0.07, dk(c, 0.85 + rnd() * 0.3), { seed: i + 3, rough: 0.4, seg: 5, rings: 3, flat: true, squash: 0.55 });
    return g;
  });

  // ----- rocks and landforms -----
  M.add('seaRock', o => {
    const s = o.s || 1, c = o.color || '#8d8f96';
    return G().blob(0, 0.3 * s, 0, 1.05 * s, c, { seed: 11, rough: 0.32, seg: 7, rings: 5, flat: true, squash: 0.62 }).blob(0.85 * s, 0.2 * s, 0.4 * s, 0.6 * s, dk(c, 1.12), { seed: 12, rough: 0.3, seg: 6, rings: 4, flat: true, squash: 0.7 });
  });
  M.add('cliffRock', o => {   // a pile of rounded boulders (hill tops, cave mouths)
    const h = o.h || 4, c = o.color || '#8a7f73', q = { rough: 0.3, seg: 7, rings: 5, flat: true };
    return G().blob(0, h * 0.35, 0, h * 0.5, c, Object.assign({ seed: 21, squash: 0.85 }, q))
      .blob(h * 0.42, h * 0.22, h * 0.2, h * 0.33, dk(c, 0.86), Object.assign({ seed: 22 }, q))
      .blob(-h * 0.38, h * 0.18, -h * 0.15, h * 0.3, dk(c, 1.1), Object.assign({ seed: 23 }, q));
  });
  M.add('mountain', o => {
    const h = o.h || 40, r = o.r || 30, c = o.color || '#4a5568';
    return G().cone(0, 0, 0, r, h, c, { seg: 14 }).cone(r * 0.35, 0, r * 0.2, r * 0.7, h * 0.7, dk(c, 0.9), { seg: 12 }).cone(0, h * 0.62, 0, r * 0.38, h * 0.38, o.snow || '#edf2f7', { seg: 14 });
  });
  M.add('island', o => {   // a small sea islet: sand rim, grassy hill, rocks and two palms
    const r = o.r || 5, c = o.color || '#5aa84a', g = G();
    g.cyl(0, -1, 0, r * 1.15, 1.25, '#efd9a0', { seg: 14, rTop: r, noBottom: true });
    g.blob(0, 0.2, 0, r * 0.75, c, { seed: 31, rough: 0.2, seg: 9, rings: 5, squash: 0.45 });
    g.blob(r * 0.6, 0.4, r * 0.5, r * 0.2, '#8d8f96', { seed: 32, rough: 0.3, seg: 6, rings: 4, flat: true });
    g.add(M.get('palm')({ h: r * 0.75, lean: 0.2 }).move(-r * 0.3, r * 0.25, 0.1));
    g.add(M.get('palm')({ h: r * 0.6, lean: 0.12 }).rotY(2).move(r * 0.25, r * 0.2, -r * 0.3));
    return g;
  });

  // ----- sky -----
  M.add('skyCloud', o => {   // a soft cumulus: a big puff on a flat, slightly bluish base (about 1 m wide: scale it up)
    const rnd = U.rng(seedOf(o.seed || 1, 'cloud')), g = G(), q = { rough: 0.12, seg: 9, rings: 6 };
    g.blob(0, 0.32, 0, 0.36, '#ffffff', Object.assign({ seed: 41 }, q));
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + rnd(), d = 0.28 + rnd() * 0.12, r = 0.2 + rnd() * 0.1;
      g.blob(Math.cos(a) * d * 1.3, 0.12 + rnd() * 0.12, Math.sin(a) * d * 0.7, r, i % 2 ? '#f4f8ff' : '#ffffff', Object.assign({ seed: 42 + i }, q));
    }
    g.blob(0, 0.05, 0, 0.5, '#dfe8f5', { seed: 49, rough: 0.08, seg: 10, rings: 5, squash: 0.25 });   // flat shaded base
    return g;
  });
})();
