import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/commun/logement_detail.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

// ------------------------------------------------------------------ Formats

const _mois = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/// 350000 → « 350 000 FCFA ».
String formatPrix(int montant, [String devise = 'XOF']) {
  final chiffres = montant.abs().toString();
  final tampon = StringBuffer();
  for (var i = 0; i < chiffres.length; i++) {
    if (i > 0 && (chiffres.length - i) % 3 == 0) tampon.write(' ');
    tampon.write(chiffres[i]);
  }
  final symbole = devise == 'XOF' ? 'FCFA' : devise;
  return '${montant < 0 ? '-' : ''}$tampon $symbole';
}

/// 2026-11-18 → « 18 nov. 2026 ».
String formatDate(DateTime? date, {bool annee = true}) {
  if (date == null) return '';
  final base = '${date.day} ${_mois[date.month - 1]}';
  return annee ? '$base ${date.year}' : base;
}

/// Heure (aujourd'hui) ou date courte pour les listes de messages.
String formatMoment(DateTime? date) {
  if (date == null) return '';
  final maintenant = DateTime.now();
  if (date.year == maintenant.year &&
      date.month == maintenant.month &&
      date.day == maintenant.day) {
    return '${date.hour.toString().padLeft(2, '0')}:'
        '${date.minute.toString().padLeft(2, '0')}';
  }
  return formatDate(date, annee: date.year != maintenant.year);
}

void afficherMessage(
  BuildContext context,
  String message, {
  bool erreur = false,
}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: erreur ? Colors.red.shade700 : null,
      ),
    );
}

/// Message lisible pour n'importe quelle erreur levée par l'API.
String messageErreur(Object erreur) =>
    erreur is ApiException ? erreur.message : 'Une erreur est survenue.';

Future<bool> confirmer(
  BuildContext context, {
  required String titre,
  required String message,
  String action = 'Confirmer',
  bool danger = false,
}) async {
  final resultat = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(titre),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Annuler'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: danger ? Colors.red.shade700 : Styles.violet,
          ),
          onPressed: () => Navigator.pop(context, true),
          child: Text(action),
        ),
      ],
    ),
  );
  return resultat ?? false;
}

/// Demande un texte (motif de refus, d'annulation...). Null si annulé.
Future<String?> demanderTexte(
  BuildContext context, {
  required String titre,
  String label = 'Motif',
  String action = 'Valider',
  bool obligatoire = false,
}) async {
  final controleur = TextEditingController();
  final resultat = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(titre),
      content: TextField(
        controller: controleur,
        autofocus: true,
        maxLines: 3,
        decoration: InputDecoration(
          labelText: obligatoire ? label : '$label (facultatif)',
          border: Styles.border(Colors.grey.shade300),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: Styles.violet),
          onPressed: () {
            final texte = controleur.text.trim();
            if (obligatoire && texte.isEmpty) return;
            Navigator.pop(context, texte);
          },
          child: Text(action),
        ),
      ],
    ),
  );
  controleur.dispose();
  return resultat;
}

// ----------------------------------------------------------------- États

class Chargement extends StatelessWidget {
  const Chargement({super.key});

  @override
  Widget build(BuildContext context) => const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(color: Styles.violet),
        ),
      );
}

class EtatVide extends StatelessWidget {
  const EtatVide({
    super.key,
    required this.icone,
    required this.titre,
    this.message,
    this.action,
    this.onAction,
  });

  final IconData icone;
  final String titre;
  final String? message;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Styles.violet.withValues(alpha: 0.07),
                shape: BoxShape.circle,
              ),
              child: Icon(icone, size: 34, color: Styles.violet),
            ),
            const SizedBox(height: 16),
            Text(
              titre,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Styles.texte,
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: 6),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
            ],
            if (action != null && onAction != null) ...[
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: onAction,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Styles.violet,
                  side: const BorderSide(color: Styles.violet),
                ),
                child: Text(action!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class EtatErreur extends StatelessWidget {
  const EtatErreur({super.key, required this.erreur, required this.onReessayer});

  final Object erreur;
  final VoidCallback onReessayer;

  @override
  Widget build(BuildContext context) => EtatVide(
        icone: RemixIcons.wifi_off_line,
        titre: 'Oups…',
        message: messageErreur(erreur),
        action: 'Réessayer',
        onAction: onReessayer,
      );
}

/// Charge une donnée et affiche chargement / erreur / contenu.
class Chargeur<T> extends StatefulWidget {
  const Chargeur({super.key, required this.charger, required this.builder});

  final Future<T> Function() charger;
  final Widget Function(BuildContext context, T donnees, VoidCallback recharger)
      builder;

  @override
  State<Chargeur<T>> createState() => _ChargeurState<T>();
}

class _ChargeurState<T> extends State<Chargeur<T>> {
  late Future<T> _futur;

  @override
  void initState() {
    super.initState();
    _futur = widget.charger();
  }

  void _recharger() => setState(() => _futur = widget.charger());

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: _futur,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Chargement();
        }
        if (snapshot.hasError) {
          return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
        }
        return widget.builder(context, snapshot.data as T, _recharger);
      },
    );
  }
}

