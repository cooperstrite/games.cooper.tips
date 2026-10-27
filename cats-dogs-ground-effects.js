// Visual-only wear. Its own random stream never changes the computer or match.
export class TugGroundEffects {
  constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.reset("meadow");}
  reset(arena){this.arena=arena;this.marks=[];this.particles=[];this.seed=149;this.serial=0;}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  pull(side,feet,power=0){
    const strength=Math.max(.15,Math.min(1,power/8)),sand=this.arena==="beach",direction=side==="cats"?1:-1;
    for(const foot of feet){
      const mark={id:++this.serial,side,x:foot.x+direction*(8+strength*9),y:foot.y+3,rx:17+strength*18,ry:4+strength*5,angle:(this.random()-.5)*.18,grooves:[],clumps:[]};
      for(let i=0;i<4;i++)mark.grooves.push({x:(this.random()-.5)*mark.rx,y:(this.random()-.5)*mark.ry,length:9+strength*24});
      for(let i=0;i<12;i++)mark.clumps.push({x:(this.random()-.5)*mark.rx*2.8,y:(this.random()-.5)*mark.ry*3,size:1+this.random()*3,angle:this.random()*6.28});
      this.marks.push(mark);
      if(!this.reducedMotion)for(let i=0;i<8+Math.round(strength*10);i++)this.particles.push({x:foot.x+(this.random()-.5)*14,y:foot.y-3,ground:foot.y+this.random()*8,vx:direction*(18+this.random()*75)*(.6+strength),vy:-25-this.random()*90*(.6+strength),age:0,life:.45+this.random()*.6,size:sand?1+this.random()*2:2+this.random()*3,rotation:this.random()*6.28,spin:(this.random()-.5)*12,dust:i%5===0});
    }
    if(this.marks.length>144)this.marks.splice(0,this.marks.length-144);
    if(this.particles.length>180)this.particles.splice(0,this.particles.length-180);
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<=0)return;const step=Math.min(dt,.1);
    for(const p of this.particles){p.age+=step;p.x+=p.vx*step;p.y+=p.vy*step;p.vy+=230*step;p.rotation+=p.spin*step;if(p.y>=p.ground){p.y=p.ground;p.vx*=Math.exp(-12*step);p.vy=0;p.age+=step*2;}}
    this.particles=this.particles.filter(p=>p.age<p.life);
  }
  drawMarks(c){
    const sand=this.arena==="beach";c.save();if(this.arena==="moon")c.globalAlpha=.72;
    for(const m of this.marks){
      c.save();c.translate(m.x,m.y);c.rotate(m.angle);
      const soil=c.createRadialGradient(0,0,1,0,0,m.rx);soil.addColorStop(0,sand?"#aa85597a":"#4b382bcc");soil.addColorStop(.7,sand?"#c4a07088":"#62503999");soil.addColorStop(1,sand?"#d7bb8f00":"#77704400");
      c.save();c.scale(1,m.ry/m.rx);c.fillStyle=soil;c.beginPath();c.arc(0,0,m.rx,0,Math.PI*2);c.fill();c.restore();
      c.lineCap="round";
      for(const g of m.grooves){c.lineWidth=sand?2:3;c.strokeStyle=sand?"#8c704c66":"#332d2477";c.beginPath();c.moveTo(g.x-g.length/2,g.y);c.quadraticCurveTo(g.x,g.y+2,g.x+g.length/2,g.y+.4);c.stroke();c.lineWidth=1;c.strokeStyle=sand?"#f8e6baaa":"#a5a26a77";c.beginPath();c.moveTo(g.x-g.length/2,g.y+2);c.lineTo(g.x+g.length/2,g.y+2);c.stroke();}
      for(const p of m.clumps){c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.fillStyle=sand?"#e6cda0aa":"#6c563ccc";c.beginPath();c.ellipse(0,0,p.size,p.size*.43,0,0,Math.PI*2);c.fill();if(!sand){c.strokeStyle="#91aa4c";c.lineWidth=.9;c.beginPath();c.moveTo(-p.size,0);c.quadraticCurveTo(-p.size*1.8,-p.size*2,-p.size*.4,-p.size*2.5);c.moveTo(0,0);c.quadraticCurveTo(p.size,-p.size*1.7,p.size*1.7,-p.size*2);c.stroke();}c.restore();}
      c.restore();
    }c.restore();
  }
  drawParticles(c){
    const sand=this.arena==="beach";c.save();
    for(const p of this.particles){const opacity=Math.max(0,1-p.age/p.life);c.save();c.translate(p.x,p.y);c.globalAlpha=opacity*(p.dust?.17:.8);
      if(p.dust){const r=5+p.age*18,g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,sand?"#ecd5aa":"#b5a37a");g.addColorStop(1,sand?"#ecd5aa00":"#b5a37a00");c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();}
      else{c.rotate(p.rotation);c.fillStyle=sand?"#e7c898":"#716044";c.fillRect(-p.size/2,-p.size/3,p.size,p.size*.65);if(!sand){c.strokeStyle="#99b34d";c.lineWidth=1;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(p.size,-p.size,p.size*.5,-p.size*2);c.stroke();}}
      c.restore();
    }c.restore();
  }
}
