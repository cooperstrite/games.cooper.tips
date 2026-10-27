// Three shaded strands wrap around a shared centerline, following both paws.
export function drawTugRope(c,left,right,time=0,reducedMotion=false){
  const length=Math.hypot(right.x-left.x,right.y-left.y),sag=16;
  const at=t=>({x:left.x+(right.x-left.x)*t,y:left.y+(right.y-left.y)*t+Math.sin(t*Math.PI)*sag});
  const path=()=>{c.beginPath();for(let i=0;i<=48;i++){const p=at(i/48);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}};
  c.save();c.lineCap="round";c.lineJoin="round";
  c.shadowColor="#1f201e66";c.shadowBlur=5;c.shadowOffsetY=4;c.strokeStyle="#5b4028";c.lineWidth=12;path();c.stroke();c.shadowColor="transparent";
  c.strokeStyle="#957246";c.lineWidth=9;path();c.stroke();
  const strands=[];
  for(let strand=0;strand<3;strand++)for(let i=0;i<84;i++){
    const t=i/84,next=(i+1)/84,phase=t*length/21*Math.PI*2+strand*Math.PI*2/3,phase2=next*length/21*Math.PI*2+strand*Math.PI*2/3;
    const a=at(t),b=at(next),dx=b.x-a.x,dy=b.y-a.y,n=Math.max(.01,Math.hypot(dx,dy)),z=Math.cos((phase+phase2)/2);
    strands.push({a:{x:a.x-dy/n*Math.sin(phase)*3.7,y:a.y+dx/n*Math.sin(phase)*3.7},b:{x:b.x-dy/n*Math.sin(phase2)*3.7,y:b.y+dx/n*Math.sin(phase2)*3.7},z});
  }
  strands.sort((a,b)=>a.z-b.z);
  for(const {a,b,z} of strands){
    const light=.72+(z+1)*.16;c.strokeStyle=`rgb(${Math.round(203*light)},${Math.round(170*light)},${Math.round(117*light)})`;c.lineWidth=4.3;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    if(z>-.1){c.strokeStyle="#fff1c075";c.lineWidth=.65;c.beginPath();c.moveTo(a.x,a.y-1);c.lineTo(b.x,b.y-1);c.stroke();}
  }
  // Fine stray fibers, never the repeating white dashes of the old rope.
  c.lineWidth=.55;c.strokeStyle="#e6c89eaa";
  for(let i=1;i<23;i++){const p=at(i/24),dir=i%2?1:-1;c.beginPath();c.moveTo(p.x,p.y+dir*4);c.quadraticCurveTo(p.x-2,p.y+dir*7,p.x+2,p.y+dir*(6+i%3));c.stroke();}
  const p=at(.5);c.translate(p.x,p.y);c.rotate(reducedMotion?0:Math.sin(time*2.1)*.045);
  const ribbon=c.createLinearGradient(-12,0,12,0);ribbon.addColorStop(0,"#9a3e32");ribbon.addColorStop(.22,"#dd7555");ribbon.addColorStop(.48,"#f7ae79");ribbon.addColorStop(.68,"#c95c45");ribbon.addColorStop(1,"#84382e");c.fillStyle=ribbon;
  c.beginPath();c.moveTo(-9,-5);c.bezierCurveTo(-5,12,-11,39,-13,57);c.lineTo(0,48);c.lineTo(11,60);c.bezierCurveTo(15,35,8,12,9,-5);c.closePath();c.fill();
  c.strokeStyle="#ffcb9477";c.lineWidth=.8;c.beginPath();c.moveTo(-7,5);c.quadraticCurveTo(-4,25,-10,51);c.moveTo(6,6);c.quadraticCurveTo(8,27,9,53);c.stroke();
  c.fillStyle=ribbon;c.beginPath();c.ellipse(0,0,12,7,-.1,0,Math.PI*2);c.fill();c.strokeStyle="#8d402da0";c.lineWidth=1;c.stroke();c.restore();
}
