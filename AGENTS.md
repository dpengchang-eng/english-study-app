# AGENTS.md

## Cursor Cloud specific instructions

This repo contains three independent products. Standard commands live in `README.md`, `functions/README.md`, and `mobile/README.md`; prefer those. Notes below cover only non-obvious startup/run caveats. The update script already runs `npm install` in the repo root, `functions/`, and `mobile/`.

### Products & how to run/verify each

| Product | Location | Run (dev) | Lint / typecheck | Test | Build |
| --- | --- | --- | --- | --- | --- |
| English study web app (primary) | repo root | `npm run dev` | `npx tsc -b` | (no test suite) | `npm run build` |
| 地道 Cloud Functions (reference only) | `functions/` | not deployed on Spark; not run locally | `npm --prefix functions run typecheck` | `npm --prefix functions test` | `npm --prefix functions run build` |
| 地道 mobile (Expo) | `mobile/` | `cd mobile && npx expo start` | `npm --prefix mobile run typecheck` | (no test suite) | n/a |

- There is no dedicated `lint` script anywhere; TypeScript's `tsc` is the type/lint check. The web app has no standalone typecheck script, but `npm run build` runs `tsc -b` first.

### Web app (root) — the main runnable product

- Dev server URL includes the base path: `http://localhost:5173/english-study-app/` (set by `base` in `vite.config.ts`). Plain `http://localhost:5173/` will not serve the app.
- Firebase web config is hardcoded in `src/firebase.ts` and points at the real project `english-study-app-c645a`. No `.env` or secret is needed to run the web app. It uses anonymous Auth + Cloud Firestore over the network.
- Known gotcha: on the very first cold page load, the Firestore WebChannel connection can be slow and the app briefly shows the red banner "Firebase에서 데이터를 불러오지 못했습니다". The app falls back to local starter words and stays usable; a reload clears the banner and Firestore loads normally (all 200s). This is intermittent, not a real config break.
- Hello-world flow to confirm it works: open the app → wait for anonymous login (a "학습 사용자 ID:" line appears) → 퀴즈 tab → 퀴즈 세션 시작 → answer a few options → 대시보드 shows updated 총 세션 / 정답률. Progress persists to Firestore under `users/{uid}`.

### Functions (`functions/`)

- Reference-only; do NOT deploy on the Spark plan (see `functions/README.md`). Still useful locally: `npm --prefix functions test` compiles with `tsc` then runs `node --test` on the built `lib/*.test.js` (11 tests).

### Mobile (`mobile/`)

- Separate Expo app. `npx expo start` needs a device/emulator (Expo Go + QR), which is not available headless in cloud; use `npm --prefix mobile run typecheck` to verify it compiles.
- Convert uses Firebase AI Logic (Gemini) on-device and enforces App Check via a debug token in `mobile/.env` (`EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN`). Not needed for typecheck.
