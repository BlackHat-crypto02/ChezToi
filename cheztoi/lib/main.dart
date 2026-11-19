import 'package:cheztoi/auth/connection.dart';
import 'package:cheztoi/services/api_client.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/locataire/navigation_locataire.dart';
import 'package:cheztoi/views/proprietaire/navigation_proprietaire.dart';
import 'package:material_ui/material_ui.dart';

/// Clé du navigateur : permet de remplacer l'écran depuis n'importe quel
/// callback d'authentification, même quand un formulaire est empilé dessus.
final GlobalKey<NavigatorState> navigateurChezToi = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final authService = AuthService();
  final connecte = await authService.estConnecte();
  final utilisateur =
      connecte ? await authService.utilisateurCourant() : null;
  runApp(
    MyApp(
      authService: authService,
      connecte: connecte,
      utilisateur: utilisateur,
    ),
  );
}

/// Porte d'entrée : connexion si aucune session, sinon l'espace du rôle.
class MyApp extends StatelessWidget {
  MyApp({
    super.key,
    required this.authService,
    this.connecte = false,
    this.utilisateur,
    ChezToiApi? api,
  }) {
    // Toute l'application partage la session de ce service.
    ChezToiApi.instance = api ?? ChezToiApi(ApiClient(auth: authService));
    Session.utilisateur.value = utilisateur;
    ApiClient.onSessionExpiree = _deconnecter;
  }

  final AuthService authService;
  final bool connecte;
  final UtilisateurAuth? utilisateur;

  Widget _espace(UtilisateurAuth? utilisateur) {
    if (utilisateur?.estProprietaire ?? false) {
      return NavigationProprietaire(
        utilisateur: utilisateur,
        onDeconnexion: _deconnecter,
        onChangementRole: _ouvrirNavigation,
      );
    }
    return NavigationLocataire(
      utilisateur: utilisateur,
      onDeconnexion: _deconnecter,
      onChangementRole: _ouvrirNavigation,
    );
  }

  void _ouvrirNavigation(UtilisateurAuth utilisateur) {
    Session.utilisateur.value = utilisateur;
    navigateurChezToi.currentState?.pushAndRemoveUntil<void>(
      MaterialPageRoute<void>(builder: (_) => _espace(utilisateur)),
      (route) => false,
    );
  }

  void _ouvrirConnexion() {
    navigateurChezToi.currentState?.pushAndRemoveUntil<void>(
      MaterialPageRoute<void>(
        builder: (_) => Connection(
          authService: authService,
          onAuthentifie: _ouvrirNavigation,
        ),
      ),
      (route) => false,
    );
  }

  Future<void> _deconnecter() async {
    await authService.deconnecter();
    Session.utilisateur.value = null;
    _ouvrirConnexion();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigateurChezToi,
      title: 'ChezToi',
      theme: ThemeData(
        colorScheme: .fromSeed(seedColor: const Color(0xFF16005D)),
        useMaterial3: true,
      ),
      locale: const Locale('fr'),
      supportedLocales: const [Locale('fr'), Locale('en')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: connecte
          ? _espace(utilisateur)
          : Connection(
              authService: authService,
              onAuthentifie: _ouvrirNavigation,
            ),
      debugShowCheckedModeBanner: false,
    );
  }
}
