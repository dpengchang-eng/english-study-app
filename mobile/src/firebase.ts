import "./appCheckDebug";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { CustomProvider, initializeAppCheck } from "firebase/app-check";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { appCheckDebugToken, installAppCheckDebugToken } from "./appCheckDebug";

// Same Firebase web app already used by the GitHub Pages flashcard product.
const firebaseConfig = {
  apiKey: "AIzaSyDoWlBp0JDCCAPde04IQxzeaTH98szw4L8",
  authDomain: "english-study-app-c645a.firebaseapp.com",
  projectId: "english-study-app-c645a",
  storageBucket: "english-study-app-c645a.firebasestorage.app",
  messagingSenderId: "545509310602",
  appId: "1:545509310602:web:67a624e0d98000d093ed73"
};

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function fallbackAppCheckToken(debugToken: string): { token: string; expireTimeMillis: number } {
  return { token: debugToken, expireTimeMillis: Date.now() + 60 * 60 * 1000 };
}

/** Exchange the debug token. Never throw — a throw becomes App Check 403 and Gemini hangs. */
async function debugAppCheckToken(debugToken: string): Promise<{ token: string; expireTimeMillis: number }> {
  try {
    const response = await fetch(
      `https://firebaseappcheck.googleapis.com/v1/projects/${firebaseConfig.projectId}/apps/${firebaseConfig.appId}:exchangeDebugToken?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debug_token: debugToken })
      }
    );
    if (!response.ok) return fallbackAppCheckToken(debugToken);
    const body = (await response.json()) as { token?: string; ttl?: string };
    if (!body.token) return fallbackAppCheckToken(debugToken);
    const seconds = Number(/^([\d.]+)s$/.exec(body.ttl ?? "")?.[1] ?? 3600);
    return { token: body.token, expireTimeMillis: Date.now() + seconds * 1000 };
  } catch {
    return fallbackAppCheckToken(debugToken);
  }
}

/**
 * AI Logic auto-enforces App Check. Expo / local uses the debug token.
 * CustomProvider.getToken must return { token, expireTimeMillis } — do not throw.
 * On web, FIREBASE_APPCHECK_DEBUG_TOKEN is installed before initializeAppCheck.
 * Production Play Integrity / App Attest is not required for this v1 PR.
 */
function initAppCheck(): void {
  const debugToken = installAppCheckDebugToken(appCheckDebugToken());
  try {
    initializeAppCheck(firebaseApp, {
      provider: new CustomProvider({
        getToken: async () => debugAppCheckToken(debugToken)
      }),
      isTokenAutoRefreshEnabled: true
    });
  } catch {
    // already initialized
  }
}

initAppCheck();

function reactNativePersistence(): Persistence | undefined {
  const authModule = require("firebase/auth") as {
    getReactNativePersistence?: (storage: typeof ReactNativeAsyncStorage) => Persistence;
  };
  return authModule.getReactNativePersistence?.(ReactNativeAsyncStorage);
}

function createAuth(): Auth {
  const persistence = reactNativePersistence();
  try {
    return persistence
      ? initializeAuth(firebaseApp, { persistence })
      : getAuth(firebaseApp);
  } catch {
    return getAuth(firebaseApp);
  }
}

export const auth = createAuth();
export const db = getFirestore(firebaseApp);
