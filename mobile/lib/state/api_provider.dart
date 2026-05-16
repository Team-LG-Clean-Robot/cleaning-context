import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/dio_client.dart';
import '../api/endpoints.dart';

final dioProvider = Provider((ref) => buildDio());

final endpointsProvider = Provider((ref) => Endpoints(ref.watch(dioProvider)));
