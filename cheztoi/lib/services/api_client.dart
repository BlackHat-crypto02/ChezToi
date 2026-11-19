import 'dart:async';
import 'dart:convert';

import 'package:cheztoi/config/api_config.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:http/http.dart' as http;

/// Fichier à envoyer (photo, panorama...). Les octets fonctionnent aussi sur le web.
class FichierEnvoi {
  const FichierEnvoi({required this.octets, required this.nom});

  final List<int> octets;
  final String nom;
}

/// Client HTTP authentifié : ajoute le jeton, le renouvelle sur 401
/// et traduit les erreurs en [ApiException].
class ApiClient {
  ApiClient({required this.auth, http.Client? client})
      : _client = client ?? http.Client();

  final AuthService auth;
  final http.Client _client;

  /// Appelé quand la session ne peut plus être renouvelée (retour à la connexion).
  static void Function()? onSessionExpiree;

  static const Duration _delai = Duration(seconds: 20);

  Uri uri(String chemin, [Map<String, dynamic>? query]) {
    final parametres = <String, String>{};
    query?.forEach((cle, valeur) {
      if (valeur == null) return;
      final texte = valeur is Iterable ? valeur.join(',') : valeur.toString();
      if (texte.isNotEmpty) parametres[cle] = texte;
    });
    final base = Uri.parse('${ApiConfig.baseUrl}$chemin');
    return parametres.isEmpty ? base : base.replace(queryParameters: parametres);
  }

  Future<Map<String, String>> _entetes({bool json = true}) async {
    final jeton = await auth.token();
    return <String, String>{
      'Accept': 'application/json',
      if (json) 'Content-Type': 'application/json; charset=utf-8',
      if (jeton != null && jeton.isNotEmpty) 'Authorization': 'Bearer $jeton',
    };
  }

  Future<http.Response> _executer(
    Future<http.Response> Function(Map<String, String> entetes) requete, {
    bool json = true,
  }) async {
    Future<http.Response> envoyer() async {
      try {
        return await requete(await _entetes(json: json)).timeout(_delai);
      } on TimeoutException {
        throw const ApiException(
          'Le serveur met trop de temps à répondre. Réessayez.',
        );
      } on ApiException {
        rethrow;
      } catch (_) {
        throw const ApiException(
          'Impossible de joindre le serveur. Vérifiez votre connexion.',
        );
      }
    }

    var reponse = await envoyer();
    if (reponse.statusCode == 401 && (await auth.token()) != null) {
      if (await auth.rafraichir()) {
        reponse = await envoyer();
      } else {
        onSessionExpiree?.call();
        throw const ApiException(
          'Votre session a expiré. Reconnectez-vous.',
          statusCode: 401,
        );
      }
    }
    return reponse;
  }

  dynamic _decoder(http.Response reponse) {
    if (reponse.statusCode >= 200 && reponse.statusCode < 300) {
      if (reponse.bodyBytes.isEmpty) return null;
      try {
        return jsonDecode(utf8.decode(reponse.bodyBytes));
      } catch (_) {
        throw const ApiException('Réponse du serveur invalide.');
      }
    }
    throw ApiException(
      messageErreurApi(reponse),
      statusCode: reponse.statusCode,
    );
  }

  Future<dynamic> get(String chemin, {Map<String, dynamic>? query}) async {
    final reponse = await _executer(
      (entetes) => _client.get(uri(chemin, query), headers: entetes),
    );
    return _decoder(reponse);
  }

  Future<dynamic> post(String chemin, [Object? corps]) async {
    final reponse = await _executer(
      (entetes) => _client.post(
        uri(chemin),
        headers: entetes,
        body: jsonEncode(corps ?? const <String, dynamic>{}),
      ),
    );
    return _decoder(reponse);
  }

  Future<dynamic> patch(String chemin, Object corps) async {
    final reponse = await _executer(
      (entetes) => _client.patch(
        uri(chemin),
        headers: entetes,
        body: jsonEncode(corps),
      ),
    );
    return _decoder(reponse);
  }

  Future<dynamic> delete(String chemin, [Object? corps]) async {
    final reponse = await _executer(
      (entetes) => _client.delete(
        uri(chemin),
        headers: entetes,
        body: corps == null ? null : jsonEncode(corps),
      ),
    );
    return _decoder(reponse);
  }

  /// Envoi multipart (photo + champs texte), en POST ou PATCH.
  Future<dynamic> multipart(
    String chemin, {
    String methode = 'POST',
    Map<String, String> champs = const {},
    Map<String, FichierEnvoi> fichiers = const {},
  }) async {
    final reponse = await _executer(
      (entetes) async {
        final requete = http.MultipartRequest(methode, uri(chemin))
          ..headers.addAll(entetes)
          ..fields.addAll(champs);
        fichiers.forEach((champ, fichier) {
          requete.files.add(
            http.MultipartFile.fromBytes(
              champ,
              fichier.octets,
              filename: fichier.nom,
            ),
          );
        });
        final flux = await _client.send(requete);
        return http.Response.fromStream(flux);
      },
      json: false,
    );
    return _decoder(reponse);
  }
}
