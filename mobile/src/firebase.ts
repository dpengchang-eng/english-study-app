import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
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
