'use client';

import React, { useState, useMemo } from 'react';
import { Popconfirm, message } from 'antd';
import AddStockInput from './AddStockInput';
import DcaCheckboxGroup from './DcaCheckboxGroup';
import TpCheckboxGroup from './TpCheckboxGroup';
import StockDetailModal from './StockDetailModal';
import { StockTrackerDoc, removeStock, resetAllStocksCycle } from '@/services/stockFirebaseService';
import { StockYearInfo } from '../stockService';
import { Dropdown, MenuProps } from 'antd';

interface DashboardViewProps {
    watchlist: StockTrackerDoc[];
    priceDataMap: Record<string, StockYearInfo>;
    loading: boolean;
    userId?: string;
    selectedYear: number;
    onRefresh: () => void;
    onStockAdded: (symbol: string) => void;
    error?: string;
}

interface DashboardTableItem {
    symbol: string;
    currentPrice: number;
    yearHigh: number;
    doc: StockTrackerDoc;
}

export default function DashboardView({
    watchlist,
    priceDataMap,
    loading,
    userId,
    selectedYear,
    onRefresh,
    onStockAdded,
    error,
}: DashboardViewProps) {
    const [selectedStockForModal, setSelectedStockForModal] = useState<StockTrackerDoc | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Kết hợp dữ liệu Firestore & Giá
    const tableData: DashboardTableItem[] = useMemo(() => {
        return watchlist.map((docItem) => {
            const priceInfo = priceDataMap[docItem.symbol];
            const currentPrice = priceInfo?.currentPrice || 0;
            const yearHigh = priceInfo?.yearHigh || 0;

            return {
                symbol: docItem.symbol,
                currentPrice,
                yearHigh,
                doc: docItem,
            };
        });
    }, [watchlist, priceDataMap]);

    const formatPrice = (p: number) => {
        if (!p && p !== 0) return '-';
        return new Intl.NumberFormat('vi-VN').format(p);
    };

    const handleRemove = async (symbol: string) => {
        try {
            await removeStock(symbol, userId);
            message.success(`Đã xóa mã ${symbol} khỏi danh mục`);
        } catch (e) {
            message.error(`Không thể xóa mã ${symbol}`);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 m-0">
                        Dashboard Quản Lý Vị Thế & Khớp Lệnh
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 mb-0">
                        Quản lý danh mục theo dõi · Tích chọn giải ngân DCA (1-4) · Tích chọn chốt lời (25-100%)
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
                        {loading ? 'Đang cập nhật...' : 'Làm mới giá'}
                    </button>
                </div>
            </div>

            {/* Input thêm mã */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <AddStockInput
                    watchlist={watchlist}
                    userId={userId}
                    onAdded={onStockAdded}
                />
            </div>

            {error && (
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Refactored Clean Financial Dark Table */}
            <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#131722] shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-[#1E222D] text-xs font-medium uppercase tracking-wider text-gray-400 border-b border-gray-800">
                            <tr>
                                <th className="py-3.5 px-4 text-left font-semibold">Mã CK</th>
                                <th className="py-3.5 px-4 text-right font-semibold">Giá hiện tại</th>
                                <th className="py-3.5 px-4 text-center font-semibold">Đã giải ngân (DCA 1-4)</th>
                                <th className="py-3.5 px-4 text-center font-semibold">Đã chốt lời (25% - 100%)</th>
                                <th className="py-3.5 px-4 text-center font-semibold">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60 font-medium text-gray-200">
                            {tableData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500 font-mono text-xs">
                                        Chưa có cổ phiếu nào trong danh mục theo dõi
                                    </td>
                                </tr>
                            ) : (
                                tableData.map((item) => {
                                    const { symbol, currentPrice, doc } = item;

                                    return (
                                        <tr key={symbol} className="hover:bg-[#1E222D]/60 transition-colors">
                                            {/* Mã CK */}
                                            <td className="py-3 px-4 text-left">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedStockForModal(doc);
                                                        setModalVisible(true);
                                                    }}
                                                    className="font-bold tracking-wide text-white bg-gray-800/80 hover:bg-gray-700/80 px-2.5 py-1 rounded border border-gray-700/60 transition-colors cursor-pointer text-xs font-mono inline-flex items-center gap-1.5"
                                                >
                                                    {symbol}
                                                </button>
                                            </td>

                                            {/* Giá hiện tại (Text right + Mono) */}
                                            <td className="py-3 px-4 text-right font-mono font-semibold text-gray-100 tabular-nums">
                                                {formatPrice(currentPrice)}{' '}
                                                <span className="text-xs text-gray-500 font-normal">₫</span>
                                            </td>

                                            {/* Cụm 4 Checkbox DCA */}
                                            <td className="py-3 px-4 text-center">
                                                <DcaCheckboxGroup
                                                    symbol={symbol}
                                                    dcaFilled={doc.dcaFilled}
                                                    userId={userId}
                                                    dropLevels={doc.dropLevels}
                                                />
                                            </td>

                                            {/* Cụm 4 Micro-badges Chốt lời (25%, 33%, 50%, 100%) */}
                                            <td className="py-3 px-4 text-center">
                                                <TpCheckboxGroup
                                                    symbol={symbol}
                                                    tpFilled={doc.tpFilled}
                                                    userId={userId}
                                                />
                                            </td>

                                            {/* Thao tác (Icons gọn nhẹ: Chi tiết, Xóa) */}
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Chi tiết */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedStockForModal(doc);
                                                            setModalVisible(true);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition cursor-pointer"
                                                        title="Chi tiết vị thế, Cấu hình & Nhật ký"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>

                                                    {/* Xóa mã */}
                                                    <Popconfirm
                                                        title={`Xóa mã ${symbol} khỏi danh mục?`}
                                                        description="Dữ liệu trên Firestore sẽ bị xóa."
                                                        onConfirm={() => handleRemove(symbol)}
                                                        okText="Xóa"
                                                        cancelText="Hủy"
                                                    >
                                                        <button
                                                            type="button"
                                                            className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                                                            title="Xóa mã"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </Popconfirm>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Chi tiết */}
            <StockDetailModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                stockDoc={
                    selectedStockForModal
                        ? watchlist.find((w) => w.symbol === selectedStockForModal.symbol) || selectedStockForModal
                        : null
                }
                userId={userId}
                onRefresh={onRefresh}
            />
        </div>
    );
}
