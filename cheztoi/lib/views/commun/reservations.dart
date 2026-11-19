import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/commun/chat.dart';
import 'package:cheztoi/views/commun/signalement.dart';
import 'package:cheztoi/views/locataire/reservation_form.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Carte d'une réservation, vue locataire ou propriétaire.
class CarteReservation extends StatelessWidget {
  const CarteReservation({
    super.key,
    required this.reservation,
    required this.onTap,
    this.vueProprietaire = false,
  });

  final Reservation reservation;
  final VoidCallback onTap;
  final bool vueProprietaire;

  @override
  Widget build(BuildContext context) {
    final r = reservation;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: ImageLogement(
                  url: r.logement.photo,
                  hauteur: 72,
                  largeur: 72,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.logement.titre,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      vueProprietaire
                          ? r.locataire.nomComplet
                          : r.logement.localisation,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Styles.violet,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${formatDate(r.dateDebut, annee: false)} → '
                      '${formatDate(r.dateFin)}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        StatutPastille(
                          statut: r.statut,
                          libelle: r.statutLibelle,
                        ),
                        const Spacer(),
                        Text(
                          formatPrix(r.montantTotal, r.logement.devise),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Réservations du locataire, regroupées par onglet.
class MesReservations extends StatefulWidget {
  const MesReservations({super.key});

  @override
  State<MesReservations> createState() => _MesReservationsState();
}

class _MesReservationsState extends State<MesReservations> {
  late Future<List<Reservation>> _futur = ChezToiApi.instance.mesReservations();

  void _recharger() =>
      setState(() => _futur = ChezToiApi.instance.mesReservations());

  static const _onglets = {
    'À venir': ['en_attente', 'acceptee', 'confirmee', 'en_cours'],
    'Passées': ['terminee', 'en_litige'],
    'Annulées': ['annulee', 'refusee'],
  };

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: _onglets.length,
      child: Scaffold(
        backgroundColor: Styles.fond,
        appBar: AppBar(
          title: const Text('Mes réservations'),
          bottom: TabBar(
            labelColor: Styles.violet,
            indicatorColor: Styles.violet,
            tabs: [for (final titre in _onglets.keys) Tab(text: titre)],
          ),
        ),
        body: FutureBuilder<List<Reservation>>(
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
            final toutes = snapshot.data!;
            return TabBarView(
              children: [
                for (final statuts in _onglets.values)
                  _liste(
                    toutes.where((r) => statuts.contains(r.statut)).toList(),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _liste(List<Reservation> reservations) {
    if (reservations.isEmpty) {
      return const EtatVide(
        icone: RemixIcons.calendar_check_line,
        titre: 'Rien par ici',
        message: 'Vos réservations apparaîtront ici.',
      );
    }
    return RefreshIndicator(
      onRefresh: () async => _recharger(),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: reservations.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, i) => CarteReservation(
          reservation: reservations[i],
          onTap: () async {
            await Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) =>
                    DetailReservation(reservationId: reservations[i].id),
              ),
            );
            _recharger();
          },
        ),
      ),
    );
  }
}

/// Détail d'une réservation (reçu) et actions selon le rôle.
class DetailReservation extends StatefulWidget {
  const DetailReservation({super.key, required this.reservationId});

  final int reservationId;

  @override
  State<DetailReservation> createState() => _DetailReservationState();
}

class _DetailReservationState extends State<DetailReservation> {
  late Future<Reservation> _futur = ChezToiApi.instance.reservation(
    widget.reservationId,
  );
  bool _action = false;

  void _recharger() => setState(
    () => _futur = ChezToiApi.instance.reservation(widget.reservationId),
  );

  Future<void> _executer(String action, {String motif = ''}) async {
    setState(() => _action = true);
    try {
      await ChezToiApi.instance.actionReservation(
        widget.reservationId,
        action,
        motif: motif,
      );
      if (!mounted) return;
      afficherMessage(context, switch (action) {
        'accepter' => 'Réservation acceptée.',
        'refuser' => 'Demande refusée.',
        _ => 'Réservation annulée.',
      });
      _recharger();
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    } finally {
      if (mounted) setState(() => _action = false);
    }
  }

  Future<void> _modifierDates(Reservation r) async {
    final choix = await showDateRangePicker(
      context: context,
      firstDate: DateUtils.dateOnly(DateTime.now()),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDateRange: DateTimeRange(start: r.dateDebut, end: r.dateFin),
      helpText: 'Nouvelles dates',
      saveText: 'Valider',
    );
    if (choix == null) return;
    setState(() => _action = true);
    try {
      await ChezToiApi.instance.modifierReservation(
        r.id,
        choix.start,
        choix.end,
      );
      if (!mounted) return;
      afficherMessage(context, 'Dates modifiées : le montant a été recalculé.');
      _recharger();
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    } finally {
      if (mounted) setState(() => _action = false);
    }
  }

  Future<void> _prolonger(Reservation r) async {
    // La fiche complète est nécessaire pour estimer le prix.
    try {
      final logement = await ChezToiApi.instance.logement(r.logement.id);
      if (!mounted) return;
      final duree = r.dateFin.difference(r.dateDebut);
      final ok = await Navigator.of(context).push<bool>(
        MaterialPageRoute<bool>(
          builder: (_) => ReservationForm(
            logement: logement,
            prolongation: true,
            periodeInitiale: DateTimeRange(
              start: r.dateFin,
              end: r.dateFin.add(
                duree.inDays > 0 ? duree : const Duration(days: 30),
              ),
            ),
          ),
        ),
      );
      if (ok == true) _recharger();
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    }
  }

  Future<void> _contacter(Reservation r, bool proprietaire) async {
    try {
      final conversation = proprietaire
          ? await ChezToiApi.instance.demarrerConversation(
              logementId: r.logement.id,
              destinataireId: r.locataire.id,
            )
          : await ChezToiApi.instance.demarrerConversation(
              logementId: r.logement.id,
            );
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ChatPage(conversation: conversation),
        ),
      );
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    }
  }

  Widget _ligne(String libelle, String valeur, {bool gras = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(libelle, style: TextStyle(color: Colors.grey.shade700)),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              valeur,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: gras ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: Text('Réservation #${widget.reservationId}')),
      body: FutureBuilder<Reservation>(
        future: _futur,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Chargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
          }
          final r = snapshot.data!;
          final proprietaire =
              r.logement.proprietaire?.id == Session.id ||
              r.proprietaire.id == Session.id;
          final devise = r.logement.devise;
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              LogementTuile(logement: r.logement, afficherFavori: false),
              const SizedBox(height: 16),
              Center(
                child: StatutPastille(
                  statut: r.statut,
                  libelle: r.statutLibelle,
                ),
              ),
              if (r.motif.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  r.motif,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade700),
                ),
              ],
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    _ligne(
                      proprietaire ? 'Locataire' : 'Propriétaire',
                      proprietaire
                          ? r.locataire.nomComplet
                          : r.proprietaire.nomComplet,
                    ),
                    if (r.telephoneContact.isNotEmpty)
                      _ligne('Téléphone', r.telephoneContact),
                    _ligne('Arrivée', formatDate(r.dateDebut)),
                    _ligne('Départ', formatDate(r.dateFin)),
                    _ligne(
                      'Durée',
                      '${r.nuits} jour(s) · ${r.periodes} '
                          '${r.logement.periodiciteLibelle}',
                    ),
                    _ligne('Personnes', '${r.nombrePersonnes}'),
                    const Divider(height: 24),
                    _ligne('Location', formatPrix(r.montantLocation, devise)),
                    if (r.caution > 0)
                      _ligne('Caution', formatPrix(r.caution, devise)),
                    if (r.avance > 0)
                      _ligne('Avance', formatPrix(r.avance, devise)),
                    if (r.frais > 0)
                      _ligne('Frais et charges', formatPrix(r.frais, devise)),
                    _ligne(
                      'Total',
                      formatPrix(r.montantTotal, devise),
                      gras: true,
                    ),
                    const Divider(height: 24),
                    _ligne('Demandée le', formatDate(r.creeLe)),
                  ],
                ),
              ),
              if (r.message.isNotEmpty) ...[
                const SizedBox(height: 16),
                const TitreSection('Message du locataire'),
                const SizedBox(height: 6),
                Text(r.message),
              ],
              const SizedBox(height: 24),
              if (proprietaire && r.statut == 'en_attente') ...[
                FilledButton.icon(
                  onPressed: _action ? null : () => _executer('accepter'),
                  style: styleBoutonPrincipal(),
                  icon: const Icon(RemixIcons.check_line),
                  label: const Text('Accepter la demande'),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: _action
                      ? null
                      : () async {
                          final motif = await demanderTexte(
                            context,
                            titre: 'Refuser la demande',
                            action: 'Refuser',
                          );
                          if (motif != null) _executer('refuser', motif: motif);
                        },
                  style: styleBoutonSecondaire(),
                  icon: const Icon(RemixIcons.close_line),
                  label: const Text('Refuser'),
                ),
                const SizedBox(height: 10),
              ],
              if (!proprietaire && r.statut == 'en_attente')
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: OutlinedButton.icon(
                    onPressed: _action ? null : () => _modifierDates(r),
                    style: styleBoutonSecondaire(),
                    icon: const Icon(RemixIcons.calendar_event_line),
                    label: const Text('Modifier les dates'),
                  ),
                ),
              if (!proprietaire &&
                  ['confirmee', 'en_cours'].contains(r.statut) &&
                  r.logement.statut == 'publiee')
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: OutlinedButton.icon(
                    onPressed: _action ? null : () => _prolonger(r),
                    style: styleBoutonSecondaire(),
                    icon: const Icon(RemixIcons.calendar_schedule_line),
                    label: const Text('Prolonger le séjour'),
                  ),
                ),
              if (r.peutEvaluer)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: FilledButton.icon(
                    onPressed: () async {
                      final ok = await Navigator.of(context).push<bool>(
                        MaterialPageRoute<bool>(
                          builder: (_) => FormulaireAvis(reservation: r),
                        ),
                      );
                      if (ok == true) _recharger();
                    },
                    style: styleBoutonPrincipal(),
                    icon: const Icon(RemixIcons.star_line),
                    label: const Text('Donner mon avis'),
                  ),
                ),
              OutlinedButton.icon(
                onPressed: () => _contacter(r, proprietaire),
                style: styleBoutonSecondaire(),
                icon: const Icon(RemixIcons.chat_3_line),
                label: Text(
                  proprietaire
                      ? 'Écrire au locataire'
                      : 'Écrire au propriétaire',
                ),
              ),
              if (r.peutAnnuler) ...[
                const SizedBox(height: 10),
                TextButton.icon(
                  onPressed: _action
                      ? null
                      : () async {
                          final motif = await demanderTexte(
                            context,
                            titre: 'Annuler la réservation',
                            action: 'Annuler la réservation',
                          );
                          if (motif != null) _executer('annuler', motif: motif);
                        },
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.red.shade700,
                  ),
                  icon: const Icon(RemixIcons.close_circle_line),
                  label: const Text('Annuler la réservation'),
                ),
              ],
              TextButton.icon(
                onPressed: () => signaler(context, reservationId: r.id),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.grey.shade700,
                ),
                icon: const Icon(RemixIcons.flag_line),
                label: const Text('Signaler un problème / ouvrir un litige'),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Évaluation d'un séjour terminé : cinq critères notés de 1 à 5.
