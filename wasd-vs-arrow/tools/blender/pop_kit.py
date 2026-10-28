"""Vinyl collectible figure kit (Pop-style) shared by the concept renders and the asset build."""
import math

import bpy
from mathutils import Vector


# ---------------------------------------------------------------- vinyl materials
def vinyl(name, rgb, rough=0.32, coat=0.55, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = 0.08
    return m


def hexc(h):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


EYE = vinyl('Eye', (0.005, 0.005, 0.006), rough=0.05, coat=1.0)


# ---------------------------------------------------------------- shape helpers
def rounded_box(name, size, loc, mat, bevel=0.05, subsurf=2, taper=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if taper:  # narrow the bottom (Pop heads are slightly narrower at the chin)
        for v in o.data.vertices:
            if v.co.z < 0:
                v.co.x *= 1 - taper
                v.co.y *= 1 - taper * 0.5
    b = o.modifiers.new('Bevel', 'BEVEL'); b.width = bevel; b.segments = 2; b.limit_method = 'NONE'
    if subsurf:
        s = o.modifiers.new('Sub', 'SUBSURF'); s.levels = s.render_levels = subsurf
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o


def sphere(name, r, loc, mat, scale=(1, 1, 1), seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o


def capsule(name, r, length, loc, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=r, depth=length, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    b = o.modifiers.new('Bevel', 'BEVEL'); b.width = r * 0.95; b.segments = 4; b.limit_method = 'NONE'
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o


def hair_shell(name, x, mat, cut_front=0.62, cut_back=0.5, grow=1.08):
    """Sculpted hair: an enlarged copy of the head, cut off low at the back and higher at the front (hairline)."""
    o = rounded_box(name, (0.5 * grow, 0.44 * grow, 0.42 * grow), (x, 0.012, 0.735), mat, bevel=0.12 * grow, subsurf=2, taper=0.12)
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    import bmesh
    bm = bmesh.new(); bm.from_mesh(o.data)
    # slanted cutting plane: low at the back (+Y), higher at the forehead (-Y)
    zf, zb = cut_front, cut_back
    normal = Vector((0, (zf - zb) / 0.5, 1)).normalized()
    point = Vector((x - o.location.x, 0, (zf + zb) / 2 - o.location.z))
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=point, plane_no=normal, clear_inner=True)
    bm.to_mesh(o.data); bm.free()
    sol = o.modifiers.new('Solid', 'SOLIDIFY'); sol.thickness = 0.02; sol.offset = 1
    return o


def emblem(kind, x, z, mat):
    """Crew emblem on the chest: Claude = starburst, Codex = hexagon."""
    if kind == 'claude':
        parts = []
        for i in range(4):
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 0.055, -0.092, z), rotation=(0, i * math.pi / 4, 0))
            o = bpy.context.active_object; o.scale = (0.012, 0.01, 0.07); o.data.materials.append(mat); parts.append(o)
        return parts
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.03, depth=0.012, location=(x + 0.055, -0.092, z), rotation=(math.pi / 2, 0, 0))
    o = bpy.context.active_object; o.data.materials.append(mat)
    return [o]


