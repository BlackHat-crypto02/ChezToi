import 'package:shared_preferences/shared_preferences.dart';

/// Logements consultés récemment, gardés sur le téléphone (20 au maximum).
class Historique {
  const Historique._();

  static const _cle = 'cheztoi_logements_consultes';
  static const _maximum = 20;

  static Future<List<int>> lire() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return (prefs.getStringList(_cle) ?? const [])
          .map(int.tryParse)
          .whereType<int>()
          .toList();
    } catch (_) {
      return const [];
    }
  }

  static Future<void> ajouter(int logementId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ids = [
        '$logementId',
        ...(prefs.getStringList(_cle) ?? const <String>[]).where(
          (id) => id != '$logementId',
        ),
      ].take(_maximum).toList();
      await prefs.setStringList(_cle, ids);
    } catch (_) {}
  }

  static Future<void> effacer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_cle);
    } catch (_) {}
  }
}
