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
export const DCA_WEIGHTS = [15, 25, 35, 25]; // DCA 1 -> 4 tương ứng 15%, 25%, 35%, 25%
export const TOLERANCE = 2; // Biên độ ±2%
