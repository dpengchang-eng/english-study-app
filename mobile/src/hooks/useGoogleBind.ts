import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { googleWebClientId } from "../services/googleLinkErrors";
import { linkCurrentUserWithIdToken, linkCurrentUserWithPopup } from "../services/googleLink";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleBind(onLinked: () => void): {
  ready: boolean;
  busy: boolean;
  error: string | null;
  bindGoogle: () => Promise<void>;
} {
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
    { scheme: "didao", path: "oauthredirect", preferLocalhost: true }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bindGoogle = useCallback(async () => {
    if (busy) return;
    setError(null);
    if (!configuredId) {
      setError("还没配置 Google 客户端。在 .env 里设置 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID。");
      return;
    }
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        const result = await linkCurrentUserWithPopup();
        if (result.ok) {
          onLinked();
          return;
        }
        if (!result.cancelled && result.message) setError(result.message);
        return;
      }
      if (!request) {
        setError("还没准备好，请稍后再试。");
        return;
      }
      const session = await promptAsync();
      if (session.type === "cancel" || session.type === "dismiss") return;
      if (session.type !== "success") {
        setError("绑定失败，请再试一次。");
        return;
      }
      const idToken = session.params.id_token;
      if (!idToken) {
        setError("绑定失败，请再试一次。");
        return;
      }
      const result = await linkCurrentUserWithIdToken(idToken, session.params.access_token);
      if (result.ok) {
        onLinked();
        return;
      }
      if (!result.cancelled && result.message) setError(result.message);
    } catch {
      setError("绑定失败，请再试一次。");
    } finally {
      setBusy(false);
    }
  }, [busy, configuredId, onLinked, promptAsync, request]);

  return {
    ready: Platform.OS === "web" || request != null,
    busy,
    error,
    bindGoogle
  };
}
