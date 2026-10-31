import { World, Body, Vec3, Box, Sphere, Cylinder, Material, ContactMaterial, SAPBroadphase } from "./vendor/cannon-es/cannon-es.js";
import { START, HEIGHT, WALLS, FURNITURE, MOVABLES, ROOMS, COLUMNS } from "./museum-world.js";
export const STEP = 1/120, RADIUS = .3, EYE_HEIGHT = 1.66;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function createMuseumPhysics() {
  const world = new World({ gravity: new Vec3(0,-9.81,0) });
  world.broadphase = new SAPBroadphase(world); world.solver.iterations = 12;
  const solid = new Material("museum-solid"), feet = new Material("detective");
  world.addContactMaterial(new ContactMaterial(solid, solid, { friction: .65, restitution: .025 }));
  world.addContactMaterial(new ContactMaterial(solid, feet, { friction: 0, restitution: 0 }));
  const player = new Body({ mass: 76, material: feet, position: new Vec3(START.x,START.y,START.z), fixedRotation: true, linearDamping: 0, collisionFilterGroup: 4, collisionFilterMask: 3 });
  player.addShape(new Cylinder(RADIUS,RADIUS,1.12,12),new Vec3(0,.86,0));
  player.addShape(new Sphere(RADIUS),new Vec3(0,.3,0)); player.addShape(new Sphere(RADIUS),new Vec3(0,1.42,0));
  player.updateMassProperties(); world.addBody(player);
  let bodies = [], dynamic = [], accumulator = 0, noclip = false, lastSafe = { ...START };
  function add(def, mass=0, group=2) {
    const body = new Body({ mass, material: solid, shape: new Box(new Vec3(def.w/2,def.h/2,def.d/2)), position: new Vec3(def.x,def.y,def.z), collisionFilterGroup: group, collisionFilterMask: -1 });
    body.linearDamping = .15; body.angularDamping = .5; body.allowSleep = true;
    body.museum = def; world.addBody(body); bodies.push(body); if (mass) dynamic.push(body); return body;
  }
  function rebuild() {
    const positions = new Map(dynamic.map(b => [b.museum.id, { position: b.position.clone(), quaternion: b.quaternion.clone(), velocity: b.velocity.clone() }]));
    bodies.forEach(body => world.removeBody(body)); bodies = []; dynamic = [];
    add({ id: "floor", kind: "floor", x: 6, y: -.25, z: 1.5, w: 70, h: .5, d: 40 },0,1);
    for (const room of ROOMS) add({ id: room.id+"-ceiling", kind:"ceiling",x:room.x,y:HEIGHT+.15,z:room.z,w:room.w,h:.3,d:room.d });
    [...WALLS,...FURNITURE,...COLUMNS].forEach(d=>add(d));
    MOVABLES.forEach(d=>{ const b=add(d,14); const old=positions.get(d.id); if(old){b.position.copy(old.position);b.quaternion.copy(old.quaternion);b.velocity.copy(old.velocity);} });
    return bodies.length;
  }
  function overlaps(x,z) {
    if (![[0,0],[RADIUS,0],[-RADIUS,0],[0,RADIUS],[0,-RADIUS]].every(([dx,dz])=>ROOMS.some(r=>Math.abs(x+dx-r.x)<=r.w/2&&Math.abs(z+dz-r.z)<=r.d/2))) return true;
    return bodies.some(b=>b.museum.kind!=="floor"&&b.museum.kind!=="ceiling"&&b.position.y-b.museum.h/2<1.7&&Math.abs(x-b.position.x)<b.museum.w/2+RADIUS+.02&&Math.abs(z-b.position.z)<b.museum.d/2+RADIUS+.02);
  }
  function safeReturn() {
    if (!overlaps(player.position.x,player.position.z)) return false;
    let found;
    for(let radius=.15;radius<4&&!found;radius+=.15) for(let i=0;i<32;i++){const a=i*Math.PI/16,x=player.position.x+Math.sin(a)*radius,z=player.position.z+Math.cos(a)*radius;if(!overlaps(x,z)){found={x,z};break;}}
    const p=found||lastSafe; player.position.set(p.x,.04,p.z); player.velocity.setZero(); return true;
  }
  function setNoclip(value) { noclip=!!value;player.collisionFilterMask=noclip?1:3;player.aabbNeedsUpdate=true;return !noclip&&safeReturn(); }
  function reset() { player.position.set(START.x,START.y,START.z);player.velocity.setZero();player.angularVelocity.setZero();accumulator=0;lastSafe={...START}; }
  function step(dt, input = {}, yaw = 0) {
    accumulator+=clamp(Number.isFinite(dt)?dt:0,0,.1);
    while(accumulator>=STEP){
      const forward=clamp(input.forward||0,-1,1),side=clamp(input.side||0,-1,1),n=Math.max(1,Math.hypot(forward,side)),speed=input.fast?3.7:2.25;
      const vx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)/n*speed,vz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)/n*speed;
      const response=1-Math.exp(-(n===1&&forward===0&&side===0?16:11)*STEP);
      player.velocity.x+=(vx-player.velocity.x)*response;player.velocity.z+=(vz-player.velocity.z)*response;
      world.step(STEP);accumulator-=STEP;
      if(player.position.y < -2 || !Number.isFinite(player.position.x)) reset();
      if(!noclip&&!overlaps(player.position.x,player.position.z))lastSafe={x:player.position.x,z:player.position.z};
    }
    return {x:player.position.x,y:player.position.y+EYE_HEIGHT,z:player.position.z,speed:Math.hypot(player.velocity.x,player.velocity.z)};
  }
  rebuild();
  return { world,player,step,rebuild,reset,setNoclip,canStand:(x,z)=>!overlaps(x,z),get noclip(){return noclip;},get bodies(){return bodies;},get dynamic(){return dynamic;},stop(){player.velocity.x=player.velocity.z=0;accumulator=0;},dispose(){[...world.bodies].forEach(b=>world.removeBody(b));} };
}
