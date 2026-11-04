import test from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_UPGRADES } from '../cookie-config.js';
import { createBakery, bakeCookie } from '../cookie-engine.js';
import { LINE_START, LINE_END, BATCH_SPACING, MANUAL_BATCH_SPACING, LINE_STAGES, TRAY_RETURN_LENGTH, returnTrayPose, productionFilling, productionSpeed, createProductionFlow, setProductionEquipment, queueProductionBatch, advanceProductionFlow, productionBatchAppearance } from '../cookie-line-engine.js';

test('every purchase, including duplicate hand tools and machines, makes the line faster', () => {
  const upgrades = {};
  for (let pass=0; pass<15; pass++) for (const u of COOKIE_UPGRADES) {
    const before = productionSpeed(upgrades); upgrades[u.id]=(upgrades[u.id]||0)+1;
    assert.ok(productionSpeed(upgrades)>before, u.id);
    assert.ok(LINE_STAGES.some(stage=>stage.upgrades.includes(u.id)));
  }
});

test('an upgrade preserves batch positions and eases toward the new speed without jumping', () => {
  const flow = createProductionFlow({ convection:1 });
  advanceProductionFlow(flow,.05); const positions=flow.batches.map(b=>b.x), speed=flow.speed;
  setProductionEquipment(flow,{ convection:1, packing:1 });
  assert.deepEqual(flow.batches.map(b=>b.x),positions); assert.equal(flow.speed,speed);
  const target=flow.targetSpeed; advanceProductionFlow(flow,.016);
  assert.ok(flow.speed>speed&&flow.speed<target);
  assert.ok(flow.batches[0].x-positions[0]<target*.016);
  for(let i=0;i<180;i++) advanceProductionFlow(flow,1/60);
  assert.ok(Math.abs(flow.speed-target)<.03);
});

test('the same batches move consistently across frame rates and maintain conveyor spacing', () => {
  const a=createProductionFlow({mixer:1,conveyor:1}), b=createProductionFlow({mixer:1,conveyor:1});
  setProductionEquipment(a,{mixer:1,conveyor:3});setProductionEquipment(b,{mixer:1,conveyor:3});
  for(let i=0;i<600;i++)advanceProductionFlow(a,1/60);
  for(let i=0;i<300;i++)advanceProductionFlow(b,1/30);
  assert.ok(Math.abs(a.distance-b.distance)<1e-8);assert.equal(a.shipped,b.shipped);
  assert.equal(a.batches.length,b.batches.length);
  const aa=a.batches.map(v=>v.x).sort((x,y)=>x-y), bb=b.batches.map(v=>v.x).sort((x,y)=>x-y);
  for(let i=0;i<aa.length;i++){assert.ok(Math.abs(aa[i]-bb[i])<1e-8);if(i)assert.ok(Math.abs(aa[i]-aa[i-1]-BATCH_SPACING)<1e-8);}
});

test('a manual batch starts as dough, crosses every stage, and leaves fully boxed', () => {
  const flow=createProductionFlow();assert.equal(flow.batches.length,0);
  assert.equal(advanceProductionFlow(flow,1/60),false);queueProductionBatch(flow);
  const observed=new Set();let last=0;
  for(let i=0;i<4200;i++){
    advanceProductionFlow(flow,1/60);
    for(const batch of flow.batches){
      assert.ok(batch.x>=last&&batch.x>=LINE_START&&batch.x<LINE_END);last=batch.x;
      const p=productionBatchAppearance(batch.x);
      for(const field of ['rolled','cut','filled','baked','boxed','sealed']){assert.ok(p[field]>=0&&p[field]<=1);if(p[field]===1)observed.add(field);}
      if(p.cut>0)assert.equal(p.rolled,1);if(p.filled>0)assert.equal(p.cut,1);if(p.baked>0)assert.equal(p.filled,1);if(p.boxed>0)assert.equal(p.baked,1);if(p.sealed>0)assert.equal(p.boxed,1);
    }
  }
  assert.equal(flow.shipped,1);assert.equal(flow.batches.length,0);assert.equal(observed.size,6);
  assert.equal(flow.returned,1);assert.equal(flow.returns.length,0);
  assert.equal(advanceProductionFlow(flow,1/60),false);
});

