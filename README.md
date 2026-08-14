# English Study App (영어 공부 앱)

한국어 안내를 기본으로 제공하는, 바로 사용 가능한 영어 학습 웹앱입니다.  
첫 실행부터 단어/퀴즈/복습이 가능하도록 스타터 단어장을 포함합니다.

## 배포 (GitHub Pages)

- 호스팅: **GitHub Pages**
- 라이브 URL: **https://dpengchang-eng.github.io/english-study-app/**

## 주요 기능

- **대시보드**: 학습 단어 수, 복습 대기 수, 연속 학습일, 세션 수, 정답률
- **플래시카드**: 영어 단어 확인 → 뜻/예문 뒤집기 → 기억 여부 기록
- **퀴즈**: 객관식 + 타이핑 모드
- **복습 큐**: 복습 시점이 된 단어를 우선적으로 학습
- **진행도 저장**: Firebase Auth(익명 로그인) + Cloud Firestore

## 기술 스택

- Vite
- React + TypeScript
- CSS (반응형, 모바일 친화 레이아웃)
- Firebase Authentication (Anonymous)
- Cloud Firestore (asia-northeast3 / Seoul)

## 로컬 실행 방법

사전 요구사항:
- Node.js 18+ (권장: 20+)

명령어:

```bash
npm install
npm run dev
```

브라우저에서 표시되는 로컬 주소(기본: `http://localhost:5173`)를 열면 됩니다.

## 프로덕션 빌드

```bash
npm run build
npm run preview
```

## 학습 데이터

- 앱은 Firestore `words/{wordId}`에 스타터 단어(w1~w25)를 사용합니다.
- 사용자 진척도는 `users/{uid}` 및 `users/{uid}/progress/{wordId}`에 저장됩니다.
- 첫 실행 시 익명 로그인 후 데이터를 읽고/씁니다.
- 별도 Node 서버 없이 정적 사이트(GitHub Pages)로 동작합니다.

## Firestore 보안 규칙

- 저장소에 `firestore.rules` 파일이 포함되어 있습니다.
- 참고: GitHub Pages에서는 Firestore Rules를 배포하지 않습니다.  
  Firebase Console(또는 Firebase CLI)에서 별도로 게시해야 합니다.

## Mobile app (地道)

The Expo app in `mobile/` is a **separate product**. v1.1 has tabs 转换 / 词本 / 复习 / 我的. Convert uses `gemini-flash-lite-latest`. Listen uses `expo-speech`. Run in Expo Go — no Xcode. The web flashcard app is unchanged.

It does **not** replace this flashcard/quiz web app. GitHub Pages still builds from the repo root.

```bash
cd mobile
npm install
npx expo start
```

Full steps, env vars, and the happy path: [mobile/README.md](mobile/README.md).
