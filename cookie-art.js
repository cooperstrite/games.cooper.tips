import { COOKIE_LOOKS, normalizeCookieStyle } from "./cookie-config.js";

let serial = 0;
const id = () => `bakery-art-${++serial}`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const look = (group, value) => COOKIE_LOOKS[group].find(item => item.id === value) || COOKIE_LOOKS[group][0];
function cookieOutline(recipe, radius = 49) {
  const points = Array.from({ length: recipe === "star" ? 10 : 40 }, (_, i) => {
    const a = i / (recipe === "star" ? 10 : 40) * Math.PI * 2 - Math.PI / 2;
    const r = recipe === "star" ? radius * (i % 2 ? .52 : 1) : radius + Math.sin(i * 1.7) * 1.4 + Math.cos(i * 2.7) * .7;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  });
  return `M${points.join("L")}Z`;
}
function cookieDefinition(style, key) {
  const recipe = look("recipe", style.recipe), outline = cookieOutline(recipe.id);
  const seeds = Array.from({ length: 70 }, (_, i) => {
    const a = i * 2.399963, r = Math.sqrt((i + .5) / 70) * 46, x = Math.cos(a) * r, y = Math.sin(a) * r;
    return `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${.5 + i % 3 * .35}" ry=".65" fill="${i % 3 ? recipe.edge : '#fff2c5'}" opacity="${i % 3 ? '.17' : '.35'}"/>`;
  }).join("");
  const chips = Array.from({ length: 15 }, (_, i) => {
    const a = i * 2.399, r = Math.sqrt((i + 1) / 16) * 40, x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (recipe.id === 'jam') return '';
    if (recipe.id === 'oat') return `<g transform="translate(${x},${y}) rotate(${i*29})"><ellipse rx="5" ry="2" fill="${recipe.chip}"/><path d="M-4 0H4" stroke="${recipe.edge}" stroke-width=".65"/></g>`;
    if (recipe.id === 'sugar' || recipe.id === 'star') return `<rect x="${x}" y="${y}" width="1.8" height="1.8" rx=".4" fill="${recipe.chip}" opacity=".8"/>`;
    if (recipe.id === 'galaxy') return `<path d="M${x-3} ${y}l2-1 1-3 1 3 2 1-2 1-1 3-1-3Z" fill="${recipe.chip}"/>`;
    return `<g transform="translate(${x},${y}) rotate(${i*37})"><path d="M-4-2L1-4 5-1 3 4-3 3Z" fill="${recipe.edge}" opacity=".5" transform="translate(.7 1.5)"/><path d="M-4-2L1-4 5-1 3 4-3 3Z" fill="${recipe.chip}"/><path d="M-3-2L1-3 3-1" fill="none" stroke="#ffffff" stroke-opacity=".17" stroke-width="1.3"/></g>`;
  }).join("");
  return `<radialGradient id="${key}-dough" cx="35%" cy="26%" r="76%"><stop stop-color="${recipe.dough}"/><stop offset=".7" stop-color="${recipe.dough}"/><stop offset="1" stop-color="${recipe.edge}"/></radialGradient><clipPath id="${key}-clip"><path d="${outline}"/></clipPath><g id="${key}-cookie"><path d="${outline}" fill="${recipe.edge}" transform="translate(0 3)"/><path d="${outline}" fill="url(#${key}-dough)" stroke="${recipe.edge}" stroke-width="1.2"/><g clip-path="url(#${key}-clip)"><path d="M-37-13q10 8 10 19l8 9M17-40l-5 14 4 10M38 19l-16 2-7 9M-8 34l-3-12-8-3" fill="none" stroke="${recipe.edge}" stroke-opacity=".2" stroke-width="1.2"/>${seeds}${chips}${recipe.id==='jam'?`<circle r="21" fill="#9f5e32" opacity=".5"/><circle r="18" fill="${recipe.chip}"/><path d="M-12-7Q-5-17 6-12" fill="none" stroke="#ffb5b2" stroke-width="4" stroke-linecap="round"/><circle cx="8" cy="7" r="2" fill="#ef7982"/>`:''}${recipe.id==='star'?`<path d="${cookieOutline('star',39)}" fill="none" stroke="${recipe.chip}" stroke-width="3.5" stroke-linejoin="round"/>`:''}${recipe.id==='galaxy'?'<path d="M-40 12Q0-26 39-8M-32 28Q1-4 38 8" fill="none" stroke="#d48bbd" stroke-width="2" opacity=".65"/>':''}<path d="M-37-22Q-19-48 12-42" fill="none" stroke="#fff6de" stroke-opacity=".2" stroke-width="2.2" stroke-linecap="round"/></g></g>`;
}
export function cookieArt(style = normalizeCookieStyle()) {
  const key = id();
  return `<svg class="cc-cookie-art" viewBox="-65 -65 130 135" aria-hidden="true"><defs>${cookieDefinition(style,key)}</defs><ellipse cy="8" rx="53" ry="50" fill="#261d22" opacity=".13"/><use href="#${key}-cookie"/></svg>`;
}

