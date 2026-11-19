import 'dart:async';

import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/api_client.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/commun/signalement.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Onglet « Messages » : liste des conversations (locataire et propriétaire).
class Conversations extends StatefulWidget {
  const Conversations({super.key});

  @override
  State<Conversations> createState() => _ConversationsState();
}

class _ConversationsState extends State<Conversations> {
  late Future<List<Conversation>> _futur = ChezToiApi.instance.conversations();

  Future<void> _recharger() async {
    final futur = ChezToiApi.instance.conversations();
    setState(() => _futur = futur);
    await futur.catchError((_) => <Conversation>[]);
  }

  Future<void> _ouvrir(Conversation conversation) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ChatPage(conversation: conversation),
      ),
    );
    _recharger();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        title: const Text('Messages'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        automaticallyImplyLeading: false,
      ),
      body: FutureBuilder<List<Conversation>>(
        future: _futur,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Chargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
          }
          final conversations = snapshot.data!;
          if (conversations.isEmpty) {
            return const EtatVide(
              icone: RemixIcons.chat_smile_2_line,
              titre: 'Aucune conversation',
              message:
                  'Contactez un propriétaire depuis la fiche d’un logement '
                  'pour démarrer une discussion.',
            );
          }
          return RefreshIndicator(
            onRefresh: _recharger,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: conversations.length,
              separatorBuilder: (_, _) => const Divider(height: 1, indent: 76),
              itemBuilder: (_, i) {
                final c = conversations[i];
                return ListTile(
                  onTap: () => _ouvrir(c),
                  leading: Avatar(initiales: c.interlocuteur.initiales),
                  title: Text(
                    c.interlocuteur.nomComplet,
                    style: TextStyle(
                      fontWeight: c.nonLus > 0
                          ? FontWeight.bold
                          : FontWeight.w500,
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (c.logementTitre.isNotEmpty)
                        Text(
                          c.logementTitre,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Styles.violet,
                          ),
                        ),
                      Text(
                        '${c.dernierEstMoi ? 'Vous : ' : ''}${c.dernierMessage}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        formatMoment(c.dernierMessageLe),
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (c.nonLus > 0)
                        Badge(
                          label: Text('${c.nonLus}'),
                          backgroundColor: Styles.bleu,
                        )
                      else if (c.bloquee)
                        const Icon(
                          RemixIcons.forbid_line,
                          size: 16,
                          color: Colors.grey,
                        ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

/// Discussion : rafraîchie toutes les 4 secondes tant que l'écran est ouvert.
class ChatPage extends StatefulWidget {
  const ChatPage({super.key, required this.conversation});

  final Conversation conversation;

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _saisie = TextEditingController();
  final _defilement = ScrollController();
  final List<Message> _messages = [];
  Timer? _minuterie;
  bool _chargement = true;
  bool _envoi = false;
  late bool _bloquee = widget.conversation.bloquee;
  late bool _bloqueeParMoi = widget.conversation.bloqueeParMoi;

  Conversation get c => widget.conversation;

  @override
  void initState() {
    super.initState();
    _charger();
    _minuterie = Timer.periodic(const Duration(seconds: 4), (_) => _charger());
  }

  @override
  void dispose() {
    _minuterie?.cancel();
    _saisie.dispose();
    _defilement.dispose();
    super.dispose();
  }

  Future<void> _charger() async {
    try {
      final nouveaux = await ChezToiApi.instance.messages(
        c.id,
        apres: _messages.isEmpty ? null : _messages.last.id,
      );
      if (!mounted) return;
      final premierChargement = _chargement;
      setState(() {
        _chargement = false;
        final connus = _messages.map((m) => m.id).toSet();
        _messages.addAll(nouveaux.where((m) => !connus.contains(m.id)));
      });
      if (nouveaux.isNotEmpty || premierChargement) _enBas();
    } catch (_) {
      if (mounted && _chargement) setState(() => _chargement = false);
    }
  }

  void _enBas() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_defilement.hasClients) {
        _defilement.animateTo(
          _defilement.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _envoyer({FichierEnvoi? image}) async {
    final texte = _saisie.text.trim();
    if (texte.isEmpty && image == null) return;
    setState(() => _envoi = true);
    try {
      final message = await ChezToiApi.instance.envoyerMessage(
        c.id,
        texte: texte,
        image: image,
      );
      if (!mounted) return;
      _saisie.clear();
      setState(() {
        if (!_messages.any((m) => m.id == message.id)) _messages.add(message);
      });
      _enBas();
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  Future<void> _envoyerPhoto() async {
    final fichier = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 80,
    );
    if (fichier == null) return;
    await _envoyer(
      image: FichierEnvoi(
        octets: await fichier.readAsBytes(),
        nom: fichier.name,
      ),
    );
  }

  Future<void> _basculerBlocage() async {
    final bloquer = !_bloquee;
    if (bloquer &&
        !await confirmer(
          context,
          titre: 'Bloquer ${c.interlocuteur.nomComplet} ?',
          message:
              'Plus aucun message ne pourra être échangé dans cette '
              'conversation tant que vous ne l’aurez pas débloquée.',
          action: 'Bloquer',
          danger: true,
        )) {
      return;
    }
    try {
      await ChezToiApi.instance.bloquer(c.id, bloquer: bloquer);
      if (mounted) {
        setState(() {
          _bloquee = bloquer;
          _bloqueeParMoi = bloquer;
        });
      }
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    }
  }

  Widget _bulle(Message m) {
    final moi = m.estMoi;
    return Align(
      alignment: moi ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        margin: const EdgeInsets.symmetric(vertical: 3),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
        decoration: BoxDecoration(
          color: moi ? Styles.violet : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(moi ? 16 : 4),
            bottomRight: Radius.circular(moi ? 4 : 16),
          ),
          border: moi ? null : Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          crossAxisAlignment: moi
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            if (m.image != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: ImageLogement(
                    url: m.image,
                    hauteur: 180,
                    largeur: 220,
                  ),
                ),
              ),
            if (m.texte.isNotEmpty)
              Text(
                m.texte,
                style: TextStyle(color: moi ? Colors.white : Styles.texte),
              ),
            const SizedBox(height: 2),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  formatMoment(m.creeLe),
                  style: TextStyle(
                    fontSize: 10,
                    color: moi ? Colors.white70 : Colors.grey,
                  ),
                ),
                if (moi) ...[
                  const SizedBox(width: 4),
                  Icon(
                    m.lu ? RemixIcons.check_double_line : RemixIcons.check_line,
                    size: 13,
                    color: m.lu ? Colors.lightBlueAccent : Colors.white70,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        titleSpacing: 0,
        title: Row(
          children: [
            Avatar(initiales: c.interlocuteur.initiales, rayon: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    c.interlocuteur.nomComplet,
                    style: const TextStyle(fontSize: 16),
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (c.logementTitre.isNotEmpty)
                    Text(
                      c.logementTitre,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Styles.violet,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            onSelected: (choix) {
              switch (choix) {
                case 'logement':
                  ouvrirLogement(context, c.logementId!);
                case 'bloquer':
                  _basculerBlocage();
                case 'signaler':
                  signaler(context, conversationId: c.id);
              }
            },
            itemBuilder: (_) => [
              if (c.logementId != null)
                const PopupMenuItem(
                  value: 'logement',
                  child: Text('Voir le logement'),
                ),
              if (!_bloquee || _bloqueeParMoi)
                PopupMenuItem(
                  value: 'bloquer',
                  child: Text(_bloquee ? 'Débloquer' : 'Bloquer'),
                ),
              const PopupMenuItem(
                value: 'signaler',
                child: Text('Signaler la conversation'),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _chargement
                ? const Chargement()
                : _messages.isEmpty
                ? const EtatVide(
                    icone: RemixIcons.chat_smile_2_line,
                    titre: 'Dites bonjour 👋',
                    message: 'Posez vos questions sur le logement.',
                  )
                : ListView.builder(
                    controller: _defilement,
                    padding: const EdgeInsets.all(12),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => _bulle(_messages[i]),
                  ),
          ),
          if (_bloquee)
            Container(
              width: double.infinity,
              color: Colors.grey.shade200,
              padding: const EdgeInsets.all(14),
              child: SafeArea(
                top: false,
                child: Text(
                  _bloqueeParMoi
                      ? 'Vous avez bloqué cette conversation.'
                      : 'Cette conversation n’accepte plus de messages.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade700),
                ),
              ),
            )
          else
            SafeArea(
              top: false,
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
                child: Row(
                  children: [
                    IconButton(
                      tooltip: 'Envoyer une photo',
                      onPressed: _envoi ? null : _envoyerPhoto,
                      icon: const Icon(
                        RemixIcons.image_add_line,
                        color: Styles.violet,
                      ),
                    ),
                    Expanded(
                      child: TextField(
                        controller: _saisie,
                        minLines: 1,
                        maxLines: 4,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: InputDecoration(
                          hintText: 'Votre message…',
                          filled: true,
                          fillColor: Styles.fond,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(22),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    IconButton.filled(
                      tooltip: 'Envoyer',
                      style: IconButton.styleFrom(
                        backgroundColor: Styles.violet,
                      ),
                      onPressed: _envoi ? null : () => _envoyer(),
                      icon: const Icon(RemixIcons.send_plane_2_fill),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
