import { normalizeDesign, vehicleStats, stageStats, MISSIONS, validateDesign } from "./rocket-config.js";
import { createSpacePhysics, EARTH_RADIUS, MU, G0, PHYSICS_STEP, Vec3, localFrame, orbitalElements, atmosphere, clamp } from "./arcade/space-physics.js";
import { flightInstruction } from './rocket-guidance.js';
export { EARTH_RADIUS, G0, clamp };
const UP=new Vec3(0,1,0),DEG=Math.PI/180;
export function createRocketFlight(design,missionId="first-light",mode="mission"){
  design=normalizeDesign(design);const mission=MISSIONS.find(m=>m.id===missionId)||MISSIONS[0],stats=vehicleStats(design,mode==="free"?0:mission.extraMass||0),physics=createSpacePhysics(),body=physics.body({mass:stats.mass,height:stats.height,diameter:stats.diameter});
  return {design,mission,mode:mode==="free"?"free":"mission",stats,physics,body,phase:"ready",paused:false,time:0,accumulator:0,activeStage:0,fuels:stats.stages.map(s=>s.fuel),height:stats.height,mass:stats.mass,capsule:false,fairing:design.fairing,chute:false,chuteAge:0,retroFuel:900,retro:false,deorbited:false,payloadDeployed:false,throttle:0,command:0,pitch:0,yaw:0,guidance:true,altitude:0,maxAltitude:0,verticalSpeed:0,horizontalSpeed:0,speed:0,gLoad:1,maxG:1,q:0,temperature:20,peakTemperature:20,shield:100,integrity:100,payloadHealth:100,crew:design.crew.slice(0,design.crewCount).map(person=>({...person,health:100})),oxygen:mission.oxygen,orbit:{apoapsis:0,periapsis:-EARTH_RADIUS,period:Infinity},orbitTime:0,orbitAchieved:false,cutoffReady:false,staged:0,ignited:new Set(),debris:[],events:[],eventId:0,hasLaunched:false,result:null,crashAge:0,warning:"",lastAction:"Choose a mission and review your vehicle.",countdown:0,countdownTotal:6};
}
function event(s,kind,text){s.events.push({id:++s.eventId,kind,text});if(s.events.length>35)s.events.shift();s.lastAction=text;}
export function beginLaunch(s){if(s.phase!=="ready"||validateDesign(s.design).errors.length)return false;s.phase="countdown";s.countdownTotal=6;s.countdown=s.countdownTotal;s.command=1;event(s,"countdown","Launch sequence started. Pad water is on; the engines will ignite at T-minus 3.");return true;}
export function setThrottle(s,value){if(!["ready","countdown","flying"].includes(s.phase)||!Number.isFinite(value))return false;s.command=clamp(value,0,1);return true;}
function refreshMass(s){s.mass=s.stats.capsuleMass-(900-s.retroFuel)+(s.fairing?250:0)+(s.capsule?0:s.stats.stages.slice(s.activeStage).reduce((n,stage,i)=>n+stage.dry+s.fuels[s.activeStage+i],0));s.body.mass=s.mass;s.body.updateMassProperties();}
function debris(s,{position,velocity,height,diameter,mass,kind,index=0}){
  const body=s.physics.body({mass,height,diameter,position,velocity});body.quaternion.copy(s.body.quaternion);body.angularVelocity.set(.05+.03*index,.02,.03);s.debris.push({body,height,diameter,kind,index,age:0});
}
export function jettisonStage(s){
  if(s.phase!=="flying"||s.capsule)return false;const index=s.activeStage,stage=s.design.stages[index];
  if(!stage.decoupler){event(s,"warning","This stage has no decoupler. Add one in the assembly bay before your next launch.");return false;}
  if(s.throttle>.12&&s.fuels[index]>.1){event(s,"warning","Cut throttle before separating a powered stage.");return false;}
  const part=s.stats.stages[index],axis=s.body.quaternion.vmult(UP),position=s.body.position.vadd(axis.scale(-s.height/2+part.height/2));
  debris(s,{position,velocity:s.body.velocity.vsub(axis.scale(2)),height:part.height,diameter:part.diameter,mass:part.dry+s.fuels[index],kind:"stage",index});
  s.activeStage++;s.staged++;s.height-=part.height;s.body.position.vadd(axis.scale(part.height/2),s.body.position);s.capsule=s.activeStage>=s.design.stages.length;s.command=0;s.throttle=0;
  refreshMass(s);s.physics.resize(s.body,s.mass,s.height,s.capsule?3.2:s.stats.diameter);event(s,"stage",s.capsule?"Capsule separation confirmed. Keep the heat shield into the airflow on return.":`Stage ${index+1} away. Increase throttle to ignite stage ${s.activeStage+1}.`);return true;
}
export function separateCapsule(s){
  if(s.phase!=="flying"||s.capsule)return false;
  if(s.throttle>.12&&s.fuels[s.activeStage]>.1){event(s,"warning","Cut throttle first, then separate the capsule.");return false;}
  if(s.q>5000){event(s,"warning","Coast with power off until dynamic pressure falls below 5 kPa, then separate the capsule.");return false;}
  while(!s.capsule)if(!jettisonStage(s))return false;
  return true;
}
export function releaseFairing(s){
  if(s.phase!=="flying"||!s.fairing)return false;
  if(s.q>5000){event(s,"warning","Air pressure is too high. Open the fairing above the thick atmosphere.");return false;}
  const side=s.body.quaternion.vmult(new Vec3(1,0,0)),axis=s.body.quaternion.vmult(UP);
  for(const sign of [-1,1])debris(s,{position:s.body.position.vadd(axis.scale(s.height/2-2)).vadd(side.scale(sign*2)),velocity:s.body.velocity.vadd(side.scale(sign*4)),height:5,diameter:1.3,mass:125,kind:"fairing",index:sign});
  s.fairing=false;refreshMass(s);event(s,"fairing","Protective fairing released. The satellite is ready for deployment when the orbit is safe.");return true;
}
export function deployPayload(s){
  if(s.phase!=="flying"||s.payloadDeployed)return false;
  if(s.fairing){event(s,"warning","Open the protective fairing before deploying the satellite.");return false;}
  if(s.mode!=="free"&&(!s.orbitAchieved||s.mission.recover)){event(s,"warning",s.mission.recover?"This mission calls for recovery. Keep the capsule and its cargo aboard.":"Establish the required stable orbit before releasing the payload.");return false;}
  if(s.altitude<80000){event(s,"warning","Deploy the satellite above 80 km, outside the thick atmosphere.");return false;}
  s.payloadDeployed=true;event(s,"payload","Satellite deployed. Solar arrays are opening.");
  if(s.mode==="mission"&&!s.mission.recover)finish(s,true,"Payload delivered","A stable orbit and an undamaged payload. Mission accomplished.");return true;
}
export function startDeorbit(s){
  if(s.phase!=="flying"||!s.capsule){event(s,"warning","Cut power and separate the capsule before firing its retro motor.");return false;}
  if(s.altitude<80000||s.retroFuel<=0){event(s,"warning","The retro motor is reserved for a return from space.");return false;}
  s.retro=true;s.deorbited=true;s.guidance=true;s.command=0;event(s,"retro","Retro burn armed. The capsule will turn against its velocity and lower periapsis into the atmosphere.");return true;
}
export function deployChutes(s){
  if(s.phase!=="flying"||s.chute)return false;
  if(!s.capsule){event(s,"warning","Separate the capsule before opening its parachutes.");return false;}
  if(!s.design.parachute){event(s,"warning","This design has no parachute. Add one in the assembly bay.");return false;}
  if(s.altitude>5000||s.speed>220||s.verticalSpeed>=0){event(s,"warning","Wait for descent below 5 km and 220 m/s. The parachutes cannot open safely yet.");return false;}
  s.chute=true;s.chuteAge=0;s.retro=false;event(s,"chute","Drogue deployed. Main parachutes will reef open as the capsule slows.");return true;
}
export function guidancePitch(s){
  if(s.capsule)return 0;
  if(!s.mission.orbit&&s.mode!=="free")return 0;
  const h=s.altitude;
  if(h<900)return 0;
  if(h<10000)return 4+(h-900)/9100*29;
  if(h<40000)return 33+(h-10000)/30000*36;
  // Pitch guidance trims vertical velocity while the pilot controls thrust.
  const desiredClimb=clamp((s.mission.target*1.06-h)*.009,-120,750);
  const radialGravity=MU/(EARTH_RADIUS+h)**2-s.horizontalSpeed**2/(EARTH_RADIUS+h);
  const desiredAcceleration=radialGravity+(desiredClimb-s.verticalSpeed)/22;
  const available=s.stats.stages[s.activeStage].thrust*Math.max(.2,s.throttle)/s.mass;
  return Math.acos(clamp(desiredAcceleration/available,-.55,.96))/DEG;
}
function finish(s,success,title,reason){if(s.result)return;s.phase=success?"won":"failed";s.command=0;s.throttle=0;s.retro=false;s.result={success,title,reason,score:success?Math.round(clamp(s.integrity*.45+s.payloadHealth*.25+(s.crew.length?Math.min(...s.crew.map(c=>c.health)):100)*.3,0,100)):0};event(s,success?"success":"failure",reason);}
export function missionProgress(s){return [s.maxAltitude>=s.mission.target,s.staged>=s.mission.stages,s.mission.orbit?s.orbitAchieved:s.capsule,s.mission.recover?s.phase==="won":s.payloadDeployed];}
function desiredDirection(s,frame){
  if(s.capsule&&s.guidance&&s.body.velocity.length()>15&&s.altitude>5000)return s.body.velocity.unit().negate().vsub(frame.up.scale(.22)).unit();
  const pitch=(s.guidance&&s.mode!=="free"?guidancePitch(s):s.pitch)*DEG,yaw=s.yaw*DEG;
  return frame.up.scale(Math.cos(pitch)).vadd(frame.east.scale(Math.sin(pitch)*Math.cos(yaw))).vadd(frame.north.scale(Math.sin(pitch)*Math.sin(yaw)));
}
function forces(s,dt){
  const frame=localFrame(s.body),alt=Math.max(0,s.body.position.length()-EARTH_RADIUS-s.height/2),air=atmosphere(alt),axis=s.body.quaternion.vmult(UP),wind=frame.north.scale((s.mission.wind||0)*Math.exp(-alt/18000)*(Math.sin(s.time*.19)*.35+1)*(.25+.75*Math.min(1,alt/500)));
  s.physics.applyGravity(s.body);s.physics.point(s.body,desiredDirection(s,frame),{response:s.capsule?5:2.7,damping:s.capsule?4:3,maxAcceleration:s.capsule?.5:.17});
  s.throttle+=((s.capsule||s.fuels[s.activeStage]<=0?0:s.command)-s.throttle)*Math.min(1,dt*2.5);let thrust=0;
  if(!s.capsule&&s.fuels[s.activeStage]>0){const part=s.stats.stages[s.activeStage],isp=part.isp+(part.seaIsp-part.isp)*clamp(air.pressure/101325,0,1),requested=part.thrust*(isp/part.isp)*s.throttle,used=Math.min(s.fuels[s.activeStage],requested/(isp*G0)*dt);thrust=used/dt*isp*G0;s.fuels[s.activeStage]-=used;if(thrust>100)s.ignited.add(s.activeStage);}
  if(s.retro&&s.capsule&&s.retroFuel>0){if(s.orbit.periapsis<42000){s.retro=false;event(s,"retro","Retro burn complete. Periapsis is in the atmosphere. Coast to re-entry; keep the heat shield forward.");}else if(axis.dot(s.body.velocity.unit().negate())>.94){const used=Math.min(s.retroFuel,3.4*dt);s.retroFuel-=used;thrust=used/dt*310*G0;}}
  const thrustForce=axis.scale(thrust);s.body.applyForce(thrustForce);
  const area=Math.PI*(s.capsule?1.6:s.stats.diameter/2)**2;
  if(s.chute)s.chuteAge+=dt;const canopy=s.chute?(s.speed<85?(s.crew.length?850:520):35)*clamp(s.chuteAge/4,0,1):0;
  const aero=s.physics.aero(s.body,{area,sideArea:s.capsule?12:s.height*s.stats.diameter,drag:s.capsule?1.1:s.fairing?.22:.38,lift:s.capsule?.35:.12,wind,chute:canopy});
  const proper=thrustForce.vadd(aero.force).length()/(s.mass*G0);s.gLoad+=(proper-s.gLoad)*Math.min(1,dt*7);s.maxG=Math.max(s.maxG,s.gLoad);s.q=aero.q;s.speed=aero.speed;
  const protectedShield=s.capsule&&s.design.heatShield&&axis.dot(s.body.velocity.length()>.1?s.body.velocity.unit().negate():frame.up)>.65;
  const flux=1.83e-4*Math.sqrt(aero.air.density/1.8)*aero.speed**3,ambient=aero.air.temperature-273.15,target=ambient+Math.pow(flux,0.25)*(protectedShield?35:38);
  s.temperature+=(target-s.temperature)*Math.min(1,dt*.08);s.peakTemperature=Math.max(s.peakTemperature,s.temperature);
  if(protectedShield){s.shield-=flux*1.25e-7*dt;if(s.shield<0)s.integrity-=dt*4;}
  else {const heatLimit=s.capsule?400:900;if(s.temperature>heatLimit)s.integrity-=(s.temperature-heatLimit)*.004*dt;}
  const pressureLimit=s.capsule?100000:s.mission.maxQ;
  if(s.q>pressureLimit)s.integrity-=(s.q/pressureLimit-1)*dt*2;
  if(proper>16)s.integrity-=(proper-16)*dt*2;
  const crewLimit=s.capsule?6:s.mission.id==="expedition"?4:4.5;
  for(const crew of s.crew)crew.health=clamp(crew.health-Math.max(0,proper-crewLimit)**2*.25*dt-(s.oxygen<=0?dt*2:0),0,100);
  s.payloadHealth=clamp(s.payloadHealth-Math.max(0,proper-8)**2*.12*dt,0,100);
  if(s.crew.length)s.oxygen=Math.max(0,s.oxygen-dt);
  s.integrity=clamp(s.integrity,0,100);s.shield=clamp(s.shield,-1,100);
  refreshMass(s);
  for(const part of s.debris){part.age+=dt;s.physics.applyGravity(part.body);s.physics.aero(part.body,{area:Math.PI*(part.diameter/2)**2,sideArea:part.height*part.diameter,drag:.75,lift:0});}
  return {frame,proper,protectedShield,vertical:s.body.velocity.dot(frame.up)};
}
function fixedStep(s){
  const dt=PHYSICS_STEP;s.time+=dt;
  const previous=forces(s,dt);s.physics.step();const frame=localFrame(s.body);
  s.altitude=Math.max(0,s.body.position.length()-EARTH_RADIUS-s.height/2);s.maxAltitude=Math.max(s.maxAltitude,s.altitude);s.verticalSpeed=s.body.velocity.dot(frame.up);s.horizontalSpeed=s.body.velocity.vsub(frame.up.scale(s.verticalSpeed)).length();s.orbit=orbitalElements(s.body.position,s.body.velocity);
  if(s.altitude>3)s.hasLaunched=true;
  if(s.orbit.apoapsis>=s.mission.target*1.15+3000)s.cutoffReady=true;
  if(s.orbit.periapsis>=100000&&s.orbit.apoapsis>=s.mission.target&&s.altitude>80000)s.orbitTime+=dt;else s.orbitTime=0;
  if(!s.orbitAchieved&&s.orbitTime>=4&&s.staged>=s.mission.stages){s.orbitAchieved=true;event(s,"orbit",s.mission.recover?"Stable orbit confirmed. Cut power, separate the capsule, and prepare the retro burn.":"Stable orbit confirmed. Cut power, open the fairing, and deploy the satellite.");}
  s.warning=s.gLoad>(s.crew.length?(s.capsule?6:s.mission.id==="expedition"?4:4.5):8)?(s.capsule?"High re-entry G: keep the shield in the airflow":"G-load too high: reduce throttle"):!s.capsule&&s.q>s.mission.maxQ*.9?"Max-Q: reduce power through thick air":s.capsule&&s.temperature>600&&!previous.protectedShield?"Rotate the heat shield into the airflow":s.oxygen<300&&s.crew.length?"Life support reserve is low":"";
  if(s.integrity<=0)finish(s,false,"Vehicle lost",s.temperature>600?"The capsule overheated. Separate it and keep its heat shield facing into the airflow during re-entry.":"The vehicle exceeded its structural limits. Reduce throttle near Max-Q and avoid sharp turns in thick air.");
  else if(s.crew.some(c=>c.health<=0))finish(s,false,"Crew safety limit exceeded","Sustained acceleration or exhausted life support made the flight unsafe. Ease throttle as the rocket gets lighter and watch oxygen on long flights.");
  else if(s.payloadHealth<=0)finish(s,false,"Payload damaged","The payload exceeded its acceleration tolerance. Reduce power as fuel burns away.");
  else if(s.hasLaunched&&s.altitude<.45&&previous.vertical<0){
    const impact=Math.abs(previous.vertical),safe=impact<(s.crew.length?12:18)&&s.horizontalSpeed<18;
    const objectives=s.mode==="free"||s.maxAltitude>=s.mission.target&&s.staged>=s.mission.stages&&(!s.mission.orbit||s.orbitAchieved)&&s.mission.recover;
    if(safe&&objectives)finish(s,true,s.crew.length?"Crew safely recovered":"Payload safely recovered",s.mode==="free"?"Your free-flight vehicle is back on Earth. Free play never awards coins.":`A safe return after reaching ${(s.maxAltitude/1000).toFixed(1)} km. ${s.crew.length?"Everyone is accounted for.":"The payload is intact."}`);
    else finish(s,false,safe?"Flight recovered / objective incomplete":"Hard landing",safe?"The vehicle returned safely, but the mission objectives were not completed. Follow the checklist on the next flight.":"The capsule hit too fast. Separate the capsule and open its parachutes while descending below 5 km and 220 m/s.");
  }
  if(!s.result&&s.mode!=="free"&&s.time>18000)finish(s,false,"Mission time exceeded","The flight exceeded the mission window. Try a shorter ascent and return, or explore in free play.");
}
export function advanceRocket(s,dt){
  if(!Number.isFinite(dt)||dt<=0||s.paused)return;dt=Math.min(dt,3);
  if(s.phase==="failed"){s.crashAge+=dt;return;}
  if(s.phase==="countdown"){const previous=s.countdown;s.countdown=Math.max(0,s.countdown-dt);if(previous>3&&s.countdown<=3)event(s,"ignition","Main engine ignition. Thrust is building while the rocket stays on its launch mount.");if(s.countdown===0){s.phase="flying";event(s,"release","Launch clamps released automatically. The rocket will lift as thrust builds.");}return;}
  if(s.phase!=="flying")return;s.accumulator+=dt;
  while(s.accumulator+1e-9>=PHYSICS_STEP&&s.phase==="flying"){s.accumulator-=PHYSICS_STEP;fixedStep(s);}
}
export function flightDirector(s){const instruction=flightInstruction(s);return instruction.instruction+' '+instruction.detail;}

export function disposeFlight(s){s.physics.dispose();}
