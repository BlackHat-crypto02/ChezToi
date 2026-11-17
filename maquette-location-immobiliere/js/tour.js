/* =====================================================================
   DomiLoc — Visites virtuelles 360° et maquette 3D (démonstration)
   - 360° : cube panoramique en CSS 3D, navigation entre pièces (hotspots),
     rotation glisser, zoom molette/pincement, auto-rotation, gyroscope
   - 3D : maquette « dollhouse » extrudée en CSS 3D, rotation/inclinaison,
     sélection de pièce → entrée en 360°
   En production : panoramas équirectangulaires + modèle Gaussian Splatting /
   glTF rendus en WebGL (Three.js côté web, moteur natif côté Flutter).
   ===================================================================== */

function tourRooms(p) {
  if (!p) return [];
  const rooms = [];
  if (p.type === 'studio' || p.type === 'chambre') {
    rooms.push({ id: 'main', name: 'Pièce principale', kind: p.type === 'studio' ? 'salon' : 'chambre' });
    if (p.equipments.includes('cuisine') || p.type === 'studio') rooms.push({ id: 'cuis', name: 'Coin cuisine', kind: 'cuisine' });
    rooms.push({ id: 'sdb', name: "Salle d'eau", kind: 'sdb' });
  } else {
    rooms.push({ id: 'salon', name: 'Salon', kind: 'salon' }, { id: 'cuis', name: 'Cuisine', kind: 'cuisine' });
    for (let i = 0; i < Math.min(p.bedrooms, 3); i++) rooms.push({ id: 'ch' + i, name: i ? 'Chambre ' + (i + 1) : 'Chambre principale', kind: 'chambre' });
    rooms.push({ id: 'sdb', name: 'Salle de bain', kind: 'sdb' });
  }
  if (['piscine', 'jardin', 'terrasse', 'balcon'].some(e => p.equipments.includes(e)))
    rooms.push({ id: 'ext', name: p.equipments.includes('piscine') ? 'Piscine & jardin' : p.equipments.includes('jardin') ? 'Jardin' : p.equipments.includes('terrasse') ? 'Terrasse' : 'Balcon', kind: 'ext' });
  return rooms;
}

