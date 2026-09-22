import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thy_business/app.dart';
import 'package:thy_business/core/providers.dart';
import 'package:thy_business/features/auth/application/auth_controller.dart';
import 'package:thy_business/features/dashboard/application/dashboard_providers.dart';

import 'fakes.dart';

void main() {
  testWidgets('unauthenticated user lands on the onboarding screen', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [tokenStorageProvider.overrideWithValue(FakeTokenStorage())],
        child: const ThyBusinessApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Gérez votre commerce simplement'), findsOneWidget);
    expect(find.text('Commencer'), findsOneWidget);
  });

  testWidgets('logging in with an active business leads to the dashboard', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tokenStorageProvider.overrideWithValue(FakeTokenStorage()),
          authApiProvider.overrideWithValue(FakeAuthApi()),
          dashboardApiProvider.overrideWithValue(FakeDashboardApi()),
        ],
        child: const ThyBusinessApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Se connecter'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), '+224600000000');
    await tester.enterText(find.byType(TextFormField).at(1), 'Demo1234!');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Se connecter'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Bonjour, Tamba'), findsOneWidget);
    expect(find.text('Boutique Demo'), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('a restored session goes straight to the dashboard and can log out', (tester) async {
    await pumpAuthenticatedApp(tester);
    expect(find.textContaining('Bonjour, Tamba'), findsOneWidget);

    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Plus')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Déconnexion'));
    await tester.pumpAndSettle();

    expect(find.text('Commencer'), findsOneWidget);
  });
}
