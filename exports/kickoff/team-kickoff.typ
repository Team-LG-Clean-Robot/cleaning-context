#import "briefing.typ": briefing, callout, kpi

#show: briefing.with(
  title: "팀 럭키 금성 킥오프",
  subtitle: "생활 맥락 로봇청소기 시뮬레이터 — LG전자 가전 멘토링 트랙",
  meta: "2026-05-14 · 성균관대 RISE AI Intensive Project",
)

#callout[*한 줄.* "청소를 잘하는 로봇"이 아니라 *"왜 이렇게 청소했는지 설명하는 로봇"* — 단순 자동화에서 상황 이해·설명 가능한 Physical AI Agent (스스로 판단하고 행동하는 가정용 AI) 로의 시장 포지션 이동을 제안.]

== 우리는 무엇을 만드는가

#kpi("개발 기간", "3주", delta: "5/13 ~ 5/30")
#kpi("팀 구성", "4명", delta: "글로벌경영 3 · 인공지능 1")
#kpi("최종 발표", "5/30", delta: "8슬라이드 + 라이브 데모")

사용자 신뢰 격차 (autonomy trust gap — AI 자율 모드를 켰다 꺼버리는 사용자 페인) 를 해소하는, *LG ThinQ 에 그대로 얹을 수 있는 디바이스 측 explainable decision layer*. 로봇청소기가 시간·날씨·이벤트를 종합해 어디를·언제·어떻게 청소할지 결정하고, 그 이유를 자연어로 설명하는 웹 시뮬레이터로 layer 의 작동을 보여준다.

라이브: #link("https://robot-cleaner.askewly.com/")[`robot-cleaner.askewly.com`] (backup #link("https://cleaning-context.vercel.app/")[`cleaning-context.vercel.app`]) · 백엔드 (서버): #link("https://cleaning-context-backend.onrender.com/api/health")[`cleaning-context-backend.onrender.com/api/health`]

=== 문제 정의

현재 로봇청소기는 *공간*은 인식하지만 *상황·맥락*은 이해하지 못한다. 다음 같은 판단을 못 한다.

- 오늘은 비가 와서 현관 오염 가능성이 높다
- 사용자가 운동 후 귀가해 현관·거실 먼지가 늘었다
- 사용자가 곧 잘 시간이라 침실 청소는 피해야 한다
- 손님이 곧 도착하므로 거실·현관 청소를 서둘러야 한다

사용자가 AI 가전의 자율 행동을 신뢰하지 못하는 핵심 이유는 *설명 부재*다. "왜 지금 청소하지?" 의문에 답하지 못하면, 결국 자율 기능을 끄고 수동 모드로 회귀한다. *자율성의 병목은 청소 성능이 아니라 설명 가능성*이다 — 이 격차를 메우는 layer 가 본 프로젝트의 산출물.

=== 시장의 빈 자리

#table(
  columns: (1fr, 2fr),
  align: (left, left),
  [*제품*], [*강점 / 한계*],
  [LG CodeZero AI], [SLAM (로봇이 집안 지도를 그리며 자기 위치를 파악하는 기술) · 장애물 인식 강점. *상황 맥락 추론·자연어 설명 없음*],
  [삼성 비스포크 제트봇], [객체 인식 카메라. *이벤트 기반 우선순위 변경 없음*],
  [로보락 S8 Pro Ultra], [자동 비움·물걸레. *사용자가 명령 입력 필요*],
  [에코백스 X2 Omni], [듀얼 카메라. *시간 예약 중심*],
)

모든 경쟁사가 *청소 성능·하드웨어 사양*에서 경쟁 중. *AI 의사결정의 설명 가능성*은 미개척 영역.

#pagebreak()

== 어떻게 만드는가 — 5-Layer 구조

시스템은 입력이 들어오면 다음 *5개 레이어 (단계)* 를 거쳐 결과를 만든다. 추상적이라 와닿지 않을 수 있어, *"비 오는 날 귀가" 시나리오 하나로 처음부터 끝까지 따라간다*.

#callout[*상황.* 저녁 8시 30분, 비 옴, 사용자 방금 귀가, 23:00 취침 예정, 현관 청소 2일 경과.]

=== Layer 01 · Spatial — 공간 이해

