import 'package:material_ui/material_ui.dart';

/// Styles partagés par toute l'application (auth, navigation, Accueil, ...).
class Styles {
  const Styles._();

  static const Color violet = Color(0xFF16005D);
  static const Color bleu = Color(0xFF2563EB);
  static const Color fond = Color(0xFFF7F5FC);
  static const Color texte = Color(0xFF1F2937);

  static OutlineInputBorder border(Color color, {double width = 1}) =>
      OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: color, width: width),
      );
}
