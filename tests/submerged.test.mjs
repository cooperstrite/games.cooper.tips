import test from 'node:test';
import assert from 'node:assert/strict';
import { OCEAN, DIVE_LEVELS, STATIONS, makeOcean, safeOceanPoint, sitePosition, rockContact, oceanDepth } from '../submerged-world.js';
import { createDive, startDive, pauseDive, stepDive, pingSonar, recoverDive, nearestSurvey, diveComplete, diveTarget, diveRating } from '../submerged-engine.js';

function run(state, seconds, input = {}, rate = 60) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * rate); i++) events.push(...stepDive(state, 1 / rate, input));
  return events;
}
function active(options) { const s = createDive(options); startDive(s); return s; }
function emptyWater(s) { s.world.rocks = []; s.world.hazards = []; s.world.currents = []; s.world.stations = []; s.x = 1400; s.y = 1600; return s; }

test('research goals retain the original categories and scale with difficulty', () => {
  for (const [difficulty, total] of [['easy',12],['medium',20],['hard',29]]) {
    const s = createDive({difficulty});
    assert.equal(s.phase, 'ready'); assert.equal(s.world.items.length, total);
    for (const [type, count] of Object.entries(DIVE_LEVELS[difficulty].counts)) assert.equal(s.world.items.filter(i => i.type === type).length, count);
    assert.equal(new Set(s.world.items.map(i => i.id)).size, total);
  }
  assert.equal(createDive({difficulty:'invalid'}).difficulty, 'medium');
  assert.equal(createDive({mode:'invalid'}).mode, 'expedition');
  assert.equal(oceanDepth(90), 0); assert.equal(oceanDepth(420), 50); assert.equal(oceanDepth(1100), 200); assert.equal(oceanDepth(1900), 1000); assert.equal(oceanDepth(2800), 4000); assert.equal(oceanDepth(3564), 6000);
});

// Independent flood fill with extra clearance checks that scenery never traps
// a research site or a service station. This also covers the solid shipwreck.
function navigationGrid(world, avoidHazards = false) {
  const spacing = 65, columns = 42, rows = 54, nodes = [];
  const clearPoint = (x,y) => safeOceanPoint(world,x,y,75) && (!avoidHazards || !world.hazards.some(h =>
    h.type==='jelly' ? Math.hypot(x-h.x,y-h.y)<155 : Math.abs(x-h.x)<100 && y>h.y-230 && y<h.y+70));
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const point = {x:65+x*spacing, y:110+y*spacing};
    nodes.push({...point, safe:clearPoint(point.x,point.y), neighbors:[]});
  }
  const clear = (a,b) => {
    const steps = Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/14);
    for (let i = 0; i <= steps; i++) if (!clearPoint(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps)) return false;
    return true;
  };
  for (let i = 0; i < nodes.length; i++) if (nodes[i].safe) for (const j of [i+1,i+columns]) {
    if (j>=nodes.length || j===i+1 && Math.floor(j/columns)!==Math.floor(i/columns) || !nodes[j].safe || !clear(nodes[i],nodes[j])) continue;
    nodes[i].neighbors.push(j); nodes[j].neighbors.push(i);
  }
  const closest = p => nodes.reduce((best,n,i) => n.safe && Math.hypot(n.x-p.x,n.y-p.y)<Math.hypot(nodes[best].x-p.x,nodes[best].y-p.y)?i:best,nodes.findIndex(n=>n.safe));
  const route = (a,b) => {
    const start=closest(a),end=closest(b),queue=[start],previous=new Map([[start,-1]]);
    for(let at=0;at<queue.length&&!previous.has(end);at++)for(const next of nodes[queue[at]].neighbors)if(!previous.has(next)){previous.set(next,queue[at]);queue.push(next);}
    if(!previous.has(end))return null;
    const path=[];for(let n=end;n!==-1;n=previous.get(n))path.push(nodes[n]);return path.reverse();
  };
  return {nodes,closest,route,clear};
}

test('every discovery and station is reachable across difficulties and generated ocean layouts', () => {
  for (const difficulty of Object.keys(DIVE_LEVELS)) for (const seed of [1,2,17,88,7831,189431,4294967295]) {
    const world=makeOcean(seed,difficulty),grid=navigationGrid(world);
    for(const destination of [...world.items,...world.stations]) {
      assert.ok(safeOceanPoint(world,destination.x,destination.y),`${difficulty}/${seed}: buried destination`);
      const route=grid.route(STATIONS[0],destination);
      assert.ok(route,`${difficulty}/${seed}: no route to ${destination.id}`);
      assert.ok(Math.hypot(route.at(-1).x-destination.x,route.at(-1).y-destination.y)<70,`destination out of reach`);
    }
  }
});

