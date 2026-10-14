# Project notes: what has been done (read this first)

Shared memory for every Claude session working on the EFI Computer Lab site. Standing rules are in `CLAUDE.md`.
Add a short dated line here after each big change.

## Where things are
- **Website** (this repository): `efi-computer-lab/efi-computer-lab.github.io`, published by GitHub Pages from `main`.
- **Game Kit project** (on the teacher's computer, not on GitHub): builds the 3D games and publishes them here as "Update Computer Lab tools" commits. Reach it with the Claude Desktop app or `claude rc` in that folder. Instruction files for it: `blueprint/3d-visual-foundation/for-game-kit-project/`.
- **3D style blueprint:** `blueprint/3d-visual-foundation/`, with a README, art rules, integration guide, prompt template, the starter game in `starter/`, and tools.

## History
- **Sep 2026** ("Computer Tools W1–W5" sessions, run from the Game Kit on the teacher's PC): built and updated the computer-class tools and games, including Cyber Rush (online class race, teacher player-count fix, its test suite passes 230/230).
- **2026-10-10** ("3D Style" session): new 3D style for Island Escape: sky, shadows, surface detail, water, rounded models and characters, Kenney CC0 assets. Created the blueprint (PR #1).
- **2026-10-10**: Cyber Rush gets the same style, keeping its neon worlds (PR #2).
- **2026-10-10**: a Game Kit publish overwrote both games, so the style was reapplied (PR #3). Since then the Game Kit itself includes the style.
- **2026-10-12**: lab-PC hardware detection (minimal / low / medium / high), lower-resolution fallback, and the starter game (PR #4).
- **2026-10-12**: `CLAUDE.md` standing instructions, `.claude/settings.json` permissions, `?v=` versions on game links so no Ctrl+F5 is needed (PR #5).
- **2026-10-13**: removed the quiz deadline reminder pop-up from Cyber Rush only (PR #6). The Game Kit still has it, so a new Cyber Rush publish would bring it back (it expired 2026-10-13 23:59 anyway).

## Still open
- Copy `blueprint/3d-visual-foundation/for-game-kit-project/` files into the Game Kit folder, then update the Game Kit from the latest blueprint (adds lab-PC detection).
- Check the graphics level on a real lab PC (`blueprint/3d-visual-foundation/examples/island-demo.html` shows it).
- Asset sites (kenney.nl, quaternius.com, polyhaven.com, ambientcg.com) are blocked in the cloud environment until the teacher allows them.
- 3D games without the new style: SHRUNK! ×2, Cyber Detective, Cyber Arena, Game Studio.
