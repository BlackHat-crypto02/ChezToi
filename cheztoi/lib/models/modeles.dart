/// Modèles de données renvoyés par l'API ChezToi.
library;

int _int(dynamic v, [int defaut = 0]) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('${v ?? ''}') ?? defaut;
}

int? _intOuNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toInt();
  return int.tryParse('$v');
}

double? _double(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse('$v');
}

String _str(dynamic v) => v == null ? '' : '$v';

DateTime? _date(dynamic v) =>
    v == null ? null : DateTime.tryParse('$v')?.toLocal();

List<Map<String, dynamic>> _listeMaps(dynamic v) => v is List
    ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
    : <Map<String, dynamic>>[];

/// Libellés partagés par les écrans.
class Libelles {
  const Libelles._();

  static const Map<String, String> types = {
    'maison': 'Maison',
    'appartement': 'Appartement',
    'studio': 'Studio',
    'chambre': 'Chambre',
    'villa': 'Villa',
    'duplex': 'Duplex',
  };

  static const Map<String, String> periodicites = {
    'nuit': 'nuit',
    'semaine': 'semaine',
    'mois': 'mois',
    'annee': 'an',
  };

  static const Map<String, String> statutsLogement = {
    'brouillon': 'Brouillon',
    'en_attente': 'En attente de validation',
    'publiee': 'Publiée',
    'refusee': 'Refusée',
    'suspendue': 'Suspendue',
    'louee': 'Louée',
    'archivee': 'Archivée',
  };

  static const Map<String, String> statutsReservation = {
    'en_attente': 'En attente',
    'acceptee': 'Acceptée',
    'refusee': 'Refusée',
    'confirmee': 'Confirmée',
    'en_cours': 'En cours',
    'terminee': 'Terminée',
    'annulee': 'Annulée',
    'en_litige': 'En litige',
  };

  static const Map<String, String> motifsSignalement = {
    'fausse_annonce': 'Fausse annonce',
    'logement_inexistant': 'Logement inexistant',
    'photos_trompeuses': 'Photos trompeuses',
    'fraude': 'Tentative de fraude',
    'comportement_abusif': 'Comportement abusif',
    'probleme_reservation': 'Problème de réservation',
    'avis_inapproprie': 'Avis inapproprié',
    'autre': 'Autre',
  };
}

class Equipement {
  const Equipement({required this.id, required this.nom, this.icone = ''});

  final int id;
  final String nom;
  final String icone;

  factory Equipement.fromJson(Map<String, dynamic> j) => Equipement(
        id: _int(j['id']),
        nom: _str(j['nom']),
        icone: _str(j['icone']),
      );
}

class PhotoLogement {
  const PhotoLogement({
    required this.id,
    required this.url,
    this.legende = '',
    this.principale = false,
    this.ordre = 0,
  });

  final int id;
  final String url;
  final String legende;
  final bool principale;
  final int ordre;

  factory PhotoLogement.fromJson(Map<String, dynamic> j) => PhotoLogement(
        id: _int(j['id']),
        url: _str(j['image']),
        legende: _str(j['legende']),
        principale: j['principale'] == true,
        ordre: _int(j['ordre']),
      );
}

class Panorama {
  const Panorama({required this.id, required this.url, required this.piece});

  final int id;
  final String url;
  final String piece;

  factory Panorama.fromJson(Map<String, dynamic> j) => Panorama(
        id: _int(j['id']),
        url: _str(j['image']),
        piece: _str(j['piece']),
      );
}

class UtilisateurPublic {
  const UtilisateurPublic({
    required this.id,
    required this.nomComplet,
    this.prenom = '',
    this.ville = '',
    this.verifie = false,
    this.membreDepuis,
  });

  final int id;
  final String nomComplet;
  final String prenom;
  final String ville;
  final bool verifie;
  final DateTime? membreDepuis;

  String get initiales {
    final mots = nomComplet.trim().split(RegExp(r'\s+'));
    return mots
        .where((m) => m.isNotEmpty)
        .take(2)
        .map((m) => m[0].toUpperCase())
        .join();
  }

  factory UtilisateurPublic.fromJson(Map<String, dynamic>? j) {
    j ??= const {};
    return UtilisateurPublic(
      id: _int(j['id']),
      nomComplet: _str(j['nom_complet']),
      prenom: _str(j['first_name']),
      ville: _str(j['city']),
      verifie: j['verified'] == true,
      membreDepuis: _date(j['date_joined']),
    );
  }
}

