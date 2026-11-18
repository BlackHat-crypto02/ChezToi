import 'package:cheztoi/views/locataire/ongles/accueil.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:cheztoi/views/locataire/ongles/carte.dart';
import 'package:cheztoi/views/locataire/ongles/favoris.dart';
import 'package:cheztoi/views/locataire/ongles/message.dart';
import 'package:cheztoi/views/locataire/ongles/recherche.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

class NavigationLocataire extends StatefulWidget {
  const NavigationLocataire({super.key});

  @override
  State<NavigationLocataire> createState() => _NavigationLocataireState();
}

class _NavigationLocataireState extends State<NavigationLocataire> {
  int selectedIndex = 0;

  List<Widget> get _pages => [
        Accueil(onOngletChange: onIndexTap),
        Recherche(),
        Carte(),
        Favoris(),
        Message(),
      ];

  void onIndexTap(int index) {
    setState(() => selectedIndex = index);
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
        body: _pages[selectedIndex],
        bottomNavigationBar: BottomNavigationBar(
          type: BottomNavigationBarType.fixed,
          currentIndex: selectedIndex,
          onTap: onIndexTap,
          showUnselectedLabels: true,
          selectedItemColor: Styles.violet,
          unselectedItemColor: Colors.grey.shade600,
          backgroundColor: Colors.white,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(RemixIcons.home_2_line),
              label: 'Accueil',
            ),
            BottomNavigationBarItem(
              icon: Icon(RemixIcons.search_2_line),
              label: 'Recherche',
            ),
            BottomNavigationBarItem(
              icon: Icon(RemixIcons.map_2_line),
              label: 'Carte',
            ),
            BottomNavigationBarItem(
              icon: Icon(RemixIcons.heart_3_line),
              label: 'Favoris',
            ),
            BottomNavigationBarItem(
              icon: Icon(RemixIcons.chat_3_line),
              label: 'Messages',
            ),
          ],
        ),
      ),
    );
  }
}
