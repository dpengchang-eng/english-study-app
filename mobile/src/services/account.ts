import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, linkWithCredential, OAuthProvider, type User } from "firebase/auth";
import { auth } from "../firebase";

WebBrowser.maybeCompleteAuthSession();

export function accountLabel(user: User | null): string {
  if (!user) return "未登录";
  if (user.isAnonymous) return "匿名账号（换设备不会同步）";
  const providers = user.providerData.map((item) => item.providerId);
  if (providers.includes("apple.com")) return "已绑定 Apple";
  if (providers.includes("google.com")) return "已绑定 Google";
  return "已绑定账号";
}

export function isBound(user: User | null): boolean {
  return Boolean(user && !user.isAnonymous);
}

export async function bindApple(): Promise<void> {
  if (Platform.OS !== "ios") {
    throw new Error("Apple 绑定只在 iPhone 上可用。");
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error("这台设备不支持 Apple 登录。");
  }
  const user = auth.currentUser;
  if (!user) throw new Error("还没有登录。");
  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL
    ]
  });
  if (!apple.identityToken) {
    throw new Error("Apple 没有返回登录凭证。");
  }
  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({ idToken: apple.identityToken });
  await linkWithCredential(user, credential);
}

export function useGoogleAuthRequest() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  return Google.useIdTokenAuthRequest({
    clientId: clientId || "missing.apps.googleusercontent.com",
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim(),
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim()
  });
}

export async function bindGoogleIdToken(idToken: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("还没有登录。");
  const credential = GoogleAuthProvider.credential(idToken);
  await linkWithCredential(user, credential);
}

export function googleClientConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim());
}
