import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const hasConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

if (hasConfig) {
  console.info("[firebase] Config detectada:", {
    apiKey: firebaseConfig.apiKey?.slice(0, 6) + "****",
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
  });
} else {
  console.warn("[firebase] Variables PUBLIC_FIREBASE_* faltantes o vacías");
}

export type AppType = ReturnType<typeof initializeApp>;

const existing = getApps()[0];
if (existing && hasConfig) {
  try {
    deleteApp(existing);
  } catch {
    // ignore
  }
}

const app: AppType | null = hasConfig ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export default app;
