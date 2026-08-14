import { createContext, useContext, type ReactNode } from "react";

export type AuthProfile = {
  uid: string;
  isAnonymous: boolean;
  email: string | null;
};

type AuthValue = AuthProfile & {
  markLinked: (email: string | null) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({
  value,
  setValue,
  children
}: {
  value: AuthProfile;
  setValue: (next: AuthProfile) => void;
  children: ReactNode;
}) {
  const markLinked = (email: string | null): void => {
    setValue({ uid: value.uid, isAnonymous: false, email });
  };
  return <AuthContext.Provider value={{ ...value, markLinked }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth 必须在 AuthProvider 里用");
  return value;
}

export function profileFromUser(user: { uid: string; isAnonymous: boolean; email: string | null }): AuthProfile {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    email: user.email
  };
}
