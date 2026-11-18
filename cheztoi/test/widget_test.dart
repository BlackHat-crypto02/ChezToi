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

  testWidgets('L’accueil affiche la recherche, les annonces et les raccourcis',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Accueil()));

    expect(find.text('Bonjour Uriel 👋'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Visitez avant de vous déplacer'), findsOneWidget);
    expect(find.text('Appartement disponible à Lomé'), findsOneWidget);
    expect(find.text('Explorer'), findsOneWidget);

    expect(find.text('Favoris'), findsOneWidget);
    expect(find.text('Réservations'), findsOneWidget);
    expect(find.text('Alertes'), findsOneWidget);
    expect(find.text('Comparer'), findsOneWidget);
  });

  testWidgets('L’accueil ne déborde pas sur un petit écran',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
      tester.platformDispatcher.clearTextScaleFactorTestValue();
    });

    await tester.pumpWidget(const MaterialApp(home: NavigationLocataire()));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });

  testWidgets('Les quatre raccourcis ont la même hauteur',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Accueil()));

    final hauteurs = {
      for (final label in ['Favoris', 'Réservations', 'Alertes', 'Comparer'])
        tester.getSize(find.byKey(ValueKey('raccourci_$label'))).height,
    };

    expect(hauteurs.length, 1);
  });

  testWidgets('L’accueil affiche les biens récemment visités',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Accueil()));

    expect(find.text('Récemment visité'), findsOneWidget);
    expect(find.text('Récemment publié'), findsOneWidget);
    expect(find.text('Voir tout'), findsNWidgets(2));

    expect(find.text('350 000 FCFA'), findsOneWidget);
    expect(find.text('Lomé, Maritime'), findsOneWidget);
    expect(find.text('180 000 FCFA'), findsOneWidget);
    expect(find.text('Kara, Savanes'), findsOneWidget);

    expect(find.text('220 000 FCFA'), findsOneWidget);
    expect(find.text('Sokodé, Centrale'), findsOneWidget);
    expect(find.text('600 000 FCFA'), findsOneWidget);
    expect(find.text('Kpalimé, Plateaux'), findsOneWidget);
    expect(find.byType(Image), findsNWidgets(4));
  });

  testWidgets('Le bouton favori bascule l’icône cœur',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Accueil()));

    final favori = find.byKey(const ValueKey('favori_visite_1'));
    expect(favori, findsOneWidget);

    await tester.ensureVisible(favori);
    await tester.pumpAndSettle();
    // 1 cœur pour le raccourci « Favoris » + 1 par carte de bien.
    expect(find.byIcon(RemixIcons.heart_3_line), findsNWidgets(5));

    await tester.tap(favori);
    await tester.pump();

    expect(find.byIcon(RemixIcons.heart_3_fill), findsOneWidget);
    expect(find.byIcon(RemixIcons.heart_3_line), findsNWidgets(4));
  });
}
