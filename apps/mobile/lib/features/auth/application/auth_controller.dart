import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/offline/offline_providers.dart';
import '../../../core/providers.dart';
import '../data/auth_api.dart';
import '../data/auth_models.dart';
import 'auth_state.dart';

final authApiProvider = Provider<AuthApi>((ref) => AuthApi(ref.watch(dioProvider)));

final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    // Fire-and-forget: the splash screen stays up (via router redirect) until this resolves.
    _restoreSession();
    return const AuthState();
  }

  Future<void> _restoreSession() async {
    final token = await ref.read(tokenStorageProvider).readAccessToken();
    if (token == null) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }
    await _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await ref.read(authApiProvider).me();
      // Cached answers belong to this user + business only.
      ref.read(offlineScopeProvider.notifier).set('${profile.id}:${profile.activeBusinessId}');
      state = AuthState(
        status: profile.activeBusinessId != null
            ? AuthStatus.authenticated
            : AuthStatus.needsBusiness,
        profile: profile,
      );
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        // The server itself says this session is over.
        await _endSession();
      } else {
        // No network / server down: keep the session, let the user retry. Being offline must
        // never log anyone out (logging back in needs the network).
        state = const AuthState(status: AuthStatus.unreachable);
      }
    } catch (_) {
      state = const AuthState(status: AuthStatus.unreachable);
    }
  }

  /// Retry from the "cannot reach the server" splash.
  Future<void> retry() async {
    state = const AuthState();
    await _restoreSession();
  }

  Future<void> _endSession() async {
    await ref.read(tokenStorageProvider).clear();
    ref.read(offlineScopeProvider.notifier).set(null);
    await ref.read(offlineCacheProvider).clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> signup({
    required String phone,
    required String password,
    required String fullName,
    String? email,
  }) {
    return ref.read(authApiProvider).signup(
      phone: phone,
      password: password,
      fullName: fullName,
      email: email,
    );
  }

  Future<void> sendOtp({required String phone, required String purpose}) {
    return ref.read(authApiProvider).sendOtp(phone: phone, purpose: purpose);
  }

  Future<void> verifyOtp({
    required String phone,
    required String purpose,
    required String code,
  }) async {
    final tokens = await ref.read(authApiProvider).verifyOtp(
      phone: phone,
      purpose: purpose,
      code: code,
    );
    await _persistAndLoad(tokens);
  }

  Future<void> login({required String phone, required String password}) async {
    final tokens = await ref.read(authApiProvider).login(phone: phone, password: password);
    await _persistAndLoad(tokens);
  }

  /// Called by the business-creation flow once a business has been created and the
  /// server has reissued tokens carrying the new businessId/role claims.
  Future<void> onBusinessCreated(TokenPair tokens) => _persistAndLoad(tokens);

  Future<void> logout() async {
    final storage = ref.read(tokenStorageProvider);
    final refreshToken = await storage.readRefreshToken();
    if (refreshToken != null) {
      try {
        await ref.read(authApiProvider).logout(refreshToken);
      } catch (_) {
        // Best-effort server-side revocation; clearing local tokens below is what matters.
      }
    }
    await _endSession();
  }

  Future<void> _persistAndLoad(TokenPair tokens) async {
    await ref.read(tokenStorageProvider).saveTokens(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    );
    await _loadProfile();
  }
}
