import { createContext, useContext, type ReactNode } from "react";

export type AuthProfile = {
  uid: string;
  isAnonymous: boolean;
  email: string | null;
};

const AuthContext = createContext<AuthProfile | null>(null);

export function AuthProvider({ value, children }: { value: AuthProfile; children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthProfile {
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
