'use client';

import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import { StockYearInfo } from '../stockService';
import { getDcaAnalysis, DcaAnalysisResult, getNextDcaTarget, NextDcaTargetResult } from '@/utils/dcaCalculation';
import { StockTrackerDoc } from '@/services/stockFirebaseService';
import { getTodayStock } from '@/utils/dailyStockPicker';

interface DcaScannerViewProps {
    symbols: string[];
    watchlist?: StockTrackerDoc[];
    priceDataMap: Record<string, StockYearInfo>;
    loading: boolean;
    selectedYear?: number;
    onRefresh: () => void;
    error?: string;
}

interface ScannerTableItem {
    symbol: string;
    currentPrice: number;
    yearHigh: number;
    dropPercent: number;
    signal: DcaAnalysisResult;
    nextTarget: NextDcaTargetResult;
    docItem?: StockTrackerDoc;
}

export default function DcaScannerView({
    symbols,
    watchlist = [],
    priceDataMap,
    loading,
    selectedYear = new Date().getFullYear(),
    onRefresh,
    error,
}: DcaScannerViewProps) {
    const peakYear = selectedYear - 1;

    // Tự động chọn 1 mã cổ phiếu luân phiên theo ngày làm việc từ danh mục động
    const todayPick = useMemo(() => getTodayStock(symbols), [symbols]);
    const todayPriceInfo = todayPick.symbol ? priceDataMap[todayPick.symbol] : null;
    const todayDocItem = todayPick.symbol ? watchlist.find((w) => w.symbol === todayPick.symbol) : null;
    const todaySignal = todayPick.symbol && todayPriceInfo
        ? getDcaAnalysis(
            todayPick.symbol,
            todayPriceInfo.currentPrice,
            todayPriceInfo.yearHigh,
            todayDocItem?.dcaFilled,
            todayDocItem?.dropLevels
        )
        : null;
    const todayNextTarget = todayPick.symbol && todayPriceInfo
        ? getNextDcaTarget(
            todayPick.symbol,
            todayPriceInfo.currentPrice,
            todayPriceInfo.yearHigh,
            todayDocItem?.dcaFilled,
            todayDocItem?.dropLevels
        )
        : null;

    const tableData: ScannerTableItem[] = useMemo(() => {
        return symbols.map((sym) => {
            const priceInfo = priceDataMap[sym];
            const currentPrice = priceInfo?.currentPrice || 0;
            const yearHigh = priceInfo?.yearHigh || 0;
            const dropPercent = priceInfo?.dropPercent || 0;

            const docItem = watchlist.find((w) => w.symbol === sym);
            const signal = getDcaAnalysis(
                sym,
                currentPrice,
                yearHigh,
                docItem?.dcaFilled,
                docItem?.dropLevels
            );
            const nextTarget = getNextDcaTarget(
                sym,
                currentPrice,
                yearHigh,
                docItem?.dcaFilled,
                docItem?.dropLevels
            );

            return {
                symbol: sym,
                currentPrice,
                yearHigh,
                dropPercent,
                signal,
                nextTarget,
                docItem,
            };
        });
    }, [symbols, watchlist, priceDataMap]);

    const formatPrice = (p: number) => {
        if (!p && p !== 0) return '-';
        return new Intl.NumberFormat('vi-VN').format(p);
    };

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 m-0">
                        Quét Tín Hiệu & Mức Chiết Khấu DCA
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 mb-0">
                        Phân tích mức giảm so với giá đỉnh 2 năm qua (730 ngày) để nhận diện vùng mua mục tiêu (±2%)
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        className="bg-[#1E222D] hover:bg-[#2A2E39] text-gray-200 border border-gray-700/60 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <svg
                            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        {loading ? 'Đang quét...' : 'Làm mới'}
                    </button>
                </div>
            </div>

            {/* Daily Stock Picker Banner */}
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-[#131722] to-[#1E222D] shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl font-bold shrink-0 shadow-inner">
                            🎯
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                                    Cổ phiếu tích sản hôm nay
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                    ({new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })})
                                </span>
                            </div>

                            {todayPick.isWeekend ? (
                                <div className="text-sm font-medium text-amber-400/90 mt-1 flex items-center gap-1.5">
                                    <span>☕</span> Thị trường đóng cửa cuối tuần · Chu kỳ luân phiên tiếp tục vào Thứ Hai tuần tới
                                </div>
                            ) : todayPick.symbol ? (
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    <span className="text-lg font-mono font-black text-white bg-indigo-600/40 px-3 py-0.5 rounded-lg border border-indigo-500/50 shadow-sm flex items-center gap-1.5">
                                        ⭐ {todayPick.symbol}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        Giá: <strong className="text-gray-100">{formatPrice(todayPriceInfo?.currentPrice || 0)} ₫</strong>
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        Đỉnh 2 năm (730N): <strong className="text-gray-300">{formatPrice(todayPriceInfo?.yearHigh || 0)} ₫</strong>
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        Giảm từ đỉnh: <strong className="text-rose-400">{(todayPriceInfo?.dropPercent || 0).toFixed(2)}%</strong>
                                    </span>
                                    {todayNextTarget && !todayNextTarget.allCompleted && (
                                        <span className="text-xs text-gray-400 font-mono">
                                            Mức mua kế tiếp: <strong className="text-amber-300">{todayNextTarget.targetDropPercent}% ({todayNextTarget.tierName})</strong> ~ <strong className="text-gray-200">{formatPrice(todayNextTarget.targetPrice)} ₫</strong>
                                        </span>
                                    )}
                                    {todaySignal && (
                                        todaySignal.type === 'ACTIVE' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                DCA {todaySignal.tierIndex} · {todaySignal.weightPercent}%
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700/40">
                                                Quan sát
                                            </span>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-400 mt-1">Chưa có mã cổ phiếu trong danh mục</div>
                            )}
                        </div>
                    </div>

                    {!todayPick.isWeekend && todayPick.symbol && (
                        <div className="flex items-center gap-2 self-start md:self-center bg-gray-800/70 px-3 py-1.5 rounded-lg border border-gray-700/50 shrink-0">
                            <span className="text-xs text-gray-400">Thứ tự luân phiên:</span>
                            <span className="text-xs font-mono font-bold text-indigo-300">
                                Mã #{todayPick.index + 1} / {todayPick.total}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Clean Financial Dark Table */}
            <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#131722] shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-[#1E222D] text-xs font-medium uppercase tracking-wider text-gray-400 border-b border-gray-800">
                            <tr>
                                <th className="py-3.5 px-4 text-left font-semibold">Mã CK</th>
                                <th className="py-3.5 px-4 text-right font-semibold">Giá hiện tại</th>
                                <th className="py-3.5 px-4 text-right font-semibold">Đỉnh 2 năm (730 ngày)</th>
                                <th className="py-3.5 px-4 text-right font-semibold">% Giảm từ đỉnh</th>
                                <th className="py-3.5 px-4 text-center font-semibold">Mức % giảm sẽ mua</th>
                                <th className="py-3.5 px-4 text-center font-semibold">Trạng thái tín hiệu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60 font-medium text-gray-200">
                            {tableData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-500 font-mono text-xs">
                                        Chưa có dữ liệu cổ phiếu
                                    </td>
                                </tr>
                            ) : (
                                tableData.map((item) => {
                                    const { symbol, currentPrice, yearHigh, dropPercent, signal, nextTarget } = item;
                                    const isDcaActive = signal.type === 'ACTIVE';
                                    const isTodayPick = todayPick.symbol === symbol;

                                    return (
                                        <tr
                                            key={symbol}
                                            className={`transition-colors ${
                                                isTodayPick
                                                    ? 'bg-indigo-950/20 hover:bg-indigo-950/30'
                                                    : 'hover:bg-[#1E222D]/60'
                                            }`}
                                        >
                                            {/* Mã CK */}
                                            <td className="py-3 px-4 text-left">
                                                <span
                                                    className={`font-bold tracking-wide text-xs font-mono inline-flex items-center gap-1.5 px-2.5 py-1 rounded border ${
                                                        isTodayPick
                                                            ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm'
                                                            : 'bg-gray-800/80 text-white border-gray-700/60'
                                                    }`}
                                                >
                                                    {symbol}
                                                    {isTodayPick && (
                                                        <span className="text-[10px] bg-indigo-500 text-white font-sans px-1.5 py-0.5 rounded font-semibold leading-none">
                                                            Hôm nay
                                                        </span>
                                                    )}
                                                    {isDcaActive && !isTodayPick && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                                    )}
                                                </span>
                                            </td>

                                            {/* Giá hiện tại (Text right + Mono) */}
                                            <td className="py-3 px-4 text-right font-mono font-semibold text-gray-100 tabular-nums">
                                                {formatPrice(currentPrice)}{' '}
                                                <span className="text-xs text-gray-500 font-normal">₫</span>
                                            </td>

                                            {/* Đỉnh ({selectedYear - 1}) (Text right + Mono) */}
                                            <td className="py-3 px-4 text-right font-mono font-medium text-gray-300 tabular-nums">
                                                {formatPrice(yearHigh)}{' '}
                                                <span className="text-xs text-gray-500 font-normal">₫</span>
                                            </td>

                                            {/* % Giảm từ đỉnh (Text right + Mono) */}
                                            <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-400 font-semibold">
                                                {dropPercent > 0 ? `+${dropPercent.toFixed(2)}%` : `${dropPercent.toFixed(2)}%`}
                                            </td>

                                            {/* Mức % giảm sẽ mua */}
                                            <td className="py-3 px-4 text-center">
                                                {nextTarget.allCompleted ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                        ✓ Đã mua 4 mốc
                                                    </span>
                                                ) : (
                                                    <Tooltip
                                                        title={
                                                            <div className="text-xs p-1 space-y-1.5 font-sans">
                                                                <div className="font-bold text-gray-200 border-b border-gray-700 pb-1 flex items-center justify-between">
                                                                    <span>Lộ trình DCA ({symbol}):</span>
                                                                    <span className="text-[10px] text-gray-400 font-normal">Đỉnh: {formatPrice(yearHigh)} ₫</span>
                                                                </div>
                                                                {nextTarget.levels.map((lvl) => (
                                                                    <div
                                                                        key={lvl.tierIndex}
                                                                        className={`flex items-center justify-between gap-4 font-mono text-[11px] ${
                                                                            lvl.isCurrentTarget
                                                                                ? 'text-amber-300 font-bold bg-amber-500/10 px-1 py-0.5 rounded'
                                                                                : lvl.isFilled
                                                                                ? 'text-emerald-400 line-through opacity-60'
                                                                                : 'text-gray-300'
                                                                        }`}
                                                                    >
                                                                        <span>
                                                                            {lvl.tierName} ({lvl.targetDropPercent}%):
                                                                        </span>
                                                                        <span>
                                                                            {formatPrice(lvl.targetPrice)} ₫
                                                                            {lvl.isFilled && ' (Đã khớp)'}
                                                                            {lvl.isCurrentTarget && ' (Chuẩn bị mua)'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        }
                                                    >
                                                        <div className="inline-flex flex-col items-center justify-center cursor-help">
                                                            <div className="flex items-center gap-1.5 font-mono">
                                                                <span className="text-sm font-bold text-amber-400 tabular-nums">
                                                                    {nextTarget.targetDropPercent}%
                                                                </span>
                                                                <span className="text-[10px] font-sans font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                                    {nextTarget.tierName}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                                                                Giá: <strong className="text-gray-200 font-semibold">{formatPrice(nextTarget.targetPrice)} ₫</strong>
                                                            </div>
                                                            {nextTarget.isInZone ? (
                                                                <span className="text-[10px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1 animate-pulse">
                                                                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                                                                    Đang ở vùng mua (±2%)
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                                    {nextTarget.gapPercent < 0
                                                                        ? `Còn cách ${Math.abs(nextTarget.gapPercent).toFixed(1)}%`
                                                                        : `Đã vượt qua`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Tooltip>
                                                )}
                                            </td>

                                            {/* Trạng thái tín hiệu: Chỉ có 2 trạng thái DCA hoặc Quan sát */}
                                            <td className="py-3 px-4 text-center">
                                                {isDcaActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                        DCA {signal.tierIndex} · {signal.weightPercent}%
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800/80 text-gray-400 border border-gray-700/40">
                                                        Quan sát
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>

                    </table>
                </div>
            </div>
        </div>
    );
}