test('smooth movement normalizes diagonal input, uses inertia and brakes consistently across frame rates', () => {
  const straight=emptyWater(active()),diagonal=emptyWater(active());
  run(straight,2,{x:1});run(diagonal,2,{x:1,y:1});
  assert.ok(Math.abs(Math.hypot(straight.vx,straight.vy)-Math.hypot(diagonal.vx,diagonal.vy))<.01);
  const coast=structuredClone(straight),brake=structuredClone(straight);run(coast,.4);run(brake,.4,{brake:true});
  assert.ok(coast.x>straight.x);assert.ok(Math.abs(brake.vx)<Math.abs(coast.vx)*.15);
  const low=emptyWater(active()),high=emptyWater(active());run(low,3,{x:.7,y:.2},30);run(high,3,{x:.7,y:.2},120);
  assert.ok(Math.abs(low.x-high.x)<.01);assert.ok(Math.abs(low.y-high.y)<.01);
  const boost=emptyWater(active());run(boost,2,{x:1,boost:true});assert.ok(boost.vx>straight.vx*1.4);assert.ok(boost.battery<straight.battery);
});

test('pause, ready state and inactive tabs do not consume resources or simulation time', () => {
  const s=createDive();run(s,10,{y:1});assert.equal(s.time,0);assert.equal(s.battery,100);assert.equal(pingSonar(s),false);
  startDive(s);pauseDive(s);run(s,10,{y:1,scan:true});assert.equal(s.time,0);assert.equal(s.battery,100);assert.equal(pingSonar(s),false);
  pauseDive(s,false);run(s,1,{y:1});assert.ok(s.time>.99);
  const before=s.time;stepDive(s,NaN);stepDive(s,-2);assert.equal(s.time,before);stepDive(s,10);assert.ok(s.time-before<=.101);
});

test('rock collision follows the polygon, prevents tunneling and does not repeat damage every frame', () => {
  const s=emptyWater(active());s.x=1000;s.y=1600;
  const rock={x:1200,y:1600,rx:100,ry:100,points:[{x:1100,y:1500},{x:1300,y:1500},{x:1300,y:1700},{x:1100,y:1700}]};s.world.rocks=[rock];
  const events=run(s,1,{x:1,boost:true});assert.ok(s.x<1100-OCEAN.radius+1);assert.ok(s.hull<100);assert.equal(events.filter(e=>e.type==='damage').length,1);
  assert.equal(rockContact(rock,1000,1600),null);assert.ok(rockContact(rock,1200,1600).penetration>100);
  const edge=rockContact(rock,1100,1600);assert.ok(Math.hypot(edge.nx,edge.ny)>.99);
  assert.ok(s.x+OCEAN.hullRadius+OCEAN.hullOffset<=1100,'the bow stays outside the rock');
  s.world.rocks=[];s.x=OCEAN.width-80;run(s,3,{x:1});assert.equal(s.x,OCEAN.width-OCEAN.hullRadius-OCEAN.hullOffset);
});

test('scanning requires proximity and holding still, records each discovery once, and slows the sub', () => {
  const s=active({difficulty:'medium'}),site=s.world.items.find(i=>i.type==='coral');
  run(s,2,{scan:true});assert.equal(s.found,0);
  s.x=site.x;s.y=site.y;s.vx=200;stepDive(s,1/120,{scan:true});assert.equal(s.scanProgress,0);
  run(s,1,{scan:true});assert.ok(s.scanProgress>0);assert.ok(Math.abs(s.vx)<1);
  run(s,1);assert.equal(s.scanProgress,0);assert.equal(s.found,0);
  const events=run(s,2,{scan:true});assert.equal(s.found,1);assert.equal(site.done,true);assert.equal(s.counts.coral,1);assert.equal(events.filter(e=>e.type==='discovery').length,1);
  run(s,3,{scan:true});assert.equal(s.found,1);
  const fish=s.world.items.find(i=>i.type==='fish');s.x=fish.x;s.y=fish.y;s.vx=s.vy=0;run(s,2,{scan:true});assert.equal(fish.done,true);assert.equal(s.counts.fish,1);
});

test('sonar reveals nearby sites and respects cooldown, battery and relaxed mode', () => {
  const s=active();assert.equal(pingSonar(s),true);assert.equal(s.battery,98.5);assert.ok(s.world.items.some(i=>i.revealed));assert.ok(s.world.items.some(i=>!i.revealed));assert.equal(pingSonar(s),false);
  run(s,8.1);assert.equal(pingSonar(s),true);s.sonarCooldown=0;s.battery=1;assert.equal(pingSonar(s),false);
  const relaxed=active({mode:'explore'});assert.equal(pingSonar(relaxed),true);assert.equal(relaxed.battery,100);
});

test('service stations repair, recharge, set checkpoints, and recovery preserves discoveries', () => {
  const s=active(),site=s.world.items[0];s.x=site.x;s.y=site.y;run(s,2,{scan:true});assert.equal(s.found,1);
  s.x=STATIONS[2].x;s.y=STATIONS[2].y;s.hull=40;s.battery=20;run(s,2,{brake:true});assert.equal(s.checkpoint,2);assert.ok(s.hull>65);assert.ok(s.battery>59);
  s.x=1400;s.y=1800;s.battery=.0001;run(s,.1);assert.equal(s.phase,'stranded');assert.equal(recoverDive(s),true);assert.equal(s.phase,'playing');assert.equal(s.x,STATIONS[2].x);assert.equal(s.hull,100);assert.equal(s.battery,100);assert.equal(s.found,1);assert.equal(site.done,true);assert.equal(s.rescues,1);
});

