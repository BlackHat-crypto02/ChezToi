import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:panorama_viewer/panorama_viewer.dart';
import 'package:remixicon/remixicon.dart';

/// Visite 360° : une vue immersive par pièce, navigation entre les pièces.
class VisiteVirtuelle extends StatefulWidget {
  const VisiteVirtuelle({super.key, required this.logement});

  final Logement logement;

  @override
  State<VisiteVirtuelle> createState() => _VisiteVirtuelleState();
}

class _VisiteVirtuelleState extends State<VisiteVirtuelle> {
  int _piece = 0;

  @override
  Widget build(BuildContext context) {
    final panoramas = widget.logement.panoramas;
    if (panoramas.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Visite 360°')),
        body: const Center(child: Text('Aucune visite disponible.')),
      );
    }
    final courant = panoramas[_piece];
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(courant.piece),
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: PanoramaViewer(
              // Une clé par pièce pour repartir d'une vue neuve.
              key: ValueKey(courant.id),
              sensorControl: SensorControl.orientation,
              child: Image.network(courant.url),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            top: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(
                    RemixIcons.drag_move_2_line,
                    color: Colors.white70,
                    size: 18,
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Faites glisser ou bougez le téléphone pour regarder autour. '
                      'Pincez pour zoomer.',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (panoramas.length > 1)
            Positioned(
              left: 0,
              right: 0,
              bottom: 24,
              child: SizedBox(
                height: 44,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: panoramas.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (_, i) => ChoiceChip(
                    label: Text(panoramas[i].piece),
                    selected: i == _piece,
                    selectedColor: Colors.white,
                    backgroundColor: Colors.black54,
                    labelStyle: TextStyle(
                      color: i == _piece ? Styles.primaire : Colors.white,
                    ),
                    onSelected: (_) => setState(() => _piece = i),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
