import { ECHO_INSTRUMENTS, ECHO_DEFAULT_LINEUP, ownedEchoInstruments, normalizeEchoLineup, swapEchoInstrument, readEchoSettings, writeEchoSettings } from './harmonic-config.js';
import { readEchoProgress } from './harmonic-engine.js';
import { createEchoAudio } from './harmonic-audio.js';
import { echoInstrumentArt } from './harmonic-art.js';
import { getArcadeWallet } from './arcade/wallet.js';

const SOUND_KEY='cooper-harmonic-echo-v2';
const instrument=id=>ECHO_INSTRUMENTS.find(i=>i.id===id);
function readSound(){try{return readEchoProgress(localStorage.getItem(SOUND_KEY));}catch{return readEchoProgress();}}

export function createHarmonicCustomizer(root){
  const wallet=getArcadeWallet(),sound=readSound(),audio=createEchoAudio({enabled:sound.sound,volume:sound.volume}),abort=new AbortController();
  let owned=wallet.getState().owned,settings=readEchoSettings(owned),slot=0,selected=settings.lineup[0],disposed=false,timer,auditionRevision=0;
  const wrapper=document.createElement('section');wrapper.className='he-game he-customizer';wrapper.setAttribute('aria-label','Harmonic Echo instrument customization');
  wrapper.innerHTML=`<header class="he-custom-header"><div><p class="he-eyebrow">YOUR INSTRUMENT COLLECTION</p><h3>Build your ensemble.</h3><p>Choose a pad, preview a voice, then assign it. Each pad keeps its pitch and keyboard number. Your arrangement appears in every new game.</p></div><a href="#store/harmonic">Shop instruments &rarr;</a></header>
    <div class="he-custom-workspace"><div class="he-custom-preview"><p class="he-eyebrow">SOUND CHECK / <span class="he-custom-pitch"></span></p><div class="he-custom-art"></div><h4 class="he-custom-name"></h4><p class="he-custom-description"></p><div class="he-custom-actions"><button type="button" data-action="audition">Play a note</button><button type="button" data-action="assign" class="he-primary">Assign to pad 1</button></div><p class="he-custom-lock"></p></div>
    <div class="he-lineup"><div><p class="he-eyebrow">YOUR SEVEN PADS</p><p>The first 3 play on Easy; the first 4 on Normal. Hard uses 5, then 6 after one Hard win and 7 after two.</p></div><div class="he-slot-list" role="group" aria-label="Choose a pad to customize"></div><button type="button" data-action="reset">Restore the original ensemble</button></div></div>
    <div class="he-custom-bar"><p class="he-custom-status" role="status">Changes save automatically in this browser.</p><div class="he-audio-controls"><button type="button" data-action="sound">Sound on</button><label>Volume <output></output><input type="range" aria-label="Instrument preview volume" min="0" max="100"></label></div></div>
    <section class="he-collection"><div class="he-collection-heading"><h4>Choose your sound.</h4><span>7 included instruments + 4 shop voices</span></div><div class="he-instrument-choices" role="group" aria-label="Instrument collection"></div><p>Owned instruments can be used in any pad. Assigning an instrument already in your lineup swaps the two pads. Shop voices change the artwork and sound; they do not change timing, difficulty, or coins.</p></section>`;
  root.append(wrapper);const $=selector=>wrapper.querySelector(selector),on=(node,event,fn)=>node.addEventListener(event,fn,{signal:abort.signal});
  function silence(){auditionRevision++;audio.stop();clearTimeout(timer);$('.he-custom-art').classList.remove('is-playing');}
  function render(){
    const item=instrument(selected),available=ownedEchoInstruments(owned).some(i=>i.id===selected);
    $('.he-slot-list').innerHTML=settings.lineup.map((id,index)=>`<button type="button" data-slot="${index}" aria-pressed="${index===slot}" aria-label="Customize pad ${index+1}, ${instrument(id).name}"><kbd>${index+1}</kbd><span><strong>${instrument(id).name}</strong><small>${index<3?'All modes':index===3?'Normal + Hard':index===4?'Hard':`Hard bonus ${index-4}`}</small></span><span>${ECHO_INSTRUMENTS[index].note}</span></button>`).join('');
    $('.he-custom-pitch').textContent=`PAD ${slot+1} / ${ECHO_INSTRUMENTS[slot].note}`;$('.he-custom-art').innerHTML=echoInstrumentArt(selected,'echo-custom-preview');
    $('.he-custom-name').textContent=item.name;$('.he-custom-description').textContent=item.description;
    $('[data-action="assign"]').disabled=!available||settings.lineup[slot]===selected;
    $('[data-action="assign"]').textContent=settings.lineup[slot]===selected?`Assigned to pad ${slot+1}`:`Assign to pad ${slot+1}`;
    $('.he-custom-lock').innerHTML=available?'In your collection.':`Preview this voice, then <a href="#store/harmonic">unlock it for ${item.cost} coins in the shop</a>.`;
    $('.he-instrument-choices').innerHTML=ECHO_INSTRUMENTS.map(i=>{const has=!i.cost||owned.includes(`harmonic:${i.id}`);return `<button type="button" class="he-choice" data-preview="${i.id}" aria-pressed="${i.id===selected}" aria-label="Preview ${i.name}${has?'':`, ${i.cost} coins to unlock`}"><span>${echoInstrumentArt(i.id,`echo-choice-${i.id}`)}</span><strong>${i.name}</strong><small>${has?(i.cost?'Owned':'Included'):`${i.cost} coins`}</small></button>`;}).join('');
    $('[data-action="sound"]').textContent=audio.enabled?'Sound on':'Sound off';$('[data-action="sound"]').setAttribute('aria-pressed',String(audio.enabled));
    $('.he-audio-controls output').textContent=`${Math.round(audio.volume*100)}%`;$('.he-audio-controls input').value=String(Math.round(audio.volume*100));
  }
  function save(message){$('.he-custom-status').textContent=writeEchoSettings(settings)?message:'Your browser could not save this arrangement. Allow local storage to keep it.';}
  function saveSound(){const progress=readSound();progress.sound=audio.enabled;progress.volume=audio.volume;try{localStorage.setItem(SOUND_KEY,JSON.stringify(progress));}catch{}}
  async function audition(){
    silence();if(!audio.enabled){$('.he-custom-status').textContent='Turn Sound on to audition this instrument.';return;}
    const revision=auditionRevision,id=selected,pitch=ECHO_INSTRUMENTS[slot].frequency,ok=await audio.start();if(disposed||revision!==auditionRevision)return;
    if(!ok){$('.he-custom-status').textContent='Audio is unavailable in this browser.';return;}
    audio.play(id,{frequency:pitch,duration:.65});$('.he-custom-art').classList.add('is-playing');timer=setTimeout(()=>$('.he-custom-art').classList.remove('is-playing'),650);
    $('.he-custom-status').textContent=`${instrument(id).name} on pad ${slot+1} (${ECHO_INSTRUMENTS[slot].note}).`;
  }
  on(wrapper,'click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.slot!==undefined){silence();slot=Number(button.dataset.slot);selected=settings.lineup[slot];render();$(`[data-slot="${slot}"]`).focus({preventScroll:true});return;}
    if(button.dataset.preview){silence();selected=button.dataset.preview;render();$(`[data-preview="${selected}"]`).focus({preventScroll:true});return;}
    if(button.dataset.action==='audition')audition();
    if(button.dataset.action==='assign'){silence();settings.lineup=swapEchoInstrument(settings.lineup,slot,selected,owned);save(`${instrument(selected).name} saved to pad ${slot+1}. Your next game will use this ensemble.`);render();$(`[data-slot="${slot}"]`).focus({preventScroll:true});}
    if(button.dataset.action==='reset'){silence();settings.lineup=[...ECHO_DEFAULT_LINEUP];selected=settings.lineup[slot];save('Original ensemble restored. All purchased instruments stay in your collection.');render();}
    if(button.dataset.action==='sound'){audio.setEnabled(!audio.enabled);if(audio.enabled)audio.start();else silence();saveSound();render();}
  });
  on($('.he-audio-controls input'),'input',event=>{audio.setVolume(Number(event.target.value)/100);saveSound();$('.he-audio-controls output').textContent=`${event.target.value}%`;});
  on(window,'blur',silence);on(document,'visibilitychange',()=>{if(document.hidden)silence();});
  const unsubscribe=wallet.subscribe(state=>{owned=state.owned;settings.lineup=normalizeEchoLineup(settings.lineup,owned);render();});
  return ()=>{disposed=true;clearTimeout(timer);abort.abort();unsubscribe();audio.dispose();wrapper.remove();};
}
