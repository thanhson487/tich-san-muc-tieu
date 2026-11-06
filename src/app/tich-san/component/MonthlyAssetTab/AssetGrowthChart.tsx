'use client';

import React, { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    CartesianGrid,
    ComposedChart,
    Bar,
    Line,
    ReferenceLine,
} from 'recharts';
import {
    RiseOutlined,
    AreaChartOutlined,
    BarChartOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    TrophyOutlined,
    AppstoreOutlined,
} from '@ant-design/icons';
import { ProcessedMonthlyAssetDoc } from './AssetGrowthStatsBlock';

interface AssetGrowthChartProps {
    records: ProcessedMonthlyAssetDoc[];
    loading?: boolean;
    mounted: boolean;
}

type ChartMode = 'total' | 'stacked' | 'pl';

const ASSET_COLORS = {
    cash: '#f59e0b',
    fund: '#3b82f6',
    stock: '#10b981',
    total: '#6366f1',
    totalCyan: '#06b6d4',
};

export default function AssetGrowthChart({ records, loading, mounted }: AssetGrowthChartProps) {
    const [chartMode, setChartMode] = useState<ChartMode>('total');

    // Lấy tối đa 12-18 tháng gần nhất
    const chartData = useMemo(() => {
        return records.slice(-18);
    }, [records]);

    // Các chỉ số tóm tắt nhanh trên header chart
    const summary = useMemo(() => {
        if (chartData.length === 0) return null;

        const first = chartData[0];
        const latest = chartData[chartData.length - 1];
        const peak = chartData.reduce((max, r) => (r.total > max.total ? r : max), chartData[0]);

        const totalDiff = latest.total - first.total;
        const totalGrowthPct = first.total > 0 ? (totalDiff / first.total) * 100 : 0;

        const minTotal = Math.min(...chartData.map((r) => r.total));
        const maxTotal = Math.max(...chartData.map((r) => r.total));
        const span = maxTotal - minTotal;
        const padding = span > 0 ? span * 0.15 : minTotal * 0.1;

        const yDomainMin = Math.max(0, Math.floor((minTotal - padding) / 10000000) * 10000000);
        const yDomainMax = Math.ceil((maxTotal + padding) / 10000000) * 10000000;

        return {
            first,
            latest,
            peak,
            totalDiff,
            totalGrowthPct,
            yDomain: [yDomainMin, yDomainMax],
        };
    }, [chartData]);

    const formatVND = (v: number) => {
        if (!v && v !== 0) return '0 ₫';
        return Math.round(v).toLocaleString('vi-VN') + ' ₫';
    };

    const formatVNDShort = (v: number) => {
        if (v >= 1000000000) {
            return `${(v / 1000000000).toFixed(1)}B`;
        }
        if (v >= 1000000) {
            return `${(v / 1000000).toFixed(0)}M`;
        }
        return `${v}`;
    };

    // Custom Glassmorphism Tooltip siêu nét và chi tiết
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;

        const item: ProcessedMonthlyAssetDoc = payload[0]?.payload;
        if (!item) return null;

        const isPositiveMoM = (item.momAssetGrowthPercent || 0) >= 0;
        const isPositiveProfit = (item.investmentProfit || 0) >= 0;

        return (
            <div className="bg-[#1A1F2C]/95 backdrop-blur-md border border-gray-700/80 rounded-xl p-3.5 shadow-2xl min-w-[240px] text-xs font-mono">
                {/* Header Tooltip */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                    <span className="font-bold text-gray-200 text-sm">Tháng {item.month}</span>
                    {item.momAssetGrowthPercent !== 0 && (
                        <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isPositiveMoM
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                        >
                            {isPositiveMoM ? '+' : ''}
                            {item.momAssetGrowthPercent?.toFixed(1)}% MoM
                        </span>
                    )}
                </div>

                {/* Tổng tài sản */}
                <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-gray-400 text-[11px]">Tổng tài sản:</span>
                    <span className="font-bold text-white text-sm tracking-tight">{formatVND(item.total)}</span>
                </div>

                {/* Phân rã 3 lớp tài sản */}
                <div className="mt-2.5 pt-2 border-t border-gray-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            Cổ phiếu (50%):
                        </span>
                        <span className="text-emerald-400 font-semibold">{formatVND(item.stock)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            CCQ (30%):
                        </span>
                        <span className="text-blue-400 font-semibold">{formatVND(item.fund)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            Tiền mặt (20%):
                        </span>
                        <span className="text-amber-400 font-semibold">{formatVND(item.cash)}</span>
                    </div>
                </div>

                {/* Lãi đầu tư & Dòng tiền nạp rút */}
                <div className="mt-2.5 pt-2 border-t border-gray-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Lãi/Lỗ đầu tư (P/L):</span>
                        <span className={`font-semibold ${isPositiveProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositiveProfit ? '+' : ''}
                            {formatVND(item.investmentProfit)}
                        </span>
                    </div>

                    {item.netFlow !== 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-400">Nạp/Rút ròng:</span>
                            <span className="text-cyan-400 font-semibold">
                                {item.netFlow > 0 ? '+' : ''}
                                {formatVND(item.netFlow || 0)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="lg:col-span-2 p-5 rounded-xl border border-gray-800 bg-gradient-to-b from-[#161B26] to-[#11141D] shadow-2xl flex flex-col justify-between" style={{ minHeight: 410 }}>
            {/* Header & Controls */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            <h3 className="text-gray-100 font-bold text-sm sm:text-base m-0 flex items-center gap-2">
                                Lộ Trình Tăng Trưởng Tài Sản
                            </h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {chartData.length} kỳ
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 mb-0">
                            Biểu đồ trực quan hóa tài sản với đường cong động và cơ cấu phân bổ
                        </p>
                    </div>

                    {/* Bộ chuyển đổi chế độ xem biểu đồ */}
                    <div className="flex items-center bg-[#0B0E14] p-1 rounded-lg border border-gray-800 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setChartMode('total')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                chartMode === 'total'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Đường tăng trưởng Tổng tài sản có hiệu ứng phát sáng"
                        >
                            <AreaChartOutlined />
                            Tổng tài sản
                        </button>

                        <button
                            type="button"
                            onClick={() => setChartMode('stacked')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                chartMode === 'stacked'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Hiển thị xếp chồng 3 lớp tài sản: Cổ phiếu, Quỹ, Tiền mặt"
                        >
                            <AppstoreOutlined />
                            3 Lớp tài sản
                        </button>

                        <button
                            type="button"
                            onClick={() => setChartMode('pl')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                chartMode === 'pl'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Biểu đồ cột lãi/lỗ và đường tài sản"
                        >
                            <BarChartOutlined />
                            Lãi/Lỗ (P/L)
                        </button>
                    </div>
                </div>

                {/* Banner Tóm tắt Nhanh Chỉ Số */}
                {summary && (
                    <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-800/50 text-xs font-mono">
                        <div className="bg-[#1E222D]/60 px-3 py-1.5 rounded-lg border border-gray-800/60">
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Hiện tại</div>
                            <div className="font-bold text-white text-sm truncate">
                                {formatVND(summary.latest.total)}
                            </div>
                        </div>

                        <div className="bg-[#1E222D]/60 px-3 py-1.5 rounded-lg border border-gray-800/60">
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Tăng trưởng kỳ</div>
                            <div
                                className={`font-bold text-sm flex items-center gap-1 truncate ${
                                    summary.totalGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                                {summary.totalGrowthPct >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                {summary.totalGrowthPct >= 0 ? '+' : ''}
                                {summary.totalGrowthPct.toFixed(1)}%
                            </div>
                        </div>

                        <div className="bg-[#1E222D]/60 px-3 py-1.5 rounded-lg border border-gray-800/60">
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <TrophyOutlined className="text-amber-400" />
                                Đỉnh cao nhất
                            </div>
                            <div className="font-bold text-amber-400 text-sm truncate">
                                {formatVND(summary.peak.total)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Vùng Vẽ Biểu Đồ Recharts */}
            <div className="w-full mt-3" style={{ height: 260 }}>
                {!mounted || chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs font-mono">
                        {loading
                            ? 'Đang tải dữ liệu biểu đồ...'
                            : 'Chưa có dữ liệu tài sản theo tháng. Hãy bấm "+ Ghi nhận số dư tháng" để bắt đầu!'}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        {chartMode === 'total' ? (
                            /* Chế độ 1: Tổng tài sản Smooth Area Glow */
                            <AreaChart data={chartData} margin={{ top: 15, right: 12, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="glowArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                                        <stop offset="60%" stopColor="#38bdf8" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#0B0E14" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="50%" stopColor="#38bdf8" />
                                        <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} opacity={0.5} />
                                <XAxis
                                    dataKey="month"
                                    stroke="#64748b"
                                    tickLine={false}
                                    axisLine={{ stroke: '#374151' }}
                                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    tickLine={false}
                                    axisLine={false}
                                    domain={summary?.yDomain || ['auto', 'auto']}
                                    tickFormatter={formatVNDShort}
                                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                {summary && (
                                    <ReferenceLine
                                        y={summary.peak.total}
                                        stroke="#f59e0b"
                                        strokeDasharray="4 4"
                                        strokeOpacity={0.5}
                                    />
                                )}
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="url(#strokeGradient)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#glowArea)"
                                    dot={{ r: 4, fill: '#1E222D', stroke: '#38bdf8', strokeWidth: 2 }}
                                    activeDot={{ r: 7, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        ) : chartMode === 'stacked' ? (
                            /* Chế độ 2: Xếp chồng 3 lớp tài sản Cổ phiếu + CCQ + Tiền mặt */
                            <AreaChart data={chartData} margin={{ top: 15, right: 12, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradStock" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={ASSET_COLORS.stock} stopOpacity={0.7} />
                                        <stop offset="95%" stopColor={ASSET_COLORS.stock} stopOpacity={0.15} />
                                    </linearGradient>
                                    <linearGradient id="gradFund" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={ASSET_COLORS.fund} stopOpacity={0.7} />
                                        <stop offset="95%" stopColor={ASSET_COLORS.fund} stopOpacity={0.15} />
                                    </linearGradient>
                                    <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={ASSET_COLORS.cash} stopOpacity={0.7} />
                                        <stop offset="95%" stopColor={ASSET_COLORS.cash} stopOpacity={0.15} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} opacity={0.5} />
                                <XAxis
                                    dataKey="month"
                                    stroke="#64748b"
                                    tickLine={false}
                                    axisLine={{ stroke: '#374151' }}
                                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={formatVNDShort}
                                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="cash"
                                    name="Tiền mặt"
                                    stackId="1"
                                    stroke={ASSET_COLORS.cash}
                                    strokeWidth={2}
                                    fill="url(#gradCash)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="fund"
                                    name="Chứng chỉ quỹ"
                                    stackId="1"
                                    stroke={ASSET_COLORS.fund}
                                    strokeWidth={2}
                                    fill="url(#gradFund)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="stock"
                                    name="Cổ phiếu"
                                    stackId="1"
                                    stroke={ASSET_COLORS.stock}
                                    strokeWidth={2}
                                    fill="url(#gradStock)"
                                />
                            </AreaChart>
                        ) : (
                            /* Chế độ 3: ComposedChart Cột Lãi/Lỗ P/L kết hợp Đường Tổng tài sản */
                            <ComposedChart data={chartData} margin={{ top: 15, right: 12, left: -10, bottom: 0 }}>
                                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} opacity={0.5} />
                                <XAxis
                                    dataKey="month"
                                    stroke="#64748b"
                                    tickLine={false}
                                    axisLine={{ stroke: '#374151' }}
                                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#64748b"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={formatVNDShort}
                                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Bar
                                    yAxisId="left"
                                    dataKey="investmentProfit"
                                    name="Lãi/Lỗ đầu tư"
                                    radius={[4, 4, 0, 0]}
                                    fill="#10b981"
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="total"
                                    name="Tổng tài sản"
                                    stroke="#818cf8"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#818cf8' }}
                                />
                            </ComposedChart>
                        )}
                    </ResponsiveContainer>
                )}
            </div>

            {/* Chú thích màu chân biểu đồ */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-[11px] font-mono text-gray-400 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Cổ phiếu (50%)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> CCQ (30%)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Tiền mặt (20%)
                    </span>
                </div>

                <div className="text-gray-500 text-[10px]">
                    * Thang đo động tự điều chỉnh theo biên độ biến động
                </div>
            </div>
        </div>
    );
}

