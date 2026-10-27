const layers=new WeakMap(),clamp=v=>Math.max(0,Math.min(1,v));
export function dogEarPose(time,breed,index,effort=0,mood="neutral"){
  const upright=breed==="corgi"||breed==="husky",offset=index*1.37,phase=(time+offset)%6.3;
  const listen=phase<1.5?Math.sin(phase/1.5*Math.PI):0;
  const flick=phase>3.8&&phase<4.5?Math.sin((phase-3.8)/.7*Math.PI)*Math.sin((phase-3.8)*17):0;
  return {angle:Math.sin(time*1.6+offset)*.035+listen*(index?-.13:.10)+flick*.14+clamp(effort)*(upright?-.16:.18),
    fold:Math.sin(time*2.4+offset-.55)*.05+flick*.22+clamp(effort)*(upright?.25:.16)+(mood==="lose"?.38:0),
    turn:1-listen*.08,stiff:upright};
}
function specifications(breed){
  const upright=breed==="corgi"||breed==="husky",dy=breed==="corgi"?.025:0;
  if(upright)return [
    {root:[.495,.151+dy],tip:[.501,.025],weight:(x,y)=>smooth(.408,.45,x)*(1-smooth(.56,.60,x))*(1-smooth(.13+dy,.185+dy,y))},
    {root:[.637,.267+dy],tip:[.76,.055],weight:(x,y)=>smooth(.58,.65,x)*(1-smooth(.27+dy,.335+dy,y))},
  ];
  if(breed==="pitbull")return [
    {root:[.501,.095],tip:[.442,.070],weight:(x,y)=>smooth(.40,.435,x)*(1-smooth(.55,.59,x))*(1-smooth(.09,.125,y))},
    {root:[.659,.157],tip:[.775,.25],weight:(x,y)=>smooth(.61,.68,x)*smooth(.095,.14,y)*(1-smooth(.28,.34,y))},
  ];
  return [
    {root:[.508,.102],tip:[.455,.11],weight:(x,y)=>smooth(.40,.44,x)*(1-smooth(.54,.58,x))*(1-smooth(.105,.15,y))},
    {root:[.658,.151],tip:[.748,.31],weight:(x,y)=>smooth(.60,.66,x)*smooth(.085,.13,y)*(1-smooth(.305,.345,y))},
  ];
}
function smooth(a,b,v){const t=clamp((v-a)/(b-a));return t*t*(3-2*t);}
const region=[.385,0,.50,.405];
function prepare(sprite){
  if(layers.has(sprite))return layers.get(sprite);
  const size=sprite.width,[x,y,w,h]=region,image=document.createElement("canvas");image.width=Math.ceil(w*size);image.height=Math.ceil(h*size);
  image.getContext("2d").drawImage(sprite,x*size,y*size,w*size,h*size,0,0,image.width,image.height);
  layers.set(sprite,image);return image;
}
function triangle(c,image,a,b,d,A,B,D){
  const det=(b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y),u=((B.x-A.x)*(d.y-a.y)-(D.x-A.x)*(b.y-a.y))/det,v=((B.y-A.y)*(d.y-a.y)-(D.y-A.y)*(b.y-a.y))/det,w=((D.x-A.x)*(b.x-a.x)-(B.x-A.x)*(d.x-a.x))/det,z=((D.y-A.y)*(b.x-a.x)-(B.y-A.y)*(d.x-a.x))/det;
  const cx=(A.x+B.x+D.x)/3,cy=(A.y+B.y+D.y)/3,points=[A,B,D].map(p=>{const dx=p.x-cx,dy=p.y-cy,n=Math.max(.001,Math.hypot(dx,dy));return{x:p.x+dx/n*.0012,y:p.y+dy/n*.0012};});
  c.save();c.beginPath();c.moveTo(points[0].x,points[0].y);c.lineTo(points[1].x,points[1].y);c.lineTo(points[2].x,points[2].y);c.closePath();c.clip();c.transform(u,v,w,z,A.x-u*a.x-w*a.y,A.y-v*a.x-z*a.y);c.drawImage(image,0,0);c.restore();
}
export function drawDogEars(c,pet,sprite,animation){
  const image=prepare(sprite),[x,y,w,h]=region,ears=specifications(pet.breed).map((spec,index)=>({...spec,pose:dogEarPose(animation.time||0,pet.breed,index,animation.effort||0,animation.mood)}));
  // A continuous skin mesh moves the complete ear silhouette and blends into
  // its fixed root. No cutout seam can expose the old ear or a hole in the head.
  c.save();c.beginPath();c.rect(0,0,1,1);c.rect(x,y,w,h);c.clip("evenodd");c.drawImage(sprite,0,0,1,1);c.restore();
  const point=(u,v)=>{
    const px=x+u*w,py=y+v*h;let ox=0,oy=0;
    for(const {root:[rx,ry],tip:[tx,ty],weight,pose} of ears){
      const dx=tx-rx,dy=ty-ry,t=clamp(((px-rx)*dx+(py-ry)*dy)/(dx*dx+dy*dy)),a=pose.angle*t+pose.fold*t*t,xx=(px-rx)*(1+(pose.turn-1)*t),yy=py-ry,blend=weight(px,py);
      ox+=(rx+xx*Math.cos(a)-yy*Math.sin(a)-px)*blend;
      oy+=(ry+xx*Math.sin(a)+yy*Math.cos(a)+pose.fold*t*t*(pose.stiff?.035:.012)-py)*blend;
    }
    return{x:px+ox,y:py+oy};
  };
  const cols=16,rows=16,src=[],dst=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){src.push({x:col/cols*image.width,y:row/rows*image.height});dst.push(point(col/cols,row/rows));}
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const a=row*(cols+1)+col,b=a+1,d=a+cols+1,e=d+1;
    triangle(c,image,src[a],src[b],src[e],dst[a],dst[b],dst[e]);triangle(c,image,src[a],src[e],src[d],dst[a],dst[e],dst[d]);
  }
  // The mesh boundary is stationary. Cover its antialiased clip edges with the
  // original pixels, including the shoulder that crosses the left boundary.
  const edge=.003,size=sprite.width;
  for(const [xx,yy,ww,hh] of [[x-edge,0,edge*2,h],[x+w-edge,0,edge*2,h],[x-edge,h-edge,w+edge*2,edge*2]])c.drawImage(sprite,xx*size,yy*size,ww*size,hh*size,xx,yy,ww,hh);
}
