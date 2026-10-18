"""Bake the CC0 MakeHuman head for the browser, with Blender (no runtime dependency).
Usage: blender --background --python scripts/build-archer-head.py -- SOURCE_DIR OUTPUT_DIR
SOURCE_DIR contains base.obj and male.target from the sources in assets/archer/README.md.
Only the head/neck is retained; the clothing and equipment are authored in JavaScript.
"""
import bpy, json, sys, struct
from pathlib import Path
from mathutils import Vector
source, output = map(Path, sys.argv[sys.argv.index('--') + 1:])
vertices, texcoords, faces, joints = [], [], [], {}
group = ''
for line in (source / 'base.obj').read_text().splitlines():
    p = line.split()
    if not p: continue
    if p[0] == 'v': vertices.append(Vector(tuple(map(float, p[1:4]))))
    elif p[0] == 'vt': texcoords.append(tuple(map(float, p[1:3])))
    elif p[0] == 'g': group = p[1]
    elif p[0] == 'f':
        f = [tuple(int(n) - 1 for n in t.split('/')[:2]) for t in p[1:]]
        if group == 'body': faces.append(f)
        if group.startswith('joint-'): joints.setdefault(group, set()).update(v[0] for v in f)
for line in (source / 'male.target').read_text().splitlines():
    p = line.split()
    if len(p) == 4 and not line.startswith('#'): vertices[int(p[0])] += Vector(tuple(map(float, p[1:])))
# 2.05 m archer, with a human-sized head. Source Y is vertical and +Z is forward.
scale = .111
head_top = max(v.y for f in faces for i, _ in f for v in [vertices[i]])
def transform(v): return (v.x * scale, 2.08 + (v.y - head_top) * scale, -v.z * scale)
def keep_head(v):
    x,y,z = transform(v)
    return y > 1.755 and abs(x) < .166 and (y > 1.825 or abs(x) < .064)
head_faces = [f for f in faces if all(keep_head(vertices[i]) for i, _ in f)]
used = sorted({i for f in head_faces for i, _ in f})
index = {v:i for i,v in enumerate(used)}
mesh = bpy.data.meshes.new('Archer anatomical head')
mesh.from_pydata([transform(vertices[i]) for i in used], [], [[index[i] for i, _ in reversed(f)] for f in head_faces])
mesh.update()
uv = mesh.uv_layers.new(name='UVMap')
for poly, f in zip(mesh.polygons, head_faces):
    for loop, (_, t) in zip(poly.loop_indices, reversed(f)): uv.data[loop].uv = texcoords[t]
obj = bpy.data.objects.new('Head', mesh)
bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
sub = obj.modifiers.new('Smooth facial topology', 'SUBSURF'); sub.levels = 1
bpy.ops.object.modifier_apply(modifier=sub.name)
mesh = obj.data
mesh.calc_loop_triangles()
positions, normals, uvs, indices, lookup = [], [], [], [], {}
for tri in mesh.loop_triangles:
    # Babylon's left-handed front face is clockwise; retain outward normals.
    for loop in reversed(tri.loops):
        v = mesh.vertices[mesh.loops[loop].vertex_index]; uv = mesh.uv_layers.active.data[loop].uv
        key = (v.index, round(uv.x, 6), round(uv.y, 6))
        if key not in lookup:
            lookup[key] = len(positions) // 3
            positions.extend(round(n, 6) for n in v.co)
            normals.extend(round(n, 6) for n in v.normal)
            uvs.extend(round(n, 6) for n in uv)
        indices.append(lookup[key])
