import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/commun/carte_widgets.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:flutter/services.dart';
import 'package:latlong2/latlong.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Formulaire de publication / modification (section 4.3 A à D).
/// Renvoie le [Logement] enregistré.
class LogementFormulaire extends StatefulWidget {
  const LogementFormulaire({super.key, this.logement});

  /// Null pour une nouvelle annonce.
  final Logement? logement;

  @override
  State<LogementFormulaire> createState() => _LogementFormulaireState();
}

class _LogementFormulaireState extends State<LogementFormulaire> {
  final _formulaire = GlobalKey<FormState>();
  late final Logement? _l = widget.logement;

  late final _titre = TextEditingController(text: _l?.titre);
  late final _description = TextEditingController(text: _l?.description);
  late final _superficie = _nombre(_l?.superficie);
  late final _etagesBatiment = _nombre(_l?.etagesBatiment);
  late final _etage = _nombre(_l?.etage);
  late final _capacite = _nombre(_l?.capacite);
  late final _prix = _nombre(_l?.prix);
  late final _caution = _nombre(_l?.caution);
  late final _avance = _nombre(_l?.avance);
  late final _frais = _nombre(_l?.fraisSupplementaires);
  late final _charges = _nombre(_l?.charges);
  late final _conditionsPaiement = TextEditingController(
    text: _l?.conditionsPaiement,
  );
  late final _conditionsAnnulation = TextEditingController(
    text: _l?.conditionsAnnulation,
  );
  late final _region = TextEditingController(text: _l?.region);
  late final _ville = TextEditingController(text: _l?.ville);
  late final _commune = TextEditingController(text: _l?.commune);
  late final _quartier = TextEditingController(text: _l?.quartier);
  late final _adresse = TextEditingController(text: _l?.adresse);

  late String _type = _l?.typeLogement ?? 'appartement';
  late String _periodicite = _l?.periodicite ?? 'mois';
  late bool _meuble = _l?.meuble ?? false;
  late bool _instantanee = _l?.reservationInstantanee ?? false;
  late int _chambres = _l?.chambres ?? 1;
  late int _salons = _l?.salons ?? 1;
  late int _sdb = _l?.sallesDeBain ?? 1;
  late int _toilettes = _l?.toilettes ?? 1;
  late final Set<int> _equipements = {
    for (final e in _l?.equipements ?? const <Equipement>[]) e.id,
  };
  late LatLng? _position = _l != null && _l.aPosition
      ? LatLng(_l.latitude!, _l.longitude!)
      : null;

  List<Equipement> _listeEquipements = const [];
  bool _envoi = false;

  TextEditingController _nombre(int? valeur) => TextEditingController(
    text: valeur == null || valeur == 0 ? '' : '$valeur',
  );

  @override
  void initState() {
    super.initState();
    ChezToiApi.instance
        .equipements()
        .then((liste) {
          if (mounted) setState(() => _listeEquipements = liste);
        })
        .catchError((_) {});
  }

