#!/usr/bin/env python3
"""glb_to_geo.py — turn small GLB models (Kenney / Quaternius style: one colour-swatch texture or plain material
colours) into compact vertex-coloured data for GK.Geo.addData(), as a classic <script> that works from file://.

    python3 glb_to_geo.py OUT.js name=path/to/model.glb [name2=other.glb ...] [--var GK.ModelData]

Each model becomes  GK.ModelData[name] = {q: 1000, p: [x,y,z,...] (mm), n: [nx,ny,nz,...] (x100), i: [palette index per vertex], pal: ['#rrggbb', ...]}
(de-indexed triangles, front = +z, standing on y = 0, centred on x/z, sizes in metres as authored).
Colours come from the base colour texture sampled at each vertex's UV (Kenney colormaps are flat swatches, so this is
exact) times the material's baseColorFactor. Needs Python 3 + Pillow (pip install pillow). No other dependencies.
"""
import io, json, math, os, struct, sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit('Pillow is needed: pip install pillow')

COMP = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load_glb(path):
    b = open(path, 'rb').read()
    if b[:4] != b'glTF':
        sys.exit(path + ': not a .glb file')
    off, js, binc = 12, None, b''
    while off < len(b):
        ln, typ = struct.unpack('<II', b[off:off + 8])
        chunk = b[off + 8:off + 8 + ln]
        if typ == 0x4E4F534A:
            js = json.loads(chunk)
        elif typ == 0x004E4942:
            binc = chunk
        off += 8 + ln
    return js, binc


def accessor(js, binc, idx):
    a = js['accessors'][idx]
    bv = js['bufferViews'][a['bufferView']]
    fmt, size = COMP[a['componentType']]
    n = NCOMP[a['type']]
    stride = bv.get('byteStride') or size * n
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    out = []
    for k in range(a['count']):
        o = base + k * stride
        v = struct.unpack('<' + fmt * n, binc[o:o + size * n])
        if a.get('normalized') and fmt != 'f':
            mx = float((1 << (size * 8 - (0 if fmt.isupper() else 1))) - 1)
            v = tuple(max(-1.0, x / mx) for x in v)
        out.append(v)
    return out


def mat_mul(a, b):
    return [sum(a[r + 4 * k] * b[k + 4 * c] for k in range(4)) for c in range(4) for r in range(4)]


def node_matrix(nd):
    if 'matrix' in nd:
        return nd['matrix']
    t = nd.get('translation', [0, 0, 0]); r = nd.get('rotation', [0, 0, 0, 1]); s = nd.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
         2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
         2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1]
    S = [s[0], 0, 0, 0, 0, s[1], 0, 0, 0, 0, s[2], 0, 0, 0, 0, 1]
    T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1]
    return mat_mul(T, mat_mul(R, S))


def xform(m, v, w):
    return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * w,
            m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * w,
            m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * w]


