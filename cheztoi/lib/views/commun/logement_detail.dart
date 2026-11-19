import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/acces.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/historique.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/commun/carte_widgets.dart';
import 'package:cheztoi/views/commun/chat.dart';
import 'package:cheztoi/views/commun/panorama.dart';
import 'package:cheztoi/views/commun/signalement.dart';
import 'package:cheztoi/views/commun/video.dart';
import 'package:cheztoi/views/locataire/reservation_form.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

/// Fiche détaillée d'un logement (section 4.6 du cahier des charges).
class LogementDetail extends StatelessWidget {
  const LogementDetail({super.key, required this.logementId});

  final int logementId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      body: Chargeur<Logement>(
        charger: () => ChezToiApi.instance.logement(logementId),
        builder: (context, logement, recharger) =>
            _Fiche(logement: logement, recharger: recharger),
      ),
    );
  }
}

class _Fiche extends StatefulWidget {
  const _Fiche({required this.logement, required this.recharger});

  final Logement logement;
  final VoidCallback recharger;

  @override
  State<_Fiche> createState() => _FicheState();
}

class _FicheState extends State<_Fiche> {
  final _pages = PageController();
  int _image = 0;
  bool _contact = false;

  Logement get l => widget.logement;

  bool get _estMonLogement =>
      Session.id != null && l.proprietaire?.id == Session.id;

  @override
  void initState() {
    super.initState();
    if (!_estMonLogement) Historique.ajouter(l.id);
  }

  Future<void> _ouvrirLien(Uri lien, String echec) async {
    try {
      if (!await launchUrl(lien, mode: LaunchMode.externalApplication)) {
        throw Exception();
      }
    } catch (_) {
      if (mounted) afficherMessage(context, echec, erreur: true);
    }
  }

