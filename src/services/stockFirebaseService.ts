import { getDb } from '@/lib/firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    writeBatch,
} from 'firebase/firestore';

export interface TransactionLog {
    id: string;
    date: string; // ISO String
    action: 'BUY_DCA' | 'TAKE_PROFIT';
    tier?: 'DCA 1' | 'DCA 2' | 'DCA 3' | 'DCA 4';
    price?: number;
    volumePercent: number; // % tỷ trọng giải ngân hoặc % lượng hàng đã chốt
    note?: string;
}

import { DROP_LEVELS, DEFAULT_DROP_LEVELS } from '@/utils/dcaConfig';

export interface StockTrackerDoc {
    symbol: string; // VD: "HPG", "ACB"
    userId?: string;
    createdAt: string;
    updatedAt: string;
    // Cấu hình 4 mức giảm % từ đỉnh (Lưu động trên Firestore cho từng mã)
    dropLevels?: number[]; // VD: [-25, -40, -55, -65]
    // Trạng thái đã giải ngân từng mức DCA (true = đã mua, false = chưa mua)
    dcaFilled: {
        dca1: boolean;
        dca2: boolean;
        dca3: boolean;
        dca4: boolean;
    };
    // Trạng thái đã chốt lời từng mức (true = đã chốt, false = chưa chốt)
    tpFilled?: {
        tp25: boolean;
        tp33: boolean;
        tp50: boolean;
        tp100: boolean;
    };
    // Thông tin chốt lời & vị thế
    position: {
        avgPrice: number; // Giá vốn trung bình
        totalAllocatedPercent: number; // Tổng % vốn đã vào (VD: 40%)
        realizedProfitPercent: number; // Tổng % lượng hàng đã chốt lời (VD: 50%)
        targetProfitPercent?: number; // Mục tiêu chốt lời (VD: 20%)
        logs: TransactionLog[];
    };
}

const COLLECTION_NAME = 'stocks_tracker';

export const DEFAULT_TRACKER_SYMBOLS = [
    'ACB',
    'DBC',
    'FPT',
    'HDG',
    'HPG',
    'IDC',
    'KDH',
    'MBB',
    'REE',
    'SSI',
    'TCB',
    'VPB',
];

function getDocId(symbol: string, userId?: string): string {
    const user = userId || 'default_user';
    return `${user}__${symbol.toUpperCase()}`;
}

/**
 * Loại bỏ tất cả giá trị undefined khỏi object/mảng để tránh lỗi Firestore
 */
function sanitizeForFirestore<T>(obj: T): T {
    return JSON.parse(
        JSON.stringify(obj, (_, v) => (v === undefined ? null : v))
    );
}

export function createDefaultStockTrackerDoc(
    symbol: string,
    userId?: string,
    customDropLevels?: number[]
): StockTrackerDoc {
    const sym = symbol.toUpperCase();
    const now = new Date().toISOString();
    const dropLevels = customDropLevels && customDropLevels.length === 4
        ? customDropLevels
        : (DROP_LEVELS[sym] || DEFAULT_DROP_LEVELS);

    return {
        symbol: sym,
        userId: userId || 'default_user',
        createdAt: now,
        updatedAt: now,
        dropLevels,
        dcaFilled: {
            dca1: false,
            dca2: false,
            dca3: false,
            dca4: false,
        },
        tpFilled: {
            tp25: false,
            tp33: false,
            tp50: false,
            tp100: false,
        },
        position: {
            avgPrice: 0,
            totalAllocatedPercent: 0,
            realizedProfitPercent: 0,
            targetProfitPercent: 20,
            logs: [],
        },
    };
}

/**
 * Lắng nghe thay đổi danh sách Watchlist realtime từ Firestore
 */
export function subscribeWatchlist(
    userId: string | undefined,
    onUpdate: (stocks: StockTrackerDoc[]) => void
) {
    const db = getDb();
    const targetUser = userId || 'default_user';
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', targetUser)
    );

    return onSnapshot(
        q,
        (snap) => {
            const list: StockTrackerDoc[] = snap.docs.map(
                (d) => d.data() as StockTrackerDoc
            );
            onUpdate(list);
        },
        (err) => {
            console.error('Lỗi subscribeWatchlist:', err);
        }
    );
}

/**
 * Khởi tạo danh sách mặc định nếu chưa có mã nào
 */
