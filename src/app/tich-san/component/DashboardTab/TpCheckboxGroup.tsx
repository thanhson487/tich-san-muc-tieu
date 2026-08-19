'use client';

import React, { useState } from 'react';
import { Tooltip, message } from 'antd';
import { updateTpCheckbox } from '@/services/stockFirebaseService';

interface TpCheckboxGroupProps {
    symbol: string;
    tpFilled?: {
        tp25?: boolean;
        tp33?: boolean;
        tp50?: boolean;
        tp100?: boolean;
    };
    userId?: string;
    onUpdate?: () => void;
}

const TP_TIERS = [
    { key: 'tp25' as const, label: '25%', name: 'Chốt 25%' },
    { key: 'tp33' as const, label: '33%', name: 'Chốt 33% (1/3)' },
    { key: 'tp50' as const, label: '50%', name: 'Chốt 50% (1/2)' },
    { key: 'tp100' as const, label: '100%', name: 'Chốt 100% (Hết)' },
];

export default function TpCheckboxGroup({
    symbol,
    tpFilled,
    userId,
    onUpdate,
}: TpCheckboxGroupProps) {
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

    const handleToggle = async (
        tierKey: 'tp25' | 'tp33' | 'tp50' | 'tp100',
        currentChecked: boolean,
        tierName: string
    ) => {
        setLoadingTier(tierKey);
        const newChecked = !currentChecked;
        try {
            await updateTpCheckbox(symbol, tierKey, newChecked, userId);
            message.success(
                `${symbol}: Đã ${newChecked ? 'đánh dấu đã' : 'bỏ đánh dấu'} ${tierName}`
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
            {TP_TIERS.map(({ key, label, name }) => {
                const isFilled = Boolean(tpFilled?.[key]);
                const isLoading = loadingTier === key;

                return (
                    <Tooltip
                        key={key}
                        title={
                            isFilled
                                ? `Đã ${name}. Nhấp để bỏ đánh dấu`
                                : `Chưa ${name}. Nhấp để đánh dấu đã chốt lời`
                        }
                    >
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleToggle(key, isFilled, name)}
                            className={`px-1.5 h-6 rounded text-[11px] font-semibold font-mono flex items-center justify-center transition-all cursor-pointer select-none ${
                                isFilled
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm hover:bg-emerald-500/30'
                                    : 'bg-gray-800/80 text-gray-500 hover:text-gray-300 hover:border-gray-600 border border-gray-700/50'
                            } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {label}
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}
