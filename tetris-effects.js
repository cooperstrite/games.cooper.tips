import {drawBlock,drawGorilla,drawBanana,roundRect,pieceColor} from './tetris-art.js';

const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
const ease=value=>1-(1-clamp(value))**3;
const label=(ctx,value,x,y,size,color,align='center')=>{ctx.font='700 '+size+'px Inter, sans-serif';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(value,x,y);};

export function drawClassicFrame(ctx,w,h,x,y,unit,light) {
  const gold=light?'#977c4d':'#c7a96c';
  const rim=ctx.createLinearGradient(x,y,x+unit*10,y+unit*20);
  rim.addColorStop(0,light?'#d2c6ad':'#78684d');rim.addColorStop(.35,light?'#eee3c9':'#b79b65');rim.addColorStop(1,light?'#a99a7f':'#4e5260');
  ctx.save();ctx.shadowColor='#08172966';ctx.shadowBlur=17;ctx.shadowOffsetY=6;
  roundRect(ctx,x-9,y-9,unit*10+18,unit*20+18,10);ctx.fillStyle=rim;ctx.fill();ctx.restore();
  roundRect(ctx,x-5,y-5,unit*10+10,unit*20+10,6);ctx.strokeStyle=light?'#fff9df':'#f5dbaa99';ctx.lineWidth=1;ctx.stroke();
  for(const [cx,cy]of[[x-5,y-5],[x+unit*10+5,y-5],[x-5,y+unit*20+5],[x+unit*10+5,y+unit*20+5]]){
    ctx.beginPath();ctx.arc(cx,cy,2,0,Math.PI*2);ctx.fillStyle=gold;ctx.fill();
  }
}

// Presentation uses snapshots; the game engine still clears whole rows once.
export function drawClassicStack(ctx,state,{x,y,unit},style,{reduced=false}={}) {
  const effect=state.status==='playing'?[...state.effects].reverse().find(e=>e.kind==='lines'&&state.seconds-e.time<.78):null;
  const age=effect?state.seconds-effect.time:1,progress=ease((age-.2)/.38);
  const mapped=effect&&!reduced?new Map((effect.shifts||[]).map(c=>[c.x+':'+c.toY,c])):new Map();
  for(let row=0;row<20;row++)for(let col=0;col<10;col++){
    const type=state.grid[row][col];if(!type)continue;
    const from=mapped.get(col+':'+row),ry=from&&from.type===type?from.fromY+(row-from.fromY)*progress:row;
    drawBlock(ctx,x+col*unit,y+ry*unit,unit,type,style);
  }
  if(effect&&!reduced&&age<.28){
    for(const cell of effect.cells||[]){ctx.save();ctx.globalAlpha=clamp(1-age/.28);drawBlock(ctx,x+cell.x*unit,y+cell.y*unit,unit,cell.type,style);ctx.restore();}
  }
}

export function drawClassicEffects(ctx,state,{x,y,unit},style,{reduced=false}={}) {
  if(state.status!=='playing')return;
  for(const effect of state.effects){
    const age=state.seconds-effect.time;
    if(effect.kind==='drop'&&!reduced&&age<.22){
      const alpha=clamp(1-age/.22),top=y+Math.max(0,effect.fromY)*unit,bottom=y+(effect.toY+2)*unit;
      const trail=ctx.createLinearGradient(0,top,0,bottom);trail.addColorStop(0,pieceColor(effect.type)+'00');trail.addColorStop(1,pieceColor(effect.type)+'66');
      ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=trail;ctx.fillRect(x+(effect.x+.5)*unit,top,unit*3,Math.max(0,bottom-top));ctx.restore();
    }
    if(effect.kind==='lock'&&age<.3){
      ctx.save();ctx.globalAlpha=(1-age/.3)*.65;ctx.strokeStyle='#fff3c0';ctx.lineWidth=2;
      for(const cell of effect.cells||[])ctx.strokeRect(x+cell.x*unit+1,y+cell.y*unit+1,unit-2,unit-2);ctx.restore();
    }
    if(effect.kind==='lines'&&age<1.3){
      for(const row of effect.rows){
        const cy=y+(row+.5)*unit;
        ctx.save();
        if(reduced){ctx.globalAlpha=clamp(1-age/1.1)*.4;ctx.fillStyle='#ffdf76';ctx.fillRect(x,cy-unit/2,unit*10,unit);}
        else {
          const sweep=clamp(age/.32),alpha=clamp(1-age/.65);
          const glow=ctx.createLinearGradient(x,0,x+10*unit,0);glow.addColorStop(0,'#ffd86d00');glow.addColorStop(.5,'#fff6c8');glow.addColorStop(1,'#ffd86d00');
          ctx.globalAlpha=alpha;ctx.fillStyle=glow;ctx.fillRect(x,cy-unit*.55,unit*10,unit*1.1);
          ctx.shadowColor='#ffe89b';ctx.shadowBlur=15;ctx.strokeStyle='#fffbea';ctx.lineWidth=3;
          ctx.beginPath();ctx.moveTo(x+unit*5*(1-sweep),cy);ctx.lineTo(x+unit*5*(1+sweep),cy);ctx.stroke();
        }
        ctx.restore();
      }
      if(!reduced)for(let i=0;i<(effect.count||effect.rows.length)*28;i++){
        const row=effect.rows[i%effect.rows.length],t=age,origin=x+unit*(.5+(i*7%10)),vx=Math.sin(i*8.31)*unit*2.4,vy=-unit*(1.6+(i%5)*.5);
        ctx.save();ctx.translate(origin+vx*t,y+(row+.5)*unit+vy*t+unit*2*t*t);ctx.rotate(i+t*3);ctx.globalAlpha=clamp(1-t/1.05);
        ctx.fillStyle=i%3===0?'#fff8d5':pieceColor((effect.cells||[])[i%Math.max(1,effect.cells?.length||0)]?.type||'O');
        const size=Math.max(1.4,unit*(i%4===0?.13:.07));ctx.fillRect(-size/2,-size/2,size,size*1.8);ctx.restore();
      }
    }
    if(effect.kind==='smash'&&!reduced&&age<1.25){
      for(const [i,cell]of effect.cells.entries()){
        ctx.save();ctx.translate(x+(cell.x+.5)*unit+Math.sin(i*5)*age*55,y+(cell.y+.5)*unit-age*30+age*age*65);ctx.rotate(age*(i%2?3:-3));ctx.globalAlpha=clamp(1-age/1.2);drawBlock(ctx,-unit*.35,-unit*.35,unit*.7,cell.type,style);ctx.restore();
      }
    }
  }
}

