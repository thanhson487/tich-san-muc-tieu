'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ============================== CONFIG ============================== */

type Pt = [number, number];

interface SliderDef {
    key: string;
    label: string;
    hint: string;
    min: number;
    max: number;
    step: number;
    unit: string;
    weight: number;
    decimals: number;
    /** Đường cong điểm: (giá trị -> điểm), nội suy tuyến tính */
    curve: Pt[];
}

const SLIDERS: SliderDef[] = [
    { key: 'rate', label: '1. Lãi suất huy động 12T', hint: 'Lãi càng thấp điểm càng cao', min: 3, max: 12, step: 0.1, unit: '%', weight: 10, decimals: 1, curve: [[3, 10], [5, 10], [9, 2], [12, 0]] },
    { key: 'credit', label: '2. Tăng trưởng tín dụng', hint: '>14% điểm tối đa, siết chặt điểm thấp', min: 0, max: 20, step: 0.5, unit: '%', weight: 10, decimals: 1, curve: [[0, 0], [8, 4], [14, 10], [20, 10]] },
    { key: 'cpi', label: '3. Lạm phát CPI', hint: '<3.2% điểm tối đa, >4.5% điểm thấp', min: 0, max: 8, step: 0.1, unit: '%', weight: 10, decimals: 1, curve: [[0, 10], [3.2, 10], [4.5, 3], [8, 0]] },
    { key: 'realestate', label: '4. Trạng thái BĐS (1-10đ)', hint: 'Đóng băng/tháo gỡ pháp lý → cao; sốt ảo/vỡ nợ → thấp', min: 1, max: 10, step: 1, unit: 'đ', weight: 10, decimals: 0, curve: [[1, 1], [10, 10]] },
    { key: 'pmi', label: '5. Chỉ số PMI sản xuất', hint: '>52 điểm cao, <48 điểm thấp', min: 40, max: 65, step: 0.1, unit: '', weight: 15, decimals: 1, curve: [[40, 0], [48, 4], [52, 11], [56, 15], [65, 15]] },
    { key: 'eps', label: '6. Tăng trưởng EPS thị trường', hint: 'EPS phục hồi >12% điểm tối đa', min: -20, max: 40, step: 0.5, unit: '%', weight: 15, decimals: 1, curve: [[-20, 0], [0, 5], [12, 15], [40, 15]] },
    { key: 'pe', label: '7. Định giá P/E VN-Index', hint: '<11.5x điểm tối đa, >17x điểm thấp', min: 8, max: 22, step: 0.1, unit: 'x', weight: 20, decimals: 1, curve: [[8, 20], [11.5, 20], [17, 4], [22, 0]] },
    { key: 'ma200', label: '8. VN-Index so với MA200 tuần', hint: 'Chiết khấu sâu dưới MA200 điểm cao', min: -30, max: 40, step: 0.5, unit: '%', weight: 10, decimals: 1, curve: [[-30, 10], [-15, 10], [0, 6], [15, 2], [40, 0]] },
];

type Values = Record<string, number>;

interface Zone {
    id: 'red' | 'amber' | 'green' | 'neon';
    from: number;
    to: number;
    color: string;
    name: string;
    desc: string;
    action: string;
    alloc: { stock: number; fund: number; cash: number };
}

const ZONES: Zone[] = [
    { id: 'red', from: 0, to: 35, color: '#EF4444', name: 'Thắt chặt / Rủi ro cao', desc: 'Hưng phấn quá đà, vĩ mô bất lợi', action: 'Quan sát', alloc: { stock: 20, fund: 40, cash: 40 } },
    { id: 'amber', from: 35, to: 55, color: '#F59E0B', name: 'Cân bằng / Đi ngang', desc: 'DCA bình thường (50% CP, 30% CCQ, 20% Tiền)', action: 'DCA chuẩn', alloc: { stock: 50, fund: 30, cash: 20 } },
    { id: 'green', from: 55, to: 75, color: '#22C55E', name: 'Chiết khấu sâu', desc: 'Gom tăng tốc (60-70% CP + giải ngân 25% đạn dự phòng)', action: 'Gom tăng tốc', alloc: { stock: 65, fund: 20, cash: 15 } },
    { id: 'neon', from: 75, to: 100, color: '#00FFC8', name: 'Đáy chu kỳ / Siêu cơ hội', desc: 'Gom cực mạnh (All-in dòng tiền + 50-70% đạn dự phòng)', action: 'Gom cực mạnh', alloc: { stock: 80, fund: 12, cash: 8 } },
];

