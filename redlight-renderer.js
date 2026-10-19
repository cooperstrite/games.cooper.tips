import { createCanvasSurface } from "./arcade/runtime.js";
import { drawRunnerOverhead } from "./redlight-appearance.js";

export function createRedlight2D(canvas, appearance) {
  const surface=createCanvasSurface(canvas);let width=0,height=0;
  function resize(){({width,height}=surface.resize());}
  resize();
  function draw(race) {
    if(!width||!height)return;
    const ctx=surface.context,w=width,h=height,trackWidth=Math.min(w*.66,540),lane=trackWidth/5;
    const left=(w-trackWidth)/2,right=left+trackWidth,runnerY=h*.76,meters=h/42;
    // Orthographic overhead camera: parallel lanes and constant-size scenery.
    const trackY=distance=>runnerY-(distance-race.distance)*meters;
    function line(points,color,thickness=2){ctx.strokeStyle=color;ctx.lineWidth=thickness;ctx.lineCap="round";ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
    function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
    function box(x,y,width,height,radius,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,width,height,radius);ctx.fill();}
    ctx.fillStyle="#8dac7c";ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#94b483";for(let x=0;x<w;x+=72)ctx.fillRect(x,0,36,h);
    ctx.fillStyle="#6d876759";ctx.fillRect(left-17,0,trackWidth+38,h);
    ctx.fillStyle="#dcd4b6";ctx.fillRect(left-13,0,trackWidth+26,h);
    for(let i=0;i<5;i++){ctx.fillStyle=i===2?"#c68a70":i%2?"#bd795f":"#b7725b";ctx.fillRect(left+i*lane,0,lane,h);}
    ctx.strokeStyle="#794a3b0b";ctx.lineWidth=1;
    for(let y=(race.distance*meters)%10;y<h;y+=10){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();}
    for(let i=0;i<=5;i++)line([[left+i*lane,0],[left+i*lane,h]],"#f5e3be",i===0||i===5?3:2);
    const from=Math.floor((race.distance-14)/5)*5,to=race.distance+42;
    for(let m=from;m<=to;m+=5) {
      const y=trackY(m);if(y<-50||y>h+50)continue;
      if(m>=0&&m%10===0) {
        for(let i=0;i<5;i++)line([[left+i*lane+5,y],[left+i*lane+Math.min(14,lane*.3),y]],"#f3d8b5",2);
        ctx.fillStyle="#335546";ctx.font="600 "+Math.max(10,Math.min(12,w*.028))+"px sans-serif";ctx.textAlign="left";ctx.fillText(m+" m",right+18,y+4);
      }
      if(m>0&&m%20===10) {
        for(let i=0;i<5;i++){const x=left+(i+.5)*lane;line([[x-5,y+5],[x,y],[x+5,y+5]],"#f4dcbb70",2);}
      }
      if(m%10!==0)continue;
      const row=Math.round(m/10);
      for(const side of [-1,1]) {
        const x=side<0?left-left*.48:right+left*.58,r=Math.max(13,Math.min(26,lane*.26));
        ellipse(x+5,y+7,r*1.1,r*.9,"#34563f30");
        ellipse(x,y,r,r*.93,row%2?"#4c7856":"#527f5c");
        ellipse(x-r*.29,y-r*.2,r*.66,r*.7,"#669366");
        ellipse(x+r*.2,y-r*.28,r*.45,r*.5,"#78a06d");
        if(row%3===0) {
          const bx=side<0?left-left*.8:right+left*.84,by=y+meters*3.8;
          box(bx-11,by-7,25,16,3,"#3d584238");
          box(bx-13,by-10,24,14,2,"#7f654c");
          for(let j=0;j<3;j++)box(bx-12,by-9+j*4,22,3,1,"#b59a6a");
        }
      }
    }
    const startY=trackY(0);
    if(startY>-45&&startY<h+30) {
      line([[left,startY],[right,startY]],"#f7e7c8",3);
      ctx.font="bold "+Math.max(13,lane*.23)+"px sans-serif";ctx.textAlign="center";ctx.fillStyle="#f4dcbb";
      for(let i=0;i<5;i++)ctx.fillText(String(i+1),left+(i+.5)*lane,startY+26);
    }
    if(Number.isFinite(race.target)) {
      const finishY=trackY(race.target),cell=trackWidth/20,depth=Math.max(6,Math.min(9,lane*.13));
      if(finishY>-depth*2&&finishY<h+depth*2) {
        ctx.fillStyle="#f5e8c9";ctx.fillRect(left,finishY-depth,trackWidth,depth*2);
        for(let i=0;i<20;i++)for(let j=0;j<2;j++)if((i+j)%2===0){ctx.fillStyle="#304a45";ctx.fillRect(left+i*cell,finishY-depth+j*depth,cell,depth);}
        if(finishY>110) {
          ctx.fillStyle="#fff0d0";ctx.font="bold "+Math.max(15,Math.min(25,lane*.42))+"px sans-serif";ctx.textAlign="center";ctx.fillText("FINISH",w*.5,finishY-depth-10);
        }
      }
      if(finishY<=110) {
        const y=Math.max(96,h*.22),remaining=Math.max(0,Math.ceil(race.target-race.distance));
        box(w*.5-51,y-21,102,43,10,"#f1efdbeb");ctx.textAlign="center";
        ctx.fillStyle="#31554a";ctx.font="bold 11px sans-serif";ctx.fillText("FINISH",w*.5,y-6);
        ctx.font="11px sans-serif";ctx.fillText(remaining+" m ahead",w*.5,y+10);
        line([[w*.5-4,y-28],[w*.5,y-32],[w*.5+4,y-28]],"#e9edcf",2);
      }
    }
    const scale=Math.min(1.3,lane/60,h/340);
    drawRunnerOverhead(ctx,appearance,{x:w*.5,y:runnerY,scale,stride:race.stride,running:race.running});
  }
  return {draw,resize,dispose:()=>surface.dispose()};
}
