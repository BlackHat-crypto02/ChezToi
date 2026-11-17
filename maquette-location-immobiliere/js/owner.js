/* =====================================================================
   DomiLoc — Espace propriétaire & agence (application mobile)
   Tableau de bord, annonces, publication, médias, disponibilités,
   demandes de réservation, capture 360°/3D, agents d'agence
   ===================================================================== */

/* Graphique en barres (une série, info-bulle au survol) */
function barChart(data, o = {}) {
  const W = o.w || 320, H = o.h || 120, pad = 18, max = Math.max(1, ...data.map(d => d.v));
  const bw = (W - pad) / data.length;
  const bars = data.map((d, i) => {
    const h = Math.max(2, (d.v / max) * (H - pad - 6)); const x = pad + i * bw + 2; const y = H - pad - h; const w = Math.max(3, bw - 4); const r = Math.min(4, w / 2);
    return `<g class="bar"><path d="M${x} ${H - pad}V${y + r}q0-${r} ${r}-${r}h${w - 2 * r}q${r} 0 ${r} ${r}V${H - pad}z" fill="var(--chart-1)"/><rect x="${pad + i * bw}" y="0" width="${bw}" height="${H - pad}" fill="transparent"><title>${esc(d.l)} : ${o.fmt ? o.fmt(d.v) : d.v}</title></rect>
    ${data.length <= 14 && (i % Math.ceil(data.length / 7) === 0) ? `<text x="${x + w / 2}" y="${H - 4}" text-anchor="middle">${esc(d.s || d.l)}</text>` : ''}</g>`;
  }).join('');
  const grid = [0.5, 1].map(f => `<line x1="${pad}" x2="${W}" y1="${H - pad - f * (H - pad - 6)}" y2="${H - pad - f * (H - pad - 6)}" class="grid"/><text x="0" y="${H - pad - f * (H - pad - 6) + 3}" class="ax">${o.fmtAxis ? o.fmtAxis(max * f) : Math.round(max * f)}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || 'Graphique')}">${grid}<line x1="${pad}" x2="${W}" y1="${H - pad}" y2="${H - pad}" class="base"/>${bars}</svg>`;
}
function seeded(seed) { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function viewsSeries(props, days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(todayISO(), i - days + 1); let v = 0;
    props.forEach(p => { if (p.status !== 'publiee' && p.status !== 'louee') return; const r = seeded(p.id + day); v += Math.round(p.views / 70 * (0.5 + r())); });
    return { l: fmtDate(day), s: parseISO(day).getDate() + '', v };
  });
}
function revenueOf(props) {
  const ids = props.map(p => p.id); const m = todayISO().slice(0, 7);
  return S.bookings.filter(b => ids.includes(b.propertyId) && b.payment && b.payment.status === "paye" && new Date(b.payment.at).toISOString().slice(0, 7) === m).reduce((a, b) => a + (b.payment.amount || b.amount || 0), 0);
}
function occupancy(props) {
  const pub = props.filter(p => ['publiee', 'louee'].includes(p.status)); if (!pub.length) return 0;
  const t = todayISO(); const busy = pub.filter(p => p.status === 'louee' || S.bookings.some(b => b.propertyId === p.id && ['confirmee', 'encours'].includes(b.status) && b.start <= addDays(t, 30) && b.end > t)).length;
  return Math.round(busy / pub.length * 100);
}
function latestTour(p) { return S.tours.filter(t => t.propertyId === p.id).sort((a, b) => (b.createdTs || 0) - (a.createdTs || 0) || (b.status !== 'publiee') - (a.status !== 'publiee'))[0] || null; }

/* ---------------- Tableau de bord propriétaire ---------------- */
SCR.ownerDash = () => {
  const u = me(); const props = propsManagedBy(u); const pending = S.bookings.filter(b => b.status === 'attente' && props.some(p => p.id === b.propertyId));
  const attention = props.filter(p => ['refusee', 'brouillon', 'suspendue'].includes(p.status));
  const tours = S.tours.filter(t => props.some(p => p.id === t.propertyId) && ['recus', 'traitement', 'termine', 'echoue'].includes(t.status));
  return rootHdr('Espace propriétaire', esc(fullName(u))) + `<div class="body" data-scroll="main">
  ${!u.ownerVerified ? `<div class="alert amber m">${ic('shield')}<div><b>Compte propriétaire non vérifié</b><small>Envoyez vos justificatifs pour obtenir le badge et rassurer les locataires.</small></div><button class="btn sm pri" data-act="mGo" data-s="verification">Vérifier</button></div>` : ''}
  <div class="kpis">${[['Annonces publiées', props.filter(p => p.status === 'publiee').length, 'home'], ['Vues (14 j)', viewsSeries(props).reduce((a, d) => a + d.v, 0), 'eye'], ['Demandes en attente', pending.length, 'cal'], ['Revenus du mois', moneyShort(revenueOf(props)) + ' F', 'wallet'], ["Taux d'occupation", occupancy(props) + ' %', 'chart'], ['Note moyenne', (() => { const r = props.map(p => ratingOf(p.id)).filter(r => r.count); return r.length ? (r.reduce((a, x) => a + x.avg, 0) / r.length).toFixed(1) + ' ★' : '—'; })(), 'star']].map(([l, v, i]) => `<div class="kpi">${ic(i)}<b>${v}</b><small>${l}</small></div>`).join('')}</div>
  <section class="sec card-sec"><div class="sec-h"><h3>Vues de vos annonces</h3><a href="#" class="link" data-act="mGo" data-s="ownerStats">Statistiques</a></div>${barChart(viewsSeries(props), { label: 'Vues par jour' })}</section>
  <div class="quick">${[['publish', 'plus', 'Publier'], ['capture', 'camera', 'Capture 3D'], ['ownerRequests', 'cal', 'Demandes'], ['ownerStats', 'chart', 'Statistiques']].map(([s, i, l]) => `<button data-act="${s === 'ownerRequests' ? 'mTab' : 'ownerGo'}" data-s="${s}">${ic(i)}<span>${l}</span></button>`).join('')}</div>
  ${pending.length ? `<section class="sec"><div class="sec-h"><h3>Demandes à traiter</h3><a href="#" class="link" data-act="mTab" data-s="ownerRequests">Tout voir</a></div><div class="pad-x">${pending.slice(0, 3).map(b => requestCard(b)).join('')}</div></section>` : ''}
  ${tours.length ? `<section class="sec"><div class="sec-h"><h3>Visites virtuelles</h3></div><div class="pad-x">${tours.map(t => `<button class="li card" data-act="mGo" data-s="tourStatus" data-id="${t.id}">${ic('cube')}<div class="li-main">${esc(prop(t.propertyId).title)}<small>${t.type === '3d' ? 'Reconstruction 3D' : 'Visite 360°'} · ${t.status === 'traitement' ? t.progress + ' %' : ''}</small></div>${tag(TOUR_STATUS[t.status])}</button>`).join('')}</div></section>` : ''}
  ${attention.length ? `<section class="sec"><div class="sec-h"><h3>À corriger / compléter</h3></div><div class="pad-x">${attention.map(p => `<button class="li card" data-act="mGo" data-s="ownerListing" data-id="${p.id}"><div class="thumb sm" style="background-image:url('${propCover(p)}')"></div><div class="li-main">${esc(p.title)}<small>${p.rejectReason ? esc(p.rejectReason.slice(0, 70)) + '…' : p.suspendReason ? esc(p.suspendReason) : 'Brouillon non soumis'}</small></div>${tag(PROPERTY_STATUS[p.status])}</button>`).join('')}</div></section>` : ''}
  <div class="foot-space"></div></div><button class="fab" data-act="ownerGo" data-s="publish" aria-label="Publier">${ic('plus')}</button>`;
};
ACT.ownerGo = d => { if (d.s === 'publish') startPublish(d.id); else if (d.s === 'capture') startCapture(d.id); else mGo(d.s, d.id ? { id: d.id } : {}); };

/* ---------------- Mes annonces ---------------- */
SCR.ownerListings = () => {
  const u = me(); const props = propsManagedBy(u); const f = M.olf || 'tous';
  const list = props.filter(p => f === 'tous' || p.status === f).sort((a, b) => b.updated.localeCompare(a.updated));
  const isAg = S.session.space === 'agence';
  return rootHdr(isAg ? 'Biens de l\'agence' : 'Mes logements', props.length + ' logement(s)') + `<div class="chips-row tabs-chips" data-scroll="olf"><button class="chip ${f === 'tous' ? 'on' : ''}" data-act="olf" data-f="tous">Tous ${props.length}</button>${Object.entries(PROPERTY_STATUS).map(([k, s]) => { const n = props.filter(p => p.status === k).length; return n ? `<button class="chip ${f === k ? 'on' : ''}" data-act="olf" data-f="${k}">${s.label.replace(' de validation', '')} ${n}</button>` : ''; }).join('')}</div>
  <div class="body pad" data-scroll="main">${list.map(p => { const t = latestTour(p); return `<div class="ol-row" data-act="mGo" data-s="ownerListing" data-id="${p.id}"><div class="thumb" style="background-image:url('${propCover(p)}')"></div><div class="ol-info">${tag(PROPERTY_STATUS[p.status])}<b>${esc(p.title)}</b><small>${money(p.price)}/${p.period}${p.agentId && isAg ? ' · ' + esc(fullName(user(p.agentId))) : ''}</small><small class="muted">${ic('eye')} ${p.views} · ${ic('heart')} ${p.favCount} ${t ? ' · ' + ic('cube') + ' ' + TOUR_STATUS[t.status].label : ''}</small></div></div>`; }).join('') || empty('home', 'Aucun logement', 'Publiez votre premier logement en quelques minutes.', '<button class="btn pri" data-act="ownerGo" data-s="publish">Publier un logement</button>')}<div class="foot-space"></div></div>
  <button class="fab" data-act="ownerGo" data-s="publish" aria-label="Publier">${ic('plus')}</button>`;
};
ACT.olf = d => { M.olf = d.f; mRender(true); };

