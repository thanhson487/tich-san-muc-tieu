import { getDb } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  setDoc,
  where,
} from 'firebase/firestore';

const COLLECTION = 'transactions';

export async function fbAddTransaction(amount: number, date: string) {
  const db = getDb();
  const createdAt = Date.now();
  const res = await addDoc(collection(db, COLLECTION), { amount, date, createdAt });
  return res.id;
}

export async function fbGetAllTransactions() {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function fbUpdateTransaction(id: string, updates: { amount?: number; date?: string }) {
  const db = getDb();
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, updates as any);
}

export async function fbDeleteTransaction(id: string) {
  const db = getDb();
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}

export function fbOnTransactionsSnapshot(cb: (items: any[]) => void) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(items);
  });
  return unsub;
}

const TRADE_COLLECTION = 'trade_profiles';

export async function fbUpsertTradeProfile(userId: string, profile: { id: string; name: string; state: any }) {
  const db = getDb();
  const docId = `${userId}__${profile.id}`;
  await setDoc(doc(db, TRADE_COLLECTION, docId), {
    userId,
    id: profile.id,
    name: profile.name,
    state: profile.state,
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function fbGetTradeProfiles(userId: string) {
  const db = getDb();
  const q = query(collection(db, TRADE_COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id.split('__')[1], ...(d.data() as any) }));
}

export async function fbDeleteTradeProfile(userId: string, id: string) {
  const db = getDb();
  const docId = `${userId}__${id}`;
  await deleteDoc(doc(db, TRADE_COLLECTION, docId));
}

const AVERAGE_PRICE_COLLECTION = 'average_price_states';

export async function fbUpsertAveragePriceState(
  userId: string,
  state: { rows: any[]; updatedAt: number }
) {
  const db = getDb();
  await setDoc(
    doc(db, AVERAGE_PRICE_COLLECTION, userId),
    {
      userId,
      rows: state.rows,
      updatedAt: state.updatedAt,
    },
    { merge: true }
  );
}

export async function fbGetAveragePriceState(userId: string) {
  const db = getDb();
  const snap = await getDoc(doc(db, AVERAGE_PRICE_COLLECTION, userId));
  if (!snap.exists()) return null;
  return snap.data();
}