export async function initializeDefaultWatchlistIfEmpty(userId?: string): Promise<StockTrackerDoc[]> {
    const db = getDb();
    const targetUser = userId || 'default_user';
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', targetUser)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
        const initialDocs: StockTrackerDoc[] = [];
        for (const sym of DEFAULT_TRACKER_SYMBOLS) {
            const docData = createDefaultStockTrackerDoc(sym, targetUser);
            const docId = getDocId(sym, targetUser);
            await setDoc(doc(db, COLLECTION_NAME, docId), sanitizeForFirestore(docData));
            initialDocs.push(docData);
        }
        return initialDocs;
    }

    return snap.docs.map((d) => d.data() as StockTrackerDoc);
}

/**
 * Thêm cổ phiếu mới vào Firestore
 */
export async function addNewStock(
    symbol: string,
    userId?: string
): Promise<StockTrackerDoc> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);

    const docRef = doc(db, COLLECTION_NAME, docId);
    const existing = await getDoc(docRef);

    if (existing.exists()) {
        return existing.data() as StockTrackerDoc;
    }

    const newDoc = createDefaultStockTrackerDoc(sym, targetUser);
    await setDoc(docRef, sanitizeForFirestore(newDoc));
    return newDoc;
}

/**
 * Xóa cổ phiếu khỏi Firestore
 */
export async function removeStock(
    symbol: string,
    userId?: string
): Promise<void> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);
    await deleteDoc(doc(db, COLLECTION_NAME, docId));
}

/**
 * Cập nhật trạng thái Checkbox DCA từng tầng (dca1, dca2, dca3, dca4)
 * Nếu tích chọn tầng cao hơn (VD: DCA 2), tự động tích luôn các tầng trước đó (DCA 1)
 */
export async function updateDcaCheckbox(
    symbol: string,
    tier: 'dca1' | 'dca2' | 'dca3' | 'dca4',
    isChecked: boolean,
    userId?: string
): Promise<void> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);
    const docRef = doc(db, COLLECTION_NAME, docId);

    const now = new Date().toISOString();
    const dcaUpdates: Record<string, boolean> = {
        [tier]: isChecked,
    };

    // Nếu tích chọn = true, tự động tích các tầng trước đó
    if (isChecked) {
        if (tier === 'dca2') {
            dcaUpdates.dca1 = true;
        } else if (tier === 'dca3') {
            dcaUpdates.dca1 = true;
            dcaUpdates.dca2 = true;
        } else if (tier === 'dca4') {
            dcaUpdates.dca1 = true;
            dcaUpdates.dca2 = true;
            dcaUpdates.dca3 = true;
        }
    }

    await setDoc(
        docRef,
        sanitizeForFirestore({
            updatedAt: now,
            dcaFilled: dcaUpdates,
        }),
        { merge: true }
    );
}

/**
 * Cập nhật trạng thái Checkbox Chốt lời 4 mức (tp25, tp33, tp50, tp100)
 */
export async function updateTpCheckbox(
    symbol: string,
    tier: 'tp25' | 'tp33' | 'tp50' | 'tp100',
    isChecked: boolean,
    userId?: string
): Promise<void> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);
    const docRef = doc(db, COLLECTION_NAME, docId);

    const now = new Date().toISOString();
    await setDoc(
        docRef,
        sanitizeForFirestore({
            updatedAt: now,
            tpFilled: {
                [tier]: isChecked,
            },
        }),
        { merge: true }
    );
}

/**
 * CẬP NHẬT 4 MỨC GIẢM DCA (% từ đỉnh) cho từng mã trên Firestore
 */
export async function updateStockDropLevels(
    symbol: string,
    dropLevels: number[],
    userId?: string
): Promise<void> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);
    const docRef = doc(db, COLLECTION_NAME, docId);

    const now = new Date().toISOString();
    await setDoc(
        docRef,
        sanitizeForFirestore({
            updatedAt: now,
            dropLevels,
        }),
        { merge: true }
    );
}

/**
 * RESET DCA: Đưa 4 ô DCA về false và reset % vốn đã vào của 1 mã
 */
export async function resetStockDca(
    symbol: string,
    userId?: string
): Promise<void> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);
    const docRef = doc(db, COLLECTION_NAME, docId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const currentDoc = snap.data() as StockTrackerDoc;
    const remainingLogs = (currentDoc.position?.logs || []).filter((l) => l.action !== 'BUY_DCA');

    await setDoc(
        docRef,
        sanitizeForFirestore({
            updatedAt: new Date().toISOString(),
            dcaFilled: { dca1: false, dca2: false, dca3: false, dca4: false },
            position: {
                ...currentDoc.position,
                totalAllocatedPercent: 0,
                logs: remainingLogs,
            },
        }),
        { merge: true }
    );
}

