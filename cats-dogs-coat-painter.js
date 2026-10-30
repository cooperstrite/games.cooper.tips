import { drawTugPortrait } from "./cats-dogs-pet-art.js";
import { isTugFur } from "./cats-dogs-coat-renderer.js";
import { MAX_PET_MARKINGS, PET_PATCH_SHAPES, normalizePetMarkings, petPatchAt, petPattern, tracePetPatch } from "./cats-dogs-coat.js";

export function createCoatPainter(root,{getPet,getSide,onChange}) {
  const wrapper=document.createElement("details");wrapper.className="cd-coat-painter";
  wrapper.innerHTML=`<summary>Paint your own markings <span>Place every patch yourself</span></summary><div class="cd-painter-body">
    <p class="cd-painter-help">Choose Add, then tap the fur and drag your new patch into place. Use Move to adjust an existing patch, or Erase to remove it. Markings follow the fur texture and body shading, including in the ending poses. Eyes, noses and accessories stay clear.</p>
    <div class="cd-paint-tools" role="group" aria-label="Marking tool"><button type="button" data-tool="add" aria-pressed="true">Add</button><button type="button" data-tool="move" aria-pressed="false">Move</button><button type="button" data-tool="erase" aria-pressed="false">Erase</button><button type="button" data-action="undo" disabled>Undo</button><button type="button" data-action="redo" disabled>Redo</button></div>
    <canvas class="cd-paint-canvas" width="600" height="620" tabindex="0" role="application" aria-label="Pet coat painter. Enter adds a patch. Arrow keys move the selected patch. Delete removes it."></canvas>
    <p class="cd-paint-status" role="status">Tap the fur to add your first patch.</p>
    <div class="cd-paint-fields"><label>Patch color<input type="color" data-brush="color" value="#4a3027" aria-label="Patch color"></label><label>Shape<select data-brush="shape" aria-label="Patch shape">${Object.entries(PET_PATCH_SHAPES).map(([id,name])=>`<option value="${id}">${name}</option>`).join("")}</select></label>
    <label>Size <output class="cd-patch-size">8%</output><input type="range" data-brush="size" min="2" max="22" value="8" step="1" aria-label="Patch size"></label><label>Rotation <output class="cd-patch-rotation">0 degrees</output><input type="range" data-brush="rotation" min="-180" max="180" value="0" step="5" aria-label="Patch rotation"></label>
    <label>Fur detail scale <output class="cd-patch-texture">100%</output><input type="range" data-brush="textureScale" min="50" max="200" value="100" step="5" aria-label="Patch fur detail scale"></label><label>Coat undertone <output class="cd-patch-undertone">28%</output><input type="range" data-brush="undertone" min="0" max="50" value="28" step="1" aria-label="Patch coat undertone"></label>
    <label>Selected patch<select class="cd-patch-select" aria-label="Selected patch"><option value="">New patch</option></select></label><button type="button" data-action="delete" disabled>Delete selected</button>
    <label>Horizontal position (%)<input type="number" data-position="x" min="0" max="100" step="1" aria-label="Patch horizontal position" disabled></label><label>Vertical position (%)<input type="number" data-position="y" min="0" max="100" step="1" aria-label="Patch vertical position" disabled></label></div>
    <div class="cd-pattern-presets"><span>Start with a pattern, then move its patches:</span><button type="button" data-pattern="splotches">Splotches</button><button type="button" data-pattern="spots">Spotted</button><button type="button" data-pattern="stripes">Stripes</button><button type="button" data-action="clear">Clear added patches</button></div>
    <p class="cd-painter-footnote">Size changes the patch; fur detail scale changes the texture inside it. Coat undertone adds hints of your pet's fur color. Natural breed markings stay in the artwork. For a blank canvas, try a white British shorthair or a white Labrador. Keyboard: Enter adds a patch, arrows move it, Shift + arrows makes a smaller adjustment, Delete removes it.</p></div>`;
  root.append(wrapper);const $=s=>wrapper.querySelector(s),canvas=$("canvas"),abort=new AbortController(),history={cats:{undo:[],redo:[]},dogs:{undo:[],redo:[]}};
  let tool="add",selected=null,brush={color:"#4a3027",size:.08,rotation:0,shape:"splotch",textureScale:1,undertone:.28},gesture=null,frame=0,disposed=false;
  const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:abort.signal}),current=()=>getPet().markings.find(p=>p.id===selected),snapshot=()=>JSON.stringify(getPet().markings);
  const status=text=>{$(".cd-paint-status").textContent=text;};
  function paint(){if(disposed)return;drawTugPortrait(canvas,getPet(),c=>{const spot=current();if(!spot)return;c.save();c.translate(48,64.6);tracePetPatch(c,spot,504);c.lineWidth=4;c.strokeStyle="#fffdf1";c.stroke();c.setLineDash([6,4]);c.lineWidth=2;c.strokeStyle="#275448";c.stroke();c.restore();});}
  function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;paint();});}
  function controls(){
    const pet=getPet(),spot=current(),value=spot||brush,h=history[getSide()];
    wrapper.querySelectorAll("button[data-tool]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.tool===tool)));canvas.dataset.tool=tool;
    for(const key of ["color","shape","size","rotation","textureScale","undertone"])$(`[data-brush="${key}"]`).value=["size","textureScale","undertone"].includes(key)?Math.round(value[key]*100):value[key];
    $(".cd-patch-size").value=`${Math.round(value.size*100)}%`;$(".cd-patch-rotation").value=`${value.rotation} degrees`;
    $(".cd-patch-texture").value=`${Math.round(value.textureScale*100)}%`;$(".cd-patch-undertone").value=`${Math.round(value.undertone*100)}%`;
    $(".cd-patch-select").innerHTML='<option value="">New patch</option>'+pet.markings.map((p,i)=>`<option value="${p.id}">Patch ${i+1} / ${PET_PATCH_SHAPES[p.shape]}</option>`).join("");$(".cd-patch-select").value=spot?String(spot.id):"";
    for(const axis of ["x","y"]){const input=$(`[data-position="${axis}"]`);input.disabled=!spot;input.value=spot?Math.round(spot[axis]*100):"";}
    $('[data-action="delete"]').disabled=!spot;$('[data-action="undo"]').disabled=!h.undo.length;$('[data-action="redo"]').disabled=!h.redo.length;$('[data-action="clear"]').disabled=!pet.markings.length;
  }
  function commit(before){if(before!==snapshot()){const h=history[getSide()];h.undo.push(before);if(h.undo.length>30)h.undo.shift();h.redo=[];onChange();}controls();schedule();}
  function add(x,y){const pet=getPet();if(pet.markings.length>=MAX_PET_MARKINGS){status(`You have ${MAX_PET_MARKINGS} patches. Move or erase one to make room.`);return false;}if(!isTugFur(pet,x,y)){status("Tap the fur; the background, face details and bandana cannot be painted.");return false;}
    const id=Math.max(0,...pet.markings.map(p=>p.id))+1;pet.markings.push({id,x,y,...brush});selected=id;return true;
  }
  function remove(){const before=snapshot();getPet().markings=getPet().markings.filter(p=>p.id!==selected);selected=null;commit(before);status("Patch removed. Undo brings it back.");}
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:((e.clientX-r.left)/r.width*600-48)/504,y:((e.clientY-r.top)/r.height*620-64.6)/504};};
  on(canvas,"pointerdown",e=>{
    if(e.button>0||gesture)return;e.preventDefault();canvas.focus({preventScroll:true});const{x,y}=point(e),before=snapshot(),hit=petPatchAt(getPet().markings,x,y);
    if(tool==="erase"){if(hit){selected=hit.id;remove();}else status("No added patch here to erase.");return;}
    if(tool==="move"){selected=hit?.id||null;if(!hit){controls();schedule();status("Tap an added patch to select it.");return;}}
    else if(!add(x,y))return;
    const spot=current();gesture={side:getSide(),before,id:e.pointerId,dx:x-spot.x,dy:y-spot.y};canvas.setPointerCapture(e.pointerId);controls();schedule();status("Drag to position this patch, then release to save.");
  });
  on(canvas,"pointermove",e=>{if(!gesture||gesture.id!==e.pointerId)return;const p=point(e),x=Math.max(0,Math.min(1,p.x-gesture.dx)),y=Math.max(0,Math.min(1,p.y-gesture.dy));if(isTugFur(getPet(),x,y)){Object.assign(current(),{x,y});controls();schedule();}});
  on(canvas,"pointerup",e=>{if(!gesture||e.pointerId!==gesture.id)return;const before=gesture.before;gesture=null;canvas.releasePointerCapture(e.pointerId);commit(before);status(`Patch saved. ${getPet().markings.length} of ${MAX_PET_MARKINGS} patches used.`);});
  on(canvas,"pointercancel",()=>{if(!gesture)return;getPet().markings=JSON.parse(gesture.before);gesture=null;selected=null;controls();schedule();});
  on(canvas,"keydown",e=>{
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==="Enter"){e.preventDefault();const before=snapshot();if(add(.53,.6)){commit(before);status("Patch added. Use arrow keys to move it.");}return;}
    if((e.key==="Delete"||e.key==="Backspace")&&current()){e.preventDefault();remove();return;}
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta||!current())return;e.preventDefault();const before=snapshot(),spot=current(),step=e.shiftKey?.003:.012,x=spot.x+delta[0]*step,y=spot.y+delta[1]*step;if(isTugFur(getPet(),x,y)){spot.x=x;spot.y=y;commit(before);}
  });
  on(wrapper,"click",e=>{
    const mode=e.target.closest("button[data-tool]"),action=e.target.closest("[data-action]")?.dataset.action,pattern=e.target.closest("[data-pattern]")?.dataset.pattern;
    if(mode){tool=mode.dataset.tool;controls();status(tool==="add"?"Tap the fur to add a new patch.":tool==="move"?"Drag an added patch to move it.":"Tap an added patch to erase it.");}
    if(action==="delete")remove();
    if(action==="clear"||pattern){const before=snapshot();getPet().markings=pattern?petPattern(getSide(),pattern,brush.color):[];selected=null;commit(before);status(pattern?"Pattern added. Choose Move to position each patch yourself.":"Added patches cleared. Undo restores them.");}
    if(action==="undo"||action==="redo"){const h=history[getSide()],from=h[action],to=h[action==="undo"?"redo":"undo"];if(!from.length)return;to.push(snapshot());getPet().markings=JSON.parse(from.pop());selected=null;onChange();controls();schedule();status(action==="undo"?"Undid the last patch edit.":"Redid the patch edit.");}
  });
  on($(".cd-patch-select"),"change",e=>{selected=Number(e.target.value)||null;controls();schedule();});
  on(wrapper,"input",e=>{
    const key=e.target.dataset.brush;if(!key)return;
    const before=snapshot(),spot=current();
    if(key){const value=["size","textureScale","undertone"].includes(key)?Number(e.target.value)/100:key==="rotation"?Number(e.target.value):e.target.value;brush[key]=value;if(spot)spot[key]=value;}
    getPet().markings=normalizePetMarkings(getPet().markings);commit(before);
  });
  on(wrapper,"change",e=>{
    const axis=e.target.dataset.position,spot=current();if(!axis||!spot)return;
    const before=snapshot(),value=Number(e.target.value)/100;
    if(e.target.value!==""&&isTugFur(getPet(),axis==="x"?value:spot.x,axis==="y"?value:spot.y)){
      spot[axis]=value;commit(before);status("Patch position saved.");
    }else{controls();status("Choose a position on the fur.");}
  });
  on(wrapper,"toggle",()=>{if(wrapper.open){controls();paint();}});
  return {refresh(){selected=null;gesture=null;controls();if(wrapper.open)paint();},dispose(){disposed=true;cancelAnimationFrame(frame);abort.abort();wrapper.remove();}};
}
