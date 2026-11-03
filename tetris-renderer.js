import {islandCells,rotatedCells} from './tetris-config.js';
import {classicGhost} from './tetris-classic.js';
import {bodyAngle,landingHeight,islandFinishLine} from './tetris-islands.js';
import {drawBlock,drawMage,mageWandPoint,drawIslandSky,drawIsland,drawMiniPiece,roundRect} from './tetris-art.js';
import {drawClassicFrame,drawClassicStack,drawClassicEffects,drawClearAnnouncement,drawGorillaCompanion,drawLandingGuide,drawIslandAtmosphere,drawIslandSpellEffects} from './tetris-effects.js';

export function fitTetrisCanvas(canvas) {
  const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height),dpr=Math.min(2,globalThis.devicePixelRatio||1);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w,h};
}
function text(ctx,label,x,y,size=11,color='#f9edd1',align='left'){ctx.font=`600 ${size}px Inter, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(label,x,y);}
export function drawClassicBoard(canvas,state,style,{light=false,reduced=false}={}) {
  const {ctx,w,h}=fitTetrisCanvas(canvas),unit=Math.min((w-112)/10,(h-54)/20),x=Math.max(13,(w-10*unit-104)/2),y=28,side=x+10*unit+17;
  drawIslandSky(ctx,w,h,reduced?0:state.seconds,style.scene);
  ctx.fillStyle=light?'#eaf0eddb':'#122235d9';ctx.fillRect(0,0,w,h);
  drawClassicFrame(ctx,w,h,x,y,unit,light);
  const back=ctx.createLinearGradient(x,y,x+10*unit,y+20*unit);back.addColorStop(0,light?'#fffdf3':'#12293a');back.addColorStop(1,light?'#e6eee6':'#18243b');
  roundRect(ctx,x-4,y-4,10*unit+8,20*unit+8,5);ctx.fillStyle=back;ctx.fill();ctx.strokeStyle=light?'#9eb7ae':'#547c8e';ctx.lineWidth=1.5;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.rect(x,y,10*unit,20*unit);ctx.clip();
  ctx.strokeStyle=light?'#78958120':'#9dc6d512';ctx.lineWidth=.6;for(let i=0;i<=10;i++){ctx.beginPath();ctx.moveTo(x+i*unit,y);ctx.lineTo(x+i*unit,y+20*unit);ctx.stroke();}for(let i=0;i<=20;i++){ctx.beginPath();ctx.moveTo(x,y+i*unit);ctx.lineTo(x+10*unit,y+i*unit);ctx.stroke();}
  drawClassicStack(ctx,state,{x,y,unit},style,{reduced});
  const ghost=classicGhost(state),p=state.active;
  if(state.status==='playing'&&p){for(const [cx,cy]of rotatedCells(ghost.type,ghost.rotation))drawBlock(ctx,x+(ghost.x+cx)*unit,y+(ghost.y+cy)*unit,unit,ghost.type,style,{ghost:true});for(const [cx,cy]of rotatedCells(p.type,p.rotation))drawBlock(ctx,x+(p.x+cx)*unit,y+(p.y+cy)*unit,unit,p.type,style);}
  drawClassicEffects(ctx,state,{x,y,unit},style,{reduced});
  ctx.restore();const ink=light?'#405f66':'#c1dce0';
  text(ctx,'NEXT',side,y+6,10,ink);for(let i=0;i<3;i++)drawMiniPiece(ctx,state.sequence[(state.index+i)%state.sequence.length],side,y+22+i*61,Math.min(17,(w-side-9)/4),style);
  text(ctx,'HOLD / C',side,y+222,10,ink);if(state.hold)drawMiniPiece(ctx,state.hold,side,y+238,Math.min(17,(w-side-9)/4),style);else text(ctx,'Empty',side,y+250,10,ink);
  if(state.gorilla)drawGorillaCompanion(ctx,state,{side,w,h},{light,reduced});
  else drawMage(ctx,side+(w-side)/2-8,h-30,Math.min(130,(w-side)*1.6),style,{time:reduced?0:state.seconds,cast:state.status==='playing'});
  text(ctx,'10 x 20 / CLEAR COMPLETE ROWS',x,y+20*unit+20,8,ink);
  drawClearAnnouncement(ctx,state,w,h,{reduced});
}
export function drawIslandBoard(canvas,round,p,style,{reduced=false}={}) {
  const {ctx,w,h}=fitTetrisCanvas(canvas),time=reduced?0:round.seconds;
  drawIslandSky(ctx,w,h,time,style.scene);
  drawIslandAtmosphere(ctx,w,h,time,{reduced});
  const maxTop=Math.max(round.mode==='race'?round.level.goal+2:round.mode==='puzzle'?round.level.ceiling+3:15,...round.players.map(v=>Math.max(v.top+6,v.active?.y+3||0)));
  const previous=canvas._tetrisCamera||maxTop;const camera=reduced?maxTop:previous+(maxTop-previous)*.035;canvas._tetrisCamera=camera;
  const unit=Math.min(w/(p.width+6),(h-100)/camera),cx=w/2,ground=h-78,wy=v=>ground-v*unit;
  // Measurement marks make the descending goal and the puzzle lift readable.
  ctx.strokeStyle='#fff7dc77';ctx.lineWidth=1;for(let altitude=0;altitude<camera;altitude+=4){const y=wy(altitude);ctx.fillStyle='#10344a99';roundRect(ctx,6,y-8,31,16,5);ctx.fill();text(ctx,`${altitude}m`,21,y+3,8,'#fff0c7','center');}
  if(round.mode==='race'||round.mode==='puzzle'){
    const goal=round.mode==='race'?islandFinishLine(round):round.level.ceiling,y=wy(goal),color=round.mode==='race'?'#fff3b3':'#dcfbff';
    ctx.save();ctx.shadowColor=round.mode==='race'?'#d2a350':'#87d6ef';ctx.shadowBlur=8;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(round.mode==='race'?[8,5]:[3,3]);ctx.beginPath();ctx.moveTo(8,y);ctx.lineTo(w-8,y);ctx.stroke();ctx.restore();
    ctx.fillStyle=round.mode==='race'?'#314c4aee':'#254665ee';roundRect(ctx,w/2-58,y-24,116,19,6);ctx.fill();ctx.strokeStyle=round.mode==='race'?'#f4d58c':'#a1e0ec';ctx.lineWidth=1;ctx.stroke();text(ctx,round.mode==='race'?`FINISH / ${goal.toFixed(1)} m`:'FROST LINE',w/2,y-11,9,color,'center');
    if(round.mode==='race'&&p.raceHold>0){ctx.fillStyle='#f6d46c';ctx.fillRect(8,y+5,(w-16)*Math.min(1,p.raceHold/1.5),3);}
  }
  drawIsland(ctx,cx,wy(p.base),p.width*unit,Math.min(66,unit*3.5),time);
  // A small ledge keeps the caster beside the playable footprint.
  const mageX=Math.max(31,cx-(p.width/2+1.35)*unit),mageY=wy(p.base)+3,mageH=Math.max(46,Math.min(108,unit*3.9));
  drawIsland(ctx,mageX,mageY,unit*2,unit*2.1,time);drawMage(ctx,mageX-2,mageY,mageH,style,{time,cast:!!p.active,celebrate:p.status==='complete'});
  drawIslandSpellEffects(ctx,round,p,{cx,ground,unit,wy,w,h},style,{reduced});
  const frozen=round.mode==='puzzle'&&p.status!=='building';
  for(const item of p.pieces){ctx.save();ctx.translate(cx+item.body.position.x*unit,wy(item.body.position.y));ctx.rotate(-bodyAngle(item.body));ctx.shadowColor='#122d4680';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    for(const [x,y]of item.cells)drawBlock(ctx,(x-.5)*unit,(-y-.5)*unit,unit,item.type,style,{ice:frozen});
    if(item.anchored){ctx.strokeStyle='#ffefac';ctx.lineWidth=1.4;for(const [x,y]of item.cells){ctx.beginPath();ctx.moveTo((x-.24)*unit,-y*unit);ctx.lineTo(x*unit,(-y+.24)*unit);ctx.lineTo((x+.24)*unit,(-y-.24)*unit);ctx.stroke();}}
    ctx.restore();}
  if(p.active){const a=p.active,cells=islandCells(a.type,a.rotation),ghost=landingHeight(p,a.type,a.x,a.rotation);
    for(const [x,y]of cells)drawBlock(ctx,cx+(a.x+x-.5)*unit,wy(ghost+y+.5),unit,a.type,style,{ghost:true});
    if(p.kind==='human')drawLandingGuide(ctx,{cx:cx+a.x*unit,wy,unit,ghost,cells,time,reduced,unsupported:ghost<p.base,bottomLimit:h-61});
    if(!reduced){const tip=mageWandPoint(mageX-2,mageY,mageH,{time,cast:true}),endX=cx+a.x*unit,endY=wy(a.y),controlX=tip.x+Math.sin(time)*20,controlY=endY-35;ctx.save();ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.quadraticCurveTo(controlX,controlY,endX,endY);ctx.strokeStyle=`${style.accent}a8`;ctx.shadowColor=style.accent;ctx.shadowBlur=7;ctx.lineWidth=1.5;ctx.stroke();
      for(let i=0;i<9;i++){const t=(time*.6+i/9)%1,x=(1-t)**2*tip.x+2*(1-t)*t*controlX+t*t*endX,y=(1-t)**2*tip.y+2*(1-t)*t*controlY+t*t*endY;ctx.beginPath();ctx.arc(x,y,i%3?1.2:2,0,7);ctx.fillStyle=i%2?'#fff6cf':style.accent;ctx.fill();}ctx.restore();}
    ctx.save();ctx.shadowColor=style.accent;ctx.shadowBlur=reduced?0:7;ctx.shadowOffsetY=1;
    for(const [x,y]of cells)drawBlock(ctx,cx+(a.x+x-.5)*unit,wy(a.y+y+.5),unit,a.type,style);ctx.restore();
  }
  for(const effect of p.effects){const age=round.status==='playing'?round.seconds-effect.time:Infinity;
    if(['gust','heavy','tilt','anchor','steady','shield','rise'].includes(effect.kind)&&age<1.8){const names={gust:'SEA GUST',heavy:'NEXT PIECE: HEAVY',tilt:'NEXT PIECE: TILTED',anchor:'ROOT RUNE',steady:'CALM HANDS',shield:effect.blocked?'SPELL BLOCKED':'SHIELD READY',rise:'ISLAND RISING'};ctx.save();ctx.globalAlpha=Math.min(1,2-age);const bannerW=Math.min(w-16,166);roundRect(ctx,w/2-bannerW/2,h-56,bannerW,25,7);ctx.fillStyle='#173c54ed';ctx.fill();ctx.strokeStyle='#e8c984';ctx.lineWidth=1;ctx.stroke();text(ctx,names[effect.kind],w/2,h-40,9,'#fff0bb','center');ctx.restore();}}
  ctx.fillStyle='#10344ac9';roundRect(ctx,w/2-Math.min(w-12,220)/2,h-29,Math.min(w-12,220),21,7);ctx.fill();
  if(frozen){const glaze=ctx.createLinearGradient(0,wy(p.top)-10,0,ground);glaze.addColorStop(0,'#ecffff00');glaze.addColorStop(1,'#a0e4f03a');ctx.fillStyle=glaze;ctx.fillRect(cx-p.width*unit*.8,wy(p.top)-10,p.width*unit*1.6,(p.top-p.base)*unit+15);text(ctx,p.status==='banked'?'BANKED IN ICE':'FROZEN',w/2,h-14,11,'#eafcff','center');}
  else if(p.status==='out')text(ctx,'OUT / THREE LOST PIECES',w/2,h-20,10,'#ffe5b5','center');
  else if(p.status==='complete')text(ctx,'TOWER COMPLETE',w/2,h-20,11,'#ffefba','center');
  else text(ctx,p.kind==='bot'?'COMPUTER CASTER':'STEER / ROTATE / RELEASE',w/2,h-17,8,'#e3f0de','center');
  roundRect(ctx,w-63,8,55,49,8);ctx.fillStyle='#133d51db';ctx.fill();ctx.strokeStyle='#e8c98399';ctx.lineWidth=1;ctx.stroke();text(ctx,'NEXT',w-35,21,8,'#f7e8c8','center');drawMiniPiece(ctx,round.sequence[p.index%round.sequence.length],w-54,28,9,style);
  return {cx,ground,unit};
}
export function drawTetrisPodium(canvas,results,styles,time=0,{reduced=false,classic=false}={}) {
  const {ctx,w,h}=fitTetrisCanvas(canvas);drawIslandSky(ctx,w,h,reduced?0:time,'dusk');
  const count=results.length,slots=count<=2?results:results;const gap=Math.min(150,(w-40)/Math.max(count,2));
  for(let i=0;i<count;i++){const r=slots[i],x=w/2+(i-(count-1)/2)*gap,y=h-46-(r.rank===1?40:r.rank===2?17:0);drawIsland(ctx,x,y,gap*.8,45,reduced?0:time);
    drawMage(ctx,x-6,y,Math.min(150,gap*1.05),styles[r.id]||styles[0],{time:reduced?0:time,celebrate:r.rank===1&&r.status!=='out'});
    ctx.fillStyle=r.rank===1?'#efd38b':'#b6d4d3';ctx.beginPath();ctx.arc(x,y+15,12,0,7);ctx.fill();text(ctx,classic?'*':String(r.rank),x,y+19,11,'#304855','center');}
  if(!reduced&&results.some(r=>r.rank===1&&r.status!=='out'))for(let i=0;i<45;i++){const x=(i*73.8+Math.sin(time+i)*14)%w,y=(time*25+i*41)%h;ctx.save();ctx.translate(x,y);ctx.rotate(time+i);ctx.fillStyle=['#efd28c','#89d3c9','#c6a6dd'][i%3];ctx.globalAlpha=.6;ctx.fillRect(-2,-2,3,7);ctx.restore();}
}
