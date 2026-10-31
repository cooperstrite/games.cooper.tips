export function createMuseumMaterials(B, scene) {
  let seed=4962; const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function texture(name,w,h,draw) { const t=new B.DynamicTexture(name,{width:w,height:h},scene,true);draw(t.getContext(),w,h);t.update(true);t.wrapU=t.wrapV=B.Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=8;return t; }
  // DynamicTexture.clone() copies its settings but not the canvas pixels.
  function copyTexture(source,name){const {width,height}=source.getSize();return texture(name,width,height,c=>c.drawImage(source.getContext().canvas,0,0));}
  function material(name,color,roughness=.65,metallic=0) {const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.FromHexString(color);m.roughness=roughness;m.metallic=metallic;m.maxSimultaneousLights=8;m.environmentIntensity=.65;return m;}
  const plaster=material('warm limestone','#e3d9c5',.87),wood=material('oiled walnut','#ffffff',.48),stone=material('honed marble','#ffffff',.3),darkStone=material('charcoal inlay','#303938',.4),gold=material('antique brass','#b99a59',.32,.8),black=material('powder coated metal','#202729',.55,.45),linen=material('canvas backing','#9b8b71',.97),red=material('oxblood upholstery','#55302c',.8),white=material('sculpture marble','#e5e0d4',.38),paper=material('aged paper','#e7dfc6',.94),leaves=material('living foliage','#405c34',.8),terracotta=material('stoneware','#a28465',.83);
  plaster.albedoTexture=texture('limestone pores',512,512,(c,w,h)=>{c.fillStyle='#fffdf5';c.fillRect(0,0,w,h);for(let i=0;i<23000;i++){const t=random()>.5?80:255;c.fillStyle=`rgba(${t},${t},${t},${random()*.045})`;c.fillRect(random()*w,random()*h,1+random()*2,1);}});
  wood.albedoTexture=texture('walnut grain',512,1024,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'#38261b');g.addColorStop(.48,'#6c4d30');g.addColorStop(1,'#3d2b1e');c.fillStyle=g;c.fillRect(0,0,w,h);
    for(let i=0;i<700;i++){let x=random()*w;c.strokeStyle=random()>.35?'rgba(17,12,8,.13)':'rgba(204,159,95,.12)';c.lineWidth=.4+random()*2;c.beginPath();for(let y=0;y<=h;y+=8){const nx=x+Math.sin(y*.006+x*.04)*7+Math.sin(y*.029+x*.08)*2;if(y===0)c.moveTo(nx,y);else c.lineTo(nx,y);}c.stroke();}
    for(let i=0;i<4;i++){const x=i*128;c.fillStyle='rgba(9,7,5,.28)';c.fillRect(x,0,1,h);c.fillStyle='rgba(232,193,127,.1)';c.fillRect(x+2,0,1,h);}
  });
  stone.albedoTexture=texture('marble tile',1024,1024,(c,w,h)=>{
    c.fillStyle='#d4cebf';c.fillRect(0,0,w,h);
    for(let y=0;y<2;y++)for(let x=0;x<2;x++){const n=Math.floor(random()*8);c.fillStyle=`rgb(${225+n},${220+n},${206+n})`;c.fillRect(x*512+2,y*512+2,508,508);}
    for(let i=0;i<34;i++){const x=random()*w,y=random()*h;c.strokeStyle=`rgba(100,107,103,${.04+random()*.09})`;c.lineWidth=.5+random()*2.5;c.beginPath();c.moveTo(x-100,y-100);for(let n=0;n<12;n++)c.lineTo(x+n*22+Math.sin(n*.9+i)*26,y+n*35);c.stroke();}
    for(let i=0;i<25000;i++){c.fillStyle=random()>.5?'rgba(255,255,255,.04)':'rgba(47,45,36,.025)';c.fillRect(random()*w,random()*h,1,1);}
  });
  const normal=texture('stone micro normal',256,256,(c,w,h)=>{c.fillStyle='#8080ff';c.fillRect(0,0,w,h);for(let i=0;i<6000;i++){const n=124+Math.floor(random()*9);c.fillStyle=`rgb(${n},${n},255)`;c.fillRect(random()*w,random()*h,1,1);}});
  stone.bumpTexture=normal;stone.bumpTexture.level=.2;white.bumpTexture=normal;white.bumpTexture.level=.12;
  const rug=material('woven burgundy rug','#ffffff',.98);
  rug.albedoTexture=texture('hand woven rug',512,1024,(c,w,h)=>{
    c.fillStyle='#5b2927';c.fillRect(0,0,w,h);c.strokeStyle='#b4955c';c.lineWidth=8;c.strokeRect(14,14,w-28,h-28);c.lineWidth=2;c.strokeRect(31,31,w-62,h-62);c.strokeStyle='#95653f';c.lineWidth=15;c.strokeRect(46,46,w-92,h-92);
    for(let y=78;y<h-60;y+=67)for(let x=80;x<w-60;x+=58){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle='#9e8253';c.fillRect(-8,-8,16,16);c.fillStyle='#622e2a';c.fillRect(-4,-4,8,8);c.restore();}
    for(let y=0;y<h;y+=2){c.fillStyle='rgba(0,0,0,.08)';c.fillRect(0,y,w,1);}for(let x=0;x<w;x+=3){c.fillStyle='rgba(240,204,158,.055)';c.fillRect(x,0,1,h);}
  });
  const dust=material('warm light','#e6d7b3');dust.unlit=true;dust.emissiveColor=B.Color3.FromHexString('#cbb785');
  const window=material('daylit glass','#cadce0',.25);window.emissiveColor=B.Color3.FromHexString('#b4cbd2').scale(.55);
  const screen=material('security display','#061d22',.5);screen.emissiveColor=B.Color3.FromHexString('#254c4d').scale(.45);
  // Unpack the material atlas into repeatable textures at runtime. The procedural
  // surfaces above remain usable if an image fails to load.
  const ready=new Promise(resolve=>{const img=new Image();img.onload=()=>{
    for(const [mat,col,row]of [[stone,0,0],[wood,1,0],[rug,0,1],[plaster,1,1]]){
      const t=mat.albedoTexture,c=t.getContext(),size=t.getSize();
      c.drawImage(img,col*img.width/2,row*img.height/2,img.width/2,img.height/2,0,0,size.width,size.height);
      if(mat===plaster){c.fillStyle='rgba(246,240,225,.6)';c.fillRect(0,0,size.width,size.height);}
      t.update(true);
    }
    resolve();
  };img.onerror=()=>resolve();img.src=new URL('./assets/museum-surfaces.png',import.meta.url).href;});
  return {ready,material,texture,copyTexture,plaster,wood,stone,darkStone,gold,black,linen,red,white,paper,leaves,terracotta,rug,dust,window,screen};
}
