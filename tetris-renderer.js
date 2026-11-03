import {islandCells,rotatedCells} from './tetris-config.js';
import {classicGhost} from './tetris-classic.js';
import {bodyAngle,landingHeight,islandFinishLine} from './tetris-islands.js';
import {drawBlock,drawMage,drawIslandSky,drawIsland,drawGorilla,drawBanana,drawMiniPiece,roundRect,pieceColor} from './tetris-art.js';

export function fitTetrisCanvas(canvas) {
  const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height),dpr=Math.min(2,globalThis.devicePixelRatio||1);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w,h};
}
function text(ctx,label,x,y,size=11,color='#f9edd1',align='left'){ctx.font=`600 ${size}px Inter, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(label,x,y);}
export function drawClassicBoard(canvas,state,style,{light=false,reduced=false}={}) {
  const {ctx,w,h}=fitTetrisCanvas(canvas),unit=Math.min((w-112)/10,(h-54)/20),x=Math.max(13,(w-10*unit-104)/2),y=28,side=x+10*unit+17;
  ctx.fillStyle=light?'#eaf0ed':'#162336';ctx.fillRect(0,0,w,h);
  const back=ctx.createLinearGradient(x,y,x+10*unit,y+20*unit);back.addColorStop(0,light?'#fffdf3':'#12293a');back.addColorStop(1,light?'#e6eee6':'#18243b');
  roundRect(ctx,x-4,y-4,10*unit+8,20*unit+8,5);ctx.fillStyle=back;ctx.fill();ctx.strokeStyle=light?'#9eb7ae':'#547c8e';ctx.lineWidth=1.5;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.rect(x,y,10*unit,20*unit);ctx.clip();
  ctx.strokeStyle=light?'#78958120':'#9dc6d512';ctx.lineWidth=.6;for(let i=0;i<=10;i++){ctx.beginPath();ctx.moveTo(x+i*unit,y);ctx.lineTo(x+i*unit,y+20*unit);ctx.stroke();}for(let i=0;i<=20;i++){ctx.beginPath();ctx.moveTo(x,y+i*unit);ctx.lineTo(x+10*unit,y+i*unit);ctx.stroke();}
  for(let row=0;row<20;row++)for(let col=0;col<10;col++)if(state.grid[row][col])drawBlock(ctx,x+col*unit,y+row*unit,unit,state.grid[row][col],style);
  const ghost=classicGhost(state),p=state.active;
  if(state.status==='playing'&&p){for(const [cx,cy]of rotatedCells(ghost.type,ghost.rotation))drawBlock(ctx,x+(ghost.x+cx)*unit,y+(ghost.y+cy)*unit,unit,ghost.type,style,{ghost:true});for(const [cx,cy]of rotatedCells(p.type,p.rotation))drawBlock(ctx,x+(p.x+cx)*unit,y+(p.y+cy)*unit,unit,p.type,style);}
  for(const effect of state.effects){const age=state.seconds-effect.time;if(effect.kind==='lines'){ctx.fillStyle=`rgba(255,241,181,${Math.max(0,.7-age)})`;for(const row of effect.rows)ctx.fillRect(x,y+row*unit,unit*10,unit);}if(effect.kind==='smash'&&!reduced){for(const [i,c]of effect.cells.entries()){ctx.save();ctx.translate(x+(c.x+.5)*unit+Math.sin(i*5)*age*55,y+(c.y+.5)*unit-age*30+age*age*65);ctx.rotate(age*(i%2?3:-3));ctx.globalAlpha=Math.max(0,1-age);drawBlock(ctx,-unit*.35,-unit*.35,unit*.7,c.type,style);ctx.restore();}}}
  ctx.restore();const ink=light?'#405f66':'#c1dce0';
  text(ctx,'NEXT',side,y+6,10,ink);for(let i=0;i<3;i++)drawMiniPiece(ctx,state.sequence[(state.index+i)%state.sequence.length],side,y+22+i*61,Math.min(17,(w-side-9)/4),style);
  text(ctx,'HOLD / C',side,y+222,10,ink);if(state.hold)drawMiniPiece(ctx,state.hold,side,y+238,Math.min(17,(w-side-9)/4),style);else text(ctx,'Empty',side,y+250,10,ink);
  if(state.gorilla){const gx=side+(w-side)/2-3,gy=h-71;drawGorilla(ctx,gx,gy,Math.min(93,w-side-2),state.hunger,reduced?0:state.anger,state.seconds);text(ctx,state.hunger<7?'GETTING HUNGRY':'BANANA BREAK',gx,gy+15,8,ink,'center');drawBanana(ctx,gx-14,gy+30,.43);text(ctx,`x ${state.bananas}`,gx+3,gy+35,11,ink);for(const e of state.effects)if(e.kind==='banana'&&!reduced){const t=Math.min(1,(state.seconds-e.time)/.8);drawBanana(ctx,gx-40*(1-t),gy-20-70*Math.sin(t*Math.PI),.55,t*2);}}
  else drawMage(ctx,side+(w-side)/2-8,h-30,Math.min(130,(w-side)*1.6),style,{time:reduced?0:state.seconds,cast:state.status==='playing'});
  text(ctx,'10 x 20 / CLEAR COMPLETE ROWS',x,y+20*unit+20,8,ink);
}
export function drawIslandBoard(canvas,round,p,style,{reduced=false}={}) {
  const {ctx,w,h}=fitTetrisCanvas(canvas),time=reduced?0:round.seconds;
  drawIslandSky(ctx,w,h,time,style.scene);
  const maxTop=Math.max(round.mode==='race'?round.level.goal+4:round.mode==='puzzle'?round.level.ceiling+5:17,...round.players.map(v=>Math.max(v.top+6,v.active?.y+3||0)));
  const previous=canvas._tetrisCamera||maxTop;const camera=reduced?maxTop:previous+(maxTop-previous)*.035;canvas._tetrisCamera=camera;
  const unit=Math.min(w/(p.width+6),(h-100)/camera),cx=w/2,ground=h-78,wy=v=>ground-v*unit;
  // Measurement marks make the descending goal and the puzzle lift readable.
  ctx.strokeStyle='#4c748e40';ctx.lineWidth=1;for(let altitude=0;altitude<camera;altitude+=4){const y=wy(altitude);ctx.beginPath();ctx.moveTo(9,y);ctx.lineTo(16,y);ctx.stroke();text(ctx,`${altitude}`,20,y+3,8,'#31536b');}
  if(round.mode==='race'||round.mode==='puzzle'){
    const goal=round.mode==='race'?islandFinishLine(round):round.level.ceiling,y=wy(goal),color=round.mode==='race'?'#fff3b3':'#dcfbff';
    ctx.save();ctx.shadowColor=round.mode==='race'?'#d2a350':'#87d6ef';ctx.shadowBlur=8;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(round.mode==='race'?[8,5]:[3,3]);ctx.beginPath();ctx.moveTo(8,y);ctx.lineTo(w-8,y);ctx.stroke();ctx.restore();
    ctx.fillStyle=round.mode==='race'?'#486a68dd':'#365c7fdd';roundRect(ctx,w/2-56,y-22,112,17,5);ctx.fill();text(ctx,round.mode==='race'?`FINISH / ${goal.toFixed(1)} m`:'FROST LINE',w/2,y-10,8,color,'center');
    if(round.mode==='race'&&p.raceHold>0){ctx.fillStyle='#f6d46c';ctx.fillRect(8,y+5,(w-16)*Math.min(1,p.raceHold/1.5),3);}
  }
  drawIsland(ctx,cx,wy(p.base),p.width*unit,Math.min(66,unit*3.5),time);
  // A small ledge keeps the caster beside the playable footprint.
  const mageX=Math.max(31,cx-(p.width/2+1.35)*unit),mageY=wy(p.base)+3;
  drawIsland(ctx,mageX,mageY,unit*2,unit*2.1,time);drawMage(ctx,mageX-2,mageY,Math.max(42,Math.min(91,unit*3.55)),style,{time,cast:!!p.active,celebrate:p.status==='complete'});
  if(p.buffs.shield){ctx.beginPath();ctx.ellipse(cx,wy(p.base+(p.top-p.base)/2),p.width*unit*.7,Math.max(35,(p.top-p.base)*unit*.6),0,0,7);ctx.strokeStyle='#e7fdf88c';ctx.lineWidth=2;ctx.stroke();}
  const frozen=round.mode==='puzzle'&&p.status!=='building';
  for(const item of p.pieces){ctx.save();ctx.translate(cx+item.body.position.x*unit,wy(item.body.position.y));ctx.rotate(-bodyAngle(item.body));
    for(const [x,y]of item.cells)drawBlock(ctx,(x-.5)*unit,(-y-.5)*unit,unit,item.type,style,{ice:frozen});
    if(item.anchored){ctx.strokeStyle='#ffefac';ctx.lineWidth=1.4;for(const [x,y]of item.cells){ctx.beginPath();ctx.moveTo((x-.24)*unit,-y*unit);ctx.lineTo(x*unit,(-y+.24)*unit);ctx.lineTo((x+.24)*unit,(-y-.24)*unit);ctx.stroke();}}
    ctx.restore();}
  if(p.active){const a=p.active,cells=islandCells(a.type,a.rotation),ghost=landingHeight(p,a.type,a.x,a.rotation);
    for(const [x,y]of cells)drawBlock(ctx,cx+(a.x+x-.5)*unit,wy(ghost+y+.5),unit,a.type,style,{ghost:true});
    if(!reduced){ctx.beginPath();ctx.moveTo(mageX+unit*.8,mageY-unit*2.6);ctx.quadraticCurveTo(mageX+Math.sin(time)*20,wy(a.y)-35,cx+a.x*unit,wy(a.y));ctx.strokeStyle=`${style.accent}8c`;ctx.lineWidth=1.5;ctx.stroke();
      for(let i=0;i<5;i++){const phase=(time*.8+i/5)%1,x=mageX+(cx+a.x*unit-mageX)*phase,y=mageY-unit*2.6+(wy(a.y)-mageY+unit*2.6)*phase-Math.sin(phase*Math.PI)*23;ctx.beginPath();ctx.arc(x,y,1.5,0,7);ctx.fillStyle=style.accent;ctx.fill();}}
    for(const [x,y]of cells)drawBlock(ctx,cx+(a.x+x-.5)*unit,wy(a.y+y+.5),unit,a.type,style);
  }
  for(const effect of p.effects){const age=round.seconds-effect.time;if(effect.kind==='splash'&&!reduced){ctx.strokeStyle=`rgba(239,255,247,${Math.max(0,1-age/1.4)})`;ctx.lineWidth=2;for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(cx+effect.x*unit,ground+43);ctx.lineTo(cx+effect.x*unit+Math.sin(i*.8)*age*30,ground+43-Math.sin(i*.4+.3)*40*age+age*age*25);ctx.stroke();}}
    if(['gust','heavy','tilt','anchor','steady','shield','rise','power'].includes(effect.kind)&&age<1.8){const names={gust:'SEA GUST',heavy:'NEXT PIECE: HEAVY',tilt:'NEXT PIECE: TILTED',anchor:'ROOT RUNE',steady:'CALM HANDS',shield:'SPELL BLOCKED',rise:'ISLAND RISING',power:'SPELL READY'};ctx.globalAlpha=Math.min(1,2-age);roundRect(ctx,w/2-70,52,140,25,7);ctx.fillStyle='#173c54dc';ctx.fill();text(ctx,names[effect.kind],w/2,68,9,'#fff0bb','center');ctx.globalAlpha=1;}}
  if(frozen){const glaze=ctx.createLinearGradient(0,wy(p.top)-10,0,ground);glaze.addColorStop(0,'#ecffff00');glaze.addColorStop(1,'#a0e4f03a');ctx.fillStyle=glaze;ctx.fillRect(cx-p.width*unit*.8,wy(p.top)-10,p.width*unit*1.6,(p.top-p.base)*unit+15);text(ctx,p.status==='banked'?'BANKED IN ICE':'FROZEN',w/2,h-20,12,'#eafcff','center');}
  else if(p.status==='out')text(ctx,'OUT / THREE LOST PIECES',w/2,h-20,10,'#ffe5b5','center');
  else if(p.status==='complete')text(ctx,'TOWER COMPLETE',w/2,h-20,11,'#ffefba','center');
  else text(ctx,p.kind==='bot'?'COMPUTER CASTER':'STEER / ROTATE / RELEASE',w/2,h-17,8,'#e3f0de','center');
  text(ctx,'NEXT',w-11,16,8,'#375769','right');drawMiniPiece(ctx,round.sequence[p.index%round.sequence.length],w-50,23,8,style);
  return {cx,ground,unit};
}
export function drawTetrisPodium(canvas,results,styles,time=0,{reduced=false,classic=false}={}) {
  const {ctx,w,h}=fitTetrisCanvas(canvas);drawIslandSky(ctx,w,h,reduced?0:time,'dusk');
  const count=results.length,slots=count<=2?results:results;const gap=Math.min(150,(w-40)/Math.max(count,2));
  for(let i=0;i<count;i++){const r=slots[i],x=w/2+(i-(count-1)/2)*gap,y=h-46-(r.rank===1?40:r.rank===2?17:0);drawIsland(ctx,x,y,gap*.8,45,time);
    drawMage(ctx,x-6,y,Math.min(150,gap*1.05),styles[r.id]||styles[0],{time:reduced?0:time,celebrate:r.rank===1&&r.status!=='out'});
    ctx.fillStyle=r.rank===1?'#efd38b':'#b6d4d3';ctx.beginPath();ctx.arc(x,y+15,12,0,7);ctx.fill();text(ctx,classic?'*':String(r.rank),x,y+19,11,'#304855','center');}
  if(!reduced&&results.some(r=>r.rank===1&&r.status!=='out'))for(let i=0;i<45;i++){const x=(i*73.8+Math.sin(time+i)*14)%w,y=(time*25+i*41)%h;ctx.save();ctx.translate(x,y);ctx.rotate(time+i);ctx.fillStyle=['#efd28c','#89d3c9','#c6a6dd'][i%3];ctx.globalAlpha=.6;ctx.fillRect(-2,-2,3,7);ctx.restore();}
}
