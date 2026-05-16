import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/ask_controller.dart';
import '../state/simulation_controller.dart';
import '../theme/tokens.dart';
import '../widgets/chat_bubble.dart';

class AskScreen extends ConsumerStatefulWidget {
  const AskScreen({super.key});
  @override
  ConsumerState<AskScreen> createState() => _AskScreenState();
}

class _AskScreenState extends ConsumerState<AskScreen> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();

  static const _suggestionsGrounded = [
    '왜 거실보다 현관이 먼저야?',
    '침실은 왜 제외야?',
    '지금 바로 청소하면 시끄러워?',
  ];
  static const _suggestionsGeneral = [
    'Rule-based랑 LLM은 어떻게 나눠져 있어?',
    '센서가 없어도 작동해?',
    '이 앱은 어떤 IoT 기기랑 연동돼?',
  ];

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _send(String q) {
    final sim = ref.read(simulationControllerProvider);
    String? summary;
    final rooms = sim is SimLoaded ? sim.response.rooms : null;
    summary = sim is SimLoaded ? sim.response.contextSummary : null;
    ref.read(askControllerProvider.notifier).send(q, contextSummary: summary, rooms: rooms);
    _ctrl.clear();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent + 200,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final ask = ref.watch(askControllerProvider);
    final sim = ref.watch(simulationControllerProvider);
    final grounded = sim is SimLoaded;
    final suggestions = grounded ? _suggestionsGrounded : _suggestionsGeneral;

    return Column(
      children: [
        Expanded(
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.all(kSpacing4),
            children: [
              if (ask.turns.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: kSpacing8),
                  child: Text(
                    grounded
                        ? '시나리오에 대해 자유롭게 질문해보세요.'
                        : '시나리오를 실행하지 않아도 프로젝트 전반에 대해 물을 수 있어요.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: cs.onSurface.withValues(alpha: 0.5)),
                  ),
                ),
              ...ask.turns.map((t) => ChatBubble(
                    question: t.question,
                    answer: t.answer,
                    fallback: t.fallback,
                  )),
              if (ask.loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: kSpacing4),
                  child: Center(child: CircularProgressIndicator()),
                ),
              if (ask.error != null)
                Padding(
                  padding: const EdgeInsets.all(kSpacing2),
                  child: Text(ask.error!, style: TextStyle(color: cs.error)),
                ),
            ],
          ),
        ),

        // 추천 질문 chips
        if (!ask.loading)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: kSpacing4),
            child: Wrap(
              spacing: kSpacing2,
              runSpacing: kSpacing1,
              children: suggestions
                  .map((s) => ActionChip(label: Text(s), onPressed: () => _send(s)))
                  .toList(growable: false),
            ),
          ),

        // 입력 필드
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(kSpacing2),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    decoration: InputDecoration(
                      hintText: '질문을 입력하세요',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(kRadiusMd)),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: kSpacing4, vertical: kSpacing2),
                    ),
                    onSubmitted: _send,
                  ),
                ),
                const SizedBox(width: kSpacing2),
                FilledButton(
                  onPressed: () => _send(_ctrl.text),
                  child: const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
