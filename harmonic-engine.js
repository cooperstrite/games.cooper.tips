import { ECHO_DEFAULT_LINEUP, ECHO_ITEMS, ECHO_ROUND_LIMITS, normalizeEchoLineup } from './harmonic-config.js';
export { ECHO_INSTRUMENTS } from './harmonic-config.js';
export const ECHO_MODES = Object.freeze({
  easy:{name:'Easy',voices:3,target:12,beat:.86,noteLength:.49,description:'Three instruments. A little more room between notes.'},
  normal:{name:'Normal',voices:4,target:20,beat:.70,noteLength:.44,description:'Four instruments, with an even, unhurried pulse.'},
  hard:{name:'Hard',voices:5,target:15,beat:.57,noteLength:.36,description:'Five instruments and a quicker phrase. Win to add bonus voices.'},
});
const validMode=mode=>Object.hasOwn(ECHO_MODES,mode)?mode:'normal';
const integer=(n,max)=>Number.isFinite(Number(n))?Math.max(0,Math.min(max,Math.floor(Number(n)))):0;
export const echoTarget=(value,mode='normal')=>Number.isInteger(value)&&value>=ECHO_ROUND_LIMITS.min&&value<=ECHO_ROUND_LIMITS.max?value:ECHO_MODES[validMode(mode)].target;

export function readEchoProgress(value){
  let source;try{source=typeof value==='string'?JSON.parse(value):value;}catch{}
  source=source&&typeof source==='object'?source:{};
  const best={},wins={},targets={},bestByTarget={};
  for(const [mode,config] of Object.entries(ECHO_MODES)){
    best[mode]=integer(source.best?.[mode],30);wins[mode]=integer(source.wins?.[mode],100000);targets[mode]=echoTarget(source.targets?.[mode],mode);bestByTarget[mode]={};
    for(let target=3;target<=30;target++)bestByTarget[mode][target]=integer(source.bestByTarget?.[mode]?.[target],target);
    // Preserve records from the original fixed-length games.
    if(!source.bestByTarget?.[mode])bestByTarget[mode][config.target]=Math.min(config.target,best[mode]);
  }
  return {mode:validMode(source.mode),sound:source.sound!==false,volume:Number.isFinite(source.volume)?Math.max(0,Math.min(1,source.volume)):.65,best,bestByTarget,targets,wins,unlocked:Math.min(2,wins.hard)};
}
export function createEcho({mode='normal',unlocked=0,target,targets,lineup=ECHO_DEFAULT_LINEUP,random=Math.random}={}){
  mode=validMode(mode);
  // Ownership is checked by the UI/config boundary. The rules accept any valid
  // ensemble, with exactly the same voice count and timing for every instrument.
  lineup=normalizeEchoLineup(lineup,ECHO_ITEMS.map(i=>i.id));
  return {mode,target:echoTarget(target??targets?.[mode],mode),lineup,voices:ECHO_MODES[mode].voices+(mode==='hard'?integer(unlocked,2):0),sequence:[],input:0,completed:0,phase:'idle',phaseTime:0,playIndex:0,paused:false,lastNote:null,lastCorrect:null,mistake:null,events:[],recorded:false,random:typeof random==='function'?random:Math.random};
}
function enter(state,phase){state.phase=phase;state.phaseTime=0;}
function append(state){const n=Number(state.random());const index=Math.max(0,Math.min(state.voices-1,Math.floor((Number.isFinite(n)?n:0)*state.voices)));state.sequence.push(state.lineup[index]);state.input=0;state.playIndex=0;state.lastNote=null;state.lastCorrect=null;}
export function startEcho(state){
  if(!['idle','won','lost'].includes(state.phase))return false;
  state.sequence=[];state.input=0;state.completed=0;state.mistake=null;state.paused=false;state.recorded=false;state.events=[];append(state);enter(state,'ready');return true;
}
export function pressEcho(state,id){
  if(state.phase!=='input'||state.paused||!state.lineup.slice(0,state.voices).includes(id))return {accepted:false};
  const expected=state.sequence[state.input];state.lastNote=id;
  if(id!==expected){state.mistake={index:state.input,expected,played:id};enter(state,'lost');return {accepted:true,correct:false,finished:true};}
  state.input++;state.lastCorrect=id;
  if(state.input===state.sequence.length){state.completed=state.sequence.length;enter(state,state.completed>=state.target?'won':'between');return {accepted:true,correct:true,finished:state.phase==='won',roundComplete:true};}
  return {accepted:true,correct:true,roundComplete:false};
}
export function stepEcho(state,delta){
  state.events=[];
  if(state.paused||!['ready','listen','between','review'].includes(state.phase)||!Number.isFinite(delta)||delta<=0)return state.events;
  // Long stalls do not bunch a whole phrase into one frame.
  state.phaseTime+=Math.min(.12,delta);
  if(state.phase==='ready'&&state.phaseTime>=.9){enter(state,'listen');state.events.push({type:'listen'});}
  else if(state.phase==='between'&&state.phaseTime>=.95){append(state);enter(state,'ready');state.events.push({type:'round'});}
  if(state.phase==='listen'||state.phase==='review'){
    const {beat,noteLength}=ECHO_MODES[state.mode];
    if(state.playIndex<state.sequence.length&&state.phaseTime>=state.playIndex*beat){
      const index=state.playIndex++,id=state.sequence[index];state.lastNote=id;state.events.push({type:'note',id,index,duration:noteLength});
    }
    // The last note gets its full beat and a small breath before input opens.
    if(state.playIndex===state.sequence.length&&state.phaseTime>=state.sequence.length*beat+.24){
      if(state.phase==='review')enter(state,state.mistake?'lost':'won');
      else{state.input=0;enter(state,'input');state.events.push({type:'input'});}
      state.lastNote=null;
    }
  }
  return state.events;
}
export function pauseEcho(state){
  if(state.paused||!['ready','listen','input','between','review'].includes(state.phase))return false;
  state.paused=true;return true;
}
export function resumeEcho(state){
  if(!state.paused)return false;state.paused=false;
  if(state.phase==='between'){state.phaseTime=0;return true;}
  if(state.phase==='review'){state.playIndex=0;state.phaseTime=0;state.lastNote=null;return true;}
  state.input=0;state.playIndex=0;state.lastCorrect=null;state.lastNote=null;enter(state,'ready');return true;
}
export function reviewEcho(state){
  if(!['lost','won'].includes(state.phase)||!state.sequence.length)return false;
  state.paused=false;state.playIndex=0;state.lastNote=null;enter(state,'review');return true;
}
export function recordEcho(progress,state){
  const next=readEchoProgress(progress);next.best[state.mode]=Math.max(next.best[state.mode],state.completed);
  next.bestByTarget[state.mode][state.target]=Math.max(next.bestByTarget[state.mode][state.target]||0,state.completed);
  if(state.phase==='won'&&!state.recorded){next.wins[state.mode]++;next.unlocked=Math.min(2,next.wins.hard);state.recorded=true;}
  return next;
}
