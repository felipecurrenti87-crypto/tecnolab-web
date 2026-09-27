"""iPhone 18 Pro (Natural Titanium) — turntable de 60 frames para el hero de Tecnolab.

Fuente durable y determinística: no hay aleatoriedad, todas las medidas y
ajustes de render son constantes con nombre. Se ejecuta headless:

  blender -b --factory-startup --python build.py -- --mode preview
  blender -b --factory-startup --python build.py -- --mode final

preview → out/preview/frame-XXXX.webp (pocos samples, frames sueltos)
final   → out/frames/frame-0001.webp … frame-0060.webp (1000×1300, fondo #000)

Contrato del frame (no romper): cada imagen contiene SOLO la rotación del
producto sobre su eje vertical — 6° por frame, empieza desde el dorso y gira
en sentido horario visto desde arriba. Cámara, luces y encuadre son fijos; la
entrada/salida/opacidad las maneja GSAP en js/main.js.
"""

import argparse
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "out")

# ---------------------------------------------------------------- dimensiones
MM = 0.001
PHONE_H = 150.0 * MM          # alto
PHONE_W = 71.5 * MM           # ancho
PHONE_D = 8.25 * MM           # espesor del cuerpo (sin módulo de cámara)
CORNER_R = 11.5 * MM          # radio de esquina en planta
RIM_BEVEL = 0.6 * MM          # canto del marco plano: chico y definido
RIM_BEVEL_SEGS = 5
RIM_BEVEL_PROFILE = 0.62      # >0.5 = canto más cuadrado, menos "jabón"

PLATEAU_INSET = 1.3 * MM      # margen del módulo respecto al borde del dorso
PLATEAU_H = 46.0 * MM         # alto del módulo (~tercio superior)
PLATEAU_RAISE = 2.1 * MM      # cuánto sobresale del dorso
PLATEAU_R_TOP = CORNER_R - PLATEAU_INSET
PLATEAU_R_BOTTOM = 7.0 * MM

LENS_RING_R = 7.6 * MM
LENS_RING_RAISE = 1.6 * MM
LENS_BORE_R = 6.5 * MM        # boca del aro: adentro va el cristal y la óptica
LENS_BORE_DEPTH = 1.7 * MM    # profundidad del iris respecto al borde del aro
LENS_SPACING = 21.5 * MM      # distancia entre centros (triángulo)

LOGO_H = 13.0 * MM
LOGO_Z = 64.0 * MM

ISLAND_W = 19.0 * MM
ISLAND_H = 5.8 * MM
DISPLAY_BEZEL = 1.9 * MM

# ------------------------------------------------------------------- render
FRAME_COUNT = 60
STEP_DEG = 360.0 / FRAME_COUNT     # 6°
RES_X, RES_Y = 1000, 1300          # = dimensiones de los frames actuales
CAM_ELEVATION_DEG = 17.0
CAM_LENS_MM = 85.0
CAM_DISTANCE = 0.53
CAM_TARGET_Z = 0.078
FINAL_SAMPLES = 256
PREVIEW_SAMPLES = 48
WEBP_QUALITY = 90
PREVIEW_FRAMES = [1, 8, 16, 31]

KEY_POWER, KEY_KELVIN = 22.0, 5500
FILL_POWER, FILL_KELVIN = 5.0, 7000
RIM_POWER, RIM_KELVIN = 30.0, 6500


# ============================================================ helpers geometría
def rounded_rect(w, h, r_top, r_bottom=None, segs=24, cx=0.0, cz=0.0):
    """Contorno (x, z) de un rectángulo redondeado, antihorario visto desde -Y."""
    if r_bottom is None:
        r_bottom = r_top
    hw, hh = w / 2, h / 2
    corners = [  # (centro del arco, radio, ángulo inicial)
        ((hw - r_bottom, -hh + r_bottom), r_bottom, -90),
        ((hw - r_top, hh - r_top), r_top, 0),
        ((-hw + r_top, hh - r_top), r_top, 90),
        ((-hw + r_bottom, -hh + r_bottom), r_bottom, 180),
    ]
    pts = []
    for (ccx, ccz), r, a0 in corners:
        for i in range(segs + 1):
            a = math.radians(a0 + 90 * i / segs)
            pts.append((cx + ccx + r * math.cos(a), cz + ccz + r * math.sin(a)))
    return pts


