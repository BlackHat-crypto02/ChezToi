import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';
import 'package:video_player/video_player.dart';

/// Lecture plein écran d'une vidéo d'annonce.
class LecteurVideo extends StatefulWidget {
  const LecteurVideo({super.key, required this.url, this.titre = 'Vidéo'});

  final String url;
  final String titre;

  @override
  State<LecteurVideo> createState() => _LecteurVideoState();
}

class _LecteurVideoState extends State<LecteurVideo> {
  late final VideoPlayerController _controleur =
      VideoPlayerController.networkUrl(Uri.parse(widget.url));
  bool _erreur = false;

  @override
  void initState() {
    super.initState();
    _controleur
        .initialize()
        .then((_) {
          if (!mounted) return;
          setState(() {});
          _controleur.play();
        })
        .catchError((_) {
          if (mounted) setState(() => _erreur = true);
        });
    _controleur.addListener(_actualiser);
  }

  void _actualiser() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _controleur.removeListener(_actualiser);
    _controleur.dispose();
    super.dispose();
  }

  String _duree(Duration d) =>
      '${d.inMinutes}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final pret = _controleur.value.isInitialized;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.titre),
      ),
      body: Center(
        child: _erreur
            ? const Text(
                'Impossible de lire cette vidéo.',
                style: TextStyle(color: Colors.white70),
              )
            : !pret
            ? const CircularProgressIndicator(color: Colors.white)
            : GestureDetector(
                onTap: () => _controleur.value.isPlaying
                    ? _controleur.pause()
                    : _controleur.play(),
                child: AspectRatio(
                  aspectRatio: _controleur.value.aspectRatio,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      VideoPlayer(_controleur),
                      if (!_controleur.value.isPlaying)
                        const CircleAvatar(
                          radius: 32,
                          backgroundColor: Colors.black54,
                          child: Icon(
                            RemixIcons.play_fill,
                            color: Colors.white,
                            size: 36,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
      ),
      bottomNavigationBar: pret
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Row(
                  children: [
                    Text(
                      _duree(_controleur.value.position),
                      style: const TextStyle(color: Colors.white70),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: VideoProgressIndicator(
                          _controleur,
                          allowScrubbing: true,
                          colors: const VideoProgressColors(
                            playedColor: Styles.primaire,
                          ),
                        ),
                      ),
                    ),
                    Text(
                      _duree(_controleur.value.duration),
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
