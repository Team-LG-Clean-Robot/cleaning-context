import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class ChatBubble extends StatelessWidget {
  const ChatBubble({super.key, required this.question, required this.answer, required this.fallback});
  final String question;
  final String answer;
  final bool fallback;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: kSpacing4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 질문 (오른쪽 정렬)
          Align(
            alignment: Alignment.centerRight,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 280),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: kSpacing4, vertical: kSpacing2),
                decoration: BoxDecoration(
                  color: cs.primary,
                  borderRadius: BorderRadius.circular(kRadiusLg),
                ),
                child: Text(question, style: TextStyle(color: cs.onPrimary)),
              ),
            ),
          ),
          const SizedBox(height: kSpacing2),
          // 답변 (왼쪽 정렬)
          Align(
            alignment: Alignment.centerLeft,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: kSpacing4, vertical: kSpacing2),
                decoration: BoxDecoration(
                  color: cs.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(kRadiusLg),
                  border: Border.all(color: cs.outline),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (fallback)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text('(LLM fallback)',
                            style: TextStyle(
                                fontSize: 11, color: cs.onSurface.withValues(alpha: 0.5))),
                      ),
                    Text(answer, style: const TextStyle(height: 1.5)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