  /// Itinéraire dans l'application de cartes du téléphone (Google Maps, etc.).
  void _itineraire() => _ouvrirLien(
    Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': '${l.latitude},${l.longitude}',
    }),
    'Aucune application de cartes disponible.',
  );

  void _appeler() => _ouvrirLien(
    Uri(scheme: 'tel', path: l.telephoneProprietaire.replaceAll(' ', '')),
    'Impossible de lancer l’appel.',
  );

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  Future<void> _partager() async {
    final texte =
        '${l.titre} — ${formatPrix(l.prix, l.devise)} / '
        '${l.periodiciteLibelle}\n${l.localisation}\n'
        'Découvrez ce logement sur ChezToi.';
    await SharePlus.instance.share(ShareParams(text: texte, subject: l.titre));
  }

  Future<void> _contacter() async {
    if (!await exigerConnexion(
          context,
          raison: 'Connectez-vous pour écrire au propriétaire de ce logement.',
        ) ||
        !mounted) {
      return;
    }
    setState(() => _contact = true);
    try {
      final conversation = await ChezToiApi.instance.demarrerConversation(
        logementId: l.id,
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ChatPage(conversation: conversation),
        ),
      );
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    } finally {
      if (mounted) setState(() => _contact = false);
    }
  }

  Future<void> _reserver() async {
    if (!await exigerConnexion(
          context,
          raison: 'Connectez-vous pour envoyer votre demande de réservation. '
              'Cela ne prend qu’une minute.',
        ) ||
        !mounted) {
      return;
    }
    final reservee = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => ReservationForm(logement: l)),
    );
    if (reservee == true) widget.recharger();
  }

  Widget _galerie() {
    final images = l.images;
    return SliverAppBar(
      expandedHeight: 300,
      pinned: true,
      backgroundColor: Styles.primaire,
      foregroundColor: Colors.white,
      actions: [
        if (!_estMonLogement)
          Padding(
            padding: const EdgeInsets.only(right: 4),
            child: Center(child: BoutonFavori(logement: l, taille: 20)),
          ),
        IconButton(
          tooltip: 'Partager',
          icon: const Icon(RemixIcons.share_line),
          onPressed: _partager,
        ),
        if (!_estMonLogement)
          IconButton(
            tooltip: 'Signaler',
            icon: const Icon(RemixIcons.flag_line),
            onPressed: () async {
              if (await exigerConnexion(
                    context,
                    raison: 'Connectez-vous pour signaler cette annonce.',
                  ) &&
                  mounted) {
                signaler(context, logementId: l.id);
              }
            },
          ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (images.isEmpty)
              const ImageLogement(url: null)
            else
              PageView.builder(
                controller: _pages,
                itemCount: images.length,
                onPageChanged: (i) => setState(() => _image = i),
                itemBuilder: (_, i) => GestureDetector(
                  onTap: () => _pleinEcran(images, i),
                  child: ImageLogement(url: images[i]),
                ),
              ),
            // Dégradé pour la lisibilité des boutons de la barre.
            const IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.center,
                    colors: [Colors.black54, Colors.transparent],
                  ),
                ),
              ),
            ),
            if (images.length > 1)
              Positioned(
                right: 16,
                bottom: 16,
                child: Pastille(
                  texte: '${_image + 1} / ${images.length}',
                  couleur: Colors.white,
                ),
              ),
            if (l.aVisiteVirtuelle)
              Positioned(
                left: 16,
                bottom: 16,
                child: FilledButton.icon(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => VisiteVirtuelle(logement: l),
                    ),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Styles.primaire,
                  ),
                  icon: const Icon(RemixIcons.camera_3_line, size: 18),
                  label: const Text('Visite 360°'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _pleinEcran(List<String> images, int depart) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
          ),
          body: PageView(
            controller: PageController(initialPage: depart),
            children: [
              for (final url in images)
                InteractiveViewer(
                  child: ImageLogement(url: url, fit: BoxFit.contain),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _caracteristiques() {
    final elements = <(IconData, String)>[
      (
        RemixIcons.hotel_bed_line,
        '${l.chambres} chambre${l.chambres > 1 ? 's' : ''}',
      ),
      if (l.salons > 0)
        (RemixIcons.sofa_line, '${l.salons} salon${l.salons > 1 ? 's' : ''}'),
      (
        RemixIcons.drop_line,
        '${l.sallesDeBain} salle${l.sallesDeBain > 1 ? 's' : ''} de bain',
      ),
      if (l.toilettes > 0)
        (
          RemixIcons.door_line,
          '${l.toilettes} toilette${l.toilettes > 1 ? 's' : ''}',
        ),
      if (l.superficie != null) (RemixIcons.ruler_line, '${l.superficie} m²'),
      if (l.capacite != null)
        (RemixIcons.group_line, '${l.capacite} pers. max'),
      if (l.etage != null)
        (
          RemixIcons.building_line,
          l.etage == 0 ? 'Rez-de-chaussée' : 'Étage ${l.etage}',
        ),
      (RemixIcons.armchair_line, l.meuble ? 'Meublé' : 'Non meublé'),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final (icone, texte) in elements)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icone, size: 18, color: Styles.primaire),
                const SizedBox(width: 6),
                Text(texte, style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
      ],
    );
  }

  Widget _ligneMontant(String libelle, int montant) {
    if (montant <= 0) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(libelle, style: TextStyle(color: Colors.grey.shade700)),
          ),
          Text(
            formatPrix(montant, l.devise),
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _bloc({required String titre, required Widget enfant}) {
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [TitreSection(titre), const SizedBox(height: 10), enfant],
      ),
    );
  }

  Widget _proprietaire() {
    final p = l.proprietaire;
    if (p == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Avatar(initiales: p.initiales, rayon: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        p.nomComplet,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    if (p.verifie) ...[
                      const SizedBox(width: 4),
                      const Icon(
                        RemixIcons.verified_badge_fill,
                        size: 16,
                        color: Colors.green,
                      ),
                    ],
                  ],
                ),
                Text(
                  'Membre depuis ${formatDate(p.membreDepuis)}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                if (l.telephoneProprietaire.isNotEmpty)
                  Text(
                    l.telephoneProprietaire,
                    style: const TextStyle(fontSize: 12, color: Styles.primaire),
                  ),
              ],
            ),
          ),
          if (!_estMonLogement && l.telephoneProprietaire.isNotEmpty)
            IconButton.filledTonal(
              tooltip: 'Appeler',
              onPressed: _appeler,
              icon: const Icon(RemixIcons.phone_line),
            ),
          if (!_estMonLogement)
            IconButton.filledTonal(
              tooltip: 'Contacter',
              onPressed: _contact ? null : _contacter,
              icon: const Icon(RemixIcons.chat_3_line),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final texteGris = TextStyle(color: Colors.grey.shade700, height: 1.5);
    return Stack(
      children: [
        CustomScrollView(
          slivers: [
            _galerie(),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
              sliver: SliverList.list(
                children: [
                  if (l.statut != 'publiee')
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: StatutPastille(
                        statut: l.statut,
                        libelle: l.statutLibelle,
                      ),
                    ),
                  Text(
                    l.titre,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Styles.texte,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        RemixIcons.map_pin_3_line,
                        size: 16,
                        color: Styles.primaire,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          [
                            l.quartier,
                            l.commune,
                            l.ville,
                            l.region,
                          ].where((e) => e.isNotEmpty).join(', '),
                          style: const TextStyle(color: Styles.primaire),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      Pastille(texte: l.typeLibelle),
                      if (l.verifie)
                        const Pastille(
                          texte: 'Annonce vérifiée',
                          icone: RemixIcons.verified_badge_fill,
                          couleur: Colors.green,
                        ),
                      if (l.reservationInstantanee)
                        Pastille(
                          texte: 'Réservation instantanée',
                          icone: RemixIcons.flashlight_fill,
                          couleur: Colors.orange.shade800,
                        ),
                      if (l.noteMoyenne != null)
                        Pastille(
                          texte: '${l.noteMoyenne} · ${l.nombreAvis} avis',
                          icone: RemixIcons.star_fill,
                          couleur: Colors.amber.shade800,
                        ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  _caracteristiques(),
                  if (l.description.isNotEmpty)
                    _bloc(
                      titre: 'Description',
                      enfant: Text(l.description, style: texteGris),
                    ),
                  if (l.videos.isNotEmpty)
                    _bloc(
                      titre: 'Vidéos',
                      enfant: Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          for (final (i, v) in l.videos.indexed)
                            InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => LecteurVideo(
                                    url: v.url,
                                    titre: v.legende.isEmpty
                                        ? 'Vidéo ${i + 1}'
                                        : v.legende,
                                  ),
                                ),
                              ),
                              child: Container(
                                width: 150,
                                height: 90,
                                decoration: BoxDecoration(
                                  color: Styles.primaire,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      RemixIcons.play_circle_fill,
                                      color: Colors.white,
                                      size: 36,
                                    ),
                                    Text(
                                      v.legende.isEmpty
                                          ? 'Vidéo ${i + 1}'
                                          : v.legende,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  if (l.equipements.isNotEmpty)
                    _bloc(
                      titre: 'Équipements',
                      enfant: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final e in l.equipements)
                            Chip(
                              avatar: const Icon(
                                RemixIcons.check_line,
                                size: 16,
                                color: Styles.primaire,
                              ),
                              label: Text(e.nom),
                              backgroundColor: Colors.white,
                              side: BorderSide(color: Colors.grey.shade200),
                            ),
                        ],
                      ),
                    ),
                  _bloc(
                    titre: 'Conditions de location',
                    enfant: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _ligneMontant(
                            'Loyer / ${l.periodiciteLibelle}',
                            l.prix,
                          ),
                          _ligneMontant('Caution', l.caution),
                          _ligneMontant('Avance', l.avance),
                          _ligneMontant(
                            'Frais supplémentaires',
                            l.fraisSupplementaires,
                          ),
                          _ligneMontant('Charges', l.charges),
                          if (l.conditionsPaiement.isNotEmpty) ...[
                            const Divider(height: 20),
                            Text(
                              'Paiement : ${l.conditionsPaiement}',
                              style: texteGris,
                            ),
                          ],
                          if (l.conditionsAnnulation.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Annulation : ${l.conditionsAnnulation}',
                              style: texteGris,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  if (l.aPosition)
                    _bloc(
                      titre: 'Localisation',
                      enfant: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: SizedBox(
                              height: 200,
                              child: CartePosition(
                                latitude: l.latitude!,
                                longitude: l.longitude!,
                                approximative: !l.adresseVisible,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            l.adresseVisible && l.adresse.isNotEmpty
                                ? l.adresse
                                : 'Position approximative. L’adresse exacte vous '
                                      'sera communiquée après acceptation de votre réservation.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          OutlinedButton.icon(
                            onPressed: _itineraire,
                            style: styleBoutonSecondaire(),
                            icon: const Icon(RemixIcons.route_line),
                            label: Text(
                              l.adresseVisible
                                  ? 'Itinéraire jusqu’au logement'
                                  : 'Itinéraire vers le quartier',
                            ),
                          ),
                        ],
                      ),
                    ),
                  _bloc(titre: 'Propriétaire', enfant: _proprietaire()),
                  _bloc(
                    titre: l.nombreAvis > 0 ? 'Avis (${l.nombreAvis})' : 'Avis',
                    enfant: ListeAvis(logementId: l.id),
                  ),
                  const SizedBox(height: 24),
                  _Similaires(logementId: l.id),
                ],
              ),
            ),
          ],
        ),
        if (!_estMonLogement && l.statut == 'publiee')
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _BarreReservation(
              logement: l,
              onReserver: _reserver,
              onContacter: _contact ? null : _contacter,
            ),
          ),
      ],
    );
  }
}

