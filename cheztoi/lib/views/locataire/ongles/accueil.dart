import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

class Accueil extends StatefulWidget {
  const Accueil({super.key});

  @override
  State<Accueil> createState() => _AccueilState();
}

class _AccueilState extends State<Accueil> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: const SizedBox.shrink(),
        leadingWidth: 20,
        titleSpacing: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        title: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              RichText(
                text: const TextSpan(
                  style: TextStyle(
                    fontSize: 25,
                    fontWeight: FontWeight.bold,
                    color: Styles.texte,
                  ),
                  children: [
                    TextSpan(text: 'Chez'),
                    TextSpan(
                      text: 'Toi',
                      style: TextStyle(color: Styles.bleu),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              IconButton(
                padding: EdgeInsets.zero,
                icon: const Icon(
                  RemixIcons.notification_3_line,
                  size: 26,
                  color: Styles.violet,
                ),
                onPressed: () {},
              ),
              IconButton(
                padding: EdgeInsets.zero,
                icon: const Icon(
                  RemixIcons.user_3_line,
                  size: 26,
                  color: Styles.violet,
                ),
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
      body: const Center(child: Text('Accueil')),
    );
  }
}
