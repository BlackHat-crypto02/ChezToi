import 'dart:convert';

import 'package:cheztoi/services/api_client.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// Annonce minimale au format renvoyé par l'API.
Map<String, dynamic> logementJson(
  int id, {
  String titre = 'Studio Tokoin',
  int prix = 100000,
  String ville = 'Lomé',
  String quartier = 'Tokoin',
  bool favori = false,
}) =>
    {
      'id': id,
      'titre': titre,
      'description': 'Description',
      'type_logement': 'studio',
      'meuble': true,
      'chambres': 1,
      'salles_de_bain': 1,
      'superficie': 30,
      'prix': prix,
      'devise': 'XOF',
      'periodicite': 'mois',
      'ville': ville,
      'quartier': quartier,
      'latitude': 6.15,
      'longitude': 1.21,
      'photo': null,
      'verifie': true,
      'statut': 'publiee',
      'a_visite_virtuelle': false,
      'note_moyenne': null,
      'nombre_avis': 0,
      'est_favori': favori,
    };

/// Réponses par défaut, indexées par chemin d'API.
Map<String, Object> reponsesParDefaut() => {
      '/api/v1/logements/accueil/': {
        'recents': [
          logementJson(1, titre: 'Villa Lomé II', prix: 850000),
          logementJson(2, titre: 'Studio Kara', prix: 60000, ville: 'Kara'),
        ],
        'populaires': <Object>[],
        'recommandes': <Object>[],
        'verifies': <Object>[],
        'visites_virtuelles': <Object>[],
        'villes': [
          {'ville': 'Lomé', 'total': 5},
        ],
        'types': {'studio': 2},
        'total': 2,
      },
      '/api/v1/logements/': {
        'count': 1,
        'next': null,
        'results': [logementJson(3)],
      },
      '/api/v1/logements/carte/': [logementJson(3)],
      '/api/v1/favoris/': [logementJson(4, titre: 'Mon favori', favori: true)],
      '/api/v1/notifications/non-lues/': {'non_lues': 2},
      '/api/v1/conversations/non-lus/': {'non_lus': 0},
      '/api/v1/conversations/': <Object>[],
    };

/// Installe une [ChezToiApi] branchée sur un `MockClient` et renvoie
/// la liste des requêtes reçues pour les vérifications.
List<http.Request> installerFausseApi([Map<String, Object>? surcharges]) {
  final reponses = {...reponsesParDefaut(), ...?surcharges};
  final requetes = <http.Request>[];
  final client = MockClient((requete) async {
    requetes.add(requete);
    final corps = reponses[requete.url.path];
    if (corps == null) return http.Response('{"detail":"Introuvable"}', 404);
    return http.Response.bytes(
      utf8.encode(jsonEncode(corps)),
      requete.method == 'POST' ? 201 : 200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  });
  ChezToiApi.instance = ChezToiApi(
    ApiClient(auth: AuthService(client: client), client: client),
  );
  return requetes;
}