export function stationArt(kind = "convection", style = normalizeCookieStyle()) {
  const key = id(), room = look("room", style.room), accent = style.accent || '#318c86';
  const ovenPaint = style.method === 'hearth' ? `url(#${key}-brick)` : style.method === 'steam' ? '#b77c52' : style.method === 'solar' ? '#b69a4d' : accent;
  const cookie = (x,y,s=.14, extra='') => `<g transform="translate(${x} ${y}) scale(${s})" ${extra}><use href="#${key}-cookie"/></g>`;
  const rect = (x,y,w,h,fill,rx=4,attrs='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${attrs}/>`;
  const fan = (x,y,r=18) => `<g transform="translate(${x} ${y})"><circle r="${r+2}" fill="#243b3d" stroke="#9eada3" stroke-width="2"/><g class="cc-spin">${[0,120,240].map(angle=>`<path transform="rotate(${angle})" d="M0 0Q${-r} ${-r} 0 ${-r}Q${r*.55} ${-r*.8} 0 0" fill="#a0b1aa"/>`).join('')}</g><circle r="3" fill="#dfd9bd"/></g>`;
  const steam = `<g class="cc-steam" fill="none" stroke="#fff6dc" stroke-width="3" stroke-linecap="round" opacity=".65"><path d="M94 37q-7-7 0-13t0-13M115 30q7-6 0-13M137 38q8-7 0-14t0-12"/></g>`;
  const belt = (y=119) => `${rect(12,y,216,16,'#344649',8)}<path class="cc-belt" d="M20 ${y+3}H220" stroke="#9baaa1" stroke-width="2" stroke-dasharray="5 9"/>${[22,52,82,112,142,172,202,219].map(x=>`<circle cx="${x}" cy="${y+9}" r="3" fill="#a8b5aa"/>`).join('')}${rect(32,y+14,8,12,'#73857c',1)}${rect(201,y+14,8,12,'#73857c',1)}`;
  const movingCookies = (y=108) => `<g>${[0,1,2,3].map(i=>`<g class="cc-cookie-travel" style="animation-delay:-${i*1.5}s">${cookie(9,y,.18,'class="cc-browning"')}</g>`).join('')}</g>`;
  const counter = `${rect(30,112,180,9,'#b67b4b',2)}${rect(35,121,170,20,accent,2)}<path d="M40 116H197M67 122v15m54-15v15m53-15v15" stroke="#744e34" opacity=".35"/>`;
  const tray = (x,y) => `<g class="cc-tray">${rect(x,y,77,5,'#a6b6ae',1)}${[13,37,61].map(dx=>cookie(x+dx,y-6,.14)).join('')}</g>`;
  const oven = (content, x=39,w=162) => `${rect(x,40,w,92,ovenPaint,7)}${rect(x+3,43,w-6,14,'#d0d7c8',4)}<path d="M${x+12} 49h${w-65}" stroke="#74857c" stroke-width="2"/>${[0,1,2].map(i=>`<circle cx="${x+w-16-i*14}" cy="50" r="3.4" fill="${i===0?'#e8a46d':'#667b73'}"/>`).join('')}${rect(x+11,63,w-22,55,'#273638',3)}${rect(x+15,67,w-30,47,`url(#${key}-heat)`,2,'class="cc-oven-glow"')}${content}<path d="M${x+15} 66l${w-32} 43" stroke="#ffffff" stroke-opacity=".09" stroke-width="7"/>${rect(x+17,122,w-34,4,'#c3cfc4',2)}${rect(x+10,132,8,7,'#435d56',1)}${rect(x+w-18,132,8,7,'#435d56',1)}`;
  let artwork;
  if (['bench','mitts','rolling-pin','cutters','piping'].includes(kind)) {
    const dough = `<ellipse cx="120" cy="105" rx="46" ry="12" fill="#d6a86c" stroke="#b6844d" stroke-width="2"/><path d="M89 103q27-9 53 0" stroke="#f0cf90" stroke-width="2" fill="none"/>`;
    const gloves = `<g class="cc-knead"><path d="M78 67q-11-2-16 8l-2 20q1 12 13 13l19-10-6-19q-1-10-8-12Z" fill="#f3bf8b" stroke="#b87d53" stroke-width="2"/><path d="M160 67q11-2 16 8l2 20q-1 12-13 13l-19-10 6-19q1-10 8-12Z" fill="#f3bf8b" stroke="#b87d53" stroke-width="2"/>${rect(60,61,30,11,accent,3)}${rect(149,61,30,11,accent,3)}</g>`;
    const rolling = `<g class="cc-roll"><path d="M62 85H178" stroke="#784c32" stroke-width="7" stroke-linecap="round"/>${rect(78,74,84,24,`url(#${key}-wood)`,10)}<path d="M83 79h71" stroke="#f5d4a2" stroke-width="2" opacity=".7"/></g>`;
    const cutter = `<g class="cc-stamp" transform="translate(120 74)"><path d="M0-21L7-7 23-6 12 6 15 22 0 14-15 22-12 6-23-6-7-7Z" fill="#b5c7c0" fill-opacity=".25" stroke="#667f79" stroke-width="5"/><path d="M-15-8L-6-10 0-24 8-9" fill="none" stroke="#edf6df" stroke-width="2"/></g>`;
    const piping = `<g class="cc-pipe"> <path d="M113 29l34 11-19 43-9 12-5-16Z" fill="#f4e1b8" stroke="#bdae8e" stroke-width="2"/><path d="M114 32l13-7 20 13" fill="${accent}"/> <path class="cc-drip" d="M121 88v15" stroke="#e4c18b" stroke-width="6" stroke-linecap="round"/></g>`;
    artwork = counter + dough + (kind==='rolling-pin'?rolling:kind==='cutters'?cutter:kind==='piping'?piping:gloves) + cookie(47,107,.18) + cookie(197,105,.16);
  } else if (kind === 'mixer') {
    artwork = counter + rect(136,42,22,69,ovenPaint,5) + rect(77,35,86,27,ovenPaint,12) + `<circle cx="146" cy="48" r="7" fill="#e0ddd0"/><path d="M99 56V88" stroke="#849b92" stroke-width="5"/><g class="cc-whisk"><path d="M88 68Q70 103 101 105Q128 100 112 67M97 65q-10 35 5 39m1-38q17 28 2 36" fill="none" stroke="#81978e" stroke-width="3"/></g><path d="M68 88h74q-3 32-35 32T68 88Z" fill="url(#${key}-metal)" stroke="#81978e" stroke-width="2"/><ellipse cx="105" cy="89" rx="36" ry="6" fill="#ddb477"/><path class="cc-whisk" d="M84 89q20-8 39 0" fill="none" stroke="#bb8b52" stroke-width="2"/>`;
  } else if (kind === 'convection') artwork = oven(tray(59,91)+fan(162,88,17)) + steam;
  else if (kind === 'deck') artwork = oven([72,88,104].map(y=>tray(80,y+5)).join('')) + steam;
  else if (kind === 'rotary') {
    artwork = rect(62,32,116,101,ovenPaint,10)+`<circle cx="120" cy="83" r="39" fill="#233b3c" stroke="#bdc9ba" stroke-width="5"/><circle cx="120" cy="83" r="34" fill="url(#${key}-heat)"/><g transform="translate(120 83)"><g class="cc-rotate-trays">${[0,60,120,180,240,300].map(a=>cookie(Math.sin(a*Math.PI/180)*25,Math.cos(a*Math.PI/180)*25,.19)).join('')}<circle r="5" fill="#b4bbaa"/></g></g>`+rect(83,125,74,5,'#d4dcce')+steam;
  } else if (kind === 'conveyor') artwork = belt()+movingCookies()+`<path d="M50 38v46M190 38v46" stroke="#a1b5a8" stroke-width="6"/>`+rect(35,30,170,15,ovenPaint)+[62,120,178].map(x=>fan(x,63,13)).join('');
  else if (kind === 'tunnel') artwork = belt()+movingCookies()+oven(`<path d="M91 71v37m13-37v37m14-37v37m14-37v37m14-37v37" stroke="#f2a85e" stroke-width="3" opacity=".5"/>`,76,108)+steam;
  else if (kind === 'factory' || kind === 'depositor') {
    artwork = belt()+movingCookies()+rect(45,34,8,80,'#8ca69b')+rect(188,34,8,80,'#8ca69b')+rect(37,28,168,24,ovenPaint,6)+`<circle cx="188" cy="39" r="4" fill="#d9e8ba"/>`;
    if(kind==='factory')artwork += `<g class="cc-stamp"><path d="M120 48v20" stroke="#85978e" stroke-width="9"/>${rect(76,65,90,22,'url(#'+key+'-metal)',3)}<path d="M83 89h76" stroke="#e1ae71" stroke-width="4"/></g>`;
    else artwork += [65,101,137,173].map((x,i)=>`<g style="animation-delay:-${i*.25}s" class="cc-pipe"><path d="M${x-11} 51h22l-6 25h-10Z" fill="#c4d0bc" stroke="#7a9c90"/><path class="cc-drip" d="M${x} 78v15" stroke="#dfb879" stroke-width="7" stroke-linecap="round"/></g>`).join('');
  } else if (kind === 'packing') {
    artwork = belt(121)+`<path d="M48 38v59" stroke="#809b90" stroke-width="10"/><circle cx="48" cy="38" r="10" fill="${accent}"/><g class="cc-arm"><path d="M48 38l55 9 19 34" fill="none" stroke="#b8c7b3" stroke-width="10" stroke-linejoin="round"/><circle cx="103" cy="47" r="7" fill="${accent}"/>${cookie(122,86,.18)}</g>`+[55,116,177].map((x,i)=>`${rect(x-18,102,38,18,'#be8d58',2)}<path d="M${x-18} 102l-7-12 27 6 23-6-5 12" fill="#e3bb83" stroke="#a77b4e"/>${cookie(x,103,.13)}<path d="M${x} 107v12" stroke="#edd5ad" stroke-width="7"/>`).join('');
  } else {
    artwork = rect(34,45,172,85,'#e6d3b3')+rect(115,63,74,45,'#344544')+rect(121,70,61,30,`url(#${key}-heat)`)+tray(114,105)+`<path d="M26 45h188l-12-23H39Z" fill="${accent}"/>${[40,72,104,136,168].map(x=>`<path d="M${x} 23h15l4 22h-23Z" fill="#f7eed3"/>`).join('')}<circle cx="73" cy="71" r="13" fill="#dcac80"/><path d="M57 65v-9q-5-13 7-11 10-13 18 0 16-2 10 11v9Z" fill="#f6efdc"/><path d="M58 84h29l9 30H50Z" fill="${accent}"/><path class="cc-baker-arm" d="M83 89l25 14" stroke="#d5a17a" stroke-width="9" stroke-linecap="round"/><circle cx="77" cy="71" r="1.3" fill="#544031"/>`+counter;
  }
  const methodDetail = style.method==='hearth'?'<path class="cc-flame" d="M171 132q-8-13 0-20-1 8 7 11 4-8 1-13 17 15 4 24Z" fill="#f3ad58"/>':style.method==='steam'?`<path d="M198 96V55q0-13-11-13" fill="none" stroke="#d5a46d" stroke-width="5"/>${steam}`:style.method==='solar'?'<g class="cc-sunshine" stroke="#d6b75a" stroke-width="2"><path d="M213 26v-7m7 12h7m-19-10-4-5m20 8 4-4"/><circle cx="215" cy="31" r="5" fill="#f1d680"/></g>':'';
  return `<svg class="cc-station-art" viewBox="0 0 240 160" aria-hidden="true"><defs>${cookieDefinition(style,key)}<linearGradient id="${key}-metal" x2="0" y2="1"><stop stop-color="#e3e9db"/><stop offset=".48" stop-color="#9aaea3"/><stop offset="1" stop-color="#cbd5c7"/></linearGradient><linearGradient id="${key}-wood" x2="0" y2="1"><stop stop-color="#edc591"/><stop offset=".55" stop-color="#c49159"/><stop offset="1" stop-color="#9a693b"/></linearGradient><radialGradient id="${key}-heat"><stop stop-color="#dc8e42"/><stop offset="1" stop-color="#57402c"/></radialGradient><pattern id="${key}-tile" width="28" height="18" patternUnits="userSpaceOnUse"><rect width="28" height="18" fill="${room.wall}"/><path d="M28 0H0V18" fill="none" stroke="${room.tile}" stroke-width="1"/></pattern><pattern id="${key}-brick" width="25" height="14" patternUnits="userSpaceOnUse"><rect width="25" height="14" fill="#ae7052"/><path d="M0 0h25v14H0Z" fill="none" stroke="#d1a88b"/></pattern><clipPath id="${key}-room"><rect x="9" y="8" width="222" height="144" rx="10"/></clipPath></defs><g clip-path="url(#${key}-room)">${rect(9,8,222,144,`url(#${key}-tile)`,10)}${rect(9,133,222,19,'#baa384',0)}<path d="M9 134h222m-185 0-9 18m66-18-3 18m63-18 3 18m50-18 11 18" stroke="#997c60" stroke-opacity=".3"/><ellipse cx="120" cy="137" rx="88" ry="8" fill="#3f4031" opacity=".14"/>${artwork}${methodDetail}<path d="M20 10h202" stroke="#fff8dc" opacity=".5"/></g></svg>`;
}

export function cookieBadgeArt(badge, unlocked = true) {
  const color = unlocked ? ['#be8e66','#bd9f69','#d8b34f','#86b9b4'][Math.min(3,badge.rank-1)] : '#89979b';
  const symbol = badge.metric === 'cps' ? '<path d="M29 26h22v20H29Z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M34 31h12v10H34ZM34 24v-4m6 4v-6m6 6v-4" fill="none" stroke="currentColor" stroke-width="2"/>' : badge.metric === 'purchases' || badge.metric === 'varieties' || badge.metric==='balanced' ? '<path d="M26 32l14-10 14 10v16H26Z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M34 49V36h12v13" fill="none" stroke="currentColor" stroke-width="2.5"/>' : '<circle cx="40" cy="35" r="13" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="35" cy="30" r="2.4" fill="currentColor"/><circle cx="46" cy="33" r="2.7" fill="currentColor"/><circle cx="37" cy="41" r="2.5" fill="currentColor"/>';
  return `<svg class="cc-badge-art" viewBox="0 0 80 86" aria-hidden="true"><path d="M20 52l-3 29 13-7 9 9 4-28M42 55l5 28 9-9 12 6-6-30" fill="${color}" opacity=".75"/><path d="M40 4l9 6 11 1 4 10 8 8-3 11 1 11-10 6-7 8-11-2-11 3-8-8-10-5V41L9 30l8-8 4-11 11-1Z" fill="${color}"/><circle cx="40" cy="35" r="24" fill="#f5e9c8"/><circle cx="40" cy="35" r="21" fill="none" stroke="${color}" stroke-width="1.4"/><g style="color:${color}">${symbol}</g><path d="M22 19Q38 2 56 17" fill="none" stroke="#fff8d9" stroke-opacity=".65" stroke-width="2" stroke-linecap="round"/></svg>`;
}
export function cookieShopArt(item) {
  const style = { ...normalizeCookieStyle(), [item.setting]: item.value };
  return `<div class="cc-shop-art cc-preview" role="img" aria-label="${esc(item.name)} preview">${item.setting==='recipe'?cookieArt(style):stationArt('convection',style)}</div>`;
}
export const cookieEscape = esc;
