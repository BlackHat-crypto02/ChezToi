/* =====================================================================
   DomiLoc — Administration web (Django) — réservée aux administrateurs
   Tableau de bord, utilisateurs, propriétaires & agences, annonces,
   réservations, catégories & équipements, modération, visites 3D,
   promotions, contenus, support, administrateurs, journal d'audit
   ===================================================================== */

const A = { page: 'dashboard', q: '', f: {}, tab: {}, modal: null, period: '30', zone: '' };
const NAV = [
  ['dashboard', 'dashboard', 'Tableau de bord', null],
  ['users', 'users', 'Utilisateurs', 'Utilisateurs'],
  ['owners', 'building', 'Propriétaires & agences', 'Utilisateurs'],
  ['listings', 'home', 'Annonces', 'Annonces'],
  ['bookings', 'cal', 'Réservations', 'Réservations'],
  ['catalog', 'tag', 'Catégories & équipements', 'Annonces'],
  ['moderation', 'gavel', 'Modération', 'Modération'],
  ['tours', 'cube', 'Visites virtuelles', 'Visites 3D'],
  ['promos', 'ticket', 'Promotions', 'Promotions'],
  ['content', 'doc', 'Contenus', 'Contenus'],
  ['support', 'help', 'Support', 'Support'],
  ['admins', 'key', 'Administrateurs', 'Administrateurs'],
  ['audit', 'history', "Journal d'audit", 'Administrateurs']
];
const adminMe = () => S.admins.find(a => a.id === S.session.adminId);
const canAccess = mod => !mod || (S.permissions[adminMe()?.role] || []).includes(mod);
function aInit() { aRender(false); onChange(o => { if (o.tick && !['tours', 'dashboard'].includes(A.page)) return; aRender(true); if (!o.tick) aRenderModal(); }); }
function aReset() { A.page = 'dashboard'; A.q = ''; A.f = {}; A.tab = {}; aCloseModal(); }
function aNav(page) { A.page = page; A.q = ''; aCloseModal(); aRender(false); const m = $('#admin .adm-content'); if (m) m.scrollTop = 0; }
ACT.aNav = d => aNav(d.p);

function badgeFor(p) {
  if (p === 'listings') return S.properties.filter(x => x.status === 'attente').length;
  if (p === 'moderation') return S.reports.filter(r => r.status === 'ouvert').length + S.disputes.filter(d => d.status === 'ouvert').length;
  if (p === 'tours') return S.tours.filter(t => ['recus', 'traitement', 'echoue', 'termine'].includes(t.status)).length;
  if (p === 'support') return S.tickets.filter(t => t.status === 'ouvert').length;
  if (p === 'owners') return S.users.filter(u => (u.docs || []).some(d => d.status === 'en_attente')).length + S.agencies.filter(a => !a.verified).length;
  return 0;
}
function aRender(soft) {
  const root = $('#admin'); if (!root || !S) return;
  if (!adminMe()) { renderInto(root, aLogin(), soft); return; }
  const item = NAV.find(n => n[0] === A.page); if (!canAccess(item[3])) A.page = 'dashboard';
  let html; try { html = (AP[A.page] || AP.dashboard)(); } catch (e) { console.error(e); html = '<div class="adm-card">Erreur : ' + esc(e.message) + '</div>'; }
  const ad = adminMe();
  renderInto(root, `<div class="adm"><aside class="adm-side"><div class="adm-brand">${logoHTML()}<small>Administration</small></div><nav class="adm-nav" data-scroll="nav">${NAV.filter(n => canAccess(n[3])).map(([k, i, l]) => { const b = badgeFor(k); return `<a href="#" class="${A.page === k ? 'on' : ''}" data-act="aNav" data-p="${k}">${ic(i)}<span>${l}</span>${b ? '<i>' + b + '</i>' : ''}</a>`; }).join('')}</nav>
  <div class="adm-side-foot"><small>Django 5 · DRF · PostgreSQL/PostGIS</small></div></aside>
  <main class="adm-main"><header class="adm-top"><div class="adm-crumb">DomiLoc <span>/</span> <b>${NAV.find(n => n[0] === A.page)[2]}</b></div>
  <div class="adm-search">${ic('search')}<input id="a-gsearch" class="inp" placeholder="Recherche globale (utilisateur, annonce, réservation…)" data-inp="aGlobalSearch" value="${esc(A.gq || '')}"><div class="adm-gres" id="a-gres"></div></div>
  <div class="adm-user"><select class="inp sm" data-chg="aSwitchAdmin" title="Changer d'administrateur (démo des rôles)">${S.admins.filter(a => a.active).map(a => `<option value="${a.id}" ${a.id === ad.id ? 'selected' : ''}>${esc(a.name)} — ${esc(a.role)}</option>`).join('')}</select><button class="btn sm ghost" data-act="aLogout" title="Déconnexion">${ic('logout')}</button></div></header>
  <div class="adm-content" data-scroll="admin-main">${html}</div></main></div>`, soft);
  AMOUNT[A.page] && AMOUNT[A.page]();
}
const AP = {}, AMOUNT = {};

