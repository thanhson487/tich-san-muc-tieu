"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Button, Card, Divider, Input, Tag, Tabs, Modal, Checkbox, message, Popover } from "antd";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";
import { fbUpsertTradeProfile, fbGetTradeProfiles, fbDeleteTradeProfile } from "@/utils/firebaseDb";

const fmt = (n) => (isNaN(n) || !isFinite(n) ? "—" : n.toFixed(2));
const pf = (s) => {
  const n = parseFloat(s);
  return !isNaN(n) && n > 0 ? n : 0;
};

const numOnly = (s) => String(s || "").replace(/[^\d]/g, "");
const decOnly = (s) =>
  String(s || "")
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*?)\..*/g, "$1");

// Bonus 50% — 3 MÁY
function computeBase50(b1, b2, b3, eb, es, lot) {
  const so = lot * 100 + 1;
  const range3 = (b3 - so) / lot / 100;
  const m1sl = eb - (b1 - so + 1) / (lot - 0.01) / 100;
  const m2sl = es + (b2 - so) / lot / 100;
  const m3b_setup = m1sl + 0.9;
  const m3b_sl = m3b_setup - range3;
  const m3s_setup = m2sl - 0.9;
  const m3s_sl = m3s_setup + range3;
  return {
    range3,
    m1sl,
    m2sl,
    m3b: { setup: m3b_setup, sl: m3b_sl },
    m3s: { setup: m3s_setup, sl: m3s_sl },
  };
}

// Compute Final cho 3 MÁY
function computeFinal(base, m3Match, actM3) {
  const { range3 } = base;
  let m3_setup;
  let m3_sl;

  if (m3Match === "buy") {
    m3_setup = actM3 > 0 ? actM3 : base.m3b.setup;
    m3_sl = m3_setup - range3;
    return {
      m3_setup,
      m3_sl,
      adjusted: actM3 > 0,
    };
  } else if (m3Match === "sell") {
    m3_setup = actM3 > 0 ? actM3 : base.m3s.setup;
    m3_sl = m3_setup + range3;
    return {
      m3_setup,
      m3_sl,
      adjusted: actM3 > 0,
    };
  }
  return {
    m3_setup: null,
    m3_sl: null,
    adjusted: false,
  };
}

const DataRow = ({ label, value, type, adjBadge }) => {
  const color =
    type === "sl" ? "#f87171" : type === "tp" ? "#4ade80" : "#fbbf24";
  return (
    <div className="flex justify-between items-center mb-1">
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-wide text-blue-400">{label}</span>
        {adjBadge && (
          <Tag color="green" className="text-[10px] px-1">
            ĐÃ ĐIỀU CHỈNH
          </Tag>
        )}
      </div>
      <span style={{ color }} className="font-bold tracking-wide">
        {fmt(value)}
      </span>
    </div>
  );
};

const ActualEntryZone = ({ visible, value, onChange, label }) => {
  if (!visible) return null;
  return (
    <div className="mt-2 p-2 rounded border border-yellow-700 bg-[#0e0a00]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-500">⚠</span>
        <span className="text-[10px] tracking-wider text-yellow-700">
          {label || "ENTRY THỰC TẾ (TRƯỢT GIÁ)"}
        </span>
      </div>
      <Input
        value={value}
        inputMode="decimal"
        pattern="^[0-9]*[.]?[0-9]*$"
        onChange={(e) => onChange(decOnly(e.target.value))}
        placeholder="Nhập entry thực tế..."
      />
      <div className="text-[10px] text-yellow-700 mt-1 italic">
        Để trống = dùng setup mặc định
      </div>
    </div>
  );
};

