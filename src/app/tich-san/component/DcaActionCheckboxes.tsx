'use client';

import React, { useState } from 'react';
import { Checkbox, Space, Tooltip, message } from 'antd';
import { updateDcaCheckbox } from '@/services/stockFirebaseService';

interface DcaActionCheckboxesProps {
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
    { key: 'dca1' as const, label: '1', name: 'DCA 1 (15%)', color: '#f59e0b' },
    { key: 'dca2' as const, label: '2', name: 'DCA 2 (25%)', color: '#ec4899' },
    { key: 'dca3' as const, label: '3', name: 'DCA 3 (35%)', color: '#10b981' },
    { key: 'dca4' as const, label: '4', name: 'DCA 4 (25%)', color: '#ef4444' },
];

export default function DcaActionCheckboxes({
    symbol,
    dcaFilled,
    userId,
    onUpdate,
}: DcaActionCheckboxesProps) {
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

    const handleToggle = async (
        tier: 'dca1' | 'dca2' | 'dca3' | 'dca4',
        checked: boolean,
        tierName: string
    ) => {
        setLoadingTier(tier);
        try {
            await updateDcaCheckbox(symbol, tier, checked, userId);
            message.success(
                `${symbol}: Đã ${checked ? 'đánh dấu đã mua' : 'bỏ đánh dấu'} ${tierName}`
            );
            if (onUpdate) onUpdate();
        } catch (err) {
            message.error(`Không thể cập nhật ${tierName} cho ${symbol}`);
        } finally {
            setLoadingTier(null);
        }
    };

    return (
        <Space size={6}>
            {TIERS.map(({ key, label, name, color }) => {
                const isChecked = Boolean(dcaFilled?.[key]);
                const isLoading = loadingTier === key;

                return (
                    <Tooltip
                        key={key}
                        title={
                            isChecked
                                ? `Đã mua ${name}. Nhấp để hủy đánh dấu`
                                : `Chưa mua ${name}. Nhấp để đánh dấu đã khớp lệnh`
                        }
                    >
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 6px',
                                borderRadius: 6,
                                background: isChecked ? `${color}20` : 'transparent',
                                border: `1px solid ${isChecked ? color : '#d1d5db'}`,
                                transition: 'all 0.2s',
                            }}
                        >
                            <Checkbox
                                checked={isChecked}
                                disabled={isLoading}
                                onChange={(e) =>
                                    handleToggle(key, e.target.checked, name)
                                }
                                style={{ fontSize: 12, fontWeight: 600 }}
                            >
                                <span style={{ color: isChecked ? color : '#6b7280' }}>
                                    {label}
                                </span>
                            </Checkbox>
                        </span>
                    </Tooltip>
                );
            })}
        </Space>
    );
}
