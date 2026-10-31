import test from 'node:test';
import assert from 'node:assert/strict';
import {CLUES,WALLS,FURNITURE,COLUMNS,START,ROOMS,collectEvidence,newCase,segmentHitsBox,roomAt} from '../museum-world.js';
import {createMuseumPhysics} from '../museum-physics.js';
import {WINDOWS,SKYLIGHT,wallPanels,wallTrim,ceilingPanels,pictureFrameGeometry} from '../museum-architecture.js';
const run=(p,seconds,input={},yaw=0,rate=60)=>{for(let n=0;n<Math.round(seconds*rate);n++)p.step(1/rate,input,yaw);};

test('the original eight clues count once and automatically solve the same mystery',()=>{
  assert.deepEqual(CLUES.map(c=>c.id),['footprint1','scratches','droplet','fabric','keycard','glove','note','camera']);
  const state=newCase();assert.equal(collectEvidence(state,'invented'),false);
  for(const [i,c] of CLUES.entries()){assert.equal(collectEvidence(state,c.id),true);assert.equal(collectEvidence(state,c.id),false);assert.equal(state.found.length,i+1);assert.equal(state.solved,i===7);}
  assert.equal(newCase().found.length,0);
});
test('doors connect the entrance, corridor, and gallery without invisible barriers',()=>{
  const p=createMuseumPhysics();run(p,8,{forward:1});assert.ok(p.player.position.z < -6);assert.ok(Math.abs(p.player.position.y)<.01);assert.equal(roomAt(p.player.position.x,p.player.position.z),'Main Gallery');p.dispose();
});
test('solid walls stop normal walking and thin walls cannot be crossed at brisk speed',()=>{
  for(const rate of [30,60,120]){const p=createMuseumPhysics();p.player.position.set(5,.03,6);run(p,4,{forward:1,fast:true},0,rate);assert.ok(p.player.position.z>=4.48);assert.ok(p.player.position.z<4.7);p.dispose();}
});
test('diagonal movement is normalized and similar across frame rates',()=>{
  const distances=[];for(const rate of [30,60,120]){const p=createMuseumPhysics();run(p,.7,{forward:1,side:1},0,rate);distances.push(Math.hypot(p.player.position.x,p.player.position.z-START.z));assert.ok(distances.at(-1)<.7*2.26);p.dispose();}assert.ok(Math.max(...distances)-Math.min(...distances)<.04);
});
test('noclip bypasses walls and restoring collision inside a wall returns to clear floor',()=>{
  const p=createMuseumPhysics();p.player.position.set(5,.03,5);p.setNoclip(true);run(p,1,{forward:1});assert.ok(p.player.position.z<4);p.player.position.set(5,.03,4);assert.equal(p.setNoclip(false),true);assert.equal(p.canStand(p.player.position.x,p.player.position.z),true);p.dispose();
});
test('rebuilding collisions is idempotent and preserves player and moved props',()=>{
  const p=createMuseumPhysics(),count=p.world.bodies.length;run(p,1,{forward:1});const before=p.player.position.clone();p.dynamic[0].position.x=30;
  for(let i=0;i<4;i++){p.rebuild();assert.equal(p.world.bodies.length,count);assert.equal(p.dynamic[0].position.x,30);assert.equal(p.player.position.z,before.z);}p.dispose();assert.equal(p.world.bodies.length,0);
});
test('movable packing boxes fall and settle on the floor',()=>{
  const p=createMuseumPhysics();p.dynamic[0].position.y=3;run(p,3);assert.ok(p.dynamic[0].position.y>.35&&p.dynamic[0].position.y<.55);assert.ok(Math.abs(p.dynamic[0].velocity.y)<.05);p.dispose();
});
test('long suspended frames do not teleport the detective',()=>{const p=createMuseumPhysics();p.step(200,{forward:1,fast:true});assert.ok(Math.abs(p.player.position.z-START.z)<.4);p.dispose();});
test('line-of-sight tests reject walls but allow the actual doorway',()=>{
  assert.ok(WALLS.some(b=>segmentHitsBox({x:5,y:1.66,z:6},{x:5,y:1.66,z:2},b)));
  assert.ok(!WALLS.some(b=>segmentHitsBox({x:0,y:1.66,z:6},{x:0,y:1.66,z:2},b)));
});
test('every original clue has a reachable, unobstructed viewing position',()=>{
  const p=createMuseumPhysics(),queue=[[0,11]],seen=new Set(['0,11']),spots=[];
  for(let at=0;at<queue.length;at++){const [x,z]=queue[at];spots.push({x,y:1.66,z});for(const [dx,dz]of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const nx=x+dx,nz=z+dz,key=nx+','+nz;if(!seen.has(key)&&p.canStand(nx,nz)){seen.add(key);queue.push([nx,nz]);}}}
  for(const clue of CLUES){assert.ok(spots.some(eye=>Math.hypot(eye.x-clue.x,eye.y-clue.y,eye.z-clue.z)<4.35&&!WALLS.concat(FURNITURE,COLUMNS).some(b=>segmentHitsBox(eye,clue,b))),clue.name+' must be inspectable without noclip');}
  p.dispose();
});

