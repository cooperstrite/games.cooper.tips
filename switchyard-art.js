import { createCanvasSurface } from "./arcade/runtime.js";
import { pointOnEdge } from "./switchyard-network.js";
import { trainPose, routePreview, switchLocked } from "./switchyard-model.js";

export const PALETTES = {
  meadow: { grass:"#c5d99c", light:"#e0e9b9", tree:"#56886c", water:"#79bec9" },
  coast: { grass:"#cbd8ad", light:"#ece3b6", tree:"#4b957a", water:"#70bbc9" },
  river: { grass:"#b4d5a8", light:"#d2e4b7", tree:"#48826a", water:"#71b6ce" },
  alpine: { grass:"#d6dfcf", light:"#edf0dd", tree:"#497d73", water:"#9bc4d1" },
  town: { grass:"#c4d3a2", light:"#e2dfbb", tree:"#668a62", water:"#79b8c6" },
  festival: { grass:"#bfcfa6", light:"#e1dfb5", tree:"#678767", water:"#7aafc7" },
};
export function stationSite(n) { const [dx,dy]=n.heading; return {x:n.x+dy*5.8,y:n.y-dx*5.8}; }
function path(c,edge,start=0) {
  c.beginPath(); let first=true;
  for(const p of edge.samples) if(p.d>=start) { if(first){c.moveTo(p.x,p.y);first=false;}else c.lineTo(p.x,p.y); }
}
function round(c,x,y,w,h,r,fill,stroke) { c.beginPath();c.roundRect(x,y,w,h,r); if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();} }
function ellipse(c,x,y,rx,ry,color) { c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill(); }
function text(c,label,x,y,size=1.5,color="#284339",weight=700) { c.font=`${weight} ${size}px Inter, sans-serif`;c.fillStyle=color;c.textAlign="center";c.textBaseline="middle";c.fillText(label,x,y); }
function terrain(c,s) {
  const pal=PALETTES[s.level.theme];c.fillStyle=pal.grass;c.fillRect(0,0,100,70);
  // Soft fields and a hand-painted paper grain, deterministic between frames.
  for(let i=0;i<12;i++)ellipse(c,(i*27+7)%103,(i*19+9)%73,11+i%4,5+i%3,i%2?pal.light:pal.grass);
  if(s.level.theme==="coast") { c.fillStyle=pal.water;c.beginPath();c.moveTo(94,0);c.bezierCurveTo(90,24,96,41,88,70);c.lineTo(100,70);c.lineTo(100,0);c.fill(); }
  if(["river","alpine","festival"].includes(s.level.theme)) {
    c.beginPath();c.moveTo(47,-4);c.bezierCurveTo(66,22,37,44,58,75);c.lineWidth=9;c.strokeStyle=pal.light;c.stroke();c.lineWidth=6;c.strokeStyle=pal.water;c.stroke();
  }
  for(let i=0;i<340;i++){c.fillStyle=i%3?"#274f3320":"#fffff030";c.fillRect((i*73.17)%100,(i*31.91)%70,.15,.35);}
  if(s.level.theme==="town")for(const [x,y] of [[36,36],[62,34]]){round(c,x-5,y-5,10,10,1,"#d2c7a8");for(let i=0;i<3;i++)round(c,x-4+i*3,y-3,2,5,.4,["#cf9470","#e2bd78","#a0b7a4"][i]);}
}
function rails(c,s) {
  const edges=Object.values(s.network.edges);
  c.lineCap="round";c.lineJoin="round";
  for(const e of edges){path(c,e);c.lineWidth=3.25;c.strokeStyle="#62736125";c.stroke();c.lineWidth=2.8;c.strokeStyle="#b5aa88";c.stroke();}
  for(const e of edges){
    c.strokeStyle="#796750";c.lineWidth=.42;
    for(let d=0;d<e.length;d+=1.5){const p=pointOnEdge(e,d);c.beginPath();c.moveTo(p.x-p.dy*1.15,p.y+p.dx*1.15);c.lineTo(p.x+p.dy*1.15,p.y-p.dx*1.15);c.stroke();}
    for(const side of [-1,1]){c.beginPath();e.samples.forEach((p,i)=>{const a=e.samples[Math.max(0,i-1)],b=e.samples[Math.min(e.samples.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;const x=p.x-dy/l*.68*side,y=p.y+dx/l*.68*side;i?c.lineTo(x,y):c.moveTo(x,y);});c.lineWidth=.29;c.strokeStyle="#465854";c.stroke();c.lineWidth=.12;c.strokeStyle="#e3e7cf";c.stroke();}
    for(let d=13;d<e.length-7;d+=23){const p=pointOnEdge(e,d);c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.strokeStyle="#eef2d7";c.lineWidth=.22;c.beginPath();c.moveTo(-.7,-.35);c.lineTo(0,0);c.lineTo(-.7,.35);c.stroke();c.restore();}
  }
  for(const p of s.network.crossings){c.save();c.translate(p.x,p.y);c.rotate(Math.PI/4);c.setLineDash([.4,.4]);c.lineWidth=.18;round(c,-2,-2,4,4,.2,null,"#fff1a4");c.restore();}
}
function scenery(c,s) {
  const pal=PALETTES[s.level.theme];
  for(const p of s.network.scenery){c.save();c.translate(p.x,p.y);c.scale(p.size,p.size);ellipse(c,.4,.8,1.7,1,"#234b3a20");
    if(p.kind==="house") {round(c,-1.6,-1.3,3.2,2.4,.25,"#edcd99");c.fillStyle="#af7257";c.beginPath();c.moveTo(-2,-1);c.lineTo(0,-2.7);c.lineTo(2,-1);c.fill();round(c,-.3,0,.6,1,.08,"#6d8d89");}
    else if(p.kind==="pine"){c.fillStyle="#80694f";c.fillRect(-.18,0,.36,1);for(let i=0;i<3;i++){c.fillStyle=i===2?"#84a797":pal.tree;c.beginPath();c.moveTo(0,-3.2+i*.8);c.lineTo(-1.5+i*.25,.4-i*.35);c.lineTo(1.5-i*.25,.4-i*.35);c.fill();}}
    else {c.fillStyle="#8a7755";c.fillRect(-.17,0,.34,1);ellipse(c,0,-.6,1.5,1.65,pal.tree);ellipse(c,-.4,-1.1,.85,.9,"#95b47c");ellipse(c,.8,-.3,.6,.75,"#6d9a6d");}c.restore();
  }
}
function stations(c,s) {
  for(const n of s.network.stations){const p=stationSite(n);c.save();c.translate(n.x,n.y);c.rotate(Math.atan2(n.heading[1],n.heading[0]));round(c,-5,-3.1,10,1.5,.35,"#bfb598");round(c,-4.9,-1.9,9.8,.25,.1,"#fff1bd");c.restore();
    ellipse(c,p.x+.6,p.y+1.6,4,1.1,"#284d3620");round(c,p.x-3.4,p.y-1.5,6.8,3.3,.4,"#fff0cf");round(c,p.x-3.8,p.y-2,7.6,1.4,.25,n.color);round(c,p.x-.5,p.y+.3,1,1.5,.15,"#446e6c");
    for(const dx of [-2,2])round(c,p.x+dx-.55,p.y-.1,1.1,.9,.15,"#87bdc5");
    const labelY=Math.max(1.65,p.y-3.5);round(c,p.x-5,labelY-1.35,10,2.7,.7,"#fff9e9");text(c,`${n.icon}  ${n.short}`,p.x,labelY,1.35,n.color);
    for(let i=0;i<3;i++){const dx=n.heading[0]*(i-1)*1.15+n.heading[1]*2.6,dy=n.heading[1]*(i-1)*1.15-n.heading[0]*2.6;ellipse(c,n.x+dx,n.y+dy,.25,.35,["#d1765d","#497f9c","#8a76ae"][i]);ellipse(c,n.x+dx,n.y+dy-.38,.23,.23,"#f1cd9a");}
  }
  if(s.level.theme==="festival")for(const n of s.network.stations){const p=stationSite(n);c.strokeStyle="#6b7468";c.lineWidth=.12;c.beginPath();c.moveTo(p.x-5,p.y+2.4);c.quadraticCurveTo(p.x,p.y+4,p.x+5,p.y+2.4);c.stroke();for(let i=0;i<6;i++){c.fillStyle=["#e98671","#eec56b","#84b8c4"][i%3];c.beginPath();c.moveTo(p.x-4+i*1.5,p.y+3);c.lineTo(p.x-3+i*1.5,p.y+3);c.lineTo(p.x-3.5+i*1.5,p.y+4);c.fill();}}
}
function carriage(c,color,coach=false){
  ellipse(c,.3,.5,coach?2.2:2.6,1.2,"#203c3530");
  for(const x of [-1.4,1.4])for(const y of [-.93,.93])round(c,x-.4,y-.25,.8,.5,.18,"#364b49");
  c.lineWidth=.13;round(c,-2,-.9,4,1.8,.38,color,"#294a45");
  if(coach){round(c,-1.7,-.63,3.4,1.26,.3,"#fae6b1");for(let i=0;i<3;i++)round(c,-1.4+i,-.48,.7,.96,.12,"#86bac3");}
  else {round(c,-1.9,-1.04,1.8,2.08,.22,"#fff0c8");round(c,-1.65,-.72,1.3,1.44,.15,color);round(c,-.2,-.65,2.25,1.3,.5,color);for(const x of [.1,1.3]){c.strokeStyle="#ffe8b0";c.lineWidth=.15;c.beginPath();c.moveTo(x,-.6);c.lineTo(x,.6);c.stroke();}ellipse(c,1.25,0,.35,.35,"#394f49");round(c,2,-.35,.4,.7,.12,"#fff5b6");round(c,-1.5,-.65,1,.4,.08,"#aad2d5");}
}
function train(c,s,t,selected,time) {
  const p=trainPose(s,t),coach=trainPose(s,t,5.7);
  c.strokeStyle="#4d5e50";c.lineWidth=.35;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(coach.x,coach.y);c.stroke();
  for(const [pose,isCoach] of [[coach,true],[p,false]]) {c.save();c.translate(pose.x,pose.y);c.rotate(pose.angle);if(selected){c.lineWidth=.3;round(c,-2.4,-1.35,4.9,2.7,.6,null,"#fffbd0");}carriage(c,t.color,isCoach);c.restore();}
  if(t.waiting==="moving"&&s.phase==="playing"&&!s.paused)for(let i=0;i<3;i++){const age=((time*.7+i/3)%1);ellipse(c,p.x-p.dx*age*3,p.y-p.dy*age*3-1-age*2,.2+age*.5,.3+age*.5,`rgba(255,252,225,${(1-age)*.55})`);}
  const n=s.network.nodes[t.destination];round(c,p.x-3.5,p.y-4.3,7,2.3,.65,selected?"#254d44":"#fff8e3");text(c,`${t.id} > ${n.icon}`,p.x,p.y-3.1,1.5,selected?"#fff9df":"#294e43");
}
function explosion(c,s,reduced){
  if(!s.crash)return;const {x,y,age}=s.crash;
  c.save();c.translate(x,y);
  for(let i=0;i<14;i++){const a=i*2.4,progress=Math.min(1,age*.75),r=progress*(3+i%4);const fade=Math.max(0,1-age/3.8);ellipse(c,Math.cos(a)*r,Math.sin(a)*r-age*.4,(.7+age*.7)*fade,(.7+age)*fade,i%2?"#64716caa":"#8d9280aa");}
  if(age<1.7){const r=(reduced?3:1+Math.sin(Math.min(1,age*2)*Math.PI*.65)*5)*(1-age/2);c.fillStyle="#ee8650";c.beginPath();for(let i=0;i<24;i++){const a=i*Math.PI/12,d=r*(i%2?.6:1);i?c.lineTo(Math.cos(a)*d,Math.sin(a)*d):c.moveTo(Math.cos(a)*d,Math.sin(a)*d);}c.closePath();c.fill();ellipse(c,0,0,r*.55,r*.6,"#ffe6a0");}
  c.restore();
}
export function createRailwayMap(canvas,{interactive=true}={}) {
  const surface=createCanvasSurface(canvas),c=surface.context,back=document.createElement("canvas");
  let width=0,height=0,scale=1,ox=0,oy=0,cached=null,current=null;
  function resize(){({width,height}=surface.resize());scale=Math.min(width/100,height/70);ox=(width-100*scale)/2;oy=(height-70*scale)/2;cached=null;}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function draw(s,selected,time=0,reduced=false){
    current=s;if(!width||!height)return;
    if(cached!==s.network){back.width=canvas.width;back.height=canvas.height;const b=back.getContext("2d"),ratio=canvas.width/width;b.scale(ratio,ratio);b.fillStyle=PALETTES[s.level.theme].grass;b.fillRect(0,0,width,height);b.translate(ox,oy);b.scale(scale,scale);terrain(b,s);rails(b,s);scenery(b,s);stations(b,s);cached=s.network;}
    c.clearRect(0,0,width,height);c.drawImage(back,0,0,width,height);c.save();c.translate(ox,oy);c.scale(scale,scale);
    const selectedTrain=s.trains.find(t=>t.id===selected)||s.trains[0];
    if(interactive){c.lineWidth=.35;c.strokeStyle="#f5c563";c.lineCap="round";c.setLineDash([.7,.7]);c.lineDashOffset=-time*.6;for(const {edge,distance} of routePreview(s,selectedTrain)){path(c,edge,distance);c.stroke();}c.setLineDash([]);}
    for(const n of s.network.junctions){const sw=s.switches[n.id],locked=switchLocked(s,n.id);const x=n.x+n.heading[1]*3.8,y=n.y-n.heading[0]*3.8;
      c.lineWidth=.25;round(c,x-2.3,y-1.6,4.6,3.2,1,"#fff7dc",locked?"#a49062":"#42695a");text(c,n.id,x,y,1.5);ellipse(c,x+2.8,y,.85,.85,"#2c5046");ellipse(c,x+2.8,y,.55,.55,sw.green?"#a9de87":"#ee715d");
      const e=s.network.edges[n.out[sw.choice]],p=pointOnEdge(e,4);c.strokeStyle="#f5c563";c.lineWidth=.55;c.beginPath();c.moveTo(n.x,n.y);c.lineTo(p.x,p.y);c.stroke();
    }
    for(const t of [...s.trains].sort((a,b)=>trainPose(s,a).y-trainPose(s,b).y))train(c,s,t,t.id===selected,time);
    explosion(c,s,reduced);c.restore();
  }
  function hit(clientX,clientY){if(!current||!scale)return null;const r=canvas.getBoundingClientRect(),x=(clientX-r.left-ox)/scale,y=(clientY-r.top-oy)/scale;
    for(const t of current.trains){const p=trainPose(current,t);if(Math.hypot(x-p.x,y-p.y)<4)return {kind:"train",id:t.id};}
    for(const n of current.network.junctions){if(Math.hypot(x-(n.x+n.heading[1]*3.8),y-(n.y-n.heading[0]*3.8))<4||Math.hypot(x-n.x,y-n.y)<2)return {kind:"junction",id:n.id};}return null;
  }
  return {draw,hit,resize,dispose(){observer.disconnect();surface.dispose();back.width=back.height=0;}};
}
