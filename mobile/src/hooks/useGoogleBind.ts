import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../context/AuthState";
import { GOOGLE_BIND_FAIL, googleWebClientId } from "../services/googleLinkErrors";
import { linkCurrentUserWithIdToken, linkCurrentUserWithPopup } from "../services/googleLink";
import { googleRedirectUriOptions } from "../services/googleRedirect";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleBind(): {
  busy: boolean;
  error: string | null;
  bindGoogle: () => Promise<void>;
} {
  const { markLinked } = useAuth();
  const configuredId = googleWebClientId();
  const clientId = configuredId || "missing.apps.googleusercontent.com";
  const [request, , promptAsync] = Google.useAuthRequest(
    {
      clientId,
      webClientId: clientId,
      responseType: ResponseType.IdToken,
      usePKCE: false,
      selectAccount: true,
      scopes: ["openid", "profile", "email"]
    },
    googleRedirectUriOptions()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bindGoogle = useCallback(async () => {
    if (busy) return;
    setError(null);
    if (!configuredId) {
      setError(GOOGLE_BIND_FAIL);
      return;
    }
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        const result = await linkCurrentUserWithPopup();
        if (result.ok) {
          markLinked(result.email);
          return;
        }
        if (!result.cancelled && result.message) setError(result.message);
        return;
      }
      if (!request) {
        setError(GOOGLE_BIND_FAIL);
        return;
      }
      const session = await promptAsync();
      if (session.type === "cancel" || session.type === "dismiss") return;
      if (session.type !== "success") {
        setError(GOOGLE_BIND_FAIL);
        return;
      }
      const idToken = session.params.id_token;
      if (!idToken) {
        setError(GOOGLE_BIND_FAIL);
        return;
      }
      const result = await linkCurrentUserWithIdToken(idToken, session.params.access_token);
      if (result.ok) {
        markLinked(result.email);
        return;
      }
      if (!result.cancelled && result.message) setError(result.message);
    } catch {
      setError(GOOGLE_BIND_FAIL);
    } finally {
      setBusy(false);
    }
  }, [busy, configuredId, markLinked, promptAsync, request]);

  return { busy, error, bindGoogle };
}
