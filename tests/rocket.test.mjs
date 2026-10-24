import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDesign,normalizeAstronaut,presetDesign,vehicleStats,validateDesign,ownedDesign,readRocketSave,writeRocketSave,MISSIONS,ROCKET_COSMETICS} from '../rocket-config.js';
import {createRocketFlight,beginLaunch,advanceRocket,setThrottle,jettisonStage,separateCapsule,deployChutes,releaseFairing,deployPayload,startDeorbit,disposeFlight} from '../rocket-flight.js';
import {EARTH_RADIUS,MU,Vec3,atmosphere,gravityAt,orbitalElements,createSpacePhysics} from '../arcade/space-physics.js';
import {rewardTotal,createRewardSession} from '../arcade/game-services.js';
import {CharacterBuilder,charactersForGame} from '../arcade/characters.js';

function fly(mission,crewCount=0){
 const s=createRocketFlight({...presetDesign(mission.preset),crewCount},mission.id);beginLaunch(s);let cut=false;
 for(let i=0;i<65000&&!s.result;i++){
  if(s.phase==='flying'){
   if(!s.capsule){const stage=s.stats.stages[s.activeStage];let cmd=Math.min(1,(s.crew.length?3.8:6.5)*s.mass*9.80665/stage.thrust);if(s.q>mission.maxQ*.85)cmd=Math.min(cmd,Math.max(.2,s.command*.99));
    if(!mission.orbit&&s.orbit.apoapsis>mission.target*1.15+3000)cut=true;
    if(cut)cmd=0;
    if(s.fuels[s.activeStage]<.5){setThrottle(s,0);jettisonStage(s);cmd=0;}
    if(cut&&s.throttle<.1&&s.q<5000){separateCapsule(s);cmd=0;}
    if(s.orbitAchieved){cmd=0;if(mission.recover&&s.throttle<.1)separateCapsule(s);}
    setThrottle(s,cmd);
   }
   if(s.orbitAchieved&&!mission.recover){setThrottle(s,0);releaseFairing(s);deployPayload(s);}
   if(s.capsule&&s.orbitAchieved&&!s.deorbited)startDeorbit(s);
   if(s.capsule&&s.altitude<4800&&s.speed<215&&s.verticalSpeed<0)deployChutes(s);
  }
  advanceRocket(s,.2);
 }
 return s;
}
for(const mission of MISSIONS){
 const crews=mission.recover?[0,3]:[0];for(const crewCount of crews)test(`${mission.name}: legal pilot controls complete the mission with ${crewCount} crew`,()=>{
  const s=fly(mission,crewCount);assert.equal(s.phase,'won',`${s.result?.title}: ${s.result?.reason}`);assert.ok(s.maxAltitude>=mission.target);assert.ok(s.staged>=mission.stages);assert.ok(s.integrity>0);assert.ok(s.payloadHealth>0);if(mission.orbit)assert.equal(s.orbitAchieved,true);for(const c of s.crew)assert.ok(c.health>0);if(mission.recover)assert.ok(s.verticalSpeed>-12);else assert.equal(s.payloadDeployed,true);disposeFlight(s);
 });
}
test('Cannon applies inverse-square gravity and conserves a coasting circular orbit',()=>{
 const physics=createSpacePhysics(),r=EARTH_RADIUS+220000,body=physics.body({mass:1500,position:new Vec3(0,r,0),velocity:new Vec3(Math.sqrt(MU/r),0,0)}),initial=orbitalElements(body.position,body.velocity);
 for(let i=0;i<36000;i++){physics.applyGravity(body);physics.step();}
 const final=orbitalElements(body.position,body.velocity);assert.ok(Math.abs(final.energy/initial.energy-1)<.00001);assert.ok(Math.abs(body.position.length()-r)<100);assert.ok(gravityAt(new Vec3(0,EARTH_RADIUS*2,0)).length()<2.5);physics.dispose();
});
test('atmospheric density falls with altitude and vanishes above the model boundary',()=>{assert.ok(atmosphere(30000).density<atmosphere(1000).density);assert.equal(atmosphere(160000).density,0);});
test('staging removes real fuel and dry mass, creates independently falling debris, and requires a decoupler',()=>{
 const s=createRocketFlight(presetDesign('meridian'));s.phase='flying';s.body.position.y+=50000;s.altitude=50000;const before=s.mass;assert.equal(jettisonStage(s),true);assert.equal(s.debris.length,1);assert.equal(s.activeStage,1);assert.ok(s.mass<before);assert.ok(Math.abs(s.mass+s.debris[0].body.mass-before)<.01);const y=s.debris[0].body.position.y;advanceRocket(s,1);assert.ok(s.debris[0].body.position.y<y);disposeFlight(s);
 const no=createRocketFlight({...presetDesign('pioneer'),stages:[{tank:'compact',engine:'spark',engines:1,fins:4,decoupler:false}]});no.phase='flying';assert.equal(jettisonStage(no),false);disposeFlight(no);
});
test('powered separation, unsafe parachutes, and premature satellite delivery are rejected',()=>{
 const s=createRocketFlight(presetDesign('meridian'),'courier');s.phase='flying';s.throttle=.8;assert.equal(jettisonStage(s),false);assert.equal(deployChutes(s),false);assert.equal(deployPayload(s),false);s.throttle=0;separateCapsule(s);s.altitude=10000;s.verticalSpeed=-500;s.speed=500;assert.equal(deployChutes(s),false);s.altitude=4000;s.speed=150;assert.equal(deployChutes(s),true);disposeFlight(s);
});
test('pause freezes fuel, oxygen, and motion; frame batching preserves the trajectory',()=>{
 const make=()=>{const s=createRocketFlight({...presetDesign('pioneer'),crewCount:2});s.phase='flying';setThrottle(s,.8);return s;},a=make(),b=make();for(let i=0;i<1200;i++)advanceRocket(a,1/60);for(let i=0;i<200;i++)advanceRocket(b,.1);assert.ok(a.body.position.distanceTo(b.body.position)<.01);const before=[a.time,a.fuels[0],a.oxygen,a.body.position.y];a.paused=true;advanceRocket(a,2);assert.deepEqual([a.time,a.fuels[0],a.oxygen,a.body.position.y],before);disposeFlight(a);disposeFlight(b);
});
test('crew experience lower powered G tolerance than payloads',()=>{
 const make=crewCount=>{const s=createRocketFlight({...presetDesign('pioneer'),crewCount},'first-light','free');s.phase='flying';s.body.position.y+=100000;s.altitude=100000;s.fuels[0]=3000;s.command=1;return s;},crew=make(3),cargo=make(0);for(let i=0;i<160;i++){advanceRocket(crew,.1);advanceRocket(cargo,.1);}assert.ok(crew.crew[0].health<cargo.payloadHealth);disposeFlight(crew);disposeFlight(cargo);
});
test('cosmetics cannot change mass, thrust, fuel, or delta-v and locked looks are not equipped',()=>{const base=presetDesign('meridian'),stats=vehicleStats(base);for(const item of ROCKET_COSMETICS){const d={...base,[item.setting]:item.value};assert.deepEqual(vehicleStats(d),stats);assert.notEqual(ownedDesign(d,[])[item.setting],item.value);assert.equal(ownedDesign(d,[item.id])[item.setting],item.value);}});
test('configuration bounds parts and crew, retains independent colors, and tolerates blocked storage',()=>{const a=normalizeAstronaut({name:'<Sam>',hair:'braids',facialHair:'goatee',skin:'#332211',hairColor:'#123456'});assert.equal(a.name,'Sam');assert.equal(a.skin,'#332211');assert.equal(a.hairColor,'#123456');const d=normalizeDesign({stages:Array(8).fill({tank:'bad',engine:'bad'}),crewCount:20});assert.equal(d.stages.length,4);assert.equal(d.crewCount,3);assert.equal(d.stages[0].tank,'compact');const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(readRocketSave(storage).design.preset,'pioneer');assert.equal(writeRocketSave({},storage),false);assert.ok(validateDesign({...d,stages:[]}).errors.length);});
test('astronaut characters use a separate compatible family and share the validated builder',()=>{assert.equal(charactersForGame('rocket').length,3);const a=new CharacterBuilder('rocket','explorer').withColors({skin:'#996633',helmet:'#eeeeee'}).withFeature('hair','braids').build();assert.equal(a.family,'astronaut');assert.throws(()=>new CharacterBuilder('rocket','dragon'));});
test('free play and failed missions never pay; a completed flight pays once into the shared wallet',async()=>{const calls=[],wallet={claim(game,id,total){calls.push({game,id,total});return Promise.resolve({changed:true,coins:total});}},r=createRewardSession('rocket',wallet);for(const mission of MISSIONS){assert.equal(rewardTotal('rocket',{mode:'free',mission:mission.id,success:true}),0);assert.equal(rewardTotal('rocket',{mode:'mission',mission:mission.id,success:false}),0);assert.equal(rewardTotal('rocket',{mode:'mission',mission:mission.id,success:true}),mission.coins);}const progress={mode:'mission',mission:'first-light',success:true};await r.award(progress);await r.award(progress);assert.equal(calls.length,1);assert.equal(calls[0].total,20);assert.equal(rewardTotal('rocket',{mode:'mission',mission:'invented',success:true}),0);});
