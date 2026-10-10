/* Game Kit · game-types/first-person-3d/renderer.js  (3D Visual Foundation edition — blueprint/3d-visual-foundation/src/gk-renderer.js)
   A small WebGL 1 renderer for vertex-coloured low-poly scenes (GK.Geo meshes) with a polished, stylized look:
   - SKY: a painted gradient dome with a soft sun and drifting procedural clouds (setEnv({sky, clouds})), plus optional
     3D sky props (setSkyProps: e.g. cloud models) drawn far away around the camera
   - per-pixel lighting: warm sun with soft wrap-around shading + cool sky / warm ground ambient + fill + rim light +
     up to 8 coloured POINT LIGHTS (setLights)
   - real SUN SHADOWS from a shadow map that follows the camera (setQuality({shadows}); env.shadows: false turns them
     off for roofed worlds such as caves)
   - AUTO MATERIALS: the colour of a surface decides its detail, so flat-coloured models get texture for free —
     green tops = grass, green sides = leaves, warm light = sand, warm dark = wood / dirt, grey = rock (strata on cliffs),
     flat blue water near y = 0 = animated water with sun glints and sky reflection (setQuality({detail}))
   - filmic tone mapping + a little saturation (env.exposure, env.saturation), linear fog toward the horizon colour
   - per-vertex glow (neon), floor detail on items marked `grid` (tile seams and fine circuit lines)
   - BLOOM: bright and glowing parts bleed light (setQuality({bloom}))
   The teacher's "low graphics" switches off shadows, detail and bloom and uses fewer lights.
   API: mesh, cached, free, resize, setCamera, setLights, setQuality, setEnv, setSkyProps, setShadowFocus, render,
   adapt (automatic lower quality on slow computers), project, destroy. Needs GK.util, GK.vec, GK.mat4 (core/core.js or src/gk-core-math.js). */
