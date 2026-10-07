'use client';

import React from 'react';
import { MarketValuationState } from './types';

interface MarketValuationCardProps {
    market: MarketValuationState;
    measured?: boolean;
}

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export default function MarketValuationCard({ market, measured = true }: MarketValuationCardProps) {
    const card = 'rounded-xl border border-[#1F2937] bg-[#111827] p-5 shadow-lg';

    const getStatusStyle = (status: MarketValuationState['status']) => {
        if (!measured) {
            return { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.4)' };
        }
        switch (status) {
            case 'PANIC_DISCOUNT':
                return { color: '#00FFC8', bg: 'rgba(0, 255, 200, 0.15)', border: 'rgba(0, 255, 200, 0.4)' };
            case 'DISCOUNTED':
                return { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)' };
            case 'FAIR':
                return { color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' };
            case 'EXPENSIVE':
            default:
                return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' };
        }
    };

    const statusStyle = getStatusStyle(market.status);

    return (
        <div className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800">
                            TẦNG 2 – MARKET VALUATION ENGINE
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">Định Giá Thị Trường (VN-Index)</h3>
                    <p className="text-xs text-gray-400">
                        Xác định VN-Index đang rẻ hay đắt so với lịch sử (P/E, MA200, Drawdown, EPS Growth)
                    </p>
                </div>

                <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-3xl font-extrabold" style={{ color: statusStyle.color, fontFamily: MONO }}>
                            {measured ? market.marketDiscountScore : '--'}
                        </span>
                        <span className="text-xs text-gray-500" style={{ fontFamily: MONO }}>
                            / 100
                        </span>
                    </div>
                    <span
                        className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold"
                        style={{
                            color: statusStyle.color,
                            backgroundColor: statusStyle.bg,
                            border: `1px solid ${statusStyle.border}`,
                        }}
                    >
                        {measured ? market.statusLabel : 'Chờ quét dữ liệu'}
                    </span>
                </div>
            </div>

            {/* Grid 4 Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {/* 1. P/E vs Historical */}
                <div className="p-3 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                    <span className="text-[11px] text-gray-400 block">P/E VN-Index</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-bold text-white" style={{ fontFamily: MONO }}>
                            {market.pe}x
                        </span>
                        <span className="text-[11px] text-gray-400">
                            vs Trung vị 5n:{' '}
                            <strong className="text-cyan-300" style={{ fontFamily: MONO }}>
                                {market.peHistorical5yMedian}x
                            </strong>
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-1">
                        TB 5 năm: {market.peHistorical5yAvg}x
                    </span>
                </div>

                {/* 2. Drawdown from 52w peak */}
                <div className="p-3 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                    <span className="text-[11px] text-gray-400 block">Mức Giảm Từ Đỉnh 52T</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span
                            className={`text-lg font-bold ${
                                market.drawdown <= -15
                                    ? 'text-emerald-400'
                                    : market.drawdown <= -8
                                    ? 'text-cyan-400'
                                    : 'text-amber-400'
                            }`}
                            style={{ fontFamily: MONO }}
                        >
                            {market.drawdown}%
                        </span>
                        <span className="text-[11px] text-gray-400">
                            Đỉnh:{' '}
                            <span className="text-gray-300" style={{ fontFamily: MONO }}>
                                {market.peak52w.toLocaleString('vi-VN')}
                            </span>
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-1">
                        Hiện tại: {market.vnIndex.toLocaleString('vi-VN')}
                    </span>
                </div>

                {/* 3. Distance to MA200 */}
                <div className="p-3 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                    <span className="text-[11px] text-gray-400 block">Khoảng Cách MA200 Tuần</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span
                            className={`text-lg font-bold ${
                                market.ma200Distance <= -5
                                    ? 'text-emerald-400'
                                    : market.ma200Distance <= 5
                                    ? 'text-cyan-400'
                                    : 'text-purple-400'
                            }`}
                            style={{ fontFamily: MONO }}
                        >
                            {market.ma200Distance >= 0 ? `+${market.ma200Distance}%` : `${market.ma200Distance}%`}
                        </span>
                        <span className="text-[11px] text-gray-400">
                            MA200:{' '}
                            <span className="text-gray-300" style={{ fontFamily: MONO }}>
                                {market.ma200.toLocaleString('vi-VN')}
                            </span>
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-1">Đường trung bình dài hạn</span>
                </div>

                {/* 4. EPS Growth & P/B */}
                <div className="p-3 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                    <span className="text-[11px] text-gray-400 block">Tăng Trưởng EPS Thị Trường</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-bold text-emerald-400" style={{ fontFamily: MONO }}>
                            +{market.epsGrowth}%
                        </span>
                        <span className="text-[11px] text-gray-400">
                            P/B:{' '}
                            <strong className="text-white" style={{ fontFamily: MONO }}>
                                {market.pb}x
                            </strong>
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-1">Không chỉ rẻ đơn thuần mà có tăng trưởng</span>
                </div>
            </div>

            {/* Scale Bar: Đắt -> Hợp lý -> Chiết khấu -> Hoảng loạn */}
            <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Đắt (0-25)</span>
                    <span>Hợp lý (26-45)</span>
                    <span>Chiết khấu (46-65)</span>
                    <span className="text-emerald-400 font-semibold">Hoảng loạn / Cơ hội (66-100)</span>
                </div>
                <div className="h-2 rounded-full bg-[#1F2937] overflow-hidden flex">
                    <div className="w-1/4 h-full bg-red-500/80" />
                    <div className="w-1/5 h-full bg-cyan-500/80" />
                    <div className="w-1/5 h-full bg-emerald-500/80" />
                    <div className="flex-1 h-full bg-teal-400" />
                </div>
                <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
                    <span>
                        Trạng thái hiện tại:{' '}
                        <strong className="text-white">{market.statusLabel}</strong>
                    </span>
                    <span className="italic text-gray-500">
                        {market.marketDiscountScore >= 50
                            ? '✓ Đạt điều kiện giải ngân tiền mặt dự phòng'
                            : '• Tiếp tục tích sản đều đặn, không mua đuổi khi định giá đắt'}
                    </span>
                </div>
            </div>
        </div>
    );
}
