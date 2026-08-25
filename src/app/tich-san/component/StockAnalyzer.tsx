'use client';

import React, { useState, useEffect } from 'react';
import DcaScannerView from './DcaScannerTab/DcaScannerView';
import DashboardView from './DashboardTab/DashboardView';
import MonthlyAssetView from './MonthlyAssetTab/MonthlyAssetView';
import {
    StockTrackerDoc,
    subscribeWatchlist,
    initializeDefaultWatchlistIfEmpty,
} from '@/services/stockFirebaseService';
import { fetchStockAnalysisBatch, StockYearInfo } from './stockService';
import { useAuthStore } from '@/store/useAuthStore';

interface StockAnalyzerProps {
    userId?: string;
}

export default function StockAnalyzer({ userId: propUserId }: StockAnalyzerProps) {
    const { userId: authUserId } = useAuthStore();
    const effectiveUserId = propUserId || authUserId || undefined;

    const [activeTab, setActiveTab] = useState<'scanner' | 'dashboard' | 'monthly'>('scanner');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [watchlist, setWatchlist] = useState<StockTrackerDoc[]>([]);
    const [priceDataMap, setPriceDataMap] = useState<Record<string, StockYearInfo>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    // 1. Khởi tạo & Lắng nghe realtime từ Firestore
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const init = async () => {
            try {
                await initializeDefaultWatchlistIfEmpty(effectiveUserId);
                unsubscribe = subscribeWatchlist(effectiveUserId, (stocks) => {
                    setWatchlist(stocks);
                });
            } catch (err) {
                console.error('Lỗi khởi tạo Watchlist:', err);
                setError('Không thể kết nối đến Firebase Firestore');
            }
        };

        init();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [effectiveUserId]);

    // 2. Fetch dữ liệu giá chứng khoán (365 ngày qua)
    const fetchPrices = async (symbolsToFetch?: string[]) => {
        const symbols = symbolsToFetch || watchlist.map((w) => w.symbol);
        if (symbols.length === 0) return;

        setLoading(true);
        setError('');

        try {
            const results = await fetchStockAnalysisBatch(symbols);

            const map: Record<string, StockYearInfo> = {};
            results.forEach((item) => {
                map[item.symbol] = item;
            });

            setPriceDataMap((prev) => ({
                ...prev,
                ...map,
            }));
        } catch (err: any) {
            console.error('Lỗi fetch giá chứng khoán:', err);
            setError(err?.message || 'Không thể tải dữ liệu giá thị trường');
        } finally {
            setLoading(false);
        }
    };

    // Tự động load giá lần đầu khi có danh sách mã
    useEffect(() => {
        if (watchlist.length > 0) {
            const symbols = watchlist.map((w) => w.symbol);
            fetchPrices(symbols);
        }
    }, [watchlist.length]);

    const symbolsList = watchlist.map((w) => w.symbol);

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 py-6 px-3 sm:px-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Clean Financial Dark Tab Header */}
                <div className="flex items-center gap-2 border-b border-gray-800 pb-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setActiveTab('scanner')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === 'scanner'
                                ? 'bg-[#1E222D] text-white border border-gray-700 shadow-md'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[#131722]'
                        }`}
                    >
                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        1. Phân Tích DCA (DCA Scanner)
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === 'dashboard'
                                ? 'bg-[#1E222D] text-white border border-gray-700 shadow-md'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[#131722]'
                        }`}
                    >
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        2. Dashboard Quản Lý (Portfolio Tracker)
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('monthly')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === 'monthly'
                                ? 'bg-[#1E222D] text-white border border-gray-700 shadow-md'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[#131722]'
                        }`}
                    >
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                        3. Báo Cáo Tài Sản (Monthly Tracker)
                    </button>
                </div>

                {/* Tab 1: DCA Scanner */}
                {activeTab === 'scanner' && (
                    <DcaScannerView
                        symbols={symbolsList}
                        watchlist={watchlist}
                        priceDataMap={priceDataMap}
                        loading={loading}
                        onRefresh={() => fetchPrices(symbolsList)}
                        error={error}
                    />
                )}

                {/* Tab 2: Portfolio Tracker */}
                {activeTab === 'dashboard' && (
                    <DashboardView
                        watchlist={watchlist}
                        priceDataMap={priceDataMap}
                        loading={loading}
                        userId={effectiveUserId}
                        onRefresh={() => fetchPrices(symbolsList)}
                        onStockAdded={(newSym) => fetchPrices([newSym])}
                        error={error}
                    />
                )}

                {/* Tab 3: Monthly Asset Tracker */}
                {activeTab === 'monthly' && (
                    <MonthlyAssetView userId={effectiveUserId} />
                )}
            </div>
        </div>
    );
}