enum DashboardPeriod {
  today('Aujourd\'hui'),
  week('Semaine'),
  month('Mois'),
  year('Année');

  const DashboardPeriod(this.label);

  final String label;
}

double _number(Object? value) => (value as num).toDouble();

class DashboardSummary {
  const DashboardSummary({
    required this.revenue,
    required this.cogs,
    required this.expensesTotal,
    required this.profit,
    required this.ordersCount,
    required this.lowStockCount,
    required this.outstandingCredits,
    required this.overdueCreditsCount,
  });

  /// Chiffre d'affaires of completed (non-voided) sales in the period.
  final double revenue;

  /// Cost of the goods sold (purchase price snapshot × quantity).
  final double cogs;
  final double expensesTotal;

  /// Estimated profit = revenue − cogs − expenses (can be negative).
  final double profit;
  final int ordersCount;

  /// Alerts are a current snapshot, not tied to the period.
  final int lowStockCount;
  final double outstandingCredits;
  final int overdueCreditsCount;

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    return DashboardSummary(
      revenue: _number(json['revenue']),
      cogs: _number(json['cogs']),
      expensesTotal: _number(json['expensesTotal']),
      profit: _number(json['profit']),
      ordersCount: (json['ordersCount'] as num).toInt(),
      lowStockCount: (json['lowStockCount'] as num).toInt(),
      outstandingCredits: _number(json['outstandingCredits']),
      overdueCreditsCount: (json['overdueCreditsCount'] as num).toInt(),
    );
  }

  bool get hasAlerts => lowStockCount > 0 || overdueCreditsCount > 0;
}

class SalesChartPoint {
  const SalesChartPoint({required this.date, required this.revenue});

  final DateTime date;
  final double revenue;

  factory SalesChartPoint.fromJson(Map<String, dynamic> json) {
    // "2026-09-16" parses as a local calendar day.
    return SalesChartPoint(
      date: DateTime.parse(json['date'] as String),
      revenue: _number(json['revenue']),
    );
  }
}

class TopProduct {
  const TopProduct({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.revenue,
  });

  final String productId;
  final String name;
  final double quantity;
  final double revenue;

  factory TopProduct.fromJson(Map<String, dynamic> json) {
    return TopProduct(
      productId: json['productId'] as String,
      name: json['name'] as String,
      quantity: _number(json['quantity']),
      revenue: _number(json['revenue']),
    );
  }
}
