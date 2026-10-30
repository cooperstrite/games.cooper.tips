import { nimActions, scoreNimAction, giveNimFirstPlayerAChance } from "./arcade/opponent-strategies.js";

export const NIM_RULES=Object.freeze({maxTake:3,minPiles:3,maxPiles:6,minMatches:3,maxMatches:9});
export function buildNimPiles(random=Math.random){
  const integer=(min,max)=>min+Math.floor(Math.max(0,Math.min(.999999999,Number(random())||0))*(max-min+1));
  const piles=Array.from({length:integer(NIM_RULES.minPiles,NIM_RULES.maxPiles)},()=>integer(NIM_RULES.minMatches,NIM_RULES.maxMatches));
  return giveNimFirstPlayerAChance(piles,NIM_RULES.maxTake);
}
export function createNimRound({piles=buildNimPiles(),starter=0}={}){
  if(!Array.isArray(piles)||!piles.length||piles.some(n=>!Number.isSafeInteger(n)||n<0)||!piles.some(Boolean))throw new TypeError("A round needs nonnegative match counts and at least one match");
  return {piles:[...piles],turn:starter===1?1:0,winner:null,paused:false,moves:[],removed:[0,0]};
}
export function applyNimMove(state,action,actor=state.turn){
  if(state.paused||state.winner!==null||actor!==state.turn||!action)return false;
  const {pile,amount}=action;
  if(!Number.isInteger(pile)||pile<0||pile>=state.piles.length||!Number.isInteger(amount)||amount<1||amount>NIM_RULES.maxTake||amount>state.piles[pile])return false;
  state.piles[pile]-=amount;state.removed[actor]+=amount;
  state.moves.push({pile,amount,actor,remaining:state.piles[pile]});
  if(state.piles.every(n=>n===0))state.winner=actor;
  else state.turn=1-state.turn;
  return true;
}
export function chooseNimMove(state,computer){
  if(state.winner!==null||state.paused)return null;
  return computer.choose(nimActions(state.piles,NIM_RULES.maxTake),action=>scoreNimAction(state.piles,action,NIM_RULES.maxTake));
}
