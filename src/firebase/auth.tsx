import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
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
  /** Resolve to the uid, so the caller can ask where to send them next
   *  without waiting for the auth listener to catch up. Empty without a
   *  Firebase project. */
  signIn: (email: string, password: string) => Promise<string>;
  register: (email: string, password: string) => Promise<string>;
  google: () => Promise<string>;
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
      if (!auth) return "";
      return (await signInWithEmailAndPassword(auth, email, password)).user.uid;
    },
    register: async (email, password) => {
      if (!auth) return "";
      return (await createUserWithEmailAndPassword(auth, email, password)).user
        .uid;
    },
    google: async () => {
      if (!auth) return "";
      return (await signInWithPopup(auth, new GoogleAuthProvider())).user.uid;
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

/**
 * Everything behind the tab bar and the drawer needs a session. PRD §10.2a.
 *
 * Emergency screens are deliberately outside this: a screen that appears
 * over the lock screen while someone is in danger must not fail on an
 * expired token, and neither of them reads Firestore.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();

  // No project means there is nobody to be signed in as, and the app still
  // has to be walkable on synthetic data — a guard that locks the app
  // without a backend would kill the demo safety net.
  if (!configured) return <>{children}</>;

  // Blank rather than a spinner, and short: this only spans the first
  // auth callback. DESIGN.md §8 bans the spinner outright.
  if (!ready) return null;

  return user ? <>{children}</> : <Navigate to="/sign-in" replace />;
}