class _BarreReservation extends StatelessWidget {
  const _BarreReservation({
    required this.logement,
    required this.onReserver,
    required this.onContacter,
  });

  final Logement logement;
  final VoidCallback onReserver;
  final VoidCallback? onContacter;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        14,
        20,
        14 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  formatPrix(logement.prix, logement.devise),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Styles.texte,
                  ),
                ),
                Text(
                  'par ${logement.periodiciteLibelle}',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
          IconButton.outlined(
            tooltip: 'Contacter le propriétaire',
            onPressed: onContacter,
            icon: const Icon(RemixIcons.chat_3_line, color: Styles.primaire),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: onReserver,
            style: styleBoutonPrincipal(),
            child: Text(
              logement.reservationInstantanee ? 'Réserver' : 'Demander',
            ),
          ),
        ],
      ),
    );
  }
}

/// Avis publiés sur un logement.
class ListeAvis extends StatelessWidget {
  const ListeAvis({super.key, required this.logementId});

  final int logementId;

  @override
  Widget build(BuildContext context) {
    return Chargeur<List<Avis>>(
      charger: () => ChezToiApi.instance.avisLogement(logementId),
      builder: (context, avis, _) {
        if (avis.isEmpty) {
          return Text(
            'Pas encore d’avis sur ce logement.',
            style: TextStyle(color: Colors.grey.shade600),
          );
        }
        return Column(
          children: [for (final a in avis.take(5)) CarteAvis(avis: a)],
        );
      },
    );
  }
}

