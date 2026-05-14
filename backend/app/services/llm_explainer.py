from functools import lru_cache

from openai import OpenAI

from app.config import get_settings
from app.data_loader import load_rooms
from app.schemas.simulation import RoomScore

FALLBACK_TEXT = "AI 설명을 가져오지 못했습니다. 점수 근거는 아래 표를 참고하세요."

SYSTEM_PROMPT = """당신은 가정용 로봇청소기의 의사결정을 사용자에게 설명하는 AI입니다.

규칙:
- 점수 계산을 직접 하지 않습니다. 주어진 점수표를 자연어로 해석만 합니다.
- 응답은 한국어 200~300자, 단일 단락.
- 다음 두 질문에 답하는 구조로 작성:
  ① 왜 [최상위 공간]을 먼저 청소하는가
  ② 왜 [excluded 공간]을 제외 또는 [delayed/quiet 공간]을 지연/저소음으로 처리하는가
- 점수 숫자를 직접 인용하지 말고 "오염 가능성이 높다", "사용자가 머무른다", "취침 시간이 가까워" 등 맥락 언어로 표현.
- 반드시 점수표의 '주요 근거'를 인용해 설명을 구체화."""

USER_TEMPLATE = """컨텍스트: {summary}

점수표:
{table}

위 점수표를 바탕으로 설명을 생성하세요."""


@lru_cache
def _client() -> OpenAI:
    s = get_settings()
    return OpenAI(api_key=s.timely_api_key, base_url=s.timely_base_url, timeout=s.llm_timeout_sec)


_MODE_KO = {"normal": "일반", "quiet": "저소음", "delayed": "지연", "excluded": "제외"}


def _format_score_table(scores: list[RoomScore]) -> str:
    rooms = load_rooms()
    lines = ["| 공간 | 최종 | 모드 | 주요 근거 |", "|---|---:|---|---|"]
    for r in scores:
        room_name = rooms[r.room_id].name_ko if r.room_id in rooms else r.room_id
        mode_ko = _MODE_KO.get(r.mode, r.mode)
        top = sorted(r.breakdown, key=lambda c: abs(c.delta), reverse=True)[:2]
        reasons = ", ".join(f"{c.label_ko}({c.delta:+d})" for c in top)
        lines.append(f"| {room_name} | {r.final} | {mode_ko} | {reasons} |")
    return "\n".join(lines)


def generate_explanation(
    context_summary: str, scores: list[RoomScore]
) -> tuple[str, bool]:
    """Returns (text, fallback). fallback=True means LLM unavailable or errored."""
    s = get_settings()
    if not s.timely_api_key:
        return FALLBACK_TEXT, True

    user_prompt = USER_TEMPLATE.format(
        summary=context_summary, table=_format_score_table(scores)
    )
    try:
        resp = _client().chat.completions.create(
            model=s.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=400,
        )
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            return FALLBACK_TEXT, True
        return text, False
    except Exception:
        return FALLBACK_TEXT, True
