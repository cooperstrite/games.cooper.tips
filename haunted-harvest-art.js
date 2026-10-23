import { STENCILS, featureOutline } from "./haunted-harvest-carving.js";
const TAU = Math.PI * 2;
function ellipse(c, x, y, rx, ry, fill) { c.beginPath(); c.ellipse(x,y,rx,ry,0,0,TAU); c.fillStyle=fill; c.fill(); }
function polygon(c, points, fill) { c.beginPath(); points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); c.fillStyle=fill; c.fill(); }
function tree(c,x,y,scale,flip=1) {
  c.save(); c.translate(x,y); c.scale(scale*flip,scale); c.strokeStyle="#111a25"; c.lineCap="round";
  for(const [width,path] of [[18,[[0,0],[-5,-65],[8,-125],[4,-190]]],[10,[[0,-75],[-38,-105],[-48,-153]]],[8,[[4,-120],[38,-150],[49,-192]]],[4,[[-36,-105],[-68,-112],[-81,-137]]],[4,[[38,-150],[67,-159],[73,-182]]],[4,[[4,-175],[-15,-203],[-13,-224]]]]) {
    c.lineWidth=width;c.beginPath();path.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.stroke();
  } c.restore();
}
export function drawGrove(c,w,h,night,time,reduced=false) {
  const t=reduced?0:time, colors=[["#10152d","#3d335c","#957566"],["#071e2b","#274b4e","#77875e"],["#171126","#4c315c","#ad705d"]][night];
  c.clearRect(0,0,w,h);const sky=c.createLinearGradient(0,0,0,h);colors.forEach((color,i)=>sky.addColorStop(i/2,color));c.fillStyle=sky;c.fillRect(0,0,w,h);
  for(let n=0;n<65;n++){const x=((n*137.37)%997)/997*w,y=((n*73.7)%401)/401*h*.63;c.globalAlpha=.2+.45*(.5+.5*Math.sin(t*.6+n));ellipse(c,x,y,n%5===0?1.4:.7,n%5===0?1.4:.7,"#f5d8ab");}c.globalAlpha=1;
  const mx=w*.77,my=h*.22,mr=Math.min(w*.09,48),glow=c.createRadialGradient(mx,my,mr*.3,mx,my,mr*3.2);glow.addColorStop(0,"#ffe9bb30");glow.addColorStop(1,"#ffe9bb00");c.fillStyle=glow;c.fillRect(mx-mr*3.2,my-mr*3.2,mr*6.4,mr*6.4);
  ellipse(c,mx,my,mr,mr,"#ead9b3");for(const [x,y,r] of [[-.3,.2,.22],[.25,-.3,.15],[.3,.4,.12],[-.2,-.5,.1]])ellipse(c,mx+x*mr,my+y*mr,r*mr,r*mr,"#c8b89555");
  for(let layer=0;layer<3;layer++){c.beginPath();c.moveTo(0,h);for(let x=0;x<=w+10;x+=10)c.lineTo(x,h*(.55+layer*.11)+Math.sin(x/w*7+layer)*h*.045+Math.sin(x/w*17+2)*h*.018);c.lineTo(w,h);c.fillStyle=["#202738","#172c32","#14262d"][layer];c.fill();}
  // The manor grows nearer on each night.
  const sx=w*(night===2?.52:.23),sy=h*.59,scale=Math.min(w/800,1.2)*(night===2?1.3:.9);
  c.save();c.translate(sx,sy);c.scale(scale,scale);c.fillStyle="#17202d";c.fillRect(-60,-86,120,96);c.fillRect(-88,-123,36,133);c.fillRect(53,-112,36,122);
  polygon(c,[[-101,-123],[-70,-163],[-39,-123]],"#111824");polygon(c,[[40,-112],[71,-151],[102,-112]],"#111824");polygon(c,[[-69,-86],[0,-138],[69,-86]],"#1a2030");
  for(const x of [-76,-6,65])for(const y of [-95,-53]){c.shadowColor="#ffc576";c.shadowBlur=12;c.fillStyle="#f6b45a";c.fillRect(x,y,13,19);c.shadowBlur=0;c.fillStyle="#3e3540";c.fillRect(x+6,y,2,19);c.fillRect(x,y+9,13,2);}c.fillStyle="#090f1c";c.beginPath();c.roundRect(-14,-29,28,39,[14,14,0,0]);c.fill();c.restore();
  for(let n=0;n<7;n++)tree(c,w*(n/6),h*.72,(h/600)*(.3+(n%3)*.13),n%2?1:-1);
  const path=c.createLinearGradient(0,h*.65,0,h);path.addColorStop(0,"#70624c44");path.addColorStop(1,"#a3876255");polygon(c,[[w*.49,h*.61],[w*.55,h*.61],[w*.8,h],[w*.2,h]],path);
  // Crooked fence, weeds, fallen leaves, and ground pumpkins.
  c.strokeStyle="#27332d";c.lineWidth=3;for(let i=0;i<20;i++){const x=i*w/19,y=h*.9+Math.sin(i*.4)*7;c.beginPath();c.moveTo(x,y+35);c.lineTo(x-3,y-19);c.stroke();}c.beginPath();c.moveTo(0,h*.91);c.quadraticCurveTo(w*.5,h*.85,w,h*.92);c.stroke();
  for(let n=0;n<45;n++){const x=((n*137)%997)/997*w,y=h*(.78+((n*63)%97)/97*.22);c.strokeStyle=n%2?"#62704055":"#ad783d55";c.beginPath();c.moveTo(x,y);c.lineTo(x+3,y-8);c.lineTo(x+6,y-11);c.stroke();if(n%4===0)ellipse(c,x+8,y,3,1.5,"#b47a3655");}
  for(const [x,y,size] of [[.04,.95,18],[.11,.98,13],[.9,.96,22],[.97,.98,14]])drawPumpkin(c,w*x,h*y,size,size*.8,"#ce7328");
  tree(c,-3,h*.96,h/330);tree(c,w+4,h*.97,h/330,-1);
  for(let n=0;n<3;n++){const x=(w*(.28+n*.14)+Math.sin(t*.22+n)*w*.08),y=h*(.18+n*.06)+Math.cos(t*.4+n)*6,wing=4+Math.sin(t*6+n)*3;c.strokeStyle="#0a1421";c.lineWidth=2;c.beginPath();c.moveTo(x-9,y-wing);c.quadraticCurveTo(x-4,y-4,x,y);c.quadraticCurveTo(x+4,y-4,x+9,y-wing);c.stroke();}
  for(let n=0;n<3;n++){const x=w*(.2+n*.4)+Math.sin(t*.08+n)*w*.1,y=h*(.7+n*.09);const fog=c.createRadialGradient(x,y,0,x,y,w*.6);fog.addColorStop(0,"#cad6bd0b");fog.addColorStop(1,"#cad6bd00");c.fillStyle=fog;c.fillRect(0,y-35,w,70);}
  const vignette=c.createRadialGradient(w/2,h/2,h*.25,w/2,h/2,w*.75);vignette.addColorStop(0,"#070c1600");vignette.addColorStop(1,"#070c1670");c.fillStyle=vignette;c.fillRect(0,0,w,h);
}
export function drawPumpkin(c,x,y,rx,ry,color="#d97a2d") {
  c.save();c.translate(x,y);
  ellipse(c,0,ry*.94,rx*.94,ry*.12,"#04070c66");
  for(const [offset,width] of [[-.43,.58],[.43,.58],[-.22,.55],[.22,.55],[0,.45]]){
    const g=c.createRadialGradient(offset*rx-rx*.12,-ry*.38,0,offset*rx,0,ry*1.25);g.addColorStop(0,"#ffc569");g.addColorStop(.35,color);g.addColorStop(1,"#6b291c");ellipse(c,offset*rx,0,width*rx,ry*(1-Math.abs(offset)*.13),g);
  }
  c.strokeStyle="#6d8b46";c.lineWidth=rx*.13;c.lineCap="round";c.beginPath();c.moveTo(0,-ry*.9);c.bezierCurveTo(-rx*.08,-ry*1.12,rx*.15,-ry*1.15,rx*.1,-ry*1.31);c.stroke();c.strokeStyle="#a7ad65";c.lineWidth=rx*.035;c.stroke();
  c.strokeStyle="#8a9a4e";c.lineWidth=Math.max(1,rx*.012);c.beginPath();c.moveTo(rx*.06,-ry);c.bezierCurveTo(rx*.4,-ry*1.4,rx*.6,-ry*.88,rx*.28,-ry*.93);c.stroke();
  c.restore();
}
export const GLOW_COLORS={amber:"#ffd476",jade:"#a2ffd5",violet:"#d7b8ff"};
function outlinePath(cuts) {
  const path = new Path2D();
  for (const points of cuts) {
    points.forEach(([x,y],i) => i ? path.lineTo(x,y) : path.moveTo(x,y));
    path.closePath();
  }
  return path;
}
export function drawCarving(c,w,h,cuts,stencil="free",glow="amber",guide=false,cursor=null,options={}) {
  c.clearRect(0,0,w,h);c.save();c.scale(w/512,h/416);
  const bg=c.createRadialGradient(256,215,15,256,230,300);bg.addColorStop(0,"#584035");bg.addColorStop(1,"#141825");c.fillStyle=bg;c.fillRect(0,0,512,416);
  c.fillStyle="#b28a5320";for(let y=355;y<416;y+=15)c.fillRect(0,y,512,1);
  drawPumpkin(c,256,240,220,160);
  const openings=outlinePath(cuts),lit=options.lit!==false;
  const candle=GLOW_COLORS[glow]||GLOW_COLORS.amber;
  c.shadowColor=candle;c.shadowBlur=lit?17:0;c.fillStyle=lit?candle:"#23140f";c.fill(openings);c.shadowBlur=0;
  c.save();c.clip(openings);
  const light=c.createRadialGradient(256,275,15,256,275,185);
  light.addColorStop(0,lit?"#fff7cb":"#442314");light.addColorStop(.65,lit?candle:"#261710");light.addColorStop(1,lit?"#ba6d28":"#130e0b");
  c.fillStyle=light;c.fillRect(0,0,512,416);
  c.strokeStyle="#6c321a";c.lineWidth=5;c.lineJoin="round";c.stroke(openings);
  c.translate(0,2);c.strokeStyle=lit?"#ffcb6b":"#a65c25";c.lineWidth=1.2;c.stroke(openings);c.restore();
  if(guide && STENCILS[stencil]) {
    c.strokeStyle="#fff1bba8";c.lineWidth=1;c.setLineDash([4,4]);
    c.stroke(outlinePath(STENCILS[stencil].features.map((_,i)=>featureOutline(stencil,i))));c.setLineDash([]);
  }
  if(options.draft?.length) {
    const points=options.draft;c.strokeStyle="#fff1bb";c.lineWidth=1.1;c.lineJoin="round";c.beginPath();
    points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
    c.setLineDash([3,4]);c.lineTo(points[0][0],points[0][1]);c.stroke();c.setLineDash([]);
    for(const [x,y] of options.pointsMode?points:[points[0]]) {ellipse(c,x,y,2.6,2.6,"#b8f3d3");}
  }
  if(options.falling && options.falling.progress<1) {
    const {points,progress}=options.falling,mid=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
    c.save();c.globalAlpha=1-progress;c.translate(0,progress*progress*140);c.translate(...mid);c.rotate(progress*.12);c.translate(-mid[0],-mid[1]);
    c.clip(outlinePath([points]));drawPumpkin(c,256,240,220,160);c.restore();
  }
  if(cursor){const [x,y]=cursor;c.strokeStyle="#fff4d2";c.lineWidth=.8;c.beginPath();c.arc(x,y,4,0,TAU);c.moveTo(x-8,y);c.lineTo(x+8,y);c.moveTo(x,y-8);c.lineTo(x,y+8);c.stroke();}
  c.restore();
}
let iconId=0;
export function harvestIcon(kind) {
  const id=`hh-icon-${iconId++}`,purple=kind==="cursed";
  if(kind==="ghost")return `<svg viewBox="0 0 100 110" aria-hidden="true"><defs><radialGradient id="${id}"><stop stop-color="#f2f2e1"/><stop offset="1" stop-color="#92bbbf"/></radialGradient></defs><ellipse cx="50" cy="102" rx="32" ry="5" fill="#0b142255"/><path d="M18 91Q13 59 24 33Q35 10 54 16Q84 22 83 57L88 91L75 83L65 98L51 87L37 98L25 85Z" fill="url(#${id})"/><ellipse cx="39" cy="47" rx="5" ry="9" fill="#2a3b50"/><ellipse cx="63" cy="47" rx="5" ry="9" fill="#2a3b50"/><ellipse cx="52" cy="69" rx="7" ry="10" fill="#405369"/></svg>`;
  if(kind==="wisp")return `<svg viewBox="0 0 100 110" aria-hidden="true"><defs><radialGradient id="${id}"><stop stop-color="#fff8c5"/><stop offset=".5" stop-color="#8befc0"/><stop offset="1" stop-color="#79d9c100"/></radialGradient></defs><circle cx="50" cy="53" r="45" fill="url(#${id})"/><path d="M50 16Q70 42 57 50Q78 67 60 83Q32 92 33 65Q31 53 45 40Q52 30 50 16Z" fill="#c0ffde"/><path d="M51 49Q64 67 53 76Q42 80 43 70Z" fill="#fff6cc"/><path d="M42 91H59L62 101H39Z" fill="#b2b4a0"/></svg>`;
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><defs><radialGradient id="${id}" cx="35%" cy="25%" r="80%"><stop stop-color="${purple?"#caa0ed":"#ffc56d"}"/><stop offset=".45" stop-color="${purple?"#9366bf":"#e8812d"}"/><stop offset="1" stop-color="${purple?"#49345b":"#80351e"}"/></radialGradient></defs><ellipse cx="50" cy="103" rx="40" ry="5" fill="#080b1d66"/><path d="M50 25Q43 12 55 8" fill="none" stroke="#87a15b" stroke-width="7" stroke-linecap="round"/><path d="M51 22Q79 4 78 24Q72 33 64 24" fill="none" stroke="#718c4e" stroke-width="2"/><g fill="url(#${id})" stroke="${purple?"#583969":"#9b491f"}" stroke-width="1"><ellipse cx="29" cy="62" rx="23" ry="34"/><ellipse cx="71" cy="62" rx="23" ry="34"/><ellipse cx="50" cy="63" rx="26" ry="39"/></g><g fill="${purple?"#e3ffa7":"#ffeb9c"}" stroke="${purple?"#492854":"#69321d"}" stroke-width="2"><path d="M25 54L39 44L42 58Z"/><path d="M58 58L61 44L75 54Z"/><path d="M27 72L39 78L43 73L51 79L59 73L63 77L75 70Q66 95 47 90Q33 86 27 72Z"/></g>${purple?'<path d="M51 33L46 40L53 47" stroke="#ead0ff" fill="none" stroke-width="2"/>':""}</svg>`;
}
