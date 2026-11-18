import 'package:cheztoi/auth/connection.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/views/locataire/navigation_locataire.dart';
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

/// Porte d'entrée : connexion si aucune session, navigation sinon.
class MyApp extends StatelessWidget {
  const MyApp({
    super.key,
    required this.authService,
    this.connecte = false,
    this.utilisateur,
  });

  final AuthService authService;
  final bool connecte;
  final UtilisateurAuth? utilisateur;

  void _ouvrirNavigation(UtilisateurAuth utilisateur) {
    navigateurChezToi.currentState?.pushAndRemoveUntil<void>(
      MaterialPageRoute<void>(
        builder: (_) => NavigationLocataire(
          utilisateur: utilisateur,
          onDeconnexion: _deconnecter,
        ),
      ),
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
      home: connecte
          ? NavigationLocataire(
              utilisateur: utilisateur,
              onDeconnexion: _deconnecter,
            )
          : Connection(
              authService: authService,
              onAuthentifie: _ouvrirNavigation,
            ),
      debugShowCheckedModeBanner: false,
    );
  }
}
