// Measurements belong to each source image, not to a generic cat/dog silhouette.
// Coordinates use the full, uncropped image so all previews share the same fit.
import { endingRig } from "./cats-dogs-ending-poses.js";
const cat=(near,far,nose,hat,neck)=>({cat:true,eyes:[[...near,-.12,"cat"],[...far,-.24,"oval"]],nose,hat,neck,mouth:[nose[0]-.013,nose[1]+.028,.032,.012,-.08]});
const dog=(near,far,nose,hat,neck,mouth)=>({cat:false,eyes:[[...near,.12,"dog"],[...far,.4,"oval"]],nose,hat,neck,mouth});
export const PET_RIGS=Object.freeze({
  tabby:cat([.437,.231,.038,.020],[.535,.207,.0125,.024],[.523,.249,.016,.011],[.418,.137,.25],[.373,.394]),
  siamese:cat([.437,.232,.038,.020],[.535,.208,.0125,.024],[.523,.250,.016,.011],[.419,.135,.25],[.373,.394]),
  "siamese:flame":cat([.437,.231,.038,.020],[.535,.208,.0125,.024],[.523,.251,.016,.011],[.421,.135,.25],[.374,.394]),
  calico:cat([.437,.230,.038,.020],[.535,.207,.0125,.024],[.523,.250,.016,.011],[.418,.136,.25],[.372,.395]),
  british:cat([.439,.240,.038,.020],[.539,.217,.0125,.024],[.527,.258,.016,.011],[.424,.142,.25],[.373,.404]),
  mainecoon:cat([.455,.239,.036,.019],[.548,.214,.014,.024],[.536,.258,.016,.011],[.425,.146,.25],[.389,.402]),
  golden:dog([.545,.175,.022,.021],[.478,.144,.011,.020],[.412,.186,.028,.021],[.550,.092,.26],[.559,.340],[.474,.254,.062,.015,-.39]),
  labrador:dog([.545,.174,.022,.021],[.478,.143,.011,.020],[.412,.184,.028,.021],[.552,.092,.26],[.560,.341],[.474,.254,.062,.015,-.39]),
  "labrador:yellow":dog([.545,.174,.022,.021],[.478,.143,.011,.020],[.412,.184,.028,.021],[.552,.092,.26],[.560,.341],[.474,.254,.062,.015,-.39]),
  "labrador:white":dog([.545,.174,.022,.021],[.478,.143,.011,.020],[.412,.184,.028,.021],[.552,.092,.26],[.560,.341],[.474,.254,.062,.015,-.39]),
  "labrador:black":dog([.545,.174,.022,.021],[.478,.143,.011,.020],[.412,.184,.028,.021],[.552,.092,.26],[.560,.341],[.474,.254,.062,.015,-.39]),
  pitbull:dog([.553,.177,.023,.022],[.476,.145,.012,.021],[.420,.185,.030,.022],[.548,.104,.25],[.565,.350],[.488,.269,.073,.019,-.32]),
  corgi:dog([.561,.225,.024,.023],[.487,.192,.0115,.020],[.421,.232,.029,.023],[.551,.151,.24],[.563,.397],[.479,.307,.064,.017,-.36]),
  husky:dog([.546,.210,.024,.023],[.478,.177,.0115,.020],[.412,.219,.029,.023],[.537,.139,.24],[.559,.384],[.474,.293,.064,.017,-.38]),
});
export function petRig(pet){const source=PET_RIGS[pet.breed+":"+pet.coat]||PET_RIGS[pet.breed]||PET_RIGS.tabby;return pet.pose?endingRig(pet,source):source;}
export function tracePetEye(c,eye,scale=1){
  const[x,y,rx,ry,angle,shape]=eye;c.save();c.translate(x*scale,y*scale);c.rotate(angle);c.scale(rx*scale,ry*scale);c.beginPath();
  if(shape==="oval")c.ellipse(0,0,1,1,0,0,Math.PI*2);
  else if(shape==="cat"){c.moveTo(-1,.35);c.bezierCurveTo(-1.05,-.45,.25,-1.4,.82,-.65);c.bezierCurveTo(1,-.2,1,.55,.92,.73);c.bezierCurveTo(.3,.95,-.8,1,-1,.35);c.closePath();}
  else{c.moveTo(-1,.6);c.bezierCurveTo(-1.05,0,-.55,-1.12,.15,-1);c.bezierCurveTo(.75,-.98,1.1,0,.95,.82);c.bezierCurveTo(.35,1.05,-.55,1.05,-1,.6);c.closePath();}c.restore();
}
export function tracePetNose(c,rig,scale=1){
  const[x,y,rx,ry]=rig.nose;c.save();c.translate(x*scale,y*scale);c.scale(rx*scale,ry*scale);c.beginPath();
  if(rig.cat){c.moveTo(-1,-.2);c.bezierCurveTo(-.8,-.9,.6,-1,1,-.3);c.bezierCurveTo(1,.2,.7,.85,.55,1);c.bezierCurveTo(.3,.2,-.7,.5,-1,-.2);}
  else{c.moveTo(-.95,-.4);c.bezierCurveTo(-.8,-1.1,.3,-1,1,-.45);c.bezierCurveTo(1.2,.2,.3,.55,-.12,1);c.bezierCurveTo(-.7,1,-1.05,.2,-.95,-.4);}c.closePath();c.restore();
}
export function tracePetMouth(c,rig,scale=1){
  if(rig.pose){const[x,y,rx,ry]=rig.mouth;c.beginPath();c.ellipse(x*scale,y*scale,rx*scale,ry*scale,0,0,Math.PI*2);return;}
  const[x,y,rx,ry]=rig.mouth;c.save();c.translate((x-.474*rx/.062)*scale,(y-.254)*scale);c.scale(rx/.062*scale,scale);c.beginPath();
  c.moveTo(.431,.247);c.bezierCurveTo(.452,.260,.499,.251,.540,.224);c.bezierCurveTo(.538,.248,.480,.283,.443,.277);c.bezierCurveTo(.420,.276,.416,.266,.431,.247);c.closePath();c.restore();
}
