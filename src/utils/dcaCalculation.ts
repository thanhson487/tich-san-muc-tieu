import { DROP_LEVELS, DEFAULT_DROP_LEVELS, DCA_WEIGHTS, TOLERANCE } from './dcaConfig';

export interface DcaScannerSignal {
    status: string; // e.g. "DCA 1 · 15%" | "Quan sát"
    tierIndex: number; // 0 | 1 | 2 | 3 | 4
    tierName?: 'DCA 1' | 'DCA 2' | 'DCA 3' | 'DCA 4';
    weightPercent: number; // 15 | 25 | 35 | 25 | 0
    targetDropPercent?: number; // e.g. -25
    dropPercent: number; // e.g. -26.4
    dropLevels: number[];
}

/**
 * Tính toán tín hiệu DCA cho Tab 1 (DCA Scanner - Thuần phân tích kỹ thuật)
 */
export function getDcaScannerSignal(
    symbol: string,
    currentPrice: number,
    yearHigh: number,
    customDropLevels?: number[]
): DcaScannerSignal {
    const sym = symbol.toUpperCase();
    const dropLevels = customDropLevels && customDropLevels.length === 4
        ? customDropLevels
        : (DROP_LEVELS[sym] || DEFAULT_DROP_LEVELS);

    const dropPercent = yearHigh > 0 ? ((currentPrice - yearHigh) / yearHigh) * 100 : 0;

    for (let i = 0; i < dropLevels.length; i++) {
        const target = dropLevels[i];
        const minRange = target - TOLERANCE; // e.g. -27
        const maxRange = target + TOLERANCE; // e.g. -23

        if (dropPercent >= minRange && dropPercent <= maxRange) {
            const tierNum = i + 1;
            const weight = DCA_WEIGHTS[i] || 25;
            const tierName = `DCA ${tierNum}` as 'DCA 1' | 'DCA 2' | 'DCA 3' | 'DCA 4';

            return {
                status: `DCA ${tierNum} · ${weight}%`,
                tierIndex: tierNum,
                tierName,
                weightPercent: weight,
                targetDropPercent: target,
                dropPercent,
                dropLevels,
            };
        }
    }

    return {
        status: 'Quan sát',
        tierIndex: 0,
        weightPercent: 0,
        dropPercent,
        dropLevels,
    };
}

export interface DcaAnalysisResult {
    status: string; // e.g. "Kích hoạt DCA 1 · 15%" | "Đã khớp DCA 1 (15%)" | "Quan sát"
    type: 'ACTIVE' | 'FILLED' | 'WATCH';
    tierIndex: number; // 0 (none/watch) | 1 | 2 | 3 | 4
    tierName?: 'DCA 1' | 'DCA 2' | 'DCA 3' | 'DCA 4';
    weightPercent: number; // 15 | 25 | 35 | 25 | 0
    targetDropPercent?: number; // e.g. -25
    dropPercent: number; // e.g. -26.4
    dropLevels: number[];
}

/**
 * Tính toán trạng thái DCA chống báo lặp cho Tab 2 (Portfolio Tracker)
 */
export function getDcaAnalysis(
    symbol: string,
    currentPrice: number,
    yearHigh: number,
    dcaFilled?: {
        dca1?: boolean;
        dca2?: boolean;
        dca3?: boolean;
        dca4?: boolean;
    },
    customDropLevels?: number[]
): DcaAnalysisResult {
    const sym = symbol.toUpperCase();
    const dropLevels = customDropLevels && customDropLevels.length === 4
        ? customDropLevels
        : (DROP_LEVELS[sym] || DEFAULT_DROP_LEVELS);

    const dropPercent = yearHigh > 0 ? ((currentPrice - yearHigh) / yearHigh) * 100 : 0;

    for (let i = 0; i < dropLevels.length; i++) {
        const target = dropLevels[i];
        const minRange = target - TOLERANCE; // e.g. -27
        const maxRange = target + TOLERANCE; // e.g. -23

        if (dropPercent >= minRange && dropPercent <= maxRange) {
            const tierNum = i + 1;
            const tierKey = `dca${tierNum}` as keyof NonNullable<typeof dcaFilled>;
            const isFilled = Boolean(dcaFilled && dcaFilled[tierKey]);
            const weight = DCA_WEIGHTS[i] || 25;
            const tierName = `DCA ${tierNum}` as 'DCA 1' | 'DCA 2' | 'DCA 3' | 'DCA 4';

            if (isFilled) {
                return {
                    status: `Đã khớp DCA ${tierNum} (${weight}%)`,
                    type: 'FILLED',
                    tierIndex: tierNum,
                    tierName,
                    weightPercent: weight,
                    targetDropPercent: target,
                    dropPercent,
                    dropLevels,
                };
            }

            return {
                status: `Kích hoạt DCA ${tierNum} · ${weight}%`,
                type: 'ACTIVE',
                tierIndex: tierNum,
                tierName,
                weightPercent: weight,
                targetDropPercent: target,
                dropPercent,
                dropLevels,
            };
        }
    }

    return {
        status: 'Quan sát',
        type: 'WATCH',
        tierIndex: 0,
        weightPercent: 0,
        dropPercent,
        dropLevels,
    };
}

