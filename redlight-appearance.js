import { CharacterBuilder } from "./arcade/characters.js";

export const RUNNER_STORAGE_KEY = "cooper-redlight-runner-v1";
export const RUNNER_OPTIONS = Object.freeze({
  runner: { sprinter: "Sprint kit", tracksuit: "Track suit", trail: "Trail runner" },
  build: { lean: "Lean", athletic: "Athletic", strong: "Broad" },
  hair: { short: "Short", bob: "Bob", ponytail: "Ponytail", braids: "Braids", curls: "Curls", bun: "Bun", bald: "Bald" },
  facialHair: { none: "None", stubble: "Stubble", mustache: "Mustache", goatee: "Goatee", beard: "Beard" },
  headwear: { none: "None", headband: "Headband", cap: "Running cap" },
  eyewear: { none: "None", glasses: "Clear glasses", sunglasses: "Sport sunglasses" },
  wristwear: { none: "None", watch: "Sports watch", bands: "Sweatbands" },
});
export const RUNNER_COLOR_LABELS = Object.freeze({
  skin: "Skin color", hair: "Hair color", eyes: "Eye color", facialHair: "Facial hair color",
  body: "Top color", bottoms: "Shorts / trousers color", shoes: "Shoe color", accessory: "Trim & accessories color", headwear: "Headwear color",
});
export const DEFAULT_RUNNER = Object.freeze({
  runner: "sprinter", build: "athletic", hair: "short", facialHair: "none", headwear: "headband", eyewear: "none", wristwear: "watch",
  colors: Object.freeze({ skin: "#c58c65", hair: "#352a24", eyes: "#5b3928", facialHair: "#352a24", body: "#38baa1", bottoms: "#263d4d", shoes: "#f3dfab", accessory: "#f6cf65", headwear: "#f6cf65" }),
});
export function readRunnerAppearance(value) {
  const input = value && typeof value === "object" ? value : {}, next = {};
  for (const [slot, choices] of Object.entries(RUNNER_OPTIONS)) next[slot] = Object.hasOwn(choices, input[slot]) ? input[slot] : DEFAULT_RUNNER[slot];
  next.colors = Object.fromEntries(Object.entries(DEFAULT_RUNNER.colors).map(([slot, fallback]) => [slot, typeof input.colors?.[slot] === "string" && /^#[0-9a-f]{6}$/i.test(input.colors[slot]) ? input.colors[slot].toLowerCase() : fallback]));
  return next;
}
export function runnerCharacter(appearance) {
  const look = readRunnerAppearance(appearance), builder = new CharacterBuilder("redlight", look.runner).withColors(look.colors);
  for (const slot of Object.keys(RUNNER_OPTIONS).filter(key => key !== "runner")) builder.withFeature(slot, look[slot]);
  return builder.build();
}
export function loadRunnerAppearance(storage) {
  try { return readRunnerAppearance(JSON.parse((storage || globalThis.localStorage).getItem(RUNNER_STORAGE_KEY))); } catch { return readRunnerAppearance(); }
}
export function saveRunnerAppearance(appearance, storage) {
  try { (storage || globalThis.localStorage).setItem(RUNNER_STORAGE_KEY, JSON.stringify(readRunnerAppearance(appearance))); return true; } catch { return false; }
}

// Forward is -Z. Keep elbows bent and each arm opposite its matching leg.
function runnerArm(side, broad, swing, striding) {
  const angle=striding?-side*swing*.65:.08,flex=striding?1.3-side*swing*.14:.18;
  const shoulder=[side*19*broad,107,0];
  const elbow=[side*25*broad,107-Math.cos(angle)*26,-Math.sin(angle)*26];
  const hand=[side*24*broad,elbow[1]-Math.cos(angle+flex)*23,elbow[2]-Math.sin(angle+flex)*23];
  return {shoulder,elbow,hand};
}

// Original 2D artwork, shared by the race and character studio. Feet sit at y=0.
export function drawRunner(context, appearance, { x = 0, y = 0, scale = 1, stride = 0, running = false, view = "front" } = {}) {
  const a = appearance, c = a.colors, ctx = context;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const broad = a.build === "strong" ? 1.16 : a.build === "lean" ? .88 : 1;
  const phase = stride, swing = running || stride ? Math.sin(phase) : 0;
  const bob = running ? -Math.abs(Math.cos(phase)) * 3 : 0;
  ctx.translate(0, bob);
  function ellipse(x, y, rx, ry, color, angle = 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); ctx.fill(); }
  function line(points, width, color) { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; points.forEach(([px,py],i) => i ? ctx.lineTo(px,py) : ctx.moveTo(px,py)); ctx.stroke(); }
  const long = a.runner === "tracksuit", shorts = a.runner === "trail" ? 29 : 24;
  for (const side of [-1,1]) {
    // Lift alternate legs within their own lanes in this front-facing view.
    const lift = Math.max(0, side * swing), hipX = side * 8 * broad;
    const kneeX = side * (10 * broad + lift * 2), kneeY = -32 - lift * 5;
    const footX = side * (13 * broad + lift * 2), footY = -7 - lift * 18;
    line([[hipX,-57],[kneeX,kneeY],[footX,footY]],long ? 13 : 10,long ? c.bottoms : c.skin);
    if (!long) {
      const hem = shorts / 31;
      line([[hipX,-60],[hipX+(kneeX-hipX)*hem,-60+(kneeY+60)*hem]],16,c.bottoms);
    }
    line([[footX,footY-4],[footX,footY+1]],11,"#f1eee1");
    ellipse(footX+side*3,footY+3,12,6,c.shoes); line([[footX-side*6,footY+7],[footX+side*13,footY+7]],3,"#e8eced");
    line([[footX-side,footY],[footX+side*6,footY+1]],2,c.accessory);
  }
  const top = ctx.createLinearGradient(-20,-112,20,-55); top.addColorStop(0,c.body); top.addColorStop(1,c.body); ctx.fillStyle=top;
  ctx.beginPath(); ctx.moveTo(-17*broad,-112);ctx.quadraticCurveTo(0,-121,17*broad,-112);ctx.lineTo(20*broad,-61);ctx.quadraticCurveTo(0,-53,-20*broad,-61);ctx.closePath();ctx.fill();
  line([[-15*broad,-106],[-13*broad,-65]],3,c.accessory); line([[15*broad,-106],[13*broad,-65]],3,c.accessory);
  if(view === "front" && a.runner === "tracksuit") line([[0,-112],[0,-60]],2,c.accessory);
  if(a.runner === "trail") { line([[-11,-111],[-13,-66]],6,c.bottoms);line([[11,-111],[13,-66]],6,c.bottoms);line([[-12,-92],[12,-92]],3,c.accessory); }
  else if(view === "front") { ctx.fillStyle="#f4f4ec";ctx.fillRect(-9,-91,18,16);ctx.fillStyle="#253747";ctx.font="bold 11px sans-serif";ctx.textAlign="center";ctx.fillText("01",0,-79); }
  else line([[-12*broad,-105],[0,-101],[12*broad,-105]],2,c.accessory);
  for(const side of [-1,1]) {
    const {shoulder,elbow,hand}=runnerArm(side,broad,swing,running||stride!==0),front=p=>[p[0],-p[1]];
    line([shoulder,elbow,hand].map(front),long ? 11 : 9,long ? c.body : c.skin);
    if(!long && a.runner !== "sprinter") line([front(shoulder),front(shoulder.map((n,i)=>n+(elbow[i]-n)*.4))],14,c.body);
    ellipse(hand[0],-hand[1],5.5,7,c.skin);
    if(a.wristwear === "bands" || (a.wristwear === "watch" && side === -1)) line([.72,.88].map(t=>front(elbow.map((n,i)=>n+(hand[i]-n)*t))),a.wristwear === "watch" ? 8 : 10,c.accessory);
  }
  line([[0,-113],[0,-126]],12,c.skin);
  if(view === "back") {
    if(a.runner === "trail") {
      ctx.fillStyle=c.bottoms;ctx.beginPath();ctx.roundRect(-14,-110,28,43,9);ctx.fill();
      line([[-9,-82],[9,-82]],2,c.accessory);line([[0,-105],[0,-92]],3,c.accessory);
    }
    ellipse(-19,-139,4,7,c.skin);ellipse(19,-139,4,7,c.skin);ellipse(0,-144,20,25,c.skin);
    if(a.hair !== "bald") {
      ctx.fillStyle=c.hair;ctx.beginPath();ctx.moveTo(-18,-131);ctx.quadraticCurveTo(-26,-167,0,-170);ctx.quadraticCurveTo(26,-167,18,-131);ctx.quadraticCurveTo(0,-121,-18,-131);ctx.fill();
      if(a.hair === "bob") {ellipse(-12,-133,10,22,c.hair,-.1);ellipse(12,-133,10,22,c.hair,.1);}
      if(a.hair === "curls")for(let i=0;i<15;i++){const a=i/15*Math.PI*2;ellipse(Math.cos(a)*16,-147+Math.sin(a)*20,6,7,c.hair);}
    }
    if(a.headwear === "headband")line([[-19,-148],[0,-145],[19,-148]],6,c.headwear);
    if(a.headwear === "cap") {
      ctx.fillStyle=c.headwear;ctx.beginPath();ctx.ellipse(0,-149,22,22,0,Math.PI,Math.PI*2);ctx.fill();
      line([[-19,-149],[-8,-146]],5,c.headwear);line([[8,-146],[19,-149]],5,c.headwear);
      line([[-6,-148],[6,-148]],3,c.accessory);
    }
    const hairSway=running?Math.sin(phase)*3:0;
    if(a.hair === "ponytail") {ellipse(hairSway,-128,9,27,c.hair,-hairSway*.04);line([[-6,-148],[6,-148]],3,c.accessory);}
    if(a.hair === "bun")ellipse(0,-156,11,10,c.hair);
    if(a.hair === "braids")for(const side of [-1,1])for(let i=0;i<9;i++)ellipse(side*16+hairSway*i/9,-140+i*4,4,3,c.hair);
    if(a.eyewear !== "none")for(const side of [-1,1])line([[side*19,-145],[side*21,-139]],2,c.accessory);
    ctx.restore();return;
  }
  if(["bob","braids","ponytail"].includes(a.hair)) {
    if(a.hair === "ponytail") ellipse(19,-132,9,26,c.hair,-.2);
    else for(const side of [-1,1]) ellipse(side*16,-131,7,22,c.hair,side*-.08);
  }
  ellipse(-19,-139,4,7,c.skin);ellipse(19,-139,4,7,c.skin);
  ellipse(0,-142,20,26,c.skin);ellipse(0,-125,13,11,c.skin);
  if(a.hair !== "bald") {
    ctx.fillStyle=c.hair;ctx.beginPath();ctx.moveTo(-20,-140);ctx.quadraticCurveTo(-27,-177,9,-169);ctx.quadraticCurveTo(27,-169,20,-141);ctx.lineTo(14,-156);ctx.quadraticCurveTo(0,-151,-14,-158);ctx.closePath();ctx.fill();
    if(a.hair === "curls") for(let i=0;i<9;i++) ellipse(-19+i*4.7,-159-Math.sin(i/8*Math.PI)*9,6,7,c.hair);
    if(a.hair === "bun") ellipse(3,-173,10,9,c.hair);
    if(a.hair === "braids") for(const side of [-1,1]) for(let i=0;i<6;i++) ellipse(side*18,-140+i*4,4,3,c.hair);
  }
  for(const side of [-1,1]) {
    ellipse(side*8,-142,4.5,5.5,"#fff9ec");ellipse(side*7.7,-141,2.6,3.6,c.eyes);ellipse(side*7.5,-141,1.3,2,"#17272e");ellipse(side*7-1,-143,1,1,"#ffffff");
    line([[side*4,-151],[side*12,-152]],2.4,c.hair);
  }
  line([[0,-140],[2,-134],[-1,-133]],1.5,"#855b49");
  ctx.strokeStyle="#714a3e";ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,-133,7,.35,Math.PI-.35);ctx.stroke();
  if(a.facialHair !== "none") {
    if(a.facialHair === "mustache") { ellipse(-4,-130,5,2.7,c.facialHair,.2);ellipse(4,-130,5,2.7,c.facialHair,-.2); }
    else if(a.facialHair === "stubble") { ctx.globalAlpha=.45;for(let i=0;i<21;i++)ellipse(-12+(i%7)*4,-127+Math.floor(i/7)*3,1,1,c.facialHair);ctx.globalAlpha=1; }
    else line(a.facialHair === "goatee" ? [[-5,-123],[0,-119],[5,-123]] : [[-16,-133],[-11,-123],[0,-119],[11,-123],[16,-133]],6,c.facialHair);
  }
  if(a.eyewear !== "none") {
    for(const side of [-1,1]) { if(a.eyewear === "sunglasses")ellipse(side*9,-142,7,5,"#203949");ctx.strokeStyle=c.accessory;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(side*9,-142,7,5,0,0,Math.PI*2);ctx.stroke(); }line([[-2,-143],[2,-143]],2,c.accessory);
  }
  if(a.headwear === "headband") line([[-18,-155],[0,-156],[18,-155]],6,c.headwear);
  if(a.headwear === "cap") { ctx.fillStyle=c.headwear;ctx.beginPath();ctx.ellipse(0,-158,22,17,0,Math.PI,Math.PI*2);ctx.fill();ellipse(5,-158,28,4,c.headwear);line([[-17,-161],[15,-161]],2,c.accessory); }
  ctx.restore();
}

// An elevated, orthographic cartoon pose. Size stays constant along the track.
export function drawRunnerOverhead(context, appearance, {x=0,y=0,scale=1,stride=0,running=false}={}) {
  const ctx=context,a=appearance,c=a.colors,broad=a.build==="strong"?1.16:a.build==="lean"?.88:1;
  const striding=running||stride!==0,swing=striding?Math.sin(stride):0,long=a.runner==="tracksuit";
  const project=p=>[p[0],p[2]*.94-p[1]*.34];
  const mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  function ellipse(x,y,rx,ry,color,angle=0){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fill();}
  function line(points,width,color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();}
  function limb(points,width,color){line(points,width+2,"#30453d70");line(points,width,color);}
  // A small offset shadow makes the foreshortened limbs readable from above.
  ellipse(5,-12,27*broad,33,"#332d3438",-.15);
  for(const side of [-1,1]) {
    const angle=striding?side*swing*.75:0,bend=striding?-.15-Math.max(0,-side*swing)*1.05:0;
    const hip=[side*8*broad,57,0],knee=[side*10*broad,57-Math.cos(angle)*25,-Math.sin(angle)*25];
    const ankle=[side*13*broad,knee[1]-Math.cos(angle+bend)*25,knee[2]-Math.sin(angle+bend)*25];
    limb([hip,knee,ankle].map(project),long?13:10,long?c.bottoms:c.skin);
    if(!long)line([hip,mix(hip,knee,a.runner==="trail"?.95:.72)].map(project),16,c.bottoms);
    const foot=project(ankle);ellipse(foot[0],foot[1]-4,7,12,c.shoes,side*-.06);
    line([[foot[0]-5,foot[1]+4],[foot[0]+5,foot[1]+4]],2,"#e8eced");
    line([[foot[0]-3,foot[1]-4],[foot[0]+3,foot[1]-4]],2,c.accessory);
  }
  for(const side of [-1,1]) {
    const {shoulder,elbow,hand}=runnerArm(side,broad,swing,striding);
    limb([shoulder,elbow,hand].map(project),long?11:9,long?c.body:c.skin);
    if(!long&&a.runner==="trail")line([shoulder,mix(shoulder,elbow,.4)].map(project),14,c.body);
    const palm=project(hand);ellipse(palm[0],palm[1],5.5,6.5,c.skin);
    ctx.strokeStyle="#30453d70";ctx.lineWidth=1;ctx.stroke();
    if(a.wristwear==="bands"||(a.wristwear==="watch"&&side===-1))line([mix(elbow,hand,.72),mix(elbow,hand,.88)].map(project),8,c.accessory);
  }
  ctx.fillStyle=c.body;ctx.beginPath();ctx.moveTo(-17*broad,-18);ctx.quadraticCurveTo(-23*broad,-36,-18*broad,-43);ctx.quadraticCurveTo(0,-53,18*broad,-43);ctx.quadraticCurveTo(23*broad,-36,17*broad,-18);ctx.quadraticCurveTo(0,-12,-17*broad,-18);ctx.fill();
  line([[-15*broad,-39],[-13*broad,-20]],3,c.accessory);line([[15*broad,-39],[13*broad,-20]],3,c.accessory);
  if(a.runner==="trail") {
    ctx.fillStyle=c.bottoms;ctx.beginPath();ctx.roundRect(-13,-44,26,27,8);ctx.fill();
    line([[-8,-25],[8,-25]],2,c.accessory);line([[0,-40],[0,-32]],2,c.accessory);
  } else line([[-10*broad,-39],[0,-36],[10*broad,-39]],2,c.accessory);
  const hy=-52;
  ellipse(-19,hy+2,4,6,c.skin);ellipse(19,hy+2,4,6,c.skin);ellipse(0,hy-21,4,6,c.skin);
  ellipse(0,hy,19,23,c.skin);
  if(a.hair!=="bald") {
    ellipse(0,hy+1,a.hair==="bob"?21:19,a.hair==="bob"?27:22,c.hair);
    if(a.hair==="curls")for(let i=0;i<15;i++){const angle=i/15*Math.PI*2;ellipse(Math.cos(angle)*16,hy+Math.sin(angle)*19,6,7,c.hair);}
    else {ctx.globalAlpha=.12;line([[-9,hy-13],[-12,hy],[-8,hy+14]],2,"#ffffff");ctx.globalAlpha=1;}
  }
  if(a.headwear==="headband") {
    ctx.strokeStyle=c.headwear;ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,hy,20,21,0,Math.PI*1.06,Math.PI*1.94);ctx.stroke();
  }
  if(a.headwear==="cap") {
    ellipse(0,hy-21,22,10,c.headwear);ellipse(0,hy,20,23,c.headwear);
    line([[0,hy-19],[0,hy+17]],1.5,c.accessory);ellipse(0,hy,2.5,2.5,c.accessory);
  }
  const sway=striding?Math.sin(stride)*3:0;
  if(a.hair==="ponytail"){ellipse(sway,hy+26,8,19,c.hair,-sway*.04);line([[-5,hy+13],[5,hy+13]],3,c.accessory);}
  if(a.hair==="bun")ellipse(0,hy+13,10,9,c.hair);
  if(a.hair==="braids")for(const side of [-1,1])for(let i=0;i<7;i++)ellipse(side*17+sway*i/7,hy+9+i*4,4,3,c.hair);
  if(a.eyewear!=="none")for(const side of [-1,1])line([[side*18,hy-7],[side*15,hy-19]],2,c.accessory);
  ctx.restore();
}
export function drawRunnerPreview(canvas, appearance, focus = "body") {
  const ratio = Math.min(globalThis.devicePixelRatio || 1, 2), w=360, h=420;
  canvas.width=w*ratio;canvas.height=h*ratio;
  const ctx=canvas.getContext("2d");ctx.setTransform(ratio,0,0,ratio,0,0);
  const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,"#e1f2ef");sky.addColorStop(1,"#b8d5c8");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#a8c6bc";ctx.lineWidth=1;for(let i=-3;i<10;i++){ctx.beginPath();ctx.moveTo(180+i*65,290);ctx.lineTo(180+i*130,420);ctx.stroke();}ctx.beginPath();ctx.moveTo(0,350);ctx.lineTo(360,350);ctx.stroke();
  if(focus !== "face"){ctx.fillStyle="#58766c33";ctx.beginPath();ctx.ellipse(180,368,65,11,0,0,Math.PI*2);ctx.fill();}
  drawRunner(ctx,appearance,{x:180,y:focus === "face" ? 980 : 366,scale:focus === "face" ? 5.2 : 1.7});
}
