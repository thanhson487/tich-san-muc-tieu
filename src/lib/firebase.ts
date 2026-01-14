import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDEUHfad8GGuml2NwH149EFPd4PT0Z8Ea0",
  authDomain: "react-firebase-demo-5373a.firebaseapp.com",
  projectId: "react-firebase-demo-5373a",
  storageBucket: "react-firebase-demo-5373a.firebasestorage.app",
  messagingSenderId: "463748735778",
  appId: "1:463748735778:web:b2cc1593bea191f3e63b7b",
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
