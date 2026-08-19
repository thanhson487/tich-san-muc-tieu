'use client';

import React, { useState } from 'react';
import { Tooltip, message } from 'antd';
import { updateDcaCheckbox } from '@/services/stockFirebaseService';

interface DcaCheckboxGroupProps {
    symbol: string;
    dcaFilled: {
        dca1?: boolean;
        dca2?: boolean;
        dca3?: boolean;
        dca4?: boolean;
    };
    userId?: string;
    onUpdate?: () => void;
}

const TIERS = [
    { key: 'dca1' as const, num: 1, name: 'DCA 1 (15%)' },
    { key: 'dca2' as const, num: 2, name: 'DCA 2 (25%)' },
    { key: 'dca3' as const, num: 3, name: 'DCA 3 (35%)' },
    { key: 'dca4' as const, num: 4, name: 'DCA 4 (25%)' },
];

export default function DcaCheckboxGroup({
    symbol,
    dcaFilled,
    userId,
    onUpdate,
}: DcaCheckboxGroupProps) {
    const [loadingTier, setLoadingTier] = useState<number | null>(null);

    const handleToggle = async (
        tierKey: 'dca1' | 'dca2' | 'dca3' | 'dca4',
        tierNum: number,
        currentChecked: boolean,
        tierName: string
    ) => {
        setLoadingTier(tierNum);
        const newChecked = !currentChecked;
        try {
            await updateDcaCheckbox(symbol, tierKey, newChecked, userId);
            message.success(
                `${symbol}: Đã ${newChecked ? 'đánh dấu đã mua' : 'bỏ đánh dấu'} ${tierName}`
            );
            if (onUpdate) onUpdate();
        } catch (err) {
            message.error(`Không thể cập nhật ${tierName} cho ${symbol}`);
        } finally {
            setLoadingTier(null);
        }
    };

    return (
        <div className="flex items-center justify-center gap-1.5">
            {TIERS.map(({ key, num, name }) => {
                const isFilled = Boolean(dcaFilled?.[key]);
                const isLoading = loadingTier === num;

                return (
                    <Tooltip
                        key={num}
                        title={
                            isFilled
                                ? `Đã mua ${name}. Nhấp để bỏ đánh dấu`
                                : `Chưa mua ${name}. Nhấp để đánh dấu đã khớp lệnh`
                        }
                    >
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleToggle(key, num, isFilled, name)}
                            className={`w-6 h-6 rounded text-xs font-semibold font-mono flex items-center justify-center transition-all cursor-pointer select-none ${
                                isFilled
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm hover:bg-emerald-500/30'
                                    : 'bg-gray-800/80 text-gray-500 hover:text-gray-300 hover:border-gray-600 border border-gray-700/50'
                            } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {num}
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}
