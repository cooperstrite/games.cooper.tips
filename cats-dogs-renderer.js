import { TUG_ARENAS, TUG_MATCH_RULES } from "./cats-dogs-engine.js";
import { drawTugPet, prepareTugPet } from "./cats-dogs-pet-art.js";
import { normalizeTugPet } from "./cats-dogs-customization.js";
import { TugGroundEffects } from "./cats-dogs-ground-effects.js";
import { drawTugRope } from "./cats-dogs-rope.js";
import { drawTugEnding, prepareTugEnding, TUG_ENDING_SECONDS } from "./cats-dogs-ending.js";
import { endingAppearance } from "./cats-dogs-ending-poses.js";

export function createTugRenderer(canvas, { reducedMotion = false, wardrobe = { cats: normalizeTugPet("cats"), dogs: normalizeTugPet("dogs") } } = {}) {
  const context = canvas.getContext("2d"), images = {}, W = 1200, H = 675;
  let disposed = false, drift = 0, pulse = 0, clock = 0, victoryAge = 0, previousPhase = "ready";
  const ground=new TugGroundEffects({reducedMotion}),efforts={cats:0,dogs:0};
  const endingPets=Object.fromEntries(["cats","dogs"].map(side=>[side,{win:endingAppearance(wardrobe[side],"win"),sad:endingAppearance(wardrobe[side],"sad")} ]));
  let match=null,drawnPhase=null;
  function sync(s){if(match!==s){match=s;drawnPhase=null;ground.reset(s.arena);drift=0;pulse=0;clock=0;victoryAge=0;previousPhase="ready";efforts.cats=efforts.dogs=0;canvas.dataset.scuffs="0";for(const key of ["ending","endingWinner","endingLoser"])delete canvas.dataset[key];}}
  const feet=(side,x)=>{
    const pet=wardrobe[side],cat=side==="cats",low=["corgi","husky"].includes(pet.breed);
    const points=cat?[[.25,.948],[.88,.945]]:low?[[.26,.953],[.88,.955]]:[[.26,.928],[.88,.932]];
    return points.map(([px,py])=>({x:x-225+px*450,y:550-420+py*450}));
  };
  const sources = { park: "assets/cats-dogs-park-v2.jpg", beach: "assets/cats-dogs-beach-v2.jpg" };
  const ready = Promise.all([prepareTugEnding(),...Object.values(endingPets).flatMap(p=>Object.values(p)).map(p=>prepareTugPet(p,true)),...Object.values(wardrobe).filter(p=>p?.breed).map(p=>prepareTugPet(p,true)), ...Object.entries(sources).map(([key, src]) => new Promise(resolve => {
    const img = new Image(); img.onload = () => { if (!disposed) images[key] = img; resolve(true); }; img.onerror = () => resolve(false); img.src = src;
  }))]);
  ready.then(()=>{drawnPhase=null;});
  function ellipse(x, y, rx, ry, fill) { context.fillStyle = fill; context.beginPath(); context.ellipse(x,y,rx,ry,0,0,Math.PI*2); context.fill(); }
  function roundRect(x,y,w,h,r,fill) { context.fillStyle=fill; context.beginPath();context.roundRect(x,y,w,h,r);context.fill(); }
  function cover(img) {
    const scale = Math.max(W/img.width,H/img.height); context.drawImage(img,(W-img.width*scale)/2,(H-img.height*scale)/2,img.width*scale,img.height*scale);
  }
  function draw(s, dt = 0) {
    if (!context || disposed) return;
    sync(s);const visualDt=s.paused?0:dt;
    const ratio = Math.min(2, window.devicePixelRatio || 1), width = Math.max(1, Math.round(canvas.clientWidth*ratio)), height = Math.round(width*H/W);
    if(s.paused&&drawnPhase===s.phase&&canvas.width===width&&canvas.height===height)return;
    drawnPhase=s.phase;
    if (canvas.width !== width || canvas.height !== height) { canvas.width=width;canvas.height=height; }
    context.setTransform(width/W,0,0,height/H,0,0);
    if (!reducedMotion) clock += visualDt;
    const target = s.position / TUG_MATCH_RULES.target * 155;
    drift = reducedMotion ? target : drift + (target - drift) * Math.min(1,visualDt*8);
    pulse = Math.max(0,pulse-visualDt*2.5);
    for(const side of ["cats","dogs"])efforts[side]=Math.max(0,efforts[side]-visualDt*1.8);
    ground.update(visualDt);
    if (s.phase !== previousPhase) { if (s.phase === "matchEnd") victoryAge=0; previousPhase=s.phase; }
    if (s.phase === "matchEnd" && !s.paused) victoryAge+=dt;
    const arena = TUG_ARENAS[s.arena], bg=images[arena.backdrop];
    if (bg) cover(bg); else { const g=context.createLinearGradient(0,0,0,H);g.addColorStop(0,"#bde2d7");g.addColorStop(1,"#8eab64");context.fillStyle=g;context.fillRect(0,0,W,H); }
    if (s.arena === "moon") { context.fillStyle="#14263b99";context.fillRect(0,0,W,H);ellipse(1010,145,30,30,"#ffebbd");ellipse(1022,137,28,28,"#23384e"); }
    const shade=context.createLinearGradient(0,0,0,H);shade.addColorStop(0,"#092b273a");shade.addColorStop(.45,"#092b2700");shade.addColorStop(1,"#102d2940");context.fillStyle=shade;context.fillRect(0,0,W,H);
    if(s.phase==="matchEnd"){const result=drawTugEnding(context,s,wardrobe,victoryAge,reducedMotion,endingPets);canvas.dataset.ending=result.kind;canvas.dataset.endingWinner=result.winner||"";canvas.dataset.endingLoser=result.loser||"";return;}
    // Chalk arena markings and the two win posts anchor the rope in the world.
    context.strokeStyle="#fff8dc99";context.lineWidth=3;context.setLineDash([10,10]);context.beginPath();context.ellipse(600,555,490,66,0,0,Math.PI*2);context.stroke();context.setLineDash([]);
    for(const x of [445,755]) { roundRect(x-4,444,8,100,4,"#765236");context.fillStyle=x<600?"#e47d57":"#429eaa";context.beginPath();context.moveTo(x,446);context.lineTo(x+37,455);context.lineTo(x,472);context.closePath();context.fill();ellipse(x,548,18,5,"#1e3b2922"); }
    ground.drawMarks(context);
    const bounce = reducedMotion ? 0 : Math.sin(clock*3)*.5;
    // Visible character paws sit at these rope anchors; all motion shares them.
    const catX=326+drift, dogX=875+drift;
    ellipse(catX-14,553,113,20,"#1831223a");ellipse(dogX+15,553,123,20,"#1831223a");
    const effort=side=>Math.max(efforts[side],s.sides[side].queued?Math.min(.65,.2+s.sides[side].queued.power*.055):0);
    const pose = (side,x) => ({x,y:550+bounce,lean:reducedMotion?0:(side==="cats"?-1:1)*effort(side)*.035,sx:reducedMotion?1:1+effort(side)*.009,sy:reducedMotion?1:1+Math.sin(clock*(s.sides[side].energy<20?5:2.8)+(side==="cats"?0:2))*.004-effort(side)*.009});
    const catPose=pose("cats",catX),dogPose=pose("dogs",dogX);
    const hand=(p,x,y)=>({x:p.x+x*p.sx*Math.cos(p.lean)-y*p.sy*Math.sin(p.lean),y:p.y+x*p.sx*Math.sin(p.lean)+y*p.sy*Math.cos(p.lean)});
    const catHand=hand(catPose,160,-227),dogHand=hand(dogPose,-164,-236);
    drawTugRope(context,catHand,dogHand,clock,reducedMotion);
    for(const [side,x] of [["cats",catX],["dogs",dogX]]) {
      const p=side==="cats"?catPose:dogPose;
      context.save();context.translate(p.x,p.y);context.rotate(p.lean);context.scale(p.sx,p.sy);
      if(s.arena==="moon")context.filter="brightness(.88) saturate(.88)";
      drawTugPet(context,wardrobe[side],{time:clock,effort:effort(side),energy:s.sides[side].energy,reducedMotion});
      context.restore();
      if(s.sides[side].shield){context.strokeStyle="#abe9eecc";context.lineWidth=4;context.fillStyle="#a7e5ed18";context.beginPath();context.ellipse(x,355,150,205,0,0,Math.PI*2);context.fill();context.stroke();}
      if(s.sides[side].mud)for(let i=0;i<9;i++)ellipse(x-95+i*25,546+Math.sin(i*4)*8,13+i%3*4,6,"#79523cd9");
      const effect=s.lastBeat?.effects?.find(e=>e.side===side);
      if(effect&&pulse>0){context.save();context.globalAlpha=pulse;context.font="bold 24px system-ui";context.textAlign="center";context.fillStyle=effect.kind==="blocked"?"#c8fbff":"#fff2c6";context.fillText(({mud:"SPLAT!",squeak:"SQUEAK! -22",blocked:"BLOCKED!",shield:"SHIELD UP"})[effect.kind],x,135-(1-pulse)*25);context.restore();}
      if (s.sides[side].streak===3) { context.strokeStyle="#ffdf83";context.lineWidth=3;context.beginPath();context.ellipse(x,549,111,21,0,0,Math.PI*2);context.stroke(); }
    }
    ground.drawParticles(context);
    // Slow drifting pollen / fireflies keep the backdrop alive without obscuring play.
    if(!reducedMotion) for(let i=0;i<18;i++){const x=(i*131+clock*(9+i%4))%W,y=80+(i*71)%390+Math.sin(clock*.6+i)*12;ellipse(x,y,s.arena==="moon"?2.2:1.7,s.arena==="moon"?2.2:1.7,s.arena==="moon"?"#ffe7a9bb":"#fff3ce77");}
  }
  return { ready,draw,
    get endingComplete(){return reducedMotion||victoryAge>=TUG_ENDING_SECONDS;},
    skipEnding(){victoryAge=TUG_ENDING_SECONDS;},
    pull(side,power=0){if(Object.hasOwn(efforts,side))efforts[side]=Math.max(efforts[side],Math.min(1,.4+power*.1));},
    hit(outcome,s){sync(s);pulse=1;for(const side of ["cats","dogs"])if(outcome.pulls?.[side]){const power=outcome.powers[side];efforts[side]=Math.min(1,.4+power*.1);ground.pull(side,feet(side,(side==="cats"?326:875)+drift),power);}canvas.dataset.scuffs=String(ground.marks.length);},
    dispose(){disposed=true;ground.reset("meadow");},
  };
}