SCR.ownerListing = ({ id }) => {
  const p = prop(id); const u = me(); if (!p || !canManage(u, p)) return hdr('Annonce') + '<div class="body">' + empty('lock', 'Accès refusé') + '</div>';
  const t = latestTour(p); const r = ratingOf(p.id); const bks = S.bookings.filter(b => b.propertyId === p.id);
  const ag = p.agencyId ? agency(p.agencyId) : null; const isGerant = u.agencyRole === 'gerant' && ag;
  const st = p.status;
  const actions = [];
  actions.push(['ownerGo', 'edit', 'Modifier', 'publish']);
  actions.push(['mGo', 'image', 'Photos & vidéos', 'ownerMedia']);
  actions.push(['mGo', 'cal', 'Disponibilités', 'ownerAvail']);
  actions.push(['ownerGo', 'camera', t ? 'Nouvelle capture 3D' : 'Créer une visite 3D', 'capture']);
  actions.push(['mGo', 'chart', 'Statistiques', 'ownerStats']);
  actions.push(['mGo', 'eye', 'Aperçu public', 'property']);
  return hdr('Gérer l\'annonce') + `<div class="body" data-scroll="main"><div class="ol-cover" style="background-image:url('${propCover(p)}')">${tag(PROPERTY_STATUS[st])}</div><div class="pad">
  <h2 class="d-title">${esc(p.title)}</h2><p class="muted">${money(p.price)} / ${p.period} · ${esc(p.quartier)}, ${esc(p.city)} · ${p.bookingMode === 'instant' ? '⚡ Instantanée' : 'Sur validation'}</p>
  ${st === 'refusee' ? `<div class="alert red">${ic('alert')}<div><b>Annonce refusée</b><small>Motif : ${esc(p.rejectReason)}</small></div></div><button class="btn pri block" data-act="ownerGo" data-s="publish" data-id="${p.id}">${ic('edit')} Corriger et soumettre à nouveau</button>` : ''}
  ${st === 'suspendue' ? `<div class="alert red">${ic('ban')}<div><b>Annonce suspendue par la modération</b><small>${esc(p.suspendReason || '')}</small></div></div><button class="btn sec block" data-act="mGo" data-s="help">Contacter le support</button>` : ''}
  ${st === 'attente' ? `<div class="alert amber">${ic('clock')}<div><b>En attente de validation</b><small>Notre équipe vérifie votre annonce (délai moyen : 24 h).</small></div></div>` : ''}
  ${st === 'brouillon' ? `<div class="alert gray">${ic('edit')}<div><b>Brouillon</b><small>Complétez et soumettez votre annonce pour la publier.</small></div></div><button class="btn pri block" data-act="ownerGo" data-s="publish" data-id="${p.id}">Continuer la saisie</button>` : ''}
  <div class="kpis sm">${[['Vues', p.views], ['Favoris', p.favCount], ['Contacts', p.contacts], ['Réservations', bks.filter(b => ['confirmee', 'encours', 'terminee'].includes(b.status)).length], ['Note', r.count ? r.avg.toFixed(1) + '★' : '—']].map(([l, v]) => `<div class="kpi"><b>${v}</b><small>${l}</small></div>`).join('')}</div>
  <div class="act-grid">${actions.map(([a, i, l, s]) => `<button data-act="${a}" data-s="${s}" data-id="${p.id}">${ic(i)}<span>${l}</span></button>`).join('')}</div>
  ${t ? `<button class="li card" data-act="mGo" data-s="tourStatus" data-id="${t.id}">${ic('cube')}<div class="li-main">Visite ${t.type === '3d' ? '3D' : '360°'}<small>${t.files} fichiers · ${t.sizeMB} Mo${t.status === 'traitement' ? ' · ' + t.progress + ' %' : ''}</small></div>${tag(TOUR_STATUS[t.status])}</button>` : ''}
  ${isGerant ? `<label class="field"><span>Agent responsable</span><select class="inp" data-chg="assignAgent" data-id="${p.id}"><option value="">— Non affecté —</option>${ag.members.map(m => `<option value="${m}" ${p.agentId === m ? 'selected' : ''}>${esc(fullName(user(m)))}</option>`).join('')}</select></label>` : ''}
  <h4>Réservations</h4>${bks.slice(0, 5).map(b => bookingCard(b, true)).join('') || '<p class="muted small">Aucune réservation pour ce logement.</p>'}
  <h4>Gestion de la publication</h4><div class="btn-wrap">
  ${st === 'publiee' ? `<button class="btn sec" data-act="setPStatus" data-id="${p.id}" data-st="louee">${ic('check')} Marquer comme loué</button><button class="btn sec" data-act="setPStatus" data-id="${p.id}" data-st="archivee">${ic('ban')} Désactiver / archiver</button>` : ''}
  ${['louee', 'archivee'].includes(st) ? `<button class="btn pri" data-act="setPStatus" data-id="${p.id}" data-st="attente">${ic('refresh')} Republier (validation)</button>` : ''}
  ${st === 'attente' ? `<button class="btn sec" data-act="setPStatus" data-id="${p.id}" data-st="brouillon">Retirer la soumission</button>` : ''}
  ${['brouillon', 'refusee', 'archivee'].includes(st) ? `<button class="btn danger-o" data-act="deleteListing" data-id="${p.id}">${ic('trash')} Supprimer</button>` : ''}</div>
  <div class="foot-space"></div></div></div>`;
};
ACT.assignAgent = (d, el) => { const p = prop(d.id); p.agentId = el.value || null; if (el.value) notify(el.value, 'listing', 'Nouveau bien affecté', '« ' + p.title + ' » vous a été affecté.', { s: 'ownerListing', p: { id: p.id } }); commit(); toast('Affectation mise à jour'); };
ACT.setPStatus = d => {
  const p = prop(d.id); const labels = { louee: 'marquée comme louée', archivee: 'archivée', attente: 'soumise à validation', brouillon: 'repassée en brouillon' };
  confirmSheet('Confirmer', `L'annonce sera <b>${labels[d.st]}</b>.${d.st === 'archivee' || d.st === 'louee' ? ' Elle ne sera plus visible dans les recherches.' : ''}`, 'Confirmer', () => { p.status = d.st; p.updated = todayISO(); commit(); toast('Annonce ' + labels[d.st]); });
};
ACT.deleteListing = d => confirmSheet('Supprimer l\'annonce', 'Cette action est définitive.', 'Supprimer', () => { S.properties = S.properties.filter(p => p.id !== d.id); commit(); mTab('ownerListings'); toast('Annonce supprimée', 'info'); }, true);

/* Médias */
SCR.ownerMedia = ({ id }) => {
  const p = prop(id);
  return hdr('Photos & vidéos', { sub: esc(p.title) }) + `<div class="body pad" data-scroll="main">${mediaManagerHTML(p.media, p.mainMedia, 'om', p.id)}<p class="hint">${ic('sparkle')} Les images sont automatiquement redimensionnées et compressées (WebP/JPEG) pour réduire la consommation de données. Des miniatures sont générées côté serveur.</p></div>`;
};
function mediaManagerHTML(media, mainId, ns, pid) {
  return `<div class="media-grid">${media.map((m, i) => `<div class="mg-item ${m.id === mainId ? 'main' : ''}"><div class="mg-img" style="background-image:url('${mediaSrc(m)}')">${m.type === 'video' ? `<span class="play">${ic('play')}</span>` : ''}${m.id === mainId ? '<span class="mg-main">Principale</span>' : ''}</div>
  <input class="inp sm" value="${esc(m.caption || '')}" placeholder="Légende" data-chg="mCaption" data-ns="${ns}" data-pid="${pid}" data-mid="${m.id}">
  <div class="mg-act"><button data-act="mMove" data-ns="${ns}" data-pid="${pid}" data-mid="${m.id}" data-d="-1" ${i ? '' : 'disabled'} title="Monter">${ic('back')}</button><button data-act="mMove" data-ns="${ns}" data-pid="${pid}" data-mid="${m.id}" data-d="1" ${i < media.length - 1 ? '' : 'disabled'} title="Descendre">${ic('next')}</button>
  ${m.type === 'photo' && m.id !== mainId ? `<button data-act="mMain" data-ns="${ns}" data-pid="${pid}" data-mid="${m.id}" title="Définir comme principale">${ic('star')}</button>` : ''}
  <label title="Remplacer">${ic('refresh')}<input type="file" hidden accept="image/*" data-chg="mReplace" data-ns="${ns}" data-pid="${pid}" data-mid="${m.id}"></label>
  <button data-act="mDel" data-ns="${ns}" data-pid="${pid}" data-mid="${m.id}" title="Supprimer">${ic('trash')}</button></div></div>`).join('')}
  <label class="mg-add">${ic('upload')}<b>Importer des photos</b><small>JPG, PNG · plusieurs fichiers</small><input type="file" hidden multiple accept="image/*" data-chg="mUpload" data-ns="${ns}" data-pid="${pid}"></label>
  <button class="mg-add" data-act="mDemo" data-ns="${ns}" data-pid="${pid}">${ic('camera')}<b>Photo de démo</b><small>Générée pour la maquette</small></button>
  <button class="mg-add" data-act="mVideo" data-ns="${ns}" data-pid="${pid}">${ic('video')}<b>Ajouter une vidéo</b><small>MP4 · 2 min max</small></button></div>`;
}
function mediaCtx(d) { if (d.ns === 'pub') return { list: M.pub.data.media, get main() { return M.pub.data.mainMedia; }, set main(v) { M.pub.data.mainMedia = v; }, after: () => mRender('force') }; const p = prop(d.pid); return { list: p.media, get main() { return p.mainMedia; }, set main(v) { p.mainMedia = v; }, after: () => { p.updated = todayISO(); commit(); } }; }
ACT.mCaption = (d, el) => { const c = mediaCtx(d); const m = c.list.find(x => x.id === d.mid); m.caption = el.value; c.after(); };
ACT.mMove = d => { const c = mediaCtx(d); const i = c.list.findIndex(x => x.id === d.mid); const j = i + +d.d; if (j < 0 || j >= c.list.length) return; [c.list[i], c.list[j]] = [c.list[j], c.list[i]]; c.after(); };
ACT.mMain = d => { const c = mediaCtx(d); c.main = d.mid; c.after(); toast('Photo principale mise à jour'); };
ACT.mDel = d => { const c = mediaCtx(d); const i = c.list.findIndex(x => x.id === d.mid); c.list.splice(i, 1); if (c.main === d.mid) c.main = (c.list.find(x => x.type === 'photo') || {}).id || null; c.after(); toast('Média supprimé', 'info'); };
ACT.mDemo = d => { const c = mediaCtx(d); const kinds = ['salon', 'chambre', 'cuisine', 'sdb', 'terrasse', 'maison', 'immeuble']; const k = kinds[c.list.length % kinds.length]; const m = { id: uid('m'), type: 'photo', kind: k, hue: Math.floor(Math.random() * 360), caption: { salon: 'Salon', chambre: 'Chambre', cuisine: 'Cuisine', sdb: 'Salle de bain', terrasse: 'Terrasse', maison: 'Façade', immeuble: 'Façade' }[k] }; c.list.push(m); if (!c.main) c.main = m.id; c.after(); };
ACT.mVideo = d => { const c = mediaCtx(d); c.list.push({ id: uid('m'), type: 'video', kind: 'salon', hue: 200, caption: 'Vidéo de présentation' }); c.after(); toast('Vidéo ajoutée (compression et transcodage simulés)', 'info'); };
ACT.mUpload = async (d, el) => {
  const c = mediaCtx(d); let before = 0, after = 0;
  for (const f of el.files) { try { const r = await optimizeImage(f); before += r.before; after += r.after; const m = { id: uid('m'), type: 'photo', src: r.src, caption: f.name.replace(/\.\w+$/, '') }; c.list.push(m); if (!c.main) c.main = m.id; } catch (_) { toast('Fichier illisible : ' + f.name, 'err'); } }
  c.after(); if (before) toast('Images optimisées : ' + fmtBytes(before) + ' → ' + fmtBytes(after), 'info');
};
ACT.mReplace = async (d, el) => { const f = el.files[0]; if (!f) return; const c = mediaCtx(d); const m = c.list.find(x => x.id === d.mid); try { const r = await optimizeImage(f); m.src = r.src; m.type = 'photo'; c.after(); toast('Photo remplacée'); } catch (_) { toast('Image illisible', 'err'); } };

