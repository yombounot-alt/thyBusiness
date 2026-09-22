import 'package:dio/dio.dart';

/// True when the request never got an answer from the server (no network, server unreachable,
/// timeout) — as opposed to the server answering with an error. Only this kind of failure is a
/// reason to fall back to offline data or to queue a sale for later.
bool isConnectionFailure(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionError:
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return true;
    default:
      // badResponse, badCertificate, cancel, unknown, … — the server did answer, or it is not a
      // network problem.
      return false;
  }
}

/// Normalizes the backend's {statusCode, message, error} error shape
/// (see apps/api AllExceptionsFilter) into a single human-readable message.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.isConnectionProblem = false});

  final String message;
  final int? statusCode;

  /// The server could not be reached at all (see [isConnectionFailure]).
  final bool isConnectionProblem;

  factory ApiException.fromDioError(DioException error) {
    final statusCode = error.response?.statusCode;
    final data = error.response?.data;

    if (data is Map && data['message'] != null) {
      final rawMessage = data['message'];
      final message = rawMessage is List ? rawMessage.join('\n') : rawMessage.toString();
      return ApiException(message, statusCode: statusCode);
    }

    if (isConnectionFailure(error)) {
      return ApiException(
        'Impossible de contacter le serveur. Vérifiez votre connexion.',
        isConnectionProblem: true,
      );
    }

    return ApiException(error.message ?? 'Une erreur inattendue est survenue.', statusCode: statusCode);
  }

  @override
  String toString() => message;
}