(function () {
  'use strict';
  const U = GK.util, V = GK.vec, M4 = GK.mat4;
  const MAX_LIGHTS = 8;
  const HIGHP = ['#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif'];
  const NOISE = [
    'float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }',
    'float fbm(vec2 p) { return vnoise(p) * 0.55 + vnoise(p * 2.03 + 7.1) * 0.3 + vnoise(p * 4.11 + 3.7) * 0.15; }',
  ];
  // filmic curve: half per colour channel (soft highlights), half on brightness only (sand stays golden, not white)
  const ACES = ['vec3 aces3(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
    'vec3 tonemap(vec3 c) { float l = max(dot(c, vec3(0.299, 0.587, 0.114)), 0.0001); float t = aces3(vec3(l)).x;',
    '  return mix(aces3(c), clamp(c * (t / l), 0.0, 1.0), 0.5); }'].join('\n');

  // ---------- main scene shader ----------
  const VS = [
    'attribute vec3 aPos;', 'attribute vec3 aNor;', 'attribute vec3 aCol;', 'attribute float aGlo;',
    'uniform mat4 uVP;', 'uniform mat4 uM;', 'uniform mat4 uLVP;', 'uniform vec3 uTint;', 'uniform float uGlow;',
    'varying vec3 vCol;', 'varying vec3 vNor;', 'varying vec3 vWorld;', 'varying float vGlo;', 'varying vec4 vLight;',
    'void main() {',
    '  vec4 wp = uM * vec4(aPos, 1.0);',
    '  vWorld = wp.xyz;',
    '  vNor = (uM * vec4(aNor, 0.0)).xyz;',
    '  vCol = aCol * uTint;',
    '  vGlo = clamp(aGlo + uGlow, 0.0, 1.0);',
    '  vLight = uLVP * vec4(wp.xyz + normalize(vNor + vec3(0.0, 0.0001, 0.0)) * 0.06, 1.0);',   // normal offset: no shadow acne
    '  gl_Position = uVP * wp;',
    '}',
  ].join('\n');
  const FS = HIGHP.concat([
    'uniform vec3 uSunDir;', 'uniform vec3 uSun;', 'uniform vec3 uSky;', 'uniform vec3 uGround;', 'uniform vec3 uHorizon;',
    'uniform vec3 uEye;', 'uniform vec3 uFogColor;', 'uniform vec2 uFog;', 'uniform float uAlpha;', 'uniform float uHi;',
    'uniform int uNL;', 'uniform vec3 uLP[' + MAX_LIGHTS + '];', 'uniform vec3 uLC[' + MAX_LIGHTS + '];', 'uniform float uLR[' + MAX_LIGHTS + '];',
    'uniform float uGrid;', 'uniform vec3 uGridCol;', 'uniform float uCell;',
    'uniform float uTime;', 'uniform float uDetail;', 'uniform float uExposure;', 'uniform float uSat;',
    'uniform float uShadowOn;', 'uniform sampler2D uShadowMap;', 'uniform float uShadowTexel;', 'uniform float uShadowK;',
    'varying vec3 vCol;', 'varying vec3 vNor;', 'varying vec3 vWorld;', 'varying float vGlo;', 'varying vec4 vLight;',
  ], NOISE, [ACES,
    'float unpack(vec4 v) { return dot(v, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }',
    'float shadowTap(vec2 uv, float z) { return step(z, unpack(texture2D(uShadowMap, uv))); }',
    // 2 x 2 taps blended by the position inside the texel (smooth edges, like hardware PCF)
    'float shadowSmooth(vec2 uv, float z) {',
    '  float t = uShadowTexel; vec2 g = uv / t - 0.5, f = fract(g); vec2 b = (floor(g) + 0.5) * t;',
    '  float a = shadowTap(b, z), c = shadowTap(b + vec2(t, 0.0), z), d = shadowTap(b + vec2(0.0, t), z), e = shadowTap(b + vec2(t, t), z);',
    '  return mix(mix(a, c, f.x), mix(d, e, f.x), f.y);',
    '}',
    'float sunShadow() {',
    '  vec3 s = vLight.xyz / vLight.w * 0.5 + 0.5;',
    '  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;',
    '  float z = s.z - 0.0006, t = uShadowTexel * 0.85;',
    '  float k = (shadowSmooth(s.xy + vec2(-t, -t * 0.5), z) + shadowSmooth(s.xy + vec2(t, t * 0.5), z)) * 0.5;',
    '  vec2 e = abs(s.xy - 0.5) * 2.0;',
    '  return mix(k, 1.0, smoothstep(0.8, 1.0, max(e.x, e.y)));',   // fade out at the edge of the shadow area
    '}',
    'void main() {',
    '  vec3 n = normalize(vNor);',
    '  vec3 base = vCol;',
    '  vec3 Vd = normalize(uEye - vWorld);',
    '  float water = 0.0;',
    // ----- auto materials: detail from the surface colour (only in "normal" graphics, never on glowing parts)
    '  if (uDetail > 0.5 && vGlo < 0.5) {',
    '    float mx = max(base.r, max(base.g, base.b)), mn = min(base.r, min(base.g, base.b)), sat = (mx - mn) / (mx + 0.001);',
    '    vec2 p = abs(n.y) > 0.6 ? vWorld.xz : (abs(n.x) > abs(n.z) ? vWorld.zy : vWorld.xy);',
    '    float top = smoothstep(0.6, 0.9, n.y);',
    '    float green = smoothstep(0.1, 0.22, sat) * step(base.r, base.g) * step(base.b, base.g);',
    '    float warm = step(base.b, base.g) * step(base.g, base.r + 0.02) * smoothstep(0.12, 0.25, sat);',
    '    float sand = warm * smoothstep(0.72, 0.86, mx) * (1.0 - smoothstep(0.45, 0.6, sat));',
    '    float brown = warm * (1.0 - sand);',
    '    float wood = brown * smoothstep(0.55, 0.65, sat);',
    '    float grey = 1.0 - smoothstep(0.08, 0.2, sat);',
    '    water = step(0.97, n.y) * step(vWorld.y, 0.25) * smoothstep(0.1, 0.25, base.b - base.r) * step(base.g, base.b);',
    '    float big = fbm(p * 0.16);',
    '    float fine = vnoise(p * 7.0);',
    '    float d = 1.0;',
    '    d += green * top * ((big - 0.5) * 0.4 + (fine - 0.5) * 0.14);',                                         // grass patches + blades
    '    float leaf = vnoise(p * 3.1 + vec2(big * 3.0, fine * 0.7) + n.xz * 2.0) * 0.65 + fine * 0.35;',
    '    d += green * (1.0 - top) * ((smoothstep(0.3, 0.7, leaf) - 0.5) * 0.3 + (big - 0.5) * 0.18);',             // leafy clumps
    '    d += sand * ((fine - 0.5) * 0.08 + sin(p.x * 1.7 + p.y * 0.6 + big * 6.0) * 0.03);',                      // grains + wind ripples
    '    float grainV = vnoise(vec2(p.x * 9.0, p.y * 0.9)), grainH = vnoise(vec2(p.x * 0.9, p.y * 9.0));',
    '    d += wood * (mix(grainV, grainH, top) - 0.5) * 0.26;',                                                    // wood grain
    '    d += (brown - wood) * ((big - 0.5) * 0.3 + step(0.84, fine) * 0.1 - step(fine, 0.12) * 0.08);',          // dirt with pebbles
    '    float strata = sin(vWorld.y * 3.1 + big * 5.0) * 0.5 + 0.5;',
    '    d += grey * ((1.0 - top) * (strata - 0.5) * 0.18 + (fine - 0.5) * 0.1 + (big - 0.5) * 0.2);',              // rock strata + speckle
    '    base *= mix(d, 1.0, water);',
    '    base = mix(base, base * vec3(1.07, 1.05, 0.88), green * top * big * 0.6);',                             // sunny grass is warmer
    '  }',
    // ----- light
    '  float ndl = dot(n, uSunDir);',
    '  float sh = uShadowOn > 0.5 ? sunShadow() : 1.0;',
    '  float shade = 1.0 - uShadowK * (1.0 - sh);',
    '  float wrap = clamp((ndl + 0.25) / 1.25, 0.0, 1.0);',
    '  vec3 fill = normalize(vec3(-uSunDir.x, 0.0, -uSunDir.z) + vec3(0.0001));',
    '  vec3 amb = mix(uGround, uSky, n.y * 0.5 + 0.5) * 0.8;',
    '  vec3 lit = amb + uSun * 1.35 * wrap * wrap * shade + uSun * 0.3 * max(dot(n, fill), 0.0);',
    '  for (int i = 0; i < ' + MAX_LIGHTS + '; i++) {',
    '    if (i >= uNL) break;',
    '    vec3 L = uLP[i] - vWorld; float d = length(L);',
    '    float a = clamp(1.0 - d / uLR[i], 0.0, 1.0); a *= a;',
    '    lit += uLC[i] * a * (0.3 + 0.7 * max(dot(n, L / max(d, 0.001)), 0.0));',
    '  }',
    '  float rim = pow(1.0 - max(dot(n, Vd), 0.0), 3.0);',
    '  lit += uSky * rim * 0.25 * (0.35 + 0.65 * shade);',                                                       // soft rim: rounder shapes
    '  float ao = mix(0.7, 1.0, clamp(vWorld.y / 1.3 + 0.35, 0.0, 1.0));',                                     // soft shading near the ground
    '  vec3 c = base * lit * ao;',
    '  if (water > 0.5) {',                                                                                     // ----- water
    '    vec2 q = vWorld.xz; float t = uTime;',
    '    float h1 = vnoise(q * 0.35 + vec2(t * 0.25, t * 0.1)), h2 = vnoise(q * 0.9 - vec2(t * 0.15, t * 0.32));',
    '    vec3 wn = normalize(vec3((h1 - 0.5) * 0.28 + sin(q.x * 0.8 + t * 1.3) * 0.05, 1.0, (h2 - 0.5) * 0.28 + cos(q.y * 0.7 + t) * 0.05));',
    '    float fr = pow(1.0 - max(dot(wn, Vd), 0.0), 4.0);',
    '    vec3 wc = base * (amb * 0.85 + uSun * 0.7 * shade);',
    '    wc += vec3(0.05, 0.09, 0.09) * smoothstep(0.62, 0.9, vnoise(q * 1.5 + vec2(t * 0.4, -t * 0.3))) * shade;', // light ripples
    '    wc = mix(wc, uHorizon, clamp(fr * 0.85, 0.0, 0.65));',
    '    wc += uSun * pow(max(dot(wn, normalize(uSunDir + Vd)), 0.0), 120.0) * 1.6 * shade;',                   // sun glints
    '    c = wc;',
    '  }',
    '  if (uGrid > 0.5 && n.y > 0.9) {',
    '    vec2 gp = vWorld.xz / uCell;',
    '    vec2 f = abs(fract(gp) - 0.5);',
    '    float seam = smoothstep(0.455, 0.5, max(f.x, f.y));',
    '    c *= 1.0 - 0.35 * seam;',
    '    vec2 q = abs(fract(gp * 2.0) - 0.5);',
    '    float line = 1.0 - smoothstep(0.0, 0.05, min(q.x, q.y));',
    '    float pick = step(0.6, fract(sin(dot(floor(gp * 2.0), vec2(12.9898, 78.233))) * 43758.5453));',
    '    c += uGridCol * line * pick * 0.2;',
    '  } else if (uGrid > 0.5 && abs(n.y) < 0.3) {',   // walls: panel seams, a glowing trim near the floor, a dark band higher up
    '    float u2 = (abs(n.x) > abs(n.z) ? vWorld.z : vWorld.x) / uCell;',
    '    float fu = min(fract(u2), 1.0 - fract(u2));',
    '    c *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.03, fu));',
    '    c += uGridCol * (1.0 - smoothstep(0.0, 0.05, abs(vWorld.y - 0.3))) * 0.55;',
    '    c *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.05, abs(vWorld.y - 2.6)));',
    '  }',
    '  c = tonemap(c * uExposure);',
    '  float lum = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c = mix(vec3(lum), c, uSat);',
    '  c = mix(c, vCol, vGlo);',                                                                                // glowing parts stay full bright
    '  c += vec3(uHi);',
    '  float fog = clamp((distance(vWorld, uEye) - uFog.x) / max(uFog.y - uFog.x, 0.001), 0.0, 1.0);',
    '  gl_FragColor = vec4(mix(c, uFogColor, fog * fog * (3.0 - 2.0 * fog)), uAlpha);',
    '}',
  ]).join('\n');

  // ---------- shadow map: depth from the sun, packed into RGBA (works on every WebGL 1 computer) ----------
  const SH_VS = [
    'attribute vec3 aPos;', 'attribute vec3 aNor;', 'attribute vec3 aCol;',
    'uniform mat4 uLVP;', 'uniform mat4 uM;', 'varying float vSkip;',
    'void main() {',
    '  vec4 wp = uM * vec4(aPos, 1.0);',
    '  vec3 n = normalize((uM * vec4(aNor, 0.0)).xyz + vec3(0.0, 0.0001, 0.0));',
    // flat water surfaces near y = 0 cast no shadow (the lake floor under them stays lit)
    '  vSkip = step(0.97, n.y) * step(wp.y, 0.25) * step(0.1, aCol.b - aCol.r) * step(aCol.g, aCol.b);',
    '  gl_Position = uLVP * wp;',
    '}',
  ].join('\n');
  const SH_FS = HIGHP.concat([
    'varying float vSkip;',
    'vec4 pack(float d) { vec4 e = fract(d * vec4(1.0, 255.0, 65025.0, 16581375.0)); e -= e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); return e; }',
    'void main() { if (vSkip > 0.5) discard; gl_FragColor = pack(gl_FragCoord.z); }',
  ]).join('\n');

  // ---------- sky: gradient, sun, procedural clouds (one full-screen pass, drawn first) ----------
  const SKY_VS = ['attribute vec2 aQ;', 'varying vec2 vQ;', 'void main() { vQ = aQ; gl_Position = vec4(aQ, 0.9999, 1.0); }'].join('\n');
  const SKY_FS = HIGHP.concat([
    'uniform vec3 uF;', 'uniform vec3 uR;', 'uniform vec3 uU;', 'uniform vec2 uTan;',
    'uniform vec3 uTop;', 'uniform vec3 uMid;', 'uniform vec3 uHor;', 'uniform vec3 uSunDir;', 'uniform vec3 uSunCol;',
    'uniform float uTime;', 'uniform float uClouds;', 'uniform float uCover;', 'uniform vec3 uCloud;', 'uniform vec3 uCloudShade;',
    'varying vec2 vQ;',
  ], NOISE, [
    'void main() {',
    '  vec3 d = normalize(uF + uR * vQ.x * uTan.x + uU * vQ.y * uTan.y);',
    '  float y = d.y;',
    '  vec3 c = mix(uMid, uTop, smoothstep(0.02, 0.55, y));',
    '  c = mix(uHor, c, smoothstep(-0.02, 0.12, y));',
    '  float s = max(dot(d, uSunDir), 0.0);',
    '  c += uSunCol * (pow(s, 900.0) * 2.5 + pow(s, 14.0) * 0.16);',
    '  if (uClouds > 0.5 && y > 0.0) {',
    '    vec2 p = d.xz / (y + 0.1) * 0.9 + vec2(uTime * 0.008, uTime * 0.003);',
    '    float f = fbm(p), lo = 1.0 - uCover;',
    '    float a = smoothstep(lo, lo + 0.22, f) * smoothstep(0.0, 0.18, y);',
    '    float under = smoothstep(lo, lo + 0.45, fbm(p + vec2(0.06, 0.09)));',               // thicker parts are darker underneath
    '    vec3 cc = mix(uCloud, uCloudShade, under * 0.7) + uSunCol * pow(s, 6.0) * 0.1;',
    '    c = mix(c, cc, a * 0.95);',
    '  }',
    '  gl_FragColor = vec4(c, 1.0);',
    '}',
  ]).join('\n');

  // ---------- full-screen passes for bloom ----------
  const QUAD_VS = ['attribute vec2 aQ;', 'varying vec2 vUv;', 'void main() { vUv = aQ * 0.5 + 0.5; gl_Position = vec4(aQ, 0.0, 1.0); }'].join('\n');
  const BRIGHT_FS = ['precision mediump float;', 'uniform sampler2D uTex;', 'uniform float uThr;', 'varying vec2 vUv;',
    'void main() { vec3 c = texture2D(uTex, vUv).rgb; float m = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uThr, 1.0, m), 1.0); }'].join('\n');
  const BLUR_FS = ['precision mediump float;', 'uniform sampler2D uTex;', 'uniform vec2 uDir;', 'varying vec2 vUv;',
    'void main() {',
    '  vec3 c = texture2D(uTex, vUv).rgb * 0.227;',
    '  c += (texture2D(uTex, vUv + uDir * 1.385).rgb + texture2D(uTex, vUv - uDir * 1.385).rgb) * 0.316;',
    '  c += (texture2D(uTex, vUv + uDir * 3.231).rgb + texture2D(uTex, vUv - uDir * 3.231).rgb) * 0.07;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'].join('\n');
  const ADD_FS = ['precision mediump float;', 'uniform sampler2D uTex;', 'uniform float uK;', 'varying vec2 vUv;',
    'void main() { gl_FragColor = vec4(texture2D(uTex, vUv).rgb * uK, 0.0); }'].join('\n');

  const ortho = (out, l, r, b, t, n, f) => {
    out.fill(0);
    out[0] = 2 / (r - l); out[5] = 2 / (t - b); out[10] = -2 / (f - n);
    out[12] = -(r + l) / (r - l); out[13] = -(t + b) / (t - b); out[14] = -(f + n) / (f - n); out[15] = 1;
    return out;
  };

  class Renderer {
    /** opts: {pixelRatio, antialias, far} */
    constructor(canvas, opts) {
      opts = opts || {};
      this.canvas = canvas;
      const attrs = { antialias: opts.antialias !== false, alpha: true, premultipliedAlpha: false };
      const gl = this.gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('This computer\'s browser cannot show 3D graphics (WebGL is turned off or not supported).');
      this.pixelRatio = opts.pixelRatio || 1;
      this.far = opts.far || 150;
      this.prog = this._program(VS, FS);
      gl.useProgram(this.prog);
      this.a = {};
      for (const n of ['aPos', 'aNor', 'aCol', 'aGlo']) this.a[n] = gl.getAttribLocation(this.prog, n);
      this.u = {};
      for (const n of ['uVP', 'uM', 'uLVP', 'uSunDir', 'uSun', 'uSky', 'uGround', 'uHorizon', 'uTint', 'uEye', 'uGlow', 'uHi', 'uFogColor', 'uFog', 'uAlpha',
        'uNL', 'uLP', 'uLC', 'uLR', 'uGrid', 'uGridCol', 'uCell', 'uTime', 'uDetail', 'uExposure', 'uSat', 'uShadowOn', 'uShadowMap', 'uShadowTexel', 'uShadowK']) {
        this.u[n] = gl.getUniformLocation(this.prog, n);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.proj = M4.create(); this.view = M4.create(); this.vp = M4.create(); this.tmp = M4.create();
      this.lvp = M4.create(); this.lview = M4.create(); this.lproj = M4.create(); this.skyVP = M4.create();
      this.eye = [0, 0, 0]; this.fwd = [0, 0, -1]; this.fov = 70;
      this.cache = {};
      this.lights = [];
      this.skyProps = [];
      this.time = 0; this.t0 = performance.now();
      this.quality = { bloom: true, lights: MAX_LIGHTS, bloomStrength: 0.85, bloomThreshold: 0.8, shadows: true, shadowSize: 2048, shadowRange: 42, detail: true, sky: true };
      this.gridColor = [0.3, 0.8, 1]; this.cell = 2;
      this.setEnv({});
    }
    _program(vs, fs) {
      const gl = this.gl, mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader error: ' + gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Shader link error: ' + gl.getProgramInfoLog(p));
      return p;
    }
    /** env: {sun:{dir,color,intensity}, ambient:{sky,ground}, fog:[near,far], fogColor, grid: colour of the floor traces,
        sky: [top, middle, horizon] colours (drawn as a dome; omit for a see-through canvas), clouds: true | {cover 0..1, color, shade},
        shadows: false (no sun shadows, e.g. caves), shadowStrength 0..1, exposure, saturation} */
    setEnv(env) {
      const sun = env.sun || {}, amb = env.ambient || {}, sky = U.list(env.sky), cl = env.clouds === true ? {} : env.clouds;
      this.env = {
        sunDir: V.norm(sun.dir || [0.4, 1, 0.3]),
        sun: U.shade(sun.color || '#fff3dd', sun.intensity == null ? 0.5 : sun.intensity),
        sunColor: U.color(sun.color || '#fff3dd'),
        sky: U.color(amb.sky || '#8494aa'),
        ground: U.color(amb.ground || '#4a433d'),
        fog: env.fog || [30, 90],
        fogColor: U.color(env.fogColor || '#cfe3f5'),
        skyCols: sky.length ? [U.color(sky[0]), U.color(sky[1] || sky[0]), U.color(env.fogColor || sky[2] || sky[1] || sky[0])] : null,
        clouds: cl ? { cover: cl.cover == null ? 0.42 : cl.cover, color: U.color(cl.color || '#ffffff'), shade: U.color(cl.shade || '#c4d3e6') } : null,
        shadows: env.shadows !== false,
        shadowK: env.shadowStrength == null ? 0.78 : env.shadowStrength,
        exposure: env.exposure == null ? 0.92 : env.exposure,
        saturation: env.saturation == null ? 1.15 : env.saturation,
      };
      if (env.grid) this.gridColor = U.color(env.grid);
    }
    /** {bloom, lights: 0..8, shadows, shadowSize, shadowRange (metres around the camera), detail, sky} —
        the teacher's "low graphics" switches bloom, shadows and detail off and uses fewer lights. */
    setQuality(q) { Object.assign(this.quality, q); }
    /** Call once a frame with the frame time (seconds) while the game runs. If this computer keeps drawing slower than
        minFps (default 24), the costly effects switch off one at a time: shadows, then surface detail, then bloom.
        Returns the name of what was switched off this frame, or null. */
    adapt(dt, minFps) {
      const a = this._adapt || (this._adapt = { slow: 0, t: 0 });
      a.t += dt;
      if (a.t < 3) return null;   // the first seconds are always slow (building meshes)
      a.slow = dt > 1 / (minFps || 24) ? a.slow + dt : Math.max(0, a.slow - dt * 0.5);
      if (a.slow < 4) return null;
      a.slow = 0;
      for (const k of ['shadows', 'detail', 'bloom']) if (this.quality[k]) { this.quality[k] = false; return k; }
      return null;
    }
    /** lights: [{pos:[x,y,z], color:'#hex' | [r,g,b], range, intensity}] — the renderer uses the first `quality.lights`. */
    setLights(list) { this.lights = list || []; }
    /** Far-away decorations that move with the camera (clouds): [{mesh, pos: [x, y, z] relative to the camera, yaw, scale, tint}]. */
    setSkyProps(list) { this.skyProps = list || []; }
    /** Where the sun's shadow area is centred (usually a little in front of the player). Defaults to the camera. */
    setShadowFocus(p) { this.shadowFocus = p; }
    /** Upload a Geo; returns a mesh handle {count, bounds}. */
    mesh(geo) {
      const gl = this.gl, buf = arr => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return b; };
      return { p: buf(geo.p), n: buf(geo.n), c: buf(geo.c), g: buf(geo.g), count: geo.count, bounds: geo.bounds() };
    }
    /** Mesh shared by key (models are built once and reused by every entity with the same look). */
    cached(key, build) {
      if (!this.cache[key]) this.cache[key] = this.mesh(build());
      return this.cache[key];
    }
    free(mesh) {
      if (!mesh) return;
      const gl = this.gl;
      for (const k of ['p', 'n', 'c', 'g']) gl.deleteBuffer(mesh[k]);
    }
    resize() {
      const c = this.canvas, pr = this.pixelRatio;
      const w = Math.max(1, Math.round(c.clientWidth * pr)), h = Math.max(1, Math.round(c.clientHeight * pr));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      this.gl.viewport(0, 0, w, h);
    }
    setCamera(eye, forward, fovDeg) {
      const c = this.canvas;
      this.eye = eye; this.fwd = V.norm(forward); this.fov = fovDeg || 70;
      M4.perspective(this.proj, U.rad(this.fov), c.width / Math.max(1, c.height), 0.05, this.far);
      M4.lookAt(this.view, eye, V.add(eye, forward), [0, 1, 0]);
      M4.multiply(this.vp, this.proj, this.view);
      this.tmp.set(this.view); this.tmp[12] = this.tmp[13] = this.tmp[14] = 0;   // the sky turns with the camera but never moves
      M4.multiply(this.skyVP, this.proj, this.tmp);
    }
    /** Upload the uniforms that are the same for a whole pass. */
    _passUniforms(vp, eye, fog, shadowOn, detail) {
      const gl = this.gl, u = this.u, e = this.env;
      gl.uniformMatrix4fv(u.uVP, false, vp);
      gl.uniformMatrix4fv(u.uLVP, false, this.lvp);
      gl.uniform3fv(u.uSunDir, e.sunDir); gl.uniform3fv(u.uSun, e.sun);
      gl.uniform3fv(u.uSky, e.sky); gl.uniform3fv(u.uGround, e.ground); gl.uniform3fv(u.uHorizon, e.fogColor);
      gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uFogColor, e.fogColor); gl.uniform2fv(u.uFog, fog);
      gl.uniform3fv(u.uGridCol, this.gridColor); gl.uniform1f(u.uCell, this.cell);
      gl.uniform1f(u.uTime, this.time); gl.uniform1f(u.uDetail, detail ? 1 : 0);
      gl.uniform1f(u.uExposure, e.exposure); gl.uniform1f(u.uSat, e.saturation);
      gl.uniform1f(u.uShadowOn, shadowOn ? 1 : 0); gl.uniform1f(u.uShadowK, e.shadowK);
      gl.uniform1f(u.uShadowTexel, this.sh ? 1 / this.sh.size : 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shadowOn && this.sh ? this.sh.tex : null); gl.uniform1i(u.uShadowMap, 1);
      gl.activeTexture(gl.TEXTURE0);
    }
    /** items: [{mesh, pos, yaw, pitch, roll, scale, tint, glow, hi, alpha, front, grid, noShadow}] — `front` items (a tool held in the
        player's hand) are drawn last over everything, so they never sink into a wall; `grid` items get floor detail;
        `noShadow` items cast no sun shadow. */
    render(items) {
      const gl = this.gl, u = this.u, e = this.env, q = this.quality;
      this.time = (performance.now() - this.t0) / 1000;
      const opaque = [], clear = [], front = [];
      for (const it of items) (it.front ? front : (it.alpha != null && it.alpha < 1) ? clear : opaque).push(it);
      let shadowOn = false;
      if (q.shadows && e.shadows) { try { shadowOn = this._shadowPass(opaque); } catch (err) { q.shadows = false; console.warn('[GK] shadows turned off:', err); } }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (q.sky && e.skyCols) { try { this._sky(); } catch (err) { q.sky = false; console.warn('[GK] sky turned off:', err); } }
      gl.useProgram(this.prog);
      // point lights
      const n = Math.min(MAX_LIGHTS, q.lights, this.lights.length), lp = new Float32Array(MAX_LIGHTS * 3), lc = new Float32Array(MAX_LIGHTS * 3), lr = new Float32Array(MAX_LIGHTS);
      for (let i = 0; i < n; i++) {
        const L = this.lights[i], c = Array.isArray(L.color) ? L.color : U.color(L.color || '#ffffff'), k = L.intensity == null ? 1 : L.intensity;
        lp[i * 3] = L.pos[0]; lp[i * 3 + 1] = L.pos[1]; lp[i * 3 + 2] = L.pos[2];
        lc[i * 3] = c[0] * k; lc[i * 3 + 1] = c[1] * k; lc[i * 3 + 2] = c[2] * k;
        lr[i] = L.range || 5;
      }
      gl.uniform1i(u.uNL, n); gl.uniform3fv(u.uLP, lp); gl.uniform3fv(u.uLC, lc); gl.uniform1fv(u.uLR, lr);
      // far-away sky props (clouds): no fog, no shadow, never in front of the world
      if (this.skyProps.length && q.sky && e.skyCols) {
        this._passUniforms(this.skyVP, [0, 0, 0], [1e5, 2e5], false, false);
        gl.depthMask(false);
        for (const it of this.skyProps) this._draw(it);
        gl.depthMask(true);
      }
      this._passUniforms(this.vp, this.eye, e.fog, shadowOn, q.detail);
      for (const it of opaque) this._draw(it);
      if (clear.length) {
        gl.enable(gl.BLEND); gl.depthMask(false);
        clear.sort((a, b) => V.dist(b.pos, this.eye) - V.dist(a.pos, this.eye));
        for (const it of clear) this._draw(it);
        gl.depthMask(true); gl.disable(gl.BLEND);
      }
      if (front.length) {
        gl.clear(gl.DEPTH_BUFFER_BIT);
        for (const it of front) this._draw(it);
      }
      if (q.bloom) { try { this._bloom(); } catch (err) { q.bloom = false; console.warn('[GK] bloom turned off:', err); } }
    }
    _draw(it) {
      const gl = this.gl, u = this.u, m = it.mesh, a = this.a;
      if (!m || !m.count) return;
      const s = it.scale == null ? [1, 1, 1] : typeof it.scale === 'number' ? [it.scale, it.scale, it.scale] : it.scale;
      M4.model(this.tmp, it.pos || [0, 0, 0], it.yaw || 0, s, it.pitch, it.roll);
      gl.uniformMatrix4fv(u.uM, false, this.tmp);
      gl.uniform3fv(u.uTint, it.tint ? U.color(it.tint) : [1, 1, 1]);
      gl.uniform1f(u.uGlow, it.glow || 0);
      gl.uniform1f(u.uHi, it.hi || 0);
      gl.uniform1f(u.uAlpha, it.alpha == null ? 1 : it.alpha);
      gl.uniform1f(u.uGrid, it.grid ? 1 : 0);
      const bind = (buf, loc, size) => { if (loc < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
      bind(m.p, a.aPos, 3); bind(m.n, a.aNor, 3); bind(m.c, a.aCol, 3); bind(m.g, a.aGlo, 1);
      gl.drawArrays(gl.TRIANGLES, 0, m.count);
    }

    // ---------- sky dome ----------
    _sky() {
      const gl = this.gl, e = this.env;
      if (!this.skyP) {
        const p = this._program(SKY_VS, SKY_FS), loc = {};
        for (const n of ['uF', 'uR', 'uU', 'uTan', 'uTop', 'uMid', 'uHor', 'uSunDir', 'uSunCol', 'uTime', 'uClouds', 'uCover', 'uCloud', 'uCloudShade']) loc[n] = gl.getUniformLocation(p, n);
        this.skyP = { p, aQ: gl.getAttribLocation(p, 'aQ'), loc, quad: this._quad() };
      }
      const S = this.skyP, L = S.loc, f = this.fwd, r = V.norm(V.cross(f, [0, 1, 0])), up = V.cross(r, f);
      const ty = Math.tan(U.rad(this.fov) / 2), tx = ty * this.canvas.width / Math.max(1, this.canvas.height);
      for (const n of ['aPos', 'aNor', 'aCol', 'aGlo']) if (this.a[n] >= 0) gl.disableVertexAttribArray(this.a[n]);
      gl.useProgram(S.p);
      gl.uniform3fv(L.uF, f); gl.uniform3fv(L.uR, r); gl.uniform3fv(L.uU, up); gl.uniform2f(L.uTan, tx, ty);
      gl.uniform3fv(L.uTop, e.skyCols[0]); gl.uniform3fv(L.uMid, e.skyCols[1]); gl.uniform3fv(L.uHor, e.skyCols[2]);
      gl.uniform3fv(L.uSunDir, e.sunDir); gl.uniform3fv(L.uSunCol, e.sunColor); gl.uniform1f(L.uTime, this.time);
      gl.uniform1f(L.uClouds, e.clouds ? 1 : 0);
      if (e.clouds) { gl.uniform1f(L.uCover, e.clouds.cover); gl.uniform3fv(L.uCloud, e.clouds.color); gl.uniform3fv(L.uCloudShade, e.clouds.shade); }
      gl.depthMask(false);
      gl.bindBuffer(gl.ARRAY_BUFFER, S.quad); gl.enableVertexAttribArray(S.aQ); gl.vertexAttribPointer(S.aQ, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(S.aQ);
      gl.depthMask(true);
    }
    _quad() {
      const gl = this.gl, b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      return b;
    }

    // ---------- sun shadows ----------
    _shadowInit(size) {
      const gl = this.gl;
      if (this.sh) { gl.deleteTexture(this.sh.tex); gl.deleteFramebuffer(this.sh.fb); gl.deleteRenderbuffer(this.sh.rb); }
      const p = this._program(SH_VS, SH_FS);
      const tex = this._tex(size, size, gl.NEAREST), fb = gl.createFramebuffer(), rb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!ok) throw new Error('shadow framebuffer is not supported');
      this.sh = { p, size, tex, fb, rb, aPos: gl.getAttribLocation(p, 'aPos'), aNor: gl.getAttribLocation(p, 'aNor'), aCol: gl.getAttribLocation(p, 'aCol'),
        uLVP: gl.getUniformLocation(p, 'uLVP'), uM: gl.getUniformLocation(p, 'uM') };
    }
    /** Draw the opaque scene from the sun into the shadow map. Returns true when the map is ready to use. */
    _shadowPass(items) {
      const gl = this.gl, q = this.quality, e = this.env;
      const size = Math.min(q.shadowSize, gl.getParameter(gl.MAX_TEXTURE_SIZE));
      if (!this.sh || this.sh.size !== size) this._shadowInit(size);
      const S = this.sh, R = q.shadowRange, D = 140, sd = e.sunDir;
      const focus = this.shadowFocus || this.eye;
      // the sun looks at the world from its direction; the box around `focus` snaps to whole texels (no shimmering edges)
      M4.lookAt(this.lview, sd, [0, 0, 0], Math.abs(sd[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0]);
      const lv = this.lview, cx = lv[0] * focus[0] + lv[4] * focus[1] + lv[8] * focus[2], cy = lv[1] * focus[0] + lv[5] * focus[1] + lv[9] * focus[2];
      const cz = lv[2] * focus[0] + lv[6] * focus[1] + lv[10] * focus[2] + lv[14], texel = 2 * R / size;
      const sx = Math.round(cx / texel) * texel, sy = Math.round(cy / texel) * texel;
      ortho(this.lproj, sx - R, sx + R, sy - R, sy + R, -cz - D, -cz + D);
      M4.multiply(this.lvp, this.lproj, lv);
      gl.bindFramebuffer(gl.FRAMEBUFFER, S.fb);
      gl.viewport(0, 0, size, size);
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(S.p);
      for (const n of ['aPos', 'aNor', 'aCol', 'aGlo']) if (this.a[n] >= 0) gl.disableVertexAttribArray(this.a[n]);
      gl.uniformMatrix4fv(S.uLVP, false, this.lvp);
      const R2 = (R * 1.5) * (R * 1.5);
      for (const it of items) {
        const m = it.mesh;
        if (!m || !m.count || it.noShadow) continue;
        const b = m.bounds, p = it.pos || [0, 0, 0], s = it.scale == null ? 1 : typeof it.scale === 'number' ? it.scale : Math.max(it.scale[0], it.scale[1], it.scale[2]);
        const rad = (Math.hypot(b.max[0] - b.min[0], b.max[2] - b.min[2]) / 2 + Math.hypot(b.min[0] + b.max[0], b.min[2] + b.max[2]) / 2) * s;   // any turn
        const dx = Math.max(Math.abs(p[0] - focus[0]) - rad, 0), dz = Math.max(Math.abs(p[2] - focus[2]) - rad, 0);
        if (dx * dx + dz * dz > R2) continue;
        const sc = it.scale == null ? [1, 1, 1] : typeof it.scale === 'number' ? [it.scale, it.scale, it.scale] : it.scale;
        M4.model(this.tmp, p, it.yaw || 0, sc, it.pitch, it.roll);
        gl.uniformMatrix4fv(S.uM, false, this.tmp);
        const bind = (buf, loc, size) => { if (loc < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
        bind(m.p, S.aPos, 3); bind(m.n, S.aNor, 3); bind(m.c, S.aCol, 3);
        gl.drawArrays(gl.TRIANGLES, 0, m.count);
      }
      for (const n of ['aPos', 'aNor', 'aCol']) if (S[n] >= 0) gl.disableVertexAttribArray(S[n]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      return true;
    }

    // ---------- bloom: copy the frame, keep the bright parts, blur them small, add them back ----------
    _bloomInit() {
      const gl = this.gl;
      const mk = fs => { const p = this._program(QUAD_VS, fs); return { p, aQ: gl.getAttribLocation(p, 'aQ'), uTex: gl.getUniformLocation(p, 'uTex'), uThr: gl.getUniformLocation(p, 'uThr'), uDir: gl.getUniformLocation(p, 'uDir'), uK: gl.getUniformLocation(p, 'uK') }; };
      this.bl = { bright: mk(BRIGHT_FS), blur: mk(BLUR_FS), add: mk(ADD_FS), w: 0, h: 0 };
      this.bl.quad = this._quad();
    }
    _tex(w, h, filter) {
      const gl = this.gl, t = gl.createTexture(), f = filter || gl.LINEAR;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, f], [gl.TEXTURE_MAG_FILTER, f], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      return t;
    }
    _target(w, h) {
      const gl = this.gl, tex = this._tex(w, h), fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex, fb };
    }
    _bloom() {
      const gl = this.gl, W = this.canvas.width, H = this.canvas.height;
      if (!this.bl) this._bloomInit();
      const B = this.bl;
      if (B.w !== W || B.h !== H) {
        for (const k of ['scene']) if (B[k]) gl.deleteTexture(B[k]);
        for (const k of ['a', 'b']) if (B[k]) { gl.deleteTexture(B[k].tex); gl.deleteFramebuffer(B[k].fb); }
        B.w = W; B.h = H; B.bw = Math.max(1, W >> 2); B.bh = Math.max(1, H >> 2);
        B.scene = this._tex(W, H); B.a = this._target(B.bw, B.bh); B.b = this._target(B.bw, B.bh);
      }
      for (const n of ['aPos', 'aNor', 'aCol', 'aGlo']) if (this.a[n] >= 0) gl.disableVertexAttribArray(this.a[n]);
      gl.disable(gl.DEPTH_TEST);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, B.scene);
      gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, W, H);
      const pass = (P, src, dst, setup) => {
        gl.useProgram(P.p);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
        gl.viewport(0, 0, dst ? B.bw : W, dst ? B.bh : H);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(P.uTex, 0);
        setup();
        gl.bindBuffer(gl.ARRAY_BUFFER, B.quad); gl.enableVertexAttribArray(P.aQ); gl.vertexAttribPointer(P.aQ, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.disableVertexAttribArray(P.aQ);
      };
      pass(B.bright, B.scene, B.a, () => gl.uniform1f(B.bright.uThr, this.quality.bloomThreshold));
      pass(B.blur, B.a.tex, B.b, () => gl.uniform2f(B.blur.uDir, 1 / B.bw, 0));
      pass(B.blur, B.b.tex, B.a, () => gl.uniform2f(B.blur.uDir, 0, 1 / B.bh));
      pass(B.blur, B.a.tex, B.b, () => gl.uniform2f(B.blur.uDir, 2 / B.bw, 0));
      pass(B.blur, B.b.tex, B.a, () => gl.uniform2f(B.blur.uDir, 0, 2 / B.bh));
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.colorMask(true, true, true, false);
      pass(B.add, B.a.tex, null, () => gl.uniform1f(B.add.uK, this.quality.bloomStrength));
      gl.colorMask(true, true, true, true); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(this.prog);
    }

    /** World point → CSS pixels {x, y, visible} for HTML overlays (labels, markers). */
    project(p) {
      const m = this.vp, x = p[0], y = p[1], z = p[2];
      const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (cw <= 0.05) return { visible: false, x: 0, y: 0 };
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      return { visible: true, x: (cx / cw + 1) / 2 * w, y: (1 - cy / cw) / 2 * h, depth: cw };
    }
    destroy() {
      for (const k in this.cache) this.free(this.cache[k]);
      this.cache = {};
    }
  }
  GK.Renderer = Renderer;
})();
