import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/locataire/comparaison.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Favoris du locataire, avec sélection pour la comparaison.
class Favoris extends StatefulWidget {
  const Favoris({super.key, this.modeComparaison = false});

  /// Ouvert depuis le raccourci « Comparer » de l'accueil.
  final bool modeComparaison;

  @override
  State<Favoris> createState() => _FavorisState();
}

class _FavorisState extends State<Favoris> {
  late Future<List<Logement>> _futur = ChezToiApi.instance.favoris();
  late bool _selectionActive = widget.modeComparaison;
  final Set<int> _selection = {};

  Future<void> _recharger() async {
    final futur = ChezToiApi.instance.favoris();
    setState(() => _futur = futur);
    await futur.catchError((_) => <Logement>[]);
  }

  void _basculer(int id) {
    setState(() {
      if (_selection.contains(id)) {
        _selection.remove(id);
      } else if (_selection.length < 4) {
        _selection.add(id);
      } else {
        afficherMessage(context, 'Vous pouvez comparer 4 logements au maximum.');
      }
    });
  }

  void _comparer() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Comparaison(ids: _selection.toList()),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        title: Text(_selectionActive ? 'Choisir 2 à 4 logements' : 'Mes favoris'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        automaticallyImplyLeading: widget.modeComparaison,
        actions: [
          TextButton.icon(
            onPressed: () => setState(() {
              _selectionActive = !_selectionActive;
              _selection.clear();
            }),
            icon: Icon(
              _selectionActive
                  ? RemixIcons.close_line
                  : RemixIcons.arrow_left_right_line,
            ),
            label: Text(_selectionActive ? 'Annuler' : 'Comparer'),
          ),
        ],
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
          final favoris = snapshot.data!;
          if (favoris.isEmpty) {
            return const EtatVide(
              icone: RemixIcons.heart_3_line,
              titre: 'Aucun favori',
              message: 'Touchez le cœur d’une annonce pour la retrouver ici.',
            );
          }
          return RefreshIndicator(
            onRefresh: _recharger,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: favoris.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (_, i) {
                final l = favoris[i];
                return LogementTuile(
                  logement: l,
                  afficherFavori: !_selectionActive,
                  onFavori: (favori) {
                    if (!favori) _recharger();
                  },
                  onTap: _selectionActive ? () => _basculer(l.id) : null,
                  trailing: _selectionActive
                      ? Checkbox(
                          value: _selection.contains(l.id),
                          activeColor: Styles.violet,
                          onChanged: (_) => _basculer(l.id),
                        )
                      : null,
                );
              },
            ),
          );
        },
      ),
      bottomNavigationBar: _selectionActive
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton.icon(
                  onPressed: _selection.length >= 2 ? _comparer : null,
                  style: styleBoutonPrincipal(),
                  icon: const Icon(RemixIcons.arrow_left_right_line),
                  label: Text('Comparer (${_selection.length})'),
                ),
              ),
            )
          : null,
    );
  }
}
