import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
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

let app: FirebaseApp | undefined;
export const auth: Auth | undefined = configured
  ? getAuth((app = initializeApp(config)))
  : undefined;
export const db: Firestore | undefined = app ? getFirestore(app) : undefined;
export const rtdb: Database | undefined =
  app && config.databaseURL ? getDatabase(app) : undefined;
