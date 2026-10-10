/* 3D Visual Foundation · gk-core-math.js — the small part of the Game Kit core that the renderer, GK.Geo and the
   model libraries need: colour helpers, seeded random numbers, vectors, column-major mat4, a model registry with a
   shape cache, and GK.HERO joint heights. Copied from core/core.js and assets/models/lowpoly.js of the Game Kit.
   Load it FIRST in a project that does NOT already use the Game Kit (it never overwrites anything that exists). */
(function () {
  'use strict';
  const GK = window.GK = window.GK || {};

  if (!GK.util) {
    const U = GK.util = {};
    U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    U.lerp = (a, b, t) => a + (b - a) * t;
    U.rad = d => d * Math.PI / 180;
    U.list = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
    U.isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof RegExp);
    U.merge = function (...objs) {
      const out = {};
      for (const o of objs) {
        if (!U.isObj(o)) continue;
        for (const k in o) { const v = o[k]; if (v === undefined) continue; out[k] = U.isObj(v) ? U.merge(U.isObj(out[k]) ? out[k] : {}, v) : v; }
      }
      return out;
    };
    const cache = {};
    /** '#rgb' | '#rrggbb' | 0xrrggbb | [r,g,b] (0..1)  →  [r,g,b] (0..1) */
    U.color = function (c, fallback) {
      if (c == null) c = fallback == null ? '#ffffff' : fallback;
      if (Array.isArray(c)) return c;
      if (typeof c === 'number') return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
      if (cache[c]) return cache[c];
      let s = String(c).trim().replace('#', '');
      if (s.length === 3) s = s.split('').map(ch => ch + ch).join('');
      const n = parseInt(s, 16);
      return (cache[c] = isNaN(n) ? [1, 0, 1] : U.color(n));
    };
    U.shade = (c, f) => { const r = U.color(c); return [Math.min(1, r[0] * f), Math.min(1, r[1] * f), Math.min(1, r[2] * f)]; };
    U.css = c => { const r = U.color(c); return 'rgb(' + r.map(v => Math.round(v * 255)).join(',') + ')'; };
    U.yaw = r => (typeof r === 'string' ? U.rad({ s: 0, e: 90, n: 180, w: -90 }[r[0].toLowerCase()] || 0) : U.rad(r || 0));
    /** Deterministic pseudo-random numbers (same look every run). */
    U.rng = function (seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  }

  if (!GK.vec) {
    GK.vec = {
      add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
      sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
      scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
      dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
      cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
      len: a => Math.hypot(a[0], a[1], a[2]),
      dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
      norm: a => { const l = Math.hypot(a[0], a[1], a[2]); return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0]; },
    };
  }

  if (!GK.mat4) {
    const V = GK.vec;
    GK.mat4 = {
      create: () => new Float32Array(16),
      perspective(out, fovy, aspect, near, far) {
        const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
        out.fill(0);
        out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
        return out;
      },
      lookAt(out, eye, target, up) {
        const z = V.norm(V.sub(eye, target)), x = V.norm(V.cross(up, z)), y = V.cross(z, x);
        out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
        out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
        out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
        out[12] = -V.dot(x, eye); out[13] = -V.dot(y, eye); out[14] = -V.dot(z, eye); out[15] = 1;
        return out;
      },
      multiply(out, a, b) {
        const r = new Float32Array(16);
        for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) r[c * 4 + row] = a[row] * b[c * 4] + a[4 + row] * b[c * 4 + 1] + a[8 + row] * b[c * 4 + 2] + a[12 + row] * b[c * 4 + 3];
        out.set(r);
        return out;
      },
      /** Model matrix: turn by yaw (around y), tilt the front (+z) up by pitch, and (optional) roll around the front axis. */
      model(out, pos, yaw, s, pitch, roll) {
        const c = Math.cos(yaw), n = Math.sin(yaw);
        out.fill(0);
        if (roll) {
          const ca = Math.cos(-(pitch || 0)), sa = Math.sin(-(pitch || 0)), cr = Math.cos(roll), sr = Math.sin(roll);
          const X = [c, 0, -n], Y = [n * sa, ca, c * sa], Z = [n * ca, -sa, c * ca];
          for (let i = 0; i < 3; i++) { out[i] = (cr * X[i] + sr * Y[i]) * s[0]; out[4 + i] = (-sr * X[i] + cr * Y[i]) * s[1]; out[8 + i] = Z[i] * s[2]; }
        } else if (pitch) {
          const ca = Math.cos(-pitch), sa = Math.sin(-pitch);
          out[0] = c * s[0]; out[2] = -n * s[0];
          out[4] = n * sa * s[1]; out[5] = ca * s[1]; out[6] = c * sa * s[1];
          out[8] = n * ca * s[2]; out[9] = -sa * s[2]; out[10] = c * ca * s[2];
        } else {
          out[0] = c * s[0]; out[2] = -n * s[0]; out[5] = s[1]; out[8] = n * s[2]; out[10] = c * s[2];
        }
        out[12] = pos[0]; out[13] = pos[1]; out[14] = pos[2]; out[15] = 1;
        return out;
      },
    };
  }

  if (!GK.Models) {
    const items = {}, shapes = {};
    GK.Models = {
      kind: 'model', items,
      add(name, def) { items[name] = def; return def; },
      has: name => Object.prototype.hasOwnProperty.call(items, name),
      get(name) { if (!GK.Models.has(name)) throw new Error('Unknown model "' + name + '"'); return items[name]; },
      /** {key, geo, bounds, top} for a model name + look, built once and cached. */
      shape(model, look, ownerId) {
        const key = (typeof model === 'function' ? 'fn:' + ownerId : model) + JSON.stringify(look || {});
        if (!shapes[key]) {
          const geo = typeof model === 'function' ? model(look || {}) : GK.Models.get(model)(look || {});
          shapes[key] = { key, geo, bounds: geo.bounds(), top: geo.topColor() };
        }
        return shapes[key];
      },
    };
  }
  if (!GK.HERO) GK.HERO = { hip: 0.86, shoulder: 1.38, neck: 1.42, arm: 0.68, height: 1.8 };
})();
