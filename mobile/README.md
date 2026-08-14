# 地道 (mobile)

iOS / Android app that turns Chinese or English into natural American English.

This is a **different product** from the Vite flashcard/quiz web app in the repo root.

## v1 scope

Convert only. Navigation is a stack: **Home → Result**. No bottom tabs. No login screen. Silent anonymous Auth on launch.

v1.1 (not in this PR): tabs, listen, word tap, wordbook, cloze, review, bind Google/Apple.

## Screens

1. **Home** — text box, hold-to-record (release only fills the box), Convert, offline disables convert, last 20 local conversions.
2. **Result** — original text + sentences as plain text. Skeleton / failed / timeout. Actions: copy all, convert again. No Play button. No tappable words.

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

## Typecheck

```bash
cd mobile
npx tsc --noEmit
```
