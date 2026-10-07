import {
    Pt,
    SliderDef,
    MacroValues,
    MacroZone,
    MarketValuationState,
    StockAnalysis,
    StockAction,
    DiscountStatus,
    CashReserveState,
    CashBulletStatus,
    StockReasons,
} from './types';
import { RawStockProfile, STOCK_PROFILES, BENCHMARK_MARKET_DEFAULT } from './stockDatabase';

/* ============================== MACRO SLIDERS DEFINITION ============================== */

export const MACRO_SLIDERS: SliderDef[] = [
    { key: 'rate', label: '1. Lãi suất huy động 12T', hint: 'Lãi càng thấp điểm càng cao', min: 3, max: 12, step: 0.1, unit: '%', weight: 10, decimals: 1, curve: [[3, 10], [5, 10], [9, 2], [12, 0]] },
    { key: 'credit', label: '2. Tăng trưởng tín dụng', hint: '>14% điểm tối đa, siết chặt điểm thấp', min: 0, max: 20, step: 0.5, unit: '%', weight: 10, decimals: 1, curve: [[0, 0], [8, 4], [14, 10], [20, 10]] },
    { key: 'cpi', label: '3. Lạm phát CPI', hint: '<3.2% điểm tối đa, >4.5% điểm thấp', min: 0, max: 8, step: 0.1, unit: '%', weight: 10, decimals: 1, curve: [[0, 10], [3.2, 10], [4.5, 3], [8, 0]] },
    { key: 'realestate', label: '4. Trạng thái BĐS (1-10đ)', hint: 'Đóng băng/tháo gỡ pháp lý → cao; sốt ảo/vỡ nợ → thấp', min: 1, max: 10, step: 1, unit: 'đ', weight: 10, decimals: 0, curve: [[1, 1], [10, 10]] },
    { key: 'pmi', label: '5. Chỉ số PMI sản xuất', hint: '>52 điểm cao, <48 điểm thấp', min: 40, max: 65, step: 0.1, unit: '', weight: 15, decimals: 1, curve: [[40, 0], [48, 4], [52, 11], [56, 15], [65, 15]] },
    { key: 'eps', label: '6. Tăng trưởng EPS thị trường', hint: 'EPS phục hồi >12% điểm tối đa', min: -20, max: 40, step: 0.5, unit: '%', weight: 15, decimals: 1, curve: [[-20, 0], [0, 5], [12, 15], [40, 15]] },
    { key: 'pe', label: '7. Định giá P/E VN-Index', hint: '<11.5x điểm tối đa, >17x điểm thấp', min: 8, max: 22, step: 0.1, unit: 'x', weight: 20, decimals: 1, curve: [[8, 20], [11.5, 20], [17, 4], [22, 0]] },
    { key: 'ma200', label: '8. VN-Index so với MA200 tuần', hint: 'Chiết khấu sâu dưới MA200 điểm cao', min: -30, max: 40, step: 0.5, unit: '%', weight: 10, decimals: 1, curve: [[-30, 10], [-15, 10], [0, 6], [15, 2], [40, 0]] },
];

