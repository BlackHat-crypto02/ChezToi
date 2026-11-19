import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/acces.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/historique.dart';
import 'package:cheztoi/services/session.dart';
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

  /// Permet aux raccourcis d'ouvrir un autre onglet de la navigation.
  final ValueChanged<int>? onOngletChange;

  /// Ouvre l'onglet Recherche avec des critères pré-remplis.
  final ValueChanged<Map<String, dynamic>>? onRecherche;

  /// Prénom de l'utilisateur connecté (null pour un invité).
  final String? prenom;

  /// Transmis au profil pour la déconnexion.
  final Future<void> Function()? onDeconnexion;

  /// Transmis au profil pour passer dans l'espace propriétaire.
  final ValueChanged<UtilisateurAuth>? onChangementRole;

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

  @override
  void dispose() {
    _rechercheC.dispose();
    super.dispose();
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

  Future<void> _recharger() async {
    final futur = ChezToiApi.instance.accueil();
    setState(() => _futur = futur);
    _chargerConsultes();
    await futur.catchError((_) => const DonneesAccueil());
  }

  void _rechercher(Map<String, dynamic> criteres) =>
      widget.onRecherche?.call(criteres);

  Future<void> _ouvrirReserve(Widget page, String raison) async {
    if (!await exigerConnexion(context, raison: raison) || !mounted) return;
    await Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => page));
  }

  // ------------------------------------------------------------- En-tête

  Widget _entete() {
    final connecte = Session.estConnecte;
    final prenom = widget.prenom ?? '';
    return Container(
      decoration: const BoxDecoration(
        gradient: Styles.degradeMarque,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -50,
            top: -30,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.06),
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 12, 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Text.rich(
                        const TextSpan(
                          style: TextStyle(
                            fontFamily: Styles.police,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                          children: [
                            TextSpan(text: 'Chez'),
                            TextSpan(
                              text: 'Toi',
                              style: TextStyle(color: Styles.menthe),
                            ),
                          ],
                        ),
                        semanticsLabel: 'ChezToi',
                      ),
                      const Spacer(),
                      if (connecte) ...[
                        IconTheme(
                          data: const IconThemeData(color: Colors.white),
                          child: ClocheNotifications(
                            couleur: Colors.white,
                            onOuvrirMessages: () =>
                                widget.onOngletChange?.call(4),
                          ),
                        ),
                        IconButton(
                          tooltip: 'Mon profil',
                          icon: const Icon(
                            RemixIcons.user_3_line,
                            color: Colors.white,
                            size: 25,
                          ),
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => Profil(
                                onDeconnexion: widget.onDeconnexion,
                                onChangementRole: widget.onChangementRole,
                              ),
                            ),
                          ),
                        ),
                      ] else
                        Flexible(
                          child: Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilledButton.icon(
                              onPressed: () => ouvrirConnexion(context),
                              style: FilledButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: Styles.primaire,
                                minimumSize: const Size(0, 40),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                ),
                              ),
                              icon: const Icon(
                                RemixIcons.user_3_line,
                                size: 18,
                              ),
                              label: const Text(
                                'Se connecter',
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(
                    prenom.isEmpty ? 'Bienvenue 👋' : 'Bonjour $prenom 👋',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Où souhaitez-vous habiter ?',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.6,
                      height: 1.15,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: Styles.ombre(2),
                      ),
                      child: TextField(
                        controller: _rechercheC,
                        textInputAction: TextInputAction.search,
                        onSubmitted: (texte) {
                          final valeur = texte.trim();
                          _rechercher({if (valeur.isNotEmpty) 'q': valeur});
                          _rechercheC.clear();
                        },
                        decoration: InputDecoration(
                          hintText: 'Ville, quartier, type de logement...',
                          prefixIcon: const Icon(
                            RemixIcons.search_2_line,
                            color: Styles.primaire,
                          ),
                          suffixIcon: IconButton(
                            tooltip: 'Filtres',
                            onPressed: () => _rechercher(const {}),
                            icon: const Icon(
                              RemixIcons.equalizer_line,
                              color: Styles.texteDoux,
                            ),
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          filled: false,
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 17,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------- Contenu

  Widget _categories(DonneesAccueil a) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final type in Libelles.types.entries)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: _Categorie(
                icone: iconesTypes[type.key]!,
                libelle: type.value,
                total: a.types[type.key] ?? 0,
                onTap: () => _rechercher({'type': type.key}),
              ),
            ),
        ],
      ),
    );
  }

  Widget _raccourcis() {
    return Padding(
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
            const SizedBox(width: 10),
            Expanded(
              child: _Raccourci(
                icone: RemixIcons.calendar_check_line,
                label: 'Réservations',
                onTap: () => _ouvrirReserve(
                  const MesReservations(),
                  'Connectez-vous pour retrouver vos réservations.',
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Raccourci(
                icone: RemixIcons.alarm_line,
                label: 'Alertes',
                onTap: () => _ouvrirReserve(
                  const Alertes(),
                  'Connectez-vous pour être prévenu des nouvelles annonces.',
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Raccourci(
                icone: RemixIcons.arrow_left_right_line,
                label: 'Comparer',
                onTap: () => _ouvrirReserve(
                  const Favoris(modeComparaison: true),
                  'Connectez-vous pour comparer vos logements favoris.',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _banniere360(DonneesAccueil a) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
      child: Material(
        borderRadius: BorderRadius.circular(Styles.rayonGrand),
        clipBehavior: Clip.antiAlias,
        color: Styles.primaireNuit,
        child: InkWell(
          onTap: () => _rechercher({'visite': 'true'}),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 150),
            child: Stack(
              children: [
                Positioned(
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 160,
                  child: ShaderMask(
                    shaderCallback: (r) => const LinearGradient(
                      colors: [Colors.transparent, Colors.black],
                      stops: [0, 0.5],
                    ).createShader(r),
                    blendMode: BlendMode.dstIn,
                    child: Image.asset(
                      'assets/immeuble.webp',
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 150, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Styles.menthe.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'VISITE 360°',
                          style: TextStyle(
                            color: Styles.menthe,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const SizedBox(
                        child: Text(
                          'Visitez avant de vous déplacer',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            height: 1.2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        a.visites.isEmpty
                            ? 'Bientôt disponible sur de nombreux logements.'
                            : '${a.visites.length} logement(s) à explorer · Explorer',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _villes(DonneesAccueil a) {
    if (a.villes.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: TitreSection('Explorer par ville'),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 112,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: a.villes.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (_, i) {
                final v = a.villes[i];
                return Material(
                  borderRadius: BorderRadius.circular(Styles.rayon),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () => _rechercher({'ville': v.libelle}),
                    child: Ink(
                      width: 150,
                      decoration: BoxDecoration(
                        image: DecorationImage(
                          image: AssetImage(
                            i.isEven
                                ? 'assets/maison.webp'
                                : 'assets/immeuble.webp',
                          ),
                          fit: BoxFit.cover,
                        ),
                      ),
                      child: DecoratedBox(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Color(0x11000000), Color(0xCC053B37)],
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Text(
                                v.libelle,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                ),
                              ),
                              Text(
                                '${v.total} logement${v.total > 1 ? 's' : ''}',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.8),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _contenu(DonneesAccueil a) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 20),
        _categories(a),
        const SizedBox(height: 8),
        _raccourcis(),
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
          titre: Session.estConnecte ? 'Recommandés pour vous' : 'À la une',
          logements: a.recommandes,
          onVoirTout: () => _rechercher(const {}),
        ),
        _banniere360(a),
        SectionLogements(
          titre: 'Récemment publiés',
          logements: a.recents,
          onVoirTout: () => _rechercher(const {}),
        ),
        _villes(a),
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
        if (a.total == 0)
          const EtatVide(
            icone: RemixIcons.home_4_line,
            titre: 'Aucune annonce pour le moment',
            message:
                'Revenez bientôt : de nouveaux logements sont publiés '
                'chaque jour.',
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _recharger,
        edgeOffset: 120,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            _entete(),
            FutureBuilder<DonneesAccueil>(
              future: _futur,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const _SqueletteAccueil();
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
    );
  }
}

/// Emplacements gris animés pendant le chargement.
class _SqueletteAccueil extends StatefulWidget {
  const _SqueletteAccueil();

  @override
  State<_SqueletteAccueil> createState() => _SqueletteAccueilState();
}

class _SqueletteAccueilState extends State<_SqueletteAccueil>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Widget bloc(double l, double h, [double r = 16]) => Container(
      width: l,
      height: h,
      decoration: BoxDecoration(
        color: Styles.bordure,
        borderRadius: BorderRadius.circular(r),
      ),
    );
    return FadeTransition(
      opacity: Tween(begin: 0.45, end: 1.0).animate(_anim),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 0, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              child: Row(
                children: [
                  for (var i = 0; i < 5; i++) ...[
                    bloc(64, 64, 20),
                    const SizedBox(width: 20),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 28),
            bloc(160, 18, 6),
            const SizedBox(height: 14),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              child: Row(
                children: [
                  bloc(250, 230, 22),
                  const SizedBox(width: 14),
                  bloc(250, 230, 22),
                ],
              ),
            ),
          ],
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
    return SizedBox(
      width: 84,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(Styles.rayon),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: Styles.ombre(),
              ),
              child: Icon(icone, color: Styles.primaire, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              libelle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              '$total',
              style: const TextStyle(fontSize: 11, color: Styles.texteDoux),
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
    return Material(
      color: Styles.primaireClair,
      borderRadius: BorderRadius.circular(Styles.rayon),
      child: InkWell(
        key: ValueKey('raccourci_$label'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(Styles.rayon),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icone, color: Styles.primaire, size: 24),
              const SizedBox(height: 8),
              Flexible(
                child: Text(
                  label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Styles.primaireFonce,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