def image_of(js, binc, path, tex_index, cache):
    if tex_index in cache:
        return cache[tex_index]
    src = js['textures'][tex_index]['source']
    im = js['images'][src]
    if 'bufferView' in im:
        bv = js['bufferViews'][im['bufferView']]
        data = binc[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        img = Image.open(io.BytesIO(data))
    else:
        p = os.path.join(os.path.dirname(path), im['uri'])
        if not os.path.exists(p):  # Kenney kits keep the colormap next to the models or in Textures/
            alt = os.path.join(os.path.dirname(path), 'Textures', os.path.basename(im['uri']))
            p = alt if os.path.exists(alt) else p
        img = Image.open(p)
    img = img.convert('RGBA')
    cache[tex_index] = img
    return img


def convert(path):
    js, binc = load_glb(path)
    P, N, C = [], [], []
    texcache = {}

    def walk(ni, parent):
        nd = js['nodes'][ni]
        m = mat_mul(parent, node_matrix(nd))
        if 'mesh' in nd:
            for prim in js['meshes'][nd['mesh']]['primitives']:
                if prim.get('mode', 4) != 4:
                    continue
                at = prim['attributes']
                pos = accessor(js, binc, at['POSITION'])
                nor = accessor(js, binc, at['NORMAL']) if 'NORMAL' in at else None
                uv = accessor(js, binc, at['TEXCOORD_0']) if 'TEXCOORD_0' in at else None
                idx = [i[0] for i in accessor(js, binc, prim['indices'])] if 'indices' in prim else list(range(len(pos)))
                mat = js['materials'][prim['material']] if 'material' in prim else {}
                pbr = mat.get('pbrMetallicRoughness', {})
                fac = pbr.get('baseColorFactor', [1, 1, 1, 1])
                img = image_of(js, binc, path, pbr['baseColorTexture']['index'], texcache) if 'baseColorTexture' in pbr and uv else None
                for t in range(0, len(idx) - 2, 3):
                    tri = idx[t:t + 3]
                    pts = [xform(m, pos[i], 1) for i in tri]
                    if nor:
                        ns = [xform(m, nor[i], 0) for i in tri]
                    else:
                        a, b, c = pts
                        u = [b[k] - a[k] for k in range(3)]; v = [c[k] - a[k] for k in range(3)]
                        fn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
                        ns = [fn, fn, fn]
                    for k, i in enumerate(tri):
                        col = [fac[0], fac[1], fac[2]]
                        if img:
                            w, h = img.size
                            uu, vv = uv[i]
                            px = img.getpixel((min(w - 1, max(0, int((uu % 1.0) * w))), min(h - 1, max(0, int((vv % 1.0) * h)))))
                            col = [col[j] * px[j] / 255.0 for j in range(3)]
                        nn = ns[k]; l = math.sqrt(sum(x * x for x in nn)) or 1
                        P.append(pts[k]); N.append([x / l for x in nn])
                        C.append('#%02x%02x%02x' % tuple(int(round(min(1, max(0, x)) * 255)) for x in col))
        for ch in nd.get('children', []):
            walk(ch, m)

    ident = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    scene = js['scenes'][js.get('scene', 0)]
    for ni in scene['nodes']:
        walk(ni, ident)
    # centre on x/z, stand on y = 0
    xs = [p[0] for p in P]; ys = [p[1] for p in P]; zs = [p[2] for p in P]
    cx, cz, y0 = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2, min(ys)
    pal = sorted(set(C))
    out = {
        'q': 1000,  # positions are whole millimetres, normals whole hundredths: divide by q / 100
        'p': [int(round(v * 1000)) for p in P for v in (p[0] - cx, p[1] - y0, p[2] - cz)],
        'n': [int(round(v * 100)) for n in N for v in n],
        'i': [pal.index(c) for c in C],
        'pal': pal,
    }
    size = [round(max(xs) - min(xs), 3), round(max(ys) - min(ys), 3), round(max(zs) - min(zs), 3)]
    return out, len(P) // 3, size


def main():
    args = sys.argv[1:]
    var = 'GK.ModelData'
    if '--var' in args:
        k = args.index('--var'); var = args[k + 1]; del args[k:k + 2]
    if len(args) < 2:
        sys.exit(__doc__)
    out_path, pairs = args[0], args[1:]
    lines = ['/* Generated by blueprint/3d-visual-foundation/tools/glb_to_geo.py — see ASSET_CREDITS.md for sources and licences. */',
             'window.GK = window.GK || {}; ' + var + ' = ' + var + ' || {};']
    for pr in pairs:
        name, path = pr.split('=', 1)
        data, tris, size = convert(path)
        lines.append('/* %s: %s · %d triangles · size %s m */' % (name, os.path.basename(path), tris, size))
        lines.append('%s[%s] = %s;' % (var, json.dumps(name), json.dumps(data, separators=(',', ':'))))
        print('%-18s %4d triangles  size %s  colours %d' % (name, tris, size, len(data['pal'])))
    open(out_path, 'w').write('\n'.join(lines) + '\n')
    print('wrote', out_path, os.path.getsize(out_path) // 1024, 'KB')


if __name__ == '__main__':
    main()