/**
 * RESET CHỐT LỜI: Đưa 4 ô Chốt lời về false và reset % đã chốt của 1 mã
 */
export async function resetStockTp(
    symbol: string,
    userId?: string
): Promise<void> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);
    const docRef = doc(db, COLLECTION_NAME, docId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const currentDoc = snap.data() as StockTrackerDoc;
    const remainingLogs = (currentDoc.position?.logs || []).filter((l) => l.action !== 'TAKE_PROFIT');

    await setDoc(
        docRef,
        sanitizeForFirestore({
            updatedAt: new Date().toISOString(),
            tpFilled: { tp25: false, tp33: false, tp50: false, tp100: false },
            position: {
                ...currentDoc.position,
                realizedProfitPercent: 0,
                logs: remainingLogs,
            },
        }),
        { merge: true }
    );
}

/**
 * RESET TOÀN BỘ VỊ THẾ CỦA 1 MÃ (Bắt đầu chu kỳ / năm mới)
 */
export async function resetStockCycle(
    symbol: string,
    userId?: string
): Promise<void> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);
    const docRef = doc(db, COLLECTION_NAME, docId);

    await setDoc(
        docRef,
        sanitizeForFirestore({
            updatedAt: new Date().toISOString(),
            dcaFilled: { dca1: false, dca2: false, dca3: false, dca4: false },
            tpFilled: { tp25: false, tp33: false, tp50: false, tp100: false },
            position: {
                avgPrice: 0,
                totalAllocatedPercent: 0,
                realizedProfitPercent: 0,
                targetProfitPercent: 20,
                logs: [],
            },
        }),
        { merge: true }
    );
}

/**
 * RESET HÀNG LOẠT TOÀN BỘ DANH MỤC (Reset Chu kỳ Năm Mới)
 */
export async function resetAllStocksCycle(
    options: { resetDca?: boolean; resetTp?: boolean; clearLogs?: boolean },
    userId?: string
): Promise<void> {
    const db = getDb();
    const targetUser = userId || 'default_user';
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', targetUser)
    );
    const snap = await getDocs(q);

    if (snap.empty) return;

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    snap.docs.forEach((docItem) => {
        const docRef = docItem.ref;
        const currentData = docItem.data() as StockTrackerDoc;
        const updatePayload: Partial<StockTrackerDoc> = {
            updatedAt: now,
        };

        if (options.resetDca) {
            updatePayload.dcaFilled = { dca1: false, dca2: false, dca3: false, dca4: false };
            if (!updatePayload.position) updatePayload.position = { ...currentData.position };
            updatePayload.position.totalAllocatedPercent = 0;
        }

        if (options.resetTp) {
            updatePayload.tpFilled = { tp25: false, tp33: false, tp50: false, tp100: false };
            if (!updatePayload.position) updatePayload.position = { ...currentData.position };
            updatePayload.position.realizedProfitPercent = 0;
        }

        if (options.clearLogs) {
            if (!updatePayload.position) updatePayload.position = { ...currentData.position };
            updatePayload.position.logs = [];
        }

        batch.set(docRef, sanitizeForFirestore(updatePayload), { merge: true });
    });

    await batch.commit();
}

/**
 * Ghi nhận giao dịch (Mua DCA / Chốt lời) & tự động tính lại vị thế
 */
