import {TETRIS_COLORS,PIECE_NAMES,normalizeMage,rotatedCells} from './tetris-config.js';

export const tetrisEscape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pieceColor=type=>TETRIS_COLORS[Math.max(0,PIECE_NAMES.indexOf(type))];
export const tint=(color,amount)=>'#'+[1,3,5].map(i=>Math.round(Math.max(0,Math.min(255,parseInt(color.slice(i,i+2),16)+amount))).toString(16).padStart(2,'0')).join('');
export const roundRect=(ctx,x,y,w,h,r=5)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
const tiles=new Map();
function blockTile(color,skin,ice) {
  const key=`${color}:${skin}:${ice}`;if(tiles.has(key))return tiles.get(key);
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;const c=canvas.getContext('2d');c.scale(1.5,1.5);if(ice)color='#9edfea';
  const polygon=(points,fill,stroke)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.7;c.stroke();}};
  const grad=c.createLinearGradient(8,0,110,128);grad.addColorStop(0,tint(color,49));grad.addColorStop(.26,tint(color,10));grad.addColorStop(.62,tint(color,-9));grad.addColorStop(1,tint(color,-61));
  // The whole beveled volume stays inside the collision cell.
  roundRect(c,1.8,1.8,124.4,124.4,6);c.fillStyle=grad;c.fill();c.strokeStyle=tint(color,-69);c.lineWidth=2.5;c.stroke();
  polygon([[3,4],[122,4],[109,17],[18,17]],'#fff5d575');
  polygon([[3,4],[18,17],[18,107],[4,122]],'#ffffff32');
  polygon([[122,4],[124,122],[109,108],[109,17]],'#15304450');
  polygon([[4,122],[124,122],[109,108],[18,108]],'#17263e77');
  const face=c.createLinearGradient(20,15,100,109);face.addColorStop(0,tint(color,22));face.addColorStop(.45,color);face.addColorStop(1,tint(color,-27));
  roundRect(c,16,16,95,94,2);c.fillStyle=face;c.fill();c.strokeStyle='#ffffff2b';c.lineWidth=1.2;c.stroke();
  c.save();roundRect(c,17,17,93,92,2);c.clip();
  if(skin==='wood'){
    for(let y=19;y<112;y+=4){c.beginPath();c.moveTo(10,y);c.bezierCurveTo(41,y-7,61,y+9,119,y-4);c.strokeStyle=y%3?'#44353657':'#fbe4c93b';c.lineWidth=y%3?1:.65;c.stroke();}
    for(let i=0;i<5;i++){c.beginPath();c.ellipse(72,58,8+i*2.2,3+i*1.6,-.12,0,Math.PI*2);c.strokeStyle='#3c303c44';c.lineWidth=.8;c.stroke();}
    for(const [x,y]of[[25,25],[103,101]]){c.beginPath();c.arc(x,y,2,0,7);c.fillStyle='#39434b88';c.fill();c.strokeStyle='#fff3ce77';c.stroke();}
  }else if(skin==='copper'){
    const metal=c.createLinearGradient(0,0,128,128);metal.addColorStop(0,'#fff4cb77');metal.addColorStop(.4,'#875e2e22');metal.addColorStop(.45,'#fff3ce99');metal.addColorStop(.52,'#a7663722');metal.addColorStop(1,'#3a3b4433');c.fillStyle=metal;c.fillRect(16,16,96,96);
    c.strokeStyle='#f7d79f66';c.lineWidth=1;for(let i=0;i<24;i++){c.beginPath();c.moveTo(10,20+i*4);c.lineTo(114,24+i*4);c.stroke();}
    c.strokeStyle='#563f3155';c.lineWidth=5;c.strokeRect(28,28,71,71);c.strokeStyle='#f6d49766';c.lineWidth=1;c.strokeRect(26,26,71,71);
    for(const x of[25,103])for(const y of[25,103]){const rivet=c.createRadialGradient(x-1,y-2,0,x,y,5);rivet.addColorStop(0,'#fff3ce');rivet.addColorStop(.6,'#d2a25f');rivet.addColorStop(1,'#514538');c.beginPath();c.arc(x,y,4,0,7);c.fillStyle=rivet;c.fill();c.strokeStyle='#352f3c88';c.lineWidth=1;c.beginPath();c.moveTo(x-2,y);c.lineTo(x+2,y);c.stroke();}
  }else if(skin==='cosmic'){
    c.fillStyle='#21234f9c';c.fillRect(16,16,96,96);const nebula=c.createRadialGradient(80,37,1,65,58,61);nebula.addColorStop(0,'#e4b8f5aa');nebula.addColorStop(.38,'#9279bf66');nebula.addColorStop(1,'#335d9300');c.fillStyle=nebula;c.fillRect(16,16,96,96);
    for(let i=0;i<31;i++){const x=19+(i*37.7)%88,y=19+(i*23.3)%88;c.fillStyle=i%3?'#fff6da':'#9edce9';c.beginPath();c.arc(x,y,i%5?.7:1.6,0,7);c.fill();if(!(i%7)){c.globalAlpha=.7;c.fillRect(x-4,y-.4,8,.8);c.fillRect(x-.4,y-4,.8,8);c.globalAlpha=1;}}
  }else if(skin==='clay'){
    for(let i=0;i<90;i++){c.fillStyle=i%2?'#fff2cd2e':'#4b40572c';c.beginPath();c.arc(18+(i*17.71)%92,18+(i*13.39)%91,.35+i%3*.2,0,7);c.fill();}
    c.strokeStyle='#291e4445';c.lineWidth=2;c.beginPath();c.arc(64,65,26,0,Math.PI*2);c.stroke();c.strokeStyle='#fff4cf77';c.lineWidth=1.1;c.beginPath();c.arc(64,63,26,0,Math.PI*2);c.stroke();polygon([[45,64],[64,44],[84,64],[64,84]],'#ffffff10','#fff2d780');
  }else{
    const facets=[[[17,17],[52,17],[40,47]],[[52,17],[86,17],[69,43],[40,47]],[[86,17],[110,17],[110,48],[91,41]],[[17,17],[40,47],[17,70]],[[40,47],[69,43],[83,70],[49,80]],[[91,41],[110,48],[110,80],[83,70],[69,43]],[[17,70],[40,47],[49,80],[31,109],[17,109]],[[49,80],[83,70],[80,109],[31,109]],[[83,70],[110,80],[110,109],[80,109]]];
    facets.forEach((p,i)=>polygon(p,['#ffffff22','#ffffff10','#ffffff3b','#f8ffd41c','#092b4220','#ffffff11','#001e3826','#ffffff1a','#001f3b3b'][i],'#ffffff17'));
    c.lineWidth=.85;for(const points of[[[31,18],[39,29],[34,39],[40,47]],[[95,107],[91,96],[99,89],[97,80]],[[17,85],[28,91],[31,109]]]){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#17395340';c.stroke();}
  }
  const sheen=c.createRadialGradient(34,24,0,50,44,80);sheen.addColorStop(0,'#ffffff3b');sheen.addColorStop(.45,'#ffffff0b');sheen.addColorStop(1,'#ffffff00');c.fillStyle=sheen;c.fillRect(16,16,96,96);
  if(skin==='glass'){polygon([[12,91],[76,13],[95,13],[31,108]],'#f7fffa3f');polygon([[39,108],[109,20],[115,27],[47,108]],'#fffdf820');}
  if(ice||skin==='frost'){c.strokeStyle='#efffffaa';c.lineWidth=1.5;for(let i=0;i<6;i++){c.save();c.translate(64,64);c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-32);for(const v of[-25,-17]){c.moveTo(-6,v-5);c.lineTo(0,v);c.lineTo(6,v-5);}c.stroke();c.restore();}}
  c.restore();c.strokeStyle='#fff8e6bb';c.lineWidth=1.2;c.beginPath();c.moveTo(9,5);c.lineTo(119,5);c.moveTo(5,9);c.lineTo(5,113);c.stroke();
  c.fillStyle='#fff9d9b3';c.beginPath();c.arc(7,7,1.8,0,7);c.fill();
  if(tiles.size>=64)tiles.delete(tiles.keys().next().value);tiles.set(key,canvas);return canvas;
}
export function drawBlock(ctx,x,y,size,type,style={},options={}) {
  ctx.save();const alpha=ctx.globalAlpha;ctx.globalAlpha*=options.ghost ? .25 : 1;ctx.drawImage(blockTile(pieceColor(type),style.blocks||'gem',options.ice),x+.4,y+.4,size-.8,size-.8);
  if(options.ghost){ctx.globalAlpha=alpha*.86;ctx.strokeStyle='#15364ad9';ctx.lineWidth=2.5;ctx.strokeRect(x+1.5,y+1.5,size-3,size-3);ctx.strokeStyle='#fff3c4';ctx.lineWidth=.95;ctx.strokeRect(x+1.5,y+1.5,size-3,size-3);}ctx.restore();
}
export function drawMiniPiece(ctx,type,x,y,size,style,rotation=0) {
  const cells=rotatedCells(type,rotation),minX=Math.min(...cells.map(c=>c[0])),minY=Math.min(...cells.map(c=>c[1]));
  for(const [cx,cy]of cells)drawBlock(ctx,x+(cx-minX)*size,y+(cy-minY)*size,size,type,style);
}
const casterBodies=new Map();
function casterBody(style) {
  const key=JSON.stringify([style.robeColor,style.accent,style.skin,style.hairColor,style.hair,style.beard,style.robe,style.hat]);
  if(casterBodies.has(key))return casterBodies.get(key);
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=470;
  const c=canvas.getContext('2d');c.scale(2,2);c.translate(76,226);
  const robe=style.robeColor,accent=style.accent,skin=style.skin,hair=style.hairColor;
  const gradient=(x,y,xx,yy,stops)=>{const g=c.createLinearGradient(x,y,xx,yy);stops.forEach(([at,color])=>g.addColorStop(at,color));return g;};
  const fillPath=(fill,stroke='#172c3f80',line=1.2)=>{c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}};
  const gold=gradient(-36,-180,36,-20,[[0,tint(accent,34)],[.25,accent],[.58,tint(accent,-35)],[.85,tint(accent,22)],[1,tint(accent,-48)]]);
  const cloth=gradient(-36,-120,39,-15,[[0,tint(robe,24)],[.18,tint(robe,4)],[.48,tint(robe,-17)],[.68,tint(robe,8)],[1,tint(robe,-44)]]);
  const shadowCloth=gradient(-50,-90,40,-14,[[0,tint(robe,-16)],[.45,tint(robe,-43)],[1,tint(robe,-65)]]);
  // Rounded boots, stacked soles, cuffs, seams and crossed laces.
  for(const side of[-1,1]){
    c.save();c.translate(side*17,-4);c.rotate(side*.055);
    c.beginPath();c.moveTo(-12,-25);c.quadraticCurveTo(0,-29,12,-23);c.lineTo(13,-9);c.quadraticCurveTo(23,-3,17,4);c.quadraticCurveTo(-1,8,-14,2);c.closePath();
    fillPath(gradient(-14,-25,18,7,[[0,'#83634c'],[.35,'#594237'],[1,'#302b2b']]),'#282b2f',1.5);
    c.beginPath();c.moveTo(-13,1);c.quadraticCurveTo(2,7,17,3);c.strokeStyle='#201f23';c.lineWidth=4;c.stroke();
    c.strokeStyle='#b18b65';c.lineWidth=.9;c.beginPath();c.moveTo(-11,-23);c.lineTo(-10,-4);c.quadraticCurveTo(2,0,14,-3);c.stroke();
    for(let i=0;i<4;i++){c.beginPath();c.moveTo(-5,-19+i*4);c.lineTo(5,-15+i*4);c.moveTo(5,-19+i*4);c.lineTo(-5,-15+i*4);c.strokeStyle='#c5a57c';c.lineWidth=.9;c.stroke();}
    c.restore();
  }
  // The cape has a dark lining, curved hem, and stitched ornamental border.
  c.beginPath();c.moveTo(-23,-122);c.bezierCurveTo(-50,-110,-41,-60,-57,-29);c.quadraticCurveTo(-52,-13,-33,-13);c.quadraticCurveTo(6,-3,48,-18);c.quadraticCurveTo(40,-66,29,-118);c.closePath();fillPath(shadowCloth);
  c.beginPath();c.moveTo(-25,-118);c.bezierCurveTo(-38,-101,-31,-56,-48,-26);c.quadraticCurveTo(-3,-5,41,-23);c.strokeStyle=gold;c.lineWidth=3;c.stroke();
  // The robe's hem and folds read as fabric, not a triangle.
  c.beginPath();c.moveTo(-20,-117);c.quadraticCurveTo(0,-128,23,-115);c.bezierCurveTo(29,-91,23,-59,36,-21);c.quadraticCurveTo(29,-11,14,-16);c.quadraticCurveTo(0,-9,-13,-16);c.quadraticCurveTo(-28,-11,-37,-23);c.bezierCurveTo(-29,-57,-32,-91,-20,-117);c.closePath();fillPath(cloth);
  c.save();c.clip();
  for(let i=0;i<8;i++){
    const x=-30+i*8.6;c.beginPath();c.moveTo(x*.55,-104);c.bezierCurveTo(x-5,-83,x+8,-44,x,-12);c.strokeStyle=i%2?'#06172d36':'#c3e0df1f';c.lineWidth=i%2?5:2.1;c.stroke();
  }
  for(let i=0;i<55;i++){const x=-35+(i*11.73)%72,y=-111+(i*17.31)%94;c.strokeStyle=i%2?'#c9d7cc15':'#071c321a';c.lineWidth=.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+2.5,y+.7);c.stroke();}
  // Individually placed embroidered leaves follow the coat edges.
  c.strokeStyle=gold;c.lineWidth=1.05;c.lineCap='round';
  for(const side of[-1,1]){
    c.beginPath();c.moveTo(side*20,-100);c.bezierCurveTo(side*18,-70,side*25,-42,side*28,-23);c.stroke();
    for(let i=0;i<8;i++){
      const y=-91+i*9,x=side*(18+(i/7)**2*10);c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-side*6,y-6,x-side*7,y-2);c.quadraticCurveTo(x-side*4,y+2,x,y);c.moveTo(x,y+3);c.quadraticCurveTo(x+side*6,y-3,x+side*7,y+1);c.quadraticCurveTo(x+side*3,y+5,x,y+3);c.stroke();
    }
  }
  if(style.robe==='astral'){
    c.strokeStyle=tint(accent,24);c.lineWidth=.8;c.beginPath();c.moveTo(-12,-48);c.lineTo(0,-31);c.lineTo(14,-45);c.lineTo(8,-79);c.stroke();
    for(const [x,y]of[[-12,-48],[0,-31],[14,-45],[8,-79]]){c.fillStyle=accent;c.fillRect(x-2.5,y-.6,5,1.2);c.fillRect(x-.6,y-2.5,1.2,5);}
  }else if(style.robe==='forest'){
    c.strokeStyle=accent;for(let i=0;i<5;i++){const y=-34-i*9;c.beginPath();c.moveTo(1,y+4);c.quadraticCurveTo(-11,y-3,-5,y-7);c.quadraticCurveTo(1,y-8,1,y+4);c.moveTo(1,y+4);c.quadraticCurveTo(13,y-2,8,y-7);c.quadraticCurveTo(1,y-7,1,y+4);c.stroke();}
  }
  c.restore();
  c.beginPath();c.moveTo(-35,-24);c.quadraticCurveTo(0,-10,34,-23);c.strokeStyle=gold;c.lineWidth=2.7;c.stroke();
  // Broad collar with a gold clasp and darker interior under the chin.
  c.beginPath();c.moveTo(-23,-119);c.quadraticCurveTo(-13,-132,0,-124);c.quadraticCurveTo(11,-132,25,-118);c.lineTo(9,-101);c.lineTo(-2,-109);c.lineTo(-13,-102);c.closePath();fillPath(gradient(-24,-128,21,-103,[[0,tint(robe,29)],[.52,tint(robe,-10)],[1,tint(robe,-48)]]));
  c.beginPath();c.moveTo(-22,-118);c.lineTo(-13,-106);c.lineTo(-2,-112);c.lineTo(9,-105);c.lineTo(23,-118);c.strokeStyle=gold;c.lineWidth=1.5;c.stroke();
  // A softened leather belt and metal buckle keep the outfit dimensional.
  c.beginPath();c.moveTo(-28,-69);c.quadraticCurveTo(0,-64,28,-68);c.lineTo(29,-58);c.quadraticCurveTo(0,-54,-29,-59);c.closePath();fillPath(gradient(0,-69,0,-57,[[0,'#886148'],[.42,'#533e36'],[1,'#362e30']]),'#2e2b2c',.9);
  c.strokeStyle='#d6af783e';c.lineWidth=.8;c.beginPath();c.moveTo(-27,-66);c.quadraticCurveTo(0,-61,27,-65);c.stroke();c.setLineDash([1,2]);c.beginPath();c.moveTo(-27,-60);c.quadraticCurveTo(0,-56,28,-59);c.stroke();c.setLineDash([]);
  roundRect(c,-7,-68,14,13,2);c.fillStyle='#292e32';c.fill();c.strokeStyle=gold;c.lineWidth=3;c.stroke();c.beginPath();c.moveTo(-2,-65);c.lineTo(-2,-57);c.strokeStyle=tint(accent,30);c.lineWidth=1;c.stroke();
  if(style.robe==='traveler'){
    c.beginPath();c.moveTo(17,-63);c.lineTo(32,-60);c.lineTo(31,-37);c.quadraticCurveTo(23,-31,15,-37);c.closePath();fillPath(gradient(16,-61,33,-34,[[0,'#bb8f5d'],[1,'#5e4536']]),'#422f2c',1);
    c.beginPath();c.moveTo(16,-60);c.quadraticCurveTo(24,-48,32,-58);c.strokeStyle='#e3bd84';c.lineWidth=1.1;c.stroke();c.fillStyle=gold;c.beginPath();c.arc(24,-53,2,0,7);c.fill();
  }else{
    c.save();c.translate(22,-49);c.rotate(.14);c.beginPath();c.moveTo(-4,-12);c.lineTo(4,-12);c.lineTo(4,-7);c.bezierCurveTo(13,-2,10,12,0,12);c.bezierCurveTo(-10,12,-13,-2,-4,-7);c.closePath();fillPath(gradient(-7,-8,8,10,[[0,'#b3e2deaa'],[.35,'#487e8f80'],[.8,'#b2ede299'],[1,'#355a7488']]),'#e3c48cbb',1.2);c.fillStyle='#9c6d45';c.fillRect(-4,-15,8,5);c.strokeStyle='#f1faf1b3';c.lineWidth=1.3;c.beginPath();c.moveTo(-4,-3);c.quadraticCurveTo(-7,1,-4,6);c.stroke();c.restore();
  }
  // The neck and hair are separate from every outfit option.
  c.fillStyle=tint(skin,-16);roundRect(c,-8,-128,16,15,4);c.fill();
  const hairGradient=gradient(-25,-166,26,-104,[[0,tint(hair,22)],[.4,hair],[1,tint(hair,-34)]]);
  if(style.hair!=='bald'){
    c.beginPath();c.ellipse(0,-142,28,31,0,0,7);fillPath(hairGradient,tint(hair,-28),1);
    if(['long','braids'].includes(style.hair)){c.beginPath();c.moveTo(-25,-144);c.bezierCurveTo(-29,-127,-25,-102,-33,-96);c.quadraticCurveTo(-12,-86,0,-101);c.quadraticCurveTo(15,-88,31,-96);c.bezierCurveTo(25,-107,30,-129,25,-146);c.closePath();fillPath(hairGradient);c.strokeStyle=tint(hair,26);c.lineWidth=.9;for(const side of[-1,1])for(let i=0;i<3;i++){c.beginPath();c.moveTo(side*(18+i*3),-142);c.quadraticCurveTo(side*(14+i*3),-118,side*(22+i*3),-99);c.stroke();}}
  }
  for(const side of[-1,1]){c.beginPath();c.ellipse(side*24,-137,5.5,9,side*.18,0,7);fillPath(gradient(side*24-5,-145,side*24+5,-130,[[0,tint(skin,21)],[1,tint(skin,-21)]]),tint(skin,-48),.65);c.beginPath();c.ellipse(side*25,-137,2,4,0,0,7);c.strokeStyle=tint(skin,-24);c.lineWidth=.8;c.stroke();}
  const face=c.createRadialGradient(-10,-147,2,1,-139,34);face.addColorStop(0,tint(skin,32));face.addColorStop(.55,tint(skin,7));face.addColorStop(1,tint(skin,-25));
  c.beginPath();c.moveTo(-22,-153);c.bezierCurveTo(-31,-134,-18,-114,-1,-112);c.bezierCurveTo(16,-112,30,-132,23,-152);c.quadraticCurveTo(1,-175,-22,-153);fillPath(face,tint(skin,-43),.75);
  // Warm cheeks and a softly lit nose keep the face alive even at small sizes.
  for(const dx of[-15,15]){const cheek=c.createRadialGradient(dx,-130,0,dx,-130,8);cheek.addColorStop(0,'#b7594928');cheek.addColorStop(1,'#bd5c4900');c.fillStyle=cheek;c.fillRect(dx-8,-138,16,16);}
  c.beginPath();c.moveTo(0,-139);c.quadraticCurveTo(-1,-133,-3,-129);c.quadraticCurveTo(0,-126,4,-129);c.strokeStyle=tint(skin,-35);c.lineWidth=1.1;c.stroke();c.beginPath();c.moveTo(-1,-137);c.lineTo(-2,-131);c.strokeStyle=tint(skin,35);c.lineWidth=1;c.stroke();
  c.beginPath();c.moveTo(-7,-122);c.quadraticCurveTo(1,-117,9,-124);c.strokeStyle='#753e3699';c.lineWidth=1.6;c.lineCap='round';c.stroke();c.beginPath();c.moveTo(-3,-120);c.lineTo(5,-121);c.strokeStyle='#fff2d56e';c.lineWidth=.9;c.stroke();
  if(style.hair!=='bald'){
    c.beginPath();c.moveTo(-25,-143);c.bezierCurveTo(-29,-172,-12,-180,10,-171);c.bezierCurveTo(29,-169,30,-153,26,-142);c.quadraticCurveTo(17,-144,14,-157);c.quadraticCurveTo(9,-145,0,-148);c.quadraticCurveTo(5,-157,2,-161);c.quadraticCurveTo(-8,-144,-25,-143);fillPath(hairGradient,tint(hair,-31),.9);
    c.strokeStyle=tint(hair,30);c.lineWidth=1.1;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-20+i*8,-161-i%2*3);c.quadraticCurveTo(-11+i*7,-171,2+i*5,-159+i*2);c.stroke();}
    if(style.hair==='curls'){
      for(let i=0;i<14;i++){const a=Math.PI*.88+i*Math.PI*1.2/13,px=Math.cos(a)*27,py=-141+Math.sin(a)*27;c.beginPath();c.arc(px,py,5.2+i%3*.6,0,7);fillPath(hairGradient,tint(hair,-24),.6);c.beginPath();c.arc(px-1,py-.3,2.8,-.6,3);c.strokeStyle=tint(hair,28);c.lineWidth=.8;c.stroke();}
    }
    if(style.hair==='braids')for(const side of[-1,1]){for(let i=0;i<7;i++){const px=side*(25+Math.sin(i)*1.8),py=-135+i*6;c.beginPath();c.ellipse(px,py,4,4.5,side*.55,0,7);fillPath(hairGradient,tint(hair,-31),.6);c.beginPath();c.moveTo(px-2,py-2);c.lineTo(px+2,py+2);c.strokeStyle=tint(hair,23);c.lineWidth=.7;c.stroke();}c.strokeStyle=gold;c.lineWidth=2;c.beginPath();c.moveTo(side*22,-94);c.lineTo(side*29,-94);c.stroke();}
  }
  if(style.beard!=='none'){
    c.beginPath();if(style.beard==='moustache'){c.moveTo(0,-127);c.quadraticCurveTo(-7,-130,-13,-122);c.quadraticCurveTo(-2,-120,0,-124);c.quadraticCurveTo(6,-120,14,-124);c.quadraticCurveTo(5,-130,0,-127);}else{c.moveTo(-20,-124);c.quadraticCurveTo(-9,-119,-3,-122);c.quadraticCurveTo(3,-119,8,-123);c.quadraticCurveTo(13,-121,21,-126);c.bezierCurveTo(24,-110,8,style.beard==='long'?-91:-106,0,style.beard==='long'?-86:-103);c.quadraticCurveTo(-23,-110,-20,-124);}fillPath(hairGradient,tint(hair,-23),.6);
    c.save();c.clip();for(let i=0;i<10;i++){c.beginPath();c.moveTo(-17+i*4,-124);c.quadraticCurveTo(-13+i*3,-109,-10+i*2,-88);c.strokeStyle=i%2?tint(hair,21):tint(hair,-15);c.lineWidth=.65;c.stroke();}c.restore();
  }
  if(style.hat==='pointed'){
    // Bent cone, interior brim and embroidered front band match the cover's silhouette.
    const hat=gradient(-42,-212,35,-159,[[0,tint(robe,29)],[.32,tint(robe,-4)],[.7,tint(robe,-26)],[1,tint(robe,-55)]]);
    c.beginPath();c.moveTo(-29,-165);c.bezierCurveTo(-27,-189,-36,-203,-31,-216);c.quadraticCurveTo(-11,-219,2,-199);c.quadraticCurveTo(16,-193,28,-166);c.closePath();fillPath(hat);
    c.beginPath();c.moveTo(-28,-211);c.bezierCurveTo(-16,-210,-9,-191,0,-178);c.strokeStyle='#bdd6c42f';c.lineWidth=3;c.stroke();
    c.beginPath();c.ellipse(-1,-160,43,11,-.12,0,7);fillPath(gradient(-40,-168,40,-152,[[0,tint(robe,17)],[.35,tint(robe,-14)],[1,tint(robe,-59)]]),gold,2);
    c.beginPath();c.ellipse(-1,-158,38,6,-.12,0,Math.PI);c.strokeStyle='#0b1f30a6';c.lineWidth=2.4;c.stroke();
    c.beginPath();c.moveTo(-27,-173);c.quadraticCurveTo(-4,-165,24,-173);c.strokeStyle=gold;c.lineWidth=4;c.stroke();c.beginPath();c.moveTo(-25,-176);c.quadraticCurveTo(-3,-169,22,-176);c.strokeStyle=tint(accent,34);c.lineWidth=.8;c.stroke();
    for(let i=0;i<5;i++){const px=-23+i*7,py=-183-i%2*5;c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px-4,py-6,px+1,py-8);c.quadraticCurveTo(px+6,py-7,px+2,py-4);c.strokeStyle=gold;c.lineWidth=1;c.stroke();}
    c.beginPath();c.arc(-31,-214,2,0,7);c.fillStyle=gold;c.fill();
  }else if(style.hat==='hood'){
    c.beginPath();c.moveTo(-26,-123);c.bezierCurveTo(-43,-149,-24,-180,0,-177);c.bezierCurveTo(27,-180,42,-149,25,-123);c.lineTo(22,-135);c.bezierCurveTo(34,-153,16,-170,0,-169);c.bezierCurveTo(-17,-170,-34,-151,-22,-134);c.closePath();fillPath(cloth,accent,1.5);
    c.beginPath();c.moveTo(-28,-137);c.bezierCurveTo(-34,-159,-15,-174,0,-172);c.strokeStyle='#ffffff20';c.lineWidth=2;c.stroke();
  }else if(style.hat==='crown'){
    c.beginPath();c.moveTo(-25,-161);c.lineTo(-26,-179);c.lineTo(-13,-169);c.lineTo(0,-186);c.lineTo(12,-169);c.lineTo(26,-179);c.lineTo(24,-161);c.quadraticCurveTo(0,-155,-25,-161);fillPath(gold,'#644b3d',.9);
    c.fillStyle='#71bfcc';c.beginPath();c.moveTo(0,-178);c.lineTo(5,-170);c.lineTo(0,-163);c.lineTo(-5,-170);c.closePath();c.fill();c.strokeStyle='#dafbfa';c.lineWidth=.7;c.stroke();c.beginPath();c.moveTo(-22,-162);c.quadraticCurveTo(0,-157,21,-162);c.strokeStyle=tint(accent,35);c.lineWidth=1;c.stroke();
  }
  const clasp=c.createRadialGradient(-2,-110,0,0,-107,8);clasp.addColorStop(0,tint(accent,58));clasp.addColorStop(.5,accent);clasp.addColorStop(1,tint(accent,-61));c.fillStyle=clasp;c.beginPath();c.arc(0,-108,6.6,0,7);c.fill();c.strokeStyle='#3d473d';c.lineWidth=.7;c.stroke();
  c.strokeStyle='#fff3c0';c.lineWidth=.9;c.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*4/5;c.lineTo(Math.cos(a)*4.5,-108+Math.sin(a)*4.5);}c.closePath();c.stroke();
  if(casterBodies.size>=24)casterBodies.delete(casterBodies.keys().next().value);casterBodies.set(key,canvas);return canvas;
}
export function mageWandPoint(x,y,height,{time=0,cast=false,celebrate=false}={}) {
  const lift=cast||celebrate?13+Math.sin(time*2.8)*2.4:0;
  return {x:x+73*height/200,y:y+(Math.sin(time*1.7)*.5-165-lift)*height/200};
}
export function drawMage(ctx,x,y,height,style=normalizeMage(),{time=0,cast=false,celebrate=false}={}) {
  const robe=style.robeColor,accent=style.accent,skin=style.skin,hair=style.hairColor;
  const breath=Math.sin(time*1.7)*.5,lift=cast||celebrate?13+Math.sin(time*2.8)*2.4:0;
  ctx.save();ctx.translate(x,y);ctx.scale(height/200,height/200);
  ctx.fillStyle='#122c493d';ctx.beginPath();ctx.ellipse(0,2,39,7,0,0,7);ctx.fill();ctx.translate(0,breath);
  const cloth=ctx.createLinearGradient(-40,-119,51,-78);cloth.addColorStop(0,tint(robe,14));cloth.addColorStop(.4,robe);cloth.addColorStop(1,tint(robe,-43));
  // Rounded sleeves bend at an elbow and retain their shape as the wand lifts.
  ctx.beginPath();ctx.moveTo(-22,-114);ctx.bezierCurveTo(-37,-109,-44,-95,-45,-79);ctx.quadraticCurveTo(-39,-73,-31,-78);ctx.lineTo(-23,-103);ctx.closePath();ctx.fillStyle=cloth;ctx.fill();ctx.strokeStyle='#16304388';ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.moveTo(20,-113);ctx.quadraticCurveTo(37,-109-lift,48,-123-lift);ctx.lineTo(58,-117-lift);ctx.quadraticCurveTo(49,-87-lift,33,-91);ctx.lineTo(20,-101);ctx.closePath();ctx.fillStyle=cloth;ctx.fill();ctx.stroke();
  ctx.strokeStyle=accent;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(47,-121-lift);ctx.quadraticCurveTo(51,-116-lift,58,-116-lift);ctx.moveTo(-44,-82);ctx.quadraticCurveTo(-37,-77,-32,-81);ctx.stroke();
  ctx.strokeStyle='#c5e0d32c';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(28,-111);ctx.quadraticCurveTo(37,-104,47,-115-lift);ctx.moveTo(-28,-106);ctx.quadraticCurveTo(-36,-98,-38,-86);ctx.stroke();
  ctx.drawImage(casterBody(style),-76,-226,160,235);
  // Eyes track the levitating piece; a soft blink does not change the face geometry.
  const blink=Math.sin(time*.72)>.997,look=cast?1.5:0;
  for(const side of[-1,1]){
    const ex=side*9.5,ey=-139;ctx.strokeStyle=tint(hair,-22);ctx.lineWidth=1.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(ex-4,-147);ctx.quadraticCurveTo(ex,-150,ex+4,-147+side*.5);ctx.stroke();
    if(blink){ctx.beginPath();ctx.moveTo(ex-4,ey);ctx.quadraticCurveTo(ex,ey+1,ex+4,ey);ctx.stroke();}
    else{ctx.beginPath();ctx.ellipse(ex,ey,4.7,5.8,.07,0,7);ctx.fillStyle='#fff1d7';ctx.fill();ctx.strokeStyle='#77524090';ctx.lineWidth=.65;ctx.stroke();const iris=ctx.createRadialGradient(ex+look,ey-1,0,ex+look,ey,3.3);iris.addColorStop(0,'#b58b55');iris.addColorStop(.6,'#715335');iris.addColorStop(1,'#362b27');ctx.fillStyle=iris;ctx.beginPath();ctx.ellipse(ex+look,ey-.5,2.9,4,0,0,7);ctx.fill();ctx.fillStyle='#201f25';ctx.beginPath();ctx.ellipse(ex+look+.4,ey-.6,1.4,2.6,0,0,7);ctx.fill();ctx.fillStyle='#fffcef';ctx.beginPath();ctx.arc(ex+look-.6,ey-2.2,1.1,0,7);ctx.fill();}
  }
  // Individually drawn fingers wrap around the staff instead of floating beside it.
  const hand=ctx.createLinearGradient(44,-123-lift,57,-109-lift);hand.addColorStop(0,tint(skin,30));hand.addColorStop(1,tint(skin,-21));
  ctx.beginPath();ctx.ellipse(-39,-75,5.5,7,-.15,0,7);ctx.fillStyle=hand;ctx.fill();ctx.strokeStyle=tint(skin,-37);ctx.lineWidth=.65;ctx.stroke();for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-43+i*2,-74);ctx.lineTo(-42+i*2,-70);ctx.stroke();}
  ctx.strokeStyle='#352d2c';ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(48,-106-lift);ctx.lineTo(71,-158-lift);ctx.stroke();ctx.strokeStyle='#a27b4c';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(48,-106-lift);ctx.lineTo(71,-158-lift);ctx.stroke();ctx.strokeStyle='#d8b87e';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(48,-108-lift);ctx.lineTo(70,-159-lift);ctx.stroke();
  ctx.beginPath();ctx.ellipse(52,-117-lift,5.2,7,.35,0,7);ctx.fillStyle=hand;ctx.fill();ctx.strokeStyle=tint(skin,-39);ctx.lineWidth=.65;ctx.stroke();for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(50+i,-122-lift+i*3);ctx.quadraticCurveTo(56,-123-lift+i*3,56,-120-lift+i*3);ctx.stroke();}
  for(let i=0;i<3;i++){ctx.strokeStyle=accent;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(62+i,-144-lift-i*3);ctx.lineTo(66+i,-143-lift-i*3);ctx.stroke();}
  if(style.wand==='moon'){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(73,-166-lift,8,-1.1,4.4);ctx.quadraticCurveTo(76,-158-lift,73,-173-lift);ctx.closePath();ctx.fill();ctx.strokeStyle=tint(accent,36);ctx.lineWidth=.8;ctx.stroke();}
  else if(style.wand==='crystal'){ctx.beginPath();ctx.moveTo(74,-178-lift);ctx.lineTo(80,-166-lift);ctx.lineTo(73,-155-lift);ctx.lineTo(67,-165-lift);ctx.closePath();const crystal=ctx.createLinearGradient(67,-170,80,-162);crystal.addColorStop(0,'#e4ffef');crystal.addColorStop(.45,'#80dbe1');crystal.addColorStop(1,'#367b9e');ctx.fillStyle=crystal;ctx.fill();ctx.strokeStyle='#dbfff5';ctx.lineWidth=.8;ctx.stroke();ctx.beginPath();ctx.moveTo(74,-178-lift);ctx.lineTo(73,-155-lift);ctx.stroke();}
  if(cast||celebrate){const glow=ctx.createRadialGradient(73,-165-lift,0,73,-165-lift,19);glow.addColorStop(0,tint(accent,50)+'d9');glow.addColorStop(.2,accent+'8c');glow.addColorStop(1,accent+'00');ctx.fillStyle=glow;ctx.fillRect(53,-185-lift,40,40);ctx.fillStyle=tint(accent,45);ctx.beginPath();ctx.arc(73,-165-lift,2.2,0,7);ctx.fill();}
  ctx.restore();
}
const scenery=new Map();
const paintedImages=new Map();
const paintedStates=new Map(),pendingShopPreviews=new Map();
let nextPreviewId=0;
function refreshShopPreviews() {
  if(typeof document==='undefined')return;
  const waiting=new Map(pendingShopPreviews);pendingShopPreviews.clear();
  // Keep only primitive descriptors globally. Detached cards are never retained.
  for(const canvas of document.querySelectorAll('canvas[data-tetris-preview-pending]')){
    const item=waiting.get(canvas.dataset.tetrisPreviewPending);delete canvas.dataset.tetrisPreviewPending;
    if(item&&canvas.isConnected)drawTetrisShopPreview(canvas,item);
  }
}
function rememberShopPreview(canvas,item) {
  if(!canvas.isConnected||![...paintedStates.values()].includes('loading'))return;
  const id=canvas.dataset.tetrisPreviewPending||String(++nextPreviewId);canvas.dataset.tetrisPreviewPending=id;
  pendingShopPreviews.set(id,{setting:item.setting,value:item.value,name:item.name});
  while(pendingShopPreviews.size>64)pendingShopPreviews.delete(pendingShopPreviews.keys().next().value);
}
function paintedImage(name) {
  if(typeof Image==='undefined')return null;
  if(!paintedImages.has(name)){
    const img=new Image();img.decoding='async';paintedImages.set(name,img);paintedStates.set(name,'loading');
    img.onload=()=>{paintedStates.set(name,'loaded');scenery.clear();refreshShopPreviews();};
    img.onerror=()=>{paintedStates.set(name,'error');scenery.clear();refreshShopPreviews();};
    img.src=new URL('./assets/'+name,import.meta.url).href;
  }
  const img=paintedImages.get(name);return img.complete&&img.naturalWidth?img:null;
}
function islandScenery(w,h,scene) {
  const key=`${Math.round(w)}:${Math.round(h)}:${scene}`;
  if(scenery.has(key))return scenery.get(key);
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*2);canvas.height=Math.ceil(h*2);
  const ctx=canvas.getContext('2d');ctx.scale(2,2);const night=scene!=='lagoon',horizon=h*.64;
  const painted=paintedImage('tetris-seascape.png');
  if(painted){
    const aspect=w/h,sourceWidth=Math.min(painted.width,painted.height*aspect),sourceHeight=Math.min(painted.height,painted.width/aspect),sx=(painted.width-sourceWidth)*.52,sy=(painted.height-sourceHeight)*.35;
    ctx.drawImage(painted,sx,sy,sourceWidth,sourceHeight,0,0,w,h);
    if(night){ctx.globalCompositeOperation='multiply';ctx.fillStyle=scene==='aurora'?'#3a456f':'#646083';ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';const veil=ctx.createLinearGradient(0,0,0,h);veil.addColorStop(0,scene==='aurora'?'#10284c70':'#1d244c4d');veil.addColorStop(.55,'#4766800b');veil.addColorStop(1,'#163d602e');ctx.fillStyle=veil;ctx.fillRect(0,0,w,h);for(let i=0;i<40;i++){ctx.fillStyle=i%3?'#fcf5d680':'#fcf5d6c4';ctx.beginPath();ctx.arc((i*79.7)%w,(i*37.23)%(h*.29),i%5?.55:1,0,7);ctx.fill();}}
    if(scene==='aurora')for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-20,h*.08+i*12);ctx.bezierCurveTo(w*.25,h*.01,w*.65,h*.3,w+20,h*.09+i*15);ctx.strokeStyle=['#6af0b82e','#b4a1e82e','#80dce42e'][i];ctx.lineWidth=25-i*3;ctx.stroke();}
    if(scenery.size>=12)scenery.delete(scenery.keys().next().value);scenery.set(key,canvas);return canvas;
  }
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
  const background=islandScenery(w,h,scene);ctx.drawImage(background,0,0,w,h);const night=scene!=='lagoon';
  if(paintedImage('tetris-seascape.png')){
    // Tiny texture displacements and moving glints animate the real painted water.
    ctx.save();ctx.globalAlpha=.21;
    for(let i=0;i<14;i++){const depth=i/14,top=h*(.52+depth*.48),band=h*.48/14,shift=Math.sin(time*.72+i*.9)*(.25+depth*.8);ctx.drawImage(background,0,top*2,w*2,Math.min(band*2,background.height-top*2),shift,top,w,band);}
    ctx.globalAlpha=1;
    for(let i=0;i<32;i++){const depth=((i*17.39)%1),x=((i*47.7)%w),y=h*(.53+depth*.47),alpha=(.035+.025*Math.sin(time*1.8+i))*Math.max(.1,depth);ctx.strokeStyle='rgba(255,239,193,'+alpha+')';ctx.lineWidth=.55+depth*.6;ctx.beginPath();ctx.moveTo(x-2-depth*5,y);ctx.quadraticCurveTo(x,y-.8,x+2+depth*6,y);ctx.stroke();}
    ctx.restore();return;
  }
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
  const painted=paintedImage('tetris-island.png');
  if(painted){
    // The center of the grassy shelf lies at source y=400. Its usable span is 1450 px.
    // Uniform scaling keeps the rock, flowers, and cliff faces in believable proportion.
    const scale=width/1450,dw=painted.width*scale,dh=painted.height*scale,top=y-400*scale,foam=y+355*scale;
    ctx.drawImage(painted,cx-dw/2,top,dw,dh);
    ctx.save();ctx.strokeStyle='#edfff550';ctx.lineWidth=Math.max(.55,scale*5);
    for(let i=0;i<3;i++){const phase=(time*.3+i/3)%1;ctx.globalAlpha=(1-phase)*.5;ctx.beginPath();ctx.ellipse(cx+Math.sin(time*.5+i)*width*.008,foam+phase*5,width*(.54+phase*.05),2+phase*3,0,.07,Math.PI*.95);ctx.stroke();}
    ctx.restore();return;
  }
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
export function drawGorilla(ctx,x,y,size,hunger=30,angry=0,time=0,options={}) {
  const reduced=!!options.reduced,feeding=!!options.feeding,urgent=options.urgent??hunger<=8,warning=options.warning??hunger<=16;
  if(reduced)time=0;
  const rage=Math.min(1,Math.max(0,angry)),breathe=Math.sin(time*1.9)*.8,chew=feeding?Math.sin(time*15)*1.1:0;
  ctx.save();ctx.translate(x+(reduced?0:Math.sin(time*30)*rage*1.6),y);ctx.scale(size/120,size/120);ctx.lineCap='round';
  const fur=ctx.createLinearGradient(-42,-127,41,-8);fur.addColorStop(0,'#887664');fur.addColorStop(.23,'#574e4a');fur.addColorStop(.65,'#3d3b40');fur.addColorStop(1,'#242c37');
  const skin=ctx.createLinearGradient(-25,-117,30,-55);skin.addColorStop(0,'#b69b7b');skin.addColorStop(.4,'#8e7665');skin.addColorStop(1,'#605753');
  const drawFur=(cx,cy,rx,ry,count)=>{
    ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,7);ctx.clip();
    for(let i=0;i<count;i++){
      const px=cx-rx+((i*17.713)%1)*rx*2,py=cy-ry+((i*13.379)%1)*ry*2;
      ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px+1.8,py+2,px+Math.sin(i)*1.5,py+4+i%3);
      ctx.strokeStyle=i%4===0?'#c0ab8c50':i%2?'#92837142':'#151f303d';ctx.lineWidth=.55+i%3*.18;ctx.stroke();
    }ctx.restore();
  };
  const hands=[];
  // Shoulder, elbow and wrist move as three connected joints.
  for(const side of[-1,1]){
    let hx=side*50,hy=-12,ex=side*44,ey=-48;
    if(rage){hx=side*(48+Math.sin(time*18)*4);hy=-92-rage*22;ex=side*52;ey=-66-rage*14;}
    else if(side===1&&feeding){hx=7;hy=-91+chew;ex=45;ey=-58;}
    else if(side===1&&warning){hx=9+Math.sin(time*3)*3;hy=-39;ex=42;ey=-51;}
    else if(side===-1&&urgent){hx=-33;hy=-79+Math.sin(time*4)*3;ex=-51;ey=-46;}
    ctx.beginPath();ctx.moveTo(side*26,-74+breathe);ctx.quadraticCurveTo(ex,ey,hx,hy);ctx.strokeStyle='#24303b';ctx.lineWidth=27;ctx.stroke();ctx.strokeStyle=fur;ctx.lineWidth=24;ctx.stroke();
    ctx.beginPath();ctx.moveTo(side*29,-75+breathe);ctx.quadraticCurveTo(ex-side*3,ey,hx-side*4,hy-3);ctx.strokeStyle='#a893714f';ctx.lineWidth=2.2;ctx.stroke();hands.push({side,hx,hy});
  }
  // Heavy feet, silvered shoulder hair and a shaded chest.
  for(const side of[-1,1]){ctx.beginPath();ctx.ellipse(side*21,-4,16,8,side*.08,0,7);ctx.fillStyle='#34343c';ctx.fill();ctx.strokeStyle='#171f2b';ctx.lineWidth=1.2;ctx.stroke();for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(side*21-6+i*5,-4);ctx.lineTo(side*21-6+i*5,0);ctx.strokeStyle='#807669';ctx.lineWidth=.7;ctx.stroke();}}
  ctx.beginPath();ctx.ellipse(0,-49+breathe,37,45,0,0,7);ctx.fillStyle=fur;ctx.fill();ctx.strokeStyle='#26303c';ctx.lineWidth=1.3;ctx.stroke();drawFur(0,-49+breathe,36,44,115);
  const chest=ctx.createRadialGradient(-8,-63,1,0,-46,36);chest.addColorStop(0,'#ad9780');chest.addColorStop(.4,'#877767');chest.addColorStop(1,'#4a4950');
  ctx.beginPath();ctx.moveTo(-20,-75);ctx.quadraticCurveTo(0,-82,22,-73);ctx.bezierCurveTo(29,-48,25,-23,1,-19);ctx.bezierCurveTo(-22,-19,-29,-47,-20,-75);ctx.fillStyle=chest;ctx.fill();
  ctx.strokeStyle='#392f3636';ctx.lineWidth=1;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-15+i,-60+i*7);ctx.quadraticCurveTo(0,-56+i*7,15-i,-61+i*7);ctx.stroke();}
  ctx.beginPath();ctx.ellipse(0,-104+breathe,31,34,0,0,7);ctx.fillStyle=fur;ctx.fill();ctx.strokeStyle='#28303a';ctx.lineWidth=1.2;ctx.stroke();drawFur(0,-104+breathe,30,33,95);
  for(const side of[-1,1]){ctx.beginPath();ctx.ellipse(side*29,-102,5,8,side*.12,0,7);ctx.fillStyle='#665b54';ctx.fill();ctx.beginPath();ctx.ellipse(side*30,-102,2,4,0,0,7);ctx.fillStyle='#3d3b41';ctx.fill();}
  // A heart-shaped bare face with deep eye sockets and a broad leathery muzzle.
  ctx.beginPath();ctx.moveTo(0,-117);ctx.bezierCurveTo(-13,-131,-26,-119,-24,-106);ctx.quadraticCurveTo(-27,-94,-17,-87);ctx.quadraticCurveTo(0,-75,18,-87);ctx.quadraticCurveTo(28,-95,24,-108);ctx.bezierCurveTo(23,-122,10,-128,0,-117);ctx.fillStyle=skin;ctx.fill();ctx.strokeStyle='#443c40';ctx.lineWidth=.85;ctx.stroke();
  for(const side of[-1,1]){
    ctx.beginPath();ctx.ellipse(side*10,-108,8,6,-side*.07,0,7);ctx.fillStyle='#4e4746';ctx.fill();
    const blink=!feeding&&Math.sin(time*.78)>.996;
    ctx.beginPath();ctx.ellipse(side*10,-108,4.7,blink?.7:3.7,-side*.08,0,7);ctx.fillStyle='#eddec1';ctx.fill();
    if(!blink){ctx.beginPath();ctx.arc(side*10+(feeding?-.6:.4),-107.7,2.35,0,7);ctx.fillStyle=urgent?'#b77c39':'#866946';ctx.fill();ctx.beginPath();ctx.arc(side*10+.4,-107.5,1.25,0,7);ctx.fillStyle='#252732';ctx.fill();ctx.beginPath();ctx.arc(side*10-.4,-109,0.8,0,7);ctx.fillStyle='#fff8d8';ctx.fill();}
    ctx.beginPath();ctx.moveTo(side*4,-116+(urgent?2:0));ctx.quadraticCurveTo(side*12,-119,side*20,-115-(urgent?3:0));ctx.strokeStyle='#403d40';ctx.lineWidth=4.5;ctx.stroke();ctx.strokeStyle='#9a88702b';ctx.lineWidth=1;ctx.stroke();
  }
  const muzzle=ctx.createRadialGradient(-5,-94,1,0,-91,24);muzzle.addColorStop(0,'#a3907b');muzzle.addColorStop(.52,'#806f65');muzzle.addColorStop(1,'#5b5253');
  ctx.beginPath();ctx.ellipse(0,-91+chew*.2,19,14+chew*.3,0,0,7);ctx.fillStyle=muzzle;ctx.fill();ctx.strokeStyle='#3c3c4477';ctx.lineWidth=.8;ctx.stroke();
  ctx.beginPath();ctx.moveTo(-11,-100);ctx.quadraticCurveTo(0,-106,11,-100);ctx.quadraticCurveTo(12,-90,0,-90);ctx.quadraticCurveTo(-13,-90,-11,-100);ctx.fillStyle='#3a393e';ctx.fill();
  for(const side of[-1,1]){ctx.beginPath();ctx.ellipse(side*5,-96,2.7,1.8,side*.2,0,7);ctx.fillStyle='#1c2631';ctx.fill();}
  ctx.strokeStyle='#c0aa8a60';ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(-7,-101);ctx.quadraticCurveTo(0,-104,7,-101);ctx.stroke();
  if(rage||urgent&&!feeding){
    ctx.beginPath();ctx.ellipse(0,-82,10,rage?7:3.7,0,0,7);ctx.fillStyle='#332935';ctx.fill();if(rage){ctx.fillStyle='#e4d8b8';roundRect(ctx,-7,-87,14,3,1);ctx.fill();ctx.fillStyle='#a77b72';ctx.beginPath();ctx.ellipse(0,-78,5.5,2,0,0,7);ctx.fill();}
  }else{ctx.beginPath();ctx.moveTo(-10,-83+chew*.3);ctx.quadraticCurveTo(0,-77+chew,10,-84+chew*.3);ctx.strokeStyle='#44343b';ctx.lineWidth=2.4;ctx.stroke();ctx.strokeStyle='#c7af8e40';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(-7,-79+chew);ctx.quadraticCurveTo(0,-76+chew,7,-80+chew);ctx.stroke();}
  for(const {side,hx,hy}of hands){
    ctx.beginPath();ctx.ellipse(hx,hy,7.5,9,side*.17,0,7);ctx.fillStyle=skin;ctx.fill();ctx.strokeStyle='#32313b';ctx.lineWidth=1;ctx.stroke();
    for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(hx-5+i*3.2,hy+3,1.7,3,-side*.1,0,7);ctx.fillStyle=i%2?'#8b7866':'#9f8b73';ctx.fill();ctx.strokeStyle='#4d4547';ctx.lineWidth=.55;ctx.stroke();}
  }
  if(feeding)drawBanana(ctx,4,-91,.34,-.7);
  ctx.restore();
}
export function drawBanana(ctx,x,y,scale=1,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(scale,scale);ctx.beginPath();ctx.moveTo(-14,-9);ctx.bezierCurveTo(-3,5,10,10,18,-4);ctx.bezierCurveTo(20,23,-13,22,-17,-6);ctx.closePath();ctx.fillStyle='#edcb59';ctx.fill();ctx.strokeStyle='#b98e39';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(-12,-4);ctx.quadraticCurveTo(-2,19,15,5);ctx.strokeStyle='#fff2ac';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#6d573a';ctx.fillRect(-18,-11,5,6);ctx.restore();}
export function drawTetrisShopPreview(canvas,item) {
  canvas.width=560;canvas.height=320;const ctx=canvas.getContext('2d'),style={...normalizeMage(),[item.setting]:item.value};drawIslandSky(ctx,560,320,0,style.scene);
  if(['blocks','scene'].includes(item.setting)){drawIsland(ctx,280,264,250,50);drawMiniPiece(ctx,'L',203,116,43,style);drawMiniPiece(ctx,'T',245,207,43,style);}else{drawIsland(ctx,280,280,190,38);drawMage(ctx,270,275,225,style,{cast:true});}
  canvas.setAttribute('aria-label',`${item.name} preview`);
  rememberShopPreview(canvas,item);
}
