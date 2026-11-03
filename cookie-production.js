import { COOKIE_LOOKS } from './cookie-config.js';
import { cookieDefinition, cookieEscape as esc } from './cookie-art.js';
import { LINE_STAGES, LINE_WIDTH, TRAY_RETURN_LENGTH, productionFilling, returnTrayPose, createProductionFlow, setProductionEquipment, queueProductionBatch, advanceProductionFlow, productionBatchAppearance, productionRates } from './cookie-line-engine.js';

let serial = 0;
const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');

function batterFeedArt(key) {
  const route = 'M12 32H183Q203 32 203 52V147Q203 169 181 169H57Q40 169 40 188V246';
  return `<g data-batter-feed><path d="${route}" fill="none" stroke="#69827c" stroke-width="23"/>
    <path d="${route}" fill="none" stroke="#d4e5d4" stroke-width="20" stroke-opacity=".8"/>
    <path d="${route}" fill="none" stroke="#c79b64" stroke-width="13"/>
    <path data-batter-flow d="${route}" fill="none" stroke="#efd19c" stroke-width="12" stroke-dasharray="22 7" stroke-linecap="round"/>
    <path d="${route}" fill="none" stroke="#f4ffef" stroke-width="3" stroke-opacity=".45" transform="translate(-5 -3)"/>
    <path d="M20 19v26m164-26v26m6 64h27m-27 40h27M27 216h26" stroke="#587671" stroke-width="6"/>
    <path d="M20 20v23m164-23v23m8 65h21m-21 40h21M28 215h23" stroke="#cbd9c7" stroke-width="2"/>
    <rect x="56" y="14" width="90" height="15" rx="3" fill="#e6e5c8"/><text x="101" y="24" text-anchor="middle" fill="#587064" font-family="sans-serif" font-size="8" letter-spacing="1">BATTER FEED</text>
    <circle cx="202" cy="110" r="18" fill="url(#${key}-paint)" stroke="#b5c9b6" stroke-width="3"/>
    <g transform="translate(202 110)"><g data-rotor><path d="M-10 0h20M0-10v20" stroke="#e9ecd2" stroke-width="3"/></g><circle r="4" fill="#668079"/></g>
    <path d="M40 241v15" stroke="#edcc96" stroke-width="10" stroke-linecap="round" data-dough-drop/>
  </g>`;
}

function fillingMachineArt(style,key) {
  const filling = productionFilling(style.recipe), active = filling.kind !== 'none', color = filling.color;
  return `<g data-stage="fill" data-filling="${filling.kind}">
    <path d="M548 201v141m164-141v141" stroke="#6d8881" stroke-width="11"/>
    <rect x="537" y="181" width="186" height="26" rx="7" fill="url(#${key}-paint)"/><path d="M548 188h161" stroke="#def0d6" stroke-opacity=".4" stroke-width="2"/>
    <path d="M581 105h98l-13 65h-72Z" fill="#b9cfc3" fill-opacity=".4" stroke="#80988b" stroke-width="3"/>
    <path d="M587 119h86l-10 47h-66Z" fill="${color}" opacity="${active?.85:0}"/>
    ${active && filling.kind !== 'jam' ? Array.from({length:25},(_,i)=>`<g transform="translate(${594+i%7*11} ${126+Math.floor(i/7)*10}) rotate(${i*31})">${filling.kind==='oats'?'<ellipse rx="4" ry="1.6" fill="#f1dbaa"/>':`<path d="M-3-2l4-1 3 3-2 3-4-1Z" fill="${i%3?'#392b24':'#846047'}"/>`}</g>`).join('') : ''}
    <path d="M586 111l10 52m80-52-10 52" stroke="#effff0" stroke-opacity=".5" stroke-width="3"/>
    <rect x="576" y="98" width="108" height="12" rx="5" fill="url(#${key}-metal)"/><rect x="617" y="88" width="26" height="10" rx="4" fill="url(#${key}-paint)"/>
    <path d="M608 171h44l-5 44h-34Z" fill="url(#${key}-metal)"/>
    <g data-fill-head><path d="M630 210v27m-26 0h52" stroke="url(#${key}-metal)" stroke-width="13" stroke-linecap="round"/>
      ${[604,630,656].map(x=>`<path d="M${x-8} 237h16l-4 43h-8Z" fill="url(#${key}-metal)" stroke="#7a9282" stroke-width="1.5"/><path d="M${x-3} 244v25" stroke="#e8eeda" stroke-width="1.6"/>`).join('')}
    </g>
    <g data-filling-drops opacity="0">${filling.kind==='jam' ? [604,630,656].map(x=>`<path data-fill-stream d="M${x} 280v41" stroke="${color}" stroke-width="5" stroke-linecap="round"/><path d="M${x-1} 283v35" stroke="#e17d89" stroke-width="1.4" stroke-linecap="round"/>`).join('') : Array.from({length:15},(_,i)=>`<g data-ingredient="${i}">${filling.kind==='oats'?'<ellipse rx="3.5" ry="1.4" fill="#e4c486" stroke="#ad864f" stroke-width=".6"/>':`<path d="M-2-2l3-1 2 3-2 2-3-1Z" fill="${color}"/><path d="M-1-2h2" stroke="#ffffff" stroke-opacity=".3"/>`}</g>`).join('')}</g>
    <g data-upgrade="piping" class="cc-line-extra"><path d="M705 222h22v50h-22Z" fill="url(#${key}-metal)"/><path d="M715 222v-11h-30" stroke="#d4e3c9" stroke-width="6" fill="none"/><circle cx="716" cy="241" r="8" fill="#e9e6c8"/><path d="M716 241l3-5" stroke="#516e61" stroke-width="1.5"/></g>
    <rect x="558" y="205" width="143" height="18" rx="3" fill="#f1e7cc"/><circle data-fill-light cx="568" cy="214" r="3" fill="${active?'#5c9d77':'#a1a696'}"/>
    <text x="635" y="217" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="700" fill="#526b5d">${esc(active?filling.label.toUpperCase():'STANDBY / NO FILLING')}</text>
  </g>`;
}

