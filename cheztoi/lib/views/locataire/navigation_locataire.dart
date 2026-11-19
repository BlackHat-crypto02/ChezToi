import 'dart:async';

import 'package:cheztoi/services/acces.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/commun/chat.dart';
import 'package:cheztoi/views/locataire/ongles/accueil.dart';
import 'package:cheztoi/views/locataire/ongles/carte.dart';
import 'package:cheztoi/views/locataire/ongles/favoris.dart';
import 'package:cheztoi/views/locataire/ongles/recherche.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Espace locataire, ouvert aussi aux invités (utilisateur null) :
/// tout se consulte, la connexion n'est demandée que pour agir.
class NavigationLocataire extends StatefulWidget {
  const NavigationLocataire({
    super.key,
    this.utilisateur,
    this.onDeconnexion,
    this.onChangementRole,
  });

  final UtilisateurAuth? utilisateur;
  final Future<void> Function()? onDeconnexion;
  final ValueChanged<UtilisateurAuth>? onChangementRole;

  @override
  State<NavigationLocataire> createState() => _NavigationLocataireState();
}

class _NavigationLocataireState extends State<NavigationLocataire> {
  int selectedIndex = 0;
  Map<String, dynamic> _criteres = const {};
  int _versionRecherche = 0;
  int _messagesNonLus = 0;
  Timer? _minuterie;

  @override
  void initState() {
    super.initState();
    Session.utilisateur.addListener(_surSession);
    _surSession();
    _minuterie = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _compterMessages(),
    );
    // Le statut vérifié ou le rôle ont pu changer depuis l'administration.
    if (Session.estConnecte) {
      ChezToiApi.instance
          .rafraichirProfil()
          .then((u) => Session.utilisateur.value = u)
          .ignore();
    }
  }

  @override
  void dispose() {
    Session.utilisateur.removeListener(_surSession);
    _minuterie?.cancel();
    super.dispose();
  }

  void _surSession() {
    if (!mounted) return;
    setState(() {});
    _compterMessages();
  }

  Future<void> _compterMessages() async {
    if (!Session.estConnecte) {
      if (_messagesNonLus != 0 && mounted) setState(() => _messagesNonLus = 0);
      return;
    }
    try {
      final total = await ChezToiApi.instance.messagesNonLus();
      if (mounted) setState(() => _messagesNonLus = total);
    } catch (_) {}
  }

  void onIndexTap(int index) {
    HapticFeedback.selectionClick();
    setState(() => selectedIndex = index);
    if (index == 4) _compterMessages();
  }

  void _rechercher(Map<String, dynamic> criteres) {
    setState(() {
      _criteres = criteres;
      _versionRecherche++;
      selectedIndex = 1;
    });
  }

  Widget _page() {
    final connecte = Session.estConnecte;
    switch (selectedIndex) {
      case 1:
        return Recherche(
          key: ValueKey('recherche_$_versionRecherche'),
          criteresInitiaux: _criteres,
        );
      case 2:
        return const Carte();
      case 3:
        return connecte
            ? const Favoris()
            : const Scaffold(
                body: SafeArea(
                  child: InvitationConnexion(
                    icone: RemixIcons.heart_3_line,
                    titre: 'Gardez vos coups de cœur',
                    message: 'Connectez-vous pour enregistrer des logements, '
                        'les retrouver sur tous vos appareils et les comparer.',
                  ),
                ),
              );
      case 4:
        return connecte
            ? const Conversations()
            : const Scaffold(
                body: SafeArea(
                  child: InvitationConnexion(
                    icone: RemixIcons.chat_smile_2_line,
                    titre: 'Échangez avec les propriétaires',
                    message: 'Posez vos questions, organisez une visite et '
                        'suivez vos demandes, le tout depuis l’application.',
                  ),
                ),
              );
      default:
        return Accueil(
          onOngletChange: onIndexTap,
          onRecherche: _rechercher,
          prenom: Session.utilisateur.value?.prenom,
          onDeconnexion: widget.onDeconnexion,
          onChangementRole: widget.onChangementRole,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (selectedIndex == 0) {
          SystemNavigator.pop();
          return;
        }
        setState(() => selectedIndex = 0);
      },
      child: Scaffold(
        body: AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          switchInCurve: Curves.easeOut,
          child: KeyedSubtree(key: ValueKey(selectedIndex), child: _page()),
        ),
        bottomNavigationBar: DecoratedBox(
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: Color(0xFFE3EAE8))),
          ),
          child: NavigationBar(
            selectedIndex: selectedIndex,
            onDestinationSelected: onIndexTap,
            destinations: [
              const NavigationDestination(
                icon: Icon(RemixIcons.home_5_line),
                selectedIcon: Icon(RemixIcons.home_5_fill),
                label: 'Accueil',
              ),
              const NavigationDestination(
                icon: Icon(RemixIcons.search_2_line),
                selectedIcon: Icon(RemixIcons.search_2_fill),
                label: 'Recherche',
              ),
              const NavigationDestination(
                icon: Icon(RemixIcons.map_2_line),
                selectedIcon: Icon(RemixIcons.map_2_fill),
                label: 'Carte',
              ),
              const NavigationDestination(
                icon: Icon(RemixIcons.heart_3_line),
                selectedIcon: Icon(RemixIcons.heart_3_fill),
                label: 'Favoris',
              ),
              NavigationDestination(
                icon: Badge(
                  isLabelVisible: _messagesNonLus > 0,
                  label: Text('$_messagesNonLus'),
                  child: const Icon(RemixIcons.chat_3_line),
                ),
                selectedIcon: const Icon(RemixIcons.chat_3_fill),
                label: 'Messages',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