export async function addTransactionLog(
    symbol: string,
    logData: Omit<TransactionLog, 'id' | 'date'> & { date?: string },
    userId?: string
): Promise<StockTrackerDoc> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);
    const docRef = doc(db, COLLECTION_NAME, docId);

    const snap = await getDoc(docRef);
    let currentDoc: StockTrackerDoc = snap.exists()
        ? (snap.data() as StockTrackerDoc)
        : createDefaultStockTrackerDoc(sym, targetUser);

    const currentPosition = currentDoc.position || {
        avgPrice: 0,
        totalAllocatedPercent: 0,
        realizedProfitPercent: 0,
        targetProfitPercent: 20,
        logs: [],
    };

    const newLog: TransactionLog = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        date: logData.date || new Date().toISOString(),
        action: logData.action,
        volumePercent: Number(logData.volumePercent) || 0,
        note: logData.note || '',
        ...(logData.tier ? { tier: logData.tier } : {}),
        ...(logData.price ? { price: Number(logData.price) } : {}),
    };

    const updatedLogs = [...(currentPosition.logs || []), newLog];

    // Tính toán lại vị thế từ toàn bộ logs
    let totalAllocated = 0;
    let totalSpentWeighted = 0;
    let totalRealizedPercent = 0;
    const dcaFilledState = {
        dca1: false,
        dca2: false,
        dca3: false,
        dca4: false,
        ...(currentDoc.dcaFilled || {}),
    };
    const tpFilledState = {
        tp25: false,
        tp33: false,
        tp50: false,
        tp100: false,
        ...(currentDoc.tpFilled || {}),
    };

    for (const log of updatedLogs) {
        if (log.action === 'BUY_DCA') {
            totalAllocated += Number(log.volumePercent) || 0;
            if (log.price) {
                totalSpentWeighted += (Number(log.price) || 0) * (Number(log.volumePercent) || 0);
            }
            if (log.tier) {
                if (log.tier === 'DCA 1') {
                    dcaFilledState.dca1 = true;
                } else if (log.tier === 'DCA 2') {
                    dcaFilledState.dca1 = true;
                    dcaFilledState.dca2 = true;
                } else if (log.tier === 'DCA 3') {
                    dcaFilledState.dca1 = true;
                    dcaFilledState.dca2 = true;
                    dcaFilledState.dca3 = true;
                } else if (log.tier === 'DCA 4') {
                    dcaFilledState.dca1 = true;
                    dcaFilledState.dca2 = true;
                    dcaFilledState.dca3 = true;
                    dcaFilledState.dca4 = true;
                }
            }
        } else if (log.action === 'TAKE_PROFIT') {
            const vol = Number(log.volumePercent) || 0;
            totalRealizedPercent += vol;
            if (vol === 25) tpFilledState.tp25 = true;
            if (vol === 33) tpFilledState.tp33 = true;
            if (vol === 50) tpFilledState.tp50 = true;
            if (vol === 100) tpFilledState.tp100 = true;
        }
    }

    const avgPrice = totalAllocated > 0 && totalSpentWeighted > 0 ? Math.round(totalSpentWeighted / totalAllocated) : 0;

    const updatedDoc: StockTrackerDoc = {
        ...currentDoc,
        updatedAt: new Date().toISOString(),
        dcaFilled: dcaFilledState,
        tpFilled: tpFilledState,
        position: {
            ...currentPosition,
            avgPrice,
            totalAllocatedPercent: Math.min(100, totalAllocated),
            realizedProfitPercent: Math.min(100, totalRealizedPercent),
            logs: updatedLogs,
        },
    };

    const payload = sanitizeForFirestore(updatedDoc);
    await setDoc(docRef, payload, { merge: true });
    return updatedDoc;
}

/**
 * Xóa một log giao dịch
 */
export async function removeTransactionLog(
    symbol: string,
    logId: string,
    userId?: string
): Promise<StockTrackerDoc> {
    const db = getDb();
    const sym = symbol.trim().toUpperCase();
    const targetUser = userId || 'default_user';
    const docId = getDocId(sym, targetUser);
    const docRef = doc(db, COLLECTION_NAME, docId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        throw new Error('Không tìm thấy document');
    }

    const currentDoc = snap.data() as StockTrackerDoc;
    const currentPosition = currentDoc.position || {
        avgPrice: 0,
        totalAllocatedPercent: 0,
        realizedProfitPercent: 0,
        targetProfitPercent: 20,
        logs: [],
    };
    const filteredLogs = (currentPosition.logs || []).filter((l) => l.id !== logId);

    let totalAllocated = 0;
    let totalSpentWeighted = 0;
    let totalRealizedPercent = 0;

    for (const log of filteredLogs) {
        if (log.action === 'BUY_DCA') {
            totalAllocated += Number(log.volumePercent) || 0;
            if (log.price) {
                totalSpentWeighted += (Number(log.price) || 0) * (Number(log.volumePercent) || 0);
            }
        } else if (log.action === 'TAKE_PROFIT') {
            totalRealizedPercent += Number(log.volumePercent) || 0;
        }
    }

    const avgPrice = totalAllocated > 0 && totalSpentWeighted > 0 ? Math.round(totalSpentWeighted / totalAllocated) : 0;

    const updatedDoc: StockTrackerDoc = {
        ...currentDoc,
        updatedAt: new Date().toISOString(),
        position: {
            ...currentPosition,
            avgPrice,
            totalAllocatedPercent: Math.min(100, totalAllocated),
            realizedProfitPercent: Math.min(100, totalRealizedPercent),
            logs: filteredLogs,
        },
    };

    await setDoc(docRef, sanitizeForFirestore(updatedDoc), { merge: true });
    return updatedDoc;
}
