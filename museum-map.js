import {ROOMS,WALLS,FURNITURE,COLUMNS,CLUES} from './museum-world.js';
export function drawMuseumMap(canvas,state,position,yaw,large=false){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=large?32:12,s=Math.min((w-pad*2)/61,(h-pad*2)/29);
  const px=x=>w/2+(x-6)*s,pz=z=>h/2+(z-1.5)*s;
  c.fillStyle='#141e22';c.fillRect(0,0,w,h);
  for(const r of ROOMS){c.fillStyle=r.color+'55';c.fillRect(px(r.x-r.w/2),pz(r.z-r.d/2),r.w*s,r.d*s);}
  c.fillStyle='#d2c6a9';for(const wall of WALLS){if(wall.h<3)continue;c.fillRect(px(wall.x-wall.w/2),pz(wall.z-wall.d/2),Math.max(1,wall.w*s),Math.max(1,wall.d*s));}
  c.fillStyle='#79837b';for(const f of [...FURNITURE,...COLUMNS])c.fillRect(px(f.x-f.w/2),pz(f.z-f.d/2),f.w*s,f.d*s);
  if(large){c.fillStyle='#e7ddc7';c.font='500 13px system-ui';c.textAlign='center';for(const r of ROOMS)c.fillText(r.name.toUpperCase(),px(r.x),pz(r.z+r.d/2-1.2));}
  CLUES.forEach((clue,i)=>{const found=state.found.includes(clue.id);c.fillStyle=found?'#8cdbc1':'#f2ba72';c.beginPath();c.arc(px(clue.x),pz(clue.z),large?6:3.3,0,Math.PI*2);c.fill();if(large){c.fillStyle='#152326';c.textAlign='center';c.font='bold 9px system-ui';c.fillText(String(i+1),px(clue.x),pz(clue.z)+3);}});
  const x=px(position.x),z=pz(position.z);c.save();c.translate(x,z);c.rotate(-yaw);c.fillStyle='#7ae3f3';c.strokeStyle='#152326';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-(large?13:8));c.lineTo(large?7:4,large?8:5);c.lineTo(0,large?5:2);c.lineTo(large?-7:-4,large?8:5);c.closePath();c.fill();c.stroke();c.restore();
}
