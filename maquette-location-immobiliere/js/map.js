/* =====================================================================
   DomiLoc — Cartographie
   Leaflet + tuiles OpenStreetMap dans la maquette (Google Maps Platform en
   production). Repli « carte simulée » si Leaflet n'est pas chargé (hors ligne).
   API commune : setItems, select, center, bounds, route, clearRoute, user,
   pin, circle, onClick, getView, destroy
   ===================================================================== */

/* Regroupement des marqueurs proches (grille en pixels écran) */
function clusterize(items, project, radius = 48) {
  const out = [];
  items.forEach(p => {
    const pt = project(p);
    let c = out.find(c => Math.abs(c.px[0] - pt[0]) < radius && Math.abs(c.px[1] - pt[1]) < radius);
    if (c) { c.items.push(p); c.lat = (c.lat * (c.items.length - 1) + p.lat) / c.items.length; c.lng = (c.lng * (c.items.length - 1) + p.lng) / c.items.length; }
    else out.push({ px: pt, items: [p], lat: p.lat, lng: p.lng });
  });
  return out;
}
const markerHTML = (p, sel) => `<div class="mk ${sel ? 'sel' : ''} ${p.verified ? 'ver' : ''}">${moneyShort(p.price)}${hasPublishedTour(p) ? '<i>3D</i>' : ''}</div>`;

