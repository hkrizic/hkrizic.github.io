"""Vinyl figure parts kit for Agent Office → public/assets/models/pop_kit.glb (runs headless in Blender 5.x).

    Blender -b --factory-startup -P scripts/blender/build_pop_kit.py -- --out public/assets/models/pop_kit.glb

Every part is its own object whose origin sits on its joint (neck, shoulder, hip…), so three.js can hang it on
a pivot and rotate it like a toy. Materials are named by ROLE (skin, hair, top, pants, shoes, eye, accent, frame,
white, lens) — three.js clones and colours them per figure. Front = -Y in Blender (→ +Z in three.js).
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True)
args = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
sys.path.append(os.path.dirname(__file__))
import pop_kit as K  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# role materials (neutral placeholder colours; three.js recolours clones per figure)
ROLE = {r: K.vinyl(r, K.hexc(c), rough=rough, coat=coat) for r, c, rough, coat in (
    ('skin', '#F2C9A5', 0.34, 0.5), ('hair', '#3B2A20', 0.3, 0.6), ('top', '#D9774B', 0.36, 0.45),
    ('pants', '#3A3F4A', 0.4, 0.4), ('shoes', '#F4F1EC', 0.34, 0.5), ('accent', '#FFFFFF', 0.3, 0.5),
    ('frame', '#1A1A1A', 0.2, 0.6), ('white', '#F7F7F4', 0.3, 0.4))}
ROLE['accent2'] = K.vinyl('accent2', K.hexc('#2EC4B6'), rough=0.36, coat=0.45)   # 2nd outfit colour (inner tee, stripes, vest…)
ROLE['blush'] = K.vinyl('blush', K.hexc('#F29C8F'), rough=0.6, coat=0.1)
ROLE['gold'] = K.vinyl('gold', K.hexc('#E9B949'), rough=0.2, coat=0.6, metal=0.7)
ROLE['eye'] = K.vinyl('eye', (0.005, 0.005, 0.006), rough=0.05, coat=1.0)
ROLE['lens'] = K.vinyl('lens', (0.02, 0.02, 0.025), rough=0.05, coat=1.0)

NECK, HIP_Y = 0.49, 0.21
SHOULDER = (0.155, 0.43)
HIP_JOINT = (0.066, 0.2)


def finish(objs, name, pivot):
    """Join objects into one part named `name`, origin at `pivot`, modifiers applied."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    part = bpy.context.view_layer.objects.active
    part.name = name + '_mesh'
    part.data.name = name
    bpy.context.scene.cursor.location = pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    # the joint: an empty at the pivot. Mesh optimisers may re-center the mesh node (quantization);
    # the joint node never moves, so three.js rotates parts around the right point.
    joint = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(joint)
    joint.location = pivot
    part.parent = joint
    part.location = (0, 0, 0)
    return joint


R, S, C, Sh = K.rounded_box, K.sphere, K.capsule, K.hair_shell
M = ROLE


def mitten(s):
    """Mitten hand + a little thumb pointing forward."""
    return [S('Hand', 0.046, (s * 0.173, 0, 0.245), M['skin']), S('Thumb', 0.02, (s * 0.162, -0.04, 0.262), M['skin'], scale=(1, 1, 1.2), seg=16)]

# ---- head (skin) + nose + ears, eyes separate (they blink)
head = [R('Head', (0.5, 0.44, 0.42), (0, 0, 0.72), M['skin'], bevel=0.12, subsurf=2, taper=0.12),
        S('Nose', 0.018, (0, -0.222, 0.645), M['skin'], scale=(1.3, 0.8, 0.9))]
head += [S(f'Ear{s}', 0.04, (s * 0.25, 0.0, 0.7), M['skin'], scale=(0.6, 0.9, 1.2)) for s in (-1, 1)]
finish(head, 'Head', (0, 0, NECK))
for s, side in ((-1, 'R'), (1, 'L')):
    ex, ez = s * 0.115, 0.69
    # glossy black eye + two catch-lights (same light direction on both eyes) — what makes a vinyl face feel alive
    finish([S(f'Eye{side}', 0.062, (ex, -0.2, ez), M['eye'], scale=(1, 0.45, 1.05)),
            S(f'Glint{side}', 0.017, (ex - 0.021, -0.2245, ez + 0.026), M['white'], scale=(1, 0.3, 1.1), seg=16),
            S(f'Glint2{side}', 0.008, (ex + 0.02, -0.2235, ez - 0.02), M['white'], scale=(1, 0.3, 1), seg=12)], f'Eye{side}', (ex, -0.2, ez))

