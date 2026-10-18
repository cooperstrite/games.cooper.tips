// Adapt the shared head without changing the archer asset or its fitted gear.
export function runnerHeadGeometry(asset) {
  const positions=Array.from(asset.positions),indices=Array.from(asset.indices),uvs=Array.from(asset.uvs);
  const welded=new Map(),vertexIds=[],edges=new Map();
  for(let i=0;i<positions.length;i+=3) {
    const x=positions[i],y=positions[i+1],z=positions[i+2];
    const key=[x,y,z].map(v=>Math.round(v*1e5)).join(":");
    if(!welded.has(key))welded.set(key,i/3);vertexIds.push(welded.get(key));
    const jaw=Math.max(0,1-Math.abs(y-1.868)/.045),cheek=Math.max(0,1-Math.abs(y-1.928)/.025);
    positions[i]*=1-jaw*.055+cheek*.025;
    if(z<-.11) {
      positions[i+1]+=jaw*.004;
      positions[i+2]+=Math.max(0,1-Math.abs(y-1.985)/.016)*.0035;
    }
  }
  for(let i=0;i<asset.indices.length;i+=3)for(let j=0;j<3;j++) {
    const a=vertexIds[asset.indices[i+j]],b=vertexIds[asset.indices[i+(j+1)%3]],key=a<b?`${a}:${b}`:`${b}:${a}`;
    const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});
  }
  // Continue the original, uneven neck boundary into a smooth collar ring.
  const collar=new Map();
  function base(id) {
    if(collar.has(id))return collar.get(id);
    const angle=Math.atan2(positions[id*3],positions[id*3+2]+.038),index=positions.length/3;
    positions.push(Math.sin(angle)*.059,1.735,-.032+Math.cos(angle)*.061);
    uvs.push(asset.uvs[id*2],0);collar.set(id,index);return index;
  }
  for(const {a,b,count} of edges.values())if(count===1&&Math.max(positions[a*3+1],positions[b*3+1])<1.84) {
    const ca=base(a),cb=base(b);indices.push(b,a,ca,b,ca,cb);
  }
  return {positions,indices,uvs};
}
