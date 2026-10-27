import { tugCoat } from "./cats-dogs-customization.js";
import { tracePetPatch } from "./cats-dogs-coat.js";
import { petRig, tracePetEye, tracePetNose, tracePetMouth } from "./cats-dogs-pet-rig.js";

const sources=new Map(), painted=new Map(), SIZE=1024;
function surface(width=SIZE,height=SIZE){const c=document.createElement("canvas");c.width=width;c.height=height;return c;}
export function loadTugPet(appearance) {
  const pet=typeof appearance==="string"?{breed:appearance}:appearance,coat=tugCoat(pet),src=coat.image;
  if(!sources.has(src)){
    const entry={image:null,data:null};entry.ready=new Promise(resolve=>{const image=new Image();image.onload=()=>{entry.image=image;resolve(image);};image.onerror=()=>resolve(null);image.src=src;});sources.set(src,entry);
  }
  return sources.get(src);
}
function prepare(entry,pet) {
  if(entry.data||!entry.image)return;
  const canvas=surface(),c=canvas.getContext("2d",{willReadFrequently:true});c.drawImage(entry.image,0,0,SIZE,SIZE);
  const pixels=c.getImageData(0,0,SIZE,SIZE),mask=surface(),m=mask.getContext("2d",{willReadFrequently:true});m.drawImage(canvas,0,0);m.globalCompositeOperation="destination-out";m.fillStyle="#000";
  // Keep eyes, nose, mouth and the original bandana free of coat paint.
  const rig=petRig(pet),cat=rig.cat;
  for(const eye of rig.eyes){tracePetEye(m,eye,SIZE);m.fill();}tracePetNose(m,rig,SIZE);m.fill();
  if(!cat){tracePetMouth(m,rig,SIZE);m.fill();}
  const maskPixels=m.getImageData(0,0,SIZE,SIZE),histogram=new Uint32Array(256);
  for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],a=pixels.data[i+3],x=(i/4%SIZE)/SIZE,y=Math.floor(i/4/SIZE)/SIZE;
    // Alpha describes the hair silhouette, not how strongly to recolor that hair.
    // Dividing it out avoids leaving the old coat color around fine fur edges.
    maskPixels.data[i+3]=a?Math.min(255,Math.round(maskPixels.data[i+3]/a*255)):0;
    const bandana=cat?y>.315&&y<.53&&x>.24&&x<.59&&r>g*1.4&&r>b*1.5&&(g-b)<(r-b)*.25&&(b-g)<(r-g)*.12:y>rig.neck[1]-.06&&y<rig.neck[1]+.17&&x>.38&&x<.81&&g>r*1.2&&b>r*1.1;
    if(bandana)maskPixels.data[i+3]=0;
    if(maskPixels.data[i+3]>220&&a>220)histogram[Math.round(r*.2126+g*.7152+b*.0722)]++;
  }
  let sum=0,total=histogram.reduce((a,b)=>a+b,0),median=160;for(let i=0;i<256;i++){sum+=histogram[i];if(sum>total*.55){median=i;break;}}
  entry.data={pixels: pixels.data,mask:maskPixels.data,median:Math.max(45,median)};
}
const rgb=hex=>[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16));
export function isTugFur(pet,x,y){const entry=loadTugPet(pet);prepare(entry,pet);const i=(Math.min(SIZE-1,Math.floor(y*SIZE))*SIZE+Math.min(SIZE-1,Math.floor(x*SIZE)))*4+3;return !!entry.data&&x>=0&&x<=1&&y>=0&&y<=1&&entry.data.mask[i]>180&&entry.data.pixels[i]>180;}
export function tugCoatSprite(pet) {
  const entry=loadTugPet(pet);if(!entry.image)return null;
  const coat=tugCoat(pet),tint=pet.coatColor||coat.tint,markings=pet.markings||[];
  if(!tint&&!markings.length)return entry.image;
  const key=JSON.stringify([coat.image,tint,markings]);if(painted.has(key))return painted.get(key);
  prepare(entry,pet);
  const layer=surface(),l=layer.getContext("2d",{willReadFrequently:true});
  // Rasterize only when the saved appearance changes, never every game frame.
  for(const spot of markings){tracePetPatch(l,spot,SIZE);l.fillStyle=spot.color;l.fill();}
  const patches=l.getImageData(0,0,SIZE,SIZE).data,{pixels,mask,median}=entry.data,out=surface(),c=out.getContext("2d"),result=c.createImageData(SIZE,SIZE),base=tint?rgb(tint):null;
  for(let i=0;i<pixels.length;i+=4){
    const lum=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722,relative=Math.pow(lum/median,.55),shade=Math.max(.22,relative<=1?relative:1+.3*(1-Math.exp(-(relative-1)/.6))),fur=mask[i+3]/255,patch=patches[i+3]/255;
    for(let ch=0;ch<3;ch++){
      const tinted=base?Math.min(255,base[ch]*shade):pixels[i+ch];
      const mark=Math.min(255,patches[i+ch]*shade);const coatValue=tinted*(1-patch)+mark*patch;
      result.data[i+ch]=pixels[i+ch]*(1-fur)+coatValue*fur;
    }
    result.data[i+3]=pixels[i+3];
  }
  c.putImageData(result,0,0);painted.set(key,out);if(painted.size>12)painted.delete(painted.keys().next().value);return out;
}
