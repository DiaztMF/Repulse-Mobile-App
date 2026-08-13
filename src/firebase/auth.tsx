import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, configured } from "./app";

type Ctx = {
  user: User | null;
  /** Null until the first auth callback, so guards can wait instead of
   *  bouncing a signed-in user to the sign-in screen on every reload. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  google: () => Promise<void>;
  reset: (email: string) => Promise<void>;
  leave: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  // Without a project the whole flow still has to be walkable, so these
  // resolve rather than throw.
  const value: Ctx = {
    user,
    ready,
    signIn: async (email, password) => {
      if (auth) await signInWithEmailAndPassword(auth, email, password);
    },
    register: async (email, password) => {
      if (auth) await createUserWithEmailAndPassword(auth, email, password);
    },
    google: async () => {
      if (auth) await signInWithPopup(auth, new GoogleAuthProvider());
    },
    reset: async (email) => {
      if (auth) await sendPasswordResetEmail(auth, email);
    },
    leave: async () => {
      if (auth) await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
