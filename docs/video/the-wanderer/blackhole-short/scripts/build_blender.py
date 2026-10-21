"""Blender (Cycles, CPU) shots of the short: scene 2 (a massive star dies: supernova + core collapse, 4-9 s) and
scene 11 (camera retreats to reveal a spiral galaxy, 56-60 s). Saves scene/black_hole_blender.blend.
blender -b --python scripts/build_blender.py
Frames are numbered on the film's timeline (1..1800 at 30 fps); only 121-270 and 1681-1800 are rendered from Blender."""
import bpy, math, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
sec = lambda s: int(round(s * FPS)) + 1
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = FPS; sc.frame_start, sc.frame_end = 1, 1800
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.engine = "CYCLES"; cy = sc.cycles; cy.device = "CPU"; cy.samples = 32; cy.use_denoising = True
cy.max_bounces = 8; cy.diffuse_bounces = 0; cy.glossy_bounces = 0; cy.transmission_bounces = 0; cy.transparent_max_bounces = 12; cy.volume_bounces = 0
sc.view_settings.view_transform = "Filmic"; sc.view_settings.look = "High Contrast"
sc.render.image_settings.file_format = "PNG"; sc.render.use_overwrite = False; sc.render.use_placeholder = True
sc.render.filepath = os.path.join(HERE, "renders", "blender", "f_")

def mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); return m, nt.nodes, nt.links

# world: the real ESO Milky Way panorama (ESO/S. Brunier, CC BY 4.0)
w = bpy.data.worlds.new("Sky"); sc.world = w; w.use_nodes = True; nd, ln = w.node_tree.nodes, w.node_tree.links; nd.clear()
env = nd.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(os.path.join(HERE, "assets", "milkyway_eso0932a.jpg"))
bg = nd.new("ShaderNodeBackground"); bg.inputs["Strength"].default_value = 0.45; out = nd.new("ShaderNodeOutputWorld")
ln.new(env.outputs["Color"], bg.inputs["Color"]); ln.new(bg.outputs[0], out.inputs[0])

def sphere(name, r, seg=128):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r); o = bpy.context.object; o.name = name; bpy.ops.object.shade_smooth(); return o
def value_key(node, f, v): node.outputs[0].default_value = v; node.outputs[0].keyframe_insert("default_value", frame=f)
def scale_key(o, f, s): o.scale = (s, s, s); o.keyframe_insert("scale", frame=f)