집 구조와 각 방의 속성을 안다. 5개 방 (현관·거실·주방·침실·욕실) 각각에 *오염도·사용 빈도·소음 민감도 (예: 침실은 매우 민감)·최근 청소 시각*이 정의돼 있다. → 화면 왼쪽 `HouseMap` (집 평면도 컴포넌트) 이 이 정보를 시각화.

=== Layer 02 · Behavioral — 사용자 행동

7개 이벤트 (비·귀가·요리·취침 예정·손님 방문·운동 후 귀가·외출) 와 각 이벤트가 공간별 점수에 미치는 영향이 매핑되어 있다. → 이번 시나리오에선 *"비"+"귀가" 두 이벤트 동시 활성*. "비" → 현관 +20, "귀가" → 현관 +15·거실 +10.

=== Layer 03 · Context — 상황 추론

시간·이벤트·공간 상태·날씨를 LLM (Large Language Model — ChatGPT 같은 대규모 언어 모델) 이 자연어 컨텍스트로 재구성. → 예시 출력: _"저녁 8시 30분, 비가 오고 있다. 사용자가 방금 귀가했고 약 2시간 30분 후 취침 예정이다. 현관은 이틀 동안 청소되지 않았다."_

=== Layer 04 · Decision — 의사결정

Rule-based scoring engine (정해진 규칙대로 컴퓨터가 점수를 계산하는 부분, AI 미사용) 이 공간별 priority score (우선순위 점수) 를 계산.

#table(
  columns: (1fr, auto, auto, auto, auto, auto),
  align: (left, center, center, center, center, center),
  [*공간*], [*기본*], [*비*], [*귀가*], [*취침 페널티*], [*최종*],
  [현관], [30], [+20], [+15], [0], [*65*],
  [거실], [25], [+5], [+10], [0], [*40*],
  [주방], [20], [0], [0], [0], [*20*],
  [침실], [15], [0], [0], [-30], [*-15 (제외)*],
)

→ 우선순위: *현관 → 거실 → 주방, 침실 제외*.

=== Layer 05 · Explainable — 이유 설명

LLM이 점수표를 사람 말로 해석. 화면 오른쪽 `ExplanationCard` 에 표시.

#callout[_"오늘은 비가 와서 현관 오염 가능성이 높고, 사용자가 방금 귀가했기 때문에 현관을 우선 청소합니다. 사용자가 거실로 이동할 가능성이 높아 거실도 보조 청소합니다. 침실은 취침 시간(23:00)이 가까워 소음을 줄이기 위해 제외했습니다."_]

=== Rule-based 와 LLM 의 역할 분리 (차별화 메시지)

이 프로젝트의 가장 큰 리스크는 "그냥 GPT 붙인 거 아니냐"라는 비판. 이를 방어하기 위해 *AI(LLM) 와 Rule-based system (규칙 기반 시스템) 의 역할을 명확히 분리*.

#table(
  columns: (1fr, 1fr),
  align: (left, left),
  [*Rule-based Scoring Engine (규칙 점수 엔진)*], [*LLM Explainer (AI 설명기)*],
  [입력: 이벤트 + 공간 상태 + 시간 + 날씨\
  출력: 공간별 priority score\
  *결정론적* (같은 입력엔 매번 같은 결과). 일관성·재현성·디버깅 가능],
  [입력: 점수표 + 컨텍스트 요약\
  출력: 자연어 설명 (왜 X부터, 왜 Y 제외)\
  점수 계산엔 *관여하지 않음*],
)

추가로 *ML (Machine Learning — 머신러닝) 이벤트 분류기* (scikit-learn — Python 머신러닝 라이브러리) — 시간·요일·직전 occupancy (방마다 사람이 있었나 기록) 시퀀스에서 현재 이벤트를 자동 추정. 발표 슬라이드 6번 (데이터·ML 파트) 에서 정확도·confusion matrix (예측 결과를 한 표로 정리해 어디서 틀렸나 보여주는 그래프) 로 *"데이터 활용·AI 실무 역량"* 증명.

=== 데모 시나리오 4종 + 직접 입력 모드