# ---- hair styles (sculpted shells that wrap the head); origin = neck so they ride on the head
finish([Sh('h', 0, M['hair'], 0.86, 0.66), R('Fringe', (0.42, 0.1, 0.07), (-0.02, -0.2, 0.87), M['hair'], bevel=0.035, subsurf=2, rot=(0.35, 0, 0.12))], 'Hair_short', (0, 0, NECK))
finish([Sh('h', 0, M['hair'], 0.84, 0.64), R('Swoop', (0.4, 0.3, 0.13), (-0.04, -0.07, 0.99), M['hair'], bevel=0.06, subsurf=2, rot=(0.15, 0, 0.28))], 'Hair_swoop', (0, 0, NECK))
finish([Sh('h', 0, M['hair'], 0.84, 0.62), S('Bun', 0.1, (0, 0.1, 1.0), M['hair'])], 'Hair_bun', (0, 0, NECK))
curls = [Sh('h', 0, M['hair'], 0.86, 0.64), S('CurlTop', 0.17, (0, 0.02, 0.96), M['hair'], scale=(1.3, 1.1, 0.6))]
curls += [S(f'Curl{i}', 0.085, (math.cos(i / 16 * math.tau) * 0.21, math.sin(i / 16 * math.tau) * 0.18 + 0.03, 0.9 + 0.035 * math.sin(i * 2.1)), M['hair']) for i in range(16)]
finish(curls, 'Hair_curly', (0, 0, NECK))
finish([Sh('h', 0, M['hair'], 0.88, 0.5), R('Back', (0.5, 0.16, 0.38), (0, 0.17, 0.62), M['hair'], bevel=0.07, subsurf=2),
        R('Fringe', (0.46, 0.1, 0.08), (0, -0.2, 0.86), M['hair'], bevel=0.04, subsurf=2, rot=(0.3, 0, 0))], 'Hair_long', (0, 0, NECK))
finish([Sh('h', 0, M['hair'], 0.9, 0.7, grow=1.03)], 'Hair_buzz', (0, 0, NECK))
finish([Sh('h', 0, M['hair'], 0.86, 0.62), C('Tail', 0.06, 0.26, (0, 0.27, 0.72), M['hair'], rot=(0.5, 0, 0))], 'Hair_ponytail', (0, 0, NECK))

# ---- head accessories
def glasses(name, lens=False):
    objs = []
    for s in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=8, major_radius=0.08, minor_radius=0.011, location=(s * 0.115, -0.215, 0.69), rotation=(math.pi / 2, 0, 0))
        t = bpy.context.active_object; t.data.materials.append(M['frame']); bpy.ops.object.shade_smooth(); objs.append(t)
        if lens:
            objs.append(S(f'Lens{s}', 0.075, (s * 0.115, -0.212, 0.69), M['lens'], scale=(1, 0.2, 0.9)))
    objs.append(R('Bridge', (0.07, 0.015, 0.015), (0, -0.225, 0.7), M['frame'], bevel=0.005, subsurf=0))
    return finish(objs, name, (0, 0, NECK))


glasses('Glasses')
glasses('Sunglasses', lens=True)
bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=8, major_radius=0.285, minor_radius=0.022, location=(0, 0.02, 0.76), rotation=(math.pi / 2, 0, 0))
band = bpy.context.active_object; band.data.materials.append(M['frame']); bpy.ops.object.shade_smooth()
cups = [C(f'Cup{s}', 0.075, 0.07, (s * 0.27, 0.02, 0.7), M['frame'], rot=(0, math.pi / 2, 0)) for s in (-1, 1)]
finish([band] + cups, 'Headphones', (0, 0, NECK))
bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=8, major_radius=0.285, minor_radius=0.016, location=(0, 0.02, 0.76), rotation=(math.pi / 2, 0, 0))
band2 = bpy.context.active_object; band2.data.materials.append(M['frame']); bpy.ops.object.shade_smooth()
mic = C('Mic', 0.012, 0.22, (-0.2, -0.16, 0.6), M['frame'], rot=(1.2, 0, 0.6))
finish([band2, C('Pad', 0.06, 0.05, (-0.27, 0.02, 0.7), M['frame'], rot=(0, math.pi / 2, 0)), mic, S('MicTip', 0.025, (-0.14, -0.24, 0.57), M['accent'])], 'Headset', (0, 0, NECK))
finish([R('Beanie', (0.54, 0.48, 0.26), (0, 0.02, 0.92), M['accent'], bevel=0.1, subsurf=2), R('Cuff', (0.56, 0.5, 0.07), (0, 0.02, 0.82), M['accent'], bevel=0.03, subsurf=1),
        S('Pom', 0.06, (0, 0.02, 1.07), M['accent'])], 'Beanie', (0, 0, NECK))
