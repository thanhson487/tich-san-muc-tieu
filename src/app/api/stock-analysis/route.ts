import { NextRequest, NextResponse } from "next/server";
import { VnStockClient, Interval, DataSource } from "vn-stock-sdk";
import {
    DROP_LEVELS,
    DEFAULT_DROP_LEVELS,
} from "@/utils/dcaConfig";
import {
    getDcaScannerSignal,
    DcaScannerSignal,
} from "@/utils/dcaCalculation";

const client = new VnStockClient({
    debug: false,
    timeout: 15000,
    retries: 2,
});

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

async function fetchStockYearInfo(symbol: string, selectedYear: number): Promise<StockYearInfo> {
    const sym = symbol.toUpperCase();
    const targetHighYear = selectedYear - 1;

    const highStart = `${targetHighYear}-01-01`;
    const highEnd = `${targetHighYear}-12-31`;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const curStart = `${now.getFullYear()}-01-01`;

    // 1. Lấy nến lịch sử của năm đỉnh (targetHighYear)
    let historyHigh: any[] = [];
    try {
        historyHigh = await client.quote(sym).history({
            start: highStart,
            end: highEnd,
            interval: Interval.D1,
            source: DataSource.VNDIRECT,
        });
    } catch (e) {
        console.warn(`[VNDIRECT] Lỗi lấy đỉnh ${targetHighYear} cho ${sym}, thử DNSE...`, e);
    }

    if (!historyHigh || historyHigh.length === 0) {
        try {
            historyHigh = await client.quote(sym).history({
                start: highStart,
                end: highEnd,
                interval: Interval.D1,
                source: DataSource.DNSE,
            });
        } catch (e) {
            console.warn(`[DNSE] Lỗi lấy đỉnh ${targetHighYear} cho ${sym}:`, e);
        }
    }

    if (!historyHigh || historyHigh.length === 0) {
        throw new Error(`Không tìm thấy dữ liệu nến năm ${targetHighYear} cho mã ${sym}`);
    }

    const validHighData = historyHigh.filter(
        (item) => Number.isFinite(Number(item.high)) && Number(item.high) > 0
    );

    if (validHighData.length === 0) {
        throw new Error(`Dữ liệu nến năm ${targetHighYear} của mã ${sym} không hợp lệ`);
    }

    const rawHigh = Math.max(...validHighData.map((item) => Number(item.high)));
    const yearHigh = normalizePrice(rawHigh);

    // 2. Lấy giá hiện tại (phiên mới nhất)
    let historyCurrent: any[] = [];
    try {
        historyCurrent = await client.quote(sym).history({
            start: curStart,
            end: todayStr,
            interval: Interval.D1,
            source: DataSource.VNDIRECT,
        });
    } catch (e) {
        console.warn(`[VNDIRECT] Lỗi lấy giá hiện tại cho ${sym}, thử DNSE...`, e);
    }

    if (!historyCurrent || historyCurrent.length === 0) {
        try {
            historyCurrent = await client.quote(sym).history({
                start: curStart,
                end: todayStr,
                interval: Interval.D1,
                source: DataSource.DNSE,
            });
        } catch (e) {
            console.warn(`[DNSE] Lỗi lấy giá hiện tại cho ${sym}:`, e);
        }
    }

    // Nếu không lấy được năm hiện tại, lấy nến cuối cùng của năm đỉnh
    const currentDataSource = historyCurrent && historyCurrent.length > 0 ? historyCurrent : validHighData;
    const sortedCurrent = [...currentDataSource].sort(
        (a, b) => new Date(String(a.date || a.time)).getTime() - new Date(String(b.date || b.time)).getTime()
    );
    const latestBar = sortedCurrent[sortedCurrent.length - 1];
    const currentPrice = normalizePrice(Number(latestBar.close || latestBar.high));

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