class FormulaireAvis extends StatefulWidget {
  const FormulaireAvis({super.key, required this.reservation});

  final Reservation reservation;

  @override
  State<FormulaireAvis> createState() => _FormulaireAvisState();
}

class _FormulaireAvisState extends State<FormulaireAvis> {
  final _commentaire = TextEditingController();
  final Map<String, int> _notes = {
    'note_etat': 0,
    'note_conformite': 0,
    'note_proprete': 0,
    'note_communication': 0,
    'note_qualite_prix': 0,
  };
  static const _libelles = {
    'note_etat': 'État du logement',
    'note_conformite': 'Conformité à l’annonce',
    'note_proprete': 'Propreté',
    'note_communication': 'Communication',
    'note_qualite_prix': 'Rapport qualité-prix',
  };
  bool _envoi = false;

  @override
  void dispose() {
    _commentaire.dispose();
    super.dispose();
  }

  Future<void> _envoyer() async {
    if (_notes.values.any((n) => n == 0)) {
      afficherMessage(context, 'Notez chacun des critères.', erreur: true);
      return;
    }
    setState(() => _envoi = true);
    try {
      await ChezToiApi.instance.donnerAvis(widget.reservation.id, {
        ..._notes,
        'commentaire': _commentaire.text.trim(),
      });
      if (!mounted) return;
      afficherMessage(context, 'Merci pour votre avis !');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        setState(() => _envoi = false);
        afficherMessage(context, messageErreur(e), erreur: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(title: const Text('Votre avis')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            widget.reservation.logement.titre,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          for (final cle in _notes.keys)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(child: Text(_libelles[cle]!)),
                  for (var i = 1; i <= 5; i++)
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      onPressed: () => setState(() => _notes[cle] = i),
                      icon: Icon(
                        _notes[cle]! >= i
                            ? RemixIcons.star_fill
                            : RemixIcons.star_line,
                        color: Colors.amber.shade700,
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          TextField(
            controller: _commentaire,
            maxLines: 4,
            decoration: decorationChamp('Racontez votre séjour (facultatif)'),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _envoi ? null : _envoyer,
            style: styleBoutonPrincipal(),
            child: Text(_envoi ? 'Envoi…' : 'Publier mon avis'),
          ),
        ),
      ),
    );
  }
}
