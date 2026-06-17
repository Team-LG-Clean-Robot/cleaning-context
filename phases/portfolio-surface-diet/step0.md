# Step 0: exports-and-readme-portfolio-pass

## 읽어야 할 파일
- `README.md` — 왜: 포트폴리오 독자가 처음 보는 설명, 이미지, 역할 요약을 배치한다.
- `exports/rehearsal-deck/index.html` — 왜: 개별 slide HTML 의존성이 있어 덱 HTML을 중간물로 오판하면 링크가 깨진다.
- `exports/` — 왜: 최종 산출물과 생성 중간물을 분리한다.
- `.gitignore` — 왜: archive한 분석 이미지/Typst 소스가 다시 공개 표면으로 들어오지 않게 한다.
- `ROADMAP.md` — 왜: P2 milestone DoD/evidence를 완료 처리한다.

## 작업
`exports/`에는 최종 PDF와 최종 인터랙티브 발표 덱만 남긴다. Typst 소스, 중간 markdown, 발표 분석 스크린샷은 로컬 `archive/`로 이동한다. README에는 제공된 데모 스크린샷을 사용해 첫 화면에서 제품과 본인 기여가 바로 보이도록 개선한다.

planning_gate:
  team_validation_mode: manual-pass
  spec_delta: "ROADMAP.md에 P2-portfolio-surface-diet milestone을 추가한다."
  perspectives:
    product: "포트폴리오 독자가 레포의 핵심 결과와 본인 역할을 즉시 파악한다."
    architecture: "런타임 코드와 최종 덱 의존성은 보존하고 생성 소스만 공개 표면에서 제거한다."
    security: "새 이미지와 README 링크만 추가하며 secret 파일은 읽지 않는다."
    qa: "exports tracked 목록, README 이미지 경로, git status, targeted scan으로 검증한다."
    skeptic: "개별 HTML slide는 index.html 의존성이므로 archive하지 않는다."
  dod:
    - "git ls-files exports 결과에 최종 PDF/덱 자산만 남음"
    - "README 이미지 링크 대상 존재"
    - "targeted scan 매치 없음"

## Acceptance Criteria
```bash
git ls-files exports
Test-Path docs/assets/lumos-dashboard.png
rg -n "docs/assets/lumos-dashboard.png|포트폴리오 요약|최종 산출물" README.md exports/README.md
rg -n "(personal Windows path|personal Unix path|legacy OpenAI key placeholder|legacy localhost port)" README.md exports/README.md .gitignore
```

## 금지사항
- `exports/rehearsal-deck/*.html`를 archive하지 마라. 이유: `index.html`이 slide HTML을 직접 링크한다.
- 실제 `.env` 값을 읽지 마라. 이유: 이번 작업의 검증 대상이 아니다.