#table(
  columns: (1fr, 2fr, 2fr),
  align: (left, left, left),
  [*시나리오*], [*입력*], [*핵심 의사결정*],
  [비 오는 날 귀가], [20:30 · 비 · 사용자 귀가 · 취침 2h], [현관 우선 + 침실 제외 (취침 페널티)],
  [요리 직후], [19:20 · 요리 완료 · 거실에 머무름], [주방 즉시 + 거실 지연],
  [취침 직전], [22:50 · 취침 30분 · 침실에 머무름], [침실·거실 제외 + 현관·주방 저소음],
  [손님 방문 예정], [17:00 · 2h 후 방문 · 거실·현관 청소 공백], [거실·현관 우선 + 침실 후순위],
)

추가로 *"직접 입력" 모드* — 멘토 질의 시 시간·위치·이벤트 7개 다중선택해서 임의 상황 즉석 시연 가능.

*AI 어시스턴트 (자유 대화).* 홈 화면에 항상 노출되는 채팅 패널. 시나리오 미선택 상태에선 프로젝트·5-Layer·시나리오 4종 컨텍스트로 답하고, 시뮬레이션 후엔 점수표 근거의 grounded 모드로 자동 전환. 멘토 즉석 질문도 점수표 인용으로 받음.

#pagebreak()

== 누가 무엇을 하는가

=== 팀 구성 (PLANNING §12)

#table(
  columns: (1fr, 1fr, 3fr),
  align: (left, left, left),
  [*이름*], [*전공*], [*역할*],
  [*전유성* (팀장)], [글로벌경영], [총괄·일정·백엔드 (FastAPI) · LLM 통합·AI 채팅 (`/api/ask`) · 디자인 시스템 (Minimal · DESIGN.md) · 멘토 커뮤니케이션·배포 관리],
  [*김준성*], [글로벌경영], [시장·경쟁 제품 조사 (LG·삼성·로보락 사례 보강) · 공개 IoT 데이터셋 발굴 → 박주상에게 인계 · *PPT 8슬라이드 리드*],
  [*박주상*], [인공지능], [ML 이벤트 분류 모델 (scikit-learn — DT/RF/GB) 학습·평가 · LLM 프롬프트 엔지니어링 · 분류기 성능 발표 · *멘토 기술 Q&A 보조*],
  [*조현서*], [글로벌경영], [*역할 확정 예정 — 5/15 저녁 킥오프*. `docs/ASSIGNABLE_TASKS.md` 의 A~F 항목에서 본인 강점·관심사 따라 2~3개 선택],
)

=== 이번 주 액션 — 멘토 미팅 (5/16 토 09:00) 까지

오늘(5/15) 까지 완료된 항목: HouseMap 디자인 폴리시·AI 채팅 (`/api/ask`) · Minimal 디자인 시스템 부팅·새 도메인 `robot-cleaner.askewly.com` · 시연 스크립트 `docs/DEMO_SCRIPT.md`.

#table(
  columns: (auto, 3fr, 1fr, auto),
  align: (center, left, left, center),
  [*No.*], [*항목*], [*담당*], [*예상*],
  [P0-3], [멘토 질의 예상 리스트 + 답변 준비 (비즈니스 = 전유성 / 기술 디테일 = 박주상)], [전유성·박주상], [1h],
  [P0-4], [`docs/onboarding/조현서-작업가이드.md` 작성 (역할 확정 후)], [전유성], [30분],
  [P0-5], [Render warm-up curl 08:55 1회 (미팅 직전)], [전유성], [1분],
)

=== 멘토 미팅 후 ~ 2주차 마감 (5/26 월) 까지

#table(
  columns: (auto, 3fr, 1fr, auto),
  align: (center, left, left, center),
  [*No.*], [*항목*], [*담당*], [*예상*],
  [P1-4], [공개 IoT 데이터셋 선정·다운로드 (UCI ADL — 일상생활 활동 공개 데이터셋, 1순위 후보)], [박주상], [1h],
  [P1-5], [데이터 전처리 파이프라인 (시간 binning — 시간대 단위로 묶기, occupancy → 라벨)], [박주상], [2h],
  [P1-6], [모델 학습·평가 (DecisionTree → RandomForest → GB — 점차 정확도 높은 예측 모델 순서로 비교, 75%↑)], [박주상], [2h],
  [P1-7], [ML 분류기 → API 통합 (`POST /api/classify-event`)], [박주상 PR · 전유성 리뷰], [1h],
  [P1-8~], [시장·페르소나·디자인 작업 — `docs/ASSIGNABLE_TASKS.md` 의 A·B·C·F 카테고리 참조. 저녁 미팅에서 김준성·조현서에게 배정 확정], [TBD], [TBD],
)

