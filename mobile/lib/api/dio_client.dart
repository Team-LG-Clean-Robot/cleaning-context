import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

const String kBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://cleaning-context-backend.onrender.com',
);

Dio buildDio() {
  final dio = Dio(
    BaseOptions(
      baseUrl: kBaseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 35),
      contentType: 'application/json',
      responseType: ResponseType.json,
    ),
  );
  dio.interceptors.add(_ColdStartRetryInterceptor());
  if (kDebugMode) {
    dio.interceptors.add(
      LogInterceptor(
        requestBody: false,
        responseBody: false,
        request: true,
        responseHeader: false,
      ),
    );
  }
  return dio;
}

/// Render Free tier cold start (~30s) — 5xx/timeout 1회 재시도.
class _ColdStartRetryInterceptor extends Interceptor {
  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final status = err.response?.statusCode ?? 0;
    final isColdStart = status == 502 ||
        status == 503 ||
        status == 504 ||
        err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.connectionError;
    final alreadyRetried = err.requestOptions.extra['retried'] == true;
    if (isColdStart && !alreadyRetried) {
      err.requestOptions.extra['retried'] = true;
      await Future<void>.delayed(const Duration(seconds: 4));
      try {
        final res = await Dio(err.requestOptions.copyWith(baseUrl: '')..baseUrl = kBaseUrl)
            .fetch<dynamic>(err.requestOptions);
        handler.resolve(res);
        return;
      } catch (_) {
        // fall through to next interceptor
      }
    }
    handler.next(err);
  }
}
