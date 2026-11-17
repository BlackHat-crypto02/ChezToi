import 'package:flutter/widgets.dart';
import 'package:material_ui/material_ui.dart';

class Recherche extends StatefulWidget {
  const Recherche({super.key});

  @override
  State<Recherche> createState() => _RechercheState();
}

class _RechercheState extends State<Recherche> {
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Recherche'));
  }
}