#callout[*박주상 워크플로우.* M1~M6 의 ML 작업은 별도 plan-mode (Claude Code 의 단계별 계획 세션) 으로 진행. 데이터셋 선택부터 모델 비교·평가까지 단일 흐름. 결과 산출물: `models/{name}.joblib` (학습된 모델 파일) + `reports/metrics.json` (정확도 지표) + confusion matrix 이미지 (발표 슬라이드 직접 사용).]

=== 3주차 (5/25 ~ 5/30) — 발표 준비

#table(
  columns: (auto, 3fr, 1fr),
  align: (center, left, left),
  [*No.*], [*항목*], [*담당*],
  [P2-10], [발표 PPT 8슬라이드 작성 — Hook → 문제 → 관점 → 솔루션 → 데모 → 데이터·ML → 시장 → Closing], [김준성 리드 + 전체],
  [P2-11], [라이브 데모 백업 영상 녹화 (라이브 실패 대비)], [전유성],
  [P2-12], [발표 리허설 3회 이상], [전체],
  [P2-13], [사업계획서 hwp 양식 최종본 제출], [전유성],
)

#pagebreak()

== 일정 — 한눈에 보기

#table(
  columns: (1fr, 2fr, auto),
  align: (left, left, center),
  [*기간*], [*핵심 산출물*], [*상태*],
  [W1 (5/13 ~ 5/14)], [사업계획서 v2 · 설계 문서 5종 · 백엔드 MVP (pytest 24/24) · 프론트 MVP · Render+Vercel 배포 · 시장 출처 4건], [✅],
  [W2 전반 (5/15)], [팀 킥오프 4인 · 디자인 시스템 부팅 (Minimal) · AI 채팅 (`/api/ask`) · 새 도메인 · DEMO_SCRIPT · 포지셔닝 리프레이밍 (B+A+C)], [✅],
  [W2 후반 (5/16 ~ 5/26)], [*멘토 1차 미팅 (5/16 토 09:00)* · 페르소나 인터뷰 (조현서) · ML 이벤트 분류기 (박주상) · 시장 보강 (김준성)], [🔄],
  [W3 (5/27 ~ 5/30)], [발표 PPT 8슬라이드 (김준성 리드) · 데모 영상 백업 · 리허설 3회 · *최종 발표 5/30*], [⬜],
)

== 알려진 이슈 & 리스크

#table(
  columns: (auto, 2fr, 2fr),
  align: (left, left, left),
  [*No.*], [*항목*], [*대응*],
  [I1], [Render 무료 tier cold start (한동안 안 쓰면 첫 요청에 서버 깨우는 시간) \~30초], [미팅 30분 전 warm-up curl, 사전 캐시 시드로 4시나리오 응답 즉시],
  [I2], [Custom 모드 · AI 채팅은 LLM 캐시 미사용 → 응답 \~3-5초], [시연은 preset 위주, custom·채팅은 "확장 데모" 위치],
  [I3], [시나리오 3 침실 점수 PLANNING(-35) vs 코드(-25) 불일치], [PLANNING 각주 또는 룰 재조정],
  [R1], [컨셉 PPT 로 끝남 → 차별성 약화], [작동 데모 + Methodology 카드 화면 노출로 이미 방어 완료],
  [R2], [범위 과확장 → 3주 안에 미완성], [매주 일요일 범위 점검. "청소 우선순위 시뮬레이터" 한 줄에 맞지 않는 기능은 백로그],
  [R3], [LLM 비용·장애], [시나리오별 출력 사전 캐싱 (4종 commit 됨)],
)

== 운영 — 빠른 참조

=== 라이브 URL

