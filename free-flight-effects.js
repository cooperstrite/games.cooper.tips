import { DEG, clamp } from "./runway-engine.js";
import { seeded } from "./free-flight-world.js";

// Soft, turbulent fire and smoke billboards, with ballistic sparks and fragments.
// Everything belongs to this scene and is recycled between flights.
export function createCrashEffects({ B, scene, material, groundHeight }) {
  let particles = [], elapsed = 0;
  const V = (x, y, z) => new B.Vector3(x, y, z);
  // Keep the flash light allocated so a crash never recompiles the world shaders.
  const light = new B.PointLight("impact-flash", V(0, 0, 0), scene); light.diffuse = B.Color3.FromHexString("#ff8c32"); light.intensity = 0; light.range = 40;
  B.Effect.ShadersStore.freeFlightImpactVertexShader = `
    precision highp float; attribute vec3 position; attribute vec2 uv;
    uniform mat4 worldViewProjection; varying vec2 vUV;
    #include<logDepthDeclaration>
    void main(){vUV=uv;gl_Position=worldViewProjection*vec4(position,1.0);
    #include<logDepthVertex>
    }`;
  B.Effect.ShadersStore.freeFlightImpactFragmentShader = `
    precision highp float; varying vec2 vUV;
    uniform float clock,seed,opacity,kind;
    #include<logDepthDeclaration>
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float n=0.0,a=.55;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.07+vec3(3.1,7.9,1.4);a*=.48;}return n;}
    void main(){vec2 p=(vUV-.5)*2.0;float n=fbm(vec3(p*3.4+vec2(seed,-clock*.85),seed+clock*.4));
      float rim=1.0-dot(p,p)+(n-.5)*.65;
      float alpha=smoothstep(0.0,.32,rim)*opacity*(1.0-smoothstep(.82,1.0,max(abs(p.x),abs(p.y))));
      if(alpha<.003)discard;
      vec3 color;
      if(kind<.5){float heat=clamp(.7-length(p)*.32+n*.5,0.0,1.0);
        color=mix(vec3(.65,.055,.008),vec3(1.0,.34,.025),smoothstep(.2,.65,heat));
        color=mix(color,vec3(1.0,.92,.48),smoothstep(.7,.96,heat));alpha*=.55+n*.65;
      }else if(kind<1.5){float light=clamp(n*.6+(1.0-p.y)*.07,0.0,1.0);color=mix(vec3(.045,.052,.055),vec3(.34,.33,.3),light);color+=vec3(.25,.055,.008)*exp(-clock*2.0)*max(0.0,1.0-length(p));alpha*=.75+n*.25;
      }else{color=mix(vec3(.32,.31,.25),vec3(.64,.63,.53),n);alpha*=.4;}
      gl_FragColor=vec4(color,alpha);
      #include<logDepthFragment>
    }`;
  const materials = ["fire", "smoke", "dust"].map((name, kind) => {
    const mat = new B.ShaderMaterial("impact-" + name, scene, "freeFlightImpact", {
      attributes: ["position", "uv"], uniforms: ["worldViewProjection", "clock", "seed", "opacity", "kind"], needAlphaBlending: true,
    });
    mat.backFaceCulling = false; mat.disableDepthWrite = true; mat.setFloat("kind", kind); mat.setFloat("clock", 0);
    mat.useLogarithmicDepth = true;
    mat.onBindObservable.add(mesh => { const effect = mat.getEffect(); effect.setFloat("seed", mesh.metadata.seed); effect.setFloat("opacity", mesh.metadata.opacity); });
    return mat;
  });
  const ember = new B.StandardMaterial("impact-embers", scene); ember.disableLighting = true; ember.emissiveColor = B.Color3.FromHexString("#ffb64d");
  const probe = B.MeshBuilder.CreatePlane("impact-prewarm", { size: .001 }, scene); probe.setEnabled(false);
  const ready = Promise.all(materials.map(mat => mat.forceCompilationAsync(probe))).finally(() => probe.dispose());
  function reset() { for (const p of particles) p.mesh.dispose(); particles = []; light.intensity = 0; elapsed = 0; }
  function burst(s, origin) {
    reset(); const random = seeded(158), scale = clamp(s.aircraft.length / 24, .6, 1.45), water = s.result?.water;
    const center = V(s.x - origin.x, s.y + 2, s.z - origin.z), forward = V(Math.sin(s.heading * DEG), 0, Math.cos(s.heading * DEG));
    light.position.copyFrom(center.add(V(0, 3, 0))); light.range = 42 * scale; light.intensity = 8;
    const add = (kind, count) => {
      for (let i = 0; i < count; i++) {
        const fire = kind === "fire", smoke = kind === "smoke", dust = kind === "dust", spark = kind === "spark", plume = fire || smoke || dust;
        const mesh = plume ? B.MeshBuilder.CreatePlane("crash-" + kind, { size: 1 }, scene) : B.MeshBuilder.CreateBox("crash-" + kind, { width: spark ? .065 : .18 + random() * .25, height: spark ? .065 : .1, depth: spark ? .6 : .35 + random() * .7 }, scene);
        mesh.material = plume ? materials[fire ? 0 : smoke ? 1 : 2] : spark ? ember : material(i % 2 ? "#3a4348" : "#8a8e8b", { metalness: .6, roughness: .8 });
        mesh.isPickable = false;
        if (plume) mesh.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
        mesh.position.copyFrom(center); mesh.position.x += (random() - .5) * 7 * scale; mesh.position.z += (random() - .5) * 7 * scale;
        const angle = random() * Math.PI * 2, speed = (plume ? 2 + random() * 5 : 7 + random() * 17) * scale;
        const delay = smoke ? i * .065 : fire ? i * .018 : 0;
        const size = (fire ? 3.8 + random() * 6 : smoke ? 5 + random() * 8 : dust ? 5 + random() * 7 : 1) * scale;
        const life = fire ? .7 + random() * .65 : smoke ? 4 + random() * 3 : dust ? 1.2 + random() * 1.5 : spark ? .6 + random() * .9 : 4 + random();
        mesh.metadata = { seed: random() * 61, opacity: 0 }; mesh.setEnabled(false);
        particles.push({ mesh, kind, delay, life, size, scale, origin: { ...origin }, vx: Math.cos(angle) * speed + forward.x * (plume ? 2 : 6),
          vz: Math.sin(angle) * speed + forward.z * (plume ? 2 : 6), vy: dust ? .2 : fire ? 3 + random() * 5 : smoke ? 5 + random() * 6 : 5 + random() * 13,
          rotation: random() * 8, age: -delay, bounced: false });
      }
    };
    add("fire", water ? 6 : 13); add("smoke", water ? 14 : 26); add("dust", 9); add("spark", water ? 12 : 36); add("fragment", 15);
  }
  function update(dt) {
    elapsed += dt; materials.forEach(m => m.setFloat("clock", elapsed));
    light.intensity = particles.length && elapsed < 1.2 ? 8 * Math.exp(-elapsed * 8) : 0;
    for (const p of particles) {
      p.age += dt; if (p.age < 0) continue; p.mesh.setEnabled(true);
      const t = p.age / p.life, plume = ["fire", "smoke", "dust"].includes(p.kind);
      if (plume) {
        const drag = Math.exp(-dt * .6); p.vx *= drag; p.vz *= drag;
        p.mesh.scaling.setAll(p.size * (.65 + Math.min(1, p.age * 3) * .45 + p.age * (p.kind === "smoke" ? .55 : .6)));
        const fadeIn = clamp(p.age / .12, 0, 1), fadeOut = Math.pow(Math.max(0, 1 - t), p.kind === "fire" ? .8 : .55);
        p.mesh.metadata.opacity = fadeIn * fadeOut * (p.kind === "smoke" ? .72 : .95);
      } else {
        p.vy -= 9.81 * dt; p.mesh.rotation.addInPlace(V(p.rotation * dt, p.rotation * dt * .4, p.rotation * dt * .6));
        p.mesh.visibility = Math.min(1, Math.max(0, (1 - t) * 3));
      }
      p.mesh.position.addInPlace(V(p.vx * dt, p.vy * dt, p.vz * dt));
      if (!plume) {
        const floor = Math.max(0, groundHeight(p.mesh.position.x + p.origin.x, p.mesh.position.z + p.origin.z)) + .15;
        if (p.mesh.position.y < floor) { p.mesh.position.y = floor; p.vy = p.bounced ? 0 : Math.abs(p.vy) * .22; p.vx *= .3; p.vz *= .3; p.rotation *= .3; p.bounced = true; }
      }
    }
    particles = particles.filter(p => { if (p.age >= p.life) { p.mesh.dispose(); return false; } return true; });
  }
  return { burst, update, reset, ready, get count() { return particles.length; },
    dispose() { reset(); materials.forEach(m => m.dispose()); ember.dispose(); light.dispose(); },
  };
}