const MapKit = {
  create(el, opts) { return window.L ? this.leaflet(el, opts) : this.sim(el, opts); },

  leaflet(el, opts) {
    const map = L.map(el, { zoomControl: !opts.static, attributionControl: true, dragging: !opts.static || !L.Browser.mobile, scrollWheelZoom: !opts.static, tap: false }).setView(opts.center, opts.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    if (map.zoomControl) map.zoomControl.setPosition('bottomright');
    const layer = L.layerGroup().addTo(map), extra = L.layerGroup().addTo(map);
    let items = [], onPick = null, sel = null, route = null, userMk = null, pinMk = null, clickCb = null;
    const redraw = () => {
      layer.clearLayers();
      clusterize(items, p => { const pt = map.latLngToContainerPoint([p.lat, p.lng]); return [pt.x, pt.y]; }).forEach(c => {
        if (c.items.length === 1 || map.getZoom() >= 17) {
          c.items.forEach(p => L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'mk-wrap', html: markerHTML(p, p.id === sel), iconSize: null }), zIndexOffset: p.id === sel ? 1000 : 0 }).on('click', () => onPick && onPick(p)).addTo(layer));
        } else {
          L.marker([c.lat, c.lng], { icon: L.divIcon({ className: 'mk-wrap', html: `<div class="mk-cl">${c.items.length}</div>`, iconSize: null }) })
            .on('click', () => map.flyTo([c.lat, c.lng], Math.min(18, map.getZoom() + 2), { duration: .5 })).addTo(layer);
        }
      });
    };
    map.on('zoomend', redraw);
    map.on('moveend', () => { redraw(); opts.onMove && opts.onMove(); });
    map.on('click', e => clickCb && clickCb([e.latlng.lat, e.latlng.lng]));
    setTimeout(() => map.invalidateSize(), 50);
    const api = {
      kind: 'leaflet', map,
      setItems(list, cb) { items = list; onPick = cb; redraw(); },
      select(id) { sel = id; redraw(); },
      center(ll, z) { map.flyTo(ll, z || map.getZoom(), { duration: .6 }); },
      bounds() { const b = map.getBounds(); return { n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() }; },
      route(a, b) {
        if (route) extra.removeLayer(route);
        const mid = [(a[0] + b[0]) / 2 + (b[1] - a[1]) * .15, (a[1] + b[1]) / 2 - (b[0] - a[0]) * .15];
        route = L.polyline([a, mid, b], { color: '#0F766E', weight: 5, opacity: .85, dashArray: '1 8', lineCap: 'round' }).addTo(extra);
        map.fitBounds(route.getBounds(), { padding: [60, 60] });
        return haversine(a, mid) + haversine(mid, b);
      },
      clearRoute() { if (route) { extra.removeLayer(route); route = null; } },
      user(ll) { if (userMk) extra.removeLayer(userMk); userMk = L.marker(ll, { icon: L.divIcon({ className: 'mk-wrap', html: '<div class="mk-me"></div>', iconSize: null }) }).addTo(extra); },
      pin(ll, onDrag) {
        if (pinMk) extra.removeLayer(pinMk);
        pinMk = L.marker(ll, { draggable: !!onDrag, icon: L.divIcon({ className: 'mk-wrap', html: '<div class="mk-pin"></div>', iconSize: null }) }).addTo(extra);
        if (onDrag) pinMk.on('dragend', () => { const p = pinMk.getLatLng(); onDrag([p.lat, p.lng]); });
      },
      circle(ll, r) { L.circle(ll, { radius: r, color: '#0F766E', weight: 1.5, fillOpacity: .15 }).addTo(extra); },
      onClick(cb) { clickCb = cb; },
      getView() { const c = map.getCenter(); return { center: [c.lat, c.lng], zoom: map.getZoom() }; },
      invalidate() { map.invalidateSize(); },
      destroy() { map.remove(); }
    };
    MapKit._all.push(api);
    return api;
  },

  /* Carte simulée (projection Web Mercator, déplacement et zoom manuels) */
  sim(el, opts) {
    let center = opts.center.slice(), zoom = opts.zoom, items = [], onPick = null, sel = null, clickCb = null, extras = [];
    el.classList.add('simmap');
    const T = 256;
    const proj = (lat, lng, z) => { const s = T * 2 ** z; const x = (lng + 180) / 360 * s; const sin = Math.sin(lat * Math.PI / 180); const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s; return [x, y]; };
    const unproj = (x, y, z) => { const s = T * 2 ** z; const lng = x / s * 360 - 180; const n = Math.PI - 2 * Math.PI * y / s; return [180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng]; };
    const toPx = (lat, lng) => { const c = proj(center[0], center[1], zoom), p = proj(lat, lng, zoom); return [p[0] - c[0] + el.clientWidth / 2, p[1] - c[1] + el.clientHeight / 2]; };
    const draw = () => {
      const W = el.clientWidth, H = el.clientHeight;
      let h = `<div class="sim-bg" style="background-position:${-proj(center[0], center[1], zoom)[0] % 64}px ${-proj(center[0], center[1], zoom)[1] % 64}px"></div><div class="sim-note">Carte simulée (hors ligne) — Google Maps en production</div>`;
      extras.forEach(x => { if (x.t === 'circle') { const [a, b] = toPx(x.ll[0], x.ll[1]); const r = x.r / (156543 * Math.cos(x.ll[0] * Math.PI / 180) / 2 ** zoom); h += `<div class="sim-circle" style="left:${a - r}px;top:${b - r}px;width:${2 * r}px;height:${2 * r}px"></div>`; } else if (x.t === 'pin' || x.t === 'me') { const [a, b] = toPx(x.ll[0], x.ll[1]); h += `<div class="sim-abs" style="left:${a}px;top:${b}px"><div class="${x.t === 'me' ? 'mk-me' : 'mk-pin'}"></div></div>`; } else if (x.t === 'route') { const [a, b] = toPx(x.a[0], x.a[1]); const [c, d] = toPx(x.b[0], x.b[1]); h += `<svg class="sim-route" width="${W}" height="${H}"><line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/></svg>`; } });
      clusterize(items, p => toPx(p.lat, p.lng)).forEach((c, ci) => {
        const [x, y] = toPx(c.lat, c.lng); if (x < -40 || y < -40 || x > W + 40 || y > H + 40) return;
        h += c.items.length === 1 ? `<div class="sim-abs" style="left:${x}px;top:${y}px" data-sim-p="${c.items[0].id}">${markerHTML(c.items[0], c.items[0].id === sel)}</div>` : `<div class="sim-abs" style="left:${x}px;top:${y}px" data-sim-c="${c.lat},${c.lng}"><div class="mk-cl">${c.items.length}</div></div>`;
      });
      h += `<div class="sim-zoom"><button data-sim-z="1">+</button><button data-sim-z="-1">−</button></div>`;
      el.innerHTML = h;
    };
    let down = null, moved = 0;
    el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; moved = 0; });
    el.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down[0], dy = e.clientY - down[1]; moved += Math.abs(dx) + Math.abs(dy); down = [e.clientX, e.clientY]; const c = proj(center[0], center[1], zoom); center = unproj(c[0] - dx, c[1] - dy, zoom); draw(); });
    el.addEventListener('pointerup', e => {
      down = null; if (moved > 5) { opts.onMove && opts.onMove(); return; }
      const t = e.target.closest('[data-sim-p],[data-sim-c],[data-sim-z]');
      if (t && t.dataset.simP) { onPick && onPick(prop(t.dataset.simP)); }
      else if (t && t.dataset.simC) { center = t.dataset.simC.split(',').map(Number); zoom = Math.min(18, zoom + 2); draw(); opts.onMove && opts.onMove(); }
      else if (t && t.dataset.simZ) { zoom = clamp(zoom + +t.dataset.simZ, 3, 18); draw(); opts.onMove && opts.onMove(); }
      else if (clickCb) { const r = el.getBoundingClientRect(); const c = proj(center[0], center[1], zoom); clickCb(unproj(c[0] + e.clientX - r.left - el.clientWidth / 2, c[1] + e.clientY - r.top - el.clientHeight / 2, zoom)); }
    });
    el.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom + (e.deltaY < 0 ? 1 : -1), 3, 18); draw(); opts.onMove && opts.onMove(); }, { passive: false });
    setTimeout(draw, 30);
    const api = {
      kind: 'sim',
      setItems(list, cb) { items = list; onPick = cb; draw(); }, select(id) { sel = id; draw(); },
      center(ll, z) { center = ll.slice(); if (z) zoom = z; draw(); opts.onMove && opts.onMove(); },
      bounds() { const c = proj(center[0], center[1], zoom); const nw = unproj(c[0] - el.clientWidth / 2, c[1] - el.clientHeight / 2, zoom), se = unproj(c[0] + el.clientWidth / 2, c[1] + el.clientHeight / 2, zoom); return { n: nw[0], w: nw[1], s: se[0], e: se[1] }; },
      route(a, b) { extras = extras.filter(x => x.t !== 'route'); extras.push({ t: 'route', a, b }); center = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; draw(); return haversine(a, b); },
      clearRoute() { extras = extras.filter(x => x.t !== 'route'); draw(); },
      user(ll) { extras = extras.filter(x => x.t !== 'me'); extras.push({ t: 'me', ll }); draw(); },
      pin(ll, onDrag) { extras = extras.filter(x => x.t !== 'pin'); extras.push({ t: 'pin', ll }); draw(); },
      circle(ll, r) { extras.push({ t: 'circle', ll, r }); draw(); },
      onClick(cb) { clickCb = cb; },
      getView() { return { center: center.slice(), zoom }; },
      invalidate() { draw(); }, destroy() { el.innerHTML = ''; }
    };
    return api;
  },
  _all: []
};
// Recalcul des tailles lors d'un changement de vue (mobile / admin / côte à côte)
function onViewChange() { setTimeout(() => { MapKit._all = MapKit._all.filter(m => m.map && m.map.getContainer().isConnected); MapKit._all.forEach(m => m.invalidate()); }, 80); }
