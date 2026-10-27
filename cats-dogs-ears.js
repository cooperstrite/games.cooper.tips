import { petRig } from "./cats-dogs-pet-rig.js";
import { drawDogEars } from "./cats-dogs-dog-ears.js";

const pieces=new WeakMap();
export function petEarMotion(time,side,effort=0,mood="neutral"){
  const phase=(time+(side==="cats"?.4:1.9))%(side==="cats"?4.6:5.3);
  const twitch=phase<.62?Math.sin(phase/.62*Math.PI)*Math.sin(phase*18):0;
  return Math.sin(time*(side==="cats"?2.1:2.35)+(side==="cats"?0:1.6))*.15+twitch*.8+Math.min(1,Math.max(0,effort))*.55+(mood==="lose"?-.7:0);
}
function regions(pet){
  if(petRig(pet).cat)return [[.205,.015,.17,.23],[.375,0,.15,.145]];
  if(["corgi","husky"].includes(pet.breed))return [[.595,.015,.22,.34],[.425,0,.17,.18]];
  if(pet.breed==="pitbull")return [[.625,.09,.22,.22],[.425,.045,.13,.08]];
  return [[.605,.09,.225,.29],[.435,.025,.12,.10]];
}
function crop(sprite,pet){
  if(pieces.has(sprite))return pieces.get(sprite);
  const list=regions(pet).map(box=>{const [x,y,w,h]=box,canvas=document.createElement("canvas");canvas.width=Math.ceil(w*sprite.width);canvas.height=Math.ceil(h*sprite.height);canvas.getContext("2d").drawImage(sprite,x*sprite.width,y*sprite.height,w*sprite.width,h*sprite.height,0,0,canvas.width,canvas.height);return{box,image:canvas};});pieces.set(sprite,list);return list;
}
function triangle(c,image,a,b,d,A,B,D){
  const determinant=(b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y);
  const u=((B.x-A.x)*(d.y-a.y)-(D.x-A.x)*(b.y-a.y))/determinant,v=((B.y-A.y)*(d.y-a.y)-(D.y-A.y)*(b.y-a.y))/determinant;
  const w=((D.x-A.x)*(b.x-a.x)-(B.x-A.x)*(d.x-a.x))/determinant,z=((D.y-A.y)*(b.x-a.x)-(B.y-A.y)*(d.x-a.x))/determinant;
  // Slightly overlap neighboring clips so antialiasing cannot expose a grid.
  const cx=(A.x+B.x+D.x)/3,cy=(A.y+B.y+D.y)/3,edge=p=>{const dx=p.x-cx,dy=p.y-cy,n=Math.max(.0001,Math.hypot(dx,dy));return{x:p.x+dx/n*.0007,y:p.y+dy/n*.0007};},clip=[A,B,D].map(edge);
  c.save();c.beginPath();c.moveTo(clip[0].x,clip[0].y);c.lineTo(clip[1].x,clip[1].y);c.lineTo(clip[2].x,clip[2].y);c.closePath();c.clip();c.transform(u,v,w,z,A.x-u*a.x-w*a.y,A.y-v*a.x-z*a.y);c.drawImage(image,0,0);c.restore();
}
export function drawPetFur(c,pet,sprite,animation){
  if(!animation||animation.reducedMotion||pet.pose){c.drawImage(sprite,0,0,1,1);return;}
  if(!petRig(pet).cat){drawDogEars(c,pet,sprite,animation);return;}
  const ears=crop(sprite,pet),cat=petRig(pet).cat,motion=petEarMotion(animation.time||0,cat?"cats":"dogs",animation.effort||0,animation.mood);
  c.save();c.beginPath();c.rect(0,0,1,1);for(const {box:[x,y,w,h]} of ears)c.rect(x,y,w,h);c.clip("evenodd");c.drawImage(sprite,0,0,1,1);c.restore();
  ears.forEach(({box:[x,y,w,h],image},ear)=>{
    const point=(u,v)=>{const bend=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*(ear?.65:1)*motion;return{x:x+u*w+bend*(cat?-.014:.017),y:y+v*h+Math.abs(bend)*.006};};
    for(let row=0;row<5;row++)for(let col=0;col<4;col++){
      const uv=[[col/4,row/5],[(col+1)/4,row/5],[(col+1)/4,(row+1)/5],[col/4,(row+1)/5]],src=uv.map(([u,v])=>({x:u*image.width,y:v*image.height})),dst=uv.map(([u,v])=>point(u,v));
      triangle(c,image,src[0],src[1],src[2],dst[0],dst[1],dst[2]);triangle(c,image,src[0],src[2],src[3],dst[0],dst[2],dst[3]);
    }
  });
}
