import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/api_provider.dart';
import '../theme/tokens.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  String _status = '서버 깨우는 중...';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _warmup());
  }

  Future<void> _warmup() async {
    try {
      final api = ref.read(endpointsProvider);
      final health = await api.health();
      final coldStart = health['cold_start'] == true;
      if (coldStart) {
        setState(() => _status = '서버가 깨어났어요. 잠시 후 진입합니다...');
        await Future<void>.delayed(const Duration(milliseconds: 600));
      }
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _status = '연결 실패. 백엔드를 확인해주세요.\n$e');
      await Future<void>.delayed(const Duration(seconds: 3));
      if (mounted) context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 1,
              height: 32,
              color: cs.primary,
              margin: const EdgeInsets.only(bottom: kSpacing4),
            ),
            Text('로보틱',
                style: TextStyle(
                    fontSize: 28, fontWeight: FontWeight.w600, color: cs.onSurface)),
            const SizedBox(height: kSpacing2),
            Text('Explainable Physical AI',
                style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.5))),
            const SizedBox(height: kSpacing12),
            SizedBox(
                width: 80,
                child: LinearProgressIndicator(color: cs.primary, backgroundColor: cs.surfaceContainerHighest)),
            const SizedBox(height: kSpacing4),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: kSpacing8),
              child: Text(_status,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.6))),
            ),
          ],
        ),
      ),
    );
  }
}
