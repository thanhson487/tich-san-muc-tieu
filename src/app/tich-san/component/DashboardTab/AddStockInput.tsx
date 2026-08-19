'use client';

import React, { useState } from 'react';
import { message } from 'antd';
import { addNewStock, StockTrackerDoc } from '@/services/stockFirebaseService';

interface AddStockInputProps {
    watchlist: StockTrackerDoc[];
    userId?: string;
    onAdded: (symbol: string) => void;
}

export default function AddStockInput({
    watchlist,
    userId,
    onAdded,
}: AddStockInputProps) {
    const [inputVal, setInputVal] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        const sym = inputVal.trim().toUpperCase();
        if (!sym) {
            message.warning('Vui lòng nhập mã cổ phiếu');
            return;
        }

        if (watchlist.some((w) => w.symbol === sym)) {
            message.info(`Mã ${sym} đã có trong danh mục`);
            setInputVal('');
            return;
        }

        setLoading(true);
        try {
            await addNewStock(sym, userId);
            message.success(`Đã thêm mã ${sym} vào Firestore`);
            setInputVal('');
            onAdded(sym);
        } catch (err) {
            message.error(`Không thể thêm mã ${sym}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
                <input
                    type="text"
                    placeholder="Thêm mã theo dõi (VD: MWG, VCI...)"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !loading) {
                            handleAdd();
                        }
                    }}
                    className="w-full bg-[#131722] border border-gray-800 rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors uppercase font-mono font-medium"
                />
            </div>
            <button
                type="button"
                onClick={handleAdd}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {loading ? 'Đang thêm...' : 'Thêm mã'}
            </button>
        </div>
    );
}
