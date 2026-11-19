import 'package:cheztoi/services/auth_service.dart';
import 'package:flutter/foundation.dart';

/// Utilisateur connecté (null = invité), accessible partout et observable.
class Session {
  const Session._();

  static final ValueNotifier<UtilisateurAuth?> utilisateur =
      ValueNotifier<UtilisateurAuth?>(null);

  static int? get id => utilisateur.value?.id;

  static bool get estConnecte => utilisateur.value != null;

  static bool get estProprietaire =>
      utilisateur.value?.estProprietaire ?? false;

  /// Remplace toute la navigation par l'espace adapté (invité / locataire /
  /// propriétaire). Branché par `MyApp`.
  static void Function(UtilisateurAuth? utilisateur)? ouvrirEspace;

  /// Déconnexion complète puis retour à l'espace invité. Branché par `MyApp`.
  static Future<void> Function()? deconnecter;
}
