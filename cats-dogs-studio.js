import { TUG_BREEDS, TUG_ACCESSORIES, TUG_ITEMS, readTugWardrobe, writeTugWardrobe, normalizeTugPet, tugItemAvailable } from "./cats-dogs-customization.js";
import { drawTugPortrait } from "./cats-dogs-pet-art.js";
import { getArcadeWallet } from "./arcade/wallet.js";

export function createTugStudio(root, onAppearanceChange) {
  const wallet=getArcadeWallet();let wardrobe=readTugWardrobe(wallet.getState().owned),disposed=false;
  const wrapper=document.createElement("section");wrapper.className="cd-studio";
  wrapper.innerHTML=`<div class="cd-studio-tabs" role="group" aria-label="Pet to customize"><button type="button" data-pet="cats">Your cat</button><button type="button" data-pet="dogs">Your dog</button></div>
    <p class="cd-studio-intro">Six breeds. Two personalities. Your own little rivals.</p>
    <label>Pet name<input class="cd-pet-name" maxlength="20" autocomplete="off" aria-label="Pet name"></label>
    <fieldset><legend>Choose a breed <small>All breeds are free</small></legend><div class="cd-breed-grid"></div></fieldset>
    <div class="cd-wardrobe-fields">${Object.entries(TUG_ACCESSORIES).map(([slot])=>`<label>${{hat:"Hat",eyewear:"Glasses",charm:"Neck accessory"}[slot]}<select data-slot="${slot}" aria-label="${{hat:"Pet hat",eyewear:"Pet glasses",charm:"Pet neck accessory"}[slot]}"></select></label>`).join("")}<label>Accessory color<input type="color" class="cd-pet-accent" aria-label="Pet accessory color"></label></div>
    <p class="cd-studio-save" role="status">Your cat and dog save separately.</p><a class="arcade-text-link" href="#store/catsdogs">Find special accessories in the shared shop &rarr;</a>
    <p class="cd-studio-footnote">Breed, clothes and color are just for looks. Every pet has the same pull strength and two free devices per round.</p>`;
  root.append(wrapper);const $=s=>wrapper.querySelector(s);
  function notify() {
    const pet=wardrobe[wardrobe.selected],side=wardrobe.selected;
    onAppearanceChange?.({...pet,side,portrait2D(host){const canvas=document.createElement("canvas");canvas.setAttribute("role","img");canvas.setAttribute("aria-label",`${pet.name}, your ${TUG_BREEDS[pet.breed].name}, with saved accessories`);host.append(canvas);drawTugPortrait(canvas,pet);}});
  }
  function save() { const ok=writeTugWardrobe(wardrobe);$(".cd-studio-save").textContent=ok?"Saved. Your cat and dog keep their own looks in every match.":"This browser could not save your look. Keep this page open to preview it.";notify(); }
  function render() {
    const pet=wardrobe[wardrobe.selected],owned=wallet.getState().owned;
    wrapper.querySelectorAll("[data-pet]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.pet===wardrobe.selected)));
    $(".cd-pet-name").value=pet.name;$(".cd-pet-accent").value=pet.accent;
    $(".cd-breed-grid").innerHTML=Object.entries(TUG_BREEDS).filter(([,b])=>b.side===wardrobe.selected).map(([id,b])=>`<button type="button" data-breed="${id}" aria-pressed="${pet.breed===id}"><img src="${b.image}" alt="" width="140" height="140"><span>${b.name}</span></button>`).join("");
    for(const [slot,choices] of Object.entries(TUG_ACCESSORIES)) {
      const select=$(`[data-slot="${slot}"]`);select.innerHTML=Object.entries(choices).map(([id,label])=>{const locked=!tugItemAvailable(slot,id,owned),item=TUG_ITEMS.find(i=>i.setting===slot&&i.value===id);return `<option value="${id}" ${locked?"disabled":""}>${label}${locked?` / shop: ${item.cost} coins`:""}</option>`;}).join("");select.value=pet[slot];
    }
    notify();
  }
  wrapper.addEventListener("click",e=>{const team=e.target.closest("[data-pet]"),breed=e.target.closest("[data-breed]");if(team){wardrobe.selected=team.dataset.pet;save();render();}if(breed){wardrobe[wardrobe.selected].breed=breed.dataset.breed;save();render();}});
  wrapper.addEventListener("input",e=>{const pet=wardrobe[wardrobe.selected];if(e.target.matches(".cd-pet-name"))pet.name=e.target.value;if(e.target.matches(".cd-pet-accent"))pet.accent=e.target.value;save();});
  wrapper.addEventListener("change",e=>{if(e.target.dataset.slot){const pet=wardrobe[wardrobe.selected];pet[e.target.dataset.slot]=e.target.value;wardrobe[wardrobe.selected]=normalizeTugPet(wardrobe.selected,pet,wallet.getState().owned);save();}});
  const unsubscribe=wallet.subscribe(()=>{if(!disposed){wardrobe=readTugWardrobe(wallet.getState().owned);render();}});
  render();return()=>{disposed=true;unsubscribe();wrapper.remove();};
}
