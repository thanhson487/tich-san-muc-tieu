/**
 * Utility: Tự động chọn mã cổ phiếu luân phiên theo ngày làm việc (Thứ 2 - Thứ 6)
 */

// Mốc ngày cơ sở bắt đầu chu kỳ luân phiên (06/02/2026)
const BASE_DATE = new Date(2026, 1, 6);

/**
 * Kiểm tra xem một ngày có phải là ngày làm việc (Thứ 2 -> Thứ 6) hay không
 */
export function isWeekday(date: Date): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5; // 1: Thứ Hai -> 5: Thứ Sáu
}

/**
 * Lấy mã cổ phiếu được chọn cho ngày hôm nay từ danh sách mã động
 * @param symbols Danh sách mã cổ phiếu động (từ Watchlist)
 * @param targetDate Ngày kiểm tra (mặc định là hôm nay)
 * @returns { symbol: string | null, isWeekend: boolean, index: number, total: number }
 */
export function getTodayStock(
    symbols: string[] = [],
    targetDate: Date = new Date()
): {
    symbol: string | null;
    isWeekend: boolean;
    index: number;
    total: number;
} {
    if (!symbols || symbols.length === 0) {
        return { symbol: null, isWeekend: false, index: -1, total: 0 };
    }

    // 1. Sắp xếp danh sách mã theo thứ tự bảng chữ cái A-Z
    const sortedCodes = [...symbols].map((s) => s.trim().toUpperCase()).sort((a, b) => a.localeCompare(b));

    const todayMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    // 2. Nếu là Thứ 7 hoặc Chủ Nhật
    if (!isWeekday(todayMidnight)) {
        return {
            symbol: null,
            isWeekend: true,
            index: -1,
            total: sortedCodes.length,
        };
    }

    // 3. Đếm số ngày làm việc từ BASE_DATE đến ngày được chọn
    let count = 0;
    const cur = new Date(BASE_DATE.getFullYear(), BASE_DATE.getMonth(), BASE_DATE.getDate());

    if (cur <= todayMidnight) {
        while (cur < todayMidnight) {
            if (isWeekday(cur)) {
                count++;
            }
            cur.setDate(cur.getDate() + 1);
        }
    } else {
        // Nếu ngày trước BASE_DATE
        while (cur > todayMidnight) {
            cur.setDate(cur.getDate() - 1);
            if (isWeekday(cur)) {
                count--;
            }
        }
    }

    // 4. Tính index luân phiên modulo theo tổng số mã động
    const positiveMod = ((count % sortedCodes.length) + sortedCodes.length) % sortedCodes.length;
    const pickedSymbol = sortedCodes[positiveMod] || null;

    return {
        symbol: pickedSymbol,
        isWeekend: false,
        index: positiveMod,
        total: sortedCodes.length,
    };
}