export const MACRO_ZONES: MacroZone[] = [
    {
        id: 'red',
        from: 0,
        to: 35,
        color: '#EF4444',
        name: 'RISK / DEFENSIVE (Phòng Thủ)',
        desc: 'Vĩ mô bất lợi, lãi suất cao hoặc định giá quá đắt. Giữ tiền mặt, DCA rất chọn lọc vào doanh nghiệp chất lượng cao nhất.',
        action: 'DCA chọn lọc & Giữ tiền',
        alloc: { stock: 25, fund: 35, cash: 40 },
    },
    {
        id: 'amber',
        from: 35,
        to: 55,
        color: '#F59E0B',
        name: 'NORMAL ACCUMULATION (Tích Sản Chuẩn)',
        desc: 'Vùng tích sản ổn định. Phân bổ cân bằng: 50% Cổ phiếu / 30% CCQ / 20% Tiền mặt dự phòng.',
        action: 'DCA bình thường',
        alloc: { stock: 50, fund: 30, cash: 20 },
    },
    {
        id: 'green',
        from: 55,
        to: 75,
        color: '#22C55E',
        name: 'ACCELERATED ACCUMULATION (Tăng Tốc Gom)',
        desc: 'Chu kỳ kinh tế thuận lợi, chiết khấu bắt đầu mở rộng. Tăng tốc gom cổ phiếu (60-70% CP) và sẵn sàng kích hoạt đạn tiền mặt.',
        action: 'Gom tăng tốc',
        alloc: { stock: 65, fund: 20, cash: 15 },
    },
    {
        id: 'neon',
        from: 75,
        to: 100,
        color: '#00FFC8',
        name: 'DEEP OPPORTUNITY (Siêu Cơ Hội)',
        desc: 'Vùng chiết khấu cực sâu / hoảng loạn chu kỳ. Cho phép giải ngân mạnh phần đạn dự phòng (Dry Powder) vào tài sản tốt.',
        action: 'Gom cực mạnh (Kích hoạt Dry Powder)',
        alloc: { stock: 80, fund: 12, cash: 8 },
    },
];

export const DEFAULT_MACRO_VALUES: MacroValues = {
    rate: 5.4,
    credit: 12.8,
    cpi: 3.4,
    realestate: 6,
    pmi: 51.5,
    eps: 14.5,
    pe: 13.8,
    ma200: 3.5,
};

/* ============================== INTERPOLATION HELPER ============================== */

