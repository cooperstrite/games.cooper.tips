// Portable markings: normalized coordinates on the original full-body sprite.
// The game, painter and 3D studio all consume this same saved data.
export const MAX_PET_MARKINGS = 48;
export const PET_PATCH_SHAPES = Object.freeze({ splotch: "Splotch", spot: "Round spot", stripe: "Stripe" });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const petHex = (value, fallback = null) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
export function normalizePetMarkings(raw) {
  const ids=new Set();
  return (Array.isArray(raw)?raw:[]).slice(0,MAX_PET_MARKINGS).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map((p,index)=>{
    let id=Number.isSafeInteger(p.id)&&p.id>0?p.id:index+1;while(ids.has(id))id++;ids.add(id);
    return {id,x:clamp(p.x,0,1),y:clamp(p.y,0,1),size:clamp(Number.isFinite(p.size)?p.size:.08,.018,.22),rotation:clamp(Number.isFinite(p.rotation)?p.rotation:0,-180,180),shape:Object.hasOwn(PET_PATCH_SHAPES,p.shape)?p.shape:"splotch",color:petHex(p.color,"#4a3027")};
  });
}
export function tracePetPatch(c, spot, scale=1) {
  c.save();c.translate(spot.x*scale,spot.y*scale);c.rotate(spot.rotation*Math.PI/180);c.beginPath();
  const r=spot.size*scale;
  if(spot.shape==="spot")c.ellipse(0,0,r,r*.86,0,0,Math.PI*2);
  else if(spot.shape==="stripe")c.ellipse(0,0,r*.25,r*1.5,0,0,Math.PI*2);
  else {
    // Smooth, organic outlines, stable while a patch is dragged or resized.
    const points=Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2,k=1+.14*Math.sin(i*2.1+spot.id)+.10*Math.cos(i*3.2+spot.id*.7);return [Math.cos(a)*r*k,Math.sin(a)*r*k*.84];});
    c.moveTo((points[15][0]+points[0][0])/2,(points[15][1]+points[0][1])/2);
    for(let i=0;i<16;i++){const p=points[i],next=points[(i+1)%16];c.quadraticCurveTo(p[0],p[1],(p[0]+next[0])/2,(p[1]+next[1])/2);}c.closePath();
  }
  c.restore();
}
export function petPatchAt(markings,x,y) {
  return [...markings].reverse().find(p=>{
    const a=-p.rotation*Math.PI/180,dx=x-p.x,dy=y-p.y,rx=dx*Math.cos(a)-dy*Math.sin(a),ry=dx*Math.sin(a)+dy*Math.cos(a);
    const w=p.size*(p.shape==="stripe"?.32:1.12),h=p.size*(p.shape==="stripe"?1.55:.98);
    return rx*rx/(w*w)+ry*ry/(h*h)<=1;
  })||null;
}
export function petPattern(side,kind,color="#45332b") {
  const mirror=x=>side==="cats"?x:1-x;
  const positions=kind==="splotches"?[[.49,.59,.10],[.62,.75,.085],[.3,.83,.065],[.2,.63,.055],[.44,.14,.055],[.75,.42,.055]]:
    kind==="spots"?Array.from({length:24},(_,i)=>[.39+(i%4)*.075+Math.sin(i*2)*.015,.48+Math.floor(i/4)*.056,.021+(i%3)*.006]):
    kind==="stripes"?Array.from({length:6},(_,i)=>[.4+i*.045,.57,.065]):[];
  return normalizePetMarkings(positions.map(([x,y,size],i)=>({id:i+1,x:mirror(x),y,size,rotation:kind==="stripes"?-30:((i*43)%150)-75,shape:kind==="spots"?"spot":kind==="stripes"?"stripe":"splotch",color})));
}
export const PET_COAT_SWATCHES=Object.freeze([
  ["Ivory","#f6eee1"],["Cream","#e8ca93"],["Ginger","#cc793c"],["Chocolate","#69412b"],["Black","#24262c"],["Silver","#939da9"],["Rose","#d7a5ae"],["Lavender","#a497c3"],
]);
