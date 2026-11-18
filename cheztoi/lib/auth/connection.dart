import 'package:cheztoi/widget/styles.dart';
import 'package:cheztoi/auth/inscription.dart';
import 'package:cheztoi/services/auth_service.dart';
import 'package:material_ui/material_ui.dart';

class Connection extends StatefulWidget {
  const Connection({super.key, this.authService, this.onAuthentifie});

  /// Service injecté pour partager la même session dans toute l'application.
  final AuthService? authService;
  final ValueChanged<UtilisateurAuth>? onAuthentifie;

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
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.red.shade700,
      ),
    );
  }

  void _motDePasseOublie() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Réinitialisation du mot de passe à venir.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double logoSize = constraints.maxWidth < 600 ? 170 : 210;

            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: Image.asset(
                            'assets/logo_cheztoi.png',
                            width: logoSize,
                            height: logoSize,
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Bienvenue sur ChezToi',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: Styles.violet,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Trouvez votre prochain chez-vous en quelques clics.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Colors.grey.shade600,
                              ),
                        ),
                        const SizedBox(height: 32),

                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.email],
                          decoration: InputDecoration(
                            labelText: 'Adresse e-mail',
                            hintText: 'vous@exemple.com',
                            prefixIcon: const Icon(Icons.alternate_email),
                            filled: true,
                            fillColor: Colors.white,
                            border: Styles.border(Colors.grey.shade300),
                            enabledBorder: Styles.border(Colors.grey.shade300),
                            focusedBorder:
                                Styles.border(Styles.violet, width: 2),
                          ),
                          validator: (value) {
                            final text = value?.trim() ?? '';
                            if (text.isEmpty) {
                              return 'Veuillez saisir votre e-mail';
                            }
                            if (!text.contains('@') || !text.contains('.')) {
                              return 'Adresse e-mail invalide';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _seConnecter(),
                          autofillHints: const [AutofillHints.password],
                          decoration: InputDecoration(
                            labelText: 'Mot de passe',
                            prefixIcon: const Icon(Icons.lock_outline),
                            filled: true,
                            fillColor: Colors.white,
                            border: Styles.border(Colors.grey.shade300),
                            enabledBorder: Styles.border(Colors.grey.shade300),
                            focusedBorder:
                                Styles.border(Styles.violet, width: 2),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
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
                        const SizedBox(height: 4),

                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: _motDePasseOublie,
                            child: const Text('Mot de passe oublié ?'),
                          ),
                        ),
                        const SizedBox(height: 8),

                        FilledButton(
                          onPressed: _isLoading ? null : _seConnecter,
                          style: FilledButton.styleFrom(
                            backgroundColor: Styles.violet,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  'Se connecter',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 20),
                          child: Row(
                            children: [
                              Expanded(child: Divider()),
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 12),
                                child: Text(
                                  'ou',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ),
                              Expanded(child: Divider()),
                            ],
                          ),
                        ),

                        OutlinedButton.icon(
                          onPressed: _allerInscription,
                          icon: const Icon(Icons.person_add_outlined),
                          label: const Text('Créer un compte'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Styles.violet,
                            side: const BorderSide(color: Styles.violet),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Locataires et propriétaires, bienvenue à la maison.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
