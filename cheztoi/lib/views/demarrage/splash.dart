import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:cheztoi/widget/styles.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

/// Écran de démarrage animé (≈ 2,8 s) :
/// 1. halo et particules sur fond vert profond ;
/// 2. la maison se dessine trait par trait, puis se remplit ;
/// 3. l'épingle ChezToi tombe sur le toit avec un rebond ;
/// 4. le nom apparaît lettre par lettre, puis le slogan.
///
/// [prete] est attendue en parallèle (chargement de la session) : l'écran
/// ne se ferme qu'une fois l'animation et le chargement terminés.
class SplashChezToi extends StatefulWidget {
  const SplashChezToi({super.key, required this.prete, required this.onTermine});

  final Future<void> prete;
  final VoidCallback onTermine;

  @override
  State<SplashChezToi> createState() => _SplashChezToiState();
}

class _SplashChezToiState extends State<SplashChezToi>
    with TickerProviderStateMixin {
  late final AnimationController _intro = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2600),
  );
  late final AnimationController _ambiance = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 6),
  )..repeat();

  bool _fini = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
    WidgetsBinding.instance.addPostFrameCallback((_) => _demarrer());
  }

  Future<void> _demarrer() async {
    final reduit = MediaQuery.of(context).disableAnimations;
    if (reduit) _intro.duration = const Duration(milliseconds: 700);
    await Future.wait([
      _intro.forward().orCancel.catchError((_) {}),
      widget.prete.catchError((_) {}),
    ]);
    if (!mounted || _fini) return;
    _fini = true;
    // Petite respiration avant de passer la main.
    await Future<void>.delayed(const Duration(milliseconds: 250));
    if (mounted) widget.onTermine();
  }

  @override
  void dispose() {
    _intro.dispose();
    _ambiance.dispose();
    super.dispose();
  }

  Animation<double> _etape(double debut, double fin, [Curve courbe = Curves.easeOutCubic]) =>
      CurvedAnimation(
        parent: _intro,
        curve: Interval(debut, fin, curve: courbe),
      );

  @override
  Widget build(BuildContext context) {
    final trace = _etape(0.05, 0.45, Curves.easeInOutCubic);
    final remplissage = _etape(0.38, 0.55);
    final epingle = _etape(0.45, 0.72, Curves.bounceOut);
    final nom = _etape(0.6, 0.88);
    final slogan = _etape(0.8, 1.0);
    final halo = _etape(0.0, 0.5);

    return Scaffold(
      backgroundColor: Styles.primaireNuit,
      body: AnimatedBuilder(
        animation: Listenable.merge([_intro, _ambiance]),
        builder: (context, _) {
          final t = _ambiance.value * 2 * math.pi;
          return Stack(
            fit: StackFit.expand,
            children: [
              // Fond : dégradé et aurores qui dérivent lentement.
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFF0A4F49), Styles.primaireNuit, Color(0xFF021E1C)],
                  ),
                ),
              ),
              _Aurore(
                alignement: Alignment(-0.9 + 0.25 * math.sin(t), -0.7 + 0.1 * math.cos(t)),
                couleur: const Color(0xFF14B8A6),
                taille: 420,
                opacite: 0.35 * halo.value,
              ),
              _Aurore(
                alignement: Alignment(0.9 + 0.2 * math.cos(t), 0.8 + 0.1 * math.sin(t)),
                couleur: Styles.menthe,
                taille: 360,
                opacite: 0.22 * halo.value,
              ),
              CustomPaint(
                painter: _Particules(progression: _ambiance.value, visibilite: halo.value),
              ),
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 168,
                      height: 168,
                      child: Stack(
                        clipBehavior: Clip.none,
                        alignment: Alignment.center,
                        children: [
                          // Halo lumineux derrière la maison.
                          Opacity(
                            opacity: remplissage.value,
                            child: Container(
                              width: 150,
                              height: 150,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Styles.menthe.withValues(alpha: 0.35),
                                    blurRadius: 60,
                                    spreadRadius: 6,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          CustomPaint(
                            size: const Size(140, 140),
                            painter: _Maison(trace: trace.value, remplissage: remplissage.value),
                          ),
                          // L'épingle tombe sur le toit.
                          Positioned(
                            top: -6 + (1 - epingle.value) * -120,
                            child: Opacity(
                              opacity: epingle.value.clamp(0.0, 1.0),
                              child: Transform.scale(
                                scale: 0.6 + 0.4 * epingle.value,
                                child: const _Epingle(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    _NomAnime(progression: nom.value),
                    const SizedBox(height: 10),
                    Opacity(
                      opacity: slogan.value,
                      child: Transform.translate(
                        offset: Offset(0, 12 * (1 - slogan.value)),
                        child: const Text(
                          'Trouvez votre chez-vous, en toute confiance.',
                          style: TextStyle(
                            fontFamily: Styles.police,
                            color: Color(0xCCFFFFFF),
                            fontSize: 14.5,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Fine barre de progression en bas.
              Positioned(
                left: 0,
                right: 0,
                bottom: 56 + MediaQuery.of(context).padding.bottom,
                child: Center(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: SizedBox(
                      width: 120,
                      height: 3,
                      child: Stack(
                        children: [
                          Container(color: Colors.white.withValues(alpha: 0.12)),
                          FractionallySizedBox(
                            widthFactor: _intro.value,
                            child: Container(
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [Styles.menthe, Colors.white],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
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

class _Aurore extends StatelessWidget {
  const _Aurore({
    required this.alignement,
    required this.couleur,
    required this.taille,
    required this.opacite,
  });

  final Alignment alignement;
  final Color couleur;
  final double taille;
  final double opacite;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: alignement,
      child: ImageFiltered(
        imageFilter: ui.ImageFilter.blur(sigmaX: 70, sigmaY: 70),
        child: Container(
          width: taille,
          height: taille,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: couleur.withValues(alpha: opacite),
          ),
        ),
      ),
    );
  }
}

/// Maison en traits : toit, murs, cheminée, porte et fenêtre.
class _Maison extends CustomPainter {
  _Maison({required this.trace, required this.remplissage});

  final double trace;
  final double remplissage;

  Path _contour(Size s) {
    final w = s.width, h = s.height;
    return Path()
      // Mur gauche jusqu'au toit, toit, mur droit, sol.
      ..moveTo(w * 0.2, h * 0.92)
      ..lineTo(w * 0.2, h * 0.48)
      ..lineTo(w * 0.5, h * 0.2)
      ..lineTo(w * 0.8, h * 0.48)
      ..lineTo(w * 0.8, h * 0.92)
      ..close()
      // Cheminée
      ..moveTo(w * 0.66, h * 0.35)
      ..lineTo(w * 0.66, h * 0.22)
      ..lineTo(w * 0.73, h * 0.22)
      ..lineTo(w * 0.73, h * 0.42);
  }

  Path _porte(Size s) {
    final w = s.width, h = s.height;
    return Path()
      ..moveTo(w * 0.42, h * 0.92)
      ..lineTo(w * 0.42, h * 0.7)
      ..arcToPoint(Offset(w * 0.58, h * 0.7), radius: Radius.circular(w * 0.08))
      ..lineTo(w * 0.58, h * 0.92);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final contour = _contour(size);
    final porte = _porte(size);

    // Remplissage dégradé une fois le tracé avancé.
    if (remplissage > 0) {
      final fond = Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF2DD4BF), Styles.primaire],
        ).createShader(Offset.zero & size);
      canvas.saveLayer(Offset.zero & size, Paint()..color = Colors.white.withValues(alpha: remplissage));
      canvas.drawPath(contour, fond);
      canvas.drawPath(
        porte,
        Paint()..color = Styles.primaireNuit.withValues(alpha: 0.85),
      );
      canvas.restore();
    }

    // Tracé progressif du contour.
    final trait = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final chemin in [contour, porte]) {
      final metriques = chemin.computeMetrics().toList();
      final total = metriques.fold<double>(0, (s, m) => s + m.length);
      var reste = total * trace;
      for (final m in metriques) {
        if (reste <= 0) break;
        canvas.drawPath(m.extractPath(0, math.min(reste, m.length)), trait);
        reste -= m.length;
      }
    }
  }

  @override
  bool shouldRepaint(_Maison ancien) =>
      ancien.trace != trace || ancien.remplissage != remplissage;
}

class _Epingle extends StatelessWidget {
  const _Epingle();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        color: Styles.accent,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: [
          BoxShadow(
            color: Styles.accent.withValues(alpha: 0.55),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 22),
    );
  }
}

/// « ChezToi » lettre par lettre, « Toi » en menthe.
class _NomAnime extends StatelessWidget {
  const _NomAnime({required this.progression});

  final double progression;

  @override
  Widget build(BuildContext context) {
    const nom = 'ChezToi';
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < nom.length; i++)
          Builder(
            builder: (context) {
              final debut = i / (nom.length + 2);
              final p = ((progression - debut) / (1 - debut) * 1.6).clamp(0.0, 1.0);
              final courbe = Curves.easeOutBack.transform(p);
              return Opacity(
                opacity: p,
                child: Transform.translate(
                  offset: Offset(0, 22 * (1 - courbe)),
                  child: Text(
                    nom[i],
                    style: TextStyle(
                      fontFamily: Styles.police,
                      fontSize: 44,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1.2,
                      color: i >= 4 ? Styles.menthe : Colors.white,
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}

/// Petites lueurs qui montent lentement.
class _Particules extends CustomPainter {
  _Particules({required this.progression, required this.visibilite});

  final double progression;
  final double visibilite;

  static final List<(double, double, double, double)> _graines = List.generate(
    26,
    (i) {
      final r = math.Random(i * 7919);
      return (r.nextDouble(), r.nextDouble(), 1 + r.nextDouble() * 2.4, 0.3 + r.nextDouble() * 0.7);
    },
  );

  @override
  void paint(Canvas canvas, Size size) {
    if (visibilite <= 0) return;
    final pinceau = Paint();
    for (final (x, depart, rayon, vitesse) in _graines) {
      final y = (depart - progression * vitesse) % 1.0;
      final alpha = (math.sin(y * math.pi) * 0.5 * visibilite).clamp(0.0, 1.0);
      pinceau.color = Colors.white.withValues(alpha: alpha);
      canvas.drawCircle(Offset(x * size.width, y * size.height), rayon, pinceau);
    }
  }

  @override
  bool shouldRepaint(_Particules ancien) =>
      ancien.progression != progression || ancien.visibilite != visibilite;
}
