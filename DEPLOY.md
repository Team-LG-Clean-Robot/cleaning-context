# 배포 가이드

> Step 6 산출물. 발표 전 1회 수행.

## 사전 준비

- GitHub 레포에 push
- Render·Vercel 계정 (둘 다 무료 tier)
- `TIMELY_API_KEY` 발급 완료

## 1. 캐시 시드 생성 (로컬)

발표 안정성을 위해 4 시나리오 응답을 git에 commit해두면, Render의 ephemeral 디스크가 cold start 후에도 즉시 응답한다.

```bash
cd team-project-lg/backend
.venv/Scripts/activate
cp .env.example .env  # TIMELY_API_KEY 채움
uvicorn app.main:app --port 8000 &
python scripts/seed_cache.py --port 8000
git add app/data/cached_responses/
git commit -m "seed cached responses for 4 scenarios"
```

## 2. Backend → Render

1. Render 대시보드 → "New +" → "Blueprint"
2. GitHub 레포 연결 → `team-project-lg/backend/render.yaml` 자동 인식
3. 환경변수 채움:
   - `TIMELY_API_KEY` (필수)
   - `CORS_ORIGINS` — 일단 `*` 입력 후, Vercel 도메인 확정되면 수정
4. Deploy → URL 확보 (예: `https://cleaning-context-backend.onrender.com`)
5. 검증: `curl https://<url>/api/health` → `llm_available: true`, `rooms_loaded: 5`

## 3. Frontend → Vercel

1. Vercel 대시보드 → "Add New" → "Project" → GitHub 레포 import
2. **Root Directory**: `team-project-lg/frontend`
3. Framework: Next.js (자동 감지)
4. 환경변수: `NEXT_PUBLIC_API_URL=https://<render-domain>`
5. Deploy → URL 확보 (예: `https://cleaning-context.vercel.app`)
6. Vercel URL을 Render `CORS_ORIGINS`에 추가 → Render 재배포

## 4. 발표 day-of 체크리스트

- [ ] T-30min: Render warm-up
  ```bash
  curl https://<render-domain>/api/health
  for sc in rainy_return post_cooking pre_sleep guest_incoming; do
    curl -X POST https://<render-domain>/api/simulate \
      -H "Content-Type: application/json" -d "{\"scenario_id\":\"$sc\"}"
  done
  ```
- [ ] T-30min: Vercel URL 접근 + 4 시나리오 클릭
- [ ] T-15min: 노트북 로컬 백업 (`uvicorn` + `pnpm dev`) 동작 확인
- [ ] T-5min: 브라우저 탭 미리 열기

## 트러블슈팅

| 증상 | 원인·해결 |
|---|---|
| `/api/simulate` 503 | Render cold start (~30초) — 다시 호출 |
| LLM 응답 hang | `LLM_TIMEOUT_SEC=10` 후 fallback 메시지 자동 노출 |
| 캐시 미적용 | `cached_responses/`가 git에 없음. `seed_cache.py` 재실행 후 commit |
| CORS 에러 | Render `CORS_ORIGINS`에 Vercel 도메인 누락 |
