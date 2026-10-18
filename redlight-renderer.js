import { createCanvasSurface } from "./arcade/runtime.js";
import { drawRunner } from "./redlight-appearance.js";

export function createRedlight2D(canvas, appearance) {
  const surface=createCanvasSurface(canvas);let width=0,height=0;
  function resize(){({width,height}=surface.resize());}
  resize();
  function draw(race) {
    if(!width||!height)return;
    const ctx=surface.context,w=width,h=height,ground=h*.64;
    const sky=ctx.createLinearGradient(0,0,0,ground);sky.addColorStop(0,"#b9e0e6");sky.addColorStop(1,"#edf2d8");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#fff4ca";ctx.beginPath();ctx.arc(w*.77,h*.19,h*.075,0,Math.PI*2);ctx.fill();
    const scroll=race.distance;
    for(let layer=0;layer<2;layer++) {
      ctx.fillStyle=layer?"#90b79d":"#a6c7b1";ctx.beginPath();ctx.moveTo(0,ground);
      for(let x=0;x<=w+12;x+=12)ctx.lineTo(x,h*(.48+layer*.07)+Math.sin(x/(120-layer*35)+scroll*.006)*h*.04+Math.sin(x/72)*h*.02);
      ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
    }
    for(let i=-1;i<9;i++) {
      const x=((i*157-scroll*1.7)%(w+180)+(w+180))%(w+180)-90,y=ground-9,size=h*(.18+(i%3)*.018);
      ctx.fillStyle="#798771";ctx.fillRect(x-4,y-size*.8,8,size*.8);
      ctx.fillStyle=i%2?"#557e69":"#668e75";
      for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(x,y-size-j*size*.12);ctx.lineTo(x+size*.34-j*4,y-size*.25-j*size*.23);ctx.lineTo(x-size*.34+j*4,y-size*.25-j*size*.23);ctx.closePath();ctx.fill();}
    }
    ctx.fillStyle="#749b73";ctx.fillRect(0,ground,w,h-ground);
    ctx.fillStyle="#d0cdb4";ctx.fillRect(0,ground+3,w,13);
    ctx.strokeStyle="#e1e6cf";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,ground-12);ctx.lineTo(w,ground-12);ctx.stroke();
    for(let i=-1;i<w/65+2;i++){const x=i*65-(scroll*5)%65;ctx.fillStyle="#91a48a";ctx.fillRect(x,ground-27,4,40);}
    const trackY=ground+16;ctx.fillStyle="#b96552";ctx.fillRect(0,trackY,w,h-trackY);
    const trackGradient=ctx.createLinearGradient(0,trackY,0,h);trackGradient.addColorStop(0,"#a85d4b00");trackGradient.addColorStop(1,"#5d3b3d55");ctx.fillStyle=trackGradient;ctx.fillRect(0,trackY,w,h-trackY);
    const footY=h*.88, runnerX=w*.32, meterScale=Math.min(15,w/42);
    for(const y of [trackY+12,h*.77,h*.94]) {ctx.strokeStyle="#f1d9b9";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.font=`600 ${Math.max(11,w*.015)}px sans-serif`;ctx.textAlign="center";
    const start=Math.floor((race.distance-runnerX/meterScale)/10)*10;
    for(let m=start;m<race.distance+(w-runnerX)/meterScale+10;m+=10) {
      if(m<0)continue;const x=runnerX+(m-race.distance)*meterScale;
      ctx.fillStyle="#efcfaa";ctx.fillRect(x,h*.94,2,h*.06);ctx.fillText(`${m} m`,x,h*.985);
    }
    if(Number.isFinite(race.target)) {
      const fx=runnerX+(race.target-race.distance)*meterScale;
      if(fx<w+30&&fx>-30) {
        for(let i=0;i<8;i++)for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%2?"#f7eacb":"#32474b";ctx.fillRect(fx+j*9,trackY+i*(h-trackY)/8,9,(h-trackY)/8);}
        ctx.fillStyle="#314a4a";ctx.fillRect(fx-2,trackY-70,4,70);ctx.fillStyle="#f7eacb";ctx.fillRect(fx,trackY-70,76,26);ctx.fillStyle="#304d4c";ctx.font="bold 12px sans-serif";ctx.fillText("FINISH",fx+38,trackY-52);
      }
    }
    const scale=Math.min(h*.0025,w*.0028), shadowWidth=35*scale;
    ctx.fillStyle="#432f3544";ctx.beginPath();ctx.ellipse(runnerX,footY+4,shadowWidth,7*scale,0,0,Math.PI*2);ctx.fill();
    drawRunner(ctx,appearance,{x:runnerX,y:footY,scale,stride:race.stride,running:race.running});
    // A second trackside light gives the flat view a visible world-space signal.
    const lx=w*.82,ly=ground-90;
    ctx.fillStyle="#405657";ctx.fillRect(lx-3,ly+72,6,ground-ly-72);ctx.beginPath();ctx.roundRect(lx-18,ly,36,80,10);ctx.fill();
    ["red","amber","green"].forEach((name,i)=>{ctx.fillStyle=race.signal===name?["#ff6970","#ffd775","#55edb8"][i]:"#243e3e";ctx.beginPath();ctx.arc(lx,ly+15+i*24,9,0,Math.PI*2);ctx.fill();});
  }
  return {draw,resize,dispose:()=>surface.dispose()};
}
