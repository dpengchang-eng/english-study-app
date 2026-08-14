# 地道 convert v1 (Cloud Functions)

Locked callable: `convertText` in `asia-northeast3`.

Do not invent a different API.

## Contract

Auth: the caller must be signed in (anonymous is fine). App Check is enforced outside the emulator.

Input:

```ts
{ text, sourceType: "text" | "voice", sourceLangHint?, clientRequestId }
```

`text` is 1–2000 characters. The mobile UX cap is still 500.

Output:

```ts
{ conversionId, status: "ready" | "failed", sourceLang, outputText, sentences, errorCode? }
```

`errorCode`: `quota_exceeded | input_empty | input_too_long | input_invalid | gemini_timeout | gemini_unavailable | safety | parse_error`

Business failures return a normal callable payload `{ status: "failed", errorCode }`. They do not throw. The client reads `errorCode` from the payload first. `HttpsError` (`details.errorCode`) is only a fallback.

The same `clientRequestId` returns the previous success and does not charge quota again.

Quota: 20/day anonymous, 80/day after Google/Apple link. Day boundary is Asia/Seoul.

Pipeline: clean → quota + idempotency → Gemini 2.0 Flash JSON → server aligns `charStart`/`charEnd` (UTF-16 half-open) → regex retokenize on failure → persist.

## Secrets

Do not commit API keys. Set the Gemini key as a Functions secret:

```bash
npx -y firebase-tools@latest functions:secrets:set GEMINI_API_KEY --project english-study-app-c645a
```

## Deploy

```bash
cd functions
npm install
npm test
cd ..
npx -y firebase-tools@latest deploy --only functions,firestore:rules,firestore:indexes --project english-study-app-c645a
```

App Check: register a debug token for Expo, then put it in `mobile/.env` as `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN`. Production should use a real App Check provider.

TTL: `users/{uid}/requests/{clientRequestId}` uses Firestore TTL on `expireAt` (24h). `expireConvertRequests` also deletes expired rows every 24 hours (Asia/Seoul).

## Tests

```bash
cd functions
npm install
npm test
```
