'use client';

import React from 'react';

interface PeakYearFilterProps {
    selectedYear: number;
    onChange: (year: number) => void;
}

export default function PeakYearFilter({
    selectedYear,
    onChange,
}: PeakYearFilterProps) {
    const currentYear = new Date().getFullYear();

    const yearOptions = Array.from({ length: 6 }, (_, i) => {
        const y = currentYear - i;
        return {
            value: y,
            label: `Năm ${y} (Đỉnh năm ${y - 1})`,
        };
    });

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400">Năm đỉnh:</span>
                <select
                    value={selectedYear}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="bg-[#131722] border border-gray-800 text-gray-100 rounded-lg px-3 py-1.5 text-xs font-mono font-medium focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
                >
                    {yearOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#1E222D] text-gray-200">
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <span className="text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded">
                Đỉnh năm: <strong>{selectedYear - 1}</strong>
            </span>
        </div>
    );
}