// ---------------------------------------------------------------- Images

class ImageLogement extends StatelessWidget {
  const ImageLogement({
    super.key,
    required this.url,
    this.hauteur,
    this.largeur = double.infinity,
    this.fit = BoxFit.cover,
  });

  final String? url;
  final double? hauteur;
  final double largeur;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final defaut = Image.asset(
      'assets/maison.webp',
      height: hauteur,
      width: largeur,
      fit: fit,
    );
    if (url == null || url!.isEmpty) return defaut;
    return Image.network(
      url!,
      height: hauteur,
      width: largeur,
      fit: fit,
      errorBuilder: (_, _, _) => defaut,
      loadingBuilder: (context, child, progression) => progression == null
          ? child
          : Container(
              height: hauteur,
              width: largeur,
              color: Colors.grey.shade200,
            ),
    );
  }
}

class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.initiales, this.url, this.rayon = 22});

  final String initiales;
  final String? url;
  final double rayon;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: rayon,
      backgroundColor: Styles.violet.withValues(alpha: 0.12),
      foregroundImage: url == null || url!.isEmpty ? null : NetworkImage(url!),
      child: Text(
        initiales.isEmpty ? '?' : initiales,
        style: TextStyle(
          color: Styles.violet,
          fontWeight: FontWeight.bold,
          fontSize: rayon * 0.7,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Badges

class Pastille extends StatelessWidget {
  const Pastille({
    super.key,
    required this.texte,
    this.couleur = Styles.violet,
    this.icone,
  });

  final String texte;
  final Color couleur;
  final IconData? icone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: couleur.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icone != null) ...[
            Icon(icone, size: 13, color: couleur),
            const SizedBox(width: 4),
          ],
          Text(
            texte,
            style: TextStyle(
              color: couleur,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

Color couleurStatut(String statut) {
  switch (statut) {
    case 'publiee':
    case 'confirmee':
    case 'acceptee':
    case 'en_cours':
      return Colors.green.shade700;
    case 'en_attente':
      return Colors.orange.shade800;
    case 'refusee':
    case 'suspendue':
    case 'annulee':
    case 'en_litige':
      return Colors.red.shade700;
    case 'louee':
      return Styles.bleu;
    default:
      return Colors.grey.shade700;
  }
}

class StatutPastille extends StatelessWidget {
  const StatutPastille({super.key, required this.statut, required this.libelle});

  final String statut;
  final String libelle;

  @override
  Widget build(BuildContext context) =>
      Pastille(texte: libelle, couleur: couleurStatut(statut));
}

class Etoiles extends StatelessWidget {
  const Etoiles({super.key, required this.note, this.taille = 14});

  final double note;
  final double taille;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Icon(
            note >= i
                ? RemixIcons.star_fill
                : (note >= i - 0.5
                    ? RemixIcons.star_half_fill
                    : RemixIcons.star_line),
            size: taille,
            color: Colors.amber.shade700,
          ),
      ],
    );
  }
}

class TitreSection extends StatelessWidget {
  const TitreSection(this.texte, {super.key, this.action, this.onAction});

  final String texte;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: Text(
            texte,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Styles.texte,
                  fontWeight: FontWeight.bold,
                ),
          ),
        ),
        if (action != null)
          InkWell(
            onTap: onAction,
            child: Text(
              action!,
              style: const TextStyle(
                color: Styles.bleu,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }
}

// ------------------------------------------------------- Cartes logement

Future<void> ouvrirLogement(BuildContext context, int id) {
  return Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => LogementDetail(logementId: id)),
  );
}

/// Bouton cœur : bascule le favori côté serveur avec mise à jour optimiste.
class BoutonFavori extends StatefulWidget {
  const BoutonFavori({
    super.key,
    required this.logement,
    this.taille = 18,
    this.onChange,
  });

  final Logement logement;
  final double taille;
  final ValueChanged<bool>? onChange;

  @override
  State<BoutonFavori> createState() => _BoutonFavoriState();
}

class _BoutonFavoriState extends State<BoutonFavori> {
  late bool _favori = widget.logement.estFavori;

  @override
  void didUpdateWidget(covariant BoutonFavori ancien) {
    super.didUpdateWidget(ancien);
    if (ancien.logement.estFavori != widget.logement.estFavori) {
      _favori = widget.logement.estFavori;
    }
  }

  Future<void> _basculer() async {
    final nouveau = !_favori;
    setState(() => _favori = nouveau);
    try {
      await ChezToiApi.instance.basculerFavori(
        widget.logement.id,
        ajouter: nouveau,
      );
      widget.onChange?.call(nouveau);
    } catch (e) {
      if (!mounted) return;
      setState(() => _favori = !nouveau);
      afficherMessage(context, messageErreur(e), erreur: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      key: ValueKey('favori_${widget.logement.id}'),
      onTap: _basculer,
      customBorder: const CircleBorder(),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.92),
          shape: BoxShape.circle,
        ),
        child: Icon(
          _favori ? RemixIcons.heart_3_fill : RemixIcons.heart_3_line,
          color: _favori ? Colors.red : Styles.violet,
          size: widget.taille,
        ),
      ),
    );
  }
}

