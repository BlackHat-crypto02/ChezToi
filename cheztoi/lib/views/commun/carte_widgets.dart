import 'package:cheztoi/widget/styles.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Tuiles OpenStreetMap : pas de clé d'API nécessaire.
TileLayer coucheOsm() => TileLayer(
  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  userAgentPackageName: 'tg.cheztoi.app',
);

/// Centre par défaut : Lomé.
const LatLng centreParDefaut = LatLng(6.1375, 1.2123);

/// Principales villes du Togo, pour la recherche manuelle sur la carte
/// quand la géolocalisation n'est pas disponible.
const Map<String, LatLng> villesTogo = {
  'Lomé': LatLng(6.1375, 1.2123),
  'Aného': LatLng(6.2280, 1.5919),
  'Tsévié': LatLng(6.4261, 1.2133),
  'Kpalimé': LatLng(6.9000, 0.6300),
  'Atakpamé': LatLng(7.5333, 1.1333),
  'Sokodé': LatLng(8.9833, 1.1333),
  'Kara': LatLng(9.5511, 1.1861),
  'Bassar': LatLng(9.2500, 0.7833),
  'Mango': LatLng(10.3592, 0.4708),
  'Dapaong': LatLng(10.8625, 0.2076),
};

/// Petite carte statique de la fiche logement.
class CartePosition extends StatelessWidget {
  const CartePosition({
    super.key,
    required this.latitude,
    required this.longitude,
    this.approximative = true,
  });

  final double latitude;
  final double longitude;
  final bool approximative;

  @override
  Widget build(BuildContext context) {
    final point = LatLng(latitude, longitude);
    return FlutterMap(
      options: MapOptions(
        initialCenter: point,
        initialZoom: approximative ? 14 : 16,
        interactionOptions: const InteractionOptions(
          flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
        ),
      ),
      children: [
        coucheOsm(),
        if (approximative)
          CircleLayer(
            circles: [
              CircleMarker(
                point: point,
                radius: 250,
                useRadiusInMeter: true,
                color: Styles.primaire.withValues(alpha: 0.18),
                borderColor: Styles.primaire,
                borderStrokeWidth: 2,
              ),
            ],
          )
        else
          MarkerLayer(
            markers: [
              Marker(
                point: point,
                width: 40,
                height: 40,
                alignment: Alignment.topCenter,
                child: const Icon(
                  RemixIcons.map_pin_2_fill,
                  color: Styles.primaire,
                  size: 40,
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// Le propriétaire place son logement en touchant la carte.
class SelecteurPosition extends StatefulWidget {
  const SelecteurPosition({super.key, this.initiale});

  final LatLng? initiale;

  @override
  State<SelecteurPosition> createState() => _SelecteurPositionState();
}

class _SelecteurPositionState extends State<SelecteurPosition> {
  final _carte = MapController();
  LatLng? _point;

  @override
  void initState() {
    super.initState();
    _point = widget.initiale;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Position du logement'),
        actions: [
          PopupMenuButton<LatLng>(
            tooltip: 'Aller à une ville',
            icon: const Icon(RemixIcons.road_map_line),
            onSelected: (centre) => _carte.move(centre, 14),
            itemBuilder: (_) => [
              for (final entree in villesTogo.entries)
                PopupMenuItem(value: entree.value, child: Text(entree.key)),
            ],
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _carte,
            options: MapOptions(
              initialCenter: _point ?? centreParDefaut,
              initialZoom: _point == null ? 12 : 16,
              onTap: (_, point) => setState(() => _point = point),
            ),
            children: [
              coucheOsm(),
              if (_point != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _point!,
                      width: 44,
                      height: 44,
                      alignment: Alignment.topCenter,
                      child: const Icon(
                        RemixIcons.map_pin_2_fill,
                        color: Styles.primaire,
                        size: 44,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          Positioned(
            left: 16,
            right: 16,
            top: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  _point == null
                      ? 'Touchez la carte pour placer votre logement.'
                      : 'Position : ${_point!.latitude.toStringAsFixed(5)}, '
                            '${_point!.longitude.toStringAsFixed(5)}',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _point == null
                ? null
                : () => Navigator.pop(context, _point),
            style: FilledButton.styleFrom(
              backgroundColor: Styles.primaire,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: const Text('Valider cette position'),
          ),
        ),
      ),
    );
  }
}
