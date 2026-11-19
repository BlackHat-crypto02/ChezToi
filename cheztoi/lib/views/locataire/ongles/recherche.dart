import 'dart:async';

import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Recherche avancée : mots-clés, filtres, tri, résultats paginés.
class Recherche extends StatefulWidget {
  const Recherche({
    super.key,
    this.criteresInitiaux = const {},
    this.autonome = false,
  });

  /// Ouvert hors de la navigation (depuis une alerte) : bouton retour.
  final bool autonome;

  /// Critères transmis depuis l'accueil (texte saisi, catégorie, ville...).
  final Map<String, dynamic> criteresInitiaux;

  @override
  State<Recherche> createState() => _RechercheState();
}

class _RechercheState extends State<Recherche> {
  static const _cleHistorique = 'cheztoi_historique_recherche';

  static const _tris = {
    'recent': 'Plus récents',
    'prix_asc': 'Prix croissant',
    'prix_desc': 'Prix décroissant',
    'populaire': 'Popularité',
    'note': 'Mieux notés',
  };

  final _texte = TextEditingController();
  final _defilement = ScrollController();
  late Map<String, dynamic> _criteres;
  String _tri = 'recent';

  final List<Logement> _resultats = [];
  int _total = 0;
  int _page = 1;
  bool _suite = false;
  bool _chargement = false;
  Object? _erreur;
  List<String> _historique = const [];
  List<SuggestionLieu> _suggestions = const [];
  Timer? _attente;
  bool _saisie = false;

  @override
  void initState() {
    super.initState();
    _criteres = Map.of(widget.criteresInitiaux);
    _texte.text = (_criteres['q'] as String?) ?? '';
    _defilement.addListener(() {
      if (_defilement.position.pixels >
              _defilement.position.maxScrollExtent - 300 &&
          _suite &&
          !_chargement) {
        _charger();
      }
    });
    _lireHistorique();
    _relancer();
  }

  @override
  void dispose() {
    _attente?.cancel();
    _texte.dispose();
    _defilement.dispose();
    super.dispose();
  }