class Logement {
  const Logement({
    required this.id,
    required this.titre,
    this.description = '',
    this.typeLogement = '',
    this.meuble = false,
    this.chambres = 0,
    this.salons = 0,
    this.sallesDeBain = 0,
    this.toilettes = 0,
    this.superficie,
    this.etagesBatiment,
    this.etage,
    this.capacite,
    this.prix = 0,
    this.devise = 'XOF',
    this.periodicite = 'mois',
    this.caution = 0,
    this.avance = 0,
    this.fraisSupplementaires = 0,
    this.charges = 0,
    this.conditionsPaiement = '',
    this.conditionsAnnulation = '',
    this.reservationInstantanee = false,
    this.pays = '',
    this.region = '',
    this.ville = '',
    this.commune = '',
    this.quartier = '',
    this.adresse = '',
    this.adresseVisible = false,
    this.telephoneProprietaire = '',
    this.latitude,
    this.longitude,
    this.photo,
    this.photos = const [],
    this.panoramas = const [],
    this.equipements = const [],
    this.verifie = false,
    this.statut = 'publiee',
    this.motifRefus = '',
    this.aVisiteVirtuelle = false,
    this.noteMoyenne,
    this.nombreAvis = 0,
    this.estFavori = false,
    this.nombreVues = 0,
    this.distanceKm,
    this.proprietaire,
    this.publieLe,
    this.brut = const {},
  });

  final int id;
  final String titre;
  final String description;
  final String typeLogement;
  final bool meuble;
  final int chambres;
  final int salons;
  final int sallesDeBain;
  final int toilettes;
  final int? superficie;
  final int? etagesBatiment;
  final int? etage;
  final int? capacite;
  final int prix;
  final String devise;
  final String periodicite;
  final int caution;
  final int avance;
  final int fraisSupplementaires;
  final int charges;
  final String conditionsPaiement;
  final String conditionsAnnulation;
  final bool reservationInstantanee;
  final String pays;
  final String region;
  final String ville;
  final String commune;
  final String quartier;
  final String adresse;
  final bool adresseVisible;
  final String telephoneProprietaire;
  final double? latitude;
  final double? longitude;
  final String? photo;
  final List<PhotoLogement> photos;
  final List<Panorama> panoramas;
  final List<Equipement> equipements;
  final bool verifie;
  final String statut;
  final String motifRefus;
  final bool aVisiteVirtuelle;
  final double? noteMoyenne;
  final int nombreAvis;
  final bool estFavori;
  final int nombreVues;
  final double? distanceKm;
  final UtilisateurPublic? proprietaire;
  final DateTime? publieLe;

  String get typeLibelle => Libelles.types[typeLogement] ?? typeLogement;

  String get periodiciteLibelle =>
      Libelles.periodicites[periodicite] ?? periodicite;

  String get statutLibelle =>
      Libelles.statutsLogement[statut] ?? statut;

  String get localisation {
    final morceaux = [quartier, ville].where((m) => m.isNotEmpty).toList();
    return morceaux.isEmpty ? region : morceaux.join(', ');
  }

  bool get aPosition => latitude != null && longitude != null;

  /// JSON d'origine, pour recopier l'objet avec une valeur modifiée.
  final Map<String, dynamic> brut;

  Logement copieAvecFavori(bool favori) =>
      Logement.fromJson({...brut, 'est_favori': favori});

