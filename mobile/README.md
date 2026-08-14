# 地道 (mobile)

iOS / Android app that turns Chinese or English into natural American English, then lets you look up words, save them to a wordbook, and practice cloze.

This is a **different product** from the Vite flashcard/quiz web app in the repo root.

## Locked navigation

Bottom tabs: **转换 / 词本 / 复习 / 我的**

- **结果** is a stack screen on 转换. Tapping 转换 goes there immediately.
- **填空** is a full-screen modal. Android back exits.
- **查词** is a half-sheet shared by 结果 and 词本.
- 复习 tab shows today's due count.

Chrome is Simplified Chinese. Learning text is English. Portrait only.

## Run

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go.

### Optional env

Copy `.env.example` to `.env`:

| Variable | When you need it |
| --- | --- |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Firebase AI Logic is not enabled |
| `EXPO_PUBLIC_GOOGLE_TTS_KEY` | Cloud Neural2 American English |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Bind Google on 我的 (later) |

Do not commit `.env`. Restart with `npx expo start -c` after changes.

If Gemini is not ready, tap **加载示例并立刻看结果**. That still walks play → lookup → add to wordbook → cloze.

## Happy path

1. App signs in anonymously (no prompt).
2. On **转换**, type a Chinese sentence (max 500 chars) or hold the mic (max 30s, swipe up to cancel). Voice lands in the input box first.
3. Tap **转换**. The result screen opens immediately.
4. When sentences appear, tap **播放** (准备中 / 播放 / 停止 / 无音频). Audio can arrive later without refreshing the page.
5. Tap a word for the half-sheet (IPA + up to 3 Chinese senses + source sentence). Add even if lookup fails.
6. Long-press to multi-select a phrase, then **加入词本**.
7. On **词本**, swipe left to delete. **练习到期** or **练习已选** opens the cloze modal.
8. Type the blank. Correct plays the sentence. Two wrongs reveal. No skip. Recap can retry misses.
9. **复习** only starts today's due items. Same cloze screen.
10. **我的**: bind Apple/Google later, quiz size 5/10/15, speech rate, cloud-voice toggle.

## Data

Same Firebase project as the web app: `english-study-app-c645a`.

```
users/{uid}/conversions/{id}     sentences[].tokens[] + audioStatus
users/{uid}/wordbook/{id}        dueAt + syncState + blankStart/blankEnd
users/{uid}/settings/didao
```

Users can only read/write their own data. Publish rules:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project english-study-app-c645a
```

These are prototype Security Rules. Please review them before a wide release.

## Out of v1

Multi-turn rewrite, streaks/leaderboard, push, wordbook folders, multiple-choice, onboarding carousel, tablet, email/password, grammar page.

## Typecheck

```bash
cd mobile
npx tsc --noEmit
```
