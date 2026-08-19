import { NextRequest, NextResponse } from "next/server";
import {
    DROP_LEVELS,
    DEFAULT_DROP_LEVELS,
} from "@/utils/dcaConfig";
import {
    getDcaScannerSignal,
    DcaScannerSignal,
} from "@/utils/dcaCalculation";

interface StockYearInfo {
    symbol: string;
    currentPrice: number;
    yearHigh: number;
    dropPercent: number;
    targetHighYear: number;
    dcaStatus: DcaScannerSignal;
    dropLevels: number[];
}

function normalizePrice(val: number): number {
    if (!Number.isFinite(val) || val <= 0) return 0;
    // Nếu giá nhỏ hơn 1000 (VD: 30.85), quy đổi sang VND chuẩn (30,850 VND)
    return val < 1000 ? Math.round(val * 1000) : Math.round(val);
}

/**
 * Lấy dữ liệu nến từ VNDIRECT
 */
async function fetchFromVndirect(symbol: string, fromTimestamp: number, toTimestamp: number) {
    const url = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${symbol}&from=${fromTimestamp}&to=${toTimestamp}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://dchart.vndirect.com.vn/',
        },
        next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.s === 'ok' && Array.isArray(data.h) && data.h.length > 0) {
        return {
            highs: data.h as number[],
            closes: data.c as number[],
            timestamps: data.t as number[],
        };
    }
    return null;
}

/**
 * Lấy dữ liệu nến từ DNSE (Fallback)
 */
async function fetchFromDnse(symbol: string, fromTimestamp: number, toTimestamp: number) {
    const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?symbol=${symbol}&from=${fromTimestamp}&to=${toTimestamp}&resolution=1D`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
        },
        next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && Array.isArray(data.h) && data.h.length > 0) {
        return {
            highs: data.h as number[],
            closes: data.c as number[],
            timestamps: data.t as number[],
        };
    }
    return null;
}

async function fetchStockYearInfo(symbol: string, selectedYear: number): Promise<StockYearInfo> {
    const sym = symbol.toUpperCase();
    const targetHighYear = selectedYear - 1;

    const fromHigh = Math.floor(new Date(`${targetHighYear}-01-01T00:00:00Z`).getTime() / 1000);
    const toHigh = Math.floor(new Date(`${targetHighYear}-12-31T23:59:59Z`).getTime() / 1000);

    const fromCur = Math.floor(new Date(`${selectedYear}-01-01T00:00:00Z`).getTime() / 1000);
    const toCur = Math.floor(Date.now() / 1000);

    // 1. Lấy nến lịch sử của năm đỉnh (targetHighYear)
    let highData = await fetchFromVndirect(sym, fromHigh, toHigh);
    if (!highData) {
        highData = await fetchFromDnse(sym, fromHigh, toHigh);
    }

    if (!highData || highData.highs.length === 0) {
        throw new Error(`Không tìm thấy dữ liệu giá năm ${targetHighYear} cho mã ${sym}`);
    }

    const validHighs = highData.highs.filter((h) => Number.isFinite(h) && h > 0);
    if (validHighs.length === 0) {
        throw new Error(`Dữ liệu giá năm ${targetHighYear} của mã ${sym} không hợp lệ`);
    }

    const rawHigh = Math.max(...validHighs);
    const yearHigh = normalizePrice(rawHigh);

    // 2. Lấy giá hiện tại (năm nay hoặc nến mới nhất)
    let currentData = await fetchFromVndirect(sym, fromCur, toCur);
    if (!currentData) {
        currentData = await fetchFromDnse(sym, fromCur, toCur);
    }

    let currentPrice = 0;
    if (currentData && currentData.closes.length > 0) {
        const latestClose = currentData.closes[currentData.closes.length - 1];
        currentPrice = normalizePrice(latestClose);
    } else {
        // Fallback về nến cuối của năm đỉnh nếu năm nay chưa có phiên
        const lastHighClose = highData.closes[highData.closes.length - 1];
        currentPrice = normalizePrice(lastHighClose);
    }

    // 3. Tính mức giảm từ đỉnh
    const dropPercent = yearHigh > 0 ? ((currentPrice - yearHigh) / yearHigh) * 100 : 0;

    // 4. Xác định trạng thái DCA
    const dcaStatus = getDcaScannerSignal(sym, currentPrice, yearHigh);
    const dropLevels = DROP_LEVELS[sym] || DEFAULT_DROP_LEVELS;

    return {
        symbol: sym,
        currentPrice,
        yearHigh,
        dropPercent,
        targetHighYear,
        dcaStatus,
        dropLevels,
    };
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get("symbols");
    const yearParam = searchParams.get("year");

    const currentYear = new Date().getFullYear();
    const selectedYear = yearParam ? parseInt(yearParam, 10) : currentYear;

    if (!symbolsParam) {
        return NextResponse.json(
            { error: "Vui lòng truyền danh sách mã cổ phiếu (symbols)" },
            { status: 400 }
        );
    }

    const list = symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

    const results: StockYearInfo[] = [];
    const errors: { symbol: string; message: string }[] = [];

    await Promise.all(
        list.map(async (symbol) => {
            try {
                const data = await fetchStockYearInfo(symbol, selectedYear);
                results.push(data);
            } catch (err: any) {
                console.error(`Lỗi lấy dữ liệu mã ${symbol}:`, err?.message || err);
                errors.push({
                    symbol,
                    message: err instanceof Error ? err.message : "Lỗi không xác định",
                });
            }
        })
    );

    // Sắp xếp lại theo thứ tự người dùng nhập
    results.sort((a, b) => list.indexOf(a.symbol) - list.indexOf(b.symbol));

    return NextResponse.json({
        success: true,
        selectedYear,
        targetHighYear: selectedYear - 1,
        data: results,
        errors,
    });
}
