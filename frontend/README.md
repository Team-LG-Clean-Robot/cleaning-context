# Cleaning Context Frontend

Next.js 15 + Tailwind v4 — 시뮬레이터 UI.

## 빠른 시작

```bash
pnpm install
pnpm dev          # → http://localhost:3000
```

백엔드(`../backend`)가 8000 포트에서 실행 중이어야 시나리오 응답을 받을 수 있다. dev 모드에서는 `next.config.ts`의 rewrite가 `/api/*`를 자동 프록시한다.

배포 시: `NEXT_PUBLIC_API_URL=https://<render-domain>` 환경변수로 절대 URL 사용.

## 구조

- `app/page.tsx` — 메인 페이지
- `components/` — HouseMap, Simulator, ScenarioPanel, PriorityList, ExplanationCard
- `lib/types.ts` — 백엔드 schema와 1:1 (변경 시 양쪽 동시 업데이트)
- `lib/colors.ts` — score → fill 색상, 모드 뱃지
- `lib/api.ts` — fetch wrapper
