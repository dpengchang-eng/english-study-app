import "./appCheckDebug";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
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

/**
 * AI Logic auto-enforces App Check. In debug, set FIREBASE_APPCHECK_DEBUG_TOKEN
 * on globalThis first, then initialize with ReCaptchaV3Provider (placeholder
 * site key is enough). The SDK exchanges the debug token for a real JWT.
 * Do not return the raw debug UUID from a CustomProvider.
 */
function initAppCheck(): void {
  installAppCheckDebugToken(appCheckDebugToken());
  try {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider("debug-placeholder-site-key"),
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
