# 地道 (mobile)

iOS / Android app for turning Chinese or English into natural American English, then listening, looking up words, doing cloze drills, and reviewing with a simple schedule.

This is a **different product** from the Vite flashcard/quiz web app in the repo root. The web app is unchanged.

## What you can do

1. Type or speak Chinese or English. The app rewrites it into everyday American English.
2. Play each sentence. Tap a word for a short definition and the sentence context. Save a word or phrase.
3. Practice saved items as fill-in-the-blank. Review due items with **再来 / 1 天 / 3 天 / 7 天**.

Chrome (buttons, tabs, hints) is Simplified Chinese. Learning text is English.

## Stack

- Expo SDK 57 + React Native + TypeScript
- Same Firebase project as the web app: `english-study-app-c645a`
- Anonymous Auth + Firestore (`users/{uid}/conversions`, `users/{uid}/savedItems`)
- Gemini via Firebase AI Logic on the client, or `EXPO_PUBLIC_GEMINI_API_KEY`
- TTS: Google Cloud TTS if `EXPO_PUBLIC_GOOGLE_TTS_KEY` is set, otherwise `expo-speech` (`en-US`)
- STT: device speech recognition, with a clear fallback to typing

## Run the app

You need Node.js 18+ (20+ is better) and the [Expo Go](https://expo.dev/go) app on your phone.

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with Expo Go (Android) or the Camera app (iOS).

Useful variants:

```bash
npx expo start --tunnel    # if the phone cannot see your computer
npx expo start --web       # limited; speech works best on a phone
```

### Optional env file

Copy `mobile/.env.example` to `mobile/.env` if you need a Gemini or Cloud TTS key:

```bash
cd mobile
cp .env.example .env
```

| Variable | When you need it |
| --- | --- |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Firebase AI Logic / Gemini Developer API is not enabled on the project |
| `EXPO_PUBLIC_GOOGLE_TTS_KEY` | You want Cloud Neural2 American English instead of the device voice |

Do not commit `.env`. Restart Expo after you change env vars (`npx expo start -c`).

If Gemini is not set up yet, tap **没有模型密钥？先加载示例** on the 改写 tab. That loads a canned rewrite so you can still play a sentence, tap a word, save it, do one cloze, and mark it for review.

### Speech notes

- Typing always works.
- **说中文 / 说英文** needs a real device. If permission is denied or recognition is missing, the app tells you to type instead.
- A development build (`npx expo prebuild` + native run) is more reliable for speech than Expo Go on some phones.

## Happy path (no extra keys)

1. Open the app. It signs in anonymously.
2. On **改写**, tap **没有模型密钥？先加载示例** (or type a Chinese sentence and tap **改写** if Gemini works).
3. Tap **播放** on the sentence.
4. Tap a word, read the definition, tap **保存这个词**.
5. Open **练习**, type the missing word, submit.
6. Open **复习**, submit again, then tap **1 天**.

## Firestore

New data lives under the signed-in user only:

```
users/{uid}/conversions/{id}
users/{uid}/savedItems/{id}
```

The web app still uses `words/{id}`, `users/{uid}`, and `users/{uid}/progress/{wordId}`. Those rules were not tightened.

Publish the updated rules from the repo root (needs Firebase login):

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project english-study-app-c645a
```

I've set up prototype Security Rules so each signed-in user can only read/write their own 地道 documents, with size limits and a fixed field list. Please review them before a wide release.

## Typecheck

```bash
cd mobile
npx tsc --noEmit
```
