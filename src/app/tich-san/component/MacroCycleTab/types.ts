export type Pt = [number, number];

export interface SliderDef {
    key: string;
    label: string;
    hint: string;
    min: number;
    max: number;
    step: number;
    unit: string;
    weight: number;
    decimals: number;
    curve: Pt[];
}

export type MacroValues = Record<string, number>;

export interface MacroZone {
    id: 'red' | 'amber' | 'green' | 'neon';
    from: number;
    to: number;
    color: string;
    name: string;
    desc: string;
    action: string;
    alloc: { stock: number; fund: number; cash: number };
}

export type MarketStatus = 'EXPENSIVE' | 'FAIR' | 'DISCOUNTED' | 'PANIC_DISCOUNT';

export interface MarketValuationState {
    vnIndex: number;
    peak52w: number;
    drawdown: number;
    pe: number;
    peHistorical5yAvg: number;
    peHistorical5yMedian: number;
    pb: number;
    ma200: number;
    ma200Distance: number;
    epsGrowth: number;
    marketDiscountScore: number;
    status: MarketStatus;
    statusLabel: string;
    notes?: string;
}

export type StockAction =
    | 'BUY'
    | 'DCA'
    | 'ACCUMULATE'
    | 'ACCUMULATE_AGGRESSIVELY'
    | 'HOLD'
    | 'WATCH'
    | 'REDUCE'
    | 'AVOID';

export type DiscountStatus =
    | 'EXPENSIVE'
    | 'FAIR'
    | 'DISCOUNTED'
    | 'DEEP_DISCOUNT'
    | 'EXTREME_DISCOUNT';

export type QualityTier = 'A+' | 'A' | 'B+' | 'B' | 'C';

export type SectorType =
    | 'TECH'
    | 'STEEL'
    | 'BANK'
    | 'REAL_ESTATE'
    | 'SECURITIES'
    | 'INDUSTRIAL_PARK'
    | 'ENERGY_UTILITY'
    | 'AGRICULTURE';

export interface StockFairValue {
    bear: number;
    base: number;
    bull: number;
}

export interface StockReasons {
    positive: string[];
    negative: string[];
    neutral: string[];
}

export interface StockAnalysis {
    symbol: string;
    name: string;
    sector: string;
    sectorType: SectorType;

    price: number;
    peak52w: number;
    drawdown: number; // % giảm từ đỉnh 52 tuần, e.g. -25%

    pe: number;
    historicalPe: number;
    pb: number;
    historicalPb: number;

    epsGrowth: number; // %
    roe: number; // %

    fairValue: StockFairValue;
    discount: number; // % chiết khấu so với Base Fair Value: ((Base - Price) / Base) * 100

    qualityScore: number; // 0 - 100
    qualityTier: QualityTier;

    // Phân rã điểm Stock Discount Score (0-100)
    scoreBreakdown: {
        valuationDiscountScore: number; // 30%
        drawdownScore: number;          // 25%
        historicalValuationScore: number; // 15%
        earningsGrowthScore: number;    // 15%
        financialQualityScore: number;  // 10%
        relativeStrengthScore: number;  // 5%
    };

    stockDiscountScore: number; // 0 - 100
    discountStatus: DiscountStatus;

    targetWeight: number; // %
    currentWeight: number; // %
    weightStatus: 'UNDERWEIGHT' | 'BALANCED' | 'OVERWEIGHT';

    action: StockAction;
    actionLabel: string;
    cashBulletRecommended: number; // 0, 1, 2, 3, 4 (+5% mỗi đạn)

    reasons: StockReasons;
    sectorKeyMetricLabel: string;
    sectorKeyMetricValue: string;
    strategicTakeaway: string;
    dataAsOf: string;
}

export interface CashBulletStatus {
    bullet: number;
    percent: number; // 5%
    triggerScore: number; // >50, >60, >70, >80
    name: string;
    active: boolean;
    reason: string;
}

export interface CashReserveState {
    totalReservePercent: number; // 20%
    deployedPercent: number; // e.g. 5%
    availablePercent: number; // e.g. 15%
    bullets: CashBulletStatus[];
    deployConditionMet: boolean;
    conditionDetails: {
        macroConditionMet: boolean;   // Macro > 55
        marketConditionMet: boolean;  // Market > 50
        stockDeepDiscountMet: boolean; // Có ít nhất 1 mã > 60
    };
}

export interface HistoryItem {
    time: string;
    economicScore: number;
    marketScore: number;
    economicZone: string;
    marketZone: string;
    macroValues: MacroValues;
    topStockSymbol?: string;
    topStockScore?: number;
}
