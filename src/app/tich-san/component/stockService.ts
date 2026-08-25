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
    symbols: string[]
): Promise<StockYearInfo[]> {
    if (!symbols || symbols.length === 0) {
        return [];
    }

    const query = new URLSearchParams({
        symbols: symbols.join(','),
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
    symbol: string
): Promise<StockYearInfo> {
    const list = await fetchStockAnalysisBatch([symbol]);
    if (list.length === 0) {
        throw new Error(`Không thể lấy dữ liệu cho mã ${symbol}`);
    }
    return list[0];
}