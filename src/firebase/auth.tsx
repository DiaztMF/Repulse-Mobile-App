import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
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

/**
 * Credential Manager answers "No credentials available" on its first call
 * after a cold install and shows the account list on the second. It is a
 * warm-up, not a misconfiguration, and asking twice is enough to get past
 * it — a button that has to be pressed twice is a button that does not
 * work, and the second press is not something a judge will give it.
 *
 * The retry is narrowed to that one message on purpose. Every other
 * failure, a cancelled sheet above all, has to travel: reopening the
 * chooser on somebody who just dismissed it would be worse than the bug.
 *
 * The plugin's legacy picker was tried here and is worse. Its result comes
 * back through `startActivityForResult`, and on this phone the activity
 * result never reaches the plugin — logcat says "Unable to find a Capacitor
 * plugin to handle requestCode", and two minutes later "Couldn't save last
 * FirebaseAuthentication's Plugin signInWithGoogle call", which is the
 * promise still hanging. Credential Manager needs no activity result and
 * cannot lose one.
 */
async function googleCredential() {
  try {
    return await FirebaseAuthentication.signInWithGoogle();
  } catch (e) {
    const message = (e as { message?: string })?.message ?? "";
    if (!/no credential/i.test(message)) throw e;
    console.warn("[auth] credential manager was cold, asking again");
    return await FirebaseAuthentication.signInWithGoogle();
  }
}

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
    /**
     * On the phone the account chooser has to be native, because a popup
     * cannot come back.
     *
     * `signInWithPopup` inside the WebView calls `window.open`, which
     * Android hands to Chrome. The popup flow then waits for the opened
     * window to `postMessage` its result to the window that opened it —
     * and a Chrome tab has no such relationship with a WebView in another
     * app. So the person picks their account, Google says it worked, and
     * they are left standing in a browser with no way back. Nothing is
     * thrown, nothing times out, and nothing in this app ever hears about
     * it.
     *
     * The native chooser runs in this app's own process and returns a
     * token to the caller. `skipNativeAuth` keeps the session itself in the
     * JS SDK, where every other Firebase call in this app already lives.
     */
    google: async () => {
      if (!auth) return "";
      if (!Capacitor.isNativePlatform()) {
        return (await signInWithPopup(auth, new GoogleAuthProvider())).user.uid;
      }
      const { credential } = await googleCredential();
      // No token is not a cancellation — a cancellation throws. It means
      // the native sign-in succeeded and gave us nothing to sign in with,
      // which is what a missing SHA-1 or a missing google-services.json
      // looks like from here.
      if (!credential?.idToken) throw new Error("Google returned no ID token");
      const cred = GoogleAuthProvider.credential(credential.idToken);
      return (await signInWithCredential(auth, cred)).user.uid;
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
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();

  // No project means there is nobody to be signed in as, and the app still
  // has to be walkable on synthetic data — a guard that locks the app
  // without a backend would kill the demo safety net.
  if (!configured) return <>{children}</>;

  // Show smooth brand loading screen while waiting for initial auth callback
  if (!ready) return <LoadingScreen />;

  return user ? <>{children}</> : <Navigate to="/sign-in" replace />;
}
