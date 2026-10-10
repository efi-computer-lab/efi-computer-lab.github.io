# Asset credits

Every downloaded asset here is **CC0 1.0 (public domain)**. Credit isn't required, but we credit the creator anyway.
Machine-readable details (byte sizes, SHA-256 hashes, exact commits) are in [`ASSET_MANIFEST.json`](ASSET_MANIFEST.json).

| Asset | Local path | Source | Licence | Attribution |
|---|---|---|---|---|
| Grass tuft (`grass.glb`, 72 tris) | `assets/models/kenney-platformer-kit/grass.glb` | [KenneyNL/Starter-Kit-3D-Platformer](https://github.com/KenneyNL/Starter-Kit-3D-Platformer/blob/3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0/models/grass.glb) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Not required. "Kenney (www.kenney.nl)" appreciated |
| Small grass tuft (`grass-small.glb`, 72 tris) | `assets/models/kenney-platformer-kit/grass-small.glb` | [same repository](https://github.com/KenneyNL/Starter-Kit-3D-Platformer/blob/3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0/models/grass-small.glb) | CC0 1.0 | Not required |
| Platformer Kit colour map | `assets/models/kenney-platformer-kit/Textures/colormap.png` | [same repository](https://github.com/KenneyNL/Starter-Kit-3D-Platformer/blob/3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0/models/Textures/colormap.png) | CC0 1.0 | Not required |
| Stylized tree (`tree.glb`, 330 tris) from the Mini Arena pack | `assets/models/kenney-mini-arena/tree.glb` | [KenneyNL/Starter-Kit-Basic-Scene](https://github.com/KenneyNL/Starter-Kit-Basic-Scene/blob/a6927e66ff8dd8e173660ce4825abe773c65f683/sample/Mini%20Arena/Models/GLB%20format/tree.glb) | CC0 1.0 (`License.txt` in that folder) | Not required. Pack credits: Kenney, Tony Schär |
| Mini Arena colour map | `assets/models/kenney-mini-arena/Textures/colormap.png` | [same repository](https://github.com/KenneyNL/Starter-Kit-Basic-Scene/blob/a6927e66ff8dd8e173660ce4825abe773c65f683/sample/Mini%20Arena/Models/GLB%20format/Textures/colormap.png) | CC0 1.0 | Not required |

**How the licences were checked:** both repositories belong to Kenney's official GitHub account (`KenneyNL`).
- The Platformer Kit README says: *"Assets included in this package (2D sprites, 3D models and sound effects) are CC0 licensed"*. The kit's code is MIT licensed, and none of that code is used here.
- The Mini Arena pack ships its own `License.txt`, which says *"License: (Creative Commons Zero, CC0)"*. It's copied unchanged into `assets/models/kenney-mini-arena/`.

**Converted copy:** `assets/kenney-models.js` holds the same three models as vertex-coloured data, made by `tools/glb_to_geo.py`. Island Escape carries an inline copy of it.

## Everything else is original

The rest of this folder was written for this project: the renderer, materials, sky, shadows, palms, bushes, trees, rocks, clouds, the explorer character and the tools.
- The colours of the style reference were matched by eye.
- No textures, models or images were taken from the reference picture.
- `reference/3d-style-reference.jpg` is the teacher's own reference image. It's kept for art direction only and is never shipped in a game.

## Sources tried but not used

This build environment's network policy blocked these sites, so nothing was downloaded from them:
- kenney.nl
- quaternius.com
- polyhaven.com
- ambientcg.com

They're good CC0 sources for future work:
- **Kenney Nature Kit**: https://kenney.nl/assets/nature-kit (CC0). Palms, rocks, cliffs, flowers and bridges, with the same colour-map workflow, so `tools/glb_to_geo.py` converts them as-is.
- **Quaternius Ultimate Stylized Nature**: https://quaternius.com/packs/ultimatestylizednature.html (CC0)
- **Poly Haven** textures and HDRIs: https://polyhaven.com (CC0)
- **ambientCG** materials: https://ambientcg.com (CC0)

Check the licence on the actual source page before downloading.
