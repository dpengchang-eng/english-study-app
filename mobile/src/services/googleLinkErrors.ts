export const GOOGLE_ALREADY_USED = "这个 Google 已经用过了";
export const GOOGLE_BIND_FAIL = "没绑上，再试一次";

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
  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/user-cancelled"
  ) {
    return { ok: false, cancelled: true, message: "" };
  }
  if (
    code === "auth/credential-already-in-use" ||
    code === "auth/email-already-in-use" ||
    code === "auth/account-exists-with-different-credential"
  ) {
    return { ok: false, message: GOOGLE_ALREADY_USED };
  }
  return { ok: false, message: GOOGLE_BIND_FAIL };
}

export function googleWebClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
}
