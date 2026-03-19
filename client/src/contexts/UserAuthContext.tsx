// UserAuthContext — ゲスト / moomoo 接続状態を管理
// 認証情報（ID・パスワード）は一切保持しない

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type UserType = "guest" | "moomoo";

interface UserAuthState {
  userType: UserType;
  isConnected: boolean;   // moomoo OpenD に接続済みか
  setGuest: () => void;
  setMoomoo: () => void;
  disconnect: () => void;
}

const STORAGE_KEY = "brake_user_type";

function loadUserType(): UserType {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "moomoo") return "moomoo";
  } catch {}
  return "guest";
}

const UserAuthContext = createContext<UserAuthState | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [userType, setUserType] = useState<UserType>(loadUserType);

  const setGuest = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "guest");
    setUserType("guest");
  }, []);

  const setMoomoo = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "moomoo");
    setUserType("moomoo");
  }, []);

  const disconnect = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "guest");
    setUserType("guest");
  }, []);

  return (
    <UserAuthContext.Provider value={{
      userType,
      isConnected: userType === "moomoo",
      setGuest,
      setMoomoo,
      disconnect,
    }}>
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used inside UserAuthProvider");
  return ctx;
}
