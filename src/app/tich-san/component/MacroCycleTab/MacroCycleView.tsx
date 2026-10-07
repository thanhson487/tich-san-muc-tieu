'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    MacroValues,
    MacroZone,
    MarketValuationState,
    StockAnalysis,
    HistoryItem,
} from './types';
import {
    MACRO_SLIDERS,
    MACRO_ZONES,
    DEFAULT_MACRO_VALUES,
    interpolate,
    getMacroZone,
    calculateMacroScores,
    calculateMarketDiscount,
    calculateStockAnalysis,
    calculateCashReserve,
} from './cycleEngine';
import { STOCK_PROFILES, BENCHMARK_MARKET_DEFAULT } from './stockDatabase';
import { fetchStockAnalysisBatch } from '../stockService';
import MarketValuationCard from './MarketValuationCard';
import TopOpportunitiesCard from './TopOpportunitiesCard';
import StockTableCard from './StockTableCard';
import CashReserveCard from './CashReserveCard';
import TacticalProfitTakingCard from './TacticalProfitTakingCard';
import StockDetailDrawer from './StockDetailDrawer';

/* ============================== CONSTANTS ============================== */

const LS_TOKEN = 'macro_cycle_9router_token';
const LS_ENDPOINT = 'macro_cycle_9router_endpoint';
const LS_MODEL = 'macro_cycle_9router_model';
const LS_HISTORY = 'macro_cycle_history';
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const DEFAULT_9ROUTER_ENDPOINT = 'http://localhost:20128/v1';
const DEFAULT_9ROUTER_MODELS = [
    'ag/gemini-3.8-flash',
    'ag/gemini-3.7-flash',
    'ag/gemini-3.6-flash',
    'ag/gemini-3.5-flash',
    'ag/gemini-3-flash',
    'ag/claude-sonnet-4-6',
    'ag/claude-opus-4-6-thinking',
    'ag/gpt-oss-120b-medium',
    'kr/claude-sonnet-4.5',
    'gpt-4o',
];