def stadium(length, width, segs=16, cx=0.0, cz=0.0, vertical=False):
    r = width / 2
    if vertical:
        return rounded_rect(width, length, r, r, segs, cx, cz)
    return rounded_rect(length, width, r, r, segs, cx, cz)


def circle(r, segs=96, cx=0.0, cz=0.0):
    return [(cx + r * math.cos(2 * math.pi * i / segs),
             cz + r * math.sin(2 * math.pi * i / segs)) for i in range(segs)]


def prism(name, outline, a0, a1, axis="Y", material=None, bevel=0.0,
          bevel_segs=4, parent=None, profile=0.5):
    """Extruye un contorno 2D entre a0 y a1 sobre `axis`.

    axis="Y": contorno en (x, z). axis="X": contorno en (y, z).
    """
    bm = bmesh.new()

    def v3(u, w, a):
        return (a, u, w) if axis == "X" else (u, a, w)

    lo = [bm.verts.new(v3(u, w, a0)) for u, w in outline]
    hi = [bm.verts.new(v3(u, w, a1)) for u, w in outline]
    n = len(outline)
    bm.faces.new(lo[::-1])
    bm.faces.new(hi)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return finish_object(name, me, material, bevel, bevel_segs, parent, profile)


def finish_object(name, me, material, bevel, bevel_segs, parent, profile=0.5):
    for p in me.polygons:
        p.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(35))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if material:
        me.materials.append(material)
    if bevel > 0:
        mod = ob.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = bevel_segs
        mod.profile = profile
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(35)
        mod.harden_normals = True
        mod.use_clamp_overlap = True
    if parent:
        ob.parent = parent
    return ob


def cylinder_back(name, r, cx, cz, y_back, y_front, material, bevel=0.0,
                  segs=96, parent=None):
    """Disco/cilindro sobre el dorso (eje Y); y_front es la cara más externa (más negativa)."""
    return prism(name, circle(r, segs, cx, cz), y_front, y_back, "Y",
                 material, bevel, 4, parent)


def tube_back(name, r_out, r_in, cx, cz, y_back, y_front, material, bevel=0.0,
              segs=128, parent=None):
    """Aro hueco sobre el eje Y: deja ver lo que hay dentro de la boca."""
    bm = bmesh.new()
    rings = []
    for r, y in ((r_out, y_back), (r_out, y_front), (r_in, y_front), (r_in, y_back)):
        rings.append([bm.verts.new((cx + x, y, cz + z)) for x, z in circle(r, segs)])
    for a, b in zip(rings, rings[1:] + rings[:1]):
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return finish_object(name, me, material, bevel, 4, parent)


