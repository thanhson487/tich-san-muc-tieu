'use client';

import React from 'react';
import { CashReserveState } from './types';

interface CashReserveCardProps {
    cashReserve: CashReserveState;
    economicScore: number;
    marketDiscountScore: number;
    measured?: boolean;
}

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export default function CashReserveCard({
    cashReserve,
    economicScore,
    marketDiscountScore,
    measured = true,
}: CashReserveCardProps) {
    const card = 'rounded-xl border border-[#1F2937] bg-[#111827] p-5 shadow-lg';

    return (
        <div className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800">
                            DRY POWDER ENGINE
                        </span>
                        <span className="text-xs text-gray-400">Quy tắc 20% tiền mặt dự phòng</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">Quản Trị Tiền Mặt Dự Phòng (Dry Powder)</h3>
                    <p className="text-xs text-gray-400">
                        Chiến lược phân bổ mặc định 50% Cổ phiếu · 30% CCQ · 20% Tiền mặt. Tiền mặt không nằm yên mà chia làm 4 đạn để tăng tốc khi có chiết khấu.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-[#0D131F] border border-[#1F2937] px-4 py-2.5 rounded-xl">
                    <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Tổng quỹ dự phòng</span>
                        <span className="text-base font-bold text-white" style={{ fontFamily: MONO }}>
                            {cashReserve.totalReservePercent}%
                        </span>
                    </div>
                    <div className="w-[1px] h-8 bg-gray-800" />
                    <div>
                        <span className="text-[10px] text-emerald-400 uppercase block">Được phép giải ngân</span>
                        <span className="text-base font-bold text-emerald-300" style={{ fontFamily: MONO }}>
                            {measured ? `${cashReserve.deployedPercent}%` : '--'}
                        </span>
                    </div>
                    <div className="w-[1px] h-8 bg-gray-800" />
                    <div>
                        <span className="text-[10px] text-gray-400 uppercase block">Giữ phòng thủ</span>
                        <span className="text-base font-bold text-gray-300" style={{ fontFamily: MONO }}>
                            {measured ? `${cashReserve.availablePercent}%` : '20%'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3 Điều kiện bắt buộc để kích hoạt Dry Powder */}
            <div className="mb-4 p-3.5 rounded-xl bg-[#0D131F] border border-[#1F2937]">
                <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
                    🎯 3 Điều Kiện Kích Hoạt Đạn Dự Phòng Đồng Thời:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                    <div
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                            cashReserve.conditionDetails.macroConditionMet
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                                : 'bg-[#121927] border-[#1F2937] text-gray-400'
                        }`}
                    >
                        <span>1. Chu kỳ kinh tế (Score &gt; 55)</span>
                        <span className="font-bold ml-2" style={{ fontFamily: MONO }}>
                            {economicScore}/100 {cashReserve.conditionDetails.macroConditionMet ? '✓' : '✗'}
                        </span>
                    </div>

                    <div
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                            cashReserve.conditionDetails.marketConditionMet
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                                : 'bg-[#121927] border-[#1F2937] text-gray-400'
                        }`}
                    >
                        <span>2. Định giá thị trường (Score &gt; 50)</span>
                        <span className="font-bold ml-2" style={{ fontFamily: MONO }}>
                            {marketDiscountScore}/100 {cashReserve.conditionDetails.marketConditionMet ? '✓' : '✗'}
                        </span>
                    </div>

                    <div
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                            cashReserve.conditionDetails.stockDeepDiscountMet
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                                : 'bg-[#121927] border-[#1F2937] text-gray-400'
                        }`}
                    >
                        <span>3. Cổ phiếu chiết khấu sâu (&gt; 60)</span>
                        <span className="font-bold ml-2" style={{ fontFamily: MONO }}>
                            {cashReserve.conditionDetails.stockDeepDiscountMet ? 'Đạt tiêu chuẩn ✓' : 'Chưa đạt ✗'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bảng 4 Đạn Giải Ngân */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {cashReserve.bullets.map((bullet) => (
                    <div
                        key={bullet.bullet}
                        className={`p-3.5 rounded-xl border transition-all ${
                            bullet.active
                                ? 'bg-gradient-to-b from-emerald-950/40 to-[#0D1824] border-emerald-500/50 shadow-md'
                                : 'bg-[#0D131F] border-[#1F2937] opacity-60'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white tracking-wide">{bullet.name}</span>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    bullet.active
                                        ? 'bg-emerald-400 text-black'
                                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                                }`}
                            >
                                {bullet.active ? 'ĐÃ KÍCH HOẠT' : 'CHỜ TÍN HIỆU'}
                            </span>
                        </div>

                        <div className="text-xl font-extrabold text-white mb-1" style={{ fontFamily: MONO }}>
                            +{bullet.percent}%{' '}
                            <span className="text-xs font-normal text-gray-400">Cash Reserve</span>
                        </div>

                        <p className="text-[11px] text-gray-400 leading-relaxed mb-2 min-h-[34px]">
                            {bullet.reason}
                        </p>

                        <div className="text-[10px] text-gray-500 pt-2 border-t border-[#1F2937]">
                            Điều kiện kích hoạt: Score &gt; {bullet.triggerScore}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[#0D131F] border border-[#1F2937] text-xs text-gray-400 leading-relaxed">
                💡 <strong className="text-cyan-300">Nguyên tắc cốt lõi:</strong> Không bao giờ bắn toàn bộ 20% tiền mặt trong 1 lần. Chia nhỏ làm 4 đạn giúp nhà đầu tư trung bình giá thuận lợi, tránh rủi ro giải ngân quá sớm khi thị trường vẫn đang trong pha giảm mạnh.
            </div>
        </div>
    );
}
