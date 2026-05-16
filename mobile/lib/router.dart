import 'package:go_router/go_router.dart';

import 'screens/ask_screen.dart';
import 'screens/explain_screen.dart';
import 'screens/home_screen.dart';
import 'screens/map_screen.dart';
import 'screens/sensors_screen.dart';
import 'screens/shell.dart';
import 'screens/splash_screen.dart';

final router = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
    ShellRoute(
      builder: (context, state, child) => ScaffoldWithBottomNav(child: child),
      routes: [
        GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
        GoRoute(path: '/explain', builder: (_, __) => const ExplainScreen()),
        GoRoute(path: '/ask', builder: (_, __) => const AskScreen()),
        GoRoute(path: '/sensors', builder: (_, __) => const SensorsScreen()),
      ],
    ),
  ],
);