/* Disponibilités */
SCR.ownerAvail = ({ id }) => {
  const p = prop(id); const bks = S.bookings.filter(b => b.propertyId === p.id && [...BLOCKING, 'attente'].includes(b.status) && b.end >= todayISO());
  return hdr('Disponibilités', { sub: esc(p.title) }) + `<div class="body pad" data-scroll="main"><p class="muted small">Touchez un jour libre pour le bloquer, ou un jour bloqué pour le libérer. Les jours réservés ne peuvent pas être modifiés.</p>
  ${calHTML('oa-' + p.id, p.id, { act: 'toggleBlock', ownerMode: true })}
  <h4>Périodes bloquées</h4>${(p.blocked || []).map((r, i) => `<div class="li card">${ic('ban')}<div class="li-main">${fmtDate(r.start)} → ${fmtDate(r.end)}<small>${esc(r.note || 'Indisponible')}</small></div><button class="hdr-btn" data-act="unblock" data-id="${p.id}" data-i="${i}">${ic('trash')}</button></div>`).join('') || '<p class="muted small">Aucune période bloquée</p>'}
  <form data-submit="blockRange" class="form card"><input type="hidden" name="id" value="${p.id}"><b>Bloquer une période</b><div class="grid2"><input class="inp" type="date" name="start" min="${todayISO()}" required><input class="inp" type="date" name="end" min="${todayISO()}" required></div><input class="inp" name="note" placeholder="Motif (travaux, usage personnel…)"><button class="btn sec block">Bloquer</button></form>
  <h4>Réservations à venir</h4>${bks.map(b => bookingCard(b, true)).join('') || '<p class="muted small">Aucune</p>'}</div>`;
};
ACT.toggleBlock = d => {
  const p = prop(d.pid); const day = d.day; const st = dayStatus(p.id, day);
  if (st === 'booked') { toast('Jour réservé : modification impossible', 'err'); return; }
  p.blocked = p.blocked || [];
  const i = p.blocked.findIndex(r => r.start <= day && day < r.end);
  if (i >= 0) { const r = p.blocked[i]; const parts = []; if (r.start < day) parts.push({ start: r.start, end: day, note: r.note }); if (addDays(day, 1) < r.end) parts.push({ start: addDays(day, 1), end: r.end, note: r.note }); p.blocked.splice(i, 1, ...parts); }
  else { p.blocked.push({ start: day, end: addDays(day, 1), note: 'Indisponible' }); p.blocked.sort((a, b) => a.start.localeCompare(b.start)); const merged = []; p.blocked.forEach(r => { const l = merged[merged.length - 1]; if (l && l.end >= r.start && l.note === r.note) l.end = r.end > l.end ? r.end : l.end; else merged.push(Object.assign({}, r)); }); p.blocked = merged; }
  commit();
};
ACT.unblock = d => { prop(d.id).blocked.splice(+d.i, 1); commit(); };
ACT.blockRange = o => {
  if (o.end <= o.start) { toast('La date de fin doit suivre la date de début', 'err'); return; }
  const p = prop(o.id); const cf = conflicts(p.id, o.start, o.end).filter(c => c.type === 'booking');
  if (cf.length) { toast('Une réservation existe sur cette période', 'err'); return; }
  p.blocked = p.blocked || []; p.blocked.push({ start: o.start, end: o.end, note: o.note || 'Indisponible' });
  S.savedSearches && 0; commit(); toast('Période bloquée');
};

/* Statistiques */
SCR.ownerStats = ({ id }) => {
  const u = me(); const props = id ? [prop(id)] : propsManagedBy(u); const series = viewsSeries(props, 30);
  const views = series.reduce((a, d) => a + d.v, 0); const fav = props.reduce((a, p) => a + p.favCount, 0); const contacts = props.reduce((a, p) => a + p.contacts, 0);
  const ids = props.map(p => p.id); const req = S.bookings.filter(b => ids.includes(b.propertyId)).length; const conf = S.bookings.filter(b => ids.includes(b.propertyId) && ['confirmee', 'encours', 'terminee'].includes(b.status)).length;
  const funnel = [['Vues (30 j)', views], ['Mises en favori', fav], ['Contacts', contacts], ['Demandes', req], ['Réservations', conf]];
  const rev = Array.from({ length: 6 }, (_, i) => { const d = new Date(TODAY); d.setMonth(d.getMonth() - 5 + i); const k = isoOf(d).slice(0, 7); const v = S.bookings.filter(b => ids.includes(b.propertyId) && b.payment && new Date(b.payment.at).toISOString().slice(0, 7) === k).reduce((a, b) => a + (b.payment.amount || 0), 0) + Math.round(seeded(k + ids.join())() * props.length * 60000); return { l: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), s: d.toLocaleDateString('fr-FR', { month: 'short' }), v }; });
  return hdr('Statistiques', { sub: id ? esc(prop(id).title) : 'Tous vos logements' }) + `<div class="body pad" data-scroll="main">
  <div class="card"><h4>Vues par jour (30 j)</h4>${barChart(series, { label: 'Vues par jour', h: 130 })}</div>
  <div class="card"><h4>Entonnoir de conversion</h4><div class="funnel">${funnel.map(([l, v], i) => `<div><span>${l}</span><i><b style="width:${Math.max(3, v / Math.max(1, funnel[0][1]) * 100)}%"></b></i><em>${NF.format(v)}${i ? ' <small>(' + (v / Math.max(1, funnel[i - 1][1]) * 100).toFixed(0) + ' %)</small>' : ''}</em></div>`).join('')}</div></div>
  <div class="card"><h4>Revenus encaissés (6 mois)</h4>${barChart(rev, { label: 'Revenus mensuels', fmt: money, fmtAxis: v => moneyShort(v) })}</div>
  ${!id ? `<div class="card"><h4>Par logement</h4><table class="mini-tbl"><tr><th>Logement</th><th>Vues</th><th>Fav.</th><th>Rés.</th></tr>${props.filter(p => p.status === 'publiee').sort((a, b) => b.views - a.views).map(p => `<tr data-act="mGo" data-s="ownerStats" data-id="${p.id}"><td>${esc(p.title.split(' – ')[0])}</td><td>${p.views}</td><td>${p.favCount}</td><td>${S.bookings.filter(b => b.propertyId === p.id && ['confirmee', 'encours', 'terminee'].includes(b.status)).length}</td></tr>`).join('')}</table></div>` : ''}</div>`;
};

