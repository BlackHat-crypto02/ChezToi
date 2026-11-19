import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';

/// Ouvre le formulaire de signalement pour la cible donnée.
/// Demande d'assistance sans cible précise (depuis l'aide).
Future<void> signalerProbleme(BuildContext context) => signaler(context);

Future<void> signaler(
  BuildContext context, {
  int? logementId,
  int? utilisateurId,
  int? reservationId,
  int? avisId,
  int? conversationId,
}) async {
  final envoye = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _FormulaireSignalement(
      logementId: logementId,
      utilisateurId: utilisateurId,
      reservationId: reservationId,
      avisId: avisId,
      conversationId: conversationId,
    ),
  );
  if (envoye == true && context.mounted) {
    afficherMessage(
      context,
      'Merci, votre signalement a été transmis à l’équipe ChezToi.',
    );
  }
}

class _FormulaireSignalement extends StatefulWidget {
  const _FormulaireSignalement({
    this.logementId,
    this.utilisateurId,
    this.reservationId,
    this.avisId,
    this.conversationId,
  });

  final int? logementId;
  final int? utilisateurId;
  final int? reservationId;
  final int? avisId;
  final int? conversationId;

  @override
  State<_FormulaireSignalement> createState() => _FormulaireSignalementState();
}

class _FormulaireSignalementState extends State<_FormulaireSignalement> {
  final _description = TextEditingController();
  late String _motif = widget.reservationId != null
      ? 'probleme_reservation'
      : widget.avisId != null
      ? 'avis_inapproprie'
      : _general
      ? 'autre'
      : 'fausse_annonce';

  /// Aucune cible : demande d'assistance générale (motif « Autre » obligatoire).
  bool get _general =>
      widget.logementId == null &&
      widget.utilisateurId == null &&
      widget.reservationId == null &&
      widget.avisId == null &&
      widget.conversationId == null;
  bool _envoi = false;

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _envoyer() async {
    setState(() => _envoi = true);
    try {
      await ChezToiApi.instance.signaler(
        motif: _motif,
        description: _description.text.trim(),
        logementId: widget.logementId,
        utilisateurId: widget.utilisateurId,
        reservationId: widget.reservationId,
        avisId: widget.avisId,
        conversationId: widget.conversationId,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        setState(() => _envoi = false);
        afficherMessage(context, messageErreur(e), erreur: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Signaler un problème',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Votre signalement reste confidentiel.',
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),
            if (!_general)
              RadioGroup<String>(
                groupValue: _motif,
                onChanged: (v) => setState(() => _motif = v ?? _motif),
                child: Column(
                  children: [
                    for (final entree in Libelles.motifsSignalement.entries)
                      RadioListTile<String>(
                        value: entree.key,
                        title: Text(entree.value),
                        dense: true,
                        activeColor: Styles.violet,
                        contentPadding: EdgeInsets.zero,
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 8),
            TextField(
              controller: _description,
              maxLines: 3,
              decoration: decorationChamp('Décrivez le problème'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _envoi ? null : _envoyer,
              style: styleBoutonPrincipal(),
              child: Text(_envoi ? 'Envoi…' : 'Envoyer le signalement'),
            ),
          ],
        ),
      ),
    );
  }
}