test('pause, hidden views, and invalid times cannot move batches or accelerate the conveyor', () => {
  const flow=createProductionFlow({factory:2});queueProductionBatch(flow);const before=structuredClone(flow);
  advanceProductionFlow(flow,100,true);for(const dt of [NaN,-1,0,Infinity])advanceProductionFlow(flow,dt);
  assert.deepEqual(flow,before);
  advanceProductionFlow(flow,500);assert.ok(flow.distance<=flow.speed*.1+.001);
});

test('rapid tapping stays bounded, reuses space on the line, and cannot mint gameplay rewards', () => {
  const game=createBakery();bakeCookie(game);const saved=structuredClone(game),flow=createProductionFlow(game.upgrades);
  for(let i=0;i<10000;i++)queueProductionBatch(flow);
  assert.equal(flow.queued,24);
  for(let i=0;i<14400;i++){advanceProductionFlow(flow,1/60);assert.ok(flow.batches.length<=6);assert.ok(flow.returns.length<=6);}
  assert.equal(flow.shipped,24);assert.equal(flow.returned,24);assert.equal(flow.batches.length,0);assert.deepEqual(game,saved);
});

test('empty trays follow a continuous curve underneath the line and rise back to the mixer', () => {
  assert.deepEqual(returnTrayPose(0),{x:1300,y:343,rotation:0});
  const end=returnTrayPose(TRAY_RETURN_LENGTH);
  assert.ok(Math.abs(end.x-LINE_START)<1e-8);assert.ok(Math.abs(end.y-330)<1e-8);assert.ok(Math.abs(end.rotation-360)<1e-8);
  for(const join of [Math.PI*47.5,Math.PI*47.5+1240]) {
    const a=returnTrayPose(join-.001),b=returnTrayPose(join+.001);
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.003);assert.ok(Math.abs(a.rotation-b.rotation)<.01);
  }
  const a=createProductionFlow({mixer:1}),b=structuredClone(a);
  for(let i=0;i<3600;i++)advanceProductionFlow(a,1/60);
  for(let i=0;i<1800;i++)advanceProductionFlow(b,1/30);
  assert.equal(a.returned,b.returned);assert.equal(a.returns.length,b.returns.length);
  for(let i=0;i<a.returns.length;i++)assert.ok(Math.abs(a.returns[i].distance-b.returns[i].distance)<1e-7);
  const paused=structuredClone(a);advanceProductionFlow(a,.1,true);assert.deepEqual(a,paused);
});

test('only recipes with chips, oats, or jam operate the filling station', () => {
  assert.equal(productionFilling('classic').kind,'chips');assert.equal(productionFilling('cocoa').kind,'chips');
  assert.equal(productionFilling('jam').kind,'jam');assert.equal(productionFilling('oat').kind,'oats');
  for(const recipe of ['sugar','star','galaxy','invalid'])assert.equal(productionFilling(recipe).kind,'none');
});

test('a growing floor plan preserves the order and continuity of every processing stage', async () => {
  const {factoryLayout,factoryX,packingPose,factoryTour}=await import('../cookie-factory-model.js');
  const levels=[{}, {convection:1}, {convection:1,factory:1,conveyor:1}, {packing:1,tunnel:1}];
  let lastWidth=0;
  for(const upgrades of levels){const plan=factoryLayout(upgrades);assert.ok(plan.width>lastWidth);lastWidth=plan.width;
    let lastX=-1;for(let x=0;x<=1715;x+=.5){const current=factoryX(plan,x);assert.ok(current>lastX);lastX=current;}
    assert.equal(factoryTour(upgrades,'jam').length,8);
    for(const stage of LINE_STAGES)assert.equal(factoryX(plan,stage.x),plan.stages[stage.id]);
  }
  assert.equal(factoryLayout({}).automatic,false);assert.equal(factoryLayout({convection:1}).machinePack,false);assert.equal(factoryLayout({packing:1}).machinePack,true);
  assert.equal(packingPose(1195).lift,0);assert.ok(packingPose(1247).lift>47);assert.ok(packingPose(1300).lift<.001);assert.equal(packingPose(1300).boxReady,1);
});

