import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

class Accueil extends StatefulWidget {
  const Accueil({super.key, this.onOngletChange});

  /// Permet aux raccourcis d'ouvrir un autre onglet de la navigation.
  final ValueChanged<int>? onOngletChange;

  @override
  State<Accueil> createState() => _AccueilState();
}

class _AccueilState extends State<Accueil> {
  // Temporaire : sera remplacé par le prénom de l'utilisateur connecté.
  static const String _prenom = 'Uriel';

  static const List<_Annonce> _annonces = [
    _Annonce(
      titre: 'Visitez avant de vous déplacer',
      sousTitre: 'Plus de 10 logements disponibles en visite 360° et 3D.',
      action: 'Explorer',
      icone: RemixIcons.camera_3_line,
      debut: Color(0xFF3A1C9E),
      fin: Color(0xFF16005D),
    ),
    _Annonce(
      titre: 'Appartement disponible à Lomé',
      sousTitre: 'Vous avez récemment cherché dans cette localité.',
      action: 'Voir les annonces',
      icone: RemixIcons.building_3_line,
      debut: Color(0xFF1D6FE8),
      fin: Color(0xFF0F3D8C),
    ),
  ];

  static const List<_Logement> _visites = [
    _Logement(
      cle: 'visite_1',
      image: 'assets/maison.webp',
      prix: '350 000 FCFA',
      duree: '/ mois',
      localisation: 'Lomé, Maritime',
      description:
          'Maison familiale 4 pièces avec jardin clos, à 10 min du centre-ville.',
    ),
    _Logement(
      cle: 'visite_2',
      image: 'assets/immeuble.webp',
      prix: '180 000 FCFA',
      duree: '/ mois',
      localisation: 'Kara, Savanes',
      description:
          'Appartement 2 pièces lumineux avec balcon, proche marché et commerces.',
    ),
  ];

  static const List<_Logement> _publications = [
    _Logement(
      cle: 'publication_1',
      image: 'assets/maison.webp',
      prix: '220 000 FCFA',
      duree: '/ mois',
      localisation: 'Sokodé, Centrale',
      description:
          'Studio meublé proche du grand marché, idéal pour un étudiant.',
    ),
    _Logement(
      cle: 'publication_2',
      image: 'assets/immeuble.webp',
      prix: '600 000 FCFA',
      duree: '/ mois',
      localisation: 'Kpalimé, Plateaux',
      description:
          'Appartement 3 pièces avec terrasse et vue sur les collines.',
    ),
  ];

  final _rechercheC = TextEditingController();

  @override
  void dispose() {
    _rechercheC.dispose();
    super.dispose();
  }

