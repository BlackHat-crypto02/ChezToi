import 'dart:async';

import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/commun/chat.dart';
import 'package:cheztoi/views/locataire/ongles/accueil.dart';
import 'package:cheztoi/views/locataire/ongles/carte.dart';
import 'package:cheztoi/views/locataire/ongles/favoris.dart';
import 'package:cheztoi/views/locataire/ongles/recherche.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

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
    _compterMessages();
    // Le statut vérifié ou le rôle ont pu changer depuis l'administration.
    if (Session.utilisateur.value != null) {
      ChezToiApi.instance
          .rafraichirProfil()
          .then((u) => Session.utilisateur.value = u)
          .ignore();
    }
    _minuterie = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _compterMessages(),
    );
  }

  @override
  void dispose() {
    _minuterie?.cancel();
    super.dispose();
  }

  Future<void> _compterMessages() async {
    if (widget.utilisateur == null) return;
    try {
      final total = await ChezToiApi.instance.messagesNonLus();
      if (mounted) setState(() => _messagesNonLus = total);
    } catch (_) {}
  }

  void onIndexTap(int index) {
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
    switch (selectedIndex) {
      case 1:
        return Recherche(
          key: ValueKey('recherche_$_versionRecherche'),
          criteresInitiaux: _criteres,
        );
      case 2:
        return const Carte();
      case 3:
        return const Favoris();
      case 4:
        return const Conversations();
      default:
        return Accueil(
          onOngletChange: onIndexTap,
          onRecherche: _rechercher,
          prenom: widget.utilisateur?.prenom,
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
        backgroundColor: Styles.fond,
        body: _page(),
        bottomNavigationBar: BottomNavigationBar(
          type: BottomNavigationBarType.fixed,
          currentIndex: selectedIndex,
          onTap: onIndexTap,
          showUnselectedLabels: true,
          selectedItemColor: Styles.violet,
          unselectedItemColor: Colors.grey.shade600,
          backgroundColor: Colors.white,
          elevation: 0,
          items: [
            const BottomNavigationBarItem(
              icon: Icon(RemixIcons.home_2_line),
              activeIcon: Icon(RemixIcons.home_2_fill),
              label: 'Accueil',
            ),
            const BottomNavigationBarItem(
              icon: Icon(RemixIcons.search_2_line),
              activeIcon: Icon(RemixIcons.search_2_fill),
              label: 'Recherche',
            ),
            const BottomNavigationBarItem(
              icon: Icon(RemixIcons.map_2_line),
              activeIcon: Icon(RemixIcons.map_2_fill),
              label: 'Carte',
            ),
            const BottomNavigationBarItem(
              icon: Icon(RemixIcons.heart_3_line),
              activeIcon: Icon(RemixIcons.heart_3_fill),
              label: 'Favoris',
            ),
            BottomNavigationBarItem(
              icon: Badge(
                isLabelVisible: _messagesNonLus > 0,
                label: Text('$_messagesNonLus'),
                child: const Icon(RemixIcons.chat_3_line),
              ),
              activeIcon: const Icon(RemixIcons.chat_3_fill),
              label: 'Messages',
            ),
          ],
        ),
      ),
    );
  }
}
