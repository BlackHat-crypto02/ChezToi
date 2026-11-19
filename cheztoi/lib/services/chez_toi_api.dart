import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/api_client.dart';
import 'package:cheztoi/services/auth_service.dart';

/// Tous les appels métier de l'application, au-dessus de [ApiClient].
///
/// `ChezToiApi.instance` est initialisé dans `main.dart` ; les tests
/// peuvent le remplacer par une instance construite sur un `MockClient`.
class ChezToiApi {
  ChezToiApi(this.client);

  final ApiClient client;

  static ChezToiApi? _instance;

  static ChezToiApi get instance =>
      _instance ??= ChezToiApi(ApiClient(auth: AuthService()));

  static set instance(ChezToiApi valeur) => _instance = valeur;

  AuthService get auth => client.auth;

  List<Map<String, dynamic>> _liste(dynamic donnees) {
    final brut = donnees is Map && donnees['results'] is List
        ? donnees['results'] as List
        : (donnees is List ? donnees : const []);
    return brut
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  Map<String, dynamic> _map(dynamic donnees) =>
      donnees is Map ? Map<String, dynamic>.from(donnees) : <String, dynamic>{};

  // ------------------------------------------------------------ Logements

  Future<DonneesAccueil> accueil() async => DonneesAccueil.fromJson(
    _map(await client.get('/api/v1/logements/accueil/')),
  );

  Future<Page<Logement>> rechercher(
    Map<String, dynamic> criteres, {
    int page = 1,
    String tri = 'recent',
  }) async {
    final donnees = _map(
      await client.get(
        '/api/v1/logements/',
        query: {...criteres, 'page': page, 'tri': tri},
      ),
    );
    return Page(
      total: (donnees['count'] as num?)?.toInt() ?? 0,
      elements: _liste(donnees).map(Logement.fromJson).toList(),
      suite: donnees['next'] != null,
    );
  }

  Future<List<Logement>> logementsCarte(Map<String, dynamic> criteres) async =>
      _liste(await client.get('/api/v1/logements/carte/', query: criteres))
          .map(Logement.fromJson)
          .toList();

  Future<Logement> logement(int id) async =>
      Logement.fromJson(_map(await client.get('/api/v1/logements/$id/')));

  Future<List<Logement>> similaires(int id) async =>
      _liste(await client.get('/api/v1/logements/$id/similaires/'))
          .map(Logement.fromJson)
          .toList();

  /// Périodes réservées : liste de (début, fin).
  Future<List<(DateTime, DateTime)>> indisponibilites(int id) async =>
      _liste(await client.get('/api/v1/logements/$id/indisponibilites/'))
          .map(
            (p) => (
              DateTime.parse('${p['date_debut']}'),
              DateTime.parse('${p['date_fin']}'),
            ),
          )
          .toList();

  Future<List<SuggestionLieu>> suggestions(String texte) async => _liste(
    await client.get('/api/v1/logements/suggestions/', query: {'q': texte}),
  ).map(SuggestionLieu.fromJson).toList();

  Future<List<Logement>> comparer(List<int> ids) async => _liste(
    await client.get('/api/v1/logements/comparer/', query: {'ids': ids}),
  ).map(Logement.fromJson).toList();

  Future<List<Equipement>> equipements() async =>
      _liste(await client.get('/api/v1/equipements/'))
          .map(Equipement.fromJson)
          .toList();

  Future<List<Avis>> avisLogement(int id) async =>
      _liste(await client.get('/api/v1/logements/$id/avis/'))
          .map(Avis.fromJson)
          .toList();

  // -------------------------------------------------------------- Favoris

  Future<List<Logement>> favoris() async =>
      _liste(await client.get('/api/v1/favoris/'))
          .map(Logement.fromJson)
          .toList();

  Future<bool> basculerFavori(int id, {required bool ajouter}) async {
    if (ajouter) {
      await client.post('/api/v1/logements/$id/favori/');
    } else {
      await client.delete('/api/v1/logements/$id/favori/');
    }
    return ajouter;
  }

  // ---------------------------------------------------- Recherches / alertes

  Future<List<RechercheEnregistree>> recherches() async =>
      _liste(await client.get('/api/v1/recherches/'))
          .map(RechercheEnregistree.fromJson)
          .toList();

  Future<RechercheEnregistree> enregistrerRecherche(
    String nom,
    Map<String, dynamic> criteres,
  ) async => RechercheEnregistree.fromJson(
    _map(
      await client.post('/api/v1/recherches/', {
        'nom': nom,
        'criteres': criteres,
        'alerte_active': true,
      }),
    ),
  );

  Future<void> activerAlerte(int id, bool active) async =>
      client.patch('/api/v1/recherches/$id/', {'alerte_active': active});

  Future<void> supprimerRecherche(int id) async =>
      client.delete('/api/v1/recherches/$id/');

  // ---------------------------------------------------------- Réservations

  Map<String, dynamic> _periode(
    int logementId,
    DateTime debut,
    DateTime fin, {
    int personnes = 1,
    String message = '',
  }) => {
    'logement': logementId,
    'date_debut': _jour(debut),
    'date_fin': _jour(fin),
    'nombre_personnes': personnes,
    'message': message,
  };

  static String _jour(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  Future<Estimation> estimer(
    int logementId,
    DateTime debut,
    DateTime fin,
  ) async => Estimation.fromJson(
    _map(
      await client.post(
        '/api/v1/reservations/estimer/',
        _periode(logementId, debut, fin),
      ),
    ),
  );

  Future<Reservation> reserver(
    int logementId,
    DateTime debut,
    DateTime fin, {
    int personnes = 1,
    String message = '',
  }) async => Reservation.fromJson(
    _map(
      await client.post(
        '/api/v1/reservations/',
        _periode(
          logementId,
          debut,
          fin,
          personnes: personnes,
          message: message,
        ),
      ),
    ),
  );

  Future<List<Reservation>> mesReservations() async =>
      _liste(await client.get('/api/v1/reservations/'))
          .map(Reservation.fromJson)
          .toList();

  Future<List<Reservation>> reservationsRecues({String? statut}) async =>
      _liste(
        await client.get(
          '/api/v1/reservations/recues/',
          query: {'statut': statut},
        ),
      ).map(Reservation.fromJson).toList();

  Future<Reservation> reservation(int id) async =>
      Reservation.fromJson(_map(await client.get('/api/v1/reservations/$id/')));

  /// accepter, refuser, annuler.
  Future<Reservation> actionReservation(
    int id,
    String action, {
    String motif = '',
  }) async => Reservation.fromJson(
    _map(
      await client.post('/api/v1/reservations/$id/$action/', {'motif': motif}),
    ),
  );

  Future<void> donnerAvis(
    int reservationId,
    Map<String, dynamic> notes,
  ) async => client.post('/api/v1/reservations/$reservationId/avis/', notes);

  Future<List<Avis>> avisRecus() async =>
      _liste(await client.get('/api/v1/avis/recus/'))
          .map(Avis.fromJson)
          .toList();

  Future<void> repondreAvis(int avisId, String reponse) async =>
      client.post('/api/v1/avis/$avisId/repondre/', {'reponse': reponse});

  // ------------------------------------------------------------ Messagerie

  Future<List<Conversation>> conversations() async =>
      _liste(await client.get('/api/v1/conversations/'))
          .map(Conversation.fromJson)
          .toList();

  Future<Conversation> demarrerConversation({
    int? logementId,
    int? destinataireId,
    String texte = '',
  }) async => Conversation.fromJson(
    _map(
      await client.post('/api/v1/conversations/demarrer/', {
        'logement': ?logementId,
        'destinataire': ?destinataireId,
        if (texte.isNotEmpty) 'texte': texte,
      }),
    ),
  );

  Future<List<Message>> messages(int conversationId, {int? apres}) async =>
      _liste(
        await client.get(
          '/api/v1/conversations/$conversationId/messages/',
          query: {'apres': apres},
        ),
      ).map(Message.fromJson).toList();

  Future<Message> envoyerMessage(
    int conversationId, {
    String texte = '',
    FichierEnvoi? image,
  }) async {
    final chemin = '/api/v1/conversations/$conversationId/messages/';
    final donnees = image == null
        ? await client.post(chemin, {'texte': texte})
        : await client.multipart(
            chemin,
            champs: {'texte': texte},
            fichiers: {'image': image},
          );
    return Message.fromJson(_map(donnees));
  }

  Future<void> bloquer(int conversationId, {required bool bloquer}) async {
    final chemin = '/api/v1/conversations/$conversationId/bloquer/';
    if (bloquer) {
      await client.post(chemin);
    } else {
      await client.delete(chemin);
    }
  }

  Future<int> messagesNonLus() async =>
      (_map(await client.get('/api/v1/conversations/non-lus/'))['non_lus']
              as num?)
          ?.toInt() ??
      0;

  // ---------------------------------------------------------- Notifications

  Future<List<NotificationApp>> notifications() async =>
      _liste(await client.get('/api/v1/notifications/'))
          .map(NotificationApp.fromJson)
          .toList();

  Future<int> notificationsNonLues() async =>
      (_map(await client.get('/api/v1/notifications/non-lues/'))['non_lues']
              as num?)
          ?.toInt() ??
      0;

  Future<void> lireNotifications({int? id}) async => client.post(
    id == null
        ? '/api/v1/notifications/lire/'
        : '/api/v1/notifications/$id/lire/',
  );

  // ----------------------------------------------------------- Signalements

  Future<void> signaler({
    required String motif,
    String description = '',
    int? logementId,
    int? utilisateurId,
    int? reservationId,
    int? avisId,
    int? conversationId,
  }) async => client.post('/api/v1/signalements/', {
    'motif': motif,
    'description': description,
    'logement': ?logementId,
    'utilisateur': ?utilisateurId,
    'reservation': ?reservationId,
    'avis': ?avisId,
    'conversation': ?conversationId,
  });

  // ------------------------------------------------------------------ Profil

  /// Catégories de notifications : reservations, messages, alertes, annonces, avis.
  Future<Map<String, bool>> preferences() async =>
      _map(await client.get('/api/v1/auth/preferences/'))
          .map((k, v) => MapEntry(k, v == true));

  Future<Map<String, bool>> modifierPreferences(
    Map<String, bool> valeurs,
  ) async =>
      _map(await client.patch('/api/v1/auth/preferences/', valeurs))
          .map((k, v) => MapEntry(k, v == true));

  /// (compte vérifié ?, documents envoyés)
  Future<(bool, List<Justificatif>)> justificatifs() async {
    final donnees = _map(await client.get('/api/v1/auth/justificatifs/'));
    return (
      donnees['verifie'] == true,
      _liste(donnees['justificatifs']).map(Justificatif.fromJson).toList(),
    );
  }

  Future<void> envoyerJustificatif(String type, FichierEnvoi fichier) async =>
      client.multipart(
        '/api/v1/auth/justificatifs/',
        champs: {'type': type},
        fichiers: {'fichier': fichier},
      );

  /// Logements publiés correspondant aux identifiants, dans l'ordre demandé.
  Future<List<Logement>> logementsParIds(List<int> ids) async {
    if (ids.isEmpty) return const [];
    final page = await rechercher({'ids': ids, 'taille': ids.length});
    final parId = {for (final l in page.elements) l.id: l};
    return [for (final id in ids) ?parId[id]];
  }

  Future<Reservation> modifierReservation(
    int id,
    DateTime debut,
    DateTime fin,
  ) async => Reservation.fromJson(
    _map(
      await client.post('/api/v1/reservations/$id/modifier/', {
        'date_debut': _jour(debut),
        'date_fin': _jour(fin),
      }),
    ),
  );

  Future<UtilisateurAuth> modifierProfil(
    Map<String, String> champs, {
    FichierEnvoi? photo,
  }) async {
    final donnees = photo == null
        ? await client.patch('/api/v1/auth/me/', champs)
        : await client.multipart(
            '/api/v1/auth/me/',
            methode: 'PATCH',
            champs: champs,
            fichiers: {'photo': photo},
          );
    return auth.enregistrerUtilisateur(_map(donnees));
  }

  Future<UtilisateurAuth> rafraichirProfil() async =>
      auth.enregistrerUtilisateur(_map(await client.get('/api/v1/auth/me/')));

  Future<void> changerMotDePasse(String ancien, String nouveau) async =>
      client.post('/api/v1/auth/change-password/', {
        'ancien': ancien,
        'nouveau': nouveau,
      });

  Future<void> supprimerCompte(String motDePasse) async =>
      client.delete('/api/v1/auth/me/', {'password': motDePasse});

  // -------------------------------------------------- Espace propriétaire

  Future<List<Logement>> mesLogements() async =>
      _liste(await client.get('/api/v1/mes-logements/'))
          .map(Logement.fromJson)
          .toList();

  Future<Logement> monLogement(int id) async =>
      Logement.fromJson(_map(await client.get('/api/v1/mes-logements/$id/')));

  Future<Logement> enregistrerLogement(
    Map<String, dynamic> donnees, {
    int? id,
  }) async {
    final reponse = id == null
        ? await client.post('/api/v1/mes-logements/', donnees)
        : await client.patch('/api/v1/mes-logements/$id/', donnees);
    return Logement.fromJson(_map(reponse));
  }

  Future<void> supprimerLogement(int id) async =>
      client.delete('/api/v1/mes-logements/$id/');

  /// soumettre, brouillon, archiver, louee, republier.
  Future<Logement> changerStatutLogement(int id, String action) async =>
      Logement.fromJson(
        _map(await client.post('/api/v1/mes-logements/$id/$action/')),
      );

  Future<PhotoLogement> ajouterPhoto(
    int logementId,
    FichierEnvoi fichier, {
    String legende = '',
  }) async => PhotoLogement.fromJson(
    _map(
      await client.multipart(
        '/api/v1/mes-logements/$logementId/photos/',
        champs: {'legende': legende},
        fichiers: {'image': fichier},
      ),
    ),
  );

  Future<void> modifierPhoto(
    int logementId,
    int photoId,
    Map<String, dynamic> champs,
  ) async => client.patch(
    '/api/v1/mes-logements/$logementId/photos/$photoId/',
    champs,
  );

  Future<void> supprimerPhoto(int logementId, int photoId) async =>
      client.delete('/api/v1/mes-logements/$logementId/photos/$photoId/');

  Future<void> ajouterPanorama(
    int logementId,
    FichierEnvoi fichier,
    String piece,
  ) async => client.multipart(
    '/api/v1/mes-logements/$logementId/panoramas/',
    champs: {'piece': piece},
    fichiers: {'image': fichier},
  );

  Future<void> supprimerPanorama(int logementId, int panoramaId) async =>
      client.delete('/api/v1/mes-logements/$logementId/panoramas/$panoramaId/');

  Future<void> ajouterVideo(int logementId, FichierEnvoi fichier) async =>
      client.multipart(
        '/api/v1/mes-logements/$logementId/videos/',
        fichiers: {'fichier': fichier},
      );

  Future<void> supprimerVideo(int logementId, int videoId) async =>
      client.delete('/api/v1/mes-logements/$logementId/videos/$videoId/');

  Future<StatistiquesProprietaire> statistiques() async =>
      StatistiquesProprietaire.fromJson(
        _map(await client.get('/api/v1/mes-logements/statistiques/')),
      );
}