test('wall trim follows the wall thickness instead of protruding across rooms',()=>{
  for(const wall of WALLS){
    for(const trim of wallTrim(wall)){
      const alongX=wall.w>wall.d;
      assert.ok((alongX?trim.d:trim.w)<.7,trim.id+' stays against its wall');
      assert.ok(alongX?Math.abs(trim.z-wall.z)<.001:Math.abs(trim.x-wall.x)<.001);
    }
    if(wall.h<3)assert.equal(wallTrim(wall).length,0,'door lintels must not create floor-level bars');
  }
});
test('window openings admit sunlight while their glass remains a solid game boundary',()=>{
  for(const win of WINDOWS){
    const wall=WALLS.find(w=>w.id===win.wall),normal={x:Math.sin(win.angle),z:Math.cos(win.angle)},y=(win.bottom+win.top)/2;
    const a={x:win.x+normal.x,y,z:win.z+normal.z},b={x:win.x-normal.x,y,z:win.z-normal.z};
    assert.equal(wallPanels(wall).some(p=>segmentHitsBox(a,b,p)),false,win.id+' has a real visual opening');
    assert.equal(segmentHitsBox(a,b,wall),true,win.id+' retains its solid glass boundary');
    const area=wallPanels(wall).reduce((sum,p)=>sum+p.w*p.h*p.d,0);
    const openings=WINDOWS.filter(w=>w.wall===wall.id).reduce((sum,w)=>sum+w.width*(w.top-w.bottom)*Math.min(wall.w,wall.d),0);
    assert.ok(Math.abs(area+openings-wall.w*wall.h*wall.d)<1e-6,'only the glazed window area is removed');
  }
});
test('gilt moulding leaves the painting opening clear with no blocks inside it',()=>{
  const w=1.55,h=2.12,{positions,indices}=pictureFrameGeometry(w,h);
  assert.ok(indices.length>0);
  for(let i=0;i<positions.length;i+=3){const [x,y,z]=positions.slice(i,i+3);assert.ok(Number.isFinite(x+y+z));assert.ok(Math.abs(x)>=w/2-1e-6||Math.abs(y)>=h/2-1e-6,'all frame vertices stay outside the image');}
});
test('the gallery skylight opens only its glass area in the roof',()=>{
  const room=ROOMS.find(r=>r.id===SKYLIGHT.room),panels=ceilingPanels(room);
  assert.ok(panels.every(p=>p.w>0&&p.d>0));
  assert.ok(Math.abs(panels.reduce((sum,p)=>sum+p.w*p.d,0)+SKYLIGHT.w*SKYLIGHT.d-room.w*room.d)<1e-6);
  assert.ok(!panels.some(p=>Math.abs(p.x-SKYLIGHT.x)<p.w/2&&Math.abs(p.z-SKYLIGHT.z)<p.d/2));
});
test('the movement-speed setting scales walking and Shift movement with safe limits',()=>{
  const distance=(speedMultiplier,fast=false)=>{const p=createMuseumPhysics();run(p,.7,{forward:1,speedMultiplier,fast});const d=START.z-p.player.position.z;p.dispose();return d;};
  const normal=distance(undefined);
  assert.ok(Math.abs(distance(.5)-normal*.5)<.001);
  assert.ok(Math.abs(distance(2)-normal*2)<.001);
  assert.ok(Math.abs(distance(2,true)/distance(1,true)-2)<.001);
  assert.ok(Math.abs(distance(100)-distance(2))<.001);
  assert.ok(Math.abs(distance(NaN)-normal)<.001);
});
test('walls remain solid at the fastest selectable Shift speed on low frame rates',()=>{
  for(const rate of [20,30,60]){const p=createMuseumPhysics();p.player.position.set(5,.03,6);run(p,3,{forward:1,fast:true,speedMultiplier:2},0,rate);assert.ok(p.player.position.z>=4.47);p.dispose();}
});