# ---- the massive star: boiling surface, limb darkening ----
star = sphere("Star", 3.0); m, nd, ln = mat("Star"); o = nd.new("ShaderNodeOutputMaterial")
tc = nd.new("ShaderNodeTexCoord"); mp = nd.new("ShaderNodeMapping"); ln.new(tc.outputs["Object"], mp.inputs["Vector"])
drv = mp.inputs["Location"].driver_add("default_value", 2); drv.driver.expression = "frame/30.0*0.25"
nz = nd.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 14; nz.inputs["Roughness"].default_value = 0.62; nz.inputs["Distortion"].default_value = 0.5
ln.new(mp.outputs[0], nz.inputs["Vector"])
rp = nd.new("ShaderNodeValToRGB"); ln.new(nz.outputs["Fac"], rp.inputs["Fac"]); cr = rp.color_ramp
cr.elements[0].position = 0.3; cr.elements[0].color = (0.35, 0.03, 0.0, 1); cr.elements[1].position = 0.75; cr.elements[1].color = (1.0, 0.7, 0.3, 1)
e = cr.elements.new(0.52); e.color = (0.95, 0.28, 0.03, 1)
lw = nd.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.45
limb = nd.new("ShaderNodeMapRange"); limb.inputs["To Min"].default_value = 1.0; limb.inputs["To Max"].default_value = 0.25; ln.new(lw.outputs["Facing"], limb.inputs["Value"])
SS = nd.new("ShaderNodeValue"); SS.outputs[0].default_value = 4
mm = nd.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; ln.new(limb.outputs[0], mm.inputs[0]); ln.new(SS.outputs[0], mm.inputs[1])
em = nd.new("ShaderNodeEmission"); ln.new(rp.outputs["Color"], em.inputs["Color"]); ln.new(mm.outputs[0], em.inputs["Strength"]); ln.new(em.outputs[0], o.inputs["Surface"])
star.data.materials.append(m)
# corona glow around the star (additive, fresnel)
corona = sphere("Corona", 3.6); m, nd, ln = mat("Corona"); o = nd.new("ShaderNodeOutputMaterial")
lw2 = nd.new("ShaderNodeLayerWeight"); lw2.inputs["Blend"].default_value = 0.5
f1c = nd.new("ShaderNodeMath"); f1c.operation = "SUBTRACT"; f1c.inputs[0].default_value = 1; ln.new(lw2.outputs["Facing"], f1c.inputs[1])
f2 = nd.new("ShaderNodeMath"); f2.operation = "POWER"; f2.inputs[1].default_value = 3; ln.new(f1c.outputs[0], f2.inputs[0])  # strongest over the star, fading to nothing at its rim
CS = nd.new("ShaderNodeValue"); CS.outputs[0].default_value = 1.5
c2 = nd.new("ShaderNodeMath"); c2.operation = "MULTIPLY"; ln.new(f2.outputs[0], c2.inputs[0]); ln.new(CS.outputs[0], c2.inputs[1])
e2 = nd.new("ShaderNodeEmission"); e2.inputs["Color"].default_value = (1.0, 0.45, 0.12, 1); ln.new(c2.outputs[0], e2.inputs["Strength"])
t2 = nd.new("ShaderNodeBsdfTransparent"); a2 = nd.new("ShaderNodeAddShader"); ln.new(e2.outputs[0], a2.inputs[0]); ln.new(t2.outputs[0], a2.inputs[1]); ln.new(a2.outputs[0], o.inputs["Surface"])
corona.data.materials.append(m)
# ---- supernova: expanding, filamentary shells (outer layers thrown off) ----
SHELLS = []
for k, (col, sc_n) in enumerate((((1.0, 0.4, 0.12, 1), 2.5), ((0.5, 0.65, 1.0, 1), 4.0))):
    sh = sphere(f"Ejecta{k}", 1.0); m, nd, ln = mat(f"Ejecta{k}"); o = nd.new("ShaderNodeOutputMaterial")
    tch = nd.new("ShaderNodeTexCoord"); nzh = nd.new("ShaderNodeTexNoise"); nzh.inputs["Scale"].default_value = sc_n; nzh.inputs["Detail"].default_value = 12; nzh.inputs["Distortion"].default_value = 1.4
    ln.new(tch.outputs["Object"], nzh.inputs["Vector"])
    fil = nd.new("ShaderNodeMapRange"); fil.inputs["From Min"].default_value = 0.56; fil.inputs["From Max"].default_value = 0.78; ln.new(nzh.outputs["Fac"], fil.inputs["Value"])
    lwh = nd.new("ShaderNodeLayerWeight"); lwh.inputs["Blend"].default_value = 0.5
    fr = nd.new("ShaderNodeMath"); fr.operation = "POWER"; fr.inputs[1].default_value = 0.8; ln.new(lwh.outputs["Facing"], fr.inputs[0])  # limb-brightened, like real remnants
    k1 = nd.new("ShaderNodeMath"); k1.operation = "MULTIPLY"; ln.new(fil.outputs[0], k1.inputs[0]); ln.new(fr.outputs[0], k1.inputs[1])
    VS = nd.new("ShaderNodeValue"); VS.outputs[0].default_value = 0
    k2 = nd.new("ShaderNodeMath"); k2.operation = "MULTIPLY"; ln.new(k1.outputs[0], k2.inputs[0]); ln.new(VS.outputs[0], k2.inputs[1])
    eh = nd.new("ShaderNodeEmission"); eh.inputs["Color"].default_value = col; ln.new(k2.outputs[0], eh.inputs["Strength"])
    th = nd.new("ShaderNodeBsdfTransparent"); ah = nd.new("ShaderNodeAddShader"); ln.new(eh.outputs[0], ah.inputs[0]); ln.new(th.outputs[0], ah.inputs[1]); ln.new(ah.outputs[0], o.inputs["Surface"])
    sh.data.materials.append(m); sh.rotation_euler = (0.3 * k, 0.7 * k, 0.2); SHELLS.append((sh, VS))
# ---- collapsing core: a small white-hot sphere that shrinks to nothing ----
core = sphere("Core", 0.6); m, nd, ln = mat("Core"); o = nd.new("ShaderNodeOutputMaterial"); ec = nd.new("ShaderNodeEmission")
ec.inputs["Color"].default_value = (0.85, 0.9, 1.0, 1); CO = nd.new("ShaderNodeValue"); CO.outputs[0].default_value = 0
ln.new(CO.outputs[0], ec.inputs["Strength"]); ln.new(ec.outputs[0], o.inputs["Surface"]); core.data.materials.append(m)

