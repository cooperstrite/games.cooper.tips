import { OCEAN, SURVEYS, ZONES, oceanRandom, sitePosition, hazardPosition } from './submerged-world.js';
import { diveTarget } from './submerged-engine.js';

const pictures = new Map();
function loadPicture(path) {
  if (!pictures.has(path)) pictures.set(path, new Promise(resolve => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = new URL(path, import.meta.url).href; }));
  return pictures.get(path);
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const circle=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);};
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function rounded(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function line(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function label(c,text,x,y,color='#d2eee6',size=10){c.font=`600 ${size}px Inter,system-ui,sans-serif`;c.fillStyle=color;c.textAlign='center';c.fillText(text,x,y);}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function fish(c,x,y,size,color,time,phase=0,flip=1){
  c.save();c.translate(x,y);c.scale(flip,1);const flick=Math.sin(time*5+phase)*.3;
  const g=c.createLinearGradient(0,-size*.5,0,size*.5);g.addColorStop(0,color);g.addColorStop(.5,'#d3e7da');g.addColorStop(1,'#294d66');
  c.fillStyle=g;c.beginPath();c.moveTo(-size*.6,0);c.bezierCurveTo(-size*.25,-size*.5,size*.55,-size*.4,size*.68,0);c.bezierCurveTo(size*.45,size*.35,-size*.2,size*.4,-size*.6,0);c.fill();
  c.fillStyle=color;c.beginPath();c.moveTo(-size*.5,0);c.lineTo(-size*(.95+flick*.1),-size*.36);c.quadraticCurveTo(-size*.85,0,-size*(.95-flick*.1),size*.36);c.closePath();c.fill();
  c.globalAlpha=.65;c.beginPath();c.moveTo(-size*.1,-size*.28);c.lineTo(size*.12,-size*.57);c.lineTo(size*.36,-size*.24);c.fill();c.beginPath();c.moveTo(size*.2,0);c.lineTo(-size*.04,size*(.45+flick*.2));c.lineTo(-size*.1,size*.12);c.fill();
  c.globalAlpha=1;ellipse(c,size*.43,-size*.06,size*.055,size*.06,'#081d2a');ellipse(c,size*.44,-size*.075,size*.018,size*.018,'#e7f9ef');
  line(c,[[size*.29,-size*.22],[size*.25,-size*.04],[size*.28,size*.18]],'#38627088',1);c.restore();
}
function coral(c,x,y,scale,color,seed=1){
  c.save();c.translate(x,y);c.scale(scale,scale);c.lineCap='round';
  const random=oceanRandom(seed),branches=[];
  function branch(x0,y0,angle,length,width,depth){
    const x1=x0+Math.cos(angle)*length,y1=y0+Math.sin(angle)*length;
    branches.push({x0,y0,x1,y1,width});
    if(depth)for(const direction of [-1,1])branch(x1,y1,angle+direction*(.35+random()*.35),length*(.55+random()*.18),width*.64,depth-1);
  }
  branch(0,0,-Math.PI/2,28,7,3);branch(-3,0,-2.25,27,6,3);branch(4,0,-.8,23,5,3);
  for(const b of branches){line(c,[[b.x0+2,b.y0+2],[b.x1+2,b.y1+2]],'#071f2b80',b.width+1);line(c,[[b.x0,b.y0],[b.x1,b.y1]],color,b.width);line(c,[[b.x0-.8,b.y0],[b.x1-.8,b.y1]],'#ffead537',b.width*.25);}
  c.restore();
}
function kelp(c,x,y,height,time,seed=0,deep=false){
  c.save();c.translate(x,y);const sway=Math.sin(time*.7+seed)*height*.1;
  c.strokeStyle=deep?'#368880aa':'#527d51cc';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-sway,-height*.3,sway*1.6,-height*.7,sway,-height);c.stroke();
  for(let i=1;i<8;i++){const t=i/8,cy=-height*t,cx=Math.sin(t*5+time*.7+seed)*sway*.5,side=i%2?1:-1,w=height*(.15-t*.08);
    const g=c.createLinearGradient(cx,cy,cx+side*w,cy-14);g.addColorStop(0,deep?'#2f6e64':'#45673c');g.addColorStop(1,deep?'#76a68a':'#9b9858');c.fillStyle=g;
    c.beginPath();c.moveTo(cx,cy);c.bezierCurveTo(cx+side*w*.8,cy-28,cx+side*w,cy-9,cx+side*w*1.2,cy-22);c.bezierCurveTo(cx+side*w*.9,cy+12,cx+side*w*.25,cy+8,cx,cy);c.fill();
  }c.restore();
}
function rockSprite(rock){
  const canvas=document.createElement('canvas'),pad=8;canvas.width=Math.ceil(rock.rx*2+pad*2);canvas.height=Math.ceil(rock.ry*2+pad*2);
  const c=canvas.getContext('2d'),random=oceanRandom(rock.seed),ox=-rock.x+rock.rx+pad,oy=-rock.y+rock.ry+pad;c.translate(ox,oy);
  c.beginPath();rock.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.save();c.clip();
  const g=c.createLinearGradient(rock.x-rock.rx,rock.y-rock.ry,rock.x+rock.rx*.4,rock.y+rock.ry);g.addColorStop(0,'#73847b');g.addColorStop(.27,'#516465');g.addColorStop(.64,'#29434b');g.addColorStop(1,'#152e3d');c.fillStyle=g;c.fillRect(rock.x-rock.rx,rock.y-rock.ry,rock.rx*2,rock.ry*2);
  for(let i=0;i<35;i++){
    const x=rock.x-rock.rx+random()*rock.rx*2,y=rock.y-rock.ry+random()*rock.ry*2,w=12+random()*50;
    c.fillStyle=i%3===0?'#b7b59d16':'#071e2c22';c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y+random()*8);c.lineTo(x+w*.6,y+18+random()*20);c.lineTo(x-8,y+12);c.fill();
    line(c,[[x,y],[x+w,y+2],[x+w+12,y+20]],'#a8bb9a13',1);
  }
  for(let i=0;i<1500;i++){const x=rock.x-rock.rx+random()*rock.rx*2,y=rock.y-rock.ry+random()*rock.ry*2;c.fillStyle=i%2?'#c9c6ad1e':'#061b2825';c.fillRect(x,y,1+random()*2,1+random()*2);}
  c.restore();c.beginPath();rock.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.strokeStyle='#9fb4a34d';c.lineWidth=1.5;c.stroke();
  return {canvas,dx:-rock.rx-pad,dy:-rock.ry-pad};
}
function station(c,station,time,active){
  const {x,y}=station;c.save();c.translate(x,y);
  glow(c,0,5,120,active?'#72ddc72b':'#62cddf18');
  if(station.id===0){
    c.fillStyle='#152d39';c.beginPath();c.moveTo(-170,-90);c.lineTo(160,-90);c.lineTo(118,-46);c.lineTo(-132,-46);c.closePath();c.fill();
    c.fillStyle='#cbd9cf';c.beginPath();c.moveTo(-175,-95);c.lineTo(162,-95);c.lineTo(147,-75);c.lineTo(-160,-75);c.fill();
    rounded(c,-68,-150,118,56,5,'#c0d3ce');rounded(c,-36,-180,70,36,5,'#e2e8d5');
    for(let i=0;i<5;i++)rounded(c,-58+i*20,-139,13,11,2,'#23566c');
    line(c,[[8,-180],[8,-230],[55,-220]],'#a5bdb6',3);line(c,[[70,-95],[110,-157],[137,-157]],'#91a7a5',4);
    line(c,[[-70,-46],[-70,38],[70,38],[70,-46]],'#80b5ba66',2);label(c,'R / V  HORIZON',0,-58,'#d1dfd7',11);
  }else{
    line(c,[[-78,52],[-84,86],[82,86],[75,52]],'#203d4a',9);rounded(c,-95,40,190,25,7,'#3c6471');rounded(c,-90,39,180,7,3,'#92a5a3');
    const g=c.createLinearGradient(0,-20,0,45);g.addColorStop(0,'#c0d0c2');g.addColorStop(.4,'#87a7a4');g.addColorStop(1,'#304d60');
    c.fillStyle=g;c.beginPath();c.ellipse(0,35,65,55,0,Math.PI,Math.PI*2);c.lineTo(65,40);c.lineTo(-65,40);c.fill();
    for(let i=0;i<4;i++){rounded(c,-45+i*25,9,17,16,4,'#092d47');rounded(c,-42+i*25,11,11,4,2,'#70cce9aa');}
    line(c,[[80,35],[80,-36]],'#8bb7be',3);glow(c,80,-36,22,'#8be2e855');ellipse(c,80,-36,4,4,'#c6f8ed');
  }
  c.strokeStyle=active?'#a1edcdcc':'#7ecfdd70';c.lineWidth=1.4;c.setLineDash([5,8]);circle(c,0,0,89);c.stroke();c.setLineDash([]);
  label(c,station.name.toUpperCase(),0,114,'#c1e6e8',11);label(c,'REPAIR + RECHARGE',0,131,'#81babb',8);c.restore();
}
function survey(c,item,time,active,progress,sonar){
  const {x,y}=sitePosition(item,time),color=SURVEYS[item.type].color;c.save();c.translate(x,y);
  if(!item.done)glow(c,0,0,65,color+'20');
  if(item.type==='coral'){ellipse(c,0,34,45,12,'#203e4d');coral(c,0,32,1.05,'#c28473',item.id.length*123+item.x);}
  if(item.type==='sample'){
    ellipse(c,0,23,36,9,'#203b48');
    if(!item.done)for(let i=0;i<5;i++){const a=i*.8,x0=(i-2)*10,h=20+(i%3)*9;c.fillStyle=['#789d91','#b6bba1','#86a899'][i%3];c.beginPath();c.moveTo(x0-9,18);c.lineTo(x0-5,-h);c.lineTo(x0+3,-h-9);c.lineTo(x0+12,12);c.closePath();c.fill();line(c,[[x0+3,-h-9],[x0+3,15]],'#e1dec277',1);}
  }
  if(item.type==='plankton')for(let i=0;i<19;i++){const a=i*2.4+time*.12,r=9+(i%5)*5,px=Math.cos(a)*r,py=Math.sin(a)*r;glow(c,px,py,9,'#b6edab35');ellipse(c,px,py,1.2+i%2,1.6,'#ccf2b6');}
  if(item.type==='fish')fish(c,0,0,51,'#739bad',time,item.phase,Math.cos(time*.45+item.phase)>0?1:-1);
  if(item.type==='treasure'){
    ellipse(c,0,28,47,9,'#20333f');
    if(!item.done){const g=c.createLinearGradient(-23,-21,23,26);g.addColorStop(0,'#d0b97d');g.addColorStop(.5,'#8d7854');g.addColorStop(1,'#514c41');rounded(c,-27,-10,54,34,5,g);c.fillStyle=g;c.beginPath();c.ellipse(0,-10,27,13,0,Math.PI,Math.PI*2);c.fill();for(const x0 of [-17,14])rounded(c,x0,-18,4,42,1,'#83a199');rounded(c,-4,1,9,13,2,'#d0c69a');line(c,[[-25,7],[25,7]],'#373c3b',2);}
  }
  if(item.done){ellipse(c,34,-26,9,9,'#7cdab52b');line(c,[[30,-26],[33,-23],[39,-30]],'#a9e1bc',2);}
  else{
    c.lineWidth=active?1.7:1;c.strokeStyle=color+(active?'c0':sonar?'90':'45');c.setLineDash([3,7]);circle(c,0,0,48+(sonar?Math.sin(time*2)*3:0));c.stroke();c.setLineDash([]);
    if(active){label(c,SURVEYS[item.type].action,0,-64,color,11);label(c,'HOLD E TO SCAN',0,73,'#dcebe3',8);}
    if(progress>0){c.lineWidth=4;c.strokeStyle='#c3eed1';c.beginPath();c.arc(0,0,52,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);c.stroke();}
  }c.restore();
}
function hazard(c,h,time,near){
  const {x,y}=hazardPosition(h,time);c.save();c.translate(x,y);
  if(h.type==='jelly'){
    glow(c,0,0,65,'#c8a7ed17');const g=c.createRadialGradient(-8,-14,1,0,0,37);g.addColorStop(0,'#ecd1f0ad');g.addColorStop(.45,'#ab8cceaa');g.addColorStop(1,'#5c6d9855');
    c.fillStyle=g;c.beginPath();c.ellipse(0,0,29,24,0,Math.PI,Math.PI*2);c.bezierCurveTo(14,13,-12,12,-29,0);c.fill();
    for(let i=0;i<7;i++){const x0=(i-3)*7;c.strokeStyle=i%2?'#d0bde080':'#82adc074';c.lineWidth=i%2?1:2;c.beginPath();c.moveTo(x0,3);c.bezierCurveTo(x0+Math.sin(time*1.7+i)*13,23,x0+Math.cos(time+i)*10,42,x0+Math.sin(time*1.6+i)*16,55+(i%3)*8);c.stroke();}
    if(near){c.strokeStyle='#e7b5c74a';c.setLineDash([3,6]);circle(c,0,0,65);c.stroke();c.setLineDash([]);}
  }else{
    const hot=Math.sin(time*.8+h.phase)>-.25;
    const g=c.createLinearGradient(-30,0,30,0);g.addColorStop(0,'#243a42');g.addColorStop(.5,'#5a6560');g.addColorStop(1,'#172d3a');c.fillStyle=g;c.beginPath();c.moveTo(-32,37);c.lineTo(-18,-5);c.lineTo(-12,-26);c.lineTo(13,-27);c.lineTo(21,12);c.lineTo(36,37);c.fill();
    ellipse(c,0,-24,13,5,hot?'#dfb17b':'#a78c67');glow(c,0,-25,42,hot?'#e6a66532':'#c3933b13');
    if(hot)for(let i=0;i<15;i++){const t=(time*.55+i/15)%1,px=Math.sin(i*3+t*6)*t*24,py=-28-t*155;ellipse(c,px,py,5+t*19,8+t*17,`rgba(173,188,173,${(1-t)*.09})`);}
    if(near)label(c,hot?'HOT VENT':'VENT COOLING',0,61,'#dab99a',9);
  }c.restore();
}

