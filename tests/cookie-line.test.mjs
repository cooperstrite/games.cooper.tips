import test from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_UPGRADES } from '../cookie-config.js';
import { createBakery, bakeCookie } from '../cookie-engine.js';
import { LINE_START, LINE_END, BATCH_SPACING, LINE_STAGES, productionSpeed, createProductionFlow, setProductionEquipment, queueProductionBatch, advanceProductionFlow, productionBatchAppearance } from '../cookie-line-engine.js';

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
  const a=createProductionFlow({mixer:1}), b=createProductionFlow({mixer:1});
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
  for(let i=0;i<1800;i++){
    advanceProductionFlow(flow,1/60);
    for(const batch of flow.batches){
      assert.ok(batch.x>=last&&batch.x>=LINE_START&&batch.x<LINE_END);last=batch.x;
      const p=productionBatchAppearance(batch.x);
      for(const field of ['rolled','cut','baked','boxed','sealed']){assert.ok(p[field]>=0&&p[field]<=1);if(p[field]===1)observed.add(field);}
      if(p.cut>0)assert.equal(p.rolled,1);if(p.baked>0)assert.equal(p.cut,1);if(p.boxed>0)assert.equal(p.baked,1);if(p.sealed>0)assert.equal(p.boxed,1);
    }
  }
  assert.equal(flow.shipped,1);assert.equal(flow.batches.length,0);assert.equal(observed.size,5);
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
  for(let i=0;i<6000;i++){advanceProductionFlow(flow,1/60);assert.ok(flow.batches.length<=14);}
  assert.equal(flow.shipped,24);assert.equal(flow.batches.length,0);assert.deepEqual(game,saved);
});
