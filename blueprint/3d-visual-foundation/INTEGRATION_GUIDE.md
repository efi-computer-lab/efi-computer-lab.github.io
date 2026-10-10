# Integration guide

## A. Another Game Kit game (single-file HTML, first-person-3d type)
SHRUNK!, Cyber Rush, Game Studio and others share the same kit, so the swap is mechanical.

**1. Swap and add the blocks.** Run this from the repository root and change `GAME.html`:
```bash
F=blueprint/3d-visual-foundation
python3 $F/tools/inline_blocks.py GAME.html \
  replace:game-types/_spatial/geometry.js=$F/src/gk-geo.js \
  after:game-types/_spatial/geometry.js:assets/kenney-models.js=$F/assets/kenney-models.js \
  after:game-types/../assets/models/people.js:stylized-characters.js=$F/src/stylized-characters.js \
  replace:game-types/first-person-3d/renderer.js=$F/src/gk-renderer.js \
  after:LAST_MODEL_BLOCK:stylized-nature.js=$F/src/stylized-nature.js
```
- `LAST_MODEL_BLOCK` is the last `<script>/* assets/models/… */` block in that game (in Island Escape it's `assets/models/wild.js`). To list the block names, run `grep -n "^<script>/\* " GAME.html`.
- Skip `stylized-characters.js` if the game's characters should stay as they are.
- Skip `stylized-nature.js` and `kenney-models.js` for indoor or sci-fi games.

**2. Add three small hooks** to the `game-types/first-person-3d/type.js` block. These are exactly what Island Escape uses:
```js
// applySettings(): low graphics also turns off shadows and detail
this.renderer.setQuality(low ? { bloom: false, lights: 3, shadows: false, detail: false }
                             : { bloom: r.bloom !== false, lights: 8, shadows: r.shadows !== false, detail: true });

// setup(): pass the sky and the new environment options
this.renderer.setEnv({ sun: env.sun, ambient: env.ambient, fog: env.fog, fogColor: env.fogColor || sky[1] || sky[0], grid: env.grid || cfg.ui.accent,
  sky: env.sky, clouds: env.clouds, shadows: env.shadows, shadowStrength: env.shadowStrength, exposure: env.exposure, saturation: env.saturation });
this.buildSkyProps(env);   // optional: 3D clouds (copy buildSkyProps from Tool_G6-7_Island_Escape.html)

// render(), right after r.setCamera(...): keep the shadow area in front of the player
{ const f = g.player.forward(), fl = Math.hypot(f[0], f[2]) || 1, k = r.quality.shadowRange * 0.45;
  r.setShadowFocus([g.player.pos[0] + f[0] / fl * k, g.player.pos[1], g.player.pos[2] + f[2] / fl * k]); }

// update(dt, mode), after GK.Spatial.update(...): automatic lower quality on slow PCs
if (mode === 'playing') { const off = this.renderer.adapt(dt); if (off) g.ui.toast('⚙️ Simpler graphics for a smoother game (' + off + ' off)'); }
```
Optional: with real shadows on, the round contact shadows (`gk:blob` items) look better at about half their alpha.

**3. Set the look per world** in the world's `lighting` (or the game's `environment`). Start from a preset in `src/lighting-presets.js`:
```js
lighting: { sky: ['#2f7fd6', '#6fb6ef', '#bfe2f8'], fogColor: '#b7dcf5', fog: [70, 280],
            sun: { dir: [-0.6, 0.75, 0.32], color: '#fff1d6', intensity: 0.68 }, ambient: { sky: '#a9c2dc', ground: '#6b5d45' },
            clouds: { cover: 0.38 }, grid: false }
```
| Option | Effect |
|---|---|
| `shadows: false` | For roofed worlds (caves, buildings with ceilings) |
| `grid: false` | For natural worlds (no tile seams) |
| `exposure`, `saturation`, `shadowStrength` | Fine-tune the mood |
| `cloudProps: 0` | No 3D clouds |

**4. Dress the world.** Grid worlds built by `worlds/_wild.js` (or any builder that pushes `decorations`) can scatter extras with their own seeded random generator, so existing scenery keeps its place. The Island Escape version adds:
- `canopy` clumps at the top of every jungle wall edge
- `grassTuft` and `flowerPatch` on grass cells
- `pebbles` on sand
- a mix of `bigTree` and `kenneyTree`

Always use `solid: false`, and respect the world's `keep` circles.

**5. Check:**
- No console errors.
- Every act or level loads.
- Low graphics works (teacher panel).
- Third person works.
- Triangle count stays under about 120k. To check it, run `game.world.geo.count / 3` in the console with `?debug=1`.

