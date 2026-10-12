# Prompt template: a new game in the same 3D style

Copy, fill in the brackets and give it to Claude:

---

Make **[game idea, e.g. "a Grade 7 internet-safety jungle adventure, 3 short levels, about 30 minutes"]** using the
3D Visual Foundation in `blueprint/3d-visual-foundation/`. Don't rebuild it.

1. Read `blueprint/3d-visual-foundation/README.md`, `ART_DIRECTION.md` and `INTEGRATION_GUIDE.md` first.
2. **Start from the starter game:** `starter/starter-game.js` and `tools/make_starter.py`, or the Game Kit source project if you have it. Keep the game a single offline HTML file.
3. **Our lab computers are old:** 4–8 GB memory, no graphics card, Windows, Chrome or Edge.
   - Keep the hardware detection (`GK.Renderer.detect`) and `renderer.adapt()`.
   - Stay within about 60k triangles per world.
   - The game must look good and be fully playable at the **minimal** level (no shadows, no surface detail).
4. **Look:** **[preset: tropicalDay / goldenHour / storm / cave / neonNight / indoorLab]**, with scene ideas **[e.g. "jungle temple", "space station"]**. Follow ART_DIRECTION.md.
5. **Content:** grade **[ ]**, topic **[ ]**, lesson goal **[ ]**. Questions: **[paste them, or "write them for me"]**.
6. **Must-haves:** **[levels / scoring / leaderboard / teacher mode / time limit / online play]**.
7. Reuse the models in `src/stylized-nature.js` and `src/stylized-characters.js`, and make new ones in the same rounded style. Only download new assets if they clearly help: CC0 from official sources (Kenney, Quaternius, Poly Haven, ambientCG). Check the licence, convert with `tools/glb_to_geo.py`, and record them in ASSET_MANIFEST.json and ASSET_CREDITS.md.
8. **Validate:**
   - no console errors
   - every level can be finished
   - the browser console shows the `[GK] graphics:` level
   - teacher low graphics works

   Then publish it and add it to the site's home page and sitemap.

---

**Tips**
- Attach a reference image for a new mood. It goes in `blueprint/3d-visual-foundation/reference/`.
- To change the style for every game (for example, new water), ask for the change in `src/`, then rebuild the starter and every game that uses it.
