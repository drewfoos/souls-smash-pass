"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Resolves with the signed-in user's display name so callers can show a toast. */
  signInWithGoogle: () => Promise<string>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async (): Promise<string> => {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);

      if (process.env.NODE_ENV === "development") {
        console.log("[Auth] Google sign-in success", {
          uid: result.user.uid,
          displayName: result.user.displayName,
        });
      }

      return result.user.displayName ?? "Tarnished";
    } catch (err: unknown) {
      if (process.env.NODE_ENV === "development") {
        const e = err as { code?: string; message?: string };
        console.groupCollapsed("[Auth] signInWithPopup failed");
        console.log("Code:", e.code, "Message:", e.message);
        console.groupEnd();
      }

      // Re-throw the ORIGINAL Firebase error so you keep the real code/message.
      throw err;
    }
  };

  const signOutUser = async () => {
    const auth = getFirebaseAuth();

    try {
      await signOut(auth);
    } catch (err: unknown) {
      if (process.env.NODE_ENV === "development") {
        const e = err as { code?: string; message?: string };
        console.error("[Auth] signOut failed:", e.code, e.message);
      }
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithGoogle, signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
