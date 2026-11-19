import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:cheztoi/auth/connection.dart';
import 'package:cheztoi/auth/inscription.dart';
import 'package:cheztoi/views/locataire/navigation_locataire.dart';
import 'package:cheztoi/views/locataire/ongles/accueil.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/commun/parametres.dart';
import 'package:cheztoi/views/commun/profil.dart';
import 'package:cheztoi/views/locataire/ongles/favoris.dart';
import 'package:cheztoi/views/locataire/ongles/recherche.dart';
import 'package:cheztoi/views/proprietaire/navigation_proprietaire.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';

import 'fausse_api.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    installerFausseApi();
  });

  void ecranGrand(WidgetTester tester) {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  }

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

  testWidgets('La carte est un onglet comme les autres',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: NavigationLocataire()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Carte'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(FlutterMap), findsOneWidget);
    expect(find.byType(FloatingActionButton), findsNothing);
  });

  testWidgets('L’accueil affiche les icônes et le logo ChezToi',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Accueil()));
    await tester.pumpAndSettle();

    expect(find.byIcon(RemixIcons.user_3_line), findsOneWidget);
    expect(find.byIcon(RemixIcons.notification_3_line), findsOneWidget);
    // Badge des 2 notifications non lues renvoyées par l'API.
    expect(find.text('2'), findsWidgets);

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

  testWidgets('L’accueil affiche la recherche, les bannières et les raccourcis',
      (WidgetTester tester) async {
    ecranGrand(tester);
    await tester.pumpWidget(const MaterialApp(home: Accueil(prenom: 'Uriel')));
    await tester.pumpAndSettle();

    expect(find.text('Bonjour Uriel 👋'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Visitez avant de vous déplacer'), findsOneWidget);
    expect(find.text('Logements disponibles à Lomé'), findsOneWidget);
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
    ecranGrand(tester);
    await tester.pumpWidget(const MaterialApp(home: Accueil()));
    await tester.pumpAndSettle();

    final hauteurs = {
      for (final label in ['Favoris', 'Réservations', 'Alertes', 'Comparer'])
        tester.getSize(find.byKey(ValueKey('raccourci_$label'))).height,
    };

    expect(hauteurs.length, 1);
  });

  testWidgets('L’accueil affiche les annonces renvoyées par l’API',
      (WidgetTester tester) async {
    ecranGrand(tester);
    await tester.pumpWidget(const MaterialApp(home: Accueil()));
    await tester.pumpAndSettle();

    expect(find.text('Récemment publiés'), findsOneWidget);
    expect(find.text('Villa Lomé II'), findsOneWidget);
    expect(find.text(formatPrix(850000)), findsOneWidget);
    expect(find.text('Tokoin, Kara'), findsOneWidget);
    // Sections vides masquées.
    expect(find.text('Les plus consultés'), findsNothing);
  });

  testWidgets('Le bouton favori bascule l’icône cœur et appelle l’API',
      (WidgetTester tester) async {
    ecranGrand(tester);
    final requetes = installerFausseApi({
      '/api/v1/logements/1/favori/': {'est_favori': true},
    });
    await tester.pumpWidget(const MaterialApp(home: Accueil()));
    await tester.pumpAndSettle();

    final favori = find.byKey(const ValueKey('favori_1'));
    expect(favori, findsOneWidget);

    await tester.tap(favori);
    await tester.pumpAndSettle();

    expect(find.byIcon(RemixIcons.heart_3_fill), findsOneWidget);
    expect(
      requetes.any(
        (r) => r.method == 'POST' && r.url.path == '/api/v1/logements/1/favori/',
      ),
      isTrue,
    );
  });

  testWidgets('Les favoris s’affichent et passent en mode comparaison',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Favoris()));
    await tester.pumpAndSettle();

    expect(find.text('Mon favori'), findsOneWidget);
    await tester.tap(find.text('Comparer'));
    await tester.pumpAndSettle();

    expect(find.text('Choisir 2 à 4 logements'), findsOneWidget);
    expect(find.byType(Checkbox), findsOneWidget);
  });

  testWidgets('L’espace propriétaire a ses propres onglets',
      (WidgetTester tester) async {
    installerFausseApi({
      '/api/v1/mes-logements/statistiques/': {
        'logements_total': 3,
        'logements_par_statut': {'publiee': 2},
        'demandes_en_attente': 1,
        'top_logements': <Object>[],
      },
    });
    await tester.pumpWidget(const MaterialApp(home: NavigationProprietaire()));
    await tester.pumpAndSettle();

    for (final onglet in ['Tableau', 'Logements', 'Demandes', 'Messages', 'Profil']) {
      expect(
        find.descendant(
          of: find.byType(BottomNavigationBar),
          matching: find.text(onglet),
        ),
        findsOneWidget,
      );
    }
    expect(find.text('1 demande(s) en attente'), findsOneWidget);
  });

  testWidgets('La connexion accepte un numéro de téléphone',
      (WidgetTester tester) async {
    ecranGrand(tester);
    await tester.pumpWidget(const MaterialApp(home: Connection()));

    expect(find.text('E-mail ou téléphone'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField).at(0), '90 11');
    await tester.enterText(find.byType(TextFormField).at(1), 'motdepasse');
    await tester.tap(find.text('Se connecter'));
    await tester.pump();
    expect(find.text('Numéro de téléphone invalide'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(0), '90 11 22 33');
    await tester.tap(find.text('Se connecter'));
    await tester.pump();
    expect(find.text('Numéro de téléphone invalide'), findsNothing);
  });

  testWidgets('Les préférences de notification se règlent par catégorie',
      (WidgetTester tester) async {
    final requetes = installerFausseApi({
      '/api/v1/auth/preferences/': {
        'reservations': true,
        'messages': true,
        'alertes': true,
        'annonces': true,
        'avis': true,
      },
    });
    await tester.pumpWidget(
      const MaterialApp(home: PreferencesNotifications()),
    );
    await tester.pumpAndSettle();

    expect(find.byType(SwitchListTile), findsNWidgets(5));
    await tester.tap(find.text('Messages'));
    await tester.pumpAndSettle();
    expect(
      requetes.any(
        (r) =>
            r.method == 'PATCH' &&
            r.url.path == '/api/v1/auth/preferences/' &&
            r.body.contains('"messages":false'),
      ),
      isTrue,
    );
  });

  testWidgets('L’aide affiche la FAQ et le contact', (WidgetTester tester) async {
    ecranGrand(tester);
    await tester.pumpWidget(const MaterialApp(home: Assistance()));

    expect(find.text('Comment réserver un logement ?'), findsOneWidget);
    await tester.tap(find.text('Comment réserver un logement ?'));
    await tester.pumpAndSettle();
    expect(find.textContaining('réservation instantanée'), findsOneWidget);
    expect(find.text(emailSupport), findsOneWidget);
  });

  testWidgets('La recherche propose « Autour de moi »', (WidgetTester tester) async {
    ecranGrand(tester);
    await tester.pumpWidget(const MaterialApp(home: Recherche()));
    await tester.pumpAndSettle();

    expect(find.text('Autour de moi'), findsOneWidget);
    expect(find.text('1 logement'), findsOneWidget);
  });

  testWidgets('Le profil propose vérification, notifications et aide',
      (WidgetTester tester) async {
    ecranGrand(tester);
    Session.utilisateur.value = UtilisateurAuth.fromJson(const {
      'id': 1,
      'username': 'komi',
      'email': 'komi@exemple.tg',
      'first_name': 'Komi',
      'last_name': 'Mensah',
      'role': 'proprietaire',
    });
    addTearDown(() => Session.utilisateur.value = null);

    await tester.pumpWidget(const MaterialApp(home: Profil()));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Komi Mensah'), findsOneWidget);
    expect(find.text('Vérification du compte'), findsOneWidget);
    expect(find.text('Préférences de notification'), findsOneWidget);
    expect(find.text('Aide et assistance'), findsOneWidget);
    expect(find.text('Passer en espace locataire'), findsOneWidget);
  });
}
