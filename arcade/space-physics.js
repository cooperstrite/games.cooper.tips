import { World, Body, Vec3, Box, Sphere } from "../vendor/cannon-es/cannon-es.js";
export { Vec3 };
export const EARTH_RADIUS=6371000, MU=3.986004418e14, G0=9.80665, PHYSICS_STEP=1/60;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function atmosphere(altitude){const h=Math.max(0,altitude);return {density:h>150000?0:1.225*Math.exp(-h/7800),pressure:h>150000?0:101325*Math.exp(-h/7400),temperature:Math.max(215,288-h*.0065)};}
export function gravityAt(position){const r=position.length();return position.scale(-MU/(r*r*r));}
export function orbitalElements(position,velocity){const radius=position.length(),speed2=velocity.lengthSquared(),energy=speed2/2-MU/radius,h=position.cross(velocity),evec=velocity.cross(h).scale(1/MU).vsub(position.scale(1/radius)),eccentricity=evec.length(),a=energy<0?-MU/(2*energy):Infinity;return {apoapsis:Number.isFinite(a)?Math.max(0,a*(1+eccentricity)-EARTH_RADIUS):Infinity,periapsis:Number.isFinite(a)?a*(1-eccentricity)-EARTH_RADIUS:-EARTH_RADIUS,eccentricity,period:Number.isFinite(a)?2*Math.PI*Math.sqrt(a*a*a/MU):Infinity,energy};}
export function localFrame(body){const up=body.position.unit(),east=new Vec3(up.y,-up.x,0);if(east.length()<.01)east.set(1,0,0);east.normalize();const north=east.cross(up);return {up,east,north};}
export function createSpacePhysics(){
  const world=new World({gravity:new Vec3(0,0,0)});world.allowSleep=false;world.solver.iterations=8;
  const planet=new Body({mass:0,shape:new Sphere(EARTH_RADIUS),collisionFilterGroup:1,collisionFilterMask:2});world.addBody(planet);
  function body({mass,height=4,diameter=3,position=new Vec3(0,EARTH_RADIUS+height/2+.1,0),velocity=new Vec3(),collision=true}={}){
    const b=new Body({mass,shape:new Box(new Vec3(diameter/2,height/2,diameter/2)),position,velocity,linearDamping:0,angularDamping:.05,collisionFilterGroup:2,collisionFilterMask:collision?1:0});world.addBody(b);return b;
  }
  function resize(b,mass,height,diameter){b.shapes.length=0;b.shapeOffsets.length=0;b.shapeOrientations.length=0;b.addShape(new Box(new Vec3(diameter/2,height/2,diameter/2)));b.mass=mass;b.updateMassProperties();b.aabbNeedsUpdate=true;}
  function applyGravity(b){const force=gravityAt(b.position).scale(b.mass);b.applyForce(force);return force;}
  function aero(b,{area,sideArea=area,drag=.3,lift=.12,wind=new Vec3(),chute=0}={}){
    const altitude=b.position.length()-EARTH_RADIUS,air=atmosphere(altitude),velocity=b.velocity.vsub(wind),speed=velocity.length(),axis=b.quaternion.vmult(new Vec3(0,1,0)),direction=speed>.01?velocity.scale(1/speed):axis,alignment=clamp(axis.dot(direction),-1,1),sin=Math.sqrt(Math.max(0,1-alignment*alignment)),q=.5*air.density*speed*speed;
    const magnitude=q*(drag*area+sideArea*sin*.65)+Math.min(q*chute,b.mass*G0*2.7),force=direction.scale(-magnitude);
    if(speed>.1){const normal=axis.vsub(direction.scale(alignment));normal.scale(q*area*lift*alignment,normal);force.vadd(normal,force);}
    b.applyForce(force);return {force,q,speed,air,alignment,axis,velocity};
  }
  function point(b,direction,{response=2.7,damping=3,maxAcceleration=.18}={}){
    const axis=b.quaternion.vmult(new Vec3(0,1,0)),error=axis.cross(direction);if(axis.dot(direction)<-.995)error.set(0,0,1);
    const desired=error.scale(response).vsub(b.angularVelocity.scale(damping));
    for(const k of ["x","y","z"])b.torque[k]+=clamp(desired[k],-maxAcceleration,maxAcceleration)*Math.max(1,b.inertia[k]);
  }
  return {world,body,resize,applyGravity,aero,point,step(){world.step(PHYSICS_STEP);},dispose(){for(const b of [...world.bodies])world.removeBody(b);}};
}