finish([Sh('cap', 0, M['accent'], 0.9, 0.72, grow=1.1), R('Brim', (0.32, 0.22, 0.025), (0, 0.3, 0.86), M['accent'], bevel=0.01, subsurf=1)], 'Cap', (0, 0, NECK))

# ---- torsos (origin at the hips)
def torso(name, extra=()):
    base = [R('Torso', (0.25, 0.17, 0.26), (0, 0, 0.34), M['top'], bevel=0.06, subsurf=2, taper=-0.1)]
    return finish(base + list(extra), name, (0, 0, HIP_Y))


torso('Torso_tee')
torso('Torso_hoodie', [R('Hood', (0.26, 0.12, 0.1), (0, 0.08, 0.47), M['top'], bevel=0.04, subsurf=2),
                       R('Pocket', (0.16, 0.02, 0.07), (0, -0.087, 0.29), M['top'], bevel=0.01, subsurf=1)] +
      [C(f'String{s}', 0.006, 0.08, (s * 0.03, -0.09, 0.41), M['white']) for s in (-1, 1)])
torso('Torso_shirt', [R(f'Collar{s}', (0.07, 0.03, 0.04), (s * 0.04, -0.075, 0.47), M['white'], bevel=0.01, subsurf=1, rot=(0, 0, s * 0.5)) for s in (-1, 1)])
torso('Torso_suit', [R('Shirt', (0.07, 0.01, 0.2), (0, -0.087, 0.39), M['white'], bevel=0.01, subsurf=0),
                     R('Tie', (0.03, 0.012, 0.16), (0, -0.093, 0.38), M['accent'], bevel=0.008, subsurf=0)] +
      [R(f'Lapel{s}', (0.035, 0.012, 0.18), (s * 0.05, -0.09, 0.4), M['top'], bevel=0.008, subsurf=0, rot=(0, s * -0.3, 0)) for s in (-1, 1)])

# crew emblems on the chest (origin at hips so they ride on the torso)
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.03, depth=0.012, location=(0.055, -0.092, 0.4), rotation=(math.pi / 2, 0, 0))
hexo = bpy.context.active_object; hexo.data.materials.append(M['accent'])
finish([hexo], 'Emblem_codex', (0, 0, HIP_Y))
bars = []
for i in range(4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.055, -0.092, 0.4), rotation=(0, i * math.pi / 4, 0))
    o = bpy.context.active_object; o.scale = (0.012, 0.01, 0.07); o.data.materials.append(M['accent']); bars.append(o)
finish(bars, 'Emblem_claude', (0, 0, HIP_Y))

# ---- arms (origin at the shoulder) and legs (origin at the hip joint)
for s, side in ((1, 'L'), (-1, 'R')):
    finish([C('Arm', 0.045, 0.17, (s * 0.155, 0, 0.35), M['top'], rot=(0, s * 0.2, 0)), *mitten(s)],
           f'Arm{side}', (s * SHOULDER[0], 0, SHOULDER[1]))
    finish([C('Leg', 0.062, 0.15, (s * 0.066, 0, 0.12), M['pants']), R('Shoe', (0.12, 0.17, 0.07), (s * 0.066, -0.025, 0.035), M['shoes'], bevel=0.03, subsurf=1)],
           f'Leg{side}', (s * HIP_JOINT[0], 0, HIP_JOINT[1]))