function factoryArt(style, key) {
  const room = COOKIE_LOOKS.room.find(r => r.id === style.room) || COOKIE_LOOKS.room[0];
  const accent = style.accent, night = style.room === 'night', oven = style.method === 'steam' ? '#ad7857' : style.method === 'solar' ? '#b9a165' : accent;
  const rect = (x, y, w, h, fill, r = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
  const bolt = (x, y) => `<circle cx="${x}" cy="${y}" r="3" fill="#596f70"/><path d="M${x-1.5} ${y-1}l3 2" stroke="#dce7df" stroke-width="1"/>`;
  const fan = (x, y, radius = 22) => `<g transform="translate(${x} ${y})"><circle r="${radius+5}" fill="#263f43" stroke="#abc0b7" stroke-width="3"/><g data-rotor>${[0,120,240].map(angle => `<path transform="rotate(${angle})" d="M0 0Q${-radius} ${-radius} 0 ${-radius}Q${radius*.8} ${-radius} 0 0" fill="url(#${key}-metal)"/>`).join('')}</g><circle r="4" fill="#e7e9d5"/></g>`;
  const feet = [120,360,590,840,1080,1300,1530].map(x => `<path d="M${x} 370l-5 67h23l-5-67" fill="url(#${key}-metal)" stroke="#6d8380" stroke-width="2"/><ellipse cx="${x+6}" cy="438" rx="23" ry="6" fill="#263d3b" opacity=".2"/><path d="M${x-9} 435h33" stroke="#344a49" stroke-width="5" stroke-linecap="round"/>`).join('');
  const lamps = [280,900,1335].map(x => `<path d="M${x} 0v69" stroke="#445e5e" stroke-width="3"/><ellipse cx="${x}" cy="97" rx="125" ry="70" fill="url(#${key}-light)"/><path d="M${x-45} 88q12-34 45-34t45 34Z" fill="url(#${key}-paint)" stroke="#547674" stroke-width="2"/><ellipse cx="${x}" cy="88" rx="45" ry="6" fill="#fff2bf"/><path d="M${x-29} 69q15-13 34-9" fill="none" stroke="#eef7e2" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>`).join('');
  return `<svg class="cc-production-art" viewBox="0 0 ${LINE_WIDTH} 560" aria-hidden="true"><defs>
    ${cookieDefinition(style,key)}
    ${cookieDefinition(style,`${key}-plain`,{toppings:false})}
    <linearGradient id="${key}-metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ecf1e6"/><stop offset=".22" stop-color="#b9ccc6"/><stop offset=".5" stop-color="#6c8987"/><stop offset=".7" stop-color="#b7cbc2"/><stop offset="1" stop-color="#748e87"/></linearGradient>
    <linearGradient id="${key}-paint" x2="0" y2="1"><stop stop-color="${mix(accent,'#ffffff',.25)}"/><stop offset=".45" stop-color="${accent}"/><stop offset="1" stop-color="${mix(accent,'#172d32',.45)}"/></linearGradient>
    <linearGradient id="${key}-oven-paint" x2="0" y2="1"><stop stop-color="${mix(oven,'#ffffff',.28)}"/><stop offset=".4" stop-color="${oven}"/><stop offset="1" stop-color="${mix(oven,'#253e3c',.48)}"/></linearGradient>
    <linearGradient id="${key}-wood" x2="0" y2="1"><stop stop-color="#f3d3a1"/><stop offset=".38" stop-color="#d5a66f"/><stop offset=".7" stop-color="#b97f48"/><stop offset="1" stop-color="#e5ba83"/></linearGradient>
    <linearGradient id="${key}-floor" x2="0" y2="1"><stop stop-color="${night?'#65706e':'#d3b899'}"/><stop offset="1" stop-color="${night?'#394b50':'#a98b6c'}"/></linearGradient>
    <radialGradient id="${key}-light"><stop stop-color="#fff0b1" stop-opacity=".45"/><stop offset="1" stop-color="#fff3c2" stop-opacity="0"/></radialGradient>
    <radialGradient id="${key}-heat"><stop stop-color="#ffd989"/><stop offset=".4" stop-color="#c27d39"/><stop offset="1" stop-color="#423c32"/></radialGradient>
    <linearGradient id="${key}-glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e9fff1" stop-opacity=".25"/><stop offset=".4" stop-color="#e9fff1" stop-opacity=".02"/><stop offset=".7" stop-color="#e9fff1" stop-opacity=".12"/><stop offset="1" stop-color="#e9fff1" stop-opacity="0"/></linearGradient>
    <linearGradient id="${key}-paper" x2="0" y2="1"><stop stop-color="#dcb686"/><stop offset="1" stop-color="#af8051"/></linearGradient>
    <pattern id="${key}-tiles" width="62" height="36" patternUnits="userSpaceOnUse"><rect width="62" height="36" fill="${room.wall}"/><path d="M62 0H0v36" fill="none" stroke="${room.tile}" stroke-width="1.5"/><path d="M1 1h60" fill="none" stroke="#ffffff" stroke-opacity=".15"/></pattern>
    <pattern id="${key}-belt" width="28" height="32" patternUnits="userSpaceOnUse"><rect width="28" height="32" fill="#334b4c"/><path d="M0 0l-7 32m28-32-7 32" stroke="#526a67" stroke-width="2"/><path d="M4 0l-7 32" stroke="#203a3c" stroke-width="2"/></pattern>
    <pattern id="${key}-brick" width="36" height="21" patternUnits="userSpaceOnUse"><rect width="36" height="21" fill="#a96d50"/><path d="M0 0h36v21H0Z" fill="none" stroke="#d3b18e" stroke-width="2"/></pattern>
    <filter id="${key}-soft"><feGaussianBlur stdDeviation="3"/></filter>
    <clipPath id="${key}-glass-clip"><rect x="570" y="232" width="260" height="105" rx="10"/></clipPath>
    <g id="${key}-crate"><path d="M46-6l7-16v31l-7 16Z" fill="#90623f"/><path d="M-46-6h92v31h-92Z" fill="url(#${key}-paper)" stroke="#9e7149" stroke-width="1"/><path d="M-39 19h23m28-22h25" stroke="#f3d7ae" stroke-opacity=".3"/><rect x="4" y="1" width="30" height="16" rx="1.5" fill="#f5e9cf"/><text x="19" y="7" text-anchor="middle" fill="#675141" font-size="4.5" font-family="sans-serif" font-weight="700">COOKIES</text><path d="M9 11v3m2-3v3m3-3v3m2-3v3m4-3v3m3-3v3m2-3v3m3-3v3" stroke="#685544" stroke-width="1"/><circle cx="-27" cy="7" r="9" fill="none" stroke="${accent}" stroke-width="1.5"/><path d="M-30 5l3 5 5-7" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round"/></g>
  </defs>
  ${rect(0,0,1640,560,`url(#${key}-tiles)`)}
  <path d="M0 370h1640v190H0Z" fill="url(#${key}-floor)"/>
  <path d="M0 409h1640M0 455h1640M0 507h1640M60 370-25 500m300-130-55 130m320-130-25 130m300-130 10 130m285-130 50 130m225-130 80 130" fill="none" stroke="#6d6e59" stroke-opacity=".2" stroke-width="2"/>
  <path d="M0 367h1640" stroke="#a6b4a2" stroke-width="7"/>
  <g opacity="${night?'.5':'.85'}">${rect(961,28,350,115,'#869e97',8)}${rect(969,36,334,99,night?'#677c94':'#c6dee1',5)}<path d="M969 113q75-45 133-13t201-11v46H969Z" fill="${night?'#819084':'#a4c5ab'}"/><path d="M1053 36v99m84-99v99m84-99v99M969 85h334" stroke="#f0eadd" stroke-width="5"/><path d="M971 38h330" stroke="#fffdf0" stroke-width="3"/></g>
  <path d="M996 138l223 232h177L1190 138Z" fill="#fff6d4" opacity="${night?'.025':'.12'}"/>
  <g data-upgrade="bakery" class="cc-line-extra"><path d="M19 92h153l-7-28H29Z" fill="url(#${key}-paint)"/>${[35,66,97,128].map(x=>`<path d="M${x} 64h14l3 28h-20Z" fill="#f0e5ce"/>`).join('')}${rect(27,97,136,48,'#f4e5c3',5)}<text x="95" y="117" text-anchor="middle" fill="#5d6e61" font-size="10" letter-spacing="2" font-family="sans-serif" font-weight="700">SMALL BATCH</text><text x="95" y="133" text-anchor="middle" fill="#8d714d" font-size="10" font-family="Georgia,serif">Fresh every day</text></g>
  <g fill="#9ea792" opacity=".35"><path d="M397 63h157v4H397Z"/><path d="M429 81h94v2h-94Z"/></g><text x="475" y="51" fill="${night?'#d6ddca':'#617568'}" text-anchor="middle" font-family="Georgia,serif" font-size="20" letter-spacing="3">THE COOKIE WORKS</text>
  ${lamps}
  <g data-upgrade="factory" class="cc-line-extra"><path d="M126 191V161q0-14 14-14h852q17 0 17 17v41" fill="none" stroke="#748e89" stroke-width="13"/><path d="M126 191V161q0-14 14-14h852" fill="none" stroke="#ced8c5" stroke-width="4"/><path d="M266 146v21m261-21v21m260-21v21" stroke="#526e6b" stroke-width="8"/></g>
  <ellipse cx="820" cy="431" rx="788" ry="32" fill="#233b39" opacity=".13" filter="url(#${key}-soft)"/>
  ${feet}
  ${[40,265,490,715,940,1165,1390].map(x=>`${rect(x,377,207,43,`url(#${key}-paint)`,4)}<path d="M${x+12} 383h181" stroke="#c9e6d4" stroke-opacity=".22"/>${[0,1,2,3].map(i=>`<path d="M${x+138} ${389+i*5}h49" stroke="#163c3c" stroke-opacity=".35" stroke-width="2"/>`).join('')}${bolt(x+9,409)}${bolt(x+197,409)}`).join('')}
  <path data-return-rail d="M1300 343a47.5 47.5 0 0 1 0 95H60a54 54 0 0 1 0-108" fill="none" stroke="#54716a" stroke-width="15"/><path d="M1300 343a47.5 47.5 0 0 1 0 95H60a54 54 0 0 1 0-108" fill="none" stroke="#bfd0bc" stroke-width="3" stroke-dasharray="3 11" data-return-chain/>
  <text x="740" y="485" text-anchor="middle" fill="#536958" font-family="sans-serif" font-size="9" letter-spacing="2">EMPTY TRAYS RETURN TO THE MIXER</text>
  ${batterFeedArt(key)}
  <g data-stage="mix">
    <path d="M31 256h128l-20 61H50Z" fill="url(#${key}-metal)" stroke="#738e87" stroke-width="2"/><ellipse cx="95" cy="256" rx="64" ry="15" fill="#e6c48e"/><path d="M42 258q41-20 100-1" fill="none" stroke="#b58b57" stroke-width="4" data-dough-swirl/>
    <g data-missing="mixer"><path d="M87 213l12 53" stroke="#93663c" stroke-width="8" stroke-linecap="round"/><path d="M80 211l8 1" stroke="#e1c18c" stroke-width="4" stroke-linecap="round"/></g>
    <g data-upgrade="mixer" class="cc-line-extra">${rect(139,189,30,111,`url(#${key}-paint)`,9)}${rect(59,182,114,38,`url(#${key}-paint)`,17)}<path d="M93 216v25" stroke="#7e9790" stroke-width="7"/><g data-whisk><path d="M83 232q-18 40 12 43t12-43m-12 0v41" fill="none" stroke="#d9e0cb" stroke-width="4"/></g><circle cx="152" cy="201" r="10" fill="url(#${key}-metal)"/><path d="M150 196l4 10" stroke="#344e50" stroke-width="2"/></g>
    <path d="M91 297v21" stroke="#be8b50" stroke-width="18" stroke-linecap="round"/><path d="M91 299v16" stroke="#f0cd92" stroke-width="10" stroke-linecap="round" data-dough-drop/>
    <g data-upgrade="depositor" class="cc-line-extra">${rect(22,176,151,16,`url(#${key}-metal)`,5)}${[39,75,111,147].map(x=>`<path d="M${x-11} 192h22l-6 28h-10Z" fill="url(#${key}-metal)" stroke="#788e84"/><path d="M${x} 222v15" stroke="#e7bc80" stroke-width="5" stroke-linecap="round" data-dough-drop/>`).join('')}</g>
  </g>
  <g data-stage="roll">
    <path d="M214 221v111m133-111v111" stroke="#627e78" stroke-width="12"/><path d="M214 222h133" stroke="url(#${key}-metal)" stroke-width="13"/>
    <g data-rolling-pin><path d="M198 289h163" stroke="#795435" stroke-width="9" stroke-linecap="round"/>${rect(221,272,119,36,`url(#${key}-wood)`,16)}<path d="M232 279h97" stroke="#f9dfb0" stroke-width="3" opacity=".6"/><path data-pin-grain d="M235 290q25-7 45 0t46 0" fill="none" stroke="#8f6239" stroke-opacity=".4" stroke-width="1.2"/><ellipse cx="223" cy="290" rx="4" ry="14" fill="#b17a43"/><ellipse cx="337" cy="290" rx="4" ry="14" fill="#edc28a"/></g>
    <g data-upgrade="rolling-pin" class="cc-line-extra">${rect(220,234,122,27,`url(#${key}-metal)`,12)}<path data-roller-glint d="M233 242h94" stroke="#eff7e6" stroke-width="3"/><circle cx="351" cy="248" r="17" fill="url(#${key}-paint)"/>${bolt(351,248)}</g>
    <g data-upgrade="mitts" class="cc-line-extra"><path d="M195 257q-15-2-19 8l-4 29q-1 9 9 11l14-8 6-23Z" fill="#ead5a4" stroke="#b49b71" stroke-width="2"/><path d="M371 257q15-2 19 8l4 29q1 9-9 11l-14-8-6-23Z" fill="#ead5a4" stroke="#b49b71" stroke-width="2"/><path d="M179 265l13 27m-15-16 19-8m180 0 14 24m-17-16 19-8" stroke="#bda881" stroke-width="1"/></g>
  </g>
  <g data-stage="cut">
    <path d="M400 229v112m92-112v112" stroke="#718a81" stroke-width="10"/>${rect(388,217,117,23,`url(#${key}-paint)`,7)}${bolt(399,228)}${bolt(495,228)}
    <g data-cutter><path d="M447 239v37" stroke="url(#${key}-metal)" stroke-width="12"/><path d="M416 279h62v16h-62Z" fill="url(#${key}-metal)" stroke="#81998b" stroke-width="2"/><g data-missing="cutters"><ellipse cx="447" cy="307" rx="27" ry="9" fill="none" stroke="#c3cfb9" stroke-width="5"/></g><g data-upgrade="cutters" class="cc-line-extra">${[420,447,474].map(x=>`<path d="M${x} 291v13" stroke="#d5ddc8" stroke-width="4"/><ellipse cx="${x}" cy="307" rx="12" ry="7" fill="none" stroke="#e2e8d1" stroke-width="3"/>`).join('')}</g></g>
    <g data-upgrade="factory" class="cc-line-extra"><circle cx="497" cy="194" r="19" fill="url(#${key}-paint)" stroke="#aec2aa" stroke-width="3"/><g transform="translate(497 194)"><g data-rotor><path d="M-13 0h26M0-13v26m-9-9 18 18m0-18-18 18" stroke="#c1d1b7" stroke-width="4"/></g></g><path d="M497 213v5" stroke="#6d8881" stroke-width="7"/></g>
  </g>
  ${fillingMachineArt(style,key)}
  <g transform="translate(200 0)">
  <g data-stage="bake">
    <g data-upgrade="tunnel" class="cc-line-extra">${rect(532,188,337,154,'#6a8c85',17)}<path d="M544 196v127m313-127v127" stroke="#ccdbbe" stroke-width="6"/></g>
    ${rect(550,179,300,166,style.method==='hearth'?`url(#${key}-brick)`:`url(#${key}-oven-paint)`,18)}
    <path d="M562 190h276" stroke="#e0e8ca" stroke-opacity=".5" stroke-width="3"/>
    ${rect(565,199,270,23,`url(#${key}-metal)`,5)}${rect(582,203,48,15,'#2d4744',3)}<text x="606" y="214" text-anchor="middle" font-family="monospace" font-size="10" fill="#f0d18f">BAKE</text>
    ${[746,779,812].map((x,i)=>`<circle cx="${x}" cy="211" r="6" fill="${i?'#607b72':'#efc17e'}"/><path d="M${x} 207v5" stroke="#eef1ce" stroke-width="1.5"/>`).join('')}
    ${rect(568,231,264,108,'#34413a',10)}${rect(572,235,256,101,`url(#${key}-heat)`,8,'data-oven-heat')}
    ${style.method==='hearth'?`<g data-fire fill="#ffc071" opacity=".75">${[599,642,737].map(x=>`<path d="M${x} 318q-12-12 0-27-2 12 8 15 4-7 2-15 16 19 1 28Z"/>`).join('')}</g>`:''}
    <path d="M589 251h222m-222 23h222m-222 22h222" fill="none" stroke="#f4b962" stroke-width="3" opacity=".4"/>
    <g data-upgrade="convection" class="cc-line-extra">${fan(791,269,23)}</g>
    <g data-upgrade="rotary" class="cc-line-extra"><g transform="translate(669 273)"><circle r="32" fill="none" stroke="#b2baa1" stroke-width="2"/><g data-rack>${[0,60,120,180,240,300].map(a=>`<g transform="rotate(${a})"><path d="M0 0v-26" stroke="#b3b89d" stroke-width="2"/><g transform="translate(0 -25) scale(.16)"><use href="#${key}-cookie"/></g></g>`).join('')}</g></g></g>
    <g data-upgrade="deck" class="cc-line-extra">${rect(594,129,217,44,`url(#${key}-oven-paint)`,9)}${[141,156].map(y=>`<path d="M606 ${y}h191" stroke="#5e6857" stroke-width="8" stroke-linecap="round"/><path d="M608 ${y}h187" stroke="#edc68c" stroke-width="2" opacity=".7"/>`).join('')}</g>
    <path d="M604 181v-66h36v65" fill="url(#${key}-metal)" stroke="#90a197" stroke-width="2"/>
    <path d="M598 114h48" stroke="#536f69" stroke-width="7" stroke-linecap="round"/>
    <g data-steam transform="translate(617 110)" fill="none" stroke="#fff5d8" stroke-linecap="round" filter="url(#${key}-soft)">${[0,1,2].map((i)=>`<path data-wisp="${i}" d="M${i*13-8} 0q-12-14 0-29t0-24" stroke-width="${5-i}"/>`).join('')}</g>
    ${style.method==='solar'?`<g transform="translate(836 103)"><path d="M0 0l39-16 18 61-40 15Z" fill="#6e9da0" stroke="#c7b06f" stroke-width="5"/><path d="M9 13l39-16M13 29l39-16M10-4l17 58M23-9l16 57" fill="none" stroke="#a4c2b7" stroke-width="2"/></g>`:style.method==='steam'?'<path d="M855 317v-87q0-24 25-24v-39" fill="none" stroke="#b88051" stroke-width="11"/><path d="M859 317v-87q0-20 25-20" fill="none" stroke="#e2bb84" stroke-width="3"/>':''}
  </g>
  <g data-stage="cool"><path d="M894 300h121m-114 7h107" stroke="#829a8e" stroke-width="3"/>
    <g data-upgrade="conveyor" class="cc-line-extra"><path d="M893 244v96m122-96v96" stroke="#728e85" stroke-width="8"/>${rect(884,218,139,18,`url(#${key}-paint)`,6)}${[908,954,1000].map(x=>fan(x,263,16)).join('')}</g>
  </g>
  <g data-stage="pack"><path d="M1092 233v109m133-109v109" stroke="#7c9287" stroke-width="9"/>${rect(1080,219,156,25,`url(#${key}-paint)`,8)}
    <g data-missing="packing"><path d="M1111 252v35h91v-35" fill="none" stroke="#a5b9a5" stroke-width="6"/><path d="M1143 245h27v27h-27Z" fill="#b5c4ab"/><circle cx="1157" cy="278" r="9" fill="#dcc19b" stroke="#8e7959" stroke-width="2"/></g>
    <g data-upgrade="packing" class="cc-line-extra"><g data-packing-arm><path d="M1098 212l34-41 52 38-20 61" fill="none" stroke="#e2e5ce" stroke-width="16" stroke-linejoin="round"/><path d="M1098 212l34-41 52 38" fill="none" stroke="#819d8e" stroke-width="6"/><circle cx="1132" cy="171" r="13" fill="url(#${key}-paint)"/><circle cx="1184" cy="209" r="11" fill="url(#${key}-metal)"/><path d="M1151 273v13h26v-13" fill="none" stroke="#566e60" stroke-width="5"/></g><circle cx="1098" cy="212" r="15" fill="url(#${key}-paint)"/></g>
  </g>
  <g><path d="M1310 186h130v155h-130Z" fill="#6b827b"/><path d="M1320 211h120v130h-120Z" fill="#2b4142"/><path d="M1330 220h110v121h-110Z" fill="#1f3438"/><path d="M1330 220h110m-110 8h110m-110 8h110" stroke="#53685e" stroke-width="3"/><text x="1375" y="202" text-anchor="middle" fill="#f4e8be" font-family="sans-serif" font-size="10" letter-spacing="2" font-weight="700">DISPATCH</text><path d="M1303 188v156" stroke="#bac9b2" stroke-width="7"/></g>
  </g>
  <g class="cc-line-conveyor"><path d="M-25 316h1690v33H-25Z" fill="url(#${key}-belt)"/><path d="M-25 317h1690m-1690 31h1690" stroke="#a5b7a6" stroke-width="3"/>
    ${rect(-20,351,1680,23,`url(#${key}-metal)`,10)}<path d="M0 356h1640" stroke="#e6eddb" stroke-opacity=".5"/>
    ${Array.from({length:43},(_,i)=>`<g transform="translate(${i*40-12} 364)"><circle r="5" fill="#405d5a"/><g data-wheel><path d="M-4 0h8M0-4v8" stroke="#a1b6a7" stroke-width="1.4"/></g></g>`).join('')}
    <path d="M-10 380h1650" stroke="#405e58" stroke-width="4"/>
  </g>
  <g data-return-trays></g>
  <g data-batches></g>
  <g transform="translate(200 0)">
  <g class="cc-line-oven-glass" clip-path="url(#${key}-glass-clip)"><path d="M570 233h260v104H570Z" fill="url(#${key}-glass)"/><path d="M584 231l76 108m13-108 76 108" stroke="#f2fff0" stroke-opacity=".1" stroke-width="15"/></g>
  <path d="M569 239v95m263-95v95" stroke="#a2b3a0" stroke-width="5"/>
  <path d="M1371 238h69v113h-69Z" fill="#233a3c" opacity=".7"/><path d="M1368 237v114" stroke="#809b87" stroke-width="4"/>
  </g>
  <g data-stage-highlights fill="none" stroke="#fff0a4" stroke-width="4" opacity="0" pointer-events="none"><rect x="20" y="165" width="170" height="180" rx="20"/></g>
  ${LINE_STAGES.map((stage,i)=>`<g transform="translate(${stage.x} 529)"><circle cx="-31" cy="-3" r="10" fill="#f1e3c2" opacity=".9"/><text x="-31" y="1" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#5d7162">${i+1}</text><text x="-13" y="2" fill="${night?'#e4e3c9':'#374f48'}" font-size="12" font-family="sans-serif" font-weight="700">${stage.name.toUpperCase()}</text></g>`).join('')}
  </svg>`;
}

function batchArt(key) {
  return `<ellipse cy="13" rx="48" ry="9" fill="#0d2427" opacity=".2"/>
    <g data-tray><path d="M-50 7h100l-5 6h-91Z" fill="#92a69b"/><path d="M-46 7h92" stroke="#d2dac1" stroke-width="1.5"/></g>
    <g data-box-back opacity="0"><path d="M-46-9l13-13h80l6 13Z" fill="#74583d"/><path data-back-flap d="M-34-22l-8-22h88l1 22Z" fill="#d9b684" stroke="#b0895d" stroke-width="1"/></g>
    <g data-dough><path d="M-26 4q-9-7 1-19 8-12 26-10 23-3 30 13 6 11-4 17Z" fill="#e9c58d" stroke="#bd955f" stroke-width="1.3"/><path d="M-17-13q13-13 29-4M-15-3q7-6 17-5" fill="none" stroke="#f8deae" stroke-width="2" stroke-linecap="round"/><path d="M7-16l3 4m10 4-4 2m-24 6-4-1" stroke="#d2ad74" stroke-width="1"/></g>
    <g data-cookies opacity="0">${[-29,0,29].map((x,i)=>`<g data-cookie-piece transform="translate(${x} ${i%2?-3:0}) scale(.27 .18)"><use href="#${key}-plain-cookie"/><use data-topping="${x}" href="#${key}-cookie" opacity="0"/></g>`).join('')}</g>
    <g data-box-front opacity="0"><use href="#${key}-crate"/><path data-box-lid d="M-46-6l12-16h80l7 16Z" fill="#e3bf8b" opacity="0"/><path data-tape d="M-7-6l12-16h12L5-6v31H-7Z" fill="#edcf9d" opacity="0"/><path data-fold-flap d="M-46-6l-15-17h15L-31-6Z" fill="#e5c18d" stroke="#b58a58" stroke-width="1"/></g>`;
}

export function createCookieProduction(root, style, initialUpgrades = {}) {
  const key = `cookie-line-${++serial}`, wrapper = document.createElement('div'), filling = productionFilling(style.recipe);
  wrapper.className = 'cc-production';
  wrapper.innerHTML = `<div class="cc-line-viewport" tabindex="0" role="img" aria-label="A continuous cookie production line: batter feed, mix, roll, cut, fill, bake, cool, box, ship, and return empty trays. Filling station: ${esc(filling.label)}.">${factoryArt(style,key)}</div>
    <div class="cc-line-bottom"><nav aria-label="Follow the production line">${LINE_STAGES.map((stage,i)=>`<button type="button" data-follow="${stage.id}"><span>${i+1}</span> ${stage.name}<small></small></button>`).join('')}</nav><p class="cc-line-caption"></p></div>`;
  root.append(wrapper);
  const viewport = wrapper.querySelector('.cc-line-viewport'), svg = wrapper.querySelector('svg');
  const $ = selector => svg.querySelector(selector), $$ = selector => [...svg.querySelectorAll(selector)];
  const flow = createProductionFlow(initialUpgrades), media = matchMedia('(prefers-reduced-motion: reduce)');
  const nodes = new Map(), batchRoot = $('[data-batches]'), belt = $(`#${key}-belt`), rotors = $$('[data-rotor]'), wheels = $$('[data-wheel]');
  const returnNodes = new Map(), returnRoot = $('[data-return-trays]'), returnChain = $('[data-return-chain]');
  const cutter = $('[data-cutter]'), whisk = $('[data-whisk]'), rack = $('[data-rack]'), arm = $('[data-packing-arm]'), drop = $$('[data-dough-drop]'), wisps = $$('[data-wisp]'), heat = $('[data-oven-heat]'), fire = $('[data-fire]');
  const feed = $('[data-batter-flow]'), swirl = $('[data-dough-swirl]'), rollingPin = $('[data-rolling-pin]'), grain = $('[data-pin-grain]');
  const fillHead = $('[data-fill-head]'), ingredients = $$('[data-ingredient]'), fillDrops = $('[data-filling-drops]'), fillLight = $('[data-fill-light]');
  // The roller sits in front of the dough as it compresses the moving sheet.
  batchRoot.after(rollingPin);
  const highlight = $('[data-stage-highlights]'), highlightBox = highlight.querySelector('rect');
  const stageBounds = { mix:[17,165,164,180],roll:[170,213,229,132],cut:[385,177,125,170],fill:[529,84,201,263],bake:[728,124,345,223],cool:[1080,211,149,137],pack:[1270,158,364,192] };
  let signal = 0, stopped = false, disposed = false, lastReduced = media.matches;
  function update(upgrades) {
    setProductionEquipment(flow, upgrades);
    for (const el of $$('[data-upgrade]')) el.style.display = upgrades[el.dataset.upgrade] > 0 ? '' : 'none';
    for (const el of $$('[data-missing]')) el.style.display = upgrades[el.dataset.missing] > 0 ? 'none' : '';
    for (const button of wrapper.querySelectorAll('[data-follow]')) {
      const stage = LINE_STAGES.find(s => s.id === button.dataset.follow), count = stage.upgrades.reduce((n,id) => n + (upgrades[id] || 0), 0);
      button.querySelector('small').textContent = count ? `${count}x` : '';
      button.setAttribute('aria-label', stage.id === 'fill' ? `Fill and top: ${filling.label}. ${filling.kind==='none'?'Station on standby.':`${count} upgrades installed.`}` : `${stage.name}, ${count} ${count===1?'upgrade':'upgrades'} installed`);
      if (stage.id === 'fill' && filling.kind === 'none') button.querySelector('small').textContent = 'idle';
      button.dataset.equipped = String(stage.id === 'fill' ? filling.kind !== 'none' : count > 0);
    }
    wrapper.dataset.equipment = productionRates(upgrades).equipment;
    wrapper.dataset.targetSpeed = flow.targetSpeed.toFixed(2);
    draw();
  }
  function spotlight(id) {
    const stage = LINE_STAGES.find(s => s.id === id || s.upgrades.includes(id)); if (!stage) return;
    ['x','y','width','height'].forEach((attr,i) => highlightBox.setAttribute(attr,stageBounds[stage.id][i]));
    signal = 2; highlight.setAttribute('opacity','.8');
  }
  function draw() {
    const illustrative = media.matches ? [150,345,510,670,904,1146,1330,1538].map((x,id) => ({x,id:`still-${id}`})) : flow.batches;
    const ids = new Set(illustrative.map(batch => batch.id));
    for (const [id,node] of nodes) if (!ids.has(id)) { node.el.remove(); nodes.delete(id); }
    for (const batch of illustrative) {
      let node = nodes.get(batch.id);
      if (!node) {
        const el = document.createElementNS('http://www.w3.org/2000/svg','g'); el.innerHTML = batchArt(key); el.dataset.batch = batch.id;
        batchRoot.append(el); node = {el, dough:el.querySelector('[data-dough]'), cookies:el.querySelector('[data-cookies]'), pieces:[...el.querySelectorAll('[data-cookie-piece]')], toppings:[...el.querySelectorAll('[data-topping]')], tray:el.querySelector('[data-tray]'), back:el.querySelector('[data-box-back]'), front:el.querySelector('[data-box-front]'), flap:el.querySelector('[data-back-flap]'), fold:el.querySelector('[data-fold-flap]'), lid:el.querySelector('[data-box-lid]'), tape:el.querySelector('[data-tape]')}; nodes.set(batch.id,node);
      }
      const p = productionBatchAppearance(batch.x), sealing = p.sealed;
      node.el.setAttribute('transform',`translate(${batch.x.toFixed(2)} 330)`);
      node.el.dataset.phase = p.sealed === 1 ? 'shipped' : p.boxed > 0 ? 'boxing' : p.baked === 1 ? 'baked' : filling.kind !== 'none' && p.filled === 1 ? 'filled' : p.cut === 1 ? 'cut' : p.rolled === 1 ? 'rolled' : 'dough';
      node.dough.setAttribute('transform',`scale(${1+p.rolled*.7} ${1-p.rolled*.62})`); node.dough.setAttribute('opacity',1-p.cut);
      node.cookies.setAttribute('opacity',p.cut * (1-clamp((sealing-.12)/.65)));
      node.pieces.forEach(el=>el.setAttribute('filter',`brightness(${1.5-p.baked*.5}) saturate(${.55+p.baked*.45})`));
      node.toppings.forEach(el=>el.setAttribute('opacity', filling.kind === 'none' ? 1 : productionBatchAppearance(batch.x + Number(el.dataset.topping)).filled));
      node.tray.setAttribute('opacity',1-p.boxed);
      node.back.setAttribute('opacity',p.boxed); node.front.setAttribute('opacity',p.boxed);
      node.flap.setAttribute('d',`M-34-22l${-8+sealing*8} ${-22+sealing*38}h88l${1-sealing*9} ${22-sealing*38}Z`);
      node.fold.setAttribute('d',`M-46-6l${-15+sealing*61} ${-17+sealing*1}h15L${-31+sealing*77}-6Z`);
      node.lid.setAttribute('opacity',sealing); node.tape.setAttribute('opacity',clamp((sealing-.5)*2));
    }
    const returns = media.matches ? [30,400,760,1120,TRAY_RETURN_LENGTH-50].map((distance,id)=>({distance,id:`still-${id}`})) : flow.returns;
    const returningIds = new Set(returns.map(tray=>tray.id));
    for (const [id,node] of returnNodes) if (!returningIds.has(id)) { node.remove(); returnNodes.delete(id); }
    for (const tray of returns) {
      let node = returnNodes.get(tray.id);
      if (!node) {
        node = document.createElementNS('http://www.w3.org/2000/svg','g'); node.dataset.returnTray = tray.id;
        node.innerHTML = `<path d="M-46 0h92l-5 6h-82Z" fill="url(#${key}-metal)" stroke="#637f73" stroke-width="1"/><path d="M-40 0h80" stroke="#e9f0d9" stroke-width="2"/>`;
        returnRoot.append(node); returnNodes.set(tray.id,node);
      }
      const p = returnTrayPose(tray.distance);
      node.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.rotation.toFixed(2)})`);
    }
    const distance = media.matches ? 0 : flow.distance;
    belt.setAttribute('patternTransform',`translate(${(distance%28).toFixed(2)} 0)`);
    returnChain.setAttribute('stroke-dashoffset',-distance%14);
    feed.setAttribute('stroke-dashoffset',(-distance*.6)%29);
    swirl.setAttribute('d',`M42 258q41 ${-20+Math.sin(distance*.06)*7} 100-1`);
    const rolling = Math.max(0,...illustrative.map(batch=>Math.max(0,1-Math.abs(batch.x-276)/65)));
    rollingPin.setAttribute('transform',`translate(${(Math.sin(distance*.055)*rolling*9).toFixed(2)} ${(rolling*13).toFixed(2)})`);
    grain.setAttribute('transform',`translate(0 ${(Math.sin(distance*.1)*10).toFixed(2)})`);
    rotors.forEach(el=>el.setAttribute('transform',`rotate(${(distance*4)%360})`)); wheels.forEach(el=>el.setAttribute('transform',`rotate(${(distance*11)%360})`));
    const press = Math.max(0,...illustrative.map(batch=>Math.max(0,1-Math.abs(batch.x-440)/35)));
    cutter.setAttribute('transform',`translate(0 ${(Math.sin(press*Math.PI/2)*14).toFixed(2)})`);
    whisk.setAttribute('transform',`translate(95 252) scale(${.7+Math.cos(distance*.1)*.25} 1) translate(-95 -252)`);
    rack.setAttribute('transform',`rotate(${(distance*.8)%360})`);
    const packing = Math.max(0,...illustrative.map(batch=>Math.max(0,1-Math.abs(batch.x-1365)/65)));
    arm.setAttribute('transform',`rotate(${packing*13-5} 1098 212)`);
    const fillingBatch = filling.kind === 'none' ? 0 : Math.max(0,...illustrative.map(batch=>Math.max(0,1-Math.abs(batch.x-630)/64)));
    fillHead.setAttribute('transform',`translate(0 ${(fillingBatch*5).toFixed(2)})`);
    fillDrops.setAttribute('opacity',Math.min(1,fillingBatch*3));
    fillLight.setAttribute('fill',filling.kind==='none'?'#a1a696':fillingBatch>.1?'#b5e6a1':'#5c9d77');
    ingredients.forEach((el,i)=>{const phase=(distance*.012+i*.193)%1;el.setAttribute('transform',`translate(${604+(i%3)*26+Math.sin(i*8)*4} ${280+phase*phase*42}) rotate(${phase*210+i*29})`);});
    drop.forEach((el,i)=>el.setAttribute('opacity',.45+.5*Math.sin(distance*.08+i)**2));
    wisps.forEach((el,i)=>{ const phase=(distance*.004+i/3)%1; el.setAttribute('transform',`translate(${Math.sin(phase*6+i)*5} ${-phase*25})`); el.setAttribute('opacity',Math.sin(phase*Math.PI)*.52); });
    heat.setAttribute('opacity',.9+Math.sin(distance*.035)*.05);
    fire?.setAttribute('opacity',.7+Math.sin(distance*.09)*.18);
  }
  function caption() {
    wrapper.querySelector('.cc-line-caption').textContent = media.matches ? 'Reduced motion: a still view of every step. Swipe or use the stages to explore.' : stopped ? 'Production paused. Your batches will continue from here.' : flow.auto ? 'Follow each batch from dough to delivery. Swipe or choose a stage to look closer.' : flow.batches.length || flow.queued ? 'Your hand-baked batches are on their way. Machines keep the line running automatically.' : 'Tap the cookie to send your first batch down the line.';
  }
  function advance(seconds, paused = false) {
    if (disposed) return;
    // Some browsers coalesce rapid media preference changes. Keep the caption
    // and the still scene in sync even when a change event is skipped.
    if (lastReduced !== media.matches) reducedMotion();
    if (stopped !== paused) { stopped = paused; caption(); }
    const wasActive = flow.batches.length || flow.queued || flow.returns.length;
    const changed = !media.matches && advanceProductionFlow(flow,seconds,paused);
    if (changed) { draw(); if (wasActive && !flow.batches.length && !flow.queued && !flow.returns.length) caption(); }
    if (!paused && seconds > 0 && signal > 0) { signal = Math.max(0,signal-seconds); highlight.setAttribute('opacity',signal*.4); }
    wrapper.dataset.speed = flow.speed.toFixed(2);
    wrapper.dataset.shipped = flow.shipped;
    wrapper.dataset.returned = flow.returned;
  }
  function follow(event) {
    const button = event.target.closest('[data-follow]'); if (!button) return;
    const stage = LINE_STAGES.find(s=>s.id===button.dataset.follow), factor = svg.getBoundingClientRect().width / LINE_WIDTH;
    viewport.scrollTo({ left: stage.x * factor - viewport.clientWidth/2, behavior:media.matches?'instant':'smooth' }); spotlight(stage.id);
  }
  function reducedMotion() { lastReduced = media.matches; draw(); caption(); }
  wrapper.addEventListener('click',follow); media.addEventListener('change',reducedMotion);
  update(initialUpgrades); caption();
  return {
    update(upgrades) { update(upgrades); caption(); }, advance,
    bake() { queueProductionBatch(flow); caption(); },
    purchased(id) { spotlight(id); },
    get pace() { return flow.targetSpeed / 52; },
    dispose() { disposed=true; media.removeEventListener('change',reducedMotion); wrapper.remove(); nodes.clear(); returnNodes.clear(); },
  };
}
