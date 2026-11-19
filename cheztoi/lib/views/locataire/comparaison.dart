import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Tableau comparatif de 2 à 4 logements (section 4.8).
class Comparaison extends StatelessWidget {
  const Comparaison({super.key, required this.ids});

  final List<int> ids;

  static const double _largeur = 170;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Comparaison')),
      body: Chargeur<List<Logement>>(
        charger: () => ChezToiApi.instance.comparer(ids),
        builder: (context, logements, _) {
          if (logements.length < 2) {
            return const EtatVide(
              icone: RemixIcons.arrow_left_right_line,
              titre: 'Comparaison impossible',
              message: 'Certains logements ne sont plus disponibles.',
            );
          }
          // Les équipements présents dans au moins un logement.
          final equipements = <String>{
            for (final l in logements) ...l.equipements.map((e) => e.nom),
          }.toList()..sort();

          final lignes = <(String, String Function(Logement))>[
            (
              'Prix',
              (l) =>
                  '${formatPrix(l.prix, l.devise)} / ${l.periodiciteLibelle}',
            ),
            ('Type', (l) => l.typeLibelle),
            ('Localisation', (l) => l.localisation),
            (
              'Superficie',
              (l) => l.superficie == null ? '—' : '${l.superficie} m²',
            ),
            ('Chambres', (l) => '${l.chambres}'),
            ('Salles de bain', (l) => '${l.sallesDeBain}'),
            ('Meublé', (l) => l.meuble ? 'Oui' : 'Non'),
            (
              'Caution',
              (l) => l.caution > 0 ? formatPrix(l.caution, l.devise) : '—',
            ),
            (
              'Avance',
              (l) => l.avance > 0 ? formatPrix(l.avance, l.devise) : '—',
            ),
            (
              'Réservation',
              (l) => l.reservationInstantanee ? 'Instantanée' : 'Sur demande',
            ),
            (
              'Note',
              (l) => l.noteMoyenne == null
                  ? '—'
                  : '${l.noteMoyenne}/5 (${l.nombreAvis})',
            ),
            ('Vérifiée', (l) => l.verifie ? 'Oui' : 'Non'),
            ('Visite 360°', (l) => l.aVisiteVirtuelle ? 'Oui' : 'Non'),
            for (final nom in equipements)
              (nom, (l) => l.equipements.any((e) => e.nom == nom) ? '✓' : '—'),
          ];

          Widget cellule(Widget enfant, {bool entete = false}) => Container(
            width: _largeur,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
              color: entete ? Colors.white : null,
            ),
            child: enfant,
          );

          return SingleChildScrollView(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Colonne des libellés.
                  Column(
                    children: [
                      const SizedBox(height: 170),
                      for (final (libelle, _) in lignes)
                        Container(
                          width: 120,
                          height: 44,
                          alignment: Alignment.centerLeft,
                          child: Text(
                            libelle,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                    ],
                  ),
                  for (final l in logements)
                    Column(
                      children: [
                        SizedBox(
                          height: 170,
                          child: cellule(
                            InkWell(
                              onTap: () => ouvrirLogement(context, l.id),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: ImageLogement(
                                      url: l.photo,
                                      hauteur: 90,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    l.titre,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            entete: true,
                          ),
                        ),
                        for (final (_, valeur) in lignes)
                          SizedBox(
                            height: 44,
                            child: cellule(
                              Text(
                                valeur(l),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ),
                      ],
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
