import '../data/auth_models.dart';

/// [unreachable]: tokens are stored but the profile could not be loaded (no network and nothing
/// cached, or the server is down). The session is NOT lost — the splash offers to retry.
enum AuthStatus { unknown, unauthenticated, needsBusiness, authenticated, unreachable }

class AuthState {
  const AuthState({this.status = AuthStatus.unknown, this.profile});

  final AuthStatus status;
  final UserProfile? profile;

  AuthState copyWith({AuthStatus? status, UserProfile? profile}) {
    return AuthState(status: status ?? this.status, profile: profile ?? this.profile);
  }
}
