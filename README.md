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
- **진행도 저장**: 로컬 스토리지 기반(로그인/외부 API 불필요)

## 기술 스택

- Vite
- React + TypeScript
- CSS (반응형, 모바일 친화 레이아웃)

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

- 앱에 25개 스타터 단어가 기본 포함되어 있습니다.
- 학습 기록은 브라우저 `localStorage`에 저장됩니다.
