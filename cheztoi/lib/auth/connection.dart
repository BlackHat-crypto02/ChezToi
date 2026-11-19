import 'package:cheztoi/auth/inscription.dart';
import 'package:cheztoi/auth/mot_de_passe_oublie.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

class Connection extends StatefulWidget {
  const Connection({
    super.key,
    this.authService,
    this.onAuthentifie,
    this.modale = false,
    this.onContinuerSansCompte,
  });

  /// Service injecté pour partager la même session dans toute l'application.
  final AuthService? authService;
  final ValueChanged<UtilisateurAuth>? onAuthentifie;

  /// Ouverte par-dessus l'application (mode invité) : bouton de fermeture.
  final bool modale;

  /// Affiche « Continuer sans compte » (depuis la présentation).
  final VoidCallback? onContinuerSansCompte;

  @override
  State<Connection> createState() => _ConnectionState();
}

class _ConnectionState extends State<Connection> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  late final AuthService _auth;
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _auth = widget.authService ?? AuthService();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _seConnecter() async {
    if (!_formKey.currentState!.validate()) return;

    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);

    try {
      final utilisateur = await _auth.connexion(
        email: _emailController.text.trim(),
        motDePasse: _passwordController.text,
      );
      if (!mounted) return;
      widget.onAuthentifie?.call(utilisateur);
    } on ApiException catch (e) {
      if (!mounted) return;
      _afficherErreur(e.message);
    } catch (_) {
      if (!mounted) return;
      _afficherErreur('Connexion impossible. Réessayez.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _afficherErreur(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Styles.danger),
    );
  }

  Future<void> _motDePasseOublie() async {
    final email = await Navigator.of(context).push<String>(
      MaterialPageRoute<String>(
        builder: (_) => MotDePasseOublie(
          authService: _auth,
          email: _emailController.text.contains('@')
              ? _emailController.text.trim()
              : '',
        ),
      ),
    );
    if (email != null && mounted) {
      _emailController.text = email;
      _passwordController.clear();
    }
  }

  void _allerInscription() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Inscription(
          authService: _auth,
          onAuthentifie: widget.onAuthentifie,
        ),
      ),
    );
  }

  Widget _entete(double hauteur) {
    return Container(
      height: hauteur,
      decoration: const BoxDecoration(gradient: Styles.degradeMarque),
      child: Stack(
        children: [
          // Formes décoratives.
          Positioned(
            right: -60,
            top: -40,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.07),
              ),
            ),
          ),
          Positioned(
            left: -40,
            bottom: 10,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Styles.menthe.withValues(alpha: 0.12),
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 12, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Image.asset(
                          'assets/logo_cheztoi.png',
                          width: 40,
                          height: 40,
                        ),
                      ),
                      const Spacer(),
                      if (widget.modale)
                        IconButton(
                          tooltip: 'Fermer',
                          onPressed: () => Navigator.of(context).maybePop(),
                          icon: const Icon(RemixIcons.close_line, color: Colors.white),
                        ),
                    ],
                  ),
                  const Spacer(),
                  const Text(
                    'Bienvenue sur ChezToi',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.6,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Trouvez votre prochain chez-vous en quelques clics.',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 44),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hauteurEntete =
        MediaQuery.of(context).size.height < 700 ? 250.0 : 300.0;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        child: Column(
          children: [
            _entete(hauteurEntete),
            Transform.translate(
              offset: const Offset(0, -28),
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Form(
                      key: _formKey,
                      child: AutofillGroup(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Connexion',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 20),
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              autofillHints: const [
                                AutofillHints.email,
                                AutofillHints.telephoneNumber,
                              ],
                              decoration: const InputDecoration(
                                labelText: 'E-mail ou téléphone',
                                hintText: 'vous@exemple.com ou 90 00 00 00',
                                prefixIcon: Icon(RemixIcons.user_3_line),
                              ),
                              validator: (value) {
                                final text = value?.trim() ?? '';
                                if (text.isEmpty) {
                                  return 'Saisissez votre e-mail ou votre téléphone';
                                }
                                if (text.contains('@')) {
                                  return text.contains('.')
                                      ? null
                                      : 'Adresse e-mail invalide';
                                }
                                final chiffres =
                                    text.replaceAll(RegExp(r'\D'), '');
                                return chiffres.length >= 8
                                    ? null
                                    : 'Numéro de téléphone invalide';
                              },
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _seConnecter(),
                              autofillHints: const [AutofillHints.password],
                              decoration: InputDecoration(
                                labelText: 'Mot de passe',
                                prefixIcon: const Icon(RemixIcons.lock_2_line),
                                suffixIcon: IconButton(
                                  tooltip: _obscurePassword
                                      ? 'Afficher le mot de passe'
                                      : 'Masquer le mot de passe',
                                  icon: Icon(
                                    _obscurePassword
                                        ? RemixIcons.eye_line
                                        : RemixIcons.eye_off_line,
                                  ),
                                  onPressed: () => setState(
                                    () => _obscurePassword = !_obscurePassword,
                                  ),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Veuillez saisir votre mot de passe';
                                }
                                if (value.length < 6) {
                                  return 'Au moins 6 caractères';
                                }
                                return null;
                              },
                            ),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: _motDePasseOublie,
                                child: const Text('Mot de passe oublié ?'),
                              ),
                            ),
                            const SizedBox(height: 4),
                            FilledButton(
                              onPressed: _isLoading ? null : _seConnecter,
                              child: _isLoading
                                  ? const SizedBox(
                                      height: 22,
                                      width: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.4,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Text('Se connecter'),
                            ),
                            const SizedBox(height: 20),
                            Wrap(
                              alignment: WrapAlignment.center,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                const Text(
                                  'Nouveau sur ChezToi ?',
                                  style: TextStyle(color: Styles.texteDoux),
                                ),
                                TextButton(
                                  onPressed: _allerInscription,
                                  child: const Text('Créer un compte'),
                                ),
                              ],
                            ),
                            if (widget.onContinuerSansCompte != null)
                              TextButton.icon(
                                onPressed: widget.onContinuerSansCompte,
                                icon: const Icon(RemixIcons.compass_3_line),
                                label: const Text('Continuer sans compte'),
                                style: TextButton.styleFrom(
                                  foregroundColor: Styles.texteDoux,
                                ),
                              ),
                            const SizedBox(height: 8),
                            const Text(
                              'Locataires et propriétaires, bienvenue à la maison.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: Styles.texteDoux,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
