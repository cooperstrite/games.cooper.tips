// Procedural aircraft built in real-world proportions. The same model is used
// for flight, the preflight view, and surrounding traffic.
function roundedProfile(rings, subdivisions) {
  const p=rings.map(([z,rx,ry,cy=0])=>[z,rx,ry,cy]);
  const slope=(i,k)=>{
    if(i===0)return(p[1][k]-p[0][k])/(p[1][0]-p[0][0]);
    if(i===p.length-1)return(p[i][k]-p[i-1][k])/(p[i][0]-p[i-1][0]);
    const a=(p[i][k]-p[i-1][k])/(p[i][0]-p[i-1][0]),b=(p[i+1][k]-p[i][k])/(p[i+1][0]-p[i][0]);
    return a*b<=0?0:2*a*b/(a+b);
  };
  const result=[];
  for(let i=0;i<p.length-1;i++)for(let n=0;n<subdivisions;n++){
    const t=n/subdivisions,t2=t*t,t3=t2*t,dz=p[i+1][0]-p[i][0],sample=[p[i][0]+t*dz];
    for(let k=1;k<4;k++){
      const value=(2*t3-3*t2+1)*p[i][k]+(t3-2*t2+t)*dz*slope(i,k)+(-2*t3+3*t2)*p[i+1][k]+(t3-t2)*dz*slope(i+1,k);
      sample.push(Math.max(Math.min(p[i][k],p[i+1][k]),Math.min(Math.max(p[i][k],p[i+1][k]),value)));
    }
    result.push(sample);
  }
  result.push(p.at(-1));return result;
}