# ---------------------------------------------------------------- one figure
def figure(x, skin, hair_col, top, pants, shoes, hair='short', extra=None, accent=None, crew='claude', seated=False):
    S, H, T, P, SH = (vinyl(f'{n}{x}', hexc(c)) for n, c in (('Skin', skin), ('Hair', hair_col), ('Top', top), ('Pants', pants), ('Shoes', shoes)))
    parts = []
    # proportions (total ≈ 1.0): legs 0.2, torso 0.28, head 0.5 — the classic big-head vinyl silhouette
    for s in (-1, 1):
        if seated:  # thighs forward, shins down over the seat edge
            parts.append(capsule(f'Thigh{s}', 0.062, 0.13, (x + s * 0.066, -0.1, 0.2), P, rot=(math.pi / 2, 0, 0)))
            parts.append(capsule(f'Leg{s}', 0.058, 0.1, (x + s * 0.066, -0.2, 0.12), P))
            parts.append(rounded_box(f'Shoe{s}', (0.12, 0.17, 0.07), (x + s * 0.066, -0.24, 0.035), SH, bevel=0.03, subsurf=1))
        else:
            parts.append(capsule(f'Leg{s}', 0.062, 0.15, (x + s * 0.066, 0, 0.12), P))
            parts.append(rounded_box(f'Shoe{s}', (0.12, 0.17, 0.07), (x + s * 0.066, -0.025, 0.035), SH, bevel=0.03, subsurf=1))
    parts.append(rounded_box('Torso', (0.25, 0.17, 0.26), (x, 0, 0.34), T, bevel=0.06, subsurf=2, taper=-0.1))
    for s in (-1, 1):
        parts.append(capsule(f'Arm{s}', 0.045, 0.17, (x + s * 0.155, 0, 0.35), T, rot=(0, s * 0.2, 0)))
        parts.append(sphere(f'Hand{s}', 0.046, (x + s * 0.173, 0, 0.245), S))
    # head: rounded, slightly squarish, narrower at the chin
    parts.append(rounded_box('Head', (0.5, 0.44, 0.42), (x, 0, 0.72), S, bevel=0.12, subsurf=3, taper=0.12))
    # the eyes: big, black, glossy, wide apart, a little below the middle
    for s in (-1, 1):
        parts.append(sphere(f'Eye{s}', 0.062, (x + s * 0.115, -0.2, 0.69), EYE, scale=(1, 0.45, 1.05)))
    parts.append(sphere('Nose', 0.018, (x, -0.222, 0.645), S, scale=(1.3, 0.8, 0.9)))
    for s in (-1, 1):
        parts.append(sphere(f'Ear{s}', 0.04, (x + s * 0.25, 0.0, 0.7), S, scale=(0.6, 0.9, 1.2)))
    # hair (sculpted shells that wrap the head)
    if hair == 'short':
        parts.append(hair_shell('Hair', x, H, cut_front=0.86, cut_back=0.66))
        parts.append(rounded_box('Fringe', (0.42, 0.1, 0.07), (x - 0.02, -0.2, 0.87), H, bevel=0.035, subsurf=2, rot=(0.35, 0, 0.12)))
    elif hair == 'swoop':
        parts.append(hair_shell('Hair', x, H, cut_front=0.84, cut_back=0.64))
        parts.append(rounded_box('Swoop', (0.4, 0.3, 0.13), (x - 0.04, -0.07, 0.99), H, bevel=0.06, subsurf=2, rot=(0.15, 0, 0.28)))
    elif hair == 'bun':
        parts.append(hair_shell('Hair', x, H, cut_front=0.84, cut_back=0.62))
        parts.append(sphere('Bun', 0.1, (x, 0.1, 1.0), H))
    elif hair == 'curly':
        parts.append(hair_shell('Hair', x, H, cut_front=0.86, cut_back=0.64))
        for i in range(16):
            a = i / 16 * math.tau
            parts.append(sphere(f'Curl{i}', 0.085, (x + math.cos(a) * 0.21, math.sin(a) * 0.18 + 0.03, 0.9 + 0.035 * math.sin(i * 2.1)), H))
        parts.append(sphere('CurlTop', 0.17, (x, 0.02, 0.96), H, scale=(1.3, 1.1, 0.6)))
    # extras
    if extra == 'glasses':
        frame = vinyl(f'Frame{x}', hexc('#1A1A1A'), rough=0.2)
        for s in (-1, 1):
            bpy.ops.mesh.primitive_torus_add(major_radius=0.08, minor_radius=0.011, location=(x + s * 0.115, -0.215, 0.69), rotation=(math.pi / 2, 0, 0))
            t = bpy.context.active_object; t.data.materials.append(frame); bpy.ops.object.shade_smooth(); parts.append(t)
        parts.append(rounded_box('Bridge', (0.07, 0.015, 0.015), (x, -0.225, 0.7), frame, bevel=0.005, subsurf=0))
    if extra == 'headphones':
        hp = vinyl(f'HP{x}', hexc('#1E1E22'), rough=0.3)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.285, minor_radius=0.022, location=(x, 0.02, 0.76), rotation=(math.pi / 2, 0, 0))
        t = bpy.context.active_object; t.data.materials.append(hp); bpy.ops.object.shade_smooth(); parts.append(t)
        for s in (-1, 1):
            parts.append(capsule(f'Cup{s}', 0.075, 0.07, (x + s * 0.27, 0.02, 0.7), hp, rot=(0, math.pi / 2, 0)))
    if accent:  # crew emblem on the chest
        parts += emblem(crew, x, 0.4, vinyl(f'Emblem{x}', hexc(accent), rough=0.25))
    root = bpy.data.objects.new(f'Figure{x}', None)
    bpy.context.scene.collection.objects.link(root)
    for p in parts:
        if p.parent is None:
            p.parent = root
    return root


