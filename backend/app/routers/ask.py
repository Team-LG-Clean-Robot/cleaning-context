import time

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.schemas.simulation import RoomScore
from app.services import llm_explainer

router = APIRouter()


class AskRequest(BaseModel):
    context_summary: str = ""
    rooms: list[RoomScore] = Field(default_factory=list)
    question: str = Field(..., min_length=1, max_length=200)


class AskResponse(BaseModel):
    answer: str
    fallback: bool
    duration_ms: int


GROUNDED_PROMPT = """당신은 가정용 로봇청소기의 청소 의사결정을 사용자에게 설명하는 AI입니다.

규칙:
- 사용자의 후속 질문에 대해 주어진 점수표와 컨텍스트만 근거로 답합니다.
- 점수 숫자를 직접 인용하지 말고 "오염 가능성이 높다", "사용자가 머무른다", "취침 시간이 가까워" 등 맥락 언어로 표현.
- 점수를 직접 다시 계산하지 않습니다. 점수표의 '주요 근거' 항목을 그대로 인용해 답변을 구체화하세요.
- 응답은 한국어 2~4문장(200자 이내), 단일 단락.
- 질문이 점수표·컨텍스트로 답할 수 없는 내용이라면 솔직히 "이 정보로는 답할 수 없습니다"라고 답하세요."""


GENERAL_PROMPT = """당신은 "생활 맥락 로봇청소기 시뮬레이터"의 AI 어시스턴트입니다.
이 프로젝트는 LG전자 가전 멘토링 트랙(성균관대 RISE)의 팀 "럭키 금성"이 개발 중인 시뮬레이터입니다.

핵심 아이디어:
- 로봇청소기가 시간·날씨·이벤트·공간 상태를 종합해 어디를·언제·어떻게 청소할지 판단하고 이유를 자연어로 설명.
- 5-Layer 구조: ① Spatial(공간) ② Behavioral(이벤트) ③ Context(상황 추론) ④ Decision(Rule-based 점수) ⑤ Explainable(LLM 설명).
- Rule-based 점수 엔진과 LLM 설명을 분리해 결정론·재현성·설명 가능성을 동시에 확보.
- 시나리오 4종: 비 오는 날 귀가 / 요리 직후 / 취침 직전 / 손님 방문 예정.

규칙:
- 응답은 한국어 2~4문장(200자 이내), 단일 단락.
- 모르거나 점수 디테일이 필요한 질문이면 "시나리오를 하나 선택하시면 점수 근거로 답할 수 있습니다"라고 안내.
- 추측·환각 금지. 위 프로젝트 컨텍스트에 없는 내용은 모른다고 답하세요."""


GROUNDED_USER_TEMPLATE = """컨텍스트: {summary}

점수표:
{table}

사용자 질문: {question}

위 점수표를 바탕으로 답변하세요."""


GENERAL_USER_TEMPLATE = """사용자 질문: {question}"""

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

    if req.rooms:
        system_prompt = GROUNDED_PROMPT
        user_prompt = GROUNDED_USER_TEMPLATE.format(
            summary=req.context_summary,
            table=llm_explainer._format_score_table(req.rooms),
            question=req.question.strip(),
        )
    else:
        system_prompt = GENERAL_PROMPT
        user_prompt = GENERAL_USER_TEMPLATE.format(question=req.question.strip())

    try:
        resp = llm_explainer._client().chat.completions.create(
            model=s.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
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