const ZONE_ADVICE: Record<Zone['id'], string> = {
    red: 'Ngừng mua mới, giữ tiền mặt & CCQ.',
    amber: 'DCA bình thường (50% CP, 30% CCQ, 20% Tiền).',
    green: 'Gom tăng tốc (60-70% CP + giải ngân 25% đạn dự phòng).',
    neon: 'Gom cực mạnh (All-in dòng tiền + 50-70% đạn dự phòng).',
};

const STOCKS = [
    { symbol: 'FPT', sector: 'Công nghệ', weight: 12 },
    { symbol: 'HPG', sector: 'Thép', weight: 10 },
    { symbol: 'TCB', sector: 'Ngân hàng', weight: 10 },
    { symbol: 'MBB', sector: 'Ngân hàng', weight: 9 },
    { symbol: 'ACB', sector: 'Ngân hàng', weight: 9 },
    { symbol: 'VPB', sector: 'Ngân hàng', weight: 8 },
    { symbol: 'KDH', sector: 'Bất động sản', weight: 8 },
    { symbol: 'IDC', sector: 'BĐS khu công nghiệp', weight: 8 },
    { symbol: 'REE', sector: 'Cơ điện lạnh / Năng lượng', weight: 8 },
    { symbol: 'DBC', sector: 'Nông nghiệp / Chăn nuôi', weight: 6 },
    { symbol: 'SSI', sector: 'Chứng khoán', weight: 7 },
    { symbol: 'HDG', sector: 'Năng lượng / BĐS', weight: 5 },
];

const PRESETS: { name: string; values: Values }[] = [
    { name: 'Đáy hoảng loạn (Gom mạnh)', values: { rate: 4.5, credit: 14, cpi: 2.8, realestate: 9, pmi: 54, eps: 18, pe: 10.5, ma200: -22 } },
    { name: 'Cân bằng tích lũy', values: { rate: 6, credit: 11, cpi: 3.6, realestate: 5, pmi: 50, eps: 8, pe: 13.5, ma200: 2 } },
    { name: 'Đỉnh hưng phấn (Phòng thủ)', values: { rate: 9.5, credit: 4, cpi: 5.5, realestate: 2, pmi: 46, eps: -8, pe: 19, ma200: 32 } },
];

const DEFAULT_VALUES: Values = PRESETS[1].values;
const LS_KEY = 'macro_cycle_gemini_key';
const LS_HISTORY = 'macro_cycle_history';
/** Danh sách model theo thứ tự ưu tiên; tự động chuyển sang model kế tiếp khi gặp giới hạn (quota) hoặc model không khả dụng */
const GEMINI_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',

];
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/* ============================== HELPERS ============================== */

