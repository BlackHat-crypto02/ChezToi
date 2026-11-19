import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Présentation affichée au premier lancement (3 pages).
class Presentation extends StatefulWidget {
  const Presentation({super.key, required this.onExplorer, required this.onConnexion});

  final VoidCallback onExplorer;
  final VoidCallback onConnexion;

  @override
  State<Presentation> createState() => _PresentationState();
}

class _PresentationState extends State<Presentation> {
  final _pages = PageController();
  int _index = 0;

  static const _contenus = [
    (
      'assets/maison.webp',
      RemixIcons.shield_check_fill,
      'Des logements vérifiés',
      'Maisons, appartements, studios et villas partout au Togo, contrôlés par '
          'l’équipe ChezToi avant leur publication.',
    ),
    (
      'assets/immeuble.webp',
      RemixIcons.camera_3_fill,
      'Visitez avant de vous déplacer',
      'Photos, vidéos et visites 360° : faites le tour du logement depuis votre '
          'téléphone, puis situez-le sur la carte.',
    ),
    (
      'assets/maison.webp',
      RemixIcons.calendar_check_fill,
      'Réservez en toute sérénité',
      'Discutez avec le propriétaire, réservez vos dates et suivez tout au même '
          'endroit. Le compte n’est demandé qu’au moment de réserver.',
    ),
  ];

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dernier = _index == _contenus.length - 1;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: AnimatedOpacity(
                opacity: dernier ? 0 : 1,
                duration: const Duration(milliseconds: 200),
                child: TextButton(
                  onPressed: dernier ? null : widget.onExplorer,
                  child: const Text('Passer'),
                ),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pages,
                itemCount: _contenus.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (context, i) {
                  final (image, icone, titre, texte) = _contenus[i];
                  return _Page(image: image, icone: icone, titre: titre, texte: texte);
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < _contenus.length; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: i == _index ? 26 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i == _index ? Styles.primaire : Styles.bordure,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 16),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                child: dernier
                    ? Column(
                        key: const ValueKey('fin'),
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          FilledButton(
                            onPressed: widget.onExplorer,
                            child: const Text('Explorer les logements'),
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton(
                            onPressed: widget.onConnexion,
                            child: const Text('J’ai déjà un compte'),
                          ),
                        ],
                      )
                    : SizedBox(
                        key: const ValueKey('suite'),
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => _pages.nextPage(
                            duration: const Duration(milliseconds: 380),
                            curve: Curves.easeOutCubic,
                          ),
                          child: const Text('Suivant'),
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Page extends StatelessWidget {
  const _Page({
    required this.image,
    required this.icone,
    required this.titre,
    required this.texte,
  });

  final String image;
  final IconData icone;
  final String titre;
  final String texte;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          Expanded(
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(32),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.asset(image, fit: BoxFit.cover),
                        const DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Colors.transparent, Color(0xCC053B37)],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  left: 20,
                  bottom: 20,
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: Styles.ombre(2),
                    ),
                    child: Icon(icone, color: Styles.primaire, size: 30),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          Text(
            titre,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 10),
          Text(
            texte,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Styles.texteDoux, height: 1.5, fontSize: 15),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
