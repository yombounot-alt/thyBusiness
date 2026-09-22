import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/paginated.dart';
import '../../../core/providers.dart';
import '../../auth/application/auth_selectors.dart';
import '../data/payment_method_models.dart';
import '../data/payment_models.dart';
import '../data/payments_api.dart';

final paymentMethodsApiProvider = Provider<PaymentMethodsApi>(
  (ref) => PaymentMethodsApi(ref.watch(dioProvider)),
);

final paymentsApiProvider = Provider<PaymentsApi>((ref) => PaymentsApi(ref.watch(dioProvider)));

/// Only the owner changes the payment settings and verifies payments (the server enforces it too).
final isOwnerProvider = Provider<bool>((ref) => ref.watch(activeBusinessProvider)?.role == 'owner');

/// The options the owner configured (all of them for the owner, only the active ones for a cashier).
final paymentOptionsProvider = FutureProvider.autoDispose<List<PaymentOption>>(
  (ref) => ref.watch(paymentMethodsApiProvider).list(),
);

final paymentProvider = FutureProvider.autoDispose.family<ManualPayment, String>(
  (ref, id) => ref.watch(paymentsApiProvider).get(id),
);

/// The payments of one status (null = all), newest first.
final paymentsListProvider = FutureProvider.autoDispose.family<Paginated<ManualPayment>, String?>(
  (ref, status) => ref.watch(paymentsApiProvider).list(status: status),
);

/// How often the "N paiements à vérifier" badge looks again. Null switches the timer off (tests).
final paymentSummaryRefreshProvider = Provider<Duration?>((ref) => const Duration(seconds: 60));

final paymentSummaryProvider = FutureProvider.autoDispose<PaymentSummary>((ref) async {
  // Verifying is the owner's job: nobody else needs the count.
  if (!ref.watch(isOwnerProvider)) return PaymentSummary.zero;

  final every = ref.watch(paymentSummaryRefreshProvider);
  if (every != null) {
    final timer = Timer(every, ref.invalidateSelf);
    ref.onDispose(timer.cancel);
  }
  try {
    return await ref.watch(paymentsApiProvider).summary();
  } on ApiException {
    return PaymentSummary.zero; // offline: no badge rather than an error on every screen
  }
});

/// Payments the customers declared and the owner has not checked yet.
final paymentsToVerifyProvider = Provider.autoDispose<int>(
  (ref) => ref.watch(paymentSummaryProvider).value?.submitted ?? 0,
);

/// The logo bytes of an option (through the authenticated API), or null when there is none or it
/// cannot be loaded — the caller then shows the icon of the provider.
final paymentLogoProvider = FutureProvider.autoDispose.family<Uint8List?, String>((
  ref,
  optionId,
) async {
  try {
    return await ref.watch(paymentMethodsApiProvider).fetchLogo(optionId);
  } on ApiException {
    return null;
  }
});

final paymentProofProvider = FutureProvider.autoDispose.family<Uint8List?, String>((
  ref,
  paymentId,
) async {
  try {
    return await ref.watch(paymentsApiProvider).fetchProof(paymentId);
  } on ApiException {
    return null;
  }
});

/// Copies text for the customer (number, code, amount). Behind a provider so tests can see what
/// was copied without a platform channel.
typedef ClipboardWriter = Future<void> Function(String text);

final clipboardWriterProvider = Provider<ClipboardWriter>(
  (ref) => (text) => Clipboard.setData(ClipboardData(text: text)),
);

/// "Payer maintenant": opens the phone dialer with the USSD code the OWNER configured. The app
/// never invents a code — it depends on the operator and the country.
typedef UssdLauncher = Future<bool> Function(String code);

final ussdLauncherProvider = Provider<UssdLauncher>(
  (ref) => (code) => launchUrl(Uri(scheme: 'tel', path: code)),
);
