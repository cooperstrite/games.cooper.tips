import { TAU, DASH_PEAK, ORBIT_SECTORS, orbitRadius, orbitSpeed, orbitWidth, gateAngle, orbitCue } from './orbit-engine.js';

const W = 960, H = 640, CX = 480, CY = 326, R = 234;
const fract = n => n - Math.floor(n);
const hash = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b);return mix(mix(hash(a+b*157),hash(a+1+b*157),u),mix(hash(a+(b+1)*157),hash(a+1+(b+1)*157),u),v);}
const terrainNoise=(x,y)=>noise(x,y)*.58+noise(x*2.1+3,y*2.1)*.26+noise(x*4.3,y*4.3+5)*.11+noise(x*9,y*9)*.05;
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
function circle(c, x, y, radius, fill) { c.beginPath(); c.arc(x, y, radius, 0, TAU); c.fillStyle = fill; c.fill(); }
function arc(c, radius, start, end, color, width = 1) { c.beginPath(); c.arc(CX, CY, radius, start, end); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
function line(c, points, fill, stroke) { c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();} }
function label(c, text, x, y, color = '#9dbdce', size = 10, align = 'center') { c.font = `600 ${size}px system-ui`; c.textAlign = align; c.fillStyle = color; c.fillText(text, x, y); }

// A shaded spherical texture rather than a flat circle. It is built once per
// destination; the animation loop only composites the cached artwork.
function makePlanet(sector) {
  const size = 300, canvas = document.createElement('canvas'); canvas.width=canvas.height=size;
  const c=canvas.getContext('2d'), image=c.createImageData(size,size), ocean=rgb(sector.ocean), land=rgb(sector.land);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=(x-150)/148,ny=(y-150)/148,r=nx*nx+ny*ny;if(r>1)continue;
    const z=Math.sqrt(1-r),lon=Math.atan2(nx,z)*2.6,lat=Math.asin(ny)*2.8;
    const terrain=terrainNoise(lon*.8+12,lat*.8+5);
    const continent=sector===ORBIT_SECTORS[1]?(.5+.5*Math.sin(lat*7+Math.sin(lon*2)*.4)):Math.max(0,Math.min(1,(terrain-.48)*16));
    const cloud=Math.max(0,terrainNoise(lon*1.6+Math.sin(lat)*1.4+23,lat*5+17)-.55)*1.7;
    const light=Math.max(.11,(-nx*.52-ny*.46+z*.7)),grain=.96+hash(x+y*size)*.08,index=(y*size+x)*4;
    for(let k=0;k<3;k++)image.data[index+k]=mix(mix(ocean[k],land[k],continent),235,cloud)*light*grain;
    image.data[index+3]=Math.min(255,(1-r)*2200);
  }
  c.putImageData(image,0,0);return canvas;
}

