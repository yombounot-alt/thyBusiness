import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../application/auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController(text: '+224');
  final _passwordController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);
    try {
      await ref.read(authControllerProvider.notifier).login(
        phone: _phoneController.text.trim(),
        password: _passwordController.text,
      );
      // Navigation happens automatically via the router's redirect once auth state updates.
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
      appBar: AppBar(title: const Text('Connexion')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppTextField(
                  controller: _phoneController,
                  label: 'Téléphone',
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || !RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(v.trim())) {
                      return 'Numéro invalide';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                AppTextField(
                  controller: _passwordController,
                  label: 'Mot de passe',
                  obscureText: true,
                  validator: (v) => (v == null || v.isEmpty) ? 'Mot de passe requis' : null,
                ),
                const SizedBox(height: 24),
                PrimaryButton(label: 'Se connecter', onPressed: _submit, loading: _loading),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => context.go('/signup'),
                  child: const Text('Pas encore de compte ? Créer un compte'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
