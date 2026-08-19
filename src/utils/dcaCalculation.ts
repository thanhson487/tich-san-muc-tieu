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
