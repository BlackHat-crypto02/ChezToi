/* =====================================================================
   DomiLoc — Noyau de la maquette
   - Store unique partagé (mobile + administration), persisté en localStorage
   - Utilitaires, icônes SVG, illustrations générées (aucune image externe)
   - Logique métier commune : réservations, disponibilités, devis, notifications,
     journal d'audit, traitement simulé des visites 3D
   - Dispatcher d'actions (data-act / data-chg / data-submit)
   ===================================================================== */

/* ---------------- Utilitaires ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = 'id') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const NF = new Intl.NumberFormat('fr-FR');
const money = n => NF.format(Math.round(n || 0)) + ' FCFA';
const moneyShort = n => n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.', ',') + ' M' : n >= 1000 ? Math.round(n / 1000) + ' k' : String(n);
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoOf(d); };
const addMonths = (s, n) => { const d = parseISO(s); d.setMonth(d.getMonth() + n); return isoOf(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const todayISO = () => isoOf(TODAY);
const fmtDate = s => s ? parseISO(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDateShort = s => parseISO(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const fmtDT = ts => new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtTime = ts => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "à l'instant"; if (m < 60) return 'il y a ' + m + ' min';
  const h = Math.round(m / 60); if (h < 24) return 'il y a ' + h + ' h';
  const d = Math.round(h / 24); if (d < 30) return 'il y a ' + d + ' j';
  return fmtDT(ts);
}
const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2; // dates ISO, fin exclusive
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function formObj(form) {
  const o = {}; const fd = new FormData(form);
  for (const [k, v] of fd.entries()) { if (k in o) { o[k] = [].concat(o[k], v); } else o[k] = v; }
  $$('input[type=checkbox][name]', form).forEach(cb => { if (cb.dataset.multi !== undefined) { const v = fd.getAll(cb.name); o[cb.name] = v; } else if (!(cb.name in o)) o[cb.name] = ''; });
  return o;
}
function haversine(a, b) {
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtKm = km => km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(km < 10 ? 1 : 0).replace('.', ',') + ' km';

/* ---------------- Icônes (SVG trait) ---------------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  back: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  pin: '<path d="M12 22s-7-6.2-7-12a7 7 0 1 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v13H5a2 2 0 0 1-2-2V5"/><circle cx="16" cy="13" r="1.5"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5"/>',
  compare: '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 3v18"/>',
  play: '<path d="m6 3 14 9-14 9z"/>', pause: '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  rotate: '<path d="M3 12a9 9 0 0 0 15 6.7L21 16"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 21v-5h-5M3 3v5h5"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  dot: '<circle cx="12" cy="12" r="4"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2z"/><path d="M8 9h8M8 13h8"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  gavel: '<path d="m14 13-8.5 8.5a2.1 2.1 0 0 1-3-3L11 10M16 16l6-6M8 8l6-6M9 7l8 8M21 11l-8-8"/>',
  ticket: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z"/><path d="M13 5v14" stroke-dasharray="2 2"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
  move: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
  zoomin: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  zoomout: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'
};
const ic = (n, cls = '') => '<svg class="ic ' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || ICONS.dot) + '</svg>';

/* ---------------- Illustrations générées (photos fictives) ---------------- */
const _sceneCache = {};
function scene(kind, hue = 180) {
  const key = kind + '_' + hue;
  if (_sceneCache[key]) return _sceneCache[key];
  const h = hue, wall = `hsl(${h},22%,88%)`, wall2 = `hsl(${h},20%,80%)`, floor = `hsl(${(h + 30) % 360},30%,62%)`, acc = `hsl(${(h + 180) % 360},45%,45%)`;
  let s = '';
  const room = (inner) => `<rect width="400" height="300" fill="${wall}"/>
    <polygon points="0,0 400,0 330,40 70,40" fill="hsl(${h},15%,95%)"/>
    <polygon points="0,0 70,40 70,215 0,300" fill="${wall2}"/><polygon points="400,0 330,40 330,215 400,300" fill="${wall2}"/>
    <polygon points="0,300 400,300 330,215 70,215" fill="${floor}"/>
    <path d="M30 300 L100 215 M100 300 L145 215 M170 300 L190 215 M230 300 L210 215 M300 300 L255 215 M370 300 L300 215" stroke="rgba(0,0,0,.08)" stroke-width="2"/>
    <circle cx="200" cy="40" r="10" fill="#fff8d6"/>` + inner;
  const win = (x, y, w, hh) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="hsl(200,70%,80%)" stroke="#fff" stroke-width="5"/><path d="M${x + w / 2} ${y}v${hh}M${x} ${y + hh / 2}h${w}" stroke="#fff" stroke-width="3"/><rect x="${x - 14}" y="${y - 8}" width="14" height="${hh + 26}" fill="${acc}" opacity=".7"/>`;
  if (kind === 'immeuble') {
    s = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${200 + h % 20},70%,70%)"/><stop offset="1" stop-color="hsl(${190},60%,92%)"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#g)"/><circle cx="70" cy="55" r="24" fill="#FDE68A"/>
    <rect x="110" y="40" width="190" height="215" fill="hsl(${h},25%,90%)"/><rect x="110" y="40" width="190" height="14" fill="${acc}"/>`;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) s += `<rect x="${125 + c * 44}" y="${66 + r * 36}" width="28" height="22" fill="hsl(200,55%,${70 + (r + c) % 3 * 6}%)"/><rect x="${121 + c * 44}" y="${88 + r * 36}" width="36" height="4" fill="#fff" opacity=".8"/>`;
    s += `<rect y="250" width="400" height="50" fill="hsl(30,15%,55%)"/><rect x="185" y="215" width="40" height="40" fill="hsl(25,40%,30%)"/>
    <rect x="335" y="160" width="7" height="95" fill="#7c5a3a"/><path d="M338 160c-30-10-45 5-50 15M338 160c30-12 45 2 50 14M338 160c-20-25-40-25-48-20M338 160c22-24 40-22 46-16" stroke="hsl(120,45%,35%)" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  } else if (kind === 'maison' || kind === 'villa') {
    s = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${205},75%,68%)"/><stop offset="1" stop-color="hsl(195,70%,92%)"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#g)"/><circle cx="330" cy="55" r="24" fill="#FDE68A"/>
    <rect y="225" width="400" height="75" fill="hsl(105,38%,46%)"/>
    <rect x="70" y="120" width="250" height="115" fill="hsl(${h},30%,93%)"/>
    <polygon points="55,124 195,58 335,124" fill="hsl(${(h + 15) % 360},50%,38%)"/>
    ${[95, 155, 255].map(x => `<rect x="${x}" y="150" width="40" height="34" fill="hsl(200,60%,75%)" stroke="#fff" stroke-width="4"/>`).join('')}
    <rect x="205" y="168" width="36" height="67" fill="hsl(25,45%,32%)"/><circle cx="234" cy="203" r="2.5" fill="#fde68a"/>
    <rect x="345" y="140" width="8" height="90" fill="#7c5a3a"/><path d="M349 140c-30-10-45 5-50 15M349 140c30-12 45 2 50 14M349 140c-20-25-40-25-48-20M349 140c22-24 40-22 46-16" stroke="hsl(120,45%,33%)" stroke-width="9" fill="none" stroke-linecap="round"/>
    <rect x="20" y="215" width="40" height="22" rx="11" fill="hsl(120,40%,35%)"/>`;
    if (kind === 'villa') s += `<path d="M0 262 Q200 245 400 262 L400 300 L0 300z" fill="hsl(195,80%,58%)"/><path d="M40 275 q20-6 40 0 M150 270 q20-6 40 0 M280 275 q20-6 40 0" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>`;
  } else if (kind === 'salon') {
    s = room(win(150, 70, 100, 90) + `<rect x="85" y="185" width="230" height="55" rx="12" fill="${acc}"/><rect x="85" y="165" width="230" height="35" rx="12" fill="${acc}" opacity=".85"/>
    <rect x="70" y="180" width="25" height="60" rx="8" fill="${acc}"/><rect x="305" y="180" width="25" height="60" rx="8" fill="${acc}"/>
    <rect x="120" y="185" width="40" height="22" rx="6" fill="#fff" opacity=".5"/><rect x="240" y="185" width="40" height="22" rx="6" fill="#fff" opacity=".5"/>
    <ellipse cx="200" cy="268" rx="70" ry="12" fill="rgba(0,0,0,.12)"/><rect x="150" y="250" width="100" height="14" rx="4" fill="hsl(30,40%,35%)"/>
    <rect x="22" y="120" width="30" height="110" fill="hsl(30,35%,40%)" opacity=".5"/>`);
  } else if (kind === 'chambre') {
    s = room(win(250, 75, 60, 80) + `<rect x="90" y="70" width="110" height="70" fill="${acc}" opacity=".25"/>
    <rect x="70" y="170" width="200" height="75" rx="6" fill="#fff"/><rect x="70" y="150" width="200" height="40" rx="8" fill="hsl(${h},35%,55%)"/>
    <rect x="85" y="158" width="60" height="22" rx="8" fill="#fff"/><rect x="195" y="158" width="60" height="22" rx="8" fill="#fff"/>
    <rect x="70" y="200" width="200" height="45" fill="${acc}" opacity=".7"/><rect x="290" y="190" width="35" height="45" fill="hsl(30,40%,40%)"/>
    <circle cx="307" cy="180" r="10" fill="#fde68a"/>`);
  } else if (kind === 'cuisine') {
    s = room(win(165, 65, 70, 60) + `<rect x="70" y="150" width="260" height="65" fill="hsl(${h},20%,96%)"/><rect x="70" y="145" width="260" height="10" fill="hsl(30,15%,35%)"/>
    ${[80, 145, 210, 275].map(x => `<rect x="${x}" y="162" width="50" height="45" fill="${acc}" opacity=".75"/><rect x="${x + 22}" y="170" width="6" height="14" fill="#fff"/>`).join('')}
    <rect x="80" y="60" width="70" height="45" fill="${acc}" opacity=".6"/><rect x="250" y="60" width="70" height="45" fill="${acc}" opacity=".6"/>
    <circle cx="120" cy="140" r="7" fill="#333"/><circle cx="140" cy="140" r="7" fill="#333"/><rect x="150" y="235" width="100" height="40" rx="6" fill="hsl(30,35%,45%)"/>`);
  } else if (kind === 'sdb') {
    s = room(`<rect x="70" y="40" width="260" height="175" fill="hsl(${h},35%,92%)"/>` +
      Array.from({ length: 6 }, (_, i) => `<path d="M${70 + i * 44} 40v175" stroke="#fff" stroke-width="2"/>`).join('') +
      `<rect x="150" y="70" width="70" height="60" rx="30" fill="hsl(200,40%,85%)" stroke="#fff" stroke-width="4"/>
      <rect x="85" y="185" width="140" height="50" rx="22" fill="#fff"/><rect x="240" y="165" width="60" height="70" fill="${acc}" opacity=".7"/><rect x="240" y="150" width="60" height="18" fill="#fff"/>`);
  } else if (kind === 'terrasse') {
    s = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(25,85%,70%)"/><stop offset=".6" stop-color="hsl(40,90%,85%)"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#g)"/><circle cx="200" cy="150" r="40" fill="#fff3c4"/><rect y="170" width="400" height="20" fill="hsl(195,60%,55%)"/>
    <rect y="190" width="400" height="110" fill="hsl(30,30%,60%)"/>${Array.from({ length: 11 }, (_, i) => `<rect x="${i * 40}" y="150" width="5" height="45" fill="#fff"/>`).join('')}<rect y="148" width="400" height="6" fill="#fff"/>
    <rect x="70" y="230" width="90" height="10" rx="3" fill="${acc}"/><rect x="250" y="220" width="80" height="35" rx="8" fill="${acc}"/>`;
  } else {
    s = `<rect width="400" height="300" fill="${wall}"/>`;
  }
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">' + s + '</svg>');
  _sceneCache[key] = url;
  return url;
}
function mediaSrc(m) { return m.src || scene(m.kind, m.hue); }
function propCover(p) {
  const m = p.media.find(x => x.id === p.mainMedia) || p.media[0];
  return m ? mediaSrc(m) : scene('maison', p.hue || 100);
}

/* ---------------- Store ---------------- */
const STORE_KEY = 'domiloc_maquette_v' + DATA_VERSION;
let S = null;
const listeners = [];
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const o = JSON.parse(raw); if (o && o.version === DATA_VERSION) { S = o; return; } }
  } catch (e) { /* stockage indisponible */ }
  S = makeSeed();
  saveStore();
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { console.warn('Sauvegarde locale impossible (quota ?)', e); }
}
function commit(opts) { saveStore(); listeners.forEach(fn => fn(opts || {})); }
function onChange(fn) { listeners.push(fn); }
function resetStore() { S = makeSeed(); saveStore(); }
// Synchronisation entre onglets (ex. admin ouvert dans un autre onglet)
window.addEventListener('storage', e => { if (e.key === STORE_KEY && e.newValue) { try { S = JSON.parse(e.newValue); listeners.forEach(fn => fn({ external: true })); } catch (_) { } } });

/* ---------------- Accesseurs ---------------- */
const user = id => S.users.find(u => u.id === id);
const prop = id => S.properties.find(p => p.id === id);
const booking = id => S.bookings.find(b => b.id === id);
const tourOf = p => p && p.tourId ? S.tours.find(t => t.id === p.tourId) : null;
const hasPublishedTour = p => { const t = tourOf(p); return !!(t && t.status === 'publiee'); };
const agency = id => S.agencies.find(a => a.id === id);
const category = id => S.categories.find(c => c.id === id);
const equipment = id => S.equipments.find(e => e.id === id);
const fullName = u => u ? u.first + ' ' + u.last : 'Utilisateur supprimé';
const initials = u => u ? (u.first[0] + u.last[0]).toUpperCase() : '?';
const me = () => S.session.userId ? user(S.session.userId) : null;
const publicProps = () => S.properties.filter(p => p.status === 'publiee' && category(p.type)?.active !== false);
function ownerLabel(p) {
  if (p.agencyId) { const a = agency(p.agencyId); return { name: a.name, sub: 'Agence · agent ' + fullName(user(p.agentId)), verified: a.verified, userId: p.agentId || a.ownerId, agency: true }; }
  const u = user(p.ownerId); return { name: fullName(u), sub: 'Propriétaire particulier', verified: !!u.ownerVerified, userId: u.id, agency: false };
}
function contactUserId(p) { return p.agencyId ? (p.agentId || agency(p.agencyId).ownerId) : p.ownerId; }
// Tous les utilisateurs habilités à gérer un bien (propriétaire, gérant d'agence, agent affecté)
function managersOf(p) {
  const ids = new Set([p.ownerId]);
  if (p.agencyId) { const a = agency(p.agencyId); ids.add(a.ownerId); if (p.agentId) ids.add(p.agentId); }
  return [...ids];
}
function canManage(u, p) {
  if (!u || !p) return false;
  if (p.ownerId === u.id) return true;
  if (u.agencyId && p.agencyId === u.agencyId) return u.agencyRole === 'gerant' || p.agentId === u.id;
  return false;
}
function propsManagedBy(u) { return S.properties.filter(p => canManage(u, p)); }

function ratingOf(pid) {
  const rs = S.reviews.filter(r => r.propertyId === pid && r.status === 'publie');
  if (!rs.length) return { avg: 0, count: 0, detail: null };
  const keys = ['etat', 'conformite', 'proprete', 'communication', 'prix'];
  const detail = {}; keys.forEach(k => detail[k] = rs.reduce((a, r) => a + r.scores[k], 0) / rs.length);
  const avg = keys.reduce((a, k) => a + detail[k], 0) / keys.length;
  return { avg, count: rs.length, detail };
}
const REVIEW_KEYS = { etat: 'État du logement', conformite: "Conformité de l'annonce", proprete: 'Propreté', communication: 'Communication', prix: 'Rapport qualité-prix' };

/* ---------------- Favoris / comparaison ---------------- */
const favsOf = uid => (S.favorites[uid] = S.favorites[uid] || []);
const isFav = (uid, pid) => favsOf(uid).includes(pid);
function toggleFav(uid, pid) {
  const f = favsOf(uid); const p = prop(pid);
  if (f.includes(pid)) { f.splice(f.indexOf(pid), 1); p.favCount = Math.max(0, p.favCount - 1); return false; }
  f.push(pid); p.favCount++; return true;
}

/* ---------------- Notifications & audit ---------------- */
const NOTIF_TYPES = { booking: 'Réservations', message: 'Messages', alert: 'Alertes de recherche', reminder: 'Rappels', listing: 'Annonces', tour: 'Visites 3D', system: 'Informations' };
function notify(userId, type, title, text, link) {
  const prefs = S.notifPrefs[userId] || {};
  if (prefs[type] === false) return;
  const n = { id: uid('n'), userId, type, title, text, at: Date.now(), read: false, link: link || null };
  S.notifications.unshift(n);
  if (typeof onNotification === 'function') onNotification(n);
}
function audit(action, target, detail) {
  S.audit.unshift({ at: Date.now(), actor: S.session.adminId || 'system', action, target, detail: detail || '' });
}

/* ---------------- Réservations : disponibilités & devis ---------------- */
const BLOCKING = ['acceptee', 'confirmee', 'encours', 'litige'];
function unitEnd(start, unitType, units) {
  if (unitType === 'nuit') return addDays(start, units);
  if (unitType === 'semaine') return addDays(start, units * 7);
  if (unitType === 'mois') return addMonths(start, units);
  return addMonths(start, units * 12);
}
function conflicts(pid, start, end, excludeId) {
  const p = prop(pid); const out = [];
  S.bookings.forEach(b => { if (b.propertyId === pid && b.id !== excludeId && BLOCKING.includes(b.status) && overlaps(start, end, b.start, b.end)) out.push({ type: 'booking', start: b.start, end: b.end, ref: b.id }); });
  (p.blocked || []).forEach(r => { if (overlaps(start, end, r.start, r.end)) out.push({ type: 'blocked', start: r.start, end: r.end, ref: r.note }); });
  return out;
}
function dayStatus(pid, day) {
  const p = prop(pid); const next = addDays(day, 1);
  if (day < todayISO()) return 'past';
  for (const b of S.bookings) if (b.propertyId === pid && BLOCKING.includes(b.status) && overlaps(day, next, b.start, b.end)) return 'booked';
  for (const r of (p.blocked || [])) if (overlaps(day, next, r.start, r.end)) return 'blocked';
  for (const b of S.bookings) if (b.propertyId === pid && b.status === 'attente' && overlaps(day, next, b.start, b.end)) return 'pending';
  return 'free';
}
const PER_DAY = { nuit: 1, semaine: 7, mois: 30, an: 365 };
function unitPrice(p, unitType) {
  if (unitType === p.period) return p.price;
  const raw = p.price * PER_DAY[unitType] / PER_DAY[p.period];
  const factor = PER_DAY[unitType] > PER_DAY[p.period] ? 0.85 : 1.15; // dégressif / majoré
  return Math.round(raw * factor / 500) * 500;
}
function checkPromo(code, q) {
  if (!code) return { ok: false };
  const pr = S.promotions.find(x => x.code.toUpperCase() === String(code).trim().toUpperCase());
  const t = todayISO();
  if (!pr) return { ok: false, msg: 'Code promotionnel inconnu.' };
  if (!pr.active) return { ok: false, msg: 'Ce code est désactivé.' };
  if (t < pr.start) return { ok: false, msg: 'Ce code sera valable à partir du ' + fmtDate(pr.start) + '.' };
  if (t > pr.end) return { ok: false, msg: 'Ce code a expiré le ' + fmtDate(pr.end) + '.' };
  if (pr.used >= pr.maxUses) return { ok: false, msg: "Nombre maximal d'utilisations atteint." };
  const discount = pr.type === 'percent' ? Math.round(q.rent * pr.value / 100) : Math.min(pr.value, q.rent);
  return { ok: true, promo: pr, discount };
}
function quote(p, unitType, units, promoCode) {
  units = Math.max(1, Number(units) || 1);
  const up = unitPrice(p, unitType);
  const rent = up * units;
  const longTerm = unitType === 'mois' || unitType === 'an';
  const q = { unitType, units, unitPrice: up, rent, fees: p.fees, deposit: p.deposit, charges: longTerm ? p.charges : 0, discount: 0, promo: null, promoMsg: null, longTerm };
  if (promoCode) { const r = checkPromo(promoCode, q); if (r.ok) { q.discount = r.discount; q.promo = r.promo.code; } else q.promoMsg = r.msg; }
  if (longTerm) {
    q.advance = unitType === 'mois' ? up * Math.min(3, units) : up;
    q.dueNow = q.advance - q.discount + q.deposit + q.fees;
    q.total = rent - q.discount + q.fees + q.deposit + (unitType === 'mois' ? q.charges * units : q.charges * 12 * units);
  } else {
    q.advance = 0;
    q.dueNow = rent - q.discount + q.fees + q.deposit;
    q.total = q.dueNow;
  }
  return q;
}
function setBookingStatus(b, status, by, note) {
  b.status = status;
  b.history.push({ at: Date.now(), status, by: by || 'system', note: note || BOOKING_STATUS[status].label });
}
// Mise à jour automatique des statuts selon les dates
function syncBookingDates() {
  const t = todayISO(); let changed = false;
  S.bookings.forEach(b => {
    if (b.status === 'confirmee' && b.start <= t) { setBookingStatus(b, 'encours', 'system', 'Début de la location'); changed = true; }
    if (b.status === 'encours' && b.end <= t) {
      setBookingStatus(b, 'terminee', 'system', 'Fin de la location'); changed = true;
      notify(b.tenantId, 'booking', 'Location terminée', 'Votre location « ' + prop(b.propertyId).title + ' » est terminée. Donnez votre avis !', { s: 'bookingDetail', p: { id: b.id } });
    }
  });
  return changed;
}

/* ---------------- Traitement simulé des visites 3D ---------------- */
function tickTours() {
  let changed = false;
  S.tours.forEach(t => {
    if (t.status === 'recus') {
      t._wait = (t._wait || 0) + 1;
      if (t._wait >= 3) { t.status = 'traitement'; t.progress = 0; t.log.push({ at: Date.now(), s: 'traitement' }); changed = true; }
    } else if (t.status === 'traitement') {
      t.progress = Math.min(100, t.progress + 3 + Math.round(Math.random() * 5));
      t.stage = t.progress < 25 ? 'Alignement des images' : t.progress < 50 ? 'Nuage de points dense' : t.progress < 75 ? (t.type === '3d' ? 'Gaussian Splatting – optimisation' : 'Assemblage des panoramas') : 'Génération des miniatures et compression';
      if (t.forceFail && t.progress >= 60) {
        t.status = 'echoue'; t.error = t.forceFail; t.log.push({ at: Date.now(), s: 'echoue' });
        const p = prop(t.propertyId);
        managersOf(p).forEach(u => notify(u, 'tour', 'Traitement 3D échoué', 'La visite de « ' + p.title + ' » n\'a pas pu être générée : ' + t.error, { s: 'tourStatus', p: { id: t.id } }));
      } else if (t.progress >= 100) {
        t.status = 'termine'; t.log.push({ at: Date.now(), s: 'termine' });
        const p = prop(t.propertyId);
        managersOf(p).forEach(u => notify(u, 'tour', 'Visite virtuelle prête', 'Le traitement de « ' + p.title + ' » est terminé. Vérifiez puis publiez la visite.', { s: 'tourStatus', p: { id: t.id } }));
      }
      changed = true;
    }
  });
  if (changed) commit({ tick: true });
}

/* ---------------- Dispatcher d'actions ---------------- */
const ACT = {};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (!fn) { console.warn('Action inconnue', el.dataset.act); return; }
  if (el.tagName === 'A' || el.dataset.prevent !== undefined) e.preventDefault();
  if (el.type === 'checkbox' || el.type === 'radio') { /* laisser le navigateur cocher */ }
  e.stopPropagation();
  fn(el.dataset, el, e);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-chg]');
  if (el && ACT[el.dataset.chg]) ACT[el.dataset.chg](el.dataset, el, e);
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-inp]');
  if (el && ACT[el.dataset.inp]) ACT[el.dataset.inp](el.dataset, el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-submit]');
  if (!f) return;
  e.preventDefault();
  const fn = ACT[f.dataset.submit];
  if (fn) fn(formObj(f), f, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (typeof closeSheet === 'function') closeSheet(); if (typeof aCloseModal === 'function') aCloseModal(); }
});

/* Rendu en préservant saisies, focus et défilement (rendu « doux ») */
function renderInto(container, html, soft) {
  if (!soft) { container.innerHTML = html; return; }
  const vals = {};
  $$('input[id],textarea[id],select[id]', container).forEach(el => { vals[el.id] = (el.type === 'checkbox' || el.type === 'radio') ? { c: el.checked } : { v: el.value }; });
  const act = document.activeElement; const actId = act && container.contains(act) ? act.id : null;
  let ss = null, se = null; try { ss = act.selectionStart; se = act.selectionEnd; } catch (_) { }
  const scrolls = $$('[data-scroll]', container).map(el => [el.dataset.scroll, el.scrollTop, el.scrollLeft]);
  container.innerHTML = html;
  for (const id in vals) {
    const el = container.querySelector('#' + CSS.escape(id)); if (!el || el.dataset.nokeep !== undefined) continue;
    if ('c' in vals[id]) el.checked = vals[id].c; else if (el.type !== 'file') el.value = vals[id].v;
  }
  scrolls.forEach(([k, t, l]) => { const el = container.querySelector('[data-scroll="' + k + '"]'); if (el) { el.scrollTop = t; el.scrollLeft = l; } });
  if (actId) { const el = container.querySelector('#' + CSS.escape(actId)); if (el) { el.focus(); try { if (ss != null) el.setSelectionRange(ss, se); } catch (_) { } } }
}

/* ---------------- Toast global ---------------- */
function toast(msg, type = 'ok', where) {
  const root = where === 'admin' ? $('#a-toast') : ($('#m-toast') && where !== 'global' ? $('#m-toast') : $('#a-toast'));
  const host = root || document.body;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = ic(type === 'err' ? 'alert' : type === 'info' ? 'info' : 'check') + '<span>' + msg + '</span>';
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2800);
}

/* Optimisation d'image côté client (§4.3.E) : redimensionnement + compression JPEG */
function optimizeImage(file, maxW = 640, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas'); c.width = Math.round(img.width * ratio); c.height = Math.round(img.height * ratio);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const out = c.toDataURL('image/jpeg', quality);
        resolve({ src: out, before: file.size, after: Math.round(out.length * 0.75), w: c.width, h: c.height });
      };
      img.onerror = reject; img.src = r.result;
    };
    r.onerror = reject; r.readAsDataURL(file);
  });
}
const fmtBytes = b => b > 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' Mo' : Math.round(b / 1000) + ' Ko';

/* ---------------- Barre de démonstration ---------------- */
const DEMO_ACCOUNTS = [
  { id: 'u1', label: 'Locataire — Kossi Mensah', space: 'locataire' },
  { id: 'u2', label: 'Propriétaire vérifiée — Afi Lawson', space: 'proprietaire' },
  { id: 'u6', label: 'Propriétaire non vérifié — Edem Kpodar', space: 'proprietaire' },
  { id: 'u3', label: 'Agence (gérant) — Togo Habitat', space: 'agence' },
  { id: 'u4', label: 'Agent — Akossiwa Doe', space: 'agence' },
  { id: '', label: 'Déconnecté (inscription)', space: 'locataire' }
];
const SCENARIOS = [
  { t: 'Rechercher, filtrer et réserver', d: 'Locataire : recherche Lomé, filtres, fiche, réservation instantanée + paiement Mobile Money.', as: 'u1', go: 'search' },
  { t: 'Payer une réservation acceptée', d: 'Locataire : la demande du duplex a été acceptée par l\'agence, il reste à payer l\'avance.', as: 'u1', go: 'bookingDetail', p: { id: 'b9' } },
  { t: 'Visite 360° et maquette 3D', d: 'Explorer la villa de Baguida en 360°, puis le duplex en maquette 3D.', as: 'u1', go: 'tour', p: { id: 'p5' } },
  { t: 'Carte interactive', d: 'Marqueurs prix, regroupement, recherche dans la zone, itinéraire.', as: 'u1', go: 'map' },
  { t: 'Accepter une demande', d: 'Propriétaire : 2 demandes en attente (villa Baguida, appartement Tokoin).', as: 'u2', go: 'ownerRequests' },
  { t: 'Publier une annonce', d: 'Propriétaire : formulaire complet en 7 étapes, puis validation côté admin.', as: 'u2', go: 'publish' },
  { t: 'Capturer une visite 3D', d: 'Propriétaire : capture guidée pièce par pièce, envoi, traitement, publication.', as: 'u2', go: 'capture' },
  { t: 'Valider les annonces (admin)', d: 'Administration : 2 annonces en attente, refus avec motif ou publication.', admin: 'listings' },
  { t: 'Laisser un avis', d: 'Locataire : séjour terminé au studio de Bè, évaluer 5 critères.', as: 'u1', go: 'bookingDetail', p: { id: 'b1' } },
  { t: 'Traiter un litige (admin)', d: 'Caution non restituée sur la villa de Fidjrossè.', admin: 'moderation' },
  { t: 'Agence : agents et affectations', d: 'Gérant : ajouter un agent, affecter des biens, statistiques.', as: 'u3', go: 'agencyAgents' }
];

function renderDemoBar() {
  const sel = $('#demo-account');
  if (sel) {
    sel.innerHTML = DEMO_ACCOUNTS.map(a => `<option value="${a.id}" ${(S.session.userId || '') === a.id ? 'selected' : ''}>${esc(a.label)}</option>`).join('');
  }
  const sc = $('#scenarios');
  if (sc) sc.innerHTML = SCENARIOS.map((s, i) => `<button class="scn" data-act="runScenario" data-i="${i}"><b>${i + 1}. ${esc(s.t)}</b><span>${esc(s.d)}</span></button>`).join('');
}
function setView(v) {
  document.body.dataset.view = v;
  $$('[data-act="setView"]').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  try { localStorage.setItem('domiloc_view', v); } catch (_) { }
  if (typeof onViewChange === 'function') onViewChange(v);
}
ACT.setView = d => setView(d.v);
ACT.demoAccount = (d, el) => { const a = DEMO_ACCOUNTS.find(x => x.id === el.value); loginAs(a.id || null, a.space); };
ACT.resetDemo = () => {
  if (!confirm('Réinitialiser toutes les données de la maquette ?')) return;
  resetStore(); if (typeof mReset === 'function') mReset(); if (typeof aReset === 'function') aReset();
  renderDemoBar(); commit(); toast('Données réinitialisées', 'info', 'global');
};
ACT.runScenario = d => {
  const s = SCENARIOS[+d.i];
  if (s.admin) {
    if (document.body.dataset.view === 'mobile') setView(window.innerWidth > 1200 ? 'split' : 'admin');
    S.session.adminId = S.session.adminId || 'a1';
    aNav(s.admin); return;
  }
  if (document.body.dataset.view === 'admin') setView(window.innerWidth > 1200 ? 'split' : 'mobile');
  loginAs(s.as, DEMO_ACCOUNTS.find(a => a.id === s.as).space, true);
  openMobile(s.go, s.p || {});
};
// Ouvre un écran mobile en passant par le bon point d'entrée (assistants de saisie)
function openMobile(s, p) {
  if (s === 'publish') { mTab(homeFor()); startPublish(p.id); }
  else if (s === 'capture') { mTab(homeFor()); startCapture(p.id); }
  else if (s === 'property' || s === 'tour' || s === 'bookingDetail' || s === 'chat') { mTab(homeFor()); mGo(s, p); }
  else mTab(s, p);
}
/* Liens profonds : index.html#as=u1&s=property&id=p1&view=mobile  ·  #admin=listings */
function applyHash() {
  const h = new URLSearchParams(location.hash.slice(1)); if (![...h.keys()].length) return;
  if (h.get('view')) setView(h.get('view'));
  if (h.get('admin')) { S.session.adminId = S.session.adminId || 'a1'; aNav(h.get('admin')); if (h.get('modal')) aModal(h.get('modal'), h.get('arg') || ''); }
  if (h.has('as')) { const a = DEMO_ACCOUNTS.find(x => x.id === h.get('as')) || DEMO_ACCOUNTS[0]; loginAs(a.id || null, h.get('space') || a.space, true); }
  if (h.get('s')) openMobile(h.get('s'), h.get('id') ? { id: h.get('id') } : {});
}
ACT.toggleGuide = () => document.body.classList.toggle('guide-open');

function loginAs(userId, space, silent) {
  S.session.userId = userId;
  S.session.space = space || 'locataire';
  commit();
  renderDemoBar();
  if (typeof mAfterLogin === 'function') mAfterLogin(silent);
}

/* ---------------- Démarrage ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadStore();
  syncBookingDates();
  saveStore();
  renderDemoBar();
  let v = 'split';
  try { v = localStorage.getItem('domiloc_view') || (window.innerWidth > 1280 ? 'split' : 'mobile'); } catch (_) { }
  if (window.innerWidth < 900 && v === 'split') v = 'mobile';
  setView(v);
  if (typeof mInit === 'function') mInit();
  if (typeof aInit === 'function') aInit();
  try { applyHash(); } catch (e) { console.warn('Lien profond invalide', e); }
  window.addEventListener('hashchange', () => { try { applyHash(); } catch (_) { } });
  setInterval(tickTours, 1000);
});