# ---- hand-held props (origin at the right hand)
hand = (-0.173, 0, 0.245)
mug = K.capsule('Mug', 0.035, 0.03, (hand[0], -0.05, hand[2] + 0.02), M['white'])
finish([mug], 'Mug', hand)
finish([R('Board', (0.02, 0.16, 0.2), (hand[0] - 0.03, -0.06, hand[2] + 0.05), M['accent'], bevel=0.008, subsurf=0),
        R('Paper', (0.021, 0.13, 0.16), (hand[0] - 0.031, -0.062, hand[2] + 0.04), M['white'], bevel=0.004, subsurf=0)], 'Clipboard', (-SHOULDER[0], 0, SHOULDER[1]))


# =================================================================== variety pack
import bmesh  # noqa: E402


def applied(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o


def slab(o, z0, z1, solid=0.0):
    """Keep only the part of `o` between world heights z0..z1 (bands, stripes, hems, headbands)."""
    applied(o)
    bm = bmesh.new(); bm.from_mesh(o.data)
    lz0, lz1 = z0 - o.location.z, z1 - o.location.z
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, lz0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, lz1), plane_no=(0, 0, 1), clear_outer=True)
    bm.to_mesh(o.data); bm.free()
    if solid:
        so = o.modifiers.new('Solid', 'SOLIDIFY'); so.thickness = solid; so.offset = 1
    return o


