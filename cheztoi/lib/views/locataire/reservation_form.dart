import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Choix de la période, estimation du montant et envoi de la demande.
/// Renvoie `true` à l'écran précédent quand la réservation est créée.
class ReservationForm extends StatefulWidget {
  const ReservationForm({
    super.key,
    required this.logement,
    this.periodeInitiale,
    this.prolongation = false,
  });

  final Logement logement;

  /// Période proposée à l'ouverture (prolongation d'un séjour).
  final DateTimeRange? periodeInitiale;
  final bool prolongation;

  @override
  State<ReservationForm> createState() => _ReservationFormState();
}

class _ReservationFormState extends State<ReservationForm> {
  final _message = TextEditingController();
  late DateTimeRange? _periode = widget.periodeInitiale;
  int _personnes = 1;
  Estimation? _estimation;
  String? _erreurEstimation;
  bool _calcul = false;
  bool _envoi = false;
  List<(DateTime, DateTime)> _occupees = const [];

  Logement get l => widget.logement;

  @override
  void initState() {
    super.initState();
    ChezToiApi.instance
        .indisponibilites(l.id)
        .then((periodes) {
          if (mounted) setState(() => _occupees = periodes);
        })
        .catchError((_) {});
    if (widget.prolongation) {
      _message.text = 'Demande de prolongation de mon séjour.';
    }
    if (_periode != null) _estimer();
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  /// Durée proposée par défaut selon la périodicité du prix.
  Duration get _dureeParDefaut => switch (l.periodicite) {
    'nuit' => const Duration(days: 2),
    'semaine' => const Duration(days: 7),
    'annee' => const Duration(days: 365),
    _ => const Duration(days: 30),
  };

  Future<void> _choisirPeriode() async {
    final demain = DateUtils.dateOnly(DateTime.now())
        .add(const Duration(days: 1));
    final choix = await showDateRangePicker(
      context: context,
      firstDate: DateUtils.dateOnly(DateTime.now()),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDateRange:
          _periode ??
          DateTimeRange(start: demain, end: demain.add(_dureeParDefaut)),
      helpText: 'Dates d’arrivée et de départ',
      saveText: 'Valider',
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: Theme.of(context).colorScheme
              .copyWith(primary: Styles.primaire),
        ),
        child: child!,
      ),
    );
    if (choix == null) return;
    setState(() => _periode = choix);
    _estimer();
  }

  Future<void> _estimer() async {
    final periode = _periode;
    if (periode == null) return;
    setState(() {
      _calcul = true;
      _erreurEstimation = null;
    });
    try {
      final estimation = await ChezToiApi.instance.estimer(
        l.id,
        periode.start,
        periode.end,
      );
      if (mounted) setState(() => _estimation = estimation);
    } catch (e) {
      if (mounted) {
        setState(() {
          _estimation = null;
          _erreurEstimation = messageErreur(e);
        });
      }
    } finally {
      if (mounted) setState(() => _calcul = false);
    }
  }

  Future<void> _envoyer() async {
    final periode = _periode;
    if (periode == null) return;
    setState(() => _envoi = true);
    try {
      final reservation = await ChezToiApi.instance.reserver(
        l.id,
        periode.start,
        periode.end,
        personnes: _personnes,
        message: _message.text.trim(),
      );
      if (!mounted) return;
      final confirmee = reservation.statut == 'confirmee';
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: Icon(
            confirmee ? RemixIcons.checkbox_circle_fill : RemixIcons.time_line,
            color: confirmee ? Colors.green : Styles.primaire,
            size: 48,
          ),
          title: Text(
            confirmee ? 'Réservation confirmée !' : 'Demande envoyée',
          ),
          content: Text(
            confirmee
                ? 'Votre séjour est réservé. Retrouvez-le dans « Mes réservations ».'
                : 'Le propriétaire va étudier votre demande. Vous serez notifié '
                      'dès qu’il aura répondu.',
          ),
          actions: [
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Styles.primaire),
              onPressed: () => Navigator.pop(context),
              child: const Text('Compris'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  Widget _ligne(String libelle, int montant, {bool gras = false}) {
    final style = TextStyle(
      fontWeight: gras ? FontWeight.bold : FontWeight.normal,
      fontSize: gras ? 16 : 14,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(child: Text(libelle, style: style)),
          Text(formatPrix(montant, l.devise), style: style),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final e = _estimation;
    final periode = _periode;
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        title: Text(
          widget.prolongation
              ? 'Prolonger le séjour'
              : (l.reservationInstantanee
                    ? 'Réserver'
                    : 'Demande de réservation'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          LogementTuile(logement: l, onTap: () {}, afficherFavori: false),
          const SizedBox(height: 24),
          const TitreSection('Votre séjour'),
          const SizedBox(height: 10),
          InkWell(
            onTap: _choisirPeriode,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: periode == null ? Styles.primaire : Colors.grey.shade300,
                ),
              ),
              child: Row(
                children: [
                  const Icon(RemixIcons.calendar_2_line, color: Styles.primaire),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      periode == null
                          ? 'Choisir les dates'
                          : 'Du ${formatDate(periode.start)} au ${formatDate(periode.end)}'
                                ' · ${periode.duration.inDays} jour(s)',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  const Icon(RemixIcons.arrow_right_s_line),
                ],
              ),
            ),
          ),
          if (_occupees.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Déjà réservé : ${_occupees.map((p) => '${formatDate(p.$1, annee: false)} → ${formatDate(p.$2, annee: false)}').join(', ')}',
              style: TextStyle(fontSize: 12, color: Colors.orange.shade900),
            ),
          ],
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              children: [
                const Icon(RemixIcons.group_line, color: Styles.primaire),
                const SizedBox(width: 12),
                const Expanded(child: Text('Personnes')),
                IconButton(
                  onPressed: _personnes > 1
                      ? () => setState(() => _personnes--)
                      : null,
                  icon: const Icon(RemixIcons.subtract_line),
                ),
                Text(
                  '$_personnes',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  onPressed: l.capacite == null || _personnes < l.capacite!
                      ? () => setState(() => _personnes++)
                      : null,
                  icon: const Icon(RemixIcons.add_line),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _message,
            maxLines: 3,
            decoration: decorationChamp(
              'Message au propriétaire (facultatif)',
              icone: RemixIcons.chat_3_line,
            ),
          ),
          const SizedBox(height: 24),
          if (_calcul) const Chargement(),
          if (_erreurEstimation != null)
            Text(
              _erreurEstimation!,
              style: TextStyle(color: Colors.red.shade700),
            ),
          if (e != null && !_calcul) ...[
            const TitreSection('Détail du prix'),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                children: [
                  _ligne(
                    '${formatPrix(l.prix, l.devise)} × ${e.periodes} '
                    '${l.periodiciteLibelle}',
                    e.montantLocation,
                  ),
                  if (e.caution > 0)
                    _ligne('Caution (remboursable)', e.caution),
                  if (e.avance > 0) _ligne('Avance', e.avance),
                  if (e.frais > 0) _ligne('Frais et charges', e.frais),
                  const Divider(height: 20),
                  _ligne('Total à prévoir', e.montantTotal, gras: true),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              e.instantanee
                  ? 'Ce logement est en réservation instantanée : '
                        'votre séjour est confirmé immédiatement.'
                  : 'Le paiement se fait directement avec le propriétaire, '
                        'après acceptation de votre demande.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ],
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: e == null || _envoi || _calcul ? null : _envoyer,
            style: styleBoutonPrincipal(),
            child: Text(
              _envoi
                  ? 'Envoi…'
                  : (l.reservationInstantanee
                        ? 'Confirmer la réservation'
                        : 'Envoyer la demande'),
            ),
          ),
        ),
      ),
    );
  }
}
