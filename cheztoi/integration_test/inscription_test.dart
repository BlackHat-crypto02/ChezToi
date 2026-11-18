import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:cheztoi/main.dart' as app;
import 'package:cheztoi/views/locataire/navigation_locataire.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('créer un compte depuis l’émulateur ouvre la navigation',
      (tester) async {
    // Départ propre : on repart de l'écran de connexion.
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    final email = 'demo${DateTime.now().millisecondsSinceEpoch}@exemple.tg';

    app.main();
    await tester.pumpAndSettle();

    final lien = find.text('Créer un compte');
    await tester.ensureVisible(lien);
    await tester.tap(lien);
    await tester.pumpAndSettle();

    final champs = find.byType(TextFormField);
    final valeurs = [
      'Doe',
      'Kossi',
      email,
      '+228 90 00 00 00',
      'motdepasse123',
      'motdepasse123',
    ];
    for (var i = 0; i < valeurs.length; i++) {
      final champ = champs.at(i);
      await tester.ensureVisible(champ);
      await tester.enterText(champ, valeurs[i]);
    }

    final bouton = find.byType(FilledButton);
    await tester.ensureVisible(bouton);
    await tester.tap(bouton);

    // Attente de la vraie requête HTTP vers Django.
    for (var i = 0; i < 60; i++) {
      await tester.pump(const Duration(milliseconds: 250));
      if (find.byType(NavigationLocataire).evaluate().isNotEmpty) break;
    }

    expect(find.byType(NavigationLocataire), findsOneWidget);
    expect(find.text('Bonjour Kossi 👋'), findsOneWidget);
    expect(
      (await SharedPreferences.getInstance()).getString('cheztoi_access_token'),
      isNotNull,
    );

    // Laisse l'écran visible quelques secondes sur l'émulateur.
    await Future<void>.delayed(const Duration(seconds: 10));
  });
}
