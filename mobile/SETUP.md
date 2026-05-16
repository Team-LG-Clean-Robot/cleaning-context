# 첫 setup 가이드 (Flutter CLI 설치 후)

> 본 mobile/ 는 Flutter 소스 코드만 작성되어 있습니다. `flutter create`가 만드는 Android 골격(`android/` 폴더)은 사용자 머신에서 1회 실행 필요.

## 0. Flutter 설치 (1회)

macOS:
```bash
brew install --cask flutter
flutter doctor   # Android SDK·Java 등 누락 부분 안내
```

또는 https://docs.flutter.dev/get-started/install 공식 가이드.

## 1. mobile/ 초기화

```bash
cd mobile

# 1-1. Android 골격 생성 (덮어쓰지 않음 — 기존 lib/, pubspec.yaml 그대로 유지)
flutter create . --platforms=android --project-name robotic --org com.luckygs

# 1-2. 의존성 설치
flutter pub get

# 1-3. freezed / json_serializable 생성
dart run build_runner build --delete-conflicting-outputs
```

## 2. 폰트·이미지 자산 추가

```bash
# Pretendard Variable (OFL)
curl -L -o assets/fonts/PretendardVariable.ttf \
  https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/public/variable/PretendardVariable.ttf

# JetBrains Mono Medium
curl -L -o assets/fonts/JetBrainsMono-Medium.ttf \
  https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Medium.ttf

# Robot vacuum 이미지 (기존 웹에서 재사용)
cp ../frontend/public/robot-vacuum.png assets/images/

# 앱 아이콘은 사용자가 ChatGPT 이미지로 만들어 assets/images/app_icon.png 에 넣고:
dart run flutter_launcher_icons
```

## 3. 디버그 실행

```bash
# Android 에뮬레이터 또는 USB 연결 폰
flutter run --dart-define=API_BASE_URL=https://cleaning-context-backend.onrender.com

# 로컬 백엔드 (192.168.1.10 = 본인 머신의 LAN IP)
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:8000
```

## 4. 릴리즈 APK

```bash
# 4-1. keystore (1회)
keytool -genkey -v -keystore ~/.android/robotic.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# 4-2. mobile/android/key.properties (gitignored)
cat > android/key.properties <<EOF
storePassword=YOUR_PW
keyPassword=YOUR_PW
keyAlias=upload
storeFile=/Users/$(whoami)/.android/robotic.jks
EOF

# 4-3. android/app/build.gradle 수정 (Flutter 공식 가이드 참조):
#   - defaultConfig.applicationId "com.luckygs.robotic"
#   - signingConfigs.release { ... key.properties 읽기 }
#   - buildTypes.release.signingConfig = signingConfigs.release

# 4-4. 빌드
flutter build apk --release \
  --dart-define=API_BASE_URL=https://cleaning-context-backend.onrender.com

# 산출: build/app/outputs/flutter-apk/app-release.apk
```

GitHub Release 업로드:
```bash
cd ..   # 레포 루트
gh release create v0.1.0 mobile/build/app/outputs/flutter-apk/app-release.apk \
  --title "로보틱 v0.1.0" \
  --notes "Flutter Android 앱 첫 릴리즈"
```

## 트러블슈팅

- **freezed 생성 실패** → `dart run build_runner clean && dart run build_runner build --delete-conflicting-outputs`
- **font 누락 에러** → 위 2번 단계 폰트 파일 경로 확인
- **API 503/timeout** → Render Free tier cold start, splash가 자동 재시도 1회 + 대기 메시지 표시
- **Java/Android SDK 누락** → `flutter doctor` 출력 따라 설치
