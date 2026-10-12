# Game Kit project: standing instructions for Claude

This folder makes the teacher's (Ray's) computer-class games and publishes them to the site repository
`efi-computer-lab/efi-computer-lab.github.io` (https://efi-computer-lab.github.io/, served from `main`).

## Work without asking
- Do the whole job: make or change the game, test it, build it, **publish it to the site and merge to `main`**. Don't ask "should I publish/merge?". The teacher has approved this for every task.
- Only stop to ask when the request is unclear, or when a change would delete a game or remove content students use.
- Fix problems you find on the way instead of reporting them back. Keep explanations short and plain; the teacher is not a programmer.

## Every publish: no Ctrl+F5 needed
- In the site's `index.html` and `START_HERE_Computer_Lab.html`, every changed game's link gets a fresh version: `Tool_X.html?v=YYYYMMDDHHMM` (the publish time).
- Never tell the teacher to press Ctrl+F5. Give the link and say it's "ready in about 2 minutes".
- Before publishing, pull the site's latest `main`, so you never overwrite work that was done directly on the site.

## 3D style (keep it in every 3D game)
- The 3D Visual Foundation lives in the site repo under `blueprint/3d-visual-foundation/`. This Game Kit must keep the same versions of:
  - `game-types/_spatial/geometry.js` (from `src/gk-geo.js`)
  - `game-types/first-person-3d/renderer.js` (from `src/gk-renderer.js`)
  - the hooks in `game-types/first-person-3d/type.js` (`INTEGRATION_GUIDE.md` parts A and 2b)
  - the model files `stylized-nature.js`, `stylized-characters.js` and `kenney-models.js`
- When the blueprint `src/` changes, copy it in here before the next publish.
- New 3D games start from `blueprint/3d-visual-foundation/starter/starter-game.js` and follow `ART_DIRECTION.md`.

## School lab computers
- Old PCs: 4–8 GB memory, no graphics card, Windows, Chrome or Edge.
- Keep `GK.Renderer.detect()` and `renderer.adapt()`. Stay within about 60k triangles per world.
- Every game must look good and be playable at the "minimal" graphics level, and with the teacher's "low graphics" setting.
- Games are single offline HTML files that also run from `file://`.

## Testing before publishing
- Open each changed game in a headless browser: no console errors, every level or act loads and can be finished.
- New games go on the site's home page and in `sitemap.xml`.
