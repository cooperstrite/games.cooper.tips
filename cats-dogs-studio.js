import { TUG_BREEDS, TUG_ACCESSORIES, TUG_ITEMS, readTugWardrobe, writeTugWardrobe, normalizeTugPet, tugItemAvailable, tugCoats, tugCoat } from "./cats-dogs-customization.js";
import { drawTugPortrait } from "./cats-dogs-pet-art.js";
import { createCoatPainter } from "./cats-dogs-coat-painter.js";
import { PET_COAT_SWATCHES } from "./cats-dogs-coat.js";
import { endingAppearance } from "./cats-dogs-ending-poses.js";
import { getArcadeWallet } from "./arcade/wallet.js";

export function createTugStudio(root, onAppearanceChange) {
  const wallet=getArcadeWallet();let wardrobe=readTugWardrobe(wallet.getState().owned),disposed=false;
  const wrapper=document.createElement("section");wrapper.className="cd-studio";
  wrapper.innerHTML=`<div class="cd-studio-tabs" role="group" aria-label="Pet to customize"><button type="button" data-pet="cats">Your cat</button><button type="button" data-pet="dogs">Your dog</button></div>
    <p class="cd-studio-intro">Their breed. Your colors.<br>Every patch, in its place.</p>
    <label>Pet name<input class="cd-pet-name" maxlength="20" autocomplete="off" aria-label="Pet name"></label>
    <fieldset><legend>Choose a breed <small>All breeds are free</small></legend><div class="cd-breed-grid"></div></fieldset>
    <fieldset class="cd-coat-options"><legend>Coat &amp; color</legend><label>Breed coat<select class="cd-coat-choice" aria-label="Breed coat"></select></label><div class="cd-fur-color-row"><label>Main fur<input type="color" class="cd-fur-color" data-color="coatColor" aria-label="Custom fur color"></label><button type="button" class="cd-natural-coat">Restore natural coat</button></div><div class="cd-fur-swatches" role="group" aria-label="Fur color palette">${PET_COAT_SWATCHES.map(([name,hex])=>`<button type="button" data-fur="${hex}" style="--fur:${hex}" aria-label="${name} fur" title="${name}"></button>`).join("")}</div><div class="cd-fur-zones"><label>Light fur / chest<input type="color" data-color="secondaryColor" aria-label="Light fur color"></label><label>Natural markings / shading<input type="color" data-color="patternColor" aria-label="Natural markings color"></label></div><p class="cd-coat-note"></p></fieldset>
    <div class="cd-coat-painter-host"></div>
    <div class="cd-wardrobe-fields">${Object.entries(TUG_ACCESSORIES).map(([slot])=>`<label>${{hat:"Hat",eyewear:"Glasses",charm:"Neck accessory"}[slot]}<select data-slot="${slot}" aria-label="${{hat:"Pet hat",eyewear:"Pet glasses",charm:"Pet neck accessory"}[slot]}"></select></label>`).join("")}<label>Accessory color<input type="color" class="cd-pet-accent" aria-label="Pet accessory color"></label><label>Classic bandana color<input type="color" data-color="bandanaColor" aria-label="Classic bandana color"></label><button type="button" class="cd-natural-bandana">Original bandana color</button></div>
    <p class="cd-studio-save" role="status">Your cat and dog save separately.</p><a class="arcade-text-link" href="#store/catsdogs">Find special accessories in the shared shop &rarr;</a>
    <p class="cd-studio-footnote">Breed, clothes and color are just for looks. Every pet has the same pull strength and two free devices per round.</p>`;
  root.append(wrapper);const $=s=>wrapper.querySelector(s);
  const painter=createCoatPainter($(".cd-coat-painter-host"),{getPet:()=>wardrobe[wardrobe.selected],getSide:()=>wardrobe.selected,onChange:()=>save()});
  function notify() {
    const pet=wardrobe[wardrobe.selected],side=wardrobe.selected;
    const saved=normalizeTugPet(side,pet,wallet.getState().owned);
    onAppearanceChange?.({...saved,side,portrait2D(host,pose){const canvas=document.createElement("canvas");canvas.setAttribute("role","img");canvas.setAttribute("aria-label",`${saved.name}, your ${TUG_BREEDS[saved.breed].name}, ${pose==="win"?"winning":pose==="sad"?"losing":"playing"}, with your saved coat and accessories`);canvas.dataset.pose=pose==="win"||pose==="sad"?pose:"playing";canvas.dataset.appearance=JSON.stringify(saved);host.append(canvas);drawTugPortrait(canvas,pose==="win"||pose==="sad"?endingAppearance(saved,pose):saved);}});
  }
  function save() { const ok=writeTugWardrobe(wardrobe);$(".cd-studio-save").textContent=ok?"Saved for gameplay and both ending poses. Your cat and dog keep their own looks.":"This browser could not save your look. Keep this page open to preview it.";notify(); }
  function render() {
    const pet=wardrobe[wardrobe.selected],owned=wallet.getState().owned;
    wrapper.querySelectorAll("[data-pet]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.pet===wardrobe.selected)));
    $(".cd-pet-name").value=pet.name;$(".cd-pet-accent").value=pet.accent;
    $(".cd-coat-choice").innerHTML=tugCoats(pet.breed).map(c=>`<option value="${c.id}">${c.name}</option>`).join("");$(".cd-coat-choice").value=pet.coat;
    const coat=tugCoat(pet),defaults={coatColor:coat.coat,secondaryColor:coat.light,patternColor:coat.dark,bandanaColor:wardrobe.selected==="cats"?"#cf7455":"#428e96"};
    for(const input of wrapper.querySelectorAll("[data-color]"))input.value=pet[input.dataset.color]||defaults[input.dataset.color];
    $(".cd-natural-coat").disabled=![pet.coatColor,pet.secondaryColor,pet.patternColor].some(Boolean);$(".cd-natural-bandana").disabled=!pet.bandanaColor;
    $(".cd-coat-note").textContent="Color each part independently. Natural markings follow this breed's coat; solid coats have softer chest and ear shading. Painted patches keep their own colors and fur texture.";
    wrapper.querySelectorAll("[data-fur]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.fur===pet.coatColor)));
    $(".cd-breed-grid").innerHTML=Object.entries(TUG_BREEDS).filter(([,b])=>b.side===wardrobe.selected).map(([id,b])=>`<button type="button" data-breed="${id}" aria-pressed="${pet.breed===id}"><img src="${b.image}" alt="" width="140" height="140"><span>${b.name}</span></button>`).join("");
    for(const [slot,choices] of Object.entries(TUG_ACCESSORIES)) {
      const select=$(`[data-slot="${slot}"]`);select.innerHTML=Object.entries(choices).map(([id,label])=>{const locked=!tugItemAvailable(slot,id,owned),item=TUG_ITEMS.find(i=>i.setting===slot&&i.value===id);return `<option value="${id}" ${locked?"disabled":""}>${label}${locked?` / shop: ${item.cost} coins`:""}</option>`;}).join("");select.value=pet[slot];
    }
    painter.refresh();notify();
  }
  const natural=pet=>{pet.coatColor=pet.secondaryColor=pet.patternColor=null;};
  wrapper.addEventListener("click",e=>{const team=e.target.closest("[data-pet]"),breed=e.target.closest("[data-breed]"),fur=e.target.closest("[data-fur]"),pet=wardrobe[wardrobe.selected];if(team){wardrobe.selected=team.dataset.pet;save();render();}if(breed){pet.breed=breed.dataset.breed;pet.coat=tugCoats(pet.breed)[0].id;natural(pet);save();render();}if(fur){pet.coatColor=fur.dataset.fur;save();render();}if(e.target.matches(".cd-natural-coat")){natural(pet);save();render();}if(e.target.matches(".cd-natural-bandana")){pet.bandanaColor=null;save();render();}});
  wrapper.addEventListener("input",e=>{const pet=wardrobe[wardrobe.selected];if(e.target.matches(".cd-pet-name"))pet.name=e.target.value;else if(e.target.matches(".cd-pet-accent"))pet.accent=e.target.value;else if(e.target.dataset.color){pet[e.target.dataset.color]=e.target.value;$(".cd-natural-coat").disabled=false;$(".cd-natural-bandana").disabled=!pet.bandanaColor;painter.refresh();}else return;save();});
  wrapper.addEventListener("change",e=>{const pet=wardrobe[wardrobe.selected];if(e.target.dataset.slot){pet[e.target.dataset.slot]=e.target.value;wardrobe[wardrobe.selected]=normalizeTugPet(wardrobe.selected,pet,wallet.getState().owned);save();painter.refresh();}else if(e.target.matches(".cd-coat-choice")){pet.coat=e.target.value;natural(pet);save();render();}else if(e.target.dataset.color)render();});
  const unsubscribe=wallet.subscribe(()=>{if(!disposed){wardrobe=readTugWardrobe(wallet.getState().owned);render();}});
  render();return()=>{disposed=true;unsubscribe();painter.dispose();wrapper.remove();};
}
