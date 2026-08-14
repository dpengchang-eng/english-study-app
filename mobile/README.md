# 地道 (mobile)

iOS / Android app that turns Chinese or English into natural American English.

This is a **different product** from the Vite flashcard/quiz web app in the repo root.

## v1 scope

Convert only. Navigation is a stack: **Home → Result**. No bottom tabs. No login screen. Silent anonymous Auth on launch.

This project is on the **Firebase Spark (no-cost) plan**. Cloud Functions cannot be deployed. Convert runs **on the phone**. Do not deploy `functions/`.

v1.1 (not in this PR): tabs, listen, word tap, wordbook, cloze, review, bind Google/Apple.

## Screens

1. **Home** — text box, hold-to-record (release only fills the box), Convert, offline disables convert, last 20 local conversions. Home does not show remaining quota.
2. **Result** — original text + `sentences[].text` only. Waits 30 seconds. After 30s with no response: `gemini_timeout`. Unknown codes use `parse_error`. `input_too_long` only if text > 2000 (UI still caps at 500). Success actions: copy all, convert again. No Play button. No tappable words. The UI never shows raw Gemini errors.

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

### Gemini (Firebase AI Logic)

Convert calls Gemini from the Expo app through **Firebase AI Logic**. It does **not** call a Cloud Function. It does **not** need `EXPO_PUBLIC_GEMINI_API_KEY`.

The app uses the existing Firebase web config / `apiKey` on project `english-study-app-c645a`:

```ts
getAI(app, { backend: googleAIBackend() })
```

That is the Gemini Developer API backend, not Vertex.

If convert fails locally, tap **没有 Gemini 时，加载示例**.

### App Check debug token (Expo / local)

AI Logic auto-enforces App Check. Local Expo / Expo Go uses the **debug provider**, not Play Integrity or App Attest. Do not block v1 on a production attestation setup.

1. Open Firebase Console → App Check → the **web** app for `english-study-app-c645a` → Manage debug tokens.
2. Add a debug token (or copy the one Metro prints: `App Check debug token: …`).
3. Copy `mobile/.env.example` to `mobile/.env` and set:

```
EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN=your-debug-token
```

4. Restart with `npx expo start -c`.

In `__DEV__`, the SDK also generates a token and logs it if the env var is empty. Register that token or requests are rejected. Never commit `.env` or the real token.

Daily quota: **20/day** on the device, Asia/Seoul day. Not enforced by Firestore rules. The counter is stored locally and on `users/{uid}.quota`. Home does not show remaining quota.

On failure the client writes `users/{uid}/conversions` with `status=failed` and `errorCode`. Field names stay the same. `sourceText` ≤ 2000, `sentences` ≤ 15. Tokens include `id` and `lemma` when present. Writes only when `request.auth.uid == uid`.

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
