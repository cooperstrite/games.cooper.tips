// Read-only coaching: the pilot still operates every flight control.
const km=value=>Number.isFinite(value)?`${(Math.max(0,value)/1000).toFixed(value<100000?1:0)} km`:'Escape trajectory';
const cue=(id,title,instruction,detail,options={})=>({id,title,instruction,detail,action:null,button:'',key:'',tone:'normal',progress:null,...options});
const meter=(label,value,target,text)=>({label,value:Math.max(0,Math.min(target,value)),target,text});

function separate(s){
 if(s.design.stages.slice(s.activeStage).some(stage=>!stage.decoupler))return cue('missing-decoupler','The capsule cannot separate','A remaining stage has no decoupler.','Every remaining stage needs a decoupler to release the capsule. Add the missing part in the assembly bay before the next flight.',{tone:'warning'});
 if(s.command>.01||s.throttle>.12)return cue('cut-for-separation','Cut the engines','Press X or Cut power before releasing the capsule.','The capsule carries the crew or cargo home. Separating it discards all remaining rocket stages.',{action:'cut',button:'Cut power',key:'X'});
 if(s.q>5000)return cue('wait-for-separation','Wait for thinner air','Keep power off until air pressure falls below 5 kPa.',`Current air pressure: ${(s.q/1000).toFixed(1)} kPa. The capsule stays protected inside the rocket until separation is safe.`,{progress:meter('Air pressure',Math.max(0,10000-s.q),5000,`${(s.q/1000).toFixed(1)} / under 5 kPa`)});
 return cue('separate','Release the capsule','Press C or Separate capsule now.','The empty boosters fall away. The capsule continues upward, then returns under its heat shield and parachutes.',{action:'capsule',button:'Separate capsule',key:'C'});
}

