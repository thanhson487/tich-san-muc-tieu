import { getDb } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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
