'use client';

import React from 'react';

export default function TacticalProfitTakingCard() {
    const card = 'rounded-xl border border-[#1F2937] bg-[#111827] p-5 shadow-lg';

    return (
        <div className={card}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-950/70 px-2 py-0.5 rounded border border-purple-800">
                    TACTICAL PROFIT TAKING ENGINE
                </span>
                <span className="text-xs text-gray-400">Chiến lược chốt lời khoa học nhưng vẫn tích sản</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Nguyên Tắc Chốt Lời: Core Position + Tactical Profit</h3>
            <p className="text-xs text-gray-400 mb-4">
                Không chốt lời theo % lợi nhuận danh nghĩa (+20%, +50% bán). Quyết định chỉ dựa vào Định giá nội tại &amp; Tỷ trọng danh mục.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                {/* 1. Undervalued */}
                <div className="p-3 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-emerald-400">1. UNDERVALUED</span>
                        <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-300">
                            Discount &gt; 20%
                        </span>
                    </div>
                    <p className="text-gray-300 mt-2 leading-relaxed">
                        <strong>Không bán</strong> dù danh mục đã có lãi lớn. Doanh nghiệp vẫn đang dưới giá trị thực, ưu tiên giữ hoặc mua thêm.
                    </p>
                </div>

                {/* 2. Fair Value */}
                <div className="p-3 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-cyan-400">2. FAIR VALUE</span>
                        <span className="text-[10px] bg-cyan-950 px-1.5 py-0.5 rounded text-cyan-300">
                            Discount 0–20%
                        </span>
                    </div>
                    <p className="text-gray-300 mt-2 leading-relaxed">
                        <strong>Tiếp tục nắm giữ (Hold)</strong>. Doanh nghiệp kinh doanh ổn định, chia cổ tức và đồng hành cùng tăng trưởng dài hạn.
                    </p>
                </div>

                {/* 3. Overvalued */}
                <div className="p-3 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-amber-400">3. OVERVALUED</span>
                        <span className="text-[10px] bg-amber-950 px-1.5 py-0.5 rounded text-amber-300">
                            Premium 0–15%
                        </span>
                    </div>
                    <p className="text-gray-300 mt-2 leading-relaxed">
                        <strong>Ngừng mua mới</strong>. Đánh giá lại tỷ trọng danh mục nếu tỷ trọng cổ phiếu này vượt quá mức trần khuyến nghị.
                    </p>
                </div>

                {/* 4. Extremely Overvalued */}
                <div className="p-3 rounded-lg bg-[#0D131F] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-red-400">4. EXTREME PREMIUM</span>
                        <span className="text-[10px] bg-red-950 px-1.5 py-0.5 rounded text-red-300">
                            Premium &gt; 15–20%
                        </span>
                    </div>
                    <p className="text-gray-300 mt-2 leading-relaxed">
                        <strong>Chốt lời 20–30% vị thế</strong> (vẫn giữ 70–80% Core). Đưa tiền về Quỹ dự phòng (Dry Powder) hoặc mã có Discount cao hơn.
                    </p>
                </div>
            </div>
        </div>
    );
}
