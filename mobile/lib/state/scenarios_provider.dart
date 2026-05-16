import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/event.dart';
import '../api/models/scenario.dart';
import 'api_provider.dart';

final scenariosProvider = FutureProvider<List<Scenario>>((ref) async {
  final api = ref.watch(endpointsProvider);
  return api.scenarios();
});

final eventsProvider = FutureProvider<List<EventInfo>>((ref) async {
  final api = ref.watch(endpointsProvider);
  return api.events();
});
