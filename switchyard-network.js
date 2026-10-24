export const TRAIN_COLORS = ["#eb7056", "#399dc3", "#e6ac43", "#8c79cc", "#39a78a"];
export const LEVELS = Object.freeze([
  { id:"meadow", name:"Meadow Branch", label:"Learn the switches", map:"branch", theme:"meadow", trains:1, speed:8, goal:8, seconds:180, mistakes:5, tip:"Send Train A to its named stop. Change Junction 1 before its next trip; boarding trains wait for your Go command." },
  { id:"seaside", name:"Seaside Shuttle", label:"Share the railway", map:"shuttle", theme:"coast", trains:2, speed:8.8, goal:16, seconds:210, mistakes:4, tip:"Two trains share the line. Start them separately, and use red signals to hold a train before a junction." },
  { id:"riverside", name:"River Junction", label:"Watch the crossings", map:"district", theme:"river", trains:3, speed:9.2, goal:24, seconds:240, mistakes:3, tip:"Four junctions and crossing tracks. The gold route belongs to your selected train. Keep crossings clear before sending another train." },
  { id:"alpine", name:"Alpine Express", label:"Fast and slow services", map:"district", theme:"alpine", trains:3, speed:10.5, goal:32, seconds:250, mistakes:3, tip:"The blue express moves faster. Leave room behind slower trains and stop early at shared tracks." },
  { id:"city", name:"Town Square", label:"Four busy platforms", map:"district", theme:"town", trains:4, speed:11.2, goal:40, seconds:270, mistakes:3, tip:"Every platform is busy. A delivered train needs time to board and another Go command before it leaves." },
  { id:"festival", name:"Festival Rush", label:"The grand timetable", map:"district", theme:"festival", trains:5, speed:12, goal:48, seconds:300, mistakes:3, tip:"Five services, faster trains, and crowded approaches. Pause to plan, set red signals, then dispatch a few trains at a time." },
]);
const STOPS = {
  N:{name:"Pine Park",short:"PARK",color:"#3b9675",icon:"P"},
  E:{name:"Sunset Harbor",short:"HARBOR",color:"#377eae",icon:"H"},
  S:{name:"Sunny Market",short:"MARKET",color:"#d79238",icon:"M"},
  W:{name:"Maple Village",short:"VILLAGE",color:"#b66c8d",icon:"V"},
};
const cubic=(p,a,b,q,t)=>{
  const u=1-t;
  return {x:u*u*u*p[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t*t*t*q[0],y:u*u*u*p[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t*t*t*q[1]};
};
function makeEdge(id,from,to,points) {
  const samples=[];let length=0,previous;
  for(let segment=0;segment<(points.length-1)/3;segment++)for(let i=segment?1:0;i<=48;i++){
    const p=cubic(...points.slice(segment*3,segment*3+4),i/48);
    if(previous)length+=Math.hypot(p.x-previous.x,p.y-previous.y);
    samples.push({...p,d:length});previous=p;
  }
  return {id,from,to,points,samples,length};
}
export function pointOnEdge(edge,distance) {
  const d=Math.max(0,Math.min(edge.length,distance));let low=0,high=edge.samples.length-1;
  while(high-low>1){const mid=(low+high)>>1;if(edge.samples[mid].d<d)low=mid;else high=mid;}
  const a=edge.samples[low],b=edge.samples[high],t=(d-a.d)/Math.max(.00001,b.d-a.d),dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,dx:dx/l,dy:dy/l,angle:Math.atan2(dy,dx)};
}
export function createNetwork(levelIndex=0) {
  const level=LEVELS[levelIndex]||LEVELS[0],nodes={},edges={};
  const node=(id,x,y,heading,kind="junction")=>nodes[id]={id,x,y,heading,kind,out:[],...(kind==="station"?STOPS[id]:{})};
  const edge=(id,from,to,controls)=>{
    const a=nodes[from],b=nodes[to];edges[id]=makeEdge(id,from,to,[[a.x,a.y],...controls,[b.x,b.y]]);a.out.push(id);
  };
  if(level.map==="branch"){
    node("D",18,35,[1,0],"depot");node("J1",40,35,[1,0]);node("N",79,19,[1,0],"station");node("S",79,51,[1,0],"station");
    edge("D-J1","D","J1",[[25,35],[32,35]]);
    edge("J1-N","J1","N",[[56,35],[62,19]]);edge("J1-S","J1","S",[[56,35],[62,51]]);
    edge("N-D","N","D",[[96,19],[96,7],[77,7],[53,7],[7,7],[7,25],[7,32],[11,35]]);
    edge("S-D","S","D",[[97,51],[94,63],[76,63],[48,63],[7,64],[7,46],[7,39],[11,35]]);
  }else if(level.map==="shuttle"){
    node("W",15,34,[1,0],"station");node("J1",32,34,[1,0]);node("N",68,12,[1,0],"station");node("J2",86,32,[0,1]);node("S",68,56,[-1,0],"station");
    edge("W-J1","W","J1",[[21,34],[26,34]]);
    edge("J1-N","J1","N",[[49,34],[48,12]]);edge("J1-S","J1","S",[[59,34],[95,56]]);
    edge("N-J2","N","J2",[[83,12],[86,19]]);
    edge("J2-S","J2","S",[[86,49],[82,56]]);edge("J2-W","J2","W",[[86,48],[-8,34]]);
    edge("S-W","S","W",[[47,56],[3,56],[3,44],[3,38],[8,34]]);
  }else{
    const shift=level.theme==="alpine"?-3:level.theme==="town"?3:0;
    node("J1",26,18+shift,[1,0]);node("J2",75,20,[0,1]);node("J3",74,50-shift,[-1,0]);node("J4",25,48,[0,-1]);
    node("N",50,9,[1,0],"station");node("E",87,34,[0,1],"station");node("S",50,59,[-1,0],"station");node("W",13,34,[0,-1],"station");
    edge("W-J1","W","J1",[[13,21],[16,18+shift]]);edge("N-J2","N","J2",[[65,9],[75,10]]);
    edge("E-J3","E","J3",[[87,47],[84,50-shift]]);edge("S-J4","S","J4",[[34,59],[25,59]]);
    edge("J1-N","J1","N",[[37,18+shift],[38,9]]);edge("J1-S","J1","S",[[61,18+shift],[88,59]]);
    edge("J2-E","J2","E",[[75,28],[87,25]]);edge("J2-W","J2","W",[[75,55],[13,68]]);
    edge("J3-S","J3","S",[[62,50-shift],[62,59]]);edge("J3-N","J3","N",[[39,50-shift],[12,9]]);
    edge("J4-W","J4","W",[[25,40],[13,43]]);edge("J4-E","J4","E",[[25,13],[87,0]]);
  }
  const junctions=Object.values(nodes).filter(n=>n.kind==="junction"),stations=Object.values(nodes).filter(n=>n.kind==="station");
  const starts=level.map==="branch"?[{edge:"D-J1",distance:8}]:level.map==="shuttle"?[{edge:"W-J1",distance:8},{edge:"N-J2",distance:8}]:[
    {edge:"W-J1",distance:12},{edge:"N-J2",distance:10},{edge:"E-J3",distance:10},{edge:"S-J4",distance:10},{edge:"W-J1",distance:1},
  ];
  const network={nodes,edges,junctions,stations,starts,width:100,height:70,level:levelIndex};
  network.crossings=findCrossings(network);
  network.scenery=makeScenery(network,level.theme);
  return network;
}
function findCrossings(network){
  const result=[],list=Object.values(network.edges);
  for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++){
    if([list[a].from,list[a].to].some(id=>id===list[b].from||id===list[b].to))continue;
    for(let i=1;i<list[a].samples.length;i++)for(let j=1;j<list[b].samples.length;j++){
      const p=list[a].samples[i-1],q=list[a].samples[i],r=list[b].samples[j-1],s=list[b].samples[j],dx=q.x-p.x,dy=q.y-p.y,ex=s.x-r.x,ey=s.y-r.y,det=dx*ey-dy*ex;
      if(Math.abs(det)<1e-8)continue;const t=((r.x-p.x)*ey-(r.y-p.y)*ex)/det,u=((r.x-p.x)*dy-(r.y-p.y)*dx)/det;
      if(t>=0&&t<=1&&u>=0&&u<=1){const point={x:p.x+t*dx,y:p.y+t*dy,edges:[list[a].id,list[b].id]};if(!result.some(c=>Math.hypot(c.x-point.x,c.y-point.y)<2))result.push(point);}
    }
  }return result;
}
function makeScenery(network,theme){
  let seed=924+network.level*19;const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),all=Object.values(network.edges).flatMap(e=>e.samples),items=[];
  for(let attempt=0;attempt<220&&items.length<38;attempt++){
    const x=4+rng()*92,y=4+rng()*62;
    if(all.some(p=>Math.hypot(x-p.x,y-p.y)<4)||network.stations.some(p=>Math.hypot(x-p.x,y-p.y)<8))continue;
    items.push({x,y,size:.8+rng()*.7,kind:theme==="town"&&items.length%3===0?"house":theme==="alpine"?"pine":"tree",variant:items.length%3});
  }return items;
}
export function firstStops(network,from){
  const found=[],queue=[from],seen=new Set();
  while(queue.length){const id=queue.shift();if(seen.has(id))continue;seen.add(id);const n=network.nodes[id];
    if(n.kind==="station"){found.push(id);continue;}for(const edge of n.out)queue.push(network.edges[edge].to);
  }return found;
}
export function nextJunction(network,train){
  let edge=network.edges[train.edge],distance=edge.length-train.distance;
  const seen=new Set();
  while(!seen.has(edge.id)){
    seen.add(edge.id);const node=network.nodes[edge.to];if(node.kind==="junction")return {node,distance};
    if(node.kind==="station")return null;
    if(!node.out.length)return null;edge=network.edges[node.out[0]];distance+=edge.length;
  }return null;
}
