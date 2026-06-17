# Step 0: public-docs-surface

## 읽어야 할 파일
> 각 항목은 이번 공개 레포 정리에서 확인해야 하는 계약 또는 노출 표면이다.
- `README.md` — 왜: 외부 포트폴리오 독자의 첫 진입점이며 실행법과 산출물 링크가 여기서 시작된다.
- `backend/README.md` — 왜: 루트 README와 백엔드 실행 포트 및 환경변수 안내가 일치해야 한다.
- `frontend/next.config.ts` — 왜: dev proxy가 바라보는 실제 백엔드 포트가 정의되어 있다.
- `docs/TRD.md` — 왜: 환경변수 예시가 실제 `backend/.env.example` 및 Render 설정과 맞아야 한다.
- `.gitignore` — 왜: 공개 레포 기준으로 로컬/내부 산출물 제외 정책을 설명한다.
- `backend/scripts/train_location_model.py` — 왜: 개인 로컬 경로가 사용자에게 보이는 오류 메시지에 남아 있다.
- `CLAUDE.md` — 왜: 프로젝트 보존 문서이지만 공개 표면에서 내부 운영 흔적이 어떻게 설명되는지 확인한다.

## 작업
공개 포트폴리오 레포의 문서 표면을 정리한다. 코드 동작은 바꾸지 않고, 실행 안내 불일치와 개인 로컬 경로, private 레포 기준 주석, 산출물 폴더 설명 부족을 줄인다.

planning_gate:
  team_validation_mode: manual-pass
  spec_delta: "ROADMAP.md에 P1-public-repo-cleanup milestone을 추가하고 이번 문서 정리를 그 evidence로 연결한다."
  perspectives:
    product: "외부인이 README만 보고 프로젝트 가치와 실행법을 이해하게 만든다."
    architecture: "코드 구조는 건드리지 않고 문서/레포 표면만 정리한다."
    security: ".env는 읽지 않고, tracked 파일과 ignore 규칙 중심으로 secret/path 노출을 점검한다."
    qa: "문서 링크, 포트 일치, env 이름 일치, git status를 evidence로 남긴다."
    skeptic: "exports와 내부 문서를 과하게 삭제하면 발표 산출물 맥락이 사라질 수 있어 1차는 정리/격리 중심으로 한다."
  dod:
    - "git diff -- README.md backend/README.md docs/TRD.md .gitignore backend/scripts/train_location_model.py mobile/README.md"
    - "tracked secret/path scan 재실행"
    - "README 실행 명령 정합성 확인"

## Acceptance Criteria
```bash
git diff -- README.md backend/README.md docs/TRD.md .gitignore backend/scripts/train_location_model.py mobile/README.md
rg -n "(legacy OpenAI key placeholder|personal Windows path|private repo wording|legacy localhost port|personal Unix path)" README.md backend/README.md docs/TRD.md .gitignore backend/scripts/train_location_model.py mobile/README.md
git status --short
```

## 검증 절차
1. 위 AC 커맨드를 실행한다.
2. 루트 README, 백엔드 README, 프론트 dev proxy의 포트가 일치하는지 확인한다.
3. tracked 문서의 환경변수 예시가 `backend/.env.example`과 일치하는지 확인한다.
4. 성공 시 `phases/public-repo-cleanup/index.json` step을 `completed`로 갱신한다.

## 금지사항
- `.env` 또는 `.env.local`의 실제 값을 읽지 마라. 이유: secret은 검증 대상이 아니라 ignore 정책만 검증한다.
- 발표 산출물을 임의 삭제하지 마라. 이유: 포트폴리오 증거물일 수 있으므로 1차 정리는 설명/격리 중심이다.
- 기능 코드 동작을 바꾸지 마라. 이유: 이번 milestone의 DoD는 공개 문서 표면 정리다.