def dome_back(name, r, sag, cx, cz, y_base, material, segs=128, rings=16,
              parent=None):
    """Casquete esférico (elemento óptico) que asoma hacia -Y desde y_base."""
    rho = (r * r + sag * sag) / (2 * sag)
    bm = bmesh.new()
    loops = []
    for k in range(rings + 1):
        rr = r * (1 - k / rings)
        h = math.sqrt(max(rho * rho - rr * rr, 0)) - (rho - sag)
        if k == rings:
            loops.append([bm.verts.new((cx, y_base - sag, cz))])
            break
        loops.append([bm.verts.new((cx + x, y_base - h, cz + z))
                      for x, z in circle(rr, segs)])
    for a, b in zip(loops, loops[1:]):
        for i in range(segs):
            j = (i + 1) % segs
            if len(b) == 1:
                bm.faces.new((a[i], a[j], b[0]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(loops[0][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = finish_object(name, me, material, 0.0, 1, parent)
    me.set_sharp_from_angle(angle=math.radians(80))
    return ob


# ================================================================== materiales
def new_material(name):
    mat = bpy.data.materials.new(name)
    try:
        mat.use_nodes = True
    except AttributeError:
        pass
    return mat, mat.node_tree.nodes["Principled BSDF"]


def set_inputs(bsdf, **values):
    names = {
        "base": "Base Color", "metallic": "Metallic", "rough": "Roughness",
        "ior": "IOR", "spec": "Specular IOR Level", "coat": "Coat Weight",
        "coat_rough": "Coat Roughness", "aniso": "Anisotropic",
        "aniso_rot": "Anisotropic Rotation", "film": "Thin Film Thickness",
        "film_ior": "Thin Film IOR", "emit": "Emission Color",
        "emit_strength": "Emission Strength",
    }
    for key, val in values.items():
        sock = bsdf.inputs[names[key]]
        if key in ("base", "emit") and len(val) == 3:
            val = (*val, 1.0)
        sock.default_value = val


def build_materials():
    m = {}
    # titanio mate satinado del cuerpo, módulo y botones
    mat, b = new_material("Titanium_Satin")
    set_inputs(b, base=(0.74, 0.72, 0.68), metallic=0.9, rough=0.3)
    m["titanium"] = mat

    # aro de las lentes: mismo titanio, pulido
    mat, b = new_material("Titanium_Polished")
    set_inputs(b, base=(0.70, 0.68, 0.65), metallic=0.95, rough=0.14)
    m["titanium_polished"] = mat

    # logo grabado: el material del cuerpo, apenas más reflectivo
    mat, b = new_material("Logo_Titanium")
    set_inputs(b, base=(0.74, 0.72, 0.68), metallic=0.9, rough=0.18)
    m["logo"] = mat

    mat, b = new_material("BackGlass_Matte")
    set_inputs(b, base=(0.46, 0.45, 0.43), rough=0.5, coat=0.35,
               coat_rough=0.32, spec=0.5)
    m["back_glass"] = mat

    mat, b = new_material("FrontGlass_Black")
    set_inputs(b, base=(0.004, 0.004, 0.005), rough=0.05, coat=1.0,
               coat_rough=0.02)
    m["front_glass"] = mat

    # capas de la lente, de afuera hacia adentro
    mat, b = new_material("Lens_SapphireCover")   # cristal exterior transparente
    set_inputs(b, base=(1.0, 1.0, 1.0), rough=0.0, ior=1.77, film=260.0,
               film_ior=1.38)
    b.inputs["Transmission Weight"].default_value = 1.0
    m["lens_cover"] = mat

    mat, b = new_material("Lens_Barrel")          # pared interna anodizada negra
    set_inputs(b, base=(0.012, 0.012, 0.013), metallic=0.6, rough=0.35)
    m["lens_barrel"] = mat

    mat, b = new_material("Lens_ApertureRing")    # anillo de apertura, metal oscuro
    set_inputs(b, base=(0.18, 0.18, 0.19), metallic=1.0, rough=0.22)
    m["lens_ring_bright"] = mat

    mat, b = new_material("Lens_Iris")            # fondo oscuro con profundidad
    set_inputs(b, base=(0.0, 0.0, 0.0), rough=0.6, spec=0.2)
    m["lens_iris"] = mat

    mat, b = new_material("Lens_Element")         # vidrio óptico con coating tornasol
    set_inputs(b, base=(0.004, 0.005, 0.012), rough=0.03, coat=1.0,
               coat_rough=0.0, film=520.0, film_ior=1.45, spec=1.0)
    m["lens_element"] = mat

    mat, b = new_material("Flash_Diffuser")
    set_inputs(b, base=(0.88, 0.78, 0.55), rough=0.45, coat=0.8,
               coat_rough=0.05)
    m["flash"] = mat

    mat, b = new_material("Black_Gloss")
    set_inputs(b, base=(0.003, 0.003, 0.003), rough=0.12, coat=1.0,
               coat_rough=0.03)
    m["black_gloss"] = mat

    mat, b = new_material("Black_Matte")
    set_inputs(b, base=(0.0, 0.0, 0.0), rough=0.8, spec=0.1)
    m["black_matte"] = mat

    mat, b = new_material("CameraControl_Sapphire")
    set_inputs(b, base=(0.35, 0.34, 0.33), metallic=0.6, rough=0.12, coat=1.0)
    m["sapphire"] = mat

    m["display"] = build_display_material()
    return m


def build_display_material():
    """Pantalla encendida tenue: gradiente cálido bajo vidrio con coat."""
    mat, b = new_material("Display_Wallpaper")
    nt = mat.node_tree
    set_inputs(b, base=(0.0, 0.0, 0.0), rough=0.2, coat=1.0, coat_rough=0.02,
               emit_strength=1.4)
    tex = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    nt.links.new(tex.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, (0.02, 0.018, 0.022, 1)
    els[1].position, els[1].color = 1.0, (0.30, 0.25, 0.20, 1)
    mid = els.new(0.55)
    mid.color = (0.09, 0.075, 0.07, 1)
    nt.links.new(ramp.outputs["Color"], b.inputs["Emission Color"])
    return mat


# ================================================================= logo Apple
def apple_logo_mesh():
    """Silueta de la manzana por booleanas de discos (unidad ~1.1 de alto)."""
    scene = bpy.context.scene
    temp = []

    def disk(name, cx, cy, r, z=0.5):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=128, radius1=r,
                              radius2=r, depth=2 * z)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(cx, cy, 0))
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(name, me)
        scene.collection.objects.link(ob)
        temp.append(ob)
        return ob

    body = disk("logo_body", 0.0, -0.05, 0.33)
    parts = [
        ("union", disk("lobe_tl", -0.22, 0.10, 0.30)),
        ("union", disk("lobe_tr", 0.22, 0.10, 0.30)),
        ("union", disk("lobe_bl", -0.19, -0.19, 0.25)),
        ("union", disk("lobe_br", 0.19, -0.19, 0.25)),
        ("difference", disk("bite", 0.55, 0.03, 0.18, z=1.0)),
        ("difference", disk("notch_bottom", 0.0, -0.53, 0.12, z=1.0)),
    ]
    for op, cutter in parts:
        mod = body.modifiers.new(cutter.name, "BOOLEAN")
        mod.operation = op.upper()
        mod.solver = "EXACT"
        mod.object = cutter
        cutter.hide_render = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(body.evaluated_get(dg))

    # hoja: lente de dos arcos, girada 45°
    a, bw, segs = 0.17, 0.075, 40
    rho = (a * a + bw * bw) / (2 * bw)
    outline = []
    for i in range(segs + 1):
        x = -a + 2 * a * i / segs
        outline.append((x, math.sqrt(max(rho * rho - x * x, 0)) - (rho - bw)))
    for i in range(1, segs):
        x = a - 2 * a * i / segs
        outline.append((x, -(math.sqrt(max(rho * rho - x * x, 0)) - (rho - bw))))
    rot = math.radians(48)
    lcx, lcy = 0.125, 0.56
    bm = bmesh.new()
    bm.from_mesh(me)
    lo, hi = [], []
    for x, y in outline:
        rx = lcx + x * math.cos(rot) - y * math.sin(rot)
        ry = lcy + x * math.sin(rot) + y * math.cos(rot)
        lo.append(bm.verts.new((rx, ry, -0.5)))
        hi.append(bm.verts.new((rx, ry, 0.5)))
    bm.faces.new(lo[::-1])
    bm.faces.new(hi)
    for i in range(len(lo)):
        j = (i + 1) % len(lo)
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for ob in temp:
        bpy.data.objects.remove(ob, do_unlink=True)
    return me


# ================================================================ ensamblado
def build_phone(mats):
    root = bpy.data.objects.new("iPhone18Pro_Turntable", None)
    bpy.context.scene.collection.objects.link(root)
    cz = PHONE_H / 2
    hd = PHONE_D / 2
    back_y = -hd

    # cuerpo / marco de titanio
    prism("Frame_Titanium", rounded_rect(PHONE_W, PHONE_H, CORNER_R, segs=32, cz=cz),
          -hd, hd, "Y", mats["titanium"], RIM_BEVEL, RIM_BEVEL_SEGS, root,
          RIM_BEVEL_PROFILE)

    # dorso de vidrio mate, levemente sobre el marco
    inset = 0.95 * MM
    prism("BackGlass", rounded_rect(PHONE_W - 2 * inset, PHONE_H - 2 * inset,
                                    CORNER_R - inset, segs=32, cz=cz),
          back_y - 0.06 * MM, back_y + 0.5 * MM, "Y", mats["back_glass"],
          0.15 * MM, 3, root)

    # frente: vidrio negro + pantalla + Dynamic Island
    finset = 0.55 * MM
    prism("FrontGlass", rounded_rect(PHONE_W - 2 * finset, PHONE_H - 2 * finset,
                                     CORNER_R - finset, segs=32, cz=cz),
          hd - 0.5 * MM, hd + 0.06 * MM, "Y", mats["front_glass"],
          0.2 * MM, 3, root)
    dinset = finset + DISPLAY_BEZEL
    prism("Display", rounded_rect(PHONE_W - 2 * dinset, PHONE_H - 2 * dinset,
                                  CORNER_R - dinset, segs=32, cz=cz),
          hd, hd + 0.08 * MM, "Y", mats["display"], 0.0, 1, root)
    island_z = PHONE_H - dinset - 6.6 * MM
    prism("DynamicIsland", stadium(ISLAND_W, ISLAND_H, 16, 0.0, island_z),
          hd, hd + 0.1 * MM, "Y", mats["black_matte"], 0.0, 1, root)

    # módulo de cámara elevado (tercio superior del dorso)
    top = PHONE_H - PLATEAU_INSET
    pl_cz = top - PLATEAU_H / 2
    plateau_y = back_y - PLATEAU_RAISE
    prism("CameraPlateau", rounded_rect(PHONE_W - 2 * PLATEAU_INSET, PLATEAU_H,
                                        PLATEAU_R_TOP, PLATEAU_R_BOTTOM, 32, 0.0, pl_cz),
          plateau_y, back_y + 0.3 * MM, "Y", mats["titanium"], 0.6 * MM, 3, root, 0.65)

    # tres lentes en triángulo arriba a la izquierda (la cámara mira +Y desde -Y,
    # así que -X del mundo es la izquierda de la imagen al ver el dorso)
    left_x = -PHONE_W / 2 + PLATEAU_INSET + 11.8 * MM
    side = LENS_SPACING
    lens_centers = {
        "Wide": (left_x, pl_cz + side / 2),
        "Ultra": (left_x, pl_cz - side / 2),
        "Tele": (left_x + side * math.sqrt(3) / 2, pl_cz),
    }
    ring_front = plateau_y - LENS_RING_RAISE
    iris_y = ring_front + LENS_BORE_DEPTH      # fondo de la óptica, hundido en el aro
    for name, (lx, lz) in lens_centers.items():
        # aro de titanio pulido, hueco: la óptica queda adentro, con profundidad real
        tube_back(f"Lens_{name}_Ring", LENS_RING_R, LENS_BORE_R, lx, lz,
                  plateau_y + 0.2 * MM, ring_front, mats["titanium_polished"],
                  0.3 * MM, 128, root)
        # pared interna negra del barril
        tube_back(f"Lens_{name}_Barrel", LENS_BORE_R - 0.01 * MM, LENS_BORE_R - 0.45 * MM,
                  lx, lz, iris_y, ring_front + 0.24 * MM, mats["lens_barrel"], 0.0, 128, root)
        # cristal exterior de zafiro, transparente, apenas hundido
        cylinder_back(f"Lens_{name}_Cover", LENS_BORE_R - 0.02 * MM, lx, lz,
                      ring_front + 0.22 * MM, ring_front + 0.08 * MM,
                      mats["lens_cover"], 0.04 * MM, 128, root)
        # iris oscuro al fondo + anillo de apertura + elemento óptico abombado
        cylinder_back(f"Lens_{name}_Iris", LENS_BORE_R - 0.4 * MM, lx, lz,
                      iris_y + 0.1 * MM, iris_y, mats["lens_iris"], 0.0, 128, root)
        tube_back(f"Lens_{name}_Aperture", 4.7 * MM, 4.0 * MM, lx, lz, iris_y,
                  iris_y - 0.3 * MM, mats["lens_ring_bright"], 0.05 * MM, 128, root)
        dome_back(f"Lens_{name}_Element", 3.95 * MM, 0.75 * MM, lx, lz, iris_y,
                  mats["lens_element"], 128, 16, root)

    # flash + LiDAR + micrófono a la derecha
    right_x = PHONE_W / 2 - PLATEAU_INSET - 8.2 * MM
    cylinder_back("Flash", 3.2 * MM, right_x, pl_cz + side / 2, plateau_y + 0.2 * MM,
                  plateau_y - 0.12 * MM, mats["flash"], 0.15 * MM, 96, root)
    cylinder_back("LiDAR", 3.3 * MM, right_x, pl_cz - side / 2, plateau_y + 0.2 * MM,
                  plateau_y - 0.12 * MM, mats["black_gloss"], 0.15 * MM, 96, root)
    cylinder_back("Mic", 0.55 * MM, right_x - 1.5 * MM, pl_cz, plateau_y + 0.2 * MM,
                  plateau_y - 0.01 * MM, mats["black_matte"], 0.0, 32, root)

    # logo
    me = apple_logo_mesh()
    s = LOGO_H / 1.11
    me.transform(Matrix.Translation((0, -0.115, 0)))
    me.transform(Matrix.Diagonal((s, s, 0.03 * MM, 1.0)))
    me.transform(Matrix.Rotation(math.radians(90), 4, "X"))
    me.transform(Matrix.Translation((0, back_y - 0.08 * MM, LOGO_Z)))
    finish_object("AppleLogo", me, mats["logo"], 0.0, 1, root)

    # botones laterales. La pantalla mira +Y: visto de frente, la izquierda del
    # teléfono (Action + volumen) es +X y la derecha (lateral + Camera Control) es -X.
    def side_button(name, x_side, zc, length, mat, protrude=0.55 * MM, width=2.6 * MM):
        sign = 1 if x_side > 0 else -1
        a_in = x_side - sign * 0.4 * MM
        a_out = x_side + sign * protrude
        prism(name, stadium(length, width, 12, 0.0, zc, vertical=True),
              min(a_in, a_out), max(a_in, a_out), "X", mat, 0.25 * MM, 3, root)

    lx_side, rx_side = -PHONE_W / 2, PHONE_W / 2
    phone_left, phone_right = rx_side, lx_side
    side_button("Btn_Action", phone_left, PHONE_H - 27 * MM, 7.5 * MM, mats["titanium"])
    side_button("Btn_VolUp", phone_left, PHONE_H - 41 * MM, 11 * MM, mats["titanium"])
    side_button("Btn_VolDown", phone_left, PHONE_H - 55 * MM, 11 * MM, mats["titanium"])
    side_button("Btn_Side", phone_right, PHONE_H - 44 * MM, 17 * MM, mats["titanium"])
    side_button("Btn_CameraControl", phone_right, 50 * MM, 13 * MM, mats["sapphire"],
                protrude=0.08 * MM, width=3.4 * MM)

    # bandas de antena (plástico) sobre el marco
    band = 0.8 * MM
    for i, zc in enumerate((PHONE_H - 15 * MM, 16 * MM)):
        for tag, x_side in (("L", lx_side), ("R", rx_side)):
            s_ = 1 if x_side > 0 else -1
            prism(f"AntennaBand_{i}_{tag}",
                  rounded_rect(PHONE_D - 2.2 * MM, band, 0.3 * MM, segs=4, cz=zc),
                  min(x_side - s_ * 0.3 * MM, x_side + s_ * 0.02 * MM),
                  max(x_side - s_ * 0.3 * MM, x_side + s_ * 0.02 * MM), "X",
                  mats["black_matte"], 0.0, 1, root)
    return root


# ============================================================ escena y render
def look_at(ob, target):
    direction = Vector(target) - ob.location
    ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_area(name, loc, target, size_x, size_y, power, kelvin):
    light = bpy.data.lights.new(name, "AREA")
    light.shape = "RECTANGLE"
    light.size, light.size_y = size_x, size_y
    light.energy = power
    light.use_temperature = True
    light.temperature = kelvin
    ob = bpy.data.objects.new(name, light)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    ob.visible_camera = False
    return ob


def build_stage(mats):
    scene = bpy.context.scene
    world = bpy.data.worlds.new("World_Black")
    scene.world = world
    world.color = (0, 0, 0)
    try:
        world.use_nodes = True
    except AttributeError:
        pass
    # estudio puro: sin HDRI, sin piso, sin rebote. El mundo es negro para todo rayo.
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0

    tgt = (0, 0, PHONE_H * 0.55)
    add_area("Key_Left_5500K", (-0.46, -0.24, 0.20), tgt, 0.45, 0.60,
             KEY_POWER, KEY_KELVIN)
    add_area("Fill_Right_7000K", (0.46, -0.28, 0.14), tgt, 0.30, 0.45,
             FILL_POWER, FILL_KELVIN)
    add_area("Rim_BackTop", (0.0, 0.34, 0.36), tgt, 0.40, 0.05,
             RIM_POWER, RIM_KELVIN)

    cam_data = bpy.data.cameras.new("CAM_Hero")
    cam_data.lens = CAM_LENS_MM
    cam_data.sensor_fit = "VERTICAL"
    cam_data.sensor_height = 36.0
    cam_data.clip_start = 0.01
    cam = bpy.data.objects.new("CAM_Hero", cam_data)
    scene.collection.objects.link(cam)
    e = math.radians(CAM_ELEVATION_DEG)
    cam.location = (0.0, -CAM_DISTANCE * math.cos(e),
                    CAM_TARGET_Z + CAM_DISTANCE * math.sin(e))
    look_at(cam, (0, 0, CAM_TARGET_Z))
    scene.camera = cam


def animate_turntable(root):
    """Frame 1 = dorso a cámara (0°); -6° por frame = horario visto desde arriba."""
    for i in range(1, FRAME_COUNT + 1):
        root.rotation_euler = (0, 0, -math.radians(STEP_DEG * (i - 1)))
        root.keyframe_insert("rotation_euler", index=2, frame=i)
    action = root.animation_data.action
    try:
        curves = action.fcurves
    except AttributeError:  # Blender 5 layered actions
        curves = [fc for layer in action.layers for strip in layer.strips
                  for bag in strip.channelbags for fc in bag.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"


def configure_render(samples):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.render.resolution_x, scene.render.resolution_y = RES_X, RES_Y
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.frame_start, scene.frame_end = 1, FRAME_COUNT
    scene.render.fps = 30
    cy = scene.cycles
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.008
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 8
    cy.seed = 0
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    img = scene.render.image_settings
    img.file_format = "WEBP"
    img.color_mode = "RGB"
    img.quality = WEBP_QUALITY

    device = "CPU"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for backend in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = backend
            except TypeError:
                continue
            prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type == backend]
            if gpus:
                for d in prefs.devices:
                    d.use = d.type == backend
                cy.device = "GPU"
                device = f"GPU/{backend}: {gpus[0].name}"
                break
    except Exception as exc:  # noqa: BLE001 — se registra el fallback
        device = f"CPU (fallback: {exc})"
    return device


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["preview", "final", "scene"], default="preview")
    ap.add_argument("--frames", default="")
    args = ap.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = build_materials()
    root = build_phone(mats)
    build_stage(mats)
    animate_turntable(root)
    samples = FINAL_SAMPLES if args.mode == "final" else PREVIEW_SAMPLES
    device = configure_render(samples)

    os.makedirs(OUT_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR, "iphone-18-pro.blend"))
    if args.mode == "scene":
        return

    scene = bpy.context.scene
    sub = "frames" if args.mode == "final" else "preview"
    target = os.path.join(OUT_DIR, sub)
    os.makedirs(target, exist_ok=True)
    if args.mode == "final" and not args.frames:
        frames = list(range(1, FRAME_COUNT + 1))
    else:
        frames = [int(f) for f in args.frames.split(",")] if args.frames else PREVIEW_FRAMES
    for f in frames:
        scene.frame_set(f)
        scene.render.filepath = os.path.join(target, f"frame-{f:04d}.webp")
        bpy.ops.render.render(write_still=True)
        print(f"RENDERED {f}", flush=True)

    manifest = {
        "blender": bpy.app.version_string,
        "engine": "CYCLES", "device": device, "samples": samples,
        "denoiser": "OPENIMAGEDENOISE", "view_transform": "AgX",
        "resolution": [RES_X, RES_Y], "format": f"WEBP q{WEBP_QUALITY} RGB",
        "frames": frames, "step_deg": STEP_DEG,
        "rotation": "frame1 = back to camera, clockwise from above (-Z)",
        "camera": {"lens_mm": CAM_LENS_MM, "elevation_deg": CAM_ELEVATION_DEG,
                   "distance_m": CAM_DISTANCE, "target_z_m": CAM_TARGET_Z},
    }
    with open(os.path.join(target, "render-manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)


main()
