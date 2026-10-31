import {ROOMS,WALLS,FURNITURE,COLUMNS,CLUES,mapClues} from './museum-world.js';
// The map keeps north up. World forward is (-sin(yaw), -cos(yaw)).
export function mapHeading(yaw){return {x:-Math.sin(yaw),z:-Math.cos(yaw)};}
export function drawMuseumMap(canvas,state,position,yaw,large=false){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=large?32:12,s=Math.min((w-pad*2)/61,(h-pad*2)/29);
  const px=x=>w/2+(x-6)*s,pz=z=>h/2+(z-1.5)*s;
  c.fillStyle='#141e22';c.fillRect(0,0,w,h);
  for(const r of ROOMS){c.fillStyle=r.color+'55';c.fillRect(px(r.x-r.w/2),pz(r.z-r.d/2),r.w*s,r.d*s);}
  c.fillStyle='#d2c6a9';for(const wall of WALLS){if(wall.h<3)continue;c.fillRect(px(wall.x-wall.w/2),pz(wall.z-wall.d/2),Math.max(1,wall.w*s),Math.max(1,wall.d*s));}
  c.fillStyle='#79837b';for(const f of [...FURNITURE,...COLUMNS])c.fillRect(px(f.x-f.w/2),pz(f.z-f.d/2),f.w*s,f.d*s);
  if(large){c.fillStyle='#e7ddc7';c.font='500 13px system-ui';c.textAlign='center';for(const r of ROOMS)c.fillText(r.name.toUpperCase(),px(r.x),pz(r.z+r.d/2-1.2));}
  mapClues(state).forEach(clue=>{const found=state.found.includes(clue.id);c.fillStyle=found?'#8cdbc1':'#f2ba72';c.beginPath();c.arc(px(clue.x),pz(clue.z),large?6:3.3,0,Math.PI*2);c.fill();if(large){c.fillStyle='#152326';c.textAlign='center';c.font='bold 9px system-ui';c.fillText(String(CLUES.indexOf(clue)+1),px(clue.x),pz(clue.z)+3);}});
  // Size the arrow in display pixels, not backing-store pixels: the old symbol
  // shrank to a nearly round 3px speck when the minimap was scaled down.
  const displayWidth=canvas.clientWidth||(large?700:230),unit=w/displayWidth,r=large?11*unit:7.5*unit;
  const x=px(position.x),z=pz(position.z),heading=mapHeading(yaw);
  c.save();c.translate(x,z);c.rotate(Math.atan2(heading.x,-heading.z));
  const cone=c.createRadialGradient(0,0,r,0,0,r*3.8);cone.addColorStop(0,'#74bcff55');cone.addColorStop(1,'#74bcff00');
  c.fillStyle=cone;c.beginPath();c.moveTo(0,0);c.arc(0,0,r*3.8,-Math.PI/2-.52,-Math.PI/2+.52);c.closePath();c.fill();
  c.shadowColor='#071726';c.shadowBlur=3*unit;c.fillStyle='#398fff';c.strokeStyle='#f4fbff';c.lineWidth=1.3*unit;c.lineJoin='round';
  c.beginPath();c.moveTo(0,-r*1.45);c.lineTo(r*.85,r*.9);c.lineTo(0,r*.48);c.lineTo(-r*.85,r*.9);c.closePath();c.fill();c.stroke();
  c.shadowBlur=0;c.fillStyle='#a6ddff';c.beginPath();c.moveTo(0,-r*1.12);c.lineTo(0,r*.3);c.lineTo(-r*.58,r*.6);c.closePath();c.fill();c.restore();
}
