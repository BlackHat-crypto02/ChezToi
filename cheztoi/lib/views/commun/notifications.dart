import 'package:cheztoi/models/modeles.dart';
import 'package:cheztoi/services/chez_toi_api.dart';
import 'package:cheztoi/views/commun/reservations.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

IconData iconeNotification(String type) {
  if (type.startsWith('reservation')) return RemixIcons.calendar_check_line;
  return switch (type) {
    'message' => RemixIcons.chat_3_line,
    'alerte' => RemixIcons.notification_badge_line,
    'annonce_validee' => RemixIcons.checkbox_circle_line,
    'annonce_refusee' || 'annonce_suspendue' => RemixIcons.error_warning_line,
    'avis' => RemixIcons.star_line,
    _ => RemixIcons.information_line,
  };
}

/// Centre de notifications. `onOuvrirMessages` bascule sur l'onglet Messages.
class Notifications extends StatefulWidget {
  const Notifications({super.key, this.onOuvrirMessages});

  final VoidCallback? onOuvrirMessages;

  @override
  State<Notifications> createState() => _NotificationsState();
}

class _NotificationsState extends State<Notifications> {
  late Future<List<NotificationApp>> _futur = ChezToiApi.instance
      .notifications();

  Future<void> _recharger() async {
    final futur = ChezToiApi.instance.notifications();
    setState(() => _futur = futur);
    await futur.catchError((_) => <NotificationApp>[]);
  }

  Future<void> _toutLire() async {
    try {
      await ChezToiApi.instance.lireNotifications();
      _recharger();
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    }
  }

  Future<void> _ouvrir(NotificationApp n) async {
    if (!n.lue) {
      ChezToiApi.instance.lireNotifications(id: n.id).catchError((_) {});
    }
    final reservation = n.donnees['reservation'];
    final logement = n.donnees['logement'];
    if (reservation is num) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DetailReservation(reservationId: reservation.toInt()),
        ),
      );
    } else if (n.type == 'message' && widget.onOuvrirMessages != null) {
      Navigator.of(context).pop();
      widget.onOuvrirMessages!();
      return;
    } else if (logement is num && n.type == 'alerte') {
      await ouvrirLogement(context, logement.toInt());
    }
    if (mounted) _recharger();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(onPressed: _toutLire, child: const Text('Tout lire')),
        ],
      ),
      body: FutureBuilder<List<NotificationApp>>(
        future: _futur,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Chargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(erreur: snapshot.error!, onReessayer: _recharger);
          }
          final notifications = snapshot.data!;
          if (notifications.isEmpty) {
            return const EtatVide(
              icone: RemixIcons.notification_3_line,
              titre: 'Aucune notification',
              message:
                  'Vous serez prévenu ici de vos réservations, messages '
                  'et nouvelles annonces.',
            );
          }
          return RefreshIndicator(
            onRefresh: _recharger,
            child: ListView.separated(
              itemCount: notifications.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final n = notifications[i];
                return ListTile(
                  tileColor: n.lue
                      ? null
                      : Styles.primaire.withValues(alpha: 0.05),
                  onTap: () => _ouvrir(n),
                  leading: CircleAvatar(
                    backgroundColor: Styles.primaire.withValues(alpha: 0.1),
                    child: Icon(
                      iconeNotification(n.type),
                      color: Styles.primaire,
                    ),
                  ),
                  title: Text(
                    n.titre,
                    style: TextStyle(
                      fontWeight: n.lue ? FontWeight.normal : FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(n.message, maxLines: 3),
                  trailing: Text(
                    formatMoment(n.creeLe),
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
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

/// Icône cloche avec le nombre de notifications non lues.
class ClocheNotifications extends StatefulWidget {
  const ClocheNotifications({
    super.key,
    this.onOuvrirMessages,
    this.couleur = Styles.primaire,
  });

  final VoidCallback? onOuvrirMessages;
  final Color couleur;

  @override
  State<ClocheNotifications> createState() => _ClocheNotificationsState();
}

class _ClocheNotificationsState extends State<ClocheNotifications> {
  int _nonLues = 0;

  @override
  void initState() {
    super.initState();
    _actualiser();
  }

  Future<void> _actualiser() async {
    try {
      final total = await ChezToiApi.instance.notificationsNonLues();
      if (mounted) setState(() => _nonLues = total);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Notifications',
      padding: EdgeInsets.zero,
      onPressed: () async {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) =>
                Notifications(onOuvrirMessages: widget.onOuvrirMessages),
          ),
        );
        _actualiser();
      },
      icon: Badge(
        isLabelVisible: _nonLues > 0,
        label: Text('$_nonLues'),
        backgroundColor: Colors.red,
        child: Icon(
          RemixIcons.notification_3_line,
          size: 26,
          color: widget.couleur,
        ),
      ),
    );
  }
}
