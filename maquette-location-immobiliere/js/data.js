/* =====================================================================
   DomiLoc — Données fictives (seed)
   Toutes les entités du cahier des charges (§8.4) sont représentées ici.
   Les dates sont relatives à « aujourd'hui » pour rester cohérentes.
   ===================================================================== */

const DATA_VERSION = 4;
const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

function isoOf(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dISO(offset) { const d = new Date(TODAY); d.setDate(d.getDate() + offset); return isoOf(d); }
function tsAgo(minutes) { return Date.now() - minutes * 60000; }

/* ---------- Référentiels administrables ---------- */
const SEED_CATEGORIES = [
  { id: 'maison', name: 'Maison', icon: '🏠', active: true, order: 1, required: ['bedrooms', 'area'] },
  { id: 'appartement', name: 'Appartement', icon: '🏢', active: true, order: 2, required: ['bedrooms', 'floor'] },
  { id: 'studio', name: 'Studio', icon: '🛋️', active: true, order: 3, required: ['area'] },
  { id: 'chambre', name: 'Chambre', icon: '🛏️', active: true, order: 4, required: [] },
  { id: 'villa', name: 'Villa', icon: '🏡', active: true, order: 5, required: ['bedrooms', 'area'] },
  { id: 'duplex', name: 'Duplex', icon: '🏘️', active: true, order: 6, required: ['bedrooms', 'area', 'floors'] }
];

const SEED_EQUIPMENTS = [
  ['clim', 'Climatisation', '❄️'], ['ventilo', 'Ventilateur', '🌀'], ['cuisine', 'Cuisine équipée', '🍳'],
  ['parking', 'Parking', '🅿️'], ['garage', 'Garage', '🚗'], ['piscine', 'Piscine', '🏊'], ['jardin', 'Jardin', '🌳'],
  ['balcon', 'Balcon', '🌇'], ['terrasse', 'Terrasse', '☀️'], ['groupe', 'Groupe électrogène', '⚡'],
  ['eau', "Accès à l'eau", '🚰'], ['forage', 'Forage', '💧'], ['securite', 'Sécurité / gardien', '🛡️'],
  ['internet', 'Connexion Internet', '📶'], ['meubles', 'Meubles', '🪑'], ['buanderie', 'Buanderie', '🧺'],
  ['chauffeeau', 'Chauffe-eau', '🔥']
].map(([id, name, icon], i) => ({ id, name, icon, active: true, order: i + 1 }));

const PROPERTY_STATUS = {
  brouillon: { label: 'Brouillon', color: 'gray' },
  attente: { label: 'En attente de validation', color: 'amber' },
  publiee: { label: 'Publiée', color: 'green' },
  refusee: { label: 'Refusée', color: 'red' },
  suspendue: { label: 'Suspendue', color: 'red' },
  louee: { label: 'Louée', color: 'blue' },
  archivee: { label: 'Archivée', color: 'gray' }
};

const BOOKING_STATUS = {
  attente: { label: 'En attente', color: 'amber' },
  acceptee: { label: 'Acceptée', color: 'blue' },
  refusee: { label: 'Refusée', color: 'red' },
  confirmee: { label: 'Confirmée', color: 'green' },
  encours: { label: 'En cours', color: 'violet' },
  terminee: { label: 'Terminée', color: 'gray' },
  annulee: { label: 'Annulée', color: 'red' },
  litige: { label: 'En litige', color: 'red' }
};

const TOUR_STATUS = {
  capture: { label: 'Capture en cours', color: 'gray' },
  envoi: { label: 'Envoi en cours', color: 'blue' },
  recus: { label: 'Fichiers reçus', color: 'blue' },
  traitement: { label: 'Traitement en cours', color: 'amber' },
  termine: { label: 'Traitement terminé', color: 'green' },
  echoue: { label: 'Traitement échoué', color: 'red' },
  publiee: { label: 'Visite publiée', color: 'green' }
};

const PERIODS = { nuit: 'nuit', semaine: 'semaine', mois: 'mois', an: 'an' };
const PERIOD_LABEL = { nuit: 'À la nuitée', semaine: 'À la semaine', mois: 'Au mois', an: "À l'année" };

const REPORT_REASONS = ['Fausse annonce', 'Logement inexistant', 'Photos trompeuses', 'Tentative de fraude', 'Comportement abusif', 'Problème de réservation', 'Avis injurieux ou faux', 'Autre'];

const LOCATIONS = {
  'Togo': {
    'Maritime': {
      'Lomé': {
        'Golfe 1': { 'Bè': [6.1405, 1.2455], 'Bè Klikamé': [6.1520, 1.2600] },
        'Golfe 2': { 'Hédzranawoé': [6.1700, 1.2400], 'Kégué': [6.1800, 1.2560] },
        'Golfe 3': { 'Tokoin': [6.1560, 1.2190], 'Djidjolé': [6.1650, 1.2050] },
        'Golfe 4': { 'Nyékonakpoè': [6.1290, 1.2060], 'Kodjoviakopé': [6.1270, 1.1960], 'Lomé 2': [6.1500, 1.2000] },
        'Golfe 5': { 'Adidogomé': [6.1800, 1.1600], 'Avédji': [6.1900, 1.1900] },
        'Golfe 6': { 'Baguida': [6.1650, 1.3300] },
        'Agoè-Nyivé 1': { 'Agoè': [6.2300, 1.2050], 'Agoè Nyivé': [6.2450, 1.2150] }
      }
    },
    'Plateaux': { 'Kpalimé': { 'Kloto 1': { 'Centre': [6.9000, 0.6300] } } },
    'Kara': { 'Kara': { 'Kozah 1': { 'Centre': [9.5510, 1.1860] } } }
  },
  'Bénin': {
    'Littoral': { 'Cotonou': { '12e arrondissement': { 'Fidjrossè': [6.3550, 2.3600], 'Cadjèhoun': [6.3600, 2.3850] } } }
  }
};

function locLookup(city, quartier) {
  for (const country in LOCATIONS) for (const region in LOCATIONS[country]) {
    const cities = LOCATIONS[country][region];
    if (!cities[city]) continue;
    for (const commune in cities[city]) if (cities[city][commune][quartier]) {
      return { country, region, city, commune, quartier, coords: cities[city][commune][quartier] };
    }
  }
  return null;
}

/* ---------- Utilisateurs ---------- */
const SEED_USERS = [
  { id: 'u1', first: 'Kossi', last: 'Mensah', email: 'kossi@demo.tg', phone: '+228 90 00 00 01', roles: ['locataire'], city: 'Lomé', bio: 'Ingénieur réseau, recherche un logement calme à Lomé.', verifiedPhone: true, verifiedEmail: true, verifiedId: false, status: 'actif', created: dISO(-210), color: '#0F766E', budget: 150000 },
  { id: 'u2', first: 'Afi', last: 'Lawson', email: 'afi@demo.tg', phone: '+228 90 00 00 02', roles: ['locataire', 'proprietaire'], city: 'Lomé', bio: 'Propriétaire de plusieurs biens à Lomé et Kpalimé.', verifiedPhone: true, verifiedEmail: true, verifiedId: true, ownerVerified: true, status: 'actif', created: dISO(-540), color: '#B45309' },
  { id: 'u3', first: 'Yao', last: 'Agbeko', email: 'contact@togohabitat.tg', phone: '+228 22 21 00 00', roles: ['agence'], agencyId: 'ag1', agencyRole: 'gerant', city: 'Lomé', bio: "Gérant de l'agence Togo Habitat.", verifiedPhone: true, verifiedEmail: true, verifiedId: true, status: 'actif', created: dISO(-700), color: '#1D4ED8' },
  { id: 'u4', first: 'Akossiwa', last: 'Doe', email: 'akossiwa@togohabitat.tg', phone: '+228 91 11 11 04', roles: ['agent'], agencyId: 'ag1', agencyRole: 'agent', city: 'Lomé', verifiedPhone: true, verifiedEmail: true, status: 'actif', created: dISO(-400), color: '#7C3AED' },
  { id: 'u5', first: 'Mawuli', last: 'Amegah', email: 'mawuli@togohabitat.tg', phone: '+228 91 11 11 05', roles: ['agent'], agencyId: 'ag1', agencyRole: 'agent', city: 'Lomé', verifiedPhone: true, verifiedEmail: true, status: 'actif', created: dISO(-300), color: '#0369A1' },
  { id: 'u6', first: 'Edem', last: 'Kpodar', email: 'edem@demo.tg', phone: '+228 92 00 00 06', roles: ['locataire', 'proprietaire'], city: 'Lomé', bio: 'Petit propriétaire, nouveaux biens en cours de vérification.', verifiedPhone: true, verifiedEmail: false, verifiedId: false, ownerVerified: false, status: 'actif', created: dISO(-35), color: '#BE185D',
    docs: [{ id: 'doc1', type: "Pièce d'identité (CNI)", file: 'cni_edem.pdf', status: 'en_attente', at: dISO(-3) }, { id: 'doc2', type: 'Attestation de propriété / mandat', file: 'titre_foncier_agoe.pdf', status: 'en_attente', at: dISO(-3) }] },
  { id: 'u7', first: 'Sena', last: 'Adjovi', email: 'sena@demo.tg', phone: '+228 93 00 00 07', roles: ['locataire'], city: 'Lomé', verifiedPhone: true, verifiedEmail: true, status: 'actif', created: dISO(-150), color: '#15803D' },
  { id: 'u8', first: 'Komi', last: 'Tchala', email: 'komi@demo.tg', phone: '+228 94 00 00 08', roles: ['locataire'], city: 'Lomé', verifiedPhone: true, verifiedEmail: false, status: 'suspendu', created: dISO(-90), color: '#525252' },
  { id: 'u9', first: 'Ama', last: 'Kouassi', email: 'ama@demo.bj', phone: '+229 97 00 00 09', roles: ['locataire'], city: 'Cotonou', verifiedPhone: true, verifiedEmail: true, status: 'actif', created: dISO(-120), color: '#C2410C' },
  { id: 'u10', first: 'Rodrigue', last: 'Houngbo', email: 'rodrigue@demo.bj', phone: '+229 96 00 00 10', roles: ['locataire', 'proprietaire'], city: 'Cotonou', verifiedPhone: true, verifiedEmail: true, verifiedId: true, ownerVerified: true, status: 'actif', created: dISO(-380), color: '#4338CA' }
];

const SEED_AGENCIES = [
  { id: 'ag1', name: 'Togo Habitat Immobilier', ownerId: 'u3', members: ['u4', 'u5'], rccm: 'TG-LOM-2019-B-01234', nif: '1000123456', address: 'Boulevard du 13 Janvier, Lomé', phone: '+228 22 21 00 00', email: 'contact@togohabitat.tg', verified: true, created: dISO(-700), description: 'Agence spécialisée dans la location résidentielle haut de gamme à Lomé depuis 2019.' }
];

/* ---------- Logements ---------- */
// [id, titre, type, ville, quartier, prix, période, ch, sdb, m², meublé, équipements, propriétaire, agence, agent, statut, vérifié, visite, mode, vues, créé(j)]
const P_ROWS = [
  ['p1', 'Villa moderne avec piscine', 'villa', 'Lomé', 'Baguida', 450000, 'mois', 4, 3, 280, true, 'clim piscine jardin parking groupe securite internet chauffeeau cuisine meubles', 'u2', null, null, 'publiee', true, '360', 'validation', 1240, 40],
  ['p2', 'Appartement 2 chambres lumineux', 'appartement', 'Lomé', 'Tokoin', 100000, 'mois', 2, 1, 75, false, 'ventilo eau securite balcon parking', 'u2', null, null, 'publiee', true, '3d', 'validation', 860, 22],
  ['p3', 'Studio meublé tout confort', 'studio', 'Lomé', 'Bè', 25000, 'nuit', 1, 1, 32, true, 'clim internet meubles chauffeeau cuisine', 'u2', null, null, 'publiee', true, '360', 'instant', 2130, 120],
  ['p4', 'Chambre salon calme', 'chambre', 'Lomé', 'Agoè', 35000, 'mois', 1, 1, 28, false, 'eau ventilo', 'u6', null, null, 'publiee', false, null, 'validation', 310, 12],
  ['p5', 'Duplex standing 3 chambres', 'duplex', 'Lomé', 'Hédzranawoé', 350000, 'mois', 3, 3, 210, false, 'clim garage terrasse groupe forage securite internet cuisine', 'u3', 'ag1', 'u4', 'publiee', true, '3d', 'validation', 990, 30],
  ['p6', 'Appartement meublé près de la plage', 'appartement', 'Lomé', 'Nyékonakpoè', 45000, 'nuit', 2, 2, 90, true, 'clim internet balcon meubles cuisine chauffeeau securite', 'u3', 'ag1', 'u5', 'publiee', true, '360', 'instant', 1780, 60],
  ['p7', 'Maison 3 chambres avec jardin', 'maison', 'Lomé', 'Avédji', 150000, 'mois', 3, 2, 160, false, 'jardin parking eau forage securite', 'u2', null, null, 'attente', false, null, 'validation', 0, 1],
  ['p8', 'Villa familiale avec dépendance', 'villa', 'Lomé', 'Lomé 2', 600000, 'mois', 5, 4, 350, true, 'clim piscine jardin garage groupe securite internet meubles buanderie chauffeeau', 'u3', 'ag1', 'u4', 'publiee', true, null, 'validation', 640, 75],
  ['p9', 'Studio étudiant rénové', 'studio', 'Lomé', 'Djidjolé', 40000, 'mois', 1, 1, 22, true, 'ventilo meubles eau', 'u6', null, null, 'attente', false, null, 'validation', 0, 2],
  ['p10', 'Appartement 3 chambres neuf', 'appartement', 'Lomé', 'Kégué', 180000, 'mois', 3, 2, 120, false, 'clim parking securite eau internet balcon', 'u3', 'ag1', 'u5', 'publiee', true, null, 'validation', 410, 18],
  ['p11', 'Chambre meublée à la semaine', 'chambre', 'Lomé', 'Kodjoviakopé', 60000, 'semaine', 1, 1, 20, true, 'clim internet meubles', 'u2', null, null, 'publiee', true, null, 'instant', 520, 50],
  ['p12', 'Maison de vacances au pied des monts', 'maison', 'Kpalimé', 'Centre', 30000, 'nuit', 3, 2, 140, true, 'jardin terrasse parking eau meubles cuisine', 'u2', null, null, 'publiee', true, '360', 'validation', 1105, 90],
  ['p13', 'Appartement F3 centre-ville', 'appartement', 'Kara', 'Centre', 90000, 'mois', 2, 1, 85, false, 'ventilo eau parking', 'u6', null, null, 'publiee', false, null, 'validation', 190, 26],
  ['p14', 'Villa avec piscine bord de mer', 'villa', 'Cotonou', 'Fidjrossè', 85000, 'nuit', 4, 4, 300, true, 'clim piscine jardin parking groupe securite internet meubles cuisine chauffeeau', 'u10', null, null, 'publiee', true, '3d', 'instant', 1520, 100],
  ['p15', 'Appartement 2 chambres sécurisé', 'appartement', 'Cotonou', 'Cadjèhoun', 200000, 'mois', 2, 2, 95, true, 'clim securite internet meubles parking', 'u10', null, null, 'publiee', true, null, 'validation', 720, 33],
  ['p16', 'Duplex neuf en finition', 'duplex', 'Lomé', 'Agoè Nyivé', 250000, 'mois', 4, 3, 220, false, 'garage terrasse forage securite', 'u2', null, null, 'brouillon', false, null, 'validation', 0, 0],
  ['p17', 'Studio Tokoin Casablanca', 'studio', 'Lomé', 'Tokoin', 50000, 'mois', 1, 1, 26, false, 'eau', 'u2', null, null, 'refusee', false, null, 'validation', 0, 5],
  ['p18', 'Maison 4 chambres avec cour', 'maison', 'Lomé', 'Adidogomé', 200000, 'mois', 4, 2, 190, false, 'parking jardin eau forage securite', 'u3', 'ag1', 'u4', 'publiee', true, null, 'validation', 560, 45],
  ['p19', 'Appartement de standing', 'appartement', 'Lomé', 'Bè Klikamé', 300000, 'mois', 3, 2, 140, true, 'clim internet securite meubles parking groupe', 'u3', 'ag1', 'u5', 'suspendue', true, null, 'validation', 330, 70],
  ['p20', 'Chambre salon proche plage', 'chambre', 'Lomé', 'Baguida', 30000, 'mois', 1, 1, 30, false, 'eau ventilo', 'u6', null, null, 'louee', false, null, 'validation', 280, 80],
  ['p21', 'Villa 5 chambres prestige', 'villa', 'Lomé', 'Avédji', 750000, 'mois', 5, 5, 420, true, 'clim piscine jardin garage groupe forage securite internet meubles buanderie chauffeeau terrasse', 'u3', 'ag1', 'u4', 'publiee', true, null, 'validation', 870, 15],
  ['p22', 'Studio cosy avec terrasse', 'studio', 'Lomé', 'Hédzranawoé', 20000, 'nuit', 1, 1, 30, true, 'clim internet terrasse meubles chauffeeau', 'u2', null, null, 'publiee', true, null, 'instant', 1390, 8],
  ['p23', 'Appartement 1 chambre', 'appartement', 'Lomé', 'Adidogomé', 60000, 'mois', 1, 1, 45, false, 'eau ventilo', 'u6', null, null, 'archivee', false, null, 'validation', 150, 200],
  ['p24', 'Maison 2 chambres familiale', 'maison', 'Lomé', 'Agoè', 80000, 'mois', 2, 1, 95, false, 'eau parking securite jardin', 'u2', null, null, 'publiee', false, null, 'validation', 205, 4]
];

const TYPE_TEXT = {
  villa: 'Spacieuse villa offrant de beaux volumes, idéale pour une famille. Les pièces de vie s\'ouvrent sur l\'extérieur et bénéficient d\'une excellente ventilation naturelle.',
  appartement: 'Appartement bien agencé situé dans une résidence sécurisée. Pièces lumineuses, accès facile aux commerces et aux axes principaux.',
  studio: 'Studio fonctionnel et soigné, parfait pour une personne seule ou un couple. Idéal pour les séjours professionnels.',
  chambre: 'Chambre-salon indépendante dans une cour calme, avec compteur personnel. Idéale pour étudiant ou jeune actif.',
  maison: 'Maison familiale dans un quartier résidentiel calme, avec cour et espace extérieur. Proche des écoles et des marchés.',
  duplex: 'Duplex moderne sur deux niveaux : espace de vie au rez-de-chaussée, chambres à l\'étage. Finitions de qualité.'
};

function buildMedia(p, hue) {
  const ext = ['appartement', 'studio', 'chambre'].includes(p.type) ? 'immeuble' : (p.equipments.includes('piscine') ? 'villa' : 'maison');
  const list = [
    { kind: ext, caption: 'Vue extérieure' }, { kind: 'salon', caption: 'Salon' }, { kind: 'chambre', caption: 'Chambre principale' },
    { kind: 'cuisine', caption: 'Cuisine' }, { kind: 'sdb', caption: 'Salle de bain' }
  ];
  if (p.equipments.includes('terrasse') || p.equipments.includes('balcon')) list.push({ kind: 'terrasse', caption: p.equipments.includes('terrasse') ? 'Terrasse' : 'Balcon' });
  if (p.id === 'p17') list.length = 2;
  const media = list.map((m, i) => ({ id: p.id + 'm' + i, type: 'photo', kind: m.kind, hue: (hue + i * 17) % 360, caption: m.caption }));
  if (['p1', 'p5', 'p6', 'p14', 'p21'].includes(p.id)) media.push({ id: p.id + 'v', type: 'video', kind: 'salon', hue, caption: 'Vidéo de présentation (0:48)' });
  return media;
}

function makeProperties() {
  return P_ROWS.map((r, idx) => {
    const [id, title, type, city, quartier, price, period, bedrooms, bathrooms, area, furnished, eq, ownerId, agencyId, agentId, status, verified, tour, bookingMode, views, created] = r;
    const loc = locLookup(city, quartier);
    const jitter = ((idx * 37) % 10 - 5) / 1000;
    const hue = (idx * 47) % 360;
    const p = {
      id, title: title + ' – ' + quartier + (city !== 'Lomé' ? ', ' + city : ''), type, furnished, bedrooms, salons: bedrooms > 2 ? 2 : 1, bathrooms, toilets: bathrooms + (bedrooms > 2 ? 1 : 0),
      area, buildingFloors: type === 'appartement' ? 4 : (type === 'duplex' ? 2 : 1), floor: type === 'appartement' ? (idx % 4) : 0, capacity: bedrooms * 2,
      equipments: eq.split(' '), price, currency: 'XOF', period,
      deposit: period === 'mois' ? price * 2 : (period === 'an' ? price : Math.round(price * 0.5)),
      advance: period === 'mois' ? price * 3 : 0,
      fees: period === 'nuit' ? 5000 : (period === 'semaine' ? 10000 : Math.round(price * 0.25)),
      charges: period === 'mois' ? (bedrooms * 5000) : 0,
      paymentTerms: period === 'mois' ? 'Avance de 3 mois + caution de 2 mois à la signature, puis loyer payable avant le 5 de chaque mois.' : 'Paiement intégral à la réservation (Mobile Money ou carte).',
      cancelPolicy: bookingMode === 'instant' ? 'Annulation gratuite jusqu\'à 48 h avant l\'arrivée. Au-delà, 50 % du montant est retenu.' : 'Annulation gratuite jusqu\'à 7 jours avant le début de la location.',
      durations: period === 'nuit' ? ['nuit', 'semaine'] : period === 'semaine' ? ['semaine', 'mois'] : ['mois', 'an'],
      country: loc.country, region: loc.region, city, commune: loc.commune, quartier,
      address: (idx * 13 % 90 + 10) + ', rue ' + ['des Cocotiers', 'de la Paix', 'Kpota', 'des Hibiscus', 'du Marché', 'des Écoles'][idx % 6] + ', ' + quartier,
      lat: loc.coords[0] + jitter, lng: loc.coords[1] - jitter * 1.3,
      description: TYPE_TEXT[type] + ' ' + (furnished ? 'Le logement est entièrement meublé et équipé.' : 'Le logement est proposé non meublé.') + ' Situé à ' + quartier + ', ' + city + '.',
      ownerId, agencyId, agentId, status, verified, bookingMode,
      rejectReason: id === 'p17' ? 'Photos insuffisantes (2 photos, minimum 3) et adresse incomplète. Merci d\'ajouter des photos nettes de chaque pièce et de préciser l\'adresse.' : null,
      suspendReason: id === 'p19' ? 'Signalements multiples : prix affiché incohérent avec les conditions réelles.' : null,
      views, favCount: Math.round(views / 25), contacts: Math.round(views / 40),
      created: dISO(-created), updated: dISO(-Math.max(0, created - 2)),
      tourId: tour ? 'vt_' + id : null,
      blocked: id === 'p3' ? [{ start: dISO(12), end: dISO(15), note: 'Travaux de peinture' }] : (id === 'p22' ? [{ start: dISO(25), end: dISO(28), note: 'Indisponible' }] : []),
      hue
    };
    p.media = buildMedia(p, hue);
    p.mainMedia = p.media[0].id;
    return p;
  });
}

/* ---------- Visites virtuelles ---------- */
function makeTours(props) {
  const tours = [];
  props.forEach(p => {
    if (!p.tourId) return;
    const t = P_ROWS.find(r => r[0] === p.id)[17];
    tours.push({ id: p.tourId, propertyId: p.id, type: t, status: 'publiee', progress: 100, created: dISO(-20), files: 8 + p.bedrooms * 6, sizeMB: t === '3d' ? 180 + p.area : 40 + p.bedrooms * 12, error: null, rooms: null, log: [{ at: tsAgo(60 * 24 * 20), s: 'recus' }, { at: tsAgo(60 * 24 * 19), s: 'termine' }, { at: tsAgo(60 * 24 * 18), s: 'publiee' }] });
  });
  tours.push({ id: 'vt_p10', propertyId: 'p10', type: '3d', status: 'traitement', progress: 35, created: dISO(0), files: 34, sizeMB: 410, error: null, log: [{ at: tsAgo(30), s: 'recus' }, { at: tsAgo(20), s: 'traitement' }] });
  tours.push({ id: 'vt_p7', propertyId: 'p7', type: '3d', status: 'echoue', progress: 62, created: dISO(-1), files: 21, sizeMB: 260, error: 'Couverture insuffisante de la cuisine (32 %). Recouvrement entre images trop faible : recapturer la pièce lentement.', log: [{ at: tsAgo(1500), s: 'recus' }, { at: tsAgo(1480), s: 'traitement' }, { at: tsAgo(1400), s: 'echoue' }] });
  props.find(p => p.id === 'p10').tourId = 'vt_p10';
  props.find(p => p.id === 'p7').tourId = 'vt_p7';
  return tours;
}

/* ---------- Réservations ---------- */
function bk(id, propertyId, tenantId, start, end, status, extra = {}) {
  return Object.assign({ id, propertyId, tenantId, start, end, status, mode: 'validation', created: tsAgo(60 * 24 * 3), units: 1, history: [], payment: null, promo: null }, extra);
}

function makeBookings() {
  const list = [
    bk('b1', 'p3', 'u1', dISO(-20), dISO(-17), 'terminee', { mode: 'instant', units: 3, amount: 80000, payment: { method: 'T-Money', ref: 'TM-88213', status: 'paye', at: tsAgo(60 * 24 * 25) } }),
    bk('b2', 'p2', 'u1', dISO(10), dISO(375), 'attente', { units: 12, unitType: 'mois', amount: 0 }),
    bk('b3', 'p6', 'u1', dISO(5), dISO(8), 'confirmee', { mode: 'instant', units: 3, amount: 140000, payment: { method: 'Flooz', ref: 'FL-40211', status: 'paye', at: tsAgo(60 * 24 * 2) } }),
    bk('b4', 'p1', 'u7', dISO(14), dISO(197), 'attente', { units: 6, unitType: 'mois', amount: 0 }),
    bk('b5', 'p11', 'u9', dISO(-3), dISO(11), 'encours', { mode: 'instant', units: 2, unitType: 'semaine', amount: 130000, payment: { method: 'Carte bancaire', ref: 'CB-7781', status: 'paye', at: tsAgo(60 * 24 * 6) } }),
    bk('b6', 'p3', 'u7', dISO(-40), dISO(-37), 'terminee', { mode: 'instant', units: 3, amount: 80000, payment: { method: 'Flooz', ref: 'FL-10022', status: 'paye', at: tsAgo(60 * 24 * 45) } }),
    bk('b7', 'p14', 'u1', dISO(-60), dISO(-55), 'litige', { mode: 'instant', units: 5, amount: 430000, payment: { method: 'Carte bancaire', ref: 'CB-5521', status: 'paye', at: tsAgo(60 * 24 * 65) } }),
    bk('b8', 'p22', 'u8', dISO(15), dISO(17), 'annulee', { mode: 'instant', units: 2, amount: 45000, cancelReason: 'Changement de programme' }),
    bk('b9', 'p5', 'u1', dISO(20), dISO(385), 'acceptee', { units: 12, unitType: 'mois' }),
    bk('b10', 'p12', 'u7', dISO(30), dISO(33), 'refusee', { units: 3, refuseReason: 'Logement déjà réservé par un membre de la famille à ces dates.' }),
    bk('b11', 'p6', 'u9', dISO(-15), dISO(-10), 'terminee', { mode: 'instant', units: 5, amount: 230000, payment: { method: 'MTN MoMo', ref: 'MM-1120', status: 'paye', at: tsAgo(60 * 24 * 20) } }),
    bk('b12', 'p22', 'u7', dISO(2), dISO(4), 'confirmee', { mode: 'instant', units: 2, amount: 45000, payment: { method: 'T-Money', ref: 'TM-5530', status: 'paye', at: tsAgo(60 * 24) } })
  ];
  list.forEach(b => {
    if (b.payment && b.payment.amount == null) b.payment.amount = b.amount;
    b.history =[{ at: b.created, status: 'attente', by: b.tenantId, note: 'Demande créée' }];
    if (b.status !== 'attente') b.history.push({ at: b.created + 3600000 * 5, status: b.status, by: 'system', note: BOOKING_STATUS[b.status].label });
  });
  return list;
}

/* ---------- Avis ---------- */
const SEED_REVIEWS = [
  { id: 'r1', bookingId: 'b6', propertyId: 'p3', authorId: 'u7', scores: { etat: 5, conformite: 5, proprete: 4, communication: 5, prix: 4 }, comment: 'Studio impeccable, conforme aux photos. Afi est très réactive. Je recommande !', reply: 'Merci Sena, au plaisir de vous accueillir à nouveau.', status: 'publie', reported: false, at: tsAgo(60 * 24 * 35) },
  { id: 'r2', bookingId: 'b11', propertyId: 'p6', authorId: 'u9', scores: { etat: 4, conformite: 4, proprete: 5, communication: 4, prix: 4 }, comment: 'Très bon emplacement, à deux pas de la plage. Wifi un peu lent le soir.', reply: null, status: 'publie', reported: false, at: tsAgo(60 * 24 * 9) },
  { id: 'r3', bookingId: null, propertyId: 'p1', authorId: 'u8', scores: { etat: 1, conformite: 1, proprete: 2, communication: 1, prix: 1 }, comment: 'Arnaque totale, propriétaire malhonnête !!! Fuyez !!!', reply: null, status: 'publie', reported: true, reportReason: 'Avis sans réservation vérifiée, propos injurieux', at: tsAgo(60 * 24 * 4) },
  { id: 'r4', bookingId: null, propertyId: 'p14', authorId: 'u9', scores: { etat: 5, conformite: 5, proprete: 5, communication: 5, prix: 4 }, comment: 'Villa magnifique, la piscine est superbe. Séjour parfait en famille.', reply: 'Merci beaucoup Ama !', status: 'publie', reported: false, at: tsAgo(60 * 24 * 50) },
  { id: 'r5', bookingId: null, propertyId: 'p1', authorId: 'u9', scores: { etat: 5, conformite: 4, proprete: 5, communication: 5, prix: 4 }, comment: 'Superbe villa, très bien entretenue. Le groupe électrogène est un vrai plus.', reply: null, status: 'publie', reported: false, at: tsAgo(60 * 24 * 70) },
  { id: 'r6', bookingId: null, propertyId: 'p22', authorId: 'u7', scores: { etat: 4, conformite: 5, proprete: 4, communication: 5, prix: 5 }, comment: 'Petit studio parfait pour un séjour de travail, terrasse agréable.', reply: null, status: 'publie', reported: false, at: tsAgo(60 * 24 * 12) },
  { id: 'r7', bookingId: null, propertyId: 'p12', authorId: 'u1', scores: { etat: 4, conformite: 4, proprete: 4, communication: 5, prix: 5 }, comment: 'Cadre verdoyant et reposant, idéal pour un week-end.', reply: null, status: 'publie', reported: false, at: tsAgo(60 * 24 * 100) }
];

/* ---------- Messagerie ---------- */
const SEED_CONVERSATIONS = [
  { id: 'c1', participants: ['u1', 'u2'], propertyId: 'p2', bookingId: 'b2', blockedBy: null, reported: false, messages: [
    { id: 'm1', from: 'u1', text: 'Bonjour, l\'appartement de Tokoin est-il toujours disponible à partir du mois prochain ?', at: tsAgo(60 * 26), read: true },
    { id: 'm2', from: 'u2', text: 'Bonjour Kossi, oui il est disponible. Vous pouvez faire une demande de réservation directement depuis l\'annonce.', at: tsAgo(60 * 25), read: true },
    { id: 'm3', from: 'u1', text: 'Parfait, je viens d\'envoyer la demande. Le parking est-il couvert ?', at: tsAgo(60 * 2), read: false }
  ] },
  { id: 'c2', participants: ['u1', 'u4'], propertyId: 'p5', bookingId: 'b9', blockedBy: null, reported: false, messages: [
    { id: 'm4', from: 'u4', text: 'Bonjour M. Mensah, votre demande pour le duplex de Hédzranawoé a été acceptée. Vous pouvez procéder au paiement de l\'avance depuis l\'application.', at: tsAgo(60 * 5), read: false },
    { id: 'm5', from: 'u4', img: { kind: 'salon', hue: 120 }, text: 'Voici une photo récente du salon après rénovation.', at: tsAgo(60 * 5 - 2), read: false }
  ] },
  { id: 'c3', participants: ['u7', 'u2'], propertyId: 'p1', bookingId: 'b4', blockedBy: null, reported: false, messages: [
    { id: 'm6', from: 'u7', text: 'Bonsoir, la villa de Baguida accepte-t-elle les animaux ?', at: tsAgo(60 * 8), read: false }
  ] },
  { id: 'c4', participants: ['u9', 'u5'], propertyId: 'p6', bookingId: 'b11', blockedBy: null, reported: false, messages: [
    { id: 'm7', from: 'u9', text: 'Merci pour le séjour, tout était parfait.', at: tsAgo(60 * 24 * 9), read: true },
    { id: 'm8', from: 'u5', text: 'Avec plaisir, à bientôt !', at: tsAgo(60 * 24 * 9 - 30), read: true }
  ] }
];

/* ---------- Notifications ---------- */
const SEED_NOTIFS = [
  { id: 'n1', userId: 'u1', type: 'booking', title: 'Demande acceptée', text: 'Votre demande pour « Duplex standing 3 chambres – Hédzranawoé » a été acceptée. Procédez au paiement pour confirmer.', at: tsAgo(60 * 5), read: false, link: { s: 'bookingDetail', p: { id: 'b9' } } },
  { id: 'n2', userId: 'u1', type: 'message', title: 'Nouveau message', text: 'Akossiwa Doe vous a envoyé 2 messages.', at: tsAgo(60 * 5 - 2), read: false, link: { s: 'chat', p: { id: 'c2' } } },
  { id: 'n3', userId: 'u1', type: 'alert', title: 'Nouvelle annonce pour votre alerte', text: '« Appartement 3 chambres neuf – Kégué » correspond à votre recherche « Appartement Lomé ≤ 200 000 ».', at: tsAgo(60 * 30), read: true, link: { s: 'property', p: { id: 'p10' } } },
  { id: 'n4', userId: 'u1', type: 'reminder', title: 'Rappel de réservation', text: 'Votre séjour à Nyékonakpoè commence dans 5 jours.', at: tsAgo(60 * 50), read: true, link: { s: 'bookingDetail', p: { id: 'b3' } } },
  { id: 'n5', userId: 'u2', type: 'booking', title: 'Nouvelle demande de réservation', text: 'Sena Adjovi souhaite louer « Villa moderne avec piscine – Baguida » pour 6 mois.', at: tsAgo(60 * 9), read: false, link: { s: 'ownerRequests', p: {} } },
  { id: 'n6', userId: 'u2', type: 'booking', title: 'Nouvelle demande de réservation', text: 'Kossi Mensah souhaite louer « Appartement 2 chambres lumineux – Tokoin » pour 12 mois.', at: tsAgo(60 * 3), read: false, link: { s: 'ownerRequests', p: {} } },
  { id: 'n7', userId: 'u2', type: 'listing', title: 'Annonce refusée', text: '« Studio Tokoin Casablanca » a été refusée. Consultez le motif et corrigez votre annonce.', at: tsAgo(60 * 24 * 4), read: true, link: { s: 'ownerListing', p: { id: 'p17' } } },
  { id: 'n8', userId: 'u3', type: 'tour', title: 'Traitement 3D en cours', text: 'La reconstruction 3D de « Appartement 3 chambres neuf – Kégué » est en cours.', at: tsAgo(20), read: false, link: { s: 'ownerListing', p: { id: 'p10' } } }
];

/* ---------- Signalements, litiges, promotions, support ---------- */
const SEED_REPORTS = [
  { id: 'rep1', targetType: 'property', targetId: 'p4', reason: 'Photos trompeuses', desc: 'Les photos ne correspondent pas : la chambre est beaucoup plus petite et sans fenêtre.', by: 'u7', status: 'ouvert', at: tsAgo(60 * 24 * 2), decision: null },
  { id: 'rep2', targetType: 'user', targetId: 'u8', reason: 'Comportement abusif', desc: 'Messages insultants après refus de ma part.', by: 'u2', status: 'traite', at: tsAgo(60 * 24 * 10), decision: 'Compte suspendu 30 jours' },
  { id: 'rep3', targetType: 'review', targetId: 'r3', reason: 'Avis injurieux ou faux', desc: 'Cet utilisateur n\'a jamais loué ma villa.', by: 'u2', status: 'ouvert', at: tsAgo(60 * 24 * 3), decision: null },
  { id: 'rep4', targetType: 'property', targetId: 'p19', reason: 'Tentative de fraude', desc: 'On m\'a demandé de payer hors plateforme avant toute visite.', by: 'u9', status: 'traite', at: tsAgo(60 * 24 * 12), decision: 'Annonce suspendue' }
];

const SEED_DISPUTES = [
  { id: 'd1', bookingId: 'b7', openedBy: 'u1', subject: 'Caution non restituée', desc: 'Le séjour s\'est terminé il y a 55 jours et la caution de 42 500 FCFA ne m\'a toujours pas été restituée, sans justification.', files: ['etat_des_lieux_sortie.jpg', 'recu_paiement.pdf'], status: 'ouvert', at: tsAgo(60 * 24 * 40), history: [
    { at: tsAgo(60 * 24 * 40), by: 'u1', text: 'Ouverture du litige' },
    { at: tsAgo(60 * 24 * 38), by: 'u10', text: 'Une vitre de la baie a été fissurée, la caution couvre la réparation.' }
  ], decision: null }
];

const SEED_PROMOS = [
  { id: 'pr1', code: 'BIENVENUE10', type: 'percent', value: 10, start: dISO(-30), end: dISO(60), maxUses: 500, used: 132, conditions: 'Première réservation uniquement', active: true },
  { id: 'pr2', code: 'NOEL2026', type: 'amount', value: 5000, start: dISO(10), end: dISO(45), maxUses: 200, used: 0, conditions: 'Séjours à la nuitée, minimum 2 nuits', active: true },
  { id: 'pr3', code: 'RENTREE', type: 'percent', value: 15, start: dISO(-90), end: dISO(-40), maxUses: 100, used: 100, conditions: 'Logements étudiants', active: false }
];

const SEED_TICKETS = [
  { id: 't1', userId: 'u1', subject: 'Paiement Flooz non confirmé', category: 'Paiement', status: 'resolu', at: tsAgo(60 * 24 * 6), messages: [
    { from: 'u1', text: 'J\'ai été débité mais la réservation n\'apparaissait pas comme payée.', at: tsAgo(60 * 24 * 6) },
    { from: 'admin', text: 'Bonjour, le paiement a bien été rapproché, votre réservation b3 est confirmée. Désolés pour le désagrément.', at: tsAgo(60 * 24 * 5) }
  ] },
  { id: 't2', userId: 'u6', subject: 'Délai de vérification de mes documents', category: 'Compte', status: 'ouvert', at: tsAgo(60 * 20), messages: [
    { from: 'u6', text: 'Bonjour, combien de temps prend la vérification des documents propriétaire ?', at: tsAgo(60 * 20) }
  ] }
];

const SEED_CONTENT = {
  banners: [
    { id: 'bn1', title: 'Visitez avant de vous déplacer', text: 'Plus de 10 logements disponibles en visite 360° et 3D.', color: '#0F766E', cta: 'Explorer', action: 'tour', active: true },
    { id: 'bn2', title: '-10 % sur votre première réservation', text: 'Avec le code BIENVENUE10', color: '#B45309', cta: 'En profiter', action: 'search', active: true },
    { id: 'bn3', title: 'Propriétaire ? Publiez gratuitement', text: 'Touchez des milliers de locataires vérifiés.', color: '#1D4ED8', cta: 'Publier', action: 'owner', active: true }
  ],
  faqs: [
    { id: 'f1', q: 'Comment réserver un logement ?', a: 'Ouvrez l\'annonce, touchez « Réserver », choisissez votre période puis validez. Selon le logement, la réservation est instantanée ou soumise à l\'accord du propriétaire.' },
    { id: 'f2', q: 'Le paiement est-il sécurisé ?', a: 'Les paiements Mobile Money (T-Money, Flooz, MTN MoMo) et par carte transitent par un prestataire agréé. Ne payez jamais hors de la plateforme.' },
    { id: 'f3', q: 'Que signifie le badge « Vérifié » ?', a: 'Le propriétaire a fourni des justificatifs contrôlés par notre équipe. Ce badge ne constitue pas une garantie juridique absolue de propriété.' },
    { id: 'f4', q: 'Comment fonctionne la visite 360° / 3D ?', a: 'Le propriétaire capture son logement avec son smartphone. Nos serveurs génèrent une visite immersive que vous explorez depuis l\'annonce.' },
    { id: 'f5', q: 'Comment annuler une réservation ?', a: 'Depuis « Mes réservations », ouvrez la réservation puis « Annuler ». Les conditions d\'annulation de l\'annonce s\'appliquent.' }
  ],
  pages: {
    cgu: { title: 'Conditions générales d\'utilisation', body: 'Les présentes conditions régissent l\'utilisation de la plateforme DomiLoc par les locataires, propriétaires et agences. (Texte de démonstration administrable depuis le back-office.)' },
    privacy: { title: 'Politique de confidentialité', body: 'DomiLoc collecte les données strictement nécessaires au service. Vous pouvez demander l\'accès, la rectification ou la suppression de vos données à tout moment depuis votre profil. (Texte de démonstration.)' },
    about: { title: 'À propos', body: 'DomiLoc centralise les annonces de location de logements habitables au Togo et dans la zone UEMOA, avec visites virtuelles et réservation en ligne.' }
  },
  info: { active: true, text: 'Maintenance programmée dimanche de 2 h à 4 h. Le service de paiement pourra être indisponible.' },
  sections: { recent: true, popular: true, recommended: true, nearby: true, verified: true, tours: true }
};

const SEED_ADMINS = [
  { id: 'a1', name: 'Administrateur principal', email: 'admin@domiloc.tg', role: 'Super administrateur', active: true, lastLogin: tsAgo(10) },
  { id: 'a2', name: 'Essi Mododji', email: 'moderation@domiloc.tg', role: 'Modérateur', active: true, lastLogin: tsAgo(60 * 6) },
  { id: 'a3', name: 'Kodjo Amouzou', email: 'support@domiloc.tg', role: 'Support', active: true, lastLogin: tsAgo(60 * 30) }
];

const ADMIN_MODULES = ['Utilisateurs', 'Annonces', 'Réservations', 'Modération', 'Visites 3D', 'Contenus', 'Promotions', 'Support', 'Administrateurs'];
const SEED_PERMISSIONS = {
  'Super administrateur': ADMIN_MODULES.slice(),
  'Modérateur': ['Annonces', 'Modération', 'Visites 3D', 'Utilisateurs'],
  'Support': ['Support', 'Réservations', 'Utilisateurs']
};

function makeSeed() {
  const properties = makeProperties();
  return {
    version: DATA_VERSION,
    users: JSON.parse(JSON.stringify(SEED_USERS)),
    agencies: JSON.parse(JSON.stringify(SEED_AGENCIES)),
    categories: JSON.parse(JSON.stringify(SEED_CATEGORIES)),
    equipments: JSON.parse(JSON.stringify(SEED_EQUIPMENTS)),
    properties,
    tours: makeTours(properties),
    bookings: makeBookings(),
    reviews: JSON.parse(JSON.stringify(SEED_REVIEWS)),
    conversations: JSON.parse(JSON.stringify(SEED_CONVERSATIONS)),
    notifications: JSON.parse(JSON.stringify(SEED_NOTIFS)),
    favorites: { u1: ['p1', 'p6', 'p14'], u7: ['p1'], u9: ['p6'] },
    compare: { u1: [] },
    viewed: { u1: ['p10', 'p2', 'p6', 'p3'] },
    searchHistory: { u1: ['Tokoin', 'Appartement meublé', 'Baguida villa'] },
    savedSearches: { u1: [{ id: 'ss1', name: 'Appartement Lomé ≤ 200 000', criteria: { city: 'Lomé', type: 'appartement', max: 200000 }, alerts: true, created: dISO(-10) }] },
    notifPrefs: {},
    reports: JSON.parse(JSON.stringify(SEED_REPORTS)),
    disputes: JSON.parse(JSON.stringify(SEED_DISPUTES)),
    promotions: JSON.parse(JSON.stringify(SEED_PROMOS)),
    tickets: JSON.parse(JSON.stringify(SEED_TICKETS)),
    content: JSON.parse(JSON.stringify(SEED_CONTENT)),
    admins: JSON.parse(JSON.stringify(SEED_ADMINS)),
    permissions: JSON.parse(JSON.stringify(SEED_PERMISSIONS)),
    audit: [
      { at: tsAgo(60 * 24 * 4), actor: 'a2', action: 'Refus annonce', target: 'p17', detail: 'Photos insuffisantes' },
      { at: tsAgo(60 * 24 * 10), actor: 'a2', action: 'Suspension utilisateur', target: 'u8', detail: '30 jours – comportement abusif' },
      { at: tsAgo(60 * 24 * 12), actor: 'a1', action: 'Suspension annonce', target: 'p19', detail: 'Tentative de fraude signalée' }
    ],
    loginHistory: [
      { adminId: 'a1', at: tsAgo(10), ip: '102.64.12.8', device: 'Chrome / Windows' },
      { adminId: 'a2', at: tsAgo(360), ip: '102.64.13.40', device: 'Firefox / Ubuntu' },
      { adminId: 'a3', at: tsAgo(1800), ip: '41.207.1.19', device: 'Edge / Windows' },
      { adminId: 'a1', at: tsAgo(1500), ip: '102.64.12.8', device: 'Safari / macOS' }
    ],
    session: { userId: null, space: 'locataire', adminId: 'a1' }
  };
}
