class TokenPair {
  const TokenPair({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;

  factory TokenPair.fromJson(Map<String, dynamic> json) {
    return TokenPair(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }
}

class BusinessSummary {
  const BusinessSummary({
    required this.id,
    required this.name,
    required this.currency,
    required this.role,
  });

  final String id;
  final String name;
  final String currency;
  final String role;

  factory BusinessSummary.fromJson(Map<String, dynamic> json) {
    return BusinessSummary(
      id: json['id'] as String,
      name: json['name'] as String,
      currency: json['currency'] as String,
      role: json['role'] as String,
    );
  }
}

class UserProfile {
  const UserProfile({
    required this.id,
    required this.phone,
    required this.fullName,
    required this.email,
    required this.phoneVerified,
    required this.activeBusinessId,
    required this.businesses,
  });

  final String id;
  final String phone;
  final String fullName;
  final String? email;
  final bool phoneVerified;
  final String? activeBusinessId;
  final List<BusinessSummary> businesses;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      phone: json['phone'] as String,
      fullName: json['fullName'] as String,
      email: json['email'] as String?,
      phoneVerified: json['phoneVerified'] as bool,
      activeBusinessId: json['activeBusinessId'] as String?,
      businesses: (json['businesses'] as List<dynamic>)
          .map((b) => BusinessSummary.fromJson(b as Map<String, dynamic>))
          .toList(),
    );
  }
}
