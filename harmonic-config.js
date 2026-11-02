// Instruments change the sound and artwork, never the timing or memory rules.
export const ECHO_INSTRUMENTS = Object.freeze([
  { id:'marimba', name:'Marimba', note:'C4', frequency:261.6256, color:'#e9b99c', description:'Warm wooden notes' },
  { id:'harp', name:'Harp', note:'D4', frequency:293.6648, color:'#e7ce91', description:'Soft plucked strings' },
  { id:'bell', name:'Chime', note:'E4', frequency:329.6276, color:'#c9b8ef', description:'A rounded bell tone' },
  { id:'piano', name:'Piano', note:'G4', frequency:391.9954, color:'#9fcfe1', description:'Mellow felted keys' },
  { id:'kalimba', name:'Kalimba', note:'A4', frequency:440, color:'#e6b1c2', description:'Bright metal tines' },
  { id:'glass', name:'Glass', note:'C5', frequency:523.2511, color:'#b9dba1', description:'Airy crystal resonance' },
  { id:'strings', name:'Strings', note:'D5', frequency:587.3295, color:'#dfbd8e', description:'A gentle bowed voice' },
  { id:'guitar', name:'Guitar', note:'C4', frequency:261.6256, color:'#e8bd84', description:'Warm nylon strings', cost:320 },
  { id:'handpan', name:'Handpan', note:'E4', frequency:329.6276, color:'#97cfd0', description:'Soft hammered steel', cost:480 },
  { id:'musicbox', name:'Music box', note:'A4', frequency:440, color:'#e7aecb', description:'Delicate clockwork chimes', cost:680 },
  { id:'celesta', name:'Celesta', note:'C5', frequency:523.2511, color:'#bfbbee', description:'Velvety bell-like keys', cost:900 },
].map(Object.freeze));
export const ECHO_DEFAULT_LINEUP = Object.freeze(ECHO_INSTRUMENTS.filter(i=>!i.cost).map(i=>i.id));
export const ECHO_ITEMS = Object.freeze(ECHO_INSTRUMENTS.filter(i=>i.cost).map(i=>Object.freeze({
  id:`harmonic:${i.id}`,name:i.name,cost:i.cost,kind:'harmonic',games:['harmonic'],category:'instruments',value:i.id,
  description:`${i.description}. Includes its own instrument artwork and voice. Arrange it in your Harmonic Echo studio; difficulty and rewards stay the same.`,
})));
export const ECHO_ROUND_LIMITS = Object.freeze({min:3,max:30});
export const ECHO_COIN_RATES = Object.freeze({easy:1,normal:2,hard:3});
export const ECHO_WARDROBE_KEY = 'cooper-harmonic-instruments-v1';

export function ownedEchoInstruments(owned=[]){
  return ECHO_INSTRUMENTS.filter(i=>!i.cost||(Array.isArray(owned)&&owned.includes(`harmonic:${i.id}`)));
}
export function normalizeEchoLineup(value,owned=[]){
  const allowed=new Set(ownedEchoInstruments(owned).map(i=>i.id)),used=new Set();
  return ECHO_DEFAULT_LINEUP.map((fallback,index)=>{
    let id=Array.isArray(value)?value[index]:null;
    if(!allowed.has(id)||used.has(id))id=!used.has(fallback)?fallback:ECHO_DEFAULT_LINEUP.find(key=>!used.has(key));
    used.add(id);return id;
  });
}
export function swapEchoInstrument(lineup,slot,id,owned=[]){
  const next=normalizeEchoLineup(lineup,owned);
  if(!Number.isInteger(slot)||slot<0||slot>=7||!ownedEchoInstruments(owned).some(i=>i.id===id))return next;
  const previous=next.indexOf(id);if(previous>=0)next[previous]=next[slot];next[slot]=id;return next;
}
export function readEchoSettings(owned=[],storage){
  let value;try{value=JSON.parse((storage||globalThis.localStorage)?.getItem(ECHO_WARDROBE_KEY));}catch{}
  return {lineup:normalizeEchoLineup(value?.lineup,owned)};
}
export function writeEchoSettings(settings,storage){
  try{(storage||globalThis.localStorage).setItem(ECHO_WARDROBE_KEY,JSON.stringify({lineup:settings.lineup}));return true;}catch{return false;}
}
export function echoRewardTotal({mode,target,completed,phase}={}){
  if(!Object.hasOwn(ECHO_COIN_RATES,mode)||!Number.isInteger(target)||target<3||target>30||!Number.isInteger(completed)||completed<0||completed>target)return 0;
  if(phase==='won'&&completed===target)return completed*ECHO_COIN_RATES[mode]*2;
  if(phase==='lost'&&completed<target)return completed*ECHO_COIN_RATES[mode];
  return 0;
}
export function echoCoinGuide(mode,target){
  const rate=ECHO_COIN_RATES[mode]||1;
  return `${rate} ${rate===1?'coin':'coins'} per completed round + ${target*rate} for finishing all ${target}. Full run: ${target*rate*2} coins. Banked when you win or miss. Replays and abandoned runs earn nothing.`;
}