# timeline of the death (seconds of film time)
value_key(SS, sec(4.0), 2.2); value_key(SS, sec(5.0), 3.2); value_key(SS, sec(5.35), 30); value_key(SS, sec(5.8), 0)
scale_key(star, sec(4.0), 1.0); scale_key(star, sec(5.0), 1.06); scale_key(star, sec(5.35), 0.9); scale_key(star, sec(5.8), 0.3)
value_key(CS, sec(4.0), 1.2); value_key(CS, sec(5.3), 5); value_key(CS, sec(6.0), 0)
for sh, VS in SHELLS:
    value_key(VS, sec(5.2), 0); value_key(VS, sec(5.5), 9); value_key(VS, sec(7.5), 3); value_key(VS, sec(9.0), 0.6)
    scale_key(sh, sec(5.2), 2.8); scale_key(sh, sec(6.5), 10); scale_key(sh, sec(9.0), 22)
value_key(CO, sec(5.3), 0); value_key(CO, sec(5.6), 30); value_key(CO, sec(8.2), 20); value_key(CO, sec(8.9), 0)
scale_key(core, sec(5.4), 1.0); scale_key(core, sec(8.9), 0.02)

# ---- scene 11: spiral galaxy (real Hubble image of M51, NASA/ESA) seen from above, camera retreats ----
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -400)); gal = bpy.context.object; gal.name = "Galaxy"
img = bpy.data.images.load(os.path.join(HERE, "assets", "m51_heic0506a.jpg")); gal.scale = (img.size[0] / img.size[1] * 260, 260, 1)
m, nd, ln = mat("Galaxy"); o = nd.new("ShaderNodeOutputMaterial"); ti = nd.new("ShaderNodeTexImage"); ti.image = img
eg = nd.new("ShaderNodeEmission"); eg.inputs["Strength"].default_value = 1.6; ln.new(ti.outputs["Color"], eg.inputs["Color"])
# black of the photo becomes transparent so the star field shows through
bw = nd.new("ShaderNodeRGBToBW"); ln.new(ti.outputs["Color"], bw.inputs[0])
al = nd.new("ShaderNodeMapRange"); al.inputs["From Min"].default_value = 0.02; al.inputs["From Max"].default_value = 0.2; ln.new(bw.outputs[0], al.inputs["Value"])
tg = nd.new("ShaderNodeBsdfTransparent"); mx = nd.new("ShaderNodeMixShader"); ln.new(al.outputs[0], mx.inputs[0]); ln.new(tg.outputs[0], mx.inputs[1]); ln.new(eg.outputs[0], mx.inputs[2])
ln.new(mx.outputs[0], o.inputs["Surface"]); gal.data.materials.append(m)

# visibility per scene
def vis(o, ranges):
    o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
    for a, b in ranges:
        o.hide_render = False; o.keyframe_insert("hide_render", frame=a); o.hide_render = True; o.keyframe_insert("hide_render", frame=b + 1)
    for fc in o.animation_data.action.fcurves:
        for k in fc.keyframe_points: k.interpolation = "CONSTANT"
S2 = (sec(4.0), sec(9.2)); S11 = (sec(56.0), 1800)
for ob in [star, corona, core] + [s for s, _ in SHELLS]: vis(ob, [S2])
vis(gal, [S11])

# camera
cd = bpy.data.cameras.new("Cam"); cd.sensor_fit = "VERTICAL"; cd.clip_end = 10000
cam = bpy.data.objects.new("Cam", cd); sc.collection.objects.link(cam); sc.camera = cam
tgt = bpy.data.objects.new("Tgt", None); sc.collection.objects.link(tgt)
c = cam.constraints.new("TRACK_TO"); c.target = tgt; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
def ck(f, loc, look, lens):
    cam.location = loc; cam.keyframe_insert("location", frame=f); tgt.location = look; tgt.keyframe_insert("location", frame=f); cd.lens = lens; cd.keyframe_insert("lens", frame=f)
ck(sec(4.0), (0, -26, 3), (0, 0, 0), 32); ck(sec(5.3), (0, -21, 2), (0, 0, 0), 32)
ck(sec(6.5), (0, -48, 5), (0, 0, 0), 30); ck(sec(8.2), (0, -52, 5), (0, 0, 0), 30); ck(sec(9.2), (1, -24, 2), (0, 0, 0), 34)
ck(sec(56.0), (0, -30, -330), (0, 0, -400), 30); ck(sec(60.0), (0, -60, 60), (0, 0, -400), 30)
for fc in list(cam.animation_data.action.fcurves) + list(tgt.animation_data.action.fcurves) + list(cd.animation_data.action.fcurves):
    pts = fc.keyframe_points
    for a, b in zip(pts[:-1], pts[1:]):
        a.interpolation = "CONSTANT" if b.co[0] - a.co[0] > 600 else "BEZIER"
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "scene", "black_hole_blender.blend"))
print("BUILD OK")
