import { petRig } from "./cats-dogs-pet-rig.js";

const assets=new Map(),tinted=new Map(),fitted=new Map();
export function loadPetAccessory(id){
  if(!assets.has(id)){
    const entry={image:null,bounds:null};
    entry.ready=new Promise(resolve=>{const image=new Image();image.onload=()=>{
      entry.image=image;const c=document.createElement("canvas");c.width=image.width;c.height=image.height;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(image,0,0);const data=x.getImageData(0,0,c.width,c.height);
      let left=c.width,top=c.height,right=0,bottom=0;
      for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++)if(data.data[(y*c.width+xx)*4+3]>20){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      entry.bounds=[left,top,right-left+1,bottom-top+1];entry.pixels=data;resolve(image);
    };image.onerror=()=>resolve(null);image.src="assets/cats-dogs-accessory-"+id+".png";});assets.set(id,entry);
  }return assets.get(id);
}
export function petAccessories(pet){return [pet.hat,pet.eyewear,pet.charm].filter(v=>v&&v!=="none");}
export function preparePetAccessories(pet){return Promise.all(petAccessories(pet).map(id=>loadPetAccessory(id).ready));}
function sprite(id,color){
  const entry=loadPetAccessory(id);if(!entry.image)return null;
  const key=id+color;if(tinted.has(key))return tinted.get(key);
  const canvas=document.createElement("canvas");canvas.width=entry.image.width;canvas.height=entry.image.height;const c=canvas.getContext("2d"),pixels=new ImageData(new Uint8ClampedArray(entry.pixels.data),canvas.width,canvas.height),base=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  const low=Math.min(...base),high=Math.max(...base),saturation=(high-low)/Math.max(1,high);
  for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];if(g>r&&b>r&&g>b*.65){const value=Math.max(g,b),chroma=Math.min(value,(value-r)*saturation/.56);for(let ch=0;ch<3;ch++)pixels.data[i+ch]=value-chroma+chroma*(base[ch]-low)/Math.max(1,high-low);}}
  c.putImageData(pixels,0,0);tinted.set(key,canvas);if(tinted.size>24)tinted.delete(tinted.keys().next().value);return canvas;
}
function fitGlasses(c,pet,image){
  const rig=petRig(pet),near=rig.eyes[0],far=rig.eyes[1],round=pet.eyewear==="round",sn=round?[.485,.548]:[.514,.546],sf=round?[.872,.503]:[.851,.457];
  const dx=far[0]-near[0],dy=far[1]-near[1],distance=Math.hypot(dx,dy),flip=rig.cat?1:-1;
  const nearRadius=rig.pose?near[2]*1.3:rig.cat?.046:.035,farRadius=rig.pose?far[2]*1.3:rig.cat?.019:.018;
  const keys=[[0,-(rig.cat?.155:.135)],[sn[0]-.17,-nearRadius],[sn[0],0],[sn[0]+.16,nearRadius],[sf[0]-.105,distance-farRadius],[sf[0],distance],[1,distance+farRadius*1.2]];
  const map=u=>{let j=1;while(j<keys.length-1&&u>keys[j][0])j++;const[a,x]=keys[j-1],[b,y]=keys[j];return x+(y-x)*(u-a)/(b-a);};
  c.save();c.translate(near[0],near[1]);c.rotate(Math.atan2(dy,dx));c.scale(1,flip);
  // Slice the lens surface in perspective. Near and far lenses each fit their
  // own eye rather than stretching one flat pair across differently sized eyes.
  for(let col=0;col<320;col++){
    const u=col/320,v=(col+1)/320,x=map(u),next=map(v),center=sn[1]+(u-sn[0])/(sf[0]-sn[0])*(sf[1]-sn[1]);
    const depth=Math.max(0,Math.min(1,(u-sn[0])/(sf[0]-sn[0]))),height=(rig.pose?near[3]*2.6/.38:rig.cat?.222:.205)*(1-depth*.09);
    c.drawImage(image,u*image.width,0,image.width/320+1,image.height,x,-center*height,next-x+.00045,height);
  }c.restore();
}
function paintAccessories(c,pet){
  const rig=petRig(pet),flip=rig.cat?1:-1,color=pet.accent||"#428e96";
  const place=(id,x,y,width,anchor=.94,angle=0,squash=1)=>{
    if(!id||id==="none")return;const image=sprite(id,color);if(!image)return;const [sx,sy,sw,sh]=loadPetAccessory(id).bounds,h=Math.min(width*sh/sw*squash,rig.pose&&anchor>.6?(y-.012)/anchor:1);
    c.save();c.translate(x,y);c.rotate(angle);c.transform(flip,0,rig.cat?-.08:.08,1,0,0);c.drawImage(image,sx,sy,sw,sh,-width/2,-h*anchor,width,h);c.restore();
  };
  const [hx,hy,hw]=rig.hat;
  const angle=rig.pose?Math.atan2(rig.eyes[1][1]-rig.eyes[0][1],(rig.eyes[1][0]-rig.eyes[0][0])*(rig.cat?1:-1))*.55:rig.cat?-.13:.15;
  place(pet.hat,hx+(rig.cat?.006:-.007),hy+(pet.hat==="flowers"?.025:.027),hw*(pet.hat==="flowers"?1.04:.93),pet.hat==="flowers"?.65:.85,angle,pet.hat==="wizard"?.95:.83);
  if(pet.eyewear&&pet.eyewear!=="none"){
    const image=sprite(pet.eyewear,color);
    if(image)fitGlasses(c,pet,image);
  }
  const[nx,ny]=rig.neck;
  if(pet.charm==="bow")place("bow",nx+(rig.cat?.012:-.018),ny+.011,rig.cat?.125:.118,.5,rig.cat?-.22:.22,.82);
  if(pet.charm==="medal")place("medal",nx+(rig.cat?.02:-.035),ny+.008,.105,.12,rig.cat?-.12:.13,.94);
}
export function drawPetAccessories(c,pet){
  const ids=petAccessories(pet);if(!ids.length)return;
  // Only cache complete layers; slow-loading accessories must still appear.
  if(!ids.every(id=>loadPetAccessory(id).image)){paintAccessories(c,pet);return;}
  const key=JSON.stringify([pet.breed,pet.coat,pet.pose,pet.hat,pet.eyewear,pet.charm,pet.accent]);
  if(!fitted.has(key)){
    const canvas=document.createElement("canvas");canvas.width=canvas.height=1024;const ctx=canvas.getContext("2d");ctx.scale(1024,1024);paintAccessories(ctx,pet);fitted.set(key,canvas);if(fitted.size>24)fitted.delete(fitted.keys().next().value);
  }c.drawImage(fitted.get(key),0,0,1,1);
}