  @override
  void dispose() {
    for (final c in [
      _titre,
      _description,
      _superficie,
      _etagesBatiment,
      _etage,
      _capacite,
      _prix,
      _caution,
      _avance,
      _frais,
      _charges,
      _conditionsPaiement,
      _conditionsAnnulation,
      _region,
      _ville,
      _commune,
      _quartier,
      _adresse,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  int? _entier(TextEditingController c) => int.tryParse(c.text.trim());

  Future<void> _enregistrer() async {
    if (!_formulaire.currentState!.validate()) {
      afficherMessage(
        context,
        'Vérifiez les champs signalés en rouge.',
        erreur: true,
      );
      return;
    }
    setState(() => _envoi = true);
    final donnees = <String, dynamic>{
      'titre': _titre.text.trim(),
      'description': _description.text.trim(),
      'type_logement': _type,
      'meuble': _meuble,
      'chambres': _chambres,
      'salons': _salons,
      'salles_de_bain': _sdb,
      'toilettes': _toilettes,
      'superficie': _entier(_superficie),
      'etages_batiment': _entier(_etagesBatiment),
      'etage': _entier(_etage),
      'capacite': _entier(_capacite),
      'equipement_ids': _equipements.toList(),
      'prix': _entier(_prix),
      'periodicite': _periodicite,
      'caution': _entier(_caution) ?? 0,
      'avance': _entier(_avance) ?? 0,
      'frais_supplementaires': _entier(_frais) ?? 0,
      'charges': _entier(_charges) ?? 0,
      'conditions_paiement': _conditionsPaiement.text.trim(),
      'conditions_annulation': _conditionsAnnulation.text.trim(),
      'reservation_instantanee': _instantanee,
      'region': _region.text.trim(),
      'ville': _ville.text.trim(),
      'commune': _commune.text.trim(),
      'quartier': _quartier.text.trim(),
      'adresse': _adresse.text.trim(),
      'latitude': _position?.latitude,
      'longitude': _position?.longitude,
    };
    try {
      final logement = await ChezToiApi.instance.enregistrerLogement(
        donnees,
        id: _l?.id,
      );
      if (!mounted) return;
      Navigator.pop(context, logement);
    } catch (e) {
      if (mounted) {
        setState(() => _envoi = false);
        afficherMessage(context, messageErreur(e), erreur: true);
      }
    }
  }

  Future<void> _choisirPosition() async {
    final point = await Navigator.of(context).push<LatLng>(
      MaterialPageRoute<LatLng>(
        builder: (_) => SelecteurPosition(initiale: _position),
      ),
    );
    if (point != null) setState(() => _position = point);
  }

  Widget _section(String titre, IconData icone, List<Widget> enfants) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icone, color: Styles.violet),
              const SizedBox(width: 8),
              Text(
                titre,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          for (final e in enfants) ...[e, const SizedBox(height: 12)],
        ],
      ),
    );
  }

  Widget _champNombre(
    TextEditingController c,
    String label, {
    bool obligatoire = false,
    String? suffixe,
  }) {
    return TextFormField(
      controller: c,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: decorationChamp(
        obligatoire ? '$label *' : label,
        suffixe: suffixe,
      ),
      validator: obligatoire
          ? (v) => (int.tryParse(v ?? '') ?? 0) <= 0 ? 'Obligatoire' : null
          : null,
    );
  }

  Widget _compteur(String libelle, int valeur, ValueChanged<int> surChange) {
    return Row(
      children: [
        Expanded(child: Text(libelle)),
        IconButton.outlined(
          visualDensity: VisualDensity.compact,
          onPressed: valeur > 0 ? () => surChange(valeur - 1) : null,
          icon: const Icon(RemixIcons.subtract_line, size: 18),
        ),
        SizedBox(
          width: 36,
          child: Text(
            '$valeur',
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ),
        IconButton.outlined(
          visualDensity: VisualDensity.compact,
          onPressed: () => surChange(valeur + 1),
          icon: const Icon(RemixIcons.add_line, size: 18),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    String? requis(String? v) =>
        (v ?? '').trim().isEmpty ? 'Obligatoire' : null;
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        title: Text(_l == null ? 'Nouvelle annonce' : 'Modifier l’annonce'),
      ),
      body: Form(
        key: _formulaire,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _section('Informations générales', RemixIcons.information_line, [
              TextFormField(
                controller: _titre,
                maxLength: 150,
                decoration: decorationChamp('Titre de l’annonce *'),
                validator: requis,
              ),
              TextFormField(
                controller: _description,
                maxLines: 5,
                decoration: decorationChamp(
                  'Description détaillée',
                  aide: 'Atouts, environnement, transports, règles…',
                ),
              ),
              const Text(
                'Type de logement',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final t in Libelles.types.entries)
                    ChoiceChip(
                      label: Text(t.value),
                      selected: _type == t.key,
                      selectedColor: Styles.violet.withValues(alpha: 0.15),
                      onSelected: (_) => setState(() => _type = t.key),
                    ),
                ],
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: Styles.violet,
                title: const Text('Logement meublé'),
                value: _meuble,
                onChanged: (v) => setState(() => _meuble = v),
              ),
              _compteur(
                'Chambres',
                _chambres,
                (v) => setState(() => _chambres = v),
              ),
              _compteur('Salons', _salons, (v) => setState(() => _salons = v)),
              _compteur(
                'Salles de bain',
                _sdb,
                (v) => setState(() => _sdb = v),
              ),
              _compteur(
                'Toilettes',
                _toilettes,
                (v) => setState(() => _toilettes = v),
              ),
              Row(
                children: [
                  Expanded(
                    child: _champNombre(
                      _superficie,
                      'Superficie',
                      suffixe: 'm²',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _champNombre(
                      _capacite,
                      'Capacité',
                      suffixe: 'pers.',
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: _champNombre(_etagesBatiment, 'Étages du bâtiment'),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: _champNombre(_etage, 'Étage du logement')),
                ],
              ),
            ]),
            _section('Équipements', RemixIcons.tools_line, [
              if (_listeEquipements.isEmpty)
                const Text('Chargement des équipements…')
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final e in _listeEquipements)
                      FilterChip(
                        label: Text(e.nom),
                        selected: _equipements.contains(e.id),
                        selectedColor: Styles.violet.withValues(alpha: 0.15),
                        checkmarkColor: Styles.violet,
                        onSelected: (oui) => setState(() {
                          oui
                              ? _equipements.add(e.id)
                              : _equipements.remove(e.id);
                        }),
                      ),
                  ],
                ),
            ]),
            _section(
              'Tarifs et conditions',
              RemixIcons.money_dollar_circle_line,
              [
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: _champNombre(
                        _prix,
                        'Prix',
                        obligatoire: true,
                        suffixe: 'FCFA',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: DropdownButtonFormField<String>(
                        initialValue: _periodicite,
                        decoration: decorationChamp('Par'),
                        items: const [
                          DropdownMenuItem(value: 'nuit', child: Text('Nuit')),
                          DropdownMenuItem(
                            value: 'semaine',
                            child: Text('Semaine'),
                          ),
                          DropdownMenuItem(value: 'mois', child: Text('Mois')),
                          DropdownMenuItem(
                            value: 'annee',
                            child: Text('Année'),
                          ),
                        ],
                        onChanged: (v) =>
                            setState(() => _periodicite = v ?? 'mois'),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: _champNombre(_caution, 'Caution', suffixe: 'FCFA'),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _champNombre(_avance, 'Avance', suffixe: 'FCFA'),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: _champNombre(_frais, 'Frais', suffixe: 'FCFA'),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _champNombre(_charges, 'Charges', suffixe: 'FCFA'),
                    ),
                  ],
                ),
                TextFormField(
                  controller: _conditionsPaiement,
                  maxLines: 2,
                  decoration: decorationChamp('Conditions de paiement'),
                ),
                TextFormField(
                  controller: _conditionsAnnulation,
                  maxLines: 2,
                  decoration: decorationChamp('Conditions d’annulation'),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  activeThumbColor: Styles.violet,
                  title: const Text('Réservation instantanée'),
                  subtitle: const Text(
                    'Les réservations sont confirmées sans votre validation.',
                  ),
                  value: _instantanee,
                  onChanged: (v) => setState(() => _instantanee = v),
                ),
              ],
            ),
            _section('Localisation', RemixIcons.map_pin_line, [
              TextFormField(
                controller: _ville,
                decoration: decorationChamp('Ville *'),
                validator: requis,
              ),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _quartier,
                      decoration: decorationChamp('Quartier'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _commune,
                      decoration: decorationChamp('Commune'),
                    ),
                  ),
                ],
              ),
              TextFormField(
                controller: _region,
                decoration: decorationChamp('Région'),
              ),
              TextFormField(
                controller: _adresse,
                decoration: decorationChamp(
                  'Adresse exacte',
                  aide: 'Visible uniquement par les locataires dont la réservation est acceptée.',
                ),
              ),
              OutlinedButton.icon(
                onPressed: _choisirPosition,
                style: styleBoutonSecondaire(),
                icon: Icon(
                  _position == null
                      ? RemixIcons.map_pin_add_line
                      : RemixIcons.map_pin_2_fill,
                ),
                label: Text(
                  _position == null
                      ? 'Placer le logement sur la carte'
                      : 'Position enregistrée · modifier',
                ),
              ),
              if (_position != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    height: 150,
                    child: CartePosition(
                      key: ValueKey(_position),
                      latitude: _position!.latitude,
                      longitude: _position!.longitude,
                      approximative: false,
                    ),
                  ),
                ),
            ]),
            const SizedBox(height: 60),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _envoi ? null : _enregistrer,
            style: styleBoutonPrincipal(),
            child: Text(
              _envoi
                  ? 'Enregistrement…'
                  : (_l == null ? 'Enregistrer le brouillon' : 'Enregistrer'),
            ),
          ),
        ),
      ),
    );
  }
}