/* ---------------- Demandes de réservation ---------------- */
function requestCard(b) {
  const p = prop(b.propertyId); const t = user(b.tenantId); const q = b.quote || quote(p, b.unitType || p.period, b.units, b.promo);
  const cf = conflicts(p.id, b.start, b.end, b.id);
  return `<div class="req-card"><div class="row-between"><div class="req-user">${avatar(t)}<div><b>${esc(fullName(t))}</b><small>${t.verifiedPhone ? '✓ Tél.' : ''} ${t.verifiedEmail ? '✓ E-mail' : ''} ${t.verifiedId ? '✓ Identité' : ''} · membre depuis ${fmtDate(t.created)}</small></div></div>${tag(BOOKING_STATUS[b.status])}</div>
  <div class="req-prop" data-act="mGo" data-s="ownerBooking" data-id="${b.id}"><b>${esc(p.title)}</b><small>${ic('cal')} ${fmtDate(b.start)} → ${fmtDate(b.end)} · ${b.units} ${b.unitType || p.period}${b.guests > 1 ? ' · ' + b.guests + ' pers.' : ''}</small><small>${ic('wallet')} ${money(q.dueNow)} à la signature</small></div>
  ${b.message ? `<p class="req-msg">« ${esc(b.message)} »</p>` : ''}${cf.length ? `<div class="alert red sm">${ic('ban')} Conflit avec une réservation existante</div>` : ''}
  ${b.status === 'attente' ? `<div class="btn-row"><button class="btn sec sm" data-act="reqRefuse" data-id="${b.id}">Refuser</button><button class="btn sec sm" data-act="contactTenant" data-id="${b.id}">${ic('chat')}</button><button class="btn pri sm" data-act="reqAccept" data-id="${b.id}" ${cf.length ? 'disabled' : ''}>Accepter</button></div>` : ''}</div>`;
}
SCR.ownerRequests = () => {
  const u = me(); const ids = propsManagedBy(u).map(p => p.id); const t = M.reqTab || 'attente';
  const all = S.bookings.filter(b => ids.includes(b.propertyId));
  const groups = { attente: ['attente'], avenir: ['acceptee', 'confirmee'], encours: ['encours'], historique: ['terminee', 'annulee', 'refusee', 'litige'] };
  const list = all.filter(b => groups[t].includes(b.status)).sort((a, b) => a.start.localeCompare(b.start));
  return rootHdr('Réservations', 'Demandes et suivi') + `<div class="tabs-line">${[['attente', 'En attente'], ['avenir', 'À venir'], ['encours', 'En cours'], ['historique', 'Historique']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="reqTab" data-t="${k}">${l}<i>${all.filter(b => groups[k].includes(b.status)).length}</i></button>`).join('')}</div>
  <div class="body pad" data-scroll="main">${t === 'attente' ? list.map(requestCard).join('') : list.map(b => bookingCard(b, true)).join('')}${list.length ? '' : empty('cal', 'Rien à afficher', t === 'attente' ? 'Les nouvelles demandes de réservation apparaîtront ici.' : '')}</div>`;
};
ACT.reqTab = d => { M.reqTab = d.t; mRender(true); };
ACT.contactTenant = d => { const b = booking(d.id); const u = me(); let c = S.conversations.find(x => x.participants.includes(u.id) && x.participants.includes(b.tenantId) && x.propertyId === b.propertyId); if (!c) { c = { id: uid('c'), participants: [u.id, b.tenantId], propertyId: b.propertyId, bookingId: b.id, blockedBy: null, reported: false, messages: [] }; S.conversations.unshift(c); } commit(); mGo('chat', { id: c.id }); };
ACT.reqAccept = d => {
  const b = booking(d.id); const p = prop(b.propertyId);
  if (conflicts(p.id, b.start, b.end, b.id).length) { toast('Conflit de dates : impossible d\'accepter', 'err'); return; }
  setBookingStatus(b, 'acceptee', me().id, 'Demande acceptée par ' + fullName(me()));
  notify(b.tenantId, 'booking', 'Demande acceptée 🎉', 'Votre demande pour « ' + p.title + ' » est acceptée. Payez pour confirmer.', { s: 'bookingDetail', p: { id: b.id } });
  S.bookings.filter(x => x.id !== b.id && x.propertyId === p.id && x.status === 'attente' && overlaps(b.start, b.end, x.start, x.end)).forEach(x => { setBookingStatus(x, 'refusee', 'system', 'Période attribuée à un autre locataire'); x.refuseReason = 'Période attribuée à un autre locataire'; notify(x.tenantId, 'booking', 'Demande refusée', 'La période demandée pour « ' + p.title + ' » n\'est plus disponible.', { s: 'bookingDetail', p: { id: x.id } }); });
  commit(); toast('Demande acceptée — le locataire est notifié');
};
ACT.reqRefuse = d => openSheet(`<form data-submit="reqRefuseOk" class="form"><input type="hidden" name="id" value="${d.id}"><div class="radio-list">${['Logement plus disponible à ces dates', 'Durée ne correspondant pas à mes conditions', 'Dossier incomplet', 'Autre'].map((r, i) => `<label><input type="radio" name="reason" value="${r}" ${i ? '' : 'checked'}><span>${r}</span></label>`).join('')}</div><textarea class="inp" name="detail" rows="2" placeholder="Message au locataire (facultatif)"></textarea><button class="btn danger block">Refuser la demande</button></form>`, { title: 'Refuser la demande' });
ACT.reqRefuseOk = o => {
  const b = booking(o.id); const p = prop(b.propertyId); b.refuseReason = o.reason + (o.detail ? ' — ' + o.detail : '');
  setBookingStatus(b, 'refusee', me().id, 'Refusée : ' + o.reason); notify(b.tenantId, 'booking', 'Demande refusée', 'Votre demande pour « ' + p.title + ' » a été refusée : ' + o.reason, { s: 'bookingDetail', p: { id: b.id } });
  commit(); closeSheet(); toast('Demande refusée', 'info');
};
SCR.ownerBooking = ({ id }) => {
  const b = booking(id); const p = prop(b.propertyId); const t = user(b.tenantId); const q = b.quote || quote(p, b.unitType || p.period, b.units, b.promo);
  const past = S.bookings.filter(x => x.tenantId === t.id && x.status === 'terminee').length;
  return hdr('Réservation #' + b.id.slice(-5).toUpperCase()) + `<div class="body pad" data-scroll="main">${b.status === 'attente' ? requestCard(b) : `<div class="status-box ${BOOKING_STATUS[b.status].color}">${tag(BOOKING_STATUS[b.status])}</div>`}
  ${pmini(p)}<div class="dates-box"><div><small>Début</small><b>${fmtDate(b.start)}</b></div>${ic('next')}<div><small>Fin</small><b>${fmtDate(b.end)}</b></div></div>
  <section class="d-sec"><h3>Locataire</h3><div class="owner-card">${avatar(t, 'lg')}<div><b>${esc(fullName(t))}</b><small>${esc(t.phone)} · ${esc(t.email)}</small><small>${past} location(s) terminée(s) sur DomiLoc</small></div><button class="btn sm sec" data-act="contactTenant" data-id="${b.id}">${ic('chat')}</button></div></section>
  <section class="d-sec"><h3>Montant</h3>${quoteHTML(q, p)}${b.payment ? `<p class="small">${ic('check')} Payé par ${b.payment.method} · ${b.payment.ref}. Versement au propriétaire 24 h après l'entrée dans les lieux.</p>` : '<p class="small muted">Non payé</p>'}</section>
  <section class="d-sec"><h3>Historique</h3><div class="tl">${b.history.slice().reverse().map(h => `<div><i class="${BOOKING_STATUS[h.status]?.color || 'gray'}"></i><b>${esc(h.note)}</b><small>${fmtDT(h.at)}</small></div>`).join('')}</div></section>
  ${['acceptee', 'confirmee'].includes(b.status) ? `<button class="btn danger-o block" data-act="ownerCancel" data-id="${b.id}">Annuler cette réservation (exceptionnel)</button>` : ''}</div>`;
};
ACT.ownerCancel = d => confirmSheet('Annuler la réservation', 'Le locataire sera intégralement remboursé. Les annulations répétées par le propriétaire peuvent entraîner une suspension.', 'Annuler la réservation', () => {
  const b = booking(d.id); setBookingStatus(b, 'annulee', me().id, 'Annulée par le propriétaire'); b.cancelReason = 'Annulée par le propriétaire'; if (b.payment) b.payment.status = 'rembourse';
  notify(b.tenantId, 'booking', 'Réservation annulée', 'Le propriétaire a annulé « ' + prop(b.propertyId).title + ' ». Remboursement intégral en cours.', { s: 'bookingDetail', p: { id: b.id } }); commit();
}, true);

/* ---------------- Formulaire de publication ---------------- */
const PUB_STEPS = [['gen', 'Général'], ['eq', 'Équipements'], ['fin', 'Tarifs'], ['loc', 'Localisation'], ['media', 'Médias'], ['dispo', 'Règles'], ['recap', 'Récapitulatif']];
function startPublish(id) {
  const p = id ? prop(id) : null;
  const base = p ? JSON.parse(JSON.stringify(p)) : { title: '', description: '', type: 'appartement', furnished: false, bedrooms: 2, salons: 1, bathrooms: 1, toilets: 1, area: 60, buildingFloors: 1, floor: 0, capacity: 4, equipments: [], price: '', currency: 'XOF', period: 'mois', durations: ['mois'], deposit: '', advance: '', fees: '', charges: '', paymentTerms: 'Avance de 3 mois + caution de 2 mois à la signature.', cancelPolicy: 'Annulation gratuite jusqu\'à 7 jours avant le début de la location.', bookingMode: 'validation', country: 'Togo', region: 'Maritime', city: 'Lomé', commune: 'Golfe 3', quartier: 'Tokoin', address: '', lat: 6.156, lng: 1.219, approx: true, media: [], mainMedia: null, availableFrom: todayISO(), otherEq: '' };
  M.pub = { id: id || null, step: 0, data: base, errors: {} };
  mGo('publish');
}
function pubPrice(d) { return +d.price || 0; }
SCR.publish = () => {
  const P = M.pub; if (!P) return hdr('Publier') + '<div class="body">' + empty('home', 'Aucune saisie en cours') + '</div>';
  const d = P.data; const [k, label] = PUB_STEPS[P.step]; const E = P.errors || {};
  const err = f => E[f] ? `<small class="err-txt">${E[f]}</small>` : '';
  const num = (n, l, min = 0, req) => `<label class="field"><span>${l}${req ? ' *' : ''}</span><input class="inp" type="number" min="${min}" name="${n}" id="pb-${n}" value="${esc(d[n])}">${err(n)}</label>`;
  let body = '';
  if (k === 'gen') {
    const reqs = category(d.type)?.required || [];
    body = `<label class="field"><span>Type de logement *</span><div class="chips-row wrap">${S.categories.filter(c => c.active).map(c => `<label class="chip-check"><input type="radio" name="type" value="${c.id}" ${d.type === c.id ? 'checked' : ''} data-chg="pubRerender"><span>${c.icon} ${c.name}</span></label>`).join('')}</div></label>
    <label class="field"><span>Titre de l'annonce *</span><input class="inp" name="title" id="pb-title" maxlength="80" value="${esc(d.title)}" placeholder="Ex. Appartement 2 chambres lumineux – Tokoin">${err('title')}</label>
    <label class="field"><span>Description détaillée *</span><textarea class="inp" name="description" id="pb-desc" rows="5" placeholder="Décrivez le logement, le quartier, l'accès, les points forts…">${esc(d.description)}</textarea><small class="muted">${(d.description || '').length} caractères (50 minimum)</small>${err('description')}</label>
    <div class="field"><span>Ameublement</span><div class="seg"><label><input type="radio" name="furnished" value="non" ${!d.furnished ? 'checked' : ''}><span>Non meublé</span></label><label><input type="radio" name="furnished" value="oui" ${d.furnished ? 'checked' : ''}><span>Meublé</span></label></div></div>
    <div class="grid3">${num('bedrooms', 'Chambres', 0, reqs.includes('bedrooms'))}${num('salons', 'Salons')}${num('bathrooms', 'Salles de bain', 0)}${num('toilets', 'Toilettes')}${num('area', 'Superficie m²', 1, reqs.includes('area'))}${num('capacity', 'Capacité (pers.)', 1)}${num('buildingFloors', 'Étages bâtiment', 1, reqs.includes('floors'))}${num('floor', 'Étage du logement', 0, reqs.includes('floor'))}</div>
    ${reqs.length ? `<p class="hint">${ic('info')} Champs obligatoires pour « ${category(d.type).name} » (configurés par l'administration) : ${reqs.map(r => ({ bedrooms: 'chambres', area: 'superficie', floor: 'étage', floors: 'étages' })[r]).join(', ')}.</p>` : ''}`;
  } else if (k === 'eq') {
    body = `<div class="eq-pick">${S.equipments.filter(e => e.active).map(e => `<label class="chip-check big"><input type="checkbox" name="equipments" value="${e.id}" data-multi ${d.equipments.includes(e.id) ? 'checked' : ''}><span>${e.icon}<b>${e.name}</b></span></label>`).join('')}</div>
    <label class="field"><span>Autre équipement (sera proposé à l'administration)</span><input class="inp" name="otherEq" id="pb-oe" value="${esc(d.otherEq || '')}" placeholder="Ex. Panneaux solaires"></label>`;
  } else if (k === 'fin') {
    const per = d.period;
    body = `<div class="grid2"><label class="field"><span>Prix de location *</span><input class="inp" type="number" min="0" step="500" name="price" id="pb-price" value="${esc(d.price)}">${err('price')}</label><label class="field"><span>Devise</span><select class="inp" name="currency"><option value="XOF">Franc CFA (XOF)</option><option disabled>EUR — bientôt</option></select></label></div>
    <div class="field"><span>Périodicité du prix *</span><div class="seg">${Object.keys(PERIODS).map(x => `<label><input type="radio" name="period" value="${x}" ${per === x ? 'checked' : ''} data-chg="pubRerender"><span>/ ${x}</span></label>`).join('')}</div></div>
    <div class="field"><span>Durées de location acceptées</span><div class="chips-row wrap">${Object.keys(PERIODS).map(x => `<label class="chip-check"><input type="checkbox" name="durations" data-multi value="${x}" ${d.durations.includes(x) ? 'checked' : ''}><span>${PERIOD_LABEL[x]}</span></label>`).join('')}</div></div>
    <div class="grid2">${num('deposit', 'Caution (FCFA)')}${num('advance', 'Avance (FCFA)')}${num('fees', 'Frais supplémentaires')}${num('charges', 'Charges / mois')}</div>
    <button type="button" class="btn ghost sm" data-act="pubSuggest">${ic('sparkle')} Suggérer un prix (assistant)</button><div id="price-sug"></div>
    <label class="field"><span>Conditions de paiement</span><textarea class="inp" name="paymentTerms" id="pb-pt" rows="2">${esc(d.paymentTerms)}</textarea></label>
    <label class="field"><span>Conditions d'annulation</span><textarea class="inp" name="cancelPolicy" id="pb-cp" rows="2">${esc(d.cancelPolicy)}</textarea></label>`;
  } else if (k === 'loc') {
    const regions = Object.keys(LOCATIONS[d.country] || {}); const cities = Object.keys((LOCATIONS[d.country] || {})[d.region] || {}); const communes = Object.keys(((LOCATIONS[d.country] || {})[d.region] || {})[d.city] || {}); const qs = Object.keys((((LOCATIONS[d.country] || {})[d.region] || {})[d.city] || {})[d.commune] || {});
    const sel = (n, l, opts) => `<label class="field"><span>${l}</span><select class="inp" name="${n}" data-chg="pubLoc">${opts.map(o => `<option ${d[n] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
    body = `<div class="grid2">${sel('country', 'Pays', Object.keys(LOCATIONS))}${sel('region', 'Région', regions)}${sel('city', 'Ville', cities)}${sel('commune', 'Commune', communes)}</div>${sel('quartier', 'Quartier', qs)}
    <label class="field"><span>Adresse *</span><input class="inp" name="address" id="pb-addr" value="${esc(d.address)}" placeholder="N°, rue, repère">${err('address')}</label>
    <div class="field"><span>Position sur la carte — touchez la carte ou déplacez le repère</span><div id="pub-map" class="mini-map tall"></div><small class="muted" id="pub-coords">GPS : ${(+d.lat).toFixed(5)}, ${(+d.lng).toFixed(5)}</small></div>
    <button type="button" class="btn sec sm" data-act="pubMyPos">${ic('locate')} Utiliser ma position actuelle</button>
    <label class="switch-row"><span>${ic('lock')} Afficher une localisation approximative au public</span><input type="checkbox" class="switch" name="approx" ${d.approx !== false ? 'checked' : ''}></label><p class="hint">L'adresse exacte n'est communiquée qu'aux locataires dont la réservation est confirmée.</p>`;
  } else if (k === 'media') {
    body = `<p class="muted small">Ajoutez au moins 3 photos nettes (façade, pièces principales). La première photo principale apparaît dans les résultats.</p>${err('media')}${mediaManagerHTML(d.media, d.mainMedia, 'pub', '')}
    <div class="card tour-hint">${ic('cube')}<div><b>Visite virtuelle 360° / 3D</b><small>Après l'enregistrement, lancez une capture guidée depuis la fiche de gestion du logement.</small></div></div>`;
  } else if (k === 'dispo') {
    body = `<div class="field"><span>Mode de réservation</span><div class="radio-list"><label><input type="radio" name="bookingMode" value="validation" ${d.bookingMode === 'validation' ? 'checked' : ''}><span><b>Avec validation</b><small>Vous acceptez ou refusez chaque demande (recommandé pour les locations longues).</small></span></label><label><input type="radio" name="bookingMode" value="instant" ${d.bookingMode === 'instant' ? 'checked' : ''}><span><b>Réservation instantanée</b><small>Confirmée automatiquement si les dates sont libres et le paiement effectué.</small></span></label></div></div>
    <label class="field"><span>Disponible à partir du</span><input class="inp" type="date" name="availableFrom" id="pb-af" min="${todayISO()}" value="${esc(d.availableFrom || todayISO())}"></label>
    <p class="hint">Vous pourrez bloquer des périodes depuis le calendrier des disponibilités après publication.</p>`;
  } else {
    const checks = pubChecks(d);
    body = `<div class="recap"><div class="thumb wide" style="background-image:url('${d.media.length ? mediaSrc(d.media.find(m => m.id === d.mainMedia) || d.media[0]) : scene('maison', 100)}')"></div>
    <h3>${esc(d.title || 'Sans titre')}</h3><p class="muted">${category(d.type).name} · ${d.furnished ? 'meublé' : 'non meublé'} · ${d.bedrooms} ch. · ${d.area} m² · ${esc(d.quartier)}, ${esc(d.city)}</p>
    <p><b>${money(pubPrice(d))}</b> / ${d.period} · caution ${money(+d.deposit)} · ${d.bookingMode === 'instant' ? 'réservation instantanée' : 'sur validation'}</p>
    <p class="small">${d.equipments.map(e => equipment(e)?.icon + ' ' + equipment(e)?.name).join(' · ') || 'Aucun équipement'}</p></div>
    <h4>Contrôles automatiques avant soumission</h4><div class="checks">${checks.map(c => `<div class="${c.ok ? 'ok' : c.warn ? 'warn' : 'ko'}">${ic(c.ok ? 'check' : 'alert')}<span>${c.l}</span></div>`).join('')}</div>
    <p class="hint">${ic('info')} Votre annonce sera vérifiée par l'équipe DomiLoc avant publication (cohérence, qualité des photos, doublons).</p>`;
  }
  return hdr(P.id ? 'Modifier l\'annonce' : 'Publier un logement', { sub: 'Étape ' + (P.step + 1) + '/' + PUB_STEPS.length + ' · ' + label, actions: `<button class="hdr-btn" data-act="pubDraft" title="Enregistrer le brouillon">${ic('file')}</button>` }) +
    `<div class="pub-steps">${PUB_STEPS.map((s, i) => `<button class="${i === P.step ? 'on' : i < P.step ? 'done' : ''}" data-act="pubStep" data-i="${i}">${i < P.step ? '✓' : i + 1}<span>${s[1]}</span></button>`).join('')}</div>
  <div class="body pad" data-scroll="main"><form class="form" id="pub-form" data-inp="pubForm" onsubmit="return false">${body}</form><div class="foot-space"></div></div>
  <div class="d-bar">${P.step ? '<button class="btn sec" data-act="pubPrev">Précédent</button>' : '<button class="btn sec" data-act="pubDraft">Brouillon</button>'}
  ${P.step < PUB_STEPS.length - 1 ? '<button class="btn pri" data-act="pubNext">Suivant</button>' : `<button class="btn pri" data-act="pubSubmit">${ic('send')} Soumettre pour validation</button>`}</div>`;
};
function pubChecks(d) {
  const photos = d.media.filter(m => m.type === 'photo').length;
  const dup = S.properties.find(p => p.id !== M.pub.id && norm(p.title) === norm(d.title));
  return [
    { ok: (d.title || '').length >= 10, l: 'Titre explicite (10 caractères min.)' },
    { ok: (d.description || '').length >= 50, l: 'Description suffisante (50 caractères min.)' },
    { ok: pubPrice(d) > 0, l: 'Prix renseigné' },
    { ok: photos >= 3, l: photos + ' photo(s) — minimum 3' },
    { ok: !!d.address && Math.abs(d.lat) > 0 && Math.abs(d.lng) > 0, l: 'Adresse et coordonnées GPS valides' },
    { ok: !dup, warn: !!dup, l: dup ? 'Doublon potentiel : « ' + dup.title + ' »' : 'Aucun doublon détecté' },
    { ok: !(d.period === 'mois' && pubPrice(d) > 0 && pubPrice(d) < 10000), warn: true, l: 'Prix cohérent avec la périodicité' }
  ];
}
function pubMerge() {
  const f = $('#pub-form'); if (!f) return; const o = formObj(f); const d = M.pub.data;
  for (const k in o) {
    if (['equipments', 'durations'].includes(k)) d[k] = [].concat(o[k]).filter(Boolean);
    else if (k === 'furnished') d.furnished = o[k] === 'oui';
    else if (k === 'approx') d.approx = o[k] === 'on';
    else if (['bedrooms', 'salons', 'bathrooms', 'toilets', 'area', 'buildingFloors', 'floor', 'capacity'].includes(k)) d[k] = o[k] === '' ? '' : +o[k];
    else d[k] = o[k];
  }
  if (f.querySelector('[name=equipments]') && !o.equipments) d.equipments = [];
  if (f.querySelector('[name=durations]') && !o.durations) d.durations = [];
  if (f.querySelector('[name=approx]') && o.approx === '') d.approx = false;
}
ACT.pubForm = () => pubMerge();
ACT.pubRerender = () => { pubMerge(); if (M.pub.data.period && !M.pub.data.durations.includes(M.pub.data.period)) M.pub.data.durations.push(M.pub.data.period); mRender('force'); };
ACT.pubLoc = (d, el) => {
  pubMerge(); const D = M.pub.data; const n = el.name;
  if (n === 'country') { D.region = Object.keys(LOCATIONS[D.country])[0]; }
  if (n === 'country' || n === 'region') D.city = Object.keys(LOCATIONS[D.country][D.region])[0];
  if (['country', 'region', 'city'].includes(n)) D.commune = Object.keys(LOCATIONS[D.country][D.region][D.city])[0];
  if (n !== 'quartier') D.quartier = Object.keys(LOCATIONS[D.country][D.region][D.city][D.commune])[0];
  const c = LOCATIONS[D.country][D.region][D.city][D.commune][D.quartier]; D.lat = c[0]; D.lng = c[1];
  mRender('force'); MOUNT.publish();
};
function pubValidate(step) {
  const d = M.pub.data; const E = {}; const k = PUB_STEPS[step][0];
  if (k === 'gen') {
    if ((d.title || '').trim().length < 10) E.title = 'Titre trop court (10 caractères min.)';
    if ((d.description || '').trim().length < 50) E.description = 'Description trop courte (50 caractères min.)';
    (category(d.type)?.required || []).forEach(r => { const f = r === 'floors' ? 'buildingFloors' : r; if (d[f] === '' || d[f] == null || (r !== 'floor' && +d[f] <= 0)) E[f] = 'Obligatoire pour ce type'; });
  }
  if (k === 'fin' && !(pubPrice(d) > 0)) E.price = 'Indiquez un prix';
  if (k === 'loc' && !(d.address || '').trim()) E.address = 'Adresse obligatoire';
  if (k === 'media' && d.media.filter(m => m.type === 'photo').length < 3) E.media = '<div class="alert red sm">Ajoutez au moins 3 photos.</div>';
  M.pub.errors = E; return !Object.keys(E).length;
}
ACT.pubNext = () => { pubMerge(); if (!pubValidate(M.pub.step)) { mRender('force'); toast('Corrigez les champs signalés', 'err'); return; } M.pub.step++; mRender(false); };
ACT.pubPrev = () => { pubMerge(); M.pub.errors = {}; M.pub.step--; mRender(false); };
ACT.pubStep = d => { pubMerge(); const i = +d.i; if (i > M.pub.step) { for (let s = M.pub.step; s < i; s++) if (!pubValidate(s)) { M.pub.step = s; mRender(false); toast('Complétez cette étape d\'abord', 'err'); return; } } M.pub.errors = {}; M.pub.step = i; mRender(false); };
ACT.pubSuggest = () => {
  pubMerge(); const d = M.pub.data; const comps = S.properties.filter(p => p.type === d.type && p.city === d.city && p.period === d.period && p.status === 'publiee');
  const el = $('#price-sug'); if (!el) return;
  if (!comps.length) { el.innerHTML = '<p class="hint">Pas assez de logements comparables pour une suggestion.</p>'; return; }
  const perM2 = comps.reduce((a, p) => a + p.price / p.area, 0) / comps.length; const sug = Math.round(perM2 * (+d.area || 50) / 1000) * 1000;
  el.innerHTML = `<div class="assist">${ic('sparkle')}<div><b>Prix suggéré : ${money(sug)} / ${d.period}</b><span>Basé sur ${comps.length} logement(s) comparable(s) à ${esc(d.city)} (${money(Math.round(perM2))}/m²).</span><button class="btn sm pri" data-act="pubUseSug" data-v="${sug}">Utiliser ce prix</button></div></div>`;
};
ACT.pubUseSug = d => { M.pub.data.price = +d.v; const v = +d.v; const per = M.pub.data.period; M.pub.data.deposit = per === 'mois' ? v * 2 : Math.round(v / 2); M.pub.data.advance = per === 'mois' ? v * 3 : 0; M.pub.data.fees = Math.round(v * .1); mRender('force'); };
ACT.pubMyPos = () => { M.pub.data.lat = SIM_POS[0]; M.pub.data.lng = SIM_POS[1]; toast('Position actuelle utilisée (simulée : Tokoin)'); mRender('force'); MOUNT.publish(); };
MOUNT.publish = () => {
  if (!M.pub || PUB_STEPS[M.pub.step][0] !== 'loc') return;
  const el = $('#pub-map'); if (!el) return;
  const d = M.pub.data; const k = MapKit.create(el, { center: [+d.lat, +d.lng], zoom: 15 });
  const setPos = ll => { d.lat = +ll[0].toFixed(6); d.lng = +ll[1].toFixed(6); const c = $('#pub-coords'); if (c) c.textContent = 'GPS : ' + d.lat.toFixed(5) + ', ' + d.lng.toFixed(5); };
  k.pin([+d.lat, +d.lng], setPos); k.onClick(ll => { k.pin(ll, setPos); setPos(ll); });
};
function pubSave(status) {
  pubMerge(); const d = M.pub.data; const u = me(); let p = M.pub.id ? prop(M.pub.id) : null;
  const fields = ['title', 'description', 'type', 'furnished', 'bedrooms', 'salons', 'bathrooms', 'toilets', 'area', 'buildingFloors', 'floor', 'capacity', 'equipments', 'price', 'currency', 'period', 'durations', 'deposit', 'advance', 'fees', 'charges', 'paymentTerms', 'cancelPolicy', 'bookingMode', 'country', 'region', 'city', 'commune', 'quartier', 'address', 'lat', 'lng', 'approx', 'media', 'mainMedia', 'availableFrom'];
  if (!p) {
    p = { id: uid('p'), ownerId: u.agencyId ? agency(u.agencyId).ownerId : u.id, agencyId: u.agencyId || null, agentId: u.roles.includes('agent') ? u.id : null, verified: false, views: 0, favCount: 0, contacts: 0, created: todayISO(), tourId: null, blocked: [], hue: Math.floor(Math.random() * 360), rejectReason: null };
    S.properties.unshift(p); M.pub.id = p.id;
  }
  fields.forEach(f => p[f] = JSON.parse(JSON.stringify(d[f] ?? null)));
  ['price', 'deposit', 'advance', 'fees', 'charges', 'lat', 'lng'].forEach(f => p[f] = +p[f] || 0);
  ['bedrooms', 'salons', 'bathrooms', 'toilets', 'area', 'buildingFloors', 'floor', 'capacity'].forEach(f => p[f] = +p[f] || 0);
  if (!p.durations.length) p.durations = [p.period];
  if (!p.mainMedia && p.media.length) p.mainMedia = p.media[0].id;
  if (d.otherEq) audit('Suggestion d\'équipement', p.id, d.otherEq);
  p.status = status; p.updated = todayISO(); if (status === 'attente') { p.rejectReason = null; audit('Annonce soumise', p.id, fullName(u)); }
  commit(); return p;
}
ACT.pubDraft = () => { const p = pubSave(M.pub.id && prop(M.pub.id).status !== 'brouillon' ? prop(M.pub.id).status : 'brouillon'); toast('Brouillon enregistré'); M.pub.id = p.id; };
ACT.pubSubmit = () => {
  pubMerge(); for (let s = 0; s < PUB_STEPS.length - 1; s++) if (!pubValidate(s)) { M.pub.step = s; mRender(false); toast('Complétez l\'étape « ' + PUB_STEPS[s][1] + ' »', 'err'); return; }
  const p = pubSave('attente'); M.pub = null;
  M.stack = [{ s: 'ownerListings', p: {} }, { s: 'ownerListing', p: { id: p.id } }]; mRender(false);
  toast('Annonce soumise ! Validation sous 24 h.');
};

