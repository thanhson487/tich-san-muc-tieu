'use client';

import React, { useState, useMemo } from 'react';
import { StockAnalysis } from './types';

interface StockTableCardProps {
    stocks: StockAnalysis[];
    onSelectStock: (stock: StockAnalysis) => void;
    measured?: boolean;
}

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export default function StockTableCard({ stocks, onSelectStock, measured = true }: StockTableCardProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<'score' | 'discount' | 'drawdown' | 'quality'>('score');
    const [sortAsc, setSortAsc] = useState(false);

    const formatVND = (v: number) => `${Math.round(v).toLocaleString('vi-VN')} đ`;

    // Lấy danh sách ngành duy nhất
    const sectors = useMemo(() => {
        const set = new Set<string>();
        stocks.forEach((s) => set.add(s.sector));
        return ['ALL', ...Array.from(set)];
    }, [stocks]);

    // Lọc & sắp xếp
    const filteredStocks = useMemo(() => {
        let list = stocks.filter((s) => {
            const matchSearch =
                s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchSector = selectedSector === 'ALL' || s.sector === selectedSector;
            return matchSearch && matchSector;
        });

        list.sort((a, b) => {
            let diff = 0;
            if (sortBy === 'score') diff = b.stockDiscountScore - a.stockDiscountScore;
            else if (sortBy === 'discount') diff = b.discount - a.discount;
            else if (sortBy === 'drawdown') diff = a.drawdown - b.drawdown; // Càng âm xếp trước
            else if (sortBy === 'quality') diff = b.qualityScore - a.qualityScore;

            return sortAsc ? -diff : diff;
        });

        return list;
    }, [stocks, searchTerm, selectedSector, sortBy, sortAsc]);

    const getScoreStyle = (score: number) => {
        if (score >= 80) return { color: '#00FFC8', bg: 'rgba(0, 255, 200, 0.12)', border: '#00FFC844' };
        if (score >= 60) return { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.12)', border: '#22C55E44' };
        if (score >= 40) return { color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)', border: '#38BDF844' };
        if (score >= 20) return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: '#F59E0B44' };
        return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: '#EF444444' };
    };

    const getActionBadge = (action: StockAnalysis['action']) => {
        switch (action) {
            case 'ACCUMULATE_AGGRESSIVELY':
                return { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/40' };
            case 'ACCUMULATE':
                return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' };
            case 'DCA':
            case 'BUY':
                return { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' };
            case 'HOLD':
                return { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/40' };
            case 'REDUCE':
                return { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' };
            case 'AVOID':
            default:
                return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40' };
        }
    };

    const card = 'rounded-xl border border-[#1F2937] bg-[#111827] p-5 shadow-lg';

    return (
        <div className={card}>
            {/* Header + Search + Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 px-2 py-0.5 rounded border border-indigo-800">
                            TẦNG 3 – STOCK VALUATION &amp; DISCOUNT ENGINE
                        </span>
                        <span className="text-xs text-gray-400">Danh mục 12 cổ phiếu trọng tâm</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">Bảng Định Giá &amp; Chiết Khấu Từng Cổ Phiếu</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="Tìm mã cổ phiếu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#090D16] border border-[#1F2937] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 w-36"
                    />

                    {/* Sector Filter */}
                    <select
                        value={selectedSector}
                        onChange={(e) => setSelectedSector(e.target.value)}
                        className="bg-[#090D16] border border-[#1F2937] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                        {sectors.map((sec) => (
                            <option key={sec} value={sec}>
                                {sec === 'ALL' ? 'Tất cả các ngành' : sec}
                            </option>
                        ))}
                    </select>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-1 bg-[#090D16] border border-[#1F2937] rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={() => {
                                if (sortBy === 'score') setSortAsc(!sortAsc);
                                else {
                                    setSortBy('score');
                                    setSortAsc(false);
                                }
                            }}
                            className={`px-2 py-1 text-xs rounded transition cursor-pointer ${
                                sortBy === 'score' ? 'bg-[#1F2937] text-white font-semibold' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Score {sortBy === 'score' ? (sortAsc ? '↑' : '↓') : ''}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (sortBy === 'discount') setSortAsc(!sortAsc);
                                else {
                                    setSortBy('discount');
                                    setSortAsc(false);
                                }
                            }}
                            className={`px-2 py-1 text-xs rounded transition cursor-pointer ${
                                sortBy === 'discount' ? 'bg-[#1F2937] text-white font-semibold' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Discount {sortBy === 'discount' ? (sortAsc ? '↑' : '↓') : ''}
                        </button>
                    </div>
                </div>
            </div>

            {/* Note bar: Rules */}
            <div className="mb-3 px-3 py-2 rounded-lg bg-[#090D16] border border-[#1F2937] text-xs text-gray-400 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                        81-100: Extreme Discount
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        61-80: Deep Discount
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                        41-60: Discounted
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        21-40: Fair
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        0-20: Expensive
                    </span>
                </div>
                <span className="text-[11px] text-gray-500 italic">
                    💡 Click vào dòng để mở chi tiết chẩn đoán
                </span>
            </div>

            {/* Stock Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-[11px] uppercase text-gray-400 border-b border-[#1F2937] pb-2">
                            <th className="py-2.5 pr-2">Mã CP</th>
                            <th className="py-2.5 pr-3 text-right">Giá Hiện Tại</th>
                            <th className="py-2.5 pr-3 text-right">Đỉnh 52T</th>
                            <th className="py-2.5 pr-3 text-right">Giảm Từ Đỉnh</th>
                            <th className="py-2.5 pr-3 text-right">Fair Value (Base)</th>
                            <th className="py-2.5 pr-3 text-right">Chiết Khấu Fair</th>
                            <th className="py-2.5 pr-3 text-center">Chất Lượng</th>
                            <th className="py-2.5 pr-3 text-center">Tỷ Trọng (Hiện/Mục)</th>
                            <th className="py-2.5 pr-3 text-center">Đạn Tiền</th>
                            <th className="py-2.5 pr-3 text-center">Discount Score</th>
                            <th className="py-2.5 text-right">Hành Động Khuyến Nghị</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2937]/50">
                        {filteredStocks.map((stock) => {
                            const scoreStyle = getScoreStyle(stock.stockDiscountScore);
                            const actionBadge = getActionBadge(stock.action);

                            return (
                                <tr
                                    key={stock.symbol}
                                    onClick={() => onSelectStock(stock)}
                                    className="hover:bg-[#161F33] transition cursor-pointer group"
                                >
                                    {/* 1. Mã CP & Tên */}
                                    <td className="py-3 pr-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-sm font-extrabold text-white group-hover:text-cyan-400 transition"
                                                style={{ fontFamily: MONO }}
                                            >
                                                {stock.symbol}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 hidden xl:inline">
                                                {stock.sector}
                                            </span>
                                        </div>
                                    </td>

                                    {/* 2. Giá hiện tại */}
                                    <td className="py-3 pr-3 text-right text-gray-200 font-semibold" style={{ fontFamily: MONO }}>
                                        {formatVND(stock.price)}
                                    </td>

                                    {/* 3. Đỉnh 52 tuần */}
                                    <td className="py-3 pr-3 text-right text-gray-400" style={{ fontFamily: MONO }}>
                                        {formatVND(stock.peak52w)}
                                    </td>

                                    {/* 4. Drawdown từ đỉnh */}
                                    <td className="py-3 pr-3 text-right" style={{ fontFamily: MONO }}>
                                        <span
                                            className={`font-semibold ${
                                                stock.drawdown <= -25
                                                    ? 'text-emerald-400'
                                                    : stock.drawdown <= -15
                                                    ? 'text-cyan-400'
                                                    : 'text-amber-400'
                                            }`}
                                        >
                                            {stock.drawdown}%
                                        </span>
                                    </td>

                                    {/* 5. Fair Value Base */}
                                    <td className="py-3 pr-3 text-right text-gray-300 font-medium" style={{ fontFamily: MONO }}>
                                        {formatVND(stock.fairValue.base)}
                                    </td>

                                    {/* 6. Chiết khấu so với Fair Value */}
                                    <td className="py-3 pr-3 text-right" style={{ fontFamily: MONO }}>
                                        <span
                                            className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                                stock.discount >= 20
                                                    ? 'bg-emerald-950 text-emerald-300'
                                                    : stock.discount >= 0
                                                    ? 'bg-cyan-950 text-cyan-300'
                                                    : 'bg-amber-950 text-amber-300'
                                            }`}
                                        >
                                            {stock.discount >= 0 ? `+${stock.discount}%` : `${stock.discount}%`}
                                        </span>
                                    </td>

                                    {/* 7. Chất lượng (Quality Tier) */}
                                    <td className="py-3 pr-3 text-center">
                                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                                            {stock.qualityTier} ({stock.qualityScore})
                                        </span>
                                    </td>

                                    {/* 8. Tỷ trọng (Hiện tại vs Mục tiêu) */}
                                    <td className="py-3 pr-3 text-center" style={{ fontFamily: MONO }}>
                                        <span
                                            className={`${
                                                stock.weightStatus === 'UNDERWEIGHT'
                                                    ? 'text-amber-400'
                                                    : stock.weightStatus === 'OVERWEIGHT'
                                                    ? 'text-purple-400'
                                                    : 'text-gray-300'
                                            }`}
                                        >
                                            {stock.currentWeight}% / {stock.targetWeight}%
                                        </span>
                                    </td>

                                    {/* 9. Đạn tiền mặt */}
                                    <td className="py-3 pr-3 text-center">
                                        {!measured ? (
                                            <span className="text-[10px] text-gray-600 font-mono">--</span>
                                        ) : stock.cashBulletRecommended > 0 ? (
                                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                                                +{stock.cashBulletRecommended * 5}% Cash
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-gray-500">DCA chuẩn</span>
                                        )}
                                    </td>

                                    {/* 10. Discount Score */}
                                    <td className="py-3 pr-3 text-center">
                                        {!measured ? (
                                            <span className="text-xs text-gray-500 font-bold font-mono">--</span>
                                        ) : (
                                            <span
                                                className="inline-block px-2.5 py-1 rounded-md text-xs font-black shadow-sm"
                                                style={{
                                                    backgroundColor: scoreStyle.bg,
                                                    color: scoreStyle.color,
                                                    border: `1px solid ${scoreStyle.border}`,
                                                    fontFamily: MONO,
                                                }}
                                            >
                                                {stock.stockDiscountScore}
                                            </span>
                                        )}
                                    </td>

                                    {/* 11. Hành động */}
                                    <td className="py-3 text-right">
                                        {!measured ? (
                                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs text-gray-500 border border-gray-700/60 font-medium">
                                                Chờ dữ liệu
                                            </span>
                                        ) : (
                                            <span
                                                className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${actionBadge.bg} ${actionBadge.text} ${actionBadge.border}`}
                                            >
                                                {stock.actionLabel}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