// Notification cho 3 máy
const Machine3Notification = ({ m3, base, disp, actM3 }) => {
  if (!m3 || !base || !disp) return null;
  const hasActualEntry = actM3 && pf(actM3) > 0;
  const entryValue = hasActualEntry ? fmt(pf(actM3)) : null;

  if (m3 === "buy") {
    return (
      <div className="mt-3 p-3 rounded border border-green-500 bg-green-900/20">
        <div className="text-green-400 text-xs font-bold mb-2">
          {hasActualEntry
            ? `🔄 ĐÃ CẬP NHẬT ENTRY THỰC TẾ MÁY 3 BUY (${entryValue})`
            : "✅ ĐÃ KÍCH HOẠT BUY LIMIT MÁY 3"}
        </div>
        <div className="text-xs text-gray-300 space-y-1">
          <div>• Đã xóa lệnh Sell Limit máy 3</div>
          <div className="mt-1 font-semibold text-green-300">📊 MÁY 3 (BUY LIMIT):</div>
          <div className="pl-2">- SETUP: <span className="text-yellow-400">{fmt(disp.m3_setup)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- SL: <span className="text-red-400">{fmt(disp.m3_sl)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(base.m2sl - 0.9)}</span></div>
          <div className="mt-1 font-semibold text-red-300">📊 MÁY 2 (SELL):</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m3_sl + 0.9)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 text-yellow-500 text-[10px] italic">
            ℹ️ MÁY 1 (BUY) đã bị ẩn do đã chuyển lệnh sang MÁY 3
          </div>
        </div>
      </div>
    );
  }

  if (m3 === "sell") {
    return (
      <div className="mt-3 p-3 rounded border border-red-500 bg-red-900/20">
        <div className="text-red-400 text-xs font-bold mb-2">
          {hasActualEntry
            ? `🔄 ĐÃ CẬP NHẬT ENTRY THỰC TẾ MÁY 3 SELL (${entryValue})`
            : "✅ ĐÃ KÍCH HOẠT SELL LIMIT MÁY 3"}
        </div>
        <div className="text-xs text-gray-300 space-y-1">
          <div>• Đã xóa lệnh Buy Limit máy 3</div>
          <div className="mt-1 font-semibold text-red-300">📊 MÁY 3 (SELL LIMIT):</div>
          <div className="pl-2">- SETUP: <span className="text-yellow-400">{fmt(disp.m3_setup)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- SL: <span className="text-red-400">{fmt(disp.m3_sl)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(base.m1sl + 0.9)}</span></div>
          <div className="mt-1 font-semibold text-green-300">📊 MÁY 1 (BUY):</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m3_sl - 0.9)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 text-yellow-500 text-[10px] italic">
            ℹ️ MÁY 2 (SELL) đã bị ẩn do đã chuyển lệnh sang MÁY 3
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const Page = () => {
  const PROFILE_LIST_KEY = "tradeProfilesList";
  const ACTIVE_PROFILE_KEY = "tradeActiveProfileId";
  
  const [profiles, setProfiles] = useState([{ id: "default", name: "Profile 1" }]);
  const [activeProfileId, setActiveProfileId] = useState("default");
  
  const { isDark } = useUIStore ? useUIStore() : { isDark: false };
  const { isAuthed, userId } = useAuthStore ? useAuthStore() : { isAuthed: false, userId: null };
  
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [b3, setB3] = useState("");
  const [eb, setEb] = useState("");
  const [es, setEs] = useState("");
  const [lot, setLot] = useState("0.07");
  const [base, setBase] = useState(null);
  const [m3, setM3] = useState(null);
  const [actM3, setActM3] = useState("");
  
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTargetId, setRenameTargetId] = useState(null);
  const [stateHydrated, setStateHydrated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, setNotificationKey] = useState(0);

  const STORAGE_KEY = `tradeToolState:${activeProfileId}`;

  const clearAll = useCallback(() => {
    setB1("");
    setB2("");
    setB3("");
    setEb("");
    setEs("");
    setLot("0.07");
    setBase(null);
    setM3(null);
    setActM3("");
    setNotificationKey(prev => prev + 1);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch { }
    }
  }, [STORAGE_KEY]);

  // Load profiles từ localStorage khi mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let raw = localStorage.getItem(PROFILE_LIST_KEY);
      if (!raw) {
        // Fallback checks for previous keys
        raw = localStorage.getItem("tradeProfilesList_3M") || localStorage.getItem("tradeProfilesList_4M");
      }
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length) {
          setProfiles(list);
          const activeRaw = localStorage.getItem(ACTIVE_PROFILE_KEY) || localStorage.getItem("tradeActiveProfileId_3M");
          const fallbackId = list[0].id;
          const initialId = typeof activeRaw === "string" && list.some((p) => p.id === activeRaw) ? activeRaw : fallbackId;
          setActiveProfileId(initialId);
        }
      } else {
        localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(profiles));
        localStorage.setItem(ACTIVE_PROFILE_KEY, "default");
      }
    } catch { }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Load dữ liệu từ Firebase
  useEffect(() => {
    if (!isAuthed || !userId) return;
    (async () => {
      try {
        const items = await fbGetTradeProfiles(userId);
        if (Array.isArray(items) && items.length) {
          const list = items.map((it) => ({ 
            id: it.id, 
            name: it.name || it.id 
          }));
          if (list.length) {
            setProfiles(list);
            const activeRaw = localStorage.getItem(ACTIVE_PROFILE_KEY);
            const keepId = activeRaw && list.some((p) => p.id === activeRaw) ? activeRaw : list[0].id;
            setActiveProfileId(keepId);
            localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list));
            localStorage.setItem(ACTIVE_PROFILE_KEY, keepId);
            items.forEach((it) => {
              const state = it.state?.mode3M || it.state?.mode4M || it.state || {};
              localStorage.setItem(`tradeToolState:${it.id}`, JSON.stringify(state));
            });
          }
        }
      } catch { }
    })();
  }, [isAuthed, userId]);

  // Load state khi đổi profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Fallback for old keys
        raw = localStorage.getItem(`tradeToolState:${activeProfileId}:3M`) || localStorage.getItem(`tradeToolState:${activeProfileId}:4M`);
      }
      if (!raw) {
        clearAll();
        setStateHydrated(true);
        return;
      }
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        setB1(data.b1 ?? "");
        setB2(data.b2 ?? "");
        setB3(data.b3 ?? "");
        setEb(data.eb ?? "");
        setEs(data.es ?? "");
        setLot(data.lot ?? "0.07");
        setBase(data.base ?? null);
        setM3(data.m3 ?? null);
        setActM3(data.actM3 ?? "");
      }
    } catch { }
    setStateHydrated(true);
  }, [STORAGE_KEY, activeProfileId, clearAll]);

  useEffect(() => {
    if (typeof window === "undefined" || !stateHydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      const data = {
        ...prev,
        b1,
        b2,
        b3,
        eb,
        es,
        lot,
        base,
        m3,
        actM3,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { }
  }, [STORAGE_KEY, stateHydrated, base, m3, actM3, b1, b2, b3, eb, es, lot]);

  const addProfile = () => {
    const id = `profile-${Date.now()}`;
    const name = `Profile ${profiles.length + 1}`;
    const next = [...profiles, { id, name }];
    setProfiles(next);
    setActiveProfileId(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(next));
        localStorage.setItem(ACTIVE_PROFILE_KEY, id);
      } catch { }
    }
  };

  const openRenameProfile = (id) => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return;
    setRenameTargetId(id);
    setRenameValue(target.name);
    setRenameOpen(true);
  };
  
  const confirmRenameProfile = () => {
    const val = renameValue.trim();
    if (!val) {
      setRenameOpen(false);
      setRenameTargetId(null);
      return;
    }
    const next = profiles.map((p) => (p.id === renameTargetId ? { ...p, name: val } : p));
    setProfiles(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(next));
      } catch { }
    }
    setRenameOpen(false);
    setRenameTargetId(null);
  };

  const removeProfile = (id) => {
    if (profiles.length <= 1) {
      Modal.warning({ title: "Không thể xoá", centered: true, content: "Phải có ít nhất một profile." });
      return;
    }
    Modal.confirm({
      title: "Xoá profile?",
      content: "Dữ liệu của profile này sẽ bị xoá khỏi bộ nhớ.",
      onOk: () => {
        const next = profiles.filter((p) => p.id !== id);
        setProfiles(next);
        let nextActive = activeProfileId;
        if (activeProfileId === id) {
          nextActive = next[0]?.id;
          setActiveProfileId(nextActive);
        }
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(next));
            localStorage.setItem(ACTIVE_PROFILE_KEY, nextActive);
            localStorage.removeItem(STORAGE_KEY);
          } catch { }
        }
        if (isAuthed && userId) {
          try {
            fbDeleteTradeProfile(userId, id);
          } catch { }
        }
      },
    });
  };

  const doCalc = useCallback(() => {
    const r = computeBase50(pf(b1), pf(b2), pf(b3), pf(eb), pf(es), pf(lot));
    setBase(r);
    setM3(null);
    setActM3("");
    setNotificationKey(prev => prev + 1);
  }, [b1, b2, b3, eb, es, lot]);

  const tickM3 = useCallback((type) => {
    setM3((prev) => {
      const wantUntick = prev === type;
      const next = wantUntick ? null : type;
      setActM3("");
      setNotificationKey(prevKey => prevKey + 1);
      return next;
    });
  }, []);

  const onActM3Change = (val) => {
    setActM3(val);
    setNotificationKey(prev => prev + 1);
  };

  const syncAll = async () => {
    if (!isAuthed || !userId) {
      message.error("Chưa đăng nhập");
      return;
    }
    try {
      const ops = profiles.map((p) => {
        const raw = typeof window !== "undefined" ? localStorage.getItem(`tradeToolState:${p.id}`) : null;
        const state = raw ? JSON.parse(raw) : {};
        return fbUpsertTradeProfile(userId, { id: p.id, name: p.name, state });
      });
      const remote = await fbGetTradeProfiles(userId);
      const toDelete = (remote || []).filter((r) => !profiles.some(p => p.id === r.id));
      for (const r of toDelete) {
        await fbDeleteTradeProfile(userId, r.id);
      }
      await Promise.all(ops);
      message.success("Đồng bộ thành công");
    } catch {
      message.error("Đồng bộ thất bại");
    }
  };

  const refreshFromCloud = async () => {
    if (!isAuthed || !userId) {
      message.error("Chưa đăng nhập");
      return;
    }
    try {
      const items = await fbGetTradeProfiles(userId);
      if (!Array.isArray(items) || items.length === 0) {
        message.info("Không có dữ liệu trên cloud");
        return;
      }
      
      const list = items.map((it) => ({ 
        id: it.id, 
        name: it.name || it.id 
      }));
      if (list.length) {
        setProfiles(list);
        localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list));
        items.forEach((it) => {
          const state = it.state?.mode3M || it.state?.mode4M || it.state || {};
          localStorage.setItem(`tradeToolState:${it.id}`, JSON.stringify(state));
        });
      }
      
      // Reload current profile state
      const raw2 = localStorage.getItem(STORAGE_KEY);
      if (raw2) {
        const data2 = JSON.parse(raw2);
        setB1(data2.b1 ?? "");
        setB2(data2.b2 ?? "");
        setB3(data2.b3 ?? "");
        setEb(data2.eb ?? "");
        setEs(data2.es ?? "");
        setLot(data2.lot ?? "0.07");
        setBase(data2.base ?? null);
        setM3(data2.m3 ?? null);
        setActM3(data2.actM3 ?? "");
      }
      message.success("Đã lấy dữ liệu mới từ cloud");
    } catch {
      message.error("Lấy dữ liệu thất bại");
    }
  };

  let disp = null;
  if (base) {
    if (m3) {
      disp = computeFinal(base, m3, pf(actM3));
    } else {
      disp = {
        m3_setup: null,
        m3_sl: null,
        adjusted: false,
      };
    }
  }

  const hideMachine1 = m3 === "buy";
  const hideMachine2 = m3 === "sell";

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4">
        <div className="sticky top-0 z-50 pt-2" style={{ backgroundColor: isDark ? '#141414' : '#ffffff' }}>
          <div className="mb-3">
            <Tabs
              activeKey={activeProfileId}
              onChange={(key) => {
                setActiveProfileId(key);
                if (typeof window !== "undefined") {
                  try {
                    localStorage.setItem(ACTIVE_PROFILE_KEY, key);
                  } catch { }
                }
              }}
              items={profiles.map((p) => ({
                key: p.id,
                label: (
                  <div className="flex items-center gap-2">
                    <span style={{ color: isDark ? "#e5e7eb" : "#111827" }}>{p.name}</span>
                    <Button size="small" type="link" onClick={(e) => { e.stopPropagation(); openRenameProfile(p.id); }}>Sửa</Button>
                    <Button size="small" danger type="link" onClick={(e) => { e.stopPropagation(); removeProfile(p.id); }}>Xoá</Button>
                  </div>
                ),
              }))}
            />
            <div className="flex justify-end mt-2 pb-2">
              <div className="flex items-center gap-2">
                <Button size="small" onClick={addProfile}>Thêm Profile</Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={syncAll}
                  style={{ display: mounted && isAuthed ? 'inline-block' : 'none' }}
                >
                  Đồng bộ
                </Button>
                <Button
                  size="small"
                  onClick={refreshFromCloud}
                  style={{ display: mounted && isAuthed ? 'inline-block' : 'none' }}
                >
                  Làm mới
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mb-4">
          <div className="text-blue-200 tracking-widest text-xs">◈ ◈ ◈</div>
        </div>

        <Card className="mb-3">
          <div className="text-xs tracking-widest text-blue-500 mb-1">▸ CHƯƠNG TRÌNH BONUS 50%</div>
          <div className="text-[10px] text-blue-400">
            Áp dụng công thức Bonus 50% — 3 Máy (Máy 1, Máy 2, Máy 3)
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs tracking-widest text-blue-500">▸ BƯỚC 1 — SỐ DƯ MÁY</div>
            <Button danger ghost size="small" onClick={clearAll}>
              ✕ XOÁ
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-blue-500 mb-1">MÁY 1 ($)</div>
              <Input value={b1} inputMode="numeric" pattern="[0-9]*" onChange={(e) => setB1(numOnly(e.target.value))} />
            </div>
            <div>
              <div className="text-xs text-blue-500 mb-1">MÁY 2 ($)</div>
              <Input value={b2} inputMode="numeric" pattern="[0-9]*" onChange={(e) => setB2(numOnly(e.target.value))} />
            </div>
            <div>
              <div className="text-xs text-blue-500 mb-1">MÁY 3 ($)</div>
              <Input value={b3} inputMode="numeric" pattern="[0-9]*" onChange={(e) => setB3(numOnly(e.target.value))} />
            </div>
          </div>
        </Card>

        <Divider />

        <Card>
          <div className="text-xs tracking-widest text-blue-500 mb-2">▸ BƯỚC 2 — ENTRY & LOT</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-blue-500 mb-1">ENTRY BUY (MÁY 1)</div>
              <Input value={eb} inputMode="decimal" pattern="^[0-9]*[.]?[0-9]*$" onChange={(e) => setEb(decOnly(e.target.value))} />
            </div>
            <div>
              <div className="text-xs text-blue-500 mb-1">ENTRY SELL (MÁY 2)</div>
              <Input value={es} inputMode="decimal" pattern="^[0-9]*[.]?[0-9]*$" onChange={(e) => setEs(decOnly(e.target.value))} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-blue-500 mb-1">LOT SIZE</div>
            <Input value={lot} inputMode="decimal" pattern="^[0-9]*[.]?[0-9]*$" onChange={(e) => setLot(decOnly(e.target.value))} />
          </div>
        </Card>

        <Button type="primary" className="mt-3" onClick={doCalc}>
          ◈ TÍNH TOÁN
        </Button>

        {disp && base && (
          <div className="mt-4">
            {/* MÁY 1 */}
            {!hideMachine1 && (
              <Card className="mb-3" bodyStyle={{ padding: 12 }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-bold text-blue-200">MÁY 1</div>
                  <Tag color="green">BUY</Tag>
                </div>
                <DataRow label="SL" value={base.m1sl} type="sl" />
                <DataRow 
                  label="TP" 
                  value={(m3 === "sell" && disp?.m3_sl ? disp.m3_sl : base.m3s.sl) - 0.9} 
                  type="tp" 
                  adjBadge={actM3 && pf(actM3) > 0 && m3 === "sell"} 
                />
              </Card>
            )}

            {/* MÁY 2 */}
            {!hideMachine2 && (
              <Card className="mb-3" bodyStyle={{ padding: 12 }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-bold text-blue-200">MÁY 2</div>
                  <Tag color="red">SELL</Tag>
                </div>
                <DataRow label="SL" value={base.m2sl} type="sl" />
                <DataRow 
                  label="TP" 
                  value={(m3 === "buy" && disp?.m3_sl ? disp.m3_sl : base.m3b.sl) + 0.9} 
                  type="tp" 
                  adjBadge={actM3 && pf(actM3) > 0 && m3 === "buy"} 
                />
              </Card>
            )}

            {/* MÁY 3 */}
            <Card className="mb-3" bodyStyle={{ padding: 12 }}>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-bold text-blue-200 flex items-center gap-2">
                  <span>MÁY 3</span>
                  <Popover
                    trigger="click"
                    content={<Machine3Notification m3={m3} base={base} disp={disp} actM3={actM3} />}
                  >
                    <Button size="small">i</Button>
                  </Popover>
                </div>
                {!m3 && <Tag>Pending</Tag>}
                {m3 === "buy" && <Tag color="green">Khớp Buy</Tag>}
                {m3 === "sell" && <Tag color="red">Khớp Sell</Tag>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(m3 === null || m3 === "buy") && (
                  <Card size="small" bodyStyle={{ padding: 10 }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-semibold" style={{ color: "#4ade80" }}>▲ BUY LIMIT</div>
                      <Checkbox
                        checked={m3 === "buy"}
                        onChange={() => tickM3("buy")}
                      />
                    </div>
                    <DataRow label="SETUP" value={m3 === "buy" && disp.m3_setup != null ? disp.m3_setup : base.m3b.setup} type="setup" adjBadge={actM3 && pf(actM3) > 0} />
                    <DataRow label="SL" value={m3 === "buy" && disp.m3_sl != null ? disp.m3_sl : base.m3b.sl} type="sl" adjBadge={actM3 && pf(actM3) > 0} />
                    <DataRow label="TP" value={base.m2sl - 0.9} type="tp" />
                    <ActualEntryZone visible={m3 === "buy"} value={actM3} onChange={onActM3Change} label="ENTRY THỰC TẾ MÁY 3 BUY" />
                  </Card>
                )}

                {(m3 === null || m3 === "sell") && (
                  <Card size="small" bodyStyle={{ padding: 10 }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-semibold" style={{ color: "#f87171" }}>▼ SELL LIMIT</div>
                      <Checkbox
                        checked={m3 === "sell"}
                        onChange={() => tickM3("sell")}
                      />
                    </div>
                    <DataRow label="SETUP" value={m3 === "sell" && disp.m3_setup != null ? disp.m3_setup : base.m3s.setup} type="setup" adjBadge={actM3 && pf(actM3) > 0} />
                    <DataRow label="SL" value={m3 === "sell" && disp.m3_sl != null ? disp.m3_sl : base.m3s.sl} type="sl" adjBadge={actM3 && pf(actM3) > 0} />
                    <DataRow label="TP" value={base.m1sl + 0.9} type="tp" />
                    <ActualEntryZone visible={m3 === "sell"} value={actM3} onChange={onActM3Change} label="ENTRY THỰC TẾ MÁY 3 SELL" />
                  </Card>
                )}
              </div>
            </Card>

            <div className="text-center text-xs text-blue-400">
              LOT: {lot} · STOPOUT: {(pf(lot) * 100 + 1).toFixed(0)}
            </div>
          </div>
        )}
      </div>

      <Modal
        title="Sửa tên profile"
        open={renameOpen}
        onOk={confirmRenameProfile}
        onCancel={() => { setRenameOpen(false); setRenameTargetId(null); }}
        centered
      >
        <Input 
          value={renameValue} 
          onChange={(e) => setRenameValue(e.target.value)} 
          placeholder="Nhập tên mới"
        />
      </Modal>
    </div>
  );
};

export default Page;