export function createOrbitRenderer(canvas) {
  const c=canvas.getContext('2d'),background=document.createElement('canvas'); background.width=W;background.height=H;
  let sectorId=-1,theme='',planet=null,particles=[],trail=[],lastTime=-1,elapsed=0,wonAt=0;
  function backgroundArt(id,light){
    const b=background.getContext('2d'),sector=ORBIT_SECTORS[id],g=b.createLinearGradient(0,0,W,H);
    g.addColorStop(0,light?'#e5eff3':'#081928');g.addColorStop(.55,light?'#d9e3f0':'#091123');g.addColorStop(1,light?'#e8e1f2':'#16132e');b.fillStyle=g;b.fillRect(0,0,W,H);
    for(const[x,y,r,col]of [[170,180,390,light?'#89b9ca36':'#195c7540'],[810,450,430,light?'#aaa0d539':'#5b296546'],[650,80,270,light?'#ffffff66':'#23467b25']]){
      const fog=b.createRadialGradient(x,y,0,x,y,r);fog.addColorStop(0,col);fog.addColorStop(1,'#00000000');b.fillStyle=fog;b.fillRect(0,0,W,H);
    }
    for(let i=0;i<210;i++){
      const x=hash(i+3)*W,y=hash(i+700)*H,r=hash(i+900)*1.2+.2;
      circle(b,x,y,r,light?`rgba(45,85,113,${.2+hash(i)*.4})`:`rgba(198,226,248,${.2+hash(i)*.65})`);
      if(i%21===0){b.strokeStyle=light?'#577c9835':'#d9f3ff35';b.lineWidth=.7;b.beginPath();b.moveTo(x-4,y);b.lineTo(x+4,y);b.moveTo(x,y-4);b.lineTo(x,y+4);b.stroke();}
    }
    // Far-away moons and a quiet navigation grid establish depth.
    const moon=b.createRadialGradient(104,495,2,122,510,30);moon.addColorStop(0,light?'#b7d0d8':'#6b8d9a');moon.addColorStop(1,light?'#c0d4df':'#14293c');circle(b,122,510,27,moon);
    b.strokeStyle=light?'#536f8610':'#a6d1f008';b.lineWidth=1;for(let x=0;x<W;x+=60){b.beginPath();b.moveTo(x,0);b.lineTo(x,H);b.stroke();}
    for(let y=0;y<H;y+=60){b.beginPath();b.moveTo(0,y);b.lineTo(W,y);b.stroke();}
    planet=makePlanet(sector);
  }
  function burst(angle,type,reduced){
    const x=CX+Math.cos(angle)*R,y=CY+Math.sin(angle)*R;
    for(let i=0;i<(reduced?10:type==='win'?100:38);i++){
      const a=hash(i+elapsed*70)*TAU,v=type==='win'?70+hash(i+4)*220:30+hash(i+4)*140;
      particles.push({x:type==='win'?CX:x,y:type==='win'?CY:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1.1+hash(i)*.6,max:1.7,size:2+hash(i+7)*3,color:type==='miss'?'#ffa270':i%3?'#79eef0':'#ffda86'});
    }
    particles=particles.slice(-180);
  }
  function ship(x,y,angle,boost,time){
    c.save();c.translate(x,y);c.rotate(angle);
    const exhaust=boost?38:18;
    const fire=c.createLinearGradient(-6,0,-exhaust-12,0);fire.addColorStop(0,'#f3ffff');fire.addColorStop(.3,'#77edff');fire.addColorStop(1,'#23b7ff00');
    line(c,[[-8,-5],[-exhaust-12-Math.sin(time*25)*3,0],[-8,5]],fire);
    line(c,[[-12,-7],[-18,-17],[1,-7],[14,0],[1,7],[-18,17],[-12,7]],'#547889','#c2dfdf');
    const body=c.createLinearGradient(0,-7,0,7);body.addColorStop(0,'#f2f4e9');body.addColorStop(.48,'#dce7e0');body.addColorStop(1,'#8db5c0');
    line(c,[[21,0],[1,-7],[-13,-6],[-10,0],[-13,6],[1,7]],body,'#c9f3f1');
    line(c,[[10,0],[0,-4],[-5,-3],[-5,3],[0,4]],'#193b55','#7bdbe9');
    c.fillStyle='#efba6c';c.fillRect(-12,-13,5,2);c.fillRect(-12,11,5,2);circle(c,-11,0,2,'#e9ffff');c.restore();
  }
  function draw(s,seconds=0,{light=false,reduced=false}={}){
    elapsed+=s.paused?0:Math.min(seconds,.05);
    const id=s.sector%3,sector=ORBIT_SECTORS[id];
    if(id!==sectorId||theme!==light){sectorId=id;theme=light;backgroundArt(id,light);trail=[];}
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),cw=Math.round(rect.width*dpr),ch=Math.round(rect.height*dpr);
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=Math.max(1,cw);canvas.height=Math.max(1,ch);}
    c.setTransform(1,0,0,1,0,0);c.fillStyle=light?'#dce9ee':'#091827';c.fillRect(0,0,canvas.width,canvas.height);
    const viewWidth=rect.width/rect.height<1.3?740:W,scale=Math.min(canvas.width/viewWidth,canvas.height/H);
    c.setTransform(scale,0,0,scale,(canvas.width-W*scale)/2,(canvas.height-H*scale)/2);c.drawImage(background,0,0);
    const ink=light?'#284d62':'#b1d1df',fine=light?'#496b8133':'#8cc8e529';
    const halo=c.createRadialGradient(CX,CY,91,CX,CY,151);halo.addColorStop(0,sector.glow+'38');halo.addColorStop(.65,sector.glow+'22');halo.addColorStop(1,sector.glow+'00');circle(c,CX,CY,151,halo);
    c.drawImage(planet,CX-112,CY-112,224,224);
    arc(c,112,3.6,5.7,sector.color+'66',1.5);
    c.save();c.translate(CX,CY);c.rotate(-.38);c.scale(1,.34);c.beginPath();c.arc(0,0,144,0,Math.PI);c.strokeStyle=light?'#708c9c44':sector.color+'22';c.lineWidth=8;c.stroke();c.restore();
    // Orbital infrastructure: inset rails, docking notches, and a thin flight path.
    arc(c,R+15,0,TAU,fine,1);arc(c,R*.72,0,TAU,fine,1.5);
    c.setLineDash([2,10]);arc(c,R*.72-8,0,TAU,fine,.8);c.setLineDash([]);
    for(let i=0;i<72;i++){const a=i/72*TAU;c.strokeStyle=i%6?fine:ink+'77';c.lineWidth=i%6?1:2;c.beginPath();c.moveTo(CX+Math.cos(a)*(R+16),CY+Math.sin(a)*(R+16));c.lineTo(CX+Math.cos(a)*(R+(i%6?19:24)),CY+Math.sin(a)*(R+(i%6?19:24)));c.stroke();}
    for(let i=0;i<12;i++){const a=i/12*TAU;arc(c,R,a+.025,a+.43,light?'#849caa4d':'#49617750',7);arc(c,R+1,a+.04,a+.12,light?'#d5e6ec':'#94a9ad66',2);}
    label(c,'N',CX,CY-R-34,ink,9);label(c,'E',CX+R+36,CY+3,ink,9);label(c,'S',CX,CY+R+40,ink,9);label(c,'W',CX-R-36,CY+3,ink,9);
    label(c,sector.planet,CX,CY+139,ink,9);
    const idle=s.phase==='idle',angle=idle?-1.9+(reduced?0:elapsed*.25):s.angle;
    const gate=idle?.1:s.gate?gateAngle(s):null,width=orbitWidth(s),cue=orbitCue(s);
    if(gate!==null){
      const launch=(idle?gate:gateAngle(s,s.time+DASH_PEAK))-orbitSpeed(s)*DASH_PEAK;
      arc(c,R*.72,launch-width,launch+width,cue.ready?'#ffd986':light?'#b58248':'#d9ac6c',7);
      arc(c,R*.72,launch-width*.3,launch+width*.3,cue.ready?'#fff6d3':light?'#72542a':'#fff4c0',3);
      c.setLineDash([3,8]);c.strokeStyle=light?'#b2824e88':'#f8cf7a55';c.lineWidth=1;c.beginPath();c.moveTo(CX+Math.cos(launch)*R*.72,CY+Math.sin(launch)*R*.72);c.quadraticCurveTo(CX+Math.cos(gate-.12)*R*.9,CY+Math.sin(gate-.12)*R*.9,CX+Math.cos(gate)*R,CY+Math.sin(gate)*R);c.stroke();c.setLineDash([]);
      c.save();c.translate(CX+Math.cos(gate)*R,CY+Math.sin(gate)*R);c.rotate(gate);
      const gap=Math.max(23,width*R);
      c.shadowColor='#ffcf74';c.shadowBlur=reduced?0:cue.ready?23:12;
      c.strokeStyle=cue.ready?'#fff3c2':'#e8bc72';c.lineWidth=5;c.lineJoin='round';
      for(const sign of [-1,1]){c.beginPath();c.moveTo(-9,sign*(gap+14));c.lineTo(8,sign*(gap+14));c.lineTo(8,sign*gap);c.lineTo(-4,sign*gap);c.stroke();}
      c.shadowBlur=0;c.fillStyle=cue.ready?'#ffe5a733':'#ffe5a713';c.fillRect(-5,-gap,10,gap*2);
      c.strokeStyle='#fff2c177';c.lineWidth=1;c.beginPath();c.moveTo(0,-gap);c.lineTo(0,gap);c.stroke();c.restore();
      const gx=CX+Math.cos(gate)*(R+53),gy=CY+Math.sin(gate)*(R+53);
      label(c,'GATE',gx,gy,light?'#896028':'#ffe4aa',10);
    }
    const radius=orbitRadius(s)*R,x=CX+Math.cos(angle)*radius,y=CY+Math.sin(angle)*radius;
    if(s.time!==lastTime){trail.push({x,y});if(trail.length>45)trail.shift();lastTime=s.time;}
    if(!reduced){for(let i=1;i<trail.length;i++){c.strokeStyle=`rgba(${light?'38,125,153':'104,231,244'},${i/trail.length*.5})`;c.lineWidth=i/trail.length*3;c.beginPath();c.moveTo(trail[i-1].x,trail[i-1].y);c.lineTo(trail[i].x,trail[i].y);c.stroke();}}
    if(s.phase!=='lost'){
      const lean=s.dash?Math.sin(Math.min(1,s.dash.elapsed/.68)*TAU)*-.62:0;
      const departure=s.phase==='won'&&!reduced?Math.min(300,(elapsed-wonAt)**2*80):0;
      ship(x+departure,y-departure,angle+Math.PI/2+lean,!!s.dash,elapsed);
      if(idle){label(c,'YOUR SHIP',x,y-28,ink,9);}
    }
    const dt=s.paused||reduced?0:Math.min(seconds,.05);
    for(const p of particles){p.life-=reduced?.016:dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-dt*.5;p.vy*=1-dt*.5;c.globalAlpha=Math.max(0,p.life/p.max);circle(c,p.x,p.y,p.size,p.color);}c.globalAlpha=1;particles=particles.filter(p=>p.life>0);
    // Quiet corner brackets make the playfield feel like a cockpit display.
    c.strokeStyle=fine;c.lineWidth=1.5;for(const[x,y,sx,sy]of[[24,24,1,1],[936,24,-1,1],[24,616,1,-1],[936,616,-1,-1]]){c.beginPath();c.moveTo(x,y+sy*20);c.lineTo(x,y);c.lineTo(x+sx*20,y);c.stroke();}
  }
  return { draw, event(event,reduced=false){if(event.type==='win')wonAt=elapsed;if(['pass','miss','win'].includes(event.type))burst(event.angle,event.type,reduced);}, reset(){trail=[];particles=[];elapsed=0;lastTime=-1;wonAt=0;} };
}
