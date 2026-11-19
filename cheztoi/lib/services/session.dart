import 'package:cheztoi/services/auth_service.dart';
import 'package:flutter/foundation.dart';

/// Utilisateur connecté, accessible partout et observable
/// (mise à jour après modification du profil ou changement de rôle).
class Session {
  const Session._();

  static final ValueNotifier<UtilisateurAuth?> utilisateur =
      ValueNotifier<UtilisateurAuth?>(null);

  static int? get id => utilisateur.value?.id;

  static bool get estProprietaire =>
      utilisateur.value?.estProprietaire ?? false;
}
