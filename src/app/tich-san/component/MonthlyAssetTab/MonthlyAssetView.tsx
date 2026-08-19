'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    Form,
    InputNumber,
    Input,
    DatePicker,
    Button,
    Table,
    Popconfirm,
    message,
    Select,
    Progress,
} from 'antd';
import {
    PlusOutlined,
    DeleteOutlined,
    RiseOutlined,
    PieChartOutlined,
    WalletOutlined,
    DollarOutlined,
    FundOutlined,
    StockOutlined,
    SaveOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import {
    MonthlyAssetDoc,
    subscribeMonthlyAssets,
    saveMonthlyAsset,
    deleteMonthlyAsset,
} from '@/services/monthlyAssetService';
import type { ColumnsType } from 'antd/es/table';

const ASSET_COLORS = {
    cash: '#f59e0b', // Vàng hổ phách (Tiền mặt - 20%)
    fund: '#3b82f6', // Xanh dương (Chứng chỉ quỹ - 30%)
    stock: '#10b981', // Xanh ngọc (Cổ phiếu - 50%)
};

interface MonthlyAssetViewProps {
    userId?: string;
}

interface ProcessedMonthlyAssetDoc extends MonthlyAssetDoc {
    investmentProfit: number;
    profitPercent: number;
}

export default function MonthlyAssetView({ userId }: MonthlyAssetViewProps) {
    const [form] = Form.useForm();
    const [records, setRecords] = useState<MonthlyAssetDoc[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedPieMonth, setSelectedPieMonth] = useState<string>('');

    // State preview trong modal
    const [previewCash, setPreviewCash] = useState<number>(0);
    const [previewFund, setPreviewFund] = useState<number>(0);
    const [previewStock, setPreviewStock] = useState<number>(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Lắng nghe dữ liệu realtime từ Firestore
    useEffect(() => {
        const unsubscribe = subscribeMonthlyAssets(userId, (data) => {
            setRecords(data);
            setLoading(false);

            if (data.length > 0) {
                const latest = data[data.length - 1];
                setSelectedPieMonth((prev) => prev || latest.month);
            }
        });
        return () => unsubscribe();
    }, [userId]);

    // Xử lý tính toán P/L Đầu tư thực tế cho từng tháng
    const processedRecords: ProcessedMonthlyAssetDoc[] = useMemo(() => {
        return records.map((current, index) => {
            const netFlow = current.netFlow !== undefined ? current.netFlow : 0;

            if (index === 0) {
                return {
                    ...current,
                    netFlow,
                    investmentProfit: 0,
                    profitPercent: 0,
                };
            }

            const prev = records[index - 1];
            const investmentProfit = current.total - prev.total - netFlow;
            const baseCapital = prev.total + (netFlow > 0 ? netFlow : 0);
            const profitPercent = baseCapital > 0 ? (investmentProfit / baseCapital) * 100 : 0;

            return {
                ...current,
                netFlow,
                investmentProfit,
                profitPercent,
            };
        });
    }, [records]);

    // Tháng trước mặc định (VD: 2026-07 nếu hiện tại là tháng 8)
    const defaultPrevMonth = useMemo(() => dayjs().subtract(1, 'month'), []);
    const defaultPrevMonthStr = useMemo(() => defaultPrevMonth.format('YYYY-MM'), [defaultPrevMonth]);

    // Bản ghi mới nhất đã có dữ liệu thực tế (hoặc tháng trước)
    const latestRecord = useMemo(() => {
        if (processedRecords.length > 0) {
            return processedRecords[processedRecords.length - 1];
        }
        return {
            month: defaultPrevMonthStr,
            cash: 0,
            fund: 0,
            stock: 0,
            total: 0,
            netFlow: 0,
            investmentProfit: 0,
            profitPercent: 0,
        };
    }, [processedRecords, defaultPrevMonthStr]);

    // Dữ liệu hiển thị cho Biểu đồ (1 năm gần nhất - 12 tháng)
    const chartRecords = useMemo(() => {
        return processedRecords.slice(-12);
    }, [processedRecords]);

    // Bản ghi được chọn để hiển thị Biểu đồ tròn
    const pieRecord = useMemo(() => {
        if (selectedPieMonth) {
            const found = processedRecords.find((r) => r.month === selectedPieMonth);
            if (found) return found;
        }
        return latestRecord;
    }, [processedRecords, selectedPieMonth, latestRecord]);

    // Dữ liệu cho biểu đồ tròn tính theo % thực tế của pieRecord
    const pieData = useMemo(() => {
        const total = Number(pieRecord.total) || 0;
        const cashRatioVal = total > 0 ? ((Number(pieRecord.cash || 0) / total) * 100).toFixed(1) : '0';
        const fundRatioVal = total > 0 ? ((Number(pieRecord.fund || 0) / total) * 100).toFixed(1) : '0';
        const stockRatioVal = total > 0 ? ((Number(pieRecord.stock || 0) / total) * 100).toFixed(1) : '0';

        return [
            { name: `Tiền mặt (${cashRatioVal}%)`, value: Number(pieRecord.cash || 0), color: ASSET_COLORS.cash },
            { name: `Chứng chỉ quỹ (${fundRatioVal}%)`, value: Number(pieRecord.fund || 0), color: ASSET_COLORS.fund },
            { name: `Cổ phiếu (${stockRatioVal}%)`, value: Number(pieRecord.stock || 0), color: ASSET_COLORS.stock },
        ].filter((item) => item.value > 0);
    }, [pieRecord]);

    // Tính % tỷ trọng thực tế của bản ghi mới nhất
    const cashRatio = latestRecord.total > 0 ? ((latestRecord.cash / latestRecord.total) * 100).toFixed(1) : '0';
    const fundRatio = latestRecord.total > 0 ? ((latestRecord.fund / latestRecord.total) * 100).toFixed(1) : '0';
    const stockRatio = latestRecord.total > 0 ? ((latestRecord.stock / latestRecord.total) * 100).toFixed(1) : '0';

    // Mở modal thêm/sửa tháng (Mặc định mở tháng trước)
    const handleOpenModal = (targetMonth?: string) => {
        const targetDate = targetMonth ? dayjs(targetMonth, 'YYYY-MM') : defaultPrevMonth;
        const monthStr = targetDate.format('YYYY-MM');
        const existing = records.find((r) => r.month === monthStr);

        if (existing) {
            form.setFieldsValue({
                month: targetDate,
                cash: existing.cash,
                fund: existing.fund,
                stock: existing.stock,
                netFlow: existing.netFlow !== undefined ? existing.netFlow : 0,
                note: existing.note || '',
            });
            setPreviewCash(existing.cash || 0);
            setPreviewFund(existing.fund || 0);
            setPreviewStock(existing.stock || 0);
        } else {
            const latest = records[records.length - 1];
            form.setFieldsValue({
                month: targetDate,
                cash: latest?.cash || 0,
                fund: latest?.fund || 0,
                stock: latest?.stock || 0,
                netFlow: 0,
                note: '',
            });
            setPreviewCash(latest?.cash || 0);
            setPreviewFund(latest?.fund || 0);
            setPreviewStock(latest?.stock || 0);
        }

        setModalVisible(true);
    };

    const handleModalMonthChange = (date: dayjs.Dayjs | null) => {
        if (!date) return;
        const monthStr = date.format('YYYY-MM');
        const existing = records.find((r) => r.month === monthStr);

        if (existing) {
            form.setFieldsValue({
                cash: existing.cash,
                fund: existing.fund,
                stock: existing.stock,
                netFlow: existing.netFlow !== undefined ? existing.netFlow : 0,
                note: existing.note || '',
            });
            setPreviewCash(existing.cash || 0);
            setPreviewFund(existing.fund || 0);
            setPreviewStock(existing.stock || 0);
        } else {
            const latest = records[records.length - 1];
            form.setFieldsValue({
                cash: latest?.cash || 0,
                fund: latest?.fund || 0,
                stock: latest?.stock || 0,
                netFlow: 0,
                note: '',
            });
            setPreviewCash(latest?.cash || 0);
            setPreviewFund(latest?.fund || 0);
            setPreviewStock(latest?.stock || 0);
        }
    };

    const onFinish = async (values: any) => {
        try {
            setSubmitting(true);
            const monthStr = values.month.format('YYYY-MM');
            await saveMonthlyAsset(
                {
                    month: monthStr,
                    cash: values.cash || 0,
                    fund: values.fund || 0,
                    stock: values.stock || 0,
                    netFlow: values.netFlow !== undefined ? Number(values.netFlow) : 0,
                    note: values.note || '',
                },
                userId
            );
            message.success(`Đã lưu tài sản tháng ${monthStr}`);
            setSelectedPieMonth(monthStr);
            setModalVisible(false);
        } catch (error) {
            console.error('Lỗi lưu tài sản:', error);
            message.error('Lỗi khi lưu dữ liệu lên Firebase');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (month: string) => {
        try {
            await deleteMonthlyAsset(month, userId);
            message.success(`Đã xóa dữ liệu tháng ${month}`);
        } catch (error) {
            message.error('Không thể xóa dữ liệu');
        }
    };

    const formatVND = (v: number) => {
        if (!v && v !== 0) return '-';
        return new Intl.NumberFormat('vi-VN').format(v) + ' ₫';
    };

    const previewTotal = (previewCash || 0) + (previewFund || 0) + (previewStock || 0);

    const columns: ColumnsType<ProcessedMonthlyAssetDoc> = [
        {
            title: 'Tháng',
            dataIndex: 'month',
            key: 'month',
            render: (text: string) => (
                <button
                    type="button"
                    onClick={() => handleOpenModal(text)}
                    className="font-mono font-bold text-gray-100 text-xs bg-gray-800/90 hover:bg-indigo-600/30 hover:text-indigo-300 hover:border-indigo-500/50 px-2.5 py-1 rounded border border-gray-700/60 transition-all cursor-pointer"
                    title="Nhấp để chỉnh sửa số liệu tháng này"
                >
                    {text}
                </button>
            ),
        },
        {
            title: 'Tiền mặt',
            dataIndex: 'cash',
            key: 'cash',
            align: 'right',
            render: (val: number) => (
                <span className="font-mono text-amber-400 tabular-nums font-semibold text-xs">
                    {formatVND(val)}
                </span>
            ),
        },
        {
            title: 'Chứng chỉ quỹ',
            dataIndex: 'fund',
            key: 'fund',
            align: 'right',
            render: (val: number) => (
                <span className="font-mono text-blue-400 tabular-nums font-semibold text-xs">
                    {formatVND(val)}
                </span>
            ),
        },
        {
            title: 'Cổ phiếu',
            dataIndex: 'stock',
            key: 'stock',
            align: 'right',
            render: (val: number) => (
                <span className="font-mono text-emerald-400 tabular-nums font-semibold text-xs">
                    {formatVND(val)}
                </span>
            ),
        },
        {
            title: 'Tổng tài sản',
            dataIndex: 'total',
            key: 'total',
            align: 'right',
            render: (val: number) => (
                <span className="font-mono font-bold text-white text-sm tabular-nums">
                    {formatVND(val)}
                </span>
            ),
        },
        {
            title: 'Dòng tiền Nạp/Rút',
            dataIndex: 'netFlow',
            key: 'netFlow',
            align: 'right',
            render: (val: number) => {
                const amount = val !== undefined ? val : 0;
                const isPositive = amount > 0;
                const isZero = amount === 0;

                return (
                    <span
                        className={`font-mono font-semibold text-xs tabular-nums ${
                            isZero ? 'text-gray-400' : isPositive ? 'text-emerald-400' : 'text-amber-500'
                        }`}
                    >
                        {isPositive ? `+${amount.toLocaleString('vi-VN')}` : amount.toLocaleString('vi-VN')} ₫
                    </span>
                );
            },
        },
        {
            title: 'Lãi/Lỗ Đầu tư (P/L)',
            key: 'investmentProfit',
            align: 'right',
            render: (_: any, record: ProcessedMonthlyAssetDoc, index: number) => {
                if (index === 0) {
                    return <span className="text-gray-500 font-mono text-xs">-</span>;
                }
                const profit = record.investmentProfit;
                const isPositive = profit >= 0;
                return (
                    <div>
                        <div
                            className={`font-mono font-bold text-xs tabular-nums ${
                                isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                        >
                            {isPositive ? `+${profit.toLocaleString('vi-VN')}` : profit.toLocaleString('vi-VN')} ₫
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono tabular-nums">
                            {profit >= 0 ? `+${record.profitPercent.toFixed(1)}%` : `${record.profitPercent.toFixed(1)}%`}
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Ghi chú',
            dataIndex: 'note',
            key: 'note',
            render: (text: string) => (
                <span className="text-gray-400 text-xs truncate max-w-[150px] inline-block" title={text}>
                    {text || '-'}
                </span>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_: any, record: ProcessedMonthlyAssetDoc) => (
                <Popconfirm
                    title={`Xóa dữ liệu tháng ${record.month}?`}
                    onConfirm={() => handleDelete(record.month)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                >
                    <button
                        type="button"
                        className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                        title="Xóa bản ghi"
                    >
                        <DeleteOutlined style={{ fontSize: 13 }} />
                    </button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 m-0">
                        Báo Cáo Tăng Trưởng Tài Sản & Hiệu Suất Đầu Tư
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 mb-0">
                        Cân bằng 3 lớp tài sản tích sản: Tiền mặt (20%), Chứng chỉ quỹ (30%) và Cổ phiếu (50%)
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleOpenModal()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                    >
                        <PlusOutlined />
                        Ghi nhận số dư tháng
                    </button>
                </div>
            </div>

            {/* 4 Thẻ KPI Tổng quan Tài sản */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Tổng tài sản */}
                <div className="p-4 rounded-xl border border-gray-800/80 bg-gradient-to-br from-[#1E222D] to-[#131722] shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-medium">Tổng tài sản ({latestRecord.month})</span>
                        <WalletOutlined className="text-indigo-400 text-base" />
                    </div>
                    <div className="mt-2 font-mono font-bold text-xl text-white tracking-tight">
                        {formatVND(latestRecord.total)}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-mono">
                        {latestRecord.investmentProfit >= 0 ? (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                                <ArrowUpOutlined /> +{latestRecord.profitPercent.toFixed(1)}% P/L
                            </span>
                        ) : (
                            <span className="text-rose-400 flex items-center gap-0.5">
                                <ArrowDownOutlined /> {latestRecord.profitPercent.toFixed(1)}% P/L
                            </span>
                        )}
                        <span className="text-gray-500">so với tháng trước</span>
                    </div>
                </div>

                {/* Card 2: Tiền mặt */}
                <div className="p-4 rounded-xl border border-gray-800/80 bg-[#131722] shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            Tiền mặt
                        </span>
                        <DollarOutlined className="text-amber-400/80 text-base" />
                    </div>
                    <div className="mt-2 font-mono font-bold text-lg text-amber-400 tracking-tight">
                        {formatVND(latestRecord.cash)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                        <span>Tỷ trọng thực tế: <strong className="text-amber-400 font-mono">{cashRatio}%</strong></span>
                    </div>
                    <Progress
                        percent={Number(cashRatio)}
                        showInfo={false}
                        size="small"
                        strokeColor="#f59e0b"
                        trailColor="#1f2937"
                        className="mt-1"
                    />
                </div>

                {/* Card 3: CCQ */}
                <div className="p-4 rounded-xl border border-gray-800/80 bg-[#131722] shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400/90 font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            Chứng chỉ quỹ
                        </span>
                        <FundOutlined className="text-blue-400/80 text-base" />
                    </div>
                    <div className="mt-2 font-mono font-bold text-lg text-blue-400 tracking-tight">
                        {formatVND(latestRecord.fund)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                        <span>Tỷ trọng thực tế: <strong className="text-blue-400 font-mono">{fundRatio}%</strong></span>
                    </div>
                    <Progress
                        percent={Number(fundRatio)}
                        showInfo={false}
                        size="small"
                        strokeColor="#3b82f6"
                        trailColor="#1f2937"
                        className="mt-1"
                    />
                </div>

                {/* Card 4: Cổ phiếu */}
                <div className="p-4 rounded-xl border border-gray-800/80 bg-[#131722] shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-400/90 font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            Cổ phiếu
                        </span>
                        <StockOutlined className="text-emerald-400/80 text-base" />
                    </div>
                    <div className="mt-2 font-mono font-bold text-lg text-emerald-400 tracking-tight">
                        {formatVND(latestRecord.stock)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                        <span>Tỷ trọng thực tế: <strong className="text-emerald-400 font-mono">{stockRatio}%</strong></span>
                    </div>
                    <Progress
                        percent={Number(stockRatio)}
                        showInfo={false}
                        size="small"
                        strokeColor="#10b981"
                        trailColor="#1f2937"
                        className="mt-1"
                    />
                </div>
            </div>

            {/* Khối Biểu đồ Trực quan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Biểu đồ diện tích: Tăng trưởng tài sản */}
                <div className="lg:col-span-2 p-5 rounded-xl border border-gray-800 bg-[#131722] shadow-xl flex flex-col justify-between" style={{ minHeight: 390 }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <span className="text-gray-100 font-semibold text-sm flex items-center gap-2">
                            <RiseOutlined style={{ color: '#6366f1' }} />
                            Lộ trình tăng trưởng tổng tài sản (1 năm gần nhất)
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                            {chartRecords.length} tháng ghi nhận
                        </span>
                    </div>

                    {!mounted || chartRecords.length === 0 ? (
                        <div className="h-[290px] flex items-center justify-center text-gray-500 text-xs font-mono">
                            {loading ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu tài sản theo tháng. Hãy bấm "+ Ghi nhận số dư tháng" để bắt đầu!'}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={290}>
                            <AreaChart data={chartRecords} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="month"
                                    stroke="#64748b"
                                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                                    tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                                />
                                <RechartsTooltip
                                    formatter={(value: any) => [
                                        `${Number(value).toLocaleString('vi-VN')} ₫`,
                                        'Tổng tài sản',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1E222D',
                                        borderColor: '#374151',
                                        borderRadius: 8,
                                        color: '#fff',
                                        fontFamily: 'monospace',
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#6366f1"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                    dot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                                    activeDot={{ r: 7, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Biểu đồ tròn: Cơ cấu tháng */}
                <div className="p-5 rounded-xl border border-gray-800 bg-[#131722] shadow-xl flex flex-col justify-between" style={{ minHeight: 390 }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <span className="text-gray-100 font-semibold text-sm flex items-center gap-2">
                            <PieChartOutlined style={{ color: '#10b981' }} />
                            Cơ cấu phân bổ
                        </span>

                        <div className="flex items-center gap-2">
                            {records.length > 0 && (
                                <Select
                                    size="small"
                                    value={pieRecord.month}
                                    onChange={(val) => setSelectedPieMonth(val)}
                                    options={records.map((r) => ({ value: r.month, label: r.month }))}
                                    style={{ width: 105 }}
                                />
                            )}
                        </div>
                    </div>

                    {!mounted || pieData.length === 0 ? (
                        <div className="h-[290px] flex items-center justify-center text-gray-500 text-xs font-mono">
                            {loading ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu phân bổ'}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="48%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                            if (!percent || percent < 0.02) return null;
                                            const RADIAN = Math.PI / 180;
                                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                            return (
                                                <text
                                                    x={x}
                                                    y={y}
                                                    fill="#ffffff"
                                                    textAnchor="middle"
                                                    dominantBaseline="central"
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        fontFamily: 'monospace',
                                                        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                                                    }}
                                                >
                                                    {`${(percent * 100).toFixed(0)}%`}
                                                </text>
                                            );
                                        }}
                                        labelLine={false}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value: any) => [
                                            `${Number(value).toLocaleString('vi-VN')} ₫`,
                                            '',
                                        ]}
                                        contentStyle={{
                                            backgroundColor: '#1E222D',
                                            borderColor: '#374151',
                                            borderRadius: 8,
                                            color: '#fff',
                                            fontFamily: 'monospace',
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        wrapperStyle={{ fontSize: 11 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="text-center mt-1">
                                <span className="text-xs text-gray-400 font-medium">Tổng tài sản {pieRecord.month}: </span>
                                <span className="text-xs font-mono font-bold text-white">
                                    {formatVND(pieRecord.total)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bảng dữ liệu chi tiết */}
            <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#131722] shadow-2xl">
                <div className="p-4 border-b border-gray-800 bg-[#1E222D] flex items-center justify-between">
                    <span className="text-gray-100 font-semibold text-sm flex items-center gap-2">
                        <DollarOutlined style={{ color: '#f59e0b' }} />
                        Lịch sử tài sản & Hiệu suất đầu tư theo tháng
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                        {processedRecords.length} bản ghi
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <Table
                        columns={columns}
                        dataSource={processedRecords}
                        rowKey="month"
                        pagination={false}
                        loading={loading}
                        size="middle"
                        locale={{ emptyText: 'Chưa có dữ liệu tài sản theo tháng' }}
                    />
                </div>
            </div>

            {/* Modal Nhập liệu / Chỉnh sửa Tháng Sang Trọng */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                            <PlusOutlined />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Ghi Nhận Số Dư Tài Sản Theo Tháng</div>
                            <div className="text-xs text-gray-400 font-normal">Cập nhật số dư 3 lớp tài sản định kỳ</div>
                        </div>
                    </div>
                }
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                centered
                destroyOnClose
                width={560}
                className="custom-financial-modal"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    className="mt-4"
                >
                    {/* Chọn tháng */}
                    <Form.Item
                        name="month"
                        label={<span className="text-gray-300 font-medium text-xs">Tháng ghi nhận</span>}
                        rules={[{ required: true, message: 'Chọn tháng' }]}
                    >
                        <DatePicker
                            picker="month"
                            format="YYYY-MM"
                            allowClear={false}
                            onChange={handleModalMonthChange}
                            style={{ width: '100%', height: 40 }}
                        />
                    </Form.Item>

                    {/* 3 lớp tài sản */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Form.Item
                            name="cash"
                            label={<span className="text-amber-400 font-medium text-xs">Tiền mặt</span>}
                            rules={[{ required: true, message: 'Nhập số tiền mặt' }]}
                        >
                            <InputNumber
                                placeholder="0"
                                style={{ width: '100%', fontWeight: 600 }}
                                onChange={(val) => setPreviewCash(Number(val) || 0)}
                                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={(val) => val!.replace(/\$\s?|(,*)/g, '') as any}
                                suffix="₫"
                            />
                        </Form.Item>

                        <Form.Item
                            name="fund"
                            label={<span className="text-blue-400 font-medium text-xs">Chứng chỉ quỹ (CCQ)</span>}
                            rules={[{ required: true, message: 'Nhập số tiền CCQ' }]}
                        >
                            <InputNumber
                                placeholder="0"
                                style={{ width: '100%', fontWeight: 600 }}
                                onChange={(val) => setPreviewFund(Number(val) || 0)}
                                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={(val) => val!.replace(/\$\s?|(,*)/g, '') as any}
                                suffix="₫"
                            />
                        </Form.Item>

                        <Form.Item
                            name="stock"
                            label={<span className="text-emerald-400 font-medium text-xs">Cổ phiếu</span>}
                            rules={[{ required: true, message: 'Nhập số tiền Cổ phiếu' }]}
                        >
                            <InputNumber
                                placeholder="0"
                                style={{ width: '100%', fontWeight: 600 }}
                                onChange={(val) => setPreviewStock(Number(val) || 0)}
                                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={(val) => val!.replace(/\$\s?|(,*)/g, '') as any}
                                suffix="₫"
                            />
                        </Form.Item>
                    </div>

                    {/* Preview tổng tài sản */}
                    <div className="p-3 mb-4 rounded-lg bg-gray-800/60 border border-gray-700/60 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Tổng tài sản tự tính:</span>
                        <span className="font-mono font-bold text-white text-sm">
                            {formatVND(previewTotal)}
                        </span>
                    </div>

                    {/* Dòng tiền Nạp / Rút */}
                    <Form.Item
                        name="netFlow"
                        label={<span className="text-purple-400 font-medium text-xs">Dòng tiền Nạp / Rút trong tháng</span>}
                        tooltip="Mặc định 0đ. Nhập số dương khi nạp thêm (VD: 15.000.000), số âm khi rút vốn (VD: -30.000.000)"
                        rules={[{ required: true, message: 'Nhập dòng tiền' }]}
                    >
                        <InputNumber
                            placeholder="Mặc định: 0"
                            style={{ width: '100%', fontWeight: 600 }}
                            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(val) => val!.replace(/\$\s?|(,*)/g, '') as any}
                            suffix="₫"
                        />
                    </Form.Item>

                    {/* Ghi chú */}
                    <Form.Item
                        name="note"
                        label={<span className="text-gray-400 font-medium text-xs">Ghi chú (Tùy chọn)</span>}
                    >
                        <Input placeholder="VD: Tích sản đều hàng tháng, Rút 30tr mua xe, Nạp thưởng Tết..." />
                    </Form.Item>

                    <div className="flex items-center justify-end gap-2 mt-6">
                        <Button onClick={() => setModalVisible(false)}>
                            Hủy
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={submitting}
                            style={{ background: '#6366f1', borderColor: '#6366f1' }}
                        >
                            Lưu dữ liệu tháng
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
