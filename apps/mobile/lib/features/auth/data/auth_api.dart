import 'package:dio/dio.dart';

import '../../../core/api/api_exception.dart';
import 'auth_models.dart';

class AuthApi {
  AuthApi(this._dio);

  final Dio _dio;

  Future<void> signup({
    required String phone,
    required String password,
    required String fullName,
    String? email,
  }) async {
    try {
      await _dio.post(
        '/auth/signup',
        data: {
          'phone': phone,
          'password': password,
          'fullName': fullName,
          if (email != null && email.isNotEmpty) 'email': email,
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> sendOtp({required String phone, required String purpose}) async {
    try {
      await _dio.post('/auth/otp/send', data: {'phone': phone, 'purpose': purpose});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<TokenPair> verifyOtp({
    required String phone,
    required String purpose,
    required String code,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/otp/verify',
        data: {'phone': phone, 'purpose': purpose, 'code': code},
      );
      return TokenPair.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<TokenPair> login({required String phone, required String password}) async {
    try {
      final response = await _dio.post('/auth/login', data: {'phone': phone, 'password': password});
      return TokenPair.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> logout(String refreshToken) async {
    try {
      await _dio.post('/auth/logout', data: {'refreshToken': refreshToken});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<UserProfile> me() async {
    try {
      final response = await _dio.get('/auth/me');
      return UserProfile.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