export interface DcaLevelDetail {
    tierIndex: number; // 1 | 2 | 3 | 4
    tierName: string; // "DCA 1" | "DCA 2" | "DCA 3" | "DCA 4"
    targetDropPercent: number; // e.g. -25
    targetPrice: number;
    weightPercent: number;
    isFilled: boolean;
    isCurrentTarget: boolean;
    isInZone: boolean;
}

export interface NextDcaTargetResult {
    tierIndex: number; // 1, 2, 3, 4 (hoặc 0 nếu đã khớp hết)
    tierName: string; // "DCA 1", "DCA 2", etc.
    targetDropPercent: number; // e.g. -25
    targetPrice: number;
    weightPercent: number;
    gapPercent: number; // targetDropPercent - dropPercent (khoảng cách còn lại)
    isInZone: boolean; // đang ở vùng mua (±2%)
    allCompleted: boolean;
    levels: DcaLevelDetail[];
}

/**
 * Xác định mốc DCA kế tiếp chuẩn bị mua và danh sách chi tiết các mốc
 */
export function getNextDcaTarget(
    symbol: string,
    currentPrice: number,
    yearHigh: number,
    dcaFilled?: {
        dca1?: boolean;
        dca2?: boolean;
        dca3?: boolean;
        dca4?: boolean;
    },
    customDropLevels?: number[]
): NextDcaTargetResult {
    const sym = symbol.toUpperCase();
    const dropLevels = customDropLevels && customDropLevels.length === 4
        ? customDropLevels
        : (DROP_LEVELS[sym] || DEFAULT_DROP_LEVELS);

    const dropPercent = yearHigh > 0 ? ((currentPrice - yearHigh) / yearHigh) * 100 : 0;

    const filledStatus = [
        Boolean(dcaFilled?.dca1),
        Boolean(dcaFilled?.dca2),
        Boolean(dcaFilled?.dca3),
        Boolean(dcaFilled?.dca4),
    ];

    const allCompleted = filledStatus.every(Boolean);

    // Xác định mốc mua tiếp theo:
    // Tìm mốc chưa mua đầu tiên mà thị trường chưa giảm vượt quá sâu (hoặc mốc hiện tại đang trong vùng)
    let targetIndex = -1;

    for (let i = 0; i < dropLevels.length; i++) {
        if (filledStatus[i]) {
            continue; // Mốc này đã khớp
        }

        const target = dropLevels[i];
        // Nếu chưa khớp, kiểm tra xem giá hiện tại có chưa giảm vượt quá cận dưới của mốc này (target - TOLERANCE) không,
        // hoặc nếu là mốc cuối cùng (DCA 4) thì giữ mốc cuối cùng
        if (dropPercent > target - TOLERANCE || i === dropLevels.length - 1) {
            targetIndex = i;
            break;
        }
    }

    if (targetIndex === -1 && allCompleted) {
        targetIndex = 3;
    } else if (targetIndex === -1) {
        const firstUnfilled = filledStatus.findIndex((f) => !f);
        targetIndex = firstUnfilled !== -1 ? firstUnfilled : 0;
    }

    const targetDrop = dropLevels[targetIndex];
    const targetPrice = yearHigh > 0 ? Math.round(yearHigh * (1 + targetDrop / 100)) : 0;
    const tierNum = targetIndex + 1;
    const tierName = `DCA ${tierNum}`;
    const weight = DCA_WEIGHTS[targetIndex] || 25;

    const isInZone = !allCompleted && (dropPercent >= targetDrop - TOLERANCE && dropPercent <= targetDrop + TOLERANCE);
    const gapPercent = targetDrop - dropPercent;

    const levelDetails: DcaLevelDetail[] = dropLevels.map((lvl, idx) => ({
        tierIndex: idx + 1,
        tierName: `DCA ${idx + 1}`,
        targetDropPercent: lvl,
        targetPrice: yearHigh > 0 ? Math.round(yearHigh * (1 + lvl / 100)) : 0,
        weightPercent: DCA_WEIGHTS[idx] || 25,
        isFilled: filledStatus[idx],
        isCurrentTarget: idx === targetIndex && !allCompleted,
        isInZone: !filledStatus[idx] && (dropPercent >= lvl - TOLERANCE && dropPercent <= lvl + TOLERANCE),
    }));

    return {
        tierIndex: allCompleted ? 0 : tierNum,
        tierName,
        targetDropPercent: targetDrop,
        targetPrice,
        weightPercent: weight,
        gapPercent,
        isInZone,
        allCompleted,
        levels: levelDetails,
    };
}

