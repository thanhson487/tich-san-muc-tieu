import { getDb } from '@/lib/firebase';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    where,
} from 'firebase/firestore';

export interface MonthlyAssetDoc {
    id?: string;
    month: string;           // 'YYYY-MM' (VD: '2026-08')
    userId?: string;
    cash: number;            // Tiền mặt (VNĐ)
    fund: number;            // Chứng chỉ quỹ (VNĐ)
    stock: number;           // Cổ phiếu (VNĐ)
    total: number;           // cash + fund + stock (VNĐ)
    netFlow?: number;        // Dòng tiền nạp/rút trong tháng (VD: +15.000.000 hoặc -30.000.000)
    note?: string;           // Ghi chú (VD: "Rút 30tr mua xe", "Nạp thưởng Tết")
    updatedAt: string;       // ISO Date
}

const COLLECTION_NAME = 'monthly_assets';

function getDocId(month: string, userId?: string): string {
    const user = userId || 'default_user';
    return `${user}__${month}`;
}

/**
 * Loại bỏ undefined trước khi lưu Firestore
 */
function sanitizeForFirestore<T>(obj: T): T {
    return JSON.parse(
        JSON.stringify(obj, (_, v) => (v === undefined ? null : v))
    );
}

/**
 * Lắng nghe danh sách tài sản theo tháng (sắp xếp theo tháng tăng dần)
 */
export function subscribeMonthlyAssets(
    userId: string | undefined,
    callback: (data: MonthlyAssetDoc[]) => void
) {
    const db = getDb();
    const targetUser = userId || 'default_user';
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', targetUser)
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const records = snapshot.docs
                .map((docSnap) => docSnap.data() as MonthlyAssetDoc)
                .sort((a, b) => (a.month || '').localeCompare(b.month || ''));
            callback(records);
        },
        (error) => {
            console.error('Lỗi subscribeMonthlyAssets:', error);
        }
    );
}

/**
 * Thêm hoặc cập nhật dữ liệu tài sản của một tháng
 */
export async function saveMonthlyAsset(
    data: {
        month: string;
        cash: number;
        fund: number;
        stock: number;
        netFlow?: number;
        note?: string;
    },
    userId?: string
): Promise<void> {
    const db = getDb();
    const targetUser = userId || 'default_user';
    const docId = getDocId(data.month, targetUser);

    const cash = Number(data.cash) || 0;
    const fund = Number(data.fund) || 0;
    const stock = Number(data.stock) || 0;
    const total = cash + fund + stock;
    const netFlow = data.netFlow !== undefined ? Number(data.netFlow) : 0;

    const payload: MonthlyAssetDoc = {
        month: data.month,
        userId: targetUser,
        cash,
        fund,
        stock,
        total,
        netFlow,
        note: data.note || '',
        updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, COLLECTION_NAME, docId), sanitizeForFirestore(payload), { merge: true });
}

/**
 * Xóa bản ghi của một tháng
 */
export async function deleteMonthlyAsset(
    month: string,
    userId?: string
): Promise<void> {
    const db = getDb();
    const targetUser = userId || 'default_user';
    const docId = getDocId(month, targetUser);
    await deleteDoc(doc(db, COLLECTION_NAME, docId));
}
