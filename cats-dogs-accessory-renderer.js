import { petRig } from "./cats-dogs-pet-rig.js";

const assets=new Map(),tinted=new Map();
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
export function drawPetAccessories(c,pet){
  const rig=petRig(pet),flip=rig.cat?1:-1,color=pet.accent||"#428e96";
  const place=(id,x,y,width,anchor=.94)=>{
    if(!id||id==="none")return;const image=sprite(id,color);if(!image)return;const [sx,sy,sw,sh]=loadPetAccessory(id).bounds,h=width*sh/sw;
    c.save();c.translate(x,y);c.scale(flip,1);c.shadowColor="#18302f32";c.shadowBlur=.006;c.shadowOffsetY=.003;c.drawImage(image,sx,sy,sw,sh,-width/2,-h*anchor,width,h);c.restore();
  };
  const [hx,hy,hw]=rig.hat;
  place(pet.hat,hx,hy,hw*(pet.hat==="flowers"?1.12:1),pet.hat==="flowers"?.65:.91);
  if(pet.eyewear&&pet.eyewear!=="none"){
    const image=sprite(pet.eyewear,color);
    if(image){
      const n=rig.eyes[0],f=rig.eyes[1],sn=pet.eyewear==="round"?[.485,.548]:[.514,.546],sf=pet.eyewear==="round"?[.872,.503]:[.851,.457];
      const dx=f[0]-n[0],dy=f[1]-n[1],sx=(sf[0]-sn[0])*flip,sy=sf[1]-sn[1],scale=Math.hypot(dx,dy)/Math.hypot(sx,sy),angle=Math.atan2(dy,dx)-Math.atan2(sy,sx);
      c.save();c.translate(n[0],n[1]);c.rotate(angle);c.scale(scale*flip,scale);c.translate(-sn[0],-sn[1]);c.drawImage(image,0,0,1,1);c.restore();
    }
  }
  const[nx,ny]=rig.neck;
  if(pet.charm==="bow")place("bow",nx,ny+.025,.14,.5);
  if(pet.charm==="medal")place("medal",nx,ny+.017,.13,.08);
}
