'use client';

import React, { useState } from 'react';
import { Tooltip, message } from 'antd';
import { updateDcaCheckbox } from '@/services/stockFirebaseService';
import { DROP_LEVELS, DEFAULT_DROP_LEVELS } from '@/utils/dcaConfig';

interface DcaCheckboxGroupProps {
    symbol: string;
    dcaFilled?: {
        dca1?: boolean;
        dca2?: boolean;
        dca3?: boolean;
        dca4?: boolean;
    };
    userId?: string;
    onUpdate?: () => void;
    dropLevels?: number[];
}

const TIER_KEYS = ['dca1', 'dca2', 'dca3', 'dca4'] as const;

export default function DcaCheckboxGroup({
    symbol,
    dcaFilled,
    userId,
    onUpdate,
    dropLevels,
}: DcaCheckboxGroupProps) {
    const [loadingTier, setLoadingTier] = useState<number | null>(null);

    const levels = dropLevels && dropLevels.length === 4
        ? dropLevels
        : (DROP_LEVELS[symbol?.toUpperCase()] || DEFAULT_DROP_LEVELS);

    const tiers = TIER_KEYS.map((key, index) => {
        const num = index + 1;
        const targetDrop = levels[index] !== undefined ? levels[index] : DEFAULT_DROP_LEVELS[index];
        const dropPercentStr = targetDrop > 0 ? `-${targetDrop}%` : `${targetDrop}%`;
        return {
            key,
            num,
            dropPercentStr,
            name: `DCA ${num} (${dropPercentStr})`,
        };
    });

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
            {tiers.map(({ key, num, name }) => {
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

