import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/historique.dart';
import 'package:cheztoi/views/commun/notifications.dart';
import 'package:cheztoi/views/commun/profil.dart';
import 'package:cheztoi/views/commun/reservations.dart';
import 'package:cheztoi/views/locataire/alertes.dart';
import 'package:cheztoi/views/locataire/ongles/favoris.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

const Map<String, IconData> iconesTypes = {
  'maison': RemixIcons.home_4_line,
  'appartement': RemixIcons.building_2_line,
  'studio': RemixIcons.door_open_line,
  'chambre': RemixIcons.hotel_bed_line,
  'villa': RemixIcons.community_line,
  'duplex': RemixIcons.building_4_line,
};

class Accueil extends StatefulWidget {
  const Accueil({
    super.key,
    this.onOngletChange,
    this.onRecherche,
    this.prenom,
    this.onDeconnexion,
    this.onChangementRole,
  });

  /// Transmis au profil pour passer dans l'espace propriétaire.
  final ValueChanged<UtilisateurAuth>? onChangementRole;

  /// Permet aux raccourcis d'ouvrir un autre onglet de la navigation.
  final ValueChanged<int>? onOngletChange;

  /// Ouvre l'onglet Recherche avec des critères pré-remplis.
  final ValueChanged<Map<String, dynamic>>? onRecherche;

  /// Prénom de l'utilisateur connecté (facultatif).
  final String? prenom;

  /// Transmis au profil pour la déconnexion.
  final Future<void> Function()? onDeconnexion;

  @override
  State<Accueil> createState() => _AccueilState();
}

class _AccueilState extends State<Accueil> {
  final _rechercheC = TextEditingController();
  late Future<DonneesAccueil> _futur = ChezToiApi.instance.accueil();
  List<Logement> _consultes = const [];

  @override
  void initState() {
    super.initState();
    _chargerConsultes();
  }

  Future<void> _chargerConsultes() async {
    try {
      final ids = await Historique.lire();
      final logements = await ChezToiApi.instance.logementsParIds(
        ids.take(10).toList(),
      );
      if (mounted) setState(() => _consultes = logements);
    } catch (_) {}
  }

  @override
  void dispose() {
    _rechercheC.dispose();
    super.dispose();
  }

  Future<void> _recharger() async {
    final futur = ChezToiApi.instance.accueil();
    setState(() => _futur = futur);
    _chargerConsultes();
    await futur.catchError((_) => const DonneesAccueil());
  }

  void _rechercher(Map<String, dynamic> criteres) =>
      widget.onRecherche?.call(criteres);

