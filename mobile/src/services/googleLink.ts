import { GoogleAuthProvider, linkWithCredential, linkWithPopup, type User } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { firebaseErrorCode, mapGoogleLinkError, type GoogleLinkFailure } from "./googleLinkErrors";
import { SEOUL_TZ } from "./quotaLimits";

export type GoogleLinkResult = { ok: true; uid: string; email: string | null } | GoogleLinkFailure;

function sameUidOrFail(uidBefore: string, user: User): GoogleLinkResult {
  if (user.uid !== uidBefore) {
    return { ok: false, message: "绑定失败，账号没有连上当前用户。" };
  }
  return { ok: true, uid: user.uid, email: user.email };
}

async function rememberLinkedProfile(user: User): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        googleEmail: user.email ?? null,
        updatedAt: Timestamp.now(),
        locale: "zh-CN",
        timezone: SEOUL_TZ
      },
      { merge: true }
    );
  } catch {
    // bind still succeeded
  }
}

async function finishLink(uidBefore: string, user: User): Promise<GoogleLinkResult> {
  const checked = sameUidOrFail(uidBefore, user);
  if (!checked.ok) return checked;
  await rememberLinkedProfile(user);
  return checked;
}

function alreadyLinkedResult(uidBefore: string, error: unknown): GoogleLinkResult | null {
  if (firebaseErrorCode(error) !== "auth/provider-already-linked") return null;
  const user = auth.currentUser;
  if (!user || user.uid !== uidBefore) {
    return { ok: false, message: "绑定失败，账号没有连上当前用户。" };
  }
  return { ok: true, uid: user.uid, email: user.email };
}

/** Link Google to the current anonymous uid. Never signIn — that would create a new uid. */
export async function linkCurrentUserWithIdToken(idToken: string, accessToken?: string): Promise<GoogleLinkResult> {
  const user = auth.currentUser;
  if (!user) return { ok: false, message: "还没登录，请重启应用。" };
  const uidBefore = user.uid;
  try {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    const result = await linkWithCredential(user, credential);
    return finishLink(uidBefore, result.user);
  } catch (error) {
    return alreadyLinkedResult(uidBefore, error) ?? mapGoogleLinkError(error);
  }
}

/** Web / Expo web. Same rule: link the current user, never create a new uid. */
export async function linkCurrentUserWithPopup(): Promise<GoogleLinkResult> {
  const user = auth.currentUser;
  if (!user) return { ok: false, message: "还没登录，请重启应用。" };
  const uidBefore = user.uid;
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await linkWithPopup(user, provider);
    return finishLink(uidBefore, result.user);
  } catch (error) {
    return alreadyLinkedResult(uidBefore, error) ?? mapGoogleLinkError(error);
  }
}
