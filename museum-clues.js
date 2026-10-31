import {CLUES, RUGS, clueHintVisible} from './museum-world.js';

// Small evidence objects use their own geometry and surface maps. The clue
// positions and investigation radii still come from the original case layout.
export function createMuseumClues(B,scene,m,finish){
  const nodes=new Map(),markers=new Map(),V=(x,y,z)=>new B.Vector3(x,y,z);
  let seed=6018;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const tex=(name,w,h,draw,alpha=false)=>{
    const t=m.texture(name,w,h,draw);t.hasAlpha=alpha;t.wrapU=t.wrapV=B.Texture.CLAMP_ADDRESSMODE;return t;
  };
  function surface(name,roughness,draw,w=512,h=512,alpha=false){
    const mat=m.material(name,'#ffffff',roughness);mat.albedoTexture=tex(name+' color',w,h,draw,alpha);
    if(alpha){mat.useAlphaFromAlbedoTexture=true;mat.transparencyMode=B.PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND;mat.alphaCutOff=.02;}
    return mat;
  }
  function normalFromHeight(name,w,h,draw,strength=3){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');draw(c,w,h);
    const src=c.getImageData(0,0,w,h).data;
    return tex(name,w,h,ctx=>{
      const out=ctx.createImageData(w,h),height=(x,y)=>src[(Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x)))*4]/255;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const dx=(height(x-1,y)-height(x+1,y))*strength,dy=(height(x,y+1)-height(x,y-1))*strength,length=Math.hypot(dx,dy,1),i=(y*w+x)*4;
        out.data[i]=128+dx/length*127;out.data[i+1]=128+dy/length*127;out.data[i+2]=128+127/length;out.data[i+3]=255;
      }
      ctx.putImageData(out,0,0);
    });
  }
  function mesh(name,positions,indices,uvs,mat,parent,shadow=true){
    const s=new B.Mesh(name,scene),data=new B.VertexData();data.positions=positions;data.indices=indices;data.uvs=uvs;data.normals=[];B.VertexData.ComputeNormals(positions,indices,data.normals);data.applyToMesh(s);s.parent=parent;finish(s,mat,shadow);return s;
  }
  function sheet(name,cols,rows,point,mat,parent,shadow=false){
    const positions=[],indices=[],uvs=[];
    for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){positions.push(...point(x/cols,y/rows));uvs.push(x/cols,y/rows);}
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+1,d=a+cols+1,c=d+1;indices.push(a,c,b,a,d,c);}
    return mesh(name,positions,indices,uvs,mat,parent,shadow);
  }
  function oval(name,w,h,d,x,y,z,mat,parent,shadow=true){
    const s=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:20},scene);s.scaling.set(w,h,d);s.position.set(x,y,z);s.parent=parent;finish(s,mat,shadow);return s;
  }
  function thread(name,path,radius,mat,parent){const s=B.MeshBuilder.CreateTube(name,{path:path.map(p=>V(...p)),radius,tessellation:5},scene);s.parent=parent;finish(s,mat,false);return s;}
  const floorOffset=c=>(RUGS.some(([x,z,w,d])=>Math.abs(c.x-x)<w/2&&Math.abs(c.z-z)<d/2)?.0185:.0025)-c.y;
  const mud=m.material('wet earth grains','#4b3926',.9),plasterEdge=m.material('fresh chipped limestone','#d6c9ad',.95);

  function footprint(g,c){
    const mat=surface('mud pressed into the carpet',.94,(ctx,w,h)=>{
      ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate(-.12);ctx.translate(-w*.5,-h*.5);
      // Worn boot sole, with a separated heel and an irregular toe contour.
      ctx.beginPath();ctx.moveTo(153,519);ctx.bezierCurveTo(128,405,115,210,168,135);ctx.bezierCurveTo(212,82,328,85,358,161);ctx.bezierCurveTo(385,285,335,430,324,520);ctx.bezierCurveTo(277,547,204,548,153,519);ctx.closePath();
      ctx.moveTo(170,627);ctx.bezierCurveTo(210,608,286,609,324,632);ctx.lineTo(330,797);ctx.bezierCurveTo(293,843,204,842,166,798);ctx.closePath();
      ctx.fillStyle='#52412c55';ctx.fill();ctx.save();ctx.clip();
      const brown=ctx.createLinearGradient(0,0,w,h);brown.addColorStop(0,'#59432d');brown.addColorStop(.5,'#322a21');brown.addColorStop(1,'#756044');ctx.fillStyle=brown;
      // Broken chevron lugs, edge blocks, and a crosshatched heel.
      for(let y=168;y<540;y+=48){for(const side of [-1,1]){ctx.save();ctx.translate(252+side*51,y);ctx.rotate(side*-.3);ctx.fillRect(-37,-12,74,24);ctx.restore();}ctx.fillRect(136,y-8,24,31);ctx.fillRect(334,y-8,24,31);}
      for(let y=646;y<829;y+=36)for(let x=171;x<332;x+=39){ctx.save();ctx.translate(x,y);ctx.rotate(.13);ctx.fillRect(0,0,27,21);ctx.restore();}
      ctx.globalCompositeOperation='destination-out';
      for(let i=0;i<1800;i++){ctx.fillStyle=`rgba(0,0,0,${.1+random()*.6})`;ctx.beginPath();ctx.ellipse(random()*w,random()*h,.5+random()*4,1+random()*6,random()*3,0,Math.PI*2);ctx.fill();}
      ctx.restore();ctx.globalCompositeOperation='source-atop';
      for(let i=0;i<5000;i++){ctx.fillStyle=i%3?'#baa08144':'#201a1655';ctx.fillRect(random()*w,random()*h,1+random()*3,1+random()*3);}
      ctx.restore();ctx.globalCompositeOperation='source-over';
      for(let i=0;i<95;i++){const x=100+random()*300,y=90+random()*760;ctx.fillStyle='#68513999';ctx.beginPath();ctx.arc(x,y,.6+random()*2,0,Math.PI*2);ctx.fill();}
    },512,1024,true);
    const y=floorOffset(c);sheet('muddy boot impression',1,1,(u,v)=>[(u-.5)*.28,y,-(v-.5)*.48],mat,g);
    for(let i=0;i<22;i++){const x=(random()-.5)*.17,z=(random()-.5)*.34;oval('crumb of dried mud',.002+random()*.004,.0015,.003+random()*.006,x,y+.0008,z,mud,g,false);}
  }

  function scratches(g){
    const paths=Array.from({length:4},(_,j)=>Array.from({length:15},(_,i)=>[120+j*70+i*(3+j*.7)+Math.sin(i*2+j)*4,100+i*(25-j*2)+Math.sin(i*4+j)*5]));
    function groove(ctx,path,width,color){ctx.lineWidth=width;ctx.lineJoin='miter';ctx.lineCap='butt';ctx.strokeStyle=color;ctx.beginPath();path.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
    const mat=surface('gouged plaster and exposed stone',1,(ctx)=>{
      for(const [j,path] of paths.entries()){
        groove(ctx,path,9-j*.9,'#c6b18c');groove(ctx,path,5-j*.6,'#74634b');groove(ctx,path,1.7,'#433b30');
        for(let i=2;i<path.length-1;i++){const [x,y]=path[i],size=2+random()*3;ctx.fillStyle=i%3?'#c7b89b':'#8a795e';ctx.beginPath();ctx.moveTo(x-2,y-size);ctx.lineTo(x-3-size,y+1);ctx.lineTo(x-2-size*.6,y+size);ctx.lineTo(x-1,y+size*1.4);ctx.closePath();ctx.fill();}
        ctx.save();ctx.translate(3,1);groove(ctx,path,1.5,'#eee4ce');ctx.restore();
      }
      for(let i=0;i<170;i++){ctx.fillStyle=i%2?'#ccbea280':'#81725666';ctx.fillRect(90+random()*340,80+random()*390,random()*2+1,random()*3+1);}
    },512,512,true);
    mat.bumpTexture=normalFromHeight('recessed scratch relief',512,512,ctx=>{ctx.fillStyle='#b8b8b8';ctx.fillRect(0,0,512,512);for(const path of paths){groove(ctx,path,11,'#dedede');groove(ctx,path,7,'#666666');groove(ctx,path,3,'#171717');}},5);
    // The wall's exposed face is z=-11.8. Put the relief just 1mm in front of
    // it, not at the old clue target depth where the marks floated like rods.
    sheet('jagged recessed crowbar scars',1,1,(u,v)=>[(u-.5)*.5,(v-.5)*.53,-.039],mat,g);
    for(let i=0;i<9;i++){const [x,y]=paths[i%4][3+i];const chip=oval('lifted plaster fleck',.003+random()*.004,.008,.0015,(x/512-.5)*.5,(.5-y/512)*.53,-.038,plasterEdge,g,false);chip.rotation.z=random()*2;}
  }

  function paint(g,c){
    const mat=m.material('ivory paint with a drying skin','#eee7d4',.24);mat.clearCoat.isEnabled=true;mat.clearCoat.intensity=.38;mat.clearCoat.roughness=.18;
    mat.albedoColor=B.Color3.White();mat.albedoTexture=tex('paint pigment and drying rim',256,256,(ctx,w,h)=>{
      const pigment=ctx.createRadialGradient(w*.42,h*.38,5,w*.5,h*.5,w*.51);pigment.addColorStop(0,'#f1eee1');pigment.addColorStop(.58,'#e3dfcd');pigment.addColorStop(.88,'#d5cfb9');pigment.addColorStop(1,'#b9af96');ctx.fillStyle=pigment;ctx.fillRect(0,0,w,h);
      for(let i=0;i<180;i++){ctx.fillStyle=i%2?'#fffdf01c':'#938b6f12';ctx.fillRect(random()*w,random()*h,.8,1.2);}
    });
    mat.bumpTexture=normalFromHeight('fine paint ripples',128,128,(ctx,w,h)=>{ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h);for(let i=0;i<160;i++){ctx.strokeStyle=i%2?'#858585':'#7c7c7c';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(w*.5,h*.5,random()*w*.55,random()*5,Math.PI*2);ctx.stroke();}},1.2);
    const y=floorOffset(c);
    function blob(name,x,z,rx,rz,height,phase){
      const positions=[x,y+height,z],uvs=[.5,.5],indices=[],rings=6,sides=36;
      for(let r=1;r<=rings;r++)for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,t=r/rings,edge=1+.11*Math.sin(a*3+phase)+.06*Math.sin(a*7+phase);positions.push(x+Math.cos(a)*rx*t*edge,y+height*Math.pow(Math.max(0,1-t*t),.7)+.00015,z+Math.sin(a)*rz*t*edge);uvs.push(.5+Math.cos(a)*t*.5,.5+Math.sin(a)*t*.5);}
      for(let i=0;i<sides;i++)indices.push(0,1+i,1+(i+1)%sides);
      for(let r=0;r<rings-1;r++)for(let i=0;i<sides;i++){const a=1+r*sides+i,b=1+r*sides+(i+1)%sides,d=a+sides,c=b+sides;indices.push(a,d,c,a,c,b);}
      return mesh(name,positions,indices,uvs,mat,g,false);
    }
    blob('pooled paint with uneven meniscus',0,0,.047,.064,.0045,1.2);
    for(let i=0;i<10;i++){const a=i*2.4,dist=.065+random()*.045;blob('satellite paint splatter',Math.sin(a)*dist,Math.cos(a)*dist,.002+random()*.006,.003+random()*.009,.0006+random()*.0012,i);}
    blob('dragged paint tail',.018,.069,.007,.028,.001,2);
  }

  function fabric(g){
    const cloth=surface('navy maintenance uniform twill',.98,(ctx,w,h)=>{
      ctx.fillStyle='#303e49';ctx.fillRect(0,0,w,h);
      for(let x=0;x<w;x+=3){ctx.strokeStyle=x%9?'#67758330':'#0e172330';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
      for(let y=0;y<h;y+=3){ctx.strokeStyle=y%9?'#a6afae20':'#0a172a55';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      for(let y=-w;y<h;y+=12){ctx.strokeStyle='#9ba5a326';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y+w);ctx.stroke();}
      for(const x of [w*.12,w*.14,w*.76,w*.78]){ctx.strokeStyle='#b3afa366';ctx.lineWidth=1.4;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}ctx.setLineDash([]);
      for(let i=0;i<3500;i++){ctx.fillStyle=i%2?'#bac4c21b':'#030b161f';ctx.fillRect(random()*w,random()*h,1,2+random()*4);}
    },512,1024);
    cloth.backFaceCulling=false;cloth.twoSidedLighting=true;
    cloth.bumpTexture=normalFromHeight('woven twill fibers',256,512,(ctx,w,h)=>{ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h);for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){ctx.fillStyle=(x+y)%12?'#989898':'#686868';ctx.fillRect(x,y,3,1);}},1.2);cloth.bumpTexture.level=.22;
    const point=(u,v)=>{
      const width=.22*(.68+.32*(1-v))+.005*Math.sin(v*17),edge=.002*Math.sin(v*61)+.001*Math.sin(v*119),x=(u-.5)*width+edge;
      const tear=(1-v)*(.012*Math.sin(u*17)+.004*Math.sin(u*47)+.003*Math.sin(u*83));
      return [x,(v-.5)*.39+tear,.026*Math.sin(u*12+v*2.8)*(1-v*.65)+.015*(1-v)*(1-v)];
    };
    sheet('folded torn uniform fabric',24,36,point,cloth,g,true);g.rotation.z=-.12;g.rotation.y=-.18;
    const fibers=m.material('frayed indigo threads','#627482',1);
    for(let i=0;i<24;i++){const u=(i+.5)/24,[x,y,z]=point(u,0),len=.012+random()*.028;thread('loose woven thread',[[x,y,z],[x+.003*Math.sin(i),y-len*.6,z+.004],[x+.006*Math.sin(i*2),y-len,z+.002]],.00055,fibers,g);}
    for(let i=0;i<10;i++){const [x,y,z]=point(i%2,random()*.7);thread('frayed side fiber',[[x,y,z],[x+(i%2?.009:-.009),y-.004,z+.002]],.00045,fibers,g);}
  }

  function keycard(g,c){
    const mat=surface('printed staff security credential',.43,(ctx,w,h)=>{
      ctx.fillStyle='#e6e5dd';ctx.fillRect(0,0,w,h);const shade=ctx.createLinearGradient(0,0,w,h);shade.addColorStop(0,'#ffffffaa');shade.addColorStop(1,'#8c9d9d22');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#203e47';ctx.fillRect(0,0,w,127);ctx.fillStyle='#dec48a';ctx.font='600 28px Georgia';ctx.textAlign='center';ctx.fillText('MUSEUM',w/2,62);ctx.font='17px sans-serif';ctx.fillText('STAFF ACCESS',w/2,94);
      ctx.fillStyle='#aab8b5';ctx.fillRect(56,159,168,215);ctx.save();ctx.beginPath();ctx.rect(56,159,168,215);ctx.clip();
      const face=ctx.createRadialGradient(142,232,8,142,242,62);face.addColorStop(0,'#c2a17f');face.addColorStop(1,'#805f46');ctx.fillStyle='#26394a';ctx.beginPath();ctx.ellipse(142,367,94,69,0,0,7);ctx.fill();ctx.fillStyle=face;ctx.beginPath();ctx.ellipse(141,247,48,66,-.04,0,7);ctx.fill();ctx.fillStyle='#40382e';ctx.beginPath();ctx.ellipse(140,198,49,33,-.05,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#443c35';ctx.fillRect(117,240,13,4);ctx.fillRect(154,240,13,4);ctx.strokeStyle='#795a45';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(142,248);ctx.lineTo(137,269);ctx.lineTo(146,270);ctx.stroke();ctx.strokeStyle='#604838';ctx.beginPath();ctx.moveTo(128,283);ctx.quadraticCurveTo(141,289,155,282);ctx.stroke();ctx.restore();
      ctx.fillStyle='#2d4247';ctx.textAlign='left';ctx.font='bold 29px sans-serif';ctx.fillText('J. SMITH',55,431);ctx.font='18px sans-serif';ctx.fillText('MAINTENANCE',55,466);ctx.fillStyle='#64716d';ctx.font='14px monospace';ctx.fillText('EMPLOYEE  0047',55,503);ctx.fillText('LEVEL 03 / ALL GALLERIES',55,529);
      ctx.fillStyle='#b6a266';ctx.fillRect(281,187,69,61);ctx.strokeStyle='#655a37';ctx.lineWidth=2;ctx.strokeRect(288,194,55,47);ctx.beginPath();ctx.moveTo(306,194);ctx.lineTo(306,241);ctx.moveTo(326,194);ctx.lineTo(326,241);ctx.moveTo(288,216);ctx.lineTo(343,216);ctx.stroke();
      const hologram=ctx.createLinearGradient(266,292,368,370);hologram.addColorStop(0,'#7fbaa7');hologram.addColorStop(.4,'#d1bad1');hologram.addColorStop(.7,'#c4d1bc');hologram.addColorStop(1,'#919fc2');ctx.fillStyle=hologram;ctx.beginPath();ctx.arc(317,325,43,0,7);ctx.fill();ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;for(let i=0;i<4;i++)ctx.strokeRect(293+i*5,301+i*5,48-i*10,48-i*10);
      ctx.fillStyle='#253237';for(let x=56;x<365;x+=4+random()*3)ctx.fillRect(x,583,1+random()*3,48);ctx.font='13px monospace';ctx.fillText('03 0047 0215',99,657);
      ctx.fillStyle='#34464b';ctx.fillRect(0,701,w,67);ctx.fillStyle='#dedfd2';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('PROPERTY OF THE MUSEUM',w/2,738);
      for(let i=0;i<45;i++){ctx.strokeStyle=i%2?'#ffffff50':'#6c766812';ctx.lineWidth=.4+random();ctx.beginPath();const x=random()*w,y=random()*h;ctx.moveTo(x,y);ctx.lineTo(x+random()*45,y+random()*14);ctx.stroke();}
    },420,768);
    const y=Math.max(.0135-c.y,floorOffset(c)+.003);
    // A thin rounded laminate, not a stack of blocky colored rectangles.
    const shape=[],positions=[],indices=[],uvs=[],w=.205,d=.318,r=.009;
    for(const [cx,cz,a]of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])for(let i=0;i<=7;i++){const t=a+i/7*Math.PI/2;shape.push([cx+Math.cos(t)*r,cz+Math.sin(t)*r]);}
    positions.push(0,y,0);uvs.push(.5,.5);for(const [x,z]of shape){positions.push(x,y,z);uvs.push(x/w+.5,.5-z/d);}for(let i=0;i<shape.length;i++)indices.push(0,i+1,(i+1)%shape.length+1);
    const top=mesh('rounded printed access card',positions,indices,uvs,mat,g,false);top.material.backFaceCulling=false;
    const edge=m.material('laminated card edge','#c5cdc8',.5);for(let i=0;i<shape.length;i++){const a=shape[i],b=shape[(i+1)%shape.length];thread('card laminate edge',[[a[0],y-.001,a[1]],[b[0],y-.001,b[1]]],.0014,edge,g);}
    g.rotation.y=-.29;
  }

  function glove(g){
    const latex=surface('creased ivory latex',.46,(ctx,w,h)=>{
      const gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#dedec9');gradient.addColorStop(.55,'#b6bfb5');gradient.addColorStop(1,'#e2dfc5');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
      for(let i=0;i<140;i++){const x=random()*w,y=random()*h;ctx.strokeStyle=i%2?'#68777022':'#ffffed33';ctx.lineWidth=.4+random()*1.8;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+12,y+9,x+31,y-3,x+42,y+6);ctx.stroke();}
      for(let i=0;i<8000;i++){ctx.fillStyle=i%2?'#454d4210':'#ffffee18';ctx.fillRect(random()*w,random()*h,1,1);}
      for(let i=0;i<55;i++){ctx.fillStyle=['#c9a958','#e8ce81','#8e7540'][i%3];ctx.fillRect(w*(.29+random()*.25),h*(.4+random()*.22),.6+random()*2,.7+random()*2);}
    },512,768);
    latex.backFaceCulling=false;latex.twoSidedLighting=true;latex.clearCoat.isEnabled=true;latex.clearCoat.intensity=.17;latex.clearCoat.roughness=.4;
    latex.bumpTexture=normalFromHeight('latex micro folds',256,384,(ctx,w,h)=>{ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h);for(let i=0;i<110;i++){const x=random()*w,y=random()*h;ctx.strokeStyle=i%2?'#979797':'#696969';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+12,y+12,x+29,y+3);ctx.stroke();}},1.7);
    // A single continuous deflated glove: webbed palm, bent fingers of different
    // lengths, and an angled thumb. Surface folds replace the old sausage shapes.
    const fingers=[
      [[-.048,-.039],[-.061,-.091],[-.055,-.147]],
      [[-.016,-.05],[-.018,-.124],[-.005,-.182]],
      [[.018,-.048],[.032,-.119],[.045,-.158]],
      [[.045,-.027],[.068,-.077],[.082,-.111]],
      [[-.05,.019],[-.095,-.008],[-.117,-.053]],
    ];
    function capsule(x,z,a,b,r){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return r-Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
    function field(x,z){let d=(1-Math.hypot(x/.063,z/.073))*.06;d=Math.max(d,capsule(x,z,[0,.035],[.012,.105],.045));for(const [j,path]of fingers.entries())for(let i=0;i<2;i++)d=Math.max(d,capsule(x,z,path[i],path[i+1],(j===3?.0115:.0135)-i*.0015));return Math.min(d,.11-z);}
    const height=(x,z)=>.002+Math.min(1,Math.max(0,field(x,z))/.008)*(.009+.003*Math.sin(x*148+z*31)+.003*Math.sin(z*112-x*19));
    const positions=[],uvs=[],indices=[],dx=.0025,dz=.0025;
    function vertex(p){positions.push(p[0],height(...p),p[1]);uvs.push((p[0]+.14)/.25,(.16-p[1])/.37);return positions.length/3-1;}
    function triangle(points){
      const clipped=[];for(let i=0;i<3;i++){const a=points[i],b=points[(i+1)%3],da=field(...a),db=field(...b);if(da>=0)clipped.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}
      if(clipped.length<3)return;const base=clipped.map(vertex);for(let i=1;i<base.length-1;i++)indices.push(base[0],base[i],base[i+1]);
    }
    for(let x=-.14;x<.115;x+=dx)for(let z=-.205;z<.16;z+=dz){triangle([[x,z],[x+dx,z],[x+dx,z+dz]]);triangle([[x,z],[x+dx,z+dz],[x,z+dz]]);}
    const s=mesh('collapsed five-finger latex glove',positions,indices,uvs,latex,g,true);
    // Weld the shared triangle edges to keep folds smoothly lit.
    s.forceSharedVertices();const normals=[];B.VertexData.ComputeNormals(s.getVerticesData(B.VertexBuffer.PositionKind),s.getIndices(),normals);s.setVerticesData(B.VertexBuffer.NormalKind,normals);
    const cuff=m.material('rolled latex cuff','#d8d9bf',.48),inside=m.material('shadow inside empty glove','#58635c',.95);
    oval('open cuff interior',.085,.011,.023,.01,.009,.105,inside,g,false);
    const cuffPath=Array.from({length:41},(_,i)=>{const a=i/40*Math.PI*2;return [.01+Math.cos(a)*.045,.012+Math.sin(a)*.011,.106+Math.sin(a)*.005];});thread('rolled glove wrist rim',cuffPath,.003,cuff,g);
    g.rotation.y=.35;
  }

  function note(g){
    const paper=surface('handwritten maintenance note',.94,(ctx,w,h)=>{ctx.fillStyle='#ded5ba';ctx.fillRect(0,0,w,h);ctx.fillStyle='#eee7d3';ctx.fillRect(4,4,w-8,h-8);ctx.fillStyle='#655f52';ctx.font='italic 23px Georgia';ctx.fillText('The smile will see',35,68);ctx.fillText('the sunrise from',30,107);ctx.fillText('the east wing storage.',35,146);ctx.font='italic 17px Georgia';ctx.fillText('- J.',274,204);ctx.strokeStyle='#b1a99266';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.49,0);ctx.lineTo(w*.51,h);ctx.stroke();},512,384);
    sheet('creased handwritten note',12,8,(u,v)=>[(u-.5)*.28,.006+Math.abs(u-.5)*.012+Math.sin(v*8)*.002,-(v-.5)*.21],paper,g);
  }

  for(const c of CLUES){
    const g=new B.TransformNode(c.id,scene);g.position.set(c.x,c.y,c.z);nodes.set(c.id,g);
    if(c.id==='footprint1')footprint(g,c);else if(c.id==='scratches')scratches(g);else if(c.id==='droplet')paint(g,c);else if(c.id==='fabric')fabric(g);else if(c.id==='keycard')keycard(g,c);else if(c.id==='glove')glove(g);else if(c.id==='note')note(g);else oval('disabled camera status LED',.025,.025,.02,.11,.02,.25,m.red,g,false);
  }
  // Hint markers are separate from physical evidence and never enter shadows,
  // reflections, collision meshes, or the line-of-sight investigation test.
  const alertTexture=tex('red evidence exclamation',128,256,(ctx,w,h)=>{ctx.font='900 238px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=12;ctx.strokeStyle='#49180f';ctx.strokeText('!',w/2,h*.53);ctx.lineWidth=7;ctx.strokeStyle='#fff1df';ctx.strokeText('!',w/2,h*.53);ctx.fillStyle='#ff352a';ctx.fillText('!',w/2,h*.53);},true);
  const alert=new B.StandardMaterial('easy clue marker',scene);alert.diffuseTexture=alertTexture;alert.emissiveTexture=alertTexture;alert.emissiveColor=B.Color3.White();alert.disableLighting=true;alert.useAlphaFromDiffuseTexture=true;alert.backFaceCulling=false;
  for(const [i,c]of CLUES.entries()){
    const marker=B.MeshBuilder.CreatePlane('easy hint '+c.id,{width:.4,height:.8},scene);marker.material=alert;marker.billboardMode=B.Mesh.BILLBOARDMODE_ALL;marker.position.set(c.x,c.y+.72,c.z+(c.id==='scratches'?.08:0));marker.isPickable=false;marker.setEnabled(false);markers.set(c.id,{mesh:marker,y:marker.position.y,phase:i*.77});
  }
  let time=0;
  return {nodes,markers,update(state,dt,{hints=true,animateHints=true}={}){
    if(animateHints)time+=dt;
    for(const c of CLUES){nodes.get(c.id).setEnabled(!state.found.includes(c.id));const marker=markers.get(c.id);marker.mesh.setEnabled(hints&&clueHintVisible(state,c.id));const pulse=animateHints?Math.sin(time*3.2+marker.phase):0;marker.mesh.position.y=marker.y+.09*pulse;marker.mesh.scaling.setAll(1+.055*pulse);}
  }};
}
