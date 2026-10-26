import { TUG_ARENAS, TUG_MATCH_RULES } from "./cats-dogs-engine.js";

export function createTugRenderer(canvas, { reducedMotion = false } = {}) {
  const context = canvas.getContext("2d"), images = {}, W = 1200, H = 675;
  let disposed = false, drift = 0, pulse = 0, clock = 0, victoryAge = 0, previousPhase = "ready";
  const sources = { park: "assets/cats-dogs-park-v2.jpg", beach: "assets/cats-dogs-beach-v2.jpg", cats: "assets/cats-dogs-cat-v2.png", dogs: "assets/cats-dogs-dog-v2.png" };
  const ready = Promise.all(Object.entries(sources).map(([key, src]) => new Promise(resolve => {
    const img = new Image(); img.onload = () => { if (!disposed) images[key] = img; resolve(true); }; img.onerror = () => resolve(false); img.src = src;
  })));
  function ellipse(x, y, rx, ry, fill) { context.fillStyle = fill; context.beginPath(); context.ellipse(x,y,rx,ry,0,0,Math.PI*2); context.fill(); }
  function roundRect(x,y,w,h,r,fill) { context.fillStyle=fill; context.beginPath();context.roundRect(x,y,w,h,r);context.fill(); }
  function cover(img) {
    const scale = Math.max(W/img.width,H/img.height); context.drawImage(img,(W-img.width*scale)/2,(H-img.height*scale)/2,img.width*scale,img.height*scale);
  }
  function draw(s, dt = 0) {
    if (!context || disposed) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1), width = Math.max(1, Math.round(canvas.clientWidth*ratio)), height = Math.round(width*H/W);
    if (canvas.width !== width || canvas.height !== height) { canvas.width=width;canvas.height=height; }
    context.setTransform(width/W,0,0,height/H,0,0);
    if (!s.paused && !reducedMotion) clock += dt;
    const target = s.position / TUG_MATCH_RULES.target * 155;
    drift = reducedMotion ? target : drift + (target - drift) * Math.min(1,dt*8);
    pulse = Math.max(0,pulse-dt*3);
    if (s.phase !== previousPhase) { if (s.phase === "matchEnd") victoryAge=0; previousPhase=s.phase; }
    if (s.phase === "matchEnd" && !s.paused) victoryAge+=dt;
    const arena = TUG_ARENAS[s.arena], bg=images[arena.backdrop];
    if (bg) cover(bg); else { const g=context.createLinearGradient(0,0,0,H);g.addColorStop(0,"#bde2d7");g.addColorStop(1,"#8eab64");context.fillStyle=g;context.fillRect(0,0,W,H); }
    if (s.arena === "moon") { context.fillStyle="#14263b99";context.fillRect(0,0,W,H);ellipse(1010,145,30,30,"#ffebbd");ellipse(1022,137,28,28,"#23384e"); }
    const shade=context.createLinearGradient(0,0,0,H);shade.addColorStop(0,"#092b273a");shade.addColorStop(.45,"#092b2700");shade.addColorStop(1,"#102d2940");context.fillStyle=shade;context.fillRect(0,0,W,H);
    // Chalk arena markings and the two win posts anchor the rope in the world.
    context.strokeStyle="#fff8dc99";context.lineWidth=3;context.setLineDash([10,10]);context.beginPath();context.ellipse(600,555,490,66,0,0,Math.PI*2);context.stroke();context.setLineDash([]);
    for(const x of [445,755]) { roundRect(x-4,444,8,100,4,"#765236");context.fillStyle=x<600?"#e47d57":"#429eaa";context.beginPath();context.moveTo(x,446);context.lineTo(x+37,455);context.lineTo(x,472);context.closePath();context.fill();ellipse(x,548,18,5,"#1e3b2922"); }
    const bounce = reducedMotion || s.paused ? 0 : Math.sin(clock*3)*2;
    const pullJump = reducedMotion ? 0 : Math.sin(pulse*Math.PI)*7;
    // Visible character paws sit at these rope anchors; all motion shares them.
    const catX=326+drift, dogX=875+drift;
    ellipse(catX-14,553,113,20,"#1831223a");ellipse(dogX+15,553,123,20,"#1831223a");
    const pose = (side,x) => ({x,y:550+bounce-(s.lastBeat?.pulls[side]?pullJump:0)-(s.winner===side&&!reducedMotion?Math.abs(Math.sin(victoryAge*5))*20:0),lean:!reducedMotion&&s.lastBeat?.pulls[side]?(side==="cats"?-1:1)*pulse*.035:0});
    const catPose=pose("cats",catX),dogPose=pose("dogs",dogX);
    const hand=(p,x,y)=>({x:p.x+x*Math.cos(p.lean)-y*Math.sin(p.lean),y:p.y+x*Math.sin(p.lean)+y*Math.cos(p.lean)});
    const catHand=hand(catPose,160,-227),dogHand=hand(dogPose,-164,-236);
    const left=catHand.x,right=dogHand.x,center=(left+right)/2,pawY=(catHand.y+dogHand.y)/2;
    context.lineCap="round";
    const ropePath=()=>{context.beginPath();context.moveTo(left,catHand.y);context.bezierCurveTo(left+55,catHand.y+4,center-40,pawY+17,center,pawY+14);context.bezierCurveTo(center+40,pawY+17,right-55,dogHand.y+4,right,dogHand.y);};
    context.strokeStyle="#513e2a77";context.lineWidth=16;ropePath();context.stroke();context.strokeStyle="#d8b783";context.lineWidth=11;ropePath();context.stroke();context.strokeStyle="#fff0c9";context.lineWidth=3;context.setLineDash([5,9]);ropePath();context.stroke();context.setLineDash([]);
    context.save();context.translate(center,pawY+13);context.rotate(reducedMotion?0:Math.sin(clock*2)*.06);context.fillStyle="#ed7959";context.beginPath();context.moveTo(-10,-10);context.lineTo(10,-10);context.lineTo(12,58);context.lineTo(0,46);context.lineTo(-12,58);context.closePath();context.fill();context.restore();
    for(const [side,x] of [["cats",catX],["dogs",dogX]]) {
      const img=images[side],p=side==="cats"?catPose:dogPose;
      context.save();context.translate(p.x,p.y);context.rotate(p.lean);
      if(img) { if(s.arena==="moon")context.filter="brightness(.88) saturate(.88)";context.drawImage(img,-225,-420,450,450); }
      else { ellipse(0,-120,75,105,side==="cats"?"#dd8a45":"#b9824d");ellipse(0,-220,80,70,"#edc18c"); }
      context.restore();
      if (s.sides[side].streak===3) { context.strokeStyle="#ffdf83";context.lineWidth=3;context.beginPath();context.ellipse(x,549,111,21,0,0,Math.PI*2);context.stroke(); }
    }
    // Slow drifting pollen / fireflies keep the backdrop alive without obscuring play.
    if(!reducedMotion) for(let i=0;i<18;i++){const x=(i*131+clock*(9+i%4))%W,y=80+(i*71)%390+Math.sin(clock*.6+i)*12;ellipse(x,y,s.arena==="moon"?2.2:1.7,s.arena==="moon"?2.2:1.7,s.arena==="moon"?"#ffe7a9bb":"#fff3ce77");}
    if(s.phase==="matchEnd"&&!reducedMotion) for(let i=0;i<75;i++) {
      const x=(i*173+Math.sin(clock+i)*26)%W,y=(victoryAge*(48+i%7*11)+i*41)%H;
      context.save();context.translate(x,y);context.rotate(clock*(i%2?1:-1)+i);context.fillStyle=["#f6d17c","#e98463","#71c4bf","#fff7dc"][i%4];context.fillRect(-3,-5,6,10);context.restore();
    }
  }
  return { ready, draw, hit() { pulse=1; }, dispose() { disposed=true; } };
}
