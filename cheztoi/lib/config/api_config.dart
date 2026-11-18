import 'package:flutter/foundation.dart';

/// Adresse du backend Django partagé par le mobile et le web.
///
/// Sur l'émulateur Android, `10.0.2.2` désigne la machine hôte.
/// Sur un téléphone physique, relance avec :
/// `flutter run --dart-define=API_BASE_URL=http://IP_DE_TA_MACHINE:8000`
class ApiConfig {
  const ApiConfig._();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: kIsWeb ? 'http://127.0.0.1:8000' : 'http://10.0.2.2:8000',
  );
}
