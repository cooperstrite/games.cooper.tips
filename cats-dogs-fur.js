// Stable pigment variation: the same coat never changes texture between frames.
export const furSmooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function furGrain(x,y){
  let n=Math.imul(x+1,374761393)^Math.imul(y+7,668265263);n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295-.5;
}
export function furVariation(x,y){
  const strand=Math.sin(x*1.9+y*.31+Math.sin(y*.025)*3);
  const cloud=Math.sin(x*.035+y*.018)*Math.cos(y*.041-x*.012);
  return {shade:1+furGrain(x,y)*.10+strand*.04+cloud*.045,warmth:cloud*6};
}
// Pigment-aware weights preserve each source's actual fur borders, including
// fine hairs. Uniform coats get a softly blended muzzle/chest and ear shading.
export function furZones(pet,rig,r,g,b,x,y,median){
  const lum=r*.2126+g*.7152+b*.0722,sat=(Math.max(r,g,b)-Math.min(r,g,b))/Math.max(1,r,g,b);
  const pale=(1-furSmooth(.16,.35,sat))*furSmooth(115,205,lum);
  const dark=1-furSmooth(median*.48,median*.9,lum);
  const soft=(cx,cy,rx,ry)=>1-furSmooth(.45,1.25,Math.hypot((x-cx)/rx,(y-cy)/ry));
  let light=0,pattern=0;
  if(["tabby","mainecoon","calico"].includes(pet.breed)){light=pale;pattern=dark*(1-light);}
  else if(pet.breed==="siamese"){
    light=pale*.35;
    pattern=pet.coat==="flame"&&!rig.pose?furSmooth(.12,.36,sat):1-furSmooth(95,175,lum);
    light*=1-pattern;
  }else if(["corgi","husky","pitbull"].includes(pet.breed)){
    light=furSmooth(pet.breed==="pitbull"?130:155,225,lum)*(1-furSmooth(.18,.39,sat));pattern=dark*(1-light);
  }else{
    const muzzle=soft(rig.nose[0]+(rig.cat?-.02:.025),rig.nose[1]+.05,.09,.065);
    const chest=soft(rig.pose?rig.neck[0]:rig.cat?.49:.47,rig.neck[1]+.17,.14,.21);
    light=Math.max(muzzle,chest)*.9;
    const earX=rig.pose?rig.eyes[0][0]+(rig.cat?-.16:.15):rig.cat?.29:.685,earY=rig.pose?rig.eyes[0][1]+(rig.cat?-.13:.015):rig.cat?.18:.22;
    pattern=soft(earX,earY,.09,.14)*.85*(1-light);
  }
  return [Math.max(0,Math.min(1,light)),Math.max(0,Math.min(1-light,pattern))];
}