  Future<void> _lireHistorique() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (mounted) {
        setState(() => _historique = prefs.getStringList(_cleHistorique) ?? []);
      }
    } catch (_) {}
  }

  Future<void> _memoriser(String texte) async {
    if (texte.isEmpty) return;
    final liste = [texte, ..._historique.where((h) => h != texte)].take(8).toList();
    setState(() => _historique = liste);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_cleHistorique, liste);
    } catch (_) {}
  }

  void _relancer() {
    setState(() {
      _resultats.clear();
      _page = 1;
      _suite = false;
      _total = 0;
      _erreur = null;
    });
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final page = await ChezToiApi.instance.rechercher(
        _criteres,
        page: _page,
        tri: _tri,
      );
      if (!mounted) return;
      setState(() {
        _resultats.addAll(page.elements);
        _total = page.total;
        _suite = page.suite;
        _page++;
      });
    } catch (e) {
      if (mounted) setState(() => _erreur = e);
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  void _soumettre([String? texte]) {
    final valeur = (texte ?? _texte.text).trim();
    _texte.text = valeur;
    FocusScope.of(context).unfocus();
    setState(() {
      _saisie = false;
      if (valeur.isEmpty) {
        _criteres.remove('q');
      } else {
        _criteres['q'] = valeur;
      }
    });
    _memoriser(valeur);
    _relancer();
  }

  void _surSaisie(String texte) {
    _attente?.cancel();
    _attente = Timer(const Duration(milliseconds: 300), () async {
      try {
        final suggestions = await ChezToiApi.instance.suggestions(texte.trim());
        if (mounted) setState(() => _suggestions = suggestions);
      } catch (_) {}
    });
  }

  int get _nombreFiltres => _criteres.keys.where((k) => k != 'q').length;

  Future<void> _ouvrirFiltres() async {
    final criteres = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (_) => FiltresRecherche(criteres: _criteres),
    );
    if (criteres == null) return;
    setState(() => _criteres = {
          ...criteres,
          if (_criteres['q'] != null) 'q': _criteres['q'],
        });
    _relancer();
  }

  Future<void> _enregistrer() async {
    final nom = await demanderTexte(
      context,
      titre: 'Créer une alerte',
      label: 'Nom de l’alerte',
      action: 'Créer',
      obligatoire: true,
    );
    if (nom == null || !mounted) return;
    try {
      await ChezToiApi.instance.enregistrerRecherche(nom, _criteres);
      if (mounted) {
        afficherMessage(
          context,
          'Alerte créée : vous serez notifié des nouvelles annonces.',
        );
      }
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    }
  }

  Widget _barre() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _texte,
              textInputAction: TextInputAction.search,
              onSubmitted: _soumettre,
              onTap: () => setState(() => _saisie = true),
              onChanged: _surSaisie,
              decoration: InputDecoration(
                hintText: 'Ville, quartier, type…',
                prefixIcon: const Icon(
                  RemixIcons.search_2_line,
                  color: Styles.violet,
                ),
                suffixIcon: _texte.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(RemixIcons.close_line),
                        onPressed: () {
                          _texte.clear();
                          _soumettre('');
                        },
                      ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: Styles.border(Colors.grey.shade200),
                enabledBorder: Styles.border(Colors.grey.shade200),
                focusedBorder: Styles.border(Styles.violet, width: 2),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Badge(
            isLabelVisible: _nombreFiltres > 0,
            label: Text('$_nombreFiltres'),
            backgroundColor: Styles.bleu,
            child: IconButton.filled(
              tooltip: 'Filtres',
              style: IconButton.styleFrom(
                backgroundColor: Styles.violet,
                padding: const EdgeInsets.all(12),
              ),
              onPressed: _ouvrirFiltres,
              icon: const Icon(RemixIcons.equalizer_line),
            ),
          ),
        ],
      ),
    );
  }

  Widget _propositions() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      children: [
        for (final s in _suggestions)
          ListTile(
            leading: const Icon(RemixIcons.map_pin_line, color: Styles.violet),
            title: Text(s.libelle),
            subtitle: Text('${s.total} logement(s) · ${s.type}'),
            onTap: () => _soumettre(s.libelle),
          ),
        if (_historique.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text(
              'Recherches récentes',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          for (final h in _historique)
            ListTile(
              leading: const Icon(RemixIcons.history_line),
              title: Text(h),
              onTap: () => _soumettre(h),
            ),
        ],
        TextButton(
          onPressed: () {
            FocusScope.of(context).unfocus();
            setState(() => _saisie = false);
          },
          child: const Text('Fermer'),
        ),
      ],
    );
  }

  Widget _resultatsListe() {
    if (_erreur != null && _resultats.isEmpty) {
      return EtatErreur(erreur: _erreur!, onReessayer: _relancer);
    }
    if (_resultats.isEmpty && _chargement) return const Chargement();
    if (_resultats.isEmpty) {
      return EtatVide(
        icone: RemixIcons.home_4_line,
        titre: 'Aucun logement trouvé',
        message: 'Élargissez vos critères ou créez une alerte pour être '
            'prévenu des nouvelles annonces.',
        action: 'Créer une alerte',
        onAction: _enregistrer,
      );
    }
    return RefreshIndicator(
      onRefresh: () async => _relancer(),
      child: ListView.separated(
        controller: _defilement,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        itemCount: _resultats.length + 1,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          if (i == _resultats.length) {
            return _chargement ? const Chargement() : const SizedBox(height: 8);
          }
          return LogementTuile(logement: _resultats[i]);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        title: const Text('Recherche'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        automaticallyImplyLeading: widget.autonome,
        actions: [
          IconButton(
            tooltip: 'Créer une alerte',
            onPressed: _enregistrer,
            icon: const Icon(RemixIcons.notification_badge_line),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            _barre(),
            if (_saisie)
              Expanded(child: _propositions())
            else ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 8, 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _chargement && _resultats.isEmpty
                            ? 'Recherche…'
                            : '$_total logement${_total > 1 ? 's' : ''}',
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ),
                    PopupMenuButton<String>(
                      initialValue: _tri,
                      onSelected: (tri) {
                        setState(() => _tri = tri);
                        _relancer();
                      },
                      itemBuilder: (_) => [
                        for (final e in _tris.entries)
                          PopupMenuItem(value: e.key, child: Text(e.value)),
                      ],
                      child: Padding(
                        padding: const EdgeInsets.all(8),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              RemixIcons.sort_desc,
                              size: 18,
                              color: Styles.violet,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _tris[_tri]!,
                              style: const TextStyle(color: Styles.violet),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(child: _resultatsListe()),
            ],
          ],
        ),
      ),
    );
  }
}

