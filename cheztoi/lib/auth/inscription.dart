import 'package:cheztoi/widget/styles.dart';
import 'package:material_ui/material_ui.dart';

enum TypeCompte { locataire, proprietaire }

enum StatutLocataire { salarie, etudiant, independant, retraite, autre }

class Inscription extends StatefulWidget {
  const Inscription({super.key});

  @override
  State<Inscription> createState() => _InscriptionState();
}

class _InscriptionState extends State<Inscription> {
  static const Map<StatutLocataire, String> _statuts = {
    StatutLocataire.salarie: 'Salarié(e)',
    StatutLocataire.etudiant: 'Étudiant(e)',
    StatutLocataire.independant: 'Indépendant(e)',
    StatutLocataire.retraite: 'Retraité(e)',
    StatutLocataire.autre: 'Autre',
  };

  final _formKey = GlobalKey<FormState>();
  final _nomC = TextEditingController();
  final _prenomC = TextEditingController();
  final _emailC = TextEditingController();
  final _telephoneC = TextEditingController();
  final _passwordC = TextEditingController();
  final _confirmationC = TextEditingController();

  TypeCompte _type = TypeCompte.locataire;
  StatutLocataire _statut = StatutLocataire.salarie;
  String? _nbBiens = '1';
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    for (final controller in [
      _nomC,
      _prenomC,
      _emailC,
      _telephoneC,
      _passwordC,
      _confirmationC,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  InputDecoration _decoration(String label, {IconData? icon, String? hint}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: icon != null ? Icon(icon) : null,
      filled: true,
      fillColor: Colors.white,
      border: Styles.border(Colors.grey.shade300),
      enabledBorder: Styles.border(Colors.grey.shade300),
      focusedBorder: Styles.border(Styles.violet, width: 2),
    );
  }

  Widget _titreSection(String texte) {
    return Text(
      texte.toUpperCase(),
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.bold,
        letterSpacing: 1,
        color: Styles.violet,
      ),
    );
  }

  Future<void> _inscrire() async {
    if (!_formKey.currentState!.validate()) return;

    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);

    // Le backend n'est pas encore branché : on simule une courte attente.
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;

    setState(() => _isLoading = false);
    final profil =
        _type == TypeCompte.locataire ? 'locataire' : 'propriétaire';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Compte $profil prêt à être créé 🚧'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _formulaireLocataire(Key key) {
    return Column(
      key: key,
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<StatutLocataire>(
          initialValue: _statut,
          decoration: _decoration('Situation professionnelle',
              icon: Icons.work_outline),
          items: _statuts.entries
              .map(
                (e) => DropdownMenuItem<StatutLocataire>(
                  value: e.key,
                  child: Text(e.value),
                ),
              )
              .toList(),
          onChanged: (value) {
            if (value != null) setState(() => _statut = value);
          },
        ),
      ],
    );
  }

  Widget _formulaireProprio(Key key) {
    return Column(
      key: key,
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue: _nbBiens,
          decoration: _decoration('Biens à louer', icon: Icons.apartment_outlined),
          items: const [
            DropdownMenuItem(value: '1', child: Text('1 bien')),
            DropdownMenuItem(value: '2-5', child: Text('2 à 5 biens')),
            DropdownMenuItem(value: '6-20', child: Text('6 à 20 biens')),
            DropdownMenuItem(value: '20+', child: Text('Plus de 20 biens')),
          ],
          onChanged: (value) => setState(() => _nbBiens = value),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Styles.fond,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 460),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: Image.asset(
                            'assets/logo_cheztoi.png',
                            width: 90,
                            height: 90,
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Créer mon compte',
                          textAlign: TextAlign.center,
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                color: Styles.violet,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Choisissez votre profil pour commencer.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: Colors.grey.shade600),
                        ),
                        const SizedBox(height: 24),

                        Row(
                          children: [
                            Expanded(
                              child: _RoleButton(
                                icon: Icons.search_rounded,
                                label: 'Locataire',
                                selected: _type == TypeCompte.locataire,
                                onTap: () => setState(
                                  () => _type = TypeCompte.locataire,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _RoleButton(
                                icon: Icons.home_outlined,
                                label: 'Propriétaire',
                                selected: _type == TypeCompte.proprietaire,
                                onTap: () => setState(
                                  () => _type = TypeCompte.proprietaire,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        _titreSection('Informations personnelles'),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _nomC,
                                textInputAction: TextInputAction.next,
                                decoration: _decoration('Nom'),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Requis';
                                  }
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                controller: _prenomC,
                                textInputAction: TextInputAction.next,
                                decoration: _decoration('Prénom'),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Requis';
                                  }
                                  return null;
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _emailC,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.email],
                          decoration: _decoration('Adresse e-mail',
                              icon: Icons.alternate_email,
                              hint: 'vous@exemple.com'),
                          validator: (value) {
                            final text = value?.trim() ?? '';
                            if (text.isEmpty) return 'Veuillez saisir votre e-mail';
                            if (!text.contains('@') || !text.contains('.')) {
                              return 'Adresse e-mail invalide';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _telephoneC,
                          keyboardType: TextInputType.phone,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.telephoneNumber],
                          decoration: _decoration('Téléphone',
                              icon: Icons.phone_outlined),
                          validator: (value) {
                            final text = value?.trim() ?? '';
                            if (text.isEmpty) return 'Veuillez saisir un numéro';
                            if (text.length < 8) return 'Numéro trop court';
                            return null;
                          },
                        ),
                        const SizedBox(height: 24),

                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          child: _type == TypeCompte.locataire
                              ? _formulaireLocataire(
                                  const ValueKey('locataire'))
                              : _formulaireProprio(
                                  const ValueKey('proprietaire')),
                        ),
                        const SizedBox(height: 24),

                        _titreSection('Sécurité'),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _passwordC,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.newPassword],
                          decoration: _decoration(
                            'Mot de passe',
                            icon: Icons.lock_outline,
                          ).copyWith(
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
                              return 'Veuillez choisir un mot de passe';
                            }
                            if (value.length < 6) return 'Au moins 6 caractères';
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _confirmationC,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _inscrire(),
                          decoration: _decoration('Confirmer le mot de passe',
                              icon: Icons.lock_reset_outlined),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Confirmez votre mot de passe';
                            }
                            if (value != _passwordC.text) {
                              return 'Les mots de passe ne correspondent pas';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        FilledButton(
                          onPressed: _isLoading ? null : _inscrire,
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
                                  'Créer mon compte',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Déjà un compte ? Se connecter'),
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

class _RoleButton extends StatelessWidget {
  const _RoleButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? Styles.violet : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? Styles.violet : Colors.grey.shade300,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 26,
              color: selected ? Colors.white : Styles.violet,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : Styles.violet,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
