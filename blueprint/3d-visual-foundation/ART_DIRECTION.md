# Art direction: bright stylized 3D

Reference: [`reference/3d-style-reference.jpg`](reference/3d-style-reference.jpg). This is a sunny, toy-like adventure world: rounded shapes, saturated but soft colours, warm sun and cool shadows, lots of small readable detail. Aim for "polished mobile adventure game", not realism and not raw low-poly boxes.

## 1. Shapes
- **Round first.** Use `sphere`, `blob`, `cyl` and `cone` with 6+ sides. They shade smoothly, so they read as round even at low polygon counts. Keep boxes for things that really are boxes (planks, crates, signs).
- **Organic = lumpy.** Use `blob` for bushes, tree crowns and clouds (`rough` 0.12–0.28). Rocks are `blob` with `{flat: true}` (faceted, rough 0.3).
- **Clusters, not singles.** A bush is 2–3 blobs. A tree crown is 4–5 blobs, lighter on top. A rock pile is 3 boulders.
- **Readable silhouettes.** Palms curve and lean. Fronds droop with jagged edges. Characters have a big head (radius about 0.19 m on a 1.8 m body) and big eyes.
- **No flat walls in view.** Cover flat wall faces with hedges at the bottom and canopy clumps at the top, and make the face itself darker so the clumps in front of it read as depth.

## 2. Colour
| Use | Colours | Notes |
|---|---|---|
| Sand | `#f3e0a8`, `#efd99c` | Warm, never grey |
| Grass | `#6aa84f`, `#74b35a` | Yellow-green. Sunny patches drift warmer automatically |
| Foliage | `#2f7d32` `#37893a` `#2b6e2e` `#3f9142` | Vary per bush. Wall faces darker (`#245a27`) |
| Palm fronds | `#3fae49` | Top side 12% lighter than the underside |
| Wood | `#8b5a2b`, `#a0703c`, trunk `#8f6a42`/`#a57d50` | Saturated browns read as wood grain; duller ones read as dirt |
| Dirt path | `#b08d57` | |
| Rock | `#8a7f73`, `#8d8f96`, `#9a9088` | Low saturation reads as rock (strata on cliffs) |
| Water | `#1c7ed6` sea, `#2f9fd8` lagoon | Flat blue surface near y = 0 animates on its own |
| Accents | `#ff6b6b` `#ffd43b` `#f783ac` `#b197fc` | Flowers, flags, scarves: small doses |
| Sky | top `#2f7fd6`, middle `#6fb6ef`, horizon `#bfe2f8` | Fog colour = horizon colour |

**Auto materials:** the renderer decides surface detail from the colour, so choose colours from these families.

| Colour family | Detail it gets |
|---|---|
| Green on top | Grass patches |
| Green on the sides | Leaf clumps |
| Light warm | Sand ripples |
| Saturated brown | Wood grain |
| Dull brown on top | Dirt and pebbles |
| Grey | Rock strata |
| Flat blue near y = 0 | Water |

A colour outside these families gets no texture, which suits plastic, metal, cloth and UI-like props.

## 3. Light
- **Sun:** warm (`#fff1d6`), intensity 0.6–0.75, from the side and above (`dir` y around 0.75). That gives visible, readable shadows.
- **Shadows:** real sun shadows, strength 0.78 (stormy: 0.5). Shadows are cool and blue-ish because the ambient light comes from the sky colour.
- **Ambient:** sky colour from above, warm earth colour from below. Soft wrap lighting and a rim light keep rounded forms soft.
- **Tone:** filmic curve, exposure about 0.92, saturation 1.15. Glowing parts (`glow` ≥ 0.5) skip it and stay neon-bright.
- **Presets** in `src/lighting-presets.js`:

| Preset | Use |
|---|---|
| `tropicalDay` | The reference look |
| `goldenHour` | Late afternoon |
| `storm` | Grey storm |
| `cave` | Roofed caves, no sun shadows |
| `indoorLab` | Indoor and sci-fi rooms |

## 4. Environment detail
- Scatter small things with a seeded random generator, so the scene looks the same every time:
  - grass tufts on about 25% of grass cells
  - flower patches on about 4%
  - pebbles on about 4% of sand cells
- Every jungle edge gets hedges low and canopy clumps high. Trees mix shapes (bigTree and kenneyTree) and sizes.
- **Sky:** a gradient dome, procedural clouds (cover 0.38) and 9 big 3D cumulus clouds around the horizon.
- **Depth:** distant islets and a mountain, plus fog that starts beyond the play area (70 m and up outdoors).

**Neon and sci-fi worlds** (Cyber Rush) keep their own palette: dark floors with glowing grid lines, glowing signs and towers.
- Only add soft shadows (strength 0.6–0.7), tinted haze clouds or none, and `water: false`.
- Glowing parts (`glow` ≥ 0.5) skip tone mapping, so the neon stays bright.

## 5. Characters
- Rounded explorer: big round head, big eyes with a white sparkle, rosy cheeks, hair cap plus style (spiky, short, long or ponytail).
- Short sleeves, shorts, boots, a coloured scarf and a brown backpack.
- One accent colour per character (scarf), and shirts in clear hues.

## 6. Budget (ordinary school computers)
- Outdoor world: about **120k triangles or fewer**, including scenery (Island Escape act 1 is 115k). The shadow pass draws them again.
- Per model, roughly:

| Model | Triangles |
|---|---|
| Palm | ~400 |
| Hedge | ~85 |
| Tree | ~300 |
| Grass tuft | 72 |
| Hero | ~1.5k |

- Merge static scenery into the world mesh (`mergeScenery`), never one draw per bush.
- Always keep a low-graphics path: shadows, detail and bloom off, fewer lights, 60% pixels. `renderer.adapt()` switches these off by itself on slow computers.
