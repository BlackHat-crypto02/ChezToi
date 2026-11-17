/* =====================================================================
   DomiLoc — Application mobile (Flutter) : socle + parcours locataire
   Navigation par pile, onglets selon l'espace (locataire / propriétaire / agence)
   ===================================================================== */

const M = {
  stack: [], filters: null, shown: 10, onb: 0, loginMode: 'email', geo: 'unknown', pos: null,
  bookDraft: null, compareSel: [], typing: null, calMonth: {}, nlCriteria: null, loginFails: 0, lockUntil: 0,
  pendingReg: null, forgot: null, sheetCb: null, favCompare: false
};
const SIM_POS = [6.1580, 1.2160]; // position simulée (Tokoin, Lomé)
const AUTH_SCREENS = ['onboarding', 'login', 'register', 'otp', 'forgot', 'page'];
const NO_TABS = ['onboarding', 'login', 'register', 'otp', 'forgot', 'property', 'tour', 'book', 'pay', 'bookingDone', 'chat', 'capture', 'publish', 'receipt', 'compare', 'review', 'disputeNew', 'page'];
const NO_SOFT = ['map', 'tour', 'capture', 'publish'];
const SCR = {}, MOUNT = {}, SOFT_HOOK = {};

/* ---------------- Navigation ---------------- */
const cur = () => M.stack[M.stack.length - 1];
function homeFor() { return S.session.space === 'proprietaire' ? 'ownerDash' : S.session.space === 'agence' ? 'agencyDash' : 'home'; }
function saveScroll() { const b = $('#app .body'); if (b && cur()) cur().scroll = b.scrollTop; }
function mGo(s, p = {}) { saveScroll(); M.stack.push({ s, p }); closeSheet(); mRender(false); }
function mBack() { if (M.stack.length > 1) M.stack.pop(); else M.stack = [{ s: me() ? homeFor() : 'onboarding', p: {} }]; closeSheet(); mRender(false, true); }
function mTab(s, p = {}) { M.stack = [{ s, p }]; closeSheet(); mRender(false); }
function mReplace(s, p = {}) { M.stack[M.stack.length - 1] = { s, p }; closeSheet(); mRender(false); }
function mReset() { M.filters = defaultFilters(); M.stack = [{ s: me() ? homeFor() : 'onboarding', p: {} }]; M.compareSel = []; M.bookDraft = null; }
function mInit() { mReset(); mRender(false); onChange(o => { if (o.tick && !['tourStatus', 'ownerDash', 'ownerListing', 'ownerListings', 'agencyDash'].includes(cur().s)) return; mRender(true); }); updateClock(); setInterval(updateClock, 30000); }
function mAfterLogin() { M.stack = [{ s: me() ? homeFor() : 'onboarding', p: {} }]; closeSheet(); mRender(false); }
function updateClock() { const el = $('#sb-time'); if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }

function mRender(soft, restoreScroll) {
  const app = $('#app'); if (!app || !S) return;
  if (!me() && !AUTH_SCREENS.includes(cur().s)) M.stack = [{ s: 'onboarding', p: {} }];
  const top = cur();
  if (soft === true && NO_SOFT.includes(top.s)) { SOFT_HOOK[top.s] && SOFT_HOOK[top.s](top.p); return; }
  let html;
  try { html = (SCR[top.s] || SCR.notFound)(top.p || {}); }
  catch (err) { console.error(err); html = hdr('Erreur') + '<div class="body"><div class="empty">' + ic('alert') + '<b>Écran indisponible</b><p>' + esc(err.message) + '</p></div></div>'; }
  const tabs = me() && !NO_TABS.includes(top.s) ? tabbar() : '';
  renderInto(app, '<div class="scr scr-' + top.s + (tabs ? ' has-tabs' : '') + '">' + html + '</div>' + tabs, soft);
  if (!soft) { const b = $('#app .body'); if (b) b.scrollTop = restoreScroll ? (top.scroll || 0) : 0; }
  MOUNT[top.s] && MOUNT[top.s](top.p || {}, soft);
}

const TABS = {
  locataire: [['home', 'home', 'Accueil'], ['search', 'search', 'Recherche'], ['map', 'map', 'Carte'], ['favorites', 'heart', 'Favoris'], ['messages', 'chat', 'Messages']],
  proprietaire: [['ownerDash', 'dashboard', 'Tableau'], ['ownerListings', 'home', 'Logements'], ['ownerRequests', 'cal', 'Demandes'], ['messages', 'chat', 'Messages'], ['profile', 'user', 'Profil']],
  agence: [['agencyDash', 'dashboard', 'Tableau'], ['ownerListings', 'building', 'Biens'], ['ownerRequests', 'cal', 'Demandes'], ['agencyAgents', 'users', 'Agents'], ['messages', 'chat', 'Messages']]
};
function unreadMsgs() { const u = me(); if (!u) return 0; return S.conversations.filter(c => c.participants.includes(u.id)).reduce((a, c) => a + c.messages.filter(m => m.from !== u.id && !m.read).length, 0); }
function pendingRequests() { const u = me(); if (!u) return 0; return S.bookings.filter(b => b.status === 'attente' && canManage(u, prop(b.propertyId))).length; }
function tabbar() {
  const u = me(); let tabs = TABS[S.session.space] || TABS.locataire;
  if (S.session.space === 'agence' && u.agencyRole === 'agent') tabs = tabs.map(t => t[0] === 'agencyAgents' ? ['profile', 'user', 'Profil'] : t);
  const root = M.stack[0].s;
  return '<nav class="tabbar">' + tabs.map(([s, icon, label]) => {
    let badge = s === 'messages' ? unreadMsgs() : s === 'ownerRequests' ? pendingRequests() : 0;
    return `<button class="tab ${root === s ? 'on' : ''}" data-act="mTab" data-s="${s}">${ic(icon)}<span>${label}</span>${badge ? '<i class="badge">' + badge + '</i>' : ''}</button>`;
  }).join('') + '</nav>';
}

ACT.mGo = d => { const p = d.p ? JSON.parse(d.p) : (d.id ? { id: d.id } : {}); if (d.s === 'property' && d.id) trackView(d.id); mGo(d.s, p); };
ACT.mTab = d => mTab(d.s);
ACT.mBack = () => mBack();
ACT.closeSheet = () => closeSheet();

/* ---------------- Composants ---------------- */
function hdr(title, o = {}) {
  return `<header class="hdr ${o.cls || ''}">${o.back === false ? '' : `<button class="hdr-btn" data-act="mBack" aria-label="Retour">${ic('back')}</button>`}
  <div class="hdr-title">${title}${o.sub ? '<small>' + o.sub + '</small>' : ''}</div><div class="hdr-actions">${o.actions || ''}</div></header>`;
}
function topActions() {
  const u = me(); const unread = S.notifications.filter(n => n.userId === u.id && !n.read).length;
  return `<button class="hdr-btn" data-act="mGo" data-s="notifications" aria-label="Notifications">${ic('bell')}${unread ? '<i class="dot-badge">' + unread + '</i>' : ''}</button>
  <button class="avatar sm" style="background:${u.color}" data-act="mGo" data-s="profile" aria-label="Profil">${initials(u)}</button>`;
}
function rootHdr(title, sub) { return hdr(title, { back: false, actions: topActions(), sub }); }
const tag = (st) => st ? `<span class="tag ${st.color}">${st.label}</span>` : '';
const avatar = (u, cls = '') => `<span class="avatar ${cls}" style="background:${u ? u.color : '#999'}">${initials(u)}</span>`;
function starsHTML(v, cls = '') { let s = '<span class="stars ' + cls + '">'; for (let i = 1; i <= 5; i++) s += '<i class="' + (v >= i - 0.25 ? 'f' : v >= i - 0.75 ? 'h' : '') + '">★</i>'; return s + '</span>'; }
function empty(icon, title, text, btn) { return `<div class="empty">${ic(icon)}<b>${title}</b><p>${text || ''}</p>${btn || ''}</div>`; }
function verifiedBadge(v, small) { return v ? `<span class="vbadge ${small ? 'sm' : ''}">${ic('shield')} Vérifié</span>` : ''; }
function tourBadge(p) { const t = hasPublishedTour(p) ? tourOf(p) : null; return t ? `<span class="pb vt">${ic('cube')} ${t.type === '3d' ? '3D' : '360°'}</span>` : ''; }
function pcard(p, cls = '') {
  const u = me(); const fav = u && isFav(u.id, p.id); const r = ratingOf(p.id);
  return `<article class="pcard ${cls}" data-act="mGo" data-s="property" data-id="${p.id}">
    <div class="pimg" style="background-image:url('${propCover(p)}')">
      <button class="fav ${fav ? 'on' : ''}" data-act="fav" data-id="${p.id}" aria-label="Favori">${ic('heart')}</button>
      <div class="pbadges">${p.verified ? `<span class="pb ok">${ic('shield')} Vérifié</span>` : ''}${tourBadge(p)}</div>
    </div>
    <div class="pinfo">
      <div class="price">${money(p.price)}<small> / ${p.period}</small></div>
      <div class="ptitle">${esc(p.title)}</div>
      <div class="ploc">${ic('pin')}${esc(p.quartier)}, ${esc(p.city)}${M.pos || M.geo === 'granted' ? ' · ' + fmtKm(distTo(p)) : ''}</div>
      <div class="pspec"><span>${category(p.type).icon} ${category(p.type).name}</span><span>${p.bedrooms} ch.</span><span>${p.area} m²</span>${r.count ? `<span class="rt">★ ${r.avg.toFixed(1)}</span>` : ''}</div>
    </div></article>`;
}
function pmini(p, extra = '') {
  return `<div class="pmini" data-act="mGo" data-s="property" data-id="${p.id}"><div class="thumb" style="background-image:url('${propCover(p)}')"></div>
  <div><b>${esc(p.title)}</b><small>${esc(p.quartier)}, ${esc(p.city)} · ${money(p.price)}/${p.period}</small>${extra}</div></div>`;
}
const distTo = p => haversine(M.pos || SIM_POS, [p.lat, p.lng]);

/* Feuilles (bottom sheets) et modales internes au téléphone */
function openSheet(inner, o = {}) {
  const el = $('#m-sheet'); if (!el) return;
  el.className = 'm-sheet open' + (o.full ? ' full' : '');
  el.innerHTML = `<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet ${o.cls || ''}">${o.full ? '' : '<div class="sheet-grip"></div>'}
  ${o.title ? `<div class="sheet-h"><b>${o.title}</b><button class="hdr-btn" data-act="closeSheet" aria-label="Fermer">${ic('close')}</button></div>` : ''}
  <div class="sheet-body">${inner}</div></div>`;
}
function closeSheet() { const el = $('#m-sheet'); if (el) { el.className = 'm-sheet'; el.innerHTML = ''; } M.sheetCb = null; }
function confirmSheet(title, text, okLabel, cb, danger) {
  openSheet(`<p class="muted">${text}</p><div class="btn-row"><button class="btn sec" data-act="closeSheet">Annuler</button><button class="btn ${danger ? 'danger' : 'pri'}" data-act="sheetOk">${okLabel}</button></div>`, { title });
  M.sheetCb = cb;
}
ACT.sheetOk = () => { const cb = M.sheetCb; closeSheet(); cb && cb(); };
function mToast(msg, type) { toast(msg, type); }

/* Notification push simulée dans le téléphone */
function onNotification(n) {
  if (n.userId !== S.session.userId) return;
  const host = $('#m-push'); if (!host) return;
  const el = document.createElement('div');
  el.className = 'push';
  el.innerHTML = `<div class="push-ic">${ic(n.type === 'message' ? 'chat' : n.type === 'booking' ? 'cal' : n.type === 'tour' ? 'cube' : 'bell')}</div><div><b>${esc(n.title)}</b><span>${esc(n.text)}</span></div><small>maintenant</small>`;
  el.addEventListener('click', () => { openNotif(n.id); el.remove(); });
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 4200);
}
function openNotif(id) {
  const n = S.notifications.find(x => x.id === id); if (!n) return;
  n.read = true; commit();
  if (n.link) { if (n.link.s === 'ownerRequests' || n.link.s === 'ownerListing') { if (S.session.space === 'locataire' && me().roles.includes('proprietaire')) S.session.space = 'proprietaire'; } mGo(n.link.s, n.link.p || {}); }
}

/* Calendrier de disponibilité */
function calHTML(key, pid, o = {}) {
  const base = M.calMonth[key] || todayISO().slice(0, 8) + '01';
  const d0 = parseISO(base); const y = d0.getFullYear(), mo = d0.getMonth();
  const first = (new Date(y, mo, 1).getDay() + 6) % 7; const nDays = new Date(y, mo + 1, 0).getDate();
  let cells = ''; for (let i = 0; i < first; i++) cells += '<span></span>';
  for (let d = 1; d <= nDays; d++) {
    const day = isoOf(new Date(y, mo, d)); const st = pid ? dayStatus(pid, day) : (day < todayISO() ? 'past' : 'free');
    let cls = st; if (o.start && o.end && day >= o.start && day < o.end) cls += ' inrange'; if (day === o.start) cls += ' rstart';
    if (day === todayISO()) cls += ' today';
    const clickable = o.act && (o.ownerMode ? st !== 'past' : st === 'free' || st === 'pending');
    cells += `<button class="cd ${cls}" ${clickable ? `data-act="${o.act}" data-day="${day}" data-pid="${pid || ''}"` : 'disabled'}>${d}</button>`;
  }
  const label = d0.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `<div class="cal"><div class="cal-h"><button class="hdr-btn" data-act="calNav" data-k="${key}" data-d="-1">${ic('back')}</button><b>${label}</b><button class="hdr-btn" data-act="calNav" data-k="${key}" data-d="1">${ic('next')}</button></div>
  <div class="cal-w"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="cal-g">${cells}</div>
  <div class="cal-leg"><span><i class="free"></i>Libre</span><span><i class="booked"></i>Réservé</span><span><i class="blocked"></i>Bloqué</span><span><i class="pending"></i>Demande en cours</span></div></div>`;
}
ACT.calNav = d => { const base = M.calMonth[d.k] || todayISO().slice(0, 8) + '01'; M.calMonth[d.k] = addMonths(base, +d.d); mRender(true); };

/* ---------------- Authentification ---------------- */
const ONB = [
  ['Trouvez le logement idéal', 'Maisons, appartements, studios, chambres, villas et duplex vérifiés près de chez vous.', 'search'],
  ['Visitez sans vous déplacer', 'Explorez les logements en 360° et en 3D directement depuis votre téléphone.', 'cube'],
  ['Réservez en toute confiance', 'Réservation en ligne, paiement Mobile Money sécurisé, avis vérifiés.', 'shield']
];
SCR.onboarding = () => {
  const [t, d, icon] = ONB[M.onb];
  return `<div class="body onb" data-scroll="main"><div class="onb-logo">${logoHTML()}</div>
  <div class="onb-art" style="background-image:url('${scene(M.onb === 1 ? 'salon' : M.onb === 2 ? 'villa' : 'immeuble', 160 + M.onb * 40)}')"><span class="onb-ic">${ic(icon)}</span></div>
  <h2>${t}</h2><p class="muted">${d}</p>
  <div class="dots">${ONB.map((_, i) => `<button class="${i === M.onb ? 'on' : ''}" data-act="onbGo" data-i="${i}" aria-label="Étape ${i + 1}"></button>`).join('')}</div>
  <div class="stack-btns">${M.onb < 2 ? `<button class="btn pri block" data-act="onbGo" data-i="${M.onb + 1}">Suivant</button>` : `<button class="btn pri block" data-act="mGo" data-s="register">Créer un compte</button>`}
  <button class="btn sec block" data-act="mGo" data-s="login">J'ai déjà un compte</button></div></div>`;
};
ACT.onbGo = d => { M.onb = +d.i; mRender(true); };
function logoHTML() { return `<span class="logo"><span class="logo-mk">${ic("home")}</span><span>Domi<b>Loc</b></span></span>`; }

SCR.login = () => {
  const locked = Date.now() < M.lockUntil;
  return hdr('Connexion') + `<div class="body pad" data-scroll="main">
  <h2 class="h-lg">Bon retour 👋</h2><p class="muted">Connectez-vous avec votre e-mail ou votre numéro de téléphone.</p>
  <div class="seg">${['email', 'phone'].map(m => `<button class="${M.loginMode === m ? 'on' : ''}" data-act="loginMode" data-m="${m}">${m === 'email' ? 'E-mail' : 'Téléphone'}</button>`).join('')}</div>
  <form data-submit="login" class="form">
    ${M.loginMode === 'email' ? `<label class="field"><span>Adresse e-mail</span><input class="inp" id="lg-id" name="id" type="email" placeholder="vous@exemple.tg" value="kossi@demo.tg" required></label>`
      : `<label class="field"><span>Numéro de téléphone</span><div class="inp-pre"><b>🇹🇬 +228</b><input class="inp" id="lg-id" name="id" type="tel" placeholder="90 00 00 01" value="90 00 00 01" required></div></label>`}
    <label class="field"><span>Mot de passe</span><div class="inp-pre"><input class="inp" id="lg-pw" name="pw" type="password" placeholder="••••••••" value="demo1234" required><button type="button" class="hdr-btn" data-act="togglePw" data-t="lg-pw">${ic('eye')}</button></div></label>
    <div class="row-between"><label class="check"><input type="checkbox" name="remember" checked> Rester connecté</label><a href="#" class="link" data-act="mGo" data-s="forgot">Mot de passe oublié ?</a></div>
    ${locked ? `<div class="alert red">${ic('lock')} Trop de tentatives. Réessayez dans ${Math.ceil((M.lockUntil - Date.now()) / 1000)} s.</div>` : M.loginFails ? `<div class="alert amber">${ic('alert')} Identifiants incorrects (${M.loginFails}/5 tentatives).</div>` : ''}
    <button class="btn pri block" ${locked ? 'disabled' : ''}>Se connecter</button>
  </form>
  <div class="divider"><span>Comptes de démonstration</span></div>
  <div class="demo-accounts">${DEMO_ACCOUNTS.filter(a => a.id).map(a => `<button class="chip" data-act="quickLogin" data-id="${a.id}" data-sp="${a.space}">${esc(a.label.split(' — ')[1])}<small>${esc(a.label.split(' — ')[0])}</small></button>`).join('')}</div>
  <p class="hint">Mot de passe démo : <code>demo1234</code></p>
  <p class="center muted">Pas encore de compte ? <a href="#" class="link" data-act="mGo" data-s="register">S'inscrire</a></p></div>`;
};
ACT.loginMode = d => { M.loginMode = d.m; mRender(false); };
ACT.togglePw = d => { const el = document.getElementById(d.t); if (el) el.type = el.type === 'password' ? 'text' : 'password'; };
ACT.quickLogin = d => loginAs(d.id, d.sp);
ACT.login = f => {
  if (Date.now() < M.lockUntil) return;
  const id = f.id.trim().toLowerCase().replace(/\s/g, '');
  const u = S.users.find(x => x.email.toLowerCase() === id || x.phone.replace(/\s/g, '').endsWith(id.replace('+228', '')));
  if (!u || f.pw !== (u.pwd || 'demo1234')) {
    M.loginFails++; if (M.loginFails >= 5) { M.lockUntil = Date.now() + 30000; M.loginFails = 0; setTimeout(() => mRender(true), 30500); }
    mRender(true); return;
  }
  if (u.status === 'suspendu') { toast('Ce compte est suspendu. Contactez le support.', 'err'); return; }
  if (u.status === 'supprime' || u.status === 'inactif') { toast('Ce compte est désactivé.', 'err'); return; }
  M.loginFails = 0;
  const space = u.roles.includes('agence') || u.roles.includes('agent') ? 'agence' : 'locataire';
  loginAs(u.id, space); toast('Connecté en tant que ' + fullName(u));
};

