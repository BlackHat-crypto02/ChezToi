import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

import 'package:cheztoi/auth/connection.dart';
import 'package:cheztoi/auth/inscription.dart';
import 'package:cheztoi/views/locataire/navigation_locataire.dart';
import 'package:cheztoi/views/locataire/ongles/accueil.dart';
import 'package:cheztoi/widget/styles.dart';

void main() {
  testWidgets('La page de connexion affiche le logo et les champs',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Connection()));

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

  testWidgets('La carte est un ongle comme les autres',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: NavigationLocataire()));

    await tester.tap(find.text('Carte'));
    await tester.pumpAndSettle();

    // Le label de la barre et le corps de la page affichent « Carte ».
    expect(find.text('Carte'), findsNWidgets(2));
    expect(find.byType(FloatingActionButton), findsNothing);
  });

  testWidgets('L’accueil affiche les icônes et le logo ChezToi',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Accueil()));

    expect(find.byIcon(RemixIcons.user_3_line), findsOneWidget);
    expect(find.byIcon(RemixIcons.notification_3_line), findsOneWidget);

    final logoFinder = find.byWidgetPredicate(
      (widget) =>
          widget is RichText && widget.text.toPlainText() == 'ChezToi',
    );
    expect(logoFinder, findsOneWidget);

    final logo = tester.widget<RichText>(logoFinder);
    final spans = (logo.text as TextSpan).children!;
    expect((spans[0] as TextSpan).text, 'Chez');
    expect((spans[1] as TextSpan).text, 'Toi');
    expect((spans[1] as TextSpan).style?.color, Styles.bleu);
  });
}
