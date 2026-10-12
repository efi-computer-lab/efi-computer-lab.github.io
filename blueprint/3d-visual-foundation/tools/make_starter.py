#!/usr/bin/env python3
"""make_starter.py — build starter/Starter_3D_Game.html: a single offline HTML file with the Game Kit runtime, the
3D Visual Foundation (latest src/) and the small game in starter/starter-game.js.

    python3 tools/make_starter.py SOURCE_GAME.html [OUT.html]

SOURCE_GAME.html is any published Game Kit first-person-3d game that already contains the foundation blocks
(for example Tool_G6-7_Island_Escape.html). Only the engine is taken from it: core, game types, models, the island
world builder and the general mechanics. Its story, worlds and game script are left out. The foundation blocks are
refreshed from src/, and the game type gets the school-lab hardware detection (GK.Renderer.detect).
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
F = os.path.dirname(HERE)
KEEP = [
    'game-types/index.js', 'mechanics/index.js', 'worlds/index.js',
    'core/core.js', 'core/rules.js', 'core/store.js', 'core/input.js', 'core/audio.js', 'core/ui.js', 'core/scoring.js',
    'core/validate.js', 'core/teacher.js', 'core/game.js',
    'game-types/_spatial/geometry.js', 'game-types/../assets/models/lowpoly.js', 'game-types/../assets/models/circuit.js',
    'game-types/../assets/models/combat.js', 'game-types/../assets/models/people.js', 'game-types/_spatial/physics.js',
    'game-types/_spatial/body.js', 'game-types/_spatial/world.js', 'game-types/../worlds/_parts.js', 'game-types/_spatial/spatial.js',
    'game-types/first-person-3d/renderer.js', 'game-types/first-person-3d/type.js',
    'worlds/_course.js', 'assets/models/island.js', 'assets/models/wild.js', 'worlds/_wild.js',
    'assets/models/kenney-models.js', 'assets/models/stylized-characters.js', 'assets/models/stylized-nature.js',
    'mechanics/interaction/interaction.js', 'mechanics/inventory/inventory.js', 'mechanics/objectives/objectives.js',
    'mechanics/dialogue/dialogue.js', 'mechanics/puzzles/puzzles.js', 'mechanics/world-objects/world-objects.js',
    'mechanics/npcs/npcs.js', 'mechanics/music/music.js',
]
FRESH = {   # foundation blocks: always the latest blueprint source
    'game-types/_spatial/geometry.js': 'src/gk-geo.js',
    'game-types/first-person-3d/renderer.js': 'src/gk-renderer.js',
    'assets/models/kenney-models.js': 'assets/kenney-models.js',
    'assets/models/stylized-characters.js': 'src/stylized-characters.js',
    'assets/models/stylized-nature.js': 'src/stylized-nature.js',
}
# school-lab hardware detection in the first-person-3d game type (see INTEGRATION_GUIDE "Lab hardware")
LAB_HOOKS = [
    ("""      this.renderer = new GK.Renderer(this.canvas, { pixelRatio: 1, antialias: r.antialias, far: r.far });""",
     """      this.detected = GK.Renderer.detect ? GK.Renderer.detect() : null;   // what this computer can draw (school lab PCs)
      if (this.detected) console.info('[GK] graphics: ' + this.detected.tier + ' (' + this.detected.reason + ')');
      this.renderer = new GK.Renderer(this.canvas, { pixelRatio: 1, antialias: r.antialias != null ? r.antialias : !this.detected || this.detected.antialias, far: r.far });"""),
    ("""      this.renderer.pixelRatio = Math.min(r.pixelRatio || 1, window.devicePixelRatio || 1) * (low ? 0.6 : 1);
      this.renderer.setQuality(low ? { bloom: false, lights: 3, shadows: false, detail: false } : { bloom: r.bloom !== false, lights: 8, shadows: r.shadows !== false, detail: true });""",
     """      const det = this.detected;
      if (low) {
        this.renderer.pixelRatio = Math.min(r.pixelRatio || 1, window.devicePixelRatio || 1) * 0.6;
        this.renderer.setQuality({ bloom: false, lights: 3, shadows: false, detail: false });
      } else if (det) {   // "normal" = the best this computer can do (renderer.adapt() still lowers it while playing)
        this.renderer.pixelRatio = Math.min(r.pixelRatio || det.pixelRatio, det.pixelRatio);
        this.renderer.setQuality(Object.assign({}, det.quality, r.bloom === false ? { bloom: false } : {}, r.shadows === false ? { shadows: false } : {}));
      } else {
        this.renderer.pixelRatio = Math.min(r.pixelRatio || 1, window.devicePixelRatio || 1);
        this.renderer.setQuality({ bloom: r.bloom !== false, lights: 8, shadows: r.shadows !== false, detail: true });
      }"""),
]


def blocks(html):
    out = {}
    for m in re.finditer(r'<script>/\* (.+?) \*/\n', html):
        end = html.find('</script>', m.end())
        out[m.group(1)] = html[m.start():end + len('</script>')]
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = open(sys.argv[1], encoding='utf-8').read()
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(F, 'starter', 'Starter_3D_Game.html')
    b = blocks(src)
    css = re.search(r'<style>/\* core/gk\.css \*/.*?</style>', src, re.S)
    missing = [k for k in KEEP if k not in b]
    if missing or not css:
        sys.exit('source game is missing: ' + ', '.join(missing or ['core/gk.css']))
    parts = []
    for k in KEEP:
        if k in FRESH:
            body = open(os.path.join(F, FRESH[k]), encoding='utf-8').read().rstrip('\n')
            parts.append('<script>/* ' + k + ' */\n' + body + '\n\n</script>')
        else:
            text = b[k]
            if k == 'game-types/first-person-3d/type.js':
                for a, c in LAB_HOOKS:
                    if text.count(a) != 1:
                        sys.exit('type.js hook anchor not found (the Game Kit changed?): ' + a[:70])
                    text = text.replace(a, c)
            parts.append(text)
    game = open(os.path.join(F, 'starter', 'starter-game.js'), encoding='utf-8').read().rstrip('\n')
    html = '\n'.join([
        '<!doctype html>', '<html lang="en">', '<head>', '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">', '<meta name="robots" content="noindex">',
        '<title>Starter Island · 3D starter game</title>', '</head>', '<body>', '<div id="gk-root"></div>',
        css.group(0),
        '<script>window.GK_LOADER = { result: { warnings: [] } };</script>',
        '\n'.join(parts),
        '<script>/* starter-game.js */\n' + game + '\n\n</script>',
        '<script>GK.start(window.GAME);</script>',
        '</body>', '</html>', ''])
    open(out_path, 'w', encoding='utf-8').write(html)
    print('wrote', out_path, len(html) // 1024, 'KB from', os.path.basename(sys.argv[1]))


if __name__ == '__main__':
    main()
