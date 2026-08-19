export const DROP_LEVELS: Record<string, number[]> = {
    // Nông nghiệp – thực phẩm (chu kỳ)
    DBC: [-25, -40, -55, -65],

    // Bất động sản
    HDG: [-30, -45, -55, -65],

    // Khu công nghiệp
    IDC: [-25, -40, -55, -65],

    // Bất động sản chất lượng hơn
    KDH: [-25, -40, -50, -60],

    // Công nghiệp – vật liệu (chu kỳ)
    HPG: [-20, -35, -50, -60],

    // Chứng khoán (beta cao)
    SSI: [-35, -50, -60, -65],

    // Ngân hàng
    VPB: [-25, -40, -50, -55],
    TCB: [-25, -40, -50, -55],
    ACB: [-25, -40, -50, -55],
    MBB: [-25, -40, -50, -55],

    // Hạ tầng – tiện ích
    REE: [-15, -25, -35, -45],

    // Công nghệ
    FPT: [-30, -40, -45, -50],
};

export const DEFAULT_DROP_LEVELS = [-25, -40, -50, -60];
export const DCA_WEIGHTS = [15, 25, 35, 25];

export interface DcaStatusInfo {
    status: string; // e.g. "DCA 1 · 15%" | "Quan sát"
    level: number; // 0 (Quan sát) | 1 | 2 | 3 | 4
    rate: number; // 0 | 15 | 25 | 35 | 25
    targetDrop?: number;
}

export function calculateDcaStatus(symbol: string, dropPercent: number): DcaStatusInfo {
    const levels = DROP_LEVELS[symbol.toUpperCase()] || DEFAULT_DROP_LEVELS;

    for (let i = 0; i < levels.length; i++) {
        const target = levels[i]; // e.g. -25
        const minRange = target - 2; // e.g. -27
        const maxRange = target + 2; // e.g. -23

        if (dropPercent >= minRange && dropPercent <= maxRange) {
            const dcaNum = i + 1;
            const weight = DCA_WEIGHTS[i] || 25;
            return {
                status: `DCA ${dcaNum} · ${weight}%`,
                level: dcaNum,
                rate: weight,
                targetDrop: target,
            };
        }
    }

    return {
        status: "Quan sát",
        level: 0,
        rate: 0,
    };
}
