import { COOKIE_LOOKS } from './cookie-config.js';
import { cookieDefinition, cookieEscape as esc } from './cookie-art.js';
import { LINE_STAGES, productionFilling, returnTrayPose, TRAY_RETURN_LENGTH } from './cookie-line-engine.js';
import { factoryX } from './cookie-factory-model.js';

export const factoryMix = (a,b,t) => '#' + [1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
const rect=(x,y,w,h,fill,r=0,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const label=(text,x,y,size=9,color='#425e58')=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="700" fill="${color}">${esc(text)}</text>`;
const metal=k=>`url(#${k}-metal)`;
const paint=k=>`url(#${k}-paint)`;
const bolt=(x,y)=>`<circle cx="${x}" cy="${y}" r="3" fill="#648078"/><path d="M${x-1} ${y-1}l2 2" stroke="#e8ecdf"/>`;
function fan(k,x,y,r=20){return `<g transform="translate(${x} ${y})"><circle r="${r+5}" fill="#263e40" stroke="#cad7c8" stroke-width="3"/><g data-rotor>${[0,120,240].map(a=>`<path transform="rotate(${a})" d="M0 0Q${-r} ${-r} 0 ${-r}Q${r} ${-r} 0 0" fill="${metal(k)}"/>`).join('')}</g><circle r="4" fill="#e8e3cb"/></g>`;}
function chef(x,key,task='roll') {return `<g data-chef="${task}" transform="translate(${x} 0)">
 <ellipse cx="0" cy="400" rx="42" ry="9" fill="#243c3b" opacity=".16"/>
 <path d="M-24 309l-5 79h21l9-63 9 63h21l-6-79Z" fill="#4b635d"/><path d="M-30 385h22v14h-33q-3-10 11-14m40 0h22l11 14H10Z" fill="#344745"/>
 <path d="M-29 238q29-15 58 0l10 80q-37 16-78 0Z" fill="#f3eddb" stroke="#bbc5af" stroke-width="2"/>
 <path d="M-19 246h38l9 78h-56Z" fill="${paint(key)}"/><path d="M-12 285h24v19h-24Z" fill="#ffffff" opacity=".18"/>
 <path d="M-30 247q-22 20-22 48" fill="none" stroke="#ece6d4" stroke-width="17" stroke-linecap="round"/>
 <path ${task==='pack'?'data-packer-arm':''} d="M30 247q22 20 22 48" fill="none" stroke="#ece6d4" stroke-width="17" stroke-linecap="round"/>
 <g ${task==='roll'?'data-chef-hands':''}><path d="M-52 294l9 8" stroke="#c99470" stroke-width="12" stroke-linecap="round"/><circle ${task==='pack'?'data-packer-hand':''} cx="48" cy="299" r="6" fill="#c99470"/></g>
 <path d="M-9 223v17q9 9 18 0v-17" fill="#bd8865"/><ellipse cy="208" rx="24" ry="28" fill="#dbad83"/>
 <path d="M-23 202q-4-31 24-28 26 0 23 28l-7-15q-15 7-33 0Z" fill="#73533e"/>
 <g data-chef-face><ellipse cx="-8" cy="207" rx="2" ry="3" fill="#3c3c30"/><ellipse cx="8" cy="207" rx="2" ry="3" fill="#3c3c30"/><path d="M-5 220q5 4 10-1" fill="none" stroke="#8e5944" stroke-width="1.6" stroke-linecap="round"/><path d="M0 210l-2 5h4" fill="none" stroke="#bd8562"/></g>
 <path d="M-22 188v-15c-26-7-19-33 0-31 2-22 34-22 37-3 26-9 35 25 9 34v15Z" fill="#fff7e5" stroke="#d1d5be" stroke-width="2"/><path d="M-22 178h46v11h-46Z" fill="#e7ead8"/><path d="M-8 151v22m19-25v25" stroke="#e4e5ce" stroke-width="2"/>
 </g>`;}
function supplyPipe(route,key,color,kind='liquid',active=true) {return `<path d="${route}" fill="none" stroke="#68857b" stroke-width="18"/><path d="${route}" fill="none" stroke="#d8ebdf" stroke-width="14"/><path data-feed-flow="${kind}" d="${route}" fill="none" stroke="${color}" stroke-width="9" stroke-dasharray="${kind==='chips'?'5 12':'23 7'}" stroke-linecap="round" opacity="${active?.9:.08}"/><path d="${route}" fill="none" stroke="#ffffff" stroke-width="2" opacity=".46" transform="translate(-3 -3)"/>`;}
function mixingArt(k,u,plan) {const powered=!!u.mixer||!!u.depositor;return `<g data-stage="mix" transform="translate(${plan.stages.mix} 0)">
 ${powered?`<g>${rect(-76,92,58,88,metal(k),10)}<ellipse cx="-47" cy="93" rx="29" ry="9" fill="#e2d7b8"/>${label('FLOUR',-47,129,8)}<path d="M-75 179h57l-18 21h-20Z" fill="${metal(k)}"/>${rect(29,80,51,72,metal(k),10)}${rect(40,94,12,40,'#d6e7de',4)}${rect(42,107,8,25,'#b9d6d2',2)}${label('LIQUID',55,166,7)}${supplyPipe('M-47 198v15q0 13 13 13h13v22',k,'#eed8aa','flour')}${supplyPipe('M55 153v40q0 14-14 14H8v39',k,'#bcdcd5','liquid')}</g>`:`<path d="M-67 244l5-47h51l8 47Z" fill="#e3ce9e" stroke="#b5a06e" stroke-width="2"/>${label('FLOUR',-35,224,9)}${rect(42,214,22,38,'#dfede5',4)}<path d="M64 220q22 0 7 20H64" fill="none" stroke="#c0d4c9" stroke-width="5"/>`}
 <path d="M-64 263h128l-18 49h-92Z" fill="${metal(k)}" stroke="#77958a" stroke-width="2"/><ellipse cy="263" rx="64" ry="14" fill="#e5be82"/><path data-dough-swirl d="M-47 264q40-17 92 0" fill="none" stroke="#b48953" stroke-width="4"/>
 ${powered?`${rect(55,210,25,100,paint(k),8)}${rect(-27,204,107,29,paint(k),12)}<path d="M0 232v22" stroke="#b9cbc0" stroke-width="8"/><g data-whisk><path d="M-13 247q-13 39 13 39t13-39M0 247v37" fill="none" stroke="#dce3cd" stroke-width="3"/></g><circle cx="66" cy="219" r="7" fill="#e3cc95"/>`:`<path data-spoon d="M-8 220l14 56" stroke="#9c6a3a" stroke-width="7" stroke-linecap="round"/>`}
 <path d="M-18 310h36v11h-36Z" fill="${metal(k)}"/><path data-dough-stream d="M0 315v13" stroke="#e7bc82" stroke-width="12" stroke-linecap="round"/>
 ${u.depositor?`<path d="M-45 310h90v9h-90Z" fill="${metal(k)}"/>${[-30,0,30].map(x=>`<path d="M${x} 319v9" stroke="#e5b777" stroke-width="8" stroke-linecap="round" data-dough-stream/>`).join('')}${rect(58,287,27,26,paint(k),4)}${label('DOSE',71,300,6,'#e9f1dd')}`:''}
 </g>`;}
function rollArt(k,u,p){return `<g data-stage="roll" transform="translate(${p.stages.roll} 0)">${p.machineRoll?`<path d="M-68 242v103m136-103v103" stroke="#69867b" stroke-width="11"/>${rect(-78,225,156,27,paint(k),8)}${rect(-58,258,116,24,metal(k),11)}<circle cx="75" cy="273" r="18" fill="${paint(k)}"/>${bolt(75,273)}`:chef(0,k,'roll')}
 <g data-rolling-pin><path d="M-83 298H83" stroke="#865a36" stroke-width="8" stroke-linecap="round"/>${rect(-58,280,116,34,`url(#${k}-wood)`,15)}<path d="M-45 287h90" stroke="#f8deb0" stroke-width="3" opacity=".7"/><path data-pin-grain d="M-44 298q24-6 45 0t44 0" fill="none" stroke="#a27446" stroke-width="1.5"/></g>
 ${u.mitts?'<path d="M-81 285l12-3 7 20-12 9-9-8Z M81 285l-12-3-7 20 12 9 9-8Z" fill="#d4c490" stroke="#b8a779"/>':''}</g>`;}
function cuttingArt(k,u,p){return `<g data-stage="cut" transform="translate(${p.stages.cut} 0)">
 ${p.machineCut?`<path d="M-63 226v118m126-118v118" stroke="#728d81" stroke-width="11"/>${rect(-75,210,150,31,paint(k),7)}<circle cx="59" cy="198" r="18" fill="${metal(k)}"/>${bolt(59,198)}<path d="M0 236v44" stroke="${metal(k)}" stroke-width="13"/>`:`${rect(-54,247,108,25,`url(#${k}-wood)`,7)}<path d="M-36 250l12-22h50l12 22" fill="none" stroke="#b18a56" stroke-width="6"/>`}
 <g data-cutter>${rect(-51,280,102,13,metal(k),4)}${(u.cutters?[-30,0,30]:[0]).map(x=>`<path d="M${x} 293v10" stroke="#dbe5cc" stroke-width="4"/><ellipse cx="${x}" cy="308" rx="${u.cutters?14:27}" ry="8" fill="none" stroke="#ced8c1" stroke-width="4"/>`).join('')}</g>
 <path d="M34 348l27 27" stroke="#adc0ad" stroke-width="7"/><path d="M42 375h37l-5 31H47Z" fill="#c7d4ba" stroke="#8d9f84"/><path d="M50 376q10-9 20 0" fill="#d5ab70"/>${label('OFFCUTS',61,419,7)}
 </g>`;}
function fillingArt(k,style,p) {const f=productionFilling(style.recipe),active=f.kind!=='none';return `<g data-stage="fill" data-filling="${f.kind}" transform="translate(${p.stages.fill} 0)">
 ${p.machineFill?`${rect(-98,81,55,95,metal(k),12)}<ellipse cx="-70" cy="82" rx="27" ry="8" fill="#d8e2cf"/>${rect(-83,98,19,60,'#e5efe2',4)}${rect(-80,active?110:145,13,active?44:9,f.color,2)}${label(active?'SUPPLY':'STANDBY',-70,193,7)}${supplyPipe('M-70 173v37q0 13 13 13h29q18 0 18-18V128H0',k,f.color,f.kind,active)}<circle cx="-28" cy="222" r="12" fill="${paint(k)}" stroke="#d3e0c7" stroke-width="3"/><path d="M-36 222h16m-8-8v16" stroke="#dce5ca" stroke-width="2"/>
 <path d="M-47 134h94l-15 67h-64Z" fill="#e9f4e3" fill-opacity=".45" stroke="#829b8a" stroke-width="2"/><path d="M-40 154h80l-11 40h-58Z" fill="${f.color}" opacity="${active?.85:.06}"/><path d="M-38 140l9 49" stroke="#fffef1" opacity=".5" stroke-width="4"/>
 ${rect(-51,127,102,11,metal(k),4)}<path d="M-20 202h40l-7 31h-26Z" fill="${metal(k)}"/><path d="M-62 243v100m124-100v100" stroke="#6c887b" stroke-width="9"/>${rect(-72,233,144,23,paint(k),6)}
 <g data-fill-head><path d="M0 232v36m-29 0h58" fill="none" stroke="${metal(k)}" stroke-width="11"/>${[-29,0,29].map(x=>`<path d="M${x-7} 269h14l-3 26h-8Z" fill="${metal(k)}"/>`).join('')}</g>`:`${rect(-44,230,88,54,'#e3edde',8)}${rect(-40,244,80,34,f.color,4,`opacity="${active?.85:.08}"`)}${rect(-48,224,96,10,`url(#${k}-wood)`,4)}<path data-fill-spoon d="M25 236l-21 61" stroke="#ba9561" stroke-width="6" stroke-linecap="round"/>`}
 <g data-filling-drops opacity="0">${f.kind==='jam'?[-29,0,29].map(x=>`<path d="M${x} 295v30" stroke="${f.color}" stroke-width="4" stroke-linecap="round"/>`).join(''):Array.from({length:12},(_,i)=>`<g data-ingredient="${i}">${f.kind==='oats'?'<ellipse rx="3.4" ry="1.4" fill="#dfc080"/>':`<path d="M-2-2h4l1 4-4 1Z" fill="${f.color}"/>`}</g>`).join('')}</g>
 ${rect(-68,p.machineFill?258:195,136,18,'#ece8cd',3)}<circle data-fill-light cx="-58" cy="${p.machineFill?267:204}" r="3" fill="${active?'#68a77b':'#a8b1a2'}"/>${label(active?f.label.toUpperCase():'NO FILLING',3,p.machineFill?270:207,7.5)}
 </g>`;}
function ovenArt(k,style,u,p){const width=u.tunnel?245:u.deck?210:p.automatic?182:143;return `<g data-stage="bake" transform="translate(${p.stages.bake} 0)">
 ${rect(-width/2,194,width,153,style.method==='hearth'?`url(#${k}-brick)`:paint(k),14)}<path d="M${-width/2+10} 205h${width-20}" stroke="#e6efd7" opacity=".5" stroke-width="3"/>
 ${rect(-width/2+12,216,width-24,19,metal(k),4)}${rect(-width/2+20,220,51,11,'#34493e',3)}${label(u.tunnel?'TUNNEL':u.convection?'FAN ON':'BAKE',-width/2+45,228,7,'#f0d08f')}
 ${rect(-width/2+13,244,width-26,90,'#32443b',8)}${rect(-width/2+17,248,width-34,81,`url(#${k}-heat)`,6,'data-oven-heat')}
 <path d="M${-width/2+22} 276h${width-44}m${44-width} 25h${width-44}" stroke="#e4b271" opacity=".5" stroke-width="2"/>
 ${u.convection?fan(k,width/2-42,276,18):''}${u.rotary?`<g transform="translate(-20 281)"><g data-rack><circle r="29" fill="none" stroke="#c1c8af" stroke-width="2"/>${[0,60,120,180,240,300].map(a=>`<path transform="rotate(${a})" d="M0 0v-26m-12 0h24" stroke="#ded7b7" stroke-width="3"/>`).join('')}</g></g>`:''}
 ${u.deck?`${rect(-95,130,190,58,paint(k),7)}${[143,166].map(y=>`<path d="M-80 ${y}H80" stroke="#45564a" stroke-width="11"/><path d="M-76 ${y}H76" stroke="#e4ad5f" stroke-width="2"/>`).join('')}`:''}
 <path d="M-22 ${u.deck?130:194}V100h30v${u.deck?30:94}" fill="${metal(k)}" stroke="#8aa18c" stroke-width="2"/><path d="M-28 100h42" stroke="#59786c" stroke-width="6" stroke-linecap="round"/>
 <g data-steam transform="translate(-6 97)" fill="none" stroke="#fff9dc" stroke-width="5" stroke-linecap="round">${[0,1,2].map(i=>`<path data-wisp="${i}" d="M${i*9-8} 0q-10-14 0-25t0-24"/>`).join('')}</g>
 ${style.method==='solar'?'<path d="M72 103l45-12 10 61-45 12Z" fill="#71a4a4" stroke="#d2ba79" stroke-width="5"/><path d="M82 99l12 62m11-68 12 62M77 119l45-12m-40 31 45-12" stroke="#c4dbcc" fill="none"/>':''}
 ${style.method==='steam'?`<path d="M${width/2+15} 333V202q0-23-22-23H38" fill="none" stroke="#ac774d" stroke-width="12"/><path d="M${width/2+11} 331V202q0-19-18-19H38" fill="none" stroke="#e9c391" stroke-width="3"/><circle cx="${width/2+15}" cy="255" r="14" fill="#f2e4bc" stroke="#af8157" stroke-width="4"/><path d="M${width/2+15} 255l6-8" stroke="#5b705c" stroke-width="2"/>`:''}
 </g>`;}
function coolingArt(k,u,p){return `<g data-stage="cool" transform="translate(${p.stages.cool} 0)"><path d="M-61 302H61m-122 8H61" stroke="#829c8a" stroke-width="3"/>
 ${u.conveyor?`<path d="M-67 241v103m134-103v103" stroke="#74917f" stroke-width="8"/>${rect(-78,219,156,20,paint(k),6)}${[-47,0,47].map(x=>fan(k,x,267,16)).join('')}<g data-cooling-air stroke="#e2f6e3" stroke-width="2" opacity=".7">${[-47,0,47].map(x=>`<path d="M${x-6} 294v15m12-15v15"/>`).join('')}</g>`:`${rect(-63,269,126,16,metal(k),3)}<path d="M-50 285v18m100-18v18" stroke="#8d9b80" stroke-width="5"/>${label('COOLING RACK',0,256,8)}`}</g>`;}
function packingArt(k,p){const px=p.stages.pack, pickup=factoryX(p,1252)-px, tape=factoryX(p,1375)-px;return `<g data-stage="pack" transform="translate(${px} 0)">
 ${p.machinePack?`<path d="M${pickup-66} 173v170m${tape-pickup+117} -170v170" stroke="#68867a" stroke-width="10"/>${rect(pickup-80,154,tape-pickup+145,25,paint(k),7)}<path d="M${pickup-63} 185H${tape+42}" stroke="#cbd9c5" stroke-width="5"/>
 <g data-pickup-carriage>${rect(-20,161,40,22,metal(k),5)}${bolt(-12,169)}${bolt(12,169)}</g><path data-pickup-rod fill="none" stroke="${metal(k)}" stroke-width="12"/>
 <g data-pickup-head><path d="M0 0v57" stroke="${metal(k)}" stroke-width="11"/>${rect(-45,56,90,13,metal(k),5)}${[-29,0,29].map(x=>`<path d="M${x} 69v8m-9 3h18" stroke="#4d7167" stroke-width="4" stroke-linecap="round"/>`).join('')}</g>`:chef(pickup-20,k,'pack')}
 <g transform="translate(${tape} 0)"><path d="M-32 253v89m64-89v89" stroke="#789580" stroke-width="8"/>${rect(-43,238,86,20,paint(k),6)}<g transform="translate(0 227)"><circle r="19" fill="#ceac79" stroke="#94754f" stroke-width="3"/><g data-tape-wheel><circle r="8" fill="#e3d1a8"/><path d="M-15 0h30" stroke="#e4c797" stroke-width="2"/></g></g><path d="M19 227v61L4 301" fill="none" stroke="#efd19c" stroke-width="5"/><path d="M-19 294l19 9 19-9" fill="none" stroke="#becbb3" stroke-width="6"/>
 ${label('SEAL',0,276,7,'#e9f0dd')}</g>
 <g transform="translate(${pickup-58} 0)">${[-1,0,1].map(i=>`<path d="M-26 ${353+i*8}h52l9 7h-52Z" fill="#c59c68" stroke="#96754e"/>`).join('')}${label('FLAT CARTONS',0,399,7)}</g>
 </g>`;}
function dockArt(k,p,front=false){const x=p.stages.ship;if(!p.automatic)return front?'':`<g transform="translate(${x} 0)"><path d="M-60 345H60l8 28H-60Z" fill="${metal(k)}"/><path d="M-60 345v-42h-12" fill="none" stroke="#78987e" stroke-width="6"/><circle cx="-38" cy="386" r="12" fill="#445a4c"/><circle cx="45" cy="386" r="12" fill="#445a4c"/>${[-32,11].map(v=>`<use href="#${k}-crate" transform="translate(${v} 342) scale(.43)"/>`).join('')}${label('LOCAL DELIVERY',0,433,8)}</g>`;
 const right=p.width-8;
 if(front)return `<g data-dock-front><path d="M${right-73} 224h37l36 48v115h-73Z" fill="${paint(k)}" stroke="#40675f" stroke-width="3"/><path d="M${right-62} 235h20l26 35h-46Z" fill="#bdd9d0"/><path d="M${right-58} 280h28" stroke="#cee4ca" stroke-width="3"/><path d="M${right-82} 385h83" stroke="#b1c4ad" stroke-width="9"/><circle cx="${right-38}" cy="391" r="23" fill="#2e4440"/><circle cx="${right-38}" cy="391" r="11" fill="${metal(k)}"/><path d="M${right-78} 222v154" stroke="#b7cdb4" stroke-width="7"/></g>`;
 return `<g data-loading-dock><path d="M${x-93} 169h${right-x+20}v209H${x-93}Z" fill="#a1b3a0" stroke="#7f9788" stroke-width="3"/><path d="M${x-81} 184h${right-x+8}v169H${x-81}Z" fill="#344d47"/><path d="M${x-80} 189H${right-74}m${x-right-6} 8H${right-74}" stroke="#678375" stroke-width="4"/>
 ${label('LOADING DOCK',x-12,154,10)}${label('FRESH COOKIE DELIVERY',x-10,213,7,'#c8d7bc')}
 ${[0,1,2].map(i=>`<use href="#${k}-crate" transform="translate(${right-107} ${356-i*25}) scale(.58)"/>`).join('')}
 <circle cx="${x-61}" cy="391" r="23" fill="#2e4440"/><circle cx="${x-61}" cy="391" r="11" fill="${metal(k)}"/><path d="M${x-97} 372H${right-73}" stroke="#b8c9ae" stroke-width="10"/>
 </g>`;}

export function factoryArt(style,k,p,u={}) {
 const room=COOKIE_LOOKS.room.find(r=>r.id===style.room)||COOKIE_LOOKS.room[0], night=style.room==='night', w=p.width;
 const beltStart=factoryX(p,20),beltEnd=factoryX(p,1660), returnPath=Array.from({length:101},(_,i)=>{const pos=returnTrayPose(i/100*TRAY_RETURN_LENGTH);return `${i?'L':'M'}${factoryX(p,pos.x).toFixed(1)} ${pos.y.toFixed(1)}`;}).join('');
 return `<svg class="cc-production-art" viewBox="0 0 ${w} 560" aria-hidden="true"><defs>${cookieDefinition(style,k)}${cookieDefinition(style,`${k}-plain`,{toppings:false})}
 <linearGradient id="${k}-metal" x2="0" y2="1"><stop stop-color="#edf1e5"/><stop offset=".22" stop-color="#c2d2c7"/><stop offset=".5" stop-color="#739187"/><stop offset=".72" stop-color="#c5d6c6"/><stop offset="1" stop-color="#7f9988"/></linearGradient>
 <linearGradient id="${k}-paint" x2="0" y2="1"><stop stop-color="${factoryMix(style.accent,'#ffffff',.25)}"/><stop offset=".45" stop-color="${style.accent}"/><stop offset="1" stop-color="${factoryMix(style.accent,'#18352e',.45)}"/></linearGradient>
 <linearGradient id="${k}-wood" x2="0" y2="1"><stop stop-color="#f3d5a3"/><stop offset=".4" stop-color="#d5a66f"/><stop offset=".72" stop-color="#b9854d"/><stop offset="1" stop-color="#e3be88"/></linearGradient>
 <linearGradient id="${k}-paper" x2="0" y2="1"><stop stop-color="#e0bc8d"/><stop offset="1" stop-color="#ad7e50"/></linearGradient>
 <radialGradient id="${k}-heat"><stop stop-color="#ffd58a"/><stop offset=".4" stop-color="#c48843"/><stop offset="1" stop-color="#494936"/></radialGradient>
 <linearGradient id="${k}-floor" x2="0" y2="1"><stop stop-color="${night?'#61726a':'#dac2a0'}"/><stop offset="1" stop-color="${night?'#374a4c':'#b2936e'}"/></linearGradient>
 <linearGradient id="${k}-glass" x2="1" y2="1"><stop stop-color="#f4fff2" stop-opacity=".3"/><stop offset=".5" stop-color="#f4fff2" stop-opacity="0"/><stop offset="1" stop-color="#f4fff2" stop-opacity=".18"/></linearGradient>
 <pattern id="${k}-tiles" width="58" height="34" patternUnits="userSpaceOnUse">${rect(0,0,58,34,room.wall)}<path d="M58 0H0v34" fill="none" stroke="${room.tile}" stroke-width="1.6"/><path d="M2 2h54" stroke="#fff" opacity=".17"/></pattern>
 <pattern id="${k}-belt" width="28" height="32" patternUnits="userSpaceOnUse">${rect(0,0,28,32,'#3a554d')}<path d="M0 0l-6 32m28-32-6 32" stroke="#688273" stroke-width="2"/></pattern>
 <pattern id="${k}-brick" width="36" height="22" patternUnits="userSpaceOnUse">${rect(0,0,36,22,'#a97051')}<path d="M0 0h36v22H0Z" stroke="#d7b58e" fill="none" stroke-width="2"/></pattern>
 <g id="${k}-crate"><path d="M46-6l7-16v31l-7 16Z" fill="#946b43"/><path d="M-46-6h92v31h-92Z" fill="url(#${k}-paper)" stroke="#9f784e"/><path d="M-42 18h29m24-19h30" stroke="#efd2a7" opacity=".35"/><rect x="4" y="0" width="30" height="17" rx="1" fill="#f0e5c8"/><text x="19" y="7" text-anchor="middle" fill="#67523e" font-family="sans-serif" font-size="4.5">COOKIES</text><path d="M9 10v4m2-4v4m3-4v4m2-4v4m4-4v4m3-4v4m2-4v4m3-4v4" stroke="#796044"/><circle cx="-27" cy="7" r="9" fill="none" stroke="${style.accent}" stroke-width="1.5"/><path d="M-31 6l4 4 5-8" fill="none" stroke="${style.accent}" stroke-width="2"/></g>
 </defs>
 ${rect(0,0,w,560,`url(#${k}-tiles)`)}${rect(0,371,w,189,`url(#${k}-floor)`)}<path d="M0 369H${w}" stroke="#9eb199" stroke-width="7"/>
 <path d="M0 425H${w}M0 480H${w}M0 542H${w}" stroke="#8c9279" opacity=".3" fill="none"/>
 ${Array.from({length:Math.ceil(w/210)},(_,i)=>`<path d="M${i*210} 374l${(i-w/420)*9} 186" stroke="#7f8a73" opacity=".24"/>`).join('')}
 <g opacity=".85">${rect(w*.55,22,260,105,'#91a896',6)}${rect(w*.55+7,29,246,91,night?'#667e96':'#c5e2df',3)}<path d="M${w*.55+7} 105q60-35 120-5t126-11v31H${w*.55+7}Z" fill="${night?'#7d9688':'#9fc5a6'}"/><path d="M${w*.55+88} 29v91m83-91v91m-164-43h246" stroke="#eee9d6" stroke-width="5"/></g>
 ${label('THE COOKIE WORKS',w*.38,49,19,night?'#d5deca':'#587364')}${label(p.name.toUpperCase(),w*.38,70,8,night?'#bdcbb8':'#6e8069')}
 ${[p.stages.roll,p.stages.bake,p.stages.pack].map(x=>`<path d="M${x} 0v63" stroke="#4e7063" stroke-width="3"/><path d="M${x-39} 84q9-28 39-28t39 28Z" fill="${paint(k)}"/><ellipse cx="${x}" cy="85" rx="39" ry="5" fill="#fff0bc"/><path d="M${x-30} 91l-80 231h220l-80-231Z" fill="#fff8d7" opacity=".045"/>`).join('')}
 ${dockArt(k,p)}
 ${[p.stages.mix,p.stages.roll,p.stages.cut,p.stages.fill,p.stages.bake,p.stages.cool,p.stages.pack].map(x=>`<ellipse cx="${x}" cy="435" rx="85" ry="12" fill="#324b3a" opacity=".12"/><path d="M${x-48} 357l-5 68m105-68 5 68" stroke="${metal(k)}" stroke-width="12"/>`).join('')}
 ${rect(17,347,beltEnd-17,38,p.automatic?paint(k):`url(#${k}-wood)`,6)}
 ${mixingArt(k,u,p)}${rollArt(k,u,p)}${cuttingArt(k,u,p)}${fillingArt(k,style,p)}${ovenArt(k,style,u,p)}${coolingArt(k,u,p)}${packingArt(k,p)}
 ${rect(beltStart,319,beltEnd-beltStart,28,p.automatic?`url(#${k}-belt)`:`url(#${k}-wood)`,5)}<path d="M${beltStart} 319H${beltEnd}m${beltStart-beltEnd} 28H${beltEnd}" stroke="#c7d4b9" stroke-width="3"/>
 ${p.automatic?Array.from({length:Math.ceil((beltEnd-beltStart)/45)},(_,i)=>`<g transform="translate(${beltStart+i*45} 363)"><circle r="5" fill="#446555"/><g data-wheel><path d="M-4 0h8M0-4v8" stroke="#c2d1b7" stroke-width="1.5"/></g></g>`).join(''):''}
 ${p.returnBelt?`<path d="${returnPath}" fill="none" stroke="#5f7e6b" stroke-width="13"/><path d="${returnPath}" fill="none" stroke="#b6cfb5" stroke-width="3" stroke-dasharray="3 11" data-return-chain/>${label('EMPTY TRAYS RETURN UNDER THE LINE',w*.43,476,9)}`:`<g transform="translate(${p.stages.mix} 411)">${[0,1,2].map(i=>`<path d="M-40 ${i*8}h80l8 6h-80Z" fill="${metal(k)}" stroke="#7d9278"/>`).join('')}${label('CLEAN TRAYS',0,42,7)}</g>`}
 <g data-return-trays></g><g data-batches></g><g data-foreground></g>
 ${rect(p.stages.bake-(u.tunnel?109:u.deck?92:p.automatic?78:59),245,u.tunnel?218:u.deck?184:p.automatic?156:118,89,`url(#${k}-glass)`,7)}
 ${dockArt(k,p,true)}
 <g data-stage-highlights fill="none" stroke="#fff0ac" stroke-width="3" opacity="0" pointer-events="none"><rect rx="18"/></g>
 ${LINE_STAGES.map((s,i)=>`<g transform="translate(${p.stages[s.id]} 527)"><circle cx="-26" cy="-3" r="10" fill="#f0e6ca"/><text x="-26" y="1" text-anchor="middle" fill="#566f5d" font-family="sans-serif" font-size="9">${i+1}</text>${label(s.name.toUpperCase(),20,1,9,night?'#e3e8cf':'#3c5c4c')}</g>`).join('')}
 </svg>`;
}

export function batchArt(key) {return `<ellipse cy="13" rx="48" ry="8" fill="#143a2d" opacity=".18"/>
 <g data-tray><path d="M-50 7h100l-5 6h-90Z" fill="#9cb09c"/><path d="M-46 7h92" stroke="#d5dfc5" stroke-width="2"/></g>
 <g data-box-back opacity="0"><path d="M-46-9l13-13h80l6 13Z" fill="#796044"/><path data-back-flap d="M-34-22l-8-22h88l1 22Z" fill="#d9b887" stroke="#ae8759"/></g>
 <g data-dough><path d="M-26 4q-9-7 1-19 8-12 26-10 23-3 30 13 6 11-4 17Z" fill="#e7c18a" stroke="#bd975f" stroke-width="1.2"/><path d="M-17-13q13-13 29-4M-15-3q7-6 17-5" fill="none" stroke="#f7ddad" stroke-width="2" stroke-linecap="round"/></g>
 <g data-cookies opacity="0">${[-29,0,29].map((x,i)=>`<g data-cookie-piece transform="translate(${x} ${i%2?-3:0}) scale(.27 .18)"><use href="#${key}-plain-cookie"/><use data-topping="${x}" href="#${key}-cookie" opacity="0"/></g>`).join('')}</g>
 <g data-box-front opacity="0"><use href="#${key}-crate"/><path data-box-lid d="M-46-6l12-16h80l7 16Z" fill="#e2bc87" opacity="0"/><path data-tape d="M-7-6l12-16h12L5-6v31H-7Z" fill="#efd09a" opacity="0"/><path data-fold-flap d="M-46-6l-15-17h15L-31-6Z" fill="#e6c28c" stroke="#b78b59"/></g>`;}
