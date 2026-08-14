import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { CustomProvider, initializeAppCheck } from "firebase/app-check";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

type AppCheckGlobal = {
  FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
};

function appCheckDebugToken(): string | boolean | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  if (typeof __DEV__ !== "undefined" && __DEV__) return true;
  return undefined;
}

/** App Check reads FIREBASE_APPCHECK_DEBUG_TOKEN from the JS global before init. */
function installAppCheckDebugToken(token: string | boolean): void {
  (globalThis as AppCheckGlobal).FIREBASE_APPCHECK_DEBUG_TOKEN = token;
}

/**
 * AI Logic auto-enforces App Check. Expo / local uses the debug provider.
 * Production Play Integrity / App Attest is not required for this v1 PR.
 */
function initAppCheck(): void {
  const debugToken = appCheckDebugToken();
  if (debugToken === undefined) return;
  installAppCheckDebugToken(debugToken);
  try {
    initializeAppCheck(firebaseApp, {
      provider: new CustomProvider({
        getToken: async () => {
          throw new Error("App Check debug provider should supply the token");
        }
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