function interpolate(curve: Pt[], x: number): number {
    if (x <= curve[0][0]) return curve[0][1];
    for (let i = 1; i < curve.length; i++) {
        const [x1, y1] = curve[i];
        const [x0, y0] = curve[i - 1];
        if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return curve[curve.length - 1][1];
}

function getZone(score: number): Zone {
    if (score <= 35) return ZONES[0];
    if (score <= 55) return ZONES[1];
    if (score <= 75) return ZONES[2];
    return ZONES[3];
}

function polar(cx: number, cy: number, r: number, score: number) {
    const t = Math.PI * (1 - score / 100);
    return { x: cx + r * Math.cos(t), y: cy - r * Math.sin(t) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
    const a = polar(cx, cy, r, from);
    const b = polar(cx, cy, r, to);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/** Render markdown tối giản (**bold**, ##, -) thành JSX */
function renderMarkdown(text: string) {
    return text.split('\n').map((line, i) => {
        const bold = (s: string) =>
            s.split(/\*\*(.+?)\*\*/g).map((p, j) =>
                j % 2 ? <strong key={j} className="text-white">{p}</strong> : <React.Fragment key={j}>{p}</React.Fragment>
            );
        const t = line.trim();
        if (!t) return <div key={i} className="h-2" />;
        if (/^#{1,4}\s/.test(t)) return <h4 key={i} className="text-emerald-300 font-bold mt-3 mb-1 text-sm">{bold(t.replace(/^#{1,4}\s/, ''))}</h4>;
        if (/^[-*]\s/.test(t)) return <div key={i} className="pl-4 text-gray-300 text-sm leading-relaxed">• {bold(t.replace(/^[-*]\s/, ''))}</div>;
        return <p key={i} className="text-gray-300 text-sm leading-relaxed">{bold(t)}</p>;
    });
}

/* ============================== COMPONENT ============================== */

interface HistoryItem {
    time: string;
    score: number;
    zone: string;
    values: Values;
}

export default function MacroCycleView() {
    const [values, setValues] = useState<Values>(DEFAULT_VALUES);
    /** Chỉ hiển thị điểm khi đã có dữ liệu (AI quét hoặc người dùng chọn kịch bản/giả lập) */
    const [measured, setMeasured] = useState(false);
    const [source, setSource] = useState<'ai' | 'manual'>('manual');
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [asOf, setAsOf] = useState('');
    const [aiStep, setAiStep] = useState('');
    const [usedModel, setUsedModel] = useState('');
    const modelRef = useRef(GEMINI_MODELS[0]);
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [aiText, setAiText] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        try {
            setApiKey(localStorage.getItem(LS_KEY) || '');
            setHistory(JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'));
        } catch {
            /* ignore */
        }
    }, []);

    const onKeyChange = (v: string) => {
        setApiKey(v);
        localStorage.setItem(LS_KEY, v);
    };

    const scores = useMemo(
        () => SLIDERS.map((s) => Math.max(0, Math.min(s.weight, interpolate(s.curve, values[s.key])))),
        [values]
    );
    const total = Math.round(scores.reduce((a, b) => a + b, 0));
    const zone = getZone(total);

    const badgeStyle = (z: Zone) => ({
        color: z.color,
        backgroundColor: `${z.color}1F`,
        border: `1px solid ${z.color}55`,
    });

    const buildReport = () => ({
        indicator: 'Vietnam Economic Cycle Meter',
        timestamp: new Date().toISOString(),
        totalScore: total,
        zone: zone.name,
        recommendation: ZONE_ADVICE[zone.id],
        allocation: zone.alloc,
        inputs: SLIDERS.map((s, i) => ({
            key: s.key,
            label: s.label,
            value: values[s.key],
            unit: s.unit,
            score: Number(scores[i].toFixed(2)),
            maxScore: s.weight,
        })),
        stocks: STOCKS.map((s) => ({ ...s, action: zone.action })),
        aiAnalysis: aiText || null,
    });

    const exportJson = () => {
        const blob = new Blob([JSON.stringify(buildReport(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vn-economic-cycle-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const saveHistory = () => {
        const next = [{ time: new Date().toLocaleString('vi-VN'), score: total, zone: zone.name, values }, ...history].slice(0, 30);
        setHistory(next);
        localStorage.setItem(LS_HISTORY, JSON.stringify(next));
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem(LS_HISTORY);
    };

    const SYSTEM_PROMPT =
        'Bạn là Senior Macro & Equity Strategist chuyên thị trường chứng khoán Việt Nam, tư vấn chiến lược tích sản cổ phiếu dài hạn. Trả lời bằng tiếng Việt, súc tích, có số liệu, thực tế, không hứa hẹn lợi nhuận.';

    const callGemini = async (prompt: string, useSearch: boolean): Promise<string> => {
        const body = JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
            generationConfig: { temperature: useSearch ? 0.2 : 0.6 },
        });
        // Bắt đầu từ model đang hoạt động tốt gần nhất
        const start = Math.max(0, GEMINI_MODELS.indexOf(modelRef.current));
        const order = [...GEMINI_MODELS.slice(start), ...GEMINI_MODELS.slice(0, start)];
        const errors: string[] = [];
        for (const model of order) {
            try {
                const res = await fetch(`${geminiUrl(model)}?key=${encodeURIComponent(apiKey.trim())}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg = data?.error?.message || `HTTP ${res.status}`;
                    // 400/401: lỗi request hoặc key sai -> đổi model cũng vô ích
                    if (res.status === 401 || (res.status === 400 && /api key|API_KEY/i.test(msg))) {
                        throw Object.assign(new Error(msg), { fatal: true });
                    }
                    errors.push(`${model}: ${msg}`);
                    setAiStep(`Model ${model} lỗi/hết giới hạn – đang chuyển model khác…`);
                    continue;
                }
                const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
                if (!text) {
                    errors.push(`${model}: không trả về nội dung`);
                    continue;
                }
                modelRef.current = model;
                setUsedModel(model);
                return text;
            } catch (e: any) {
                if (e?.fatal) throw e;
                errors.push(`${model}: ${e?.message || e}`);
            }
        }
        throw new Error(`Tất cả model đều lỗi. ${errors.join(' | ')}`);
    };

    const calcScores = (vals: Values) =>
        SLIDERS.map((s) => Math.max(0, Math.min(s.weight, interpolate(s.curve, vals[s.key]))));

    /** Phân tích nội bộ (dự phòng khi gọi AI lỗi) */
    const localAnalysis = (vals: Values) => {
        const sc = calcScores(vals);
        const tot = Math.round(sc.reduce((a, b) => a + b, 0));
        const z = getZone(tot);
        const rows = SLIDERS.map((s, i) => ({ s, ratio: sc[i] / s.weight }));
        const strong = rows.filter((r) => r.ratio >= 0.75).map((r) => r.s.label.replace(/^\d+\.\s/, ''));
        const weak = rows.filter((r) => r.ratio <= 0.35).map((r) => r.s.label.replace(/^\d+\.\s/, ''));
        return [
            `## Tóm tắt trạng thái (phân tích nội bộ)`,
            `Điểm chu kỳ **${tot}/100** – vùng **${z.name}**.`,
            `## Luận điểm cốt lõi`,
            `${z.desc}.`,
            `## Cơ hội`,
            strong.length ? strong.map((x) => `- ${x} đang ở vùng thuận lợi`).join('\n') : '- Chưa có chỉ báo nào nổi trội',
            `## Rủi ro cần phòng vệ`,
            weak.length ? weak.map((x) => `- ${x} đang ở vùng bất lợi`).join('\n') : '- Chưa có rủi ro nổi bật',
            `## Khuyến nghị giải ngân`,
            `- ${ZONE_ADVICE[z.id]}`,
            `- Phân bổ gợi ý: **${z.alloc.stock}% Cổ phiếu / ${z.alloc.fund}% CCQ / ${z.alloc.cash}% Tiền mặt**`,
        ].join('\n');
    };

    const analyze = async (vals: Values) => {
        const sc = calcScores(vals);
        const tot = Math.round(sc.reduce((a, b) => a + b, 0));
        const z = getZone(tot);
        const detail = SLIDERS.map((s, i) => `- ${s.label}: ${vals[s.key]}${s.unit} → ${sc[i].toFixed(1)}/${s.weight} điểm`).join('\n');
        const prompt = `Dữ liệu "Vietnam Economic Cycle Meter" hiện tại:\n${detail}\n\nTổng điểm: ${tot}/100 (vùng: ${z.name}).\nPhân bổ gợi ý: ${z.alloc.stock}% CP / ${z.alloc.fund}% CCQ / ${z.alloc.cash}% Tiền.\n\nHãy phân tích theo đúng 5 mục (dùng tiêu đề ##): 1) Tóm tắt trạng thái vĩ mô hiện tại, 2) Luận điểm cốt lõi, 3) Cơ hội, 4) Rủi ro cần phòng vệ, 5) Khuyến nghị giải ngân cụ thể cho chiến lược tích sản cổ phiếu dài hạn tại Việt Nam.`;
        try {
            setAiText(await callGemini(prompt, false));
        } catch (e: any) {
            setAiError(`Lỗi phân tích AI: ${e?.message || e}. Hiển thị phân tích nội bộ.`);
            setAiText(localAnalysis(vals));
        }
    };

    /** AI tự tìm số liệu mới nhất (Google Search) -> điền 8 chỉ báo -> chấm điểm -> phân tích */
    const runAI = async () => {
        setAiError('');
        if (!apiKey.trim()) {
            setAiError('Chưa có Gemini API Key. Hãy nhập key ở trên để AI tự tìm số liệu và chấm điểm.');
            return;
        }
        setAiLoading(true);
        setAiText('');
        setAiStep('Đang tìm số liệu vĩ mô mới nhất trên Google…');
        try {
            const today = new Date().toLocaleDateString('vi-VN');
            const fields = SLIDERS.map((s) => `"${s.key}": số (${s.label}, đơn vị ${s.unit || 'chỉ số'}, khoảng ${s.min}..${s.max}; ${s.hint})`).join(',\n  ');
            const prompt = `Hôm nay là ${today}. Hãy TÌM KIẾM số liệu MỚI NHẤT về kinh tế vĩ mô & thị trường chứng khoán Việt Nam cho 8 chỉ báo dưới đây (lãi suất huy động kỳ hạn 12 tháng bình quân các ngân hàng, tăng trưởng tín dụng YTD/so cùng kỳ, CPI so cùng kỳ, trạng thái thị trường BĐS chấm 1-10 (1: sốt ảo/vỡ nợ, 10: đóng băng chiết khấu sâu/tháo gỡ pháp lý), PMI sản xuất Việt Nam, tăng trưởng EPS thị trường, P/E VN-Index, % VN-Index so với MA200 tuần).\n\nChỉ trả về DUY NHẤT một JSON hợp lệ (không giải thích ngoài JSON) theo dạng:\n{\n  "values": {\n  ${fields}\n  },\n  "notes": { "<key>": "số liệu gốc, kỳ/ngày, nguồn" },\n  "asOf": "ngày/tháng dữ liệu"\n}`;
            const raw = await callGemini(prompt, true);
            const m = raw.match(/\{[\s\S]*\}/);
            if (!m) throw new Error('AI không trả về JSON hợp lệ.');
            const parsed = JSON.parse(m[0]);
            const next: Values = {};
            for (const s of SLIDERS) {
                const v = Number(parsed?.values?.[s.key]);
                if (!Number.isFinite(v)) throw new Error(`Thiếu số liệu cho chỉ báo "${s.label}".`);
                next[s.key] = Math.min(s.max, Math.max(s.min, v));
            }
            setValues(next);
            setMeasured(true);
            setSource('ai');
            setNotes(parsed?.notes || {});
            setAsOf(parsed?.asOf || today);
            setAiStep('Đã có số liệu – đang phân tích chiến lược…');
            await analyze(next);
        } catch (e: any) {
            setAiError(`Lỗi AI quét số liệu: ${e?.message || e}`);
        } finally {
            setAiLoading(false);
            setAiStep('');
        }
    };

    /* ---------- Gauge ---------- */
    const CX = 150, CY = 150, R = 120;
    const needle = polar(CX, CY, R - 18, measured ? total : 0);

    /* ---------- Donut ---------- */
    const DR = 70, CIRC = 2 * Math.PI * DR;
    const donut = [
        { label: 'Cổ phiếu', value: zone.alloc.stock, color: '#6366F1' },
        { label: 'CCQ', value: zone.alloc.fund, color: '#06B6D4' },
        { label: 'Tiền mặt', value: zone.alloc.cash, color: '#94A3B8' },
    ];
    let offset = 0;

    const card = 'rounded-xl border border-[#1F2937] bg-[#111827] p-5';

    return (
        <div className="space-y-5 bg-[#090D16] -m-2 p-2 rounded-xl" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
            .mc-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:#1F2937;outline:none;width:100%}
            .mc-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#e5e7eb;border:2px solid #6366F1;cursor:pointer;box-shadow:0 0 8px #6366F1aa}
            .mc-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#e5e7eb;border:2px solid #6366F1;cursor:pointer}`}</style>

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Vietnam Economic Cycle Meter</h2>
                    <p className="text-xs text-gray-500">Chấm điểm vĩ mô phục vụ chiến lược tích sản cổ phiếu dài hạn</p>
                </div>
            </div>

            {/* Gauge + Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className={card}>
                    <svg viewBox="0 0 300 185" className="w-full max-w-md mx-auto">
                        <path d={arcPath(CX, CY, R, 0, 100)} stroke="#0B1220" strokeWidth="26" fill="none" strokeLinecap="butt" />
                        {ZONES.map((z) => (
                            <path key={z.id} d={arcPath(CX, CY, R, z.from + 0.4, z.to - 0.4)} stroke={z.color} strokeWidth="20" fill="none"
                                opacity={measured && z.id === zone.id ? 1 : 0.35}
                                style={measured && z.id === zone.id ? { filter: `drop-shadow(0 0 6px ${z.color})` } : undefined} />
                        ))}
                        {[0, 35, 55, 75, 100].map((t) => {
                            const p = polar(CX, CY, R + 20, t);
                            return <text key={t} x={p.x} y={p.y + 3} fontSize="9" fill="#6B7280" textAnchor="middle" fontFamily={MONO}>{t}</text>;
                        })}
                        <line x1={CX} y1={CY} x2={needle.x} y2={needle.y} stroke="#F9FAFB" strokeWidth="3" strokeLinecap="round"
                            style={{ transition: 'all .4s ease' }} />
                        <circle cx={CX} cy={CY} r="8" fill="#F9FAFB" />
                        <circle cx={CX} cy={CY} r="3" fill="#111827" />
                        <text x={CX} y={CY - 38} textAnchor="middle" fontSize="38" fontWeight="700" fill={measured ? zone.color : '#4B5563'} fontFamily={MONO}>{measured ? total : '--'}</text>
                        <text x={CX} y={CY - 24} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily={MONO}>/ 100</text>
                    </svg>
                    <div className="text-center mt-1">
                        {measured ? (
                            <>
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={badgeStyle(zone)}>{zone.name}</span>
                                <p className="text-sm text-gray-300 mt-2">{ZONE_ADVICE[zone.id]}</p>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    {`Số liệu do AI thu thập${asOf ? ` (${asOf})` : ''}`}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500 mt-2">Chưa có dữ liệu – bấm “AI Quét &amp; Chấm Điểm Vĩ Mô” để AI tự tìm số liệu và chấm điểm.</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
                        {ZONES.map((z) => (
                            <div key={z.id} className="flex items-center gap-2 text-gray-400">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: z.color }} />
                                <span style={{ fontFamily: MONO }}>{z.from === 0 ? 0 : z.from + 1}-{z.to}</span> {z.action}
                            </div>
                        ))}
                    </div>
                </div>

                <div className={card}>
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Phân bổ tài sản khuyến nghị</h3>
                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <svg viewBox="0 0 200 200" className="w-48 h-48">
                            <circle cx="100" cy="100" r={DR} fill="none" stroke="#1F2937" strokeWidth="28" />
                            {measured && donut.map((d) => {
                                const len = (d.value / 100) * CIRC;
                                const el = (
                                    <circle key={d.label} cx="100" cy="100" r={DR} fill="none" stroke={d.color} strokeWidth="28"
                                        strokeDasharray={`${len} ${CIRC - len}`} strokeDashoffset={-offset}
                                        transform="rotate(-90 100 100)" style={{ transition: 'all .5s ease' }} />
                                );
                                offset += len;
                                return el;
                            })}
                            <text x="100" y="97" textAnchor="middle" fontSize="22" fontWeight="700" fill="#F9FAFB" fontFamily={MONO}>{measured ? `${zone.alloc.stock}%` : '--'}</text>
                            <text x="100" y="114" textAnchor="middle" fontSize="9" fill="#9CA3AF">Cổ phiếu</text>
                        </svg>
                        <div className="space-y-2">
                            {donut.map((d) => (
                                <div key={d.label} className="flex items-center gap-3 text-sm">
                                    <span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                                    <span className="text-gray-300 w-20">{d.label}</span>
                                    <span className="text-white font-bold" style={{ fontFamily: MONO }}>{measured ? `${d.value}%` : '--'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-5">
                        <button type="button" onClick={exportJson} disabled={!measured} className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#1F2937] text-gray-200 hover:bg-[#2b3648] disabled:opacity-40 transition cursor-pointer">📥 Xuất báo cáo JSON</button>
                        <button type="button" onClick={saveHistory} disabled={!measured} className="px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition cursor-pointer">💾 Lưu lịch sử đo</button>
                    </div>
                </div>
            </div>

            {/* Indicators */}
            <div className={card}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-300">8 chỉ báo vĩ mô (tổng 100 điểm)</h3>
                    <span className="text-xs text-gray-500" style={{ fontFamily: MONO }}>{measured ? `${total}/100` : '--/100'}</span>
                </div>
                <p className="text-[11px] text-gray-500 mb-4">
                    {measured
                        ? 'Số liệu do AI tự tìm kiếm và chấm điểm.'
                        : 'AI sẽ tự tìm kiếm số liệu mới nhất và điền vào 8 chỉ báo này.'}
                </p>
                {!measured && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {SLIDERS.map((s) => (
                            <div key={s.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#090D16] border border-[#1F2937] text-sm">
                                <span className="text-gray-400">{s.label}</span>
                                <span className="text-gray-600" style={{ fontFamily: MONO }}>-- /{s.weight}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    {measured && SLIDERS.map((s, i) => {
                        const pct = (scores[i] / s.weight) * 100;
                        const barColor = pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444';
                        return (
                            <div key={s.key}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm text-gray-200 font-medium">{s.label}</span>
                                    <span className="text-xs" style={{ fontFamily: MONO }}>
                                        <span className="text-white font-bold">{values[s.key].toFixed(s.decimals)}{s.unit}</span>
                                        <span className="ml-2 font-bold" style={{ color: barColor }}>{scores[i].toFixed(1)}/{s.weight}</span>
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                                    <div className="h-full" style={{ width: `${pct}%`, background: barColor, transition: 'width .3s' }} />
                                </div>
                                <div className="flex items-center justify-between mt-1.5 gap-2">
                                    <span className="text-[10px] text-gray-500">{notes[s.key] ? `AI: ${notes[s.key]}` : s.hint}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Gemini */}
            <div className={card}>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">🤖 Google Gemini – AI Quét &amp; Đánh Giá Vĩ Mô</h3>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[240px]">
                        <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => onKeyChange(e.target.value)}
                            placeholder="Gemini API Key (lưu trong localStorage)"
                            className="w-full bg-[#090D16] border border-[#1F2937] rounded-lg px-3 py-2 pr-16 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                            style={{ fontFamily: MONO }} />
                        <button type="button" onClick={() => setShowKey(!showKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white cursor-pointer">
                            {showKey ? 'Ẩn' : 'Hiện'}
                        </button>
                    </div>
                    <button type="button" onClick={runAI} disabled={aiLoading}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-[#041014] bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-90 disabled:opacity-50 transition cursor-pointer">
                        {aiLoading ? 'AI đang làm việc…' : '✨ AI Quét & Chấm Điểm Vĩ Mô'}
                    </button>
                </div>
                {usedModel && !aiLoading && <p className="mt-3 text-[11px] text-gray-500">Model đã dùng: <span style={{ fontFamily: MONO }}>{usedModel}</span> (tự động chuyển khi model hết giới hạn)</p>}
                {aiLoading && aiStep && <p className="mt-3 text-xs text-cyan-300 animate-pulse">{aiStep}</p>}
                {aiError && <p className="mt-3 text-xs text-amber-400">{aiError}</p>}
                {aiText && (
                    <div className="mt-4 p-4 rounded-lg bg-[#090D16] border border-[#1F2937]">{renderMarkdown(aiText)}</div>
                )}
            </div>

            {/* Stock table */}
            <div className={card}>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Danh mục cổ phiếu tích sản trọng tâm</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] uppercase text-gray-500 border-b border-[#1F2937]">
                                <th className="py-2 pr-3">Mã</th>
                                <th className="py-2 pr-3">Nhóm ngành</th>
                                <th className="py-2 pr-3 text-right">Tỷ trọng đề xuất</th>
                                <th className="py-2 text-right">Trạng thái hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {STOCKS.map((s) => (
                                <tr key={s.symbol} className="border-b border-[#1F2937]/60 hover:bg-[#161f33] transition">
                                    <td className="py-2 pr-3 font-bold text-white" style={{ fontFamily: MONO }}>{s.symbol}</td>
                                    <td className="py-2 pr-3 text-gray-400">{s.sector}</td>
                                    <td className="py-2 pr-3 text-right text-gray-200" style={{ fontFamily: MONO }}>{s.weight}%</td>
                                    <td className="py-2 text-right">
                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold" style={measured ? badgeStyle(zone) : { color: '#6B7280', border: '1px solid #374151' }}>{measured ? zone.action : 'Chờ dữ liệu'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* History */}
            {history.length > 0 && (
                <div className={card}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-300">Lịch sử đo ({history.length})</h3>
                        <button type="button" onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">Xóa lịch sử</button>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {history.map((h, i) => {
                            const z = getZone(h.score);
                            return (
                                <button key={i} type="button" onClick={() => { setValues(h.values); setMeasured(true); setSource('manual'); }}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#090D16] border border-[#1F2937] hover:border-indigo-500 text-left text-xs transition cursor-pointer">
                                    <span className="text-gray-500" style={{ fontFamily: MONO }}>{h.time}</span>
                                    <span className="text-gray-300 flex-1 truncate">{h.zone}</span>
                                    <span className="font-bold" style={{ color: z.color, fontFamily: MONO }}>{h.score}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