## B. A new game without the Game Kit (plain WebGL page)
Load the scripts in this order. They're classic scripts, so they also work from `file://`:
```html
<script src="blueprint/3d-visual-foundation/src/gk-core-math.js"></script>
<script src="blueprint/3d-visual-foundation/src/gk-geo.js"></script>
<script src="blueprint/3d-visual-foundation/assets/kenney-models.js"></script>      <!-- optional -->
<script src="blueprint/3d-visual-foundation/src/stylized-nature.js"></script>       <!-- optional -->
<script src="blueprint/3d-visual-foundation/src/stylized-characters.js"></script>   <!-- optional -->
<script src="blueprint/3d-visual-foundation/src/gk-renderer.js"></script>
<script src="blueprint/3d-visual-foundation/src/lighting-presets.js"></script>
```
Then:
```js
const r = new GK.Renderer(canvas, { far: 220 });
r.setEnv(GK.LightingPresets.tropicalDay);
const world = new GK.Geo().plane(0, -0.04, 0, 900, 900, '#1c7ed6');                     // sea
world.add(new GK.Geo().add(GK.Models.shape('palm', { h: 7 }).geo).move(3, 0, 0));        // copy, then place
const mesh = r.mesh(world);
function frame() {
  requestAnimationFrame(frame);
  r.resize(); r.setCamera(eye, forward, 60); r.setShadowFocus(target);
  r.render([{ mesh, pos: [0, 0, 0] }, /* moving things: {mesh, pos, yaw, scale, tint, alpha} */]);
}
```
- `examples/island-demo.html` is a complete working example: merged scenery, hero, clouds, presets and an orbit camera.
- Never move or rotate a geometry returned by `GK.Models.shape()` directly: it's cached. Copy it with `new GK.Geo().add(shape.geo)` first.

**For a single-file game** (the usual format on this site), inline the same files as `<script>` blocks instead of linking them. `tools/inline_blocks.py` works on any HTML that names its blocks `<script>/* name */`.

## C. Adding more models
1. Download a small, CC0, colour-map style `.glb` (Kenney or Quaternius). Check the licence on the source page.
2. Put it in `assets/models/<pack>/` with its `Textures/colormap.png` and a licence note.
3. Regenerate the data:
   ```bash
   python3 tools/glb_to_geo.py assets/kenney-models.js kenney-grass=… kenney-tree=… mynew=assets/models/<pack>/thing.glb
   ```
4. Wrap it as a model: `GK.Models.add('thing', o => new GK.Geo().addData(GK.ModelData.mynew, { scale: 2 }))`.
5. Add it to `ASSET_MANIFEST.json` and `ASSET_CREDITS.md`.

Keep each model under about 500 triangles if it will be scattered many times.

## D. A different framework (Three.js, Babylon.js, PlayCanvas…)
The code above is written for the Game Kit, but the **look** carries over. Map each idea to the framework:

| Foundation feature | Three.js equivalent |
|---|---|
| Smooth rounded low-poly | `MeshStandardMaterial({ flatShading: false, roughness: 0.85, metalness: 0 })` with `vertexColors: true`; spheres with about 10×7 segments |
| Warm sun and cool ambient | `DirectionalLight('#fff1d6', 2.2)` + `HemisphereLight(sky '#a9c2dc', ground '#6b5d45', 0.9)` |
| Sun shadows following the player | `renderer.shadowMap.enabled = true; type = PCFSoftShadowMap`; move `light.target` with the player; shadow camera ±42 m, map 2048 |
| Filmic tone + saturation | `renderer.toneMapping = ACESFilmicToneMapping; toneMappingExposure ≈ 0.9`; a saturation pass or slightly more saturated base colours |
| Sky dome and clouds | `Sky` from three/examples, or a big inverted sphere with the gradient shader from `SKY_FS` in `gk-renderer.js` (the GLSL ports almost unchanged) |
| Auto materials | `material.onBeforeCompile`: inject the `vnoise` / `fbm` and colour-family block from the renderer's fragment shader |
| Water | A plane with the water block from the fragment shader, or `Water` from three/examples (heavier) |
| Kenney models | Load the `.glb` files in `assets/models/` directly with `GLTFLoader` (no conversion needed) |
| Low graphics | Turn off `shadowMap`, use `setPixelRatio(0.6)`, skip post-processing |

In every framework, keep the palette, the budgets and the scatter rules from `ART_DIRECTION.md`.
