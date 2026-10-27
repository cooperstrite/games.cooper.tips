import { petRig, tracePetEye, tracePetMouth } from "./cats-dogs-pet-rig.js";

const mouths=new Map(),lids=new WeakMap();
export function preparePetExpression(pet){
  const id=petRig(pet).cat?"cat":"dog";if(!mouths.has(id)){
    const entry={image:null,bounds:null};entry.ready=new Promise(resolve=>{const im=new Image();im.onload=()=>{
      const cv=document.createElement("canvas");cv.width=im.width;cv.height=im.height;const c=cv.getContext("2d",{willReadFrequently:true});c.drawImage(im,0,0);const data=c.getImageData(0,0,cv.width,cv.height).data;let x0=cv.width,y0=cv.height,x1=0,y1=0;
      for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++)if(data[(y*cv.width+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}entry.image=im;entry.bounds=[x0,y0,x1-x0+1,y1-y0+1];resolve(im);
    };im.onerror=()=>resolve(null);im.src="assets/cats-dogs-grit-"+id+".png";});mouths.set(id,entry);
  }return mouths.get(id).ready;
}
// Separate rhythms prevent both opponents from blinking in unison.
export function petBlink(time,side){
  const period=side==="cats"?3.83:4.47,phase=(time+(side==="cats"?.72:2.18))%period;
  return phase<.18?Math.sin(phase/.18*Math.PI):0;
}
function eyelids(sprite,rig){
  if(lids.has(sprite))return lids.get(sprite);
  const result=rig.eyes.map(([x,y,rx,ry])=>{const canvas=document.createElement("canvas");canvas.width=160;canvas.height=100;const c=canvas.getContext("2d");c.drawImage(sprite,(x-rx*1.4)*sprite.width,(y-ry*3.0)*sprite.height,rx*2.8*sprite.width,ry*1.7*sprite.height,0,0,160,100);return canvas;});
  lids.set(sprite,result);return result;
}
export function drawPetExpression(c,pet,sprite,{time=0,effort=0,energy=100,reducedMotion=false}={}){
  const rig=petRig(pet),strength=Math.max(0,Math.min(1,effort)),blink=reducedMotion?0:petBlink(time,rig.cat?"cats":"dogs"),squint=Math.max(blink,strength*.36+(energy<20?.12:0));
  if(squint>.015){
    const textures=eyelids(sprite,rig);
    rig.eyes.forEach((eye,i)=>{
      const[x,y,rx,ry]=eye,w=rx*2.8,h=ry*2.8;
      c.save();tracePetEye(c,eye);c.clip();c.drawImage(textures[i],x-w/2,y-h/2,w,h);
      const open=Math.max(.015,1-squint),height=h*open;
      c.drawImage(sprite,(x-w/2)*sprite.width,(y-h/2)*sprite.height,w*sprite.width,h*sprite.height,x-w/2,y-height/2+ry*squint*.12,w,height);
      c.strokeStyle="#3b2935";c.lineWidth=.0015;c.globalAlpha=.65*squint;c.beginPath();c.moveTo(x-rx,y+ry*.15);c.quadraticCurveTo(x,y+ry*.42,x+rx,y-ry*.12);c.stroke();c.restore();
    });
  }
  const mouth=mouths.get(rig.cat?"cat":"dog");
  if(strength>.18&&mouth?.image){
    const [x,y,rx]=rig.mouth;c.save();c.globalAlpha=Math.min(1,(strength-.18)*2.4);
    if(!rig.cat){tracePetMouth(c,rig);c.clip();c.drawImage(mouth.image,...mouth.bounds,x-rx*1.08,y-.032,rx*2.16,.065);}
    else c.drawImage(mouth.image,...mouth.bounds,x-.036,y-.010,.068,.025);
    c.restore();
  }
}
