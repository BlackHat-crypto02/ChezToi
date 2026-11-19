import 'dart:async';

import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/commun/carte_widgets.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Carte des logements : marqueurs avec prix, recherche par zone visible.
class Carte extends StatefulWidget {
  const Carte({super.key});

  @override
  State<Carte> createState() => _CarteState();
}

class _CarteState extends State<Carte> {
  final _carte = MapController();
  List<Logement> _logements = const [];
  Logement? _selection;
  bool _chargement = false;
  Timer? _attente;

  @override
  void initState() {
    super.initState();
    // Premier chargement sans zone : tous les logements géolocalisés.
    _charger(zone: false);
  }

  @override
  void dispose() {
    _attente?.cancel();
    super.dispose();
  }

  Future<void> _charger({bool zone = true}) async {
    setState(() => _chargement = true);
    try {
      final criteres = <String, dynamic>{};
      if (zone) {
        final limites = _carte.camera.visibleBounds;
        criteres.addAll({
          'lat_min': limites.south,
          'lat_max': limites.north,
          'lng_min': limites.west,
          'lng_max': limites.east,
        });
      }
      final logements = await ChezToiApi.instance.logementsCarte(criteres);
      if (mounted) setState(() => _logements = logements);
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  void _surEvenement(MapEvent evenement) {
    if (evenement is MapEventMoveEnd ||
        evenement is MapEventFlingAnimationEnd ||
        evenement is MapEventDoubleTapZoomEnd ||
        evenement is MapEventScrollWheelZoom) {
      _attente?.cancel();
      _attente = Timer(const Duration(milliseconds: 400), _charger);
    }
  }

  String _prixCourt(int prix) {
    if (prix >= 1000000) {
      final m = prix / 1000000;
      return '${m.toStringAsFixed(m >= 10 ? 0 : 1)} M';
    }
    if (prix >= 1000) return '${(prix / 1000).round()} k';
    return '$prix';
  }

  Marker _marqueur(Logement l) {
    final choisi = _selection?.id == l.id;
    return Marker(
      point: LatLng(l.latitude!, l.longitude!),
      width: 84,
      height: 34,
      child: GestureDetector(
        onTap: () => setState(() => _selection = l),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: choisi ? Styles.bleu : Styles.violet,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: const [
              BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
            ],
          ),
          child: Text(
            '${_prixCourt(l.prix)} F',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final geolocalises = _logements.where((l) => l.aPosition).toList();
    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _carte,
            options: MapOptions(
              initialCenter: centreParDefaut,
              initialZoom: 12,
              onMapEvent: _surEvenement,
              onTap: (_, _) => setState(() => _selection = null),
            ),
            children: [
              coucheOsm(),
              MarkerLayer(markers: [for (final l in geolocalises) _marqueur(l)]),
            ],
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Material(
                      elevation: 3,
                      borderRadius: BorderRadius.circular(14),
                      color: Colors.white,
                      child: PopupMenuButton<LatLng>(
                        tooltip: 'Choisir une ville',
                        onSelected: (centre) => _carte.move(centre, 13),
                        itemBuilder: (_) => [
                          for (final v in villesTogo.entries)
                            PopupMenuItem(value: v.value, child: Text(v.key)),
                        ],
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 14,
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                RemixIcons.search_2_line,
                                color: Styles.violet,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _chargement
                                      ? 'Chargement…'
                                      : '${geolocalises.length} logement(s) dans la zone',
                                  style: const TextStyle(color: Styles.texte),
                                ),
                              ),
                              const Icon(RemixIcons.arrow_down_s_line),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Material(
                    elevation: 3,
                    shape: const CircleBorder(),
                    color: Colors.white,
                    child: IconButton(
                      tooltip: 'Recentrer sur Lomé',
                      onPressed: () => _carte.move(centreParDefaut, 12),
                      icon: const Icon(
                        RemixIcons.focus_3_line,
                        color: Styles.violet,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_selection != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
              child: Material(
                elevation: 6,
                borderRadius: BorderRadius.circular(16),
                child: LogementTuile(logement: _selection!),
              ),
            ),
        ],
      ),
    );
  }
}