test('hazards have recovery time, difficulty scaling and protection in relaxed exploration', () => {
  const losses=[];
  for (const difficulty of ['easy','medium','hard']) {
    const s=emptyWater(active({difficulty}));s.world.hazards=[{type:'jelly',x:s.x,y:s.y,phase:0}];
    run(s,.2);losses.push(100-s.hull);const hull=s.hull;run(s,.3);assert.equal(s.hull,hull);
  }
  assert.deepEqual(losses,[4,8,11.200000000000003]);
  const s=emptyWater(active({mode:'explore',difficulty:'hard'}));s.world.hazards=[{type:'jelly',x:s.x,y:s.y,phase:0}];run(s,10);assert.equal(s.hull,100);assert.equal(s.battery,100);assert.equal(s.phase,'playing');
});

test('an expedition only finishes on returning research to the ship; ratings count recoveries', () => {
  const s=active({difficulty:'easy'});run(s,1);assert.equal(s.phase,'playing');
  for (const item of s.world.items) { s.x=item.x;s.y=item.y;s.vx=s.vy=0;run(s,1.5,{scan:true}); }
  assert.equal(diveComplete(s),true);assert.equal(s.phase,'playing');assert.equal(diveTarget(s).id,0);
  s.x=STATIONS[0].x;s.y=STATIONS[0].y;s.vx=s.vy=0;const events=run(s,.1);assert.equal(s.phase,'won');assert.ok(events.some(e=>e.type==='win'));assert.equal(diveRating(s),3);
  s.rescues=1;assert.equal(diveRating(s),2);s.rescues=2;assert.equal(diveRating(s),1);
  const relaxed=active({mode:'explore'});relaxed.found=relaxed.world.items.length;run(relaxed,1);assert.equal(relaxed.phase,'playing');assert.equal(diveRating(relaxed),0);
});

test('navigation switches between chosen sites, research categories, recharge and home', () => {
  const s=active();s.targetType='treasure';assert.equal(diveTarget(s).type,'treasure');s.targetType='home';assert.equal(diveTarget(s).id,0);
  s.x=1700;s.y=1600;s.targetType='station';assert.equal(diveTarget(s).id,2);
  s.targetType='all';s.targetId='coral-1';assert.equal(diveTarget(s).id,'coral-1');s.world.items.find(i=>i.id===s.targetId).done=true;assert.notEqual(diveTarget(s).id,'coral-1');
  assert.equal(nearestSurvey({...s,x:10,y:10}),null);
});

test('complete dives are possible using only steering, braking and scanning, without recovery', () => {
  for(const difficulty of ['easy','medium','hard']) {
    const s=active({difficulty,seed:17}),grid=navigationGrid(s.world,true);
    function sail(destination) {
      const path=grid.route(s,destination);assert.ok(path);path.push(destination);
      for(const point of path) {
        let frames=0;
        while(Math.hypot(s.x-point.x,s.y-point.y)>18 && frames++<900) {
          const dx=point.x-s.x,dy=point.y-s.y;
          stepDive(s,1/30,{x:Math.abs(dx)>9?Math.sign(dx):0,y:Math.abs(dy)>9?Math.sign(dy):0,brake:Math.hypot(dx,dy)<90});
          assert.equal(s.phase,'playing',`${difficulty}: stranded on route to ${destination.id} with ${s.hull}% hull, ${s.battery}% battery`);
        }
        assert.ok(frames<900,`${difficulty}: blocked at ${point.x},${point.y}`);
      }
      run(s,.5,{brake:true});
    }
    // Work zone by zone, recharging before continuing to the next depth.
    const sites=[...s.world.items].sort((a,b)=>a.y-b.y);
    for(const item of sites) {
      const station=STATIONS.reduce((best,p)=>Math.hypot(p.x-s.x,p.y-s.y)<Math.hypot(best.x-s.x,best.y-s.y)?p:best);
      if(s.battery<65||s.hull<70){sail(station);run(s,5,{brake:true});}
      sail(item);run(s,DIVE_LEVELS[difficulty].scan+.7,{scan:true});assert.equal(item.done,true,`${difficulty}: did not scan ${item.id}`);
    }
    assert.equal(diveComplete(s),true);
    for(const station of [...STATIONS].reverse().filter(p=>p.y<s.y)) {
      // The final steering frame may trigger the win on entering the ship ring.
      if(station.id===0){const path=grid.route(s,station);for(const point of path){for(let n=0;n<900&&s.phase==='playing'&&Math.hypot(s.x-point.x,s.y-point.y)>18;n++){const dx=point.x-s.x,dy=point.y-s.y;stepDive(s,1/30,{x:Math.abs(dx)>9?Math.sign(dx):0,y:Math.abs(dy)>9?Math.sign(dy):0,brake:Math.hypot(dx,dy)<90});}}}
      else{sail(station);run(s,5,{brake:true});}
    }
    assert.equal(s.phase,'won',`${difficulty}: unable to return`);assert.equal(s.rescues,0);
  }
});