anchors = {k.removeprefix('joint-'): transform(sum((vertices[i] for i in ids), Vector()) / len(ids)) for k, ids in joints.items() if k in ['joint-l-eye','joint-r-eye','joint-jaw','joint-neck']}
output.mkdir(parents=True, exist_ok=True)
values = positions + normals + uvs
(output / 'head.bin').write_bytes(struct.pack('<' + 'f' * len(values), *values) + struct.pack('<' + 'H' * len(indices), *indices))
data = dict(vertexCount=len(positions)//3, indexCount=len(indices), anchors=anchors)
(output / 'head.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
print('Head:', len(positions)//3, 'vertices,', len(indices)//3, 'triangles; anchors:', anchors)
print('Bounds:', [(min(positions[k::3]),max(positions[k::3])) for k in range(3)])

# Retain only the UV islands actually used by the head. Normalize the diffuse
# map so skin tone remains a runtime color choice, not baked into the texture.
if (source / 'skin' / 'Aksel_Skin_diffuse.png').exists():
    import numpy as np
    size = 1024
    mask = np.zeros((size,size),dtype=bool)
    eye_mask = np.zeros((size,size),dtype=np.float32)
    uv_points = np.array(uvs).reshape((-1,2)) * (size-1)
    xyz = np.array(positions).reshape((-1,3))
    # The source skin has baked eye shadows / brows. Remove those so the actual
    # sockets, lighting, eye color and separate customizable eyebrows define them.
    eye_weights = np.exp(-((np.abs(xyz[:,0])-.036)/.033)**6-((xyz[:,1]-1.966)/.037)**6) * (xyz[:,2]<-.115)
    for i in range(0,len(indices),3):
        p = uv_points[indices[i:i+3]]
        lo = np.maximum(0,np.floor(p.min(axis=0)).astype(int)-1)
        hi = np.minimum(size-1,np.ceil(p.max(axis=0)).astype(int)+1)
        xx,yy = np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1))
        den=(p[1,1]-p[2,1])*(p[0,0]-p[2,0])+(p[2,0]-p[1,0])*(p[0,1]-p[2,1])
        if abs(den)<1e-8: continue
        a=((p[1,1]-p[2,1])*(xx-p[2,0])+(p[2,0]-p[1,0])*(yy-p[2,1]))/den
        b=((p[2,1]-p[0,1])*(xx-p[2,0])+(p[0,0]-p[2,0])*(yy-p[2,1]))/den
        mask[lo[1]:hi[1]+1,lo[0]:hi[0]+1] |= (a>=-.1)&(b>=-.1)&(a+b<=1.1)
        weights=eye_weights[indices[i:i+3]]
        eye_mask[lo[1]:hi[1]+1,lo[0]:hi[0]+1]=np.maximum(eye_mask[lo[1]:hi[1]+1,lo[0]:hi[0]+1],np.clip(a*weights[0]+b*weights[1]+(1-a-b)*weights[2],0,1)*((a>=-.1)&(b>=-.1)&(a+b<=1.1)))
    # A few pixels of island padding avoids seams at lower mip levels.
    for _ in range(5): mask=mask|np.roll(mask,1,0)|np.roll(mask,-1,0)|np.roll(mask,1,1)|np.roll(mask,-1,1)
    for source_name, output_name, normal in [('Aksel_Skin_diffuse.png','skin-color.png',False),('Aksel_Skin_NRM.png','skin-normal.png',True)]:
        image=bpy.data.images.load(str(source/'skin'/source_name));image.colorspace_settings.name='Non-Color';image.scale(size,size)
        pixels=np.array(image.pixels[:],dtype=np.float32).reshape((size,size,4))
        if not normal:
            median=np.median(pixels[mask,:3],axis=0)
            pixels[:,:,:3]=np.clip(pixels[:,:,:3]/np.maximum(median,.1)*.87,.05,1)
            blend=eye_mask[:,:,None]*.98
            pixels[:,:,:3]=pixels[:,:,:3]*(1-blend)+np.array([.89,.87,.86])*blend
        pixels[~mask,:3]=[.5,.5,1] if normal else [1,1,1]
        pixels[:,:,3]=1
        image.pixels.foreach_set(pixels.ravel());image.filepath_raw=str(output/output_name);image.file_format='PNG';image.save()
    print('Baked 1024px recolorable head textures')
