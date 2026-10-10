# Prompt template: reuse the 3D style in a new tool

Copy, fill in the brackets and give it to Claude:

---

Build/upgrade **[GAME FILE or idea, e.g. "Tool_G8-9_Shrunk_Virus_Hunt.html" / "a Grade 7 jungle maths race"]** using the existing 3D Visual Foundation in `blueprint/3d-visual-foundation/`. Don't rebuild it.

1. Read `blueprint/3d-visual-foundation/README.md`, `ART_DIRECTION.md` and `INTEGRATION_GUIDE.md` first.
2. Use the foundation as-is:
   - Game Kit game: follow INTEGRATION_GUIDE part A (`tools/inline_blocks.py` plus the three type.js hooks).
   - New page: follow part B.
   Keep the game a single offline HTML file.
3. Look: **[preset: tropicalDay / goldenHour / storm / cave / indoorLab]**, with these scene changes: **[e.g. "volcano island at sunset", "underwater ruins", "school computer lab"]**. Follow the palette, shapes and budgets in ART_DIRECTION.md (about 120k triangles max outdoors, low-graphics path kept).
4. Reuse the models in `src/stylized-nature.js` and `src/stylized-characters.js`. Add new models in the same rounded style. Only download new assets if they clearly help: CC0 from official sources (Kenney, Quaternius, Poly Haven, ambientCG). Check the licence on the source page, convert with `tools/glb_to_geo.py`, and record them in ASSET_MANIFEST.json and ASSET_CREDITS.md.
5. Keep gameplay, controls, scoring and saves unchanged unless I ask otherwise.
6. Validate: no console errors, every level loads, low graphics works, before/after screenshots. Report changes, assets, checks and remaining issues briefly.

---

**Tips**
- Name the game file and the acts or levels that matter most.
- Attach a reference image if the new game needs a different mood. It goes in `blueprint/3d-visual-foundation/reference/`.
- If the foundation itself should improve (for example a new water style), ask for the change in `src/` **and** for every game that uses it to be rebuilt.
