import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/locataire/ongles/recherche.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Recherches enregistrées : notification à chaque nouvelle annonce correspondante.
class Alertes extends StatefulWidget {
  const Alertes({super.key});

  @override
  State<Alertes> createState() => _AlertesState();
}

class _AlertesState extends State<Alertes> {
  late Future<List<RechercheEnregistree>> _futur =
      ChezToiApi.instance.recherches();

  void _recharger() =>
      setState(() => _futur = ChezToiApi.instance.recherches());

  String _resume(Map<String, dynamic> c) {
    final morceaux = <String>[
      if (c['q'] != null) '« ${c['q']} »',
      if (c['ville'] != null) '${c['ville']}',
      if (c['type'] != null)
        '${c['type']}'
            .split(',')
            .map((t) => Libelles.types[t] ?? t)
            .join(', '),
      if (c['prix_max'] != null) '≤ ${formatPrix(int.tryParse('${c['prix_max']}') ?? 0)}',
      if (c['chambres_min'] != null) '${c['chambres_min']}+ ch.',
    ];
    return morceaux.isEmpty ? 'Toutes les annonces' : morceaux.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Mes alertes')),
      body: FutureBuilder<List<RechercheEnregistree>>(
        future: _futur,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Chargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
          }
          final recherches = snapshot.data!;
          if (recherches.isEmpty) {
            return const EtatVide(
              icone: RemixIcons.notification_badge_line,
              titre: 'Aucune alerte',
              message: 'Depuis l’onglet Recherche, touchez la cloche pour être '
                  'prévenu des nouvelles annonces qui vous correspondent.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: recherches.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, i) {
              final r = recherches[i];
              return Card(
                color: Colors.white,
                margin: EdgeInsets.zero,
                child: ListTile(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => Recherche(
                        criteresInitiaux: r.criteres,
                        autonome: true,
                      ),
                    ),
                  ),
                  title: Text(
                    r.nom,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(_resume(r.criteres)),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Switch(
                        value: r.alerteActive,
                        activeThumbColor: Styles.violet,
                        onChanged: (v) async {
                          try {
                            await ChezToiApi.instance.activerAlerte(r.id, v);
                            _recharger();
                          } catch (e) {
                            if (context.mounted) {
                              afficherMessage(context, messageErreur(e), erreur: true);
                            }
                          }
                        },
                      ),
                      IconButton(
                        tooltip: 'Supprimer',
                        icon: const Icon(RemixIcons.delete_bin_line),
                        onPressed: () async {
                          try {
                            await ChezToiApi.instance.supprimerRecherche(r.id);
                            _recharger();
                          } catch (e) {
                            if (context.mounted) {
                              afficherMessage(context, messageErreur(e), erreur: true);
                            }
                          }
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
