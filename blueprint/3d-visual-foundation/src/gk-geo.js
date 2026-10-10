/* Game Kit · game-types/_spatial/geometry.js  (3D Visual Foundation edition — blueprint/3d-visual-foundation/src/gk-geo.js)
   GK.Geo builds low-poly geometry as plain arrays (positions, normals, colours, glow).
   Pure data, no WebGL: the 3D renderer uploads it, the top-down view reads its bounds and top colour.
   Primitives: box (y = bottom), cyl/cone (y = bottom), sphere (y = centre), plane; plus rotX/rotY/rotZ/move/scale/add.
   Rounded look: spheres and cylinders/cones with 6+ sides get SMOOTH normals (soft round shading with a low-poly
   outline); pass {flat: true} for faceted ones. Organic shapes: blob (a lumpy sphere: bushes, rocks with {flat: true}).
   Imported models: addData(GK.ModelData[name], {scale, at, tint}) appends a model converted by tools/glb_to_geo.py. */
(function () {
  'use strict';
  const U = GK.util, V = GK.vec;

  // ---------- geometry builder ----------
  class Geo {
    constructor() { this.p = []; this.n = []; this.c = []; this.g = []; }
    get count() { return this.p.length / 3; }

    /** One triangle. The normal is turned to point away from `center` (all primitives here are convex). */
    tri(a, b, c, col, center, glow) {
      let n = V.norm(V.cross(V.sub(b, a), V.sub(c, a)));
      if (center && V.dot(n, V.sub([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3], center)) < 0) n = [-n[0], -n[1], -n[2]];
      return this.triN(a, b, c, n, col, glow);
    }
    /** Triangle with an explicit normal. */
    triN(a, b, c, n, col, glow) {
      const k = U.color(col), gl = glow || 0;
      for (const v of [a, b, c]) {
        this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.c.push(k[0], k[1], k[2]); this.g.push(gl);
      }
      return this;
    }
    /** Triangle with one normal per corner (smooth shading). */
    triV(a, b, c, na, nb, nc, col, glow) {
      const k = U.color(col), gl = glow || 0, vs = [a, b, c], ns = [na, nb, nc];
      for (let i = 0; i < 3; i++) {
        const v = vs[i], n = ns[i];
        this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.c.push(k[0], k[1], k[2]); this.g.push(gl);
      }
      return this;
    }
    quad(a, b, c, d, col, center, glow) { return this.tri(a, b, c, col, center, glow).tri(a, c, d, col, center, glow); }

    /** Axis-aligned box. (x, z) = centre, y = BOTTOM. opts: {top, side, glow, noBottom} */
    box(x, y, z, w, h, d, col, o) {
      o = o || {};
      const x0 = x - w / 2, x1 = x + w / 2, y0 = y, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2, ctr = [x, y + h / 2, z];
      const top = o.top || col, side = o.side || col, gl = o.glow || 0;
      this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], top, ctr, gl);
      if (!o.noBottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], side, ctr, gl);
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], side, ctr, gl);
      this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], side, ctr, gl);
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], side, ctr, gl);
      this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], side, ctr, gl);
      return this;
    }
    /** Vertical cylinder (y = bottom). rTop = 0 makes a cone. opts: {glow, seg, noBottom, noTop, flat} */
    cyl(x, y, z, r, h, col, o) {
      o = o || {};
      const seg = o.seg || 8, rt = o.rTop == null ? r : o.rTop, gl = o.glow || 0, ctr = [x, y + h / 2, z];
      const smooth = !o.flat && seg >= 6, sl = r - rt, hl = Math.abs(h) || 1e-6;
      const sn = a => V.norm([Math.cos(a) * hl, sl, Math.sin(a) * hl]);   // side normal, tilted by the taper
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
        const b0 = [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], b1 = [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r];
        if (rt > 0) {
          const t0 = [x + Math.cos(a0) * rt, y + h, z + Math.sin(a0) * rt], t1 = [x + Math.cos(a1) * rt, y + h, z + Math.sin(a1) * rt];
          if (smooth) { const n0 = sn(a0), n1 = sn(a1); this.triV(b0, b1, t1, n0, n1, n1, col, gl).triV(b0, t1, t0, n0, n1, n0, col, gl); }
          else this.quad(b0, b1, t1, t0, col, ctr, gl);
          if (!o.noTop) this.triN([x, y + h, z], t0, t1, [0, 1, 0], o.top || col, gl);
        } else if (smooth) {
          const am = (a0 + a1) / 2;
          this.triV(b0, b1, [x, y + h, z], sn(a0), sn(a1), sn(am), col, gl);
        } else {
          this.tri(b0, b1, [x, y + h, z], col, ctr, gl);
        }
        if (!o.noBottom) this.triN([x, y, z], b1, b0, [0, -1, 0], col, gl);
      }
      return this;
    }
    cone(x, y, z, r, h, col, o) { return this.cyl(x, y, z, r, h, col, U.merge(o, { rTop: 0 })); }
    /** Low-poly sphere; (x, y, z) = CENTRE. */
    sphere(x, y, z, r, col, o) {
      o = o || {};
      const seg = o.seg || 8, rings = o.rings || 6, gl = o.glow || 0, ctr = [x, y, z], bump = o.bump;
      const pt = (i, j) => {
        const th = j / rings * Math.PI, ph = i / seg * Math.PI * 2, k = bump ? bump(i % seg, j) : 1;
        return [x + Math.sin(th) * Math.cos(ph) * r * k, y + Math.cos(th) * r * k, z + Math.sin(th) * Math.sin(ph) * r * k];
      };
      const nm = v => V.norm([v[0] - x, v[1] - y, v[2] - z]);
      const T = o.flat ? (a, b, c) => this.tri(a, b, c, col, ctr, gl) : (a, b, c) => this.triV(a, b, c, nm(a), nm(b), nm(c), col, gl);
      for (let j = 0; j < rings; j++) {
        for (let i = 0; i < seg; i++) {
          const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
          if (j === 0) T(a, c, d);
          else if (j === rings - 1) T(a, b, c);
          else { T(a, b, c); T(a, c, d); }
        }
      }
      return this;
    }
    /** A lumpy sphere (bushes, tree crowns; rocks with {flat: true}). (x, y, z) = centre. opts: {seed, rough 0..1, seg, rings, flat, squash} */
    blob(x, y, z, r, col, o) {
      o = o || {};
      const seg = o.seg || 8, rings = o.rings || 6, rnd = U.rng(o.seed || 1), rough = o.rough == null ? 0.18 : o.rough, k = [];
      for (let j = 0; j <= rings; j++) { k.push([]); for (let i = 0; i < seg; i++) k[j].push(j === 0 || j === rings ? 1 : 1 - rough / 2 + rnd() * rough); }
      const g = new Geo().sphere(0, 0, 0, r, col, Object.assign({}, o, { seg, rings, bump: (i, j) => k[j][i] }));
      if (o.squash) g.scale(1, o.squash, 1);
      return this.add(g.move(x, y, z));
    }
    /** Append a model converted by tools/glb_to_geo.py: data = {q: 1000, p: [...] (mm), n: [...] (x100), i: [palette index per vertex], pal: ['#hex'…]}.
        opts: {scale (number | [x,y,z]), at: [x, y, z], yaw, tint: '#hex' (multiplies), colors: {'#from': '#to'} (swap palette colours), glow} */
    addData(data, o) {
      o = o || {};
      if (!data) return this;
      const s0 = o.scale == null ? [1, 1, 1] : typeof o.scale === 'number' ? [o.scale, o.scale, o.scale] : o.scale, at = o.at || [0, 0, 0];
      const q = data.q || 1, s = [s0[0] / q, s0[1] / q, s0[2] / q];
      const c = Math.cos(o.yaw || 0), sn = Math.sin(o.yaw || 0), tint = o.tint ? U.color(o.tint) : null, swap = o.colors || {};
      const pal = data.pal.map(h => { const k = U.color(swap[h] || h); return tint ? [k[0] * tint[0], k[1] * tint[1], k[2] * tint[2]] : k; });
      const gl = o.glow || 0;
      for (let v = 0, n = data.p.length / 3; v < n; v++) {
        const px = data.p[v * 3] * s[0], py = data.p[v * 3 + 1] * s[1], pz = data.p[v * 3 + 2] * s[2];
        const nx = data.n[v * 3] / s[0], ny = data.n[v * 3 + 1] / s[1], nz = data.n[v * 3 + 2] / s[2];
        const nn = V.norm([nx * c + nz * sn, ny, -nx * sn + nz * c]), k = pal[data.i[v]];
        this.p.push(at[0] + px * c + pz * sn, at[1] + py, at[2] - px * sn + pz * c); this.n.push(nn[0], nn[1], nn[2]);
        this.c.push(k[0], k[1], k[2]); this.g.push(gl);
      }
      return this;
    }
    /** Flat upward-facing rectangle at height y (for floors, decals). */
    plane(x, y, z, w, d, col, o) {
      o = o || {};
      const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, n = o.down ? [0, -1, 0] : [0, 1, 0];
      this.triN([x0, y, z0], [x1, y, z0], [x1, y, z1], n, col, o.glow);
      this.triN([x0, y, z0], [x1, y, z1], [x0, y, z1], n, col, o.glow);
      return this;
    }
    /** Append another Geo. */
    add(geo) {
      this.p.push(...geo.p); this.n.push(...geo.n); this.c.push(...geo.c); this.g.push(...geo.g);
      return this;
    }
    /** Transform every vertex (fn gets [x,y,z], returns [x,y,z]); fnN transforms normals (defaults to fn minus translation). */
    map(fn, fnN) {
      for (let i = 0; i < this.p.length; i += 3) {
        const p = fn([this.p[i], this.p[i + 1], this.p[i + 2]]);
        this.p[i] = p[0]; this.p[i + 1] = p[1]; this.p[i + 2] = p[2];
        if (fnN) {
          const n = V.norm(fnN([this.n[i], this.n[i + 1], this.n[i + 2]]));
          this.n[i] = n[0]; this.n[i + 1] = n[1]; this.n[i + 2] = n[2];
        }
      }
      return this;
    }
    rotX(a, pivot) {
      const c = Math.cos(a), s = Math.sin(a), py = pivot ? pivot[1] : 0, pz = pivot ? pivot[2] : 0;
      const r = v => [v[0], (v[1]) * c - (v[2]) * s, (v[1]) * s + (v[2]) * c];
      return this.map(p => { const q = r([p[0], p[1] - py, p[2] - pz]); return [q[0], q[1] + py, q[2] + pz]; }, r);
    }
    rotY(a) {
      const c = Math.cos(a), s = Math.sin(a), r = v => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
      return this.map(r, r);
    }
    rotZ(a, pivot) {
      const c = Math.cos(a), s = Math.sin(a), px = pivot ? pivot[0] : 0, py = pivot ? pivot[1] : 0;
      const r = v => [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
      return this.map(p => { const q = r([p[0] - px, p[1] - py, p[2]]); return [q[0] + px, q[1] + py, q[2]]; }, r);
    }
    move(dx, dy, dz) { return this.map(p => [p[0] + dx, p[1] + dy, p[2] + dz]); }
    scale(sx, sy, sz) {
      sy = sy == null ? sx : sy; sz = sz == null ? sx : sz;
      return this.map(p => [p[0] * sx, p[1] * sy, p[2] * sz], n => [n[0] / sx, n[1] / sy, n[2] / sz]);
    }
    /** The colour covering the most upward-facing area (what you mostly see from above): how 2D views colour a model. */
    topColor() {
      const area = {};
      let best = 0, col = [0.6, 0.6, 0.6];
      for (let i = 0; i < this.p.length; i += 9) {
        if (this.n[i + 1] < 0.5) continue;
        const a = [this.p[i], this.p[i + 1], this.p[i + 2]], b = [this.p[i + 3], this.p[i + 4], this.p[i + 5]], c = [this.p[i + 6], this.p[i + 7], this.p[i + 8]];
        const k = this.c[i] + ',' + this.c[i + 1] + ',' + this.c[i + 2];
        area[k] = (area[k] || 0) + V.len(V.cross(V.sub(b, a), V.sub(c, a))) / 2;
        if (area[k] > best) { best = area[k]; col = [this.c[i], this.c[i + 1], this.c[i + 2]]; }
      }
      return col;
    }
    bounds() {
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < this.p.length; i += 3) {
        for (let k = 0; k < 3; k++) { const v = this.p[i + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
      }
      if (min[0] === Infinity) return { min: [0, 0, 0], max: [0, 0, 0] };
      return { min, max };
    }
  }
  GK.Geo = Geo;
})();