export function drawClearAnnouncement(ctx,state,w,h,{reduced=false}={}) {
  if(state.status!=='playing')return;
  const effect=[...state.effects].reverse().find(e=>e.kind==='lines'&&state.seconds-e.time<1.45);
  if(!effect)return;
  const age=state.seconds-effect.time,alpha=clamp(age/.1)*clamp((1.45-age)/.35),count=effect.count||effect.rows.length;
  const title=['','LINE CLEARED','DOUBLE CLEAR','TRIPLE CLEAR','FOUR-LINE CLEAR'][Math.min(4,count)];
  const width=Math.min(w-30,250),top=Math.max(55,h*.28)-(reduced?0:Math.sin(clamp(age/.45)*Math.PI)*5);
  ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor='#1d203e66';ctx.shadowBlur=18;
  const background=ctx.createLinearGradient(0,top,0,top+58);background.addColorStop(0,'#244858f5');background.addColorStop(1,'#102b40f5');
  roundRect(ctx,w/2-width/2,top,width,58,11);ctx.fillStyle=background;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#e9cb7b';ctx.lineWidth=1.5;ctx.stroke();
  label(ctx,title,w/2,top+23,count===4?14:16,'#fff1bb');label(ctx,'+'+(effect.points||0)+' POINTS',w/2,top+43,10,'#a7e3dc');ctx.restore();
}

export function drawGorillaCompanion(ctx,state,{side,w,h},options={}) {
  const reduced=options.reduced,ink=options.light?'#395866':'#d6ece9',size=Math.min(98,w-side-2),gx=side+(w-side)/2-4,gy=h-77;
  const feed=state.status==='playing'&&state.effects.find(e=>e.kind==='banana'&&state.seconds-e.time<1.3),urgent=state.hunger<=8,warning=state.hunger<=16;
  const halo=ctx.createRadialGradient(gx,gy-size*.5,4,gx,gy-size*.5,size*.7);halo.addColorStop(0,urgent?'#ff75435e':warning?'#e8b75b40':'#d7c28c13');halo.addColorStop(1,'#ffad4000');ctx.fillStyle=halo;ctx.fillRect(gx-size,gy-size*1.3,size*2,size*1.5);
  drawGorilla(ctx,gx,gy,size,state.hunger,reduced?0:state.anger,state.seconds,{feeding:!!feed,reduced,warning,urgent});
  if(warning||feed||state.anger>0){
    const bw=Math.max(54,Math.min(100,w-side-3)),top=gy-size*1.25-27;
    roundRect(ctx,gx-bw/2,top,bw,23,6);ctx.fillStyle=urgent?'#7a3023':warning?'#6c5530':'#244c50';ctx.fill();ctx.strokeStyle=urgent?'#ffb78a':'#e9d3a0';ctx.lineWidth=1;ctx.stroke();
    label(ctx,feed?'YUM!':state.anger>0?'SMASH!':urgent?'FEED ME!':'GETTING HUNGRY',gx,top+15,urgent||feed?10:7,'#fff3cc');
  }
  drawBanana(ctx,gx-18,gy+28,.48);label(ctx,'x '+state.bananas,gx+12,gy+33,12,ink);
  if(feed&&!reduced){const age=state.seconds-feed.time,t=clamp(age/.65);if(t<1)drawBanana(ctx,gx-44*(1-t),gy-size*.8-30*Math.sin(t*Math.PI),.62,t*1.8);}
  const health=clamp(state.hunger/42),barW=Math.max(40,w-side-12);
  roundRect(ctx,side+3,gy+44,barW,6,3);ctx.fillStyle=options.light?'#3d5c752a':'#0e1829';ctx.fill();
  roundRect(ctx,side+3,gy+44,Math.max(2,barW*health),6,3);ctx.fillStyle=urgent?'#ef825b':warning?'#e8c36c':'#6bd6b5';ctx.fill();
  label(ctx,state.status==='playing'?'TAP GORILLA / B':'TAKING A BREAK',gx,gy+61,7,ink);
}

