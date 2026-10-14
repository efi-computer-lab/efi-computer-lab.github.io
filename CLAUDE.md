# EFI Computer Lab: standing instructions for Claude

Read `PROJECT_NOTES.md` first (history and open items).

This is the teacher's (Ray's) public site of offline computer-class games and tools for Grades 6–12:
https://efi-computer-lab.github.io/ (GitHub Pages from `main`).

## Work without asking
- Do the whole job: build, test, commit, push, open the pull request **and merge it into `main`**. Don't ask "should I create/merge the PR?". The teacher has approved this for every task.
- Only stop to ask when the request is unclear, or when the change would delete a game or remove content students use.
- Fix problems you find on the way (failed checks, merge conflicts with newer `main`) instead of reporting them back.
- Explain results in plain, short language. The teacher is not a programmer.

## No Ctrl+F5 for the teacher (browser cache)
GitHub Pages lets browsers keep an old copy of a page for about 10 minutes. Whenever you change a game or tool:
- In `index.html` and `START_HERE_Computer_Lab.html`, add or update a version on that game's link: `Tool_X.html?v=YYYYMMDDHHMM` (the time of the change).
- Never tell the teacher to press Ctrl+F5. Just give the link. If they open it within 10 minutes of a merge, it may still be loading the old copy, so say "ready in about 2 minutes".

## How the games are made
- Most 3D games (Island Escape, Cyber Rush, SHRUNK!…) are built in the teacher's separate **Game Kit project** and published here as "Update Computer Lab tools" commits. A publish overwrites the game HTML files.
- For a lasting change, change the Game Kit project. If you can only reach this repository, change the HTML here and tell the teacher, in one line, that the next publish will undo it unless the Game Kit gets the same change.

## 3D style and school lab computers
- Reuse `blueprint/3d-visual-foundation/`. Read its `README.md`, `ART_DIRECTION.md` and `INTEGRATION_GUIDE.md`. New 3D games start from `starter/`.
- **Lab PCs are old:** 4–8 GB memory, no graphics card, Windows, Chrome or Edge.
  - Keep `GK.Renderer.detect()` and `renderer.adapt()`.
  - Stay within about 60k triangles per world.
  - Every game must look good and be playable at the "minimal" graphics level.
- Games must stay single, offline HTML files (they also run from `file://`).
- Downloaded assets: CC0 from official sources only. Record them in `blueprint/3d-visual-foundation/ASSET_CREDITS.md` and `ASSET_MANIFEST.json`.

## Testing before merging
- Load each changed page in headless Chromium (Playwright is installed), with no console errors.
- For games, start the game and check every level or act loads. Take screenshots when the look changed.
- New tools go on the home page (`index.html` and `START_HERE_Computer_Lab.html`) and in `sitemap.xml`.
