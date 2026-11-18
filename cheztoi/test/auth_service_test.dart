import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:cheztoi/services/auth_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const utilisateurJson = {
    'id': 7,
    'username': 'locataire1',
    'email': 'locataire1@exemple.tg',
    'first_name': 'Kossi',
    'last_name': 'Doe',
    'role': 'locataire',
    'phone': '+228 90 00 00 00',
    'city': 'Lomé',
  };

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('la connexion envoie e-mail/mot de passe et garde la session', () async {
    final requetes = <http.Request>[];
    final client = MockClient((request) async {
      requetes.add(request);
      return http.Response(
        jsonEncode({
          'access': 'token-access',
          'refresh': 'token-refresh',
          'user': utilisateurJson,
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    final service = AuthService(client: client);

    final utilisateur = await service.connexion(
      email: 'locataire1@exemple.tg',
      motDePasse: 'motdepasse123',
    );

    expect(requetes, hasLength(1));
    expect(requetes.first.url.path, endsWith('/api/v1/auth/login/'));
    expect(
      jsonDecode(requetes.first.body),
      {
        'email': 'locataire1@exemple.tg',
        'password': 'motdepasse123',
      },
    );
    expect(utilisateur.prenom, 'Kossi');
    expect(utilisateur.ville, 'Lomé');
    expect(await service.estConnecte(), isTrue);
    expect((await service.utilisateurCourant())?.email, 'locataire1@exemple.tg');
  });

  test('inscription puis connexion automatique', () async {
    final chemins = <String>[];
    final client = MockClient((request) async {
      chemins.add(request.url.path);
      if (request.url.path.endsWith('/register/')) {
        return http.Response(jsonEncode({'id': 7}), 201);
      }
      return http.Response(
        jsonEncode({
          'access': 'token-access',
          'user': utilisateurJson,
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    final service = AuthService(client: client);

    await service.inscription(
      nom: 'Doe',
      prenom: 'Kossi',
      email: 'locataire1@exemple.tg',
      telephone: '+228 90 00 00 00',
      ville: 'Lomé',
      role: 'locataire',
      motDePasse: 'motdepasse123',
    );

    expect(
      chemins,
      [
        endsWith('/api/v1/auth/register/'),
        endsWith('/api/v1/auth/login/'),
      ],
    );
  });

  test('les erreurs du backend sont affichées en français', () async {
    final client = MockClient((request) async {
      return http.Response(
        jsonEncode({'detail': 'Identifiants incorrects.'}),
        401,
        headers: {'content-type': 'application/json'},
      );
    });

    expect(
      () => AuthService(client: client).connexion(
        email: 'locataire1@exemple.tg',
        motDePasse: 'mauvais',
      ),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Identifiants incorrects.',
        ),
      ),
    );
  });

  test('la déconnexion efface la session', () async {
    final client = MockClient((request) async {
      return http.Response(
        jsonEncode({'access': 'token', 'user': utilisateurJson}),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    final service = AuthService(client: client);

    await service.connexion(email: 'x@y.tg', motDePasse: 'motdepasse123');
    await service.deconnecter();

    expect(await service.estConnecte(), isFalse);
    expect(await service.utilisateurCourant(), isNull);
  });
}
