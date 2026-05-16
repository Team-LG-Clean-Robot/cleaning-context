# 로보틱 (Robotic) — Flutter 모바일 앱

> LG 가전 리모콘 앱의 "로봇청소기 탭" 메타포로 만든 **explainable physical AI reference product**.
> 사용자가 시간·이벤트를 일일이 누르지 않아도 IoT 멀티센서(도어락·인덕션·침대 센서·…)로 상황을 추론하고, 그 결정·이유를 모바일에서 직접 만난다.
>
> 백엔드: 같은 레포의 [`backend/`](../backend/) (FastAPI). 같은 API를 [Next.js 웹](../frontend/) 과 공유 — 멀티 클라이언트 구조.

## 첫 setup (Flutter CLI 설치 후 1회)

```bash
cd mobile

# 1. Android 골격 생성 (flutter create가 android/ 디렉토리 자동 채움)
flutter create . --platforms=android --project-name robotic

# 2. 의존성 설치
flutter pub get

# 3. freezed / json_serializable 코드 생성
dart run build_runner build --delete-conflicting-outputs

# 4. 앱 아이콘 생성 (assets/images/app_icon.png 준비 후)
dart run flutter_launcher_icons

# 5. 디버그 실행 (에뮬레이터 또는 USB 연결 폰)
flutter run --dart-define=API_BASE_URL=https://cleaning-context-backend.onrender.com
```

> 로컬 백엔드로 개발 시: `flutter run --dart-define=API_BASE_URL=http://<로컬 IP>:8000` (예: 192.168.1.10).

## 디렉토리

```
mobile/
├── lib/
│   ├── main.dart            # ProviderScope + MyApp
│   ├── app.dart             # MaterialApp.router
│   ├── router.dart          # GoRouter (5-tab shell)
│   ├── theme/               # OKLch 토큰 → Material 3 ColorScheme
│   ├── api/                 # dio client + endpoints + freezed 모델
│   ├── state/               # Riverpod controllers
│   ├── screens/             # splash + shell + 5개 화면
│   └── widgets/             # HouseMapPainter, PriorityCard, SensorTile, …
├── assets/
│   ├── fonts/               # Pretendard, JetBrainsMono (sideload)
│   └── images/              # robot-vacuum.png, app_icon.png (사용자가 ChatGPT로 받아 넣기)
└── pubspec.yaml
```

상세 설계: 레포 루트의 [`TECHNICAL_PLAN.md`](../TECHNICAL_PLAN.md), [`docs/IOT_DOMAIN.md`](../docs/IOT_DOMAIN.md), 그리고 plan 파일.

## 5탭 BottomNavigationBar

| 탭 | 경로 | 역할 |
|---|---|---|
| 홈 | `/home` | 현재 컨텍스트 요약 + top 3 우선순위 + 시나리오 chips + IoT 디바이스 스트립 |
| 청소맵 | `/map` | HouseMap (CustomPainter) 풀스크린, 방 탭 → bottom sheet |
| 설명 | `/explain` | "왜?" 점수 breakdown + sensor → event trace |
| 질문 | `/ask` | 챗 인터페이스 (LLM Q&A) |
| 센서 | `/sensors` | 12개 IoT 센서 토글 + AI 자동 모드 (ML, 학습 후 활성) |

## 릴리즈 빌드

```bash
# 1. keystore (1회만)
keytool -genkey -v -keystore ~/.android/robotic.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# 2. mobile/android/key.properties 작성 (gitignore)
# storePassword=… keyPassword=… keyAlias=upload storeFile=/Users/luma2/.android/robotic.jks

# 3. 릴리즈 APK
flutter build apk --release \
  --dart-define=API_BASE_URL=https://cleaning-context-backend.onrender.com

# 산출: build/app/outputs/flutter-apk/app-release.apk
```

GitHub Release 업로드:
```bash
gh release create v0.1.0 build/app/outputs/flutter-apk/app-release.apk
```
