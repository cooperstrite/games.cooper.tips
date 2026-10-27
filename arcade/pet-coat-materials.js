import { tracePetPatch } from "../cats-dogs-coat.js";

// Project the same saved sprite-space markings onto corresponding body parts.
// Projection wraps to both sides; eyes, mouth, nose and clothing use separate materials.
export function paintPetMesh(world,root,character,cat) {
  if(!character.markings?.length)return ()=>{};
  const {B,scene}=world,materials=new Map(),textures=[];
  const fur=new Set(["soft-coat","chest","face","chin","hind-leg","paw","front-leg","front-paw","pointed-ear","floppy-ear","eyebrow","muzzle","tabby-mark","calico-face-patch","calico-ear-patch","calico-body-patch","white-blaze","tail-coat","ruff","ear-tuft"]);
  const clamp=v=>Math.max(0,Math.min(1,v)),lerp=(a,b,t)=>a+(b-a)*clamp(t);
  function uv(name,p){
    let x,y;
    if(["front-leg","front-paw"].includes(name)){x=cat?lerp(.45,.9,(-p.z-.1)/.6):lerp(.57,.08,(-p.z-.1)/.6);y=lerp(.52,.33,(p.y-.65)/.8);}
    else if(["hind-leg","paw"].includes(name)){x=lerp(.2,.94,(p.x+.6)/1.2);y=lerp(.97,.72,p.y/.7);}
    else if(name==="tail-coat"){x=cat?lerp(.35,.06,p.x/.8):lerp(.78,.98,p.x/.8);y=lerp(.83,.47,(p.y-.55)/.8);}
    else if(["soft-coat","chest","calico-body-patch","ruff"].includes(name)){x=lerp(cat?.32:.34,cat?.8:.83,(p.x+.5));y=lerp(.84,.35,(p.y-.3)/1.25);}
    else{x=lerp(cat?.19:.36,cat?.66:.79,(p.x+.7)/1.4);y=lerp(.39,cat?.0:.04,(p.y-1.35)/1.15);}
    return [x,1-y];
  }
  for(const mesh of root.getChildMeshes()){
    if(!fur.has(mesh.name))continue;
    const color=mesh.material.albedoColor.toHexString();
    if(!materials.has(color)){
      const texture=new B.DynamicTexture(`pet-markings-${color}`,{width:768,height:768},scene,true),c=texture.getContext();c.fillStyle=color;c.fillRect(0,0,768,768);
      for(const spot of character.markings){tracePetPatch(c,spot,768);c.fillStyle=spot.color;c.fill();}texture.update(true);texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;texture.anisotropicFilteringLevel=4;textures.push(texture);
      const mat=new B.PBRMaterial(`pet-painted-${color}`,scene);mat.albedoTexture=texture;mat.albedoColor=B.Color3.White();mat.roughness=.9;mat.metallic=0;materials.set(color,mat);
    }
    mesh.computeWorldMatrix(true);const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),coords=[];
    for(let i=0;i<positions.length;i+=3){const p=B.Vector3.TransformCoordinates(new B.Vector3(positions[i],positions[i+1],positions[i+2]),mesh.getWorldMatrix());coords.push(...uv(mesh.name,p));}
    mesh.setVerticesData(B.VertexBuffer.UVKind,coords);mesh.material=materials.get(color);
  }
  return ()=>{for(const mat of materials.values())mat.dispose(false,false);for(const texture of textures)texture.dispose();};
}
