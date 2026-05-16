import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/ask.dart';
import '../api/models/room_score.dart';
import 'api_provider.dart';

class ChatTurn {
  const ChatTurn({required this.question, required this.answer, required this.fallback});
  final String question;
  final String answer;
  final bool fallback;
}

class AskState {
  const AskState({this.turns = const [], this.loading = false, this.error});
  final List<ChatTurn> turns;
  final bool loading;
  final String? error;

  AskState copyWith({List<ChatTurn>? turns, bool? loading, String? error}) =>
      AskState(turns: turns ?? this.turns, loading: loading ?? this.loading, error: error);
}

class AskController extends StateNotifier<AskState> {
  AskController(this._ref) : super(const AskState());
  final Ref _ref;

  void clear() => state = const AskState();

  Future<void> send(
    String question, {
    String? contextSummary,
    List<RoomScore>? rooms,
  }) async {
    if (question.trim().isEmpty) return;
    state = state.copyWith(loading: true, error: null);
    try {
      final api = _ref.read(endpointsProvider);
      final res = await api.ask(AskRequest(
        contextSummary: contextSummary,
        rooms: rooms,
        question: question,
      ));
      state = state.copyWith(
        turns: [
          ...state.turns,
          ChatTurn(question: question, answer: res.answer, fallback: res.fallback),
        ],
        loading: false,
      );
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }
}

final askControllerProvider =
    StateNotifierProvider<AskController, AskState>((ref) => AskController(ref));