/* ---------- Textures des faces du cube (SVG 1000×1000) ---------- */
const _faceCache = {};
function svgURI(s) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">' + s + '</svg>'); }
function faceImg(kind, face, hue, p) {
  const key = [kind, face, hue, p && p.equipments.includes('piscine')].join('|'); if (_faceCache[key]) return _faceCache[key];
  const wall = `hsl(${hue},22%,86%)`, dark = `hsl(${hue},18%,70%)`, acc = `hsl(${(hue + 180) % 360},42%,45%)`, wood = 'hsl(28,42%,36%)';
  let s = '';
  const door = x => `<rect x="${x - 12}" y="408" width="244" height="592" fill="#f8fafc"/><rect x="${x}" y="420" width="220" height="580" fill="hsl(28,30%,22%)"/><rect x="${x + 18}" y="440" width="184" height="560" fill="hsl(${hue},10%,${kind === 'ext' ? 60 : 40}%)" opacity=".55"/><circle cx="${x + 196}" cy="720" r="9" fill="#fde68a"/>`;
  const windowR = (x, w) => `<rect x="${x - 70}" y="200" width="70" height="520" fill="${acc}" opacity=".75"/><rect x="${x + w}" y="200" width="70" height="520" fill="${acc}" opacity=".75"/>
    <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs>
    <rect x="${x}" y="230" width="${w}" height="380" fill="url(#sk)"/><path d="M${x} 520 q${w / 4} -50 ${w / 2} -10 t${w / 2} -20 V610 H${x}z" fill="hsl(120,35%,45%)"/>
    <rect x="${x}" y="230" width="${w}" height="380" fill="none" stroke="#fff" stroke-width="16"/><path d="M${x + w / 2} 230v380M${x} 420h${w}" stroke="#fff" stroke-width="10"/>`;
  const base = `<rect width="1000" height="1000" fill="${wall}"/><rect y="0" width="1000" height="16" fill="#fff" opacity=".7"/><rect y="965" width="1000" height="35" fill="${dark}"/>`;
  const plant = x => `<rect x="${x - 35}" y="880" width="70" height="85" rx="10" fill="hsl(20,40%,45%)"/><path d="M${x} 880c-60-60-50-140-10-190M${x} 880c50-70 70-130 30-200M${x} 880c-10-90 20-160 0-230" stroke="hsl(130,45%,32%)" stroke-width="22" fill="none" stroke-linecap="round"/>`;
  if (kind === 'ext') {
    s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs><rect width="1000" height="1000" fill="url(#sky)"/>
    <rect y="600" width="1000" height="400" fill="hsl(105,40%,42%)"/>`;
    if (face === 0) s += `<rect y="560" width="1000" height="50" fill="hsl(195,70%,50%)"/><rect x="760" y="300" width="22" height="320" fill="#7c5a3a"/><path d="M771 300c-120-30-170 20-190 60M771 300c120-40 170 10 190 55M771 300c-70-90-150-90-180-60M771 300c80-90 150-80 175-50" stroke="hsl(120,45%,33%)" stroke-width="34" fill="none" stroke-linecap="round"/>`;
    if (face === 1) s += `<rect y="470" width="1000" height="150" fill="hsl(130,35%,30%)"/>${[100, 300, 500, 700, 900].map(x => `<circle cx="${x}" cy="480" r="80" fill="hsl(130,38%,34%)"/>`).join('')}<rect x="380" y="760" width="240" height="30" fill="${wood}"/><rect x="400" y="790" width="16" height="80" fill="${wood}"/><rect x="584" y="790" width="16" height="80" fill="${wood}"/>`;
    if (face === 2) s += `<rect x="80" y="200" width="840" height="420" fill="hsl(${hue},25%,92%)"/><polygon points="60,210 500,60 940,210" fill="hsl(${(hue + 15) % 360},45%,38%)"/>${[160, 640].map(x => `<rect x="${x}" y="300" width="200" height="160" fill="#bae6fd" stroke="#fff" stroke-width="12"/>`).join('')}${door(390).replace(/408/g, '300').replace(/420/g, '320')}`;
    if (face === 3) s += `<path d="M0 640h1000" stroke="#fff" stroke-width="8"/>${Array.from({ length: 21 }, (_, i) => `<rect x="${i * 50}" y="520" width="10" height="120" fill="#fff"/>`).join('')}${plant(200)}`;
  } else if (kind === 'salon') {
    s = base + [windowR(330, 340) + plant(160),
      `<rect x="380" y="300" width="240" height="170" fill="${acc}" opacity=".35" stroke="#fff" stroke-width="10"/><rect x="180" y="640" width="640" height="150" rx="40" fill="${acc}"/><rect x="150" y="740" width="700" height="200" rx="40" fill="${acc}"/><rect x="230" y="700" width="150" height="90" rx="20" fill="#fff" opacity=".45"/><rect x="620" y="700" width="150" height="90" rx="20" fill="#fff" opacity=".45"/>`,
      `<rect x="250" y="820" width="500" height="140" fill="${wood}"/><rect x="330" y="500" width="340" height="210" rx="8" fill="#0f172a"/><rect x="345" y="515" width="310" height="180" fill="hsl(220,40%,25%)"/><rect x="120" y="250" width="16" height="560" fill="${wood}"/><rect x="80" y="380" width="200" height="12" fill="${wood}"/><rect x="80" y="520" width="200" height="12" fill="${wood}"/><rect x="760" y="300" width="160" height="110" fill="${acc}" opacity=".3"/>`,
      door(390) + plant(800)][face];
  } else if (kind === 'chambre') {
    s = base + [windowR(360, 280),
      `<rect x="250" y="520" width="500" height="260" rx="20" fill="hsl(${hue},35%,48%)"/><rect x="220" y="760" width="560" height="200" fill="#fff"/><rect x="220" y="820" width="560" height="140" fill="${acc}" opacity=".75"/><rect x="290" y="700" width="170" height="80" rx="30" fill="#fff"/><rect x="540" y="700" width="170" height="80" rx="30" fill="#fff"/><rect x="90" y="820" width="110" height="140" fill="${wood}"/><rect x="800" y="820" width="110" height="140" fill="${wood}"/><circle cx="145" cy="780" r="34" fill="#fde68a"/>`,
      `<rect x="230" y="260" width="540" height="705" fill="${wood}"/><path d="M500 260v705M365 260v705M635 260v705" stroke="rgba(0,0,0,.25)" stroke-width="6"/><circle cx="480" cy="620" r="10" fill="#fde68a"/><circle cx="520" cy="620" r="10" fill="#fde68a"/>`,
      door(420) + `<rect x="120" y="280" width="160" height="420" rx="70" fill="#e2e8f0" stroke="#fff" stroke-width="14"/>`][face];
  } else if (kind === 'cuisine') {
    const counter = `<rect y="720" width="1000" height="245" fill="hsl(${hue},15%,96%)"/><rect y="700" width="1000" height="30" fill="hsl(30,12%,30%)"/>${[40, 280, 520, 760].map(x => `<rect x="${x}" y="750" width="200" height="190" fill="${acc}" opacity=".8"/><rect x="${x + 90}" y="770" width="20" height="50" fill="#fff"/>`).join('')}`;
    s = base + [windowR(380, 240) + counter + `<rect x="420" y="690" width="160" height="20" fill="#94a3b8"/>`,
      counter + `${[40, 280, 520, 760].map(x => `<rect x="${x}" y="230" width="200" height="220" fill="${acc}" opacity=".7"/>`).join('')}<rect x="400" y="470" width="200" height="90" fill="#cbd5e1"/>${[440, 520].map(x => `<circle cx="${x + 20}" cy="690" r="22" fill="#1e293b"/>`).join('')}`,
      `<rect x="600" y="300" width="240" height="665" rx="16" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="8"/><path d="M600 560h240" stroke="#cbd5e1" stroke-width="8"/><rect x="805" y="380" width="12" height="120" fill="#94a3b8"/><rect x="120" y="760" width="360" height="30" fill="${wood}"/><rect x="140" y="790" width="20" height="170" fill="${wood}"/><rect x="440" y="790" width="20" height="170" fill="${wood}"/>`,
      door(390)][face];
  } else if (kind === 'sdb') {
    const tiles = `<rect width="1000" height="1000" fill="hsl(${hue},30%,92%)"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 125} 0v1000M0 ${i * 125}h1000" stroke="#fff" stroke-width="5"/>`).join('')}`;
    s = tiles + [`<rect x="400" y="220" width="200" height="160" fill="#bae6fd" stroke="#fff" stroke-width="12"/>`,
      `<rect x="150" y="740" width="700" height="225" rx="60" fill="#fff" stroke="#e2e8f0" stroke-width="8"/><rect x="700" y="220" width="20" height="300" fill="#94a3b8"/><circle cx="710" cy="220" r="45" fill="#cbd5e1"/>`,
      `<rect x="340" y="700" width="320" height="265" fill="${acc}" opacity=".8"/><rect x="340" y="660" width="320" height="50" fill="#fff"/><rect x="380" y="280" width="240" height="320" rx="20" fill="#e0f2fe" stroke="#fff" stroke-width="14"/>`,
      door(390) + `<rect x="120" y="440" width="180" height="12" fill="#94a3b8"/><rect x="140" y="452" width="140" height="180" fill="${acc}" opacity=".6"/>`][face];
  }
  return (_faceCache[key] = svgURI(s));
}
function floorImg(kind, hue, p) {
  const key = 'f' + kind + hue + (p && p.equipments.includes('piscine')); if (_faceCache[key]) return _faceCache[key];
  let s;
  if (kind === 'ext') s = `<rect width="1000" height="1000" fill="hsl(105,40%,42%)"/>${p && p.equipments.includes('piscine') ? '<rect x="250" y="200" width="500" height="600" rx="30" fill="hsl(195,80%,55%)" stroke="#f1f5f9" stroke-width="40"/><path d="M300 400q50-20 100 0t100 0 100 0 100 0M300 600q50-20 100 0t100 0 100 0 100 0" stroke="#fff" stroke-width="8" fill="none" opacity=".6"/>' : '<rect x="400" y="0" width="200" height="1000" fill="hsl(35,25%,70%)"/>'}`;
  else if (kind === 'cuisine' || kind === 'sdb') s = `<rect width="1000" height="1000" fill="hsl(${kind === 'sdb' ? hue : 35},${kind === 'sdb' ? 20 : 15}%,${kind === 'sdb' ? 82 : 78}%)"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 125} 0v1000M0 ${i * 125}h1000" stroke="rgba(0,0,0,.12)" stroke-width="4"/>`).join('')}`;
  else s = `<rect width="1000" height="1000" fill="hsl(30,38%,55%)"/>${Array.from({ length: 13 }, (_, i) => `<path d="M0 ${i * 80}h1000" stroke="rgba(0,0,0,.12)" stroke-width="4"/><path d="M${(i * 230) % 1000} ${i * 80}v80" stroke="rgba(0,0,0,.1)" stroke-width="4"/>`).join('')}${kind === 'salon' ? '<rect x="250" y="300" width="500" height="400" rx="20" fill="hsl(' + ((hue + 180) % 360) + ',35%,55%)" opacity=".8"/>' : ''}`;
  return (_faceCache[key] = svgURI(s));
}
function ceilImg(kind) {
  if (kind === 'ext') return svgURI('<defs><radialGradient id="g"><stop offset="0" stop-color="#e0f2fe"/><stop offset="1" stop-color="#0ea5e9"/></radialGradient></defs><rect width="1000" height="1000" fill="url(#g)"/><circle cx="650" cy="350" r="70" fill="#fef3c7"/>');
  return svgURI('<rect width="1000" height="1000" fill="#f8fafc"/><circle cx="500" cy="500" r="160" fill="#fff7d6" opacity=".7"/><circle cx="500" cy="500" r="60" fill="#fde68a"/>');
}

/* ---------- Plan des pièces (2D/3D) ---------- */
function planLayout(rooms, p) {
  const hub = rooms[0]; const kit = rooms.find(r => r.kind === 'cuisine'); const sdb = rooms.find(r => r.kind === 'sdb'); const ext = rooms.find(r => r.kind === 'ext');
  const rest = rooms.filter(r => r !== hub && r !== kit && r !== sdb && r !== ext);
  const cells = [{ r: hub, x: 0, y: 0, w: 6, h: 5 }];
  if (kit) cells.push({ r: kit, x: 6, y: 0, w: 4, h: sdb ? 3 : 5 }); if (sdb) cells.push({ r: sdb, x: 6, y: kit ? 3 : 0, w: 4, h: kit ? 2 : 5 });
  const W = Math.max(10, rest.length * 4);
  rest.forEach((r, i) => cells.push({ r, x: i * (W / rest.length), y: 5, w: W / rest.length, h: 4 }));
  if (W > 10) cells[0].w = W - 4, kit && (cells[1].x = W - 4), sdb && (cells.find(c => c.r === sdb).x = W - 4);
  const H = (rest.length ? 9 : 5) + (ext ? 3 : 0);
  if (ext) cells.push({ r: ext, x: 0, y: H - 3, w: W, h: 3 });
  const interior = cells.filter(c => c.r.kind !== 'ext').reduce((a, c) => a + c.w * c.h, 0);
  const f = (p ? p.area : 60) / interior;
  cells.forEach(c => c.m2 = Math.round(c.w * c.h * f));
  return { cells, W, H };
}

/* ---------- Visionneuse ---------- */
const TourViewer = {
  mount(el, p, opts = {}) {
    if (!el || !p) return;
    const tour = opts.tourId ? S.tours.find(t => t.id === opts.tourId) : tourOf(p) || latestTour(p);
    const type = tour ? tour.type : '360';
    const rooms = (tour && tour.rooms && tour.rooms.length) ? tour.rooms : tourRooms(p);
    const V = { el, p, rooms, type, mode: type === '3d' && opts.mode !== '360' ? '3d' : '360', cur: 0, yaw: -20, pitch: 0, fov: 330, auto: false, gyro: false, spin: -30, tilt: 58, zoom: 1, sel: null, alive: true, opts };
    this.shell(V);
    V.root.addEventListener('click', e => { const b = e.target.closest('[data-tv]'); if (b && !V._dragged) this.cmd(V, b.dataset.tv, b.dataset); });
    const loop = () => {
      if (!el.isConnected || !V.alive) { V.alive = false; window.removeEventListener('deviceorientation', V._gyro); return; }
      if (V.auto && !V._down) { if (V.mode === '360') { V.yaw += 0.12; this.apply(V); } else { V.spin += 0.25; this.applyDoll(V); } }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return V;
  },
  shell(V) {
    const { p, rooms } = V; const close = V.opts.closeAct || 'mBack';
    V.el.innerHTML = `<div class="tv"><div class="tv-stage" id="tv-stage"></div><div class="tv-fade" id="tv-fade"></div>
    <div class="tv-top"><button class="round-btn" data-act="${close}" aria-label="Fermer">${ic(close === 'mBack' ? 'back' : 'close')}</button><div class="tv-title"><b>${esc(p.title)}</b><small id="tv-room"></small></div>
    ${V.type === '3d' ? `<div class="tv-mode"><button data-tv="mode" data-m="360" class="${V.mode === '360' ? 'on' : ''}">360°</button><button data-tv="mode" data-m="3d" class="${V.mode === '3d' ? 'on' : ''}">3D</button></div>` : '<span class="tv-badge">360°</span>'}</div>
    <div class="tv-hint" id="tv-hint"></div><div class="tv-plan" id="tv-plan"></div>
    <div class="tv-bottom"><div class="tv-rooms" id="tv-rooms">${rooms.map((r, i) => `<button data-tv="room" data-i="${i}">${esc(r.name)}</button>`).join('')}</div>
    <div class="tv-ctrl"><button data-tv="zoom" data-d="-1" title="Dézoomer">${ic('zoomout')}</button><button data-tv="zoom" data-d="1" title="Zoomer">${ic('zoomin')}</button><button data-tv="auto" id="tv-auto" title="Rotation automatique">${ic('rotate')}</button><button data-tv="gyro" id="tv-gyro" title="Gyroscope">${ic('locate')}</button><button data-tv="info" title="Détails du logement">${ic('info')}</button><button data-tv="fs" title="Plein écran">${ic('expand')}</button></div></div>
    <div class="tv-info hidden" id="tv-info"></div></div>`;
    V.root = V.el.querySelector('.tv');
    this.build(V);
  },
  build(V) {
    const stage = V.root.querySelector('#tv-stage');
    V.root.querySelectorAll('[data-tv="mode"]').forEach(b => b.classList.toggle('on', b.dataset.m === V.mode));
    if (V.mode === '360') this.buildPano(V, stage); else this.buildDoll(V, stage);
    this.ui(V);
  },
  ui(V) {
    const r = V.rooms[V.cur];
    V.root.querySelector('#tv-room').textContent = V.mode === '360' ? r.name + ' · ' + (V.cur + 1) + '/' + V.rooms.length : 'Maquette 3D · ' + V.rooms.length + ' espaces';
    V.root.querySelector('#tv-hint').textContent = V.mode === '360' ? 'Glissez pour regarder autour · touchez les flèches pour changer de pièce' : 'Glissez pour tourner la maquette · touchez une pièce pour y entrer';
    V.root.querySelectorAll('#tv-rooms button').forEach((b, i) => b.classList.toggle('on', V.mode === '360' && i === V.cur));
    V.root.querySelector('#tv-auto').classList.toggle('on', V.auto);
    V.root.querySelector('#tv-gyro').classList.toggle('on', V.gyro);
    const { cells, W, H } = planLayout(V.rooms, V.p); const s = 70 / Math.max(W, H);
    V.root.querySelector('#tv-plan').innerHTML = V.mode === '360' ? `<div style="width:${W * s}px;height:${H * s}px">${cells.map(c => `<button data-tv="room" data-i="${V.rooms.indexOf(c.r)}" class="${c.r === r ? 'on' : ''} k-${c.r.kind}" style="left:${c.x * s}px;top:${c.y * s}px;width:${c.w * s}px;height:${c.h * s}px" title="${esc(c.r.name)}"></button>`).join('')}</div>` : '';
  },
  links(V) { const n = V.rooms.length; if (V.cur === 0) return V.rooms.map((_, i) => i).filter(i => i); const out = [0]; if (V.cur + 1 < n) out.push(V.cur + 1); if (V.cur > 1) out.push(V.cur - 1); return out; },
  buildPano(V, stage) {
    const r = V.rooms[V.cur]; const hue = (V.p.hue || 100) + V.cur * 20;
    const faces = [['front', 'translateZ(-500px)'], ['right', 'rotateY(-90deg) translateZ(-500px)'], ['back', 'rotateY(180deg) translateZ(-500px)'], ['left', 'rotateY(90deg) translateZ(-500px)'], ['top', 'rotateX(-90deg) translateZ(-500px)'], ['bottom', 'rotateX(90deg) translateZ(-500px)']];
    const hots = [[], [], [], [], [], []];
    // Chaque élément est positionné individuellement dans l'espace 3D (faces découpées en tuiles,
    // repères indépendants) : aucun élément ne traverse le plan de la caméra → rendu fiable.
    const at = (f, x, y) => `transform:${faces[f][1]} translate(${x * 10 - 500}px, ${y * 10 - 500}px) translate(-50%, -50%)`;
    this.links(V).forEach((j, k) => { const f = [3, 1, 2, 0][k % 4]; const x = f === 3 ? 50 : 22 + Math.floor(k / 4) * 50; hots[f].push(`<button class="hot nav" data-tv="room" data-i="${j}" style="${at(f, x, 62)}"><i>${ic('up')}</i><span>${esc(V.rooms[j].name)}</span></button>`); });
    const eqHot = { salon: ['clim', 'internet', 'ventilo', 'meubles'], chambre: ['clim', 'meubles', 'ventilo'], cuisine: ['cuisine', 'eau', 'chauffeeau'], sdb: ['chauffeeau', 'eau'], ext: ['piscine', 'jardin', 'groupe', 'terrasse', 'parking'] }[r.kind] || [];
    eqHot.filter(e => V.p.equipments.includes(e)).slice(0, 3).forEach((e, i) => { const q = equipment(e); const f = [1, 2, 0][i]; hots[f].push(`<button class="hot info" data-tv="hotinfo" data-t="${esc(q.icon + ' ' + q.name)}" style="${at(f, 30 + i * 20, 38 + i * 6)}"><i>i</i><span>${esc(q.icon + ' ' + q.name)}</span></button>`); });
    const N = 4, s = 1000 / N;
    const tiles = (t) => { let h = ''; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) h += `<div class="tile" style="transform:${t} translate(${(i + .5) * s - 500}px, ${(j + .5) * s - 500}px);background-position:${-i * s}px ${-j * s}px"></div>`; return h; };
    stage.innerHTML = `<div class="pano" id="pano"><div class="cube" id="cube">${faces.map(([n, t], i) => `<div class="face f-${n}" style="--img:url('${i < 4 ? faceImg(r.kind, i, hue, V.p) : i === 4 ? ceilImg(r.kind) : floorImg(r.kind, hue, V.p)}')">${tiles(t)}</div>`).join('')}${hots.flat().join('')}</div></div>`;
    V.pano = stage.querySelector('#pano'); V.cube = stage.querySelector('#cube');
    this.apply(V); this.drag(V, V.pano, (dx, dy) => { V.yaw -= dx * 0.22; V.pitch = clamp(V.pitch + dy * 0.18, -80, 80); this.apply(V); }, f => { V.fov = clamp(V.fov * f, 180, 800); this.apply(V); });
  },
  apply(V) { if (!V.cube) return; V.pano.style.perspective = V.fov + 'px'; V.cube.style.transform = `translateZ(${V.fov}px) rotateX(${V.pitch}deg) rotateY(${V.yaw}deg)`; },
  buildDoll(V, stage) {
    const { cells, W, H } = planLayout(V.rooms, V.p); const s = Math.floor(260 / Math.max(W, H)); const WH = 34;
    const wall = (x1, y1, x2, y2, h, cls) => {
      const L = Math.hypot(x2 - x1, y2 - y1); const vert = x1 === x2;
      return `<div class="dh-wall ${cls || ''}" style="left:${x1}px;top:${y1}px;width:${L}px;height:${h}px;transform:${vert ? 'rotateZ(90deg) ' : ''}rotateX(90deg)"></div>`;
    };
    const box = (x, y, w, d, h, color) => `<div class="dh-box" style="left:${x}px;top:${y}px;width:${w}px;height:${d}px;transform:translateZ(${h}px);background:${color}"></div>` +
      [[x, y, x + w, y], [x, y + d, x + w, y + d], [x, y, x, y + d], [x + w, y, x + w, y + d]].map(([a, b, c, e]) => `<div class="dh-side" style="left:${a}px;top:${b}px;width:${Math.hypot(c - a, e - b)}px;height:${h}px;background:${color};transform:${a === c ? 'rotateZ(90deg) ' : ''}rotateX(90deg)"></div>`).join('');
    let html = '';
    cells.forEach((c, idx) => {
      const x = c.x * s, y = c.y * s, w = c.w * s, h = c.h * s; const ri = V.rooms.indexOf(c.r);
      html += `<div class="dh-floor k-${c.r.kind} ${V.sel === ri ? 'sel' : ''}" data-tv="dhroom" data-i="${ri}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><span>${esc(c.r.name)}<small>${c.m2} m²</small></span></div>`;
      const wh = c.r.kind === 'ext' ? 8 : WH; const cls = c.r.kind === 'ext' ? 'fence' : '';
      html += wall(x, y, x + w, y, wh, cls) + wall(x, y, x, y + h, wh, cls) + wall(x + w, y, x + w, y + h, wh * .5, cls + ' low') + wall(x, y + h, x + w, y + h, wh * .5, cls + ' low');
      const cx = x + w / 2, cy = y + h / 2; const acc = `hsl(${((V.p.hue || 100) + 180) % 360},40%,50%)`;
      if (c.r.kind === 'salon') html += box(x + 8, y + h - 26, w * .5, 16, 12, acc) + box(cx - 14, cy - 8, 28, 16, 6, 'hsl(28,40%,40%)');
      if (c.r.kind === 'chambre') html += box(cx - w * .25, y + 6, w * .5, h * .55, 10, '#f1f5f9') + box(x + 4, y + 6, 12, 12, 9, 'hsl(28,40%,40%)');
      if (c.r.kind === 'cuisine') html += box(x + 4, y + 4, w - 8, 12, 16, '#e2e8f0') + box(x + w - 20, y + h - 26, 14, 20, 30, '#cbd5e1');
      if (c.r.kind === 'sdb') html += box(x + 4, y + 4, w * .6, 14, 9, '#fff');
      if (c.r.kind === 'ext' && V.p.equipments.includes('piscine')) html += `<div class="dh-pool" style="left:${x + w * .3}px;top:${y + h * .2}px;width:${w * .4}px;height:${h * .6}px"></div>`;
    });
    stage.innerHTML = `<div class="dh-stage" id="dh"><div class="dh-world" id="dhw" style="width:${W * s}px;height:${H * s}px;margin-left:${-W * s / 2}px;margin-top:${-H * s / 2}px">${html}</div></div>
    <div class="dh-legend">${V.sel != null ? `<b>${esc(V.rooms[V.sel].name)}</b> · ${cells.find(c => c.r === V.rooms[V.sel]).m2} m² <button class="btn sm pri" data-tv="enter" data-i="${V.sel}">Entrer en 360°</button>` : 'Surface totale ≈ ' + V.p.area + ' m² · ' + V.p.bedrooms + ' chambre(s)'}</div>`;
    V.cube = null; V.dhw = stage.querySelector('#dhw');
    this.applyDoll(V);
    this.drag(V, stage.querySelector('#dh'), (dx, dy) => { V.spin += dx * 0.4; V.tilt = clamp(V.tilt - dy * 0.3, 0, 80); this.applyDoll(V); }, f => { V.zoom = clamp(V.zoom / f, .5, 2.4); this.applyDoll(V); });
  },
  applyDoll(V) { if (V.dhw) V.dhw.style.transform = `rotateX(${V.tilt}deg) rotateZ(${V.spin}deg) scale(${V.zoom})`; },
  drag(V, el, move, zoom) {
    let pts = new Map(), last = null, pinch = null, moved = 0;
    el.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; moved = 0; V._down = true; V._dragged = false; try { el.setPointerCapture(e.pointerId); } catch (_) { } });
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoom(pinch / d); pinch = d; V._dragged = true; return; }
      const dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY]; moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) V._dragged = true; move(dx, dy);
    });
    const up = e => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) V._down = false;
      if (moved <= 6) { V._dragged = false; const t = document.elementFromPoint(e.clientX, e.clientY); const b = t && t.closest('[data-tv]'); if (b && V.root.contains(b) && e.type === 'pointerup') { this.cmd(V, b.dataset.tv, b.dataset); V._skipClick = true; } }
      setTimeout(() => { V._dragged = false; }, 30);
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1 / 1.1 : 1.1); }, { passive: false });
    el.addEventListener('click', e => { if (V._skipClick) { e.stopPropagation(); V._skipClick = false; } }, true);
  },
  go(V, i) {
    if (i === V.cur && V.mode === '360') return;
    const fade = V.root.querySelector('#tv-fade'); fade.classList.add('on');
    setTimeout(() => { V.cur = i; V.mode = '360'; V.yaw = -20; V.pitch = 0; this.build(V); setTimeout(() => fade.classList.remove('on'), 60); }, 260);
  },
  cmd(V, c, d) {
    if (c === 'room' || c === 'enter') this.go(V, +d.i);
    else if (c === 'dhroom') { V.sel = +d.i; this.build(V); }
    else if (c === 'mode') { if (V.mode !== d.m) { V.mode = d.m; V.sel = null; this.build(V); } }
    else if (c === 'zoom') { if (V.mode === '360') { V.fov = clamp(V.fov * (d.d === '1' ? 1.25 : 0.8), 180, 800); this.apply(V); } else { V.zoom = clamp(V.zoom * (d.d === '1' ? 1.2 : 0.83), .5, 2.4); this.applyDoll(V); } }
    else if (c === 'auto') { V.auto = !V.auto; this.ui(V); }
    else if (c === 'gyro') {
      if (!('DeviceOrientationEvent' in window) || !('ontouchstart' in window)) { toast('Gyroscope non disponible sur cet appareil (fonctionne sur mobile)', 'info', V.opts.closeAct ? 'admin' : undefined); return; }
      V.gyro = !V.gyro;
      if (V.gyro) { V._gyro = e => { if (e.alpha == null) return; V.yaw = -e.alpha; V.pitch = clamp((e.beta || 90) - 90, -80, 80); this.apply(V); }; window.addEventListener('deviceorientation', V._gyro); }
      else window.removeEventListener('deviceorientation', V._gyro);
      this.ui(V);
    }
    else if (c === 'fs') { const el = V.root; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast('Plein écran indisponible', 'info')); }
    else if (c === 'hotinfo') { toast(d.t + ' — équipement présent dans cette pièce', 'info', V.opts.closeAct ? 'admin' : undefined); }
    else if (c === 'info') {
      const box = V.root.querySelector('#tv-info'); const p = V.p;
      if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
      box.classList.remove('hidden');
      box.innerHTML = `<div class="row-between"><b>${money(p.price)} / ${p.period}</b><button class="hdr-btn" data-tv="info">${ic('close')}</button></div><p>${esc(p.title)}</p><div class="tv-specs"><span>🛏️ ${p.bedrooms} ch.</span><span>🛁 ${p.bathrooms} sdb</span><span>📐 ${p.area} m²</span><span>${p.furnished ? 'Meublé' : 'Non meublé'}</span></div><small>${p.equipments.slice(0, 6).map(e => equipment(e)?.name).join(' · ')}</small>
      ${V.opts.closeAct ? '' : `<button class="btn pri block" data-act="startBook" data-id="${p.id}">${p.bookingMode === 'instant' ? '⚡ Réserver' : 'Demander à réserver'}</button>`}`;
    }
  }
};

/* Écran mobile de la visite */
SCR.tour = () => `<div class="body tour-body" id="tour-root"></div>`;
MOUNT.tour = ({ id, tour }) => {
  const p = prop(id); if (!p) return;
  const t = tour ? S.tours.find(x => x.id === tour) : tourOf(p);
  if (!t || (!tour && t.status !== 'publiee')) { $('#tour-root').innerHTML = empty('cube', 'Aucune visite publiée', 'Ce logement ne dispose pas encore de visite virtuelle.'); return; }
  TourViewer.mount($('#tour-root'), p, { tourId: t.id });
};