test('a manual kitchen holds trays at workbenches and carries them between stations until a conveyor is bought', async () => {
  const {factoryLayout,manualBatchPose}=await import('../cookie-factory-model.js');
  const starter=factoryLayout({}),ovenOnly=factoryLayout({convection:1});
  for(const plan of [starter,ovenOnly]){
    assert.equal(plan.transportBelt,false);assert.equal(plan.machinePortion,false);assert.equal(plan.machinePack,false);
    assert.equal(manualBatchPose(265,plan).x,280);assert.equal(manualBatchPose(305,plan).x,280);
    assert.equal(manualBatchPose(360,plan).carry,true);assert.equal(manualBatchPose(450,plan).carry,false);
    let previous=0;for(let x=60;x<=1715;x+=.5){const pose=manualBatchPose(x,plan);assert.ok(pose.x>=previous);assert.ok(pose.lift>=0);previous=pose.x;}
  }
  assert.equal(factoryLayout({mixer:1}).machinePortion,false);
  assert.equal(factoryLayout({depositor:1}).machinePortion,true);
  const conveyor=factoryLayout({conveyor:1});assert.equal(conveyor.transportBelt,true);assert.deepEqual(manualBatchPose(360,conveyor),{x:360,carry:false,lift:0,walk:0});
});

test('manual batches stay separated under continuous production and conveyor installation preserves their positions', () => {
  const flow=createProductionFlow({convection:1});assert.equal(flow.spacing,MANUAL_BATCH_SPACING);
  for(let i=0;i<3600;i++){
    queueProductionBatch(flow);advanceProductionFlow(flow,1/60);
    const xs=flow.batches.map(b=>b.x).sort((a,b)=>a-b);
    assert.ok(xs.length<=6);
    for(let j=1;j<xs.length;j++)assert.ok(xs[j]-xs[j-1]>=MANUAL_BATCH_SPACING-.001);
  }
  const positions=flow.batches.map(b=>b.x);setProductionEquipment(flow,{convection:1,conveyor:1});
  assert.deepEqual(flow.batches.map(b=>b.x),positions);assert.equal(flow.spacing,BATCH_SPACING);
});

test('tray handoffs ease out of and back into each stop without a sudden vertical kick', async () => {
  const {manualBatchPose,factoryLayout}=await import('../cookie-factory-model.js'),plan=factoryLayout({});
  for(const join of [140,240,320,410,490,590,670,850,930,1115,1195,1228,1276,1351,1399,1570,1650]){
    const a=manualBatchPose(join-.01,plan),b=manualBatchPose(join+.01,plan);
    assert.ok(Math.abs(a.x-b.x)<.00001,`horizontal settling at ${join}`);
    assert.ok(Math.abs(a.lift-b.lift)<.00001,`vertical settling at ${join}`);
  }
});

test('station chefs reach only for nearby trays and return to their normal work pose', async () => {
  const {chefHandoffHands}=await import('../cookie-chefs.js');
  const rest=[[-47,299],[47,299]],far=[{x:500,lift:4,walk:.5}];
  assert.deepEqual(chefHandoffHands(100,rest,far),rest);
  for(let x=-160;x<=360;x+=2)for(const walk of [0,.1,.5,.9,1]){
    const hands=chefHandoffHands(100,rest,[{x,lift:5,walk}]);
    for(const hand of hands){assert.ok(Math.abs(hand[0])<=120);assert.ok(hand[1]>=299&&hand[1]<=337);}
    if(walk===0||walk===1)assert.deepEqual(hands,rest);
  }
  const hands=chefHandoffHands(100,rest,[{x:180,lift:5,walk:.5}]);
  assert.deepEqual(hands[0],rest[0]);assert.ok(hands[1][0]>rest[1][0]);assert.ok(hands[1][1]>rest[1][1]);
});
