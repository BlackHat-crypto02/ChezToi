import 'dart:typed_data';

import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/api_client.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/commun/reservations.dart';
import 'package:cheztoi/views/locataire/alertes.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Profil et paramètres du compte, partagé par les deux espaces.
class Profil extends StatelessWidget {
  const Profil({
    super.key,
    this.onDeconnexion,
    this.onChangementRole,
    this.dansOnglet = false,
  });

  final Future<void> Function()? onDeconnexion;

  /// Appelé après le passage locataire ↔ propriétaire pour changer d'espace.
  final ValueChanged<UtilisateurAuth>? onChangementRole;

  /// Affiché comme onglet (pas de bouton retour).
  final bool dansOnglet;

  Future<void> _changerRole(BuildContext context, UtilisateurAuth u) async {
    final versProprietaire = !u.estProprietaire;
    final ok = await confirmer(
      context,
      titre: versProprietaire
          ? 'Activer l’espace propriétaire ?'
          : 'Revenir à l’espace locataire ?',
      message: versProprietaire
          ? 'Vous pourrez publier vos logements et gérer les demandes de '
              'réservation. Vous pourrez revenir à l’espace locataire à tout moment.'
          : 'Vos annonces restent en ligne ; vous pourrez revenir à l’espace '
              'propriétaire quand vous voudrez.',
    );
    if (!ok || !context.mounted) return;
    try {
      final nouveau = await ChezToiApi.instance.modifierProfil({
        'role': versProprietaire ? 'proprietaire' : 'locataire',
      });
      Session.utilisateur.value = nouveau;
      onChangementRole?.call(nouveau);
    } catch (e) {
      if (context.mounted) {
        afficherMessage(context, messageErreur(e), erreur: true);
      }
    }
  }

