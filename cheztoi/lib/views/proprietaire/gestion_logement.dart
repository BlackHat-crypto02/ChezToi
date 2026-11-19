import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/api_client.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/proprietaire/logement_form.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Gestion d'une annonce : statut, photos, visite 360°, actions de publication.
class GestionLogement extends StatefulWidget {
  const GestionLogement({super.key, required this.logementId});

  final int logementId;

  @override
  State<GestionLogement> createState() => _GestionLogementState();
}

class _GestionLogementState extends State<GestionLogement> {
  late Future<Logement> _futur = _charger();
  bool _occupe = false;

  Future<Logement> _charger() =>
      ChezToiApi.instance.monLogement(widget.logementId);

  void _recharger() => setState(() => _futur = _charger());

  Future<void> _tache(Future<void> Function() action, String succes) async {
    setState(() => _occupe = true);
    try {
      await action();
      if (!mounted) return;
      afficherMessage(context, succes);
      _recharger();
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    } finally {
      if (mounted) setState(() => _occupe = false);
    }
  }

  Future<List<FichierEnvoi>> _choisirImages({bool plusieurs = true}) async {
    final picker = ImagePicker();
    final fichiers = plusieurs
        ? await picker.pickMultiImage(maxWidth: 1920, imageQuality: 82)
        : [
            ?await picker.pickImage(
              source: ImageSource.gallery,
              // Panorama : on garde la pleine résolution.
              imageQuality: 90,
            ),
          ];
    return [
      for (final f in fichiers)
        FichierEnvoi(octets: await f.readAsBytes(), nom: f.name),
    ];
  }

  Future<void> _ajouterPhotos() async {
    final images = await _choisirImages();
    if (images.isEmpty) return;
    await _tache(() async {
      for (final image in images) {
        await ChezToiApi.instance.ajouterPhoto(widget.logementId, image);
      }
    }, '${images.length} photo(s) ajoutée(s).');
  }

  Future<void> _ajouterPanorama() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(RemixIcons.camera_3_line, color: Styles.violet, size: 40),
        title: const Text('Ajouter une vue 360°'),
        content: const Text(
          'Conseils de capture :\n\n'
          '• Utilisez le mode « Panorama » ou « Photo sphère » de votre téléphone '
          '(ou une caméra 360°).\n'
          '• Placez-vous au centre de la pièce, téléphone à hauteur des yeux.\n'
          '• Allumez toutes les lumières et ouvrez les rideaux.\n'
          '• Tournez lentement sur vous-même sans bouger les pieds.\n\n'
          'Choisissez ensuite l’image panoramique dans votre galerie.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Styles.violet),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Choisir l’image'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final images = await _choisirImages(plusieurs: false);
    if (images.isEmpty || !mounted) return;
    final piece = await demanderTexte(
      context,
      titre: 'Nom de la pièce',
      label: 'Ex. : Salon, Chambre 1, Cuisine',
      action: 'Envoyer',
      obligatoire: true,
    );
    if (piece == null) return;
    await _tache(
      () => ChezToiApi.instance.ajouterPanorama(widget.logementId, images.first, piece),
      'Vue 360° ajoutée.',
    );
  }

