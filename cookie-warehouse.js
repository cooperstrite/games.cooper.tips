import { cookieEscape as esc } from './cookie-art.js';

export function createCookieWarehouse(root, onSelect) {
  const host=document.createElement('div');host.className='cc-warehouse';root.append(host);
  let signature='',nodes=[];
  function update(flows,selected,layouts,style,rates){
    host.hidden=flows.length<2;
    const next=layouts.map(plan=>plan.signature).join('|');
    if(next!==signature){signature=next;
      host.innerHTML=`<div class="cc-warehouse-heading"><div><span class="cc-eyebrow">THE WAREHOUSE FLOOR</span><p>Each kitchen has its own upgrades. Choose where to bake and buy equipment.</p></div><span>${flows.length} production bays</span></div>
        <div class="cc-warehouse-map" role="img" aria-label="${flows.length} parallel cookie production lines, all leading to the dispatch aisle."><svg viewBox="0 0 1000 ${48+flows.length*75}" aria-hidden="true"><defs><pattern id="cc-floor-grid" width="35" height="35" patternUnits="userSpaceOnUse"><rect width="35" height="35" fill="#a6b7a3"/><path d="M35 0H0v35" stroke="#93a48e" fill="none"/></pattern></defs><rect width="1000" height="${48+flows.length*75}" rx="12" fill="url(#cc-floor-grid)"/><path d="M887 14v${flows.length*75+19}" stroke="#e9ce80" stroke-width="3" stroke-dasharray="12 10"/>
        <text x="938" y="28" text-anchor="middle" fill="#3d5b4c" font-family="sans-serif" font-size="10" font-weight="700">DISPATCH</text>
        ${flows.map((flow,i)=>`<g data-bay="${i}" transform="translate(0 ${40+i*75})"><rect data-bay-halo x="12" y="-4" width="860" height="62" rx="8" fill="#dce5cf" stroke="${style.accent}" stroke-width="2"/><text x="65" y="20" text-anchor="middle" fill="#3a584c" font-size="11" font-family="sans-serif" font-weight="700">LINE ${i+1}</text><text data-mini-rate x="65" y="37" text-anchor="middle" fill="#5c755f" font-size="9" font-family="sans-serif">${rates[i]?`${esc(rates[i].toLocaleString('en-US'))}/sec`:'Tap to bake'}</text><path d="M132 27h718" stroke="${layouts[i].transportBelt?'#4f6c5a':'#b88e60'}" stroke-width="18"/><path d="M132 23h718" stroke="#b9cdb3" stroke-width="2"/>${[153,273,365,459,580,691,794].map((x,j)=>[layouts[i].machineMix,layouts[i].machineRoll,layouts[i].machineCut,layouts[i].machineFill,true,layouts[i].transportBelt,layouts[i].machinePack][j]?`<rect x="${x-17}" y="-2" width="34" height="21" rx="5" fill="${j===4?'#ce9a55':style.accent}" stroke="#e6ebd4"/><path d="M${x-11} 5h22" stroke="#ffffff" opacity=".3"/>`:`<circle cx="${x}" cy="4" r="7" fill="#d6a879"/><path d="M${x-8} 0v-6q8-9 16 0v6Z" fill="#fff2d5"/><path d="M${x-11} 21v-9q11-7 22 0v9Z" fill="${style.accent}"/>`).join('')}<g data-mini-batches></g><rect x="909" y="5" width="52" height="35" rx="5" fill="#d9b385" stroke="#8b774e"/><path d="M935 5v35" stroke="#efe1b1" stroke-width="6"/></g>`).join('')}</svg></div>
        <div class="cc-bay-tabs" role="group" aria-label="Choose a production line">${flows.map((_,i)=>`<button type="button" data-line="${i}">Line ${i+1}</button>`).join('')}</div>`;
      nodes=[...host.querySelectorAll('[data-mini-batches]')].map(el=>({el,items:[]}));
    }
    for(const button of host.querySelectorAll('[data-line]'))button.setAttribute('aria-pressed',String(Number(button.dataset.line)===selected));
    [...host.querySelectorAll('[data-mini-rate]')].forEach((text,i)=>{text.textContent=rates[i]?`${rates[i].toLocaleString('en-US')}/sec`:'Tap to bake';});
    for(const bay of host.querySelectorAll('[data-bay]'))bay.querySelector('[data-bay-halo]').setAttribute('fill',Number(bay.dataset.bay)===selected?'#eff0d3':'#c4d3bb');
  }
  function draw(flows,reduced=false){if(host.hidden)return;flows.forEach((flow,i)=>{
    const row=nodes[i];if(!row)return;
    const batches=reduced?[250,510,800,1060,1360,1570].map(x=>({x})):flow.batches;
    while(row.items.length>batches.length)row.items.pop().remove();
    while(row.items.length<batches.length){const item=document.createElementNS('http://www.w3.org/2000/svg','rect');item.setAttribute('y','19');item.setAttribute('width','13');item.setAttribute('height','13');item.setAttribute('stroke','#775f40');item.setAttribute('stroke-width','.7');row.el.append(item);row.items.push(item);}
    batches.forEach((batch,j)=>{const item=row.items[j];item.setAttribute('x',130+batch.x/1715*710);item.setAttribute('rx',batch.x>1300?1:6);item.setAttribute('fill',batch.x>1300?'#d5b079':batch.x>1000?'#c68b49':'#edcf9b');});
  });}
  host.addEventListener('click',event=>{const button=event.target.closest('[data-line]');if(button)onSelect(Number(button.dataset.line));});
  return {update,draw,dispose(){host.remove();nodes=[];}};
}