export function drawLandingGuide(ctx,{cx,wy,unit,ghost,cells,time,reduced,unsupported=false,bottomLimit=Infinity}) {
  const minX=Math.min(...cells.map(c=>c[0])),maxX=Math.max(...cells.map(c=>c[0])),minY=Math.min(...cells.map(c=>c[1]));
  const x=cx+(minX-.5)*unit,y=Math.min(bottomLimit,wy(ghost+minY-.5)+3),width=(maxX-minX+1)*unit;
  ctx.save();ctx.strokeStyle='#102e4599';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x,y);ctx.lineTo(x+width,y);ctx.lineTo(x+width,y-5);ctx.stroke();
  ctx.strokeStyle=unsupported?'#ffac8d':'#fff3c6';ctx.lineWidth=1.5;ctx.stroke();
  if(unit>13||unsupported){const alpha=reduced?.8:.7+Math.sin(time*3)*.12;ctx.globalAlpha=alpha;ctx.fillStyle=unsupported?'#642e22ed':'#173d50db';const labelWidth=unsupported?76:62;roundRect(ctx,x+width/2-labelWidth/2,y+5,labelWidth,15,4);ctx.fill();label(ctx,unsupported?'NO SUPPORT':'LANDING',x+width/2,y+16,7,'#fff4c9');}ctx.restore();
}

export function drawIslandAtmosphere(ctx,w,h,time,{reduced=false}={}) {
  if(reduced)return;
  ctx.save();
  for(let i=0;i<12;i++){
    const x=(i*81.73+time*(1+i%3))%w,y=h*(.3+(i*.139)% .58)+Math.sin(time+i)*5;
    ctx.globalAlpha=.2+(Math.sin(time*1.4+i)+1)*.15;ctx.fillStyle='#fff0b5';ctx.beginPath();ctx.arc(x,y,i%3?1:1.7,0,7);ctx.fill();
  }ctx.restore();
}

export function drawIslandSpellEffects(ctx,round,p,{cx,ground,unit,wy,w,h},style,{reduced=false}={}) {
  const top=wy(p.top),base=wy(p.base),time=round.seconds;
  if(p.buffs.shield){
    const cy=(top+base)/2,rx=Math.max(unit*(p.width*.65),28),ry=Math.max(42,(base-top)*.6);
    ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);const glow=ctx.createRadialGradient(cx,cy,1,cx,cy,Math.max(rx,ry));glow.addColorStop(0,'#a7f9eb00');glow.addColorStop(.8,'#c0fff114');glow.addColorStop(1,'#c0fff178');ctx.fillStyle=glow;ctx.fill();ctx.strokeStyle='#cefff1b3';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  for(const effect of p.effects){const age=time-effect.time;if(round.status!=='playing'||age<0||age>2)continue;
    if(effect.kind==='splash'&&!reduced){
      const x=cx+effect.x*unit,y=ground+42;ctx.save();ctx.globalAlpha=clamp(1-age/1.7);
      for(let i=0;i<14;i++){const vx=Math.sin(i*2.4)*(15+i%4*7),vy=-18-(i%5)*9;ctx.fillStyle=i%2?'#effff3':'#a4dbe4';ctx.beginPath();ctx.ellipse(x+vx*age,y+vy*age+35*age*age,1.1+age,2.4+age,i*.8,0,7);ctx.fill();}
      ctx.beginPath();ctx.ellipse(x,y,9+age*32,3+age*5,0,0,7);ctx.lineWidth=2;ctx.strokeStyle='#ebfff4';ctx.stroke();ctx.restore();
    }
    if(effect.kind==='gust'&&!reduced){ctx.save();ctx.globalAlpha=clamp(1-age/1.8);ctx.strokeStyle='#e1fcffe0';ctx.lineWidth=1.5;for(let i=0;i<7;i++){const y=base-i*unit*.8-age*10,x=(age*180+i*37)%(w+140)-100;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+35,y-10,x+65,y+10,x+90,y-5);ctx.stroke();}ctx.restore();}
    if(['power','anchor','steady','shield','cast','rise'].includes(effect.kind)&&!reduced){
      ctx.save();ctx.globalAlpha=clamp(1-age/1.8);ctx.strokeStyle=effect.kind==='shield'?'#acffee':style.accent;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(cx,base+3,unit*(p.width*.45)+age*19,4+age*7,0,0,7);ctx.stroke();
      for(let i=0;i<10;i++){const theta=i*Math.PI/5+age*1.3,radius=unit*p.width*.4+age*10;ctx.fillStyle=i%2?'#fff1b8':style.accent;ctx.beginPath();ctx.arc(cx+Math.cos(theta)*radius,base-Math.sin(theta)*12-age*unit*2,1.5,0,7);ctx.fill();}ctx.restore();
    }
  }
}