def cone(name, r1, r2, depth, loc, mat, rot=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name
    b = o.modifiers.new('Bevel', 'BEVEL'); b.width = min(r1, depth) * 0.3; b.segments = 2; b.limit_method = 'NONE'
    o.data.materials.append(mat); bpy.ops.object.shade_smooth()
    return o


def head_copy(name, mat, grow):
    """The head's rounded shape, scaled up (for bands and hats that hug it)."""
    return R(name, (0.5 * grow, 0.44 * grow, 0.42 * grow), (0, 0.0, 0.72), mat, bevel=0.12 * grow, subsurf=2, taper=0.12)


H = (0, 0, NECK)

# ---- face details: brows (they lift when talking), blush, facial hair
def brows(name, w, h, z=0.79):
    # level brows read friendly; any tilt reads sad (outer down) or cross (inner down) on these faces
    objs = [R(f'Brow{s}', (w, 0.02, h), (s * 0.118, -0.221, z), M['hair'], bevel=min(h, 0.02) * 0.45, subsurf=1) for s in (-1, 1)]
    return finish(objs, name, (0, -0.221, 0.79))


brows('Brows_thin', 0.085, 0.016)
brows('Brows_thick', 0.095, 0.03)
brows('Brows_arch', 0.07, 0.018, z=0.805)  # short + high = cheerful
finish([S(f'Blush{s}', 0.036, (s * 0.175, -0.214, 0.625), M['blush'], scale=(1.3, 0.25, 0.75)) for s in (-1, 1)], 'Blush', H)
finish([R('Beard', (0.48, 0.24, 0.14), (0, -0.115, 0.56), M['hair'], bevel=0.065, subsurf=2, taper=0.12)] +
       [R(f'Stache{s}', (0.075, 0.03, 0.028), (s * 0.04, -0.228, 0.615), M['hair'], bevel=0.013, subsurf=1, rot=(0, s * 0.25, 0)) for s in (-1, 1)],
       'Beard', H)
finish([R(f'Stache{s}', (0.08, 0.032, 0.03), (s * 0.042, -0.228, 0.612), M['hair'], bevel=0.014, subsurf=1, rot=(0, s * 0.3, 0)) for s in (-1, 1)], 'Moustache', H)
finish([R('Goatee', (0.1, 0.05, 0.07), (0, -0.2, 0.545), M['hair'], bevel=0.022, subsurf=1)], 'Goatee', H)

# ---- more hair
afro = [Sh('h', 0, M['hair'], 0.86, 0.6), S('Afro', 0.3, (0, 0.07, 0.95), M['hair'], scale=(1.2, 1.05, 0.85), seg=32)]
afro += [S(f'Puff{i}', 0.09, (math.cos(i / 9 * math.tau) * 0.33, 0.07 + math.sin(i / 9 * math.tau) * 0.28, 0.93 + 0.03 * math.sin(i * 1.7)), M['hair']) for i in range(9) if math.sin(i / 9 * math.tau) > -0.55]
finish(afro, 'Hair_afro', H)
mohawk = [Sh('h', 0, M['hair'], 0.9, 0.7, grow=1.03)]
mohawk += [cone(f'Spike{i}', 0.055, 0.008, 0.16, (0, -0.16 + i * 0.085, 1.0 - abs(i - 2) * 0.012), M['hair'], rot=(-0.35 + i * 0.18, 0, 0)) for i in range(5)]
finish(mohawk, 'Hair_mohawk', H)
bob = [Sh('h', 0, M['hair'], 0.87, 0.5),
       R('Fringe', (0.47, 0.1, 0.07), (0, -0.205, 0.875), M['hair'], bevel=0.03, subsurf=2, rot=(0.25, 0, 0)),
       R('Back', (0.52, 0.16, 0.3), (0, 0.15, 0.67), M['hair'], bevel=0.07, subsurf=2)]
bob += [R(f'Side{s}', (0.09, 0.34, 0.3), (s * 0.262, 0.02, 0.66), M['hair'], bevel=0.04, subsurf=2) for s in (-1, 1)]
finish(bob, 'Hair_bob', H)
finish([Sh('h', 0, M['hair'], 0.85, 0.62)] + [S(f'Puff{s}', 0.095, (s * 0.21, 0.06, 0.99), M['hair']) for s in (-1, 1)], 'Hair_puffs', H)
spiky = [Sh('h', 0, M['hair'], 0.86, 0.64)]
for i, (x, y, rx, ry) in enumerate(((0, -0.12, -0.5, 0), (-0.14, -0.08, -0.4, -0.5), (0.14, -0.08, -0.4, 0.5), (-0.08, 0.06, 0, -0.35), (0.08, 0.06, 0, 0.35), (0, 0.16, 0.45, 0), (-0.18, 0.1, 0.2, -0.7), (0.18, 0.1, 0.2, 0.7))):
    spiky.append(cone(f'Spike{i}', 0.07, 0.01, 0.17, (x, y, 0.99), M['hair'], rot=(rx, ry, 0)))
finish(spiky, 'Hair_spiky', H)
finish([Sh('h', 0, M['hair'], 0.84, 0.64),
        R('Part', (0.3, 0.44, 0.12), (0.1, -0.02, 0.965), M['hair'], bevel=0.055, subsurf=2, rot=(0, 0.18, 0)),
        R('Sweep', (0.26, 0.1, 0.08), (-0.1, -0.2, 0.89), M['hair'], bevel=0.035, subsurf=2, rot=(0.3, 0, -0.35))], 'Hair_sidepart', H)
finish([Sh('h', 0, M['hair'], 0.9, 0.7, grow=1.03), S('Knot', 0.075, (0, 0.03, 1.06), M['hair']), cone('KnotBase', 0.06, 0.05, 0.04, (0, 0.03, 1.0), M['hair'])], 'Hair_topknot', H)
wavy = [Sh('h', 0, M['hair'], 0.88, 0.45), R('Back', (0.54, 0.16, 0.46), (0, 0.16, 0.58), M['hair'], bevel=0.07, subsurf=2),
        R('Fringe', (0.3, 0.1, 0.08), (0.08, -0.205, 0.87), M['hair'], bevel=0.035, subsurf=2, rot=(0.3, 0, 0.2))]
wavy += [S(f'Wave{i}', 0.07, (-0.22 + i * 0.088, 0.17, 0.38 + 0.02 * (i % 2)), M['hair']) for i in range(6)]
wavy += [R(f'Side{s}', (0.08, 0.3, 0.42), (s * 0.265, 0.03, 0.6), M['hair'], bevel=0.035, subsurf=2) for s in (-1, 1)]
finish(wavy, 'Hair_wavy', H)
braid = [Sh('h', 0, M['hair'], 0.86, 0.6)] + [S(f'B{i}', 0.055 - i * 0.004, (0, 0.24 + i * 0.012, 0.62 - i * 0.075), M['hair'], scale=(1, 0.9, 1.1)) for i in range(5)]
finish(braid, 'Hair_braid', H)

# ---- more head accessories
finish([slab(head_copy('Band', M['accent'], 1.07), 0.83, 0.88)], 'Headband', H)
finish([cone('Crown', 0.23, 0.2, 0.16, (0, 0.01, 0.99), M['accent'], verts=32), cone('Brim', 0.34, 0.33, 0.02, (0, 0.01, 0.9), M['accent'], verts=32),
        cone('Ribbon', 0.232, 0.232, 0.035, (0, 0.01, 0.94), M['accent2'], verts=32)], 'BucketHat', H)
finish([S(f'Stud{s}', 0.018, (s * 0.262, -0.01, 0.635), M['gold']) for s in (-1, 1)] + [S(f'Drop{s}', 0.024, (s * 0.262, -0.01, 0.595), M['gold']) for s in (-1, 1)], 'Earrings', H)
flower = [S('Core', 0.022, (0.2, -0.13, 0.9), M['accent2'])]
flower += [S(f'Petal{i}', 0.03, (0.2 + math.cos(i / 5 * math.tau) * 0.035, -0.14, 0.9 + math.sin(i / 5 * math.tau) * 0.035), M['white'], scale=(1, 0.5, 1)) for i in range(5)]
finish(flower, 'Flower', H)
finish([R('Visor', (0.44, 0.16, 0.022), (0, -0.2, 0.9), M['accent'], bevel=0.01, subsurf=1, rot=(-0.15, 0, 0)), slab(head_copy('VBand', M['accent'], 1.06), 0.86, 0.9)], 'Visor', H)

# ---- more torsos (origin at the hips)
def base(mat='top'):
    return R('Torso', (0.25, 0.17, 0.26), (0, 0, 0.34), M[mat], bevel=0.06, subsurf=2, taper=-0.1)


def shell(mat, z0, z1, grow=1.04):
    o = R('Shell', (0.25 * grow, 0.17 * grow, 0.26 * grow), (0, 0, 0.34), M[mat], bevel=0.06 * grow, subsurf=2, taper=-0.1)
    return slab(o, z0, z1)


torso('Torso_sweater', [shell('top', 0.2, 0.235, 1.05), cone('Neck', 0.07, 0.065, 0.05, (0, 0, 0.485), M['top'], verts=20)])
torso('Torso_jacket', [R('Inner', (0.075, 0.012, 0.22), (0, -0.087, 0.35), M['accent2'], bevel=0.008, subsurf=0)] +
      [R(f'Collar{s}', (0.06, 0.025, 0.07), (s * 0.06, -0.08, 0.455), M['top'], bevel=0.012, subsurf=1, rot=(0.2, 0, s * 0.45)) for s in (-1, 1)] +
      [R(f'Pocket{s}', (0.05, 0.012, 0.035), (s * 0.08, -0.09, 0.27), M['top'], bevel=0.006, subsurf=0) for s in (-1, 1)])
torso('Torso_overalls', [shell('pants', 0.2, 0.3, 1.05), R('Bib', (0.15, 0.014, 0.12), (0, -0.088, 0.35), M['pants'], bevel=0.012, subsurf=1)] +
      [R(f'Strap{s}', (0.03, 0.19, 0.012), (s * 0.06, 0, 0.465), M['pants'], bevel=0.005, subsurf=0) for s in (-1, 1)] +
      [S(f'Btn{s}', 0.012, (s * 0.06, -0.097, 0.395), M['gold']) for s in (-1, 1)])
torso('Torso_stripes', [shell('accent2', z, z + 0.028, 1.02) for z in (0.26, 0.32, 0.38)])
torso('Torso_polo', [R(f'Collar{s}', (0.07, 0.03, 0.035), (s * 0.042, -0.075, 0.47), M['top'], bevel=0.01, subsurf=1, rot=(0, 0, s * 0.45)) for s in (-1, 1)] +
      [R('Placket', (0.025, 0.01, 0.07), (0, -0.087, 0.43), M['accent2'], bevel=0.004, subsurf=0)] + [S(f'B{i}', 0.007, (0, -0.093, 0.445 - i * 0.03), M['white']) for i in range(2)])
torso('Torso_vest', [R(f'Collar{s}', (0.07, 0.03, 0.04), (s * 0.04, -0.075, 0.47), M['white'], bevel=0.01, subsurf=1, rot=(0, 0, s * 0.5)) for s in (-1, 1)] +
      [R(f'Panel{s}', (0.1, 0.014, 0.2), (s * 0.068, -0.086, 0.33), M['accent2'], bevel=0.01, subsurf=1, rot=(0, s * -0.18, 0)) for s in (-1, 1)] +
      [shell('accent2', 0.2, 0.25, 1.03)])
# lanyard + badge (on any torso)
finish([slab(R('Loop', (0.15, 0.13, 0.2), (0, 0.0, 0.42), M['accent'], bevel=0.06, subsurf=2), 0.42, 0.44),
        R('Cord', (0.012, 0.008, 0.1), (-0.04, -0.09, 0.38), M['accent'], bevel=0.003, subsurf=0, rot=(0, 0.3, 0)),
        R('Card', (0.055, 0.008, 0.07), (-0.055, -0.094, 0.31), M['white'], bevel=0.008, subsurf=0),
        R('Photo', (0.02, 0.004, 0.024), (-0.065, -0.099, 0.318), M['accent2'], bevel=0.003, subsurf=0)], 'Lanyard', (0, 0, HIP_Y))

# ---- short sleeves (sleeve + bare forearm) and shorts
for s, side in ((1, 'L'), (-1, 'R')):
    a = s * 0.2
    u = Vector((math.sin(a), 0, math.cos(a)))
    c0 = Vector((s * 0.155, 0, 0.35))
    finish([C('Sleeve', 0.05, 0.085, c0 + u * 0.045, M['top'], rot=(0, a, 0)), C('Fore', 0.039, 0.13, c0 - u * 0.02, M['skin'], rot=(0, a, 0)),
            *mitten(s)], f'ArmShort{side}', (s * SHOULDER[0], 0, SHOULDER[1]))
    # long sleeve with a cuff + a watch on the left
    extra = [slab(C('Cuff', 0.049, 0.17, (s * 0.155, 0, 0.35), M['top'], rot=(0, a, 0)), 0.265, 0.285)]
    if side == 'L':
        extra = [slab(C('Watch', 0.049, 0.17, (s * 0.155, 0, 0.35), M['frame'], rot=(0, a, 0)), 0.268, 0.285), R('Face', (0.03, 0.012, 0.022), (s * 0.168, -0.045, 0.277), M['gold'], bevel=0.005, subsurf=0)]
        finish([C('Arm', 0.045, 0.17, (s * 0.155, 0, 0.35), M['top'], rot=(0, a, 0)), *mitten(s)] + extra, f'ArmWatch{side}', (s * SHOULDER[0], 0, SHOULDER[1]))
    leg_x = s * 0.066
    sneaker = [R('Upper', (0.12, 0.17, 0.058), (leg_x, -0.025, 0.043), M['shoes'], bevel=0.028, subsurf=1),
               R('Sole', (0.126, 0.176, 0.024), (leg_x, -0.025, 0.012), M['white'], bevel=0.01, subsurf=1),
               R('Toe', (0.1, 0.05, 0.03), (leg_x, -0.09, 0.03), M['white'], bevel=0.012, subsurf=1)] + \
              [R(f'Lace{i}', (0.055, 0.011, 0.008), (leg_x, -0.045 - i * 0.026, 0.073 - i * 0.004), M['white'], bevel=0.003, subsurf=0) for i in range(2)]
    finish([C('Leg', 0.062, 0.15, (leg_x, 0, 0.12), M['pants']), slab(C('Hem', 0.066, 0.15, (leg_x, 0, 0.12), M['pants']), 0.07, 0.09)] + [o.copy() if False else o for o in sneaker],
           f'LegSneaker{side}', (s * HIP_JOINT[0], 0, HIP_JOINT[1]))
    sneaker2 = [R('Upper', (0.12, 0.17, 0.058), (leg_x, -0.025, 0.043), M['shoes'], bevel=0.028, subsurf=1),
                R('Sole', (0.126, 0.176, 0.024), (leg_x, -0.025, 0.012), M['white'], bevel=0.01, subsurf=1)]
    finish([C('Shorts', 0.068, 0.07, (leg_x, 0, 0.17), M['pants']), C('Shin', 0.048, 0.1, (leg_x, 0, 0.1), M['skin']),
            C('Sock', 0.05, 0.03, (leg_x, 0, 0.075), M['white'])] + sneaker2, f'LegShorts{side}', (s * HIP_JOINT[0], 0, HIP_JOINT[1]))
    finish([C('Leg', 0.062, 0.15, (leg_x, 0, 0.12), M['pants']), R('Boot', (0.125, 0.175, 0.09), (leg_x, -0.022, 0.045), M['shoes'], bevel=0.03, subsurf=1),
            R('Sole', (0.13, 0.18, 0.022), (leg_x, -0.022, 0.011), M['frame'], bevel=0.008, subsurf=0)], f'LegBoot{side}', (s * HIP_JOINT[0], 0, HIP_JOINT[1]))

# ---- level rewards: star pin (L2), cape (L3), crown (L5; floats above the head, origin at its centre)
def star_prism(name, r_out, r_in, depth, loc, mat, rot=(0, 0, 0)):
    import bmesh
    me = bpy.data.meshes.new(name); o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    bm = bmesh.new()
    pts = [(math.cos(math.pi / 2 + i * math.pi / 5) * (r_out if i % 2 == 0 else r_in), math.sin(math.pi / 2 + i * math.pi / 5) * (r_out if i % 2 == 0 else r_in)) for i in range(10)]
    front = [bm.verts.new((x, -depth / 2, y)) for x, y in pts]; back = [bm.verts.new((x, depth / 2, y)) for x, y in pts]
    bm.faces.new(front); bm.faces.new(list(reversed(back)))
    for i in range(10): bm.faces.new([front[i], front[(i + 1) % 10], back[(i + 1) % 10], back[i]])
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o.location = loc; o.rotation_euler = rot; o.data.materials.append(mat)
    b = o.modifiers.new('Bevel', 'BEVEL'); b.width = depth * 0.35; b.segments = 2; b.limit_method = 'NONE'
    return o


finish([star_prism('Star', 0.03, 0.013, 0.012, (-0.06, -0.094, 0.405), M['gold'])], 'Pin', (0, 0, HIP_Y))

cape = R('Cape', (0.34, 0.03, 0.25), (0, 0.105, 0.345), M['accent'], bevel=0.02, subsurf=2, taper=-0.35, rot=(-0.18, 0, 0))
collar = [R(f'Clasp{s}', (0.03, 0.03, 0.03), (s * 0.09, -0.06, 0.462), M['gold'], bevel=0.012, subsurf=1) for s in (-1, 1)]
bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.03, major_segments=32, minor_segments=10, location=(0, 0.015, 0.462))
ring = bpy.context.active_object; ring.scale = (1.2, 1.05, 0.42); ring.data.materials.append(M['accent']); bpy.ops.object.shade_smooth()
finish([cape, ring] + collar, 'Cape', (0, 0, HIP_Y))

