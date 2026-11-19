import 'package:geolocator/geolocator.dart';

/// Position de l'utilisateur, ou un message expliquant pourquoi elle manque.
class ResultatPosition {
  const ResultatPosition.trouvee(this.latitude, this.longitude) : erreur = null;
  const ResultatPosition.erreur(this.erreur)
    : latitude = null,
      longitude = null;

  final double? latitude;
  final double? longitude;
  final String? erreur;

  bool get ok => erreur == null;
}

/// Demande l'autorisation si besoin. En cas de refus, l'application
/// propose la recherche manuelle par ville (cahier des charges 4.5).
Future<ResultatPosition> obtenirPosition() async {
  try {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return const ResultatPosition.erreur(
        'La localisation est désactivée sur votre téléphone. '
        'Activez-la ou choisissez une ville.',
      );
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      return const ResultatPosition.erreur(
        'Autorisation refusée : choisissez une ville pour chercher manuellement.',
      );
    }
    if (permission == LocationPermission.deniedForever) {
      return const ResultatPosition.erreur(
        'La localisation est bloquée pour ChezToi. Autorisez-la dans les '
        'réglages du téléphone ou choisissez une ville.',
      );
    }
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
        timeLimit: Duration(seconds: 15),
      ),
    );
    return ResultatPosition.trouvee(position.latitude, position.longitude);
  } catch (_) {
    return const ResultatPosition.erreur(
      'Position introuvable pour le moment. Choisissez une ville.',
    );
  }
}