export function createSubmergedRenderer(canvas,{cover=false}={}) {
  const c=canvas.getContext('2d',{alpha:false}),art={},rockCache=new Map();let width=900,height=560,dpr=1,lastState=null,clock=0,dead=false;
  const camera={x:0,y:0,zoom:1};
  const ready=Promise.all([['sub','./assets/submerged-research-sub.png'],['shallow','./assets/submerged-shallows.png'],['deep','./assets/submerged-depths.png']].map(async([key,path])=>{art[key]=await loadPicture(path);}));
  function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width||canvas.width);height=Math.max(1,r.height||canvas.height);dpr=cover?1:Math.min(2,globalThis.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function backdrop(image,alpha,state){
    if(!image||alpha<=0)return;
    const crop=clamp((state.y-180)/700,0,1)*image.height*.19,iw=image.width,ih=image.height-crop,scale=Math.max(width/iw,height/ih)*1.1,dw=iw*scale,dh=ih*scale;
    const px=(state.x/OCEAN.width-.5)*Math.min(100,(dw-width)*.6),py=Math.sin(state.time*.1)*2;
    c.globalAlpha=alpha;c.drawImage(image,0,crop,iw,ih,(width-dw)/2-px,(height-dh)/2+py,dw,dh);c.globalAlpha=1;
  }
  function drawSub(state,time){
    c.save();c.translate(state.x,state.y);c.rotate(state.tilt);c.scale(state.facing,1);
    const beam=c.createLinearGradient(54,0,410,0);beam.addColorStop(0,'#dff4cc24');beam.addColorStop(.35,'#d1ebc311');beam.addColorStop(1,'#c7e9cd00');c.fillStyle=beam;c.beginPath();c.moveTo(55,-7);c.lineTo(440,-130);c.quadraticCurveTo(475,0,440,130);c.lineTo(55,7);c.closePath();c.fill();
    const moving=Math.hypot(state.vx,state.vy)>12;
    for(let i=0;i<18;i++){const t=(time*(moving?1.25:.35)+i/18)%1;const px=-77-t*(moving?180:52),py=8+Math.sin(i*3+t*6)*9-t*18;c.strokeStyle=`rgba(171,224,232,${(1-t)*.3})`;c.lineWidth=.8;circle(c,px,py,1+t*3+i%2);c.stroke();}
    if(art.sub)c.drawImage(art.sub,-86,-48,172,86);
    else{const body=c.createLinearGradient(0,-25,0,25);body.addColorStop(0,'#ffdc83');body.addColorStop(1,'#9c7439');ellipse(c,0,0,64,26,body);ellipse(c,47,-1,20,24,'#4b9cb3');rounded(c,-40,29,80,5,2,'#324d58');}
    // Independent moving propeller over the rear duct of the sprite.
    c.save();c.translate(-75,1);c.strokeStyle='#8da9ac99';c.lineWidth=2;for(let i=0;i<3;i++){const a=time*(moving?28:7)+i*Math.PI/3;line(c,[[Math.cos(a)*4,Math.sin(a)*17],[-Math.cos(a)*4,-Math.sin(a)*17]],'#718b8d99',2);}c.restore();
    glow(c,62,12,16,'#fff1b83d');ellipse(c,61,11,2,2,'#fff6ce');c.restore();
  }
  function draw(state,dt=0,reduced=false){
    if(dead)return;clock+=Math.max(0,dt);const time=reduced?0:state.phase==='ready'?clock:state.time;
    camera.zoom=cover?1.7:clamp(width/1120,.65,1.1);
    const vw=width/camera.zoom,vh=height/camera.zoom,tx=clamp(state.x-vw*(cover?.43:.45),0,Math.max(0,OCEAN.width-vw)),ty=clamp(state.y-vh*(cover?.52:.46),-190,Math.max(0,OCEAN.height-vh));
    if(lastState!==state||Math.hypot(camera.x-tx,camera.y-ty)>600){camera.x=tx;camera.y=ty;lastState=state;rockCache.clear();}
    else{const blend=1-Math.exp(-Math.max(dt,.016)*5);camera.x+=(tx-camera.x)*blend;camera.y+=(ty-camera.y)*blend;}
    c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#082c42';c.fillRect(0,0,width,height);
    const deep=clamp((state.y-850)/1700,0,1);backdrop(art.shallow,1,state);backdrop(art.deep,deep,state);
    const tint=c.createLinearGradient(0,0,0,height);tint.addColorStop(0,`rgba(2,25,47,${deep*.12})`);tint.addColorStop(1,`rgba(3,17,36,${.2+deep*.12})`);c.fillStyle=tint;c.fillRect(0,0,width,height);
    if(state.y<1300){c.save();c.globalCompositeOperation='screen';for(let i=0;i<6;i++){const x=(i*.21+.05)*width+Math.sin(time*.17+i)*32,w=26+i*7;const ray=c.createLinearGradient(x,0,x+160,height);ray.addColorStop(0,`rgba(176,221,203,${.06*(1-deep)})`);ray.addColorStop(1,'transparent');c.fillStyle=ray;c.beginPath();c.moveTo(x,0);c.lineTo(x+w,0);c.lineTo(x+270,height);c.lineTo(x+130,height);c.closePath();c.fill();}c.restore();}
    c.save();c.scale(camera.zoom,camera.zoom);c.translate(-camera.x,-camera.y);
    const visible=(x,y,r=160)=>x>camera.x-r&&x<camera.x+vw+r&&y>camera.y-r&&y<camera.y+vh+r;
    if(camera.y<75){
      const sky=c.createLinearGradient(0,-190,0,70);sky.addColorStop(0,'#4b97ae');sky.addColorStop(1,'#a7c9be');c.fillStyle=sky;c.fillRect(0,-300,OCEAN.width,370);
      for(let i=0;i<40;i++){const x=i*76;c.beginPath();c.moveTo(x,70+Math.sin(time+i)*2);c.quadraticCurveTo(x+30,75+Math.sin(time+i)*2,x+65,70);c.strokeStyle=i%2?'#d4eee679':'#57a2a8a0';c.lineWidth=i%2?1:3;c.stroke();}
    }
    if(camera.y+vh>3510){const sand=c.createLinearGradient(0,3520,0,3600);sand.addColorStop(0,'#56676500');sand.addColorStop(.6,'#526360');sand.addColorStop(1,'#243f4a');c.fillStyle=sand;c.fillRect(0,3520,OCEAN.width,80);for(let i=0;i<90;i++)line(c,[[i*34,3568+i%5*6],[i*34+22,3566+i%5*6]],'#8ba79a28',1);}
    // Sediment and drifting glints give the scrolling ocean a sense of depth.
    for(let i=0;i<140;i++){const px=((i*317.31+time*(i%3+1)*.9)% (vw+100))+camera.x-50,py=((i*137.93-time*(i%4+1)*1.8+camera.y*.13)%(vh+100)+(vh+100))%(vh+100)+camera.y-50;
      ellipse(c,px,py,i%7===0?1.5:.7,i%7===0?1.5:.7,`rgba(174,218,218,${.08+(i%5)*.025})`);
    }
    for(const flow of state.world.currents)if(visible(flow.x+flow.w/2,flow.y+flow.h/2,flow.w/2)){
      c.save();c.beginPath();c.rect(flow.x,flow.y,flow.w,flow.h);c.clip();
      for(let i=0;i<26;i++){const x=flow.x+((i*127+time*flow.vx*.8)%flow.w+flow.w)%flow.w,y=flow.y+20+(i*83)%(flow.h-40);line(c,[[x,y],[x+Math.sign(flow.vx)*28,y-2]],'#b4dfd22e',1);}
      c.restore();if(visible(flow.x+flow.w/2,flow.y,450))label(c,flow.vx>0?'CROSS CURRENT  >':'<  CROSS CURRENT',flow.x+flow.w/2,flow.y+25,'#a9d0ce66',10);
    }
    for(const rock of state.world.rocks)if(rock.kind!=='wreck'&&visible(rock.x,rock.y,Math.max(rock.rx,rock.ry)+200)){
      if(!rockCache.has(rock))rockCache.set(rock,rockSprite(rock));const sprite=rockCache.get(rock);
      c.drawImage(sprite.canvas,rock.x+sprite.dx,rock.y+sprite.dy);
      if(rock.y<1550)for(let i=0;i<3;i++)kelp(c,rock.x+(i-1)*rock.rx*.33,rock.y-rock.ry*.65,80+(rock.seed+i*13)%110,time,rock.seed+i);
      else if(rock.y>2700){coral(c,rock.x,rock.y-rock.ry*.65,.8,'#578f94',rock.seed);glow(c,rock.x,rock.y-rock.ry-35,60,'#5ae1dc10');}
    }
    // A recognisable wreck provides a landmark in the twilight passage.
    if(visible(590,1460,360)){
      c.save();c.translate(590,1460);c.rotate(.17);const g=c.createLinearGradient(0,-100,0,60);g.addColorStop(0,'#567272');g.addColorStop(1,'#233e4a');c.fillStyle=g;c.beginPath();c.moveTo(-210,-25);c.lineTo(150,-25);c.lineTo(200,-50);c.lineTo(165,42);c.lineTo(-170,42);c.closePath();c.fill();
      for(let i=0;i<10;i++)line(c,[[-165+i*33,-23],[-150+i*32,35]],'#0e2b3b70',4);rounded(c,-70,-76,110,50,5,'#456266');for(let i=0;i<4;i++)rounded(c,-57+i*25,-64,16,16,3,'#102d40');line(c,[[12,-76],[12,-175],[90,-152]],'#658079',4);coral(c,-110,1,.9,'#9a7d7e',231);c.restore();
    }
    for(const stationData of state.world.stations)if(visible(stationData.x,stationData.y,220))station(c,stationData,time,state.docked===stationData.id);
    const target=diveTarget(state);
    for(const item of state.world.items)if(visible(item.x,item.y,100))survey(c,item,time,!item.done&&Math.hypot(item.x-state.x,item.y-state.y)<185,state.scanId===item.id?state.scanProgress:0,state.sonarAge<6&&item.revealed);
    for(const h of state.world.hazards)if(visible(h.x,h.y,220))hazard(c,h,time,Math.hypot(h.x-state.x,h.y-state.y)<210);
    for(let i=0;i<25;i++){
      const x=(i*263+time*(i%2?11:-9)+OCEAN.width*10)%OCEAN.width,y=300+(i*113)%1450;
      if(visible(x,y,50))fish(c,x,y,10+i%4*3,['#4f8e9c','#9fae8f','#638ea1'][i%3],time,i,i%2?1:-1);
    }
    if(state.sonarAge<1.8){c.strokeStyle=`rgba(133,238,219,${(1-state.sonarAge/1.8)*.6})`;c.lineWidth=2/camera.zoom;circle(c,state.sonarX,state.sonarY,state.sonarAge*530);c.stroke();}
    drawSub(state,time);
    if(target&&Math.hypot(target.x-state.x,target.y-state.y)>180){
      const sx=clamp(target.x,camera.x+65,camera.x+vw-65),sy=clamp(target.y,camera.y+105,camera.y+vh-155);
      if(Math.hypot(sx-target.x,sy-target.y)>80){const a=Math.atan2(target.y-state.y,target.x-state.x);c.save();c.translate(sx,sy);c.rotate(a);c.fillStyle=target.kind==='station'?'#9ddccb':'#e5d3a0';c.beginPath();c.moveTo(10,0);c.lineTo(-6,-6);c.lineTo(-3,0);c.lineTo(-6,6);c.closePath();c.fill();c.restore();}
    }
    c.restore();
    const vignette=c.createRadialGradient(width*.5,height*.47,height*.2,width*.5,height*.47,Math.max(width,height)*.7);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#03102188');c.fillStyle=vignette;c.fillRect(0,0,width,height);
    if(state.damageCooldown>.7&&!reduced){c.strokeStyle=`rgba(232,137,110,${(state.damageCooldown-.7)*.6})`;c.lineWidth=8;c.strokeRect(2,2,width-4,height-4);}
  }
  function map(canvas,state,large=false){
    const pixel=large?Math.min(2,globalThis.devicePixelRatio||1):1;
    if(large){const r=canvas.getBoundingClientRect();if(r.width&&r.height){const w=Math.round(r.width*pixel),h=Math.round(r.height*pixel);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}}
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=(large?16:8)*pixel,scale=Math.min((w-pad*2)/OCEAN.width,(h-pad*2)/OCEAN.height),ox=(w-OCEAN.width*scale)/2,oy=(h-OCEAN.height*scale)/2;
    c.clearRect(0,0,w,h);c.fillStyle='#0b2435';c.fillRect(0,0,w,h);c.save();c.translate(ox,oy);c.scale(scale,scale);
    for(const z of ZONES){c.fillStyle=z.color+'33';c.fillRect(0,z.start,OCEAN.width,z.end-z.start);}
    c.strokeStyle='#9abbb417';c.lineWidth=1/scale;for(let y=0;y<OCEAN.height;y+=600)line(c,[[0,y],[OCEAN.width,y]],'#9abbb417',1/scale);
    for(const rock of state.world.rocks){c.fillStyle='#59858277';c.beginPath();rock.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();}
    if(state.trail?.length){c.beginPath();state.trail.forEach((p,i)=>!i||Math.hypot(p.x-state.trail[i-1].x,p.y-state.trail[i-1].y)>450?c.moveTo(p.x,p.y):c.lineTo(p.x,p.y));c.strokeStyle='#97d7c550';c.lineWidth=1.3/scale;c.stroke();}
    const selected=diveTarget(state);
    for(const item of state.world.items){if(!item.revealed&&!large)continue;const r=(large?3.5:2)*pixel/scale;c.fillStyle=item.done?'#8bbfa166':item.revealed?SURVEYS[item.type].color:'#7a9da355';circle(c,item.x,item.y,r);c.fill();if(selected?.id===item.id){c.strokeStyle='#f8e8ba';c.lineWidth=1.4*pixel/scale;circle(c,item.x,item.y,r+3*pixel/scale);c.stroke();}}
    for(const s of state.world.stations){c.fillStyle=s.id===0?'#fff0c5':'#9fe0df';const r=(large?4:3)*pixel/scale;c.fillRect(s.x-r,s.y-r,r*2,r*2);if(large)label(c,['Ship','Reef','Twilight','Vents','Abyss'][s.id],s.x,s.y-9*pixel/scale,'#c6e5e3',10*pixel/scale);}
    c.save();c.translate(state.x,state.y);c.rotate(Math.hypot(state.vx,state.vy)>8?Math.atan2(state.vy,state.vx):state.facing===1?0:Math.PI);const r=(large?7:4)*pixel/scale;c.fillStyle='#fff8d5';c.strokeStyle='#153a4b';c.lineWidth=1.2*pixel/scale;c.beginPath();c.moveTo(r*1.5,0);c.lineTo(-r,-r*.8);c.lineTo(-r*.55,0);c.lineTo(-r,r*.8);c.closePath();c.fill();c.stroke();c.restore();c.restore();
    return {ox,oy,scale};
  }
  return {ready,draw,map,resize,get view(){return {...camera,width,height};},screenToWorld(x,y){return {x:x/camera.zoom+camera.x,y:y/camera.zoom+camera.y};},dispose(){dead=true;observer.disconnect();rockCache.clear();}};
}
