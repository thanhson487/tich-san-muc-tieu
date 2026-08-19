'use client';

import React from 'react';

interface SummaryCardsProps {
    totalCount: number;
    allocatedCount: number;
    profitTakenCount: number;
}

export default function SummaryCards({
    totalCount,
    allocatedCount,
    profitTakenCount,
}: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Card 1 */}
            <div className="p-4 rounded-xl bg-[#131722] border border-gray-800 shadow-md transition-all hover:border-gray-700">
                <div className="text-xs text-gray-400 font-medium">Tổng số mã theo dõi</div>
                <div className="mt-1 text-2xl font-bold font-mono text-white tabular-nums">
                    {String(totalCount).padStart(2, '0')}
                </div>
            </div>

            {/* Card 2 */}
            <div className="p-4 rounded-xl bg-[#131722] border border-gray-800 shadow-md transition-all hover:border-indigo-500/40">
                <div className="text-xs text-indigo-400 font-medium flex items-center gap-1.5">
                    Đã giải ngân vị thế (DCA)
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-indigo-400 tabular-nums">
                    {String(allocatedCount).padStart(2, '0')}
                </div>
            </div>

            {/* Card 3 */}
            <div className="p-4 rounded-xl bg-[#131722] border border-gray-800 shadow-md transition-all hover:border-emerald-500/40">
                <div className="text-xs text-emerald-400 font-medium">Đã chốt lời (Từng phần / Hết)</div>
                <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                    {String(profitTakenCount).padStart(2, '0')}
                </div>
            </div>
        </div>
    );
}