  void _bientotDisponible(String rubrique) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$rubrique : bientôt disponible 🚧'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _carte(_Annonce annonce) {
    return SizedBox(
      width: 280,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: LinearGradient(
            colors: [annonce.debut, annonce.fin],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(annonce.icone, color: Colors.white, size: 26),
            const SizedBox(height: 20),
            Text(
              annonce.titre,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              annonce.sousTitre,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Flexible(
                  child: Text(
                    annonce.action,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(
                  RemixIcons.arrow_right_line,
                  size: 16,
                  color: Colors.white,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Section avec un titre, un lien « Voir tout » et des cartes défilables.
  Widget _sectionLogements(String titre, List<_Logement> logements) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  titre,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Styles.texte,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () => _bientotDisponible(titre),
                child: const Text(
                  'Voir tout',
                  style: TextStyle(
                    color: Styles.bleu,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final logement in logements) ...[
                  _LogementCard(logement: logement),
                  const SizedBox(width: 14),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: const SizedBox.shrink(),
        leadingWidth: 20,
        titleSpacing: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        title: Padding(
          padding: const EdgeInsets.only(right: 20),
          child: Row(
            children: [
              IconButton(
                padding: EdgeInsets.zero,
                icon: const Icon(
                  RemixIcons.user_3_line,
                  size: 26,
                  color: Styles.violet,
                ),
                onPressed: () => _bientotDisponible('Votre profil'),
              ),
              IconButton(
                padding: EdgeInsets.zero,
                icon: const Icon(
                  RemixIcons.notification_3_line,
                  size: 26,
                  color: Styles.violet,
                ),
                onPressed: () => _bientotDisponible('Notifications'),
              ),
              const Spacer(),
              RichText(
                text: const TextSpan(
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Styles.texte,
                  ),
                  children: [
                    TextSpan(text: 'Chez'),
                    TextSpan(
                      text: 'Toi',
                      style: TextStyle(color: Styles.bleu),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Bonjour $_prenom 👋',
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            color: Styles.texte,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Trouvez le logement fait pour vous.',
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 20),

                    // Barre de recherche
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: TextField(
                        controller: _rechercheC,
                        textInputAction: TextInputAction.search,
                        decoration: InputDecoration(
                          hintText: 'Ville, quartier, type de logement...',
                          prefixIcon: const Icon(
                            RemixIcons.search_2_line,
                            color: Styles.violet,
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 16,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Annonces défilables vers la droite
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (final annonce in _annonces) ...[
                        _carte(annonce),
                        const SizedBox(width: 14),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // Raccourcis
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: _Raccourci(
                          icone: RemixIcons.heart_3_line,
                          label: 'Favoris',
                          onTap: () => widget.onOngletChange?.call(3),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _Raccourci(
                          icone: RemixIcons.calendar_check_line,
                          label: 'Réservations',
                          onTap: () => _bientotDisponible('Réservations'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _Raccourci(
                          icone: RemixIcons.alarm_line,
                          label: 'Alertes',
                          onTap: () => _bientotDisponible('Alertes'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _Raccourci(
                          icone: RemixIcons.arrow_left_right_line,
                          label: 'Comparer',
                          onTap: () => _bientotDisponible('Comparer'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),
              _sectionLogements('Récemment visité', _visites),
              const SizedBox(height: 28),
              _sectionLogements('Récemment publié', _publications),
            ],
          ),
        ),
      ),
    );
  }
}

class _Annonce {
  const _Annonce({
    required this.titre,
    required this.sousTitre,
    required this.action,
    required this.icone,
    required this.debut,
    required this.fin,
  });

  final String titre;
  final String sousTitre;
  final String action;
  final IconData icone;
  final Color debut;
  final Color fin;
}

class _Raccourci extends StatelessWidget {
  const _Raccourci({
    required this.icone,
    required this.label,
    required this.onTap,
  });

  final IconData icone;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        key: ValueKey('raccourci_$label'),
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icone, color: Styles.violet, size: 24),
            const SizedBox(height: 8),
            Flexible(
              child: Text(
                label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: Styles.texte),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bien immobilier affiché dans la section « Récemment visité ».
class _Logement {
  const _Logement({
    required this.cle,
    required this.image,
    required this.prix,
    required this.duree,
    required this.localisation,
    required this.description,
  });

  final String cle;
  final String image;
  final String prix;
  final String duree;
  final String localisation;
  final String description;
}

/// Carte d'un bien avec son image, son bouton favori et ses informations.
class _LogementCard extends StatefulWidget {
  const _LogementCard({required this.logement});

  final _Logement logement;

  @override
  State<_LogementCard> createState() => _LogementCardState();
}

class _LogementCardState extends State<_LogementCard> {
  bool _estFavori = false;

  @override
  Widget build(BuildContext context) {
    final logement = widget.logement;

    return SizedBox(
      width: 240,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image du bien + bouton favori, tous deux dans la carte.
            Stack(
              alignment: Alignment.topRight,
              children: [
                Image.asset(
                  logement.image,
                  height: 140,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: InkWell(
                    key: ValueKey('favori_${logement.cle}'),
                    onTap: () => setState(() => _estFavori = !_estFavori),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        _estFavori
                            ? RemixIcons.heart_3_fill
                            : RemixIcons.heart_3_line,
                        color: _estFavori ? Colors.red : Styles.violet,
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Flexible(
                        child: Text(
                          logement.prix,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Styles.texte,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        logement.duree,
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        RemixIcons.map_pin_3_line,
                        size: 14,
                        color: Styles.violet,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          logement.localisation,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Styles.violet,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    logement.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