class CarteAvis extends StatelessWidget {
  const CarteAvis({super.key, required this.avis, this.action});

  final Avis avis;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Avatar(initiales: avis.auteur.initiales, rayon: 16),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      avis.auteur.nomComplet,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    Text(
                      formatDate(avis.creeLe),
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              Etoiles(note: avis.noteGlobale),
            ],
          ),
          if (avis.commentaire.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(avis.commentaire),
          ],
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 2,
            children: [
              for (final entree in avis.notes.entries)
                Text(
                  '${entree.key} ${entree.value}/5',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
            ],
          ),
          if (avis.reponseProprietaire.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Styles.fond,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                'Réponse du propriétaire : ${avis.reponseProprietaire}',
                style: const TextStyle(fontSize: 13),
              ),
            ),
          ?action,
        ],
      ),
    );
  }
}

class _Similaires extends StatelessWidget {
  const _Similaires({required this.logementId});

  final int logementId;

  @override
  Widget build(BuildContext context) {
    return Chargeur<List<Logement>>(
      charger: () => ChezToiApi.instance.similaires(logementId),
      builder: (context, logements, _) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 0),
        child: logements.isEmpty
            ? const SizedBox.shrink()
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const TitreSection('Logements similaires'),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (final s in logements) ...[
                            LogementCarte(logement: s, largeur: 220),
                            const SizedBox(width: 12),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