export function buildAircraft(gfx, type, { traffic = false } = {}) {
  const { B, scene, material, shadows } = gfx;
  const root = new B.TransformNode(`aircraft-${type}`, scene);
  const parts = [], wheels = [], propellers = [], fans = [], flapPivots = [], controlSurfaces = [];
  const gear = new B.TransformNode("landing-gear", scene); gear.parent = root;
  const white = material(type === "military" ? "#8d9ca8" : type === "cargo" ? "#dbded6" : "#f0f1e9", { metalness: .2, roughness: .38 });
  const accent = material({ passenger: "#224a73", cargo: "#b77630", bush: "#d74825", military: "#526678" }[type], { metalness: .25, roughness: .32 });
  const dark = material("#111e2a", { metalness: .3, roughness: .32 });
  const glass = material("#15364b", { metalness: .7, roughness: .13 });
  const metal = material("#b1bfca", { metalness: .8, roughness: .24 });
  const rubber = material("#20282d", { roughness: .94 });
  const red = material("#ff3228", { emissive: true });
  const green = material("#40ffad", { emissive: true });
  const bright = material("#fff7d0", { emissive: true });
  const satin = material("#77878e", { metalness: .65, roughness: .45 });
  const carbon = material("#293339", { metalness: .15, roughness: .7 });
  let paint=white,wingPaint=type==="bush"?accent:white,hullProfile=null;
  const ownTextures=[],ownMaterials=[];
  root.onDisposeObservable.add(()=>{for(const m of ownMaterials)m.dispose(false,false);for(const t of ownTextures)t.dispose();});
  if(!traffic){
    const texture=new B.DynamicTexture("aircraft-panel-paint",{width:512,height:2048},scene,true),ctx=texture.getContext();
    ctx.fillStyle=type==="military"?"#93a0a9":type==="cargo"?"#d9dedc":"#f1f2ef";ctx.fillRect(0,0,512,2048);
    ctx.strokeStyle=type==="military"?"#4d5b64":"#8f9da3";ctx.lineWidth=1;
    for(let y=25;y<2048;y+=85){ctx.globalAlpha=.3;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();ctx.globalAlpha=.24;ctx.fillStyle="#596d78";for(let x=6;x<512;x+=9)ctx.fillRect(x,y+3,1,1);}
    for(const x of [60,128,196,255,384,450]){ctx.globalAlpha=.18;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,2048);ctx.stroke();}
    ctx.globalAlpha=1;
    if(type==="passenger"){
      ctx.fillStyle="#d5dce1";ctx.fillRect(282,170,207,1680);
      ctx.fillStyle="#254e77";ctx.fillRect(277,210,5,1600);ctx.fillRect(489,210,5,1600);
    }
    texture.update();paint=white.clone(`detailed-${type}-paint`);paint.albedoTexture=texture;paint.albedoColor=B.Color3.White();paint.metallic=type==="military"?.24:.16;paint.roughness=type==="military"?.58:.3;
    paint.clearCoat.isEnabled=type!=="military";paint.clearCoat.intensity=.5;paint.clearCoat.roughness=.2;
    texture.anisotropicFilteringLevel=8;ownTextures.push(texture);ownMaterials.push(paint);
    const wingTexture=new B.DynamicTexture("wing-skin-panels",{width:1024,height:512},scene,true),w=wingTexture.getContext();
    w.fillStyle={passenger:"#dce3e4",cargo:"#cbd4d2",bush:"#e45d32",military:"#8c9ba4"}[type];w.fillRect(0,0,1024,512);
    w.strokeStyle=type==="bush"?"#803b2c":"#697c86";w.lineWidth=1;w.globalAlpha=.22;
    for(const x of [96,200,390,585,770,930]){w.beginPath();w.moveTo(x,0);w.lineTo(x,512);w.stroke();}
    for(const y of [100,345,448]){w.beginPath();w.moveTo(0,y);w.lineTo(1024,y);w.stroke();}
    for(let x=110;x<880;x+=138){w.strokeRect(x,190,72,90);for(let rivet=0;rivet<72;rivet+=9){w.fillRect(x+rivet,186,1,1);w.fillRect(x+rivet,284,1,1);}}
    w.globalAlpha=1;w.fillStyle=type==="bush"?"#f3e6ca":"#77858b";w.fillRect(type==="bush"?790:38,160,type==="bush"?80:48,240);
    if(type==="bush"){w.fillStyle="#f1e7ce";w.fillRect(985,0,39,512);}
    wingTexture.update();wingTexture.anisotropicFilteringLevel=8;ownTextures.push(wingTexture);
    wingPaint=white.clone(`detailed-${type}-wings`);wingPaint.albedoTexture=wingTexture;wingPaint.albedoColor=B.Color3.White();wingPaint.roughness=type==="military"?.6:.39;wingPaint.metallic=.2;ownMaterials.push(wingPaint);
  }
  function finish(mesh, mat, parent = root) {
    mesh.material = mat; mesh.parent = parent; mesh.isPickable = false;
    parts.push(mesh); if (!traffic && shadows) shadows.addShadowCaster(mesh);
    mesh.receiveShadows = !traffic;
    return mesh;
  }
  function box(name, size, position, mat, parent = root) {
    const m = finish(B.MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene), mat, parent);
    m.position.set(...position); return m;
  }
  function sphere(name, size, position, mat, parent = root) {
    const m = finish(B.MeshBuilder.CreateSphere(name, { diameter: 1, segments: traffic ? 12 : 20 }, scene), mat, parent);
    m.scaling.set(...size); m.position.set(...position); return m;
  }
  function rod(name, from, to, diameter, mat, parent = root) {
    const start = new B.Vector3(...from), end = new B.Vector3(...to), delta = end.subtract(start);
    const m = finish(B.MeshBuilder.CreateCylinder(name, { height: delta.length(), diameter, tessellation: traffic ? 10 : 16 }, scene), mat, parent);
    m.position.copyFrom(start.add(end).scale(.5));
    m.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(B.Axis.Y, delta.normalize(), new B.Quaternion());
    return m;
  }
  function body(name, rings, mat, parent = root) {
    const profile=roundedProfile(rings,traffic?2:6),segments=traffic?24:48;
    const paths = profile.map(([z, rx, ry, cy = 0]) => Array.from({ length: segments+1 }, (_, j) => {
      const t = j / segments * Math.PI * 2; return new B.Vector3(Math.cos(t) * rx, cy + Math.sin(t) * ry, z);
    }));
    const detailed=["sculpted-airliner","cargo-fuselage","bush-fuselage","fighter-body"].includes(name);
    if(detailed)hullProfile=profile;
    const m = finish(B.MeshBuilder.CreateRibbon(name, { pathArray: paths, sideOrientation: B.Mesh.DOUBLESIDE }, scene), detailed?paint:mat, parent);
    if(detailed&&!traffic){
      const uvs=[],length=rings.at(-1)[0]-rings[0][0];
      for(let side=0;side<2;side++)for(const ring of profile)for(let j=0;j<=segments;j++)uvs.push(j/segments,(ring[0]-rings[0][0])/length);
      if(uvs.length===m.getTotalVertices()*2)m.setVerticesData(B.VertexBuffer.UVKind,uvs);
    }
    return m;
  }
  // A closed tapered airfoil, with a curved leading edge and fine trailing edge.
  function wing(name, sections, mat, parent = root) {
    const shape=[],steps=traffic?10:20;
    const contour=(u,top)=>{const t=.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1036*u**4;return t*(top?10:-4)+Math.sin(u*Math.PI)*(top?.12:.05);};
    for(let j=0;j<=steps;j++){const u=(1-Math.cos(j/steps*Math.PI))/2;shape.push([u,contour(u,true)]);}
    for(let j=steps-1;j>=0;j--){const u=(1-Math.cos(j/steps*Math.PI))/2;shape.push([u,contour(u,false)]);}
    const paths = sections.map(([x, y, front, back, thickness]) => shape.map(([u, v]) => new B.Vector3(x, y + v * thickness, front + (back - front) * u)));
    const main=/main-wing|high-wing|swept-fighter|bush-high-wing/.test(name);
    const mesh=finish(B.MeshBuilder.CreateRibbon(name, { pathArray: paths, closeArray: false, sideOrientation: B.Mesh.DOUBLESIDE }, scene), main?wingPaint:mat, parent);
    if(!traffic&&main){
      const span=Math.max(...sections.map(s=>Math.abs(s[0]))),uvs=[];
      for(let side=0;side<2;side++)for(const section of sections)for(const [u] of shape)uvs.push(Math.abs(section[0])/span,u);
      mesh.setVerticesData(B.VertexBuffer.UVKind,uvs);
      const lines=[];
      for(const u of [.28,.7,.88])lines.push(sections.map(([x,y,front,back,thickness])=>new B.Vector3(x,y+thickness*(u<.7?.96:.55)+.015,front+(back-front)*u)));
      const seams=B.MeshBuilder.CreateLineSystem("wing-panel-seams",{lines},scene);seams.color=B.Color3.FromHexString("#89959d");seams.alpha=.35;seams.parent=parent;seams.isPickable=false;
    }
    return mesh;
  }
  function fin(name, coords, thickness, mat) {
    // Triangulate a convex profile along x; no external polygon library needed.
    const positions = [], indices = [];
    for (const x of [-thickness / 2, thickness / 2]) for (const [y, z] of coords) positions.push(x, y, z);
    const n = coords.length;
    for (let j = 1; j < n - 1; j++) { indices.push(0, j, j + 1, n, n + j + 1, n + j); }
    for (let j = 0; j < n; j++) { const k = (j + 1) % n; indices.push(j, n + k, k, j, n + j, n + k); }
    const data = new B.VertexData(); data.positions = positions; data.indices = indices; data.normals = [];
    B.VertexData.ComputeNormals(positions, indices, data.normals);
    const m = new B.Mesh(name, scene); data.applyToMesh(m);
    // A thin fin has flat outer faces, not normals averaged across its edges.
    m.convertToFlatShadedMesh(); return finish(m, mat);
  }
  function panel(name, points, mat, parent = root) {
    const positions=[...points.flat(),...points.flat()],indices=[],n=points.length;
    for(let j=1;j<n-1;j++)indices.push(0,j,j+1,n,n+j+1,n+j);
    const data=new B.VertexData();data.positions=positions;data.indices=indices;data.normals=[];
    B.VertexData.ComputeNormals(positions,indices,data.normals);
    const mesh=new B.Mesh(name,scene);data.applyToMesh(mesh);return finish(mesh,mat,parent);
  }
  function hullPoint(z, angle, inset=.02) {
    const i=Math.max(0,hullProfile.findIndex(p=>p[0]>=z)-1),a=hullProfile[i],b=hullProfile[Math.min(i+1,hullProfile.length-1)];
    const t=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0]||1))),rx=a[1]+(b[1]-a[1])*t,ry=a[2]+(b[2]-a[2])*t,cy=a[3]+(b[3]-a[3])*t;
    return new B.Vector3(Math.cos(angle)*(rx+inset),cy+Math.sin(angle)*(ry+inset),z);
  }
  function hullBand(name,z0,z1,a0,a1,mat,inset=.025) {
    const paths=Array.from({length:7},(_,j)=>Array.from({length:6},(_,k)=>hullPoint(z0+(z1-z0)*j/6,a0+(a1-a0)*k/5,inset)));
    return finish(B.MeshBuilder.CreateRibbon(name,{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene),mat);
  }
  function airlinerCockpit(z0,z1) {
    for(const [a,b] of [[.35,.8],[.85,1.53],[1.61,2.29],[2.34,2.79]]){
      hullBand("windshield-seal",z0-.07,z1+.07,a-.018,b+.018,carbon);
      hullBand("flight-deck-pane",z0,z1,a,b,glass,.045);
    }
    for(const side of [-1,1]){
      const a=side>0?.34:Math.PI-.8,b=side>0?.8:Math.PI-.34;
      hullBand("cockpit-side-pane",z0-1.1,z0-.18,a,b,glass,.035);
    }
  }
  function cabinWindow(z,side) {
    const center=side>0?.25:Math.PI-.25;
    for(const [name,width,height,mat,offset] of [["window-surround",.33,.23,satin,.028],["cabin-window",.25,.18,glass,.041]]){
      const points=Array.from({length:20},(_,j)=>{const a=j/20*Math.PI*2,u=Math.cos(a),v=Math.sin(a);return hullPoint(z+Math.sign(u)*Math.sqrt(Math.abs(u))*width/2,center+Math.sign(v)*Math.sqrt(Math.abs(v))*height/2,offset).asArray();});
      panel(name,points,mat);
    }
  }
  const decals=new Map();
  function decal(name,x,y,z,width,height,side,draw,parent=root) {
    if(traffic)return;
    if(!decals.has(name)){
      const texture=new B.DynamicTexture(name,{width:512,height:256},scene,true),c=texture.getContext();c.clearRect(0,0,512,256);draw(c);texture.hasAlpha=true;texture.update();texture.anisotropicFilteringLevel=8;ownTextures.push(texture);
      const mat=new B.PBRMaterial(name,scene);mat.albedoTexture=texture;mat.useAlphaFromAlbedoTexture=true;mat.transparencyMode=B.PBRMaterial.PBRMATERIAL_ALPHATEST;mat.alphaCutOff=.4;mat.metallic=.1;mat.roughness=.6;ownMaterials.push(mat);decals.set(name,mat);
    }
    const mesh=finish(B.MeshBuilder.CreatePlane(name,{width,height},scene),decals.get(name),parent);mesh.position.set(x,y,z);mesh.rotation.y=-side*Math.PI/2;
  }
  function textDecal(text,color="#dce5df") {return c=>{c.fillStyle=color;c.textAlign="center";c.textBaseline="middle";c.font="600 130px sans-serif";c.fillText(text,256,130,490);};}
  function oleo(name,from,to,diameter) {
    const a=new B.Vector3(...from),b=new B.Vector3(...to),at=t=>B.Vector3.Lerp(a,b,t).asArray();
    rod(name,from,at(.64),diameter*1.45,white,gear);
    rod(`${name}-piston`,at(.53),to,diameter,metal,gear);
    rod(`${name}-collar`,at(.5),at(.6),diameter*1.75,satin,gear);
    if(!traffic){
      const elbow=B.Vector3.Lerp(a,b,.72).add(new B.Vector3(0,0,diameter*2.5)).asArray();
      rod("torque-scissor-upper",at(.56),elbow,diameter*.42,satin,gear);
      rod("torque-scissor-lower",elbow,at(.9),diameter*.42,satin,gear);
    }
  }
  function controlSurface(kind,side,x,y,z,span,chord,mat) {
    const pivot=new B.TransformNode(`${kind}-hinge`,scene);pivot.parent=root;pivot.position.set(side*x,y,z);
    wing(`${kind}-surface`,[[-span/2,0,.02,-chord,.035],[span/2,0,.02,-chord*.8,.025]],mat,pivot);
    controlSurfaces.push({pivot,kind,side});
  }
  function tire(x, y, z, radius, width, parent = gear) {
    // Keep the axle fixed. Spinning an already tilted mesh's Euler Y angle
    // steers the entire wheel instead of rotating the tire around its axle.
    const axle = new B.TransformNode("wheel-axle", scene);
    axle.parent = parent; axle.position.set(x, y, z); axle.rotation.z = Math.PI / 2;
    const m = finish(B.MeshBuilder.CreateCylinder("tire", { diameter: radius * 2, height: width, tessellation: traffic ? 16 : 32 }, scene), rubber, axle);
    m.metadata = { radius };
    for (const side of [-1, 1]) {
      const hub = finish(B.MeshBuilder.CreateCylinder("wheel-hub", { diameter: radius * 1.15, height: .025, tessellation: 16 }, scene), metal, m);
      hub.position.y = side * (width / 2 + .01);
      if (!traffic) {
        const cap = finish(B.MeshBuilder.CreateCylinder("axle-cap", { diameter: radius * .3, height: .035, tessellation: 12 }, scene), dark, hub);
        cap.position.y = side * .025;
        const bolts = [];
        for (let j = 0; j < 6; j++) {
          const a = j * Math.PI / 3;
          const bolt = B.MeshBuilder.CreateCylinder("hub-bolt", { diameter: radius * .09, height: .04, tessellation: 6 }, scene);
          bolt.position.set(Math.cos(a) * radius * .4, side * (width / 2 + .04), Math.sin(a) * radius * .4);
          bolts.push(bolt);
        }
        finish(B.Mesh.MergeMeshes(bolts, true, true), dark, m).name = "wheel-bolts";
      }
    }
    if (!traffic) for (const y of [-.27, 0, .27]) {
      const groove = finish(B.MeshBuilder.CreateTorus("tire-groove", { diameter: radius * 2 - .012, thickness: radius * .035, tessellation: 32 }, scene), dark, m);
      groove.position.y = width * y;
    }
    wheels.push({ mesh: m, radius }); return m;
  }
  function jetEngine(x, y, z, radius, length) {
    const engine = new B.TransformNode("engine", scene); engine.parent = root; engine.position.set(x, y, z);
    body("engine-nacelle", [[-length / 2, radius * .65, radius * .65], [-length * .35, radius * .85, radius * .85], [length * .15, radius, radius], [length / 2, radius * .92, radius * .92]], type==="passenger"?accent:white, engine);
    const rim = finish(B.MeshBuilder.CreateTorus("inlet-lip", { diameter: radius * 1.75, thickness: radius * .12, tessellation: 32 }, scene), metal, engine);
    rim.rotation.x = Math.PI / 2; rim.position.z = length / 2;
    body("inlet-duct",[[length/2-radius*.75,radius*.65,radius*.65],[length/2-radius*.22,radius*.81,radius*.81],[length/2,radius*.84,radius*.84]],carbon,engine);
    sphere("dark-inlet", [radius * 1.6, radius * 1.6, .08], [0, 0, length / 2 - radius*.7], dark, engine);
    const rotor=new B.TransformNode("turbine-rotor",scene);rotor.parent=engine;rotor.position.z=length/2-radius*.6;fans.push(rotor);
    sphere("fan-cone", [radius * .43, radius * .43, radius * .68], [0, 0, radius*.12], satin, rotor);
    if (!traffic) for (let j = 0; j < 18; j++) {
      const angle=j/18*Math.PI*2,paths=[];
      for(const r of [.18,.35,.58,.8])paths.push([-.09,.09].map(width=>{const a=angle+r*.5+width;return new B.Vector3(Math.sin(a)*radius*r,Math.cos(a)*radius*r,-r*radius*.12);}));
      finish(B.MeshBuilder.CreateRibbon("swept-turbine-blade",{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene),metal,rotor);
    }
    body("exhaust-nozzle",[[-length/2-.09,radius*.54,radius*.54],[-length/2+.32,radius*.65,radius*.65]],satin,engine);
    sphere("exhaust", [radius * .98, radius * .98, .09], [0, 0, -length / 2+.06], dark, engine);
    if(!traffic){
      const rim=finish(B.MeshBuilder.CreateTorus("exhaust-rim",{diameter:radius*1.08,thickness:radius*.045,tessellation:40},scene),metal,engine);rim.rotation.x=Math.PI/2;rim.position.z=-length/2-.09;
      for(let j=0;j<(type==="military"?16:8);j++){
        const a=j/(type==="military"?16:8)*Math.PI*2;
        const petal=box("nozzle-petal",[radius*.13,radius*.04,.26],[Math.sin(a)*radius*.58,Math.cos(a)*radius*.58,-length/2+.06],j%2?satin:metal,engine);petal.rotation.z=-a;petal.rotation.x=.12;
      }
    }
    return engine;
  }
  function propeller(x, y, z, radius) {
    const hub = new B.TransformNode("propeller", scene); hub.parent = root; hub.position.set(x, y, z);
    sphere("spinner", [.45, .45, .8], [0, 0, .15], metal, hub);
    for (let j = 0; j < (type === "bush" ? 3 : 4); j++) {
      const pivot = new B.TransformNode("blade-pivot", scene); pivot.parent = hub;
      pivot.rotation.z = j * Math.PI * 2 / (type === "bush" ? 3 : 4);
      const paths=[[.08,.045,0],[.3,.12,.02],[.68,.14,.045],[.95,.08,.07],[1,.035,.08]].map(([r,width,sweep])=>[new B.Vector3(-width+sweep,radius*r,.045),new B.Vector3(width+sweep,radius*r,-.045)]);
      finish(B.MeshBuilder.CreateRibbon("sculpted-propeller-blade",{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene),carbon,pivot);
      panel("propeller-tip",[[.01,radius*.9,.052],[.16,radius*.9,.052],[.115,radius,.052],[.045,radius,.052]],bright,pivot);
    }
    propellers.push(hub);
  }
  let hook = null;
  if (type === "passenger") {
    body("sculpted-airliner", [[-18, .05, .08, .85], [-15, .7, .8, .5], [-12, 1.45, 1.5, .15], [-8, 1.85, 1.9], [9, 1.85, 1.9], [13, 1.65, 1.7, -.05], [15.4, 1.12, 1.15, -.15], [17.1, .6, .55, -.25], [18, .025, .025, -.3]], white);
    airlinerCockpit(14.65,16.05);
    body("belly-paint", [[-13, .2, .16, -.8], [-9, 1.5, .5, -1.35], [10, 1.5, .5, -1.35], [14, .6, .17, -1.1]], accent);
    for (const side of [-1, 1]) {
      wing("main-wing", [[side * 1.2, -.55, 4.5, -5.8, .38], [side * 6, -.3, 2, -7, .27], [side * 15.8, .55, -5.2, -8, .1], [side * 17, 1.45, -6, -8.1, .055]], white);
      wing("tailplane", [[side * .6, .6, -11, -16.2, .22], [side * 6.2, 1, -14, -17.2, .08]], white);
      box("wingtip-nav", [.18, .13, .4], [side * 16.9, 1.5, -6.7], side < 0 ? red : green);
      box("engine-pylon", [.38, 1.25, 2.2], [side * 5.6, -1.25, 1.5], white);
      jetEngine(side * 5.6, -2.1, 2.2, 1.22, 4.5);
      for (let n = -10; n < 13; n += 1.05) cabinWindow(n,side);
      for (const z of [-10.5, 11.3]) {
        const angle=side>0?0:Math.PI;
        hullBand("door-outline",z-.4,z+.4,angle-.34,angle+.42,satin,.026);
        hullBand("cabin-door",z-.36,z+.36,angle-.31,angle+.39,white,.041);
      }
      decal("aster-wordmark",side*1.873,.07,3,6.5,.48,side,textDecal("ASTER", "#365773"));
      decal("aster-registration",side*1.87,-.26,-6.5,2.1,.23,side,textDecal("RG-180", "#425969"));
      for(const x of [4,7.8]){
        const fairing=body("flap-track-fairing",[[-1.8,.03,.03],[-1.1,.25,.23],[.5,.22,.2],[1.7,.025,.025]],white);
        fairing.position.set(side*x,-.6,-5.7-(x>5?.8:0));
      }
      controlSurface("aileron",side,12.5,.35,-7.4,4.1,.62,white);
      controlSurface("elevator",side,3.7,.9,-16.1,4.2,.7,white);
      const flap = new B.TransformNode("flap-pivot", scene); flap.parent = root; flap.position.set(0, -.45, -5.8);
      wing("trailing-flap", [[side * 2.2, 0, 0, -1.3, .1], [side * 9.4, .1, -1, -2.1, .07]], white, flap); flapPivots.push(flap);
      oleo("main-strut", [side * 3, -1, -2.8], [side * 3, -2.76, -2.8], .18);
      rod("main-gear-brace",[side*1.7,-1.3,-1.8],[side*3,-2.3,-2.8],.12,satin,gear);
      const door=box("open-main-gear-door",[.09,1.15,.85],[side*3.35,-1.45,-2.8],white,gear);door.rotation.z=side*.18;
      for (const x of [-.22, .22]) tire(side * 3 + x, -2.76, -2.8, .64, .31);
    }
    fin("vertical-tail", [[.5, -16.4], [7, -16.5], [6.9, -14.9], [1.5, -10]], .22, accent);
    for(const side of [-1,1])decal("aster-tail-emblem",side*.128,4.25,-15.05,2.15,2.2,side,c=>{c.fillStyle="#e5c78a";c.beginPath();c.moveTo(38,205);c.lineTo(240,28);c.lineTo(475,68);c.lineTo(250,88);c.lineTo(145,188);c.closePath();c.fill();c.fillStyle="#edf2ed";c.beginPath();c.moveTo(100,222);c.lineTo(277,112);c.lineTo(460,131);c.lineTo(285,150);c.lineTo(192,217);c.closePath();c.fill();});
    oleo("nose-strut", [0, -1.3, 12], [0, -3, 12], .16);
    rod("nose-gear-drag-brace",[0,-1.3,10.7],[0,-2.5,12],.1,satin,gear);
    tire(-.2, -3, 12, .4, .25); tire(.2, -3, 12, .4, .25);
  } else if (type === "cargo") {
    body("cargo-fuselage", [[-17, .05, .08, 1.6], [-14, 1.2, 1.2, 1], [-10, 2.2, 2.15, 0], [8, 2.2, 2.15, 0], [12, 1.85, 1.7, .2], [15, 1.15, 1.1, -.1], [17, .05, .05, -.7]], white);
    airlinerCockpit(12.8,15.1);
    for (const side of [-1, 1]) {
      wing("high-wing", [[side * 1.5, 1.6, 3, -5.4, .42], [side * 8, 1.6, 1.6, -5.4, .28], [side * 19.5, 1.9, -1.4, -4.5, .09]], white);
      wing("high-tailplane", [[side * .2, 6, -12.2, -16.5, .23], [side * 7, 6.2, -14.3, -17, .09]], accent);
      for (const x of [6, 12]) {
        const nacelle = jetEngine(side * x, .7, 1.9, .9, 4.8);
        propeller(side * x, .7, 4.5, 2.1);
        nacelle.scaling.x = .85;
      }
      box("cargo-gear-fairing", [1.15, .8, 5.6], [side * 2, -1.55, -1], accent);
      for (const z of [-2.6, -1, .6]) {
        oleo("cargo-strut", [side * 2.4, -1.4, z], [side * 2.4, -3.05, z], .2);
        tire(side * 2.4, -3.05, z, .65, .43);
      }
      box("cargo-stripe", [.04, .35, 17], [side * 2.19, .25, 0], accent);
      decal("atlas-wordmark",side*2.225,-.25,0,7.5,.6,side,textDecal("ATLAS CARGO","#4c6069"));
      hullBand("cargo-hatch-outline",-7.8,-5.8,side>0?-.48:Math.PI-.48,side>0?.5:Math.PI+.5,satin,.02);
      hullBand("cargo-hatch",-7.7,-5.9,side>0?-.44:Math.PI-.44,side>0?.46:Math.PI+.46,white,.038);
      controlSurface("aileron",side,16.4,1.86,-4.65,4.7,.65,white);
      controlSurface("elevator",side,4.2,6.12,-16.8,4.8,.52,accent);
      sphere("wing-navigation", [.15, .15, .2], [side * 19.4, 2, -2], side < 0 ? red : green);
      const flap = new B.TransformNode("cargo-flap", scene); flap.parent = root; flap.position.set(side * 9, 1.6, -4.9);
      wing("cargo-flap-surface", [[-5, 0, 0, -1.2, .1], [5, 0, 0, -1.2, .1]], white, flap); flapPivots.push(flap);
    }
    fin("cargo-fin", [[1, -16.8], [7.4, -16.4], [7.2, -14.5], [1.6, -9.7]], .25, accent);
    for(const side of [-1,1])decal("cargo-tail-number",side*.14,4.7,-14.85,1.85,1.7,side,textDecal("40"));
    box("loading-ramp", [2.1, .12, 4.4], [0, -.6, -12], dark).rotation.x = -.22;
    oleo("cargo-nose-gear", [0, -1, 11], [0, -3.2, 11], .2);
    rod("cargo-nose-brace",[0,-1.3,9.8],[0,-2.6,11],.14,satin,gear);
    tire(-.22, -3.2, 11, .5, .32); tire(.22, -3.2, 11, .5, .32);
  } else if (type === "bush") {
    body("bush-fuselage", [[-4.3, .06, .13, .1], [-3, .24, .3, .1], [-1.3, .65, .7], [.6, .68, .7], [2.2, .5, .55], [3.7, .45, .45, -.05], [4.15, .22, .22, -.05]], white);
    panel("bush-windshield-seal",[[-.6,.38,1.51],[.6,.38,1.51],[.58,1.03,.97],[-.58,1.03,.97]],carbon);
    for(const side of [-1,1])panel("bush-windshield-pane",[[side*.035,.43,1.5],[side*.545,.43,1.5],[side*.53,.975,1.035],[side*.035,.975,1.035]],glass);
    for (const side of [-1, 1]) {
      box("cabin-side-window", [.035, .71, 1.65], [side * .65, .56, .26], glass);
      box("cabin-window-divider", [.06, .8, .075], [side * .68, .55, .3], white);
      box("cabin-door-sill",[.055,.08,1.7],[side*.68,.15,.26],accent);
      rod("bush-cabin-frame",[side*.58,1.02,1.02],[side*.66,.18,1.25],.045,white);
      box("bush-door-handle",[.05,.04,.21],[side*.706,.04,.4],metal);
      decal("kestrel-registration",side*.69,-.16,-.4,1.25,.2,side,textDecal("RG-K7","#864e35"));
      wing("bush-high-wing", [[side * .4, 1.08, 1.7, -.6, .16], [side * 4.7, 1.16, 1.5, -.55, .14], [side * 5.5, 1.17, 1.15, -.4, .08]], accent);
      rod("wing-support", [side * .5, -.4, .3], [side * 3.3, 1.12, .3], .065, metal);
      oleo("gear-leg", [side * .5, -.45, .7], [side * 1.1, -1.1, .7], .1);
      rod("bush-gear-brace",[side*.5,-.4,-.3],[side*1.1,-1.1,.7],.065,satin,gear);
      tire(side * 1.12, -1.1, .7, .55, .38);
      wing("bush-tailplane", [[side * .1, .12, -2.5, -4.1, .09], [side * 1.8, .15, -3, -4.1, .05]], accent);
      sphere("bush-nav", [.1, .1, .12], [side * 5.46, 1.22, 1], side < 0 ? red : green);
      controlSurface("aileron",side,4.2,1.16,-.45,2.05,.35,accent);
      controlSurface("elevator",side,1.05,.14,-3.9,1.3,.32,accent);
      const flap = new B.TransformNode("bush-flap", scene); flap.parent = root; flap.position.set(side * 2.2, 1.08, -.45);
      wing("bush-flap-surface", [[-1.3, 0, 0, -.45, .04], [1.3, 0, 0, -.45, .04]], white, flap); flapPivots.push(flap);
    }
    fin("bush-tail", [[.1, -4.1], [1.65, -3.9], [1.6, -3.4], [.2, -2.7]], .1, accent);
    for(const side of [-1,1])decal("bush-tail-mark",side*.062,.95,-3.67,.42,.57,side,textDecal("K","#f8e6bf"));
    rod("tailwheel-spring", [0, -.2, -3.6], [0, -.91, -3.7], .065, metal, gear);
    tire(0, -.91, -3.7, .2, .16);
    propeller(0, -.05, 4.17, 1.18);
    rod("exhaust-pipe", [.35, -.25, 2.8], [.6, -.7, 2.2], .12, dark);
  } else {
    body("fighter-body", [[-9, .6, .65, 0], [-7.5, 1, .8], [-3, 1.25, .9], [1, .95, .8], [4, .75, .65, .1], [6.5, .43, .42, 0], [9, .015, .02, -.1]], white);
    body("teardrop-canopy",[[.65,.03,.035,.8],[1.35,.53,.46,.76],[2.5,.64,.66,.75],[3.9,.48,.46,.67],[4.75,.03,.035,.57]],glass);
    const arch=Array.from({length:25},(_,j)=>{const a=j/24*Math.PI;return new B.Vector3(Math.cos(a)*.55,.76+Math.sin(a)*.48,1.4);});
    finish(B.MeshBuilder.CreateTube("canopy-arch",{path:arch,radius:.028,tessellation:8},scene),satin);
    body("fighter-radome",[[5.9,.51,.48],[6.5,.44,.43],[8.7,.09,.09,-.08],[9.02,.012,.012,-.1]],material("#586b79",{metalness:.13,roughness:.68}));
    for (const side of [-1, 1]) {
      wing("swept-fighter-wing", [[side * .9, -.1, 3.4, -5.4, .21], [side * 3.6, -.1, .8, -5.1, .13], [side * 6.5, -.1, -2.3, -5, .035]], white);
      wing("fighter-tailplane", [[side * .6, 0, -5.7, -9, .13], [side * 3.8, -.25, -7.3, -9.3, .04]], accent);
      const tail = fin("twin-tail", [[.3, -8.2], [4.2, -7.2], [4.1, -5.9], [.6, -3.6]], .15, accent);
      tail.position.x = side * 1.1; tail.rotation.z = side * -.18;
      for(const face of [-1,1])decal("fighter-tail-number",face*.09,2.7,-6.55,1.02,.87,face,textDecal("27","#d6dfdc"),tail);
      jetEngine(side * .72, -.15, -6.8, .63, 3.5);
      box("side-intake", [.72, .83, 2.4], [side * 1.12, -.2, .2], carbon).rotation.y = side * .12;
      panel("intake-lip",[[side*.83,-.69,1.5],[side*1.61,-.57,1.5],[side*1.54,.23,1.5],[side*.9,.32,1.5]],satin);
      panel("intake-opening",[[side*.94,-.58,1.52],[side*1.49,-.49,1.52],[side*1.43,.13,1.52],[side*.99,.2,1.52]],dark);
      oleo("fighter-main-gear", [side * .9, -.6, -1.4], [side * 1.65, -1.63, -1.4], .11);
      const door=box("fighter-gear-door",[.055,.73,.75],[side*1.78,-.96,-1.4],white,gear);door.rotation.z=side*.2;
      tire(side * 1.65, -1.63, -1.4, .47, .28);
      sphere("fighter-nav", [.12, .1, .25], [side * 6.42, 0, -3], side < 0 ? red : green);
      controlSurface("aileron",side,5.2,-.08,-4.85,2,.48,white);
      controlSurface("elevator",side,2.25,-.1,-8.72,2.3,.45,accent);
      const flap = new B.TransformNode("fighter-flap", scene); flap.parent = root; flap.position.set(side * 3.4, -.1, -4.6);
      wing("fighter-flap-surface", [[-1.4, 0, 0, -.6, .07], [1.4, 0, 0, -.6, .04]], accent, flap); flapPivots.push(flap);
    }
    oleo("fighter-nose-gear", [0, -.6, 4.7], [0, -1.8, 4.7], .1);
    rod("fighter-nose-brace",[0,-.6,3.9],[0,-1.4,4.7],.065,satin,gear);
    tire(0, -1.8, 4.7, .3, .2);
    hook = new B.TransformNode("tailhook", scene); hook.parent = root; hook.position.set(0, -.65, -6);
    rod("hook-shaft", [0, 0, 0], [0, -.2, -3], .1, metal, hook);
    rod("hook-tip", [0, -.2, -3], [0, 0, -3.2], .2, dark, hook);
    sphere("tail-beacon", [.12, .12, .12], [0, 1, -2], red);
  }
  const landingLights = [];
  for (const side of [-1, 1]) landingLights.push(sphere("landing-light", [type === "bush" ? .16 : .32, .16, .12], [side * (type === "bush" ? 1.4 : 2), -.55, type === "bush" ? 1.6 : 3.2], bright));
  return { root, parts,
    update(state, dt) {
      gear.setEnabled(type === "bush" || state.gear);
      for (const flap of flapPivots) flap.rotation.x = -.22 * state.flaps;
      for (const prop of propellers) prop.rotation.z += dt * (18 + state.power * 75);
      for (const fan of fans) fan.rotation.z += dt * (8 + state.power * 65);
      for (const {pivot,kind,side} of controlSurfaces) {
        const velocity=kind==="aileron"?(state.rollVelocity||0)*side:(state.pitchVelocity||0)*2;
        pivot.rotation.x=Math.max(-.24,Math.min(.24,velocity*.014));
      }
      if (hook) hook.rotation.x = state.hook ? -.43 : .05;
      // Local +Y points toward the aircraft's left. Negative rotation rolls
      // forward (+Z); distance / radius also keeps small nose wheels faster.
      for (const { mesh, radius } of wheels) if (state.phase === "rollout") {
        mesh.rotation.y = (mesh.rotation.y - Math.max(0, state.groundspeed ?? state.speed) * dt / radius) % (Math.PI * 2);
      }
    },
    dispose() { root.dispose(false, false); },
  };
}
