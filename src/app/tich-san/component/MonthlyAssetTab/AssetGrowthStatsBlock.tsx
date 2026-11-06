'use client';

import React, { useMemo } from 'react';
import {
    ArrowUpOutlined,
    ArrowDownOutlined,
    RiseOutlined,
    FallOutlined,
    TrophyOutlined,
    CalendarOutlined,
    InfoCircleOutlined,
    ThunderboltOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { MonthlyAssetDoc } from '@/services/monthlyAssetService';

export interface ProcessedMonthlyAssetDoc extends MonthlyAssetDoc {
    investmentProfit: number;
    profitPercent: number;
    momAssetGrowthPercent: number;
    momAssetDiff: number;
}

interface AssetGrowthStatsBlockProps {
    records: ProcessedMonthlyAssetDoc[];
    loading?: boolean;
}

export default function AssetGrowthStatsBlock({ records, loading }: AssetGrowthStatsBlockProps) {
    const formatVND = (v: number) => {
        if (!v && v !== 0) return '0 ₫';
        const rounded = Math.round(v);
        return (rounded >= 0 ? '' : '-') + Math.abs(rounded).toLocaleString('vi-VN') + ' ₫';
    };

    const formatSignedVND = (v: number) => {
        if (!v && v !== 0) return '0 ₫';
        const rounded = Math.round(v);
        const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
        return sign + Math.abs(rounded).toLocaleString('vi-VN') + ' ₫';
    };

    const formatPercent = (v: number, decimals = 1) => {
        if (isNaN(v) || !isFinite(v)) return '0.0%';
        const sign = v > 0 ? '+' : '';
        return `${sign}${v.toFixed(decimals)}%`;
    };

    // Phân tích số liệu
    const stats = useMemo(() => {
        if (!records || records.length === 0) {
            return null;
        }

        const count = records.length;
        const latest = records[count - 1];
        const previous = count > 1 ? records[count - 2] : null;

        // 1. TĂNG TRƯỞNG SO VỚI THÁNG TRƯỚC (MoM)
        const latestMoMPercent = latest.momAssetGrowthPercent || 0;
        const latestMoMDiff = latest.momAssetDiff || 0;

        // Tính trung bình % tăng trưởng các tháng (bỏ qua tháng đầu tiên làm mốc)
        const growthRecords = records.slice(1);
        const avgMoMPercent =
            growthRecords.length > 0
                ? growthRecords.reduce((sum, r) => sum + r.momAssetGrowthPercent, 0) / growthRecords.length
                : 0;

        const bestMonth =
            growthRecords.length > 0
                ? growthRecords.reduce(
                      (best, curr) => (curr.momAssetGrowthPercent > best.momAssetGrowthPercent ? curr : best),
                      growthRecords[0]
                  )
                : null;

        // 2. GOM NHÓM THEO NĂM ĐỂ TÍNH TĂNG TRƯỞNG THEO NĂM (YoY)
        const yearGroups: Record<string, ProcessedMonthlyAssetDoc[]> = {};
        records.forEach((r) => {
            const yr = r.month.split('-')[0];
            if (!yearGroups[yr]) yearGroups[yr] = [];
            yearGroups[yr].push(r);
        });

        const years = Object.keys(yearGroups).sort();
        const currentYear = latest.month.split('-')[0];
        const currentYearRecords = yearGroups[currentYear] || [];

        // So sánh theo từng năm (YoY)
        interface YearComparison {
            year: string;
            startTotal: number;
            endTotal: number;
            startMonth: string;
            endMonth: string;
            yoyGrowthPercent: number;
            yoyDiff: number;
            hasPrevYear: boolean;
        }

        const yearComparisons: YearComparison[] = [];
        const yoyGrowthList: number[] = [];

        years.forEach((yr, idx) => {
            const yrRecords = yearGroups[yr];
            const startRec = yrRecords[0];
            const endRec = yrRecords[yrRecords.length - 1];

            if (idx > 0) {
                // Có năm liền trước: So sánh cuối năm nay với cuối năm trước
                const prevYear = years[idx - 1];
                const prevYrRecords = yearGroups[prevYear];
                const prevYrEnd = prevYrRecords[prevYrRecords.length - 1];

                const yoyDiff = endRec.total - prevYrEnd.total;
                const yoyGrowthPercent = prevYrEnd.total > 0 ? (yoyDiff / prevYrEnd.total) * 100 : 0;

                yoyGrowthList.push(yoyGrowthPercent);
                yearComparisons.push({
                    year: yr,
                    startTotal: prevYrEnd.total,
                    endTotal: endRec.total,
                    startMonth: prevYrEnd.month,
                    endMonth: endRec.month,
                    yoyGrowthPercent,
                    yoyDiff,
                    hasPrevYear: true,
                });
            } else {
                // Năm đầu tiên trong dữ liệu: Tính tăng trưởng nội tại từ tháng đầu đến tháng cuối của năm đó
                const intraDiff = endRec.total - startRec.total;
                const intraGrowth = startRec.total > 0 ? (intraDiff / startRec.total) * 100 : 0;

                yearComparisons.push({
                    year: yr,
                    startTotal: startRec.total,
                    endTotal: endRec.total,
                    startMonth: startRec.month,
                    endMonth: endRec.month,
                    yoyGrowthPercent: intraGrowth,
                    yoyDiff: intraDiff,
                    hasPrevYear: false,
                });
            }
        });

        // Trung bình năm tăng/giảm so với năm trước
        const hasMultipleYears = yoyGrowthList.length > 0;
        const avgAnnualYoYGrowth = hasMultipleYears
            ? yoyGrowthList.reduce((sum, v) => sum + v, 0) / yoyGrowthList.length
            : null;

        // Tăng trưởng của năm hiện tại từ đầu năm (hoặc mốc đầu tiên trong năm) đến nay (YTD)
        const curYearFirst = currentYearRecords[0];
        const curYearLast = currentYearRecords[currentYearRecords.length - 1];
        const curYearTotalDiff = curYearLast && curYearFirst ? curYearLast.total - curYearFirst.total : 0;
        const curYearTotalGrowthPercent =
            curYearFirst && curYearFirst.total > 0 ? (curYearTotalDiff / curYearFirst.total) * 100 : 0;

        // 3. LỢI NHUẬN TRUNG BÌNH NĂM HIỆN TẠI
        // Lấy các bản ghi trong năm hiện tại có tính lãi/lỗ (bỏ qua bản ghi đầu tiên của toàn bộ lịch sử)
        const currentYearProfitRecords = currentYearRecords.filter((r) => r !== records[0]);

        const totalProfitCurYear = currentYearProfitRecords.reduce((sum, r) => sum + r.investmentProfit, 0);
        const countProfitMonths = currentYearProfitRecords.length;

        const avgMonthlyProfitVND = countProfitMonths > 0 ? totalProfitCurYear / countProfitMonths : 0;
        const avgMonthlyProfitPercent =
            countProfitMonths > 0
                ? currentYearProfitRecords.reduce((sum, r) => sum + r.profitPercent, 0) / countProfitMonths
                : 0;

        const profitableMonths = currentYearProfitRecords.filter((r) => r.investmentProfit > 0).length;
        const profitWinRate = countProfitMonths > 0 ? (profitableMonths / countProfitMonths) * 100 : 0;

        return {
            count,
            latest,
            previous,
            latestMoMPercent,
            latestMoMDiff,
            avgMoMPercent,
            bestMonth,
            growthRecords,
            currentYear,
            currentYearRecords,
            years,
            hasMultipleYears,
            avgAnnualYoYGrowth,
            yearComparisons,
            curYearFirst,
            curYearLast,
            curYearTotalDiff,
            curYearTotalGrowthPercent,
            totalProfitCurYear,
            countProfitMonths,
            avgMonthlyProfitVND,
            avgMonthlyProfitPercent,
            profitableMonths,
            profitWinRate,
        };
    }, [records]);

    if (!stats) {
        return null;
    }

    const {
        latest,
        previous,
        latestMoMPercent,
        latestMoMDiff,
        avgMoMPercent,
        bestMonth,
        currentYear,
        currentYearRecords,
        hasMultipleYears,
        avgAnnualYoYGrowth,
        yearComparisons,
        curYearFirst,
        curYearLast,
        curYearTotalDiff,
        curYearTotalGrowthPercent,
        totalProfitCurYear,
        countProfitMonths,
        avgMonthlyProfitVND,
        avgMonthlyProfitPercent,
        profitableMonths,
        profitWinRate,
    } = stats;

    const isMoMPositive = latestMoMPercent >= 0;
    const isCurYearProfitPositive = avgMonthlyProfitVND >= 0;

    return (
        <div className="rounded-xl border border-gray-800 bg-[#131722] shadow-2xl overflow-hidden">
            {/* Header Block */}
            <div className="p-4 sm:px-6 border-b border-gray-800 bg-[#1E222D] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <ThunderboltOutlined className="text-base" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-white m-0">
                                Phân Tích Tăng Trưởng & Hiệu Suất Sinh Lời
                            </h3>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                                Analytics
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 mb-0">
                            Thống kê tốc độ tăng trưởng tài sản MoM, biến động theo năm và lợi nhuận trung bình năm {currentYear}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                    <CalendarOutlined className="text-gray-500" />
                    <span>Kỳ phân tích:</span>
                    <strong className="text-gray-200">
                        {records[0]?.month} → {latest.month}
                    </strong>
                </div>
            </div>

            {/* 3 Thẻ Chỉ Số Cốt Lõi */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. TĂNG TRƯỞNG SO VỚI THÁNG TRƯỚC (MoM) */}
                <div className="p-4 rounded-xl border border-gray-800/80 bg-gradient-to-br from-[#1E222D]/90 to-[#131722] hover:border-gray-700 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${isMoMPositive ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                                Tăng Trưởng MoM ({latest.month})
                            </span>
                            <Tooltip title={`So sánh tổng tài sản tháng ${latest.month} với tháng trước đó ${previous?.month || 'trước'}`}>
                                <InfoCircleOutlined className="text-gray-500 hover:text-gray-300 text-xs cursor-pointer" />
                            </Tooltip>
                        </div>

                        {/* Con số chính */}
                        <div className="mt-3 flex items-baseline gap-2">
                            <span
                                className={`font-mono font-bold text-2xl tracking-tight ${
                                    isMoMPositive ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                                {formatPercent(latestMoMPercent)}
                            </span>
                            <span className="text-xs font-mono font-semibold text-gray-300">
                                ({formatSignedVND(latestMoMDiff)})
                            </span>
                        </div>

                        <div className="mt-1 text-xs text-gray-400">
                            So với tháng <span className="font-mono text-gray-200">{previous?.month || 'trước'}</span> (
                            {previous ? formatVND(previous.total) : '-'} → {formatVND(latest.total)})
                        </div>
                    </div>

                    {/* Sub-metrics bên dưới */}
                    <div className="mt-4 pt-3 border-t border-gray-800/80 space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between text-gray-400">
                            <span>Tăng trưởng TB tháng:</span>
                            <span className={`font-semibold ${avgMoMPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatPercent(avgMoMPercent)} / tháng
                            </span>
                        </div>
                        {bestMonth && (
                            <div className="flex items-center justify-between text-gray-400">
                                <span>Tháng tăng tốt nhất:</span>
                                <span className="text-amber-400 font-semibold">
                                    {bestMonth.month} ({formatPercent(bestMonth.momAssetGrowthPercent)})
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. TĂNG TRƯỞNG THEO NĂM (YoY & TRUNG BÌNH NĂM) */}
                <div className="p-4 rounded-xl border border-gray-800/80 bg-gradient-to-br from-[#1E222D]/90 to-[#131722] hover:border-gray-700 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                                <RiseOutlined className="text-blue-400" />
                                {hasMultipleYears ? 'Tăng Trưởng TB Năm (YoY)' : `Tăng Trưởng Năm ${currentYear} (YTD)`}
                            </span>
                            <Tooltip
                                title={
                                    hasMultipleYears
                                        ? 'Tỷ lệ tăng trưởng bình quân hàng năm qua các năm so với năm trước'
                                        : `Tăng trưởng tài sản tích lũy từ mốc đầu tiên của năm ${currentYear} (${curYearFirst?.month}) đến nay (${curYearLast?.month})`
                                }
                            >
                                <InfoCircleOutlined className="text-gray-500 hover:text-gray-300 text-xs cursor-pointer" />
                            </Tooltip>
                        </div>

                        {/* Con số chính */}
                        <div className="mt-3 flex items-baseline gap-2">
                            {hasMultipleYears && avgAnnualYoYGrowth !== null ? (
                                <>
                                    <span
                                        className={`font-mono font-bold text-2xl tracking-tight ${
                                            avgAnnualYoYGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                        }`}
                                    >
                                        {formatPercent(avgAnnualYoYGrowth)}
                                    </span>
                                    <span className="text-xs font-mono text-gray-400">/ năm</span>
                                </>
                            ) : (
                                <>
                                    <span
                                        className={`font-mono font-bold text-2xl tracking-tight ${
                                            curYearTotalGrowthPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                        }`}
                                    >
                                        {formatPercent(curYearTotalGrowthPercent)}
                                    </span>
                                    <span className="text-xs font-mono font-semibold text-gray-300">
                                        ({formatSignedVND(curYearTotalDiff)})
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="mt-1 text-xs text-gray-400">
                            {hasMultipleYears ? (
                                <span>
                                    Trung bình qua <strong className="text-gray-200">{stats.years.length} năm</strong> ghi nhận
                                </span>
                            ) : (
                                <span>
                                    Từ <span className="font-mono text-gray-200">{curYearFirst?.month}</span> ({formatVND(curYearFirst?.total || 0)}) →{' '}
                                    <span className="font-mono text-gray-200">{curYearLast?.month}</span> ({formatVND(curYearLast?.total || 0)})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Sub-metrics bên dưới */}
                    <div className="mt-4 pt-3 border-t border-gray-800/80 space-y-1.5 text-xs font-mono">
                        {hasMultipleYears ? (
                            <div className="space-y-1">
                                {yearComparisons.slice(-2).map((yc) => (
                                    <div key={yc.year} className="flex items-center justify-between text-gray-400">
                                        <span>Năm {yc.year} vs {yc.startMonth.split('-')[0]}:</span>
                                        <span className={`font-semibold ${yc.yoyGrowthPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {formatPercent(yc.yoyGrowthPercent)} ({formatSignedVND(yc.yoyDiff)})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>Tốc độ YTD ({currentYearRecords.length} kỳ):</span>
                                    <span className="text-emerald-400 font-semibold">{formatPercent(curYearTotalGrowthPercent)}</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-500 text-[11px]">
                                    <span>Đa năm:</span>
                                    <span>Tự động so sánh khi có thêm dữ liệu năm trước</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. LỢI NHUẬN TRUNG BÌNH NĂM HIỆN TẠI */}
                <div className="p-4 rounded-xl border border-gray-800/80 bg-gradient-to-br from-[#1E222D]/90 to-[#131722] hover:border-gray-700 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
                                <TrophyOutlined className="text-amber-400" />
                                Lợi Nhuận TB Năm {currentYear}
                            </span>
                            <Tooltip title={`Lợi nhuận đầu tư thực tế (P/L) bình quân mỗi tháng trong năm ${currentYear}, đã loại trừ dòng tiền nạp/rút`}>
                                <InfoCircleOutlined className="text-gray-500 hover:text-gray-300 text-xs cursor-pointer" />
                            </Tooltip>
                        </div>

                        {/* Con số chính */}
                        <div className="mt-3 flex items-baseline gap-2">
                            <span
                                className={`font-mono font-bold text-2xl tracking-tight ${
                                    isCurYearProfitPositive ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                                {formatSignedVND(avgMonthlyProfitVND)}
                            </span>
                            <span className="text-xs font-mono text-gray-400">/ tháng</span>
                        </div>

                        <div className="mt-1 text-xs text-gray-400">
                            Tỷ suất sinh lời TB:{' '}
                            <strong className={`font-mono ${avgMonthlyProfitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatPercent(avgMonthlyProfitPercent)} / tháng
                            </strong>
                        </div>
                    </div>

                    {/* Sub-metrics bên dưới */}
                    <div className="mt-4 pt-3 border-t border-gray-800/80 space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between text-gray-400">
                            <span>Tổng lãi tích lũy {currentYear}:</span>
                            <span
                                className={`font-bold ${
                                    totalProfitCurYear >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                                {formatSignedVND(totalProfitCurYear)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-400">
                            <span>Tỷ lệ tháng sinh lời:</span>
                            <span className="text-blue-400 font-semibold">
                                {profitableMonths}/{countProfitMonths} tháng ({profitWinRate.toFixed(0)}%)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chi tiết từng kỳ & Mini Timeline Tăng Trưởng */}
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="p-3 sm:p-4 rounded-lg bg-[#0B0E14]/70 border border-gray-800/80">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                            <SwapOutlined className="text-indigo-400" />
                            Lịch sử biến động tài sản từng tháng (MoM & Lãi Đầu Tư)
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono">
                            {records.length} mốc thời gian
                        </span>
                    </div>

                    {/* Danh sách các thẻ tháng mini */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {records.map((r, idx) => {
                            const isFirst = idx === 0;
                            const isPositiveMoM = r.momAssetGrowthPercent >= 0;
                            const isPositiveProfit = r.investmentProfit >= 0;

                            return (
                                <div
                                    key={r.month}
                                    className={`p-2 rounded border transition-all text-xs font-mono ${
                                        r.month === latest.month
                                            ? 'bg-indigo-950/30 border-indigo-500/40'
                                            : 'bg-[#1E222D]/50 border-gray-800/80 hover:border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                                        <span className="font-bold text-gray-200">{r.month}</span>
                                        {r.month === latest.month && (
                                            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 rounded">
                                                Mới nhất
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-white font-bold text-xs mt-1 truncate">
                                        {formatVND(r.total)}
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[10px]">
                                        <span className="text-gray-500">MoM:</span>
                                        {isFirst ? (
                                            <span className="text-gray-500">- (gốc)</span>
                                        ) : (
                                            <span
                                                className={`font-semibold ${
                                                    isPositiveMoM ? 'text-emerald-400' : 'text-rose-400'
                                                }`}
                                            >
                                                {formatPercent(r.momAssetGrowthPercent)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-gray-500">Lãi P/L:</span>
                                        {isFirst ? (
                                            <span className="text-gray-500">-</span>
                                        ) : (
                                            <span
                                                className={`font-semibold ${
                                                    isPositiveProfit ? 'text-emerald-400' : 'text-rose-400'
                                                }`}
                                            >
                                                {formatSignedVND(r.investmentProfit)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
