import 'package:flutter/widgets.dart';
import 'package:material_ui/material_ui.dart';

class Favoris extends StatefulWidget {
  const Favoris({super.key});

  @override
  State<Favoris> createState() => _FavorisState();
}

class _FavorisState extends State<Favoris> {
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Favoris'));
  }
}
