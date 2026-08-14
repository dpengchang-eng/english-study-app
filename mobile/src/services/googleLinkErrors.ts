export type GoogleLinkFailure = {
  ok: false;
  cancelled?: boolean;
  message: string;
};

export function firebaseErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

export function mapGoogleLinkError(error: unknown): GoogleLinkFailure {
  const code = firebaseErrorCode(error);
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return { ok: false, cancelled: true, message: "" };
  }
  if (
    code === "auth/credential-already-in-use" ||
    code === "auth/email-already-in-use" ||
    code === "auth/account-exists-with-different-credential"
  ) {
    return {
      ok: false,
      message: "这个 Google 账号已绑定其他用户。换一个账号再试，当前词本还在。"
    };
  }
  return { ok: false, message: "绑定失败，请再试一次。" };
}

export function googleWebClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
}
