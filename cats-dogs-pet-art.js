import { loadTugPet, tugCoatSprite } from "./cats-dogs-coat-renderer.js";
import { drawPetAccessories, preparePetAccessories } from "./cats-dogs-accessory-renderer.js";
import { drawPetExpression, preparePetExpression } from "./cats-dogs-expressions.js";
import { drawPetFur } from "./cats-dogs-ears.js";
export { loadTugPet } from "./cats-dogs-coat-renderer.js";

const portraits=new WeakMap();
export function prepareTugPet(pet,animate=false){return Promise.all([loadTugPet(pet).ready,preparePetAccessories(pet),animate?preparePetExpression(pet):true]).then(([image,items,expression])=>!!image&&items.every(Boolean)&&!!expression);}
export function drawTugPet(c,pet,animation=null){
  const sprite=tugCoatSprite(pet);if(!sprite)return;
  c.save();c.translate(-225,-420);c.scale(450,450);drawPetFur(c,pet,sprite,animation);if(animation)drawPetExpression(c,pet,sprite,animation);drawPetAccessories(c,pet);c.restore();
}
export function drawTugPortrait(canvas,pet,afterPaint=null){
  const signature=JSON.stringify(pet);portraits.set(canvas,signature);
  const paint=()=>{
    if(portraits.get(canvas)!==signature)return;
    const ratio=Math.min(2,globalThis.devicePixelRatio||1);canvas.width=600*ratio;canvas.height=620*ratio;
    const c=canvas.getContext("2d");c.setTransform(ratio,0,0,ratio,0,0);
    const g=c.createRadialGradient(300,260,20,300,280,420);g.addColorStop(0,"#fcf4e3");g.addColorStop(1,"#d9e5da");c.fillStyle=g;c.fillRect(0,0,600,620);
    c.fillStyle="#29433320";c.beginPath();c.ellipse(300,561,160,22,0,0,Math.PI*2);c.fill();
    c.save();c.translate(300,535);c.scale(1.12,1.12);drawTugPet(c,pet);c.restore();afterPaint?.(c);
  };
  paint();prepareTugPet(pet).then(paint);
}
export function drawTugShopPreview(canvas,item){
  const pet={breed:item.setting==="eyewear"?"labrador":"calico",hat:"none",eyewear:"none",charm:"none",accent:"#638f96",[item.setting]:item.value};
  canvas.setAttribute("aria-label",item.name+" on a pet");drawTugPortrait(canvas,pet);
}
