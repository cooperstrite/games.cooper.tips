import { cookieEscape as esc } from './cookie-art.js';
import { LINE_STAGES, TRAY_RETURN_LENGTH, productionFilling, returnTrayPose, createProductionFlow, setProductionEquipment, queueProductionBatch, advanceProductionFlow, productionBatchAppearance, productionRates } from './cookie-line-engine.js';
import { factoryLayout, factoryX, packingPose, factoryTour, manualBatchPose } from './cookie-factory-model.js';
import { factoryArt, batchArt, courierArt } from './cookie-factory-art.js';
import { bindCookieChef } from './cookie-chefs.js';
import { createCookieWarehouse } from './cookie-warehouse.js';

let serial=0;
const clamp=n=>Math.max(0,Math.min(1,n));
export function createCookieProduction(root,style,initialLines=[{}],initialSelected=0,onSelect=()=>{}) {
 const key=`cookie-line-${++serial}`,wrapper=document.createElement('div'),filling=productionFilling(style.recipe),media=matchMedia('(prefers-reduced-motion: reduce)');
 wrapper.className='cc-production';
 wrapper.dataset.fit='false';
 wrapper.innerHTML=`<div class="cc-factory-toolbar"><div><span class="cc-eyebrow">YOUR WORKING BAKERY</span><h5 class="cc-factory-name"></h5></div><div class="cc-factory-view-controls"><button type="button" data-fit-line aria-pressed="false">Fit whole line</button><button type="button" data-tour="start">Take a factory tour <span aria-hidden="true">&rarr;</span></button></div></div><div class="cc-warehouse-host"></div>
 <section class="cc-factory-tour" aria-label="Factory walkthrough" hidden><div class="cc-tour-top"><span class="cc-eyebrow cc-tour-step"></span><span class="cc-tour-running">Production keeps running</span><button type="button" data-tour="close" aria-label="Close factory tour">&times;</button></div><h5 tabindex="-1"></h5><p class="cc-tour-story" aria-live="polite"></p><div class="cc-tour-controls"><button type="button" data-tour="previous">Previous</button><button type="button" data-tour="auto">Pause tour</button><span class="cc-tour-progress" aria-hidden="true"></span><button type="button" data-tour="next">Next stop &rarr;</button></div></section>
 <div class="cc-line-viewport" tabindex="0" role="img" aria-label="Cookies being prepared, filled, baked, cooled, boxed, and delivered. Filling station: ${esc(filling.label)}."></div>
 <div class="cc-line-bottom"><nav aria-label="Follow the production line">${LINE_STAGES.map((s,i)=>`<button type="button" data-follow="${s.id}"><span>${i+1}</span> ${s.name}<small></small></button>`).join('')}</nav><p class="cc-line-caption"></p></div>`;
 root.append(wrapper);
 const viewport=wrapper.querySelector('.cc-line-viewport'),tourPanel=wrapper.querySelector('.cc-factory-tour');
 let flows=[],selected=initialSelected,upgrades={},layout=factoryLayout(initialLines[initialSelected]),svg=null,refs={},signature='',stopped=false,disposed=false,signal=0,lastReduced=media.matches;
 let tour={active:false,index:0,auto:true,elapsed:0},camera=null,target=null,fitWhole=false,detailScroll=0;
 const nodes=new Map(),returnNodes=new Map();
 const warehouse=createCookieWarehouse(wrapper.querySelector('.cc-warehouse-host'),index=>onSelect(index));
 const flow=()=>flows[selected];
 const $=s=>svg.querySelector(s),$$=s=>[...svg.querySelectorAll(s)];
 function renderArt(){
  viewport.innerHTML=factoryArt(style,key,layout,upgrades);svg=viewport.querySelector('svg');nodes.clear();returnNodes.clear();
  refs={batchRoot:$('[data-batches]'),returnRoot:$('[data-return-trays]'),belt:$(`#${key}-belt`),highlight:$('[data-stage-highlights]'),returnChain:$('[data-return-chain]'),rollingPin:$('[data-rolling-pin]'),grain:$('[data-pin-grain]'),cutter:$('[data-cutter]'),whisk:$('[data-whisk]'),rack:$('[data-rack]'),pickup:$('[data-pickup-head]'),fillHead:$('[data-fill-head]'),fillDrops:$('[data-filling-drops]'),fillLight:$('[data-fill-light]'),swirl:$('[data-dough-swirl]'),heat:$('[data-oven-heat]'),spoon:$('[data-spoon]'),fillSpoon:$('[data-fill-spoon]'),rotors:$$('[data-rotor]'),wheels:$$('[data-wheel]'),feeds:$$('[data-feed-flow]'),ingredients:$$('[data-ingredient]'),drops:$$('[data-dough-stream]'),wisps:$$('[data-wisp]'),hands:$$('[data-chef-hands]'),faces:$$('[data-chef-face]'),tape:$$('[data-tape-wheel]')};
  // Keep roller and pickup cups in front of the dough and cookies they touch.
  const foreground=$('[data-foreground]');
  if(refs.rollingPin){const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('transform',`translate(${layout.stages.roll} 0)`);g.append(refs.rollingPin);foreground.append(g);}
  if(refs.pickup){const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('transform',`translate(${layout.stages.pack} 0)`);g.append(refs.pickup);foreground.append(g);}
  refs.pickupRod=$('[data-pickup-rod]');refs.pickupCarriage=$('[data-pickup-carriage]');
  refs.chefs=$$('[data-chef]').map(bindCookieChef);refs.courierRoot=$('[data-couriers]');refs.portion=$('[data-portion-spoon]');refs.handTape=$('[data-hand-tape]');
  camera=[0,0,layout.width,560];setCameraTarget();draw();
 }
 function update(lines,index=selected){
  const n=lines.length;selected=Math.max(0,Math.min(index,n-1));upgrades={...lines[selected]};
  while(flows.length<n){const f=createProductionFlow(lines[flows.length]);flows.push(f);}
  if(flows.length>n)flows.length=n;
  flows.forEach((f,i)=>setProductionEquipment(f,lines[i]));
  layout=factoryLayout(upgrades);
  wrapper.style.setProperty('--cc-floor-width',`${Math.round(layout.width*.8)}px`);
  wrapper.style.setProperty('--cc-floor-ratio',`${layout.width} / 560`);
  const nextSignature=`${selected}:${layout.signature}`;
  if(signature!==nextSignature){signature=nextSignature;renderArt();}
  for(const button of wrapper.querySelectorAll('[data-follow]')){
   const s=LINE_STAGES.find(s=>s.id===button.dataset.follow),count=s.upgrades.reduce((n,id)=>n+(upgrades[id]||0),0);
   button.querySelector('small').textContent=s.id==='fill'&&filling.kind==='none'?'idle':count?`${count}x`:'';
   button.dataset.equipped=String(count>0);button.setAttribute('aria-label',`${s.name}${count?`, ${count} upgrades installed`:''}`);
  }
  warehouse.update(flows,selected,lines.map(factoryLayout),style,lines.map(u=>productionRates(u).cps));
  wrapper.querySelector('.cc-factory-name').textContent=`${layout.name}${n>1?` / Line ${selected+1}`:''}`;
  wrapper.dataset.equipment=productionRates(upgrades).equipment;wrapper.dataset.lines=n;wrapper.dataset.tier=layout.tier;wrapper.dataset.targetSpeed=flow().targetSpeed.toFixed(2);
  if(tour.active)updateTour();draw();caption();
 }
 function spotlight(id){const s=LINE_STAGES.find(s=>s.id===id||s.upgrades.includes(id));if(!s)return;const box=refs.highlight.querySelector('rect'),x=layout.stages[s.id],width=s.id==='pack'?275:s.id==='bake'?270:210;
  ['x','y','width','height'].forEach((a,i)=>box.setAttribute(a,[x-width/2,78,width,352][i]));signal=2;refs.highlight.setAttribute('opacity','.8');
 }
 function setCameraTarget(){if(!tour.active){target=[0,0,layout.width,560];return;}
  const step=factoryTour(upgrades,style.recipe)[tour.index],x=layout.stages[step.id],height=matchMedia('(max-width:700px)').matches?350:420,width=Math.min(layout.width,Math.max(step.id==='pack'?450:410,viewport.clientWidth/height*390));
  target=[Math.max(0,Math.min(layout.width-width,x-width/2)),68,width,390];spotlight(step.id);
  if(media.matches)camera=[...target];
 }
 function cameraDraw(dt=0){if(!svg)return;const blend=media.matches?1:1-Math.exp(-Math.max(dt,.016)*7);camera=camera.map((v,i)=>Math.abs(v-target[i])<.05?target[i]:v+(target[i]-v)*blend);svg.setAttribute('viewBox',camera.map(n=>n.toFixed(2)).join(' '));}
 function updateTour(){const steps=factoryTour(upgrades,style.recipe),step=steps[tour.index];tourPanel.hidden=!tour.active;wrapper.dataset.tour=String(tour.active);
  tourPanel.querySelector('.cc-tour-step').textContent=`FACTORY TOUR / ${tour.index+1} OF ${steps.length}`;tourPanel.querySelector('h5').textContent=step.title;tourPanel.querySelector('.cc-tour-story').textContent=step.text;
  tourPanel.querySelector('[data-tour="previous"]').disabled=tour.index===0;tourPanel.querySelector('[data-tour="auto"]').textContent=tour.auto?'Pause tour':'Continue tour';tourPanel.querySelector('[data-tour="next"]').textContent=tour.index===steps.length-1?'Finish tour':'Next stop \u2192';setCameraTarget();
 }
 function closeTour(){tour.active=false;signal=0;tourPanel.hidden=true;wrapper.dataset.tour='false';viewport.scrollLeft=fitWhole?0:detailScroll;setCameraTarget();refs.highlight.setAttribute('opacity','0');wrapper.querySelector('[data-tour="start"]').focus({preventScroll:true});}
 function toggleFit(){
  if(!fitWhole&&!tour.active)detailScroll=viewport.scrollLeft;
  fitWhole=!fitWhole;wrapper.dataset.fit=String(fitWhole);
  wrapper.querySelector('[data-fit-line]').setAttribute('aria-pressed',String(fitWhole));
  if(!tour.active)viewport.scrollLeft=fitWhole?0:detailScroll;
  setCameraTarget();
 }
 function draw(){if(!svg||!flow())return;const f=flow(),still=media.matches,illustrative=still?[150,345,510,670,904,1146,1250,1470,1620].map((x,id)=>({x,id:`still-${id}`})):f.batches,scale=layout.tier===0?.67:layout.tier===1?.8:1;
  const ids=new Set(illustrative.map(b=>b.id));for(const[id,node]of nodes)if(!ids.has(id)){node.el.remove();node.courier?.remove();nodes.delete(id);}
  for(const batch of illustrative){let node=nodes.get(batch.id);if(!node){const el=document.createElementNS('http://www.w3.org/2000/svg','g');el.innerHTML=batchArt(key);el.dataset.batch=batch.id;refs.batchRoot.append(el);node={el};for(const name of ['dough','cookies','tray','box-back','box-front','back-flap','fold-flap','box-lid','tape'])node[name]=el.querySelector(`[data-${name}]`);node.pieces=[...el.querySelectorAll('[data-cookie-piece]')];node.toppings=[...el.querySelectorAll('[data-topping]')];nodes.set(batch.id,node);}
   const p=productionBatchAppearance(batch.x),transfer=packingPose(batch.x),sealing=p.sealed,pose=manualBatchPose(batch.x,layout),visibleX=factoryX(layout,pose.x);
   node.el.setAttribute('transform',`translate(${visibleX.toFixed(2)} ${330-pose.lift}) scale(${scale} 1)`);node.el.dataset.phase=p.sealed===1?'shipped':transfer.boxReady>0?'boxing':p.baked===1?'baked':p.filled===1?'filled':p.cut===1?'cut':p.rolled===1?'rolled':'dough';
   node.el.dataset.carried=String(pose.carry);
   if(!layout.transportBelt){
    if(!node.courier){node.courier=document.createElementNS('http://www.w3.org/2000/svg','g');node.courier.innerHTML=courierArt(key);refs.courierRoot.append(node.courier);node.chef=bindCookieChef(node.courier.firstElementChild);}
    node.courier.setAttribute('opacity',pose.carry?'1':'0');node.courier.setAttribute('transform',`translate(${visibleX} 0) scale(${scale} 1)`);
    node.chef.pose([-46,337-pose.lift],[46,337-pose.lift],pose.walk);
   }
   const deposited=clamp((batch.x-60)/38);node.dough.setAttribute('transform',`scale(${(1+p.rolled*.7)*deposited} ${(1-p.rolled*.62)*deposited})`);node.dough.setAttribute('opacity',1-p.cut);
   node.cookies.setAttribute('opacity',p.cut*(1-clamp((sealing-.12)/.65)));node.cookies.setAttribute('transform',`translate(0 ${-transfer.lift.toFixed(2)})`);
   node.pieces.forEach(el=>el.setAttribute('filter',`brightness(${1.5-p.baked*.5}) saturate(${.55+p.baked*.45})`));node.toppings.forEach(el=>el.setAttribute('opacity',filling.kind==='none'?1:productionBatchAppearance(batch.x+Number(el.dataset.topping)).filled));
   node.tray.setAttribute('opacity',1-p.boxed);node['box-back'].setAttribute('opacity',transfer.boxReady);node['box-front'].setAttribute('opacity',transfer.boxReady);
   node['back-flap'].setAttribute('d',`M-34-22l${-8+sealing*8} ${-22+sealing*38}h88l${1-sealing*9} ${22-sealing*38}Z`);node['fold-flap'].setAttribute('d',`M-46-6l${-15+sealing*61} ${-17+sealing}h15L${-31+sealing*77}-6Z`);node['box-lid'].setAttribute('opacity',sealing);node.tape.setAttribute('opacity',clamp((sealing-.5)*2));
  }
  const returns=!layout.returnBelt?[]:still?[30,400,760,1120,TRAY_RETURN_LENGTH-50].map((distance,id)=>({distance,id:`still-${id}`})):f.returns,returnIds=new Set(returns.map(t=>t.id));
  for(const[id,node]of returnNodes)if(!returnIds.has(id)){node.remove();returnNodes.delete(id);}
  for(const tray of returns){let node=returnNodes.get(tray.id);if(!node){node=document.createElementNS('http://www.w3.org/2000/svg','g');node.dataset.returnTray=tray.id;node.innerHTML=`<path d="M-46 0h92l-5 6h-82Z" fill="url(#${key}-metal)" stroke="#6d8a71"/><path d="M-40 0h80" stroke="#dfebd3" stroke-width="2"/>`;refs.returnRoot.append(node);returnNodes.set(tray.id,node);}
   const p=returnTrayPose(tray.distance);node.setAttribute('transform',`translate(${factoryX(layout,p.x).toFixed(2)} ${p.y.toFixed(2)}) scale(${scale} 1) rotate(${p.rotation.toFixed(2)})`);
  }
  const distance=still?0:f.distance,activity=x=>Math.max(0,...illustrative.map(b=>Math.max(0,1-Math.abs(b.x-x)/53)));
  refs.belt?.setAttribute('patternTransform',`translate(${distance%28} 0)`);refs.returnChain?.setAttribute('stroke-dashoffset',-distance%14);
  refs.feeds.forEach(el=>{if(el.dataset.feedFlow!=='none')el.setAttribute('stroke-dashoffset',(-distance*.6)%30);});refs.swirl?.setAttribute('d',`M-47 264q40 ${-17+Math.sin(distance*.06)*7} 92 0`);
  const rolling=activity(280);refs.rollingPin?.setAttribute('transform',`translate(${Math.sin(distance*.055)*rolling*8} ${rolling*9})`);refs.grain?.setAttribute('transform',`translate(0 ${Math.sin(distance*.1)*8})`);
  refs.rotors.forEach(el=>el.setAttribute('transform',`rotate(${distance*4%360})`));refs.wheels.forEach(el=>el.setAttribute('transform',`rotate(${distance*11%360})`));refs.tape.forEach(el=>el.setAttribute('transform',`rotate(${distance*2%360})`));
  refs.cutter?.setAttribute('transform',`translate(0 ${activity(443)*14})`);refs.whisk?.setAttribute('transform',`translate(0 260) scale(${.75+Math.cos(distance*.1)*.2} 1) translate(0 -260)`);refs.spoon?.setAttribute('transform',`rotate(${Math.sin(distance*.07)*7} 0 265)`);refs.rack?.setAttribute('transform',`rotate(${distance*.8%360})`);
  const transferBatch=illustrative.find(b=>b.x>=1195&&b.x<=1300),pick=transferBatch?packingPose(transferBatch.x):null;
  const pickupX=factoryX(layout,transferBatch?.x||1252)-layout.stages.pack,pickupY=transferBatch?243-pick.lift:159;
  refs.pickup?.setAttribute('transform',`translate(${pickupX} ${pickupY})`);refs.pickupRod?.setAttribute('d',`M${pickupX} 176V${pickupY+57}`);refs.pickupCarriage?.setAttribute('transform',`translate(${pickupX} 0)`);
  const fillingBatch=filling.kind==='none'?0:activity(630);refs.fillHead?.setAttribute('transform',`translate(0 ${fillingBatch*5})`);refs.fillSpoon?.setAttribute('transform',`translate(${20-fillingBatch*5} ${255+fillingBatch*39}) rotate(${-fillingBatch*20})`);refs.fillDrops?.setAttribute('opacity',Math.min(1,fillingBatch*3));refs.fillLight?.setAttribute('fill',filling.kind==='none'?'#a8b1a2':fillingBatch>.1?'#bbe6aa':'#68a77b');
  const portion=activity(94),cutting=activity(443),seal=activity(1375);
  refs.portion?.setAttribute('transform',`translate(${portion*8} ${280+portion*27})`);refs.portion?.setAttribute('opacity',layout.machineMix||portion>.1?'1':'0');
  const tapeX=factoryX(layout,1375)-layout.stages.pack;
  refs.handTape?.setAttribute('transform',`translate(${tapeX-seal*10} ${294+seal*20})`);
  for(const chef of refs.chefs){let left=[-47,299],right=[47,299];
   if(chef.task==='mix'){left=[-47-chef.offset,267];right=portion>.1||layout.machineMix?[-18+portion*8-chef.offset,258+portion*27]:[-8,245];}
   if(chef.task==='roll'){left=[-69+Math.sin(distance*.055)*rolling*8,298+rolling*9];right=[69+Math.sin(distance*.055)*rolling*8,298+rolling*9];}
   if(chef.task==='cut'){left=[-37,315];right=[0,280+cutting*14];}
   if(chef.task==='fill'){left=[-39,265];right=[20-fillingBatch*5,255+fillingBatch*39];}
   if(chef.task==='bake'){left=[-chef.offset-46,306];right=[-chef.offset-10,311-activity(890)*8];}
   if(chef.task==='cool'){left=[-46,320];right=[46,320];}
   if(chef.task==='pack'){
    const bx=transferBatch?factoryX(layout,manualBatchPose(transferBatch.x,layout).x)-layout.stages.pack-chef.offset:-28;
    left=[bx-24,317-(pick?.lift||0)];right=seal>.1?[tapeX-chef.offset-seal*10,296+seal*20]:[bx+24,317-(pick?.lift||0)];
   }
   if(chef.task==='ship'){left=[4,331];right=[65,331];}
   chef.pose(left,right);
  }
  refs.ingredients.forEach((el,i)=>{const phase=(distance*.012+i*.193)%1;el.setAttribute('transform',`translate(${-29+i%3*29+Math.sin(i*8)*3} ${295+phase*phase*30}) rotate(${phase*210+i*29})`);});
  refs.drops.forEach(el=>el.setAttribute('opacity',activity(94)));refs.wisps.forEach((el,i)=>{const phase=(distance*.004+i/3)%1;el.setAttribute('transform',`translate(${Math.sin(phase*6+i)*4} ${-phase*20})`);el.setAttribute('opacity',Math.sin(phase*Math.PI)*.42);});refs.heat?.setAttribute('opacity',.92+Math.sin(distance*.035)*.04);
  refs.hands.forEach((el,i)=>el.setAttribute('transform',`translate(${Math.sin(distance*.055+i)*5} ${i?-(pick?.lift||0)*.22:rolling*8})`));refs.faces.forEach(el=>el.setAttribute('opacity',distance%390>385?.4:1));
  warehouse.draw(flows,still);cameraDraw();
 }
 function caption(){wrapper.querySelector('.cc-line-caption').textContent=media.matches?'Reduced motion: a still view of every step. The bakery still earns its normal output.':stopped?'Production paused. Your batches will continue from here.':flow()?.auto?`Line ${selected+1} is working independently. ${layout.transportBelt?'Its conveyor carries the trays.':'Chefs carry trays between the workbenches.'}`:flow()?.batches.length||flow()?.queued?`Your chefs are making the batches you tapped on Line ${selected+1}. Buy upgrades for this kitchen below.`:`Line ${selected+1} starts with chefs, hand tools, and a basic oven. Tap the cookie to give them a batch to make.`;}
 function advance(seconds,paused=false){if(disposed)return;if(lastReduced!==media.matches)reducedMotion();if(stopped!==paused){stopped=paused;caption();}
  let changed=false;for(const f of flows)changed=(!media.matches&&advanceProductionFlow(f,seconds,paused))||changed;
  if(tour.active&&tour.auto&&!document.hidden&&seconds>0&&!paused){tour.elapsed+=seconds;if(tour.elapsed>=12){tour.elapsed=0;if(tour.index<7){tour.index++;updateTour();}else{tour.auto=false;updateTour();}}}
  tourPanel.querySelector('.cc-tour-running').textContent=paused?'Bakery is paused':'Production keeps running';
  if(tour.active)tourPanel.querySelector('.cc-tour-progress').style.setProperty('--tour-progress',`${clamp(tour.elapsed/12)*100}%`);
  if(changed)draw();else if(tour.active||camera?.some((v,i)=>Math.abs(v-target[i])>.05))cameraDraw(seconds);
  if(!tour.active&&!paused&&seconds>0&&signal>0){signal=Math.max(0,signal-seconds);refs.highlight.setAttribute('opacity',signal*.4);}
  wrapper.dataset.speed=flow().speed.toFixed(2);wrapper.dataset.shipped=flows.reduce((n,f)=>n+f.shipped,0);wrapper.dataset.returned=flows.reduce((n,f)=>n+f.returned,0);
 }
 function click(event){if(event.target.closest('[data-fit-line]')){toggleFit();return;}const tourButton=event.target.closest('button[data-tour]');if(tourButton){const action=tourButton.dataset.tour;if(action==='close'){closeTour();return;}if(action==='start'){if(!fitWhole&&!tour.active)detailScroll=viewport.scrollLeft;tour={active:true,index:0,auto:!media.matches,elapsed:0};viewport.scrollLeft=0;}else if(action==='previous'){tour.index=Math.max(0,tour.index-1);tour.elapsed=0;}else if(action==='next'){if(tour.index===7){closeTour();return;}tour.index++;tour.elapsed=0;}else if(action==='auto')tour.auto=!tour.auto;updateTour();if(action==='start'){tourPanel.querySelector('h5').focus({preventScroll:true});tourPanel.scrollIntoView({block:'start',behavior:media.matches?'instant':'smooth'});}return;}
  const button=event.target.closest('[data-follow]');if(button){const stage=LINE_STAGES.find(s=>s.id===button.dataset.follow);if(tour.active){tour.index=LINE_STAGES.indexOf(stage);tour.elapsed=0;updateTour();}else{const factor=svg.getBoundingClientRect().width/layout.width;viewport.scrollTo({left:layout.stages[stage.id]*factor-viewport.clientWidth/2,behavior:media.matches?'instant':'smooth'});spotlight(stage.id);}}}
 function keydown(event){if(event.key==='Escape'&&tour.active){event.preventDefault();closeTour();}}
 function resized(){if(svg)setCameraTarget();}
 function reducedMotion(){lastReduced=media.matches;if(media.matches&&tour.active){tour.auto=false;updateTour();}draw();caption();}
 wrapper.addEventListener('click',click);wrapper.addEventListener('keydown',keydown);media.addEventListener('change',reducedMotion);window.addEventListener('resize',resized);
 update(initialLines,initialSelected);
 return {update,advance,bake(){queueProductionBatch(flow());caption();},purchased(id){if(id!=='line')spotlight(id);},get pace(){return flow().targetSpeed/52;},dispose(){disposed=true;wrapper.removeEventListener('click',click);wrapper.removeEventListener('keydown',keydown);media.removeEventListener('change',reducedMotion);window.removeEventListener('resize',resized);warehouse.dispose();wrapper.remove();nodes.clear();returnNodes.clear();}};
}
