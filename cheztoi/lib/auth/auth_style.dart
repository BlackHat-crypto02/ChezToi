import 'package:material_ui/material_ui.dart';

class AuthStyle {
  const AuthStyle._();

  static const Color violet = Color(0xFF16005D);
  static const Color fond = Color(0xFFF7F5FC);

  static OutlineInputBorder border(Color color, {double width = 1}) =>
      OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: color, width: width),
      );
}
