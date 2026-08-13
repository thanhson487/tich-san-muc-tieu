"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Button, Card, Divider, Input,  Tag, Tabs, Modal, Checkbox, message } from "antd";
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

// Bonus 20%
function computeBase(b1, b2, b3, eb, es, lot) {
  const so = lot * 100 + 1;
  const range3 = (b3 - so) / lot / 100;
  
  const m1sl = eb - (b1 - so) / lot / 100;
  const m2sl = es + (b2 - so) / lot / 100;
  
  const m3b_setup = m1sl + 0.9;
  const m3b_sl = m3b_setup - range3;
  const m3b_tp = m2sl - 0.9;
  
  const m3s_setup = m2sl - 0.9;
  const m3s_sl = m3s_setup + range3;
  const m3s_tp = m1sl + 0.9;
  
  const m1tp = m3s_sl - 0.9;
  const m2tp = m3b_sl + 0.9;

  return {
    range3,
    m1sl,
    m2sl,
    m1tp,
    m2tp,
    m3b: { setup: m3b_setup, sl: m3b_sl, tp: m3b_tp },
    m3s: { setup: m3s_setup, sl: m3s_sl, tp: m3s_tp },
  };
}

function computeFinal(base, m3Match, actM3) {
  const { range3 } = base;
  let m3_setup;
  let m3_sl;
  let m3_tp;

  if (m3Match === "buy") {
    m3_setup = actM3 > 0 ? actM3 : base.m3b.setup;
    m3_sl = m3_setup - range3;
    m3_tp = base.m3b.tp;
  } else {
    m3_setup = actM3 > 0 ? actM3 : base.m3s.setup;
    m3_sl = m3_setup + range3;
    m3_tp = base.m3s.tp;
  }
  
  let m1tp = (m3Match === "sell" ? m3_sl : base.m3s.sl) - 0.9;
  let m2tp = (m3Match === "buy" ? m3_sl : base.m3b.sl) + 0.9;

  const adjusted = actM3 > 0;
  return {
    m3_setup,
    m3_sl,
    m3_tp,
    m1tp,
    m2tp,
    adjusted,
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

const ActualEntryZone = ({ visible, value, onChange }) => {
  if (!visible) return null;
  return (
    <div className="mt-2 p-2 rounded border border-yellow-700 bg-[#0e0a00]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-500">⚠</span>
        <span className="text-[10px] tracking-wider text-yellow-700">
          ENTRY THỰC TẾ (TRƯỢT GIÁ)
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

const Page = () => {
  const PROFILE_LIST_KEY = "tradeProfilesList";
  const ACTIVE_PROFILE_KEY = "tradeActiveProfileId";
  const [profiles, setProfiles] = useState([{ id: "default", name: "Profile 1" }]);
  const [activeProfileId, setActiveProfileId] = useState("default");
  const [profilesHydrated, setProfilesHydrated] = useState(false);
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

  const STORAGE_KEY = `tradeToolState:${activeProfileId}`;

  const clearAll = useCallback(() => {
    setB1("");
    setB2("");
    setB3("");
    setEb("");
    setEs("");
    setBase(null);
    setM3(null);
    setActM3("");
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch { }
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PROFILE_LIST_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length) {
          setProfiles(list);
          const activeRaw = localStorage.getItem(ACTIVE_PROFILE_KEY);
          const fallbackId = list[0].id;
          const initialId =
            typeof activeRaw === "string" && list.some((p) => p.id === activeRaw)
              ? activeRaw
              : fallbackId;
          setActiveProfileId(initialId);
          setProfilesHydrated(true);
        }
      } else {
        localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(profiles));
        localStorage.setItem(ACTIVE_PROFILE_KEY, "default");
        setProfilesHydrated(true);
      }
    } catch { }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!isAuthed || !userId) return;
    (async () => {
      try {
        const items = await fbGetTradeProfiles(userId);
        if (Array.isArray(items) && items.length) {
          const list = items.map((it) => ({ id: it.id, name: it.name || it.id }));
          setProfiles(list);
          const activeRaw = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_PROFILE_KEY) : null;
          const keepId = activeRaw && list.some((p) => p.id === activeRaw) ? activeRaw : list[0].id;
          setActiveProfileId(keepId);
          if (typeof window !== "undefined") {
            localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list));
            localStorage.setItem(ACTIVE_PROFILE_KEY, keepId);
            items.forEach((it) => {
              localStorage.setItem(`tradeToolState:${it.id}`, JSON.stringify(it.state || {}));
            });
            if (keepId === activeProfileId) {
              const raw2 = localStorage.getItem(`tradeToolState:${keepId}`);
              if (raw2) {
                try {
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
                } catch {}
              }
            }
          }
        }
      } catch {}
    })();
  }, [isAuthed, userId]);

  useEffect(() => {
    if (!profilesHydrated || !isAuthed || !userId) return;
    (async () => {
      try {
        const items = await fbGetTradeProfiles(userId);
        if (Array.isArray(items) && items.length) {
          const list = items.map((it) => ({ id: it.id, name: it.name || it.id }));
          setProfiles(list);
          const activeRaw = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_PROFILE_KEY) : null;
          const keepId = activeRaw && list.some((p) => p.id === activeRaw) ? activeRaw : list[0].id;
          setActiveProfileId(keepId);
          if (typeof window !== "undefined") {
            localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list));
            localStorage.setItem(ACTIVE_PROFILE_KEY, keepId);
            items.forEach((it) => {
              localStorage.setItem(`tradeToolState:${it.id}`, JSON.stringify(it.state || {}));
            });
          }
        }
      } catch {}
    })();
  }, [profilesHydrated, isAuthed, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!profilesHydrated) return;
    try {
      localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(profiles));
    } catch { }
  }, [profiles, profilesHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
    } catch { }
  }, [activeProfileId]);

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
          nextActive = next[0]?.id || "default";
          setActiveProfileId(nextActive);
        }
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(next));
            localStorage.setItem(ACTIVE_PROFILE_KEY, nextActive);
            localStorage.removeItem(`tradeToolState:${id}`);
          } catch { }
        }
        if (isAuthed && userId) {
          try {
            fbDeleteTradeProfile(userId, id);
          } catch {}
        }
      },
    });
  };

  const doCalc = useCallback(() => {
    const r = computeBase(pf(b1), pf(b2), pf(b3), pf(eb), pf(es), pf(lot));
    setBase(r);
    setM3(null);
    setActM3("");
    if (typeof window !== "undefined") {
      try {
        const data = {
          b1,
          b2,
          b3,
          eb,
          es,
          lot,
          base: r,
          m3: null,
          actM3: ""
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch { }
    }
  }, [b1, b2, b3, eb, es, lot, STORAGE_KEY]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setB1("");
        setB2("");
        setB3("");
        setEb("");
        setEs("");
        setLot("0.07");
        setBase(null);
        setM3(null);
        setActM3("");
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
  }, [STORAGE_KEY]);

  // Không tự tính toán khi F5; chỉ hiển thị nếu đã có base trong localStorage

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasInputs =
      (b1 && b1.trim().length) ||
      (b2 && b2.trim().length) ||
      (b3 && b3.trim().length) ||
      (eb && eb.trim().length) ||
      (es && es.trim().length);
    if (!hasInputs && !base) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      const data = {
        b1: prev.b1 ?? b1,
        b2: prev.b2 ?? b2,
        b3: prev.b3 ?? b3,
        eb: prev.eb ?? eb,
        es: prev.es ?? es,
        lot: prev.lot ?? lot,
        base,
        m3,
        actM3
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { }
  }, [base, m3, actM3, b1, b2, b3, eb, es, lot]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasInputs =
      (b1 && b1.trim().length) ||
      (b2 && b2.trim().length) ||
      (b3 && b3.trim().length) ||
      (eb && eb.trim().length) ||
      (es && es.trim().length);
    if (!hasInputs) return;
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
        lot
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { }
  }, [b1, b2, b3, eb, es, lot]);

  const tickM3 = useCallback((type) => {
    setM3((prev) => {
      const wantUntick = prev === type;
      const next = wantUntick ? null : type;
      setActM3("");
      const hasInputs =
        (b1 && b1.trim().length) ||
        (b2 && b2.trim().length) ||
        (b3 && b3.trim().length) ||
        (eb && eb.trim().length) ||
        (es && es.trim().length);
      if (hasInputs && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const prevData = raw ? JSON.parse(raw) : {};
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              ...prevData,
              m3: next,
              actM3: ""
            })
          );
        } catch { }
      }
      return next;
    });
  }, [STORAGE_KEY, b1, b2, b3, eb, es]);

  const onActM3Change = (val) => {
    setActM3(val);
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const prevData = raw ? JSON.parse(raw) : {};
        const data = { ...prevData, actM3: val };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
    }
  };

  const syncAll = async () => {
    if (!isAuthed || !userId) {
      message.error("Chưa đăng nhập");
      return;
    }
    try {
      const localIds = profiles.map((p) => p.id);
      const ops = profiles.map((p) => {
        const raw = typeof window !== "undefined" ? localStorage.getItem(`tradeToolState:${p.id}`) : null;
        const state = raw ? JSON.parse(raw) : {};
        return fbUpsertTradeProfile(userId, { id: p.id, name: p.name, state });
      });
      const remote = await fbGetTradeProfiles(userId);
      const toDelete = (remote || []).filter((r) => !localIds.includes(r.id));
      for (const r of toDelete) {
        await fbDeleteTradeProfile(userId, r.id);
      }
      await Promise.all(ops);
      message.success("Đồng bộ thành công");
    } catch {
      message.error("Đồng bộ thất bại");
    }
  };

  let disp = null;
  if (base) {
    if (m3) {
      disp = computeFinal(
        base,
        m3,
        pf(actM3)
      );
    } else {
      disp = {
        m3_setup: null,
        m3_sl: null,
        m3_tp: null,
        m1tp: base.m1tp,
        m2tp: base.m2tp,
        adjusted: false,
      };
    }
  }

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4">
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
          <Modal
            title="Sửa tên profile"
            open={renameOpen}
            onOk={confirmRenameProfile}
            onCancel={() => { setRenameOpen(false); setRenameTargetId(null); }}
            centered
          >
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          </Modal>
          <div className="flex justify-end">
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
            </div>
          </div>
        </div>
        <div className="text-center mb-4">
          <div className="text-blue-200 tracking-widest text-xs">◈ ◈ ◈</div>
          <div className="text-blue-100 font-bold tracking-widest">BONUS FOREX TOOL</div>
          <div className="text-blue-300 tracking-widest text-[10px]">BY TRAN DUC TOAN</div>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs tracking-widest text-blue-500">▸ BƯỚC 1 — SỐ DƯ 3 MÁY</div>
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
            <Card className="mb-3" bodyStyle={{ padding: 12 }}>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-bold text-blue-200">MÁY 1</div>
                <Tag color="green">BUY</Tag>
              </div>
              <DataRow label="SL" value={base.m1sl} type="sl" />
              <DataRow label="TP" value={disp.m1tp} type="tp" adjBadge={disp.adjusted} />
            </Card>

            <Card className="mb-3" bodyStyle={{ padding: 12 }}>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-bold text-blue-200">MÁY 2</div>
                <Tag color="red">SELL</Tag>
              </div>
              <DataRow label="SL" value={base.m2sl} type="sl" />
              <DataRow label="TP" value={disp.m2tp} type="tp" adjBadge={disp.adjusted} />
            </Card>

            <Card className="mb-3" bodyStyle={{ padding: 12 }}>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-bold text-blue-200">MÁY 3</div>
                {!m3 && <Tag>Pending</Tag>}
                {m3 === "buy" && <Tag color="green">Khớp Buy</Tag>}
                {m3 === "sell" && <Tag color="red">Khớp Sell</Tag>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(m3 === null || m3 === "buy") && (
                  <Card size="small" bodyStyle={{ padding: 10 }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-semibold" style={{ color: "#4ade80" }}>
                        ▲ BUY LIMIT
                      </div>
                      <Checkbox
                        checked={m3 === "buy"}
                        onChange={(e) => {
                          if (e.target.checked) tickM3("buy");
                          else tickM3("buy");
                        }}
                      />
                    </div>
                    <DataRow
                      label="SETUP"
                      value={m3 === "buy" && disp.m3_setup != null ? disp.m3_setup : base.m3b.setup}
                      type="setup"
                    />
                    <DataRow
                      label="SL"
                      value={m3 === "buy" && disp.m3_sl != null ? disp.m3_sl : base.m3b.sl}
                      type="sl"
                    />
                    <DataRow
                      label="TP"
                      value={m3 === "buy" && disp.m3_tp != null ? disp.m3_tp : base.m3b.tp}
                      type="tp"
                    />
                    <ActualEntryZone visible={m3 === "buy"} value={actM3} onChange={onActM3Change} />
                  </Card>
                )}

                {(m3 === null || m3 === "sell") && (
                  <Card size="small" bodyStyle={{ padding: 10 }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-semibold" style={{ color: "#f87171" }}>
                        ▼ SELL LIMIT
                      </div>
                      <Checkbox
                        checked={m3 === "sell"}
                        onChange={(e) => {
                          if (e.target.checked) tickM3("sell");
                          else tickM3("sell");
                        }}
                      />
                    </div>
                    <DataRow
                      label="SETUP"
                      value={m3 === "sell" && disp.m3_setup != null ? disp.m3_setup : base.m3s.setup}
                      type="setup"
                    />
                    <DataRow
                      label="SL"
                      value={m3 === "sell" && disp.m3_sl != null ? disp.m3_sl : base.m3s.sl}
                      type="sl"
                    />
                    <DataRow
                      label="TP"
                      value={m3 === "sell" && disp.m3_tp != null ? disp.m3_tp : base.m3s.tp}
                      type="tp"
                    />
                    <ActualEntryZone visible={m3 === "sell"} value={actM3} onChange={onActM3Change} />
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
    </div>
  );
};

export default Page;