/* ---------------- Capture 360° / 3D guidée ---------------- */
function startCapture(pid) {
  M.cap = { pid: pid || null, type: '3d', step: pid ? 'type' : 'select', rooms: [], room: null, light: 80, realCam: false };
  mGo('capture');
}
const CAP_TIPS = [['sun', 'Lumière', 'Ouvrez rideaux et volets, allumez toutes les lumières. Évitez le contre-jour.'], ['move', 'Mouvements', 'Tournez lentement sur vous-même, téléphone à hauteur des yeux, en gardant 30 % de recouvrement.'], ['locate', 'Distance', 'Placez-vous au centre de la pièce, à au moins 1,5 m des murs.'], ['layers', 'Couverture', 'Capturez murs, sol et plafond ; chaque pièce demande 8 prises. Fermez les portes des pièces non capturées.']];
SCR.capture = () => {
  const C = M.cap; const u = me(); const p = C.pid ? prop(C.pid) : null;
  if (C.step === 'select') {
    const props = propsManagedBy(u).filter(x => !['archivee'].includes(x.status));
    return hdr('Capture de visite virtuelle') + `<div class="body pad" data-scroll="main"><p class="muted">1. Sélectionnez le logement à capturer.</p>${props.map(x => `<button class="li card" data-act="capPick" data-id="${x.id}"><div class="thumb sm" style="background-image:url('${propCover(x)}')"></div><div class="li-main">${esc(x.title)}<small>${latestTour(x) ? 'Visite existante : ' + TOUR_STATUS[latestTour(x).status].label : 'Aucune visite'}</small></div>${ic('next')}</button>`).join('')}</div>`;
  }
  if (C.step === 'type') return hdr('Type de visite', { sub: esc(p.title) }) + `<div class="body pad" data-scroll="main"><div class="role-pick col">
    <button class="${C.type === '360' ? 'on' : ''}" data-act="capType" data-t="360">${ic('rotate')}<b>Visite 360°</b><small>Panoramas pièce par pièce, navigation entre points de vue. Traitement rapide (~2 min).</small></button>
    <button class="${C.type === '3d' ? 'on' : ''}" data-act="capType" data-t="3d">${ic('cube')}<b>Reconstruction 3D + 360°</b><small>Photogrammétrie / Gaussian Splatting : maquette 3D navigable + panoramas. Traitement serveur (~15 min).</small></button></div>
    <p class="hint">${ic('info')} Une vidéo ordinaire ne garantit pas une reconstruction 3D complète : suivez attentivement les consignes de capture.</p><button class="btn pri block" data-act="capGo" data-s="guide">Continuer</button></div>`;
  if (C.step === 'guide') return hdr('Consignes de capture') + `<div class="body pad" data-scroll="main"><div class="tips">${CAP_TIPS.map(([i, t, s]) => `<div>${ic(i)}<b>${t}</b><small>${s}</small></div>`).join('')}</div><button class="btn pri block" data-act="capRooms">J'ai compris, commencer</button></div>`;
  if (C.step === 'rooms') {
    const done = C.rooms.filter(r => r.shots > 0).length;
    return hdr('Pièces à capturer', { sub: done + '/' + C.rooms.length + ' capturées' }) + `<div class="body pad" data-scroll="main"><p class="muted small">Touchez une pièce pour lancer le viseur. Vous pouvez ajouter des pièces.</p>
    ${C.rooms.map((r, i) => { const cov = Math.round(r.shots / 8 * 100); return `<button class="li card" data-act="capShoot" data-i="${i}"><span class="ring-sm" style="--p:${cov}">${cov}%</span><div class="li-main">${esc(r.name)}<small>${r.shots ? r.shots + '/8 prises · ' + (cov >= 60 ? 'couverture suffisante' : 'couverture insuffisante') : 'À capturer'}</small></div>${r.shots >= 8 ? '<span class="tag green">OK</span>' : r.shots ? '<span class="tag amber">Partiel</span>' : ic('camera')}</button>`; }).join('')}
    <button class="btn ghost block" data-act="capAddRoom">${ic('plus')} Ajouter une pièce</button></div><div class="d-bar"><button class="btn sec" data-act="capGo" data-s="guide">Consignes</button><button class="btn pri" data-act="capGo" data-s="review" ${done ? '' : 'disabled'}>Vérifier les fichiers</button></div>`;
  }
  if (C.step === 'shoot') {
    const r = C.rooms[C.room]; const cov = r.shots / 8; const dark = C.light < 45;
    const guide = r.shots >= 8 ? 'Pièce complète ✓' : dark ? 'Trop sombre — allumez les lumières' : ['Visez le mur face à vous', 'Tournez lentement vers la droite ➜', 'Continuez vers la droite ➜', 'Inclinez légèrement vers le plafond ⬆', 'Revenez à l\'horizontale', 'Tournez vers la droite ➜', 'Visez le sol ⬇', 'Dernière prise : coin restant'][r.shots];
    return `<div class="body viewfinder" id="vf"><div class="vf-feed" id="vf-feed" style="background-image:url('${scene(r.kind, (p.hue || 100) + C.room * 20)}');background-position:${cov * 100}% 50%;filter:brightness(${C.light / 80})"></div>${C.realCam ? '<video id="vf-video" autoplay playsinline muted></video>' : ''}
    <div class="vf-top"><button class="round-btn" data-act="capGo" data-s="rooms">${ic('close')}</button><b>${esc(r.name)}</b><button class="round-btn ${C.realCam ? 'on' : ''}" data-act="capCam" title="Caméra réelle">${ic('camera')}</button></div>
    <div class="vf-guide ${dark ? 'warn' : ''}">${guide}</div><div class="vf-cross"></div><div class="vf-level"><i></i></div>
    <div class="vf-gauges"><div><small>Luminosité</small><i><b style="width:${C.light}%;background:${dark ? '#f59e0b' : '#22c55e'}"></b></i></div><div><small>Stabilité</small><i><b style="width:${70 + (r.shots * 7) % 25}%"></b></i></div></div>
    <div class="vf-ring">${Array.from({ length: 8 }, (_, i) => `<i class="${i < r.shots ? 'on' : ''}" style="transform:rotate(${i * 45}deg)"></i>`).join('')}<span>${r.shots}/8</span></div>
    <div class="vf-bottom"><button class="btn sm light" data-act="capLight">${ic('sun')} ${dark ? 'Lumières allumées' : 'Simuler pièce sombre'}</button><button class="shutter" data-act="capShot" ${r.shots >= 8 ? 'disabled' : ''} aria-label="Déclencher"></button><button class="btn sm light" data-act="capGo" data-s="rooms">${r.shots >= 8 ? 'Terminer' : 'Arrêter'}</button></div></div>`;
  }
  if (C.step === 'review') {
    const files = C.rooms.reduce((a, r) => a + r.shots, 0); const weak = C.rooms.filter(r => r.shots && r.shots < 5); const skipped = C.rooms.filter(r => !r.shots);
    return hdr('Vérification des fichiers') + `<div class="body pad" data-scroll="main"><div class="kpis sm"><div class="kpi"><b>${files}</b><small>Images</small></div><div class="kpi"><b>${(files * (C.type === '3d' ? 6.2 : 3.1)).toFixed(0)} Mo</b><small>Volume</small></div><div class="kpi"><b>${C.rooms.filter(r => r.shots).length}</b><small>Pièces</small></div></div>
    ${C.rooms.filter(r => r.shots).map(r => `<div class="rv-room"><b>${esc(r.name)}</b><div class="thumbs">${Array.from({ length: r.shots }, (_, i) => `<span style="background-image:url('${scene(r.kind, (p.hue || 100) + C.rooms.indexOf(r) * 20)}');background-position:${i / 7 * 100}% 50%"></span>`).join('')}</div><small class="${r.shots < 5 ? 'err-txt' : 'ok-txt'}">Couverture ${Math.round(r.shots / 8 * 100)} % · netteté ${r.dark ? 'faible (pièce sombre)' : 'bonne'}</small></div>`).join('')}
    ${weak.length ? `<div class="alert amber">${ic('alert')} Couverture faible : ${weak.map(r => r.name).join(', ')}. Le traitement risque d'échouer — recapturez ces pièces.</div>` : `<div class="alert green">${ic('check')} Qualité suffisante pour le traitement.</div>`}
    ${skipped.length ? `<p class="small muted">Non capturées (ignorées) : ${skipped.map(r => r.name).join(', ')}</p>` : ''}</div>
    <div class="d-bar"><button class="btn sec" data-act="capGo" data-s="rooms">Recapturer</button><button class="btn pri" data-act="capUpload">${ic('upload')} Envoyer au serveur</button></div>`;
  }
  if (C.step === 'upload') return hdr('Envoi en cours', { back: false }) + `<div class="body pad center-col" data-scroll="main"><div class="big-ic">${ic('upload')}</div><h3>Envoi des fichiers</h3><p class="muted">Ne fermez pas l'application. L'envoi reprend automatiquement en cas de coupure réseau.</p><div class="progress lg"><b id="up-bar" style="width:0%"></b></div><span id="up-txt">0 %</span></div>`;
  return '';
};
ACT.capPick = d => { M.cap.pid = d.id; M.cap.step = 'type'; mRender(false); };
ACT.capType = d => { M.cap.type = d.t; mRender('force'); };
ACT.capGo = d => { stopCam(); M.cap.step = d.s; mRender(false); };
ACT.capRooms = () => { const C = M.cap; if (!C.rooms.length) C.rooms = tourRooms(prop(C.pid)).map(r => ({ id: r.id, name: r.name, kind: r.kind, shots: 0 })); C.step = 'rooms'; mRender(false); };
ACT.capAddRoom = () => openSheet(`<form data-submit="capAddRoomOk" class="form"><label class="field"><span>Nom de la pièce</span><input class="inp" name="name" required placeholder="Ex. Bureau, Véranda"></label><label class="field"><span>Type</span><select class="inp" name="kind"><option value="salon">Pièce de vie</option><option value="chambre">Chambre</option><option value="cuisine">Cuisine</option><option value="sdb">Salle d'eau</option><option value="ext">Extérieur</option></select></label><button class="btn pri block">Ajouter</button></form>`, { title: 'Ajouter une pièce' });
ACT.capAddRoomOk = o => { M.cap.rooms.push({ id: uid('r'), name: o.name, kind: o.kind, shots: 0 }); closeSheet(); mRender(false); };
ACT.capShoot = d => { M.cap.room = +d.i; M.cap.step = 'shoot'; M.cap.light = 80; mRender(false); };
ACT.capShot = () => {
  const C = M.cap; const r = C.rooms[C.room]; if (r.shots >= 8) return;
  if (C.light < 45) { r.dark = true; toast('Image sombre : qualité réduite', 'info'); }
  r.shots++; const vf = $('#vf'); if (vf) { vf.classList.add('flash'); }
  setTimeout(() => { mRender('force'); if (C.realCam) startCam(); }, 160);
};
ACT.capLight = () => { M.cap.light = M.cap.light < 45 ? 80 : 30; mRender('force'); if (M.cap.realCam) startCam(); };
ACT.capCam = async () => { M.cap.realCam = !M.cap.realCam; if (!M.cap.realCam) stopCam(); mRender('force'); if (M.cap.realCam) startCam(); };
async function startCam() {
  const v = $('#vf-video'); if (!v) return;
  try { if (!M._stream) M._stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); v.srcObject = M._stream; }
  catch (e) { M.cap.realCam = false; toast('Caméra indisponible ou refusée — mode simulé', 'info'); mRender('force'); }
}
function stopCam() { if (M._stream) { M._stream.getTracks().forEach(t => t.stop()); M._stream = null; } }
ACT.capUpload = () => {
  const C = M.cap; const p = prop(C.pid); C.step = 'upload'; mRender(false);
  const files = C.rooms.reduce((a, r) => a + r.shots, 0); const weak = C.rooms.find(r => r.shots && r.shots < 5);
  const t = { id: uid('vt'), propertyId: p.id, type: C.type, status: 'envoi', progress: 0, created: todayISO(), createdTs: Date.now(), files, sizeMB: Math.round(files * (C.type === '3d' ? 6.2 : 3.1)), error: null, rooms: C.rooms.filter(r => r.shots).map(r => ({ id: r.id, name: r.name, kind: r.kind })), log: [{ at: Date.now(), s: 'capture' }, { at: Date.now(), s: 'envoi' }], forceFail: weak ? 'Couverture insuffisante de « ' + weak.name + ' » (' + Math.round(weak.shots / 8 * 100) + ' %). Recouvrement entre images trop faible : recapturer la pièce lentement.' : null };
  S.tours.push(t); saveStore();
  let pr = 0; const iv = setInterval(() => {
    pr = Math.min(100, pr + 7 + Math.random() * 9); const b = $('#up-bar'), tx = $('#up-txt'); if (b) b.style.width = pr + '%'; if (tx) tx.textContent = Math.round(pr) + ' % · ' + Math.round(t.sizeMB * pr / 100) + ' / ' + t.sizeMB + ' Mo';
    if (pr >= 100) { clearInterval(iv); t.status = 'recus'; t.log.push({ at: Date.now(), s: 'recus' }); audit('Visite 3D reçue', p.id, t.type); commit(); M.cap = null; M.stack = M.stack.filter(x => x.s !== 'capture'); mGo('tourStatus', { id: t.id }); toast('Fichiers reçus — traitement lancé'); }
  }, 250);
};
SCR.tourStatus = ({ id }) => {
  const t = S.tours.find(x => x.id === id); if (!t) return hdr('Visite') + '<div class="body">' + empty('cube', 'Visite introuvable') + '</div>';
  const p = prop(t.propertyId); const order = ['capture', 'envoi', 'recus', 'traitement', 'termine', 'publiee']; const idx = t.status === 'echoue' ? 3 : order.indexOf(t.status);
  return hdr('Visite ' + (t.type === '3d' ? '3D' : '360°'), { sub: esc(p.title) }) + `<div class="body pad" data-scroll="main"><div class="status-box ${TOUR_STATUS[t.status].color}">${tag(TOUR_STATUS[t.status])}<p>${{ envoi: 'Envoi des fichiers…', recus: 'Fichiers reçus, mise en file d\'attente du traitement.', traitement: 'Traitement sur l\'infrastructure de reconstruction (GPU). Vous serez notifié à la fin.', termine: 'Le traitement est terminé : vérifiez le résultat puis publiez la visite.', echoue: esc(t.error || 'Le traitement a échoué.'), publiee: 'La visite est visible sur votre annonce.' }[t.status] || ''}</p></div>
  ${t.status === 'traitement' ? `<div class="progress lg"><b style="width:${t.progress}%"></b></div><p class="center small">${t.progress} % · ${esc(t.stage || 'Initialisation')}</p>` : ''}
  <div class="tl steps-tl">${order.map((s, i) => `<div class="${i < idx || t.status === 'publiee' ? 'done' : i === idx ? (t.status === 'echoue' ? 'fail' : 'cur') : ''}"><i></i><b>${i === 3 && t.status === 'echoue' ? 'Traitement échoué' : TOUR_STATUS[s].label}</b><small>${(t.log.find(l => l.s === s) || {}).at ? fmtDT(t.log.find(l => l.s === s).at) : ''}</small></div>`).join('')}</div>
  <div class="kv"><div><span>Fichiers</span><b>${t.files}</b></div><div><span>Volume</span><b>${t.sizeMB} Mo</b></div><div><span>Technologie</span><b>${t.type === '3d' ? 'Gaussian Splatting' : 'Assemblage panoramique'}</b></div><div><span>Pièces</span><b>${(t.rooms || tourRooms(p)).length}</b></div></div>
  <div class="btn-wrap">${t.status === 'termine' ? `<button class="btn sec" data-act="mGo" data-s="tour" data-p='{"id":"${p.id}","tour":"${t.id}"}'>${ic('eye')} Prévisualiser</button><button class="btn pri" data-act="publishTour" data-id="${t.id}">Publier la visite</button>` : ''}
  ${t.status === 'publiee' ? `<button class="btn pri block" data-act="mGo" data-s="tour" data-p='{"id":"${p.id}","tour":"${t.id}"}'>${ic('cube')} Ouvrir la visite</button>` : ''}
  ${t.status === 'echoue' ? `<button class="btn pri" data-act="ownerGo" data-s="capture" data-id="${p.id}">${ic('camera')} Recapturer</button><button class="btn sec" data-act="retryTour" data-id="${t.id}">${ic('refresh')} Relancer le traitement</button>` : ''}</div></div>`;
};
ACT.publishTour = d => { const t = S.tours.find(x => x.id === d.id); const p = prop(t.propertyId); t.status = 'publiee'; t.log.push({ at: Date.now(), s: 'publiee' }); p.tourId = t.id; audit('Visite publiée', p.id, t.type); commit(); toast('Visite publiée sur l\'annonce'); };
ACT.retryTour = d => { const t = S.tours.find(x => x.id === d.id); t.status = 'traitement'; t.progress = 0; t.error = null; t.forceFail = null; t.log.push({ at: Date.now(), s: 'traitement' }); commit(); toast('Traitement relancé'); };

/* ---------------- Agence ---------------- */
SCR.agencyDash = () => {
  const u = me(); const ag = agency(u.agencyId); const props = propsManagedBy(u); const isG = u.agencyRole === 'gerant';
  const agents = ag.members.map(user);
  const ids = props.map(p => p.id); const bks = S.bookings.filter(b => ids.includes(b.propertyId));
  return rootHdr(esc(ag.name), isG ? 'Gérant' : 'Agent') + `<div class="body" data-scroll="main">
  ${!ag.verified ? `<div class="alert amber m">${ic('shield')}<div><b>Agence en cours de vérification</b><small>Vos annonces seront publiées après validation du RCCM.</small></div></div>` : ''}
  <div class="kpis">${[['Biens gérés', props.length, 'building'], ['Publiés', props.filter(p => p.status === 'publiee').length, 'home'], ['Agents', agents.length, 'users'], ['Demandes', bks.filter(b => b.status === 'attente').length, 'cal'], ['Locations actives', bks.filter(b => ['confirmee', 'encours'].includes(b.status)).length, 'check'], ['Revenus du mois', moneyShort(revenueOf(props)) + ' F', 'wallet']].map(([l, v, i]) => `<div class="kpi">${ic(i)}<b>${v}</b><small>${l}</small></div>`).join('')}</div>
  <section class="sec card-sec"><div class="sec-h"><h3>Vues des annonces (14 j)</h3><a href="#" class="link" data-act="mGo" data-s="ownerStats">Détails</a></div>${barChart(viewsSeries(props), { label: 'Vues par jour' })}</section>
  <div class="quick">${[['publish', 'plus', 'Publier'], ['capture', 'camera', 'Capture 3D'], ['ownerStats', 'chart', 'Statistiques'], [isG ? 'agencyProfile' : 'profile', 'gear', isG ? 'Agence' : 'Profil']].map(([s, i, l]) => `<button data-act="ownerGo" data-s="${s}">${ic(i)}<span>${l}</span></button>`).join('')}</div>
  ${isG ? `<section class="sec"><div class="sec-h"><h3>Performance des agents</h3><a href="#" class="link" data-act="mTab" data-s="agencyAgents">Gérer</a></div><div class="pad-x"><table class="mini-tbl"><tr><th>Agent</th><th>Biens</th><th>Vues</th><th>Rés.</th></tr>${agents.map(a => { const ap = S.properties.filter(p => p.agentId === a.id); return `<tr data-act="mGo" data-s="agentDetail" data-id="${a.id}"><td>${avatar(a, 'xs')} ${esc(fullName(a))}</td><td>${ap.length}</td><td>${ap.reduce((x, p) => x + p.views, 0)}</td><td>${S.bookings.filter(b => ap.some(p => p.id === b.propertyId) && ['confirmee', 'encours', 'terminee'].includes(b.status)).length}</td></tr>`; }).join('')}<tr class="muted" data-act="noop"><td>Non affectés</td><td>${S.properties.filter(p => p.agencyId === ag.id && !p.agentId).length}</td><td></td><td></td></tr></table></div></section>` : ''}
  <section class="sec"><div class="sec-h"><h3>Dernières demandes</h3><a href="#" class="link" data-act="mTab" data-s="ownerRequests">Tout voir</a></div><div class="pad-x">${bks.filter(b => b.status === 'attente').slice(0, 3).map(requestCard).join('') || '<p class="muted small">Aucune demande en attente.</p>'}</div></section>
  <div class="foot-space"></div></div><button class="fab" data-act="ownerGo" data-s="publish">${ic('plus')}</button>`;
};
ACT.noop = () => { };
SCR.agencyAgents = () => {
  const u = me(); const ag = agency(u.agencyId);
  return rootHdr('Agents', esc(ag.name)) + `<div class="body pad" data-scroll="main">${ag.members.map(id => { const a = user(id); const ap = S.properties.filter(p => p.agentId === id); return `<button class="li card" data-act="mGo" data-s="agentDetail" data-id="${id}">${avatar(a)}<div class="li-main">${esc(fullName(a))}<small>${esc(a.email)} · ${ap.length} bien(s) affecté(s)</small></div>${a.status === 'actif' ? '' : '<span class="tag red">' + a.status + '</span>'}${ic('next')}</button>`; }).join('') || empty('users', 'Aucun agent', 'Ajoutez vos collaborateurs pour leur affecter des biens.')}
  <button class="btn pri block" data-act="addAgent">${ic('plus')} Ajouter un agent</button></div>`;
};
ACT.addAgent = () => openSheet(`<form data-submit="addAgentOk" class="form"><div class="grid2"><label class="field"><span>Prénom</span><input class="inp" name="first" required></label><label class="field"><span>Nom</span><input class="inp" name="last" required></label></div><label class="field"><span>E-mail professionnel</span><input class="inp" type="email" name="email" required></label><label class="field"><span>Téléphone</span><input class="inp" name="phone" required placeholder="+228 …"></label><p class="hint">Une invitation sera envoyée par e-mail et SMS pour activer le compte.</p><button class="btn pri block">Inviter l'agent</button></form>`, { title: 'Nouvel agent' });
ACT.addAgentOk = o => {
  const u = me(); const ag = agency(u.agencyId);
  const a = { id: uid('u'), first: o.first, last: o.last, email: o.email, phone: o.phone, roles: ['agent'], agencyId: ag.id, agencyRole: 'agent', city: 'Lomé', verifiedPhone: false, verifiedEmail: false, status: 'actif', created: todayISO(), color: '#0369A1' };
  S.users.push(a); ag.members.push(a.id); audit('Ajout agent', ag.id, fullName(a)); commit(); closeSheet(); toast('Invitation envoyée à ' + o.email);
};
SCR.agentDetail = ({ id }) => {
  const a = user(id); const u = me(); const ag = agency(u.agencyId); const props = S.properties.filter(p => p.agencyId === ag.id);
  return hdr(esc(fullName(a)), { sub: 'Agent · ' + esc(ag.name) }) + `<div class="body pad" data-scroll="main"><div class="owner-card">${avatar(a, 'lg')}<div><b>${esc(fullName(a))}</b><small>${esc(a.email)} · ${esc(a.phone)}</small><small>Membre depuis ${fmtDate(a.created)}</small></div></div>
  <h4>Biens affectés</h4>${props.map(p => `<label class="li card"><div class="thumb sm" style="background-image:url('${propCover(p)}')"></div><div class="li-main">${esc(p.title)}<small>${p.agentId && p.agentId !== id ? 'Actuellement : ' + esc(fullName(user(p.agentId))) : PROPERTY_STATUS[p.status].label}</small></div><input type="checkbox" class="switch" ${p.agentId === id ? 'checked' : ''} data-chg="toggleAssign" data-p="${p.id}" data-a="${id}" ${u.agencyRole !== 'gerant' ? 'disabled' : ''}></label>`).join('')}
  ${u.agencyRole === 'gerant' ? `<button class="btn danger-o block" data-act="removeAgent" data-id="${id}">${ic('trash')} Retirer de l'agence</button>` : ''}</div>`;
};
ACT.toggleAssign = (d, el) => { const p = prop(d.p); p.agentId = el.checked ? d.a : null; if (el.checked) notify(d.a, 'listing', 'Nouveau bien affecté', '« ' + p.title + ' » vous a été affecté.', { s: 'ownerListing', p: { id: p.id } }); commit(); toast(el.checked ? 'Bien affecté' : 'Affectation retirée', 'info'); };
ACT.removeAgent = d => confirmSheet('Retirer l\'agent', 'Ses biens seront désaffectés et son accès à l\'agence révoqué.', 'Retirer', () => { const ag = agency(me().agencyId); ag.members = ag.members.filter(x => x !== d.id); S.properties.forEach(p => { if (p.agentId === d.id) p.agentId = null; }); const a = user(d.id); a.agencyId = null; a.status = 'inactif'; commit(); mBack(); }, true);
SCR.agencyProfile = () => {
  const ag = agency(me().agencyId);
  return hdr('Informations de l\'agence') + `<div class="body pad" data-scroll="main"><form data-submit="saveAgency" class="form">${[['name', 'Nom de l\'agence'], ['rccm', 'N° RCCM'], ['nif', 'NIF'], ['address', 'Adresse'], ['phone', 'Téléphone'], ['email', 'E-mail']].map(([k, l]) => `<label class="field"><span>${l}</span><input class="inp" name="${k}" value="${esc(ag[k] || '')}"></label>`).join('')}
  <label class="field"><span>Présentation</span><textarea class="inp" name="description" rows="3">${esc(ag.description || '')}</textarea></label>
  <div class="li card">${ic('shield')}<div class="li-main">Statut de vérification<small>${ag.verified ? 'Agence vérifiée par DomiLoc' : 'En attente de validation administrative'}</small></div>${ag.verified ? '<span class="tag green">Vérifiée</span>' : '<span class="tag amber">En attente</span>'}</div>
  <button class="btn pri block">Enregistrer</button></form></div>`;
};
ACT.saveAgency = o => { Object.assign(agency(me().agencyId), o); commit(); toast('Informations enregistrées'); mBack(); };