  factory Logement.fromJson(Map<String, dynamic> j) {
    return Logement(
      brut: j,
      id: _int(j['id']),
      titre: _str(j['titre']),
      description: _str(j['description']),
      typeLogement: _str(j['type_logement']),
      meuble: j['meuble'] == true,
      chambres: _int(j['chambres']),
      salons: _int(j['salons']),
      sallesDeBain: _int(j['salles_de_bain']),
      toilettes: _int(j['toilettes']),
      superficie: _intOuNull(j['superficie']),
      etagesBatiment: _intOuNull(j['etages_batiment']),
      etage: _intOuNull(j['etage']),
      capacite: _intOuNull(j['capacite']),
      prix: _int(j['prix']),
      devise: _str(j['devise']).isEmpty ? 'XOF' : _str(j['devise']),
      periodicite: _str(j['periodicite']),
      caution: _int(j['caution']),
      avance: _int(j['avance']),
      fraisSupplementaires: _int(j['frais_supplementaires']),
      charges: _int(j['charges']),
      conditionsPaiement: _str(j['conditions_paiement']),
      conditionsAnnulation: _str(j['conditions_annulation']),
      reservationInstantanee: j['reservation_instantanee'] == true,
      pays: _str(j['pays']),
      region: _str(j['region']),
      ville: _str(j['ville']),
      commune: _str(j['commune']),
      quartier: _str(j['quartier']),
      adresse: _str(j['adresse']),
      adresseVisible: j['adresse_visible'] == true,
      telephoneProprietaire: _str(j['telephone_proprietaire']),
      latitude: _double(j['latitude']),
      longitude: _double(j['longitude']),
      photo: j['photo'] as String?,
      photos: _listeMaps(j['photos']).map(PhotoLogement.fromJson).toList(),
      panoramas: _listeMaps(j['panoramas']).map(Panorama.fromJson).toList(),
      equipements:
          _listeMaps(j['equipements']).map(Equipement.fromJson).toList(),
      verifie: j['verifie'] == true,
      statut: _str(j['statut']),
      motifRefus: _str(j['motif_refus']),
      aVisiteVirtuelle: j['a_visite_virtuelle'] == true,
      noteMoyenne: _double(j['note_moyenne']),
      nombreAvis: _int(j['nombre_avis']),
      estFavori: j['est_favori'] == true,
      nombreVues: _int(j['nombre_vues']),
      distanceKm: _double(j['distance_km']),
      proprietaire: j['proprietaire'] is Map
          ? UtilisateurPublic.fromJson(
              Map<String, dynamic>.from(j['proprietaire'] as Map),
            )
          : null,
      publieLe: _date(j['publie_le']),
    );
  }

  /// Toutes les images : la galerie si elle est chargée, sinon la photo principale.
  List<String> get images {
    if (photos.isNotEmpty) return photos.map((p) => p.url).toList();
    return photo == null ? const [] : [photo!];
  }
}

/// Page de résultats paginée (`count`, `next`, `results`).
class Page<T> {
  const Page({required this.total, required this.elements, required this.suite});

  final int total;
  final List<T> elements;
  final bool suite;
}

class Avis {
  const Avis({
    required this.id,
    required this.auteur,
    required this.noteGlobale,
    this.notes = const {},
    this.commentaire = '',
    this.reponseProprietaire = '',
    this.creeLe,
  });

  final int id;
  final UtilisateurPublic auteur;
  final double noteGlobale;
  final Map<String, int> notes;
  final String commentaire;
  final String reponseProprietaire;
  final DateTime? creeLe;

  factory Avis.fromJson(Map<String, dynamic> j) => Avis(
        id: _int(j['id']),
        auteur: UtilisateurPublic.fromJson(
          j['auteur'] is Map
              ? Map<String, dynamic>.from(j['auteur'] as Map)
              : null,
        ),
        noteGlobale: _double(j['note_globale']) ?? 0,
        notes: {
          'État': _int(j['note_etat']),
          'Conformité': _int(j['note_conformite']),
          'Propreté': _int(j['note_proprete']),
          'Communication': _int(j['note_communication']),
          'Qualité-prix': _int(j['note_qualite_prix']),
        },
        commentaire: _str(j['commentaire']),
        reponseProprietaire: _str(j['reponse_proprietaire']),
        creeLe: _date(j['cree_le']),
      );
}

class Reservation {
  const Reservation({
    required this.id,
    required this.logement,
    required this.locataire,
    required this.proprietaire,
    required this.dateDebut,
    required this.dateFin,
    this.telephoneContact = '',
    this.nombrePersonnes = 1,
    this.message = '',
    this.periodes = 1,
    this.montantLocation = 0,
    this.caution = 0,
    this.avance = 0,
    this.frais = 0,
    this.montantTotal = 0,
    this.statut = 'en_attente',
    this.motif = '',
    this.aAvis = false,
    this.peutEvaluer = false,
    this.peutAnnuler = false,
    this.creeLe,
  });

  final int id;
  final Logement logement;
  final UtilisateurPublic locataire;
  final UtilisateurPublic proprietaire;
  final DateTime dateDebut;
  final DateTime dateFin;
  final String telephoneContact;
  final int nombrePersonnes;
  final String message;
  final int periodes;
  final int montantLocation;
  final int caution;
  final int avance;
  final int frais;
  final int montantTotal;
  final String statut;
  final String motif;
  final bool aAvis;
  final bool peutEvaluer;
  final bool peutAnnuler;
  final DateTime? creeLe;

  String get statutLibelle =>
      Libelles.statutsReservation[statut] ?? statut;

  int get nuits => dateFin.difference(dateDebut).inDays;