crown = []
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.12, depth=0.06, location=(0, 0, 0))
band = bpy.context.active_object; band.data.materials.append(M['gold'])
sol = band.modifiers.new('Solid', 'SOLIDIFY'); sol.thickness = 0.015
bv = band.modifiers.new('Bevel', 'BEVEL'); bv.width = 0.006; bv.segments = 2; bv.limit_method = 'NONE'
import bmesh as _bm
bm = _bm.new(); bm.from_mesh(band.data)
_bm.ops.delete(bm, geom=[f for f in bm.faces if abs(f.normal.z) > 0.9], context='FACES_ONLY'); bm.to_mesh(band.data); bm.free()
bpy.ops.object.shade_smooth()
crown.append(band)
for i in range(5):
    a = i / 5 * math.tau
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.035, radius2=0.004, depth=0.09, location=(math.cos(a) * 0.115, math.sin(a) * 0.115, 0.07))
    sp = bpy.context.active_object; sp.data.materials.append(M['gold']); bpy.ops.object.shade_smooth(); crown.append(sp)
    crown.append(S(f'Tip{i}', 0.014, (math.cos(a) * 0.115, math.sin(a) * 0.115, 0.118), M['gold'], seg=10))
    crown.append(S(f'Gem{i}', 0.014, (math.cos(a + 0.63) * 0.128, math.sin(a + 0.63) * 0.128, 0.0), M['accent2'], seg=10))
finish(crown, 'Crown', (0, 0, 0))

# ---- export every part
os.makedirs(os.path.dirname(os.path.join(ROOT, args.out)), exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT, args.out), export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
print('BUILT', args.out, sorted(o.name for o in bpy.data.objects if o.type == 'EMPTY'))
