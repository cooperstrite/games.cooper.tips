import { TUG_BREEDS } from "./cats-dogs-customization.js";

const cache = new Map(), portraits = new WeakMap();
export function loadTugPet(breed) {
  if (!cache.has(breed)) {
    const entry = { image: null };
    entry.ready = new Promise(resolve => { const image = new Image(); image.onload = () => { entry.image = image; resolve(image); }; image.onerror = () => resolve(null); image.src = TUG_BREEDS[breed].image; });
    cache.set(breed, entry);
  }
  return cache.get(breed);
}
function star(c, x, y, radius, fill) {
  c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * .45 : radius; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fillStyle = fill; c.fill();
}
export function drawTugPet(c, pet) {
  const breed = TUG_BREEDS[pet.breed], entry = loadTugPet(pet.breed), cat = breed.side === "cats";
  if (entry.image) c.drawImage(entry.image, -225, -420, 450, 450);
  const ellipse = (x, y, rx, ry, fill) => { c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fillStyle=fill;c.fill(); };
  const x = cat ? -34 : 25, y = cat ? -365 : -382;
  c.save(); c.lineJoin="round"; c.lineCap="round";
  if (pet.hat !== "none") {
    c.save();c.translate(x,y);c.rotate(cat ? -.11 : .12);c.shadowColor="#152c3640";c.shadowBlur=5;c.shadowOffsetY=3;
    if (pet.hat === "cap") { ellipse(0,0,55,16,pet.accent);c.beginPath();c.ellipse(-4,-11,43,30,0,Math.PI,Math.PI*2);c.fillStyle=pet.accent;c.fill();ellipse(cat?30:-30,2,35,9,pet.accent);c.strokeStyle="#ffffff66";c.lineWidth=2;c.beginPath();c.moveTo(-4,-41);c.quadraticCurveTo(7,-20,4,-1);c.stroke(); }
    if (pet.hat === "crown") { const g=c.createLinearGradient(0,-58,0,5);g.addColorStop(0,"#fff0a2");g.addColorStop(.6,"#e8b444");g.addColorStop(1,"#b47b26");c.fillStyle=g;c.strokeStyle="#916222";c.lineWidth=2;c.beginPath();c.moveTo(-42,4);c.lineTo(-48,-44);c.lineTo(-22,-28);c.lineTo(0,-62);c.lineTo(22,-28);c.lineTo(48,-44);c.lineTo(42,4);c.closePath();c.fill();c.stroke();ellipse(0,-12,8,11,pet.accent);ellipse(-29,-10,4,6,"#fff1a1");ellipse(29,-10,4,6,"#fff1a1"); }
    if (pet.hat === "wizard") { ellipse(0,2,62,14,pet.accent);c.beginPath();c.moveTo(-40,0);c.quadraticCurveTo(-16,-69,-10,-91);c.quadraticCurveTo(29,-74,39,0);c.fillStyle=pet.accent;c.fill();star(c,1,-32,13,"#ffe8a1"); }
    if (pet.hat === "flowers") { for(let i=0;i<7;i++){const fx=(i-3)*14,fy=-Math.sin(i/6*Math.PI)*13;for(let j=0;j<5;j++)ellipse(fx+Math.cos(j*Math.PI*.4)*6,fy+Math.sin(j*Math.PI*.4)*6,5,6,i%2?pet.accent:"#fff2ce");ellipse(fx,fy,4,4,"#e9be56");} }
    c.restore();
  }
  if (pet.eyewear !== "none") {
    const eyes = cat ? [[-26,-317,20],[16,-331,15]] : [[18,-340,18],[-10,-354,13]];
    c.strokeStyle=pet.accent;c.lineWidth=4;
    for(const [ex,ey,r] of eyes){c.beginPath();c.ellipse(ex,ey,r,r*1.03,-.15,0,Math.PI*2);if(pet.eyewear==="shades"){c.fillStyle="#233749e8";c.fill();}else{c.fillStyle="#aaddff12";c.fill();}c.stroke();c.strokeStyle="#ffffffa0";c.lineWidth=2;c.beginPath();c.moveTo(ex-r*.55,ey-r*.2);c.lineTo(ex,ey-r*.65);c.stroke();c.strokeStyle=pet.accent;c.lineWidth=4;}
    c.beginPath();c.moveTo(eyes[0][0]+(cat?18:-15),eyes[0][1]-4);c.lineTo(eyes[1][0]+(cat?-12:10),eyes[1][1]-1);c.stroke();
  }
  const cx=cat?-51:43,cy=cat?-251:-255;
  if(pet.charm==="bow"){c.fillStyle=pet.accent;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx-25,cy-16);c.quadraticCurveTo(cx-34,cy,cx-25,cy+16);c.closePath();c.fill();c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+25,cy-16);c.quadraticCurveTo(cx+34,cy,cx+25,cy+16);c.closePath();c.fill();ellipse(cx,cy,7,10,"#fff2d4");}
  if(pet.charm==="medal"){c.strokeStyle=pet.accent;c.lineWidth=10;c.beginPath();c.moveTo(cx-14,cy-7);c.lineTo(cx,cy+27);c.lineTo(cx+15,cy-7);c.stroke();ellipse(cx,cy+30,17,19,"#d9a641");ellipse(cx,cy+30,13,15,"#f5d27a");star(c,cx,cy+30,9,"#ab762b");}
  c.restore();
}
export function drawTugPortrait(canvas, pet) {
  const signature=JSON.stringify(pet);portraits.set(canvas,signature);
  const paint=()=>{
    if(portraits.get(canvas)!==signature)return;
    const ratio=Math.min(2,globalThis.devicePixelRatio||1);canvas.width=600*ratio;canvas.height=620*ratio;
    const c=canvas.getContext("2d");c.setTransform(ratio,0,0,ratio,0,0);
    const g=c.createRadialGradient(300,260,20,300,280,420);g.addColorStop(0,"#fcf4e3");g.addColorStop(1,"#d9e5da");c.fillStyle=g;c.fillRect(0,0,600,620);
    c.fillStyle="#29433320";c.beginPath();c.ellipse(300,561,160,22,0,0,Math.PI*2);c.fill();
    c.save();c.translate(300,535);c.scale(1.12,1.12);drawTugPet(c,pet);c.restore();
  };
  paint();loadTugPet(pet.breed).ready.then(paint);
}
export function drawTugShopPreview(canvas, item) {
  const pet={breed:item.setting==="eyewear"?"labrador":"calico",hat:"none",eyewear:"none",charm:"none",accent:"#638f96",[item.setting]:item.value};
  canvas.setAttribute("aria-label",`${item.name} on a pet`);drawTugPortrait(canvas,pet);
}
