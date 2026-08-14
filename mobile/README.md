# 地道 (mobile)

iOS / Android app that turns Chinese or English into natural American English.

This is a **different product** from the Vite flashcard/quiz web app in the repo root.

## v1 scope

Convert only. Navigation is a stack: **Home → Result**. No bottom tabs. No login screen. Silent anonymous Auth on launch.

v1.1 (not in this PR): tabs, listen, word tap, wordbook, cloze, review, bind Google/Apple.

## Screens

1. **Home** — text box, hold-to-record (release only fills the box), Convert, offline disables convert, last 20 local conversions.
2. **Result** — original text + sentences as plain text. Waits 30 seconds (same as `convertText`). After 30s with no response: `gemini_timeout`. Unknown `errorCode`s use `parse_error`. Actions on success: copy all, convert again. No Play button. No tappable words. Home does not show remaining quota.

Locked Result errors (branch on `errorCode` from payload or HttpsError details):

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

Convert calls the locked `convertText` Cloud Function (`asia-northeast3`). Deploy functions first (see [functions/README.md](../functions/README.md)).

Optional: copy `.env.example` to `.env` and set `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` for Expo Go. Do not commit `.env`.

STT stays on the device. Audio is never uploaded.

## Data the UI shows

```
Conversion { id, createdAt, sourceText, sentences: { id, text }[] }
```

The callable may return more (tokens, sourceLang, …). v1 stores the payload but only renders `sentences[].text`.

Recent list is the last 20 conversions on this device.

## Backend call (unchanged)

```ts
convertText({ text, sourceType, sourceLangHint?, clientRequestId })
```

Client UX cap is 500 characters.

`errorCode`: `quota_exceeded | input_empty | input_too_long | input_invalid | gemini_timeout | gemini_unavailable | safety | parse_error`

Business failures return `{ status: "failed", errorCode }` on the callable. They do not throw. Read `errorCode` from the payload first. `HttpsError.details.errorCode` is only a fallback.

## Typecheck

```bash
cd mobile
npx tsc --noEmit
```