  void _ouvrir(Widget page) =>
      Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));

  Widget _banniere({
    required String titre,
    required String sousTitre,
    required String action,
    required IconData icone,
    required Color debut,
    required Color fin,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: 280,
      child: Material(
        borderRadius: BorderRadius.circular(18),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Ink(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [debut, fin],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icone, color: Colors.white, size: 26),
                const SizedBox(height: 20),
                Text(
                  titre,
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
                  sousTitre,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        action,
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
        ),
      ),
    );
  }

  Widget _contenu(DonneesAccueil a) {
    final villePrincipale = a.villes.isEmpty ? 'Lomé' : a.villes.first.libelle;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Bannières défilables
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _banniere(
                  titre: 'Visitez avant de vous déplacer',
                  sousTitre: a.visites.isEmpty
                      ? 'Les visites 360° arrivent bientôt sur ChezToi.'
                      : '${a.visites.length} logement(s) à explorer en visite 360°.',
                  action: 'Explorer',
                  icone: RemixIcons.camera_3_line,
                  debut: const Color(0xFF3A1C9E),
                  fin: const Color(0xFF16005D),
                  onTap: () => _rechercher({'visite': 'true'}),
                ),
                const SizedBox(width: 14),
                _banniere(
                  titre: 'Logements disponibles à $villePrincipale',
                  sousTitre:
                      '${a.total} annonce(s) publiée(s) sur la plateforme.',
                  action: 'Voir les annonces',
                  icone: RemixIcons.building_3_line,
                  debut: const Color(0xFF1D6FE8),
                  fin: const Color(0xFF0F3D8C),
                  onTap: () => _rechercher({'ville': villePrincipale}),
                ),
                const SizedBox(width: 14),
                _banniere(
                  titre: 'Annonces vérifiées',
                  sousTitre: 'Contrôlées par l’équipe ChezToi pour louer en confiance.',
                  action: 'Voir',
                  icone: RemixIcons.shield_check_line,
                  debut: const Color(0xFF0E9F6E),
                  fin: const Color(0xFF046C4E),
                  onTap: () => _rechercher({'verifie': 'true'}),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Catégories
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final type in Libelles.types.entries)
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: _Categorie(
                      icone: iconesTypes[type.key]!,
                      libelle: type.value,
                      total: a.types[type.key] ?? 0,
                      onTap: () => _rechercher({'type': type.key}),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

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
                    onTap: () => _ouvrir(const MesReservations()),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _Raccourci(
                    icone: RemixIcons.alarm_line,
                    label: 'Alertes',
                    onTap: () => _ouvrir(const Alertes()),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _Raccourci(
                    icone: RemixIcons.arrow_left_right_line,
                    label: 'Comparer',
                    onTap: () => _ouvrir(const Favoris(modeComparaison: true)),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),

        SectionLogements(
          titre: 'Récemment consultés',
          logements: _consultes,
          action: 'Effacer',
          onVoirTout: () async {
            await Historique.effacer();
            if (mounted) setState(() => _consultes = const []);
          },
        ),
        SectionLogements(
          titre: 'Recommandés pour vous',
          logements: a.recommandes,
          onVoirTout: () => _rechercher(const {}),
        ),
        SectionLogements(
          titre: 'Récemment publiés',
          logements: a.recents,
          onVoirTout: () => _rechercher(const {}),
        ),
        SectionLogements(titre: 'Les plus consultés', logements: a.populaires),
        SectionLogements(
          titre: 'Annonces vérifiées',
          logements: a.verifies,
          onVoirTout: () => _rechercher({'verifie': 'true'}),
        ),
        SectionLogements(
          titre: 'Avec visite 360°',
          logements: a.visites,
          onVoirTout: () => _rechercher({'visite': 'true'}),
        ),

        if (a.villes.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TitreSection('Explorer par ville'),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final v in a.villes)
                      ActionChip(
                        avatar: const Icon(
                          RemixIcons.map_pin_line,
                          size: 16,
                          color: Styles.violet,
                        ),
                        label: Text('${v.libelle} (${v.total})'),
                        backgroundColor: Colors.white,
                        side: BorderSide(color: Colors.grey.shade200),
                        onPressed: () => _rechercher({'ville': v.libelle}),
                      ),
                  ],
                ),
              ],
            ),
          ),
        if (a.total == 0)
          const EtatVide(
            icone: RemixIcons.home_4_line,
            titre: 'Aucune annonce pour le moment',
            message: 'Revenez bientôt : de nouveaux logements sont publiés chaque jour.',
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
                tooltip: 'Mon profil',
                padding: EdgeInsets.zero,
                icon: const Icon(
                  RemixIcons.user_3_line,
                  size: 26,
                  color: Styles.violet,
                ),
                onPressed: () => _ouvrir(
                  Profil(
                    onDeconnexion: widget.onDeconnexion,
                    onChangementRole: widget.onChangementRole,
                  ),
                ),
              ),
              ClocheNotifications(
                onOuvrirMessages: () => widget.onOngletChange?.call(4),
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
        child: RefreshIndicator(
          onRefresh: _recharger,
          child: ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      widget.prenom == null || widget.prenom!.isEmpty
                          ? 'Bonjour 👋'
                          : 'Bonjour ${widget.prenom} 👋',
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
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: TextField(
                        controller: _rechercheC,
                        textInputAction: TextInputAction.search,
                        onSubmitted: (texte) {
                          final valeur = texte.trim();
                          _rechercher({if (valeur.isNotEmpty) 'q': valeur});
                          _rechercheC.clear();
                        },
                        decoration: const InputDecoration(
                          hintText: 'Ville, quartier, type de logement...',
                          prefixIcon: Icon(
                            RemixIcons.search_2_line,
                            color: Styles.violet,
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 16),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              FutureBuilder<DonneesAccueil>(
                future: _futur,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Chargement();
                  }
                  if (snapshot.hasError) {
                    return EtatErreur(
                      erreur: snapshot.error!,
                      onReessayer: _recharger,
                    );
                  }
                  return _contenu(snapshot.data!);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Categorie extends StatelessWidget {
  const _Categorie({
    required this.icone,
    required this.libelle,
    required this.total,
    required this.onTap,
  });

  final IconData icone;
  final String libelle;
  final int total;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 92,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icone, color: Styles.violet),
            const SizedBox(height: 6),
            Text(
              libelle,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
            Text(
              '$total',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
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
