export const OCEAN = Object.freeze({ width: 2800, height: 3600, surface: 90, radius: 36, hullRadius: 29, hullOffset: 43 });
export const DIVE_LEVELS = Object.freeze({
  easy: { name: 'Easy', description: 'Gentler currents, wider scan range, and 12 discoveries.', current: .5, damage: .5, drain: .07, scan: 1, range: 125, counts: { coral: 3, sample: 2, plankton: 2, fish: 4, treasure: 1 } },
  medium: { name: 'Medium', description: 'The full 20-site expedition, with currents and hazards.', current: 1, damage: 1, drain: .14, scan: 1.5, range: 108, counts: { coral: 5, sample: 4, plankton: 3, fish: 6, treasure: 2 } },
  hard: { name: 'Hard', description: '29 discoveries, stronger currents, and careful resource management.', current: 1.35, damage: 1.4, drain: .23, scan: 2, range: 92, counts: { coral: 7, sample: 6, plankton: 5, fish: 8, treasure: 3 } },
});
export const SURVEYS = Object.freeze({
  coral: { name: 'Coral habitats', action: 'Survey coral', color: '#ffa68d', short: 'Coral', report: 'Coral habitat mapped. The living reef stays undisturbed.' },
  sample: { name: 'Mineral samples', action: 'Collect sample', color: '#e8c887', short: 'Minerals', report: 'Mineral sample secured in the research locker.' },
  plankton: { name: 'Plankton study', action: 'Scan plankton', color: '#b1e7ab', short: 'Plankton', report: 'Plankton scan recorded. A tiny world, full of life.' },
  fish: { name: 'Marine life', action: 'Photograph wildlife', color: '#9edce8', short: 'Wildlife', report: 'Wildlife photographed. No animals are collected.' },
  treasure: { name: 'Lost artifacts', action: 'Recover artifact', color: '#c2b4f5', short: 'Artifacts', report: 'A lost artifact recovered for the expedition collection.' },
});
export const ZONES = Object.freeze([
  { name: 'Coastal waters', start: 90, end: 420, depth: 0, limit: 50, color: '#4fbea9' },
  { name: 'Sunlight reef', start: 420, end: 1100, depth: 50, limit: 200, color: '#228f99' },
  { name: 'Twilight passage', start: 1100, end: 1900, depth: 200, limit: 1000, color: '#235976' },
  { name: 'Midnight vents', start: 1900, end: 2800, depth: 1000, limit: 4000, color: '#273d61' },
  { name: 'Abyssal garden', start: 2800, end: 3564, depth: 4000, limit: 6000, color: '#2e3153' },
]);
export const STATIONS = Object.freeze([
  { id: 0, name: 'Research ship', x: 1400, y: 160 },
  { id: 1, name: 'Reef station', x: 950, y: 820 },
  { id: 2, name: 'Twilight station', x: 1800, y: 1580 },
  { id: 3, name: 'Vent station', x: 950, y: 2380 },
  { id: 4, name: 'Abyss station', x: 1600, y: 3190 },
]);
const sites = {
  coral: [[1190,370],[1830,620],[680,580],[1150,960],[2190,850],[520,970],[1990,1090]],
  sample: [[740,1040],[1840,1350],[2200,1860],[1430,2140],[590,2560],[2160,2870]],
  plankton: [[1580,280],[850,380],[2120,470],[570,340],[1590,890]],
  fish: [[1760,430],[980,620],[2250,1030],[490,1280],[1460,1450],[2040,1700],[500,1800],[1380,1920]],
  treasure: [[2100,2520],[620,3210],[2050,3370]],
};
export function oceanRandom(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
export function zoneAt(y) { return ZONES.find(zone => y < zone.end) || ZONES.at(-1); }
export function oceanDepth(y) { const zone = zoneAt(y), t = Math.max(0, Math.min(1, (y - zone.start) / (zone.end - zone.start))); return Math.round(zone.depth + t * (zone.limit - zone.depth)); }
export function makeOcean(seed = 7831, difficulty = 'medium') {
  const random = oceanRandom(seed), settings = DIVE_LEVELS[difficulty] || DIVE_LEVELS.medium;
  const items = Object.entries(sites).flatMap(([type, positions]) => positions.slice(0, settings.counts[type]).map(([x, y], i) => ({ id: `${type}-${i}`, type, x, y, phase: random() * 6.28, done: false, revealed: false })));
  const keepClear = [...Object.values(sites).flat().map(([x,y]) => ({x,y})), ...STATIONS];
  const wreck = { kind:'wreck', x:590, y:1460, rx:240, ry:150,
    points:[[-210,-25],[-70,-25],[-70,-76],[40,-76],[40,-25],[150,-25],[200,-50],[165,42],[-170,42]].map(([x,y])=>({x:590+x*Math.cos(.17)-y*Math.sin(.17),y:1460+x*Math.sin(.17)+y*Math.cos(.17)})) };
  const rocks = [wreck];
  // Separate rocks and leave a continuous central route. No collectible is buried in scenery.
  for (let attempt = 0; attempt < 1000 && rocks.length < 35; attempt++) {
    const x = 100 + random() * 2600, y = 450 + random() * 2980, rx = 55 + random() * 100, ry = 36 + random() * 70, radius = Math.max(rx, ry);
    if (Math.abs(x - 1400) < radius + 155 || keepClear.some(p => Math.hypot(p.x-x,p.y-y) < radius+185) || rocks.some(r => Math.hypot(r.x-x,r.y-y) < radius+Math.max(r.rx,r.ry)+100)) continue;
    const points = Array.from({length:10},(_,i) => { const a=i/10*Math.PI*2, scale=.86+random()*.14;return {x:x+Math.cos(a)*rx*scale,y:y+Math.sin(a)*ry*scale}; });
    rocks.push({x,y,rx,ry,points,seed:Math.floor(random()*100000)});
  }
  const hazards = [];
  for (let i = 0; i < (difficulty === 'easy' ? 7 : difficulty === 'hard' ? 16 : 11); i++) {
    for (let attempt=0;attempt<100;attempt++) {
      const x=260+random()*2280,y=650+random()*2640;
      if(keepClear.some(p=>Math.hypot(x-p.x,y-p.y)<220)||rocks.some(r=>Math.hypot(x-r.x,y-r.y)<Math.max(r.rx,r.ry)+100))continue;
      hazards.push({x,y,type:y>2150&&i%2===0?'vent':'jelly',phase:random()*6.28});break;
    }
  }
  return {seed,items,rocks,hazards,stations:STATIONS,currents:[
    {x:260,y:1050,w:2280,h:270,vx:42,vy:4}, {x:500,y:2050,w:1900,h:300,vx:-52,vy:11}, {x:200,y:2980,w:2400,h:240,vx:36,vy:-8},
  ]};
}
export function sitePosition(item,time) {
  return item.type === 'fish' ? {x:item.x+Math.sin(time*.45+item.phase)*25,y:item.y+Math.sin(time*.7+item.phase)*13} : {x:item.x,y:item.y};
}
export function hazardPosition(hazard,time) {
  return {x:hazard.x+Math.sin(time*.35+hazard.phase)*(hazard.type==='jelly'?35:0),y:hazard.y+Math.sin(time*.7+hazard.phase)*(hazard.type==='jelly'?32:0)};
}
export function rockContact(rock,x,y,radius=OCEAN.radius) {
  let inside=false,best=Infinity,nearest,edge;
  for(let i=0,j=rock.points.length-1;i<rock.points.length;j=i++) {
    const a=rock.points[j],b=rock.points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
    const q={x:a.x+dx*t,y:a.y+dy*t},d=Math.hypot(x-q.x,y-q.y);
    if(d<best){best=d;nearest=q;edge={dx,dy};}
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  if(!inside&&best>=radius)return null;
  if(best<1e-8){const length=Math.hypot(edge.dx,edge.dy)||1;return {nx:edge.dy/length,ny:-edge.dx/length,penetration:radius};}
  const sign=inside?-1:1,dx=(x-nearest.x)*sign,dy=(y-nearest.y)*sign,length=Math.hypot(dx,dy)||1;
  return {nx:dx/length,ny:dy/length,penetration:inside?radius+best:radius-best};
}
export function safeOceanPoint(world,x,y,radius=OCEAN.radius) {
  return x>=radius&&x<=OCEAN.width-radius&&y>=OCEAN.surface&&y<=OCEAN.height-radius&&!world.rocks.some(rock=>rockContact(rock,x,y,radius));
}
