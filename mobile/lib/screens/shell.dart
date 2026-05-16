import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/theme_controller.dart';

class ScaffoldWithBottomNav extends ConsumerWidget {
  const ScaffoldWithBottomNav({super.key, required this.child});
  final Widget child;

  static const _tabs = [
    ('/home', Icons.home_outlined, Icons.home, '홈'),
    ('/map', Icons.map_outlined, Icons.map, '청소맵'),
    ('/explain', Icons.psychology_outlined, Icons.psychology, '설명'),
    ('/ask', Icons.chat_outlined, Icons.chat, '질문'),
    ('/sensors', Icons.sensors_outlined, Icons.sensors, '센서'),
  ];

  int _indexOfRoute(String location) {
    for (var i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i].$1)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _indexOfRoute(location);
    final mode = ref.watch(themeControllerProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('로보틱', style: TextStyle(fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            tooltip: mode == ThemeMode.dark ? '라이트 모드' : '다크 모드',
            icon: Icon(mode == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode),
            onPressed: () => ref.read(themeControllerProvider.notifier).toggle(),
          ),
        ],
      ),
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: idx,
        onTap: (i) => context.go(_tabs[i].$1),
        items: _tabs
            .map((t) => BottomNavigationBarItem(
                  icon: Icon(t.$2),
                  activeIcon: Icon(t.$3),
                  label: t.$4,
                ))
            .toList(growable: false),
      ),
    );
  }
}
