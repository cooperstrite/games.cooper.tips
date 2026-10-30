import { tugCoat } from "./cats-dogs-customization.js";
import { tracePetPatch } from "./cats-dogs-coat.js";
import { petRig, tracePetEye, tracePetNose, tracePetMouth } from "./cats-dogs-pet-rig.js";
import { furZones, furVariation, furGrain, furDepth } from "./cats-dogs-fur.js";
import { poseTugSprite } from "./cats-dogs-pose-surface.js";
import { nativePoseRig, nativePoseSource, poseGroundOffset, END_POSE_PAD, END_POSE_SCALE } from "./cats-dogs-pose-rigs.js";
import { posePetMarkings } from "./cats-dogs-pose-paint.js";

const sources=new Map(), painted=new Map(), prepared=[], SIZE=1024;
function surface(width=SIZE,height=SIZE){const c=document.createElement("canvas");c.width=width;c.height=height;return c;}
export function loadTugPet(appearance) {
  const pet=typeof appearance==="string"?{breed:appearance}:appearance,src=pet.pose?nativePoseSource(pet):tugCoat(pet).image,key=src+(pet.pose||"");
  if(!sources.has(key)){
    const entry={image:null,data:null};
    entry.ready=new Promise(resolve=>{const image=new Image();image.onload=()=>{
      if(pet.pose){const cv=surface(),c=cv.getContext("2d"),size=image.width/2;c.imageSmoothingQuality="high";c.drawImage(image,pet.pose==="sad"?size:0,0,size,image.height,END_POSE_PAD*SIZE,(END_POSE_PAD+poseGroundOffset(pet))*SIZE,END_POSE_SCALE*SIZE,END_POSE_SCALE*SIZE);entry.image=cv;}
      else entry.image=image;resolve(entry.image);
    };image.onerror=()=>resolve(null);image.src=src;});sources.set(key,entry);
  }
  return sources.get(key);
}
function prepare(entry,pet) {
  if(entry.data||!entry.image)return;
  const canvas=surface(),c=canvas.getContext("2d",{willReadFrequently:true});c.drawImage(entry.image,0,0,SIZE,SIZE);
  const pixels=c.getImageData(0,0,SIZE,SIZE),mask=surface(),m=mask.getContext("2d",{willReadFrequently:true});m.drawImage(canvas,0,0);m.globalCompositeOperation="destination-out";m.fillStyle="#000";
  // Keep eyes, nose, mouth and the original bandana free of coat paint.
  const rig=pet.pose?nativePoseRig(pet):petRig(pet),cat=rig.cat;
  for(const eye of rig.eyes){tracePetEye(m,eye,SIZE);m.fill();}
  tracePetNose(m,rig,SIZE);m.fill();if(!cat||pet.pose){tracePetMouth(m,rig,SIZE);m.fill();}
  if(rig.pawPads){const [x,y,r]=rig.pawPads;for(const [dx,dy,rx,ry]of [[0,.025,.43,.31],[-.47,-.18,.19,.25],[-.15,-.51,.19,.25],[.23,-.51,.19,.25],[.51,-.17,.19,.25]]){m.beginPath();m.ellipse((x+dx*r)*SIZE,(y+dy*r)*SIZE,r*rx*SIZE,r*ry*SIZE,0,0,Math.PI*2);m.fill();}}
  const maskPixels=m.getImageData(0,0,SIZE,SIZE),histogram=new Uint32Array(256),band=new Uint8Array(SIZE*SIZE),zones=new Uint8Array(SIZE*SIZE*2);
  for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],a=pixels.data[i+3],x=(i/4%SIZE)/SIZE,y=Math.floor(i/4/SIZE)/SIZE;
    // Alpha describes the hair silhouette, not how strongly to recolor that hair.
    // Dividing it out avoids leaving the old coat color around fine fur edges.
    maskPixels.data[i+3]=a?Math.min(255,Math.round(maskPixels.data[i+3]/a*255)):0;
    const bx=x-(rig.neck[0]-.373),by=y-(rig.neck[1]-.394),strapBottom=bx<.45?.422-(bx-.35)*.62:.363;
    const catCloth=(bx>.27&&bx<.389&&by>.376&&by<.505)||(bx>.353&&bx<.566&&by>.32&&by<strapBottom);
    const bounds=rig.bandanaBounds,cloth=pet.pose?x>bounds[0]&&x<bounds[0]+bounds[2]&&y>bounds[1]&&y<bounds[1]+bounds[3]:cat?catCloth:y>rig.neck[1]-.06&&y<rig.neck[1]+.17&&x>.38&&x<.81;
    const bandana=cloth&&(cat?r>g*1.4&&r>b*1.5&&(g-b)<(r-b)*.25&&(b-g)<(r-g)*.12:g>r*1.3&&b>r*1.25);
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
  const soft=surface(),sc=soft.getContext("2d",{willReadFrequently:true});sc.filter="blur(4px)";sc.drawImage(canvas,0,0);
  const smooth=sc.getImageData(0,0,SIZE,SIZE).data,luminance=new Uint8Array(SIZE*SIZE);
  for(let k=0;k<luminance.length;k++)luminance[k]=Math.round(smooth[k*4]*.2126+smooth[k*4+1]*.7152+smooth[k*4+2]*.0722);
  entry.data={pixels: pixels.data,mask:maskPixels.data,median,band,zones,luminance,levels:sums.map((sum,i)=>Math.max(24,sum/Math.max(1,weights[i])))};
  prepared.push(entry);if(prepared.length>10)prepared.shift().data=null;
}
const rgb=hex=>[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16));
export function isTugFur(pet,x,y){const entry=loadTugPet(pet);prepare(entry,pet);const i=(Math.min(SIZE-1,Math.floor(y*SIZE))*SIZE+Math.min(SIZE-1,Math.floor(x*SIZE)))*4+3;return !!entry.data&&x>=0&&x<=1&&y>=0&&y<=1&&entry.data.mask[i]>180&&entry.data.pixels[i]>180;}
export function tugCoatSprite(pet) {
  if(pet.pose){
    const original={...pet,pose:undefined},sprite=tugCoatSprite(original),source=loadTugPet(original),native=loadTugPet(pet);
    if(!sprite||!native.image)return null;prepare(source,original);const sourceBand=source.data.band;prepare(native,pet);
    const body=paintSprite(pet,native);
    return pet.pose==="sad"?body:poseTugSprite(body,sprite,petRig(original),pet,sourceBand,native.data.band);
  }
  const entry=loadTugPet(pet);if(!entry.image)return null;
  return paintSprite(pet,entry);
}
function paintSprite(pet,entry){
  const coat=tugCoat(pet),tint=pet.coatColor||coat.tint,savedMarkings=pet.markings||[],colors=[tint,pet.secondaryColor,pet.patternColor,pet.bandanaColor];
  const markings=pet.pose?posePetMarkings(savedMarkings,petRig({...pet,pose:undefined}),nativePoseRig(pet),pet.pose):savedMarkings;
  if(!colors.some(Boolean)&&!markings.length)return entry.image;
  const key=JSON.stringify([pet.pose?nativePoseSource(pet):coat.image,pet.pose,colors,markings]);if(painted.has(key))return painted.get(key);
  prepare(entry,pet);
  const layer=surface(),l=layer.getContext("2d",{willReadFrequently:true});
  // Rasterize only when the saved appearance changes, never every game frame.
  const ids=surface(),ic=ids.getContext("2d",{willReadFrequently:true});
  l.filter="blur(0.75px)";markings.forEach((spot,i)=>{tracePetPatch(l,spot,SIZE);l.fillStyle=spot.color;l.fill();tracePetPatch(ic,spot,SIZE);ic.fillStyle=`rgb(${i+1},0,0)`;ic.fill();});l.filter="none";
  const patches=l.getImageData(0,0,SIZE,SIZE).data,patchIds=ic.getImageData(0,0,SIZE,SIZE).data,{pixels,mask,band,zones,levels,luminance}=entry.data,out=surface(),c=out.getContext("2d"),result=c.createImageData(SIZE,SIZE),bases=colors.map(hex=>hex?rgb(hex):null),rig=pet.pose?nativePoseRig(pet):petRig(pet);
  const shade=(lum,level)=>{const relative=Math.pow(lum/level,.68);return Math.max(.18,relative<=1?relative:1+.32*(1-Math.exp(-(relative-1)/.6)));};
  for(let i=0;i<pixels.length;i+=4){
    if(!pixels[i+3])continue;
    const k=i/4,x=k%SIZE,y=Math.floor(k/SIZE),lum=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722,fur=mask[i+3]/255,light=zones[k*2]/255,dark=zones[k*2+1]/255;
    const mix=[Math.max(0,1-light-dark),light,dark],shades=levels.map(v=>shade(lum,v));
    const px=x,py=y;
    const fringeX=Math.max(0,Math.min(SIZE-1,Math.round(px+Math.sin(py*.22+px*.05)*2+furGrain(px>>1,py>>2)*2))),fringeY=Math.max(0,Math.min(SIZE-1,Math.round(py+Math.sin(px*.2)*1.3))),patchIndex=(fringeY*SIZE+fringeX)*4;
    const patch=Math.max(0,Math.min(1,patches[patchIndex+3]/255+(furGrain(x,y)*.3)*(1-Math.abs(patches[patchIndex+3]/127.5-1))));
    const spot=markings[patchIds[patchIndex]-1],variation=furVariation(px,py,spot);
    const localLevel=mix.reduce((sum,w,j)=>sum+w*levels[j],0),softLum=luminance[k];
    const texture=Math.max(.75,Math.min(1.24,Math.pow((lum+18)/(softLum+18),.65)));
    const lighting=Math.max(.5,Math.min(1.2,Math.pow((softLum+18)/(localLevel+18),.46)))*texture*furDepth(rig,x/SIZE,y/SIZE);
    for(let ch=0;ch<3;ch++){
      let tinted=0;for(let j=0;j<3;j++)tinted+=mix[j]*(bases[j]?Math.min(255,bases[j][ch]*shades[j]):pixels[i+ch]);
      const undertone=spot?.undertone??.28,nearby=(tinted-lum)*undertone*.28;
      const warmth=(variation.warmth+(lighting-1)*10)*[1,.25,-.65][ch]*(.35+undertone);
      const mark=Math.min(255,Math.max(0,patches[patchIndex+ch]*lighting*variation.shade+nearby+warmth));
      const coatValue=tinted*(1-patch)+mark*patch,bandWeight=bases[3]?band[k]/255:0;
      result.data[i+ch]=(pixels[i+ch]*(1-fur)+coatValue*fur)*(1-bandWeight)+(bases[3]?Math.min(255,bases[3][ch]*shades[3]):0)*bandWeight;
    }
    result.data[i+3]=pixels[i+3];
  }
  c.putImageData(result,0,0);painted.set(key,out);if(painted.size>12)painted.delete(painted.keys().next().value);return out;
}
