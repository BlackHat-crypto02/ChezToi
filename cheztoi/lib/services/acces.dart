import 'package:cheztoi/auth/connection.dart';
import 'package:cheztoi/auth/inscription.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Ouvre la connexion (ou l'inscription) par-dessus l'écran courant.
/// Une fois authentifié, l'utilisateur revient exactement là où il était
/// (sauf un propriétaire, qui bascule dans son espace).
Future<UtilisateurAuth?> ouvrirConnexion(
  BuildContext context, {
  bool inscription = false,
}) async {
  final navigateur = Navigator.of(context);
  final origine = ModalRoute.of(context);
  UtilisateurAuth? resultat;

  void surAuthentifie(UtilisateurAuth u) {
    resultat = u;
    Session.utilisateur.value = u;
    if (origine != null && origine.isActive) {
      navigateur.popUntil((route) => route == origine);
    } else {
      navigateur.popUntil((route) => route.isFirst);
    }
    if (u.estProprietaire) Session.ouvrirEspace?.call(u);
  }

  final auth = ChezToiApi.instance.auth;
  await navigateur.push(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (_) => inscription
          ? Inscription(authService: auth, onAuthentifie: surAuthentifie)
          : Connection(
              authService: auth,
              onAuthentifie: surAuthentifie,
              modale: true,
            ),
    ),
  );
  return resultat;
}

/// Garde des actions réservées aux membres (réserver, favoris, messages...).
/// Renvoie `true` si l'utilisateur est (ou vient d'être) connecté.
Future<bool> exigerConnexion(
  BuildContext context, {
  String raison = 'Créez un compte gratuit ou connectez-vous pour continuer.',
}) async {
  if (Session.estConnecte) return true;
  final choix = await showModalBottomSheet<String>(
    context: context,
    builder: (context) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: Styles.primaireClair,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  RemixIcons.user_heart_line,
                  color: Styles.primaire,
                  size: 32,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Un compte, et c’est parti',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              raison,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Styles.texteDoux, height: 1.45),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => Navigator.pop(context, 'connexion'),
              child: const Text('Se connecter'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => Navigator.pop(context, 'inscription'),
              child: const Text('Créer un compte gratuit'),
            ),
          ],
        ),
      ),
    ),
  );
  if (choix == null || !context.mounted) return false;
  await ouvrirConnexion(context, inscription: choix == 'inscription');
  return Session.estConnecte;
}

/// Écran plein affiché à un invité à la place d'un contenu réservé aux membres.
class InvitationConnexion extends StatelessWidget {
  const InvitationConnexion({
    super.key,
    required this.icone,
    required this.titre,
    required this.message,
  });

  final IconData icone;
  final String titre;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 112,
              height: 112,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [Styles.primaireClair, Styles.menthe.withValues(alpha: 0.35)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Icon(icone, size: 46, color: Styles.primaire),
            ),
            const SizedBox(height: 22),
            Text(
              titre,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Styles.texteDoux, height: 1.5),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => ouvrirConnexion(context),
                child: const Text('Se connecter'),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => ouvrirConnexion(context, inscription: true),
                child: const Text('Créer un compte gratuit'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
