import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/business_api.dart';

final businessApiProvider = Provider<BusinessApi>((ref) => BusinessApi(ref.watch(dioProvider)));

/// Name, address and phone for receipts.
final businessDetailsProvider = FutureProvider.autoDispose<BusinessDetails>((ref) {
  return ref.watch(businessApiProvider).current();
});
