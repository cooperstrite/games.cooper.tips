import {TETRIS_LOOKS,readTetrisWardrobe,writeTetrisWardrobe} from './tetris-config.js';
import {drawMage,drawIslandSky,drawIsland,drawMiniPiece,tetrisEscape as esc,drawTetrisShopPreview} from './tetris-art.js';
import {fitTetrisCanvas} from './tetris-renderer.js';
import {getArcadeWallet} from './arcade/wallet.js';

export function createTetrisCustomizer(root) {
  const wallet=getArcadeWallet(),abort=new AbortController();let owned=wallet.getState().owned,wardrobe=readTetrisWardrobe(owned),frame=0,disposed=false;
  const wrap=document.createElement('section');wrap.className='ti-game ti-studio';root.append(wrap);
  const labels={blocks:'Block material',robe:'Robe design',hat:'Headwear',wand:'Wand',scene:'Island scenery'};
  function save(){wrap.querySelector('.ti-save-status').textContent=writeTetrisWardrobe(wardrobe,owned)?'Saved for your next game. All four local players have their own look.':'This browser could not save your changes. Allow local storage to keep them.';}
  function render(){const p=wardrobe.players[wardrobe.selected];
    wrap.innerHTML=`<header class="ti-section-title"><div><p class="ti-eyebrow">THE CASTER STUDIO</p><h3>Your magic. Your materials.</h3><p>Customize the same avatar, blocks, and scenery used in the game. Every look is cosmetic.</p></div><a href="#store/tetris">Browse the island shop &rarr;</a></header>
      <nav class="ti-profile-tabs" aria-label="Choose a player to customize">${wardrobe.players.map((v,i)=>`<button type="button" data-profile="${i}" aria-pressed="${i===wardrobe.selected}">${esc(v.name)}</button>`).join('')}</nav>
      <div class="ti-studio-layout"><div class="ti-studio-preview"><canvas class="ti-studio-canvas" role="img" aria-label="Live preview of your customizable caster and block material"></canvas><p>Original 2D game artwork. The wand, colors, hair, and outfit below carry into every island mode.</p></div>
      <div class="ti-appearance-fields"><label>Caster name<input data-field="name" aria-label="Caster name" maxlength="22" value="${esc(p.name)}"></label>
      ${[['skin','Skin tone'],['hairColor','Hair color'],['robeColor','Robe color'],['accent','Trim & magic color']].map(([key,label])=>`<label class="ti-color-field">${label}<input type="color" data-field="${key}" aria-label="${label}" value="${p[key]}"></label>`).join('')}
      <label>Hair<select data-field="hair" aria-label="Hair style">${['short','long','curls','braids','bald'].map(v=>`<option value="${v}" ${p.hair===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label>
      <label>Facial hair<select data-field="beard" aria-label="Facial hair">${['none','short','long','moustache'].map(v=>`<option value="${v}" ${p.beard===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label></div></div>
      <p class="ti-save-status" role="status">Changes save automatically in this browser.</p>
      ${Object.entries(TETRIS_LOOKS).map(([setting,items])=>`<section class="ti-look-section"><h4>${labels[setting]}</h4><div class="ti-look-grid">${items.map(item=>{const has=!item.cost||owned.includes(`tetris:${setting}:${item.id}`);return `<button type="button" data-look="${setting}:${item.id}" aria-pressed="${p[setting]===item.id}" ${has?'':'disabled'} aria-label="${has?'Choose':'Locked'} ${item.name}"><canvas data-look-art="${setting}:${item.id}" aria-hidden="true"></canvas><strong>${item.name}</strong><span>${has?item.cost?'Owned':'Included':`${item.cost} coins in shop`}</span></button>`;}).join('')}</div></section>`).join('')}
      <p class="ti-note">Paid materials do not change block shapes, weight, friction, powers, or difficulty. Free colors and character features remain fully adjustable.</p>`;
    for(const canvas of wrap.querySelectorAll('[data-look-art]')){const [setting,value]=canvas.dataset.lookArt.split(':');drawTetrisShopPreview(canvas,{setting,value,name:TETRIS_LOOKS[setting].find(v=>v.id===value).name});}
  }
  wrap.addEventListener('click',event=>{const profile=event.target.closest('[data-profile]'),look=event.target.closest('[data-look]');
    if(profile){wardrobe.selected=Number(profile.dataset.profile);render();save();}
    if(look&&!look.disabled){const [setting,value]=look.dataset.look.split(':');wardrobe.players[wardrobe.selected][setting]=value;render();save();}
  },{signal:abort.signal});
  wrap.addEventListener('input',event=>{const field=event.target.dataset.field;if(!field)return;wardrobe.players[wardrobe.selected][field]=event.target.value;save();if(field==='name')wrap.querySelector(`[data-profile="${wardrobe.selected}"]`).textContent=event.target.value||`Player ${wardrobe.selected+1}`;},{signal:abort.signal});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function draw(now){if(disposed)return;if(!document.hidden){const canvas=wrap.querySelector('.ti-studio-canvas'),{ctx,w,h}=fitTetrisCanvas(canvas),style=wardrobe.players[wardrobe.selected],time=reduced.matches?0:now/1000;
    drawIslandSky(ctx,w,h,time,style.scene);drawIsland(ctx,w*.5,h-55,w*.74,50,time);drawMage(ctx,w*.4,h-56,Math.min(250,h*.67),style,{time,cast:true});ctx.save();ctx.translate(w*.73,h*.4);ctx.rotate(reduced.matches?-.08:Math.sin(time)*.06);drawMiniPiece(ctx,'T',-40,-20,28,style);ctx.restore();drawMiniPiece(ctx,'L',w*.65,h-111,22,style);}
    frame=requestAnimationFrame(draw);
  }
  const unsubscribe=wallet.subscribe(state=>{owned=state.owned;wardrobe=readTetrisWardrobe(owned);render();});frame=requestAnimationFrame(draw);
  return ()=>{disposed=true;cancelAnimationFrame(frame);abort.abort();unsubscribe();wrap.remove();};
}
