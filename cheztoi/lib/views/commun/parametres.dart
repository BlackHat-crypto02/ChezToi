import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/api_client.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/commun/signalement.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';
import 'package:url_launcher/url_launcher.dart';

/// Adresse du support affichée dans l'aide (à adapter en production).
const String emailSupport = 'support@cheztoi.tg';

// ------------------------------------------------- Vérification du compte

class VerificationCompte extends StatefulWidget {
  const VerificationCompte({super.key});

  @override
  State<VerificationCompte> createState() => _VerificationCompteState();
}

class _VerificationCompteState extends State<VerificationCompte> {
  late Future<(bool, List<Justificatif>)> _futur = ChezToiApi.instance
      .justificatifs();
  bool _envoi = false;

  void _recharger() =>
      setState(() => _futur = ChezToiApi.instance.justificatifs());

  Future<void> _envoyer() async {
    final type = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Text(
                'Quel document envoyez-vous ?',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            for (final e in Justificatif.types.entries)
              ListTile(
                leading: const Icon(
                  RemixIcons.file_text_line,
                  color: Styles.primaire,
                ),
                title: Text(e.value),
                onTap: () => Navigator.pop(context, e.key),
              ),
          ],
        ),
      ),
    );
    if (type == null || !mounted) return;
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(RemixIcons.camera_line),
              title: const Text('Prendre une photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(RemixIcons.image_line),
              title: const Text('Choisir dans la galerie'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;
    final fichier = await ImagePicker().pickImage(
      source: source,
      maxWidth: 2200,
      imageQuality: 85,
    );
    if (fichier == null) return;
    setState(() => _envoi = true);
    try {
      await ChezToiApi.instance.envoyerJustificatif(
        type,
        FichierEnvoi(octets: await fichier.readAsBytes(), nom: fichier.name),
      );
      if (!mounted) return;
      afficherMessage(
        context,
        'Document envoyé : l’équipe ChezToi va l’examiner.',
      );
      _recharger();
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Vérification du compte')),
      body: FutureBuilder<(bool, List<Justificatif>)>(
        future: _futur,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Chargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
          }
          final (verifie, documents) = snapshot.data!;
          if (verifie) {
            // Le badge apparaît aussitôt dans le profil.
            final u = Session.utilisateur.value;
            if (u != null && !u.verifie) {
              ChezToiApi.instance
                  .rafraichirProfil()
                  .then((nouveau) => Session.utilisateur.value = nouveau)
                  .ignore();
            }
          }
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: verifie ? Colors.green.shade50 : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: verifie
                        ? Colors.green.shade200
                        : Colors.grey.shade200,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      verifie
                          ? RemixIcons.verified_badge_fill
                          : RemixIcons.shield_user_line,
                      color: verifie ? Colors.green : Styles.primaire,
                      size: 36,
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        verifie
                            ? 'Votre compte est vérifié. Le badge apparaît sur votre profil '
                                  'et rassure les locataires.'
                            : 'Envoyez une pièce d’identité et, si possible, un titre de '
                                  'propriété. Les comptes vérifiés inspirent davantage confiance.',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (documents.isNotEmpty) ...[
                const TitreSection('Documents envoyés'),
                const SizedBox(height: 10),
                for (final d in documents)
                  Card(
                    color: Colors.white,
                    child: ListTile(
                      leading: const Icon(RemixIcons.file_text_line),
                      title: Text(d.typeLibelle),
                      subtitle: Text(
                        d.motif.isNotEmpty
                            ? 'Refusé : ${d.motif}'
                            : 'Envoyé le ${formatDate(d.creeLe)}',
                      ),
                      trailing: StatutPastille(
                        statut: switch (d.statut) {
                          'accepte' => 'confirmee',
                          'refuse' => 'refusee',
                          _ => 'en_attente',
                        },
                        libelle: d.statutLibelle,
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
              ],
              Text(
                'Vos documents ne sont visibles que par l’équipe de vérification '
                'et ne sont jamais publiés.',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            onPressed: _envoi ? null : _envoyer,
            style: styleBoutonPrincipal(),
            icon: const Icon(RemixIcons.upload_2_line),
            label: Text(_envoi ? 'Envoi…' : 'Envoyer un document'),
          ),
        ),
      ),
    );
  }
}

// ------------------------------------------------ Préférences de notification

class PreferencesNotifications extends StatefulWidget {
  const PreferencesNotifications({super.key});

  @override
  State<PreferencesNotifications> createState() =>
      _PreferencesNotificationsState();
}

class _PreferencesNotificationsState extends State<PreferencesNotifications> {
  static const _libelles = {
    'reservations': ('Réservations', 'Demandes, acceptations, annulations'),
    'messages': ('Messages', 'Nouveaux messages reçus'),
    'alertes': ('Alertes', 'Nouvelles annonces correspondant à vos recherches'),
    'annonces': ('Mes annonces', 'Validation, refus ou suspension'),
    'avis': ('Avis', 'Nouveaux avis sur vos logements'),
  };

  Map<String, bool>? _valeurs;
  Object? _erreur;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _erreur = null);
    try {
      final valeurs = await ChezToiApi.instance.preferences();
      if (mounted) setState(() => _valeurs = valeurs);
    } catch (e) {
      if (mounted) setState(() => _erreur = e);
    }
  }

  Future<void> _changer(String cle, bool valeur) async {
    final avant = Map.of(_valeurs!);
    setState(() => _valeurs = {..._valeurs!, cle: valeur});
    try {
      final valeurs = await ChezToiApi.instance.modifierPreferences({
        cle: valeur,
      });
      if (mounted) setState(() => _valeurs = valeurs);
    } catch (e) {
      if (!mounted) return;
      setState(() => _valeurs = avant);
      afficherMessage(context, messageErreur(e), erreur: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final valeurs = _valeurs;
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Notifications')),
      body: _erreur != null
          ? EtatErreur(erreur: _erreur!, onReessayer: _charger)
          : valeurs == null
          ? const Chargement()
          : ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    'Choisissez ce qui doit apparaître dans vos notifications.',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                ),
                Material(
                  color: Colors.white,
                  child: Column(
                    children: [
                      for (final e in _libelles.entries)
                        if (valeurs.containsKey(e.key))
                          SwitchListTile(
                            activeThumbColor: Styles.primaire,
                            title: Text(e.value.$1),
                            subtitle: Text(e.value.$2),
                            value: valeurs[e.key]!,
                            onChanged: (v) => _changer(e.key, v),
                          ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

// ---------------------------------------------------------------- Assistance

class Assistance extends StatelessWidget {
  const Assistance({super.key});

  static const _questions = [
    (
      'Comment réserver un logement ?',
      'Ouvrez la fiche du logement, touchez « Demander » ou « Réserver », choisissez '
          'vos dates puis envoyez. Si le logement est en réservation instantanée, '
          'votre séjour est confirmé immédiatement ; sinon le propriétaire a '
          'jusqu’à la date d’arrivée pour accepter.',
    ),
    (
      'Quand vais-je obtenir l’adresse exacte ?',
      'Dès que votre réservation est acceptée. Avant, la carte montre une zone '
          'approximative pour protéger la vie privée du propriétaire.',
    ),
    (
      'Comment se passe le paiement ?',
      'Le paiement (loyer, caution, avance) se règle directement avec le '
          'propriétaire selon les conditions indiquées sur l’annonce. Ne payez '
          'jamais avant d’avoir une réservation confirmée dans l’application.',
    ),
    (
      'Comment annuler ?',
      'Dans « Mes réservations », ouvrez la réservation puis touchez « Annuler ». '
          'Les conditions d’annulation du logement s’appliquent.',
    ),
    (
      'Comment publier mon logement ?',
      'Activez l’espace propriétaire depuis votre profil, puis « Publier » : '
          'remplissez la fiche, ajoutez des photos et soumettez. L’équipe ChezToi '
          'vérifie l’annonce avant sa mise en ligne.',
    ),
    (
      'Que faire face à une annonce suspecte ?',
      'Utilisez le drapeau « Signaler » sur la fiche ou dans la conversation. '
          'Chaque signalement est examiné par l’équipe ChezToi.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Aide et assistance')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const TitreSection('Questions fréquentes'),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                for (final (question, reponse) in _questions)
                  ExpansionTile(
                    shape: const Border(),
                    title: Text(
                      question,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    children: [
                      Text(
                        reponse,
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const TitreSection('Besoin d’aide ?'),
          const SizedBox(height: 10),
          Card(
            color: Colors.white,
            child: ListTile(
              leading: const Icon(RemixIcons.mail_line, color: Styles.primaire),
              title: const Text('Écrire au support'),
              subtitle: const Text(emailSupport),
              onTap: () async {
                final ok = await launchUrl(
                  Uri(
                    scheme: 'mailto',
                    path: emailSupport,
                    queryParameters: {'subject': 'Aide ChezToi'},
                  ),
                ).catchError((_) => false);
                if (!ok && context.mounted) {
                  afficherMessage(
                    context,
                    'Aucune application d’e-mail : écrivez à $emailSupport.',
                  );
                }
              },
            ),
          ),
          Card(
            color: Colors.white,
            child: ListTile(
              leading: const Icon(RemixIcons.flag_line, color: Styles.primaire),
              title: const Text('Signaler un problème'),
              subtitle: const Text('Fraude, comportement abusif, autre'),
              onTap: () => signalerProbleme(context),
            ),
          ),
        ],
      ),
    );
  }
}
