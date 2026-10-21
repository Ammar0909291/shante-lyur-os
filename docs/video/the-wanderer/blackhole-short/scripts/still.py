# blender -b scene/X.blend --python scripts/still.py -- <out_dir> <pct> <samples> <frame> [frame ...]
import bpy, sys, os, time
a = sys.argv[sys.argv.index("--") + 1:]; out, pct, spp = a[0], int(a[1]), int(a[2])
sc = bpy.context.scene; sc.render.resolution_percentage = pct; sc.cycles.samples = spp
for f in map(int, a[3:]):
    sc.frame_set(f); sc.render.filepath = os.path.join(out, f"t{f:04d}.png"); t = time.time()
    bpy.ops.render.render(write_still=True); print(f"FRAME {f} {time.time()-t:.1f}s", flush=True)
