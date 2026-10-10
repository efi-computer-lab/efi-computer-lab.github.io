#!/usr/bin/env python3
"""inline_blocks.py — put blueprint source files INSIDE a single-file HTML game (Game Kit builds keep every file as a
<script>/* path */ ... </script> block, so the game still runs offline from file:// with no extra files).

    python3 inline_blocks.py GAME.html  replace:game-types/_spatial/geometry.js=src/gk-geo.js \
                                       after:game-types/_spatial/geometry.js:assets/kenney-models.js=assets/kenney-models.js

  replace:BLOCK=FILE            swap the body of the block whose first line is <script>/* BLOCK */
  after:BLOCK:NEWNAME=FILE      insert (or refresh, if NEWNAME already exists) a new block right after BLOCK
Run it again after editing a source file: blocks are found by name, so it is safe to repeat.
"""
import re, sys


def find(html, name):
    tag = '<script>/* ' + name + ' */'
    i = html.find(tag)
    if i < 0:
        return None
    j = html.find('</script>', i)
    return i, j + len('</script>')


def block(name, body):
    return '<script>/* ' + name + ' */\n' + body.rstrip('\n') + '\n\n</script>'


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    path, ops = sys.argv[1], sys.argv[2:]
    html = open(path, encoding='utf-8').read()
    for op in ops:
        kind, rest = op.split(':', 1)
        if kind == 'replace':
            name, src = rest.split('=', 1)
            span = find(html, name)
            if not span:
                sys.exit('no block named ' + name)
            html = html[:span[0]] + block(name, open(src, encoding='utf-8').read()) + html[span[1]:]
        elif kind == 'after':
            left, src = rest.rsplit('=', 1)
            anchor, name = left.split(':', 1)
            body = block(name, open(src, encoding='utf-8').read())
            old = find(html, name)
            if old:
                html = html[:old[0]] + body + html[old[1]:]
            else:
                span = find(html, anchor)
                if not span:
                    sys.exit('no block named ' + anchor)
                html = html[:span[1]] + '\n' + body + html[span[1]:]
        else:
            sys.exit('unknown operation ' + op)
        print('ok', op)
    open(path, 'w', encoding='utf-8').write(html)


if __name__ == '__main__':
    main()
