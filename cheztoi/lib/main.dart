import 'package:cheztoi/auth/connection.dart';
import 'package:cheztoi/services/api_client.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/demarrage/presentation.dart';
import 'package:cheztoi/views/demarrage/splash.dart';
import 'package:cheztoi/views/locataire/navigation_locataire.dart';
import 'package:cheztoi/views/proprietaire/navigation_proprietaire.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Clé du navigateur : permet de remplacer l'écran depuis n'importe quel
/// callback (connexion, déconnexion, changement d'espace).
final GlobalKey<NavigatorState> navigateurChezToi = GlobalKey<NavigatorState>();
final GlobalKey<ScaffoldMessengerState> messagerChezToi =
    GlobalKey<ScaffoldMessengerState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(MyApp(authService: AuthService()));
}

/// Parcours d'ouverture : écran de démarrage → présentation (1re fois) →
/// application. Sans session, on explore en invité : la connexion n'est
/// demandée qu'au moment d'une action qui l'exige.
class MyApp extends StatefulWidget {
  const MyApp({
    super.key,
    required this.authService,
    this.api,
    this.demarrageAnime = true,
  });

  final AuthService authService;
  final ChezToiApi? api;

  /// Faux dans les tests : pas d'écran de démarrage.
  final bool demarrageAnime;

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  static const _cleIntro = 'cheztoi_presentation_vue';

  late final Future<void> _chargement = _charger();
  bool _introVue = true;
  bool _splashTermine = false;

  AuthService get _auth => widget.authService;

  @override
  void initState() {
    super.initState();
    ChezToiApi.instance = widget.api ?? ChezToiApi(ApiClient(auth: _auth));
    ApiClient.onSessionExpiree = _sessionExpiree;
    Session.ouvrirEspace = _ouvrirEspace;
    Session.deconnecter = _deconnecter;
  }

  Future<void> _charger() async {
    Session.utilisateur.value =
        await _auth.estConnecte() ? await _auth.utilisateurCourant() : null;
    try {
      final prefs = await SharedPreferences.getInstance();
      _introVue = prefs.getBool(_cleIntro) ?? false;
    } catch (_) {
      _introVue = true;
    }
  }

  Future<void> _marquerIntroVue() async {
    _introVue = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_cleIntro, true);
    } catch (_) {}
  }

  Widget _espace(UtilisateurAuth? utilisateur) {
    if (utilisateur?.estProprietaire ?? false) {
      return NavigationProprietaire(
        utilisateur: utilisateur,
        onDeconnexion: _deconnecter,
        onChangementRole: _ouvrirEspace,
      );
    }
    return NavigationLocataire(
      utilisateur: utilisateur,
      onDeconnexion: _deconnecter,
      onChangementRole: _ouvrirEspace,
    );
  }

  Widget _ecranInitial() {
    final utilisateur = Session.utilisateur.value;
    if (utilisateur == null && !_introVue) {
      return Presentation(
        onExplorer: () {
          _marquerIntroVue();
          _ouvrirEspace(null);
        },
        onConnexion: () {
          _marquerIntroVue();
          _remplacer(
            Connection(
              authService: _auth,
              onAuthentifie: _ouvrirEspace,
              onContinuerSansCompte: () => _ouvrirEspace(null),
            ),
          );
        },
      );
    }
    return _espace(utilisateur);
  }

  void _remplacer(Widget ecran, {bool fondu = false}) {
    navigateurChezToi.currentState?.pushAndRemoveUntil<void>(
      fondu
          ? PageRouteBuilder<void>(
              transitionDuration: const Duration(milliseconds: 600),
              pageBuilder: (_, _, _) => ecran,
              transitionsBuilder: (_, animation, _, enfant) => FadeTransition(
                opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
                child: ScaleTransition(
                  scale: Tween(begin: 1.04, end: 1.0).animate(
                    CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
                  ),
                  child: enfant,
                ),
              ),
            )
          : MaterialPageRoute<void>(builder: (_) => ecran),
      (route) => false,
    );
  }

  void _ouvrirEspace(UtilisateurAuth? utilisateur) {
    Session.utilisateur.value = utilisateur;
    _remplacer(_espace(utilisateur));
  }

  Future<void> _deconnecter() async {
    await _auth.deconnecter();
    _ouvrirEspace(null);
  }

  Future<void> _sessionExpiree() async {
    if (!Session.estConnecte) return;
    await _deconnecter();
    messagerChezToi.currentState?.showSnackBar(
      const SnackBar(
        content: Text('Votre session a expiré. Reconnectez-vous pour continuer.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final Widget accueil;
    if (widget.demarrageAnime && !_splashTermine) {
      accueil = SplashChezToi(
        prete: _chargement,
        onTermine: () {
          _splashTermine = true;
          SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.dark);
          _remplacer(_ecranInitial(), fondu: true);
        },
      );
    } else {
      accueil = FutureBuilder<void>(
        future: _chargement,
        builder: (context, snapshot) =>
            snapshot.connectionState == ConnectionState.done
                ? _ecranInitial()
                : const Scaffold(backgroundColor: Styles.primaireNuit),
      );
    }

    return MaterialApp(
      navigatorKey: navigateurChezToi,
      scaffoldMessengerKey: messagerChezToi,
      title: 'ChezToi',
      theme: Styles.theme(),
      locale: const Locale('fr'),
      supportedLocales: const [Locale('fr'), Locale('en')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: accueil,
      debugShowCheckedModeBanner: false,
    );
  }
}
