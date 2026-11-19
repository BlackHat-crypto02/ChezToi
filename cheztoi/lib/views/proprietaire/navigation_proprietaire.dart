import 'dart:async';

import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/services/session.dart';
import 'package:cheztoi/views/commun/chat.dart';
import 'package:cheztoi/views/commun/profil.dart';
import 'package:cheztoi/views/proprietaire/onglets/demande.dart';
import 'package:cheztoi/views/proprietaire/onglets/logement.dart';
import 'package:cheztoi/views/proprietaire/onglets/tableau.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

class NavigationProprietaire extends StatefulWidget {
  const NavigationProprietaire({
    super.key,
    this.utilisateur,
    this.onDeconnexion,
    this.onChangementRole,
  });

  final UtilisateurAuth? utilisateur;
  final Future<void> Function()? onDeconnexion;
  final ValueChanged<UtilisateurAuth>? onChangementRole;

  @override
  State<NavigationProprietaire> createState() => _NavigationProprietaireState();
}

class _NavigationProprietaireState extends State<NavigationProprietaire> {
  int selectedIndex = 0;
  int _versionTableau = 0;
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
    try {
      final total = await ChezToiApi.instance.messagesNonLus();
      if (mounted) setState(() => _messagesNonLus = total);
    } catch (_) {}
  }

  void onIndexTap(int index) {
    setState(() {
      // Le tableau de bord se recharge à chaque retour.
      if (index == 0 && selectedIndex != 0) _versionTableau++;
      selectedIndex = index;
    });
    if (index == 3) _compterMessages();
  }

  Widget _page() {
    switch (selectedIndex) {
      case 1:
        return const MesLogements();
      case 2:
        return const Demande();
      case 3:
        return const Conversations();
      case 4:
        return Profil(
          dansOnglet: true,
          onDeconnexion: widget.onDeconnexion,
          onChangementRole: widget.onChangementRole,
        );
      default:
        return Tableau(
          key: ValueKey('tableau_$_versionTableau'),
          onOngletChange: onIndexTap,
          onNouvelleAnnonce: () async {
            await nouvelleAnnonce(context);
            if (mounted) setState(() => _versionTableau++);
          },
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
        onIndexTap(0);
      },
      child: Scaffold(
        body: _page(),
        bottomNavigationBar: DecoratedBox(
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: Color(0xFFE3EAE8))),
          ),
          child: NavigationBar(
            selectedIndex: selectedIndex,
            onDestinationSelected: onIndexTap,
            destinations: [
              const NavigationDestination(
                icon: Icon(RemixIcons.dashboard_line),
                selectedIcon: Icon(RemixIcons.dashboard_fill),
                label: 'Tableau',
              ),
              const NavigationDestination(
                icon: Icon(RemixIcons.building_3_line),
                selectedIcon: Icon(RemixIcons.building_3_fill),
                label: 'Logements',
              ),
              const NavigationDestination(
                icon: Icon(RemixIcons.calendar_todo_line),
                selectedIcon: Icon(RemixIcons.calendar_todo_fill),
                label: 'Demandes',
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
              const NavigationDestination(
                icon: Icon(RemixIcons.user_3_line),
                selectedIcon: Icon(RemixIcons.user_3_fill),
                label: 'Profil',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