class _Prix extends StatelessWidget {
  const _Prix({required this.logement});

  final Logement logement;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Flexible(
          child: Text(
            formatPrix(logement.prix, logement.devise),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Styles.texte,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          '/ ${logement.periodiciteLibelle}',
          style: const TextStyle(color: Colors.grey, fontSize: 12),
        ),
      ],
    );
  }
}

class _Localisation extends StatelessWidget {
  const _Localisation({required this.logement});

  final Logement logement;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(RemixIcons.map_pin_3_line, size: 14, color: Styles.violet),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            logement.localisation,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              color: Styles.violet,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        if (logement.distanceKm != null) ...[
          const SizedBox(width: 6),
          Text(
            '· ${logement.distanceKm} km',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ],
    );
  }
}

class _Badges extends StatelessWidget {
  const _Badges({required this.logement});

  final Logement logement;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 4,
      children: [
        if (logement.verifie)
          const Pastille(
            texte: 'Vérifié',
            icone: RemixIcons.verified_badge_fill,
            couleur: Colors.green,
          ),
        if (logement.aVisiteVirtuelle)
          const Pastille(texte: '360°', icone: RemixIcons.camera_3_line),
        if (logement.noteMoyenne != null)
          Pastille(
            texte: '${logement.noteMoyenne} (${logement.nombreAvis})',
            icone: RemixIcons.star_fill,
            couleur: Colors.amber.shade800,
          ),
      ],
    );
  }
}

/// Carte verticale, pour les listes horizontales de l'accueil.
class LogementCarte extends StatelessWidget {
  const LogementCarte({super.key, required this.logement, this.largeur = 240});

  final Logement logement;
  final double largeur;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: largeur,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => ouvrirLogement(context, logement.id),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    ImageLogement(url: logement.photo, hauteur: 140),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: BoutonFavori(logement: logement),
                    ),
                    Positioned(
                      left: 8,
                      bottom: 8,
                      child: Pastille(
                        texte: logement.typeLibelle,
                        couleur: Colors.white,
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Prix(logement: logement),
                      const SizedBox(height: 6),
                      _Localisation(logement: logement),
                      const SizedBox(height: 6),
                      Text(
                        logement.titre,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 6),
                      _Badges(logement: logement),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Ligne horizontale, pour les listes verticales (recherche, favoris...).
class LogementTuile extends StatelessWidget {
  const LogementTuile({
    super.key,
    required this.logement,
    this.onTap,
    this.trailing,
    this.afficherFavori = true,
    this.onFavori,
  });

  final Logement logement;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool afficherFavori;
  final ValueChanged<bool>? onFavori;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap ?? () => ouvrirLogement(context, logement.id),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: 120,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      ImageLogement(url: logement.photo),
                      if (afficherFavori)
                        Positioned(
                          top: 6,
                          left: 6,
                          child: BoutonFavori(
                            logement: logement,
                            taille: 16,
                            onChange: onFavori,
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          logement.titre,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Styles.texte,
                          ),
                        ),
                        const SizedBox(height: 4),
                        _Localisation(logement: logement),
                        const SizedBox(height: 4),
                        Text(
                          [
                            logement.typeLibelle,
                            '${logement.chambres} ch.',
                            if (logement.superficie != null)
                              '${logement.superficie} m²',
                            if (logement.meuble) 'meublé',
                          ].join(' · '),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        _Prix(logement: logement),
                        const SizedBox(height: 6),
                        _Badges(logement: logement),
                      ],
                    ),
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Liste horizontale de cartes avec titre.
class SectionLogements extends StatelessWidget {
  const SectionLogements({
    super.key,
    required this.titre,
    required this.logements,
    this.onVoirTout,
  });

  final String titre;
  final List<Logement> logements;
  final VoidCallback? onVoirTout;

  @override
  Widget build(BuildContext context) {
    if (logements.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TitreSection(
              titre,
              action: onVoirTout == null ? null : 'Voir tout',
              onAction: onVoirTout,
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final logement in logements) ...[
                    LogementCarte(logement: logement),
                    const SizedBox(width: 14),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Champ de formulaire au style ChezToi.
InputDecoration decorationChamp(
  String label, {
  IconData? icone,
  String? aide,
  String? suffixe,
}) {
  return InputDecoration(
    labelText: label,
    helperText: aide,
    suffixText: suffixe,
    prefixIcon: icone == null ? null : Icon(icone),
    filled: true,
    fillColor: Colors.white,
    border: Styles.border(Colors.grey.shade300),
    enabledBorder: Styles.border(Colors.grey.shade300),
    focusedBorder: Styles.border(Styles.violet, width: 2),
  );
}

ButtonStyle styleBoutonPrincipal() => FilledButton.styleFrom(
      backgroundColor: Styles.violet,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    );

ButtonStyle styleBoutonSecondaire() => OutlinedButton.styleFrom(
      foregroundColor: Styles.violet,
      side: const BorderSide(color: Styles.violet),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    );
