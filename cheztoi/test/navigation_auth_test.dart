import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:cheztoi/auth/connection.dart';
import 'package:cheztoi/main.dart';
import 'package:cheztoi/services/api_client.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/demarrage/presentation.dart';
import 'package:cheztoi/views/locataire/navigation_locataire.dart';
import 'package:cheztoi/views/proprietaire/navigation_proprietaire.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Map<String, Object?> utilisateur({String role = 'locataire'}) => {
        'id': 1,
        'username': 'kossi',
        'email': 'kossi@exemple.tg',
        'first_name': 'Kossi',
        'last_name': 'Doe',
        'role': role,
        'phone': '+228 90 00 00 00',
        'city': 'Lomé',
      };

  /// Connexion / inscription acceptées ; les autres routes renvoient des
  /// listes vides (accueil vide, aucun favori...).
  MockClient faussesReponses({String role = 'locataire'}) =>
      MockClient((request) async {
        final chemin = request.url.path;
        Object corps;
        if (chemin.endsWith('/register/')) {
          corps = {'id': 1};
        } else if (chemin.endsWith('/login/')) {
          corps = {'access': 'token', 'user': utilisateur(role: role)};
        } else if (chemin.endsWith('/auth/me/')) {
          corps = utilisateur(role: role);
        } else if (chemin.endsWith('/logements/') || chemin.contains('statistiques')) {
          corps = {'count': 0, 'next': null, 'results': <Object>[]};
        } else if (chemin.contains('non-l')) {
          corps = {'non_lus': 0, 'non_lues': 0};
        } else if (chemin.endsWith('/accueil/')) {
          corps = {'total': 0};
        } else {
          corps = <Object>[];
        }
        return http.Response.bytes(
          utf8.encode(jsonEncode(corps)),
          chemin.endsWith('/register/') ? 201 : 200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

  Widget application(AuthService service, http.Client client) => MyApp(
        authService: service,
        api: ChezToiApi(ApiClient(auth: service, client: client)),
        demarrageAnime: false,
      );

  setUp(() {
    SharedPreferences.setMockInitialValues({'cheztoi_presentation_vue': true});
    Session.utilisateur.value = null;
  });

  void ecranGrand(WidgetTester tester) {
    tester.view.physicalSize = const Size(1200, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  }

  testWidgets('un invité arrive directement dans l’application', (tester) async {
    ecranGrand(tester);
    final client = faussesReponses();
    await tester.pumpWidget(application(AuthService(client: client), client));
    await tester.pumpAndSettle();

    expect(find.byType(NavigationLocataire), findsOneWidget);
    expect(find.byType(Connection), findsNothing);
    expect(find.text('Bienvenue 👋'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
  });

  testWidgets('le premier lancement présente l’application', (tester) async {
    ecranGrand(tester);
    SharedPreferences.setMockInitialValues({});
    final client = faussesReponses();
    await tester.pumpWidget(application(AuthService(client: client), client));
    await tester.pumpAndSettle();

    expect(find.byType(Presentation), findsOneWidget);
    await tester.tap(find.text('Passer'));
    await tester.pumpAndSettle();
    expect(find.byType(NavigationLocataire), findsOneWidget);

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('cheztoi_presentation_vue'), isTrue);
  });

  testWidgets('les favoris d’un invité invitent à se connecter', (tester) async {
    ecranGrand(tester);
    final client = faussesReponses();
    await tester.pumpWidget(application(AuthService(client: client), client));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Favoris').last);
    await tester.pumpAndSettle();
    expect(find.text('Gardez vos coups de cœur'), findsOneWidget);
    expect(find.text('Créer un compte gratuit'), findsOneWidget);
  });

  testWidgets('la connexion depuis l’accueil garde l’utilisateur sur place',
      (tester) async {
    ecranGrand(tester);
    final client = faussesReponses();
    await tester.pumpWidget(application(AuthService(client: client), client));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Se connecter'));
    await tester.pumpAndSettle();
    expect(find.byType(Connection), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(0), 'kossi@exemple.tg');
    await tester.enterText(find.byType(TextFormField).at(1), 'motdepasse123');
    final bouton = find.widgetWithText(FilledButton, 'Se connecter');
    await tester.ensureVisible(bouton);
    await tester.tap(bouton);
    await tester.pumpAndSettle();

    expect(find.byType(Connection), findsNothing);
    expect(find.byType(NavigationLocataire), findsOneWidget);
    expect(find.text('Bonjour Kossi 👋'), findsOneWidget);
    expect(Session.estConnecte, isTrue);
  });

  testWidgets('l’inscription depuis l’accueil connecte l’utilisateur',
      (tester) async {
    ecranGrand(tester);
    final client = faussesReponses();
    await tester.pumpWidget(application(AuthService(client: client), client));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Se connecter'));
    await tester.pumpAndSettle();
    final lien = find.text('Créer un compte');
    await tester.ensureVisible(lien);
    await tester.tap(lien);
    await tester.pumpAndSettle();

    final champs = find.byType(TextFormField);
    for (var i = 0; i < 6; i++) {
      await tester.enterText(champs.at(i), 'valeur$i');
    }
    await tester.enterText(champs.at(1), 'Kossi');
    await tester.enterText(champs.at(2), 'kossi@exemple.tg');
    await tester.enterText(champs.at(3), '+228 90 00 00 00');
    await tester.enterText(champs.at(4), 'motdepasse123');
    await tester.enterText(champs.at(5), 'motdepasse123');
    final bouton = find.byType(FilledButton);
    await tester.ensureVisible(bouton);
    await tester.tap(bouton);
    await tester.pumpAndSettle();

    expect(find.byType(NavigationLocataire), findsOneWidget);
    expect(find.text('Bonjour Kossi 👋'), findsOneWidget);
  });

  testWidgets('un propriétaire qui se connecte bascule dans son espace',
      (tester) async {
    ecranGrand(tester);
    final client = faussesReponses(role: 'proprietaire');
    await tester.pumpWidget(application(AuthService(client: client), client));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Se connecter'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'proprio@exemple.tg');
    await tester.enterText(find.byType(TextFormField).at(1), 'motdepasse123');
    final bouton = find.widgetWithText(FilledButton, 'Se connecter');
    await tester.ensureVisible(bouton);
    await tester.tap(bouton);
    await tester.pumpAndSettle();

    expect(find.byType(NavigationProprietaire), findsOneWidget);
  });
}
