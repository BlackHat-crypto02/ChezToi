import 'package:material_ui/material_ui.dart';

/// Système de design ChezToi, partagé avec l'administration web
/// (même vert que `--color-pri` dans `cheztoi-admin/src/app/globals.css`).
class Styles {
  const Styles._();

  // Couleurs de marque
  static const Color primaire = Color(0xFF0F766E);
  static const Color primaireFonce = Color(0xFF0B5F58);
  static const Color primaireNuit = Color(0xFF053B37);
  static const Color primaireClair = Color(0xFFE6F4F2);
  static const Color menthe = Color(0xFF5EEAD4);

  /// Accent chaud, réservé aux notes, promotions et appels à l'action secondaires.
  static const Color accent = Color(0xFFF59E0B);

  // Neutres
  static const Color fond = Color(0xFFF5F8F7);
  static const Color surface = Colors.white;
  static const Color texte = Color(0xFF10201E);
  static const Color texteDoux = Color(0xFF5B6B68);
  static const Color bordure = Color(0xFFE3EAE8);

  // États
  static const Color succes = Color(0xFF15803D);
  static const Color attention = Color(0xFFB45309);
  static const Color danger = Color(0xFFDC2626);
  static const Color info = Color(0xFF2563EB);

  // Formes
  static const double rayon = 16;
  static const double rayonGrand = 24;

  static const String police = 'Jakarta';

  static const LinearGradient degradeMarque = LinearGradient(
    colors: [Color(0xFF14B8A6), primaire, primaireNuit],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static List<BoxShadow> ombre([double force = 1]) => [
        BoxShadow(
          color: const Color(0xFF0B3B36).withValues(alpha: 0.06 * force),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
        BoxShadow(
          color: const Color(0xFF0B3B36).withValues(alpha: 0.04 * force),
          blurRadius: 4,
          offset: const Offset(0, 1),
        ),
      ];

  static OutlineInputBorder border(Color color, {double width = 1}) =>
      OutlineInputBorder(
        borderRadius: BorderRadius.circular(rayon),
        borderSide: BorderSide(color: color, width: width),
      );

  /// Thème Material 3 de toute l'application.
  static ThemeData theme() {
    final schema = ColorScheme.fromSeed(
      seedColor: primaire,
      primary: primaire,
      onPrimary: Colors.white,
      secondary: primaireFonce,
      tertiary: accent,
      surface: surface,
      error: danger,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: schema,
      fontFamily: police,
      scaffoldBackgroundColor: fond,
      splashFactory: InkSparkle.splashFactory,
    );
    final textes = base.textTheme.apply(
      bodyColor: texte,
      displayColor: texte,
      fontFamily: police,
    );
    return base.copyWith(
      textTheme: textes.copyWith(
        headlineMedium: textes.headlineMedium?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: -0.6,
        ),
        headlineSmall: textes.headlineSmall?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: -0.4,
        ),
        titleLarge: textes.titleLarge?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
        titleMedium: textes.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: fond,
        surfaceTintColor: Colors.transparent,
        foregroundColor: texte,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: police,
          fontSize: 19,
          fontWeight: FontWeight.w800,
          color: texte,
          letterSpacing: -0.3,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        indicatorColor: primaireClair,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (etats) => TextStyle(
            fontFamily: police,
            fontSize: 11.5,
            fontWeight: etats.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
            color: etats.contains(WidgetState.selected) ? primaire : texteDoux,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (etats) => IconThemeData(
            size: 24,
            color: etats.contains(WidgetState.selected) ? primaire : texteDoux,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primaire,
          foregroundColor: Colors.white,
          minimumSize: const Size(48, 52),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
          textStyle: const TextStyle(
            fontFamily: police,
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(rayon)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaire,
          minimumSize: const Size(48, 52),
          side: const BorderSide(color: bordure, width: 1.4),
          textStyle: const TextStyle(
            fontFamily: police,
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(rayon)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaire,
          textStyle: const TextStyle(fontFamily: police, fontWeight: FontWeight.w700),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: border(bordure),
        enabledBorder: border(bordure),
        focusedBorder: border(primaire, width: 1.8),
        errorBorder: border(danger),
        labelStyle: const TextStyle(color: texteDoux),
        prefixIconColor: texteDoux,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 10),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(rayon),
          side: const BorderSide(color: bordure),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.white,
        selectedColor: primaireClair,
        side: const BorderSide(color: bordure),
        labelStyle: const TextStyle(
          fontFamily: police,
          fontWeight: FontWeight.w600,
          color: texte,
          fontSize: 13,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(rayonGrand)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: primaireNuit,
        behavior: SnackBarBehavior.floating,
        contentTextStyle: const TextStyle(fontFamily: police, color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (e) => e.contains(WidgetState.selected) ? Colors.white : null,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (e) => e.contains(WidgetState.selected) ? primaire : null,
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: primaire),
      dividerTheme: const DividerThemeData(color: bordure, space: 1),
      tabBarTheme: const TabBarThemeData(
        labelColor: primaire,
        indicatorColor: primaire,
        unselectedLabelColor: texteDoux,
        labelStyle: TextStyle(fontFamily: police, fontWeight: FontWeight.w700),
      ),
    );
  }
}
