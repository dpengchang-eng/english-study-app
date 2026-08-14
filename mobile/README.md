# 地道 (mobile)

iOS / Android app that turns Chinese or English into natural American English.

This is a **different product** from the Vite flashcard/quiz web app in the repo root.

## v1.1 scope

Bottom tabs: **转换 / 词本 / 复习 / 我的**. Result is a stack child of 转换. Lookup is a half-sheet. Cloze is a full-screen modal.

This project is on the **Firebase Spark (no-cost) plan**. Cloud Functions cannot be deployed. Convert, lookup, wordbook, and cloze run **on the phone**. Do not deploy `functions/`. Do not add a custom dev client or prebuild. The app must launch in **Expo Go**.

## Run in Expo Go (no Xcode)

On your Mac:

```bash
git clone https://github.com/dpengchang-eng/english-study-app.git
cd english-study-app
git checkout cursor/fix-expo-web-convert-c236
cd mobile
npm install
cp .env.example .env
```

Put the project's dedicated **Gemini Developer API key** in `mobile/.env` as `EXPO_PUBLIC_GEMINI_API_KEY`. For 绑定 Google, also set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Firebase Web client ID). Never commit `.env`.

```bash
npx expo start -c
```

Install **Expo Go** on the iPhone. Scan the QR code. You do **not** need Xcode.

Expo Go does not include `expo-speech-recognition`. The mic is hidden. Typing convert still works. Listen uses `expo-speech` (system voice). Audio is never uploaded.

## Convert

Unchanged from v1: `gemini-flash-lite-latest`, REST key if set, else Firebase AI Logic. UI cap 500. Locked `errorCode`s. 30s timeout. Quota is on-device (Asia/Seoul): **20/day** while anonymous, **80/day** after a successful Google link. Remaining shows only on 我的.

## Listen

Each sentence card has **听**. Call `Speech.speak(sentence.text, { language: "en-US" })`. Ignore `audioStatus` / `audioUrl`. Stop speaking when leaving the screen. Do not add `expo-speech-recognition`.

## Word tap / phrase

Tap an `isWord` token to open the lookup half-sheet (phonetic + up to 3 Chinese senses). Long-press, then tap another word in the same sentence to select up to 6 consecutive words and save a phrase.

`saveToWordbook` writes `users/{uid}/wordbook/{slug(lemma)}` on the client. Only `isWord` tokens, 1–6 consecutive `tokenIds`. If the item already exists, show **已在词本** and do not reset `dueAt` / `box`.

Firestore: signed-in owner can read/write `conversions`, `wordbook`, and `practiceSessions` (`isOwner` only). Quota stays on the device, not in rules. `dictCache` is closed. Storage is closed.

## Cloze + review

Only saved wordbook items. Review query is `dueAt <= now`, `orderBy dueAt`. **开始填空** opens a modal.

`createPractice` writes UI cards `{wordbookItemId, sentenceText, blankSpan, hintGloss}` only. No `answer` / `answerNorm` in the UI payload. Answers stay in memory (or a session doc the UI does not use as the question source).

`submitPractice` is the only correctness source. Grade from `correct` / `expected`. The blank is fixed-width (does not match the answer length). `hintGloss` shows only after the first wrong. Two wrongs reveal `result.expected`.

SRS: Again → box 0, due in 60s. Good → 1 day, then 3 days, then 7 days.

## 我的

Locked copy:

- Unbound: **未绑定** + **数据只在这台设备** + button **绑定 Google**. Three read-only rows stay. Offline: button disabled.
- Bound: Google email + **数据在云端**. No logout. No login wall. No Apple.
- Success: swap this state in place. Same anonymous uid (`linkWithCredential` / `linkWithPopup`). Never `signIn` a new empty account.
- Cancel: no toast. Fail: **没绑上，再试一次**. Google already used by another Firebase user: **这个 Google 已经用过了** — do not switch uid, do not wipe the wordbook.

## Google bind (Expo Go)

Do **not** add `@react-native-google-signin/google-signin` or `expo-speech-recognition`. Those native modules crash or fail in Expo Go.

1. Firebase Console → Authentication → Sign-in method → enable **Google**.
2. Copy the **Web client ID** into `mobile/.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
3. Expo Go returns to the current experience URL (`exp://<metro-host>/--/oauthredirect`). Do not use `didao://`, and do not force the computer's localhost — a phone cannot open those.
4. Restart with `npx expo start -c`.

On launch and after bind, the app loads `users/{uid}/wordbook` and merges it with local data. Local pending/error rows are kept. A failed cloud write shows **未同步到云** and does not block convert or save.

## Gemini

One model: `gemini-flash-lite-latest`.

1. If `EXPO_PUBLIC_GEMINI_API_KEY` is set, call Gemini REST.
2. Else Firebase AI Logic + App Check debug token (see `.env.example`).

## Publish Firestore rules

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project english-study-app-c645a
```

Locked rules: owner read/write on `users/{uid}` plus `conversions`, `wordbook`, and `practiceSessions`. Web flashcard `words` and `users/{uid}/progress` stay readable/writable as before. `dictCache` closed. Quota is on-device (20/80). Do not add extra validation in `firestore.rules`.

## Typecheck

```bash
cd mobile
npx tsc --noEmit
```
