"use client";

import React, { useState, useMemo } from 'react';

export default function DcaCalculatorPage() {
    const [orderType, setOrderType] = useState('BUY');
    const [contractSize, setContractSize] = useState(100);
    const [entry, setEntry] = useState<number | ''>('');
    const [sl, setSl] = useState<number | ''>('');
    const [maxOrders, setMaxOrders] = useState(10);
    const [lotSize, setLotSize] = useState(0.01);
    const [baseDistance, setBaseDistance] = useState(10);
    const [baseLoss, setBaseLoss] = useState(60);
    const [checkedOrders, setCheckedOrders] = useState<Record<number, boolean>>({});

    const actualMaxLoss = useMemo(() => {
        if (entry === '' || sl === '' || baseDistance <= 0) return 0;
        const D0 = Math.abs(entry - sl);
        return (D0 / baseDistance) * baseLoss;
    }, [entry, sl, baseDistance, baseLoss]);

    const errorMsg = useMemo(() => {
        if (entry === '' || sl === '') return null;
        if (orderType === 'BUY' && entry <= sl) return "Với lệnh BUY, Entry phải LỚN HƠN Stop Loss.";
        if (orderType === 'SELL' && entry >= sl) return "Với lệnh SELL, Entry phải NHỎ HƠN Stop Loss.";
        if (maxOrders < 1) return "Số lệnh tối đa phải lớn hơn 0.";
        if (lotSize <= 0) return "Lot size phải lớn hơn 0.";
        if (baseLoss <= 0 || baseDistance <= 0) return "Thông số tham chiếu lỗ phải lớn hơn 0.";

        const D0 = Math.abs(entry - sl);
        const maxLossAllowed = (D0 / baseDistance) * baseLoss;
        const firstOrderLoss = D0 * lotSize * contractSize;
        
        if (firstOrderLoss > maxLossAllowed) {
            return `Lệnh đầu tiên có rủi ro ($${firstOrderLoss.toFixed(2)}) vượt quá tổng rủi ro cho phép ($${maxLossAllowed.toFixed(2)}). Cần giảm khoảng cách SL hoặc tăng mức lỗ tham chiếu.`;
        }

        return null;
    }, [orderType, contractSize, entry, sl, maxOrders, lotSize, baseDistance, baseLoss]);

    const orders = useMemo(() => {
        if (errorMsg || entry === '' || sl === '') return [];

        const D0 = Math.abs(entry - sl);
        const N = maxOrders;
        const L = lotSize;
        const C = contractSize;

        const results = [];
        // Mảng 10 lệnh phân bổ nhỏ dần và kết thúc tại 93% khoảng cách đến SL
        const PERCENTAGES = [0, 0.38, 0.56, 0.68, 0.77, 0.84, 0.87, 0.90, 0.92, 0.93];

        for (let i = 0; i < N; i++) {
            // Lấy % từ mảng, nếu N > 10 thì giữ nguyên lệnh cuối ở mức 99%
            const pct = i < PERCENTAGES.length ? PERCENTAGES[i] : 0.99;
            const distFromEntry = D0 * pct;
            
            const orderPrice = orderType === 'BUY'
                ? Number(entry) - distFromEntry
                : Number(entry) + distFromEntry;

            if ((orderType === 'BUY' && orderPrice <= sl) ||
                (orderType === 'SELL' && orderPrice >= sl)) {
                break;
            }

            const currentDistanceToSL = Math.abs(orderPrice - sl);
            let loss = currentDistanceToSL * L * C;
            if (loss < 0) loss = 0;

            results.push({
                price: orderPrice,
                loss: loss,
                percent: pct * 100
            });
        }

        return results;
    }, [errorMsg, orderType, contractSize, entry, sl, maxOrders, lotSize, baseDistance, baseLoss]);

    const calculatedTotalLoss = useMemo(() => {
        return orders.reduce((sum, order) => sum + order.loss, 0);
    }, [orders]);

    return (
        <div className="min-h-screen p-6 flex justify-center bg-slate-950 text-slate-100">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Form Nhập Liệu */}
                <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 h-fit">
                    <h2 className="text-2xl font-bold mb-6 text-blue-400 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Thiết Lập Thông Số
                    </h2>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Loại Lệnh</label>
                                <select
                                    value={orderType}
                                    onChange={(e) => setOrderType(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="BUY">BUY</option>
                                    <option value="SELL">SELL</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Tài Sản (Contract Size)</label>
                                <select
                                    value={contractSize}
                                    onChange={(e) => setContractSize(Number(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                >
                                    <option value={100}>XAUUSD / Vàng (100)</option>
                                    <option value={100000}>Forex (100,000)</option>
                                    <option value={1}>Crypto (1)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Entry Lệnh Đầu Tiên</label>
                                <input
                                    type="number"
                                    value={entry}
                                    onChange={(e) => setEntry(e.target.value === '' ? '' : Number(e.target.value))}
                                    step="any"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-600"
                                    placeholder="VD: 2000.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Stop Loss (SL) Chung</label>
                                <input
                                    type="number"
                                    value={sl}
                                    onChange={(e) => setSl(e.target.value === '' ? '' : Number(e.target.value))}
                                    step="any"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-600"
                                    placeholder="VD: 1990.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Số Lệnh Tối Đa</label>
                                <input
                                    type="number"
                                    value={maxOrders}
                                    onChange={(e) => setMaxOrders(Number(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                    placeholder="10"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Lot Mỗi Lệnh</label>
                                <input
                                    type="number"
                                    value={lotSize}
                                    onChange={(e) => setLotSize(Number(e.target.value))}
                                    step="any"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                    placeholder="0.01"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Khoảng Cách SL Tham Chiếu (Giá)</label>
                                <input
                                    type="number"
                                    value={baseDistance}
                                    onChange={(e) => setBaseDistance(Number(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                    placeholder="10"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Lỗ Tại Mốc Tham Chiếu (USD)</label>
                                <input
                                    type="number"
                                    value={baseLoss}
                                    onChange={(e) => setBaseLoss(Number(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-rose-500 text-rose-400 font-bold"
                                    placeholder="60"
                                />
                            </div>
                        </div>

                    </div>

                    {errorMsg && (
                        <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-400 text-sm">
                            {errorMsg}
                        </div>
                    )}
                </div>

                {/* Kết quả tính toán */}
                <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col h-full max-h-[90vh]">
                    <h2 className="text-2xl font-bold mb-4 text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span>Kế Hoạch Điểm Vào (DCA)</span>
                        <span className="text-sm font-normal text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-700">
                            Tổng Lỗ: <span className="text-rose-400 font-bold">${calculatedTotalLoss.toFixed(2)}</span> / ${actualMaxLoss.toFixed(2)}
                        </span>
                    </h2>

                    {orders.length === 0 && !errorMsg && (
                        <div className="text-slate-500 text-center py-10 flex-1 flex items-center justify-center">
                            Vui lòng nhập đầy đủ Entry và SL hợp lệ để tính toán.
                        </div>
                    )}

                    {orders.length > 0 && (
                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                        <th className="py-3 font-medium w-12 text-center">Đã vào</th>
                                        <th className="py-3 font-medium">Lệnh</th>
                                        <th className="py-3 font-medium">Volume</th>
                                        <th className="py-3 font-medium">Entry Giá</th>
                                        <th className="py-3 font-medium text-right">Lỗ Nếu Chạm SL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order, index) => (
                                        <tr key={index} className={`border-b border-slate-800 transition-colors ${checkedOrders[index] ? 'bg-slate-800/80 opacity-50' : 'hover:bg-slate-800/50'}`}>
                                            <td className="py-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 cursor-pointer accent-blue-500 rounded bg-slate-900 border-slate-700"
                                                    checked={!!checkedOrders[index]}
                                                    onChange={(e) => setCheckedOrders(prev => ({...prev, [index]: e.target.checked}))}
                                                />
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${checkedOrders[index] ? 'bg-slate-700 text-slate-500' : 'bg-slate-800 text-slate-300'}`}>#{index + 1}</span>
                                            </td>
                                            <td className="py-3 font-mono text-blue-400">{lotSize}</td>
                                            <td className="py-3 font-mono text-emerald-400 font-bold">{order.price.toFixed(2)}</td>
                                            <td className="py-3 font-mono text-rose-400 text-right">-${order.loss.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {orders.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-400">
                            * Thuật toán sử dụng bảng phần trăm khoảng cách cố định đến SL (0%, 40%, 60%...). SL được đặt ở <span className="font-bold text-slate-200">{sl}</span>.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