/// Feuille de filtres : renvoie les nouveaux critères (sans le texte libre).
class FiltresRecherche extends StatefulWidget {
  const FiltresRecherche({super.key, required this.criteres});

  final Map<String, dynamic> criteres;

  @override
  State<FiltresRecherche> createState() => _FiltresRechercheState();
}

class _FiltresRechercheState extends State<FiltresRecherche> {
  late final _ville = TextEditingController(text: _s('ville'));
  late final _quartier = TextEditingController(text: _s('quartier'));
  late final _prixMin = TextEditingController(text: _s('prix_min'));
  late final _prixMax = TextEditingController(text: _s('prix_max'));
  late final _superficie = TextEditingController(text: _s('superficie_min'));
  late Set<String> _types = _ensemble('type');
  late Set<String> _periodicites = _ensemble('periodicite');
  late Set<String> _equipements = _ensemble('equipements');
  late int _chambres = int.tryParse(_s('chambres_min')) ?? 0;
  late int _sdb = int.tryParse(_s('salles_de_bain_min')) ?? 0;
  late String? _meuble = widget.criteres['meuble'] as String?;
  late bool _verifie = widget.criteres['verifie'] == 'true';
  late bool _visite = widget.criteres['visite'] == 'true';
  DateTimeRange? _disponibilite;
  List<Equipement> _listeEquipements = const [];

  String _s(String cle) => '${widget.criteres[cle] ?? ''}';

  Set<String> _ensemble(String cle) =>
      _s(cle).split(',').where((e) => e.isNotEmpty).toSet();

  @override
  void initState() {
    super.initState();
    final du = DateTime.tryParse(_s('disponible_du'));
    final au = DateTime.tryParse(_s('disponible_au'));
    if (du != null && au != null) _disponibilite = DateTimeRange(start: du, end: au);
    ChezToiApi.instance.equipements().then((liste) {
      if (mounted) setState(() => _listeEquipements = liste);
    }).catchError((_) {});
  }

  @override
  void dispose() {
    for (final c in [_ville, _quartier, _prixMin, _prixMax, _superficie]) {
      c.dispose();
    }
    super.dispose();
  }

  String _jour(DateTime d) => d.toIso8601String().substring(0, 10);

