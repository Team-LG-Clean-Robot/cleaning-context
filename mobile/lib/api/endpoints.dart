import 'package:dio/dio.dart';

import 'models/ask.dart';
import 'models/event.dart';
import 'models/infer_request.dart';
import 'models/infer_response.dart';
import 'models/scenario.dart';
import 'models/simulate_request.dart';
import 'models/simulate_response.dart';

/// 백엔드 6개 endpoint를 한 곳에 모은 thin wrapper.
class Endpoints {
  Endpoints(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> health() async {
    final res = await _dio.get<Map<String, dynamic>>('/api/health');
    return res.data ?? <String, dynamic>{};
  }

  Future<List<Scenario>> scenarios() async {
    final res = await _dio.get<List<dynamic>>('/api/scenarios');
    return (res.data ?? const [])
        .map((j) => Scenario.fromJson(j as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<List<EventInfo>> events() async {
    final res = await _dio.get<List<dynamic>>('/api/events');
    return (res.data ?? const [])
        .map((j) => EventInfo.fromJson(j as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<SimulateResponse> simulate(SimulateRequest req) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/simulate',
      data: req.toJson()..removeWhere((_, v) => v == null),
    );
    return SimulateResponse.fromJson(res.data!);
  }

  Future<AskResponse> ask(AskRequest req) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/ask',
      data: req.toJson()..removeWhere((_, v) => v == null),
    );
    return AskResponse.fromJson(res.data!);
  }

  Future<InferResponse> inferEvents(InferRequest req) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/infer-events',
      data: req.toJson(),
    );
    return InferResponse.fromJson(res.data!);
  }
}
