import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/commun/reservations.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Demandes de réservation reçues par le propriétaire.
class Demande extends StatefulWidget {
  const Demande({super.key});

  @override
  State<Demande> createState() => _DemandeState();
}

class _DemandeState extends State<Demande> {
  late Future<List<Reservation>> _futur = ChezToiApi.instance.reservationsRecues();

  static const _onglets = {
    'En attente': ['en_attente'],
    'À venir': ['acceptee', 'confirmee', 'en_cours'],
    'Historique': ['terminee', 'refusee', 'annulee', 'en_litige'],
  };

  void _recharger() =>
      setState(() => _futur = ChezToiApi.instance.reservationsRecues());

  Future<void> _repondre(Reservation r, bool accepter) async {
    String motif = '';
    if (!accepter) {
      final saisi = await demanderTexte(
        context,
        titre: 'Refuser la demande de ${r.locataire.nomComplet}',
        action: 'Refuser',
      );
      if (saisi == null) return;
      motif = saisi;
    }
    try {
      await ChezToiApi.instance.actionReservation(
        r.id,
        accepter ? 'accepter' : 'refuser',
        motif: motif,
      );
      if (!mounted) return;
      afficherMessage(context, accepter ? 'Réservation acceptée.' : 'Demande refusée.');
      _recharger();
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    }
  }

  Widget _liste(List<Reservation> reservations, bool enAttente) {
    if (reservations.isEmpty) {
      return EtatVide(
        icone: RemixIcons.calendar_todo_line,
        titre: enAttente ? 'Aucune demande en attente' : 'Rien par ici',
        message: 'Les demandes des locataires apparaîtront ici.',
      );
    }
    return RefreshIndicator(
      onRefresh: () async => _recharger(),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: reservations.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          final r = reservations[i];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CarteReservation(
                reservation: r,
                vueProprietaire: true,
                onTap: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => DetailReservation(reservationId: r.id),
                    ),
                  );
                  _recharger();
                },
              ),
              if (enAttente)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _repondre(r, false),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red.shade700,
                          ),
                          child: const Text('Refuser'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => _repondre(r, true),
                          style: FilledButton.styleFrom(backgroundColor: Styles.violet),
                          child: const Text('Accepter'),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: _onglets.length,
      child: Scaffold(
        backgroundColor: Styles.fond,
        appBar: AppBar(
          title: const Text('Demandes'),
          automaticallyImplyLeading: false,
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          bottom: TabBar(
            labelColor: Styles.violet,
            indicatorColor: Styles.violet,
            tabs: [for (final t in _onglets.keys) Tab(text: t)],
          ),
        ),
        body: FutureBuilder<List<Reservation>>(
          future: _futur,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Chargement();
            }
            if (snapshot.hasError) {
              return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
            }
            final toutes = snapshot.data!;
            return TabBarView(
              children: [
                for (final e in _onglets.entries)
                  _liste(
                    toutes.where((r) => e.value.contains(r.statut)).toList(),
                    e.key == 'En attente',
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
