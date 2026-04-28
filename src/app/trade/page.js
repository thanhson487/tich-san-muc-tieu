"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Button, Card, Divider, Input, Tag, Tabs, Modal, Checkbox, message, Popover, Radio } from "antd";
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

// Bonus 20% - 4 MÁY
function computeBase4M(b1, b2, b3, b4, eb, es, lot) {
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

// Bonus 20% - 3 MÁY
function computeBase3M(b1, b2, b3, eb, es, lot) {
  const so = lot * 100 + 1;
  const range3 = (b3 - so) / lot / 100;
  const m1sl = eb - (b1 - so) / lot / 100;
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

// Bonus 50% — 4 MÁY
function computeBase50_4M(b1, b2, b3, b4, eb, es, lot) {
  const so = lot * 100 + 1;
  const range3 = (b3 - so) / lot / 100;
  const range4 = (b4 - so) / lot / 100;
  const m1sl = eb - (b1 - so + 1) / (lot - 0.01) / 100;
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

// Bonus 50% — 3 MÁY
function computeBase50_3M(b1, b2, b3, eb, es, lot) {
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

// Compute Final cho 4 MÁY
function computeFinal4M(base, m3Match, actM3, actM4b, actM4s) {
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

  let m3_tp;
  if (m3Match === "buy") {
    m3_tp = m4s_sl - 0.9;
  } else {
    m3_tp = m4b_sl + 0.9;
  }

  const m1tp = m4s_sl - 0.9;
  const m2tp = m4b_sl + 0.9;
  const adjusted = actM3 > 0 || actM4b > 0 || actM4s > 0;
  
  return {
    m3_setup,
    m3_sl,
    m3_tp,
    m4b: { setup: m4b_setup, sl: m4b_sl },
    m4s: { setup: m4s_setup, sl: m4s_sl },
    m1tp,
    m2tp,
    adjusted,
  };
}

// Compute Final cho 3 MÁY
function computeFinal3M(base, m3Match, actM3) {
  const { range3 } = base;
  let m3_setup;
  let m3_sl;
  let m3_tp;

  if (m3Match === "buy") {
    m3_setup = actM3 > 0 ? actM3 : base.m3b.setup;
    m3_sl = m3_setup - range3;
    m3_tp = base.m2sl + 0.9;
    return {
      m3_setup,
      m3_sl,
      m3_tp,
      adjusted: actM3 > 0,
    };
  } else {
    m3_setup = actM3 > 0 ? actM3 : base.m3s.setup;
    m3_sl = m3_setup + range3;
    m3_tp = base.m1sl - 0.9;
    return {
      m3_setup,
      m3_sl,
      m3_tp,
      adjusted: actM3 > 0,
    };
  }
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

// Notification cho 4 máy
const Machine3Notification = ({ m3, base, m4b, m4s, disp, actM3 }) => {
  if (!m3 || !base || !disp) return null;
  if(m4b || m4s) return null;
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
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m3_tp)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 font-semibold text-green-300">📊 MÁY 4 (BUY LIMIT):</div>
          <div className="pl-2">- SETUP: <span className="text-yellow-400">{fmt(disp.m4b.setup)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- SL: <span className="text-red-400">{fmt(disp.m4b.sl)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 font-semibold text-green-300">📊 MÁY 4 (SELL LIMIT):</div>
          <div className="pl-2">- SETUP: <span className="text-yellow-400">{fmt(disp.m4s.setup)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- SL: <span className="text-red-400">{fmt(disp.m4s.sl)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 font-semibold text-red-300">📊 MÁY 2 (SELL):</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m2tp)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
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
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m3_tp)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 font-semibold text-red-300">📊 MÁY 4 (BUY LIMIT):</div>
          <div className="pl-2">- SETUP: <span className="text-yellow-400">{fmt(disp.m4b.setup)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- SL: <span className="text-red-400">{fmt(disp.m4b.sl)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 font-semibold text-red-300">📊 MÁY 4 (SELL LIMIT):</div>
          <div className="pl-2">- SETUP: <span className="text-yellow-400">{fmt(disp.m4s.setup)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- SL: <span className="text-red-400">{fmt(disp.m4s.sl)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 font-semibold text-green-300">📊 MÁY 1 (BUY):</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m1tp)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
        </div>
      </div>
    );
  }

  return null;
};

// Notification cho 3 máy
const Machine3Notification3M = ({ m3, base, disp, actM3 }) => {
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
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m3_tp)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 font-semibold text-red-300">📊 MÁY 2 (SELL):</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(base.m3b.sl + 0.9)}</span></div>
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
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m3_tp)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="mt-1 font-semibold text-green-300">📊 MÁY 1 (BUY):</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(base.m3s.sl - 0.9)}</span></div>
          <div className="mt-1 text-yellow-500 text-[10px] italic">
            ℹ️ MÁY 2 (SELL) đã bị ẩn do đã chuyển lệnh sang MÁY 3
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const Machine4Notification = ({ m4b, m4s, base, disp, actM4b, actM4s, m3 }) => {
  if (!base || !disp) return null;

  if (m4b) {
    const hasActualEntry = actM4b && pf(actM4b) > 0;
    const entryValue = hasActualEntry ? fmt(pf(actM4b)) : null;
    const sellSL = m3 === "sell" ? disp.m3_sl : base.m2sl;
    const m4_tp = sellSL - 0.9;

    return (
      <div className="mt-3 p-3 rounded border border-green-500 bg-green-900/20">
        <div className="text-green-400 text-xs font-bold mb-2">
          {hasActualEntry
            ? `🔄 ĐÃ CẬP NHẬT ENTRY THỰC TẾ MÁY 4 BUY (${entryValue})`
            : "✅ ĐÃ KÍCH HOẠT BUY LIMIT MÁY 4"}
        </div>
        <div className="text-xs text-gray-300 space-y-1">
          <div>• Đã xóa lệnh Sell Limit máy 4</div>
          <div className="mt-1 font-semibold text-green-300">📊 MÁY 4 (BUY LIMIT):</div>
          <div className="pl-2">- SETUP: <span className="text-yellow-400">{fmt(disp.m4b.setup)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- SL: <span className="text-red-400">{fmt(disp.m4b.sl)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(m4_tp)}</span></div>
          <div className="mt-1 font-semibold text-green-300">📊 MÁY 2 (SELL):</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m2tp)}</span></div>
        </div>
      </div>
    );
  }

  if (m4s) {
    const hasActualEntry = actM4s && pf(actM4s) > 0;
    const entryValue = hasActualEntry ? fmt(pf(actM4s)) : null;
    const buySL = m3 === "buy" ? disp.m3_sl : base.m1sl;
    const m4_tp = buySL + 0.9;

    return (
      <div className="mt-3 p-3 rounded border border-red-500 bg-red-900/20">
        <div className="text-red-400 text-xs font-bold mb-2">
          {hasActualEntry
            ? `🔄 ĐÃ CẬP NHẬT ENTRY THỰC TẾ MÁY 4 SELL (${entryValue})`
            : "✅ ĐÃ KÍCH HOẠT SELL LIMIT MÁY 4"}
        </div>
        <div className="text-xs text-gray-300 space-y-1">
          <div>• Đã xóa lệnh Buy Limit máy 4</div>
          <div className="mt-1 font-semibold text-red-300">📊 MÁY 4 (SELL LIMIT):</div>
          <div className="pl-2">- SETUP: <span className="text-yellow-400">{fmt(disp.m4s.setup)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- SL: <span className="text-red-400">{fmt(disp.m4s.sl)}</span> {hasActualEntry && <span className="text-green-500 text-[10px]">(đã điều chỉnh)</span>}</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(m4_tp)}</span></div>
          <div className="mt-1 font-semibold text-green-300">📊 MÁY 1 (BUY):</div>
          <div className="pl-2">- TP: <span className="text-green-400">{fmt(disp.m1tp)}</span></div>
        </div>
      </div>
    );
  }

  return null;
};

const Page = () => {
  const PROFILE_LIST_KEY_4M = "tradeProfilesList_4M";
  const PROFILE_LIST_KEY_3M = "tradeProfilesList_3M";
  const ACTIVE_PROFILE_KEY_4M = "tradeActiveProfileId_4M";
  const ACTIVE_PROFILE_KEY_3M = "tradeActiveProfileId_3M";
  
  const [mode, setMode] = useState("3M");
  
  // Profile riêng cho từng mode
  const [profiles4M, setProfiles4M] = useState([{ id: "default_4M", name: "Profile 1" }]);
  const [profiles3M, setProfiles3M] = useState([{ id: "default_3M", name: "Profile 1" }]);
  const [activeProfileId4M, setActiveProfileId4M] = useState("default_4M");
  const [activeProfileId3M, setActiveProfileId3M] = useState("default_3M");
  const [profilesHydrated, setProfilesHydrated] = useState(false);
  
  const { isDark } = useUIStore ? useUIStore() : { isDark: false };
  const { isAuthed, userId } = useAuthStore ? useAuthStore() : { isAuthed: false, userId: null };
  
  // State cho 4 máy
  const [b1_4M, setB1_4M] = useState("");
  const [b2_4M, setB2_4M] = useState("");
  const [b3_4M, setB3_4M] = useState("");
  const [b4_4M, setB4_4M] = useState("");
  const [eb_4M, setEb_4M] = useState("");
  const [es_4M, setEs_4M] = useState("");
  const [lot_4M, setLot_4M] = useState("0.05");
  const [base_4M, setBase_4M] = useState(null);
  const [m3_4M, setM3_4M] = useState(null);
  const [m4b_4M, setM4b_4M] = useState(false);
  const [m4s_4M, setM4s_4M] = useState(false);
  const [actM3_4M, setActM3_4M] = useState("");
  const [actM4b_4M, setActM4b_4M] = useState("");
  const [actM4s_4M, setActM4s_4M] = useState("");
  
  // State cho 3 máy
  const [b1_3M, setB1_3M] = useState("");
  const [b2_3M, setB2_3M] = useState("");
  const [b3_3M, setB3_3M] = useState("");
  const [eb_3M, setEb_3M] = useState("");
  const [es_3M, setEs_3M] = useState("");
  const [lot_3M, setLot_3M] = useState("0.05");
  const [base_3M, setBase_3M] = useState(null);
  const [m3_3M, setM3_3M] = useState(null);
  const [actM3_3M, setActM3_3M] = useState("");
  
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTargetId, setRenameTargetId] = useState(null);
  const [bonusMode, setBonusMode] = useState("20");
  const [stateHydrated, setStateHydrated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notificationKey, setNotificationKey] = useState(0);

  // Lấy profile list và active id theo mode
  const profiles = mode === "4M" ? profiles4M : profiles3M;
  const setProfiles = mode === "4M" ? setProfiles4M : setProfiles3M;
  const activeProfileId = mode === "4M" ? activeProfileId4M : activeProfileId3M;
  const setActiveProfileId = mode === "4M" ? setActiveProfileId4M : setActiveProfileId3M;
  
  // Lấy state theo mode
  const b1 = mode === "4M" ? b1_4M : b1_3M;
  const setB1 = mode === "4M" ? setB1_4M : setB1_3M;
  const b2 = mode === "4M" ? b2_4M : b2_3M;
  const setB2 = mode === "4M" ? setB2_4M : setB2_3M;
  const b3 = mode === "4M" ? b3_4M : b3_3M;
  const setB3 = mode === "4M" ? setB3_4M : setB3_3M;
  const b4 = mode === "4M" ? b4_4M : "";
  const setB4 = mode === "4M" ? setB4_4M : () => {};
  const eb = mode === "4M" ? eb_4M : eb_3M;
  const setEb = mode === "4M" ? setEb_4M : setEb_3M;
  const es = mode === "4M" ? es_4M : es_3M;
  const setEs = mode === "4M" ? setEs_4M : setEs_3M;
  const lot = mode === "4M" ? lot_4M : lot_3M;
  const setLot = mode === "4M" ? setLot_4M : setLot_3M;
  const base = mode === "4M" ? base_4M : base_3M;
  const setBase = mode === "4M" ? setBase_4M : setBase_3M;
  const m3 = mode === "4M" ? m3_4M : m3_3M;
  const setM3 = mode === "4M" ? setM3_4M : setM3_3M;
  const m4b = mode === "4M" ? m4b_4M : false;
  const setM4b = mode === "4M" ? setM4b_4M : () => {};
  const m4s = mode === "4M" ? m4s_4M : false;
  const setM4s = mode === "4M" ? setM4s_4M : () => {};
  const actM3 = mode === "4M" ? actM3_4M : actM3_3M;
  const setActM3 = mode === "4M" ? setActM3_4M : setActM3_3M;
  const actM4b = mode === "4M" ? actM4b_4M : "";
  const setActM4b = mode === "4M" ? setActM4b_4M : () => {};
  const actM4s = mode === "4M" ? actM4s_4M : "";
  const setActM4s = mode === "4M" ? setActM4s_4M : () => {};

  const PROFILE_LIST_KEY = mode === "4M" ? PROFILE_LIST_KEY_4M : PROFILE_LIST_KEY_3M;
  const ACTIVE_PROFILE_KEY = mode === "4M" ? ACTIVE_PROFILE_KEY_4M : ACTIVE_PROFILE_KEY_3M;
  const STORAGE_KEY = `tradeToolState:${activeProfileId}:${mode}`;

  const clearAll = useCallback(() => {
    setB1("");
    setB2("");
    setB3("");
    if (mode === "4M") setB4("");
    setEb("");
    setEs("");
    setLot("0.05");
    setBase(null);
    setM3(null);
    if (mode === "4M") {
      setM4b(false);
      setM4s(false);
      setActM4b("");
      setActM4s("");
    }
    setActM3("");
    setNotificationKey(prev => prev + 1);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch { }
    }
  }, [STORAGE_KEY, mode]);

  // Load profiles từ localStorage khi mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw4M = localStorage.getItem(PROFILE_LIST_KEY_4M);
      if (raw4M) {
        const list = JSON.parse(raw4M);
        if (Array.isArray(list) && list.length) {
          setProfiles4M(list);
          const activeRaw = localStorage.getItem(ACTIVE_PROFILE_KEY_4M);
          const fallbackId = list[0].id;
          const initialId = typeof activeRaw === "string" && list.some((p) => p.id === activeRaw) ? activeRaw : fallbackId;
          setActiveProfileId4M(initialId);
        }
      } else {
        localStorage.setItem(PROFILE_LIST_KEY_4M, JSON.stringify(profiles4M));
        localStorage.setItem(ACTIVE_PROFILE_KEY_4M, "default_4M");
      }
      
      const raw3M = localStorage.getItem(PROFILE_LIST_KEY_3M);
      if (raw3M) {
        const list = JSON.parse(raw3M);
        if (Array.isArray(list) && list.length) {
          setProfiles3M(list);
          const activeRaw = localStorage.getItem(ACTIVE_PROFILE_KEY_3M);
          const fallbackId = list[0].id;
          const initialId = typeof activeRaw === "string" && list.some((p) => p.id === activeRaw) ? activeRaw : fallbackId;
          setActiveProfileId3M(initialId);
        }
      } else {
        localStorage.setItem(PROFILE_LIST_KEY_3M, JSON.stringify(profiles3M));
        localStorage.setItem(ACTIVE_PROFILE_KEY_3M, "default_3M");
      }
      setProfilesHydrated(true);
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
          // Load 4M profiles
          const list4M = items.filter(it => it.id.includes("_4M") || (!it.id.includes("_3M") && it.state?.mode4M)).map((it) => ({ 
            id: it.id.includes("_4M") ? it.id : `${it.id}_4M`, 
            name: it.name || it.id 
          }));
          if (list4M.length) {
            setProfiles4M(list4M);
            const activeRaw = localStorage.getItem(ACTIVE_PROFILE_KEY_4M);
            const keepId = activeRaw && list4M.some((p) => p.id === activeRaw) ? activeRaw : list4M[0].id;
            setActiveProfileId4M(keepId);
            localStorage.setItem(PROFILE_LIST_KEY_4M, JSON.stringify(list4M));
            localStorage.setItem(ACTIVE_PROFILE_KEY_4M, keepId);
            items.forEach((it) => {
              const id4M = it.id.includes("_4M") ? it.id : `${it.id}_4M`;
              localStorage.setItem(`tradeToolState:${id4M}:4M`, JSON.stringify(it.state?.mode4M || {}));
            });
          }
          
          // Load 3M profiles
          const list3M = items.filter(it => it.id.includes("_3M") || it.state?.mode3M).map((it) => ({ 
            id: it.id.includes("_3M") ? it.id : `${it.id}_3M`, 
            name: it.name || it.id 
          }));
          if (list3M.length) {
            setProfiles3M(list3M);
            const activeRaw = localStorage.getItem(ACTIVE_PROFILE_KEY_3M);
            const keepId = activeRaw && list3M.some((p) => p.id === activeRaw) ? activeRaw : list3M[0].id;
            setActiveProfileId3M(keepId);
            localStorage.setItem(PROFILE_LIST_KEY_3M, JSON.stringify(list3M));
            localStorage.setItem(ACTIVE_PROFILE_KEY_3M, keepId);
            items.forEach((it) => {
              const id3M = it.id.includes("_3M") ? it.id : `${it.id}_3M`;
              localStorage.setItem(`tradeToolState:${id3M}:3M`, JSON.stringify(it.state?.mode3M || {}));
            });
          }
        }
      } catch { }
    })();
  }, [isAuthed, userId]);

  // Load state khi đổi profile hoặc mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
        if (mode === "4M") setB4(data.b4 ?? "");
        setEb(data.eb ?? "");
        setEs(data.es ?? "");
        setLot(data.lot ?? "0.05");
        setBonusMode(data.bonusMode ?? "20");
        setBase(data.base ?? null);
        setM3(data.m3 ?? null);
        if (mode === "4M") {
          setM4b(!!data.m4b);
          setM4s(!!data.m4s);
          setActM4b(data.actM4b ?? "");
          setActM4s(data.actM4s ?? "");
        }
        setActM3(data.actM3 ?? "");
      }
    } catch { }
    setStateHydrated(true);
  }, [STORAGE_KEY, mode]);

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
        b4: mode === "4M" ? b4 : undefined,
        eb,
        es,
        lot,
        bonusMode,
        base,
        m3,
        m4b: mode === "4M" ? m4b : undefined,
        m4s: mode === "4M" ? m4s : undefined,
        actM3,
        actM4b: mode === "4M" ? actM4b : undefined,
        actM4s: mode === "4M" ? actM4s : undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { }
  }, [base, m3, m4b, m4s, actM3, actM4b, actM4s, b1, b2, b3, b4, eb, es, lot, bonusMode, mode]);

  const addProfile = () => {
    const suffix = mode === "4M" ? "_4M" : "_3M";
    const id = `profile-${Date.now()}${suffix}`;
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
    let r;
    if (mode === "4M") {
      r = bonusMode === "50"
        ? computeBase50_4M(pf(b1), pf(b2), pf(b3), pf(b4), pf(eb), pf(es), pf(lot))
        : computeBase4M(pf(b1), pf(b2), pf(b3), pf(b4), pf(eb), pf(es), pf(lot));
    } else {
      r = bonusMode === "50"
        ? computeBase50_3M(pf(b1), pf(b2), pf(b3), pf(eb), pf(es), pf(lot))
        : computeBase3M(pf(b1), pf(b2), pf(b3), pf(eb), pf(es), pf(lot));
    }
    setBase(r);
    setM3(null);
    if (mode === "4M") {
      setM4b(false);
      setM4s(false);
      setActM4b("");
      setActM4s("");
    }
    setActM3("");
    setNotificationKey(prev => prev + 1);
  }, [b1, b2, b3, b4, eb, es, lot, bonusMode, mode]);

  const tickM3 = useCallback((type) => {
    setM3((prev) => {
      const wantUntick = prev === type;
      if (mode === "4M" && wantUntick && (m4b || m4s)) {
        return prev;
      }
      const next = wantUntick ? null : type;
      setActM3("");
      setNotificationKey(prevKey => prevKey + 1);

      if (mode === "4M" && !wantUntick) {
        setM4b(false);
        setM4s(false);
        setActM4b("");
        setActM4s("");
      } else if (mode === "4M") {
        setM4b(false);
        setM4s(false);
        setActM4b("");
        setActM4s("");
      }
      return next;
    });
  }, [m4b, m4s, mode]);

  const tickM4Buy = () => {
    if (m4b) {
      setM4b(false);
      setM4s(false);
      setActM4b("");
      setActM4s("");
      setNotificationKey(prev => prev + 1);
    } else {
      setM4b(true);
      setM4s(false);
      setActM4s("");
      setNotificationKey(prev => prev + 1);
    }
  };

  const tickM4Sell = () => {
    if (m4s) {
      setM4s(false);
      setM4b(false);
      setActM4s("");
      setActM4b("");
      setNotificationKey(prev => prev + 1);
    } else {
      setM4s(true);
      setM4b(false);
      setActM4b("");
      setNotificationKey(prev => prev + 1);
    }
  };

  const onActM3Change = (val) => {
    setActM3(val);
    setNotificationKey(prevKey => prevKey + 1);
  };

  const onActM4bChange = (val) => {
    setActM4b(val);
    setNotificationKey(prev => prev + 1);
  };

  const onActM4sChange = (val) => {
    setActM4s(val);
    setNotificationKey(prev => prev + 1);
  };

  const syncAll = async () => {
    if (!isAuthed || !userId) {
      message.error("Chưa đăng nhập");
      return;
    }
    try {
      const allProfiles = [...profiles4M.map(p => ({ ...p, mode: "4M" })), ...profiles3M.map(p => ({ ...p, mode: "3M" }))];
      const ops = allProfiles.map((p) => {
        const raw = typeof window !== "undefined" ? localStorage.getItem(`tradeToolState:${p.id}:${p.mode}`) : null;
        const state = raw ? JSON.parse(raw) : {};
        const modeState = p.mode === "4M" ? { mode4M: state } : { mode3M: state };
        return fbUpsertTradeProfile(userId, { id: p.id, name: p.name, state: modeState });
      });
      const remote = await fbGetTradeProfiles(userId);
      const toDelete = (remote || []).filter((r) => !allProfiles.some(p => p.id === r.id));
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
      
      const list4M = items.filter(it => it.id.includes("_4M") || it.state?.mode4M).map((it) => ({ 
        id: it.id.includes("_4M") ? it.id : `${it.id}_4M`, 
        name: it.name || it.id 
      }));
      if (list4M.length) {
        setProfiles4M(list4M);
        localStorage.setItem(PROFILE_LIST_KEY_4M, JSON.stringify(list4M));
        items.forEach((it) => {
          const id4M = it.id.includes("_4M") ? it.id : `${it.id}_4M`;
          localStorage.setItem(`tradeToolState:${id4M}:4M`, JSON.stringify(it.state?.mode4M || {}));
        });
      }
      
      const list3M = items.filter(it => it.id.includes("_3M") || it.state?.mode3M).map((it) => ({ 
        id: it.id.includes("_3M") ? it.id : `${it.id}_3M`, 
        name: it.name || it.id 
      }));
      if (list3M.length) {
        setProfiles3M(list3M);
        localStorage.setItem(PROFILE_LIST_KEY_3M, JSON.stringify(list3M));
        items.forEach((it) => {
          const id3M = it.id.includes("_3M") ? it.id : `${it.id}_3M`;
          localStorage.setItem(`tradeToolState:${id3M}:3M`, JSON.stringify(it.state?.mode3M || {}));
        });
      }
      
      // Reload current mode state
      const raw2 = localStorage.getItem(STORAGE_KEY);
      if (raw2) {
        const data2 = JSON.parse(raw2);
        setB1(data2.b1 ?? "");
        setB2(data2.b2 ?? "");
        setB3(data2.b3 ?? "");
        if (mode === "4M") setB4(data2.b4 ?? "");
        setEb(data2.eb ?? "");
        setEs(data2.es ?? "");
        setLot(data2.lot ?? "0.05");
        setBonusMode(data2.bonusMode ?? "20");
        setBase(data2.base ?? null);
        setM3(data2.m3 ?? null);
        if (mode === "4M") {
          setM4b(!!data2.m4b);
          setM4s(!!data2.m4s);
          setActM4b(data2.actM4b ?? "");
          setActM4s(data2.actM4s ?? "");
        }
        setActM3(data2.actM3 ?? "");
      }
      message.success("Đã lấy dữ liệu mới từ cloud");
    } catch {
      message.error("Lấy dữ liệu thất bại");
    }
  };

  let disp = null;
  if (base) {
    if (mode === "4M") {
      if (m3) {
        const f = computeFinal4M(
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
          m3_tp: null,
          m4b: base.m4d_b,
          m4s: base.m4d_s,
          m1tp: base.m4d_s.sl - 0.9,
          m2tp: base.m4d_b.sl + 0.9,
          adjusted: false,
        };
      }
    } else {
      if (m3) {
        const f = computeFinal3M(base, m3, pf(actM3));
        disp = f;
      } else {
        disp = {
          m3_setup: null,
          m3_sl: null,
          m3_tp: null,
          adjusted: false,
        };
      }
    }
  }

  const hideMachine1 = mode === "4M" ? (m3 === "buy" || m4b) : (m3 === "buy");
  const hideMachine2 = mode === "4M" ? (m3 === "sell" || m4s) : (m3 === "sell");
  const hideMachine3Buy = mode === "4M" ? m4b : false;
  const hideMachine3Sell = mode === "4M" ? m4s : false;
  const hideMachine4Input = mode === "3M";

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
{/* 
        <Card className="mb-3">
          <div className="text-xs tracking-widest text-blue-500 mb-3">▸ CHƯƠNG TRÌNH BONUS</div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={bonusMode === "20"}
                onChange={() => { setBonusMode("20"); setBase(null); }}
              />
              <span className="text-sm font-semibold text-green-400">BONUS 20%</span>
            </label>
          </div>
          <div className="mt-2 text-[10px] text-blue-400">
            {bonusMode === "20" ? "Đang dùng: Bonus 20% — công thức gốc" : "Đang dùng: Bonus 50% — công thức SL Máy 1 đã điều chỉnh"}
          </div>
        </Card> */}
          <div className="mb-4">
            <Card size="small">
              <div className="flex justify-center gap-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                  <Radio
                    checked={mode === "3M"}
                    onChange={() => {
                      setMode("3M");
                    }}
                  />
                  <span className="font-semibold">3 MÁY (Không máy 4)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Radio
                    checked={mode === "4M"}
                    onChange={() => {
                      setMode("4M");
                    }}
                  />
                  <span className="font-semibold">4 MÁY (Có máy 4)</span>
                </label>
              
              </div>
            
            </Card>
          </div>

        <Card>
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs tracking-widest text-blue-500">▸ BƯỚC 1 — SỐ DƯ MÁY</div>
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
            {!hideMachine4Input && (
              <div>
                <div className="text-xs text-blue-500 mb-1">MÁY 4 ($)</div>
                <Input value={b4} inputMode="numeric" pattern="[0-9]*" onChange={(e) => setB4(numOnly(e.target.value))} />
              </div>
            )}
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
                {/* Chế độ 3 máy: TP = SL Sell Limit máy 3 - 0.9 */}
                {mode === "3M" && (
                  <DataRow 
                    label="TP" 
                    value={base.m3s.sl - 0.9} 
                    type="tp" 
                    adjBadge={actM3 && pf(actM3) > 0 && m3 === "sell"} 
                  />
                )}
                {mode === "4M" && disp.m1tp !== null && (
                  <DataRow label="TP" value={disp.m1tp} type="tp" adjBadge={disp.adjusted} />
                )}
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
                {/* Chế độ 3 máy: TP = SL Buy Limit máy 3 + 0.9 */}
                {mode === "3M" && (
                  <DataRow 
                    label="TP" 
                    value={base.m3b.sl + 0.9} 
                    type="tp" 
                    adjBadge={actM3 && pf(actM3) > 0 && m3 === "buy"} 
                  />
                )}
                {mode === "4M" && disp.m2tp !== null && (
                  <DataRow label="TP" value={disp.m2tp} type="tp" adjBadge={disp.adjusted} />
                )}
              </Card>
            )}

            {/* MÁY 3 */}
            <Card className="mb-3" bodyStyle={{ padding: 12 }}>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-bold text-blue-200 flex items-center gap-2">
                  <span>MÁY 3</span>
                  {mode === "4M" ? (
                    <Popover
                      trigger="click"
                      content={<Machine3Notification m3={m3} base={base} m4b={m4b} m4s={m4s} disp={disp} actM3={actM3} />}
                    >
                      <Button size="small">i</Button>
                    </Popover>
                  ) : (
                    <Popover
                      trigger="click"
                      content={<Machine3Notification3M m3={m3} base={base} disp={disp} actM3={actM3} />}
                    >
                      <Button size="small">i</Button>
                    </Popover>
                  )}
                </div>
                {!m3 && <Tag>Pending</Tag>}
                {m3 === "buy" && !hideMachine3Buy && <Tag color="green">Khớp Buy</Tag>}
                {m3 === "sell" && !hideMachine3Sell && <Tag color="red">Khớp Sell</Tag>}
                {mode === "4M" && m3 === "buy" && hideMachine3Buy && <Tag color="gold">ĐÃ BỊ KHÓA</Tag>}
                {mode === "4M" && m3 === "sell" && hideMachine3Sell && <Tag color="gold">ĐÃ BỊ KHÓA</Tag>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(m3 === null || m3 === "buy") && (mode === "3M" || !hideMachine3Buy) && (
                  <Card size="small" bodyStyle={{ padding: 10 }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-semibold" style={{ color: "#4ade80" }}>▲ BUY LIMIT</div>
                      <Checkbox
                        checked={m3 === "buy"}
                        onChange={(e) => {
                          if (e.target.checked) tickM3("buy");
                          else tickM3("buy");
                        }}
                      />
                    </div>
                    <DataRow label="SETUP" value={m3 === "buy" && disp.m3_setup != null ? disp.m3_setup : base.m3b.setup} type="setup" adjBadge={actM3 && pf(actM3) > 0} />
                    <DataRow label="SL" value={m3 === "buy" && disp.m3_sl != null ? disp.m3_sl : base.m3b.sl} type="sl" adjBadge={actM3 && pf(actM3) > 0} />
                    {m3 === "buy" && disp.m3_tp != null && (<DataRow label="TP" value={disp.m3_tp} type="tp" adjBadge={actM3 && pf(actM3) > 0} />)}
                    <ActualEntryZone visible={m3 === "buy"} value={actM3} onChange={onActM3Change} label="ENTRY THỰC TẾ MÁY 3 BUY" />
                  </Card>
                )}

                {mode === "4M" && hideMachine3Buy && (m3 === null || m3 === "buy") && (
                  <Card size="small" bodyStyle={{ padding: 10 }} className="opacity-60 bg-gray-800">
                    <div className="text-center text-yellow-500 text-xs py-4">🔒 BUY LIMIT ĐÃ BỊ KHÓA<br />Do MÁY 4 đã chọn BUY</div>
                  </Card>
                )}

                {(m3 === null || m3 === "sell") && (mode === "3M" || !hideMachine3Sell) && (
                  <Card size="small" bodyStyle={{ padding: 10 }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-semibold" style={{ color: "#f87171" }}>▼ SELL LIMIT</div>
                      <Checkbox
                        checked={m3 === "sell"}
                        onChange={(e) => {
                          if (e.target.checked) tickM3("sell");
                          else tickM3("sell");
                        }}
                      />
                    </div>
                    <DataRow label="SETUP" value={m3 === "sell" && disp.m3_setup != null ? disp.m3_setup : base.m3s.setup} type="setup" adjBadge={actM3 && pf(actM3) > 0} />
                    <DataRow label="SL" value={m3 === "sell" && disp.m3_sl != null ? disp.m3_sl : base.m3s.sl} type="sl" adjBadge={actM3 && pf(actM3) > 0} />
                    {m3 === "sell" && disp.m3_tp != null && (<DataRow label="TP" value={disp.m3_tp} type="tp" adjBadge={actM3 && pf(actM3) > 0} />)}
                    <ActualEntryZone visible={m3 === "sell"} value={actM3} onChange={onActM3Change} label="ENTRY THỰC TẾ MÁY 3 SELL" />
                  </Card>
                )}

                {mode === "4M" && hideMachine3Sell && (m3 === null || m3 === "sell") && (
                  <Card size="small" bodyStyle={{ padding: 10 }} className="opacity-60 bg-gray-800">
                    <div className="text-center text-yellow-500 text-xs py-4">🔒 SELL LIMIT ĐÃ BỊ KHÓA<br />Do MÁY 4 đã chọn SELL</div>
                  </Card>
                )}
              </div>
            </Card>

            {/* MÁY 4 */}
            {mode === "4M" && (
              <Card className="mb-3" bodyStyle={{ padding: 12 }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-bold text-blue-200 flex items-center gap-2">
                    <span>MÁY 4</span>
                    <Popover
                      trigger="click"
                      content={<Machine4Notification m4b={m4b} m4s={m4s} base={base} disp={disp} actM4b={actM4b} actM4s={actM4s} m3={m3} />}
                    >
                      <Button size="small">i</Button>
                    </Popover>
                  </div>
                  <Tag color="gold">{m3 ? "Cập nhật" : "Pending"}</Tag>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {!m4s && (
                    <Card size="small" bodyStyle={{ padding: 10 }}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs font-semibold" style={{ color: "#4ade80" }}>▲ BUY LIMIT</div>
                        {m3 && !m4s && (<Checkbox checked={m4b} onChange={() => tickM4Buy()} />)}
                      </div>
                      <DataRow label="SETUP" value={disp.m4b.setup} type="setup" adjBadge={actM4b && pf(actM4b) > 0} />
                      <DataRow label="SL" value={disp.m4b.sl} type="sl" adjBadge={actM4b && pf(actM4b) > 0} />
                      {m4b && (
                        <DataRow
                          label="TP"
                          value={(m3 === "sell" ? disp.m3_sl : base.m2sl) - 0.9}
                          type="tp"
                          adjBadge={actM4b && pf(actM4b) > 0}
                        />
                      )}
                      <ActualEntryZone visible={m4b} value={actM4b} onChange={onActM4bChange} label="ENTRY THỰC TẾ MÁY 4 BUY" />
                    </Card>
                  )}

                  {!m4b && (
                    <Card size="small" bodyStyle={{ padding: 10 }}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs font-semibold" style={{ color: "#f87171" }}>▼ SELL LIMIT</div>
                        {m3 && !m4b && (<Checkbox checked={m4s} onChange={() => tickM4Sell()} />)}
                      </div>
                      <DataRow label="SETUP" value={disp.m4s.setup} type="setup" adjBadge={actM4s && pf(actM4s) > 0} />
                      <DataRow label="SL" value={disp.m4s.sl} type="sl" adjBadge={actM4s && pf(actM4s) > 0} />
                      {m4s && (
                        <DataRow
                          label="TP"
                          value={(m3 === "buy" ? disp.m3_sl : base.m1sl) + 0.9}
                          type="tp"
                          adjBadge={actM4s && pf(actM4s) > 0}
                        />
                      )}
                      <ActualEntryZone visible={m4s} value={actM4s} onChange={onActM4sChange} label="ENTRY THỰC TẾ MÁY 4 SELL" />
                    </Card>
                  )}
                </div>
              </Card>
            )}

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