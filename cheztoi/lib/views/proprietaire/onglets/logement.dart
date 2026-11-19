import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/proprietaire/gestion_logement.dart';
import 'package:cheztoi/views/proprietaire/logement_form.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Ouvre le formulaire puis la gestion de la nouvelle annonce (photos, envoi).
Future<void> nouvelleAnnonce(BuildContext context) async {
  final logement = await Navigator.of(context).push<Logement>(
    MaterialPageRoute<Logement>(builder: (_) => const LogementFormulaire()),
  );
  if (logement == null || !context.mounted) return;
  afficherMessage(context, 'Brouillon enregistré. Ajoutez vos photos puis soumettez-le.');
  await Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => GestionLogement(logementId: logement.id)),
  );
}

/// Liste des annonces du propriétaire, tous statuts confondus.
class MesLogements extends StatefulWidget {
  const MesLogements({super.key});

  @override
  State<MesLogements> createState() => _MesLogementsState();
}

class _MesLogementsState extends State<MesLogements> {
  late Future<List<Logement>> _futur = _charger();
  String? _filtre;

  Future<List<Logement>> _charger() => ChezToiApi.instance.mesLogements();

  Future<void> _recharger() async {
    final futur = _charger();
    setState(() => _futur = futur);
    await futur.catchError((_) => <Logement>[]);
  }

  Future<void> _ouvrir(int id) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => GestionLogement(logementId: id)),
    );
    _recharger();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        title: const Text('Mes logements'),
        automaticallyImplyLeading: false,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await nouvelleAnnonce(context);
          _recharger();
        },
        backgroundColor: Styles.violet,
        foregroundColor: Colors.white,
        icon: const Icon(RemixIcons.add_line),
        label: const Text('Publier'),
      ),
      body: FutureBuilder<List<Logement>>(
        future: _futur,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Chargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
          }
          final toutes = snapshot.data!;
          if (toutes.isEmpty) {
            return EtatVide(
              icone: RemixIcons.building_3_line,
              titre: 'Aucune annonce',
              message: 'Publiez votre premier logement en quelques minutes.',
              action: 'Publier un logement',
              onAction: () async {
                await nouvelleAnnonce(context);
                _recharger();
              },
            );
          }
          final statuts = toutes.map((a) => a.statut).toSet();
          final visibles = _filtre == null
              ? toutes
              : toutes.where((a) => a.statut == _filtre).toList();
          return Column(
            children: [
              SizedBox(
                height: 52,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  children: [
                    ChoiceChip(
                      label: Text('Toutes (${toutes.length})'),
                      selected: _filtre == null,
                      onSelected: (_) => setState(() => _filtre = null),
                    ),
                    for (final s in Libelles.statutsLogement.keys.where(statuts.contains))
                      Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: ChoiceChip(
                          label: Text(
                            '${Libelles.statutsLogement[s]} '
                            '(${toutes.where((a) => a.statut == s).length})',
                          ),
                          selected: _filtre == s,
                          onSelected: (_) => setState(() => _filtre = s),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _recharger,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                    itemCount: visibles.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (_, i) {
                      final l = visibles[i];
                      return LogementTuile(
                        logement: l,
                        afficherFavori: false,
                        onTap: () => _ouvrir(l.id),
                        trailing: Padding(
                          padding: const EdgeInsets.all(8),
                          child: Align(
                            alignment: Alignment.topRight,
                            child: StatutPastille(statut: l.statut, libelle: l.statutLibelle),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
