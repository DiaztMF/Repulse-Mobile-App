import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";

const config = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
  databaseURL: import.meta.env.VITE_FB_DATABASE_URL,
};

/** Absent config is a supported state, not an error: the app runs on
 *  synthetic data so it can be built and demonstrated without a project,
 *  and so a bad key never takes the whole UI down. */
export const configured = Boolean(config.apiKey && config.projectId);

/**
 * localStorage first, IndexedDB behind it. `getAuth()` used to choose, and
 * it chooses IndexedDB.
 *
 * That class listens for `pagehide` and `visibilitychange`. When a native
 * dialog covers the WebView — Android's own "let RePulse turn Bluetooth
 * on?" being the one that found this — it sets `isHiding` and closes the
 * database, and every read during that window throws "Database is
 * closing/hidden". Firebase then reports `user: null`, which is
 * indistinguishable from signed out, and a signed-in person is shown a
 * login form for the account they are already in. Waiting for `ready`
 * cannot help: the answer had arrived, and the answer was wrong.
 *
 * localStorage has no hidden state and no open handle to lose — reads are
 * synchronous and work while the page is covered. IndexedDB stays second
 * so nothing is lost if localStorage is ever refused, and because
 * `PersistenceUserManager.create` searches the whole list for an existing
 * session and migrates it into the chosen one: anybody already signed in
 * moves across on their next launch rather than being asked to sign in
 * again.
 */
let app: FirebaseApp | undefined;
export const auth: Auth | undefined = configured
  ? initializeAuth((app = initializeApp(config)), {
      persistence: [browserLocalPersistence, indexedDBLocalPersistence],
    })
  : undefined;
export const db: Firestore | undefined = app ? getFirestore(app) : undefined;
export const rtdb: Database | undefined =
  app && config.databaseURL ? getDatabase(app) : undefined;
