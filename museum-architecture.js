// Windows are solid glazed parts of the existing walls, not new map exits.
export const WINDOWS = [
  { id:'entrance-north-window', wall:'side-12-south', x:12, z:7, width:1.8, bottom:1.25, top:5, angle:-Math.PI/2 },
  { id:'entrance-south-window', wall:'side-12-south', x:12, z:12.2, width:1.8, bottom:1.25, top:5, angle:-Math.PI/2 },
  { id:'gallery-west-window', wall:'gallery-back', x:-9.5, z:-12, width:1.65, bottom:1.25, top:5, angle:0 },
  { id:'gallery-east-window', wall:'gallery-back', x:9.5, z:-12, width:1.65, bottom:1.25, top:5, angle:0 },
];
export const SKYLIGHT={room:'gallery',x:6.5,z:-6.3,w:3,d:2.4};
export function ceilingPanels(room){
  if(room.id!==SKYLIGHT.room)return [{x:room.x,z:room.z,w:room.w,d:room.d}];
  const s=SKYLIGHT,left=room.x-room.w/2,right=room.x+room.w/2,back=room.z-room.d/2,front=room.z+room.d/2;
  return [
    {x:(left+s.x-s.w/2)/2,z:room.z,w:s.x-s.w/2-left,d:room.d},
    {x:(right+s.x+s.w/2)/2,z:room.z,w:right-s.x-s.w/2,d:room.d},
    {x:s.x,z:(back+s.z-s.d/2)/2,w:s.w,d:s.z-s.d/2-back},
    {x:s.x,z:(front+s.z+s.d/2)/2,w:s.w,d:front-s.z-s.d/2},
  ];
}

export function wallPanels(wall) {
  const horizontal=wall.w>wall.d, axis=horizontal?'x':'z', span=horizontal?'w':'d';
  const windows=WINDOWS.filter(w=>w.wall===wall.id).sort((a,b)=>a[axis]-b[axis]);
  if(!windows.length)return [{...wall}];
  const parts=[],lo=wall[axis]-wall[span]/2,hi=wall[axis]+wall[span]/2;
  function part(a,b,bottom,top){if(b-a<.001||top-bottom<.001)return;parts.push({...wall,id:wall.id+'-panel-'+parts.length,[axis]:(a+b)/2,[span]:b-a,y:(bottom+top)/2,h:top-bottom});}
  let edge=lo;
  for(const window of windows){const a=window[axis]-window.width/2,b=window[axis]+window.width/2;part(edge,a,0,wall.h);part(a,b,0,window.bottom);part(a,b,window.top,wall.h);edge=b;}
  part(edge,hi,0,wall.h);
  return parts;
}

export function wallTrim(wall) {
  if(wall.h<3)return [];
  const alongX=wall.w>wall.d,length=alongX?wall.w:wall.d,parts=[];
  const part=(id,w,h,d,x,y,z,material)=>parts.push({id:wall.id+'-'+id,w,h,d,x,y,z,material});
  part('wainscot',wall.w+(alongX?0:.035),1.05,wall.d+(alongX?.035:0),wall.x,.54,wall.z,'wood');
  for(const [y,h,extra]of [[.12,.16,.1],[1.08,.07,.1],[5.52,.14,.16],[5.7,.14,.24]]){
    part('moulding-'+y,wall.w+(alongX?0:extra),h,wall.d+(alongX?extra:0),wall.x,y,wall.z,y>2?'plaster':'wood');
  }
  for(let n=-length/2+.22;n<length/2-.2;n+=1.3){
    // A stile's depth is the wall thickness on BOTH wall orientations.
    part('stile-'+n,alongX?.035:wall.w+.055,.8,alongX?wall.d+.055:.035,alongX?wall.x+n:wall.x,.56,alongX?wall.z:wall.z+n,'wood');
  }
  return parts;
}

// Continuous joined moulding prevents wall-colored gaps between frame rails.
export function pictureFrameGeometry(width,height) {
  const profile=[[0,.045],[.018,.08],[.045,.08],[.06,.055],[.085,.11],[.11,.14],[.15,.14],[.18,.095],[.22,.075],[.22,-.065],[0,-.065]];
  const positions=[],indices=[],uvs=[];
  const ring=([pad,z])=>[[-width/2-pad,-height/2-pad,z],[width/2+pad,-height/2-pad,z],[width/2+pad,height/2+pad,z],[-width/2-pad,height/2+pad,z]];
  for(let j=0;j<profile.length;j++){
    const a=ring(profile[j]),b=ring(profile[(j+1)%profile.length]);
    // Match Babylon's generated mesh winding so the joined ornaments and
    // bevels keep the same front-face orientation in the right-handed scene.
    for(let i=0;i<4;i++){const next=(i+1)%4,start=positions.length/3;positions.push(...a[i],...a[next],...b[next],...b[i]);uvs.push(0,0,1,0,1,1,0,1);indices.push(start,start+1,start+2,start,start+2,start+3);}
  }
  return {positions,indices,uvs};
}