  Map<String, dynamic> _resultat() {
    String? texte(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    return {
      'ville': ?texte(_ville),
      'quartier': ?texte(_quartier),
      'prix_min': ?texte(_prixMin),
      'prix_max': ?texte(_prixMax),
      'superficie_min': ?texte(_superficie),
      if (_types.isNotEmpty) 'type': _types.join(','),
      if (_periodicites.isNotEmpty) 'periodicite': _periodicites.join(','),
      if (_equipements.isNotEmpty) 'equipements': _equipements.join(','),
      if (_chambres > 0) 'chambres_min': '$_chambres',
      if (_sdb > 0) 'salles_de_bain_min': '$_sdb',
      'meuble': ?_meuble,
      if (_verifie) 'verifie': 'true',
      if (_visite) 'visite': 'true',
      if (_disponibilite != null) ...{
        'disponible_du': _jour(_disponibilite!.start),
        'disponible_au': _jour(_disponibilite!.end),
      },
    };
  }

  void _reinitialiser() {
    setState(() {
      for (final c in [_ville, _quartier, _prixMin, _prixMax, _superficie]) {
        c.clear();
      }
      _types = {};
      _periodicites = {};
      _equipements = {};
      _chambres = 0;
      _sdb = 0;
      _meuble = null;
      _verifie = false;
      _visite = false;
      _disponibilite = null;
    });
  }

  Widget _titre(String texte) => Padding(
        padding: const EdgeInsets.only(top: 18, bottom: 8),
        child: Text(
          texte,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
        ),
      );

  Widget _compteur(String libelle, int valeur, ValueChanged<int> surChange) {
    return Row(
      children: [
        Expanded(child: Text(libelle)),
        IconButton(
          onPressed: valeur > 0 ? () => surChange(valeur - 1) : null,
          icon: const Icon(RemixIcons.subtract_line),
        ),
        SizedBox(
          width: 36,
          child: Text(
            valeur == 0 ? 'Tous' : '$valeur+',
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        IconButton(
          onPressed: () => surChange(valeur + 1),
          icon: const Icon(RemixIcons.add_line),
        ),
      ],
    );
  }

  Widget _puces(
    Map<String, String> options,
    Set<String> selection,
    void Function(Set<String>) surChange,
  ) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final e in options.entries)
          FilterChip(
            label: Text(e.value),
            selected: selection.contains(e.key),
            selectedColor: Styles.violet.withValues(alpha: 0.15),
            checkmarkColor: Styles.violet,
            onSelected: (oui) => surChange(
              oui ? {...selection, e.key} : ({...selection}..remove(e.key)),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.9,
      maxChildSize: 0.95,
      builder: (context, defilement) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Filtres',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
                TextButton(
                  onPressed: _reinitialiser,
                  child: const Text('Tout effacer'),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              controller: defilement,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              children: [
                _titre('Localisation'),
                TextField(
                  controller: _ville,
                  decoration: decorationChamp('Ville', icone: RemixIcons.building_line),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _quartier,
                  decoration: decorationChamp(
                    'Quartier ou commune',
                    icone: RemixIcons.map_pin_line,
                  ),
                ),
                _titre('Type de logement'),
                _puces(Libelles.types, _types, (s) => setState(() => _types = s)),
                _titre('Budget (FCFA)'),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _prixMin,
                        keyboardType: TextInputType.number,
                        decoration: decorationChamp('Minimum'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _prixMax,
                        keyboardType: TextInputType.number,
                        decoration: decorationChamp('Maximum'),
                      ),
                    ),
                  ],
                ),
                _titre('Durée de location'),
                _puces(
                  const {
                    'nuit': 'À la nuit',
                    'semaine': 'À la semaine',
                    'mois': 'Au mois',
                    'annee': 'À l’année',
                  },
                  _periodicites,
                  (s) => setState(() => _periodicites = s),
                ),
                _titre('Pièces et surface'),
                _compteur('Chambres', _chambres, (v) => setState(() => _chambres = v)),
                _compteur('Salles de bain', _sdb, (v) => setState(() => _sdb = v)),
                const SizedBox(height: 6),
                TextField(
                  controller: _superficie,
                  keyboardType: TextInputType.number,
                  decoration: decorationChamp('Surface minimum', suffixe: 'm²'),
                ),
                _titre('Ameublement'),
                SegmentedButton<String?>(
                  segments: const [
                    ButtonSegment(value: null, label: Text('Indifférent')),
                    ButtonSegment(value: 'true', label: Text('Meublé')),
                    ButtonSegment(value: 'false', label: Text('Non meublé')),
                  ],
                  selected: {_meuble},
                  onSelectionChanged: (s) => setState(() => _meuble = s.first),
                ),
                _titre('Disponibilité'),
                OutlinedButton.icon(
                  onPressed: () async {
                    final choix = await showDateRangePicker(
                      context: context,
                      firstDate: DateUtils.dateOnly(DateTime.now()),
                      lastDate: DateTime.now().add(const Duration(days: 730)),
                      initialDateRange: _disponibilite,
                    );
                    if (choix != null) setState(() => _disponibilite = choix);
                  },
                  style: styleBoutonSecondaire(),
                  icon: const Icon(RemixIcons.calendar_2_line),
                  label: Text(
                    _disponibilite == null
                        ? 'Choisir des dates'
                        : 'Du ${formatDate(_disponibilite!.start)} au '
                            '${formatDate(_disponibilite!.end)}',
                  ),
                ),
                if (_listeEquipements.isNotEmpty) ...[
                  _titre('Équipements'),
                  _puces(
                    {for (final e in _listeEquipements) '${e.id}': e.nom},
                    _equipements,
                    (s) => setState(() => _equipements = s),
                  ),
                ],
                _titre('Confiance'),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  activeThumbColor: Styles.violet,
                  title: const Text('Annonces vérifiées uniquement'),
                  value: _verifie,
                  onChanged: (v) => setState(() => _verifie = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  activeThumbColor: Styles.violet,
                  title: const Text('Avec visite virtuelle 360°'),
                  value: _visite,
                  onChanged: (v) => setState(() => _visite = v),
                ),
              ],
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(context, _resultat()),
                  style: styleBoutonPrincipal(),
                  child: const Text('Afficher les résultats'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
