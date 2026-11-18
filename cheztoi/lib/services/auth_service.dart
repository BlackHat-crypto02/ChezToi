import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cheztoi/config/api_config.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Erreur métier renvoyée par l'API, déjà traduite en français.
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Utilisateur renvoyé par `/login/` ou `/me/`.
class UtilisateurAuth {
  const UtilisateurAuth({
    required this.id,
    required this.username,
    required this.email,
    required this.prenom,
    required this.nom,
    required this.role,
    required this.telephone,
    required this.ville,
  });

  final int id;
  final String username;
  final String email;
  final String prenom;
  final String nom;
  final String role;
  final String telephone;
  final String ville;

  factory UtilisateurAuth.fromJson(Map<String, dynamic> json) {
    return UtilisateurAuth(
      id: json['id'] is int ? json['id'] as int : 0,
      username: (json['username'] as String?) ?? '',
      email: (json['email'] as String?) ?? '',
      prenom: (json['first_name'] as String?) ?? '',
      nom: (json['last_name'] as String?) ?? '',
      role: (json['role'] as String?) ?? 'locataire',
      telephone: (json['phone'] as String?) ?? '',
      ville: (json['city'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'email': email,
        'first_name': prenom,
        'last_name': nom,
        'role': role,
        'phone': telephone,
        'city': ville,
      };
}

/// Connexion, inscription et session persistée du backend ChezToi.
class AuthService {
  AuthService({http.Client? client, SharedPreferences? preferences})
      : _client = client ?? http.Client() {
    if (preferences != null) _preferences = preferences;
  }

  static const String _cleToken = 'cheztoi_access_token';
  static const String _cleRefresh = 'cheztoi_refresh_token';
  static const String _cleUtilisateur = 'cheztoi_user';

  final http.Client _client;
  SharedPreferences? _preferences;

  Future<SharedPreferences> get _prefs async {
    return _preferences ??= await SharedPreferences.getInstance();
  }

  Future<bool> estConnecte() async {
    final prefs = await _prefs;
    return (prefs.getString(_cleToken) ?? '').isNotEmpty;
  }

  Future<String?> token() async {
    final prefs = await _prefs;
    return prefs.getString(_cleToken);
  }

  Future<UtilisateurAuth?> utilisateurCourant() async {
    final prefs = await _prefs;
    final donnees = prefs.getString(_cleUtilisateur);
    if (donnees == null || donnees.isEmpty) return null;
    try {
      return UtilisateurAuth.fromJson(
        jsonDecode(donnees) as Map<String, dynamic>,
      );
    } catch (_) {
      return null;
    }
  }

  Future<UtilisateurAuth> connexion({
    required String email,
    required String motDePasse,
  }) async {
    final reponse = await _post(
      '/api/v1/auth/login/',
      <String, dynamic>{
        'email': email.trim(),
        'password': motDePasse,
      },
    );
    await _enregistrerSession(reponse);
    return UtilisateurAuth.fromJson(
      reponse['user'] as Map<String, dynamic>? ?? <String, dynamic>{},
    );
  }

  Future<UtilisateurAuth> inscription({
    required String nom,
    required String prenom,
    required String email,
    required String telephone,
    required String ville,
    required String role,
    required String motDePasse,
  }) async {
    await _post(
      '/api/v1/auth/register/',
      <String, dynamic>{
        'first_name': prenom.trim(),
        'last_name': nom.trim(),
        'email': email.trim(),
        'password': motDePasse,
        'role': role,
        'phone': telephone.trim(),
        'city': ville,
      },
    );
    // Le compte est créé : on le connecte directement pour éviter de
    // redemander les identifiants juste après l'inscription.
    return connexion(email: email, motDePasse: motDePasse);
  }

  Future<void> deconnecter() async {
    final prefs = await _prefs;
    await prefs.remove(_cleToken);
    await prefs.remove(_cleRefresh);
    await prefs.remove(_cleUtilisateur);
  }

  Future<void> _enregistrerSession(Map<String, dynamic> reponse) async {
    final access = reponse['access'] as String?;
    if (access == null || access.isEmpty) {
      throw const ApiException('Réponse de connexion invalide.');
    }
    final prefs = await _prefs;
    await prefs.setString(_cleToken, access);
    if (reponse['refresh'] is String) {
      await prefs.setString(_cleRefresh, reponse['refresh'] as String);
    }
    final utilisateur = reponse['user'];
    if (utilisateur is Map<String, dynamic>) {
      await prefs.setString(_cleUtilisateur, jsonEncode(utilisateur));
    }
  }

  Future<Map<String, dynamic>> _post(
    String chemin,
    Map<String, dynamic> corps,
  ) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$chemin');
    late final http.Response reponse;
    try {
      reponse = await _client
          .post(
            uri,
            headers: const <String, String>{
              'Content-Type': 'application/json; charset=utf-8',
              'Accept': 'application/json',
            },
            body: jsonEncode(corps),
          )
          .timeout(const Duration(seconds: 15));
    } on SocketException {
      throw const ApiException(
        'Impossible de joindre le serveur. Vérifiez votre connexion.',
      );
    } on TimeoutException {
      throw const ApiException(
        'Le serveur met trop de temps à répondre. Réessayez.',
      );
    } catch (e) {
      throw ApiException('Une erreur est survenue : $e');
    }

    if (reponse.statusCode >= 200 && reponse.statusCode < 300) {
      try {
        return jsonDecode(utf8.decode(reponse.bodyBytes))
            as Map<String, dynamic>;
      } catch (_) {
        throw const ApiException('Réponse du serveur invalide.');
      }
    }
    throw ApiException(
      _messageErreur(reponse),
      statusCode: reponse.statusCode,
    );
  }

  String _messageErreur(http.Response reponse) {
    try {
      final data = jsonDecode(utf8.decode(reponse.bodyBytes));
      if (data is Map<String, dynamic>) {
        final detail = data['detail'];
        if (detail is String && detail.isNotEmpty) return detail;

        final messages = <String>[];
        data.forEach((cle, valeur) {
          if (valeur is List) {
            for (final item in valeur) {
              if (item is! String || item.isEmpty) continue;
              if (cle == 'non_field_errors' || cle == 'detail') {
                messages.add(item);
              } else {
                messages.add('${cle.replaceAll('_', ' ')} : $item');
              }
            }
          } else if (valeur is String && valeur.isNotEmpty) {
            messages.add(valeur);
          }
        });
        if (messages.isNotEmpty) return messages.join('\n');
      }
    } catch (_) {
      // Réponse HTML ou vide : on retombe sur le message générique.
    }
    return 'Erreur ${reponse.statusCode}. Réessayez.';
  }
}
