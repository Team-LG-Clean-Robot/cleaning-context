import time

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.schemas.simulation import RoomScore
from app.services import llm_explainer

router = APIRouter()


class AskRequest(BaseModel):
    context_summary: str
    rooms: list[RoomScore]
    question: str = Field(..., min_length=1, max_length=200)


class AskResponse(BaseModel):
    answer: str
    fallback: bool
    duration_ms: int


SYSTEM_PROMPT = """당신은 가정용 로봇청소기의 청소 의사결정을 사용자에게 설명하는 AI입니다.

규칙:
- 사용자의 후속 질문에 대해 주어진 점수표와 컨텍스트만 근거로 답합니다.
- 점수 숫자를 직접 인용하지 말고 "오염 가능성이 높다", "사용자가 머무른다", "취침 시간이 가까워" 등 맥락 언어로 표현.
- 점수를 직접 다시 계산하지 않습니다. 점수표의 '주요 근거' 항목을 그대로 인용해 답변을 구체화하세요.
- 응답은 한국어 2~4문장(200자 이내), 단일 단락.
- 질문이 점수표·컨텍스트로 답할 수 없는 내용이라면 솔직히 "이 정보로는 답할 수 없습니다"라고 답하세요."""


USER_TEMPLATE = """컨텍스트: {summary}

점수표:
{table}

사용자 질문: {question}

위 점수표를 바탕으로 답변하세요."""

FALLBACK_TEXT = "AI 답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요."


@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest) -> AskResponse:
    t0 = time.perf_counter()
    s = llm_explainer.get_settings()
    if not s.timely_api_key:
        return AskResponse(
            answer=FALLBACK_TEXT,
            fallback=True,
            duration_ms=int((time.perf_counter() - t0) * 1000),
        )

    user_prompt = USER_TEMPLATE.format(
        summary=req.context_summary,
        table=llm_explainer._format_score_table(req.rooms),
        question=req.question.strip(),
    )
    try:
        resp = llm_explainer._client().chat.completions.create(
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
            return AskResponse(
                answer=FALLBACK_TEXT,
                fallback=True,
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        return AskResponse(
            answer=text,
            fallback=False,
            duration_ms=int((time.perf_counter() - t0) * 1000),
        )
    except Exception:
        return AskResponse(
            answer=FALLBACK_TEXT,
            fallback=True,
            duration_ms=int((time.perf_counter() - t0) * 1000),
        )
