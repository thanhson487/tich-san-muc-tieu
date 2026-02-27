"use client";
import React, { useState, useCallback, useEffect } from "react";
 import { Button, Card, Divider, Input, InputNumber, Radio, Tag, Tabs, Modal } from "antd";
import { useUIStore } from "@/store/useUIStore";

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
 
 function computeBase(b1, b2, b3, b4, eb, es, lot) {
   const so = lot * 100 + 1;
   const range3 = (b3 - so) / lot / 100;
   const range4 = (b4 - so) / lot / 100;
   const m1sl = eb - (b1 - so) / lot / 100;
   const m2sl = es + (b2 - so) / lot / 100;
   const m3b_setup = m1sl + 0.9;
   const m3b_sl = m3b_setup - range3;
   const m3s_setup = m2sl - 0.9;
   const m3s_sl = m3s_setup + range3;
   const m4d_b_setup = m3b_sl + 0.9;
   const m4d_b_sl = m4d_b_setup - range4;
   const m4d_s_setup = m3s_sl - 0.9;
   const m4d_s_sl = m4d_s_setup + range4;
   return {
     range3,
     range4,
     m1sl,
     m2sl,
     m3b: { setup: m3b_setup, sl: m3b_sl },
     m3s: { setup: m3s_setup, sl: m3s_sl },
     m4d_b: { setup: m4d_b_setup, sl: m4d_b_sl },
     m4d_s: { setup: m4d_s_setup, sl: m4d_s_sl },
   };
 }
 
 function computeFinal(base, m3Match, actM3, actM4b, actM4s) {
   const { range3, range4 } = base;
   let m3_setup;
   let m3_sl;
   if (m3Match === "buy") {
     m3_setup = actM3 > 0 ? actM3 : base.m3b.setup;
     m3_sl = m3_setup - range3;
   } else {
     m3_setup = actM3 > 0 ? actM3 : base.m3s.setup;
     m3_sl = m3_setup + range3;
   }
   let m4b_setup;
   let m4b_sl;
   let m4s_setup;
   let m4s_sl;
   if (m3Match === "buy") {
     m4b_setup = m3_sl + 0.9;
     m4b_sl = m4b_setup - range4;
     m4s_setup = base.m3s.setup;
     m4s_sl = m4s_setup + range4;
   } else {
     m4b_setup = base.m3b.setup;
     m4b_sl = m4b_setup - range4;
     m4s_setup = m3_sl - 0.9;
     m4s_sl = m4s_setup + range4;
   }
   if (actM4b > 0) {
     m4b_setup = actM4b;
     m4b_sl = actM4b - range4;
   }
   if (actM4s > 0) {
     m4s_setup = actM4s;
     m4s_sl = actM4s + range4;
   }
   const m1tp = m4s_sl - 0.9;
   const m2tp = m4b_sl + 0.9;
   const adjusted = actM3 > 0 || actM4b > 0 || actM4s > 0;
   return {
     m3_setup,
     m3_sl,
     m4b: { setup: m4b_setup, sl: m4b_sl },
     m4s: { setup: m4s_setup, sl: m4s_sl },
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
   const [b1, setB1] = useState("");
   const [b2, setB2] = useState("");
   const [b3, setB3] = useState("");
   const [b4, setB4] = useState("");
   const [eb, setEb] = useState("");
   const [es, setEs] = useState("");
   const [lot, setLot] = useState("0.05");
   const [base, setBase] = useState(null);
   const [m3, setM3] = useState(null);
   const [m4b, setM4b] = useState(false);
   const [m4s, setM4s] = useState(false);
   const [actM3, setActM3] = useState("");
   const [actM4b, setActM4b] = useState("");
   const [actM4s, setActM4s] = useState("");
 const [renameOpen, setRenameOpen] = useState(false);
 const [renameValue, setRenameValue] = useState("");
 const [renameTargetId, setRenameTargetId] = useState(null);
 
 const STORAGE_KEY = `tradeToolState:${activeProfileId}`;

 const clearAll = useCallback(() => {
     setB1("");
     setB2("");
     setB3("");
     setB4("");
     setEb("");
     setEs("");
     setBase(null);
     setM3(null);
     setM4b(false);
     setM4s(false);
     setActM3("");
     setActM4b("");
     setActM4s("");
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
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
   } catch {}
 }, []);

 useEffect(() => {
   if (typeof window === "undefined") return;
  if (!profilesHydrated) return;
   try {
     localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(profiles));
   } catch {}
}, [profiles, profilesHydrated]);

useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  } catch {}
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
    } catch {}
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
     } catch {}
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
         } catch {}
       }
     },
   });
 };
 
   const doCalc = useCallback(() => {
     const r = computeBase(
       pf(b1),
       pf(b2),
       pf(b3),
       pf(b4),
       pf(eb),
       pf(es),
       pf(lot)
     );
     setBase(r);
     setM3(null);
     setM4b(false);
     setM4s(false);
     setActM3("");
     setActM4b("");
     setActM4s("");
    if (typeof window !== "undefined") {
      try {
        const data = {
          b1,
          b2,
          b3,
          b4,
          eb,
          es,
          lot,
          base: r,
          m3: null,
          m4b: false,
          m4s: false,
          actM3: "",
          actM4b: "",
          actM4s: ""
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
    }
  }, [b1, b2, b3, b4, eb, es, lot, STORAGE_KEY]);
 
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setB1("");
        setB2("");
        setB3("");
        setB4("");
        setEb("");
        setEs("");
        setLot("0.05");
        setBase(null);
        setM3(null);
        setM4b(false);
        setM4s(false);
        setActM3("");
        setActM4b("");
        setActM4s("");
        return;
      }
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        setB1(data.b1 ?? "");
        setB2(data.b2 ?? "");
        setB3(data.b3 ?? "");
        setB4(data.b4 ?? "");
        setEb(data.eb ?? "");
        setEs(data.es ?? "");
        setLot(data.lot ?? "0.05");
        setBase(data.base ?? null);
        setM3(data.m3 ?? null);
        setM4b(!!data.m4b);
        setM4s(!!data.m4s);
        setActM3(data.actM3 ?? "");
        setActM4b(data.actM4b ?? "");
        setActM4s(data.actM4s ?? "");
      }
    } catch {}
 }, [STORAGE_KEY]);

  // Không tự tính toán khi F5; chỉ hiển thị nếu đã có base trong localStorage

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasInputs =
      (b1 && b1.trim().length) ||
      (b2 && b2.trim().length) ||
      (b3 && b3.trim().length) ||
      (b4 && b4.trim().length) ||
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
        b4: prev.b4 ?? b4,
        eb: prev.eb ?? eb,
        es: prev.es ?? es,
        lot: prev.lot ?? lot,
        base,
        m3,
        m4b,
        m4s,
        actM3,
        actM4b,
        actM4s
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [base, m3, m4b, m4s, actM3, actM4b, actM4s, b1, b2, b3, b4, eb, es, lot]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasInputs =
      (b1 && b1.trim().length) ||
      (b2 && b2.trim().length) ||
      (b3 && b3.trim().length) ||
      (b4 && b4.trim().length) ||
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
        b4,
        eb,
        es,
        lot
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [b1, b2, b3, b4, eb, es, lot]);

  const tickM3 = useCallback((type) => {
    setM3((prev) => {
      const next = prev === type ? null : type;
      setM4b(false);
      setM4s(false);
      setActM3("");
      setActM4b("");
      setActM4s("");
      const hasInputs =
        (b1 && b1.trim().length) ||
        (b2 && b2.trim().length) ||
        (b3 && b3.trim().length) ||
        (b4 && b4.trim().length) ||
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
              m4b: false,
              m4s: false,
              actM3: "",
              actM4b: "",
              actM4s: ""
            })
          );
        } catch {}
      }
      return next;
    });
  }, []);
 
   const tickM4Buy = () => {
     if (m4b) {
       setM4b(false);
       setM4s(false);
       setActM4b("");
       setActM4s("");
      const hasInputs =
        (b1 && b1.trim().length) ||
        (b2 && b2.trim().length) ||
        (b3 && b3.trim().length) ||
        (b4 && b4.trim().length) ||
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
              m4b: false,
              m4s: false,
              actM4b: "",
              actM4s: ""
            })
          );
        } catch {}
      }
     } else {
       setM4b(true);
       setM4s(false);
       setActM4s("");
      const hasInputs =
        (b1 && b1.trim().length) ||
        (b2 && b2.trim().length) ||
        (b3 && b3.trim().length) ||
        (b4 && b4.trim().length) ||
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
              m4b: true,
              m4s: false
            })
          );
        } catch {}
      }
     }
   };
 
   const tickM4Sell = () => {
     if (m4s) {
       setM4s(false);
       setM4b(false);
       setActM4s("");
       setActM4b("");
      const hasInputs =
        (b1 && b1.trim().length) ||
        (b2 && b2.trim().length) ||
        (b3 && b3.trim().length) ||
        (b4 && b4.trim().length) ||
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
              m4s: false,
              m4b: false,
              actM4s: "",
              actM4b: ""
            })
          );
        } catch {}
      }
     } else {
       setM4s(true);
       setM4b(false);
       setActM4b("");
      const hasInputs =
        (b1 && b1.trim().length) ||
        (b2 && b2.trim().length) ||
        (b3 && b3.trim().length) ||
        (b4 && b4.trim().length) ||
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
              m4s: true,
              m4b: false
            })
          );
        } catch {}
      }
     }
   };
 
   let disp = null;
   if (base) {
     if (m3) {
       const f = computeFinal(
         base,
         m3,
         pf(actM3),
         m4b ? pf(actM4b) : 0,
         m4s ? pf(actM4s) : 0
       );
       disp = f;
     } else {
       disp = {
         m3_setup: null,
         m3_sl: null,
         m4b: base.m4d_b,
         m4s: base.m4d_s,
         m1tp: base.m4d_s.sl - 0.9,
         m2tp: base.m4d_b.sl + 0.9,
         adjusted: false,
       };
     }
   }
 
   return (
     <div>

       {/* <div className="h-20"></div> */}
       <div className="max-w-4xl mx-auto px-4">
        <div className="mb-3">
          <Tabs
            activeKey={activeProfileId}
           onChange={(key) => {
             setActiveProfileId(key);
             if (typeof window !== "undefined") {
               try {
                 localStorage.setItem(ACTIVE_PROFILE_KEY, key);
               } catch {}
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
            <Button size="small" onClick={addProfile}>Thêm Profile</Button>
          </div>
        </div>
         <div className="text-center mb-4">
           <div className="text-blue-200 tracking-widest text-xs">◈ ◈ ◈</div>
           <div className="text-blue-100 font-bold tracking-widest">BONUS FOREX TOOL</div>
           <div className="text-blue-300 tracking-widest text-[10px]">BY TRAN DUC TOAN</div>
         </div>
 
         <Card>
           <div className="flex justify-between items-center mb-2">
             <div className="text-xs tracking-widest text-blue-500">▸ BƯỚC 1 — SỐ DƯ 4 MÁY</div>
             <Button danger ghost size="small" onClick={clearAll}>
               ✕ XOÁ
             </Button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
             <div>
               <div className="text-xs text-blue-500 mb-1">MÁY 4 ($)</div>
               <Input value={b4} inputMode="numeric" pattern="[0-9]*" onChange={(e) => setB4(numOnly(e.target.value))} />
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
                       <Radio checked={m3 === "buy"} onChange={() => tickM3("buy")} />
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
                     <ActualEntryZone visible={m3 === "buy"} value={actM3} onChange={setActM3} />
                   </Card>
                 )}
 
                 {(m3 === null || m3 === "sell") && (
                   <Card size="small" bodyStyle={{ padding: 10 }}>
                     <div className="flex justify-between items-center mb-2">
                       <div className="text-xs font-semibold" style={{ color: "#f87171" }}>
                         ▼ SELL LIMIT
                       </div>
                       <Radio checked={m3 === "sell"} onChange={() => tickM3("sell")} />
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
                     <ActualEntryZone visible={m3 === "sell"} value={actM3} onChange={setActM3} />
                   </Card>
                 )}
               </div>
             </Card>
 
             <Card className="mb-3" bodyStyle={{ padding: 12 }}>
               <div className="flex justify-between items-center mb-2">
                 <div className="text-sm font-bold text-blue-200">MÁY 4</div>
                 <Tag color="gold">{m3 ? "Cập nhật" : "Pending"}</Tag>
               </div>
 
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {!m4s && (
                   <Card size="small" bodyStyle={{ padding: 10 }}>
                     <div className="flex justify-between items-center mb-2">
                       <div className="text-xs font-semibold" style={{ color: "#4ade80" }}>
                         ▲ BUY LIMIT
                       </div>
                       {m3 && <Radio checked={m4b} onChange={tickM4Buy} />}
                     </div>
                     <DataRow label="SETUP" value={disp.m4b.setup} type="setup" />
                     <DataRow label="SL" value={disp.m4b.sl} type="sl" />
                     <ActualEntryZone visible={m4b} value={actM4b} onChange={setActM4b} />
                   </Card>
                 )}
 
                 {!m4b && (
                   <Card size="small" bodyStyle={{ padding: 10 }}>
                     <div className="flex justify-between items-center mb-2">
                       <div className="text-xs font-semibold" style={{ color: "#f87171" }}>
                         ▼ SELL LIMIT
                       </div>
                       {m3 && <Radio checked={m4s} onChange={tickM4Sell} />}
                     </div>
                     <DataRow label="SETUP" value={disp.m4s.setup} type="setup" />
                     <DataRow label="SL" value={disp.m4s.sl} type="sl" />
                     <ActualEntryZone visible={m4s} value={actM4s} onChange={setActM4s} />
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