  Future<void> _actionPhoto(Logement l, PhotoLogement p) async {
    final choix = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!p.principale)
              ListTile(
                leading: const Icon(RemixIcons.star_line),
                title: const Text('Définir comme photo principale'),
                onTap: () => Navigator.pop(context, 'principale'),
              ),
            ListTile(
              leading: const Icon(RemixIcons.text),
              title: Text(p.legende.isEmpty ? 'Ajouter une légende' : 'Modifier la légende'),
              onTap: () => Navigator.pop(context, 'legende'),
            ),
            if (p.ordre > 0)
              ListTile(
                leading: const Icon(RemixIcons.arrow_left_line),
                title: const Text('Déplacer avant'),
                onTap: () => Navigator.pop(context, 'avant'),
              ),
            ListTile(
              leading: const Icon(RemixIcons.arrow_right_line),
              title: const Text('Déplacer après'),
              onTap: () => Navigator.pop(context, 'apres'),
            ),
            ListTile(
              leading: Icon(RemixIcons.delete_bin_line, color: Colors.red.shade700),
              title: Text('Supprimer', style: TextStyle(color: Colors.red.shade700)),
              onTap: () => Navigator.pop(context, 'supprimer'),
            ),
          ],
        ),
      ),
    );
    if (choix == null || !mounted) return;
    final api = ChezToiApi.instance;
    switch (choix) {
      case 'principale':
        await _tache(
          () => api.modifierPhoto(l.id, p.id, {'principale': true}),
          'Photo principale mise à jour.',
        );
      case 'legende':
        final legende = await demanderTexte(context, titre: 'Légende', label: 'Légende');
        if (legende != null) {
          await _tache(
            () => api.modifierPhoto(l.id, p.id, {'legende': legende}),
            'Légende enregistrée.',
          );
        }
      case 'avant' || 'apres':
        await _tache(
          () => api.modifierPhoto(l.id, p.id, {
            'ordre': choix == 'avant' ? p.ordre - 1 : p.ordre + 1,
          }),
          'Ordre modifié.',
        );
      case 'supprimer':
        await _tache(() => api.supprimerPhoto(l.id, p.id), 'Photo supprimée.');
    }
  }

  Future<void> _statut(String action, String succes) =>
      _tache(() => ChezToiApi.instance.changerStatutLogement(widget.logementId, action), succes);

  Future<void> _modifier(Logement l) async {
    final modifie = await Navigator.of(context).push<Logement>(
      MaterialPageRoute<Logement>(builder: (_) => LogementFormulaire(logement: l)),
    );
    if (modifie != null) _recharger();
  }

  Future<void> _supprimer() async {
    final ok = await confirmer(
      context,
      titre: 'Supprimer l’annonce ?',
      message: 'Cette action est définitive. Vous pouvez aussi l’archiver.',
      action: 'Supprimer',
      danger: true,
    );
    if (!ok) return;
    try {
      await ChezToiApi.instance.supprimerLogement(widget.logementId);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    }
  }

  List<Widget> _actions(Logement l) {
    Widget principal(String texte, IconData icone, VoidCallback action) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: FilledButton.icon(
            onPressed: _occupe ? null : action,
            style: styleBoutonPrincipal(),
            icon: Icon(icone),
            label: Text(texte),
          ),
        );
    Widget secondaire(String texte, IconData icone, VoidCallback action) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: OutlinedButton.icon(
            onPressed: _occupe ? null : action,
            style: styleBoutonSecondaire(),
            icon: Icon(icone),
            label: Text(texte),
          ),
        );

    return [
      if (['brouillon', 'refusee', 'archivee'].contains(l.statut))
        principal(
          'Soumettre à validation',
          RemixIcons.send_plane_line,
          () => _statut('soumettre', 'Annonce envoyée à l’équipe ChezToi pour validation.'),
        ),
      if (l.statut == 'en_attente')
        secondaire(
          'Repasser en brouillon',
          RemixIcons.draft_line,
          () => _statut('brouillon', 'Annonce repassée en brouillon.'),
        ),
      if (l.statut == 'publiee')
        secondaire(
          'Marquer comme loué',
          RemixIcons.key_2_line,
          () => _statut('louee', 'Annonce marquée comme louée.'),
        ),
      if (l.statut == 'louee')
        principal(
          'Remettre en location',
          RemixIcons.refresh_line,
          () => _statut('republier', 'Annonce de nouveau visible.'),
        ),
      if (l.statut != 'suspendue')
        secondaire('Modifier les informations', RemixIcons.edit_line, () => _modifier(l)),
      if (['publiee', 'louee'].contains(l.statut))
        secondaire(
          'Voir l’annonce publique',
          RemixIcons.eye_line,
          () => ouvrirLogement(context, l.id),
        ),
      if (!['archivee', 'suspendue'].contains(l.statut))
        TextButton.icon(
          onPressed: _occupe ? null : () => _statut('archiver', 'Annonce archivée.'),
          icon: const Icon(RemixIcons.archive_line),
          label: const Text('Archiver'),
        ),
      TextButton.icon(
        onPressed: _occupe ? null : _supprimer,
        style: TextButton.styleFrom(foregroundColor: Colors.red.shade700),
        icon: const Icon(RemixIcons.delete_bin_line),
        label: const Text('Supprimer'),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Mon annonce')),
      body: FutureBuilder<Logement>(
        future: _futur,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done && !snapshot.hasData) {
            return const Chargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
          }
          final l = snapshot.data!;
          return Stack(
            children: [
              ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    l.titre,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      StatutPastille(statut: l.statut, libelle: l.statutLibelle),
                      const SizedBox(width: 8),
                      if (l.verifie)
                        const Pastille(
                          texte: 'Vérifiée',
                          icone: RemixIcons.verified_badge_fill,
                          couleur: Colors.green,
                        ),
                      const Spacer(),
                      const Icon(RemixIcons.eye_line, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text('${l.nombreVues} vues'),
                    ],
                  ),
                  if (l.motifRefus.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Text(
                        '${l.statut == 'suspendue' ? 'Motif de suspension' : 'Motif du refus'} : '
                        '${l.motifRefus}\n\nCorrigez votre annonce puis soumettez-la à nouveau.',
                        style: TextStyle(color: Colors.red.shade900),
                      ),
                    ),
                  ],
                  if (l.statut == 'en_attente') ...[
                    const SizedBox(height: 12),
                    Text(
                      'Votre annonce est en cours de vérification par l’équipe ChezToi. '
                      'Vous serez notifié dès qu’elle sera publiée.',
                      style: TextStyle(color: Colors.orange.shade900),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(
                    '${formatPrix(l.prix, l.devise)} / ${l.periodiciteLibelle} · ${l.localisation}',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                  const SizedBox(height: 20),
                  TitreSection(
                    'Photos (${l.photos.length})',
                    action: 'Ajouter',
                    onAction: _occupe ? null : _ajouterPhotos,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Touchez une photo pour la définir comme principale, '
                    'la légender, la déplacer ou la supprimer.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 10),
                  if (l.photos.isEmpty)
                    OutlinedButton.icon(
                      onPressed: _occupe ? null : _ajouterPhotos,
                      style: styleBoutonSecondaire(),
                      icon: const Icon(RemixIcons.image_add_line),
                      label: const Text('Ajouter des photos (obligatoire)'),
                    )
                  else
                    SizedBox(
                      height: 110,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: l.photos.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 8),
                        itemBuilder: (_, i) {
                          final p = l.photos[i];
                          return InkWell(
                            onTap: _occupe ? null : () => _actionPhoto(l, p),
                            child: Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: ImageLogement(url: p.url, hauteur: 110, largeur: 140),
                                ),
                                if (p.principale)
                                  const Positioned(
                                    left: 6,
                                    top: 6,
                                    child: Pastille(
                                      texte: 'Principale',
                                      couleur: Colors.white,
                                      icone: RemixIcons.star_fill,
                                    ),
                                  ),
                                if (p.legende.isNotEmpty)
                                  Positioned(
                                    left: 6,
                                    bottom: 6,
                                    right: 6,
                                    child: Text(
                                      p.legende,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                        shadows: [Shadow(blurRadius: 4)],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 24),
                  TitreSection(
                    'Visite virtuelle 360° (${l.panoramas.length})',
                    action: 'Ajouter',
                    onAction: _occupe ? null : _ajouterPanorama,
                  ),
                  const SizedBox(height: 10),
                  if (l.panoramas.isEmpty)
                    Text(
                      'Ajoutez une vue panoramique par pièce : les annonces avec '
                      'visite 360° sont mises en avant.',
                      style: TextStyle(color: Colors.grey.shade600),
                    )
                  else
                    for (final p in l.panoramas)
                      Card(
                        color: Colors.white,
                        child: ListTile(
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: ImageLogement(url: p.url, hauteur: 44, largeur: 64),
                          ),
                          title: Text(p.piece),
                          trailing: IconButton(
                            tooltip: 'Supprimer',
                            icon: const Icon(RemixIcons.delete_bin_line),
                            onPressed: _occupe
                                ? null
                                : () => _tache(
                                      () => ChezToiApi.instance.supprimerPanorama(l.id, p.id),
                                      'Vue supprimée.',
                                    ),
                          ),
                        ),
                      ),
                  const SizedBox(height: 28),
                  ..._actions(l),
                ],
              ),
              if (_occupe)
                const Positioned(
                  left: 0,
                  right: 0,
                  top: 0,
                  child: LinearProgressIndicator(color: Styles.violet),
                ),
            ],
          );
        },
      ),
    );
  }
}
