# 地道 (mobile)

Life journal, not a course, not a translator, not a vocab list.

Record life (Chinese / English / mixed) → idiomatic English rewrite → practice those sentences (listen / 填 / 选).

This Expo app is a **different product** from the Vite flashcard/quiz web app in the repo root. Do not mix the two.

The app name stays **地道**. It follows OIO Android 1.0.8 information architecture (home feed + drawer + FAB, no bottom tabs) and Chinese-first copy (`生活集`, `回顾今天`, `卡片`, `记录天数`).

## Run

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go. No secrets are required. The loop uses a stable local mock rewrite. Gemini stays optional behind `EXPO_PUBLIC_USE_GEMINI=1` (Firebase AI Logic already in this folder).

```bash
npm run typecheck
npm run check:loop
```

`check:loop` compiles the pure logic modules and asserts the practice rules and the
Chinese copy. To also drive the built UI, start the web build and run the smoke test,
which walks 挖空 → 填 → 选 and writes screenshots to `/tmp/didao-shots`:

```bash
npx expo start --web --port 8081
npm run smoke:web
```

## Screens

- **Home feed** — hamburger, `生活集 ▾` (选择卡片 / 排序方式), robot, search. Chips: 回顾今天 / 回顾昨天 / 记忆盲盒. Cards with title, English preview, date · time, ··· (移动到 / 删除). FAB +.
- **Drawer** — demo user `OIO-377YEQ` + PRO + gear. 卡片 / 记录天数 + Jun–Aug heatmap. AI 助手 Beta. 回忆. 收藏夹 (empty). 生活集 + → 新建生活集.
- **新增卡片** — 生活集, 标题（可选）, 记录此刻想说的事……, camera/gallery/mic, 0/5000, 完成. Three radios; middle 目标语言 is default. Official radio copy was truncated on device.
- **Card detail** — 目标语言改写, collapsible 回复, 相关记录, left audio handle, practice toolbar. Long-press word: 查词 | 挖空. Long-press blank: 查词 | 删除填空.
- **填** — dark pill, inline input + ✓, underlined text, wrong answer turns pink.
- **选** — needs ≥2 distinct blanks. One blank toasts `至少需要两个不同的填空，已切换到键盘填空` and falls back to 填. Two+ blanks: dark 选 pill, two gray answer chips above the toolbar, active blank outline, correct chip fills green.
- **回忆** — 继续上次, 今天/昨天 (没有 Card when empty), 选择日期 → 记录日历, 关键词搜索, 记忆盲盒.
- **AI 助手 Beta** — 仅改写 / 改写+翻译 / 改写+回复.
- **我的** — 语言设置 (screenshot values only), 关于, 退出. Local demo user. Mock Pro. No login/signup or IAP.

## Expo Go

Uses `expo-speech` and `expo-image-picker` only. `expo-speech-recognition` was already in this folder; this work does not add another native STT module. Mic falls back to typing if recognition is unavailable.

`react-native-web` is a dev-only extra so `npx expo start --web` works for the smoke test. It does not affect Expo Go.

Words and blanks are `Pressable`, not `Text` with `onLongPress`: `react-native-web` has no `onLongPress` on `Text`, so 挖空 would be unreachable on web.