function polar(cx: number, cy: number, r: number, score: number) {
    const t = Math.PI * (1 - score / 100);
    return { x: cx + r * Math.cos(t), y: cy - r * Math.sin(t) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
    const a = polar(cx, cy, r, from);
    const b = polar(cx, cy, r, to);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

function renderMarkdown(text: string) {
    return text.split('\n').map((line, i) => {
        const bold = (s: string) =>
            s.split(/\*\*(.+?)\*\*/g).map((p, j) =>
                j % 2 ? (
                    <strong key={j} className="text-white font-semibold">
                        {p}
                    </strong>
                ) : (
                    <React.Fragment key={j}>{p}</React.Fragment>
                )
            );
        const t = line.trim();
        if (!t) return <div key={i} className="h-2" />;
        if (/^#{1,4}\s/.test(t))
            return (
                <h4 key={i} className="text-cyan-300 font-bold mt-4 mb-1.5 text-sm">
                    {bold(t.replace(/^#{1,4}\s/, ''))}
                </h4>
            );
        if (/^[-*]\s/.test(t))
            return (
                <div key={i} className="pl-4 text-gray-300 text-xs leading-relaxed my-0.5">
                    • {bold(t.replace(/^[-*]\s/, ''))}
                </div>
            );
        return (
            <p key={i} className="text-gray-300 text-xs leading-relaxed my-1">
                {bold(t)}
            </p>
        );
    });
}

function extractJsonFromText(raw: string) {
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenceMatch ? fenceMatch[1] : raw;
    const jsonMatch = candidate.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI không trả về JSON hợp lệ.');
    return JSON.parse(jsonMatch[0]);
}

/**
 * Chấm điểm ưu tiên model trong 9Router:
 * Tự động ưu tiên các model mới nhất, mạnh nhất (3.8 > 3.7 > 4.6 > 3.6 > ...)
 */
function scoreModelPriority(modelId: string): number {
    const id = modelId.toLowerCase();
    if (id.includes('3.8')) return 1000;
    if (id.includes('3.7')) return 900;
    if (id.includes('sonnet-4-6') || id.includes('opus-4-6') || id.includes('4-6')) return 850;
    if (id.includes('3.6')) return 800;
    if (id.includes('sonnet-4.5') || id.includes('4.5')) return 750;
    if (id.includes('gpt-oss-120b') || id.includes('gpt-4o')) return 700;
    if (id.includes('3.5')) return 600;
    if (id.includes('3-flash')) return 500;
    if (id.includes('gemini')) return 400;
    if (id.includes('claude')) return 350;
    if (id.includes('gpt')) return 300;
    return 100;
}

export interface ExecutionLog {
    id: string;
    timestamp: string;
    level: 'info' | 'success' | 'warn' | 'error' | 'switch';
    message: string;
    detail?: string;
}

export default function MacroCycleView() {
    /* ---------- TẦNG 1: Macro State ---------- */
    const [macroValues, setMacroValues] = useState<MacroValues>(DEFAULT_MACRO_VALUES);
    /** Chưa chạy engine -> Không hiển thị số đo mặc định */
    const [measured, setMeasured] = useState(false);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [asOf, setAsOf] = useState(new Date().toLocaleDateString('vi-VN'));

    /* ---------- TẦNG 2: Market State ---------- */
    const [marketInput, setMarketInput] = useState(BENCHMARK_MARKET_DEFAULT);

    /* ---------- Live Price Data (API) ---------- */
    const [livePrices, setLivePrices] = useState<Record<string, { currentPrice: number; yearHigh: number }>>({});
    const [priceLoading, setPriceLoading] = useState(false);

    /* ---------- Selected Stock for Drawer ---------- */
    const [selectedStock, setSelectedStock] = useState<StockAnalysis | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    /* ---------- 9Router Configuration State ---------- */
    const [routerToken, setRouterToken] = useState('');
    const [routerEndpoint, setRouterEndpoint] = useState(DEFAULT_9ROUTER_ENDPOINT);
    const [showToken, setShowToken] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    /* ---------- AI Execution State ---------- */
    const [aiLoading, setAiLoading] = useState(false);
    const [aiStep, setAiStep] = useState('');
    const [aiText, setAiText] = useState('');
    const [aiError, setAiError] = useState('');
    const [usedModel, setUsedModel] = useState('');

    /* ---------- History State ---------- */
    const [history, setHistory] = useState<HistoryItem[]>([]);

    /* ---------- Live Execution & Router Logs ---------- */
    const [logs, setLogs] = useState<ExecutionLog[]>([]);
    const [showLogs, setShowLogs] = useState(true);
    const [autoScrollLogs, setAutoScrollLogs] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const addLog = useCallback(
        (level: ExecutionLog['level'], message: string, detail?: string) => {
            const time = new Date().toLocaleTimeString('vi-VN', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
            const newLog: ExecutionLog = {
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                timestamp: time,
                level,
                message,
                detail,
            };
            setLogs((prev) => [...prev.slice(-150), newLog]);
        },
        []
    );

    useEffect(() => {
        if (autoScrollLogs && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScrollLogs]);

    const copyAllLogs = () => {
        const text = logs
            .map(
                (l) =>
                    `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}${
                        l.detail ? ` (${l.detail})` : ''
                    }`
            )
            .join('\n');
        navigator.clipboard.writeText(text);
        addLog('info', 'Đã sao chép toàn bộ nhật ký vào clipboard!');
    };

    const clearAllLogs = () => {
        setLogs([]);
    };

    // Init from LocalStorage
    useEffect(() => {
        try {
            const savedToken =
                localStorage.getItem(LS_TOKEN) ||
                localStorage.getItem('macro_cycle_gemini_key') ||
                '';
            const savedEndpoint = localStorage.getItem(LS_ENDPOINT) || DEFAULT_9ROUTER_ENDPOINT;
            const savedHistory = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');

            setRouterToken(savedToken);
            setRouterEndpoint(savedEndpoint);
            setHistory(savedHistory);

            addLog('info', '🚀 Khởi tạo hệ thống Investment Cycle Engine 3.0');
            addLog('info', `Cổng 9Router mặc định: ${savedEndpoint}`);

            if (savedToken) {
                const preview = savedToken.length > 8 ? `${savedToken.slice(0, 4)}...${savedToken.slice(-4)}` : '****';
                addLog('info', `Đã nhận Token 9Router: ${preview}`);
            } else {
                addLog('warn', 'Chưa có Token 9Router. Vui lòng lấy token tại http://localhost:20128/dashboard nếu muốn chạy AI.');
            }

            // Quét tự động danh sách model từ 9Router và sắp xếp ưu tiên model mới
            const cleanEp = savedEndpoint.replace(/\/+$/, '');
            addLog('info', `Đang kết nối tới ${cleanEp}/models để quét danh sách model khả dụng...`);
            fetch(`${cleanEp}/models`, {
                headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
            })
                .then((r) => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                })
                .then((data) => {
                    if (Array.isArray(data?.data)) {
                        const ids = data.data.map((m: any) => m.id).filter(Boolean);
                        if (ids.length > 0) {
                            const sorted = ids.sort((a: string, b: string) => scoreModelPriority(b) - scoreModelPriority(a));
                            setDiscoveredModels(sorted);
                            addLog('success', `Đã kết nối 9Router OK! Phát hiện ${sorted.length} models.`, `Model ưu tiên cao nhất: ${sorted[0]}`);
                        } else {
                            addLog('warn', '9Router kết nối thành công nhưng danh sách models trả về rỗng.');
                        }
                    }
                })
                .catch((err) => {
                    addLog('warn', `Chưa thể kết nối tới 9Router tại ${cleanEp}. Đảm bảo lệnh 'npm run 9router' đang chạy.`, err.message);
                });
        } catch {
            /* ignore */
        }
    }, [addLog]);

    // Fetch Live Prices on Mount
    useEffect(() => {
        const fetchLive = async () => {
            setPriceLoading(true);
            addLog('info', 'Đang cập nhật giá thị trường trực tiếp cho 12 cổ phiếu mục tiêu...');
            try {
                const symbols = STOCK_PROFILES.map((s) => s.symbol);
                const data = await fetchStockAnalysisBatch(symbols);
                if (data && data.length > 0) {
                    const map: Record<string, { currentPrice: number; yearHigh: number }> = {};
                    data.forEach((item) => {
                        if (item.currentPrice > 0) {
                            map[item.symbol] = {
                                currentPrice: item.currentPrice,
                                yearHigh: item.yearHigh,
                            };
                        }
                    });
                    setLivePrices(map);
                    addLog('success', `Đã nạp giá thị trường thành công cho ${Object.keys(map).length} cổ phiếu.`);
                }
            } catch (err: any) {
                addLog('warn', 'Không thể lấy giá trực tiếp từ API chứng khoán, sử dụng giá Benchmark chuẩn.', err?.message);
            } finally {
                setPriceLoading(false);
            }
        };

        fetchLive();
    }, [addLog]);

    const onTokenChange = (v: string) => {
        setRouterToken(v);
        localStorage.setItem(LS_TOKEN, v);
        if (v.trim()) {
            addLog('info', `Đã lưu 9Router Token mới: ${v.slice(0, 4)}...${v.slice(-4)}`);
        } else {
            addLog('warn', 'Đã xóa 9Router Token.');
        }
    };

    const onEndpointChange = (v: string) => {
        setRouterEndpoint(v);
        localStorage.setItem(LS_ENDPOINT, v);
        addLog('info', `Đã cập nhật 9Router Endpoint: ${v}`);
    };

    const test9RouterConnection = async () => {
        setTestStatus('testing');
        setTestMessage('Đang kết nối tới 9Router…');
        addLog('info', `Bắt đầu kiểm tra kết nối tới 9Router (${routerEndpoint})...`);
        try {
            const cleanEp = (routerEndpoint.trim() || DEFAULT_9ROUTER_ENDPOINT).replace(/\/+$/, '');
            const res = await fetch(`${cleanEp}/models`, {
                headers: routerToken.trim() ? { Authorization: `Bearer ${routerToken.trim()}` } : {},
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = data?.error?.message || `HTTP ${res.status}`;
                addLog('error', `Kiểm tra 9Router thất bại: ${msg}`);
                throw new Error(msg);
            }
            if (Array.isArray(data?.data)) {
                const ids = data.data.map((m: any) => m.id).filter(Boolean);
                if (ids.length > 0) {
                    const sorted = ids.sort((a: string, b: string) => scoreModelPriority(b) - scoreModelPriority(a));
                    setDiscoveredModels(sorted);
                    addLog('success', `Kết nối 9Router thành công! Nhận diện ${sorted.length} models.`, `Model ưu tiên số 1: ${sorted[0]}`);
                }
            }
            setTestStatus('success');
            setTestMessage(`Kết nối 9Router thành công! Đã phát hiện ${data?.data?.length || 0} models.`);
        } catch (err: any) {
            setTestStatus('error');
            setTestMessage(`Không thể kết nối 9Router: ${err?.message || err}`);
            addLog('error', `Lỗi kết nối 9Router: ${err?.message || err}`);
        }
    };

    /* ---------- 1. Tính toán TẦNG 1: Economic Cycle ---------- */
    const { scores: macroScores, totalScore: economicScore, zone: macroZone } = useMemo(() => {
        return calculateMacroScores(macroValues);
    }, [macroValues]);

    /* ---------- 2. Tính toán TẦNG 2: Market Valuation ---------- */
    const marketValuation = useMemo(() => {
        return calculateMarketDiscount(marketInput);
    }, [marketInput]);

    /* ---------- 3. Tính toán TẦNG 3: Stock Valuation & Discount ---------- */
    const analyzedStocks: StockAnalysis[] = useMemo(() => {
        return STOCK_PROFILES.map((profile) => {
            const live = livePrices[profile.symbol];
            const currentPrice = live?.currentPrice && live.currentPrice > 0 ? live.currentPrice : profile.defaultPrice;
            const peak52w = live?.yearHigh && live.yearHigh > 0 ? live.yearHigh : profile.defaultPeak52w;

            return calculateStockAnalysis(
                profile,
                currentPrice,
                peak52w,
                economicScore,
                marketValuation.marketDiscountScore,
                marketValuation.drawdown
            );
        });
    }, [livePrices, economicScore, marketValuation]);

    /* ---------- 4. Tính toán Cash Reserve (Dry Powder) ---------- */
    const cashReserve = useMemo(() => {
        return calculateCashReserve(economicScore, marketValuation.marketDiscountScore, analyzedStocks);
    }, [economicScore, marketValuation.marketDiscountScore, analyzedStocks]);

    // Top Opportunity stock
    const topStock = useMemo(() => {
        return [...analyzedStocks].sort((a, b) => b.stockDiscountScore - a.stockDiscountScore)[0];
    }, [analyzedStocks]);

    const handleSelectStock = useCallback((stock: StockAnalysis) => {
        setSelectedStock(stock);
        setDrawerOpen(true);
    }, []);

    const handleCloseDrawer = useCallback(() => {
        setDrawerOpen(false);
    }, []);

    /* ---------- Local Offline Strategic Analysis ---------- */
    const generateInternalAnalysis = useCallback(() => {
        const top3 = [...analyzedStocks].sort((a, b) => b.stockDiscountScore - a.stockDiscountScore).slice(0, 3);
        const topSymbols = top3.map((s) => `${s.symbol} (Score ${s.stockDiscountScore} - ${s.actionLabel})`).join(', ');

        return [
            `## 1. Tóm tắt trạng thái chu kỳ đầu tư (Investment Cycle Status)`,
            `* **Tầng 1 - Nền kinh tế:** Điểm số **${economicScore}/100** thuộc vùng **${macroZone.name}**. ${macroZone.desc}`,
            `* **Tầng 2 - Thị trường VN-Index:** Điểm chiết khấu thị trường **${marketValuation.marketDiscountScore}/100** (${marketValuation.statusLabel}). VN-Index tại ${marketValuation.vnIndex} điểm, P/E ${marketValuation.pe}x so với trung vị 5 năm ${marketValuation.peHistorical5yMedian}x, Drawdown ${marketValuation.drawdown}% từ đỉnh.`,
            `* **Tầng 3 - Cổ phiếu định giá rẻ:** Top cơ hội chiết khấu nổi bật gồm: **${topSymbols}**.`,
            `## 2. Quản trị tiền mặt dự phòng (Dry Powder 20%)`,
            `* Tổng quỹ dự phòng: **20%** tổng tài sản.`,
            `* Trạng thái giải ngân: ${
                cashReserve.deployConditionMet
                    ? `Đã kích hoạt đủ 3 điều kiện đồng thời. Đang cho phép sử dụng **${cashReserve.deployedPercent}%** tiền mặt dự phòng để gia tăng vị thế.`
                    : `Chưa kích hoạt đủ 3 điều kiện đồng thời. Đang giữ **${cashReserve.availablePercent}%** tiền mặt phòng thủ, tiếp tục DCA bằng dòng tiền hàng tháng.`
            }`,
            `## 3. Khuyến nghị hành động tích sản`,
            `* **Phân bổ mục tiêu:** ${macroZone.alloc.stock}% Cổ phiếu · ${macroZone.alloc.fund}% Chứng chỉ quỹ · ${macroZone.alloc.cash}% Tiền mặt.`,
            `* **Nguyên tắc cốt lõi:** Không nhầm lẫn giữa "giảm giá" và "chiết khấu". Ưu tiên các mã vừa có chiết khấu cao so với Fair Value, vừa thiếu tỷ trọng (Underweight) trong danh mục.`,
            `* **Chiến lược chốt lời:** Không bán hết khi có lãi. Giữ 70-80% Core Position, chỉ xem xét bán 20-30% khi cổ phiếu vượt quá 15-20% Fair Value (Extreme Premium).`,
        ].join('\n');
    }, [economicScore, macroZone, marketValuation, analyzedStocks, cashReserve]);

    /* ---------- 9Router API Caller (Tự động chọn & Auto-switch model mới nhất) ---------- */
    const call9Router = async (prompt: string, taskDescription = 'Xử lý dữ liệu'): Promise<string> => {
        const SYSTEM_PROMPT =
            'Bạn là Senior Macro & Equity Valuation Strategist chuyên sâu về thị trường chứng khoán Việt Nam, phụ trách hệ thống Investment Cycle Engine cho chiến lược tích sản cổ phiếu dài hạn. Trả lời bằng tiếng Việt, số liệu sắc bén, mạch lạc, phân tích khách quan theo nguyên tắc giá trị nội tại, không hô hào đầu cơ hay hứa hẹn lợi nhuận.';

        const cleanEp = (routerEndpoint.trim() || DEFAULT_9ROUTER_ENDPOINT).replace(/\/+$/, '');
        const url = cleanEp.endsWith('/chat/completions')
            ? cleanEp
            : `${cleanEp}/chat/completions`;

        addLog('info', `[${taskDescription}] Bắt đầu gửi yêu cầu tới 9Router...`);

        // 1. Quét danh sách model khả dụng từ 9Router
        let currentModels = discoveredModels;
        if (!currentModels || currentModels.length === 0) {
            try {
                addLog('info', `Đang tải danh sách model trực tiếp từ ${cleanEp}/models...`);
                const res = await fetch(`${cleanEp}/models`, {
                    headers: routerToken.trim() ? { Authorization: `Bearer ${routerToken.trim()}` } : {},
                });
                const data = await res.json().catch(() => ({}));
                if (Array.isArray(data?.data)) {
                    const ids = data.data.map((m: any) => m.id).filter(Boolean);
                    if (ids.length > 0) {
                        currentModels = ids;
                        setDiscoveredModels(ids);
                    }
                }
            } catch {
                /* fallback to defaults */
            }
        }

        // 2. Sắp xếp ưu tiên model mới nhất (3.8 > 3.7 > 4.6 > 3.6 > ...)
        const candidatePool = Array.from(new Set([...currentModels, ...DEFAULT_9ROUTER_MODELS]));
        const sortedModels = candidatePool.sort((a, b) => scoreModelPriority(b) - scoreModelPriority(a));

        addLog('info', `[${taskDescription}] Thứ tự ưu tiên models: ${sortedModels.slice(0, 3).join(' ➔ ')}...`);

        const errors: string[] = [];

        // 3. Tự động thử và auto-switch nếu model bận/hết quota
        for (let i = 0; i < sortedModels.length; i++) {
            const model = sortedModels[i];
            const startTime = Date.now();
            try {
                addLog('info', `[${taskDescription}] Đang gửi yêu cầu tới model #${i + 1}: [${model}]...`);
                setAiStep(`Đang gọi model [${model}]…`);
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${routerToken.trim()}`,
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'user', content: prompt },
                        ],
                        temperature: 0.3,
                    }),
                });

                const data = await res.json().catch(() => ({}));
                const duration = Date.now() - startTime;

                if (!res.ok) {
                    const msg = data?.error?.message || `HTTP ${res.status}`;
                    if (res.status === 401 || (res.status === 400 && /token|api key|unauthorized/i.test(msg))) {
                        addLog('error', `Lỗi xác thực Token 9Router: ${msg}`);
                        throw Object.assign(new Error(`Lỗi xác thực Token 9Router: ${msg}`), { fatal: true });
                    }
                    const nextModel = sortedModels[i + 1] || 'hết danh sách';
                    addLog('switch', `Model [${model}] gặp lỗi (${msg}, ${duration}ms) ➔ Tự động switch sang model: [${nextModel}]`);
                    errors.push(`${model}: ${msg}`);
                    setAiStep(`Model [${model}] bận/lỗi – Tự động chuyển sang model tiếp theo…`);
                    continue;
                }

                const text = data?.choices?.[0]?.message?.content || '';
                if (!text) {
                    const nextModel = sortedModels[i + 1] || 'hết danh sách';
                    addLog('switch', `Model [${model}] trả về nội dung rỗng ➔ Tự động switch sang: [${nextModel}]`);
                    errors.push(`${model}: không trả về nội dung`);
                    setAiStep(`Model [${model}] trả về rỗng – Đang thử model khác…`);
                    continue;
                }

                addLog('success', `Model [${model}] phản hồi thành công trong ${duration}ms (${text.length} ký tự).`);
                setUsedModel(model);
                return text;
            } catch (e: any) {
                if (e?.fatal) throw e;
                const nextModel = sortedModels[i + 1] || 'hết danh sách';
                addLog('switch', `Model [${model}] ngoại lệ (${e?.message || e}) ➔ Tự động switch sang: [${nextModel}]`);
                errors.push(`${model}: ${e?.message || e}`);
                setAiStep(`Model [${model}] thất bại – Đang switch model tiếp theo…`);
            }
        }

        addLog('error', `Tất cả các model của 9Router đều thất bại. Chi tiết: ${errors.join(' | ')}`);
        throw new Error(`9Router không phản hồi qua các model khả dụng. Chi tiết: ${errors.join(' | ')}`);
    };

    /* ---------- ✨ RUN INVESTMENT CYCLE ENGINE ---------- */
    const runInvestmentEngine = async () => {
        setMeasured(true);
        setAiError('');
        setAiLoading(true);
        setAiText('');
        setAiStep('1/3. Khởi chạy Investment Cycle Engine…');
        addLog('info', '==================================================');
        addLog('info', '🚀 BẮT ĐẦU PHIÊN CHẠY INVESTMENT CYCLE ENGINE 3.0');

        const today = new Date().toLocaleDateString('vi-VN');

        if (!routerToken.trim()) {
            addLog('warn', '⚠️ Chưa cấu hình Token 9Router! (Bạn có thể mở http://localhost:20128/dashboard để lấy Token)');
            addLog('info', '➔ Tự động kích hoạt Engine Định Lượng Nội Bộ (sử dụng 8 chỉ số vĩ mô và 12 cổ phiếu benchmark chuẩn)...');
            setTimeout(() => {
                setAiStep('Đang tính toán ma trận chiết khấu 12 cổ phiếu & Quỹ Dry Powder…');
                addLog('info', 'Tính toán ma trận chiết khấu 12 cổ phiếu và hạn mức giải ngân Dry Powder 20%...');
                setTimeout(() => {
                    setAiText(generateInternalAnalysis());
                    setAiLoading(false);
                    setAiStep('');
                    addLog('success', 'Hoàn tất tính toán chu kỳ đầu tư & chiến lược tích sản (Chế độ Nội bộ Offline).');
                    saveHistory();
                    addLog('success', 'Đã lưu kết quả đo vào lịch sử thành công.');
                }, 400);
            }, 300);
            return;
        }

        try {
            addLog('info', `Bước 1/3: Gửi yêu cầu quét số liệu vĩ mô & VN-Index mới nhất (${today})...`);
            const macroFields = MACRO_SLIDERS.map(
                (s) => `"${s.key}": số (${s.label}, đơn vị ${s.unit || 'chỉ số'}, khoảng ${s.min}..${s.max})`
            ).join(',\n    ');

            const prompt = `Hôm nay là ${today}. Bạn hãy tìm kiếm và cập nhật số liệu mới nhất về kinh tế vĩ mô và chỉ số VN-Index của Việt Nam:
1. 8 chỉ báo vĩ mô:
  ${macroFields}
2. Thị trường VN-Index:
  - Điểm số VN-Index hiện tại
  - Đỉnh 52 tuần VN-Index
  - P/E VN-Index hiện tại
  - Đường MA200 tuần của VN-Index
  - Tăng trưởng EPS thị trường

Trả về DUY NHẤT một JSON hợp lệ (không kèm markdown ngoài json) dạng:
{
  "macro": {
    "rate": 5.4,
    "credit": 13.0,
    "cpi": 3.4,
    "realestate": 6,
    "pmi": 51.5,
    "eps": 14.5,
    "pe": 13.8,
    "ma200": 3.5
  },
  "market": {
    "vnIndex": 1285,
    "peak52w": 1306,
    "pe": 13.8,
    "ma200": 1242,
    "epsGrowth": 14.2
  },
  "notes": { "rate": "nguồn...", "pe": "nguồn..." },
  "asOf": "${today}"
}`;

            const raw = await call9Router(prompt, '1/3. Quét số liệu vĩ mô & VN-Index');
            addLog('info', 'Đang trích xuất JSON dữ liệu vĩ mô & định giá thị trường...');
            const parsed = extractJsonFromText(raw);

            if (parsed.macro) {
                const nextMacro: MacroValues = {};
                for (const s of MACRO_SLIDERS) {
                    const v = Number(parsed.macro[s.key]);
                    if (Number.isFinite(v)) {
                        nextMacro[s.key] = Math.min(s.max, Math.max(s.min, v));
                    } else {
                        nextMacro[s.key] = macroValues[s.key];
                    }
                }
                setMacroValues(nextMacro);
                addLog('success', 'Đã cập nhật 8 chỉ số vĩ mô vào mô hình Tầng 1.');
            }

            if (parsed.market) {
                setMarketInput((prev) => ({
                    ...prev,
                    vnIndex: Number(parsed.market.vnIndex) || prev.vnIndex,
                    peak52w: Number(parsed.market.peak52w) || prev.peak52w,
                    pe: Number(parsed.market.pe) || prev.pe,
                    ma200: Number(parsed.market.ma200) || prev.ma200,
                    epsGrowth: Number(parsed.market.epsGrowth) || prev.epsGrowth,
                }));
                addLog('success', `Đã cập nhật VN-Index: ${parsed.market.vnIndex} điểm, P/E: ${parsed.market.pe}x vào mô hình Tầng 2.`);
            }

            if (parsed.notes) setNotes(parsed.notes);
            if (parsed.asOf) setAsOf(parsed.asOf);

            setAiStep('2/3. Đang phân tích chiến lược 3 tầng & chẩn đoán giải ngân tiền mặt qua 9Router…');
            addLog('info', 'Bước 2/3: Gửi yêu cầu phân tích chiến lược 3 tầng & chẩn đoán giải ngân tiền mặt...');

            // Phân tích chiến lược
            const analysisPrompt = `Dữ liệu Investment Cycle Engine vừa tính toán:\n- Vĩ mô: Economic Cycle Score ${economicScore}/100 (${macroZone.name})\n- Thị trường: VN-Index ${marketValuation.vnIndex}, P/E ${marketValuation.pe}x vs Median ${marketValuation.peHistorical5yMedian}x, Market Discount Score ${marketValuation.marketDiscountScore}/100 (${marketValuation.statusLabel})\n- Top cơ hội chiết khấu: ${topStock ? `${topStock.symbol} (Score ${topStock.stockDiscountScore}, Discount so với Fair ${topStock.discount}%)` : ''}\n- Quỹ Dry Powder: 20% (Giải ngân ${cashReserve.deployedPercent}%, Giữ lại ${cashReserve.availablePercent}%)\n\nHãy phân tích chuyên sâu cho nhà đầu tư tích sản cổ phiếu theo 4 phần (tiêu đề ##):\n1) Vị thế chu kỳ kinh tế & Thị trường chứng khoán Việt Nam\n2) Định giá thị trường & Phân biệt giữa "giảm giá từ đỉnh" và "chiết khấu so với Fair Value"\n3) Đánh giá các cổ phiếu có Discount Score cao nhất và tỷ trọng danh mục\n4) Kế hoạch hành động cụ thể: Dòng tiền DCA hàng tháng và lộ trình giải ngân đạn tiền mặt dự phòng (Dry Powder).`;

            const aiAnalysisResult = await call9Router(analysisPrompt, '2/3. Phân tích chiến lược 3 tầng');
            setAiText(aiAnalysisResult);
            addLog('success', 'Bước 3/3: Báo cáo chiến lược đầu tư đã hoàn tất.');
            saveHistory();
            addLog('success', 'Đã lưu phiên đo vào Lịch sử thành công.');
            addLog('info', '==================================================');
        } catch (err: any) {
            console.error('9Router Engine error:', err);
            addLog('error', `Lỗi xử lý 9Router: ${err?.message || err}. Tự động fallback sang phân tích nội bộ.`);
            setAiError(`Lỗi 9Router: ${err?.message || err}. Đang chuyển sang hiển thị phân tích nội bộ.`);
            setAiText(generateInternalAnalysis());
            saveHistory();
        } finally {
            setAiLoading(false);
            setAiStep('');
        }
    };

    /* ---------- Save & Export History ---------- */
    const saveHistory = () => {
        const item: HistoryItem = {
            time: new Date().toLocaleString('vi-VN'),
            economicScore,
            marketScore: marketValuation.marketDiscountScore,
            economicZone: macroZone.name,
            marketZone: marketValuation.statusLabel,
            macroValues,
            topStockSymbol: topStock?.symbol,
            topStockScore: topStock?.stockDiscountScore,
        };
        const next = [item, ...history].slice(0, 30);
        setHistory(next);
        localStorage.setItem(LS_HISTORY, JSON.stringify(next));
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem(LS_HISTORY);
    };

    const exportFullReportJson = () => {
        const report = {
            title: 'Vietnam Investment Cycle Engine Report',
            createdAt: new Date().toISOString(),
            layer1_economicCycle: {
                totalScore: economicScore,
                zone: macroZone.name,
                allocation: macroZone.alloc,
                indicators: MACRO_SLIDERS.map((s, idx) => ({
                    label: s.label,
                    value: macroValues[s.key],
                    score: Number(macroScores[idx].toFixed(2)),
                    weight: s.weight,
                    unit: s.unit,
                })),
            },
            layer2_marketValuation: marketValuation,
            layer3_stockValuation: analyzedStocks,
            dryPowderCashReserve: cashReserve,
            aiStrategicAnalysis: aiText || generateInternalAnalysis(),
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `investment-cycle-engine-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ---------- Gauge Visual Constants ---------- */
    const CX = 150, CY = 150, R = 120;
    const needle = polar(CX, CY, R - 18, measured ? economicScore : 0);

    /* ---------- Donut Chart Constants ---------- */
    const DR = 70, CIRC = 2 * Math.PI * DR;
    const donut = [
        { label: 'Cổ phiếu', value: macroZone.alloc.stock, color: '#6366F1' },
        { label: 'CCQ', value: macroZone.alloc.fund, color: '#06B6D4' },
        { label: 'Tiền mặt', value: macroZone.alloc.cash, color: '#94A3B8' },
    ];
    let offset = 0;

    const card = 'rounded-xl border border-[#1F2937] bg-[#111827] p-5 shadow-lg';

    return (
        <div className="space-y-6 bg-[#090D16] -m-2 p-3 sm:p-5 rounded-xl" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700;800&display=swap');
                .mc-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:#1F2937;outline:none;width:100%}
                .mc-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#e5e7eb;border:2px solid #6366F1;cursor:pointer;box-shadow:0 0 8px #6366F1aa}
                .mc-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#e5e7eb;border:2px solid #6366F1;cursor:pointer}
            `}</style>

            {/* ============================== 1. HEADER DASHBOARD ============================== */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2937] pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-xs font-bold tracking-widest uppercase text-cyan-400" style={{ fontFamily: MONO }}>
                            INVESTMENT CYCLE ENGINE 3.0
                        </span>
                        {priceLoading && (
                            <span className="text-[11px] text-gray-500 animate-pulse">
                                (Đang cập nhật giá thị trường…)
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
                        Hệ Thống Đánh Giá Chu Kỳ Đầu Tư &amp; Định Giá Cổ Phiếu
                    </h1>
                    <p className="text-xs text-gray-400 mt-1 max-w-3xl leading-relaxed">
                        Mô hình 3 tầng định lượng: <strong className="text-gray-200">Kinh Tế Vĩ Mô (0-100)</strong> → <strong className="text-gray-200">Định Giá VN-Index (0-100)</strong> → <strong className="text-gray-200">Chiết Khấu 12 Cổ Phiếu Trọng Tâm</strong> phục vụ tích sản dài hạn &amp; giải ngân đạn tiền mặt khoa học.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={exportFullReportJson}
                        className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1F2937] text-gray-200 hover:bg-[#2b3648] transition cursor-pointer border border-gray-700 flex items-center gap-1.5"
                    >
                        <span>📥</span> Xuất Báo Cáo JSON
                    </button>
                    <button
                        type="button"
                        onClick={runInvestmentEngine}
                        disabled={aiLoading}
                        className="px-5 py-2 rounded-lg text-xs font-extrabold text-[#041014] bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 hover:opacity-95 disabled:opacity-50 transition cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                    >
                        <span>✨</span>
                        {aiLoading ? 'ĐANG CHẠY ENGINE…' : 'RUN INVESTMENT CYCLE ENGINE'}
                    </button>
                </div>
            </div>

            {/* ============================== 2. KPI TOP STATS CARDS ============================== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Economic Cycle */}
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">1. Economic Cycle</span>
                        <span
                            className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{
                                color: measured ? macroZone.color : '#9CA3AF',
                                backgroundColor: measured ? `${macroZone.color}22` : '#1F2937',
                            }}
                        >
                            {measured ? macroZone.id.toUpperCase() : 'CHƯA CHẠY'}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span
                            className="text-3xl font-extrabold"
                            style={{ color: measured ? macroZone.color : '#6B7280', fontFamily: MONO }}
                        >
                            {measured ? economicScore : '--'}
                        </span>
                        <span className="text-xs text-gray-500" style={{ fontFamily: MONO }}>/ 100</span>
                    </div>
                    <div className="text-xs font-semibold text-gray-300 mt-1 truncate">
                        {measured ? macroZone.name : 'Chờ chạy Engine'}
                    </div>
                </div>

                {/* 2. Market Discount */}
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">2. Market Discount</span>
                        <span className="text-xs text-gray-500" style={{ fontFamily: MONO }}>VN-Index</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span
                            className="text-3xl font-extrabold"
                            style={{ color: measured ? '#22D3EE' : '#6B7280', fontFamily: MONO }}
                        >
                            {measured ? marketValuation.marketDiscountScore : '--'}
                        </span>
                        <span className="text-xs text-gray-500" style={{ fontFamily: MONO }}>/ 100</span>
                    </div>
                    <div className="text-xs font-semibold text-gray-300 mt-1 truncate">
                        {measured ? marketValuation.statusLabel : 'Chờ chạy Engine'}
                    </div>
                </div>

                {/* 3. Cash Reserve */}
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">3. Cash Reserve (Quy Tắc 20%)</span>
                        <span className="text-xs text-emerald-400 font-bold">DRY POWDER</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-extrabold text-emerald-400" style={{ fontFamily: MONO }}>
                            20%
                        </span>
                        <span className="text-xs text-gray-400">quỹ dự phòng</span>
                    </div>
                    <div className="text-xs text-gray-300 mt-1">
                        DCA chuẩn + 4 đạn gia tốc
                    </div>
                </div>

                {/* 4. Deployable Now */}
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">4. Deployable Now</span>
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-teal-950 text-teal-300">
                            {measured ? (cashReserve.deployConditionMet ? 'ĐÃ KÍCH HOẠT' : 'CHỜ TÍN HIỆU') : 'CHỜ DỮ LIỆU'}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span
                            className="text-3xl font-extrabold"
                            style={{ color: measured ? '#FFFFFF' : '#6B7280', fontFamily: MONO }}
                        >
                            {measured ? `${cashReserve.deployedPercent}%` : '--%'}
                        </span>
                        <span className="text-xs text-gray-500">cho phép bắn</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 truncate">
                        {measured ? `Còn ${cashReserve.availablePercent}% phòng thủ` : 'Dự phòng 20% Dry Powder'}
                    </div>
                </div>
            </div>

            {/* ============================== 3. 9ROUTER CONFIGURATION & ENGINE RUNNER ============================== */}
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm font-bold text-gray-200">
                                ⚙️ Cấu hình 9Router (AI Router &amp; Token Saver)
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                                Port 20128
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Tự động nhận diện model khả dụng, ưu tiên model mới nhất và tự động switch khi model bận
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {usedModel && (
                            <span className="text-xs text-gray-400 bg-[#090D16] px-2.5 py-1 rounded-md border border-[#1F2937]">
                                Model vừa dùng: <strong className="text-cyan-400" style={{ fontFamily: MONO }}>{usedModel}</strong>
                            </span>
                        )}
                        <a
                            href="http://localhost:20128/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1F2937] text-cyan-300 hover:bg-[#283548] border border-cyan-800/60 transition flex items-center gap-1.5"
                        >
                            <span>🌐</span> Mở 9Router Dashboard
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                    {/* 1. 9Router Token */}
                    <div className="md:col-span-6">
                        <label className="text-[11px] text-gray-400 font-medium block mb-1">
                            9Router Token / API Key:
                        </label>
                        <div className="relative">
                            <input
                                type={showToken ? 'text' : 'password'}
                                value={routerToken}
                                onChange={(e) => onTokenChange(e.target.value)}
                                placeholder="Nhập Token của 9Router (lấy từ Dashboard: http://localhost:20128)"
                                className="w-full bg-[#090D16] border border-[#1F2937] rounded-lg px-3 py-2 pr-16 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white cursor-pointer"
                            >
                                {showToken ? 'Ẩn' : 'Hiện'}
                            </button>
                        </div>
                    </div>

                    {/* 2. Model Auto Selection & Auto-Switch */}
                    <div className="md:col-span-4">
                        <label className="text-[11px] text-gray-400 font-medium block mb-1">
                            Cơ chế Model AI (9Router):
                        </label>
                        <div className="w-full bg-[#090D16] border border-cyan-800/50 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                                <span className="text-cyan-400">⚡</span>
                                <span className="text-gray-200 font-medium truncate">
                                    {usedModel ? (
                                        <>Model: <strong className="text-cyan-300 font-mono">{usedModel}</strong></>
                                    ) : (
                                        <>Tự động chọn &amp; Auto-Switch (Ưu tiên mới)</>
                                    )}
                                </span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 shrink-0 font-mono border border-cyan-800">
                                Auto
                            </span>
                        </div>
                    </div>

                    {/* 3. Action Buttons */}
                    <div className="md:col-span-2 flex gap-1.5">
                        <button
                            type="button"
                            onClick={test9RouterConnection}
                            disabled={testStatus === 'testing'}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[#1F2937] text-gray-200 hover:bg-[#2b3648] border border-gray-700 transition cursor-pointer"
                            title="Kiểm tra kết nối tới http://localhost:20128"
                        >
                            {testStatus === 'testing' ? 'Đang thử…' : '⚡ Kiểm Tra'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="px-2.5 py-2 rounded-lg text-xs bg-[#1F2937] text-gray-400 hover:text-white border border-gray-700 transition cursor-pointer"
                            title="Tùy chỉnh Endpoint URL"
                        >
                            ⚙️
                        </button>
                    </div>
                </div>

                {/* Advanced: Endpoint URL customization */}
                {showAdvanced && (
                    <div className="mt-2.5 p-3 rounded-lg bg-[#090D16] border border-[#1F2937] space-y-2">
                        <label className="text-[11px] text-gray-400 font-medium block">
                            9Router Endpoint URL (OpenAI-Compatible):
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={routerEndpoint}
                                onChange={(e) => onEndpointChange(e.target.value)}
                                placeholder="http://localhost:20128/v1"
                                className="flex-1 bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-1.5 text-xs text-gray-200 font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => onEndpointChange(DEFAULT_9ROUTER_ENDPOINT)}
                                className="px-3 py-1.5 text-xs rounded bg-[#1F2937] text-gray-400 hover:text-white cursor-pointer"
                            >
                                Mặc định
                            </button>
                        </div>
                    </div>
                )}

                {/* Test Connection Message */}
                {testMessage && (
                    <div
                        className={`mt-2.5 text-xs px-3 py-1.5 rounded-lg border ${
                            testStatus === 'success'
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                : testStatus === 'error'
                                ? 'bg-red-950/40 border-red-500/40 text-red-300'
                                : 'bg-[#090D16] border-[#1F2937] text-cyan-300'
                        }`}
                    >
                        {testMessage}
                    </div>
                )}

                {aiLoading && aiStep && (
                    <div className="mt-3 text-xs text-cyan-300 animate-pulse flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-950/40 border border-cyan-800/60">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                        <span className="font-semibold">{aiStep}</span>
                    </div>
                )}
                {aiError && <p className="mt-2 text-xs text-amber-400">{aiError}</p>}

                {/* ==================== LIVE TERMINAL & EXECUTION LOG CONSOLE ==================== */}
                <div className="mt-3.5 rounded-xl border border-[#1F2937] bg-[#070B13] overflow-hidden shadow-inner">
                    {/* Console Header */}
                    <div className="flex flex-wrap items-center justify-between px-3.5 py-2 bg-[#0D1424] border-b border-[#1F2937] gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm">📟</span>
                            <span className="text-xs font-bold text-gray-200 tracking-wide uppercase" style={{ fontFamily: MONO }}>
                                NHẬT KÝ KẾT NỐI &amp; TIẾN TRÌNH XỬ LÝ (LIVE LOGS)
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                                {logs.length} logs
                            </span>
                            {aiLoading && (
                                <span className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium animate-pulse ml-1">
                                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                                    Đang truyền nhận dữ liệu…
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setAutoScrollLogs(!autoScrollLogs)}
                                className={`text-[11px] px-2 py-1 rounded transition cursor-pointer border ${
                                    autoScrollLogs
                                        ? 'bg-cyan-950/70 border-cyan-700 text-cyan-300'
                                        : 'bg-[#111827] border-gray-700 text-gray-400 hover:text-white'
                                }`}
                                title="Bật/Tắt tự động cuộn xuống cuối"
                            >
                                ⬇️ Cuộn: {autoScrollLogs ? 'BẬT' : 'TẮT'}
                            </button>
                            <button
                                type="button"
                                onClick={copyAllLogs}
                                disabled={logs.length === 0}
                                className="text-[11px] px-2.5 py-1 rounded bg-[#111827] hover:bg-[#1E293B] text-gray-300 border border-gray-700 transition cursor-pointer disabled:opacity-40"
                                title="Sao chép toàn bộ nhật ký"
                            >
                                📋 Copy
                            </button>
                            <button
                                type="button"
                                onClick={clearAllLogs}
                                disabled={logs.length === 0}
                                className="text-[11px] px-2.5 py-1 rounded bg-[#111827] hover:bg-red-950/60 text-red-300 border border-gray-700 hover:border-red-800 transition cursor-pointer disabled:opacity-40"
                                title="Xóa toàn bộ log"
                            >
                                🗑️ Xóa
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowLogs(!showLogs)}
                                className="text-[11px] px-2 py-1 rounded bg-[#111827] text-gray-400 hover:text-white border border-gray-700 cursor-pointer"
                            >
                                {showLogs ? '▲ Thu gọn' : '▼ Mở rộng'}
                            </button>
                        </div>
                    </div>

                    {/* Console Body */}
                    {showLogs && (
                        <div
                            className="p-3 max-h-56 overflow-y-auto space-y-1.5 text-[11px] select-text bg-[#060A12]"
                            style={{ fontFamily: MONO }}
                        >
                            {logs.length === 0 ? (
                                <div className="text-gray-500 py-4 text-center italic">
                                    Chưa có log hoạt động. Bấm "⚡ Kiểm Tra" hoặc "RUN INVESTMENT CYCLE ENGINE" để xem quy trình kết nối và xử lý.
                                </div>
                            ) : (
                                logs.map((log) => {
                                    const badgeStyles = {
                                        info: 'text-cyan-400 bg-cyan-950/60 border-cyan-800',
                                        success: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
                                        warn: 'text-amber-300 bg-amber-950/60 border-amber-800',
                                        error: 'text-rose-400 bg-rose-950/60 border-rose-800',
                                        switch: 'text-purple-300 bg-purple-950/60 border-purple-800',
                                    }[log.level];

                                    const textColors = {
                                        info: 'text-gray-200',
                                        success: 'text-emerald-200',
                                        warn: 'text-amber-200',
                                        error: 'text-rose-200',
                                        switch: 'text-purple-200',
                                    }[log.level];

                                    return (
                                        <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-white/[0.03] px-1 py-0.5 rounded">
                                            <span className="text-gray-500 shrink-0 select-none">[{log.timestamp}]</span>
                                            <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold shrink-0 ${badgeStyles}`}>
                                                {log.level.toUpperCase()}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <span className={`${textColors} break-words`}>{log.message}</span>
                                                {log.detail && (
                                                    <div className="text-[10px] text-gray-400 mt-0.5 pl-2 border-l border-gray-700 break-words">
                                                        {log.detail}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* ============================== 4. TẦNG 1: ECONOMIC CYCLE ENGINE ============================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Gauge Meter */}
                <div className={card}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800">
                                TẦNG 1 – ECONOMIC CYCLE ENGINE
                            </span>
                        </div>
                        <span className="text-xs text-gray-500" style={{ fontFamily: MONO }}>
                            Cập nhật: {asOf}
                        </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-2">Đồng Hồ Đo Chu Kỳ Kinh Tế Việt Nam</h3>

                    <svg viewBox="0 0 300 185" className="w-full max-w-sm mx-auto">
                        <path d={arcPath(CX, CY, R, 0, 100)} stroke="#0B1220" strokeWidth="26" fill="none" strokeLinecap="butt" />
                        {MACRO_ZONES.map((z) => (
                            <path
                                key={z.id}
                                d={arcPath(CX, CY, R, z.from + 0.4, z.to - 0.4)}
                                stroke={z.color}
                                strokeWidth="20"
                                fill="none"
                                opacity={measured && z.id === macroZone.id ? 1 : 0.35}
                                style={measured && z.id === macroZone.id ? { filter: `drop-shadow(0 0 6px ${z.color})` } : undefined}
                            />
                        ))}
                        {[0, 35, 55, 75, 100].map((t) => {
                            const p = polar(CX, CY, R + 20, t);
                            return (
                                <text key={t} x={p.x} y={p.y + 3} fontSize="9" fill="#6B7280" textAnchor="middle" fontFamily={MONO}>
                                    {t}
                                </text>
                            );
                        })}
                        <line
                            x1={CX}
                            y1={CY}
                            x2={needle.x}
                            y2={needle.y}
                            stroke="#F9FAFB"
                            strokeWidth="3"
                            strokeLinecap="round"
                            style={{ transition: 'all .4s ease' }}
                        />
                        <circle cx={CX} cy={CY} r="8" fill="#F9FAFB" />
                        <circle cx={CX} cy={CY} r="3" fill="#111827" />
                        <text
                            x={CX}
                            y={CY - 38}
                            textAnchor="middle"
                            fontSize="38"
                            fontWeight="800"
                            fill={measured ? macroZone.color : '#6B7280'}
                            fontFamily={MONO}
                        >
                            {measured ? economicScore : '--'}
                        </text>
                        <text x={CX} y={CY - 24} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily={MONO}>
                            {measured ? '/ 100' : 'CHƯA CHẠY'}
                        </text>
                    </svg>

                    <div className="text-center mt-1">
                        <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                                color: measured ? macroZone.color : '#9CA3AF',
                                backgroundColor: measured ? `${macroZone.color}1F` : '#1F2937',
                                border: `1px solid ${measured ? `${macroZone.color}55` : '#374151'}`,
                            }}
                        >
                            {measured ? macroZone.name : 'CHƯA ĐO LƯỜNG CHU KỲ'}
                        </span>
                        <p className="text-xs text-gray-400 mt-2">
                            {measured ? macroZone.desc : 'Nhấn "RUN INVESTMENT CYCLE ENGINE" để hệ thống phân tích dữ liệu vĩ mô và tính điểm.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] pt-3 border-t border-[#1F2937]">
                        {MACRO_ZONES.map((z) => (
                            <div key={z.id} className="flex items-center gap-2 text-gray-400">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: z.color }} />
                                <span style={{ fontFamily: MONO }}>
                                    {z.from === 0 ? 0 : z.from + 1}-{z.to}
                                </span>{' '}
                                <span className="truncate">{z.action}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Donut Chart: Phân bổ tài sản khuyến nghị */}
                <div className={card}>
                    <h3 className="text-base font-bold text-white mb-1">Khung Phân Bổ Danh Mục Chu Kỳ</h3>
                    <p className="text-xs text-gray-400 mb-4">
                        Tỷ lệ phân bổ mục tiêu tương ứng với vùng điểm kinh tế hiện tại
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <svg viewBox="0 0 200 200" className="w-44 h-44">
                            <circle cx="100" cy="100" r={DR} fill="none" stroke="#1F2937" strokeWidth="28" />
                            {donut.map((d) => {
                                const len = (d.value / 100) * CIRC;
                                const el = (
                                    <circle
                                        key={d.label}
                                        cx="100"
                                        cy="100"
                                        r={DR}
                                        fill="none"
                                        stroke={d.color}
                                        strokeWidth="28"
                                        strokeDasharray={`${len} ${CIRC - len}`}
                                        strokeDashoffset={-offset}
                                        transform="rotate(-90 100 100)"
                                        style={{ transition: 'all .5s ease' }}
                                    />
                                );
                                offset += len;
                                return el;
                            })}
                            <text
                                x="100"
                                y="97"
                                textAnchor="middle"
                                fontSize="22"
                                fontWeight="800"
                                fill="#F9FAFB"
                                fontFamily={MONO}
                            >
                                {measured ? `${macroZone.alloc.stock}%` : '--%'}
                            </text>
                            <text x="100" y="114" textAnchor="middle" fontSize="9" fill="#9CA3AF">
                                Cổ phiếu
                            </text>
                        </svg>

                        <div className="space-y-3">
                            {donut.map((d) => (
                                <div key={d.label} className="flex items-center gap-3 text-xs">
                                    <span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                                    <span className="text-gray-300 w-20">{d.label}</span>
                                    <span className="text-white font-bold" style={{ fontFamily: MONO }}>
                                        {measured ? `${d.value}%` : '--%'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 p-3 rounded-lg bg-[#0D131F] border border-[#1F2937] text-xs text-gray-300">
                        <strong className="text-cyan-300">Khuyến nghị phân bổ:</strong>{' '}
                        {!measured && 'Chưa có dữ liệu chu kỳ. Nhấn "RUN INVESTMENT CYCLE ENGINE" để tính toán tỷ lệ phân bổ.'}
                        {measured && macroZone.id === 'red' && 'Duy trì tiền mặt và CCQ phòng thủ, chỉ giải ngân rất chọn lọc.'}
                        {measured && macroZone.id === 'amber' && 'Duy trì tích sản chuẩn 50% CP / 30% CCQ / 20% Tiền mặt.'}
                        {measured && macroZone.id === 'green' && 'Tăng tốc gom 60-70% CP, kích hoạt 25-50% đạn tiền mặt dự phòng.'}
                        {measured && macroZone.id === 'neon' && 'Gom cực mạnh 80% CP, sử dụng tối đa đạn dự phòng bắt đáy hoảng loạn.'}
                    </div>
                </div>
            </div>

            {/* 8 Chỉ báo vĩ mô chi tiết */}
            <div className={card}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-gray-200">
                        8 Chỉ Báo Vĩ Mô Đóng Góp (Tổng 100 Điểm)
                    </h3>
                    <span className="text-xs text-gray-400" style={{ fontFamily: MONO }}>
                        {measured ? `${economicScore}/100` : '--/100'}
                    </span>
                </div>
                <p className="text-[11px] text-gray-500 mb-4">
                    Kéo chỉnh giá trị hoặc dùng AI để mô phỏng kịch bản kinh tế
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {MACRO_SLIDERS.map((s, i) => {
                        const pct = (macroScores[i] / s.weight) * 100;
                        const barColor = pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444';
                        return (
                            <div key={s.key} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-300 font-medium">{s.label}</span>
                                    <span style={{ fontFamily: MONO }}>
                                        <span className="text-white font-bold">
                                            {measured ? `${macroValues[s.key]?.toFixed(s.decimals)}${s.unit}` : `-- ${s.unit}`}
                                        </span>
                                        <span className="ml-2 font-bold" style={{ color: measured ? barColor : '#6B7280' }}>
                                            {measured ? `${macroScores[i].toFixed(1)}/${s.weight}` : `--/${s.weight}`}
                                        </span>
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{ width: `${measured ? pct : 0}%`, background: barColor, transition: 'width .3s' }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-gray-500">
                                    <span>{notes[s.key] ? `Nguồn: ${notes[s.key]}` : s.hint}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ============================== 5. TẦNG 2: MARKET VALUATION ENGINE ============================== */}
            <MarketValuationCard market={marketValuation} measured={measured} />

            {/* ============================== 6. TOP OPPORTUNITIES ============================== */}
            <TopOpportunitiesCard stocks={analyzedStocks} onSelectStock={handleSelectStock} measured={measured} />

            {/* ============================== 7. TẦNG 3: STOCK VALUATION & DISCOUNT ENGINE TABLE ============================== */}
            <StockTableCard stocks={analyzedStocks} onSelectStock={handleSelectStock} measured={measured} />

            {/* ============================== 8. QUY TẮC 20% TIỀN MẶT & TACTICAL PROFIT ============================== */}
            <div className="grid grid-cols-1 gap-5">
                <CashReserveCard
                    cashReserve={cashReserve}
                    economicScore={economicScore}
                    marketDiscountScore={marketValuation.marketDiscountScore}
                    measured={measured}
                />
                <TacticalProfitTakingCard />
            </div>

            {/* ============================== 9. AI STRATEGIC REPORT ============================== */}
            <div className={card}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                            🤖 Báo Cáo Chiến Lược Đầu Tư (Investment Engine Report)
                        </span>
                    </div>
                    <span className="text-xs text-gray-500">
                        {aiLoading ? 'Đang cập nhật…' : measured ? 'Chẩn đoán định lượng tự động' : 'Chờ khởi chạy'}
                    </span>
                </div>
                <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-gray-300">
                    {!measured && !aiText ? (
                        <div className="py-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 text-xl">
                                ⚡
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1">Hệ thống chưa chạy đánh giá chu kỳ</h4>
                            <p className="text-xs text-gray-400 max-w-md mx-auto mb-4 leading-relaxed">
                                Nhấn nút <strong className="text-cyan-300">"RUN INVESTMENT CYCLE ENGINE"</strong> phía trên để 9Router tự động cập nhật số liệu vĩ mô, định giá VN-Index và tính toán chiết khấu 12 cổ phiếu trọng tâm.
                            </p>
                            <button
                                type="button"
                                onClick={runInvestmentEngine}
                                disabled={aiLoading}
                                className="px-4 py-2 rounded-lg text-xs font-bold text-[#041014] bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-95 transition cursor-pointer"
                            >
                                ✨ Chạy Đánh Giá Ngay
                            </button>
                        </div>
                    ) : (
                        renderMarkdown(aiText || generateInternalAnalysis())
                    )}
                </div>
            </div>

            {/* ============================== 10. HISTORY ============================== */}
            {history.length > 0 && (
                <div className={card}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-300">Lịch Sử Đo ({history.length})</h3>
                        <button
                            type="button"
                            onClick={clearHistory}
                            className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                        >
                            Xóa lịch sử
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                        {history.map((h, idx) => (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (h.macroValues) setMacroValues(h.macroValues);
                                    setMeasured(true);
                                }}
                                className="p-2.5 rounded-lg bg-[#0D131F] border border-[#1F2937] hover:border-cyan-800 transition text-xs flex flex-col justify-between cursor-pointer"
                                title="Nhấn để tải lại phiên đo này"
                            >
                                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                                    <span>{h.time}</span>
                                    <span className="text-emerald-400 font-bold" style={{ fontFamily: MONO }}>
                                        {h.economicScore}đ
                                    </span>
                                </div>
                                <div className="text-gray-200 mt-1 truncate font-medium">
                                    {h.economicZone}
                                </div>
                                {h.topStockSymbol && (
                                    <div className="text-[10px] text-cyan-300 mt-1">
                                        Top mã: {h.topStockSymbol} ({h.topStockScore}đ)
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============================== 11. STOCK DETAIL DRAWER ============================== */}
            <StockDetailDrawer
                stock={selectedStock}
                open={drawerOpen}
                onClose={handleCloseDrawer}
            />
        </div>
    );
}
