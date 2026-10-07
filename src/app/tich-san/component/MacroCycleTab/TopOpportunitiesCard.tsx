'use client';

import React from 'react';
import { StockAnalysis } from './types';

interface TopOpportunitiesCardProps {
    stocks: StockAnalysis[];
    onSelectStock: (stock: StockAnalysis) => void;
    measured?: boolean;
}

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export default function TopOpportunitiesCard({ stocks, onSelectStock, measured = true }: TopOpportunitiesCardProps) {
    // Sắp xếp theo Stock Discount Score giảm dần, lấy top 5
    const topOpportunities = [...stocks]
        .sort((a, b) => b.stockDiscountScore - a.stockDiscountScore)
        .slice(0, 5);

    const getStars = (score: number) => {
        if (score >= 75) return '⭐⭐⭐⭐⭐';
        if (score >= 65) return '⭐⭐⭐⭐';
        if (score >= 50) return '⭐⭐⭐';
        if (score >= 35) return '⭐⭐';
        return '⭐';
    };

    const card = 'rounded-xl border border-[#1F2937] bg-[#111827] p-5 shadow-lg';

    if (!measured) {
        return (
            <div className={card}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800">
                            TOP OPPORTUNITIES
                        </span>
                        <span className="text-xs text-gray-400">Xếp hạng cơ hội tích sản hàng đầu</span>
                    </div>
                </div>
                <div className="p-6 text-center rounded-xl bg-[#0D131F] border border-[#1F2937]/70 text-gray-400 text-xs">
                    <p className="font-medium text-gray-300">Chưa có dữ liệu xếp hạng cơ hội</p>
                    <p className="mt-1 text-gray-500">Bấm nút &quot;✨ RUN INVESTMENT CYCLE ENGINE&quot; ở trên để bắt đầu quét số liệu và chấm điểm 12 cổ phiếu.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={card}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800">
                            TOP OPPORTUNITIES
                        </span>
                        <span className="text-xs text-gray-400">Xếp hạng cơ hội tích sản hàng đầu</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">Cơ Hội Chiết Khấu Hấp Dẫn Nhất</h3>
                </div>
                <span className="text-xs text-gray-500 hidden sm:inline">
                    Ưu tiên: Chiết khấu sâu + Chất lượng cao + Trọng số danh mục
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {topOpportunities.map((stock, index) => {
                    const stars = getStars(stock.stockDiscountScore);
                    const isTop1 = index === 0;

                    return (
                        <div
                            key={stock.symbol}
                            onClick={() => onSelectStock(stock)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                                isTop1
                                    ? 'bg-gradient-to-b from-[#16253B] to-[#0E1726] border-cyan-500/50 shadow-md hover:border-cyan-400'
                                    : 'bg-[#0D131F] border-[#1F2937] hover:border-indigo-500/60 hover:bg-[#131B2C]'
                            }`}
                        >
                            {/* Rank Badge */}
                            <div className="flex items-center justify-between mb-2">
                                <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                                        index === 0
                                            ? 'bg-amber-400 text-black shadow-sm'
                                            : index === 1
                                            ? 'bg-gray-300 text-black'
                                            : index === 2
                                            ? 'bg-amber-700 text-white'
                                            : 'bg-gray-800 text-gray-400'
                                    }`}
                                    style={{ fontFamily: MONO }}
                                >
                                    #{index + 1}
                                </span>
                                <span className="text-xs tracking-wider" title={`${stars} sao`}>
                                    {stars}
                                </span>
                            </div>

                            <div className="flex items-baseline justify-between mb-1">
                                <span className="text-base font-extrabold text-white" style={{ fontFamily: MONO }}>
                                    {stock.symbol}
                                </span>
                                <span className="text-xs text-cyan-300 font-bold" style={{ fontFamily: MONO }}>
                                    {stock.stockDiscountScore} đ
                                </span>
                            </div>

                            <p className="text-[11px] text-gray-400 truncate mb-2">{stock.name}</p>

                            {/* Key Stats */}
                            <div className="space-y-1 py-2 border-y border-[#1F2937]/70 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Chiết khấu Fair:</span>
                                    <span
                                        className={`font-semibold ${
                                            stock.discount >= 20 ? 'text-emerald-400' : 'text-cyan-300'
                                        }`}
                                        style={{ fontFamily: MONO }}
                                    >
                                        {stock.discount >= 0 ? `-${stock.discount}%` : `+${Math.abs(stock.discount)}%`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Giảm từ đỉnh:</span>
                                    <span className="text-gray-300 font-semibold" style={{ fontFamily: MONO }}>
                                        {stock.drawdown}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Chất lượng:</span>
                                    <span className="text-purple-300 font-semibold" style={{ fontFamily: MONO }}>
                                        Hạng {stock.qualityTier}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between">
                                <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        stock.action === 'ACCUMULATE_AGGRESSIVELY'
                                            ? 'bg-teal-400/20 text-teal-300 border border-teal-400/40'
                                            : stock.action === 'ACCUMULATE'
                                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                            : 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40'
                                    }`}
                                >
                                    {stock.actionLabel}
                                </span>
                                <span className="text-[10px] text-gray-400 group-hover:text-white transition">
                                    Chi tiết →
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
