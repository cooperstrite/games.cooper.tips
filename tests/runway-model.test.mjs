import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { buildAircraft } from "../runway-aircraft.js";
const B = createRequire(import.meta.url)("../vendor/babylonjs/babylon.js");

for (const type of ["passenger", "cargo", "bush", "military"]) test(`${type} tires roll forward around fixed axles without steering or sliding`, () => {
  const engine = new B.NullEngine(), scene = new B.Scene(engine);
  try {
    const mat = new B.StandardMaterial("test", scene);
    const model = buildAircraft({ B, scene, material: () => mat }, type, { traffic: true });
    const wheels = model.parts.filter(m => m.name === "tire");
    assert.ok(wheels.length >= 3);
    const initial = wheels.map(w => {
      w.computeWorldMatrix(true);
      return B.Vector3.TransformNormal(B.Axis.Y, w.getWorldMatrix());
    });
    model.update({ phase: "rollout", gear: true, flaps: 1, power: 0, speed: 7 }, 1 / 70);
    wheels.forEach((wheel, index) => {
      const radius = wheel.metadata.radius;
      wheel.computeWorldMatrix(true);
      const axis = B.Vector3.TransformNormal(B.Axis.Y, wheel.getWorldMatrix());
      assert.ok(B.Vector3.Distance(initial[index], axis) < 1e-8, "The axle must not wobble while the tire turns");
      assert.ok(Math.abs(wheel.rotation.y * radius + .1) < 1e-8, "Tire circumference must move the same distance as the aircraft");
      const contact = B.Vector3.TransformNormal(new B.Vector3(-radius, 0, 0), wheel.getWorldMatrix());
      assert.ok(contact.z < 0, "The bottom tread must move backward relative to the plane as the plane rolls forward");
      assert.ok(Math.abs(contact.z + .1) < .005, "Ground contact must not slide backward or forward");
    });
    const angles = wheels.map(w => w.rotation.y);
    for (const [phase, speed, dt] of [["flying", 70, 1], ["ready", 70, 1], ["rollout", 0, 1], ["rollout", 70, 0]]) {
      model.update({ phase, gear: true, flaps: 1, power: 0, speed }, dt);
      assert.deepEqual(wheels.map(w => w.rotation.y), angles, "Airborne, stopped, and paused wheels stay still");
    }
  } finally { engine.dispose(); }
});

test("aircraft tail fins have outward-facing, flat side surfaces",()=>{
  const engine=new B.NullEngine(),scene=new B.Scene(engine);
  try{
    const mat=new B.StandardMaterial("test",scene);
    for(const type of ["passenger","cargo","bush","military"]){
      const model=buildAircraft({B,scene,material:()=>mat},type,{traffic:true});
      const fins=model.parts.filter(m=>["vertical-tail","cargo-fin","bush-tail","twin-tail"].includes(m.name));
      assert.ok(fins.length);
      for(const fin of fins){
        const p=fin.getVerticesData(B.VertexBuffer.PositionKind),n=fin.getVerticesData(B.VertexBuffer.NormalKind),indices=fin.getIndices();
        let sideFaces=0;
        for(let i=0;i<indices.length;i+=3){
          const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
          if(p[a]!==p[b]||p[a]!==p[c])continue;
          sideFaces++;
          for(const j of [a,b,c]){
            assert.ok(n[j]*p[j]>0,`${type} fin normals must point away from its center`);
            assert.ok(Math.abs(n[j+1])+Math.abs(n[j+2])<1e-8,"Flat fin faces must not bend their reflections across the thin edges");
          }
        }
        assert.ok(sideFaces>=4);
      }
      model.dispose();
    }
  }finally{engine.dispose();}
});

test("the bush model always shows its fixed wheels while retractable aircraft follow the gear state",()=>{
  const engine=new B.NullEngine(),scene=new B.Scene(engine);
  try{
    const mat=new B.StandardMaterial("test",scene);
    for(const type of ["passenger","cargo","bush","military"]){
      const model=buildAircraft({B,scene,material:()=>mat},type,{traffic:true});
      model.update({phase:"flying",gear:false,flaps:1,power:.5,speed:30},1/60);
      const wheels=model.parts.filter(m=>m.name==="tire");
      assert.ok(wheels.length>=3);
      assert.ok(wheels.every(w=>w.isEnabled()===(type==="bush")));
      model.dispose();
    }
  }finally{engine.dispose();}
});
