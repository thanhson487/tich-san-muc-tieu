import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseApp() {
  if (!getApps().length) {
    const missing = Object.entries(firebaseConfig)
      .filter(([, v]) => !v || String(v).trim().length === 0)
      .map(([k]) => k);
    if (missing.length) {
      throw new Error(`Thiếu cấu hình Firebase: ${missing.join(', ')}`);
    }
    initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

let cachedDb: Firestore | null = null;
let persistenceAttempted = false;

export function getDb() {
  if (!cachedDb) {
    const app = getFirebaseApp();
    cachedDb = getFirestore(app);
    if (!persistenceAttempted) {
      persistenceAttempted = true;
      enableIndexedDbPersistence(cachedDb).catch((err: any) => {
        const msg = String(err?.message || '');
        if (
          err?.code === 'failed-precondition' ||
          err?.code === 'unimplemented' ||
          msg.includes('already been started')
        ) {
          return;
        }
        throw err;
      });
    }
  }
  return cachedDb;
}