#table(
  columns: (1fr, 2fr),
  align: (left, left),
  [*프론트 (사용자 화면)*], [#link("https://robot-cleaner.askewly.com/")[`robot-cleaner.askewly.com`] (backup `cleaning-context.vercel.app`)],
  [*백엔드 (서버) 헬스*], [#link("https://cleaning-context-backend.onrender.com/api/health")[`/api/health`]],
  [*메인 레포*], [#link("https://github.com/Team-LG-Clean-Robot/cleaning-context")[`github.com/Team-LG-Clean-Robot/cleaning-context`]],
  [*팀 현황 문서*], [`STATUS.md`],
  [*공개 README*], [`README.md`],
  [*사업계획서*], [`PLANNING.md` (16섹션)],
  [*시연 스크립트*], [`docs/DEMO_SCRIPT.md` (멘토 미팅용 talk track)],
)

=== 로컬 실행

```bash
# 백엔드 (Python 3.12)
cd team-project-lg/backend
.venv/Scripts/activate
uvicorn app.main:app --port 8123

# 프론트 (Next.js 15)
cd team-project-lg/frontend
NEXT_PUBLIC_API_URL=http://localhost:8123 pnpm dev

# 테스트
cd team-project-lg/backend && pytest -v   # 24/24
```

== GitHub 협업 흐름 (5/15 저녁 — 공용 레포 셋업)

=== 공용 레포

#table(
  columns: (1fr, 2fr),
  align: (left, left),
  [*조직 (org)*], [*Team-LG-Clean-Robot*],
  [*메인 레포*], [#link("https://github.com/Team-LG-Clean-Robot/cleaning-context")[`github.com/Team-LG-Clean-Robot/cleaning-context`] (공개)],
  [*기본 브랜치*], [`main`],
  [*라이브 프론트*], [#link("https://robot-cleaner.askewly.com/")[`robot-cleaner.askewly.com`] (Vercel · `frontend/` 자동 배포 · backup `cleaning-context.vercel.app`)],
  [*라이브 백엔드*], [#link("https://cleaning-context-backend.onrender.com/api/health")[`/api/health`] (Render · `backend/` 자동 배포)],
)

#callout[*상태.* Vercel·Render 가 이 레포의 `main` 푸시에 자동 반응하도록 연결 완료. 즉 main 에 commit 만 들어오면 1\~2분 안에 라이브에 반영된다.]

=== 가입 절차 (저녁 미팅에서)

+ 본인 GitHub 계정 ID 를 슬랙·카톡에 공유 → 전유성이 org 멤버로 초대
+ 초대 이메일 수락
+ 대시보드에서 레포 보이는지 확인

=== 비개발자용 흐름 (글로벌경영 3인)

코드 안 만지는 작업은 GitHub 웹에서 다 된다.

#table(
  columns: (1fr, 2fr),
  align: (left, left),
  [*하고 싶은 일*], [*어디서*],
  [시장조사 PDF·이미지·노트 업로드], [레포 `docs/research/` 에 웹 UI 로 Add file → Upload],
  [진행 상황 메모·질문], [레포 *Issues* 탭에 New issue],
  [PPT 초안·발표 노트 공유], [`exports/ppt/` 에 업로드],
  [다른 사람 작업물 보기], [*Pull requests* 탭],
)

=== 개발자용 흐름 (전유성·박주상)

```bash
# 최초 한 번
git clone https://github.com/Team-LG-Clean-Robot/cleaning-context.git
cd cleaning-context

# 작업 흐름
git checkout -b feat/내-작업-이름     # 새 브랜치
# ... 코드 수정 ...
git add -p && git commit -m "메시지"
git push -u origin feat/내-작업-이름
# → GitHub 웹에서 Pull Request 열고 다른 멤버에게 review 요청
```

=== 금지 사항 — 3가지

+ *`.env` 절대 commit 금지* — API 키 들어있다. 이미 `.gitignore` 로 막혀있지만 강제 add 하지 말 것.
+ *`git push --force` 금지* — 다른 사람 작업을 지운다. 실수했으면 새 commit 으로 되돌리기.
+ *main 브랜치 직접 push 자제* — 작업은 브랜치 → PR. 다만 비개발자 문서 업로드는 main 직접 OK.

#callout[*다음 액션.* 본 문서를 5/15 저녁 팀 킥오프에서 공유 → §3 역할 (조현서 포함) 합의 → §7 AI 도구 30분 교육 → §8 GitHub 초대·가입 → 각자 P0/P1 항목 확인 → 5/16 토 09:00 멘토 미팅 자료로 라이브 URL + 본 PDF 사용.]