SCR.register = () => {
  const r = M.reg || (M.reg = { type: 'locataire', mode: 'email' });
  return hdr('Créer un compte') + `<div class="body pad" data-scroll="main">
  <p class="muted">Choisissez votre profil. Vous pourrez ajouter un espace propriétaire plus tard.</p>
  <div class="role-pick">${[['locataire', 'user', 'Locataire', 'Je cherche un logement'], ['proprietaire', 'home', 'Propriétaire', 'Je mets en location'], ['agence', 'building', 'Agence', 'Compte professionnel']].map(([k, i, t, s]) => `<button class="${r.type === k ? 'on' : ''}" data-act="regType" data-t="${k}">${ic(i)}<b>${t}</b><small>${s}</small></button>`).join('')}</div>
  <div class="seg">${['email', 'phone'].map(m => `<button class="${r.mode === m ? 'on' : ''}" data-act="regMode" data-m="${m}">Par ${m === 'email' ? 'e-mail' : 'téléphone'}</button>`).join('')}</div>
  <form data-submit="register" class="form">
    ${r.type === 'agence' ? `<label class="field"><span>Nom de l'agence *</span><input class="inp" id="rg-ag" name="agency" required placeholder="Ex. Lomé Immo Services"></label><label class="field"><span>N° RCCM *</span><input class="inp" id="rg-rccm" name="rccm" required placeholder="TG-LOM-2024-B-…"></label>` : ''}
    <div class="grid2"><label class="field"><span>Prénom *</span><input class="inp" id="rg-f" name="first" required></label><label class="field"><span>Nom *</span><input class="inp" id="rg-l" name="last" required></label></div>
    ${r.mode === 'email' ? `<label class="field"><span>E-mail *</span><input class="inp" id="rg-e" name="email" type="email" required placeholder="vous@exemple.tg"></label>` : `<label class="field"><span>Téléphone *</span><div class="inp-pre"><b>🇹🇬 +228</b><input class="inp" id="rg-p" name="phone" type="tel" required pattern="[0-9 ]{8,11}" placeholder="90 12 34 56"></div></label>`}
    <label class="field"><span>Mot de passe *</span><input class="inp" id="rg-pw" name="pw" type="password" required minlength="8" data-inp="pwStrength" placeholder="8 caractères minimum"><div class="pw-meter" id="pw-meter"><i></i></div><small class="muted" id="pw-txt">Utilisez lettres, chiffres et symboles.</small></label>
    <label class="check"><input type="checkbox" name="cgu" required> J'accepte les <a href="#" class="link" data-act="mGo" data-s="page" data-p='{"k":"cgu"}'>CGU</a> et la <a href="#" class="link" data-act="mGo" data-s="page" data-p='{"k":"privacy"}'>politique de confidentialité</a></label>
    <button class="btn pri block">Créer mon compte</button>
  </form><p class="center muted">Déjà inscrit ? <a href="#" class="link" data-act="mGo" data-s="login">Se connecter</a></p></div>`;
};
ACT.regType = d => { M.reg.type = d.t; mRender(true); };
ACT.regMode = d => { M.reg.mode = d.m; mRender(true); };
function pwScore(v) { let s = 0; if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++; return s; }
ACT.pwStrength = (d, el) => {
  const s = pwScore(el.value); const m = $('#pw-meter i'); const t = $('#pw-txt');
  if (m) { m.style.width = (s * 25) + '%'; m.style.background = ['#dc2626', '#dc2626', '#d97706', '#65a30d', '#15803d'][s]; }
  if (t) t.textContent = ['Trop faible', 'Faible', 'Moyen', 'Bon', 'Excellent'][s];
};
ACT.register = f => {
  const r = M.reg;
  if (pwScore(f.pw) < 2) { toast('Mot de passe trop faible', 'err'); return; }
  const email = (f.email || '').trim().toLowerCase(); const phone = f.phone ? '+228 ' + f.phone.trim() : '';
  if (email && S.users.some(u => u.email === email)) { toast('Cet e-mail est déjà utilisé', 'err'); return; }
  const u = { id: uid('u'), first: f.first.trim(), last: f.last.trim(), email: email || (f.first + '.' + f.last).toLowerCase().replace(/\s/g, '') + '@nouveau.tg', phone: phone || '+228 9' + Math.floor(1e6 + Math.random() * 8e6), roles: ['locataire'], city: 'Lomé', verifiedPhone: false, verifiedEmail: false, verifiedId: false, status: 'actif', created: todayISO(), color: ['#0F766E', '#B45309', '#1D4ED8', '#7C3AED', '#BE185D'][Math.floor(Math.random() * 5)], pwd: f.pw };
  if (r.type === 'proprietaire') { u.roles.push('proprietaire'); u.ownerVerified = false; }
  if (r.type === 'agence') { const ag = { id: uid('ag'), name: f.agency, ownerId: u.id, members: [], rccm: f.rccm, address: '', phone: u.phone, email: u.email, verified: false, created: todayISO(), description: '' }; S.agencies.push(ag); u.roles = ['agence']; u.agencyId = ag.id; u.agencyRole = 'gerant'; }
  S.users.push(u); audit('Inscription', u.id, r.type);
  M.pendingReg = { userId: u.id, channel: r.mode, code: String(Math.floor(100000 + Math.random() * 900000)), space: r.type };
  commit(); mGo('otp'); simulateCodeSend();
};
function simulateCodeSend() {
  const pr = M.pendingReg; if (!pr) return;
  setTimeout(() => toast((pr.channel === 'phone' ? '📱 SMS' : '✉️ E-mail') + ' simulé — votre code DomiLoc : <b>' + pr.code + '</b>', 'info'), 700);
}
SCR.otp = () => {
  const pr = M.pendingReg; if (!pr) return hdr('Vérification') + '<div class="body pad">' + empty('alert', 'Aucune vérification en cours') + '</div>';
  const u = user(pr.userId);
  return hdr('Vérification') + `<div class="body pad center-col" data-scroll="main"><div class="big-ic">${ic(pr.channel === 'phone' ? 'phone' : 'mail')}</div>
  <h2 class="h-lg">Code de vérification</h2><p class="muted">Saisissez le code à 6 chiffres envoyé ${pr.channel === 'phone' ? 'par SMS au <b>' + esc(u.phone) + '</b>' : 'à <b>' + esc(u.email) + '</b>'}.</p>
  <form data-submit="otp" class="form"><input class="inp otp" id="otp-in" name="code" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code" required>
  <button class="btn pri block">Vérifier</button></form>
  <button class="btn ghost" data-act="otpResend">${ic('refresh')} Renvoyer le code</button></div>`;
};
ACT.otpResend = () => { M.pendingReg.code = String(Math.floor(100000 + Math.random() * 900000)); simulateCodeSend(); };
ACT.otp = f => {
  const pr = M.pendingReg;
  if (f.code.trim() !== pr.code) { toast('Code incorrect', 'err'); return; }
  const u = user(pr.userId);
  if (pr.channel === 'phone') u.verifiedPhone = true; else u.verifiedEmail = true;
  M.pendingReg = null;
  if (pr.verifyOnly) { commit(); toast('Vérification réussie'); mBack(); return; }
  loginAs(u.id, pr.space === 'agence' ? 'agence' : pr.space === 'proprietaire' ? 'proprietaire' : 'locataire');
  toast('Bienvenue sur DomiLoc, ' + u.first + ' !');
};

SCR.forgot = () => {
  const f = M.forgot || (M.forgot = { step: 1 });
  return hdr('Mot de passe oublié') + `<div class="body pad" data-scroll="main"><div class="steps">${[1, 2, 3].map(i => `<i class="${f.step >= i ? 'on' : ''}"></i>`).join('')}</div>
  ${f.step === 1 ? `<p class="muted">Indiquez l'e-mail ou le téléphone associé à votre compte.</p><form data-submit="forgot1" class="form"><label class="field"><span>E-mail ou téléphone</span><input class="inp" id="fg-id" name="id" required value="kossi@demo.tg"></label><button class="btn pri block">Recevoir un code</button></form>`
      : f.step === 2 ? `<p class="muted">Un code a été envoyé à <b>${esc(f.id)}</b>.</p><form data-submit="forgot2" class="form"><input class="inp otp" id="fg-code" name="code" maxlength="6" placeholder="••••••" required><button class="btn pri block">Valider</button></form>`
        : `<form data-submit="forgot3" class="form"><label class="field"><span>Nouveau mot de passe</span><input class="inp" id="fg-pw" name="pw" type="password" minlength="8" required data-inp="pwStrength"><div class="pw-meter" id="pw-meter"><i></i></div><small id="pw-txt" class="muted"></small></label><label class="field"><span>Confirmer</span><input class="inp" id="fg-pw2" name="pw2" type="password" required></label><button class="btn pri block">Réinitialiser</button></form>`}</div>`;
};
ACT.forgot1 = f => {
  const id = f.id.trim().toLowerCase(); const u = S.users.find(x => x.email === id || x.phone.replace(/\s/g, '').includes(id.replace(/\s/g, '')));
  if (!u) { toast('Aucun compte trouvé', 'err'); return; }
  M.forgot = { step: 2, id: f.id, userId: u.id, code: String(Math.floor(100000 + Math.random() * 900000)) };
  mRender(false); setTimeout(() => toast('Code de réinitialisation simulé : <b>' + M.forgot.code + '</b>', 'info'), 600);
};
ACT.forgot2 = f => { if (f.code.trim() !== M.forgot.code) { toast('Code incorrect', 'err'); return; } M.forgot.step = 3; mRender(false); };
ACT.forgot3 = f => {
  if (f.pw !== f.pw2) { toast('Les mots de passe ne correspondent pas', 'err'); return; }
  user(M.forgot.userId).pwd = f.pw; M.forgot = null; commit(); toast('Mot de passe réinitialisé. Connectez-vous.'); mReplace('login');
};

/* ---------------- Accueil locataire ---------------- */
SCR.home = () => {
  const u = me(); const c = S.content; const pp = publicProps();
  const sec = (k, title, list, more) => c.sections[k] !== false && list.length ? `<section class="sec"><div class="sec-h"><h3>${title}</h3>${more ? `<a href="#" class="link" data-act="homeMore" data-k="${more}">Tout voir</a>` : ''}</div><div class="hscroll" data-scroll="h-${k}">${list.slice(0, 8).map(p => pcard(p, 'sm')).join('')}</div></section>` : '';
  const favTypes = favsOf(u.id).map(id => prop(id)?.type);
  const reco = pp.filter(p => !isFav(u.id, p.id)).map(p => ({ p, s: (favTypes.includes(p.type) ? 2 : 0) + (u.budget && p.period === 'mois' && p.price <= u.budget ? 2 : 0) + ((S.viewed[u.id] || []).some(id => prop(id)?.quartier === p.quartier) ? 1 : 0) + (p.verified ? .5 : 0) })).sort((a, b) => b.s - a.s).map(x => x.p);
  return rootHdr(logoHTML(), '') + `<div class="body" data-scroll="main">
  ${c.info.active ? `<div class="info-bar">${ic('info')}<span>${esc(c.info.text)}</span></div>` : ''}
  <div class="hello"><h2>Bonjour ${esc(u.first)} 👋</h2><p class="muted">Où souhaitez-vous habiter ?</p></div>
  <button class="search-fake" data-act="mTab" data-s="search">${ic('search')}<span>Ville, quartier, type de logement…</span><i>${ic('sliders')}</i></button>
  <div class="chips-row" data-scroll="h-loc">${['Tokoin', 'Bè', 'Baguida', 'Agoè', 'Hédzranawoé', 'Kpalimé', 'Cotonou'].map(q => `<button class="chip" data-act="quickLoc" data-q="${q}">${ic('pin')}${q}</button>`).join('')}</div>
  <section class="sec"><div class="cats">${S.categories.filter(x => x.active).sort((a, b) => a.order - b.order).map(cat => `<button data-act="quickType" data-t="${cat.id}"><span>${cat.icon}</span>${cat.name}</button>`).join('')}</div></section>
  <div class="banners hscroll" data-scroll="h-ban">${c.banners.filter(b => b.active).map(b => `<div class="banner" style="--bc:${b.color}"><b>${esc(b.title)}</b><span>${esc(b.text)}</span><button class="btn sm light" data-act="bannerCta" data-a="${b.action}">${esc(b.cta)}</button></div>`).join('')}</div>
  <div class="shortcuts">${[['favorites', 'heart', 'Favoris', favsOf(u.id).length], ['myBookings', 'cal', 'Réservations', S.bookings.filter(b => b.tenantId === u.id && ['attente', 'acceptee', 'confirmee', 'encours'].includes(b.status)).length], ['savedSearches', 'bell', 'Alertes', (S.savedSearches[u.id] || []).length], ['compare', 'compare', 'Comparer', M.compareSel.length]].map(([s, i, l, n]) => `<button data-act="${s === 'favorites' ? 'mTab' : 'mGo'}" data-s="${s}">${ic(i)}<span>${l}</span>${n ? '<i class="badge">' + n + '</i>' : ''}</button>`).join('')}</div>
  ${sec('recommended', 'Recommandés pour vous', reco, 'reco')}
  ${sec('recent', 'Récemment publiés', pp.slice().sort((a, b) => b.created.localeCompare(a.created)), 'recent')}
  ${sec('nearby', 'À proximité <small class="muted">' + (M.geo === 'granted' ? '(position actuelle)' : '(position approximative : Lomé)') + '</small>', pp.slice().sort((a, b) => distTo(a) - distTo(b)), 'nearby')}
  ${sec('tours', 'Avec visite virtuelle 360° / 3D', pp.filter(hasPublishedTour), 'tours')}
  ${sec('popular', 'Les plus populaires', pp.slice().sort((a, b) => b.views - a.views), 'popular')}
  ${sec('verified', 'Annonces vérifiées', pp.filter(p => p.verified), 'verified')}
  <div class="foot-space"></div></div>`;
};
ACT.quickLoc = d => { M.filters = defaultFilters(); const l = Object.keys(LOCATIONS).length && findQuartier(d.q); if (l) { M.filters.city = l.city; M.filters.quartier = l.quartier; } else M.filters.city = d.q; M.shown = 10; mTab('search'); };
ACT.quickType = d => { M.filters = defaultFilters(); M.filters.types = [d.t]; M.shown = 10; mTab('search'); };
ACT.homeMore = d => {
  M.filters = defaultFilters(); M.shown = 10;
  if (d.k === 'tours') M.filters.tour = true; if (d.k === 'verified') M.filters.verified = true;
  M.filters.sort = d.k === 'recent' ? 'date' : d.k === 'popular' ? 'popularite' : d.k === 'nearby' ? 'proximite' : 'pertinence';
  mTab('search');
};
ACT.bannerCta = d => {
  if (d.a === 'tour') { M.filters = defaultFilters(); M.filters.tour = true; mTab('search'); }
  else if (d.a === 'owner') { if (me().roles.includes('proprietaire')) { S.session.space = 'proprietaire'; commit(); mTab('ownerDash'); } else mGo('becomeOwner'); }
  else { M.filters = defaultFilters(); mTab('search'); toast('Code BIENVENUE10 : appliquez-le au moment de réserver', 'info'); }
};
function findQuartier(q) {
  for (const country in LOCATIONS) for (const region in LOCATIONS[country]) for (const city in LOCATIONS[country][region]) {
    if (city === q) return { city };
    for (const commune in LOCATIONS[country][region][city]) for (const quartier in LOCATIONS[country][region][city][commune]) if (quartier === q) return { city, commune, quartier };
  }
  return null;
}
function trackView(pid) {
  const u = me(); if (!u) return; const p = prop(pid);
  const v = S.viewed[u.id] = S.viewed[u.id] || [];
  const i = v.indexOf(pid); if (i >= 0) v.splice(i, 1); v.unshift(pid); v.length = Math.min(v.length, 30);
  if (!canManage(u, p)) p.views++;
  saveStore();
}

ACT.fav = d => {
  const u = me(); if (!u) return;
  const on = toggleFav(u.id, d.id); commit();
  toast(on ? 'Ajouté aux favoris' : 'Retiré des favoris', on ? 'ok' : 'info');
  if (cur().s === 'map') updateMapList();
};

/* ---------------- Recherche avancée ---------------- */
function defaultFilters() { return { q: '', city: '', commune: '', quartier: '', types: [], min: '', max: '', bedrooms: 0, bathrooms: 0, area: '', furnished: '', equipments: [], duration: '', from: '', to: '', verified: false, tour: false, sort: 'pertinence', bounds: null }; }
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function textScore(p, q) {
  if (!q) return 1;
  const hay = norm([p.title, p.description, p.quartier, p.city, p.commune, category(p.type).name, p.equipments.map(e => equipment(e)?.name).join(' '), p.furnished ? 'meuble' : 'non meuble'].join(' '));
  const toks = norm(q).split(/[\s,]+/).filter(t => t.length > 1);
  let s = 0; toks.forEach(t => { if (hay.includes(t)) s += norm(p.title).includes(t) ? 3 : 1; });
  return toks.length ? s : 1;
}
function priceFor(p, f) { return f.duration && f.duration !== p.period ? unitPrice(p, f.duration) : p.price; }
function filterProps(f, ignoreBounds) {
  let list = publicProps().filter(p => {
    if (f.city && p.city !== f.city) return false;
    if (f.commune && p.commune !== f.commune) return false;
    if (f.quartier && p.quartier !== f.quartier) return false;
    if (f.types.length && !f.types.includes(p.type)) return false;
    if (f.duration && !p.durations.includes(f.duration) && p.period !== f.duration) return false;
    const pr = priceFor(p, f);
    if (f.min && pr < +f.min) return false; if (f.max && pr > +f.max) return false;
    if (f.bedrooms && p.bedrooms < f.bedrooms) return false;
    if (f.bathrooms && p.bathrooms < f.bathrooms) return false;
    if (f.area && p.area < +f.area) return false;
    if (f.furnished === 'oui' && !p.furnished) return false; if (f.furnished === 'non' && p.furnished) return false;
    if (f.equipments.length && !f.equipments.every(e => p.equipments.includes(e))) return false;
    if (f.verified && !p.verified) return false;
    if (f.tour && !hasPublishedTour(p)) return false;
    if (f.from && f.to && f.to > f.from && conflicts(p.id, f.from, f.to).length) return false;
    if (f.q && textScore(p, f.q) === 0) return false;
    if (!ignoreBounds && f.bounds) { const b = f.bounds; if (p.lat > b.n || p.lat < b.s || p.lng > b.e || p.lng < b.w) return false; }
    return true;
  });
  const sorters = {
    prix_asc: (a, b) => priceFor(a, f) - priceFor(b, f), prix_desc: (a, b) => priceFor(b, f) - priceFor(a, f),
    date: (a, b) => b.created.localeCompare(a.created), popularite: (a, b) => b.views - a.views,
    proximite: (a, b) => distTo(a) - distTo(b),
    pertinence: (a, b) => (textScore(b, f.q) * 2 + (b.verified ? 1 : 0) + ratingOf(b.id).avg / 2 + (hasPublishedTour(b) ? .5 : 0)) - (textScore(a, f.q) * 2 + (a.verified ? 1 : 0) + ratingOf(a.id).avg / 2 + (hasPublishedTour(a) ? .5 : 0))
  };
  return list.sort(sorters[f.sort] || sorters.pertinence);
}
function activeChips(f) {
  const c = [];
  if (f.q) c.push(['q', '« ' + f.q + ' »']);
  if (f.quartier) c.push(['quartier', f.quartier]); else if (f.commune) c.push(['commune', f.commune]); if (f.city) c.push(['city', f.city]);
  f.types.forEach(t => c.push(['type:' + t, category(t).name]));
  if (f.min || f.max) c.push(['budget', (f.min ? moneyShort(+f.min) : '0') + ' – ' + (f.max ? moneyShort(+f.max) : '∞')]);
  if (f.bedrooms) c.push(['bedrooms', f.bedrooms + '+ ch.']); if (f.bathrooms) c.push(['bathrooms', f.bathrooms + '+ sdb']);
  if (f.area) c.push(['area', '≥ ' + f.area + ' m²']); if (f.furnished) c.push(['furnished', f.furnished === 'oui' ? 'Meublé' : 'Non meublé']);
  f.equipments.forEach(e => c.push(['eq:' + e, equipment(e).name])); if (f.duration) c.push(['duration', PERIOD_LABEL[f.duration]]);
  if (f.from && f.to) c.push(['dates', fmtDateShort(f.from) + ' → ' + fmtDateShort(f.to)]);
  if (f.verified) c.push(['verified', 'Vérifiés']); if (f.tour) c.push(['tour', 'Visite virtuelle']); if (f.bounds) c.push(['bounds', 'Zone de la carte']);
  return c;
}
ACT.rmChip = d => {
  const f = M.filters, k = d.k;
  if (k.startsWith('type:')) f.types = f.types.filter(t => t !== k.slice(5));
  else if (k.startsWith('eq:')) f.equipments = f.equipments.filter(t => t !== k.slice(3));
  else if (k === 'budget') { f.min = ''; f.max = ''; } else if (k === 'dates') { f.from = ''; f.to = ''; }
  else if (k === 'city') { f.city = ''; f.commune = ''; f.quartier = ''; }
  else f[k] = Array.isArray(f[k]) ? [] : (typeof f[k] === 'boolean' ? false : typeof f[k] === 'number' ? 0 : (k === 'bounds' ? null : ''));
  M.shown = 10; mRender(true);
};

/* Assistant de recherche en langage naturel (§6.6) */
function parseNL(q) {
  const n = norm(q); const c = {}; const labels = [];
  const words = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5 };
  const bm = n.match(/(\d+|un|une|deux|trois|quatre|cinq)\s*(chambres?|ch\b|pieces?)/);
  if (bm) { c.bedrooms = words[bm[1]] || +bm[1]; labels.push(c.bedrooms + '+ chambre(s)'); }
  const types = [['villa', 'villa'], ['duplex', 'duplex'], ['studio', 'studio'], ['appartement', 'appartement'], ['appart', 'appartement'], ['maison', 'maison']];
  for (const [w, t] of types) if (n.includes(w)) { c.types = [t]; labels.push(category(t).name); break; }
  if (!c.types && /chambre[- ]salon|une chambre a louer|chambre meublee/.test(n)) { c.types = ['chambre']; labels.push('Chambre'); }
  const fq = (() => { for (const country in LOCATIONS) for (const r in LOCATIONS[country]) for (const city in LOCATIONS[country][r]) { for (const co in LOCATIONS[country][r][city]) for (const qu in LOCATIONS[country][r][city][co]) if (n.includes(norm(qu))) return { city, quartier: qu }; } for (const country in LOCATIONS) for (const r in LOCATIONS[country]) for (const city in LOCATIONS[country][r]) if (n.includes(norm(city))) return { city }; return null; })();
  if (fq) { c.city = fq.city; labels.push(fq.city); if (fq.quartier) { c.quartier = fq.quartier; labels.push(fq.quartier); } }
  let budget = null; const km = n.match(/(\d+)\s*k\b/); if (km) budget = +km[1] * 1000;
  (n.match(/\d{1,3}(?:[\s.  ]\d{3})+|\d{4,}/g) || []).forEach(x => { const v = +x.replace(/\D/g, ''); if (v >= 1000) budget = v; });
  if (budget) { c.max = String(budget); labels.push('≤ ' + money(budget)); }
  if (/non meuble/.test(n)) { c.furnished = 'non'; labels.push('Non meublé'); } else if (/meuble/.test(n)) { c.furnished = 'oui'; labels.push('Meublé'); }
  if (/par mois|mensuel|\/mois|le mois/.test(n)) { c.duration = 'mois'; labels.push('Au mois'); } else if (/nuit|nuitee/.test(n)) { c.duration = 'nuit'; labels.push('À la nuitée'); } else if (/semaine/.test(n)) { c.duration = 'semaine'; labels.push('À la semaine'); }
  const eqs = []; [['piscine', 'piscine'], ['clim', 'clim'], ['parking', 'parking'], ['jardin', 'jardin'], ['wifi', 'internet'], ['internet', 'internet'], ['groupe', 'groupe'], ['forage', 'forage']].forEach(([w, e]) => { if (n.includes(w) && !eqs.includes(e)) { eqs.push(e); labels.push(equipment(e).name); } });
  if (eqs.length) c.equipments = eqs;
  return { c, labels, n: Object.keys(c).length };
}

SCR.search = () => {
  const f = M.filters; const list = filterProps(f); const shown = list.slice(0, M.shown); const chips = activeChips(f);
  const u = me(); const hist = S.searchHistory[u.id] || [];
  const nl = M.nlCriteria;
  return `<header class="hdr search-hdr"><form data-submit="doSearch" class="search-box">${ic('search')}<input id="q" name="q" class="inp" placeholder="Ville, quartier, mot-clé… ou décrivez votre besoin" value="${esc(f.q)}" autocomplete="off" data-inp="suggest"><button type="button" class="hdr-btn" data-act="openFilters" aria-label="Filtres">${ic('sliders')}${chips.length ? '<i class="dot-badge">' + chips.length + '</i>' : ''}</button></form>
  <div class="suggest" id="suggest"></div></header>
  <div class="body" data-scroll="main" id="search-body">
  ${nl ? `<div class="assist">${ic('sparkle')}<div><b>Assistant DomiLoc</b><span>J'ai compris : ${nl.labels.map(l => '<em>' + esc(l) + '</em>').join(' ')}</span><div class="btn-row"><button class="btn sm pri" data-act="nlApply">Appliquer ces critères</button><button class="btn sm ghost" data-act="nlDismiss">Ignorer</button></div></div></div>` : ''}
  ${!f.q && !chips.length && hist.length ? `<div class="sec"><div class="sec-h"><h4>Recherches récentes</h4><a href="#" class="link" data-act="clearHistory">Effacer</a></div><div class="chips-row wrap">${hist.map(h => `<button class="chip" data-act="histSearch" data-q="${esc(h)}">${ic('history')}${esc(h)}</button>`).join('')}</div>
  <p class="hint">Essayez l'assistant : <a href="#" class="link" data-act="histSearch" data-q="Je cherche un appartement de deux chambres à Lomé avec un budget de 100 000 FCFA par mois">« Je cherche un appartement de deux chambres à Lomé avec un budget de 100 000 FCFA par mois »</a></p></div>` : ''}
  ${chips.length ? `<div class="chips-row" data-scroll="h-chips">${chips.map(([k, l]) => `<button class="chip on" data-act="rmChip" data-k="${k}">${esc(l)} ${ic('close')}</button>`).join('')}<button class="chip ghost" data-act="resetFilters">Tout effacer</button></div>` : ''}
  <div class="toolbar"><b>${list.length} logement${list.length > 1 ? 's' : ''}</b>
    <select class="inp sm" id="sort" data-chg="setSort">${[['pertinence', 'Pertinence'], ['prix_asc', 'Prix croissant'], ['prix_desc', 'Prix décroissant'], ['date', 'Plus récents'], ['popularite', 'Popularité'], ['proximite', 'Proximité']].map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <button class="hdr-btn" data-act="saveSearch" title="Enregistrer la recherche">${ic('bell')}</button><button class="hdr-btn" data-act="mTab" data-s="map" title="Voir sur la carte">${ic('map')}</button></div>
  <div class="results">${shown.map(p => pcard(p, 'wide')).join('') || empty('search', 'Aucun logement trouvé', 'Élargissez vos critères ou enregistrez la recherche pour être alerté des nouvelles annonces.', '<button class="btn sec" data-act="saveSearch">' + ic('bell') + ' Créer une alerte</button>')}</div>
  ${list.length > shown.length ? `<div class="load-more" id="load-more"><span class="spinner"></span> Chargement des résultats…</div>` : list.length ? '<p class="center muted small">Fin des résultats</p>' : ''}
  <div class="foot-space"></div></div>`;
};
MOUNT.search = () => {
  const b = $('#search-body'); if (!b) return;
  b.addEventListener('scroll', () => {
    const lm = $('#load-more'); if (!lm || M._loading) return;
    if (b.scrollTop + b.clientHeight > b.scrollHeight - 120) { M._loading = true; setTimeout(() => { M.shown += 10; M._loading = false; mRender(true); }, 500); }
  });
};
ACT.setSort = (d, el) => { M.filters.sort = el.value; if (el.value === 'proximite' && M.geo !== 'granted') toast('Proximité calculée depuis une position approximative (Lomé). Activez la localisation sur la carte.', 'info'); mRender(true); };
ACT.suggest = (d, el) => {
  const v = norm(el.value); const box = $('#suggest'); if (!box) return;
  if (v.length < 2) { box.innerHTML = ''; return; }
  const out = new Set();
  for (const country in LOCATIONS) for (const r in LOCATIONS[country]) for (const city in LOCATIONS[country][r]) { if (norm(city).includes(v)) out.add('📍 ' + city); for (const co in LOCATIONS[country][r][city]) for (const q in LOCATIONS[country][r][city][co]) if (norm(q).includes(v)) out.add('📍 ' + q); }
  S.categories.forEach(c => { if (norm(c.name).includes(v)) out.add(c.icon + ' ' + c.name); });
  publicProps().forEach(p => { if (norm(p.title).includes(v) && out.size < 8) out.add('🏠 ' + p.title); });
  box.innerHTML = [...out].slice(0, 7).map(s => `<button data-act="pickSuggest" data-v="${esc(s)}">${esc(s)}</button>`).join('');
};
ACT.pickSuggest = d => {
  const v = d.v.replace(/^\S+\s/, ''); const loc = findQuartier(v); const cat = S.categories.find(c => c.name === v);
  if (loc) { M.filters.city = loc.city; M.filters.quartier = loc.quartier || ''; M.filters.commune = loc.commune || ''; M.filters.q = ''; }
  else if (cat) { M.filters.types = [cat.id]; M.filters.q = ''; }
  else { const p = publicProps().find(x => x.title === v); if (p) { trackView(p.id); mGo('property', { id: p.id }); return; } M.filters.q = v; }
  addHistory(v); M.shown = 10; mRender(false);
};
function addHistory(q) { const u = me(); const h = S.searchHistory[u.id] = S.searchHistory[u.id] || []; const i = h.indexOf(q); if (i >= 0) h.splice(i, 1); h.unshift(q); h.length = Math.min(h.length, 8); saveStore(); }
ACT.doSearch = f => {
  const q = (f.q || '').trim(); M.shown = 10;
  const nl = q ? parseNL(q) : { n: 0 };
  if (nl.n >= 2) { M.nlCriteria = nl; M.filters.q = ''; } else { M.nlCriteria = null; M.filters.q = q; }
  if (q) addHistory(q); mRender(false);
};
ACT.histSearch = d => { const el = $('#q'); if (el) el.value = d.q; ACT.doSearch({ q: d.q }); };
ACT.nlApply = () => { const f = defaultFilters(); Object.assign(f, M.nlCriteria.c); f.sort = M.filters.sort; M.filters = f; M.nlCriteria = null; M.shown = 10; mRender(false); toast('Critères appliqués par l\'assistant'); };
ACT.nlDismiss = () => { M.nlCriteria = null; mRender(true); };
ACT.clearHistory = () => { S.searchHistory[me().id] = []; commit(); };
ACT.resetFilters = () => { const s = M.filters.sort; M.filters = defaultFilters(); M.filters.sort = s; mRender(true); };

function filterSheetHTML() {
  const f = M.filters; const cities = []; for (const c in LOCATIONS) for (const r in LOCATIONS[c]) for (const city in LOCATIONS[c][r]) cities.push([city, c, r]);
  const cityObj = f.city ? (() => { const x = cities.find(c => c[0] === f.city); return x ? LOCATIONS[x[1]][x[2]][f.city] : null; })() : null;
  const communes = cityObj ? Object.keys(cityObj) : []; const quartiers = cityObj && f.commune ? Object.keys(cityObj[f.commune] || {}) : (cityObj ? communes.flatMap(co => Object.keys(cityObj[co])) : []);
  return `<form data-submit="applyFilters" class="form filters" id="filters-form" data-inp="filterCount">
  <div class="grid3"><label class="field"><span>Ville</span><select class="inp" name="city" data-chg="filterCity"><option value="">Toutes</option>${cities.map(c => `<option ${f.city === c[0] ? 'selected' : ''}>${c[0]}</option>`).join('')}</select></label>
  <label class="field"><span>Commune</span><select class="inp" name="commune" data-chg="filterCity" ${communes.length ? '' : 'disabled'}><option value="">Toutes</option>${communes.map(c => `<option ${f.commune === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
  <label class="field"><span>Quartier</span><select class="inp" name="quartier" ${quartiers.length ? '' : 'disabled'}><option value="">Tous</option>${quartiers.map(c => `<option ${f.quartier === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div>
  <div class="field"><span>Type de logement</span><div class="chips-row wrap">${S.categories.filter(c => c.active).map(c => `<label class="chip-check"><input type="checkbox" name="types" value="${c.id}" data-multi ${f.types.includes(c.id) ? 'checked' : ''}><span>${c.icon} ${c.name}</span></label>`).join('')}</div></div>
  <div class="field"><span>Durée de location</span><div class="seg wrap">${[['', 'Toutes'], ['nuit', 'Nuitée'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['an', 'Année']].map(([v, l]) => `<label><input type="radio" name="duration" value="${v}" ${f.duration === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
  <div class="grid2"><label class="field"><span>Budget min (FCFA)</span><input class="inp" type="number" name="min" step="5000" min="0" value="${f.min}" placeholder="0"></label><label class="field"><span>Budget max (FCFA)</span><input class="inp" type="number" name="max" step="5000" min="0" value="${f.max}" placeholder="Illimité"></label></div>
  <div class="grid2"><div class="field"><span>Chambres min.</span><div class="seg">${[0, 1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="bedrooms" value="${n}" ${f.bedrooms == n ? 'checked' : ''}><span>${n ? n + '+' : 'Tous'}</span></label>`).join('')}</div></div>
  <div class="field"><span>Salles de bain min.</span><div class="seg">${[0, 1, 2, 3].map(n => `<label><input type="radio" name="bathrooms" value="${n}" ${f.bathrooms == n ? 'checked' : ''}><span>${n ? n + '+' : 'Tous'}</span></label>`).join('')}</div></div></div>
  <div class="grid2"><label class="field"><span>Superficie min. (m²)</span><input class="inp" type="number" name="area" min="0" value="${f.area}"></label>
  <div class="field"><span>Ameublement</span><div class="seg">${[['', 'Tous'], ['oui', 'Meublé'], ['non', 'Non meublé']].map(([v, l]) => `<label><input type="radio" name="furnished" value="${v}" ${f.furnished === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div></div>
  <div class="field"><span>Équipements</span><div class="chips-row wrap">${S.equipments.filter(e => e.active).map(e => `<label class="chip-check"><input type="checkbox" name="equipments" value="${e.id}" data-multi ${f.equipments.includes(e.id) ? 'checked' : ''}><span>${e.icon} ${e.name}</span></label>`).join('')}</div></div>
  <div class="field"><span>Disponible du … au …</span><div class="grid2"><input class="inp" type="date" name="from" min="${todayISO()}" value="${f.from}"><input class="inp" type="date" name="to" min="${todayISO()}" value="${f.to}"></div></div>
  <label class="switch-row"><span>${ic('shield')} Annonces vérifiées uniquement</span><input type="checkbox" class="switch" name="verified" ${f.verified ? 'checked' : ''}></label>
  <label class="switch-row"><span>${ic('cube')} Avec visite virtuelle 360° / 3D</span><input type="checkbox" class="switch" name="tour" ${f.tour ? 'checked' : ''}></label>
  <div class="sheet-foot"><button type="button" class="btn sec" data-act="resetFiltersSheet">Réinitialiser</button><button class="btn pri" id="filter-apply">Afficher ${filterProps(f).length} résultats</button></div></form>`;
}
function readFilterForm(o) {
  const f = Object.assign(defaultFilters(), { q: M.filters.q, sort: M.filters.sort, bounds: M.filters.bounds });
  f.city = o.city || ''; f.commune = o.commune || ''; f.quartier = o.quartier || '';
  f.types = [].concat(o.types || []).filter(Boolean); f.equipments = [].concat(o.equipments || []).filter(Boolean);
  f.duration = o.duration || ''; f.min = o.min || ''; f.max = o.max || ''; f.bedrooms = +o.bedrooms || 0; f.bathrooms = +o.bathrooms || 0;
  f.area = o.area || ''; f.furnished = o.furnished || ''; f.from = o.from || ''; f.to = o.to || ''; f.verified = o.verified === 'on'; f.tour = o.tour === 'on';
  return f;
}
ACT.openFilters = () => openSheet(filterSheetHTML(), { title: 'Filtres', cls: 'tall' });
ACT.filterCount = () => { const form = $('#filters-form'); if (!form) return; const n = filterProps(readFilterForm(formObj(form))).length; const b = $('#filter-apply'); if (b) b.textContent = 'Afficher ' + n + ' résultat' + (n > 1 ? 's' : ''); };
ACT.filterCity = (d, el) => {
  const form = $('#filters-form'); const o = formObj(form);
  if (el.name === 'city') { o.commune = ''; o.quartier = ''; } else o.quartier = '';
  M.filters = readFilterForm(o); const body = $('#m-sheet .sheet-body'); if (body) body.innerHTML = filterSheetHTML();
};
ACT.resetFiltersSheet = () => { M.filters = Object.assign(defaultFilters(), { sort: M.filters.sort }); const body = $('#m-sheet .sheet-body'); if (body) body.innerHTML = filterSheetHTML(); };
ACT.applyFilters = o => { M.filters = readFilterForm(o); M.shown = 10; closeSheet(); mRender(cur().s !== 'map'); if (cur().s === 'map') mapRefresh(); };

ACT.saveSearch = () => {
  const f = M.filters; const chips = activeChips(f);
  if (!chips.length) { toast('Ajoutez au moins un critère avant d\'enregistrer', 'info'); return; }
  openSheet(`<form data-submit="saveSearchOk" class="form"><p class="muted">Critères : ${chips.map(c => '<em class="chip sm on">' + esc(c[1]) + '</em>').join(' ')}</p>
  <label class="field"><span>Nom de la recherche</span><input class="inp" name="name" required value="${esc(chips.slice(0, 3).map(c => c[1]).join(' · '))}"></label>
  <label class="switch-row"><span>${ic('bell')} M'alerter des nouvelles annonces</span><input type="checkbox" class="switch" name="alerts" checked></label>
  <button class="btn pri block">Enregistrer</button></form>`, { title: 'Enregistrer la recherche' });
};
ACT.saveSearchOk = o => {
  const u = me(); const crit = JSON.parse(JSON.stringify(M.filters)); delete crit.bounds;
  (S.savedSearches[u.id] = S.savedSearches[u.id] || []).unshift({ id: uid('ss'), name: o.name, criteria: crit, alerts: o.alerts === 'on', created: todayISO() });
  commit(); closeSheet(); toast('Recherche enregistrée' + (o.alerts === 'on' ? ' — alerte activée' : ''));
};

/* ---------------- Carte interactive ---------------- */
let MAPI = null;
SCR.map = () => {
  const chips = activeChips(M.filters);
  return `<div class="body map-body"><div id="map" class="map-full"></div>
  <div class="map-top"><button class="search-fake sm" data-act="mTab" data-s="search">${ic('search')}<span>${M.filters.city || M.filters.q || 'Rechercher une ville, un quartier'}</span></button>
  <button class="map-btn" data-act="openFilters">${ic('sliders')}${chips.length ? '<i class="dot-badge">' + chips.length + '</i>' : ''}</button></div>
  <button class="map-area hidden" id="map-area" data-act="searchArea">${ic('refresh')} Rechercher dans cette zone</button>
  <div class="map-side"><button class="map-btn" data-act="geoLocate" title="Ma position">${ic('locate')}</button><button class="map-btn" data-act="mapCity" title="Choisir une ville">${ic('pin')}</button><button class="map-btn" data-act="mTab" data-s="search" title="Liste">${ic('list')}</button></div>
  <div class="map-bottom" id="map-bottom"></div></div>`;
};
MOUNT.map = () => {
  if (MAPI) { try { MAPI.destroy(); } catch (_) { } }
  const v = M.mapView || { center: [6.165, 1.225], zoom: 12 };
  MAPI = MapKit.create($('#map'), { center: v.center, zoom: v.zoom, onMove: () => { M.mapView = MAPI.getView(); const a = $('#map-area'); if (a && M._mapReady) a.classList.remove('hidden'); } });
  if (M.pos) MAPI.user(M.pos);
  mapRefresh();
  setTimeout(() => { M._mapReady = true; }, 600);
};
SOFT_HOOK.map = () => updateMapList();
function mapRefresh() {
  if (!MAPI) return;
  const list = filterProps(M.filters, true);
  MAPI.setItems(list, p => { M.mapSel = p.id; MAPI.select(p.id); updateMapList(); });
  updateMapList();
}
function updateMapList() {
  const el = $('#map-bottom'); if (!el || !MAPI) return;
  if (M.mapSel) {
    const p = prop(M.mapSel); const d = distTo(p); const u = me();
    el.innerHTML = `<div class="map-card"><button class="hdr-btn close" data-act="mapUnsel">${ic('close')}</button>
    <div class="thumb" style="background-image:url('${propCover(p)}')" data-act="mGo" data-s="property" data-id="${p.id}"></div>
    <div class="mc-info" data-act="mGo" data-s="property" data-id="${p.id}"><b>${money(p.price)}<small>/${p.period}</small></b><span>${esc(p.title)}</span><small>${ic('pin')} ${fmtKm(d)} · ${p.bedrooms} ch. · ${p.area} m² ${p.verified ? '· ✓ Vérifié' : ''}</small></div>
    <div class="mc-act"><button class="btn sm sec" data-act="mapRoute" data-id="${p.id}">${ic('route')} Itinéraire</button><button class="btn sm ${isFav(u.id, p.id) ? 'pri' : 'sec'}" data-act="fav" data-id="${p.id}">${ic('heart')}</button><button class="btn sm pri" data-act="mGo" data-s="property" data-id="${p.id}">Voir</button></div>
    <div id="route-info"></div></div>`;
    return;
  }
  const b = MAPI.bounds(); const inView = filterProps(M.filters, true).filter(p => p.lat <= b.n && p.lat >= b.s && p.lng <= b.e && p.lng >= b.w);
  el.innerHTML = `<div class="map-count">${inView.length} logement${inView.length > 1 ? 's' : ''} dans cette zone</div><div class="hscroll map-strip">${inView.map(p => `<div class="mstrip" data-act="mapFocus" data-id="${p.id}"><div class="thumb" style="background-image:url('${propCover(p)}')"></div><div><b>${moneyShort(p.price)} FCFA</b><small>/${p.period}</small><span>${esc(p.quartier)}</span></div></div>`).join('')}</div>`;
}
ACT.mapUnsel = () => { M.mapSel = null; MAPI.select(null); MAPI.clearRoute(); updateMapList(); };
ACT.mapFocus = d => { const p = prop(d.id); M.mapSel = p.id; MAPI.center([p.lat, p.lng], 15); MAPI.select(p.id); updateMapList(); };
ACT.searchArea = () => { M.filters.bounds = MAPI.bounds(); $('#map-area').classList.add('hidden'); toast(filterProps(M.filters).length + ' logements dans la zone. Résultats synchronisés avec la liste.', 'info'); mapRefresh(); };
ACT.mapRoute = d => {
  const p = prop(d.id);
  if (M.geo !== 'granted') { ACT.geoLocate({ then: 'route', id: d.id }); return; }
  const km = MAPI.route(M.pos, [p.lat, p.lng]);
  const info = $('#route-info'); if (info) info.innerHTML = `<div class="route-info">${ic('route')} <b>${fmtKm(km * 1.3)}</b> par la route · ~${Math.max(3, Math.round(km * 1.3 / 25 * 60))} min en voiture · ~${Math.round(km * 1.3 / 4.5 * 60)} min à pied <a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}">Ouvrir dans Google Maps</a></div>`;
};
ACT.geoLocate = (d) => {
  if (M.geo === 'granted') { if (MAPI) { MAPI.center(M.pos, 14); MAPI.user(M.pos); } return; }
  openSheet(`<div class="center-col"><div class="big-ic">${ic('locate')}</div><p>Autoriser <b>DomiLoc</b> à accéder à la position de cet appareil ?</p><p class="small muted">Utilisée pour afficher les logements à proximité, les distances et les itinéraires. (Position simulée dans la maquette : Tokoin, Lomé.)</p>
  <div class="stack-btns"><button class="btn pri block" data-act="geoAnswer" data-ok="1" data-then="${d.then || ''}" data-id="${d.id || ''}">Autoriser lorsque l'app est active</button><button class="btn sec block" data-act="geoAnswer" data-ok="0">Ne pas autoriser</button></div></div>`, { title: 'Localisation' });
};
ACT.geoAnswer = d => {
  closeSheet();
  if (d.ok === '1') {
    M.geo = 'granted'; M.pos = SIM_POS.slice(); toast('Position détectée : Tokoin, Lomé');
    if (MAPI) { MAPI.user(M.pos); MAPI.center(M.pos, 14); }
    if (d.then === 'route') ACT.mapRoute({ id: d.id });
  } else { M.geo = 'denied'; toast('Localisation refusée — choisissez une ville ou un quartier', 'info'); ACT.mapCity(); }
};
ACT.mapCity = () => {
  const places = [['Lomé', 6.165, 1.225, 12], ['Tokoin', 6.156, 1.219, 14], ['Bè', 6.140, 1.245, 14], ['Baguida', 6.165, 1.330, 14], ['Agoè', 6.235, 1.208, 14], ['Adidogomé', 6.180, 1.160, 14], ['Kpalimé', 6.900, 0.630, 13], ['Kara', 9.551, 1.186, 13], ['Cotonou', 6.358, 2.372, 13]];
  openSheet(`<div class="list">${places.map(([n, la, ln, z]) => `<button class="li" data-act="mapGoTo" data-la="${la}" data-ln="${ln}" data-z="${z}">${ic('pin')}<div class="li-main">${n}</div>${ic('next')}</button>`).join('')}</div>`, { title: 'Rechercher par ville ou quartier' });
};
ACT.mapGoTo = d => { closeSheet(); if (MAPI) MAPI.center([+d.la, +d.ln], +d.z); };

/* ---------------- Fiche logement ---------------- */
function canSeeExact(p) { const u = me(); return canManage(u, p) || S.bookings.some(b => b.propertyId === p.id && b.tenantId === u.id && ['confirmee', 'encours', 'terminee'].includes(b.status)); }
SCR.property = ({ id }) => {
  const p = prop(id); if (!p) return hdr('Annonce') + '<div class="body">' + empty('alert', 'Annonce introuvable') + '</div>';
  const u = me(); const own = canManage(u, p); const r = ratingOf(p.id); const o = ownerLabel(p); const t = tourOf(p); const exact = canSeeExact(p);
  const reviews = S.reviews.filter(x => x.propertyId === p.id && x.status === 'publie');
  const similar = publicProps().filter(x => x.id !== p.id && (x.type === p.type || x.city === p.city)).sort((a, b) => (b.type === p.type) - (a.type === p.type) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price)).slice(0, 6);
  const notPublic = p.status !== 'publiee';
  const gi = M.gIdx && M.gIdx[p.id] || 0;
  return `<div class="body detail" data-scroll="main">
  <div class="gallery"><div class="g-track" id="g-track" data-scroll="gal-${p.id}">${p.media.map((m, i) => `<div class="g-item" data-act="openGallery" data-id="${p.id}" data-i="${i}" style="background-image:url('${mediaSrc(m)}')">${m.type === 'video' ? `<span class="play">${ic('play')}</span>` : ''}</div>`).join('')}</div>
    <div class="g-top"><button class="round-btn" data-act="mBack">${ic('back')}</button><span></span><button class="round-btn" data-act="share" data-id="${p.id}">${ic('share')}</button><button class="round-btn ${isFav(u.id, p.id) ? 'on' : ''}" data-act="fav" data-id="${p.id}">${ic('heart')}</button></div>
    <div class="g-count" id="g-count">${gi + 1} / ${p.media.length}</div>
    ${hasPublishedTour(p) ? `<button class="g-tour" data-act="mGo" data-s="tour" data-id="${p.id}">${ic('cube')} Visite ${t.type === '3d' ? '3D' : '360°'}</button>` : ''}</div>
  <div class="pad">
    ${notPublic ? `<div class="alert ${PROPERTY_STATUS[p.status].color}">${ic('info')} Statut : <b>${PROPERTY_STATUS[p.status].label}</b> — cette annonce n'est pas visible publiquement.</div>` : ''}
    <div class="d-badges"><span class="tag gray">${category(p.type).icon} ${category(p.type).name}</span><span class="tag gray">${p.furnished ? 'Meublé' : 'Non meublé'}</span>${p.verified ? '<span class="tag green">' + ic('shield') + ' Annonce vérifiée</span>' : ''}${p.bookingMode === 'instant' ? '<span class="tag blue">⚡ Réservation instantanée</span>' : ''}</div>
    <h1 class="d-title">${esc(p.title)}</h1>
    <div class="d-loc">${ic('pin')} ${esc(p.quartier)}, ${esc(p.commune)}, ${esc(p.city)} · <span class="muted">${fmtKm(distTo(p))} de vous</span></div>
    ${r.count ? `<a href="#reviews" class="d-rating" data-act="scrollTo" data-t="reviews">${starsHTML(r.avg)} <b>${r.avg.toFixed(1)}</b> <span class="muted">(${r.count} avis)</span></a>` : '<span class="muted small">Pas encore d\'avis</span>'}
    <div class="d-price"><b>${money(p.price)}</b> / ${p.period}${p.durations.filter(x => x !== p.period).map(x => `<span class="muted"> · ${money(unitPrice(p, x))} / ${x}</span>`).join('')}</div>
    <div class="specs">${[['🛏️', p.bedrooms, 'Chambres'], ['🛋️', p.salons, 'Salons'], ['🛁', p.bathrooms, 'Salles de bain'], ['🚽', p.toilets, 'Toilettes'], ['📐', p.area + ' m²', 'Superficie'], ['🏢', p.floor ? p.floor + 'e / ' + p.buildingFloors : (p.buildingFloors > 1 ? 'R+' + (p.buildingFloors - 1) : 'Plain-pied'), 'Étage'], ['👥', p.capacity, 'Capacité']].map(([i, v, l]) => `<div><span>${i}</span><b>${v}</b><small>${l}</small></div>`).join('')}</div>
    ${hasPublishedTour(p) ? `<div class="tour-cta" data-act="mGo" data-s="tour" data-id="${p.id}" style="background-image:linear-gradient(90deg,rgba(15,23,42,.85),rgba(15,23,42,.2)),url('${scene('salon', p.hue)}')"><div>${ic('cube')}<b>Visite virtuelle ${t.type === '3d' ? '3D + 360°' : '360°'}</b><span>Explorez chaque pièce comme si vous y étiez</span></div>${ic('next')}</div>` : ''}
    <section class="d-sec"><h3>Description</h3><p class="clamp" id="desc">${esc(p.description)}</p></section>
    <section class="d-sec"><h3>Équipements</h3><div class="eq-grid">${p.equipments.map(e => equipment(e)).filter(Boolean).map(e => `<span>${e.icon} ${e.name}</span>`).join('')}</div></section>
    <section class="d-sec"><h3>Disponibilités</h3>${calHTML('d-' + p.id, p.id)}</section>
    <section class="d-sec"><h3>Conditions de location</h3><div class="kv">
      <div><span>Mode de réservation</span><b>${p.bookingMode === 'instant' ? 'Instantanée' : 'Sur validation du propriétaire'}</b></div>
      <div><span>Durées acceptées</span><b>${p.durations.map(x => PERIOD_LABEL[x]).join(', ')}</b></div>
      <div><span>Caution</span><b>${money(p.deposit)}</b></div>${p.advance ? `<div><span>Avance</span><b>${money(p.advance)} (3 mois)</b></div>` : ''}
      <div><span>Frais de dossier</span><b>${money(p.fees)}</b></div>${p.charges ? `<div><span>Charges mensuelles</span><b>${money(p.charges)}</b></div>` : ''}
      <div class="full"><span>Paiement</span><p>${esc(p.paymentTerms)}</p></div><div class="full"><span>Annulation</span><p>${esc(p.cancelPolicy)}</p></div></div></section>
    <section class="d-sec"><h3>Localisation</h3><div id="mini-map" class="mini-map"></div>
      <p class="small ${exact ? '' : 'muted'}">${exact ? ic('pin') + ' <b>Adresse exacte :</b> ' + esc(p.address) : ic('lock') + ' Localisation approximative (rayon ~300 m). L\'adresse exacte est communiquée après confirmation de la réservation.'}</p>
      <button class="btn sec sm" data-act="detailRoute" data-id="${p.id}">${ic('route')} Itinéraire · ${fmtKm(distTo(p) * 1.3)}</button></section>
    <section class="d-sec"><h3>${o.agency ? 'Agence' : 'Propriétaire'}</h3><div class="owner-card">${avatar(user(o.userId), 'lg')}<div><b>${esc(o.name)} ${verifiedBadge(o.verified, true)}</b><small>${esc(o.sub)}</small><small>${S.properties.filter(x => (o.agency ? x.agencyId === p.agencyId : x.ownerId === p.ownerId) && x.status === 'publiee').length} annonces · Répond en moins d'1 h · Membre depuis ${fmtDate(user(o.userId).created)}</small></div></div>
      ${o.verified ? '<p class="hint">' + ic('info') + ' Le badge « Vérifié » atteste du contrôle de justificatifs par DomiLoc ; il ne constitue pas une garantie juridique absolue de propriété.</p>' : ''}
      ${own ? '' : `<button class="btn sec block" data-act="contact" data-id="${p.id}">${ic('chat')} Contacter ${o.agency ? "l'agence" : 'le propriétaire'}</button>`}</section>
    <section class="d-sec" id="reviews"><h3>Avis ${r.count ? '· ' + r.avg.toFixed(1) + ' ★' : ''}</h3>
      ${r.count ? `<div class="crit">${Object.entries(REVIEW_KEYS).map(([k, l]) => `<div><span>${l}</span><i><b style="width:${r.detail[k] / 5 * 100}%"></b></i><em>${r.detail[k].toFixed(1)}</em></div>`).join('')}</div>` : ''}
      ${reviews.map(rv => reviewHTML(rv, own)).join('') || '<p class="muted">Les avis sont publiés par des locataires ayant effectué une réservation.</p>'}</section>
    ${similar.length ? `<section class="d-sec"><h3>Logements similaires</h3><div class="hscroll" data-scroll="sim">${similar.map(x => pcard(x, 'sm')).join('')}</div></section>` : ''}
    ${own ? '' : `<button class="btn ghost danger-txt block" data-act="report" data-type="property" data-id="${p.id}">${ic('flag')} Signaler cette annonce</button>`}
    <div class="foot-space"></div></div></div>
  <div class="d-bar">${own ? `<div><small>Vous gérez ce logement</small><b>${tag(PROPERTY_STATUS[p.status])}</b></div><button class="btn pri" data-act="manageFromDetail" data-id="${p.id}">${ic('edit')} Gérer l'annonce</button>`
      : `<div><b>${money(p.price)}</b><small>/ ${p.period}</small></div><button class="btn sec" data-act="contact" data-id="${p.id}">${ic('chat')}</button><button class="btn pri" data-act="startBook" data-id="${p.id}" ${notPublic ? 'disabled' : ''}>${p.bookingMode === 'instant' ? '⚡ Réserver' : 'Demander à réserver'}</button>`}</div>`;
};
function reviewHTML(rv, own) {
  const a = user(rv.authorId); const avg = Object.values(rv.scores).reduce((x, y) => x + y, 0) / 5;
  return `<div class="review"><div class="rv-h">${avatar(a, 'sm')}<div><b>${esc(fullName(a))}</b><small>${timeAgo(rv.at)} ${rv.bookingId ? '· ✓ Séjour vérifié' : ''}</small></div>${starsHTML(avg, 'sm')}</div><p>${esc(rv.comment)}</p>
  ${rv.reply ? `<div class="rv-reply"><b>Réponse du propriétaire</b><p>${esc(rv.reply)}</p></div>` : own ? `<button class="btn ghost sm" data-act="replyReview" data-id="${rv.id}">${ic('chat')} Répondre</button>` : ''}
  <button class="link small muted" data-act="report" data-type="review" data-id="${rv.id}">${ic('flag')} Signaler</button></div>`;
}
MOUNT.property = ({ id }) => {
  const p = prop(id); if (!p) return;
  const tr = $('#g-track');
  if (tr) tr.addEventListener('scroll', () => { const i = Math.round(tr.scrollLeft / tr.clientWidth); const c = $('#g-count'); if (c) c.textContent = (i + 1) + ' / ' + p.media.length; (M.gIdx = M.gIdx || {})[p.id] = i; });
  const mm = $('#mini-map');
  if (mm) { const exact = canSeeExact(p); const k = MapKit.create(mm, { center: [p.lat, p.lng], zoom: 15, static: true }); if (exact) k.pin([p.lat, p.lng]); else k.circle([p.lat + 0.0006, p.lng - 0.0005], 300); }
};
ACT.scrollTo = d => { const el = document.getElementById(d.t); if (el) el.scrollIntoView({ behavior: 'smooth' }); };
ACT.detailRoute = d => { const p = prop(d.id); M.mapSel = p.id; M.mapView = { center: [p.lat, p.lng], zoom: 14 }; mTab('map'); setTimeout(() => ACT.mapRoute({ id: p.id }), 400); };
ACT.manageFromDetail = d => { const u = me(); if (S.session.space === 'locataire') S.session.space = u.roles.includes('agence') || u.roles.includes('agent') ? 'agence' : 'proprietaire'; commit(); mGo('ownerListing', { id: d.id }); };
ACT.openGallery = d => {
  const p = prop(d.id); const i = +d.i; const m = p.media[i];
  if (m.type === 'video') { playVideo(p, m); return; }
  openSheet(`<div class="gal-full"><button class="round-btn gf-close" data-act="closeSheet">${ic('close')}</button><div class="gf-track" id="gf-track">${p.media.filter(x => x.type === 'photo').map(x => `<figure><img src="${mediaSrc(x)}" alt="${esc(x.caption)}"><figcaption>${esc(x.caption || '')}</figcaption></figure>`).join('')}</div><p class="gf-hint">Faites défiler horizontalement · pincez pour zoomer</p></div>`, { full: true, cls: 'dark' });
  setTimeout(() => { const t = $('#gf-track'); const photos = p.media.filter(x => x.type === 'photo'); const pi = photos.indexOf(m); if (t && pi > 0) t.scrollLeft = pi * t.clientWidth; }, 30);
};
function playVideo(p, m) {
  const frames = p.media.filter(x => x.type === 'photo').slice(0, 5);
  openSheet(`<div class="video-sim"><button class="round-btn gf-close" data-act="closeSheet">${ic('close')}</button><div class="vs-stage">${frames.map((f, i) => `<div class="vs-frame" style="background-image:url('${mediaSrc(f)}');animation-delay:${i * 3}s;animation-duration:${frames.length * 3}s"></div>`).join('')}</div>
  <div class="vs-bar"><span>${ic('play')}</span><i><b style="animation-duration:${frames.length * 3}s"></b></i><small>${esc(m.caption)}</small></div><p class="gf-hint">Lecture simulée — vidéo compressée en streaming adaptatif (HLS) dans l'application finale.</p></div>`, { full: true, cls: 'dark' });
}
ACT.share = d => {
  const p = prop(d.id); const url = 'https://domiloc.app/l/' + p.id; const txt = encodeURIComponent(p.title + ' — ' + money(p.price) + '/' + p.period + ' ' + url);
  openSheet(`<div class="share-prev">${pmini(p)}</div><div class="share-grid">
  <a href="https://wa.me/?text=${txt}" target="_blank" rel="noopener" class="sh wa"><b>W</b>WhatsApp</a>
  <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener" class="sh fb"><b>f</b>Facebook</a>
  <a href="sms:?body=${txt}" class="sh sms"><b>${ic('chat')}</b>SMS</a>
  <button class="sh cp" data-act="copyLink" data-u="${url}"><b>${ic('copy')}</b>Copier le lien</button></div>
  <div class="inp link-box">${url}</div>`, { title: 'Partager l\'annonce' });
};
ACT.copyLink = d => { try { navigator.clipboard.writeText(d.u); } catch (_) { } closeSheet(); toast('Lien copié dans le presse-papiers'); };
ACT.replyReview = d => {
  openSheet(`<form data-submit="replyReviewOk" class="form"><input type="hidden" name="id" value="${d.id}"><label class="field"><span>Votre réponse publique</span><textarea class="inp" name="text" rows="4" required></textarea></label><button class="btn pri block">Publier la réponse</button></form>`, { title: 'Répondre à l\'avis' });
};
ACT.replyReviewOk = o => { const rv = S.reviews.find(r => r.id === o.id); rv.reply = o.text; commit(); closeSheet(); toast('Réponse publiée'); };

/* Signalement générique */
ACT.report = d => {
  const reasons = d.type === 'review' ? ['Avis injurieux ou faux', 'Contenu hors sujet', 'Autre'] : d.type === 'user' || d.type === 'conversation' ? ['Comportement abusif', 'Tentative de fraude', 'Spam', 'Autre'] : REPORT_REASONS.filter(r => r !== 'Avis injurieux ou faux');
  openSheet(`<form data-submit="reportOk" class="form"><input type="hidden" name="type" value="${d.type}"><input type="hidden" name="id" value="${d.id}">
  <div class="radio-list">${reasons.map((r, i) => `<label><input type="radio" name="reason" value="${r}" ${i ? '' : 'checked'}><span>${r}</span></label>`).join('')}</div>
  <label class="field"><span>Précisions</span><textarea class="inp" name="desc" rows="3" placeholder="Décrivez le problème…" required></textarea></label>
  <button class="btn danger block">${ic('flag')} Envoyer le signalement</button><p class="hint">Les signalements sont traités par l'équipe de modération sous 24 h.</p></form>`, { title: 'Signaler' });
};
ACT.reportOk = o => {
  S.reports.unshift({ id: uid('rep'), targetType: o.type, targetId: o.id, reason: o.reason, desc: o.desc, by: me().id, status: 'ouvert', at: Date.now(), decision: null });
  if (o.type === 'review') { const rv = S.reviews.find(r => r.id === o.id); if (rv) { rv.reported = true; rv.reportReason = o.reason; } }
  if (o.type === 'conversation') { const c = S.conversations.find(x => x.id === o.id); if (c) c.reported = true; }
  commit(); closeSheet(); toast('Signalement transmis à la modération');
};

/* Contact → conversation */
function convWith(otherId, pid, bid) {
  const u = me();
  let c = S.conversations.find(x => x.participants.includes(u.id) && x.participants.includes(otherId) && x.propertyId === pid);
  if (!c) { c = { id: uid('c'), participants: [u.id, otherId], propertyId: pid, bookingId: bid || null, blockedBy: null, reported: false, messages: [] }; S.conversations.unshift(c); }
  if (bid) c.bookingId = bid;
  return c;
}
ACT.contact = d => { const p = prop(d.id); const c = convWith(contactUserId(p), p.id, d.bid); commit(); mGo('chat', { id: c.id }); };

/* ---------------- Réservation ---------------- */
function firstFree(pid, unitType, units) {
  let s = addDays(todayISO(), 1);
  for (let i = 0; i < 400; i++) { if (!conflicts(pid, s, unitEnd(s, unitType, units)).length) return s; s = addDays(s, 1); }
  return addDays(todayISO(), 1);
}
ACT.startBook = d => {
  const p = prop(d.id); const u = me();
  if (u.status !== 'actif') { toast('Votre compte ne permet pas de réserver', 'err'); return; }
  const unitType = p.period; const units = { nuit: 2, semaine: 1, mois: 12, an: 1 }[unitType];
  M.bookDraft = { pid: p.id, unitType, units, start: firstFree(p.id, unitType, units), guests: 1, promo: '', msg: '', editId: null };
  M.calMonth['bk'] = M.bookDraft.start.slice(0, 8) + '01';
  mGo('book');
};
SCR.book = () => {
  const b = M.bookDraft; if (!b) return hdr('Réservation') + '<div class="body">' + empty('cal', 'Aucune réservation en cours') + '</div>';
  const p = prop(b.pid); const end = unitEnd(b.start, b.unitType, b.units); const q = quote(p, b.unitType, b.units, b.promo); const cf = conflicts(p.id, b.start, end, b.editId);
  const pendingOverlap = S.bookings.some(x => x.propertyId === p.id && x.status === 'attente' && x.id !== b.editId && overlaps(b.start, end, x.start, x.end));
  const unitLbl = { nuit: 'nuit(s)', semaine: 'semaine(s)', mois: 'mois', an: 'an(s)' }[b.unitType];
  const allowed = [...new Set([p.period].concat(p.durations))];
  return hdr(b.editId ? 'Modifier la demande' : (p.bookingMode === 'instant' ? 'Réservation instantanée' : 'Demande de réservation'), { sub: esc(p.title) }) + `<div class="body pad" data-scroll="main">
  ${pmini(p)}
  <div class="steps-lbl"><span class="on">1. Période</span><span>2. ${p.bookingMode === 'instant' ? 'Paiement' : 'Envoi'}</span><span>3. Confirmation</span></div>
  <div class="field"><span>Type de durée</span><div class="seg">${allowed.map(x => `<button class="${b.unitType === x ? 'on' : ''}" data-act="bkUnit" data-u="${x}">${PERIOD_LABEL[x]}</button>`).join('')}</div></div>
  <div class="field"><span>Date d'arrivée / début — touchez un jour libre</span>${calHTML('bk', p.id, { act: 'bkDay', start: b.start, end })}</div>
  <div class="field row-between"><span>Durée</span><div class="stepper"><button data-act="bkUnits" data-d="-1">${ic('minus')}</button><b>${b.units} ${unitLbl}</b><button data-act="bkUnits" data-d="1">${ic('plus')}</button></div></div>
  <div class="dates-box"><div><small>Début</small><b>${fmtDate(b.start)}</b></div>${ic('next')}<div><small>Fin</small><b>${fmtDate(end)}</b></div></div>
  ${cf.length ? `<div class="alert red">${ic('ban')} Période indisponible : ${cf.map(c => (c.type === 'booking' ? 'réservé' : 'bloqué par le propriétaire') + ' du ' + fmtDateShort(c.start) + ' au ' + fmtDateShort(c.end)).join(', ')}. Choisissez d'autres dates.</div>` : pendingOverlap ? `<div class="alert amber">${ic('info')} D'autres demandes existent sur cette période. Le propriétaire choisira ; les doubles réservations sont impossibles.</div>` : `<div class="alert green">${ic('check')} Logement disponible sur cette période.</div>`}
  ${b.unitType === 'nuit' || b.unitType === 'semaine' ? `<div class="field row-between"><span>Voyageurs (max ${p.capacity})</span><div class="stepper"><button data-act="bkGuests" data-d="-1">${ic('minus')}</button><b>${b.guests}</b><button data-act="bkGuests" data-d="1">${ic('plus')}</button></div></div>` : ''}
  ${p.bookingMode === 'validation' ? `<label class="field"><span>Message au propriétaire</span><textarea class="inp" id="bk-msg" rows="3" placeholder="Présentez-vous : situation, nombre d'occupants, date d'emménagement souhaitée…" data-inp="bkMsg">${esc(b.msg)}</textarea></label>` : ''}
  <div class="field"><span>Code promotionnel</span><div class="inp-pre"><input class="inp" id="bk-promo" placeholder="Ex. BIENVENUE10" value="${esc(b.promo)}"><button class="btn sm sec" data-act="bkPromo">Appliquer</button></div>
  ${q.promo ? `<small class="ok-txt">${ic('check')} Code ${q.promo} appliqué : -${money(q.discount)}</small>` : q.promoMsg ? `<small class="err-txt">${q.promoMsg}</small>` : ''}</div>
  ${quoteHTML(q, p)}
  <div class="foot-space"></div></div>
  <div class="d-bar"><div><small>${q.longTerm ? 'À payer à la signature' : 'Total'}</small><b>${money(q.dueNow)}</b></div>
  <button class="btn pri" data-act="bkSubmit" ${cf.length ? 'disabled' : ''}>${b.editId ? 'Enregistrer la modification' : p.bookingMode === 'instant' ? 'Continuer vers le paiement' : 'Envoyer la demande'}</button></div>`;
};
function quoteHTML(q, p) {
  const unitLbl = { nuit: 'nuit', semaine: 'semaine', mois: 'mois', an: 'an' }[q.unitType];
  return `<div class="quote"><h4>Détail du montant</h4>
  <div><span>${money(q.unitPrice)} × ${q.units} ${unitLbl}${q.units > 1 && unitLbl !== 'mois' ? 's' : ''}</span><b>${money(q.rent)}</b></div>
  ${q.discount ? `<div class="ok-txt"><span>Réduction ${q.promo}</span><b>-${money(q.discount)}</b></div>` : ''}
  <div><span>Frais de dossier</span><b>${money(q.fees)}</b></div><div><span>Caution (remboursable)</span><b>${money(q.deposit)}</b></div>
  ${q.longTerm ? `<div><span>Charges</span><b>${money(q.charges)} / mois</b></div><hr><div><span>Avance exigée (${q.unitType === 'mois' ? Math.min(3, q.units) + ' mois' : '1 an'})</span><b>${money(q.advance)}</b></div><div class="tot"><span>À payer à la signature</span><b>${money(q.dueNow)}</b></div><div class="muted small"><span>Coût total du contrat</span><b>${money(q.total)}</b></div>`
      : `<hr><div class="tot"><span>Total à payer</span><b>${money(q.dueNow)}</b></div>`}</div>`;
}
ACT.bkUnit = d => { const b = M.bookDraft; b.unitType = d.u; b.units = { nuit: 2, semaine: 1, mois: 12, an: 1 }[d.u]; mRender(true); };
ACT.bkUnits = d => { const b = M.bookDraft; b.units = clamp(b.units + +d.d, 1, b.unitType === 'nuit' ? 90 : b.unitType === 'semaine' ? 26 : b.unitType === 'mois' ? 36 : 5); mRender(true); };
ACT.bkGuests = d => { const b = M.bookDraft; b.guests = clamp(b.guests + +d.d, 1, prop(b.pid).capacity); mRender(true); };
ACT.bkDay = d => { M.bookDraft.start = d.day; mRender(true); };
ACT.bkMsg = (d, el) => { M.bookDraft.msg = el.value; };
ACT.bkPromo = () => { M.bookDraft.promo = ($('#bk-promo').value || '').trim().toUpperCase(); mRender(true); };
ACT.bkSubmit = () => {
  const b = M.bookDraft; const p = prop(b.pid); const end = unitEnd(b.start, b.unitType, b.units);
  if (conflicts(p.id, b.start, end, b.editId).length) { toast('Période indisponible', 'err'); return; }
  const q = quote(p, b.unitType, b.units, b.promo);
  if (b.editId) {
    const bk = booking(b.editId); Object.assign(bk, { start: b.start, end, units: b.units, unitType: b.unitType, quote: q, amount: q.dueNow });
    setBookingStatus(bk, 'attente', me().id, 'Demande modifiée : ' + fmtDateShort(b.start) + ' → ' + fmtDateShort(end));
    managersOf(p).forEach(m => notify(m, 'booking', 'Demande modifiée', fullName(me()) + ' a modifié sa demande pour « ' + p.title + ' ».', { s: 'ownerRequests' }));
    commit(); M.bookDraft = null; mReplace('bookingDetail', { id: bk.id }); toast('Demande modifiée'); return;
  }
  if (p.bookingMode === 'instant') { mGo('pay', { draft: true }); return; }
  const bk = createBooking(p, b, q, 'attente');
  if (b.msg) { const c = convWith(contactUserId(p), p.id, bk.id); c.messages.push({ id: uid('m'), from: me().id, text: b.msg, at: Date.now(), read: false }); }
  managersOf(p).forEach(m => notify(m, 'booking', 'Nouvelle demande de réservation', fullName(me()) + ' souhaite louer « ' + p.title + ' » du ' + fmtDateShort(bk.start) + ' au ' + fmtDateShort(bk.end) + '.', { s: 'ownerRequests' }));
  commit(); M.bookDraft = null; mReplace('bookingDone', { id: bk.id });
};
function createBooking(p, b, q, status) {
  const bk = { id: uid('b'), propertyId: p.id, tenantId: me().id, start: b.start, end: unitEnd(b.start, b.unitType, b.units), units: b.units, unitType: b.unitType, guests: b.guests, status, mode: p.bookingMode, created: Date.now(), quote: q, amount: q.dueNow, promo: q.promo, history: [{ at: Date.now(), status: 'attente', by: me().id, note: 'Demande créée' }], payment: null, message: b.msg };
  if (q.promo) { const pr = S.promotions.find(x => x.code === q.promo); if (pr) pr.used++; }
  S.bookings.unshift(bk); return bk;
}

/* Paiement simulé */
const PAY_METHODS = [['tmoney', 'T-Money', '#E30613', 'Togocom'], ['flooz', 'Flooz', '#0066B3', 'Moov Africa'], ['momo', 'MTN MoMo', '#FFCC00', 'Bénin'], ['card', 'Carte bancaire', '#1E293B', 'Visa / Mastercard']];
SCR.pay = (pp) => {
  let p, q, label;
  if (pp.draft) { const b = M.bookDraft; if (!b) return hdr('Paiement') + '<div class="body">' + empty('wallet', 'Rien à payer') + '</div>'; p = prop(b.pid); q = quote(p, b.unitType, b.units, b.promo); label = fmtDate(b.start) + ' → ' + fmtDate(unitEnd(b.start, b.unitType, b.units)); }
  else { const bk = booking(pp.id); p = prop(bk.propertyId); q = bk.quote || quote(p, bk.unitType || p.period, bk.units, bk.promo); label = fmtDate(bk.start) + ' → ' + fmtDate(bk.end); }
  const m = M.payMethod || 'tmoney';
  return hdr('Paiement sécurisé', { sub: 'Montant : ' + money(q.dueNow) }) + `<div class="body pad" data-scroll="main">
  <div class="steps-lbl"><span class="done">1. Période</span><span class="on">2. Paiement</span><span>3. Confirmation</span></div>
  ${pmini(p, '<small>' + label + '</small>')}
  <h4>Moyen de paiement</h4><div class="pay-methods">${PAY_METHODS.map(([k, l, c, s]) => `<button class="${m === k ? 'on' : ''}" data-act="payMethod" data-m="${k}"><i style="background:${c}">${l[0]}</i><b>${l}</b><small>${s}</small></button>`).join('')}</div>
  <form data-submit="payNow" class="form" id="pay-form">
  ${m === 'card' ? `<label class="field"><span>Numéro de carte</span><input class="inp" id="cc" name="cc" inputmode="numeric" placeholder="4242 4242 4242 4242" value="4242 4242 4242 4242" required></label><div class="grid2"><label class="field"><span>Expiration</span><input class="inp" name="exp" placeholder="MM/AA" value="12/28" required></label><label class="field"><span>CVV</span><input class="inp" name="cvv" placeholder="123" value="123" maxlength="4" required></label></div>`
      : `<label class="field"><span>Numéro ${PAY_METHODS.find(x => x[0] === m)[1]}</span><div class="inp-pre"><b>+228</b><input class="inp" id="momo" name="phone" inputmode="tel" value="${esc(me().phone.replace(/^\+\d+\s/, ''))}" required></div><small class="muted">Astuce démo : un numéro se terminant par 0000 simule un paiement refusé.</small></label>`}
  ${quoteHTML(q, p)}
  <p class="hint">${ic('lock')} Paiement simulé. En production : agrégateur agréé (ex. CinetPay / PayDunya), fonds sécurisés jusqu'à l'entrée dans les lieux.</p>
  <button class="btn pri block">Payer ${money(q.dueNow)}</button></form><div class="foot-space"></div></div>`;
};
ACT.payMethod = d => { M.payMethod = d.m; mRender(false); };
ACT.payNow = o => {
  const ppStart = cur().p;
  const fail =(o.phone || '').replace(/\D/g, '').endsWith('0000');
  const method = PAY_METHODS.find(x => x[0] === (M.payMethod || 'tmoney'))[1];
  const steps = method === 'Carte bancaire' ? ['Connexion sécurisée 3-D Secure…', 'Authentification de la carte…', fail ? 'Paiement refusé' : 'Paiement accepté'] : ['Connexion à l\'opérateur ' + method + '…', 'Confirmez le paiement sur votre téléphone (code USSD envoyé)…', fail ? 'Paiement refusé par l\'opérateur' : 'Paiement accepté'];
  openSheet(`<div class="pay-proc"><div class="spinner lg" id="pp-spin"></div><b id="pp-txt">${steps[0]}</b><div class="pp-steps">${steps.map((s, i) => `<span id="pps${i}">${s}</span>`).join('')}</div></div>`, { title: 'Traitement du paiement' });
  steps.forEach((s, i) => setTimeout(() => { const t = $('#pp-txt'); if (t) t.textContent = s; const e = $('#pps' + i); if (e) e.classList.add('on'); }, i * 1100));
  setTimeout(() => {
    if (fail) { closeSheet(); toast('Paiement refusé : solde insuffisant ou opération annulée', 'err'); return; }
    const pp = ppStart; if (pp.draft && !M.bookDraft) { closeSheet(); return; } const ref = ({ 'T-Money': 'TM-', 'Flooz': 'FL-', 'MTN MoMo': 'MM-', 'Carte bancaire': 'CB-' }[method] || 'PAY-') + Math.floor(10000 + Math.random() * 89999);
    let bk;
    if (pp.draft) {
      const b = M.bookDraft; const p = prop(b.pid); const end = unitEnd(b.start, b.unitType, b.units);
      if (conflicts(p.id, b.start, end).length) { closeSheet(); toast('Ces dates viennent d\'être réservées. Choisissez une autre période.', 'err'); return; }
      bk = createBooking(p, b, quote(p, b.unitType, b.units, b.promo), 'attente');
      M.bookDraft = null;
    } else bk = booking(pp.id);
    bk.payment = { method, ref, status: 'paye', at: Date.now(), amount: bk.amount || bk.quote?.dueNow };
    setBookingStatus(bk, 'confirmee', me().id, 'Paiement ' + method + ' reçu (' + ref + ')');
    const p = prop(bk.propertyId);
    // Refus automatique des demandes concurrentes sur la même période
    S.bookings.filter(x => x.id !== bk.id && x.propertyId === p.id && x.status === 'attente' && overlaps(bk.start, bk.end, x.start, x.end)).forEach(x => { setBookingStatus(x, 'refusee', 'system', 'Période réservée par un autre locataire'); notify(x.tenantId, 'booking', 'Demande refusée', 'La période demandée pour « ' + p.title + ' » n\'est plus disponible.', { s: 'bookingDetail', p: { id: x.id } }); });
    managersOf(p).forEach(m => notify(m, 'booking', 'Réservation confirmée', fullName(me()) + ' a payé ' + money(bk.payment.amount) + ' pour « ' + p.title + ' ».', { s: 'ownerRequests' }));
    notify(me().id, 'booking', 'Réservation confirmée', 'Votre réservation « ' + p.title + ' » est confirmée. Reçu ' + ref + ' disponible.', { s: 'bookingDetail', p: { id: bk.id } });
    commit(); closeSheet(); mReplace('bookingDone', { id: bk.id });
  }, steps.length * 1100 + 300);
};
SCR.bookingDone = ({ id }) => {
  const b = booking(id); const p = prop(b.propertyId); const conf = b.status === 'confirmee';
  return `<div class="body pad center-col done-scr" data-scroll="main"><div class="done-ic ${conf ? 'ok' : 'wait'}">${ic(conf ? 'check' : 'clock')}</div>
  <h2 class="h-lg">${conf ? 'Réservation confirmée !' : 'Demande envoyée'}</h2>
  <p class="muted">${conf ? 'Votre paiement a été reçu. L\'adresse exacte et le contact du propriétaire sont maintenant disponibles.' : 'Le propriétaire a été notifié. Vous recevrez une notification dès qu\'il aura accepté ou refusé votre demande.'}</p>
  ${pmini(p, '<small>' + fmtDate(b.start) + ' → ' + fmtDate(b.end) + '</small>')}
  <div class="kv left">${conf ? `<div><span>Référence paiement</span><b>${b.payment.ref}</b></div><div><span>Montant payé</span><b>${money(b.payment.amount)}</b></div><div class="full"><span>Adresse</span><b>${esc(p.address)}</b></div>` : `<div><span>Statut</span>${tag(BOOKING_STATUS[b.status])}</div><div><span>Réponse attendue</span><b>sous 24 h</b></div>`}</div>
  <div class="stack-btns"><button class="btn pri block" data-act="goBooking" data-id="${b.id}">Voir ma réservation</button>${conf ? `<button class="btn sec block" data-act="mGo" data-s="receipt" data-id="${b.id}">${ic('receipt')} Voir le reçu</button>` : ''}<button class="btn ghost block" data-act="mTab" data-s="home">Retour à l'accueil</button></div></div>`;
};
ACT.goBooking = d => { M.stack = [{ s: 'myBookings', p: {} }, { s: 'bookingDetail', p: { id: d.id } }]; mRender(false); };

/* Mes réservations */
const BK_TABS = { avenir: ['attente', 'acceptee', 'confirmee'], encours: ['encours'], passees: ['terminee', 'litige'], annulees: ['annulee', 'refusee'] };
SCR.myBookings = () => {
  const u = me(); const t = M.bkTab || 'avenir'; const all = S.bookings.filter(b => b.tenantId === u.id);
  const list = all.filter(b => BK_TABS[t].includes(b.status)).sort((a, b) => a.start.localeCompare(b.start));
  return hdr('Mes réservations') + `<div class="tabs-line">${[['avenir', 'À venir'], ['encours', 'En cours'], ['passees', 'Passées'], ['annulees', 'Annulées']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="bkTab" data-t="${k}">${l}<i>${all.filter(b => BK_TABS[k].includes(b.status)).length}</i></button>`).join('')}</div>
  <div class="body pad" data-scroll="main">${list.map(b => bookingCard(b)).join('') || empty('cal', 'Aucune réservation', 'Vos réservations apparaîtront ici.', '<button class="btn pri" data-act="mTab" data-s="search">Rechercher un logement</button>')}</div>`;
};
ACT.bkTab = d => { M.bkTab = d.t; mRender(true); };
function bookingCard(b, ownerView) {
  const p = prop(b.propertyId); const t = user(b.tenantId);
  const hint = b.status === 'acceptee' && !ownerView ? '<span class="tag amber">💳 Paiement requis</span>' : b.status === 'terminee' && !ownerView && !S.reviews.some(r => r.bookingId === b.id) ? '<span class="tag blue">★ Donnez votre avis</span>' : '';
  return `<div class="bk-card" data-act="mGo" data-s="${ownerView ? 'ownerBooking' : 'bookingDetail'}" data-id="${b.id}"><div class="thumb" style="background-image:url('${propCover(p)}')"></div>
  <div class="bk-info"><div class="row-between">${tag(BOOKING_STATUS[b.status])}<small class="muted">#${b.id.slice(-5).toUpperCase()}</small></div><b>${esc(p.title)}</b>
  <small>${ic('cal')} ${fmtDateShort(b.start)} → ${fmtDate(b.end)} · ${b.units} ${b.unitType || p.period}</small>${ownerView ? `<small>${ic('user')} ${esc(fullName(t))}</small>` : ''}${hint}</div></div>`;
}
SCR.bookingDetail = ({ id }) => {
  const b = booking(id); if (!b) return hdr('Réservation') + '<div class="body">' + empty('alert', 'Réservation introuvable') + '</div>';
  const p = prop(b.propertyId); const q = b.quote || quote(p, b.unitType || p.period, b.units, b.promo); const reviewed = S.reviews.find(r => r.bookingId === b.id);
  const dispute = S.disputes.find(x => x.bookingId === b.id); const o = ownerLabel(p);
  const expl = { attente: 'Votre demande est en cours d\'examen par ' + (o.agency ? 'l\'agence' : 'le propriétaire') + '.', acceptee: 'Bonne nouvelle ! Votre demande est acceptée. Payez pour confirmer la réservation.', confirmee: 'Réservation confirmée et payée. Rendez-vous le ' + fmtDate(b.start) + '.', encours: 'Location en cours. Bon séjour !', terminee: 'Location terminée.', annulee: 'Réservation annulée' + (b.cancelReason ? ' : ' + b.cancelReason : '.'), refusee: 'Demande refusée' + (b.refuseReason ? ' : ' + b.refuseReason : '.'), litige: 'Un litige est en cours de traitement par l\'équipe DomiLoc.' }[b.status];
  const A = [];
  if (b.status === 'attente') A.push(`<button class="btn sec" data-act="bkEdit" data-id="${b.id}">${ic('edit')} Modifier</button>`, `<button class="btn danger-o" data-act="bkCancel" data-id="${b.id}">Annuler la demande</button>`);
  if (b.status === 'acceptee') A.push(`<button class="btn pri block" data-act="mGo" data-s="pay" data-id="${b.id}">💳 Payer ${money(q.dueNow)}</button>`, `<button class="btn danger-o" data-act="bkCancel" data-id="${b.id}">Annuler</button>`);
  if (b.status === 'confirmee') A.push(`<button class="btn sec" data-act="mGo" data-s="receipt" data-id="${b.id}">${ic('receipt')} Reçu</button>`, `<button class="btn danger-o" data-act="bkCancel" data-id="${b.id}">Annuler</button>`, `<button class="btn ghost sm demo" data-act="simStart" data-id="${b.id}">⏩ Démo : simuler le début</button>`);
  if (b.status === 'encours') A.push(`<button class="btn sec" data-act="bkExtend" data-id="${b.id}">${ic('plus')} Prolonger</button>`, `<button class="btn sec" data-act="mGo" data-s="receipt" data-id="${b.id}">${ic('receipt')} Reçu</button>`, `<button class="btn ghost sm demo" data-act="simEnd" data-id="${b.id}">⏩ Démo : simuler la fin</button>`);
  if (b.status === 'terminee') { if (!reviewed) A.push(`<button class="btn pri block" data-act="mGo" data-s="review" data-id="${b.id}">★ Laisser un avis</button>`); A.push(`<button class="btn sec" data-act="mGo" data-s="receipt" data-id="${b.id}">${ic('receipt')} Reçu</button>`); if (!dispute) A.push(`<button class="btn danger-o" data-act="mGo" data-s="disputeNew" data-id="${b.id}">${ic('gavel')} Ouvrir un litige</button>`); }
  if (dispute) A.push(`<button class="btn sec block" data-act="mGo" data-s="disputeDetail" data-id="${dispute.id}">${ic('gavel')} Voir le litige</button>`);
  return hdr('Réservation #' + b.id.slice(-5).toUpperCase()) + `<div class="body pad" data-scroll="main">
  <div class="status-box ${BOOKING_STATUS[b.status].color}">${tag(BOOKING_STATUS[b.status])}<p>${expl}</p></div>
  ${pmini(p)}
  <div class="dates-box"><div><small>Début</small><b>${fmtDate(b.start)}</b></div>${ic('next')}<div><small>Fin</small><b>${fmtDate(b.end)}</b></div></div>
  <div class="btn-wrap">${A.join('')}</div>
  <section class="d-sec"><h3>${o.agency ? 'Agence' : 'Propriétaire'}</h3><div class="owner-card">${avatar(user(o.userId))}<div><b>${esc(o.name)}</b><small>${['confirmee', 'encours', 'terminee', 'litige'].includes(b.status) ? esc(user(o.userId).phone) + ' · ' + esc(p.address) : 'Coordonnées communiquées après confirmation'}</small></div><button class="btn sm sec" data-act="contactBk" data-id="${b.id}">${ic('chat')}</button></div></section>
  <section class="d-sec"><h3>Montant</h3>${quoteHTML(q, p)}${b.payment ? `<p class="small">${ic('check')} Payé par ${b.payment.method} le ${fmtDT(b.payment.at)} · réf. ${b.payment.ref}</p>` : ''}</section>
  <section class="d-sec"><h3>Historique</h3><div class="tl">${b.history.slice().reverse().map(h => `<div><i class="${BOOKING_STATUS[h.status]?.color || 'gray'}"></i><b>${esc(h.note)}</b><small>${fmtDT(h.at)} · ${h.by === 'system' ? 'Système' : esc(fullName(user(h.by)))}</small></div>`).join('')}</div></section>
  ${reviewed ? `<section class="d-sec"><h3>Votre avis</h3>${reviewHTML(reviewed, false)}</section>` : ''}
  <div class="foot-space"></div></div>`;
};
ACT.contactBk = d => { const b = booking(d.id); const p = prop(b.propertyId); const c = convWith(contactUserId(p), p.id, b.id); commit(); mGo('chat', { id: c.id }); };
ACT.bkEdit = d => { const b = booking(d.id); M.bookDraft = { pid: b.propertyId, unitType: b.unitType || prop(b.propertyId).period, units: b.units, start: b.start, guests: b.guests || 1, promo: b.promo || '', msg: '', editId: b.id }; M.calMonth.bk = b.start.slice(0, 8) + '01'; mGo('book'); };
ACT.bkCancel = d => {
  const b = booking(d.id); const p = prop(b.propertyId); const late = b.status === 'confirmee' && daysBetween(todayISO(), b.start) < (p.bookingMode === 'instant' ? 2 : 7);
  openSheet(`<form data-submit="bkCancelOk" class="form"><input type="hidden" name="id" value="${b.id}"><p class="muted">${esc(p.cancelPolicy)}</p>
  ${b.payment ? `<div class="alert ${late ? 'amber' : 'green'}">${late ? 'Annulation tardive : 50 % du loyer est retenu. Remboursement estimé : ' + money((b.payment.amount || 0) - Math.round((b.quote?.rent || 0) * .5)) : 'Remboursement intégral : ' + money(b.payment.amount)}</div>` : ''}
  <label class="field"><span>Motif</span><select class="inp" name="reason"><option>Changement de programme</option><option>J'ai trouvé un autre logement</option><option>Problème de budget</option><option>Autre</option></select></label>
  <button class="btn danger block">Confirmer l'annulation</button></form>`, { title: 'Annuler la réservation' });
};
ACT.bkCancelOk = o => {
  const b = booking(o.id); const p = prop(b.propertyId); b.cancelReason = o.reason;
  setBookingStatus(b, 'annulee', me().id, 'Annulée par le locataire : ' + o.reason);
  if (b.payment) b.payment.status = 'rembourse';
  managersOf(p).forEach(m => notify(m, 'booking', 'Réservation annulée', fullName(me()) + ' a annulé sa réservation pour « ' + p.title + ' ».', { s: 'ownerRequests' }));
  commit(); closeSheet(); toast('Réservation annulée');
};
ACT.simStart = d => { const b = booking(d.id); const len = daysBetween(b.start, b.end); b.start = addDays(todayISO(), -1); b.end = addDays(b.start, len); setBookingStatus(b, 'encours', 'system', 'Début de la location (simulé)'); notify(b.tenantId, 'reminder', 'Bienvenue !', 'Votre location « ' + prop(b.propertyId).title + ' » commence aujourd\'hui.', { s: 'bookingDetail', p: { id: b.id } }); commit(); };
ACT.simEnd = d => { const b = booking(d.id); b.end = todayISO(); setBookingStatus(b, 'terminee', 'system', 'Fin de la location (simulée)'); notify(b.tenantId, 'booking', 'Location terminée', 'Donnez votre avis sur « ' + prop(b.propertyId).title + ' ».', { s: 'review', p: { id: b.id } }); commit(); };
ACT.bkExtend = d => {
  const b = booking(d.id); const p = prop(b.propertyId); const ut = b.unitType || p.period;
  const newEnd = unitEnd(b.end, ut, 1); const cf = conflicts(p.id, b.end, newEnd, b.id);
  if (cf.length) { toast('Prolongation impossible : logement réservé à partir du ' + fmtDate(cf[0].start), 'err'); return; }
  confirmSheet('Prolonger la location', `Prolonger d'1 ${ut} jusqu'au <b>${fmtDate(newEnd)}</b> pour <b>${money(unitPrice(p, ut))}</b> ?`, 'Prolonger et payer', () => {
    b.end = newEnd; b.units++; setBookingStatus(b, 'encours', me().id, 'Prolongation jusqu\'au ' + fmtDate(newEnd) + ' (+' + money(unitPrice(p, ut)) + ')');
    managersOf(p).forEach(m => notify(m, 'booking', 'Prolongation', fullName(me()) + ' a prolongé sa location de « ' + p.title + ' ».', { s: 'ownerRequests' }));
    commit(); toast('Location prolongée');
  });
};

SCR.receipt = ({ id }) => {
  const b = booking(id); const p = prop(b.propertyId); const t = user(b.tenantId); const q = b.quote || quote(p, b.unitType || p.period, b.units, b.promo); const o = ownerLabel(p);
  return hdr('Reçu de paiement', { actions: `<button class="hdr-btn" data-act="dlReceipt">${ic('upload')}</button>` }) + `<div class="body pad" data-scroll="main"><div class="receipt">
  <div class="rc-h">${logoHTML()}<div><b>REÇU N° R-${b.id.slice(-6).toUpperCase()}</b><small>${b.payment ? fmtDT(b.payment.at) : '—'}</small></div></div>
  <div class="rc-grid"><div><small>Locataire</small><b>${esc(fullName(t))}</b><span>${esc(t.phone)}</span></div><div><small>Bailleur</small><b>${esc(o.name)}</b><span>${esc(p.city)}</span></div></div>
  <div class="rc-line"><small>Logement</small><b>${esc(p.title)}</b><span>${esc(p.address)}</span></div>
  <div class="rc-line"><small>Période</small><b>${fmtDate(b.start)} → ${fmtDate(b.end)}</b></div>
  ${quoteHTML(q, p)}
  <div class="rc-line"><small>Paiement</small><b>${b.payment ? b.payment.method + ' · ' + b.payment.ref + ' · ' + (b.payment.status === 'rembourse' ? 'Remboursé' : 'Payé') : 'Non payé'}</b></div>
  <div class="rc-qr">${Array.from({ length: 49 }, (_, i) => `<i class="${(i * 7 + b.id.charCodeAt(i % b.id.length)) % 3 ? 'on' : ''}"></i>`).join('')}</div><p class="center small muted">Document généré par DomiLoc — vérifiable via le QR code.</p></div>
  <button class="btn pri block" data-act="dlReceipt">${ic('upload')} Télécharger en PDF</button><button class="btn sec block" data-act="share" data-id="${p.id}">${ic('share')} Partager</button></div>`;
};
ACT.dlReceipt = () => toast('Reçu PDF généré (simulation)');

/* Avis */
SCR.review = ({ id }) => {
  const b = booking(id); const p = prop(b.propertyId); const sc = M.revScores || (M.revScores = { etat: 0, conformite: 0, proprete: 0, communication: 0, prix: 0 });
  return hdr('Évaluer votre location') + `<div class="body pad" data-scroll="main">${pmini(p, '<small>' + fmtDate(b.start) + ' → ' + fmtDate(b.end) + '</small>')}
  <form data-submit="reviewOk" class="form"><input type="hidden" name="id" value="${b.id}">
  ${Object.entries(REVIEW_KEYS).map(([k, l]) => `<div class="rate-row"><span>${l}</span><div class="rate">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="${sc[k] >= i ? 'on' : ''}" data-act="rate" data-k="${k}" data-v="${i}">★</button>`).join('')}</div></div>`).join('')}
  <label class="field"><span>Votre commentaire</span><textarea class="inp" id="rv-txt" name="comment" rows="4" required minlength="10" placeholder="Partagez votre expérience : état du logement, accueil, quartier…"></textarea></label>
  <p class="hint">${ic('info')} Votre avis sera public et lié à votre réservation vérifiée. Il peut être modéré s'il ne respecte pas la charte.</p>
  <button class="btn pri block">Publier mon avis</button></form></div>`;
};
ACT.rate = d => { M.revScores[d.k] = +d.v; mRender(true); };
ACT.reviewOk = o => {
  const sc = M.revScores; if (Object.values(sc).some(v => !v)) { toast('Notez les 5 critères', 'err'); return; }
  const b = booking(o.id); const p = prop(b.propertyId);
  S.reviews.unshift({ id: uid('r'), bookingId: b.id, propertyId: p.id, authorId: me().id, scores: Object.assign({}, sc), comment: o.comment, reply: null, status: 'publie', reported: false, at: Date.now() });
  managersOf(p).forEach(m => notify(m, 'listing', 'Nouvel avis', fullName(me()) + ' a publié un avis sur « ' + p.title + ' ».', { s: 'property', p: { id: p.id } }));
  M.revScores = null; commit(); mReplace('bookingDetail', { id: b.id }); toast('Merci ! Votre avis est publié.');
};

/* Litiges */
SCR.disputeNew = ({ id }) => {
  const b = booking(id); const p = prop(b.propertyId);
  return hdr('Ouvrir un litige') + `<div class="body pad" data-scroll="main">${pmini(p)}<form data-submit="disputeOk" class="form"><input type="hidden" name="id" value="${b.id}">
  <label class="field"><span>Objet</span><select class="inp" name="subject"><option>Caution non restituée</option><option>Logement non conforme à l'annonce</option><option>Problème de paiement</option><option>Dégradations contestées</option><option>Autre</option></select></label>
  <label class="field"><span>Description détaillée</span><textarea class="inp" name="desc" rows="5" required minlength="20"></textarea></label>
  <label class="field"><span>Pièces justificatives (photos, reçus, PDF)</span><input class="inp" type="file" name="files" multiple accept="image/*,.pdf" data-chg="filesPicked"><div id="files-list" class="chips-row wrap"></div></label>
  <p class="hint">L'équipe DomiLoc examinera le dossier, entendra les deux parties et rendra une décision sous 72 h ouvrées.</p>
  <button class="btn danger block">${ic('gavel')} Soumettre le litige</button></form></div>`;
};
ACT.filesPicked = (d, el) => { const l = $('#files-list'); if (l) l.innerHTML = [...el.files].map(f => `<span class="chip sm">${ic('file')} ${esc(f.name)} · ${fmtBytes(f.size)}</span>`).join(''); };
ACT.disputeOk = (o, form) => {
  const b = booking(o.id); const files = [...(form.querySelector('[name=files]').files || [])].map(f => f.name);
  const dsp = { id: uid('d'), bookingId: b.id, openedBy: me().id, subject: o.subject, desc: o.desc, files, status: 'ouvert', at: Date.now(), history: [{ at: Date.now(), by: me().id, text: 'Ouverture du litige : ' + o.subject }], decision: null };
  S.disputes.unshift(dsp); setBookingStatus(b, 'litige', me().id, 'Litige ouvert : ' + o.subject);
  managersOf(prop(b.propertyId)).forEach(m => notify(m, 'booking', 'Litige ouvert', fullName(me()) + ' a ouvert un litige : ' + o.subject, { s: 'disputeDetail', p: { id: dsp.id } }));
  commit(); mReplace('disputeDetail', { id: dsp.id }); toast('Litige transmis à DomiLoc');
};
SCR.disputeDetail = ({ id }) => {
  const d = S.disputes.find(x => x.id === id); const b = booking(d.bookingId); const p = prop(b.propertyId);
  return hdr('Litige · ' + esc(d.subject)) + `<div class="body pad" data-scroll="main"><div class="status-box ${d.status === 'ouvert' ? 'amber' : 'green'}"><span class="tag ${d.status === 'ouvert' ? 'amber' : 'green'}">${d.status === 'ouvert' ? 'En cours d\'examen' : 'Clôturé'}</span><p>${d.decision ? '<b>Décision :</b> ' + esc(d.decision) : 'Un médiateur DomiLoc examine le dossier.'}</p></div>
  ${pmini(p)}<p>${esc(d.desc)}</p><div class="chips-row wrap">${d.files.map(f => `<span class="chip sm">${ic('file')} ${esc(f)}</span>`).join('')}</div>
  <section class="d-sec"><h3>Historique</h3><div class="tl">${d.history.map(h => `<div><i class="${h.by === 'admin' ? 'blue' : 'gray'}"></i><b>${esc(h.text)}</b><small>${fmtDT(h.at)} · ${h.by === 'admin' ? 'Médiation DomiLoc' : esc(fullName(user(h.by)))}</small></div>`).join('')}</div></section>
  ${d.status === 'ouvert' ? `<form data-submit="disputeMsg" class="form"><input type="hidden" name="id" value="${d.id}"><textarea class="inp" name="text" rows="2" placeholder="Ajouter un élément au dossier…" required></textarea><button class="btn sec block">Ajouter</button></form>` : ''}</div>`;
};
ACT.disputeMsg = o => { const d = S.disputes.find(x => x.id === o.id); d.history.push({ at: Date.now(), by: me().id, text: o.text }); commit(); };

/* ---------------- Favoris & comparaison ---------------- */
SCR.favorites = () => {
  const u = me(); const favs = favsOf(u.id).map(prop).filter(Boolean); const sel = M.compareSel;
  return rootHdr('Favoris', favs.length + ' logement' + (favs.length > 1 ? 's' : '')) + `<div class="body pad" data-scroll="main">
  ${favs.length ? `<div class="row-between"><p class="muted small">Sélectionnez jusqu'à 3 logements à comparer.</p><button class="btn sm ${M.favCompare ? 'pri' : 'sec'}" data-act="favCompareMode">${ic('compare')} ${M.favCompare ? 'Terminer' : 'Comparer'}</button></div>` : ''}
  <div class="results">${favs.map(p => `<div class="fav-row ${M.favCompare ? 'cmp' : ''}">${M.favCompare ? `<label class="cmp-check"><input type="checkbox" data-chg="cmpToggle" data-id="${p.id}" ${sel.includes(p.id) ? 'checked' : ''} ${!sel.includes(p.id) && sel.length >= 3 ? 'disabled' : ''}><span></span></label>` : ''}${pcard(p, 'wide')}${p.status !== 'publiee' ? '<div class="unavail">Plus disponible</div>' : ''}</div>`).join('') || empty('heart', 'Aucun favori', 'Touchez le cœur sur une annonce pour la retrouver ici.', '<button class="btn pri" data-act="mTab" data-s="search">Explorer les logements</button>')}</div>
  <div class="foot-space"></div></div>${M.favCompare && sel.length >= 2 ? `<div class="fab-bar"><button class="btn pri block" data-act="mGo" data-s="compare">${ic('compare')} Comparer ${sel.length} logements</button></div>` : ''}`;
};
ACT.favCompareMode = () => { M.favCompare = !M.favCompare; mRender(true); };
ACT.cmpToggle = (d, el) => { const s = M.compareSel; if (el.checked) { if (s.length < 3) s.push(d.id); } else s.splice(s.indexOf(d.id), 1); mRender(true); };
SCR.compare = () => {
  const ps = M.compareSel.map(prop).filter(Boolean);
  if (ps.length < 2) return hdr('Comparer') + `<div class="body pad">${empty('compare', 'Sélectionnez 2 ou 3 logements', 'Depuis vos favoris, activez « Comparer » et cochez les logements.', '<button class="btn pri" data-act="goFavCompare">Aller aux favoris</button>')}</div>`;
  const best = (fn, dir) => { const vals = ps.map(fn); const t = dir > 0 ? Math.max(...vals) : Math.min(...vals); return ps.map(p => fn(p) === t); };
  const bp = best(p => p.price / PER_DAY[p.period], -1), ba = best(p => p.area, 1), bb = best(p => p.bedrooms, 1), br = best(p => ratingOf(p.id).avg, 1);
  const nextFree = p => { const f = firstFree(p.id, 'nuit', 1); return f <= addDays(todayISO(), 1) ? 'Immédiate' : fmtDate(f); };
  const allEq = [...new Set(ps.flatMap(p => p.equipments))];
  const row = (l, fn, b) => `<tr><th>${l}</th>${ps.map((p, i) => `<td class="${b && b[i] ? 'best' : ''}">${fn(p)}</td>`).join('')}</tr>`;
  return hdr('Comparaison') + `<div class="body" data-scroll="main"><div class="cmp-wrap"><table class="cmp"><thead><tr><th></th>${ps.map(p => `<th><div class="thumb" style="background-image:url('${propCover(p)}')" data-act="mGo" data-s="property" data-id="${p.id}"></div><b>${esc(p.title)}</b></th>`).join('')}</tr></thead><tbody>
  ${row('Prix', p => money(p.price) + '<small>/' + p.period + '</small>', bp)}${row('Localisation', p => esc(p.quartier) + ', ' + esc(p.city))}${row('Superficie', p => p.area + ' m²', ba)}${row('Chambres', p => p.bedrooms, bb)}${row('Salles de bain', p => p.bathrooms)}
  ${row('Meublé', p => p.furnished ? '✓' : '—')}${row('Note', p => ratingOf(p.id).count ? '★ ' + ratingOf(p.id).avg.toFixed(1) : '—', br)}${row('Disponibilité', nextFree)}${row('Caution', p => money(p.deposit))}${row('Avance', p => p.advance ? money(p.advance) : '—')}${row('Réservation', p => p.bookingMode === 'instant' ? '⚡ Instantanée' : 'Sur validation')}${row('Visite virtuelle', p => hasPublishedTour(p) ? '✓ ' + tourOf(p).type.toUpperCase() : '—')}
  <tr class="sep"><th colspan="${ps.length + 1}">Équipements</th></tr>${allEq.map(e => row(equipment(e).icon + ' ' + equipment(e).name, p => p.equipments.includes(e) ? '<span class="ok-txt">✓</span>' : '<span class="muted">—</span>')).join('')}
  </tbody></table></div><p class="hint pad">Les meilleures valeurs sont surlignées. Faites défiler horizontalement sur petit écran.</p></div>`;
};
ACT.goFavCompare = () => { M.favCompare = true; mTab('favorites'); };

/* ---------------- Messagerie ---------------- */
SCR.messages = () => {
  const u = me(); const convs = S.conversations.filter(c => c.participants.includes(u.id) && (c.messages.length || c.id === M.lastConv)).sort((a, b) => (b.messages.at(-1)?.at || 0) - (a.messages.at(-1)?.at || 0));
  const qv = M.msgQ || '';
  const list = convs.filter(c => { if (!qv) return true; const o = user(c.participants.find(x => x !== u.id)); return norm(fullName(o) + ' ' + (prop(c.propertyId)?.title || '')).includes(norm(qv)); });
  return (S.session.space === 'locataire' ? rootHdr('Messages') : hdr('Messages', { back: false, actions: topActions() })) + `<div class="body" data-scroll="main"><div class="pad-x"><div class="search-box light">${ic('search')}<input class="inp" id="msg-q" placeholder="Rechercher une conversation" value="${esc(qv)}" data-inp="msgQ"></div></div>
  <div class="conv-list">${list.map(c => {
    const o = user(c.participants.find(x => x !== u.id)); const last = c.messages.at(-1); const unread = c.messages.filter(m => m.from !== u.id && !m.read).length; const p = prop(c.propertyId);
    return `<button class="conv ${unread ? 'unread' : ''}" data-act="mGo" data-s="chat" data-id="${c.id}">${avatar(o)}<div class="cv-main"><div class="row-between"><b>${esc(fullName(o))}</b><small>${last ? timeAgo(last.at) : ''}</small></div><small class="cv-prop">${p ? '🏠 ' + esc(p.title) : ''}</small><span>${last ? (last.from === u.id ? 'Vous : ' : '') + esc(last.text || (last.img ? '📷 Photo' : '📎 Document')) : 'Nouvelle conversation'}</span></div>${unread ? '<i class="badge">' + unread + '</i>' : ''}${c.blockedBy ? '<span class="tag red">Bloqué</span>' : ''}</button>`;
  }).join('') || empty('chat', 'Aucune conversation', 'Contactez un propriétaire depuis une annonce.')}</div></div>`;
};
ACT.msgQ = (d, el) => { M.msgQ = el.value; mRender(true); };
SCR.chat = ({ id }) => {
  const u = me(); const c = S.conversations.find(x => x.id === id); if (!c) return hdr('Conversation') + '<div class="body">' + empty('chat', 'Conversation introuvable') + '</div>';
  const o = user(c.participants.find(x => x !== u.id)); const p = prop(c.propertyId); const b = c.bookingId ? booking(c.bookingId) : null;
  let lastDay = '';
  const msgs = c.messages.map(m => {
    const day = new Date(m.at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); const sep = day !== lastDay ? `<div class="day-sep">${day}</div>` : ''; lastDay = day;
    return sep + `<div class="msg ${m.from === u.id ? 'me' : 'them'}">${m.img ? `<img src="${m.img.src || scene(m.img.kind, m.img.hue)}" alt="Photo">` : ''}${m.doc ? `<div class="doc">${ic('doc')}<div><b>${esc(m.doc.name)}</b><small>${m.doc.size}</small></div></div>` : ''}${m.text ? '<p>' + esc(m.text) + '</p>' : ''}<small>${fmtTime(m.at)} ${m.from === u.id ? `<span class="read ${m.read ? 'on' : ''}">${m.read ? '✓✓' : '✓'}</span>` : ''}</small></div>`;
  }).join('');
  const blocked = c.blockedBy;
  return hdr(`<span class="chat-h">${avatar(o, 'sm')}<span><b>${esc(fullName(o))}</b><small>${M.typing === c.id ? '<em class="typing">écrit…</em>' : (o.agencyId ? esc(agency(o.agencyId).name) : 'En ligne il y a 5 min')}</small></span></span>`, { actions: `<button class="hdr-btn" data-act="chatMenu" data-id="${c.id}">${ic('gear')}</button>` }) +
    `${p ? `<div class="chat-ctx" data-act="mGo" data-s="property" data-id="${p.id}"><div class="thumb" style="background-image:url('${propCover(p)}')"></div><div><b>${esc(p.title)}</b><small>${money(p.price)}/${p.period}${b ? ' · Réservation ' + BOOKING_STATUS[b.status].label.toLowerCase() : ''}</small></div>${ic('next')}</div>` : ''}
  <div class="body chat" id="chat-body">${msgs || '<p class="center muted small">Démarrez la conversation. Restez courtois et ne payez jamais hors de la plateforme.</p>'}${M.typing === c.id ? '<div class="msg them typing-b"><i></i><i></i><i></i></div>' : ''}</div>
  ${blocked ? `<div class="chat-blocked">${ic('ban')} ${blocked === u.id ? 'Vous avez bloqué cet utilisateur.' : 'Vous ne pouvez plus répondre à cette conversation.'} ${blocked === u.id ? '<button class="link" data-act="chatBlock" data-id="' + c.id + '">Débloquer</button>' : ''}</div>`
      : `<form class="chat-input" data-submit="chatSend"><input type="hidden" name="id" value="${c.id}"><button type="button" class="hdr-btn" data-act="chatAttach" data-id="${c.id}">${ic('plus')}</button><input class="inp" id="chat-in" name="text" placeholder="Votre message…" autocomplete="off" data-nokeep><button class="send">${ic('send')}</button></form>`}`;
};
MOUNT.chat = ({ id }, soft) => {
  const b = $('#chat-body'); if (b) b.scrollTop = b.scrollHeight;
  const u = me(); const c = S.conversations.find(x => x.id === id);
  if (c && c.messages.some(m => m.from !== u.id && !m.read)) { c.messages.forEach(m => { if (m.from !== u.id) m.read = true; }); S.notifications.filter(n => n.userId === u.id && n.type === 'message' && !n.read && n.link?.p?.id === id).forEach(n => n.read = true); setTimeout(() => commit(), 0); }
  M.lastConv = id;
  if (!soft) { const i = $('#chat-in'); if (i) setTimeout(() => i.focus({ preventScroll: true }), 50); }
};
const REPLIES = ['Merci pour votre message, je vous réponds dans un instant.', 'Oui, le logement est toujours disponible à ces dates.', 'Vous pouvez faire la demande directement depuis l\'annonce, je la validerai rapidement.', 'Le parking est couvert et sécurisé par un gardien 24 h/24.', 'Bien sûr, une visite physique est possible samedi matin si vous le souhaitez.', 'L\'eau et l\'électricité sont sur compteurs individuels.'];
function pushMsg(c, m) {
  const u = me(); c.messages.push(Object.assign({ id: uid('m'), from: u.id, at: Date.now(), read: false }, m));
  const other = c.participants.find(x => x !== u.id);
  notify(other, 'message', 'Nouveau message de ' + fullName(u), m.text || (m.img ? '📷 Photo' : '📎 Document'), { s: 'chat', p: { id: c.id } });
  commit();
  // Réponse automatique simulée (temps réel via WebSocket dans l'app finale)
  if (c.blockedBy) return;
  setTimeout(() => { M.typing = c.id; if (cur().s === 'chat') mRender(true); }, 700);
  setTimeout(() => {
    M.typing = null;
    if (c.blockedBy) { mRender(true); return; }
    c.messages.forEach(x => { if (x.from === u.id) x.read = true; });
    const viewing = cur().s === 'chat' && cur().p.id === c.id && S.session.userId === u.id;
    c.messages.push({ id: uid('m'), from: other, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], at: Date.now(), read: viewing });
    if (!viewing) notify(u.id, 'message', 'Nouveau message de ' + fullName(user(other)), 'Réponse à votre message', { s: 'chat', p: { id: c.id } });
    commit();
  }, 2600);
}
ACT.chatSend = (o, form) => {
  const t = (o.text || '').trim(); if (!t) return;
  form.querySelector('#chat-in').value = '';
  pushMsg(S.conversations.find(x => x.id === o.id), { text: t });
};
ACT.chatAttach = d => {
  openSheet(`<div class="list"><label class="li">${ic('image')}<div class="li-main">Photo de la galerie<small>JPG, PNG — optimisée automatiquement</small></div><input type="file" accept="image/*" hidden data-chg="chatPhoto" data-id="${d.id}"></label>
  <button class="li" data-act="chatDemoPhoto" data-id="${d.id}">${ic('camera')}<div class="li-main">Prendre une photo<small>Appareil photo (simulé)</small></div></button>
  <label class="li">${ic('doc')}<div class="li-main">Document<small>Autorisés : PDF, JPG, PNG · 5 Mo max</small></div><input type="file" hidden data-chg="chatDoc" data-id="${d.id}"></label></div>`, { title: 'Joindre' });
};
ACT.chatDemoPhoto = d => { closeSheet(); pushMsg(S.conversations.find(x => x.id === d.id), { img: { kind: ['salon', 'chambre', 'cuisine'][Math.floor(Math.random() * 3)], hue: Math.floor(Math.random() * 360) } }); };
ACT.chatPhoto = async (d, el) => { const f = el.files[0]; if (!f) return; closeSheet(); try { const r = await optimizeImage(f, 480, .7); pushMsg(S.conversations.find(x => x.id === d.id), { img: { src: r.src } }); toast('Image optimisée : ' + fmtBytes(r.before) + ' → ' + fmtBytes(r.after), 'info'); } catch (_) { toast('Image illisible', 'err'); } };
ACT.chatDoc = (d, el) => {
  const f = el.files[0]; if (!f) return; closeSheet();
  if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) { toast('Type de fichier non autorisé (PDF, JPG, PNG uniquement)', 'err'); return; }
  if (f.size > 5e6) { toast('Fichier trop volumineux (5 Mo max)', 'err'); return; }
  pushMsg(S.conversations.find(x => x.id === d.id), { doc: { name: f.name, size: fmtBytes(f.size) } });
};
ACT.chatMenu = d => {
  const c = S.conversations.find(x => x.id === d.id); const u = me(); const o = c.participants.find(x => x !== u.id);
  openSheet(`<div class="list">${c.propertyId ? `<button class="li" data-act="mGo" data-s="property" data-id="${c.propertyId}">${ic('home')}<div class="li-main">Voir l'annonce</div></button>` : ''}
  ${c.bookingId && booking(c.bookingId).tenantId === u.id ? `<button class="li" data-act="mGo" data-s="bookingDetail" data-id="${c.bookingId}">${ic('cal')}<div class="li-main">Voir la réservation</div></button>` : ''}
  <button class="li" data-act="report" data-type="conversation" data-id="${c.id}">${ic('flag')}<div class="li-main">Signaler la conversation</div></button>
  <button class="li danger-txt" data-act="chatBlock" data-id="${c.id}">${ic('ban')}<div class="li-main">${c.blockedBy === u.id ? 'Débloquer' : 'Bloquer'} ${esc(fullName(user(o)))}</div></button></div>`, { title: 'Options' });
};
ACT.chatBlock = d => { const c = S.conversations.find(x => x.id === d.id); c.blockedBy = c.blockedBy ? null : me().id; commit(); closeSheet(); toast(c.blockedBy ? 'Utilisateur bloqué' : 'Utilisateur débloqué', 'info'); };

/* ---------------- Notifications ---------------- */
SCR.notifications = () => {
  const u = me(); const list = S.notifications.filter(n => n.userId === u.id);
  const today = list.filter(n => Date.now() - n.at < 864e5), older = list.filter(n => Date.now() - n.at >= 864e5);
  const icFor = { booking: 'cal', message: 'chat', alert: 'bell', reminder: 'clock', listing: 'home', tour: 'cube', system: 'info' };
  const item = n => `<button class="notif ${n.read ? '' : 'unread'}" data-act="openNotif" data-id="${n.id}"><span class="n-ic ${n.type}">${ic(icFor[n.type] || 'bell')}</span><div><b>${esc(n.title)}</b><p>${esc(n.text)}</p><small>${timeAgo(n.at)}</small></div></button>`;
  return hdr('Notifications', { actions: `<button class="hdr-btn" data-act="mGo" data-s="notifPrefs">${ic('gear')}</button>` }) + `<div class="body" data-scroll="main">
  ${list.some(n => !n.read) ? `<div class="pad-x row-between"><span class="muted small">${list.filter(n => !n.read).length} non lue(s)</span><button class="link" data-act="readAll">Tout marquer comme lu</button></div>` : ''}
  ${today.length ? '<h4 class="grp">Aujourd\'hui</h4>' + today.map(item).join('') : ''}${older.length ? '<h4 class="grp">Plus tôt</h4>' + older.map(item).join('') : ''}${list.length ? '' : empty('bell', 'Aucune notification')}</div>`;
};
ACT.openNotif = d => openNotif(d.id);
ACT.readAll = () => { S.notifications.forEach(n => { if (n.userId === me().id) n.read = true; }); commit(); };
SCR.notifPrefs = () => {
  const u = me(); const pr = S.notifPrefs[u.id] || {}; const ch = pr._channels || { push: true, email: true, sms: false };
  return hdr('Préférences de notification') + `<div class="body pad" data-scroll="main"><h4>Types de notifications</h4>${Object.entries(NOTIF_TYPES).map(([k, l]) => `<label class="switch-row"><span>${l}</span><input type="checkbox" class="switch" ${pr[k] === false ? '' : 'checked'} data-chg="prefToggle" data-k="${k}"></label>`).join('')}
  <h4>Canaux</h4>${[['push', 'Notifications push (Firebase)'], ['email', 'E-mail'], ['sms', 'SMS (rappels importants)']].map(([k, l]) => `<label class="switch-row"><span>${l}</span><input type="checkbox" class="switch" ${ch[k] ? 'checked' : ''} data-chg="prefChannel" data-k="${k}"></label>`).join('')}
  <p class="hint">Les notifications de sécurité (connexion, mot de passe) sont toujours envoyées.</p></div>`;
};
ACT.prefToggle = (d, el) => { const p = S.notifPrefs[me().id] = S.notifPrefs[me().id] || {}; p[d.k] = el.checked; commit(); toast('Préférence enregistrée'); };
ACT.prefChannel = (d, el) => { const p = S.notifPrefs[me().id] = S.notifPrefs[me().id] || {}; p._channels = p._channels || { push: true, email: true, sms: false }; p._channels[d.k] = el.checked; commit(); };

/* ---------------- Profil ---------------- */
SCR.profile = () => {
  const u = me(); const isOwner = u.roles.includes('proprietaire'); const isAg = u.roles.includes('agence') || u.roles.includes('agent');
  const sp = S.session.space; const ag = u.agencyId ? agency(u.agencyId) : null;
  const li = (act, icon, label, sub, extra = '') => `<button class="li" ${act}>${ic(icon)}<div class="li-main">${label}${sub ? '<small>' + sub + '</small>' : ''}</div>${extra}${ic('next')}</button>`;
  const verif = [u.verifiedPhone, u.verifiedEmail, u.verifiedId].filter(Boolean).length;
  return (sp === 'locataire' ? hdr('Mon profil') : hdr('Mon profil', { back: M.stack.length > 1, actions: topActions().split('</button>')[0] + '</button>' })) + `<div class="body" data-scroll="main">
  <div class="profile-card">${avatar(u, 'xl')}<div><h3>${esc(fullName(u))} ${u.ownerVerified || (ag && ag.verified) ? verifiedBadge(true, true) : ''}</h3><small>${esc(u.email)} · ${esc(u.phone)}</small>
  <div class="chips-row wrap">${u.roles.map(r => `<span class="tag ${r === 'locataire' ? 'gray' : 'blue'}">${{ locataire: 'Locataire', proprietaire: 'Propriétaire', agence: 'Agence', agent: 'Agent' }[r]}</span>`).join('')}${ag ? '<span class="tag violet">' + esc(ag.name) + '</span>' : ''}</div></div></div>
  <div class="verif-bar"><span>Vérification du compte</span><i><b style="width:${verif / 3 * 100}%"></b></i><button class="link" data-act="mGo" data-s="verification">${verif}/3 · Compléter</button></div>
  ${isOwner || isAg ? `<div class="space-switch">${['locataire', isOwner ? 'proprietaire' : null, isAg ? 'agence' : null].filter(Boolean).map(s => `<button class="${sp === s ? 'on' : ''}" data-act="switchSpace" data-sp="${s}">${ic(s === 'locataire' ? 'search' : s === 'agence' ? 'building' : 'home')}${{ locataire: 'Espace locataire', proprietaire: 'Espace propriétaire', agence: 'Espace agence' }[s]}</button>`).join('')}</div>`
      : `<button class="become-owner" data-act="mGo" data-s="becomeOwner">${ic('home')}<div><b>Vous avez un logement à louer ?</b><small>Activez votre espace propriétaire gratuitement</small></div>${ic('next')}</button>`}
  <div class="list grouped"><h4>Mon compte</h4>${li('data-act="mGo" data-s="editProfile"', 'user', 'Informations personnelles')}${li('data-act="mGo" data-s="security"', 'lock', 'Sécurité et connexion', 'Mot de passe, sessions')}${li('data-act="mGo" data-s="verification"', 'shield', 'Vérification', verif + '/3 étapes')}
  ${ag && u.agencyRole === 'gerant' ? li('data-act="mGo" data-s="agencyProfile"', 'building', 'Informations de l\'agence') : ''}</div>
  <div class="list grouped"><h4>Activité</h4>${li('data-act="mGo" data-s="myBookings"', 'cal', 'Mes réservations', S.bookings.filter(b => b.tenantId === u.id).length + ' réservation(s)')}${li('data-act="mTab" data-s="favorites"', 'heart', 'Mes favoris', favsOf(u.id).length + ' logement(s)')}${li('data-act="mGo" data-s="savedSearches"', 'bell', 'Recherches enregistrées et alertes')}${li('data-act="mGo" data-s="history"', 'history', 'Historique', 'Logements consultés, recherches')}${li('data-act="mGo" data-s="myReports"', 'flag', 'Signalements et litiges')}</div>
  <div class="list grouped"><h4>Préférences</h4>${li('data-act="mGo" data-s="notifPrefs"', 'bell', 'Notifications')}${li('data-act="langSoon"', 'sparkle', 'Langue', 'Français')}${li('data-act="langSoon"', 'wallet', 'Devise', 'Franc CFA (XOF)')}</div>
  <div class="list grouped"><h4>Aide</h4>${li('data-act="mGo" data-s="help"', 'help', 'Centre d\'aide', 'FAQ, contact, tickets')}${li('data-act="mGo" data-s="page" data-p=\'{"k":"cgu"}\'', 'doc', 'Conditions générales')}${li('data-act="mGo" data-s="page" data-p=\'{"k":"privacy"}\'', 'lock', 'Politique de confidentialité')}${li('data-act="mGo" data-s="page" data-p=\'{"k":"about"}\'', 'info', 'À propos')}</div>
  <div class="list grouped"><button class="li" data-act="logout">${ic('logout')}<div class="li-main">Se déconnecter</div></button><button class="li danger-txt" data-act="mGo" data-s="deleteAccount">${ic('trash')}<div class="li-main">Supprimer mon compte</div></button></div>
  <p class="center small muted">DomiLoc · maquette v1.0</p><div class="foot-space"></div></div>`;
};
ACT.langSoon = () => toast('Français et XOF disponibles. D\'autres langues et devises pourront être ajoutées (architecture i18n prévue).', 'info');
ACT.switchSpace = d => { S.session.space = d.sp; commit(); renderDemoBar(); mTab(homeFor()); toast('Espace ' + { locataire: 'locataire', proprietaire: 'propriétaire', agence: 'agence' }[d.sp] + ' activé', 'info'); };
ACT.logout = () => confirmSheet('Déconnexion', 'Voulez-vous vous déconnecter de DomiLoc ?', 'Se déconnecter', () => { loginAs(null); M.onb = 0; toast('Déconnecté', 'info'); });
SCR.editProfile = () => {
  const u = me();
  return hdr('Informations personnelles') + `<div class="body pad" data-scroll="main"><form data-submit="saveProfile" class="form"><div class="center-col">${avatar(u, 'xl')}<button type="button" class="link" data-act="avatarColor">Changer la couleur de l'avatar</button></div>
  <div class="grid2"><label class="field"><span>Prénom</span><input class="inp" id="ep-f" name="first" value="${esc(u.first)}" required></label><label class="field"><span>Nom</span><input class="inp" id="ep-l" name="last" value="${esc(u.last)}" required></label></div>
  <label class="field"><span>E-mail ${u.verifiedEmail ? '<em class="ok-txt">✓ vérifié</em>' : ''}</span><input class="inp" id="ep-e" name="email" type="email" value="${esc(u.email)}" required></label>
  <label class="field"><span>Téléphone ${u.verifiedPhone ? '<em class="ok-txt">✓ vérifié</em>' : ''}</span><input class="inp" id="ep-p" name="phone" value="${esc(u.phone)}" required></label>
  <label class="field"><span>Ville</span><input class="inp" id="ep-c" name="city" value="${esc(u.city || '')}"></label>
  <label class="field"><span>Budget mensuel indicatif (pour les recommandations)</span><input class="inp" id="ep-b" name="budget" type="number" step="5000" value="${u.budget || ''}"></label>
  <label class="field"><span>À propos de moi</span><textarea class="inp" id="ep-bio" name="bio" rows="3">${esc(u.bio || '')}</textarea></label>
  <button class="btn pri block">Enregistrer</button></form></div>`;
};
ACT.avatarColor = () => { const u = me(); const cs = ['#0F766E', '#B45309', '#1D4ED8', '#7C3AED', '#BE185D', '#15803D', '#C2410C']; u.color = cs[(cs.indexOf(u.color) + 1) % cs.length]; commit(); };
ACT.saveProfile = o => {
  const u = me(); if (o.email !== u.email) u.verifiedEmail = false; if (o.phone !== u.phone) u.verifiedPhone = false;
  Object.assign(u, { first: o.first, last: o.last, email: o.email, phone: o.phone, city: o.city, bio: o.bio, budget: +o.budget || null });
  commit(); toast('Profil mis à jour'); mBack();
};
SCR.security = () => hdr('Sécurité') + `<div class="body pad" data-scroll="main"><h4>Changer le mot de passe</h4><form data-submit="changePw" class="form">
  <label class="field"><span>Mot de passe actuel</span><input class="inp" name="old" type="password" required></label>
  <label class="field"><span>Nouveau mot de passe</span><input class="inp" id="pw-new" name="pw" type="password" minlength="8" required data-inp="pwStrength"><div class="pw-meter" id="pw-meter"><i></i></div><small id="pw-txt" class="muted"></small></label>
  <label class="field"><span>Confirmer</span><input class="inp" name="pw2" type="password" required></label><button class="btn pri block">Mettre à jour</button></form>
  <h4>Sessions actives</h4><div class="list">${[['Cet appareil · Android 14', 'Lomé · maintenant', true], ['iPhone 13 · iOS 17', 'Lomé · il y a 3 j', false], ['Chrome · Windows', 'Cotonou · il y a 12 j', false]].map(([d, w, c]) => `<div class="li">${ic('phone')}<div class="li-main">${d}<small>${w}</small></div>${c ? '<span class="tag green">Actuelle</span>' : ''}</div>`).join('')}</div>
  <button class="btn sec block" data-act="logoutOthers">Déconnecter les autres appareils</button><p class="hint">${ic('lock')} Connexions limitées à 5 tentatives, sessions chiffrées (JWT + rotation des jetons).</p></div>`;
ACT.changePw = o => { const u = me(); if (o.old !== (u.pwd || 'demo1234')) { toast('Mot de passe actuel incorrect', 'err'); return; } if (o.pw !== o.pw2) { toast('Les mots de passe ne correspondent pas', 'err'); return; } if (pwScore(o.pw) < 2) { toast('Mot de passe trop faible', 'err'); return; } u.pwd = o.pw; commit(); toast('Mot de passe modifié'); mBack(); };
ACT.logoutOthers = () => toast('2 sessions déconnectées');
SCR.verification = () => {
  const u = me(); const isOwner = u.roles.includes('proprietaire'); const docs = u.docs || [];
  const step = (ok, icon, t, s, btn) => `<div class="v-step ${ok ? 'ok' : ''}"><span>${ic(ok ? 'check' : icon)}</span><div><b>${t}</b><small>${s}</small></div>${ok ? '<em class="ok-txt">Vérifié</em>' : btn || ''}</div>`;
  return hdr('Vérification du compte') + `<div class="body pad" data-scroll="main"><p class="muted">Un compte vérifié inspire confiance et ${isOwner ? 'permet d\'obtenir le badge « Propriétaire vérifié ».' : 'accélère l\'acceptation de vos demandes.'}</p>
  ${step(u.verifiedPhone, 'phone', 'Téléphone', u.phone, `<button class="btn sm sec" data-act="verifyChannel" data-c="phone">Vérifier</button>`)}
  ${step(u.verifiedEmail, 'mail', 'Adresse e-mail', u.email, `<button class="btn sm sec" data-act="verifyChannel" data-c="email">Vérifier</button>`)}
  ${step(u.verifiedId, 'user', 'Pièce d\'identité', docs.some(d => d.type.startsWith('Pièce') && d.status === 'en_attente') ? 'En cours d\'examen par DomiLoc' : docs.some(d => d.type.startsWith('Pièce') && d.status === 'refuse') ? 'Document refusé — renvoyez-en un nouveau' : 'CNI, passeport ou carte consulaire', docs.some(d => d.type.startsWith('Pièce') && d.status === 'en_attente') ? '<span class="tag amber">En attente</span>' : `<label class="btn sm sec">Envoyer<input type="file" hidden accept="image/*,.pdf" data-chg="uploadDoc" data-t="Pièce d'identité (CNI)"></label>`)}
  ${isOwner ? step(u.ownerVerified, 'doc', 'Droit de mise en location', docs.some(d => d.type.startsWith('Attestation') && d.status === 'en_attente') ? 'En cours d\'examen' : 'Titre foncier, attestation de propriété ou mandat de gestion', docs.some(d => d.type.startsWith('Attestation') && d.status === 'en_attente') ? '<span class="tag amber">En attente</span>' : `<label class="btn sm sec">Envoyer<input type="file" hidden accept="image/*,.pdf" data-chg="uploadDoc" data-t="Attestation de propriété / mandat"></label>`) : ''}
  ${docs.length ? `<h4>Documents transmis</h4><div class="list">${docs.map(d => `<div class="li">${ic('file')}<div class="li-main">${esc(d.type)}<small>${esc(d.file)} · ${fmtDate(d.at)}</small></div><span class="tag ${d.status === 'valide' ? 'green' : d.status === 'refuse' ? 'red' : 'amber'}">${{ valide: 'Validé', refuse: 'Refusé', en_attente: 'En attente' }[d.status]}</span></div>`).join('')}</div>` : ''}
  <p class="hint">${ic('lock')} Vos documents sont chiffrés, accessibles uniquement à l'équipe de vérification, et supprimés 90 jours après validation. La vérification ne constitue pas une garantie juridique absolue de propriété.</p></div>`;
};
ACT.verifyChannel = d => { M.pendingReg = { userId: me().id, channel: d.c, code: String(Math.floor(100000 + Math.random() * 900000)), verifyOnly: true }; mGo('otp'); simulateCodeSend(); };
ACT.uploadDoc = (d, el) => {
  const f = el.files[0]; if (!f) return; const u = me(); u.docs = u.docs || [];
  u.docs.push({ id: uid('doc'), type: d.t, file: f.name, status: 'en_attente', at: todayISO() });
  audit('Document soumis', u.id, d.t); commit(); toast('Document envoyé — vérification sous 48 h');
};
SCR.becomeOwner = () => hdr('Devenir propriétaire') + `<div class="body pad" data-scroll="main"><div class="hero-card" style="background-image:linear-gradient(180deg,rgba(15,118,110,.2),rgba(15,118,110,.95)),url('${scene('villa', 140)}')"><h2>Louez votre bien sur DomiLoc</h2><p>Publication gratuite · locataires vérifiés · visites 3D · paiements sécurisés</p></div>
  <div class="feat">${[['home', 'Publiez en quelques minutes', 'Formulaire guidé, photos optimisées'], ['cube', 'Visite 3D depuis votre téléphone', 'Capture guidée pièce par pièce'], ['cal', 'Gérez vos disponibilités', 'Calendrier et demandes centralisés'], ['chart', 'Suivez vos statistiques', 'Vues, demandes, revenus']].map(([i, t, s]) => `<div>${ic(i)}<b>${t}</b><small>${s}</small></div>`).join('')}</div>
  <form data-submit="becomeOwnerOk" class="form"><label class="check"><input type="checkbox" required name="ok"> Je certifie disposer du droit de mettre en location les logements que je publierai.</label><button class="btn pri block">Activer mon espace propriétaire</button></form>
  <p class="hint">Vous pourrez transmettre vos justificatifs ensuite pour obtenir le badge vérifié.</p></div>`;
ACT.becomeOwnerOk = () => { const u = me(); if (!u.roles.includes('proprietaire')) u.roles.push('proprietaire'); u.ownerVerified = false; S.session.space = 'proprietaire'; audit('Activation espace propriétaire', u.id); commit(); renderDemoBar(); mTab('ownerDash'); toast('Espace propriétaire activé !'); };
SCR.deleteAccount = () => hdr('Supprimer mon compte') + `<div class="body pad" data-scroll="main"><div class="alert red">${ic('alert')} Cette action est définitive.</div>
  <p>Conformément à la réglementation sur la protection des données personnelles :</p><ul class="ul"><li>Vos données de profil, favoris, recherches et messages seront supprimés sous 30 jours.</li><li>Les reçus et données comptables liées aux réservations sont conservés sous forme anonymisée pendant la durée légale.</li><li>Vos annonces seront archivées et retirées de la plateforme.</li><li>Les réservations en cours doivent être terminées ou annulées au préalable.</li></ul>
  <form data-submit="deleteOk" class="form"><label class="field"><span>Confirmez avec votre mot de passe</span><input class="inp" name="pw" type="password" required></label><button class="btn danger block">Supprimer définitivement</button></form></div>`;
ACT.deleteOk = o => {
  const u = me(); if (o.pw !== (u.pwd || 'demo1234')) { toast('Mot de passe incorrect', 'err'); return; }
  if (S.bookings.some(b => b.tenantId === u.id && ['confirmee', 'encours'].includes(b.status))) { toast('Vous avez une location confirmée ou en cours', 'err'); return; }
  u.status = 'supprime'; u.first = 'Utilisateur'; u.last = 'supprimé'; u.email = 'supprime+' + u.id + '@domiloc.tg'; u.phone = '—';
  S.properties.filter(p => p.ownerId === u.id).forEach(p => p.status = 'archivee');
  audit('Suppression de compte', u.id, 'Demande utilisateur'); loginAs(null); toast('Compte supprimé', 'info');
};
SCR.savedSearches = () => {
  const u = me(); const list = S.savedSearches[u.id] || [];
  return hdr('Recherches enregistrées') + `<div class="body pad" data-scroll="main">${list.map(s => { const n = filterProps(Object.assign(defaultFilters(), s.criteria)).length; return `<div class="card ss"><div class="row-between"><b>${esc(s.name)}</b><label class="switch-row sm"><span>${ic('bell')}</span><input type="checkbox" class="switch" ${s.alerts ? 'checked' : ''} data-chg="ssAlert" data-id="${s.id}"></label></div><small class="muted">${n} résultat(s) · créée le ${fmtDate(s.created)}</small><div class="btn-row"><button class="btn sm pri" data-act="ssRun" data-id="${s.id}">Lancer</button><button class="btn sm ghost danger-txt" data-act="ssDel" data-id="${s.id}">${ic('trash')}</button></div></div>`; }).join('') || empty('bell', 'Aucune recherche enregistrée', 'Depuis la recherche, touchez la cloche pour enregistrer vos critères et recevoir des alertes.')}
  <button class="btn sec block" data-act="demoAlert">${ic('sparkle')} Démo : simuler une nouvelle annonce correspondante</button></div>`;
};
ACT.ssAlert = (d, el) => { const s = S.savedSearches[me().id].find(x => x.id === d.id); s.alerts = el.checked; commit(); };
ACT.ssRun = d => { const s = S.savedSearches[me().id].find(x => x.id === d.id); M.filters = Object.assign(defaultFilters(), JSON.parse(JSON.stringify(s.criteria))); M.shown = 10; mTab('search'); };
ACT.ssDel = d => { S.savedSearches[me().id] = S.savedSearches[me().id].filter(x => x.id !== d.id); commit(); };
ACT.demoAlert = () => {
  const s = (S.savedSearches[me().id] || []).find(x => x.alerts); if (!s) { toast('Activez une alerte d\'abord', 'info'); return; }
  const p = filterProps(Object.assign(defaultFilters(), s.criteria))[0] || publicProps()[0];
  setTimeout(() => { notify(me().id, 'alert', 'Nouvelle annonce pour « ' + s.name + ' »', p.title + ' — ' + money(p.price) + '/' + p.period, { s: 'property', p: { id: p.id } }); commit(); }, 800);
};
SCR.history = () => {
  const u = me(); const v = (S.viewed[u.id] || []).map(prop).filter(Boolean); const h = S.searchHistory[u.id] || [];
  return hdr('Historique') + `<div class="body" data-scroll="main"><section class="sec"><div class="sec-h"><h3>Recherches</h3>${h.length ? '<a href="#" class="link" data-act="clearHistory">Effacer</a>' : ''}</div><div class="chips-row wrap">${h.map(q => `<button class="chip" data-act="histGo" data-q="${esc(q)}">${ic('history')}${esc(q)}</button>`).join('') || '<span class="muted small">Aucune recherche</span>'}</div></section>
  <section class="sec"><div class="sec-h"><h3>Logements consultés</h3>${v.length ? '<a href="#" class="link" data-act="clearViewed">Effacer</a>' : ''}</div><div class="pad-x">${v.map(p => pmini(p)).join('') || '<span class="muted small">Aucun logement consulté</span>'}</div></section></div>`;
};
ACT.histGo = d => { M.filters = defaultFilters(); mTab('search'); setTimeout(() => ACT.histSearch(d), 0); };
ACT.clearViewed = () => { S.viewed[me().id] = []; commit(); };
SCR.myReports = () => {
  const u = me(); const reps = S.reports.filter(r => r.by === u.id); const ds = S.disputes.filter(d => d.openedBy === u.id || managersOf(prop(booking(d.bookingId).propertyId)).includes(u.id));
  const tgt = r => r.targetType === 'property' ? prop(r.targetId)?.title : r.targetType === 'user' ? fullName(user(r.targetId)) : r.targetType === 'review' ? 'Avis' : 'Conversation';
  return hdr('Signalements et litiges') + `<div class="body pad" data-scroll="main"><h4>Litiges</h4>${ds.map(d => `<button class="li card" data-act="mGo" data-s="disputeDetail" data-id="${d.id}">${ic('gavel')}<div class="li-main">${esc(d.subject)}<small>${esc(prop(booking(d.bookingId).propertyId).title)}</small></div><span class="tag ${d.status === 'ouvert' ? 'amber' : 'green'}">${d.status === 'ouvert' ? 'En cours' : 'Clôturé'}</span></button>`).join('') || '<p class="muted small">Aucun litige</p>'}
  <h4>Mes signalements</h4>${reps.map(r => `<div class="li card">${ic('flag')}<div class="li-main">${esc(r.reason)}<small>${esc(tgt(r) || '')} · ${timeAgo(r.at)}</small>${r.decision ? '<small class="ok-txt">Décision : ' + esc(r.decision) + '</small>' : ''}</div><span class="tag ${r.status === 'ouvert' ? 'amber' : 'green'}">${r.status === 'ouvert' ? 'En cours' : 'Traité'}</span></div>`).join('') || '<p class="muted small">Aucun signalement</p>'}</div>`;
};

/* Centre d'aide */
SCR.help = () => {
  const u = me(); const tk = S.tickets.filter(t => t.userId === u.id);
  return hdr('Centre d\'aide') + `<div class="body pad" data-scroll="main"><div class="search-box light">${ic('search')}<input class="inp" id="faq-q" placeholder="Rechercher dans l'aide" data-inp="faqQ" value="${esc(M.faqQ || '')}"></div>
  <h4>Questions fréquentes</h4><div class="faq">${S.content.faqs.filter(f => !M.faqQ || norm(f.q + f.a).includes(norm(M.faqQ))).map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('') || '<p class="muted">Aucun résultat</p>'}</div>
  <h4>Mes demandes d'assistance</h4>${tk.map(t => `<button class="li card" data-act="mGo" data-s="ticket" data-id="${t.id}">${ic('ticket')}<div class="li-main">${esc(t.subject)}<small>${esc(t.category)} · ${timeAgo(t.at)} · ${t.messages.length} message(s)</small></div><span class="tag ${t.status === 'resolu' ? 'green' : t.status === 'repondu' ? 'blue' : 'amber'}">${{ ouvert: 'Ouvert', repondu: 'Répondu', resolu: 'Résolu' }[t.status]}</span></button>`).join('') || '<p class="muted small">Aucune demande</p>'}
  <h4>Nous contacter</h4><form data-submit="ticketNew" class="form"><label class="field"><span>Catégorie</span><select class="inp" name="category"><option>Réservation</option><option>Paiement</option><option>Compte</option><option>Annonce</option><option>Visite 3D</option><option>Autre</option></select></label>
  <label class="field"><span>Objet</span><input class="inp" name="subject" required></label><label class="field"><span>Message</span><textarea class="inp" name="text" rows="4" required></textarea></label><button class="btn pri block">Envoyer</button></form>
  <div class="contact-row"><a class="btn sec" href="#" data-act="callSupport">${ic('phone')} +228 22 00 00 00</a><a class="btn sec" href="#" data-act="callSupport">${ic('mail')} support@domiloc.tg</a></div></div>`;
};
ACT.faqQ = (d, el) => { M.faqQ = el.value; mRender(true); };
ACT.callSupport = () => toast('Support joignable du lundi au samedi, 8 h – 19 h', 'info');
ACT.ticketNew = (o, form) => { const t = { id: uid('t'), userId: me().id, subject: o.subject, category: o.category, status: 'ouvert', at: Date.now(), messages: [{ from: me().id, text: o.text, at: Date.now() }] }; S.tickets.unshift(t); form.reset(); commit(); mGo('ticket', { id: t.id }); toast('Demande envoyée — réponse sous 24 h'); };
SCR.ticket = ({ id }) => {
  const t = S.tickets.find(x => x.id === id);
  return hdr('Ticket · ' + esc(t.subject), { sub: esc(t.category) }) + `<div class="body chat" data-scroll="main">${t.messages.map(m => `<div class="msg ${m.from === 'admin' ? 'them' : 'me'}">${m.from === 'admin' ? '<b class="small">Support DomiLoc</b>' : ''}<p>${esc(m.text)}</p><small>${fmtDT(m.at)}</small></div>`).join('')}</div>
  ${t.status !== 'resolu' ? `<form class="chat-input" data-submit="ticketReply"><input type="hidden" name="id" value="${t.id}"><input class="inp" id="tk-in" name="text" placeholder="Répondre…" required data-nokeep><button class="send">${ic('send')}</button></form>` : '<div class="chat-blocked">' + ic('check') + ' Ticket résolu</div>'}`;
};
ACT.ticketReply = (o, f) => { const t = S.tickets.find(x => x.id === o.id); t.messages.push({ from: me().id, text: o.text, at: Date.now() }); t.status = 'ouvert'; f.reset(); commit(); };
SCR.page = ({ k }) => { const pg = S.content.pages[k]; return hdr(esc(pg.title)) + `<div class="body pad" data-scroll="main"><div class="prose">${esc(pg.body).replace(/\n/g, '<br>')}</div><p class="hint">Contenu administrable depuis le back-office (Contenus → Pages).</p></div>`; };
SCR.notFound = () => hdr('Écran') + '<div class="body">' + empty('alert', 'Écran introuvable') + '</div>';
