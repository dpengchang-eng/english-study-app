/**
 * Must run before initializeAppCheck. The JS SDK reads
 * globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN and exchanges it for a real JWT.
 * Do not pass this UUID to CustomProvider.getToken.
 */

type AppCheckGlobal = {
  FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
};

/** Registered in Firebase App Check on the web app as "didao expo web local". */
export const REGISTERED_WEB_DEBUG_TOKEN = "7e00267c-ef77-495b-a159-e04757f33a9c";

export function appCheckDebugToken(): string {
  return process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN?.trim() || REGISTERED_WEB_DEBUG_TOKEN;
}

export function installAppCheckDebugToken(token: string = appCheckDebugToken()): string {
  const root = globalThis as AppCheckGlobal & {
    self?: AppCheckGlobal;
    window?: AppCheckGlobal;
  };
  root.FIREBASE_APPCHECK_DEBUG_TOKEN = token;
  if (root.self) root.self.FIREBASE_APPCHECK_DEBUG_TOKEN = token;
  if (root.window) root.window.FIREBASE_APPCHECK_DEBUG_TOKEN = token;
  return token;
}

installAppCheckDebugToken();
