import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:material_ui/material_ui.dart';
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:cheztoi/auth/connection.dart';
import 'package:cheztoi/main.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/views/locataire/navigation_locataire.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const utilisateur = {
    'id': 1,
    'username': 'kossi',
    'email': 'kossi@exemple.tg',
    'first_name': 'Kossi',
    'last_name': 'Doe',
    'role': 'locataire',
    'phone': '+228 90 00 00 00',
    'city': 'Lomé',
  };

  MockClient clientQuiAccepteTout() => MockClient((request) async {
        if (request.url.path.endsWith('/register/')) {
          return http.Response(
            jsonEncode({'id': 1}),
            201,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode({'access': 'token', 'user': utilisateur}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

  setUp(() => SharedPreferences.setMockInitialValues({}));

  void ecranGrand(WidgetTester tester) {
    tester.view.physicalSize = const Size(1200, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  }

  testWidgets('la connexion ouvre la navigation', (tester) async {
    ecranGrand(tester);
    final service = AuthService(client: clientQuiAccepteTout());

    await tester.pumpWidget(MyApp(authService: service));
    await tester.enterText(find.byType(TextFormField).at(0), 'kossi@exemple.tg');
    await tester.enterText(find.byType(TextFormField).at(1), 'motdepasse123');
    final bouton = find.text('Se connecter');
    await tester.ensureVisible(bouton);
    await tester.tap(bouton);
    await tester.pumpAndSettle();

    expect(find.byType(NavigationLocataire), findsOneWidget);
    expect(find.byType(Connection), findsNothing);
  });

  testWidgets('l’inscription ouvre la navigation', (tester) async {
    ecranGrand(tester);
    final service = AuthService(client: clientQuiAccepteTout());

    await tester.pumpWidget(MyApp(authService: service));
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
}
