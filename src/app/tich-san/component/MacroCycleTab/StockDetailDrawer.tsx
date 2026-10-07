'use client';

import React from 'react';
import { Drawer } from 'antd';
import { StockAnalysis } from './types';

interface StockDetailDrawerProps {
    stock: StockAnalysis | null;
    open: boolean;
    onClose: () => void;
}

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export default function StockDetailDrawer({ stock, open, onClose }: StockDetailDrawerProps) {
    if (!stock) return null;

    const formatVND = (v: number) => `${Math.round(v).toLocaleString('vi-VN')} đ`;

    const getScoreBadgeColor = (score: number) => {
        if (score >= 80) return '#00FFC8';
        if (score >= 60) return '#22C55E';
        if (score >= 40) return '#38BDF8';
        if (score >= 20) return '#F59E0B';
        return '#EF4444';
    };

    const getActionBadge = (action: StockAnalysis['action']) => {
        switch (action) {
            case 'ACCUMULATE_AGGRESSIVELY':
                return { bg: 'rgba(0, 255, 200, 0.15)', text: '#00FFC8', border: 'rgba(0, 255, 200, 0.4)' };
            case 'ACCUMULATE':
                return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', border: 'rgba(34, 197, 94, 0.4)' };
            case 'DCA':
            case 'BUY':
                return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38BDF8', border: 'rgba(56, 189, 248, 0.4)' };
            case 'HOLD':
                return { bg: 'rgba(156, 163, 175, 0.15)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.4)' };
            case 'REDUCE':
                return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.4)' };
            case 'AVOID':
            default:
                return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.4)' };
        }
    };

    const actionBadge = getActionBadge(stock.action);
    const scoreColor = getScoreBadgeColor(stock.stockDiscountScore);

    return (
        <Drawer
            title={
                <div className="flex items-center justify-between pr-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-extrabold text-white tracking-wider" style={{ fontFamily: MONO }}>
                            {stock.symbol}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                            {stock.sector}
                        </span>
                    </div>
                    <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                            backgroundColor: actionBadge.bg,
                            color: actionBadge.text,
                            border: `1px solid ${actionBadge.border}`,
                        }}
                    >
                        {stock.actionLabel}
                    </span>
                </div>
            }
            placement="right"
            width={540}
            onClose={onClose}
            open={open}
            styles={{
                header: { background: '#111827', borderBottom: '1px solid #1F2937', color: '#F3F4F6' },
                body: { background: '#0B0F19', color: '#D1D5DB', padding: '20px' },
            }}
        >
            <div className="space-y-6">
                {/* 1. Price & Valuation Overview */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937]">
                        <span className="text-xs text-gray-400">Giá thị trường hiện tại</span>
                        <div className="text-xl font-bold text-white mt-1" style={{ fontFamily: MONO }}>
                            {formatVND(stock.price)}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="text-gray-500">Đỉnh 52 tuần:</span>
                            <span className="text-gray-300" style={{ fontFamily: MONO }}>
                                {formatVND(stock.peak52w)}
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937]">
                        <span className="text-xs text-gray-400">Drawdown (Giảm từ đỉnh)</span>
                        <div
                            className={`text-xl font-bold mt-1 ${
                                stock.drawdown <= -25
                                    ? 'text-emerald-400'
                                    : stock.drawdown <= -15
                                    ? 'text-cyan-400'
                                    : 'text-amber-400'
                            }`}
                            style={{ fontFamily: MONO }}
                        >
                            {stock.drawdown}%
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Biên độ chiết khấu kỹ thuật</p>
                    </div>
                </div>

                {/* 2. Fair Value Range vs Current Price */}
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                            🎯 Định Giá Hợp Lý (Fair Value Engine)
                        </span>
                        <span
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{
                                color: stock.discount >= 20 ? '#22C55E' : stock.discount >= 0 ? '#38BDF8' : '#F59E0B',
                                background: stock.discount >= 20 ? '#22C55E22' : stock.discount >= 0 ? '#38BDF822' : '#F59E0B22',
                            }}
                        >
                            {stock.discount >= 0 ? `Chiết khấu ${stock.discount}%` : `Đắt hơn Fair ${Math.abs(stock.discount)}%`}
                        </span>
                    </div>

                    {/* Fair Value Range Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        <div className="p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                            <span className="text-[11px] text-gray-400 block">Kịch bản Bi quan</span>
                            <span className="text-xs font-bold text-gray-300" style={{ fontFamily: MONO }}>
                                {formatVND(stock.fairValue.bear)}
                            </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#141E33] border border-cyan-800/60 shadow-sm">
                            <span className="text-[11px] text-cyan-300 font-semibold block">Cơ sở (Base Case)</span>
                            <span className="text-sm font-extrabold text-cyan-200" style={{ fontFamily: MONO }}>
                                {formatVND(stock.fairValue.base)}
                            </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                            <span className="text-[11px] text-gray-400 block">Kịch bản Lạc quan</span>
                            <span className="text-xs font-bold text-gray-300" style={{ fontFamily: MONO }}>
                                {formatVND(stock.fairValue.bull)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-[#0D131F] text-xs text-gray-400 leading-relaxed border border-[#1F2937]/50">
                        <span className="text-cyan-400 font-semibold">Quy tắc vàng:</span> Không nhầm lẫn giữa &quot;Giảm từ đỉnh&quot; ({stock.drawdown}%) và &quot;Chiết khấu so với Fair Value&quot; ({stock.discount}%). Chỉ khi cổ phiếu rẻ hơn giá trị nội tại cơ sở mới cấu thành biên an toàn đầu tư.
                    </div>
                </div>

                {/* 3. Discount Score Breakdown */}
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                                📊 Stock Discount Score
                            </span>
                            <p className="text-[11px] text-gray-500">Mô hình tính điểm đa biến 0 - 100</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black" style={{ color: scoreColor, fontFamily: MONO }}>
                                {stock.stockDiscountScore}
                            </span>
                            <span className="text-xs text-gray-500" style={{ fontFamily: MONO }}>
                                / 100
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2.5 mt-3 text-xs">
                        {/* 1. Valuation Discount */}
                        <div>
                            <div className="flex justify-between text-gray-400 mb-1">
                                <span>1. Chiết khấu định giá (Valuation Discount - 30%)</span>
                                <span className="text-white font-semibold" style={{ fontFamily: MONO }}>
                                    {stock.scoreBreakdown.valuationDiscountScore}/100
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                                <div
                                    className="h-full bg-cyan-400 rounded-full"
                                    style={{ width: `${stock.scoreBreakdown.valuationDiscountScore}%` }}
                                />
                            </div>
                        </div>

                        {/* 2. Price Drawdown */}
                        <div>
                            <div className="flex justify-between text-gray-400 mb-1">
                                <span>2. Mức điều chỉnh từ đỉnh (Price Drawdown - 25%)</span>
                                <span className="text-white font-semibold" style={{ fontFamily: MONO }}>
                                    {stock.scoreBreakdown.drawdownScore}/100
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                                <div
                                    className="h-full bg-emerald-400 rounded-full"
                                    style={{ width: `${stock.scoreBreakdown.drawdownScore}%` }}
                                />
                            </div>
                        </div>

                        {/* 3. Historical Valuation */}
                        <div>
                            <div className="flex justify-between text-gray-400 mb-1">
                                <span>3. Định giá so với lịch sử (P/E, P/B - 15%)</span>
                                <span className="text-white font-semibold" style={{ fontFamily: MONO }}>
                                    {stock.scoreBreakdown.historicalValuationScore}/100
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                                <div
                                    className="h-full bg-indigo-400 rounded-full"
                                    style={{ width: `${stock.scoreBreakdown.historicalValuationScore}%` }}
                                />
                            </div>
                        </div>

                        {/* 4. Earnings Growth */}
                        <div>
                            <div className="flex justify-between text-gray-400 mb-1">
                                <span>4. Tăng trưởng lợi nhuận EPS (15%)</span>
                                <span className="text-white font-semibold" style={{ fontFamily: MONO }}>
                                    {stock.scoreBreakdown.earningsGrowthScore}/100
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full"
                                    style={{ width: `${stock.scoreBreakdown.earningsGrowthScore}%` }}
                                />
                            </div>
                        </div>

                        {/* 5. Financial Quality */}
                        <div>
                            <div className="flex justify-between text-gray-400 mb-1">
                                <span>5. Sức khỏe tài chính &amp; ROE (10%)</span>
                                <span className="text-white font-semibold" style={{ fontFamily: MONO }}>
                                    {stock.scoreBreakdown.financialQualityScore}/100
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                                <div
                                    className="h-full bg-purple-400 rounded-full"
                                    style={{ width: `${stock.scoreBreakdown.financialQualityScore}%` }}
                                />
                            </div>
                        </div>

                        {/* 6. Relative Strength */}
                        <div>
                            <div className="flex justify-between text-gray-400 mb-1">
                                <span>6. Sức mạnh tương đối so với VN-Index (5%)</span>
                                <span className="text-white font-semibold" style={{ fontFamily: MONO }}>
                                    {stock.scoreBreakdown.relativeStrengthScore}/100
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                                <div
                                    className="h-full bg-pink-400 rounded-full"
                                    style={{ width: `${stock.scoreBreakdown.relativeStrengthScore}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Fundamental & Sector Specific Metrics */}
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide block mb-3">
                        🔍 Chỉ Số Tài Chính Cốt Lõi
                    </span>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center">
                        <div className="p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                            <span className="text-[10px] text-gray-400 block">P/E Hiện tại</span>
                            <span className="text-sm font-bold text-white" style={{ fontFamily: MONO }}>
                                {stock.pe}x
                            </span>
                            <span className="text-[10px] text-gray-500 block mt-0.5">
                                TB 5n: {stock.historicalPe}x
                            </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                            <span className="text-[10px] text-gray-400 block">P/B Hiện tại</span>
                            <span className="text-sm font-bold text-white" style={{ fontFamily: MONO }}>
                                {stock.pb}x
                            </span>
                            <span className="text-[10px] text-gray-500 block mt-0.5">
                                TB 5n: {stock.historicalPb}x
                            </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                            <span className="text-[10px] text-gray-400 block">EPS Growth</span>
                            <span
                                className={`text-sm font-bold ${
                                    stock.epsGrowth >= 15 ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                                style={{ fontFamily: MONO }}
                            >
                                +{stock.epsGrowth}%
                            </span>
                            <span className="text-[10px] text-gray-500 block mt-0.5">Tăng trưởng YoY</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                            <span className="text-[10px] text-gray-400 block">Chất Lượng</span>
                            <span className="text-sm font-bold text-cyan-400" style={{ fontFamily: MONO }}>
                                Hạng {stock.qualityTier}
                            </span>
                            <span className="text-[10px] text-gray-500 block mt-0.5">ROE {stock.roe}%</span>
                        </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937] text-xs">
                        <span className="text-gray-400 font-medium block text-[11px]">
                            {stock.sectorKeyMetricLabel}:
                        </span>
                        <span className="text-gray-200 mt-0.5 block font-medium">
                            {stock.sectorKeyMetricValue}
                        </span>
                    </div>
                </div>

                {/* 5. Portfolio Weight & Tactical Cash Bullet */}
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                            ⚖️ Vị Thế Danh Mục &amp; Đạn Tiền Mặt
                        </span>
                        <span
                            className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                stock.weightStatus === 'UNDERWEIGHT'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : stock.weightStatus === 'OVERWEIGHT'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                        >
                            {stock.weightStatus === 'UNDERWEIGHT'
                                ? 'Thiếu tỷ trọng (Ưu tiên mua)'
                                : stock.weightStatus === 'OVERWEIGHT'
                                ? 'Vượt tỷ trọng (Không mua đuổi)'
                                : 'Tỷ trọng cân bằng'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div className="p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                            <span className="text-gray-400">Tỷ trọng mục tiêu:</span>
                            <div className="text-white font-bold text-sm mt-0.5" style={{ fontFamily: MONO }}>
                                {stock.targetWeight}% danh mục
                            </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                            <span className="text-gray-400">Tỷ trọng hiện tại:</span>
                            <div className="text-white font-bold text-sm mt-0.5" style={{ fontFamily: MONO }}>
                                {stock.currentWeight}% danh mục
                            </div>
                        </div>
                    </div>

                    {/* Dry powder tranche advice */}
                    <div className="p-3 rounded-lg bg-[#131D2E] border border-cyan-800/40 text-xs">
                        <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-1">
                            <span>💣 Khuyến nghị đạn dự phòng (20% Cash Reserve):</span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">
                            {stock.cashBulletRecommended > 0
                                ? `Đủ điều kiện giải ngân Đạn ${stock.cashBulletRecommended} (+${stock.cashBulletRecommended * 5}% tiền mặt dự phòng) để gia tăng tích sản.`
                                : 'Chưa kích hoạt đạn tiền mặt đặc biệt. Tiếp tục DCA đều đặn bằng dòng tiền tiết kiệm hàng tháng.'}
                        </p>
                    </div>
                </div>

                {/* 6. Checkpoints WHY? (Tại sao có điểm số này?) */}
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide block mb-3">
                        💡 TẠI SAO? (Luận điểm định giá &amp; chu kỳ)
                    </span>

                    <div className="space-y-2 text-xs">
                        {stock.reasons.positive.map((item, idx) => (
                            <div key={`pos-${idx}`} className="flex items-start gap-2 text-emerald-300">
                                <span className="font-bold">✓</span>
                                <span className="text-gray-200">{item}</span>
                            </div>
                        ))}

                        {stock.reasons.neutral.map((item, idx) => (
                            <div key={`neu-${idx}`} className="flex items-start gap-2 text-cyan-300">
                                <span className="font-bold">•</span>
                                <span className="text-gray-300">{item}</span>
                            </div>
                        ))}

                        {stock.reasons.negative.map((item, idx) => (
                            <div key={`neg-${idx}`} className="flex items-start gap-2 text-amber-400">
                                <span className="font-bold">✗</span>
                                <span className="text-gray-300">{item}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1F2937] text-xs text-gray-300 leading-relaxed italic">
                        &quot;{stock.strategicTakeaway}&quot;
                    </div>
                </div>
            </div>
        </Drawer>
    );
}