  factory Reservation.fromJson(Map<String, dynamic> j) => Reservation(
        id: _int(j['id']),
        logement: Logement.fromJson(
          Map<String, dynamic>.from(j['logement'] as Map? ?? const {}),
        ),
        locataire: UtilisateurPublic.fromJson(
          j['locataire'] is Map
              ? Map<String, dynamic>.from(j['locataire'] as Map)
              : null,
        ),
        proprietaire: UtilisateurPublic.fromJson(
          j['proprietaire'] is Map
              ? Map<String, dynamic>.from(j['proprietaire'] as Map)
              : null,
        ),
        dateDebut: DateTime.parse(_str(j['date_debut'])),
        dateFin: DateTime.parse(_str(j['date_fin'])),
        telephoneContact: _str(j['telephone_contact']),
        nombrePersonnes: _int(j['nombre_personnes'], 1),
        message: _str(j['message']),
        periodes: _int(j['periodes'], 1),
        montantLocation: _int(j['montant_location']),
        caution: _int(j['caution']),
        avance: _int(j['avance']),
        frais: _int(j['frais']),
        montantTotal: _int(j['montant_total']),
        statut: _str(j['statut']),
        motif: _str(j['motif']),
        aAvis: j['a_avis'] == true,
        peutEvaluer: j['peut_evaluer'] == true,
        peutAnnuler: j['peut_annuler'] == true,
        creeLe: _date(j['cree_le']),
      );
}

class Estimation {
  const Estimation({
    required this.periodes,
    required this.periodicite,
    required this.montantLocation,
    required this.caution,
    required this.avance,
    required this.frais,
    required this.montantTotal,
    required this.instantanee,
  });

  final int periodes;
  final String periodicite;
  final int montantLocation;
  final int caution;
  final int avance;
  final int frais;
  final int montantTotal;
  final bool instantanee;

  factory Estimation.fromJson(Map<String, dynamic> j) => Estimation(
        periodes: _int(j['periodes'], 1),
        periodicite: _str(j['periodicite']),
        montantLocation: _int(j['montant_location']),
        caution: _int(j['caution']),
        avance: _int(j['avance']),
        frais: _int(j['frais']),
        montantTotal: _int(j['montant_total']),
        instantanee: j['reservation_instantanee'] == true,
      );
}

class Conversation {
  const Conversation({
    required this.id,
    required this.interlocuteur,
    this.logementId,
    this.logementTitre = '',
    this.logementPhoto,
    this.dernierMessage = '',
    this.dernierMessageLe,
    this.dernierEstMoi = false,
    this.nonLus = 0,
    this.bloquee = false,
    this.bloqueeParMoi = false,
  });

  final int id;
  final UtilisateurPublic interlocuteur;
  final int? logementId;
  final String logementTitre;
  final String? logementPhoto;
  final String dernierMessage;
  final DateTime? dernierMessageLe;
  final bool dernierEstMoi;
  final int nonLus;
  final bool bloquee;
  final bool bloqueeParMoi;

  factory Conversation.fromJson(Map<String, dynamic> j) {
    final logement = j['logement'] is Map
        ? Map<String, dynamic>.from(j['logement'] as Map)
        : null;
    final dernier = j['dernier_message'] is Map
        ? Map<String, dynamic>.from(j['dernier_message'] as Map)
        : null;
    return Conversation(
      id: _int(j['id']),
      interlocuteur: UtilisateurPublic.fromJson(
        Map<String, dynamic>.from(j['interlocuteur'] as Map? ?? const {}),
      ),
      logementId: logement == null ? null : _int(logement['id']),
      logementTitre: _str(logement?['titre']),
      logementPhoto: logement?['photo'] as String?,
      dernierMessage: _str(dernier?['texte']),
      dernierMessageLe: _date(dernier?['cree_le']),
      dernierEstMoi: dernier?['est_moi'] == true,
      nonLus: _int(j['non_lus']),
      bloquee: j['bloquee'] == true,
      bloqueeParMoi: j['bloquee_par_moi'] == true,
    );
  }
}

class Message {
  const Message({
    required this.id,
    required this.texte,
    required this.estMoi,
    this.image,
    this.lu = false,
    this.creeLe,
  });

  final int id;
  final String texte;
  final bool estMoi;
  final String? image;
  final bool lu;
  final DateTime? creeLe;

  factory Message.fromJson(Map<String, dynamic> j) => Message(
        id: _int(j['id']),
        texte: _str(j['texte']),
        estMoi: j['est_moi'] == true,
        image: j['image'] as String?,
        lu: j['lu'] == true,
        creeLe: _date(j['cree_le']),
      );
}

