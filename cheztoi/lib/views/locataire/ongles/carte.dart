import 'package:flutter/widgets.dart';
import 'package:material_ui/material_ui.dart';

class Carte extends StatefulWidget {
  const Carte({super.key});

  @override
  State<Carte> createState() => _CarteState();
}

class _CarteState extends State<Carte> {
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Carte'));
  }
}
