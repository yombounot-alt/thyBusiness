/// Base URL of the local THY Business API (see apps/api, default port 3333).
///
/// - Android emulator: 10.0.2.2 reaches the host machine's localhost.
/// - iOS simulator / desktop: use localhost directly.
/// - Physical device: use your machine's LAN IP (e.g. 192.168.x.x) instead.
const String apiBaseUrl = String.fromEnvironment(
  'THY_API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3333',
);
