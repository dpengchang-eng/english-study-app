# 地道 (mobile)

iOS / Android app that turns Chinese or English into natural American English.

This is a **different product** from the Vite flashcard/quiz web app in the repo root.

## v1 scope

Convert only. Navigation is a stack: **Home → Result**. No bottom tabs. No login screen. Silent anonymous Auth on launch.

This project is on the **Firebase Spark (no-cost) plan**. Cloud Functions cannot be deployed. Convert runs **on the phone**. Do not deploy `functions/`.

v1.1 (not in this PR): tabs, listen, word tap, wordbook, cloze, review, bind Google/Apple.

## Screens

1. **Home** — text box, hold-to-record (release only fills the box), Convert, offline disables convert, last 20 local conversions. Home does not show remaining quota.
2. **Result** — original text + `sentences[].text` only. Waits 30 seconds. After 30s with no response: `gemini_timeout`. Unknown codes use `parse_error`. Success actions: copy all, convert again. No Play button. No tappable words.

Locked Result errors:

| errorCode | Copy | Action |
| --- | --- | --- |
| `quota_exceeded` | 今天的转换次数用完了 (+ 绑定后每天 80 次 if anonymous) | 回首页 |
| `input_empty` | 先输入一句话 | 回首页 |
| `input_too_long` | 这段太长了，缩短一点 | 回首页 |
| `input_invalid` | 这段没法转，换个说法 | 回首页 |
| `gemini_timeout` | 网有点慢，再试一次 | Retry |
| `gemini_unavailable` | 这会儿转不了，稍后再试 | Retry |
| `safety` | 这段内容转不了，换一句 | 回首页 (do not retry the same text) |
| `parse_error` | 这次没转成，再试一次 | Retry |

Components: `ComposeCard`, `MicButton`, `OfflineBanner`, `HistoryRow`, `SentenceList`, `ErrorState`, `EmptyHint`.

## Run

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go.

### Gemini (required for live convert)

Convert calls Gemini from the Expo app. It does **not** call a Cloud Function.

1. Prefer **Firebase AI Logic** on project `english-study-app-c645a` (Gemini Developer API). In Firebase Console: Build → Firebase AI Logic → enable Gemini Developer API. No extra key in the app if this works.
2. If AI Logic is not enabled, copy `.env.example` to `.env` and set `EXPO_PUBLIC_GEMINI_API_KEY`. Restart with `npx expo start -c`.

Never commit `.env` or the real key.

If Gemini is not configured, tap **没有 Gemini 时，加载示例**.

Daily quota: **20/day** on the device, Asia/Seoul day. The counter is stored locally and on `users/{uid}.quota`. Home does not show remaining quota.

### Publish Firestore rules

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project english-study-app-c645a
```

These are prototype Security Rules. Please review them before a wide release.

STT stays on the device. Audio is never uploaded.

## Data the UI shows

```
Conversion { id, createdAt, sourceText, sentences: { id, text }[] }
```

The phone may store tokens on the conversion document. v1 UI only renders `sentences[].text`.

Recent list is the last 20 conversions on this device. Successful converts are also written to `users/{uid}/conversions/{id}`.

## Typecheck

```bash
cd mobile
npx tsc --noEmit
```