function instructionForFlight(s){
 const m=s.mission,free=s.mode==='free',crewed=s.crew.length>0,limit=crewed?(m.id==='expedition'?4:4.5):8;
 if(s.result)return cue('result',s.result.title,s.result.reason,free?'Free play awards no coins.':s.result.success?`Mission complete: ${m.coins} shared coins.`:'Review the flight plan and try again.');
 if(s.phase==='ready')return cue('ready',free?'Ready for your own flight?':`Your goal: ${m.name}`,free?'Build a rocket, then press Launch vehicle.':m.orbit?`${m.target/1000} km orbit high point / 100 km low point. ${m.recover?'Bring the capsule home.':'Deliver the satellite.'}`:`Reach ${m.target/1000} km, then bring the capsule back by parachute.`,free?'Manual pitch and heading are available. Your vehicle can still be damaged; free play has no coin rewards.':`Use ${m.preset==='pioneer'?'Pioneer':m.preset==='meridian'?'Meridian':m.preset==='atlas'?'Atlas':'Odyssey'} or your own suitable rocket. Guidance handles steering; you handle throttle, staging, and recovery.`,{action:'launch',button:'Launch vehicle'});
 if(s.phase==='countdown'){
  const label=s.countdown>3?'Pad water is flowing':s.countdown>1?'Main engines are igniting':'Thrust is building';
  return cue('countdown',label,`T-minus ${Math.ceil(s.countdown)}. Launch release is automatic.`,s.countdown>3?'Water floods the flame trench to absorb heat and sound. Steam begins rolling away from the pad.':s.countdown>1?'The engines light while the launch mount holds the rocket. Exhaust heats the deluge water into billowing steam.':'The access arms are clear. At zero, the clamps release and the rocket lifts as thrust builds.');
 }
 if(!s.capsule&&(s.gLoad>limit||s.q>m.maxQ*.9))return cue('ease-power','Ease the throttle','Reduce power until acceleration and air pressure settle.',`${crewed?'Aim below 4 G for the astronauts':'Aim below 8 G for the payload'}. Keep air pressure below ${m.maxQ/1000} kPa; excessive force damages the rocket.`,{action:'reduce',button:'Ease throttle',key:'Down',tone:'warning'});
 if(!free&&m.orbit&&s.orbitAchieved&&!m.recover){
  if(s.command>.01||s.throttle>.12)return cue('orbit-cut','Orbit confirmed: stop the engines','Press X or Cut power.','The rocket is now moving sideways fast enough to stay in orbit. Stop accelerating before the next step.',{action:'cut',button:'Cut power',key:'X'});
  if(s.fairing)return cue('fairing','Open the payload cover','Press F or Open fairing.','The two protective fairing halves separate to uncover the satellite. This does not release the satellite yet.',{action:'fairing',button:'Open fairing',key:'F'});
  return cue('payload','Release the satellite','Press Deploy satellite to finish the mission.','The payload separates and unfolds its solar panels. A safe delivery earns your mission coins.',{action:'payload',button:'Deploy satellite'});
 }
 const high=s.orbit.apoapsis>=m.target,low=s.orbit.periapsis>=100000,staged=s.staged>=m.stages;
 if(!free&&m.orbit&&!s.orbitAchieved&&high&&low&&staged)return cue('confirm-orbit','The orbit is high enough','Cut power and hold this orbit for confirmation.','Both the high point and low point are clear of the atmosphere. Mission control confirms the orbit after four stable seconds.',{action:s.command>.01?'cut':null,button:'Cut power',key:'X'});
 if(s.capsule){
  if(s.chute)return cue('landing','Parachutes are slowing the capsule','Keep the parachutes open. Touchdown happens automatically.',`The drogue slows you first; the main canopies open as speed drops. ${crewed?'Land below 12 m/s to protect the crew.':'Land below 18 m/s to protect the payload.'}`,{progress:meter('Height above landing',Math.max(0,5000-s.altitude),5000,`${km(s.altitude)} remaining`)});
  if(s.verticalSpeed<0&&s.altitude<=5000){
   if(!s.design.parachute)return cue('missing-chutes','No parachute installed','This capsule has no recovery parachutes.','Add parachutes in the assembly bay before your next flight.',{tone:'warning'});
   if(s.speed<=220)return cue('chute','Open the parachutes now','Press D or Parachutes to slow the landing.',`You are descending below 5 km at ${Math.round(s.speed)} m/s. The drogue opens first, then the larger main canopies.`,{action:'chute',button:'Open parachutes',key:'D'});
   return cue('slow-for-chutes','Wait before opening parachutes',`Speed is ${Math.round(s.speed)} m/s; wait until it is below 220 m/s.`,s.guidance?'Guidance holds the heat shield into the airflow while air resistance slows the capsule.':'Turn Guidance on to keep the heat shield facing the airflow.',{action:!s.guidance?'guidance':null,button:'Enable guidance'});
  }
  if(!free&&m.orbit&&s.orbitAchieved&&!s.deorbited)return cue('deorbit','Start the return burn','Press R or Deorbit burn to come home.','The retro motor points against your flight direction and lowers the orbit into the atmosphere. It stops automatically when the low point is below 42 km.',{action:'retro',button:'Deorbit burn',key:'R'});
  if(s.retro)return cue('retro-burning','Return burn in progress','Let the retro motor lower the orbit. It stops automatically.',`Orbit low point: ${km(s.orbit.periapsis)}. When it falls below 42 km, the capsule coasts into the atmosphere. Keep Guidance enabled.`);
  if(s.verticalSpeed<0)return cue('entry','Returning through the atmosphere','Keep Guidance on. Wait for the parachute window.',`Guidance aims the heat shield into the airflow. Open parachutes only when falling below 5 km AND slower than 220 m/s. Current height: ${km(s.altitude)}.`,{action:!s.guidance?'guidance':null,button:'Enable guidance',progress:meter('Parachute height',Math.max(0,80000-s.altitude),75000,`${km(s.altitude)} / below 5 km`)});
  return cue('coast','Coast toward the top of the flight','Keep power off; gravity will bring the capsule back down.','The capsule may still rise after engine cutoff. Wait for descent, then follow the parachute instructions. Time warp can shorten the coast.',{progress:!free?meter('Mission height',s.maxAltitude,m.target,`${km(s.maxAltitude)} / ${km(m.target)}`):null});
 }
 if(!free&&!m.orbit&&s.cutoffReady)return separate(s);
 if(!free&&m.orbit&&s.orbitAchieved)return separate(s);
 const fuel=s.fuels[s.activeStage],hasNext=s.activeStage<s.design.stages.length-1;
 if(!free&&m.orbit&&high&&low&&!staged){
   if(s.command>.01||s.throttle>.12)return cue('stage-orbit-cut','Orbit height reached: prepare to stage','Press X or Cut power before dropping the booster.',`The mission also requires ${m.stages} booster separation${m.stages===1?'':'s'}; ${s.staged} completed. You have enough orbital height.`,{action:'cut',button:'Cut power',key:'X'});
   if(!s.design.stages[s.activeStage].decoupler||!hasNext)return cue('missing-orbital-stage','This flight needs another booster separation','The remaining stack cannot complete the required staging.','Use the mission\'s recommended vehicle, or add enough stages and decouplers before your next flight.',{tone:'warning'});
   return cue('stage-orbit','Drop the spent booster','Press Space or Jettison stage to complete the flight plan.',`Orbit height is sufficient. ${s.staged} of ${m.stages} required booster separations completed.`,{action:'stage',button:'Jettison stage',key:'Space'});
  }
 if(fuel<.5){
  if(!hasNext)return separate(s);
  if(!s.design.stages[s.activeStage].decoupler)return cue('missing-decoupler','This stage cannot separate','A decoupler was not installed on this stage.','Add a decoupler in the assembly bay before the next flight.',{tone:'warning'});
  if(s.throttle>.12&&fuel>.1)return cue('cut-for-stage','Cut power before staging','Press X or Cut power, then wait for the engine to stop.','Even a little fuel can keep the engine firing. The booster can separate when thrust has settled.',{action:'cut',button:'Cut power',key:'X'});
  return cue('stage',`Stage ${s.activeStage+1} is empty`,'Press Space or Jettison stage to drop it.',`The empty booster falls away. Then raise throttle to ignite stage ${s.activeStage+2}; the next engine does not ignite automatically.`,{action:'stage',button:'Jettison stage',key:'Space'});
 }
 if(s.command<.01&&s.throttle<.1&&(!s.ignited.has(s.activeStage)||!s.hasLaunched))return cue('ignite',s.activeStage?`Ignite stage ${s.activeStage+1}`:'Power is off','Press Z or Full power to start this engine.','Raise throttle to make thrust. Reduce it as the rocket becomes lighter so acceleration stays safe.',{action:'full',button:'Full power',key:'Z'});
 if(!s.hasLaunched||s.time<4)return cue('liftoff','Liftoff: climb away from the pad','Keep the engine running and let the rocket clear the tower.',s.guidance?'Guidance holds the rocket upright. You control throttle; keep an eye on acceleration and air pressure.':'Manual flight: keep pitch close to zero until you clear the launch tower.');
 if(free)return cue('free','Your flight, your controls','Adjust throttle, pitch, and heading; stage when needed.','Free play has no mission targets or rewards. For a safe return, cut power, separate the capsule in thin air, then open parachutes during the landing window.');
 if(m.orbit){
  if(s.command<.01)return cue('resume-orbit','Continue building the orbit','Raise throttle to keep increasing sideways speed.','The orbit is not complete yet. Both height targets and the required stage separations must be satisfied.',{action:'full',button:'Full power',key:'Z'});
  return cue('orbit-build',high?'Raise the orbit low point':'Climb and build sideways speed',high?'Keep burning until the orbit low point reaches 100 km.':`Keep burning toward a ${Math.round(m.target/1000)} km predicted peak.`,`${s.guidance?'Guidance gradually turns the rocket sideways.':'Use pitch to gradually turn sideways.'} Orbit needs a high point of ${Math.round(m.target/1000)} km, a low point of 100 km, and ${m.stages} booster separation${m.stages===1?'':'s'}. Ease power if G-load or air pressure climbs.`,{progress:high?meter('Orbit low point',s.orbit.periapsis,100000,`${s.orbit.periapsis<0?'Below Earth':km(s.orbit.periapsis)} / 100 km`):meter('Predicted peak',s.orbit.apoapsis,m.target,`${km(s.orbit.apoapsis)} / ${km(m.target)}`)});
 }
 const cutoff=m.target*1.15+3000;
 if(s.command<.01)return cue('resume-climb','The capsule needs more height','Raise throttle to continue the climb.',`Aim for a predicted peak near ${Math.round(cutoff/1000)} km. That includes a margin for air resistance, so the capsule actually reaches ${Math.round(m.target/1000)} km.`,{action:'full',button:'Full power',key:'Z'});
 return cue('climb',`Aim for a ${Math.round(cutoff/1000)} km predicted peak`,'Keep climbing. I will tell you when to cut power.',`Predicted peak means the highest point you would reach if power stopped now. The extra height allows for air resistance. ${crewed?'Keep acceleration under 4 G.':'Keep acceleration under 8 G.'}`,{progress:meter('Predicted peak',s.orbit.apoapsis,cutoff,`${km(s.orbit.apoapsis)} / ${Math.round(cutoff/1000)} km`)});
}

// Keep secondary warnings visible without hiding a time-critical recovery control.
export function flightInstruction(s){
 const instruction=instructionForFlight(s);
 if(s.warning&&s.phase==='flying'&&instruction.tone!=='warning')return {...instruction,tone:'warning',detail:s.warning+'. '+instruction.detail};
 return instruction;
}

export function flightChecklist(s){
 if(s.mode==='free')return[{label:'Build your rocket with any available parts.',complete:true},{label:'Launch, explore, and practice recovery.',complete:s.hasLaunched},{label:'Free play awards no coins.',complete:false}];
 const m=s.mission;
 const done=m.id==='first-light'?[s.maxAltitude>=m.target,s.capsule,s.chute,s.phase==='won']:m.id==='spaceward'?[s.staged>=1,s.maxAltitude>=m.target,s.capsule,s.phase==='won']:!m.recover?[s.staged>=m.stages,s.orbitAchieved,!s.fairing,s.payloadDeployed]:[s.orbitAchieved,s.deorbited,s.peakTemperature>500&&s.altitude<10000&&s.integrity>0,s.phase==='won'];
 return m.steps.map((label,i)=>({label,complete:!!done[i]}));
}