/* Connexion administrateur */
function aLogin() {
  return `<div class="adm-login"><form class="adm-card" data-submit="aLoginOk">${logoHTML()}<h2>Administration</h2><p class="muted">Accès réservé aux administrateurs de la plateforme.</p>
  <label class="field"><span>E-mail</span><input class="inp" name="email" value="admin@domiloc.tg" required></label><label class="field"><span>Mot de passe</span><input class="inp" name="pw" type="password" value="admin1234" required></label>
  <label class="field"><span>Code 2FA (application d'authentification)</span><input class="inp" name="otp" value="246810" maxlength="6" required></label><button class="btn pri block">Se connecter</button>
  <p class="hint">Démo : admin@domiloc.tg / admin1234 / 246810 · moderation@domiloc.tg · support@domiloc.tg</p></form></div>`;
}
ACT.aLoginOk = o => {
  const a = S.admins.find(x => x.email === o.email.trim().toLowerCase() && x.active);
  if (!a || o.pw !== 'admin1234' || o.otp !== '246810') { toast('Identifiants ou code 2FA invalides', 'err', 'admin'); return; }
  S.session.adminId = a.id; a.lastLogin = Date.now(); S.loginHistory.unshift({ adminId: a.id, at: Date.now(), ip: '102.64.12.' + Math.floor(Math.random() * 200), device: navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Edg') ? 'Edge' : 'Chrome' });
  commit(); toast('Bienvenue, ' + a.name, 'ok', 'admin');
};
ACT.aLogout = () => { S.session.adminId = null; commit(); };
ACT.aSwitchAdmin = (d, el) => { S.session.adminId = el.value; const a = adminMe(); S.loginHistory.unshift({ adminId: a.id, at: Date.now(), ip: '102.64.12.8', device: 'Chrome' }); commit(); toast('Connecté en tant que ' + a.name + ' (' + a.role + ')', 'info', 'admin'); };
ACT.aGlobalSearch = (d, el) => {
  const q = norm(el.value); A.gq = el.value; const box = $('#a-gres'); if (!box) return;
  if (q.length < 2) { box.innerHTML = ''; return; }
  const us = S.users.filter(u => norm(fullName(u) + u.email + u.phone).includes(q)).slice(0, 4).map(u => `<button data-act="aUser" data-id="${u.id}">${ic('user')} ${esc(fullName(u))}<small>${esc(u.email)}</small></button>`);
  const ps = S.properties.filter(p => norm(p.title + p.id).includes(q)).slice(0, 4).map(p => `<button data-act="aListing" data-id="${p.id}">${ic('home')} ${esc(p.title)}<small>${PROPERTY_STATUS[p.status].label}</small></button>`);
  const bs = S.bookings.filter(b => b.id.toLowerCase().includes(q)).slice(0, 3).map(b => `<button data-act="aBooking" data-id="${b.id}">${ic('cal')} Réservation #${b.id.slice(-5).toUpperCase()}<small>${esc(prop(b.propertyId).title)}</small></button>`);
  box.innerHTML = [...us, ...ps, ...bs].join('') || '<p class="muted small pad">Aucun résultat</p>';
};

/* Modales */
function aModal(gen, arg) { A.modal = { gen, arg }; aRenderModal(); }
function aRenderModal() {
  const root = $('#a-modal-root'); if (!root) return;
  if (!A.modal) { root.innerHTML = ''; return; }
  const m = AM[A.modal.gen](A.modal.arg); if (!m) { aCloseModal(); return; }
  if (m.static && root.firstChild && root.dataset.key === A.modal.gen + A.modal.arg) return;
  root.dataset.key = A.modal.gen + A.modal.arg;
  renderInto(root, `<div class="a-modal-bg" data-act="aCloseModal"></div><div class="a-modal ${m.wide ? 'wide' : ''} ${m.cls || ''}"><div class="a-modal-h"><b>${m.title}</b><button class="hdr-btn" data-act="aCloseModal">${ic('close')}</button></div><div class="a-modal-b" data-scroll="amodal">${m.html}</div></div>`, root.firstChild ? true : false);
  m.mount && m.mount();
}
function aCloseModal() { A.modal = null; const r = $('#a-modal-root'); if (r) { r.innerHTML = ''; r.dataset.key = ''; } }
ACT.aCloseModal = () => aCloseModal();
const AM = {};
const aToast = (m, t) => toast(m, t, 'admin');

/* Composants */
const kpi = (l, v, i, sub, act) => `<div class="a-kpi" ${act ? `data-act="aNav" data-p="${act}"` : ''}>${ic(i)}<div><b>${v}</b><span>${l}</span>${sub ? '<small>' + sub + '</small>' : ''}</div></div>`;
function table(head, rows, empty = 'Aucun élément') { return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}" class="center muted">${empty}</td></tr>`}</tbody></table></div>`; }
const userCell = u => `<span class="ucell">${avatar(u, 'xs')}<span><b>${esc(fullName(u))}</b><small>${esc(u.email)}</small></span></span>`;
const propCell = p => `<span class="ucell"><span class="thumb xs" style="background-image:url('${propCover(p)}')"></span><span><b>${esc(p.title)}</b><small>${esc(p.quartier)}, ${esc(p.city)}</small></span></span>`;
function tabs(key, items, def) { const t = A.tab[key] || def; return `<div class="a-tabs">${items.map(([k, l, n]) => `<button class="${t === k ? 'on' : ''}" data-act="aTab" data-k="${key}" data-t="${k}">${l}${n != null ? ' <i>' + n + '</i>' : ''}</button>`).join('')}</div>`; }
ACT.aTab = d => { A.tab[d.k] = d.t; aRender(true); };
const searchBox = (ph) => `<div class="search-box light sm">${ic('search')}<input class="inp" id="a-q-${A.page}" placeholder="${ph}" value="${esc(A.q)}" data-inp="aQ"></div>`;
ACT.aQ = (d, el) => { A.q = el.value; aRender(true); };
ACT.aF = (d, el) => { A.f[d.k] = el.value; aRender(true); };
const sel = (k, opts, def = '') => `<select class="inp sm" id="a-f-${k}" data-chg="aF" data-k="${k}">${opts.map(([v, l]) => `<option value="${v}" ${(A.f[k] ?? def) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const matchQ = s => !A.q || norm(s).includes(norm(A.q));
function aConfirm(title, text, cb, danger, withReason) {
  A._cb = cb;
  aModal('confirm', JSON.stringify({ title, text, danger, withReason }));
}
AM.confirm = a => { const o = JSON.parse(a); return { title: o.title, html: `<form data-submit="aConfirmOk"><p>${o.text}</p>${o.withReason ? `<label class="field"><span>${o.withReason}</span><textarea class="inp" name="reason" rows="3" required></textarea></label>` : ''}<div class="btn-row end"><button type="button" class="btn sec" data-act="aCloseModal">Annuler</button><button class="btn ${o.danger ? 'danger' : 'pri'}">Confirmer</button></div></form>` }; };
ACT.aConfirmOk = o => { const cb = A._cb; aCloseModal(); cb && cb(o.reason); };

/* ---------------- Tableau de bord ---------------- */
AP.dashboard = () => {
  const zone = A.zone; const days = +A.period;
  const props = S.properties.filter(p => !zone || p.city === zone); const ids = props.map(p => p.id);
  const bks = S.bookings.filter(b => ids.includes(b.propertyId));
  const since = Date.now() - days * 864e5;
  const tenants = S.users.filter(u => u.roles.includes('locataire') && !u.roles.includes('proprietaire')).length;
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(TODAY); d.setMonth(d.getMonth() - 5 + i); return d; });
  const bkSeries = months.map((d, i) => { const k = isoOf(d).slice(0, 7); const real = bks.filter(b => new Date(b.created).toISOString().slice(0, 7) === k).length; return { l: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), s: d.toLocaleDateString('fr-FR', { month: 'short' }), v: real + Math.round(seeded(k + zone)() * 30 + 10 + i * 4) }; });
  const usrSeries = months.map((d, i) => { const k = isoOf(d).slice(0, 7); return { l: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), s: d.toLocaleDateString('fr-FR', { month: 'short' }), v: S.users.filter(u => u.created.slice(0, 7) === k).length + Math.round(seeded('u' + k)() * 60 + 40 + i * 10) }; });
  const cities = ['Lomé', 'Kpalimé', 'Kara', 'Cotonou'].map(c => ({ l: c, s: c, v: S.properties.filter(p => p.city === c && p.status === 'publiee').length }));
  const pending = S.properties.filter(p => p.status === 'attente');
  return `<div class="a-head"><h1>Tableau de bord</h1><div class="a-tools"><select class="inp sm" data-chg="aPeriod">${[['7', '7 derniers jours'], ['30', '30 derniers jours'], ['365', '12 derniers mois']].map(([v, l]) => `<option value="${v}" ${A.period === v ? 'selected' : ''}>${l}</option>`).join('')}</select><select class="inp sm" data-chg="aZone"><option value="">Toutes les zones</option>${['Lomé', 'Kpalimé', 'Kara', 'Cotonou'].map(c => `<option ${zone === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
  <div class="a-kpis">${kpi('Utilisateurs', S.users.filter(u => u.status !== 'supprime').length, 'users', '+' + S.users.filter(u => parseISO(u.created) > since).length + ' sur la période', 'users')}${kpi('Locataires', tenants, 'user')}${kpi('Propriétaires', S.users.filter(u => u.roles.includes('proprietaire')).length, 'home', '', 'owners')}${kpi('Agences', S.agencies.length, 'building', '', 'owners')}
  ${kpi('Logements', props.length, 'layers', zone || 'Toutes zones', 'listings')}${kpi('Annonces publiées', props.filter(p => p.status === 'publiee').length, 'check', '', 'listings')}${kpi('En attente de validation', props.filter(p => p.status === 'attente').length, 'clock', 'À traiter', 'listings')}${kpi('Réservations', bks.length, 'cal', bks.filter(b => b.created > since).length + ' sur la période', 'bookings')}
  ${kpi('Réservations confirmées', bks.filter(b => ['confirmee', 'encours', 'terminee'].includes(b.status)).length, 'shield', '', 'bookings')}${kpi('Signalements ouverts', S.reports.filter(r => r.status === 'ouvert').length, 'flag', S.reports.length + ' au total', 'moderation')}${kpi('Litiges', S.disputes.filter(d => d.status === 'ouvert').length, 'gavel', 'ouverts', 'moderation')}${kpi('Volume encaissé', moneyShort(bks.filter(b => b.payment && b.payment.status === 'paye').reduce((a, b) => a + (b.payment.amount || b.amount || 0), 0)) + ' F', 'wallet')}</div>
  <div class="a-grid2"><div class="adm-card"><h3>Réservations par mois</h3>${barChart(bkSeries, { w: 520, h: 180, label: 'Réservations par mois' })}</div><div class="adm-card"><h3>Nouvelles inscriptions</h3>${barChart(usrSeries, { w: 520, h: 180, label: 'Inscriptions par mois' })}</div></div>
  <div class="a-grid2"><div class="adm-card"><h3>Annonces publiées par zone</h3>${barChart(cities, { w: 520, h: 160, label: 'Annonces par ville' })}<details class="tbl-alt"><summary>Voir en tableau</summary>${table(['Zone', 'Annonces publiées'], cities.map(c => `<tr><td>${c.l}</td><td>${c.v}</td></tr>`))}</details></div>
  <div class="adm-card"><div class="row-between"><h3>Annonces à valider</h3><a href="#" class="link" data-act="aNav" data-p="listings">Tout voir</a></div>${pending.map(p => `<div class="a-row">${propCell(p)}<button class="btn sm sec" data-act="aListing" data-id="${p.id}">Examiner</button></div>`).join('') || '<p class="muted">Aucune annonce en attente 🎉</p>'}
  <div class="row-between"><h3>Traitements 3D</h3><a href="#" class="link" data-act="aNav" data-p="tours">Tout voir</a></div>${S.tours.filter(t => ['traitement', 'echoue', 'recus', 'termine'].includes(t.status)).map(t => `<div class="a-row"><span>${ic('cube')} ${esc(prop(t.propertyId).title)}</span>${tag(TOUR_STATUS[t.status])}${t.status === 'traitement' ? `<span class="progress sm"><b style="width:${t.progress}%"></b></span>` : ''}</div>`).join('') || '<p class="muted">Aucun traitement en cours</p>'}</div></div>`;
};
ACT.aPeriod = (d, el) => { A.period = el.value; aRender(true); };
ACT.aZone = (d, el) => { A.zone = el.value; aRender(true); };

/* ---------------- Utilisateurs ---------------- */
const ROLE_L = { locataire: 'Locataire', proprietaire: 'Propriétaire', agence: 'Agence', agent: 'Agent' };
const USTAT = { actif: ['Actif', 'green'], suspendu: ['Suspendu', 'red'], inactif: ['Désactivé', 'gray'], supprime: ['Supprimé', 'gray'] };
AP.users = () => {
  const role = A.f.role || '', st = A.f.ustatus || '';
  const list = S.users.filter(u => (!role || u.roles.includes(role)) && (!st || u.status === st) && matchQ(fullName(u) + u.email + u.phone + u.city));
  return `<div class="a-head"><h1>Utilisateurs <small>${list.length}</small></h1><div class="a-tools">${searchBox('Nom, e-mail, téléphone…')}${sel('role', [['', 'Tous les rôles'], ...Object.entries(ROLE_L)])}${sel('ustatus', [['', 'Tous statuts'], ...Object.entries(USTAT).map(([k, v]) => [k, v[0]])])}</div></div>
  <div class="adm-card p0">${table(['Utilisateur', 'Téléphone', 'Rôles', 'Vérification', 'Statut', 'Inscription', ''], list.map(u => `<tr data-act="aUser" data-id="${u.id}" class="clk"><td>${userCell(u)}</td><td>${esc(u.phone)}</td><td>${u.roles.map(r => `<span class="tag gray">${ROLE_L[r]}</span>`).join(' ')}</td><td>${u.verifiedPhone ? '📱' : ''}${u.verifiedEmail ? '✉️' : ''}${u.verifiedId ? '🪪' : ''}${u.ownerVerified ? ' <span class="tag green">Badge</span>' : ''}</td><td><span class="tag ${USTAT[u.status][1]}">${USTAT[u.status][0]}</span></td><td>${fmtDate(u.created)}</td><td>${ic('next')}</td></tr>`))}</div>`;
};
ACT.aUser = d => aModal('user', d.id);
AM.user = id => {
  const u = user(id); if (!u) return null; const bks = S.bookings.filter(b => b.tenantId === id); const props = S.properties.filter(p => p.ownerId === id);
  const acts = [...S.audit.filter(a => a.target === id).map(a => ({ at: a.at, t: a.action + (a.detail ? ' — ' + a.detail : '') })), ...bks.flatMap(b => b.history.filter(h => h.by === id).map(h => ({ at: h.at, t: h.note + ' (#' + b.id.slice(-5).toUpperCase() + ')' }))), ...S.reports.filter(r => r.by === id).map(r => ({ at: r.at, t: 'Signalement : ' + r.reason }))].sort((a, b) => b.at - a.at).slice(0, 12);
  return { title: esc(fullName(u)), wide: true, html: `<div class="a-grid2"><div><form data-submit="aSaveUser" class="form"><input type="hidden" name="id" value="${u.id}"><div class="grid2"><label class="field"><span>Prénom</span><input class="inp" name="first" value="${esc(u.first)}"></label><label class="field"><span>Nom</span><input class="inp" name="last" value="${esc(u.last)}"></label></div>
  <label class="field"><span>E-mail</span><input class="inp" name="email" value="${esc(u.email)}"></label><label class="field"><span>Téléphone</span><input class="inp" name="phone" value="${esc(u.phone)}"></label><label class="field"><span>Ville</span><input class="inp" name="city" value="${esc(u.city || '')}"></label>
  <div class="field"><span>Rôles</span><div class="chips-row wrap">${Object.entries(ROLE_L).map(([k, l]) => `<label class="chip-check"><input type="checkbox" name="roles" data-multi value="${k}" ${u.roles.includes(k) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
  <div class="field"><span>Vérifications</span><div class="chips-row wrap">${[['verifiedPhone', 'Téléphone'], ['verifiedEmail', 'E-mail'], ['verifiedId', 'Identité'], ['ownerVerified', 'Badge propriétaire']].map(([k, l]) => `<label class="chip-check"><input type="checkbox" name="${k}" ${u[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
  <button class="btn pri">Enregistrer</button></form>
  <h4>Statut du compte : <span class="tag ${USTAT[u.status][1]}">${USTAT[u.status][0]}</span></h4><div class="btn-row wrap">${u.status !== 'actif' ? `<button class="btn sec sm" data-act="aUserStatus" data-id="${u.id}" data-s="actif">Activer</button>` : ''}${u.status !== 'inactif' ? `<button class="btn sec sm" data-act="aUserStatus" data-id="${u.id}" data-s="inactif">Désactiver</button>` : ''}${u.status !== 'suspendu' ? `<button class="btn danger sm" data-act="aUserStatus" data-id="${u.id}" data-s="suspendu">Suspendre</button>` : ''}</div></div>
  <div><h4>Réservations (${bks.length})</h4>${bks.map(b => `<div class="a-row clk" data-act="aBooking" data-id="${b.id}"><span>#${b.id.slice(-5).toUpperCase()} · ${esc(prop(b.propertyId).title)}</span>${tag(BOOKING_STATUS[b.status])}</div>`).join('') || '<p class="muted small">Aucune</p>'}
  ${props.length ? `<h4>Annonces (${props.length})</h4>${props.map(p => `<div class="a-row clk" data-act="aListing" data-id="${p.id}"><span>${esc(p.title)}</span>${tag(PROPERTY_STATUS[p.status])}</div>`).join('')}` : ''}
  ${(u.docs || []).length ? `<h4>Documents</h4>${docsHTML(u)}` : ''}
  <h4>Historique des activités</h4><div class="tl">${acts.map(a => `<div><i class="gray"></i><b>${esc(a.t)}</b><small>${fmtDT(a.at)}</small></div>`).join('') || '<p class="muted small">Aucune activité enregistrée</p>'}</div></div></div>` };
};
ACT.aSaveUser = o => {
  const u = user(o.id); Object.assign(u, { first: o.first, last: o.last, email: o.email, phone: o.phone, city: o.city });
  u.roles = [].concat(o.roles || []).filter(Boolean); if (!u.roles.length) u.roles = ['locataire'];
  ['verifiedPhone', 'verifiedEmail', 'verifiedId', 'ownerVerified'].forEach(k => u[k] = o[k] === 'on');
  audit('Modification utilisateur', u.id, 'Informations / rôles / vérifications'); commit(); aToast('Utilisateur mis à jour');
};
ACT.aUserStatus = d => {
  const u = user(d.id); const lbl = { actif: 'activer', inactif: 'désactiver', suspendu: 'suspendre' }[d.s];
  aConfirm('Confirmer', `Voulez-vous ${lbl} le compte de <b>${esc(fullName(u))}</b> ?`, reason => { u.status = d.s; audit({ actif: 'Activation', inactif: 'Désactivation', suspendu: 'Suspension' }[d.s] + ' utilisateur', u.id, reason || ''); notify(u.id, 'system', 'Statut du compte', 'Votre compte a été ' + { actif: 'réactivé', inactif: 'désactivé', suspendu: 'suspendu' }[d.s] + (reason ? ' : ' + reason : '') + '.'); commit(); aToast('Compte mis à jour'); aModal('user', u.id); }, d.s !== 'actif', d.s === 'suspendu' ? 'Motif de la suspension' : null);
};

/* ---------------- Propriétaires & agences ---------------- */
function docsHTML(u) { return (u.docs || []).map(d => `<div class="a-row"><span>${ic('file')} ${esc(d.type)} <small class="muted">${esc(d.file)} · ${fmtDate(d.at)}</small></span><span class="tag ${d.status === 'valide' ? 'green' : d.status === 'refuse' ? 'red' : 'amber'}">${{ valide: 'Validé', refuse: 'Refusé', en_attente: 'En attente' }[d.status]}</span>${d.status === 'en_attente' ? `<span class="btn-row"><button class="btn sm sec" data-act="aDocView" data-n="${esc(d.file)}">${ic('eye')}</button><button class="btn sm pri" data-act="aDoc" data-u="${u.id}" data-d="${d.id}" data-s="valide">Valider</button><button class="btn sm danger-o" data-act="aDoc" data-u="${u.id}" data-d="${d.id}" data-s="refuse">Refuser</button></span>` : ''}</div>`).join(''); }
ACT.aDocView = d => aToast('Aperçu sécurisé du document « ' + d.n + ' » (URL signée, expiration 5 min)', 'info');
ACT.aDoc = d => {
  const u = user(d.u); const doc = u.docs.find(x => x.id === d.d); doc.status = d.s;
  if (d.s === 'valide' && doc.type.startsWith('Pièce')) u.verifiedId = true;
  if (u.docs.every(x => x.status === 'valide') && u.roles.includes('proprietaire')) { u.ownerVerified = true; u.verifiedId = true; S.properties.filter(p => p.ownerId === u.id && p.status === 'publiee').forEach(p => p.verified = true); notify(u.id, 'system', 'Compte vérifié ✓', 'Vos justificatifs ont été validés : votre profil affiche désormais le badge « Propriétaire vérifié ».', { s: 'verification' }); }
  if (d.s === 'refuse') notify(u.id, 'system', 'Document refusé', '« ' + doc.type + ' » a été refusé. Merci d\'envoyer un document lisible et en cours de validité.', { s: 'verification' });
  audit(d.s === 'valide' ? 'Validation document' : 'Refus document', u.id, doc.type); commit(); aToast('Document ' + (d.s === 'valide' ? 'validé' : 'refusé'));
};
AP.owners = () => {
  const t = A.tab.owners || 'owners'; const owners = S.users.filter(u => u.roles.includes('proprietaire') && matchQ(fullName(u) + u.email));
  const pendingDocs = S.users.filter(u => (u.docs || []).some(d => d.status === 'en_attente'));
  let body = '';
  if (t === 'owners') body = table(['Propriétaire', 'Annonces', 'Publiées', 'Note moy.', 'Badge', 'Statut', ''], owners.map(u => { const ps = S.properties.filter(p => p.ownerId === u.id && !p.agencyId); const rs = ps.map(p => ratingOf(p.id)).filter(r => r.count); return `<tr class="clk" data-act="aUser" data-id="${u.id}"><td>${userCell(u)}</td><td>${ps.length}</td><td>${ps.filter(p => p.status === 'publiee').length}</td><td>${rs.length ? (rs.reduce((a, r) => a + r.avg, 0) / rs.length).toFixed(1) + ' ★' : '—'}</td><td>${u.ownerVerified ? '<span class="tag green">Vérifié</span>' : '<span class="tag amber">Non vérifié</span>'}</td><td><span class="tag ${USTAT[u.status][1]}">${USTAT[u.status][0]}</span></td><td>${ic('next')}</td></tr>`; }));
  if (t === 'agencies') body = S.agencies.map(a => `<div class="adm-card"><div class="row-between"><div><h3>${esc(a.name)} ${a.verified ? '<span class="tag green">Vérifiée</span>' : '<span class="tag amber">À vérifier</span>'}</h3><small class="muted">RCCM ${esc(a.rccm)} · NIF ${esc(a.nif || '—')} · ${esc(a.address || '')} · ${esc(a.phone)}</small></div><button class="btn sm ${a.verified ? 'sec' : 'pri'}" data-act="aAgencyVerify" data-id="${a.id}">${a.verified ? 'Retirer la vérification' : 'Valider l\'agence'}</button></div>
    <div class="a-grid2"><div><h4>Collaborateurs</h4>${[a.ownerId, ...a.members].map(id => { const m = user(id); return `<div class="a-row clk" data-act="aUser" data-id="${id}">${userCell(m)}<span class="tag gray">${id === a.ownerId ? 'Gérant' : 'Agent'}</span><small>${S.properties.filter(p => p.agentId === id).length} bien(s)</small></div>`; }).join('')}</div>
    <div><h4>Annonces (${S.properties.filter(p => p.agencyId === a.id).length})</h4>${S.properties.filter(p => p.agencyId === a.id).map(p => `<div class="a-row clk" data-act="aListing" data-id="${p.id}"><span>${esc(p.title)}</span>${tag(PROPERTY_STATUS[p.status])}</div>`).join('')}
    <h4>Activité</h4><p class="small">${S.bookings.filter(b => prop(b.propertyId).agencyId === a.id).length} réservations · ${S.properties.filter(p => p.agencyId === a.id).reduce((x, p) => x + p.views, 0)} vues cumulées</p></div></div></div>`).join('');
  if (t === 'docs') body = pendingDocs.map(u => `<div class="adm-card"><div class="row-between">${userCell(u)}<button class="btn sm ghost" data-act="aUser" data-id="${u.id}">Profil</button></div>${docsHTML(u)}</div>`).join('') || '<div class="adm-card muted">Aucun document en attente.</div>';
  return `<div class="a-head"><h1>Propriétaires & agences</h1><div class="a-tools">${t === 'owners' ? searchBox('Rechercher un propriétaire') : ''}</div></div>${tabs('owners', [['owners', 'Propriétaires', S.users.filter(u => u.roles.includes('proprietaire')).length], ['agencies', 'Agences', S.agencies.length], ['docs', 'Documents à vérifier', pendingDocs.length]], 'owners')}<div class="${t === 'owners' ? 'adm-card p0' : ''}">${body}</div>`;
};
ACT.aAgencyVerify = d => { const a = agency(d.id); a.verified = !a.verified; audit(a.verified ? 'Validation agence' : 'Retrait vérification agence', a.id, a.name); notify(a.ownerId, 'system', a.verified ? 'Agence vérifiée ✓' : 'Vérification retirée', a.name); commit(); aToast('Agence mise à jour'); };

/* ---------------- Annonces ---------------- */
function adminChecks(p) {
  const photos = p.media.filter(m => m.type === 'photo').length; const dups = S.properties.filter(x => x.id !== p.id && (norm(x.title) === norm(p.title) || (Math.abs(x.lat - p.lat) < 0.0003 && Math.abs(x.lng - p.lng) < 0.0003)));
  const comps = S.properties.filter(x => x.type === p.type && x.city === p.city && x.period === p.period && x.id !== p.id);
  const avg = comps.length ? comps.reduce((a, x) => a + x.price, 0) / comps.length : p.price;
  const reps = S.reports.filter(r => r.targetType === 'property' && r.targetId === p.id);
  const owner = user(p.ownerId);
  return [
    { ok: p.title.length >= 10 && p.description.length >= 50, l: 'Cohérence des informations (titre, description)' },
    { ok: photos >= 3, l: 'Qualité des photos : ' + photos + ' photo(s)' + (photos < 3 ? ' — minimum 3' : '') },
    { ok: !!p.address && p.lat > -90 && p.lat < 90 && p.lat !== 0, l: 'Coordonnées GPS valides (' + p.lat.toFixed(4) + ', ' + p.lng.toFixed(4) + ')' },
    { ok: p.agencyId ? agency(p.agencyId).verified : !!owner.ownerVerified, l: p.agencyId ? 'Agence vérifiée' : 'Justificatifs du propriétaire ' + (owner.ownerVerified ? 'validés' : 'non validés') },
    { ok: !dups.length, l: dups.length ? 'Doublon potentiel : ' + dups.map(x => '« ' + x.title + ' »').join(', ') : 'Aucun doublon détecté' },
    { ok: p.price > avg * 0.4 && p.price < avg * 2.5, l: 'Prix cohérent avec le marché (moy. ' + money(Math.round(avg)) + ')' },
    { ok: !reps.length, l: reps.length + ' signalement(s) reçu(s)' }
  ];
}
AP.listings = () => {
  const t = A.tab.listings || 'attente'; const counts = {}; Object.keys(PROPERTY_STATUS).forEach(k => counts[k] = S.properties.filter(p => p.status === k).length);
  const city = A.f.city || '';
  const list = S.properties.filter(p => (t === 'tous' || p.status === t) && (!city || p.city === city) && matchQ(p.title + p.id + p.quartier + fullName(user(p.ownerId)))).sort((a, b) => b.updated.localeCompare(a.updated));
  const reported = id => S.reports.filter(r => r.targetType === 'property' && r.targetId === id && r.status === 'ouvert').length;
  return `<div class="a-head"><h1>Annonces</h1><div class="a-tools">${searchBox('Titre, quartier, propriétaire…')}${sel('city', [['', 'Toutes les villes'], ['Lomé', 'Lomé'], ['Kpalimé', 'Kpalimé'], ['Kara', 'Kara'], ['Cotonou', 'Cotonou']])}</div></div>
  ${tabs('listings', [['attente', 'En attente', counts.attente], ['publiee', 'Publiées', counts.publiee], ['refusee', 'Refusées', counts.refusee], ['suspendue', 'Suspendues', counts.suspendue], ['louee', 'Louées', counts.louee], ['archivee', 'Archivées', counts.archivee], ['brouillon', 'Brouillons', counts.brouillon], ['tous', 'Toutes', S.properties.length]], 'attente')}
  <div class="adm-card p0">${table(['Annonce', 'Type', 'Bailleur', 'Prix', 'Statut', 'Contrôles', 'Mise à jour', ''], list.map(p => { const c = adminChecks(p); const ko = c.filter(x => !x.ok).length; return `<tr class="clk" data-act="aListing" data-id="${p.id}"><td>${propCell(p)}</td><td>${category(p.type).name}</td><td>${p.agencyId ? esc(agency(p.agencyId).name) : esc(fullName(user(p.ownerId)))}</td><td>${money(p.price)}<small>/${p.period}</small></td><td>${tag(PROPERTY_STATUS[p.status])} ${p.verified ? '<span class="tag green">✓</span>' : ''}${reported(p.id) ? ' <span class="tag red">' + ic('flag') + reported(p.id) + '</span>' : ''}</td><td>${ko ? `<span class="tag amber">${ko} alerte(s)</span>` : '<span class="tag green">OK</span>'}</td><td>${fmtDate(p.updated)}</td><td>${ic('next')}</td></tr>`; }))}</div>`;
};
ACT.aListing = d => aModal('listing', d.id);
AM.listing = id => {
  const p = prop(id); if (!p) return null; const o = ownerLabel(p); const checks = adminChecks(p); const reps = S.reports.filter(r => r.targetType === 'property' && r.targetId === p.id);
  const st = p.status;
  return { title: esc(p.title) + ' ' + tag(PROPERTY_STATUS[st]), wide: true, static: true, html: `<div class="a-media">${p.media.map(m => `<div class="a-mitem"><div style="background-image:url('${mediaSrc(m)}')">${m.type === 'video' ? '<span class="play">' + ic('play') + '</span>' : ''}${m.id === p.mainMedia ? '<em>Principale</em>' : ''}</div><small>${esc(m.caption || '')}</small><button class="link small danger-txt" data-act="aDelMedia" data-p="${p.id}" data-m="${m.id}">Retirer</button></div>`).join('')}</div>
  <div class="a-grid2"><div>
    <div class="kv"><div><span>Type</span><b>${category(p.type).name} · ${p.furnished ? 'meublé' : 'non meublé'}</b></div><div><span>Prix</span><b>${money(p.price)} / ${p.period}</b></div><div><span>Pièces</span><b>${p.bedrooms} ch. · ${p.salons} salon · ${p.bathrooms} sdb · ${p.toilets} wc</b></div><div><span>Superficie</span><b>${p.area} m² · étage ${p.floor}/${p.buildingFloors}</b></div><div><span>Caution / avance</span><b>${money(p.deposit)} / ${money(p.advance)}</b></div><div><span>Frais / charges</span><b>${money(p.fees)} / ${money(p.charges)}</b></div><div><span>Réservation</span><b>${p.bookingMode === 'instant' ? 'Instantanée' : 'Avec validation'}</b></div><div><span>Visite</span><b>${hasPublishedTour(p) ? tourOf(p).type.toUpperCase() + ' publiée' : latestTour(p) ? TOUR_STATUS[latestTour(p).status].label : 'Aucune'}</b></div>
    <div class="full"><span>Bailleur</span><b class="clk" data-act="aUser" data-id="${o.userId}">${esc(o.name)} ${o.verified ? '✓' : ''}</b></div><div class="full"><span>Adresse exacte</span><b>${esc(p.address)}, ${esc(p.commune)}, ${esc(p.city)}, ${esc(p.country)}</b></div>
    <div class="full"><span>Description</span><p>${esc(p.description)}</p></div><div class="full"><span>Équipements</span><p>${p.equipments.map(e => equipment(e)?.icon + ' ' + equipment(e)?.name).join(' · ')}</p></div></div>
    ${p.rejectReason ? `<div class="alert red sm">Motif de refus : ${esc(p.rejectReason)}</div>` : ''}${p.suspendReason && st === 'suspendue' ? `<div class="alert red sm">Motif de suspension : ${esc(p.suspendReason)}</div>` : ''}</div>
  <div><div id="a-map" class="mini-map"></div><h4>Vérification de l'annonce</h4><div class="checks">${checks.map(c => `<div class="${c.ok ? 'ok' : 'warn'}">${ic(c.ok ? 'check' : 'alert')}<span>${esc(c.l)}</span></div>`).join('')}</div>
    ${reps.length ? `<h4>Signalements</h4>${reps.map(r => `<div class="a-row"><span><b>${esc(r.reason)}</b> — ${esc(r.desc)}</span><span class="tag ${r.status === 'ouvert' ? 'amber' : 'green'}">${r.status}</span></div>`).join('')}` : ''}
    <label class="check"><input type="checkbox" id="a-verif" ${p.verified ? 'checked' : ''}> Attribuer le badge « Annonce vérifiée »</label>
    <div class="btn-row wrap">${st !== 'publiee' ? `<button class="btn pri" data-act="aValidate" data-id="${p.id}">${ic('check')} Valider et publier</button>` : `<button class="btn sec" data-act="aVerifToggle" data-id="${p.id}">Mettre à jour le badge</button>`}
    ${st === 'attente' ? `<button class="btn danger-o" data-act="aReject" data-id="${p.id}">Refuser avec motif</button>` : ''}${['publiee', 'louee'].includes(st) ? `<button class="btn danger-o" data-act="aSuspend" data-id="${p.id}">${ic('ban')} Suspendre</button>` : ''}${st !== 'archivee' ? `<button class="btn ghost" data-act="aArchive" data-id="${p.id}">Archiver</button>` : ''}</div></div></div>`,
    mount: () => { const el = $('#a-map'); if (el) { const k = MapKit.create(el, { center: [p.lat, p.lng], zoom: 15 }); k.pin([p.lat, p.lng]); k.circle([p.lat, p.lng], 300); } }
  };
};
function notifyManagers(p, title, text) { managersOf(p).forEach(u => notify(u, 'listing', title, text, { s: 'ownerListing', p: { id: p.id } })); }
function checkAlerts(p) {
  for (const uidk in S.savedSearches) (S.savedSearches[uidk] || []).forEach(s => { if (s.alerts && filterProps(Object.assign(defaultFilters(), s.criteria), true).some(x => x.id === p.id)) notify(uidk, 'alert', 'Nouvelle annonce pour « ' + s.name + ' »', p.title + ' — ' + money(p.price) + '/' + p.period, { s: 'property', p: { id: p.id } }); });
}
ACT.aValidate = d => { const p = prop(d.id); p.status = 'publiee'; p.verified = $('#a-verif')?.checked || false; p.rejectReason = null; p.suspendReason = null; p.updated = todayISO(); if (!p.created || p.views === 0) p.created = todayISO(); audit('Validation annonce', p.id, p.verified ? 'avec badge vérifié' : ''); notifyManagers(p, 'Annonce publiée ✓', '« ' + p.title + ' » est maintenant visible par les locataires.'); checkAlerts(p); commit(); aCloseModal(); aToast('Annonce publiée'); };
ACT.aVerifToggle = d => { const p = prop(d.id); p.verified = $('#a-verif').checked; audit('Badge annonce', p.id, p.verified ? 'attribué' : 'retiré'); commit(); A.modal && aRenderModalForce(); aToast('Badge mis à jour'); };
function aRenderModalForce() { const r = $('#a-modal-root'); if (r) r.dataset.key = ''; aRenderModal(); }
ACT.aReject = d => { const p = prop(d.id); A._cb = reason => { p.status = 'refusee'; p.rejectReason = reason; p.updated = todayISO(); audit('Refus annonce', p.id, reason); notifyManagers(p, 'Annonce refusée', '« ' + p.title + ' » : ' + reason); commit(); aToast('Annonce refusée — propriétaire notifié'); }; aModal('reject', p.id); };
AM.reject = id => ({ title: 'Refuser l\'annonce', html: `<form data-submit="aConfirmOk"><p class="muted">Le propriétaire verra ce motif et pourra corriger son annonce.</p><div class="chips-row wrap">${['Photos insuffisantes ou floues (minimum 3 photos nettes).', 'Adresse incomplète ou coordonnées incohérentes.', 'Prix incohérent avec les conditions décrites.', 'Description trop succincte.', 'Logement hors périmètre (non habitable).', 'Doublon d\'une annonce existante.'].map(t => `<button type="button" class="chip" data-act="aPreset" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div><label class="field"><span>Motif du refus</span><textarea class="inp" id="a-reason" name="reason" rows="4" required></textarea></label><div class="btn-row end"><button type="button" class="btn sec" data-act="aCloseModal">Annuler</button><button class="btn danger">Refuser</button></div></form>` });
ACT.aPreset = d => { const t = $('#a-reason'); if (t) t.value = (t.value ? t.value + ' ' : '') + d.t; };
ACT.aSuspend = d => { const p = prop(d.id); aConfirm('Suspendre l\'annonce', `« ${esc(p.title)} » ne sera plus visible.`, reason => { p.status = 'suspendue'; p.suspendReason = reason; audit('Suspension annonce', p.id, reason); notifyManagers(p, 'Annonce suspendue', '« ' + p.title + ' » : ' + reason); commit(); aToast('Annonce suspendue'); }, true, 'Motif de la suspension'); };
ACT.aArchive = d => { const p = prop(d.id); aConfirm('Archiver l\'annonce', `« ${esc(p.title)} » sera archivée.`, () => { p.status = 'archivee'; audit('Archivage annonce', p.id); notifyManagers(p, 'Annonce archivée', p.title); commit(); aToast('Annonce archivée'); }); };
ACT.aDelMedia = d => { const p = prop(d.p); p.media = p.media.filter(m => m.id !== d.m); if (p.mainMedia === d.m) p.mainMedia = p.media[0]?.id || null; audit('Retrait média', p.id); commit(); aRenderModalForce(); aToast('Média retiré'); };

/* ---------------- Réservations ---------------- */
AP.bookings = () => {
  const st = A.f.bstatus || ''; const by = A.f.bby || 'all';
  const list = S.bookings.filter(b => { const p = prop(b.propertyId); const t = user(b.tenantId); const o = ownerLabel(p); const txt = by === 'logement' ? p.title : by === 'locataire' ? fullName(t) : by === 'proprietaire' ? o.name : p.title + fullName(t) + o.name + b.id; return (!st || b.status === st) && matchQ(txt); }).sort((a, b) => b.created - a.created);
  return `<div class="a-head"><h1>Réservations <small>${list.length}</small></h1><div class="a-tools">${sel('bby', [['all', 'Rechercher partout'], ['logement', 'Par logement'], ['locataire', 'Par locataire'], ['proprietaire', 'Par propriétaire']], 'all')}${searchBox('Rechercher…')}${sel('bstatus', [['', 'Tous statuts'], ...Object.entries(BOOKING_STATUS).map(([k, v]) => [k, v.label])])}</div></div>
  <div class="adm-card p0">${table(['Réf.', 'Logement', 'Locataire', 'Bailleur', 'Période', 'Montant', 'Paiement', 'Statut'], list.map(b => { const p = prop(b.propertyId); return `<tr class="clk" data-act="aBooking" data-id="${b.id}"><td>#${b.id.slice(-5).toUpperCase()}</td><td>${esc(p.title)}</td><td>${esc(fullName(user(b.tenantId)))}</td><td>${esc(ownerLabel(p).name)}</td><td>${fmtDateShort(b.start)} → ${fmtDate(b.end)}</td><td>${money(b.amount || b.quote?.dueNow || 0)}</td><td>${b.payment ? esc(b.payment.method) + (b.payment.status === 'rembourse' ? ' <span class="tag gray">remboursé</span>' : '') : '—'}</td><td>${tag(BOOKING_STATUS[b.status])}</td></tr>`; }))}</div>`;
};
ACT.aBooking = d => aModal('booking', d.id);
AM.booking = id => {
  const b = booking(id); const p = prop(b.propertyId); const q = b.quote || quote(p, b.unitType || p.period, b.units, b.promo); const ds = S.disputes.find(x => x.bookingId === b.id);
  return { title: 'Réservation #' + b.id.slice(-5).toUpperCase() + ' ' + tag(BOOKING_STATUS[b.status]), wide: true, html: `<div class="a-grid2"><div>${propCell(p)}<div class="kv"><div><span>Locataire</span><b class="clk" data-act="aUser" data-id="${b.tenantId}">${esc(fullName(user(b.tenantId)))}</b></div><div><span>Bailleur</span><b>${esc(ownerLabel(p).name)}</b></div><div><span>Période</span><b>${fmtDate(b.start)} → ${fmtDate(b.end)}</b></div><div><span>Durée</span><b>${b.units} ${b.unitType || p.period}</b></div><div><span>Mode</span><b>${b.mode === 'instant' ? 'Instantanée' : 'Avec validation'}</b></div><div><span>Paiement</span><b>${b.payment ? esc(b.payment.method + ' · ' + b.payment.ref + ' · ' + b.payment.status) : 'Non payé'}</b></div></div>${quoteHTML(q, p)}</div>
  <div><h4>Historique</h4><div class="tl">${b.history.slice().reverse().map(h => `<div><i class="${BOOKING_STATUS[h.status]?.color || 'gray'}"></i><b>${esc(h.note)}</b><small>${fmtDT(h.at)} · ${h.by === 'system' ? 'Système' : h.by === 'admin' ? 'Administration' : esc(fullName(user(h.by)))}</small></div>`).join('')}</div>
  ${ds ? `<div class="alert amber sm">${ic('gavel')} Litige « ${esc(ds.subject)} » — <a href="#" class="link" data-act="aDispute" data-id="${ds.id}">ouvrir le dossier</a></div>` : ''}
  <div class="btn-row wrap">${['attente', 'acceptee', 'confirmee', 'encours'].includes(b.status) ? `<button class="btn danger-o" data-act="aBkCancel" data-id="${b.id}">Annuler (remboursement)</button>` : ''}${!ds && ['confirmee', 'encours', 'terminee'].includes(b.status) ? `<button class="btn sec" data-act="aBkDispute" data-id="${b.id}">${ic('gavel')} Ouvrir un litige</button>` : ''}</div></div></div>` };
};
ACT.aBkCancel = d => { const b = booking(d.id); aConfirm('Annuler la réservation', 'Les deux parties seront notifiées et le paiement remboursé.', reason => { setBookingStatus(b, 'annulee', 'admin', 'Annulée par l\'administration : ' + reason); b.cancelReason = reason; if (b.payment) b.payment.status = 'rembourse'; audit('Annulation réservation', b.id, reason); notify(b.tenantId, 'booking', 'Réservation annulée', 'L\'administration a annulé votre réservation : ' + reason, { s: 'bookingDetail', p: { id: b.id } }); managersOf(prop(b.propertyId)).forEach(u => notify(u, 'booking', 'Réservation annulée', reason)); commit(); aToast('Réservation annulée'); }, true, 'Motif'); };
ACT.aBkDispute = d => { const b = booking(d.id); const ds = { id: uid('d'), bookingId: b.id, openedBy: 'admin', subject: 'Litige ouvert par l\'administration', desc: 'Dossier ouvert suite à un signalement.', files: [], status: 'ouvert', at: Date.now(), history: [{ at: Date.now(), by: 'admin', text: 'Ouverture du litige par l\'administration' }], decision: null }; S.disputes.unshift(ds); setBookingStatus(b, 'litige', 'admin', 'Litige ouvert'); audit('Ouverture litige', b.id); commit(); aModal('dispute', ds.id); };

/* ---------------- Catégories & équipements ---------------- */
AP.catalog = () => {
  const cats = S.categories.slice().sort((a, b) => a.order - b.order); const eqs = S.equipments.slice().sort((a, b) => a.order - b.order);
  const REQ = [['bedrooms', 'Chambres'], ['area', 'Superficie'], ['floor', 'Étage'], ['floors', 'Nb d\'étages']];
  return `<div class="a-head"><h1>Catégories & équipements</h1></div><div class="a-grid2"><div class="adm-card"><h3>Catégories de logements</h3>
  ${table(['Ordre', 'Catégorie', 'Champs obligatoires', 'Annonces', 'Active'], cats.map((c, i) => `<tr><td><button class="hdr-btn" data-act="aOrder" data-l="categories" data-id="${c.id}" data-d="-1" ${i ? '' : 'disabled'}>${ic('up')}</button><button class="hdr-btn" data-act="aOrder" data-l="categories" data-id="${c.id}" data-d="1" ${i < cats.length - 1 ? '' : 'disabled'}>${ic('down')}</button></td>
  <td><input class="inp sm w-ic" value="${c.icon}" data-chg="aCatEdit" data-id="${c.id}" data-k="icon"> <input class="inp sm" value="${esc(c.name)}" data-chg="aCatEdit" data-id="${c.id}" data-k="name"></td>
  <td>${REQ.map(([k, l]) => `<label class="chip-check sm"><input type="checkbox" ${c.required.includes(k) ? 'checked' : ''} data-chg="aCatReq" data-id="${c.id}" data-k="${k}"><span>${l}</span></label>`).join('')}</td><td>${S.properties.filter(p => p.type === c.id).length}</td>
  <td><input type="checkbox" class="switch" ${c.active ? 'checked' : ''} data-chg="aCatActive" data-id="${c.id}"></td></tr>`))}
  <form data-submit="aCatAdd" class="inline-form"><input class="inp sm w-ic" name="icon" value="🏠" required><input class="inp sm" name="name" placeholder="Nouvelle catégorie (ex. Résidence étudiante)" required><button class="btn sm pri">${ic('plus')} Créer</button></form>
  <p class="hint">Une catégorie désactivée disparaît des filtres et de la publication ; ses annonces ne sont plus listées.</p></div>
  <div class="adm-card"><h3>Équipements</h3><div class="eq-admin">${eqs.map((e, i) => `<div class="a-row"><span><button class="hdr-btn" data-act="aOrder" data-l="equipments" data-id="${e.id}" data-d="-1" ${i ? '' : 'disabled'}>${ic('up')}</button><input class="inp sm w-ic" value="${e.icon}" data-chg="aEqEdit" data-id="${e.id}" data-k="icon"> <input class="inp sm" value="${esc(e.name)}" data-chg="aEqEdit" data-id="${e.id}" data-k="name"></span><small class="muted">${S.properties.filter(p => p.equipments.includes(e.id)).length} annonces</small><input type="checkbox" class="switch" ${e.active ? 'checked' : ''} data-chg="aEqActive" data-id="${e.id}"></div>`).join('')}</div>
  <form data-submit="aEqAdd" class="inline-form"><input class="inp sm w-ic" name="icon" value="✨" required><input class="inp sm" name="name" placeholder="Nouvel équipement" required><button class="btn sm pri">${ic('plus')} Ajouter</button></form>
  ${S.audit.filter(a => a.action === 'Suggestion d\'équipement').length ? `<h4>Suggestions des propriétaires</h4>${S.audit.filter(a => a.action === 'Suggestion d\'équipement').map(a => `<div class="a-row"><span>« ${esc(a.detail)} »</span><button class="btn sm sec" data-act="aEqFromSug" data-n="${esc(a.detail)}">Ajouter</button></div>`).join('')}` : ''}</div></div>`;
};
ACT.aOrder = d => { const l = S[d.l].slice().sort((a, b) => a.order - b.order); const i = l.findIndex(x => x.id === d.id); const j = i + +d.d; [l[i].order, l[j].order] = [l[j].order, l[i].order]; commit(); };
ACT.aCatEdit = (d, el) => { category(d.id)[d.k] = el.value; audit('Modification catégorie', d.id, d.k); commit(); aToast('Catégorie mise à jour'); };
ACT.aCatReq = (d, el) => { const c = category(d.id); c.required = el.checked ? [...new Set([...c.required, d.k])] : c.required.filter(x => x !== d.k); commit(); aToast('Caractéristiques obligatoires mises à jour'); };
ACT.aCatActive = (d, el) => { category(d.id).active = el.checked; audit(el.checked ? 'Activation catégorie' : 'Désactivation catégorie', d.id); commit(); };
ACT.aCatAdd = (o, f) => { S.categories.push({ id: norm(o.name).replace(/\W+/g, '-'), name: o.name, icon: o.icon, active: true, order: S.categories.length + 1, required: [] }); audit('Création catégorie', o.name); f.reset(); commit(); aToast('Catégorie créée'); };
ACT.aEqEdit = (d, el) => { equipment(d.id)[d.k] = el.value; commit(); aToast('Équipement mis à jour'); };
ACT.aEqActive = (d, el) => { equipment(d.id).active = el.checked; commit(); };
ACT.aEqAdd = (o, f) => { S.equipments.push({ id: uid('eq'), name: o.name, icon: o.icon, active: true, order: S.equipments.length + 1 }); audit('Ajout équipement', o.name); f && f.reset && f.reset(); commit(); aToast('Équipement ajouté'); };
ACT.aEqFromSug = d => { ACT.aEqAdd({ name: d.n, icon: '✨' }); S.audit = S.audit.filter(a => !(a.action === 'Suggestion d\'équipement' && a.detail === d.n)); commit(); };

/* ---------------- Modération ---------------- */
function reportTarget(r) {
  if (r.targetType === 'property') { const p = prop(r.targetId); return p ? `<a href="#" class="link" data-act="aListing" data-id="${p.id}">🏠 ${esc(p.title)}</a>` : 'Annonce supprimée'; }
  if (r.targetType === 'user') return `<a href="#" class="link" data-act="aUser" data-id="${r.targetId}">👤 ${esc(fullName(user(r.targetId)))}</a>`;
  if (r.targetType === 'review') { const rv = S.reviews.find(x => x.id === r.targetId); return '⭐ Avis : « ' + esc((rv?.comment || '').slice(0, 50)) + '… »'; }
  if (r.targetType === 'conversation') return '💬 Conversation';
  return r.targetType;
}
AP.moderation = () => {
  const t = A.tab.mod || 'reports';
  const openR = S.reports.filter(r => r.status === 'ouvert'); const revs = S.reviews.filter(r => r.reported && r.status === 'publie'); const ds = S.disputes;
  const suspects = S.users.filter(u => u.status === 'suspendu' || S.reports.some(r => r.targetType === 'user' && r.targetId === u.id) || (u.roles.includes('proprietaire') && !u.ownerVerified && S.properties.some(p => p.ownerId === u.id && p.status === 'publiee')));
  const suspectProps = S.properties.filter(p => S.reports.some(r => r.targetType === 'property' && r.targetId === p.id) || adminChecks(p).filter(c => !c.ok).length >= 3);
  let body = '';
  if (t === 'reports') body = table(['Date', 'Motif', 'Cible', 'Signalé par', 'Description', 'Statut', 'Actions'], S.reports.slice().sort((a, b) => (a.status === 'ouvert' ? -1 : 1) - (b.status === 'ouvert' ? -1 : 1) || b.at - a.at).map(r => `<tr><td>${timeAgo(r.at)}</td><td><b>${esc(r.reason)}</b></td><td>${reportTarget(r)}</td><td>${esc(fullName(user(r.by)))}</td><td class="wrap">${esc(r.desc)}</td><td>${r.status === 'ouvert' ? '<span class="tag amber">Ouvert</span>' : '<span class="tag green">Traité</span><small> ' + esc(r.decision || '') + '</small>'}</td>
    <td>${r.status === 'ouvert' ? `<div class="btn-row wrap">${r.targetType === 'property' ? `<button class="btn sm danger-o" data-act="aRepAct" data-id="${r.id}" data-a="suspendProp">Suspendre l'annonce</button>` : ''}${r.targetType === 'user' || r.targetType === 'conversation' ? `<button class="btn sm danger-o" data-act="aRepAct" data-id="${r.id}" data-a="suspendUser">Suspendre l'utilisateur</button>` : ''}${r.targetType === 'review' ? `<button class="btn sm danger-o" data-act="aRepAct" data-id="${r.id}" data-a="hideReview">Masquer l'avis</button>` : ''}<button class="btn sm sec" data-act="aRepAct" data-id="${r.id}" data-a="warn">Avertir</button><button class="btn sm ghost" data-act="aRepAct" data-id="${r.id}" data-a="dismiss">Classer</button></div>` : ''}</td></tr>`));
  if (t === 'reviews') body = revs.map(rv => `<div class="adm-card"><div class="row-between"><div>${userCell(user(rv.authorId))}</div>${starsHTML(Object.values(rv.scores).reduce((a, b) => a + b, 0) / 5)}</div><p>« ${esc(rv.comment)} »</p><small class="muted">Sur ${esc(prop(rv.propertyId).title)} · ${rv.bookingId ? 'réservation vérifiée' : '<b class="err-txt">sans réservation liée</b>'} · motif : ${esc(rv.reportReason || '')}</small><div class="btn-row"><button class="btn sm sec" data-act="aReview" data-id="${rv.id}" data-s="keep">Conserver</button><button class="btn sm danger" data-act="aReview" data-id="${rv.id}" data-s="masque">Masquer l'avis</button></div></div>`).join('') || '<div class="adm-card muted">Aucun avis signalé.</div>'
    + `<div class="adm-card"><h3>Tous les avis</h3>${table(['Auteur', 'Logement', 'Note', 'Commentaire', 'Statut', ''], S.reviews.map(rv => `<tr><td>${esc(fullName(user(rv.authorId)))}</td><td>${esc(prop(rv.propertyId).title)}</td><td>${(Object.values(rv.scores).reduce((a, b) => a + b, 0) / 5).toFixed(1)} ★</td><td class="wrap">${esc(rv.comment)}</td><td><span class="tag ${rv.status === 'publie' ? 'green' : 'gray'}">${rv.status === 'publie' ? 'Publié' : 'Masqué'}</span></td><td><button class="btn sm ghost" data-act="aReview" data-id="${rv.id}" data-s="${rv.status === 'publie' ? 'masque' : 'publie'}">${rv.status === 'publie' ? 'Masquer' : 'Republier'}</button></td></tr>`))}</div>`;
  if (t === 'disputes') body = table(['Ouvert', 'Objet', 'Réservation', 'Parties', 'Pièces', 'Statut', ''], ds.map(d => { const b = booking(d.bookingId); const p = prop(b.propertyId); return `<tr class="clk" data-act="aDispute" data-id="${d.id}"><td>${timeAgo(d.at)}</td><td><b>${esc(d.subject)}</b></td><td>#${b.id.slice(-5).toUpperCase()} · ${esc(p.title)}</td><td>${esc(fullName(user(b.tenantId)))} / ${esc(ownerLabel(p).name)}</td><td>${d.files.length}</td><td><span class="tag ${d.status === 'ouvert' ? 'amber' : 'green'}">${d.status === 'ouvert' ? 'En cours' : 'Clôturé'}</span></td><td>${ic('next')}</td></tr>`; }));
  if (t === 'suspects') body = `<div class="a-grid2"><div class="adm-card"><h3>Comptes suspects</h3>${suspects.map(u => `<div class="a-row clk" data-act="aUser" data-id="${u.id}">${userCell(u)}<span>${u.status === 'suspendu' ? '<span class="tag red">Suspendu</span>' : ''}${S.reports.some(r => r.targetType === 'user' && r.targetId === u.id) ? '<span class="tag amber">Signalé</span>' : ''}${u.roles.includes('proprietaire') && !u.ownerVerified ? '<span class="tag gray">Non vérifié</span>' : ''}</span></div>`).join('') || '<p class="muted">Aucun</p>'}</div>
    <div class="adm-card"><h3>Annonces suspectes</h3>${suspectProps.map(p => `<div class="a-row clk" data-act="aListing" data-id="${p.id}">${propCell(p)}<span class="tag amber">${adminChecks(p).filter(c => !c.ok).length} alerte(s)</span></div>`).join('') || '<p class="muted">Aucune</p>'}</div></div>`;
  if (t === 'history') body = table(['Date', 'Administrateur', 'Action', 'Cible', 'Détail'], S.audit.filter(a => /Suspension|Refus|Masquage|Classement|Avertissement|Décision|Validation|Litige|Modération/.test(a.action)).map(a => `<tr><td>${fmtDT(a.at)}</td><td>${esc(S.admins.find(x => x.id === a.actor)?.name || 'Système')}</td><td><b>${esc(a.action)}</b></td><td>${esc(a.target || '')}</td><td class="wrap">${esc(a.detail || '')}</td></tr>`));
  return `<div class="a-head"><h1>Modération</h1></div>${tabs('mod', [['reports', 'Signalements', openR.length], ['reviews', 'Avis signalés', revs.length], ['disputes', 'Litiges', ds.filter(d => d.status === 'ouvert').length], ['suspects', 'Comptes & annonces suspects', suspects.length + suspectProps.length], ['history', 'Historique des décisions', null]], 'reports')}<div class="${['reports', 'disputes', 'history'].includes(t) ? 'adm-card p0' : ''}">${body}</div>`;
};
ACT.aRepAct = d => {
  const r = S.reports.find(x => x.id === d.id);
  const finish = (decision, act) => { r.status = 'traite'; r.decision = decision; audit(act, r.targetId, decision); notify(r.by, 'system', 'Signalement traité', 'Merci pour votre signalement « ' + r.reason + ' ». Décision : ' + decision); commit(); aToast('Signalement traité'); };
  if (d.a === 'suspendProp') { const p = prop(r.targetId); p.status = 'suspendue'; p.suspendReason = r.reason + ' (signalement)'; notifyManagers(p, 'Annonce suspendue', '« ' + p.title + ' » : ' + r.reason); finish('Annonce suspendue', 'Suspension annonce'); }
  else if (d.a === 'suspendUser') { const uid2 = r.targetType === 'user' ? r.targetId : (S.conversations.find(c => c.id === r.targetId)?.participants.find(x => x !== r.by)); if (uid2) { user(uid2).status = 'suspendu'; notify(uid2, 'system', 'Compte suspendu', 'Votre compte est suspendu suite à un signalement : ' + r.reason); } finish('Utilisateur suspendu', 'Suspension utilisateur'); }
  else if (d.a === 'hideReview') { const rv = S.reviews.find(x => x.id === r.targetId); if (rv) rv.status = 'masque'; finish('Avis masqué', 'Masquage avis'); }
  else if (d.a === 'warn') { const target = r.targetType === 'property' ? prop(r.targetId)?.ownerId : r.targetType === 'user' ? r.targetId : null; if (target) notify(target, 'system', 'Avertissement de la modération', 'Un signalement vous concernant a été examiné (' + r.reason + '). Merci de respecter la charte DomiLoc.'); finish('Avertissement envoyé', 'Avertissement'); }
  else finish('Classé sans suite', 'Classement signalement');
};
ACT.aReview = d => { const rv = S.reviews.find(x => x.id === d.id); if (d.s === 'keep') { rv.reported = false; audit('Modération avis', rv.id, 'conservé'); } else { rv.status = d.s; rv.reported = false; audit(d.s === 'masque' ? 'Masquage avis' : 'Modération avis', rv.id, d.s); } S.reports.filter(r => r.targetType === 'review' && r.targetId === rv.id && r.status === 'ouvert').forEach(r => { r.status = 'traite'; r.decision = d.s === 'masque' ? 'Avis masqué' : 'Avis conservé'; }); commit(); aToast('Avis mis à jour'); };
ACT.aDispute = d => aModal('dispute', d.id);
AM.dispute = id => {
  const d = S.disputes.find(x => x.id === id); const b = booking(d.bookingId); const p = prop(b.propertyId);
  return { title: 'Litige · ' + esc(d.subject), wide: true, html: `<div class="a-grid2"><div>${propCell(p)}<div class="kv"><div><span>Locataire</span><b>${esc(fullName(user(b.tenantId)))}</b></div><div><span>Bailleur</span><b>${esc(ownerLabel(p).name)}</b></div><div><span>Réservation</span><b class="clk" data-act="aBooking" data-id="${b.id}">#${b.id.slice(-5).toUpperCase()} · ${money(b.payment?.amount || 0)}</b></div><div><span>Caution</span><b>${money(p.deposit)}</b></div></div>
  <p>${esc(d.desc)}</p><h4>Pièces justificatives</h4><div class="chips-row wrap">${d.files.map(f => `<button class="chip" data-act="aDocView" data-n="${esc(f)}">${ic('file')} ${esc(f)}</button>`).join('') || '<span class="muted small">Aucune</span>'}</div></div>
  <div><h4>Historique</h4><div class="tl">${d.history.map(h => `<div><i class="${h.by === 'admin' ? 'blue' : 'gray'}"></i><b>${esc(h.text)}</b><small>${fmtDT(h.at)} · ${h.by === 'admin' ? 'Administration' : esc(fullName(user(h.by)))}</small></div>`).join('')}</div>
  ${d.status === 'ouvert' ? `<form data-submit="aDisputeMsg" class="form"><input type="hidden" name="id" value="${d.id}"><textarea class="inp" name="text" rows="2" placeholder="Demander une pièce, noter un échange…" required></textarea><button class="btn sm sec">Ajouter au dossier</button></form>
  <form data-submit="aDisputeDecide" class="form card"><input type="hidden" name="id" value="${d.id}"><b>Rendre la décision</b><select class="inp" name="outcome"><option>En faveur du locataire — restitution intégrale de la caution</option><option>En faveur du propriétaire — retenue justifiée</option><option>Partage — restitution partielle de la caution</option><option>Litige sans fondement — classé</option></select><textarea class="inp" name="note" rows="2" placeholder="Motivation de la décision" required></textarea><button class="btn pri">${ic('gavel')} Clôturer le litige</button></form>` : `<div class="alert green">${ic('check')} Décision : ${esc(d.decision)}</div>`}</div></div>` };
};
ACT.aDisputeMsg = (o, f) => { const d = S.disputes.find(x => x.id === o.id); d.history.push({ at: Date.now(), by: 'admin', text: o.text }); const b = booking(d.bookingId); [b.tenantId, ...managersOf(prop(b.propertyId))].forEach(u => notify(u, 'booking', 'Litige : nouvel élément', o.text, { s: 'disputeDetail', p: { id: d.id } })); f.reset(); commit(); };
ACT.aDisputeDecide = o => {
  const d = S.disputes.find(x => x.id === o.id); const b = booking(d.bookingId);
  d.status = 'clos'; d.decision = o.outcome + ' — ' + o.note; d.history.push({ at: Date.now(), by: 'admin', text: 'Décision : ' + d.decision });
  setBookingStatus(b, 'terminee', 'admin', 'Litige clôturé'); audit('Décision litige', d.id, o.outcome);
  [b.tenantId, ...managersOf(prop(b.propertyId))].forEach(u => notify(u, 'booking', 'Décision sur le litige', o.outcome, { s: 'disputeDetail', p: { id: d.id } }));
  commit(); aToast('Litige clôturé — parties notifiées');
};

/* ---------------- Visites virtuelles ---------------- */
AP.tours = () => {
  const list = S.tours.slice().sort((a, b) => ({ traitement: 0, echoue: 1, termine: 2, recus: 3 }[a.status] ?? 9) - ({ traitement: 0, echoue: 1, termine: 2, recus: 3 }[b.status] ?? 9));
  const storage = S.tours.reduce((a, t) => a + t.sizeMB, 0); const quota = 50000; const f = A.f.tstatus || '';
  return `<div class="a-head"><h1>Visites virtuelles</h1><div class="a-tools">${sel('tstatus', [['', 'Tous statuts'], ...Object.entries(TOUR_STATUS).map(([k, v]) => [k, v.label])])}</div></div>
  <div class="a-kpis">${kpi('Visites publiées', S.tours.filter(t => t.status === 'publiee').length, 'cube')}${kpi('Traitements en cours', S.tours.filter(t => ['recus', 'traitement'].includes(t.status)).length, 'refresh')}${kpi('En échec', S.tours.filter(t => t.status === 'echoue').length, 'alert')}${kpi('À modérer', S.tours.filter(t => t.status === 'termine').length, 'eye')}</div>
  <div class="adm-card"><div class="row-between"><h3>Stockage objet (S3)</h3><span>${(storage / 1000).toFixed(2).replace('.', ',')} Go / ${quota / 1000} Go</span></div><div class="progress"><b style="width:${storage / quota * 100}%"></b></div><small class="muted">Panoramas, vidéos sources, nuages de points, modèles .splat/.glb, miniatures. CDN activé pour la diffusion.</small></div>
  <div class="adm-card p0">${table(['Logement', 'Type', 'Statut', 'Progression', 'Fichiers', 'Taille', 'Créée', 'Actions'], list.filter(t => !f || t.status === f).map(t => { const p = prop(t.propertyId); return `<tr><td>${p ? propCell(p) : '—'}</td><td>${t.type === '3d' ? 'Reconstruction 3D' : '360°'}</td><td>${tag(TOUR_STATUS[t.status])}${t.error ? `<small class="err-txt block">${esc(t.error)}</small>` : ''}</td><td>${t.status === 'traitement' ? `<span class="progress sm"><b style="width:${t.progress}%"></b></span> ${t.progress} %<small class="block muted">${esc(t.stage || '')}</small>` : t.progress + ' %'}</td><td>${t.files}</td><td>${t.sizeMB} Mo</td><td>${fmtDate(t.created)}</td>
  <td><div class="btn-row wrap">${['termine', 'publiee'].includes(t.status) ? `<button class="btn sm sec" data-act="aTourView" data-id="${t.id}">${ic('eye')} Voir</button>` : ''}${t.status === 'echoue' ? `<button class="btn sm pri" data-act="aTourRetry" data-id="${t.id}">${ic('refresh')} Relancer</button>` : ''}${t.status === 'termine' ? `<button class="btn sm pri" data-act="aTourPublish" data-id="${t.id}">Publier</button>` : ''}${t.status === 'publiee' ? `<button class="btn sm danger-o" data-act="aTourUnpublish" data-id="${t.id}">Dépublier</button>` : ''}<button class="btn sm ghost" data-act="aTourFiles" data-id="${t.id}">${ic('file')}</button></div></td></tr>`; }))}</div>`;
};
ACT.aTourView = d => aModal('tourView', d.id);
AM.tourView = id => { const t = S.tours.find(x => x.id === id); const p = prop(t.propertyId); return { title: 'Visite · ' + esc(p.title), wide: true, cls: 'tour-modal', static: true, html: `<div class="a-tour" id="a-tour"></div><p class="hint">Visualiseur intégré au navigateur sans installation. Prototype en CSS 3D ; en production : WebGL (Three.js + rendu Gaussian Splatting).</p>`, mount: () => TourViewer.mount($('#a-tour'), p, { tourId: t.id, closeAct: 'aCloseModal' }) }; };
ACT.aTourRetry = d => { const t = S.tours.find(x => x.id === d.id); t.status = 'traitement'; t.progress = 0; t.error = null; t.forceFail = null; t.log.push({ at: Date.now(), s: 'traitement' }); audit('Relance traitement 3D', t.propertyId); commit(); aToast('Traitement relancé'); };
ACT.aTourPublish = d => { const t = S.tours.find(x => x.id === d.id); const p = prop(t.propertyId); t.status = 'publiee'; p.tourId = t.id; t.log.push({ at: Date.now(), s: 'publiee' }); audit('Validation visite', p.id, 'publiée par la modération'); notifyManagers(p, 'Visite publiée', 'La visite de « ' + p.title + ' » a été publiée.'); commit(); aToast('Visite publiée'); };
ACT.aTourUnpublish = d => { const t = S.tours.find(x => x.id === d.id); const p = prop(t.propertyId); aConfirm('Dépublier la visite', 'La visite ne sera plus visible par les locataires.', reason => { t.status = 'termine'; if (p.tourId === t.id) p.tourId = null; audit('Modération visite', p.id, 'dépubliée : ' + reason); notifyManagers(p, 'Visite retirée', reason); commit(); aToast('Visite dépubliée'); }, true, 'Motif (contenu inapproprié, données personnelles visibles…)'); };
ACT.aTourFiles = d => aModal('tourFiles', d.id);
AM.tourFiles = id => { const t = S.tours.find(x => x.id === id); const files = [['sources/', t.files + ' images JPEG', Math.round(t.sizeMB * .55)], ['panoramas/', (t.rooms || tourRooms(prop(t.propertyId))).length + ' équirectangulaires 8K', Math.round(t.sizeMB * .2)], ...(t.type === '3d' ? [['model.splat', 'Gaussian Splatting', Math.round(t.sizeMB * .18)], ['model.glb', 'Maillage simplifié (mobile)', Math.round(t.sizeMB * .05)]] : []), ['thumbs/', 'Miniatures WebP', 2]]; return { title: 'Fichiers de la visite', html: table(['Chemin', 'Contenu', 'Taille'], files.map(([a, b, c]) => `<tr><td><code>s3://domiloc-tours/${t.id}/${a}</code></td><td>${b}</td><td>${c} Mo</td></tr>`)) + `<div class="btn-row end"><button class="btn danger-o" data-act="aTourPurge" data-id="${t.id}">Purger les sources</button></div>` }; };
ACT.aTourPurge = d => { const t = S.tours.find(x => x.id === d.id); t.sizeMB = Math.round(t.sizeMB * .45); audit('Purge fichiers sources', t.propertyId); commit(); aCloseModal(); aToast('Sources purgées — stockage libéré'); };

/* ---------------- Promotions ---------------- */
AP.promos = () => `<div class="a-head"><h1>Codes promotionnels</h1><div class="a-tools"><button class="btn pri" data-act="aPromoEdit" data-id="">${ic('plus')} Nouvelle promotion</button></div></div>
  <div class="adm-card p0">${table(['Code', 'Réduction', 'Validité', 'Utilisations', 'Conditions', 'Statut', ''], S.promotions.map(p => { const t = todayISO(); const live = p.active && t >= p.start && t <= p.end && p.used < p.maxUses; return `<tr class="clk" data-act="aPromoEdit" data-id="${p.id}"><td><code class="code">${esc(p.code)}</code></td><td>${p.type === 'percent' ? p.value + ' %' : money(p.value)}</td><td>${fmtDate(p.start)} → ${fmtDate(p.end)}</td><td><span class="progress sm"><b style="width:${p.used / p.maxUses * 100}%"></b></span> ${p.used}/${p.maxUses}</td><td class="wrap">${esc(p.conditions)}</td><td>${live ? '<span class="tag green">Active</span>' : !p.active ? '<span class="tag gray">Désactivée</span>' : t < p.start ? '<span class="tag blue">Programmée</span>' : '<span class="tag gray">Expirée</span>'}</td><td>${ic('edit')}</td></tr>`; }))}</div>
  <p class="hint">Les codes s'appliquent automatiquement au calcul du montant lors de la réservation mobile (ex. testez BIENVENUE10).</p>`;
ACT.aPromoEdit = d => aModal('promo', d.id);
AM.promo = id => { const p = S.promotions.find(x => x.id === id) || { id: '', code: '', type: 'percent', value: 10, start: todayISO(), end: addDays(todayISO(), 30), maxUses: 100, used: 0, conditions: '', active: true }; return { title: id ? 'Modifier ' + esc(p.code) : 'Nouvelle promotion', html: `<form data-submit="aPromoSave" class="form"><input type="hidden" name="id" value="${p.id}"><div class="grid2"><label class="field"><span>Code</span><input class="inp" name="code" value="${esc(p.code)}" required pattern="[A-Za-z0-9]+" style="text-transform:uppercase"></label><label class="field"><span>Type</span><select class="inp" name="type"><option value="percent" ${p.type === 'percent' ? 'selected' : ''}>Pourcentage</option><option value="amount" ${p.type === 'amount' ? 'selected' : ''}>Montant fixe (FCFA)</option></select></label>
  <label class="field"><span>Valeur</span><input class="inp" type="number" name="value" value="${p.value}" min="1" required></label><label class="field"><span>Utilisations max.</span><input class="inp" type="number" name="maxUses" value="${p.maxUses}" min="1" required></label><label class="field"><span>Début</span><input class="inp" type="date" name="start" value="${p.start}" required></label><label class="field"><span>Fin</span><input class="inp" type="date" name="end" value="${p.end}" required></label></div>
  <label class="field"><span>Conditions d'utilisation</span><input class="inp" name="conditions" value="${esc(p.conditions)}"></label><label class="switch-row"><span>Active</span><input type="checkbox" class="switch" name="active" ${p.active ? 'checked' : ''}></label>${id ? `<p class="small muted">Utilisations : ${p.used}</p>` : ''}
  <div class="btn-row end">${id ? `<button type="button" class="btn danger-o" data-act="aPromoDel" data-id="${id}">Supprimer</button>` : ''}<button class="btn pri">Enregistrer</button></div></form>` }; };
ACT.aPromoSave = o => { let p = S.promotions.find(x => x.id === o.id); if (!p) { p = { id: uid('pr'), used: 0 }; S.promotions.push(p); } Object.assign(p, { code: o.code.toUpperCase(), type: o.type, value: +o.value, maxUses: +o.maxUses, start: o.start, end: o.end, conditions: o.conditions, active: o.active === 'on' }); audit('Promotion', p.code, 'enregistrée'); commit(); aCloseModal(); aToast('Promotion enregistrée'); };
ACT.aPromoDel = d => { S.promotions = S.promotions.filter(x => x.id !== d.id); commit(); aCloseModal(); aToast('Promotion supprimée'); };

/* ---------------- Contenus ---------------- */
AP.content = () => {
  const c = S.content; const t = A.tab.content || 'home';
  let body = '';
  if (t === 'home') body = `<div class="a-grid2"><div class="adm-card"><h3>Bannières de la page d'accueil mobile</h3>${c.banners.map(b => `<div class="a-banner" style="--bc:${b.color}"><div><b>${esc(b.title)}</b><small>${esc(b.text)}</small></div><input type="checkbox" class="switch" ${b.active ? 'checked' : ''} data-chg="aBannerToggle" data-id="${b.id}"><button class="hdr-btn" data-act="aBannerEdit" data-id="${b.id}">${ic('edit')}</button></div>`).join('')}<button class="btn sec" data-act="aBannerEdit" data-id="">${ic('plus')} Ajouter une bannière</button></div>
  <div class="adm-card"><h3>Sections de l'accueil</h3>${[['recommended', 'Recommandés'], ['recent', 'Récemment publiés'], ['nearby', 'À proximité'], ['tours', 'Avec visite virtuelle'], ['popular', 'Populaires'], ['verified', 'Vérifiés']].map(([k, l]) => `<label class="switch-row"><span>${l}</span><input type="checkbox" class="switch" ${c.sections[k] !== false ? 'checked' : ''} data-chg="aSection" data-k="${k}"></label>`).join('')}
  <h3>Message d'information</h3><label class="switch-row"><span>Afficher sur l'accueil mobile</span><input type="checkbox" class="switch" ${c.info.active ? 'checked' : ''} data-chg="aInfoToggle"></label><textarea class="inp" rows="2" data-chg="aInfoText">${esc(c.info.text)}</textarea>
  <button class="btn sec sm" data-act="aBroadcast">${ic('bell')} Envoyer en notification push à tous</button></div></div>`;
  if (t === 'pages') body = Object.entries(c.pages).map(([k, pg]) => `<form class="adm-card form" data-submit="aPageSave"><input type="hidden" name="k" value="${k}"><label class="field"><span>Titre</span><input class="inp" name="title" value="${esc(pg.title)}"></label><label class="field"><span>Contenu</span><textarea class="inp" name="body" rows="5">${esc(pg.body)}</textarea></label><div class="btn-row end"><button class="btn pri sm">Publier</button></div></form>`).join('');
  if (t === 'faq') body = `<div class="adm-card">${c.faqs.map(f => `<form class="form a-faq" data-submit="aFaqSave"><input type="hidden" name="id" value="${f.id}"><input class="inp" name="q" value="${esc(f.q)}"><textarea class="inp" name="a" rows="2">${esc(f.a)}</textarea><div class="btn-row end"><button type="button" class="btn sm ghost danger-txt" data-act="aFaqDel" data-id="${f.id}">${ic('trash')}</button><button class="btn sm sec">Enregistrer</button></div></form>`).join('')}<form class="form a-faq" data-submit="aFaqSave"><input type="hidden" name="id" value=""><input class="inp" name="q" placeholder="Nouvelle question" required><textarea class="inp" name="a" rows="2" placeholder="Réponse" required></textarea><div class="btn-row end"><button class="btn sm pri">${ic('plus')} Ajouter</button></div></form></div>`;
  return `<div class="a-head"><h1>Gestion des contenus</h1></div>${tabs('content', [['home', 'Accueil mobile'], ['pages', 'Pages (CGU, confidentialité…)'], ['faq', 'Questions fréquentes', c.faqs.length]], 'home')}${body}<p class="hint">Les modifications sont visibles immédiatement dans l'application mobile (vue côte à côte).</p>`;
};
ACT.aBannerToggle = (d, el) => { S.content.banners.find(b => b.id === d.id).active = el.checked; commit(); aToast('Bannière ' + (el.checked ? 'activée' : 'désactivée')); };
ACT.aBannerEdit = d => aModal('banner', d.id);
AM.banner = id => { const b = S.content.banners.find(x => x.id === id) || { id: '', title: '', text: '', color: '#0F766E', cta: 'Découvrir', action: 'search', active: true }; return { title: id ? 'Modifier la bannière' : 'Nouvelle bannière', html: `<form data-submit="aBannerSave" class="form"><input type="hidden" name="id" value="${b.id}"><label class="field"><span>Titre</span><input class="inp" name="title" value="${esc(b.title)}" required></label><label class="field"><span>Texte</span><input class="inp" name="text" value="${esc(b.text)}"></label><div class="grid3"><label class="field"><span>Couleur</span><input class="inp" type="color" name="color" value="${b.color}"></label><label class="field"><span>Bouton</span><input class="inp" name="cta" value="${esc(b.cta)}"></label><label class="field"><span>Action</span><select class="inp" name="action">${[['search', 'Recherche'], ['tour', 'Visites 3D'], ['owner', 'Espace propriétaire']].map(([v, l]) => `<option value="${v}" ${b.action === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div><div class="btn-row end">${id ? `<button type="button" class="btn danger-o" data-act="aBannerDel" data-id="${id}">Supprimer</button>` : ''}<button class="btn pri">Enregistrer</button></div></form>` }; };
ACT.aBannerSave = o => { let b = S.content.banners.find(x => x.id === o.id); if (!b) { b = { id: uid('bn'), active: true }; S.content.banners.push(b); } Object.assign(b, { title: o.title, text: o.text, color: o.color, cta: o.cta, action: o.action }); audit('Contenu', 'bannière', o.title); commit(); aCloseModal(); aToast('Bannière enregistrée'); };
ACT.aBannerDel = d => { S.content.banners = S.content.banners.filter(b => b.id !== d.id); commit(); aCloseModal(); };
ACT.aSection = (d, el) => { S.content.sections[d.k] = el.checked; commit(); };
ACT.aInfoToggle = (d, el) => { S.content.info.active = el.checked; commit(); };
ACT.aInfoText = (d, el) => { S.content.info.text = el.value; commit(); aToast('Message mis à jour'); };
ACT.aBroadcast = () => { S.users.filter(u => u.status === 'actif').forEach(u => notify(u.id, 'system', 'Information DomiLoc', S.content.info.text)); audit('Diffusion notification', 'tous', S.content.info.text); commit(); aToast('Notification envoyée à ' + S.users.filter(u => u.status === 'actif').length + ' utilisateurs'); };
ACT.aPageSave = o => { S.content.pages[o.k] = { title: o.title, body: o.body }; audit('Contenu', o.k, 'page publiée'); commit(); aToast('Page publiée'); };
ACT.aFaqSave = (o, f) => { let q = S.content.faqs.find(x => x.id === o.id); if (!q) { q = { id: uid('f') }; S.content.faqs.push(q); f.reset(); } q.q = o.q; q.a = o.a; commit(); aToast('FAQ enregistrée'); };
ACT.aFaqDel = d => { S.content.faqs = S.content.faqs.filter(f => f.id !== d.id); commit(); };

/* ---------------- Support ---------------- */
AP.support = () => {
  const st = A.f.tkstatus || '';
  const list = S.tickets.filter(t => (!st || t.status === st) && matchQ(t.subject + fullName(user(t.userId)))).sort((a, b) => (a.status === 'ouvert' ? -1 : 1) - (b.status === 'ouvert' ? -1 : 1) || b.at - a.at);
  return `<div class="a-head"><h1>Support & tickets</h1><div class="a-tools">${searchBox('Objet, utilisateur…')}${sel('tkstatus', [['', 'Tous'], ['ouvert', 'Ouverts'], ['repondu', 'Répondus'], ['resolu', 'Résolus']])}</div></div>
  <div class="adm-card p0">${table(['Ticket', 'Utilisateur', 'Catégorie', 'Messages', 'Dernière activité', 'Statut'], list.map(t => `<tr class="clk" data-act="aTicket" data-id="${t.id}"><td><b>${esc(t.subject)}</b></td><td>${esc(fullName(user(t.userId)))}</td><td>${esc(t.category)}</td><td>${t.messages.length}</td><td>${timeAgo(t.messages.at(-1).at)}</td><td><span class="tag ${t.status === 'resolu' ? 'green' : t.status === 'repondu' ? 'blue' : 'amber'}">${{ ouvert: 'Ouvert', repondu: 'Répondu', resolu: 'Résolu' }[t.status]}</span></td></tr>`))}</div>`;
};
ACT.aTicket = d => aModal('ticket', d.id);
AM.ticket = id => { const t = S.tickets.find(x => x.id === id); return { title: esc(t.subject), html: `<div class="chat a-chat">${t.messages.map(m => `<div class="msg ${m.from === 'admin' ? 'me' : 'them'}"><b class="small">${m.from === 'admin' ? 'Support DomiLoc' : esc(fullName(user(m.from)))}</b><p>${esc(m.text)}</p><small>${fmtDT(m.at)}</small></div>`).join('')}</div>
  <form data-submit="aTicketReply" class="form"><input type="hidden" name="id" value="${t.id}"><textarea class="inp" name="text" rows="3" placeholder="Réponse à l'utilisateur" required></textarea><div class="btn-row end"><label class="check"><input type="checkbox" name="resolve"> Marquer comme résolu</label><button class="btn pri">${ic('send')} Répondre</button></div></form>` }; };
ACT.aTicketReply = o => { const t = S.tickets.find(x => x.id === o.id); t.messages.push({ from: 'admin', text: o.text, at: Date.now() }); t.status = o.resolve === 'on' ? 'resolu' : 'repondu'; notify(t.userId, 'system', 'Réponse du support', t.subject + ' : ' + o.text.slice(0, 80), { s: 'ticket', p: { id: t.id } }); audit('Réponse support', t.id); commit(); aToast('Réponse envoyée'); };

/* ---------------- Administrateurs ---------------- */
AP.admins = () => {
  const roles = Object.keys(S.permissions);
  return `<div class="a-head"><h1>Administrateurs</h1><div class="a-tools"><button class="btn pri" data-act="aAdminNew">${ic('plus')} Nouvel administrateur</button></div></div>
  <div class="adm-card p0">${table(['Nom', 'E-mail', 'Rôle', 'Dernière connexion', 'Statut', ''], S.admins.map(a => `<tr><td><b>${esc(a.name)}</b></td><td>${esc(a.email)}</td><td><select class="inp sm" data-chg="aAdminRole" data-id="${a.id}" ${a.id === 'a1' ? 'disabled' : ''}>${roles.map(r => `<option ${a.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></td><td>${timeAgo(a.lastLogin)}</td><td>${a.active ? '<span class="tag green">Actif</span>' : '<span class="tag gray">Désactivé</span>'}</td><td>${a.id !== 'a1' ? `<button class="btn sm ghost" data-act="aAdminToggle" data-id="${a.id}">${a.active ? 'Désactiver' : 'Activer'}</button>` : ''}</td></tr>`))}</div>
  <div class="adm-card"><h3>Rôles et permissions</h3>${table(['Module', ...roles], ADMIN_MODULES.map(m => `<tr><td>${m}</td>${roles.map(r => `<td class="center"><input type="checkbox" ${S.permissions[r].includes(m) ? 'checked' : ''} ${r === 'Super administrateur' ? 'disabled' : ''} data-chg="aPerm" data-r="${r}" data-m="${m}"></td>`).join('')}</tr>`))}
  <form data-submit="aRoleAdd" class="inline-form"><input class="inp sm" name="name" placeholder="Nouveau rôle (ex. Comptabilité)" required><button class="btn sm sec">${ic('plus')} Créer le rôle</button></form></div>
  <div class="adm-card"><h3>Historique des connexions</h3>${table(['Date', 'Administrateur', 'Adresse IP', 'Navigateur'], S.loginHistory.slice(0, 15).map(l => `<tr><td>${fmtDT(l.at)}</td><td>${esc(S.admins.find(a => a.id === l.adminId)?.name || '')}</td><td><code>${l.ip}</code></td><td>${esc(l.device)}</td></tr>`))}</div>`;
};
ACT.aAdminRole = (d, el) => { S.admins.find(a => a.id === d.id).role = el.value; audit('Changement de rôle admin', d.id, el.value); commit(); aToast('Rôle mis à jour'); };
ACT.aAdminToggle = d => { const a = S.admins.find(x => x.id === d.id); a.active = !a.active; audit(a.active ? 'Activation admin' : 'Désactivation admin', a.id); commit(); };
ACT.aPerm = (d, el) => { const p = S.permissions[d.r]; S.permissions[d.r] = el.checked ? [...new Set([...p, d.m])] : p.filter(x => x !== d.m); audit('Permissions', d.r, (el.checked ? '+ ' : '- ') + d.m); commit(); };
ACT.aRoleAdd = (o, f) => { S.permissions[o.name] = []; f.reset(); commit(); aToast('Rôle créé'); };
ACT.aAdminNew = () => aModal('adminNew', '');
AM.adminNew = () => ({ title: 'Nouvel administrateur', html: `<form data-submit="aAdminCreate" class="form"><label class="field"><span>Nom</span><input class="inp" name="name" required></label><label class="field"><span>E-mail</span><input class="inp" type="email" name="email" required></label><label class="field"><span>Rôle</span><select class="inp" name="role">${Object.keys(S.permissions).map(r => `<option>${r}</option>`).join('')}</select></label><p class="hint">Un lien d'activation avec configuration de la double authentification sera envoyé.</p><div class="btn-row end"><button class="btn pri">Créer</button></div></form>` });
ACT.aAdminCreate = o => { S.admins.push({ id: uid('a'), name: o.name, email: o.email.toLowerCase(), role: o.role, active: true, lastLogin: Date.now() }); audit('Création administrateur', o.email, o.role); commit(); aCloseModal(); aToast('Administrateur créé'); };

/* ---------------- Journal d'audit ---------------- */
AP.audit = () => {
  const list = S.audit.filter(a => matchQ(a.action + a.target + a.detail));
  return `<div class="a-head"><h1>Journal d'audit <small>${list.length}</small></h1><div class="a-tools">${searchBox('Action, cible…')}<button class="btn sm sec" data-act="aExport">${ic('upload')} Exporter CSV</button></div></div>
  <div class="adm-card p0">${table(['Date', 'Acteur', 'Action', 'Cible', 'Détail'], list.map(a => `<tr><td>${fmtDT(a.at)}</td><td>${esc(S.admins.find(x => x.id === a.actor)?.name || (a.actor === 'system' ? 'Système' : a.actor))}</td><td><b>${esc(a.action)}</b></td><td><code>${esc(a.target || '')}</code></td><td class="wrap">${esc(a.detail || '')}</td></tr>`))}</div><p class="hint">Les actions sensibles (validation, suspension, permissions, suppression) sont journalisées de manière immuable.</p>`;
};
ACT.aExport = () => {
  const csv = 'date;acteur;action;cible;detail\n' + S.audit.map(a => [new Date(a.at).toISOString(), a.actor, a.action, a.target, (a.detail || '').replace(/;/g, ',')].join(';')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); const l = document.createElement('a'); l.href = url; l.download = 'journal-audit-domiloc.csv'; l.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
