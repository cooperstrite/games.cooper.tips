import { createCanvasSurface } from "./arcade/runtime.js";
import { drawRunner } from "./redlight-appearance.js";

export function createRedlight2D(canvas, appearance) {
  const surface=createCanvasSurface(canvas);let width=0,height=0;
  function resize(){({width,height}=surface.resize());}
  resize();
  function draw(race) {
    if(!width||!height)return;
    const ctx=surface.context,w=width,h=height,horizon=h*.29,footY=h*.88;
    const project=(x,z,y=0)=>{const scale=12/(12+z);return{x:w*.5+x*w*.13*scale,y:horizon+(footY-horizon-y*h*.12)*scale,scale};};
    function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();}
    function line(points,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
    const sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,"#b9e0e6");sky.addColorStop(1,"#edf2d8");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#fff4ca";ctx.beginPath();ctx.arc(w*.77,h*.12,h*.055,0,Math.PI*2);ctx.fill();
    for(let layer=0;layer<2;layer++) {
      ctx.fillStyle=layer?"#90b79d":"#a6c7b1";ctx.beginPath();ctx.moveTo(0,horizon);
      for(let x=0;x<=w+12;x+=12)ctx.lineTo(x,h*(.21+layer*.035)+Math.sin(x/120)*h*.025+Math.sin(x/72)*h*.015);
      ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
    }
    ctx.fillStyle="#83a77b";ctx.fillRect(0,horizon,w,h-horizon);
    polygon([project(-4.8,180),project(4.8,180),project(4.8,-2.4),project(-4.8,-2.4)],"#d9d1b4");
    polygon([project(-4.5,180),project(4.5,180),project(4.5,-2.4),project(-4.5,-2.4)],"#b96552");
    const trackShade=ctx.createLinearGradient(0,horizon,0,h);trackShade.addColorStop(0,"#e1b37b00");trackShade.addColorStop(1,"#53363b40");
    polygon([project(-4.5,180),project(4.5,180),project(4.5,-2.4),project(-4.5,-2.4)],trackShade);
    for(let lane=0;lane<=5;lane++)line([project(-4.5+lane*1.8,180),project(-4.5+lane*1.8,-2.4)],"#f6dfbd",Math.max(1,w*.002));
    for(const side of [-1,1])line([project(side*5.6,160,.65),project(side*5.6,-2.4,.65)],"#d6ddc5",2);
    // Scenery grows toward the viewer as the runner advances along the lane.
    const first=Math.floor(race.distance/10)*10;
    for(let m=first+150;m>=first;m-=10) {
      const z=m-race.distance;if(z<-2.4)continue;
      for(const side of [-1,1]) {
        const p=project(side*5.6,z),top=project(side*5.6,z,.9);
        line([p,top],"#8e9e87",Math.max(1,p.scale*4));
        const tree=project(side*(7.2+(m/10%3)*1.3),z),size=h*.28*tree.scale;
        ctx.fillStyle="#79816a";ctx.fillRect(tree.x-size*.035,tree.y-size*.55,size*.07,size*.55);
        for(let j=0;j<3;j++)polygon([{x:tree.x,y:tree.y-size*(1+j*.13)},{x:tree.x+size*(.34-j*.045),y:tree.y-size*(.18+j*.24)},{x:tree.x-size*(.34-j*.045),y:tree.y-size*(.18+j*.24)}],m%20?"#557e69":"#668e75");
      }
      if(m>0) {
        for(let lane=-2;lane<=2;lane++)line([project(lane*1.8-.65,z),project(lane*1.8+.65,z)],"#e8caa7",Math.max(1,project(0,z).scale*2));
        const mark=project(4.1,z);if(mark.scale>.25){ctx.fillStyle="#f4e1bd";ctx.font=`600 ${Math.max(9,14*mark.scale)}px sans-serif`;ctx.textAlign="center";ctx.fillText(`${m} m`,mark.x,mark.y-4);}
      }
    }
    if(Number.isFinite(race.target)) {
      const z=race.target-race.distance;
      if(z<180) {
        for(let i=0;i<12;i++)for(let j=0;j<2;j++) {
          const x=-4.5+i*.75,near=z+j*.45;
          polygon([project(x,near),project(x+.75,near),project(x+.75,near+.45),project(x,near+.45)],(i+j)%2?"#f5e6c6":"#344b4c");
        }
        for(const side of [-1,1])line([project(side*4.7,z),project(side*4.7,z,3.8)],"#f3e5c4",Math.max(2,project(0,z).scale*5));
        polygon([project(-4.7,z,3.8),project(4.7,z,3.8),project(4.7,z,3.15),project(-4.7,z,3.15)],"#254f4d");
        const label=project(0,z,3.34);ctx.font=`bold ${Math.max(8,24*label.scale)}px sans-serif`;ctx.textAlign="center";ctx.fillStyle="#fff2cd";ctx.fillText("FINISH",label.x,label.y);
      }
    }
    for(const side of [-1,1]) {
      const p=project(side*5.5,9),size=p.scale,top=project(side*5.5,9,2.4);
      line([p,top],"#405657",4*size);ctx.fillStyle="#344d4d";ctx.beginPath();ctx.roundRect(top.x-15*size,top.y,30*size,76*size,6*size);ctx.fill();
      ["red","amber","green"].forEach((name,i)=>{ctx.fillStyle=race.signal===name?["#ff6970","#ffd775","#55edb8"][i]:"#1f3837";ctx.beginPath();ctx.arc(top.x,top.y+(14+i*24)*size,8*size,0,Math.PI*2);ctx.fill();});
    }
    const scale=Math.min(h*.0025,w*.003),runnerX=w*.5;
    ctx.fillStyle="#432f3544";ctx.beginPath();ctx.ellipse(runnerX,footY+4,35*scale,8*scale,0,0,Math.PI*2);ctx.fill();
    drawRunner(ctx,appearance,{x:runnerX,y:footY,scale,stride:race.stride,running:race.running,view:"back"});
  }
  return {draw,resize,dispose:()=>surface.dispose()};
}
