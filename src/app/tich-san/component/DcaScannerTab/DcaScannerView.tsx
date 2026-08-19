'use client';

import React, { useMemo } from 'react';
import { StockYearInfo } from '../stockService';
import { getDcaAnalysis, DcaAnalysisResult } from '@/utils/dcaCalculation';
import { StockTrackerDoc } from '@/services/stockFirebaseService';

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

            return {
                symbol: sym,
                currentPrice,
                yearHigh,
                dropPercent,
                signal,
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
                        Phân tích mức giảm so với giá đỉnh năm{' '}
                        <strong className="text-indigo-400 font-mono font-semibold">{peakYear}</strong> (Năm {selectedYear} - 1) để nhận diện vùng mua mục tiêu (±2%)
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
                                <th className="py-3.5 px-4 text-right font-semibold">Đỉnh ({selectedYear - 1})</th>
                                <th className="py-3.5 px-4 text-right font-semibold">% Giảm từ đỉnh</th>
                                <th className="py-3.5 px-4 text-center font-semibold">Trạng thái tín hiệu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60 font-medium text-gray-200">
                            {tableData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500 font-mono text-xs">
                                        Chưa có dữ liệu cổ phiếu
                                    </td>
                                </tr>
                            ) : (
                                tableData.map((item) => {
                                    const { symbol, currentPrice, yearHigh, dropPercent, signal, docItem } = item;
                                    const isDcaActive = signal.type === 'ACTIVE';
                                    const isDcaFilled = signal.type === 'FILLED';

                                    const filledCount = docItem?.dcaFilled
                                        ? Object.values(docItem.dcaFilled).filter(Boolean).length
                                        : 0;

                                    return (
                                        <tr key={symbol} className="hover:bg-[#1E222D]/60 transition-colors">
                                            {/* Mã CK */}
                                            <td className="py-3 px-4 text-left">
                                                <span className="font-bold tracking-wide text-white bg-gray-800/80 px-2.5 py-1 rounded border border-gray-700/60 text-xs font-mono inline-flex items-center gap-1.5">
                                                    {symbol}
                                                    {isDcaActive && (
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

                                            {/* Trạng thái tín hiệu */}
                                            <td className="py-3 px-4 text-center">
                                                {isDcaActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                        {signal.status}
                                                    </span>
                                                ) : isDcaFilled ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                        {signal.status}
                                                    </span>
                                                ) : filledCount > 0 ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800/80 text-gray-300 border border-gray-700/50">
                                                        Đã gom {filledCount}/4 mức
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800/80 text-gray-500 border border-gray-700/40">
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