class NotificationApp {
  const NotificationApp({
    required this.id,
    required this.type,
    required this.titre,
    this.message = '',
    this.donnees = const {},
    this.lue = false,
    this.creeLe,
  });

  final int id;
  final String type;
  final String titre;
  final String message;
  final Map<String, dynamic> donnees;
  final bool lue;
  final DateTime? creeLe;

  factory NotificationApp.fromJson(Map<String, dynamic> j) => NotificationApp(
        id: _int(j['id']),
        type: _str(j['type']),
        titre: _str(j['titre']),
        message: _str(j['message']),
        donnees: j['donnees'] is Map
            ? Map<String, dynamic>.from(j['donnees'] as Map)
            : const {},
        lue: j['lue'] == true,
        creeLe: _date(j['cree_le']),
      );
}

class RechercheEnregistree {
  const RechercheEnregistree({
    required this.id,
    required this.nom,
    required this.criteres,
    this.alerteActive = true,
  });

  final int id;
  final String nom;
  final Map<String, dynamic> criteres;
  final bool alerteActive;

  factory RechercheEnregistree.fromJson(Map<String, dynamic> j) =>
      RechercheEnregistree(
        id: _int(j['id']),
        nom: _str(j['nom']),
        criteres: j['criteres'] is Map
            ? Map<String, dynamic>.from(j['criteres'] as Map)
            : const {},
        alerteActive: j['alerte_active'] != false,
      );
}

class SuggestionLieu {
  const SuggestionLieu({
    required this.type,
    required this.libelle,
    required this.total,
  });

  final String type;
  final String libelle;
  final int total;

  factory SuggestionLieu.fromJson(Map<String, dynamic> j) => SuggestionLieu(
        type: _str(j['type']),
        libelle: _str(j['libelle']),
        total: _int(j['total']),
      );
}

class DonneesAccueil {
  const DonneesAccueil({
    this.recents = const [],
    this.populaires = const [],
    this.recommandes = const [],
    this.verifies = const [],
    this.visites = const [],
    this.villes = const [],
    this.types = const {},
    this.total = 0,
  });

  final List<Logement> recents;
  final List<Logement> populaires;
  final List<Logement> recommandes;
  final List<Logement> verifies;
  final List<Logement> visites;
  final List<SuggestionLieu> villes;
  final Map<String, int> types;
  final int total;

  factory DonneesAccueil.fromJson(Map<String, dynamic> j) {
    List<Logement> liste(String cle) =>
        _listeMaps(j[cle]).map(Logement.fromJson).toList();
    return DonneesAccueil(
      recents: liste('recents'),
      populaires: liste('populaires'),
      recommandes: liste('recommandes'),
      verifies: liste('verifies'),
      visites: liste('visites_virtuelles'),
      villes: _listeMaps(j['villes'])
          .map(
            (v) => SuggestionLieu(
              type: 'ville',
              libelle: _str(v['ville']),
              total: _int(v['total']),
            ),
          )
          .toList(),
      types: j['types'] is Map
          ? (j['types'] as Map).map((k, v) => MapEntry('$k', _int(v)))
          : const {},
      total: _int(j['total']),
    );
  }
}

class StatistiquesProprietaire {
  const StatistiquesProprietaire({
    this.logementsTotal = 0,
    this.parStatut = const {},
    this.vues = 0,
    this.favoris = 0,
    this.reservations = 0,
    this.demandesEnAttente = 0,
    this.revenus = 0,
    this.noteMoyenne,
    this.nombreAvis = 0,
    this.top = const [],
  });

  final int logementsTotal;
  final Map<String, int> parStatut;
  final int vues;
  final int favoris;
  final int reservations;
  final int demandesEnAttente;
  final int revenus;
  final double? noteMoyenne;
  final int nombreAvis;
  final List<Map<String, dynamic>> top;

  factory StatistiquesProprietaire.fromJson(Map<String, dynamic> j) =>
      StatistiquesProprietaire(
        logementsTotal: _int(j['logements_total']),
        parStatut: j['logements_par_statut'] is Map
            ? (j['logements_par_statut'] as Map)
                .map((k, v) => MapEntry('$k', _int(v)))
            : const {},
        vues: _int(j['vues_total']),
        favoris: _int(j['favoris_total']),
        reservations: _int(j['reservations_total']),
        demandesEnAttente: _int(j['demandes_en_attente']),
        revenus: _int(j['revenus']),
        noteMoyenne: _double(j['note_moyenne']),
        nombreAvis: _int(j['nombre_avis']),
        top: _listeMaps(j['top_logements']),
      );
}
