import { tugCoat } from "./cats-dogs-customization.js";
import { tracePetPatch } from "./cats-dogs-coat.js";
import { petRig, tracePetEye, tracePetNose, tracePetMouth } from "./cats-dogs-pet-rig.js";
import { furZones, furVariation, furGrain, furSmooth } from "./cats-dogs-fur.js";
import { endingSource, END_POSE_PAD, END_POSE_SCALE } from "./cats-dogs-ending-poses.js";

const sources=new Map(), sheets=new Map(), painted=new Map(), SIZE=1024;
function surface(width=SIZE,height=SIZE){const c=document.createElement("canvas");c.width=width;c.height=height;return c;}
export function loadTugPet(appearance) {
  const pet=typeof appearance==="string"?{breed:appearance}:appearance,coat=tugCoat(pet),src=endingSource(pet)||coat.image,key=src+(pet.pose||"");
  if(!sources.has(key)){
    const entry={image:null,data:null};
    if(pet.pose){
      if(!sheets.has(src))sheets.set(src,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=src;}));
      entry.ready=sheets.get(src).then(image=>{if(!image)return null;const crop=surface(),c=crop.getContext("2d"),half=image.width/2;c.drawImage(image,pet.pose==="sad"?half:0,0,half,image.height,SIZE*END_POSE_PAD,SIZE*END_POSE_PAD,SIZE*END_POSE_SCALE,SIZE*END_POSE_SCALE);entry.image=crop;return crop;});
    }else entry.ready=new Promise(resolve=>{const image=new Image();image.onload=()=>{entry.image=image;resolve(image);};image.onerror=()=>resolve(null);image.src=src;});sources.set(key,entry);
  }
  return sources.get(key);
}
function prepare(entry,pet) {
  if(entry.data||!entry.image)return;
  const canvas=surface(),c=canvas.getContext("2d",{willReadFrequently:true});c.drawImage(entry.image,0,0,SIZE,SIZE);
  const pixels=c.getImageData(0,0,SIZE,SIZE),mask=surface(),m=mask.getContext("2d",{willReadFrequently:true});m.drawImage(canvas,0,0);m.globalCompositeOperation="destination-out";m.fillStyle="#000";
  // Keep eyes, nose, mouth and the original bandana free of coat paint.
  const rig=petRig(pet),cat=rig.cat;
  for(const eye of rig.eyes){tracePetEye(m,eye,SIZE);m.fill();}
  let features=null;
  if(rig.pose){
    const face=surface(),f=face.getContext("2d",{willReadFrequently:true});
    f.fillStyle="#ff0000";tracePetNose(f,rig,SIZE);f.fill();f.fillStyle="#00ff00";tracePetMouth(f,rig,SIZE);f.fill();
    if(rig.pawPads){const[x,y,r]=rig.pawPads;f.fillStyle="#0000ff";f.beginPath();f.arc(x*SIZE,y*SIZE,r*SIZE,0,Math.PI*2);f.fill();}
    features=f.getImageData(0,0,SIZE,SIZE).data;
  }else{tracePetNose(m,rig,SIZE);m.fill();if(!cat){tracePetMouth(m,rig,SIZE);m.fill();}}
  const maskPixels=m.getImageData(0,0,SIZE,SIZE),histogram=new Uint32Array(256),band=new Uint8Array(SIZE*SIZE),zones=new Uint8Array(SIZE*SIZE*2);
  for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],a=pixels.data[i+3],x=(i/4%SIZE)/SIZE,y=Math.floor(i/4/SIZE)/SIZE;
    // Alpha describes the hair silhouette, not how strongly to recolor that hair.
    // Dividing it out avoids leaving the old coat color around fine fur edges.
    maskPixels.data[i+3]=a?Math.min(255,Math.round(maskPixels.data[i+3]/a*255)):0;
    if(features?.[i+3]){
      // Only the skin, lip, teeth and pad pigments are protected inside these
      // measured regions. Fur beside a nose or closed mouth must still recolor.
      const lum=r*.2126+g*.7152+b*.0722,sat=(Math.max(r,g,b)-Math.min(r,g,b))/Math.max(1,r,g,b),dark=1-furSmooth(65,125,lum),pink=furSmooth(1.12,1.38,r/Math.max(1,g))*furSmooth(.74,.92,b/Math.max(1,g));
      const tooth=pet.pose!=="sad"&&features[i+1]?furSmooth(185,235,lum)*(1-furSmooth(.12,.24,sat)):0;
      maskPixels.data[i+3]*=1-Math.max(dark,pink,tooth)*features[i+3]/255;
    }
    const bx=x-(rig.neck[0]-.373),by=y-(rig.neck[1]-.394),strapBottom=bx<.45?.422-(bx-.35)*.62:.363;
    const catCloth=(bx>.27&&bx<.389&&by>.376&&by<.505)||(bx>.353&&bx<.566&&by>.32&&by<strapBottom);
    const bounds=rig.bandanaBounds,poseCloth=bounds&&x>bounds[0]&&x<bounds[0]+bounds[2]&&y>bounds[1]&&y<bounds[1]+bounds[3];
    const bandana=cat?(rig.pose?poseCloth:catCloth)&&r>g*1.4&&r>b*1.5&&(g-b)<(r-b)*.25&&(b-g)<(r-g)*.12:(rig.pose?poseCloth:y>rig.neck[1]-.06&&y<rig.neck[1]+.17&&x>.38&&x<.81)&&g>r*1.3&&b>r*1.25;
    if(bandana){band[i/4]=maskPixels.data[i+3];maskPixels.data[i+3]=0;}
    if(maskPixels.data[i+3]>220&&a>220)histogram[Math.round(r*.2126+g*.7152+b*.0722)]++;
  }
  let sum=0,total=histogram.reduce((a,b)=>a+b,0),median=160;for(let i=0;i<256;i++){sum+=histogram[i];if(sum>total*.55){median=i;break;}}
  median=Math.max(30,median);
  const sums=[0,0,0,0],weights=[0,0,0,0];
  for(let i=0;i<pixels.data.length;i+=4){
    const k=i/4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],lum=r*.2126+g*.7152+b*.0722;
    const [light,dark]=furZones(pet,rig,r,g,b,(k%SIZE)/SIZE,Math.floor(k/SIZE)/SIZE,median);zones[k*2]=Math.round(light*255);zones[k*2+1]=Math.round(dark*255);
    const fur=maskPixels.data[i+3]/255*pixels.data[i+3]/255;
    [fur*(1-light-dark),fur*light,fur*dark,band[k]/255*pixels.data[i+3]/255].forEach((w,j)=>{sums[j]+=lum*w;weights[j]+=w;});
  }
  entry.data={pixels: pixels.data,mask:maskPixels.data,median,band,zones,levels:sums.map((sum,i)=>Math.max(24,sum/Math.max(1,weights[i])))};
}
const rgb=hex=>[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16));
export function isTugFur(pet,x,y){const entry=loadTugPet(pet);prepare(entry,pet);const i=(Math.min(SIZE-1,Math.floor(y*SIZE))*SIZE+Math.min(SIZE-1,Math.floor(x*SIZE)))*4+3;return !!entry.data&&x>=0&&x<=1&&y>=0&&y<=1&&entry.data.mask[i]>180&&entry.data.pixels[i]>180;}
export function tugCoatSprite(pet) {
  const entry=loadTugPet(pet);if(!entry.image)return null;
  const coat=tugCoat(pet),alternate=pet.pose&&(pet.breed==="labrador"&&pet.coat!=="yellow"||pet.breed==="siamese"&&pet.coat==="flame"),tint=pet.coatColor||coat.tint||(alternate?coat.coat:null),markings=pet.markings||[],colors=[tint,pet.secondaryColor||(alternate?coat.light:null),pet.patternColor||(alternate?coat.dark:null),pet.bandanaColor];
  if(!colors.some(Boolean)&&!markings.length)return entry.image;
  const key=JSON.stringify([coat.image,pet.pose,colors,markings]);if(painted.has(key))return painted.get(key);
  prepare(entry,pet);
  const layer=surface(),l=layer.getContext("2d",{willReadFrequently:true});
  // Rasterize only when the saved appearance changes, never every game frame.
  l.filter="blur(0.65px)";for(const spot of markings){tracePetPatch(l,spot,SIZE);l.fillStyle=spot.color;l.fill();}l.filter="none";
  const patches=l.getImageData(0,0,SIZE,SIZE).data,{pixels,mask,median,band,zones,levels}=entry.data,out=surface(),c=out.getContext("2d"),result=c.createImageData(SIZE,SIZE),bases=colors.map(hex=>hex?rgb(hex):null);
  const shade=(lum,level)=>{const relative=Math.pow(lum/level,pet.pose?.95:.68),highlight=pet.pose?.70:.32;return Math.max(.18,relative<=1?relative:1+highlight*(1-Math.exp(-(relative-1)/.6)));};
  for(let i=0;i<pixels.length;i+=4){
    if(!pixels[i+3])continue;
    const k=i/4,x=k%SIZE,y=Math.floor(k/SIZE),lum=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722,fur=mask[i+3]/255,light=zones[k*2]/255,dark=zones[k*2+1]/255;
    const mix=[Math.max(0,1-light-dark),light,dark],shades=levels.map(v=>shade(lum,v)),variation=furVariation(x,y);
    const fringeX=Math.max(0,Math.min(SIZE-1,x+Math.round(Math.sin(y*.22+x*.05)*2+furGrain(x>>1,y>>2)*2))),fringeY=Math.max(0,Math.min(SIZE-1,y+Math.round(Math.sin(x*.2)*1.3))),patchIndex=(fringeY*SIZE+fringeX)*4;
    const patch=Math.max(0,Math.min(1,patches[patchIndex+3]/255+(furGrain(x,y)*.3)*(1-Math.abs(patches[patchIndex+3]/127.5-1))));
    for(let ch=0;ch<3;ch++){
      let tinted=0;for(let j=0;j<3;j++)tinted+=mix[j]*(bases[j]?Math.min(255,bases[j][ch]*shades[j]):pixels[i+ch]);
      const nearby=(pixels[i+ch]-lum)*.065,mark=Math.min(255,Math.max(0,patches[patchIndex+ch]*shade(lum,median)*variation.shade+nearby+variation.warmth*[1,.25,-.65][ch]));
      const coatValue=tinted*(1-patch)+mark*patch,bandWeight=bases[3]?band[k]/255:0;
      result.data[i+ch]=(pixels[i+ch]*(1-fur)+coatValue*fur)*(1-bandWeight)+(bases[3]?Math.min(255,bases[3][ch]*shades[3]):0)*bandWeight;
    }
    result.data[i+3]=pixels[i+3];
  }
  c.putImageData(result,0,0);painted.set(key,out);if(painted.size>12)painted.delete(painted.keys().next().value);return out;
}