export function interpolate(curve: Pt[], x: number): number {
    if (x <= curve[0][0]) return curve[0][1];
    for (let i = 1; i < curve.length; i++) {
        const [x1, y1] = curve[i];
        const [x0, y0] = curve[i - 1];
        if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return curve[curve.length - 1][1];
}

export function getMacroZone(score: number): MacroZone {
    if (score <= 35) return MACRO_ZONES[0];
    if (score <= 55) return MACRO_ZONES[1];
    if (score <= 75) return MACRO_ZONES[2];
    return MACRO_ZONES[3];
}

export function calculateMacroScores(values: MacroValues): { scores: number[]; totalScore: number; zone: MacroZone } {
    const scores = MACRO_SLIDERS.map((s) =>
        Math.max(0, Math.min(s.weight, interpolate(s.curve, values[s.key] ?? s.min)))
    );
    const totalScore = Math.round(scores.reduce((a, b) => a + b, 0));
    const zone = getMacroZone(totalScore);
    return { scores, totalScore, zone };
}

/* ============================== TẦNG 2: MARKET DISCOUNT ENGINE ============================== */

export function calculateMarketDiscount(input: typeof BENCHMARK_MARKET_DEFAULT): MarketValuationState {
    const { vnIndex, peak52w, pe, peHistorical5yAvg, peHistorical5yMedian, pb, ma200, epsGrowth } = input;

    const drawdown = peak52w > 0 ? ((vnIndex - peak52w) / peak52w) * 100 : 0;
    const ma200Distance = ma200 > 0 ? ((vnIndex - ma200) / ma200) * 100 : 0;

    // 1. P/E Discount Score (35%)
    // Median ~ 13.5x. Nếu PE <= 10 -> 100đ; PE 11.5x -> 85đ; PE 13.5x -> 50đ; PE 16x -> 25đ; PE >= 19x -> 0đ
    let peScore = 50;
    if (pe <= 10.0) peScore = 100;
    else if (pe <= 11.5) peScore = 85 + ((11.5 - pe) / 1.5) * 15;
    else if (pe <= 13.5) peScore = 50 + ((13.5 - pe) / 2.0) * 35;
    else if (pe <= 16.5) peScore = 20 + ((16.5 - pe) / 3.0) * 30;
    else if (pe <= 19.0) peScore = 0 + ((19.0 - pe) / 2.5) * 20;
    else peScore = 0;

    // 2. Drawdown Score (25%)
    // DD: -30% -> 100đ; -20% -> 75đ; -10% -> 45đ; 0% -> 15đ
    let ddScore = 15;
    if (drawdown <= -30) ddScore = 100;
    else if (drawdown <= -20) ddScore = 75 + ((-20 - drawdown) / 10) * 25;
    else if (drawdown <= -10) ddScore = 45 + ((-10 - drawdown) / 10) * 30;
    else if (drawdown < 0) ddScore = 15 + ((-drawdown) / 10) * 30;
    else ddScore = 15;

    // 3. MA200 Distance Score (20%)
    // Distance: <= -15% -> 100đ; 0% -> 50đ; +15% -> 15đ; +30% -> 0đ
    let maScore = 50;
    if (ma200Distance <= -20) maScore = 100;
    else if (ma200Distance <= 0) maScore = 50 + ((-ma200Distance) / 20) * 50;
    else if (ma200Distance <= 20) maScore = 15 + ((20 - ma200Distance) / 20) * 35;
    else maScore = Math.max(0, 15 - ((ma200Distance - 20) / 10) * 15);

    // 4. EPS Growth Score (15%)
    // EPS > 20% -> 100đ; 12% -> 70đ; 0% -> 40đ; -15% -> 0đ
    let epsScore = 50;
    if (epsGrowth >= 22) epsScore = 100;
    else if (epsGrowth >= 12) epsScore = 70 + ((epsGrowth - 12) / 10) * 30;
    else if (epsGrowth >= 0) epsScore = 40 + ((epsGrowth) / 12) * 30;
    else epsScore = Math.max(0, 40 + (epsGrowth / 15) * 40);

    // 5. P/B Score (5%)
    let pbScore = pb <= 1.3 ? 100 : pb <= 1.6 ? 70 : pb <= 1.9 ? 40 : 15;

    const marketDiscountScore = Math.round(
        peScore * 0.35 + ddScore * 0.25 + maScore * 0.20 + epsScore * 0.15 + pbScore * 0.05
    );

    let status: MarketValuationState['status'] = 'FAIR';
    let statusLabel = 'Hợp lý (Fair Value)';
    if (marketDiscountScore <= 25) {
        status = 'EXPENSIVE';
        statusLabel = 'Đắt (Vùng rủi ro / định giá cao)';
    } else if (marketDiscountScore <= 45) {
        status = 'FAIR';
        statusLabel = 'Hợp lý (Tích sản đều đặn)';
    } else if (marketDiscountScore <= 65) {
        status = 'DISCOUNTED';
        statusLabel = 'Chiết khấu hấp dẫn (Bắt đầu gom mạnh)';
    } else {
        status = 'PANIC_DISCOUNT';
        statusLabel = 'Hoảng loạn / Chiết khấu cực sâu (Siêu cơ hội)';
    }

    return {
        vnIndex,
        peak52w,
        drawdown: Number(drawdown.toFixed(2)),
        pe,
        peHistorical5yAvg,
        peHistorical5yMedian,
        pb,
        ma200,
        ma200Distance: Number(ma200Distance.toFixed(2)),
        epsGrowth,
        marketDiscountScore,
        status,
        statusLabel,
    };
}

/* ============================== TẦNG 3: STOCK VALUATION & DISCOUNT ENGINE ============================== */

export function calculateStockAnalysis(
    profile: RawStockProfile,
    currentPrice: number,
    peak52w: number,
    economicScore: number,
    marketDiscountScore: number,
    marketDrawdown: number
): StockAnalysis {
    const price = currentPrice > 0 ? currentPrice : profile.defaultPrice;
    const peak = peak52w > 0 ? peak52w : profile.defaultPeak52w;

    // 1. Drawdown từ đỉnh 52 tuần (%)
    const drawdown = peak > 0 ? Number((((price - peak) / peak) * 100).toFixed(2)) : 0;

    // 2. Chiết khấu so với Fair Value Base (%)
    const baseFair = profile.fairValue.base;
    const discount = baseFair > 0 ? Number((((baseFair - price) / baseFair) * 100).toFixed(2)) : 0;

    // 3. Phân rã 6 yếu tố chấm điểm Stock Discount Score:
    // a. 30% Valuation Discount Score (so với Base Fair Value)
    let valuationDiscountScore = 30;
    if (discount >= 45) valuationDiscountScore = 100;
    else if (discount >= 30) valuationDiscountScore = 80 + ((discount - 30) / 15) * 20;
    else if (discount >= 15) valuationDiscountScore = 60 + ((discount - 15) / 15) * 20;
    else if (discount >= 0) valuationDiscountScore = 35 + ((discount) / 15) * 25;
    else if (discount >= -15) valuationDiscountScore = 15 + ((discount + 15) / 15) * 20;
    else valuationDiscountScore = 0;

    // b. 25% Price Drawdown Score
    let drawdownScore = 20;
    if (drawdown <= -45) drawdownScore = 100;
    else if (drawdown <= -30) drawdownScore = 80 + ((-30 - drawdown) / 15) * 20;
    else if (drawdown <= -20) drawdownScore = 60 + ((-20 - drawdown) / 10) * 20;
    else if (drawdown <= -10) drawdownScore = 40 + ((-10 - drawdown) / 10) * 20;
    else if (drawdown < 0) drawdownScore = 15 + ((-drawdown) / 10) * 25;
    else drawdownScore = 10;

    // c. 15% Historical Valuation Score (P/E & P/B vs Median)
    const peRatio = profile.pe / (profile.historicalPe || profile.pe || 1);
    const pbRatio = profile.pb / (profile.historicalPb || profile.pb || 1);
    const avgRatio = (peRatio + pbRatio) / 2;
    let historicalValuationScore = 50;
    if (avgRatio <= 0.70) historicalValuationScore = 100;
    else if (avgRatio <= 0.85) historicalValuationScore = 80 + ((0.85 - avgRatio) / 0.15) * 20;
    else if (avgRatio <= 1.0) historicalValuationScore = 50 + ((1.0 - avgRatio) / 0.15) * 30;
    else if (avgRatio <= 1.2) historicalValuationScore = 20 + ((1.2 - avgRatio) / 0.2) * 30;
    else historicalValuationScore = 5;

    // d. 15% Earnings Growth Score
    let earningsGrowthScore = 50;
    if (profile.epsGrowth >= 30) earningsGrowthScore = 100;
    else if (profile.epsGrowth >= 18) earningsGrowthScore = 80 + ((profile.epsGrowth - 18) / 12) * 20;
    else if (profile.epsGrowth >= 8) earningsGrowthScore = 55 + ((profile.epsGrowth - 8) / 10) * 25;
    else if (profile.epsGrowth >= 0) earningsGrowthScore = 35 + ((profile.epsGrowth) / 8) * 20;
    else earningsGrowthScore = Math.max(0, 35 + (profile.epsGrowth / 20) * 35);

    // e. 10% Financial Quality Score
    const financialQualityScore = Math.min(100, Math.max(0, profile.qualityScore));

    // f. 5% Relative Strength vs VN-Index
    // Nếu cổ phiếu giảm nhiều hơn VN-Index nhưng chất lượng cao -> điểm cơ hội cao
    const rsDiff = Math.abs(drawdown) - Math.abs(marketDrawdown);
    let relativeStrengthScore = 50;
    if (rsDiff > 10) relativeStrengthScore = 85;
    else if (rsDiff > 0) relativeStrengthScore = 65;
    else relativeStrengthScore = 40;

    // TỔNG ĐIỂM CHIẾT KHẤU CỔ PHIẾU (0 - 100)
    const stockDiscountScore = Math.round(
        valuationDiscountScore * 0.30 +
        drawdownScore * 0.25 +
        historicalValuationScore * 0.15 +
        earningsGrowthScore * 0.15 +
        financialQualityScore * 0.10 +
        relativeStrengthScore * 0.05
    );

    // Phân loại Discount Status
    let discountStatus: DiscountStatus = 'FAIR';
    if (stockDiscountScore <= 20) discountStatus = 'EXPENSIVE';
    else if (stockDiscountScore <= 40) discountStatus = 'FAIR';
    else if (stockDiscountScore <= 60) discountStatus = 'DISCOUNTED';
    else if (stockDiscountScore <= 80) discountStatus = 'DEEP_DISCOUNT';
    else discountStatus = 'EXTREME_DISCOUNT';

    // Tỷ trọng danh mục
    let weightStatus: StockAnalysis['weightStatus'] = 'BALANCED';
    if (profile.currentWeight < profile.targetWeight - 1.5) weightStatus = 'UNDERWEIGHT';
    else if (profile.currentWeight > profile.targetWeight + 1.5) weightStatus = 'OVERWEIGHT';

    // 4. ACTION ENGINE & ĐẠN TIỀN MẶT
    let action: StockAction = 'DCA';
    let actionLabel = 'DCA Chuẩn';
    let cashBulletRecommended = 0;

    // Quy tắc đạn tiền mặt:
    // Đạn 1: >50
    // Đạn 2: >60 (nếu macro > 55 & market > 50)
    // Đạn 3: >70
    // Đạn 4: >80
    if (stockDiscountScore >= 80) {
        cashBulletRecommended = 4; // +20%
    } else if (stockDiscountScore >= 70) {
        cashBulletRecommended = 3; // +15%
    } else if (stockDiscountScore >= 60 && economicScore >= 55 && marketDiscountScore >= 50) {
        cashBulletRecommended = 2; // +10%
    } else if (stockDiscountScore >= 50 && economicScore >= 50) {
        cashBulletRecommended = 1; // +5%
    }

    // Logic quyết định Hành Động
    const isOvervalued = price > profile.fairValue.bull || (discount < -15 && price > baseFair * 1.15);
    const isExtremelyOvervalued = price > profile.fairValue.bull * 1.08 && discount < -20;

    if (isExtremelyOvervalued || (isOvervalued && weightStatus === 'OVERWEIGHT')) {
        action = 'REDUCE';
        actionLabel = 'Chốt lời một phần (20-30%)';
    } else if (stockDiscountScore >= 75 && profile.qualityScore >= 80 && economicScore >= 50) {
        action = 'ACCUMULATE_AGGRESSIVELY';
        actionLabel = 'Gom Cực Mạnh';
    } else if (stockDiscountScore >= 60 && profile.qualityScore >= 75) {
        action = 'ACCUMULATE';
        actionLabel = 'Gom Tăng Tốc';
    } else if (stockDiscountScore >= 35 && profile.qualityScore >= 70 && economicScore >= 35) {
        action = 'DCA';
        actionLabel = 'DCA Đều Đặn';
    } else if (stockDiscountScore < 30 && discount <= 5) {
        action = 'HOLD';
        actionLabel = 'Nắm Giữ (Chờ Chiết Khấu)';
    } else if (stockDiscountScore >= 50 && profile.qualityScore < 65) {
        action = 'WATCH';
        actionLabel = 'Quan Sát (Chất Lượng Thấp)';
    } else if (profile.epsGrowth < -15 && stockDiscountScore > 60) {
        action = 'AVOID';
        actionLabel = 'Tránh (Rủi Ro Giảm Trưởng)';
    } else {
        action = 'BUY';
        actionLabel = 'DCA Nhẹ';
    }

    // 5. Checkpoints WHY? (Lý do vì sao đạt điểm số này)
    const positive: string[] = [];
    const negative: string[] = [];
    const neutral: string[] = [];

    // Phân tích Drawdown & Discount
    if (drawdown <= -20) {
        positive.push(`Giá đã điều chỉnh ${Math.abs(drawdown)}% từ đỉnh 52 tuần, mở ra biên độ an toàn kỹ thuật.`);
    } else if (drawdown <= -10) {
        neutral.push(`Mức giảm ${Math.abs(drawdown)}% từ đỉnh ở mức vừa phải, chưa đạt vùng hoảng loạn.`);
    } else {
        negative.push(`Giá đang ở gần vùng đỉnh 52 tuần (chỉ giảm ${Math.abs(drawdown)}%), chiết khấu kỹ thuật thấp.`);
    }

    // Phân tích Fair Value Discount
    if (discount >= 20) {
        positive.push(`Đang rẻ hơn giá trị nội tại cơ sở ${discount}% (Giá: ${price.toLocaleString('vi-VN')} đ vs Fair: ${baseFair.toLocaleString('vi-VN')} đ).`);
    } else if (discount >= 5) {
        neutral.push(`Đang chiết khấu nhẹ ${discount}% so với Fair Value cơ sở.`);
    } else if (discount < 0) {
        negative.push(`Đang giao dịch cao hơn Fair Value cơ sở ${Math.abs(discount)}% (Premium).`);
    }

    // Phân tích EPS & Chất lượng
    if (profile.epsGrowth >= 18) {
        positive.push(`Tăng trưởng EPS mạnh mẽ (+${profile.epsGrowth}% YoY), khẳng định sức khỏe kinh doanh.`);
    } else if (profile.epsGrowth >= 5) {
        neutral.push(`Tăng trưởng EPS ổn định (+${profile.epsGrowth}% YoY).`);
    } else {
        negative.push(`Tăng trưởng EPS khiêm tốn hoặc suy giảm (${profile.epsGrowth}% YoY).`);
    }

    if (profile.roe >= 18) {
        positive.push(`Hiệu quả sinh lời xuất sắc (ROE ${profile.roe}%), thuộc top đầu ngành.`);
    }

    // Phân tích P/E & P/B vs Lịch sử
    if (profile.pe < profile.historicalPe * 0.9) {
        positive.push(`P/E hiện tại (${profile.pe}x) thấp hơn đáng kể mức trung vị lịch sử (${profile.historicalPe}x).`);
    }

    // Phân tích Tỷ trọng danh mục
    if (weightStatus === 'UNDERWEIGHT') {
        positive.push(`Tỷ trọng hiện tại (${profile.currentWeight}%) thấp hơn mục tiêu (${profile.targetWeight}%), ưu tiên bù đắp vị thế.`);
    } else if (weightStatus === 'OVERWEIGHT') {
        neutral.push(`Tỷ trọng hiện tại (${profile.currentWeight}%) đã vượt mục tiêu (${profile.targetWeight}%), không nên mua đuổi.`);
    }

    // Kết luận chiến lược
    let strategicTakeaway = '';
    if (action === 'ACCUMULATE_AGGRESSIVELY') {
        strategicTakeaway = `${profile.symbol} hội tụ đủ 3 yếu tố: Doanh nghiệp chất lượng ${profile.qualityTier}, chiết khấu sâu (${discount}%) và định giá lịch sử rẻ. Khuyến nghị tận dụng đạn tiền mặt dự phòng để gom mạnh.`;
    } else if (action === 'ACCUMULATE') {
        strategicTakeaway = `${profile.symbol} đang bước vào vùng chiết khấu hấp dẫn. Có thể gia tăng tốc độ tích sản, giải ngân thêm một phần đạn dự phòng.`;
    } else if (action === 'DCA') {
        strategicTakeaway = `${profile.symbol} duy trì nền tảng cơ bản vững chắc và định giá hợp lý. Chiến lược tối ưu là duy trì DCA đều đặn theo kế hoạch tháng.`;
    } else if (action === 'REDUCE') {
        strategicTakeaway = `${profile.symbol} đang giao dịch ở vùng định giá cao so với giá trị nội tại. Khuyến nghị chốt lời một phần (20-30%) đưa về quỹ tiền mặt dự phòng.`;
    } else {
        strategicTakeaway = `${profile.symbol} cần theo dõi thêm biến động thị trường trước khi ra quyết định giải ngân lớn.`;
    }

    return {
        symbol: profile.symbol,
        name: profile.name,
        sector: profile.sector,
        sectorType: profile.sectorType,
        price,
        peak52w: peak,
        drawdown,
        pe: profile.pe,
        historicalPe: profile.historicalPe,
        pb: profile.pb,
        historicalPb: profile.historicalPb,
        epsGrowth: profile.epsGrowth,
        roe: profile.roe,
        fairValue: profile.fairValue,
        discount,
        qualityScore: profile.qualityScore,
        qualityTier: profile.qualityTier,
        scoreBreakdown: {
            valuationDiscountScore: Math.round(valuationDiscountScore),
            drawdownScore: Math.round(drawdownScore),
            historicalValuationScore: Math.round(historicalValuationScore),
            earningsGrowthScore: Math.round(earningsGrowthScore),
            financialQualityScore: Math.round(financialQualityScore),
            relativeStrengthScore: Math.round(relativeStrengthScore),
        },
        stockDiscountScore,
        discountStatus,
        targetWeight: profile.targetWeight,
        currentWeight: profile.currentWeight,
        weightStatus,
        action,
        actionLabel,
        cashBulletRecommended,
        reasons: {
            positive,
            negative,
            neutral,
        },
        sectorKeyMetricLabel: profile.sectorKeyMetricLabel,
        sectorKeyMetricValue: profile.sectorKeyMetricValue,
        strategicTakeaway,
        dataAsOf: new Date().toLocaleDateString('vi-VN'),
    };
}

/* ============================== CASH RESERVE (DRY POWDER) ENGINE ============================== */

export function calculateCashReserve(
    economicScore: number,
    marketDiscountScore: number,
    stocks: StockAnalysis[]
): CashReserveState {
    const macroConditionMet = economicScore >= 55;
    const marketConditionMet = marketDiscountScore >= 50;
    const stockDeepDiscountMet = stocks.some((s) => s.stockDiscountScore >= 60);

    const deployConditionMet = macroConditionMet && marketConditionMet && stockDeepDiscountMet;

    const maxStockScore = Math.max(...stocks.map((s) => s.stockDiscountScore), 0);

    const bullets: CashBulletStatus[] = [
        {
            bullet: 1,
            percent: 5,
            triggerScore: 50,
            name: 'Đạn 1 (5% Cash)',
            active: maxStockScore >= 50 && economicScore >= 45,
            reason: 'Kích hoạt khi có cổ phiếu bước vào vùng Chiết khấu (Score > 50).',
        },
        {
            bullet: 2,
            percent: 5,
            triggerScore: 60,
            name: 'Đạn 2 (+5% Cash)',
            active: maxStockScore >= 60 && macroConditionMet && marketConditionMet,
            reason: 'Kích hoạt khi cả 3 điều kiện cùng xuất hiện: Vĩ mô > 55, Thị trường > 50 và Cổ phiếu > 60.',
        },
        {
            bullet: 3,
            percent: 5,
            triggerScore: 70,
            name: 'Đạn 3 (+5% Cash)',
            active: maxStockScore >= 70,
            reason: 'Kích hoạt khi cổ phiếu rơi vào vùng Chiết khấu sâu (Score > 70).',
        },
        {
            bullet: 4,
            percent: 5,
            triggerScore: 80,
            name: 'Đạn 4 (+5% Cash)',
            active: maxStockScore >= 80,
            reason: 'Kích hoạt khi cổ phiếu rơi vào vùng Siêu chiết khấu / Hoảng loạn (Score > 80).',
        },
    ];

    const activeBulletsCount = bullets.filter((b) => b.active).length;
    const deployedPercent = activeBulletsCount * 5;
    const availablePercent = 20 - deployedPercent;

    return {
        totalReservePercent: 20,
        deployedPercent,
        availablePercent,
        bullets,
        deployConditionMet,
        conditionDetails: {
            macroConditionMet,
            marketConditionMet,
            stockDeepDiscountMet,
        },
    };
}
