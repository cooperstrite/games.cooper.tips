import { drawTugPet } from "./cats-dogs-pet-art.js";

export const TUG_ENDING_SECONDS=5.2;
export function tugPresentation(state){
  const winner=["cats","dogs"].includes(state.winner)?state.winner:null;
  if(!winner)return {kind:"draw",winner:null,featured:null,loser:null};
  const lost=state.mode==="ai"&&winner!==state.team;
  return {kind:lost?"lose":"win",winner,featured:winner,loser:winner==="cats"?"dogs":"cats"};
}
const ease=t=>{t=Math.max(0,Math.min(1,t));return 1-Math.pow(1-t,3);};
let trophy=null,trophyReady=null;
export function prepareTugEnding(){
  trophyReady ||= new Promise(resolve=>{const image=new Image();image.onload=()=>{trophy=image;resolve(true);};image.onerror=()=>resolve(false);image.src="assets/cats-dogs-champion-cup.png";});return trophyReady;
}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function cup(c,x,y,size,age){
  if(trophy){c.drawImage(trophy,x-size*.85,y-size*.72,size*1.7,size*1.7);return;}
  c.save();c.translate(x,y);c.scale(size/120,size/120);
  const gold=c.createLinearGradient(-60,0,60,0);[[0,"#7c4d1e"],[.18,"#c18a35"],[.38,"#fff0a2"],[.55,"#e0b44c"],[.76,"#a46b24"],[.9,"#ffeb95"],[1,"#9d6523"]].forEach(([t,color])=>gold.addColorStop(t,color));
  c.strokeStyle="#755124";c.lineWidth=15;c.beginPath();c.moveTo(-40,-39);c.bezierCurveTo(-98,-57,-76,21,-27,14);c.moveTo(40,-39);c.bezierCurveTo(98,-57,76,21,27,14);c.stroke();c.strokeStyle=gold;c.lineWidth=10;c.stroke();
  c.fillStyle=gold;c.beginPath();c.moveTo(-49,-55);c.bezierCurveTo(-47,-8,-38,15,-10,24);c.lineTo(-7,50);c.quadraticCurveTo(-22,52,-32,59);c.lineTo(32,59);c.quadraticCurveTo(22,52,7,50);c.lineTo(10,24);c.bezierCurveTo(38,15,47,-8,49,-55);c.closePath();c.fill();
  ellipse(c,0,-54,49,8,"#ffeb9a");ellipse(c,0,-54,42,4,"#956c2d");
  c.fillStyle="#3a4e40";c.beginPath();c.roundRect(-44,59,88,22,4);c.fill();c.fillStyle=gold;c.fillRect(-25,64,50,12);
  c.fillStyle="#8d5d28";ellipse(c,0,-10,13,11,"#9b6929");for(const [xx,yy] of [[-15,-25],[-5,-31],[7,-30],[17,-22]])ellipse(c,xx,yy,5,7,"#9b6929");
  const shine=(Math.sin(age*2)+1)*.15;c.fillStyle=`rgba(255,255,230,${shine})`;c.beginPath();c.moveTo(-34,-44);c.lineTo(-23,-44);c.lineTo(-13,15);c.lineTo(-22,11);c.closePath();c.fill();c.restore();
}
export function drawTugEnding(c,state,wardrobe,age,reducedMotion,poses){
  const result=tugPresentation(state),win=result.kind==="win",lost=result.kind==="lose",t=reducedMotion?TUG_ENDING_SECONDS:age;
  const reveal=reducedMotion?1:ease(t/.65);c.save();c.globalAlpha=reveal;
  const wash=c.createLinearGradient(0,0,0,675);wash.addColorStop(0,lost?"#172c3fe8":"#203d31cf");wash.addColorStop(.7,lost?"#17313ba8":"#20452c59");wash.addColorStop(1,"#102a2cbd");c.fillStyle=wash;c.fillRect(0,0,1200,675);
  const glow=c.createRadialGradient(570,390,40,570,390,500);glow.addColorStop(0,lost?"#bad1d630":"#ffe0a34a");glow.addColorStop(1,"#fff7bf00");c.fillStyle=glow;c.fillRect(0,0,1200,675);
  if(win){
    c.save();c.translate(570,345);c.rotate(reducedMotion?0:t*.025);c.fillStyle="#ffecac0b";for(let i=0;i<12;i++){c.rotate(Math.PI/6);c.beginPath();c.moveTo(0,0);c.lineTo(700,-45);c.lineTo(700,45);c.closePath();c.fill();}c.restore();
  }
  c.textAlign="center";c.fillStyle=lost?"#bdd1d5":"#f3d7a0";c.font="600 16px system-ui";c.letterSpacing="4px";c.fillText(win?"THE PAW PULL CHAMPION":lost?"YOU LOST THIS MATCH":"NECK AND NECK",600,65);c.letterSpacing="0px";
  c.fillStyle="#fff8e5";c.font="bold 52px Georgia";
  const title=result.winner?`${wardrobe[result.winner].name} wins!`:"An even match.";c.fillText(title,600,125,1060);
  c.fillStyle="#e2e7d5";c.font="19px system-ui";c.fillText(lost?`${wardrobe[state.team].name} will be ready for a rematch. The comeback starts here.`:win?state.mode==="ai"?"You outpulled the computer. The cup is yours!":"One park. One champion. Well played, both teams.":"Three rounds, two determined pets. Ready for a rematch?",600,163,1060);
  if(result.featured){
    const side=result.winner,pet=poses[side].win,runnerUp=poses[result.loser].sad,entrance=ease((t-.12)/.9);
    // The seated runner-up is farther away and drawn first in every mode.
    ellipse(c,925,530,99,14,"#102d3855");c.save();c.translate(915,532);const breath=reducedMotion?1:1+Math.sin(t*2.2)*.004;c.scale(.73,.73*breath);drawTugPet(c,runnerUp,{time:t,energy:100,reducedMotion,mood:"lose"});c.restore();
    c.fillStyle="#d9e3da";c.font="16px system-ui";c.fillText(wardrobe[result.loser].name+" / next time",925,559,340);
    const hop=reducedMotion?0:t>1&&t<3.1?Math.abs(Math.sin((t-1)*Math.PI*2))*18*(1-(t-1)/2.4):0;
    ellipse(c,455,618,143,20,"#17362966");c.save();c.translate(440-40*(1-entrance),620-hop);c.scale(1.1,1.1);drawTugPet(c,pet,{time:t,energy:100,reducedMotion,mood:"win"});c.restore();
    const rise=ease((t-.75)/.8);c.save();c.globalAlpha*=rise;ellipse(c,697,602,65,11,"#17362955");cup(c,697,481+(1-rise)*100,113,t);c.restore();
    c.fillStyle="#f4dfb1";c.font="600 15px system-ui";c.fillText("PAW PULL CUP",697,628);
  }else for(const [side,x] of [["cats",350],["dogs",850]]){c.save();c.translate(x,605);c.scale(.86,.86);drawTugPet(c,poses[side].win,{time:t,reducedMotion});c.restore();}
  if(win&&!reducedMotion&&t>.75){
    const colors=["#f6d17c",result.winner==="cats"?"#ef9577":"#7cc6cf","#ffefcf","#8fbb8b"];
    for(let i=0;i<100;i++){
      const a=Math.max(0,t-.75-(i%12)*.035),x=600+Math.sin(i*2.4)*a*(85+i%8*13),y=280-a*(220+i%7*17)+a*a*85;
      if(y>675||!a||y<180&&x>220&&x<980)continue;c.save();c.translate(x+Math.sin(a*3+i)*13,y);c.rotate(a*(i%2?1:-1)*3+i);c.fillStyle=colors[i%4];c.globalAlpha=reveal*Math.min(1,a*3);c.fillRect(-3,-5,6,10);c.restore();
    }
  }
  c.restore();return result;
}