  Widget _entree(
    BuildContext context, {
    required IconData icone,
    required String titre,
    String? sousTitre,
    required VoidCallback onTap,
    Color? couleur,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icone, color: couleur ?? Styles.violet),
      title: Text(titre, style: TextStyle(color: couleur)),
      subtitle: sousTitre == null ? null : Text(sousTitre),
      trailing: const Icon(RemixIcons.arrow_right_s_line),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        title: const Text('Mon profil'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        automaticallyImplyLeading: !dansOnglet,
      ),
      body: ValueListenableBuilder<UtilisateurAuth?>(
        valueListenable: Session.utilisateur,
        builder: (context, u, _) {
          if (u == null) return const Chargement();
          return ListView(
            children: [
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Avatar(
                      initiales: u.nomComplet
                          .split(' ')
                          .where((m) => m.isNotEmpty)
                          .take(2)
                          .map((m) => m[0].toUpperCase())
                          .join(),
                      url: u.photo,
                      rayon: 34,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  u.nomComplet,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              if (u.verifie) ...[
                                const SizedBox(width: 6),
                                const Icon(
                                  RemixIcons.verified_badge_fill,
                                  color: Colors.green,
                                  size: 18,
                                ),
                              ],
                            ],
                          ),
                          Text(u.email, style: TextStyle(color: Colors.grey.shade600)),
                          const SizedBox(height: 6),
                          Pastille(
                            texte: u.estProprietaire ? 'Propriétaire' : 'Locataire',
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Container(
                color: Colors.white,
                child: Column(
                  children: [
                    _entree(
                      context,
                      icone: RemixIcons.user_settings_line,
                      titre: 'Informations personnelles',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const ModifierProfil(),
                        ),
                      ),
                    ),
                    if (!u.estProprietaire) ...[
                      _entree(
                        context,
                        icone: RemixIcons.calendar_check_line,
                        titre: 'Mes réservations',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const MesReservations(),
                          ),
                        ),
                      ),
                      _entree(
                        context,
                        icone: RemixIcons.notification_badge_line,
                        titre: 'Mes alertes',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(builder: (_) => const Alertes()),
                        ),
                      ),
                    ],
                    _entree(
                      context,
                      icone: RemixIcons.lock_password_line,
                      titre: 'Changer le mot de passe',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const ChangerMotDePasse(),
                        ),
                      ),
                    ),
                    _entree(
                      context,
                      icone: RemixIcons.swap_box_line,
                      titre: u.estProprietaire
                          ? 'Passer en espace locataire'
                          : 'Devenir propriétaire',
                      sousTitre: u.estProprietaire
                          ? 'Chercher un logement pour vous'
                          : 'Publier et gérer vos logements',
                      onTap: () => _changerRole(context, u),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Container(
                color: Colors.white,
                child: Column(
                  children: [
                    if (onDeconnexion != null)
                      _entree(
                        context,
                        icone: RemixIcons.logout_box_r_line,
                        titre: 'Se déconnecter',
                        onTap: () async {
                          if (await confirmer(
                            context,
                            titre: 'Se déconnecter ?',
                            message: 'Vous devrez saisir à nouveau vos identifiants.',
                            action: 'Déconnexion',
                          )) {
                            await onDeconnexion!();
                          }
                        },
                      ),
                    _entree(
                      context,
                      icone: RemixIcons.delete_bin_line,
                      titre: 'Supprimer mon compte',
                      couleur: Colors.red.shade700,
                      onTap: () => _supprimer(context),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Text(
                  'ChezToi · version 1.0.0',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                ),
              ),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }

  Future<void> _supprimer(BuildContext context) async {
    final motDePasse = await demanderTexte(
      context,
      titre: 'Supprimer définitivement votre compte ?',
      label: 'Mot de passe pour confirmer',
      action: 'Supprimer',
      obligatoire: true,
    );
    if (motDePasse == null || !context.mounted) return;
    try {
      await ChezToiApi.instance.supprimerCompte(motDePasse);
      if (onDeconnexion != null) await onDeconnexion!();
    } catch (e) {
      if (context.mounted) {
        afficherMessage(context, messageErreur(e), erreur: true);
      }
    }
  }
}

class ModifierProfil extends StatefulWidget {
  const ModifierProfil({super.key});

  @override
  State<ModifierProfil> createState() => _ModifierProfilState();
}

class _ModifierProfilState extends State<ModifierProfil> {
  final _formulaire = GlobalKey<FormState>();
  final UtilisateurAuth _u = Session.utilisateur.value!;
  late final _prenom = TextEditingController(text: _u.prenom);
  late final _nom = TextEditingController(text: _u.nom);
  late final _telephone = TextEditingController(text: _u.telephone);
  late final _ville = TextEditingController(text: _u.ville);
  late final _bio = TextEditingController(text: _u.bio);
  FichierEnvoi? _photo;
  bool _envoi = false;

  @override
  void dispose() {
    for (final c in [_prenom, _nom, _telephone, _ville, _bio]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _choisirPhoto() async {
    final fichier = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 800,
      imageQuality: 85,
    );
    if (fichier == null) return;
    final octets = await fichier.readAsBytes();
    setState(() => _photo = FichierEnvoi(octets: octets, nom: fichier.name));
  }

  Future<void> _enregistrer() async {
    if (!_formulaire.currentState!.validate()) return;
    setState(() => _envoi = true);
    try {
      final u = await ChezToiApi.instance.modifierProfil(
        {
          'first_name': _prenom.text.trim(),
          'last_name': _nom.text.trim(),
          'phone': _telephone.text.trim(),
          'city': _ville.text.trim(),
          'bio': _bio.text.trim(),
        },
        photo: _photo,
      );
      Session.utilisateur.value = u;
      if (!mounted) return;
      afficherMessage(context, 'Profil mis à jour.');
      Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _envoi = false);
        afficherMessage(context, messageErreur(e), erreur: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Informations personnelles')),
      body: Form(
        key: _formulaire,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: InkWell(
                onTap: _choisirPhoto,
                customBorder: const CircleBorder(),
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 46,
                      backgroundColor: Styles.violet.withValues(alpha: 0.12),
                      foregroundImage: _photo != null
                          ? MemoryImage(Uint8List.fromList(_photo!.octets))
                          : (_u.photo != null ? NetworkImage(_u.photo!) : null)
                              as ImageProvider?,
                      child: const Icon(
                        RemixIcons.user_3_line,
                        size: 40,
                        color: Styles.violet,
                      ),
                    ),
                    const Positioned(
                      right: 0,
                      bottom: 0,
                      child: CircleAvatar(
                        radius: 15,
                        backgroundColor: Styles.violet,
                        child: Icon(
                          RemixIcons.camera_line,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _prenom,
              decoration: decorationChamp('Prénom', icone: RemixIcons.user_line),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Indiquez votre prénom' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _nom,
              decoration: decorationChamp('Nom', icone: RemixIcons.user_line),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _telephone,
              keyboardType: TextInputType.phone,
              decoration: decorationChamp('Téléphone', icone: RemixIcons.phone_line),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _ville,
              decoration: decorationChamp('Ville', icone: RemixIcons.map_pin_line),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _bio,
              maxLines: 3,
              decoration: decorationChamp('À propos de vous'),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _envoi ? null : _enregistrer,
            style: styleBoutonPrincipal(),
            child: Text(_envoi ? 'Enregistrement…' : 'Enregistrer'),
          ),
        ),
      ),
    );
  }
}

class ChangerMotDePasse extends StatefulWidget {
  const ChangerMotDePasse({super.key});

  @override
  State<ChangerMotDePasse> createState() => _ChangerMotDePasseState();
}

class _ChangerMotDePasseState extends State<ChangerMotDePasse> {
  final _formulaire = GlobalKey<FormState>();
  final _ancien = TextEditingController();
  final _nouveau = TextEditingController();
  final _confirmation = TextEditingController();
  bool _envoi = false;

  @override
  void dispose() {
    _ancien.dispose();
    _nouveau.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _enregistrer() async {
    if (!_formulaire.currentState!.validate()) return;
    setState(() => _envoi = true);
    try {
      await ChezToiApi.instance.changerMotDePasse(_ancien.text, _nouveau.text);
      if (!mounted) return;
      afficherMessage(context, 'Mot de passe modifié.');
      Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _envoi = false);
        afficherMessage(context, messageErreur(e), erreur: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Mot de passe')),
      body: Form(
        key: _formulaire,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            TextFormField(
              controller: _ancien,
              obscureText: true,
              decoration: decorationChamp(
                'Mot de passe actuel',
                icone: RemixIcons.lock_line,
              ),
              validator: (v) => (v ?? '').isEmpty ? 'Obligatoire' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _nouveau,
              obscureText: true,
              decoration: decorationChamp(
                'Nouveau mot de passe',
                icone: RemixIcons.lock_password_line,
                aide: '8 caractères minimum',
              ),
              validator: (v) =>
                  (v ?? '').length < 8 ? 'Au moins 8 caractères' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _confirmation,
              obscureText: true,
              decoration: decorationChamp(
                'Confirmer',
                icone: RemixIcons.lock_password_line,
              ),
              validator: (v) =>
                  v != _nouveau.text ? 'Les mots de passe diffèrent' : null,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _envoi ? null : _enregistrer,
              style: styleBoutonPrincipal(),
              child: Text(_envoi ? 'Enregistrement…' : 'Modifier'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Liste des avis reçus par le propriétaire, avec réponse.
class AvisRecus extends StatefulWidget {
  const AvisRecus({super.key});

  @override
  State<AvisRecus> createState() => _AvisRecusState();
}

class _AvisRecusState extends State<AvisRecus> {
  late Future<List<Avis>> _futur = ChezToiApi.instance.avisRecus();

  void _recharger() => setState(() => _futur = ChezToiApi.instance.avisRecus());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Avis reçus')),
      body: FutureBuilder<List<Avis>>(
        future: _futur,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Chargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
          }
          final avis = snapshot.data!;
          if (avis.isEmpty) {
            return const EtatVide(
              icone: RemixIcons.star_line,
              titre: 'Pas encore d’avis',
              message: 'Les avis de vos locataires apparaîtront ici.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final a in avis)
                _CarteAvisProprietaire(avis: a, onRepondu: _recharger),
            ],
          );
        },
      ),
    );
  }
}

class _CarteAvisProprietaire extends StatelessWidget {
  const _CarteAvisProprietaire({required this.avis, required this.onRepondu});

  final Avis avis;
  final VoidCallback onRepondu;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    avis.auteur.nomComplet,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                Etoiles(note: avis.noteGlobale),
              ],
            ),
            if (avis.commentaire.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(avis.commentaire),
            ],
            const SizedBox(height: 8),
            if (avis.reponseProprietaire.isNotEmpty)
              Text(
                'Votre réponse : ${avis.reponseProprietaire}',
                style: TextStyle(color: Colors.grey.shade700),
              )
            else
              TextButton.icon(
                onPressed: () async {
                  final reponse = await demanderTexte(
                    context,
                    titre: 'Répondre à l’avis',
                    label: 'Votre réponse',
                    action: 'Publier',
                    obligatoire: true,
                  );
                  if (reponse == null || !context.mounted) return;
                  try {
                    await ChezToiApi.instance.repondreAvis(avis.id, reponse);
                    onRepondu();
                  } catch (e) {
                    if (context.mounted) {
                      afficherMessage(context, messageErreur(e), erreur: true);
                    }
                  }
                },
                icon: const Icon(RemixIcons.reply_line),
                label: const Text('Répondre'),
              ),
          ],
        ),
      ),
    );
  }
}
