import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'package:cheztoi/auth/inscription.dart';
import 'package:cheztoi/main.dart';

void main() {
  testWidgets('La page de connexion affiche le logo et les champs',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());

    expect(find.text('Bienvenue sur ChezToi'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });

  testWidgets('Le formulaire d’inscription change selon le rôle',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Inscription()));

    expect(find.text('Situation professionnelle'), findsOneWidget);
    expect(find.text('Biens à louer'), findsNothing);

    await tester.tap(find.text('Propriétaire'));
    await tester.pumpAndSettle();

    expect(find.text('Biens à louer'), findsOneWidget);
    expect(find.text('Situation professionnelle'), findsNothing);
  });
}
