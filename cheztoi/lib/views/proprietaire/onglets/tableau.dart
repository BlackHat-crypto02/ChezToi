import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/commun/notifications.dart';
import 'package:cheztoi/views/commun/profil.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Tableau de bord du propriétaire : chiffres clés et raccourcis.
class Tableau extends StatefulWidget {
  const Tableau({super.key, this.onOngletChange, this.onNouvelleAnnonce});

  final ValueChanged<int>? onOngletChange;
  final VoidCallback? onNouvelleAnnonce;

  @override
  State<Tableau> createState() => _TableauState();
}

class _TableauState extends State<Tableau> {
  late Future<StatistiquesProprietaire> _futur = ChezToiApi.instance
      .statistiques();

  Future<void> _recharger() async {
    final futur = ChezToiApi.instance.statistiques();
    setState(() => _futur = futur);
    await futur.catchError((_) => const StatistiquesProprietaire());
  }

  Widget _tuile(
    String libelle,
    String valeur,
    IconData icone, {
    VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Styles.primaire.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icone, color: Styles.primaire, size: 20),
              ),
              const SizedBox(height: 12),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  valeur,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Styles.primaire,
                  ),
                ),
              ),
              Text(
                libelle,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final prenom = Session.utilisateur.value?.prenom ?? '';
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: RichText(
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
                style: TextStyle(color: Styles.primaire),
              ),
              TextSpan(
                text: '  Pro',
                style: TextStyle(fontSize: 14, color: Colors.grey),
              ),
            ],
          ),
        ),
        actions: [
          ClocheNotifications(
            onOuvrirMessages: () => widget.onOngletChange?.call(3),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _recharger,
        child: FutureBuilder<StatistiquesProprietaire>(
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
            final s = snapshot.data!;
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  prenom.isEmpty ? 'Bonjour 👋' : 'Bonjour $prenom 👋',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Styles.texte,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Voici l’activité de vos logements.',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
                const SizedBox(height: 20),
                if (s.demandesEnAttente > 0)
                  Card(
                    color: Styles.primaire,
                    child: ListTile(
                      onTap: () => widget.onOngletChange?.call(2),
                      leading: const Icon(
                        RemixIcons.calendar_todo_line,
                        color: Colors.white,
                      ),
                      title: Text(
                        '${s.demandesEnAttente} demande(s) en attente',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      subtitle: const Text(
                        'Répondez vite : les locataires attendent votre réponse.',
                        style: TextStyle(color: Colors.white70),
                      ),
                      trailing: const Icon(
                        RemixIcons.arrow_right_s_line,
                        color: Colors.white,
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.35,
                  children: [
                    _tuile(
                      'Logements',
                      '${s.logementsTotal}',
                      RemixIcons.building_3_line,
                      onTap: () => widget.onOngletChange?.call(1),
                    ),
                    _tuile(
                      'Annonces en ligne',
                      '${s.parStatut['publiee'] ?? 0}',
                      RemixIcons.global_line,
                      onTap: () => widget.onOngletChange?.call(1),
                    ),
                    _tuile('Vues', '${s.vues}', RemixIcons.eye_line),
                    _tuile(
                      'Mis en favori',
                      '${s.favoris}',
                      RemixIcons.heart_3_line,
                    ),
                    _tuile(
                      'Réservations',
                      '${s.reservations}',
                      RemixIcons.calendar_check_line,
                      onTap: () => widget.onOngletChange?.call(2),
                    ),
                    _tuile(
                      'Revenus confirmés',
                      formatPrix(s.revenus),
                      RemixIcons.money_dollar_circle_line,
                    ),
                    _tuile(
                      'Note moyenne',
                      s.noteMoyenne == null ? '—' : '${s.noteMoyenne}/5',
                      RemixIcons.star_line,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const AvisRecus(),
                        ),
                      ),
                    ),
                    _tuile(
                      'Avis reçus',
                      '${s.nombreAvis}',
                      RemixIcons.chat_quote_line,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const AvisRecus(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: widget.onNouvelleAnnonce,
                  style: styleBoutonPrincipal(),
                  icon: const Icon(RemixIcons.add_circle_line),
                  label: const Text('Publier un nouveau logement'),
                ),
                if (s.top.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  const TitreSection('Vos annonces les plus vues'),
                  const SizedBox(height: 10),
                  for (final t in s.top)
                    Card(
                      color: Colors.white,
                      child: ListTile(
                        title: Text(
                          '${t['titre']}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          Libelles.statutsLogement['${t['statut']}'] ?? '',
                        ),
                        trailing: Text(
                          '${t['nombre_vues']} vues · ${t['nb_favoris']} ♥',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}
