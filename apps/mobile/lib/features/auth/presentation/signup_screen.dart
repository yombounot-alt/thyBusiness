import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../application/auth_controller.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController(text: '+224');
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _acceptedTerms = false;
  bool _acceptedPrivacy = false;
  bool _loading = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_acceptedTerms || !_acceptedPrivacy) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez accepter les conditions et la politique de confidentialité.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final phone = _phoneController.text.trim();
      await ref.read(authControllerProvider.notifier).signup(
        phone: phone,
        password: _passwordController.text,
        fullName: _fullNameController.text.trim(),
        email: _emailController.text.trim(),
      );
      if (!mounted) return;
      context.go('/otp-verify?phone=${Uri.encodeComponent(phone)}&purpose=signup');
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Créer un compte')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppTextField(
                  controller: _fullNameController,
                  label: 'Nom complet',
                  validator: (v) => (v == null || v.trim().length < 2) ? 'Nom requis' : null,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  controller: _phoneController,
                  label: 'Téléphone (+224...)',
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || !RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(v.trim())) {
                      return 'Numéro invalide (format international requis)';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                AppTextField(
                  controller: _emailController,
                  label: 'Email (facultatif)',
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return null;
                    return RegExp(r'^.+@.+\..+$').hasMatch(v.trim()) ? null : 'Email invalide';
                  },
                ),
                const SizedBox(height: 16),
                AppTextField(
                  controller: _passwordController,
                  label: 'Mot de passe',
                  obscureText: true,
                  validator: (v) =>
                      (v == null || v.length < 8) ? 'Au moins 8 caractères' : null,
                ),
                const SizedBox(height: 8),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: _acceptedTerms,
                  onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
                  title: const Text("J'accepte les conditions d'utilisation"),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: _acceptedPrivacy,
                  onChanged: (v) => setState(() => _acceptedPrivacy = v ?? false),
                  title: const Text("J'accepte la politique de confidentialité"),
                ),
                const SizedBox(height: 16),
                PrimaryButton(label: 'Créer mon compte', onPressed: _submit, loading: _loading),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
