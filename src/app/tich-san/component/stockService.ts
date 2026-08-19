export interface DcaStatusInfo {
    status: string; // e.g. "DCA 1 · 15%" | "Quan sát"
    level: number; // 0 | 1 | 2 | 3 | 4
    rate: number; // 0 | 15 | 25 | 35 | 25
    targetDrop?: number;
}

export interface StockYearInfo {
    symbol: string;
    currentPrice: number;
    yearHigh: number;
    dropPercent: number;
    targetHighYear: number;
    dcaStatus: DcaStatusInfo;
    dropLevels: number[];
}

export async function fetchStockAnalysisBatch(
    symbols: string[],
    year?: number
): Promise<StockYearInfo[]> {
    if (!symbols || symbols.length === 0) {
        return [];
    }

    const currentYear = year || new Date().getFullYear();
    const query = new URLSearchParams({
        symbols: symbols.join(','),
        year: String(currentYear),
    });

    const res = await fetch(`/api/stock-analysis?${query.toString()}`);

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Lỗi API (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
}

export async function getStockYearInfo(
    symbol: string,
    year?: number
): Promise<StockYearInfo> {
    const list = await fetchStockAnalysisBatch([symbol], year);
    if (list.length === 0) {
        throw new Error(`Không thể lấy dữ liệu cho mã ${symbol}`);
    }
    return list[0];
}