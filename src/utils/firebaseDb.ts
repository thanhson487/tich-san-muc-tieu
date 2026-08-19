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
  state: {
    basePrice?: number | null
    tradeType?: string
    isNightMode?: boolean
    checkedKeys?: number[]
    rows: any[]
    summary?: {
      avgActive?: number
      totalLotActive?: number
      totalLotFull?: number
    }
    updatedAt: number | null
  }
) {
  const db = getDb();
  await setDoc(
    doc(db, AVERAGE_PRICE_COLLECTION, userId),
    {
      userId,
      basePrice: state.basePrice ?? null,
      tradeType: state.tradeType ?? 'BUY',
      isNightMode: state.isNightMode ?? false,
      checkedKeys: Array.isArray(state.checkedKeys) ? state.checkedKeys : [],
      rows: state.rows,
      summary: state.summary ?? null,
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

const TICH_SAN_COLLECTION = 'tich_san_settings';

export const DEFAULT_TICH_SAN_SYMBOLS = [
  "ACB",
  "DBC",
  "FPT",
  "HDG",
  "HPG",
  "IDC",
  "KDH",
  "MBB",
  "REE",
  "SSI",
  "TCB",
  "VPB",
];

export async function fbGetTichSanSymbols(userId?: string): Promise<string[]> {
  try {
    const db = getDb();
    const docId = userId || 'default_user';
    const snap = await getDoc(doc(db, TICH_SAN_COLLECTION, docId));
    if (snap.exists() && Array.isArray(snap.data()?.symbols) && snap.data().symbols.length > 0) {
      return snap.data().symbols;
    }
    // Nếu chưa có, tự khởi tạo danh sách mặc định lên Firebase
    await setDoc(doc(db, TICH_SAN_COLLECTION, docId), {
      symbols: DEFAULT_TICH_SAN_SYMBOLS,
      updatedAt: Date.now(),
    });
    return DEFAULT_TICH_SAN_SYMBOLS;
  } catch (err) {
    console.error('Lỗi khi lấy danh sách mã tích sản từ Firebase:', err);
    return DEFAULT_TICH_SAN_SYMBOLS;
  }
}

export async function fbSaveTichSanSymbols(symbols: string[], userId?: string): Promise<void> {
  try {
    const db = getDb();
    const docId = userId || 'default_user';
    await setDoc(
      doc(db, TICH_SAN_COLLECTION, docId),
      {
        symbols,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Lỗi khi lưu danh sách mã tích sản vào Firebase:', err);
    throw err;
  }
}

