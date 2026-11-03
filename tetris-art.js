import {TETRIS_COLORS,PIECE_NAMES,normalizeMage,rotatedCells} from './tetris-config.js';

export const tetrisEscape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pieceColor=type=>TETRIS_COLORS[Math.max(0,PIECE_NAMES.indexOf(type))];
export const tint=(color,amount)=>'#'+[1,3,5].map(i=>Math.round(Math.max(0,Math.min(255,parseInt(color.slice(i,i+2),16)+amount))).toString(16).padStart(2,'0')).join('');
export const roundRect=(ctx,x,y,w,h,r=5)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
const tiles=new Map();
function blockTile(color,skin,ice) {
  const key=`${color}:${skin}:${ice}`;if(tiles.has(key))return tiles.get(key);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');if(ice)color='#a2e0ea';
  const grad=c.createLinearGradient(12,0,110,128);grad.addColorStop(0,tint(color,34));grad.addColorStop(.4,color);grad.addColorStop(1,tint(color,-40));
  roundRect(c,3,3,122,122,10);c.fillStyle=grad;c.fill();c.strokeStyle=tint(color,-62);c.lineWidth=4;c.stroke();
  c.beginPath();c.moveTo(7,8);c.lineTo(121,8);c.lineTo(108,20);c.lineTo(21,20);c.lineTo(21,108);c.lineTo(7,121);c.closePath();c.fillStyle='#ffffff45';c.fill();
  c.beginPath();c.moveTo(122,10);c.lineTo(122,120);c.lineTo(10,120);c.lineTo(23,107);c.lineTo(108,107);c.lineTo(108,23);c.closePath();c.fillStyle='#162b403b';c.fill();
  roundRect(c,20,20,88,88,4);c.strokeStyle='#ffffff25';c.lineWidth=2;c.stroke();
  c.save();roundRect(c,20,20,88,88,4);c.clip();
  if(skin==='wood'){
    for(let y=26;y<105;y+=12){c.beginPath();c.moveTo(14,y);c.bezierCurveTo(42,y-9,57,y+10,118,y-2);c.strokeStyle='#442e3e55';c.lineWidth=1.8;c.stroke();}
    c.beginPath();c.ellipse(70,62,14,7,-.15,0,Math.PI*2);c.strokeStyle='#4a2c3640';c.stroke();
  }else if(skin==='copper'){
    c.fillStyle='#f1d2a350';c.fillRect(19,58,90,8);c.fillRect(58,19,8,90);
    for(const x of[28,100])for(const y of[28,100]){c.beginPath();c.arc(x,y,4,0,7);c.fillStyle='#f3ddb1';c.fill();c.strokeStyle='#513e3766';c.stroke();}
  }else if(skin==='cosmic'){
    c.fillStyle='#312e6577';c.fillRect(20,20,90,90);for(let i=0;i<16;i++){const x=25+(i*37)%77,y=25+(i*23)%77;c.fillStyle=i%3?'#fff8d2':'#f2b8e5';c.fillRect(x,y,i%3?1.5:3,i%3?1.5:3);}c.beginPath();c.moveTo(20,85);c.quadraticCurveTo(64,25,107,36);c.strokeStyle='#f0b1d977';c.lineWidth=7;c.stroke();
  }else if(skin==='clay'){
    c.beginPath();c.arc(64,64,24,0,Math.PI*2);c.strokeStyle='#ffffff40';c.lineWidth=3;c.stroke();c.beginPath();c.moveTo(48,64);c.lineTo(64,48);c.lineTo(80,64);c.lineTo(64,80);c.closePath();c.stroke();
  }else{
    c.beginPath();c.moveTo(22,20);c.lineTo(95,20);c.lineTo(108,85);c.lineTo(63,106);c.closePath();c.fillStyle='#ffffff1f';c.fill();
    c.beginPath();c.moveTo(22,20);c.lineTo(65,68);c.lineTo(108,85);c.moveTo(65,68);c.lineTo(63,106);c.strokeStyle='#ffffff3b';c.lineWidth=2;c.stroke();
  }
  if(skin==='glass'){c.beginPath();c.moveTo(12,104);c.lineTo(81,13);c.lineTo(104,13);c.lineTo(34,105);c.closePath();c.fillStyle='#ffffff30';c.fill();}
  if(ice||skin==='frost'){c.strokeStyle='#efffff99';c.lineWidth=2;for(let i=0;i<6;i++){c.save();c.translate(64,64);c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-32);c.moveTo(-7,-22);c.lineTo(0,-16);c.lineTo(7,-22);c.stroke();c.restore();}}
  c.restore();tiles.set(key,canvas);return canvas;
}
export function drawBlock(ctx,x,y,size,type,style={},options={}) {
  ctx.save();ctx.globalAlpha*=options.ghost ? .24 : 1;ctx.drawImage(blockTile(pieceColor(type),style.blocks||'gem',options.ice),x+.4,y+.4,size-.8,size-.8);
  if(options.ghost){ctx.strokeStyle='#fff5c9';ctx.lineWidth=1;ctx.strokeRect(x+1,y+1,size-2,size-2);}ctx.restore();
}
export function drawMiniPiece(ctx,type,x,y,size,style,rotation=0) {
  const cells=rotatedCells(type,rotation),minX=Math.min(...cells.map(c=>c[0])),minY=Math.min(...cells.map(c=>c[1]));
  for(const [cx,cy]of cells)drawBlock(ctx,x+(cx-minX)*size,y+(cy-minY)*size,size,type,style);
}
export function drawMage(ctx,x,y,height,style=normalizeMage(),{time=0,cast=false,celebrate=false}={}) {
  const robe=style.robeColor,accent=style.accent,skin=style.skin,hair=style.hairColor;
  ctx.save();ctx.translate(x,y);ctx.scale(height/190,height/190);
  ctx.fillStyle='#182e4d28';ctx.beginPath();ctx.ellipse(0,1,43,9,0,0,7);ctx.fill();
  // Soft leather boots and a lined cape, with a neutral robe silhouette.
  ctx.fillStyle='#423b42';for(const dx of[-19,16]){ctx.beginPath();ctx.ellipse(dx,-7,16,8,-.1,0,7);ctx.fill();ctx.strokeStyle='#c1976c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(dx-7,-7);ctx.lineTo(dx+5,-7);ctx.stroke();}
  const cloth=ctx.createLinearGradient(-46,-105,41,-17);cloth.addColorStop(0,tint(robe,22));cloth.addColorStop(.55,robe);cloth.addColorStop(1,tint(robe,-40));
  ctx.beginPath();ctx.moveTo(-23,-121);ctx.bezierCurveTo(-50,-101,-42,-50,-52,-22);ctx.quadraticCurveTo(0,1,49,-22);ctx.lineTo(29,-112);ctx.closePath();ctx.fillStyle=tint(robe,-22);ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.moveTo(-20,-116);ctx.quadraticCurveTo(4,-127,23,-113);ctx.lineTo(37,-19);ctx.quadraticCurveTo(0,-5,-35,-21);ctx.closePath();ctx.fillStyle=cloth;ctx.fill();
  ctx.strokeStyle='#ffffff1d';ctx.lineWidth=3;for(const dx of[-22,-10,16,26]){ctx.beginPath();ctx.moveTo(dx*.6,-91);ctx.quadraticCurveTo(dx-3,-52,dx,-21);ctx.stroke();}
  ctx.fillStyle='#59433b';ctx.fillRect(-27,-70,54,8);ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.strokeRect(-6,-71,12,10);
  if(style.robe==='astral'){ctx.strokeStyle=accent;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-18,-47);ctx.lineTo(3,-31);ctx.lineTo(19,-51);ctx.lineTo(10,-90);ctx.stroke();for(const [a,b]of[[-18,-47],[3,-31],[19,-51],[10,-90]]){ctx.beginPath();ctx.arc(a,b,2.5,0,7);ctx.fillStyle=accent;ctx.fill();}}
  if(style.robe==='forest'){ctx.strokeStyle=accent;ctx.lineWidth=1.5;for(const side of[-1,1])for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(side*24,-30-i*11,5,2.5,side*.7,0,7);ctx.stroke();}}
  if(style.robe==='traveler'){ctx.fillStyle='#bd9463';roundRect(ctx,14,-62,16,23,4);ctx.fill();ctx.strokeStyle='#604e41';ctx.stroke();ctx.fillStyle=accent;ctx.fillRect(20,-61,4,6);}
  // Hair is independent of the robe and headwear.
  if(style.hair!=='bald'){ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(0,-134,29,35,0,0,7);ctx.fill();if(['long','braids'].includes(style.hair)){ctx.beginPath();ctx.moveTo(-26,-137);ctx.lineTo(-31,-84);ctx.quadraticCurveTo(0,-72,31,-89);ctx.lineTo(26,-138);ctx.fill();}}
  ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(-25,-136,5,9,-.15,0,7);ctx.ellipse(25,-136,5,9,.15,0,7);ctx.fill();
  const face=ctx.createLinearGradient(-23,-155,24,-121);face.addColorStop(0,tint(skin,22));face.addColorStop(1,tint(skin,-9));ctx.fillStyle=face;ctx.beginPath();ctx.ellipse(0,-139,25,29,0,0,7);ctx.fill();
  if(style.hair!=='bald'){
    ctx.fillStyle=hair;ctx.beginPath();ctx.moveTo(-26,-142);ctx.bezierCurveTo(-29,-179,26,-179,26,-146);ctx.quadraticCurveTo(11,-146,9,-163);ctx.quadraticCurveTo(-4,-146,-26,-142);ctx.fill();
    if(style.hair==='curls')for(let i=0;i<10;i++){const a=Math.PI+i*Math.PI/10;ctx.beginPath();ctx.arc(Math.cos(a)*25,-144+Math.sin(a)*24,6,0,7);ctx.fill();ctx.strokeStyle=tint(hair,17);ctx.lineWidth=1;ctx.stroke();}
    if(style.hair==='braids')for(const side of[-1,1])for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(side*(25+Math.sin(i)*2),-136+i*7,5,5,.2*side,0,7);ctx.fill();}
  }
  const blink=Math.sin(time*.65)> .994;ctx.strokeStyle=tint(hair,-15);ctx.lineWidth=2;ctx.lineCap='round';
  for(const dx of[-10,10]){ctx.beginPath();ctx.moveTo(dx-4,-144);ctx.quadraticCurveTo(dx,-147,dx+4,-144);ctx.stroke();if(blink){ctx.beginPath();ctx.moveTo(dx-4,-137);ctx.lineTo(dx+4,-137);ctx.stroke();}else{ctx.fillStyle='#f9efd9';ctx.beginPath();ctx.ellipse(dx,-137,4.5,5.5,0,0,7);ctx.fill();ctx.fillStyle='#3e3537';ctx.beginPath();ctx.ellipse(dx+1,-137,2.3,3.5,0,0,7);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillRect(dx+1,-140,1.3,1.5);}}
  ctx.strokeStyle=tint(skin,-36);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-137);ctx.lineTo(-2,-129);ctx.lineTo(2,-128);ctx.stroke();ctx.beginPath();ctx.moveTo(-6,-122);ctx.quadraticCurveTo(1,-118,8,-123);ctx.stroke();
  if(style.beard!=='none'){ctx.fillStyle=hair;ctx.beginPath();if(style.beard==='moustache'){ctx.moveTo(0,-127);ctx.quadraticCurveTo(-7,-130,-13,-123);ctx.quadraticCurveTo(0,-119,0,-125);ctx.quadraticCurveTo(7,-119,14,-123);ctx.quadraticCurveTo(6,-130,0,-127);}else{ctx.moveTo(-21,-124);ctx.quadraticCurveTo(0,-112,22,-125);ctx.quadraticCurveTo(23,-105,0,style.beard==='long'?-83:-105);ctx.quadraticCurveTo(-23,-107,-21,-124);}ctx.fill();}
  if(style.hat==='pointed'){
    ctx.fillStyle=cloth;ctx.beginPath();ctx.moveTo(-29,-160);ctx.quadraticCurveTo(-18,-188,10,-204);ctx.quadraticCurveTo(24,-190,29,-160);ctx.closePath();ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.ellipse(0,-159,44,10,-.08,0,7);ctx.fill();ctx.stroke();ctx.strokeStyle=accent;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-23,-169);ctx.quadraticCurveTo(2,-165,25,-171);ctx.stroke();
  }else if(style.hat==='hood'){ctx.strokeStyle=robe;ctx.lineWidth=12;ctx.beginPath();ctx.ellipse(0,-142,31,35,0,Math.PI*.76,Math.PI*2.26);ctx.stroke();ctx.strokeStyle=accent;ctx.lineWidth=1.7;ctx.stroke();}
  else if(style.hat==='crown'){ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(-26,-161);ctx.lineTo(-27,-180);ctx.lineTo(-13,-169);ctx.lineTo(0,-189);ctx.lineTo(13,-169);ctx.lineTo(27,-180);ctx.lineTo(25,-161);ctx.closePath();ctx.fill();ctx.fillStyle='#76d7de';ctx.beginPath();ctx.moveTo(0,-180);ctx.lineTo(5,-171);ctx.lineTo(0,-164);ctx.lineTo(-5,-171);ctx.closePath();ctx.fill();}
  // Casting arm and wand have a gentle movement, without stretching the body.
  const lift=cast||celebrate?12+Math.sin(time*3)*3:0;
  ctx.strokeStyle=robe;ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(22,-106);ctx.quadraticCurveTo(39,-91-lift,48,-112-lift);ctx.stroke();ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(40,-108-lift);ctx.lineTo(50,-104-lift);ctx.stroke();
  ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(50,-114-lift,6,7,.3,0,7);ctx.fill();
  ctx.strokeStyle='#765438';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(48,-107-lift);ctx.lineTo(69,-158-lift);ctx.stroke();ctx.strokeStyle='#e0ba78';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(49,-111-lift);ctx.lineTo(68,-158-lift);ctx.stroke();
  if(style.wand!=='oak'){ctx.fillStyle=style.wand==='crystal'?'#98e9ed':accent;ctx.beginPath();if(style.wand==='moon'){ctx.arc(70,-164-lift,7,-1,4);ctx.quadraticCurveTo(73,-158-lift,70,-171-lift);}else{ctx.moveTo(70,-175-lift);ctx.lineTo(77,-163-lift);ctx.lineTo(70,-155-lift);ctx.lineTo(63,-163-lift);}ctx.closePath();ctx.fill();}
  if(cast||celebrate){const glow=ctx.createRadialGradient(70,-164-lift,0,70,-164-lift,20);glow.addColorStop(0,`${tint(accent,30)}cc`);glow.addColorStop(1,`${accent}00`);ctx.fillStyle=glow;ctx.fillRect(49,-185-lift,42,42);}
  ctx.strokeStyle=robe;ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(-22,-106);ctx.quadraticCurveTo(-39,-98,-38,-78);ctx.stroke();ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(-37,-76,6,8,-.2,0,7);ctx.fill();
  ctx.fillStyle=accent;ctx.beginPath();ctx.arc(0,-108,6,0,7);ctx.fill();ctx.fillStyle='#477f83';ctx.beginPath();ctx.arc(0,-108,3,0,7);ctx.fill();ctx.restore();
}
const scenery=new Map();
function islandScenery(w,h,scene) {
  const key=`${Math.round(w)}:${Math.round(h)}:${scene}`;
  if(scenery.has(key))return scenery.get(key);
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*2);canvas.height=Math.ceil(h*2);
  const ctx=canvas.getContext('2d');ctx.scale(2,2);const night=scene!=='lagoon',horizon=h*.64;
  const sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,night?'#1c2d50':'#83bacd');sky.addColorStop(.65,night?'#9b819b':'#e6d9c2');sky.addColorStop(1,night?'#d6a794':'#ffe6b8');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  const halo=ctx.createRadialGradient(w*.76,h*.18,0,w*.76,h*.18,w*.5);halo.addColorStop(0,'#fff1bd66');halo.addColorStop(.2,'#ffdda82c');halo.addColorStop(1,'#ffe2ba00');ctx.fillStyle=halo;ctx.fillRect(0,0,w,horizon);
  ctx.beginPath();ctx.arc(w*.76,h*.18,night?12:18,0,7);ctx.fillStyle=night?'#f4ecd5':'#fff2c5';ctx.fill();
  if(night)for(let i=0;i<50;i++){ctx.globalAlpha=.2+(i%4)*.13;ctx.fillStyle='#fff3da';ctx.fillRect((i*79.71)%w,(i*43.23)%(h*.31),i%5?1:1.7,1.4);}ctx.globalAlpha=1;
  if(scene==='aurora')for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(0,h*.1+i*15);ctx.bezierCurveTo(w*.25,h*.02,w*.65,h*.3,w,h*.05+i*20);ctx.strokeStyle=['#67deb03b','#b995e53a','#7dbad83b'][i];ctx.lineWidth=25;ctx.stroke();}
  // Layered, irregular ridges retain distance without competing with the pieces.
  for(let layer=0;layer<4;layer++){
    const points=[];for(let i=0;i<=36;i++){const x=w*i/36,y=h*(.51+layer*.035)-h*(Math.sin(i*.23+layer*2)*.035+Math.sin(i*.77+layer)*.018+Math.sin(i*2.1)*.006);points.push([x,y]);}
    ctx.beginPath();ctx.moveTo(0,horizon+2);for(const [x,y]of points)ctx.lineTo(x,y);ctx.lineTo(w,horizon+2);ctx.closePath();
    const mountain=ctx.createLinearGradient(0,h*.46,0,horizon);mountain.addColorStop(0,['#a5aeb2','#8ba6a9','#6e989c','#487f89'][layer]);mountain.addColorStop(1,night?'#526b83':'#8eb8b8');ctx.fillStyle=mountain;ctx.globalAlpha=night?.4:.65;ctx.fill();
    ctx.save();ctx.clip();for(let i=2;i<points.length;i+=3){const [x,y]=points[i];ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.08,horizon);ctx.lineTo(x+w*.025,y+h*.025);ctx.closePath();ctx.fillStyle=layer%2?'#284c6220':'#e5d7c22b';ctx.fill();}ctx.restore();
  }ctx.globalAlpha=1;
  const water=ctx.createLinearGradient(0,horizon,0,h);water.addColorStop(0,night?'#57879a':'#79b6be');water.addColorStop(.4,night?'#366780':'#368da1');water.addColorStop(1,night?'#173d5a':'#175d78');ctx.fillStyle=water;ctx.fillRect(0,horizon,w,h-horizon);
  // A wooded far shore and tiny anchored sailboats establish scale.
  ctx.fillStyle=night?'#34566c':'#628e8b';for(let i=0;i<35;i++){const x=w*i/34,y=horizon+Math.sin(i*.4)*2;if(i>8&&i<25)continue;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x,y-4-(i%4));ctx.lineTo(x+3,y);ctx.fill();}
  for(const [x,y,s]of[[w*.25,h*.72,3],[w*.87,h*.68,2]]){ctx.strokeStyle='#406b78';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-s*2);ctx.stroke();ctx.fillStyle='#f8ecd4aa';ctx.beginPath();ctx.moveTo(x-1,y-s*2);ctx.lineTo(x-s,y-1);ctx.lineTo(x-1,y-1);ctx.fill();}
  if(scenery.size>12)scenery.delete(scenery.keys().next().value);scenery.set(key,canvas);return canvas;
}
export function drawIslandSky(ctx,w,h,time,scene='lagoon') {
  ctx.drawImage(islandScenery(w,h,scene),0,0,w,h);const night=scene!=='lagoon';
  for(let i=0;i<5;i++){
    const x=((i*.27*w+time*(i%2?.9:.5))%(w+130))-65,y=h*(.12+(i%3)*.07),size=23+i%3*10;
    const cloud=ctx.createLinearGradient(0,y-15,0,y+9);cloud.addColorStop(0,night?'#ffe4d51c':'#fff9ea88');cloud.addColorStop(1,night?'#b8badc13':'#f5e2d12b');ctx.fillStyle=cloud;
    ctx.beginPath();ctx.ellipse(x,y,size*1.5,7,0,0,7);ctx.ellipse(x-size*.35,y-4,size*.65,10,0,0,7);ctx.ellipse(x+size*.35,y-6,size*.7,13,0,0,7);ctx.ellipse(x+size,y-1,size*.55,7,0,0,7);ctx.fill();
  }
  // Fine ripples grow toward the camera; the warm reflection stays under the sun.
  for(let i=0;i<78;i++){
    const depth=(i/78)**1.45,y=h*(.65+depth*.35),x=(Math.sin(i*17.31)*.5+.5)*w+Math.sin(time*.65+i)*4,length=3+depth*20;
    ctx.beginPath();ctx.moveTo(x-length,y);ctx.quadraticCurveTo(x,y-1.2-depth,x+length,y);ctx.strokeStyle=i%3?(night?'#adcbd424':'#c3eee734'):'#1f58752a';ctx.lineWidth=.6+depth*.8;ctx.stroke();
    if(i%2===0){const reflectionX=w*.76+Math.sin(i*3.1)*(6+depth*w*.14);ctx.beginPath();ctx.moveTo(reflectionX-length*.4,y);ctx.lineTo(reflectionX+length*.5,y);ctx.strokeStyle=night?'#f8d9d125':'#ffedbe55';ctx.stroke();}
  }
}
export function drawIsland(ctx,cx,y,width,height=62,time=0) {
  ctx.fillStyle='#102f4933';ctx.beginPath();ctx.ellipse(cx,y+height,width*.67,10,0,0,7);ctx.fill();
  const rock=ctx.createLinearGradient(cx-width/2,y,cx+width/2,y+height);rock.addColorStop(0,'#c7b398');rock.addColorStop(.5,'#8e8c7b');rock.addColorStop(1,'#576c69');
  ctx.beginPath();ctx.moveTo(cx-width*.5,y);ctx.lineTo(cx+width*.5,y);ctx.lineTo(cx+width*.58,y+height*.5);ctx.lineTo(cx+width*.31,y+height);ctx.lineTo(cx-width*.25,y+height*.95);ctx.lineTo(cx-width*.6,y+height*.6);ctx.closePath();ctx.fillStyle=rock;ctx.fill();
  ctx.save();ctx.clip();
  for(let i=0;i<14;i++){const x=cx-width*.58+i*width*.09,depth=(i%3)*height*.15;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-width*.035,y+height*.32+depth);ctx.lineTo(x+width*.04,y+height*.75);ctx.lineTo(x+width*.07,y+height);ctx.lineTo(x+width*.1,y);ctx.closePath();ctx.fillStyle=['#f1dec52c','#34595530','#d7c4a21a','#314c5c25'][i%4];ctx.fill();}
  for(let i=0;i<55;i++){const x=cx-width*.6+((i*17.71)%1)*width*1.2,ry=y+((i*13.63)%1)*height;ctx.fillStyle=i%2?'#eff1cb1c':'#23494d23';ctx.fillRect(x,ry,1+i%3,.8);}
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(cx-width*.6,y+height*(.2+i*.18));ctx.bezierCurveTo(cx-width*.12,y+height*(.16+i*.18),cx+width*.1,y+height*(.33+i*.18),cx+width*.6,y+height*(.21+i*.18));ctx.strokeStyle='#374e4d32';ctx.lineWidth=.8;ctx.stroke();}ctx.restore();
  ctx.fillStyle='#4b8270';ctx.beginPath();ctx.ellipse(cx,y+3,width*.52,8,0,0,7);ctx.fill();ctx.fillStyle='#a6bd71';ctx.fillRect(cx-width/2,y-2,width,4);ctx.strokeStyle='#d9d59b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-width/2,y-3);ctx.lineTo(cx+width/2,y-3);ctx.stroke();
  for(let i=0;i<24;i++){const x=cx-width*.5+i*width/24;ctx.strokeStyle=i%2?'#688a50':'#bacb80';ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(x-2,y-3-i%3);ctx.moveTo(x,y+2);ctx.lineTo(x+2,y-3);ctx.stroke();if(i%7===0){ctx.fillStyle=i%2?'#f8de9a':'#eee5c5';ctx.beginPath();ctx.arc(x-1,y-5,1.5,0,7);ctx.fill();}}
  ctx.strokeStyle='#e5f8e599';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(cx+Math.sin(time+i)*3,y+height+1+i*3,width*(.55+i*.05),4+i*2,0,.05,Math.PI*.94);ctx.lineWidth=1.4;ctx.stroke();}
}
export function drawGorilla(ctx,x,y,size,hunger=30,angry=0,time=0) {
  ctx.save();ctx.translate(x+Math.sin(time*35)*angry*3,y);ctx.scale(size/120,size/120);
  const fur=ctx.createLinearGradient(-40,-110,40,-8);fur.addColorStop(0,'#716467');fur.addColorStop(1,'#36343e');ctx.fillStyle=fur;
  ctx.beginPath();ctx.ellipse(0,-48,40,47,0,0,7);ctx.ellipse(-38,-40,17,41,.15,0,7);ctx.ellipse(38,-40,17,41,-.15,0,7);ctx.fill();
  ctx.fillStyle='#b29a86';ctx.beginPath();ctx.ellipse(0,-46,23,29,0,0,7);ctx.fill();ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(0,-101,32,34,0,0,7);ctx.fill();ctx.fillStyle='#9e8b7d';ctx.beginPath();ctx.ellipse(0,-99,24,25,0,0,7);ctx.fill();ctx.fillStyle='#463c3c';ctx.beginPath();ctx.ellipse(0,-94,13,9,0,0,7);ctx.fill();
  for(const side of[-1,1]){ctx.fillStyle='#f2e2c5';ctx.beginPath();ctx.ellipse(side*11,-109,5,4,0,0,7);ctx.fill();ctx.fillStyle='#2c2c35';ctx.beginPath();ctx.arc(side*11,-108,2,0,7);ctx.fill();ctx.strokeStyle='#4b4344';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(side*5,-117);ctx.lineTo(side*18,-117+(hunger<7?-4:1));ctx.stroke();}
  ctx.strokeStyle='#3d3235';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,-81);ctx.quadraticCurveTo(0,hunger<7?-86:-75,10,-81);ctx.stroke();ctx.restore();
}
export function drawBanana(ctx,x,y,scale=1,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(scale,scale);ctx.beginPath();ctx.moveTo(-14,-9);ctx.bezierCurveTo(-3,5,10,10,18,-4);ctx.bezierCurveTo(20,23,-13,22,-17,-6);ctx.closePath();ctx.fillStyle='#edcb59';ctx.fill();ctx.strokeStyle='#b98e39';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(-12,-4);ctx.quadraticCurveTo(-2,19,15,5);ctx.strokeStyle='#fff2ac';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#6d573a';ctx.fillRect(-18,-11,5,6);ctx.restore();}
export function drawTetrisShopPreview(canvas,item) {
  canvas.width=560;canvas.height=320;const ctx=canvas.getContext('2d'),style={...normalizeMage(),[item.setting]:item.value};drawIslandSky(ctx,560,320,0,style.scene);
  if(['blocks','scene'].includes(item.setting)){drawIsland(ctx,280,264,250,50);drawMiniPiece(ctx,'L',203,116,43,style);drawMiniPiece(ctx,'T',245,207,43,style);}else{drawIsland(ctx,280,280,190,38);drawMage(ctx,270,275,225,style,{cast:true});}
  canvas.setAttribute('aria-label',`${item.name} preview`);
}
