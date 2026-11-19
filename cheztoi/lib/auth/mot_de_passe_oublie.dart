import 'package:cheztoi/services/auth_service.dart';
import 'package:cheztoi/widget/commun.dart';
import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';
import 'package:remixicon/remixicon.dart';

/// Réinitialisation en deux étapes : e-mail → code à 6 chiffres + nouveau mot de passe.
class MotDePasseOublie extends StatefulWidget {
  const MotDePasseOublie({
    super.key,
    required this.authService,
    this.email = '',
  });

  final AuthService authService;
  final String email;

  @override
  State<MotDePasseOublie> createState() => _MotDePasseOublieState();
}

class _MotDePasseOublieState extends State<MotDePasseOublie> {
  final _formulaire = GlobalKey<FormState>();
  late final _email = TextEditingController(text: widget.email);
  final _code = TextEditingController();
  final _motDePasse = TextEditingController();
  bool _codeEnvoye = false;
  bool _envoi = false;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _motDePasse.dispose();
    super.dispose();
  }

  Future<void> _valider() async {
    if (!_formulaire.currentState!.validate()) return;
    setState(() => _envoi = true);
    try {
      if (!_codeEnvoye) {
        final message = await widget.authService.demanderReinitialisation(
          _email.text,
        );
        if (!mounted) return;
        setState(() => _codeEnvoye = true);
        afficherMessage(context, message);
      } else {
        final message = await widget.authService.confirmerReinitialisation(
          email: _email.text,
          code: _code.text,
          motDePasse: _motDePasse.text,
        );
        if (!mounted) return;
        afficherMessage(context, message);
        Navigator.pop(context, _email.text.trim());
      }
    } catch (e) {
      if (mounted) afficherMessage(context, messageErreur(e), erreur: true);
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      appBar: AppBar(backgroundColor: Styles.fond),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formulaire,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(
                      RemixIcons.lock_unlock_line,
                      size: 56,
                      color: Styles.violet,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Mot de passe oublié',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            color: Styles.violet,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _codeEnvoye
                          ? 'Saisissez le code reçu par e-mail (valable 15 minutes) '
                                'et choisissez un nouveau mot de passe.'
                          : 'Indiquez votre adresse e-mail : nous vous enverrons '
                                'un code de réinitialisation.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 28),
                    TextFormField(
                      controller: _email,
                      enabled: !_codeEnvoye,
                      keyboardType: TextInputType.emailAddress,
                      decoration: decorationChamp(
                        'Adresse e-mail',
                        icone: Icons.alternate_email,
                      ),
                      validator: (v) {
                        final t = v?.trim() ?? '';
                        return t.contains('@') && t.contains('.')
                            ? null
                            : 'Adresse e-mail invalide';
                      },
                    ),
                    if (_codeEnvoye) ...[
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _code,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        decoration: decorationChamp(
                          'Code à 6 chiffres',
                          icone: RemixIcons.shield_keyhole_line,
                        ),
                        validator: (v) =>
                            RegExp(r'^\d{6}$').hasMatch(v?.trim() ?? '')
                            ? null
                            : 'Code invalide',
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _motDePasse,
                        obscureText: true,
                        decoration: decorationChamp(
                          'Nouveau mot de passe',
                          icone: Icons.lock_outline,
                          aide: '8 caractères minimum',
                        ),
                        validator: (v) => (v ?? '').length < 8
                            ? 'Au moins 8 caractères'
                            : null,
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: _envoi
                              ? null
                              : () => setState(() => _codeEnvoye = false),
                          child: const Text('Renvoyer un code'),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _envoi ? null : _valider,
                      style: styleBoutonPrincipal(),
                      child: Text(
                        _envoi
                            ? 'Patientez…'
                            : (_codeEnvoye
                                  ? 'Réinitialiser'
                                  : 'Recevoir le code'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
