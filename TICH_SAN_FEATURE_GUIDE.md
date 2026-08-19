# 📘 TÀI LIỆU HỆ THỐNG: MODULE TÍCH SẢN & QUẢN LÝ DANH MỤC CỔ PHIẾU

> **Tài liệu hướng dẫn kiến trúc, cấu trúc dữ liệu, nghiệp vụ logic và hướng phát triển tính năng mới.**  
> *Cập nhật lần cuối: 19/08/2026*

---

## 1. 🎯 TỔNG QUAN HỆ THỐNG & TRIẾT LÝ QUẢN TRỊ

Hệ thống được thiết kế phục vụ cho chiến lược **Tích sản cổ phiếu dài hạn** dựa trên mức chiết khấu từ đỉnh chu kỳ:
1. **Quản trị vốn theo tỷ trọng (% Vốn):** Không bắt buộc theo dõi số tiền cụ thể mà giải ngân kỷ luật theo 4 tầng DCA:
   - **DCA 1:** Giải ngân **15%** vốn
   - **DCA 2:** Giải ngân **25%** vốn
   - **DCA 3:** Giải ngân **35%** vốn
   - **DCA 4:** Giải ngân **25%** vốn
2. **Chiến lược Chốt lời từng phần (% Lượng hàng):**
   - Chốt **25%**, **33%** (1/3), **50%** (1/2) hoặc **100%** (Hết).
3. **Quy tắc Năm Đỉnh (Peak Year Rule):**
   - Khi chọn xem năm hiện tại là $N$ (mặc định: `2026`), hệ thống sẽ quét giá đỉnh cao nhất đạt được trong cả năm $N - 1$ (`01/01/2025 – 31/12/2025`).
   - Mức giảm: `dropPercent = ((currentPrice - yearHigh) / yearHigh) * 100`.
   - Vùng kích hoạt tín hiệu: Mỗi mức chiết khấu được áp dụng biên độ dung sai $\pm 2\%$.

---

## 2. 🖥️ KIẾN TRÚC GIAO DIỆN (2 TABS ĐỘC LẬP)

Giao diện được phân chia thành 2 màn hình riêng biệt nhưng dùng chung dữ liệu realtime từ Firebase:

```text
/tich-san
 ├── Tab 1: 📡 Phân Tích DCA (DCA Scanner)
 └── Tab 2: 📊 Dashboard Quản Lý (Portfolio Tracker)
```

### Tab 1: Phân Tích DCA (DCA Scanner)
- **Mục đích:** Quét dữ liệu kỹ thuật toàn bộ danh mục, so sánh giá hiện tại với đỉnh năm trước ($N-1$).
- **Năm đỉnh:** Tự động cố định là năm $N-1$ (Ví dụ: Năm 2026 $\rightarrow$ Quét đỉnh năm 2025), không cần chọn thủ công.
- **Cấu trúc bảng 5 cột:**
  1. `Mã CK`: Tên mã cổ phiếu (căn trái, font-mono).
  2. `Giá hiện tại`: Định dạng `xx.xxx ₫` (font-mono, căn phải).
  3. `Đỉnh (N-1)`: Giá đỉnh cao nhất trong năm $N-1$ (font-mono, căn phải).
  4. `% Giảm từ đỉnh`: Mức chiết khấu hiện tại (màu đỏ `text-rose-400 font-mono`, căn phải).
  5. `Trạng thái tín hiệu`: Hiển thị Badge tín hiệu giải ngân (VD: `DCA 1 · 15%`, `DCA 2 · 25%` hoặc `Quan sát`).

---

### Tab 2: Dashboard Quản Lý Vị Thế (Portfolio Tracker)
- **Mục đích:** Quản lý danh mục thực tế của bạn, thao tác 1 click đánh dấu đã mua/chốt lời và xem nhật ký.
- **Quy tắc Tự động bù tầng DCA (Cascading Auto-Fill):**
  - Nếu người dùng tích chọn **`DCA 2`** $\rightarrow$ Hệ thống tự động tích luôn **`DCA 1`**.
  - Nếu người dùng tích chọn **`DCA 3`** $\rightarrow$ Hệ thống tự động tích luôn **`DCA 1`** và **`DCA 2`**.
  - Nếu người dùng tích chọn **`DCA 4`** $\rightarrow$ Hệ thống tự động tích luôn **`DCA 1`**, **`DCA 2`** và **`DCA 3`**.
- **Thanh công cụ:** Input nhập mã + nút `+ Thêm mã` (lưu Firestore) và nút `Làm mới giá`.
- **Cấu trúc bảng 5 cột:**
  1. `Mã CK`: Bấm vào để mở Popup Chi tiết vị thế & Nhật ký.
  2. `Giá hiện tại`: Định dạng `xx.xxx ₫` (font-mono, căn phải).
  3. `Đã giải ngân (DCA 1-4)`: Cụm 4 nút micro-badge `[1] [2] [3] [4]` bấm 1 click để toggle (tự động bù tầng trước).
  4. `Đã chốt lời (25% - 100%)`: Cụm 4 nút micro-badge `[25%] [33%] [50%] [100%]` bấm 1 click để toggle.
  5. `Thao tác`: 
     - **Icon Mắt (Chi tiết):** Xem chi tiết vị thế, cấu hình mức giảm, nhật ký và thực hiện Reset an toàn.
     - **Icon Thùng rác (Xóa):** Xóa mã khỏi danh mục (kèm xác nhận Popconfirm).

---

### Tab 3: Báo Cáo Tài Sản Định Kỳ (Monthly Asset Tracker)
- **Mục đích:** Theo dõi và cân bằng 3 lớp tài sản tích sản: **Tiền mặt (20%)**, **Chứng chỉ quỹ (30%)** và **Cổ phiếu (50%)**.
- **Quản lý Dòng tiền Nạp / Rút (`netFlow`):**
  - Mặc định: `+15.000.000 ₫` (500k/ngày × 30 ngày).
  - Cho phép nhập số âm khi rút vốn (VD: `-30.000.000 ₫`).
- **Công thức tính Lãi/Lỗ Đầu Tư Thực Tế (P/L Investment):**
  - $\text{P/L Investment} = (\text{Total}_T - \text{Total}_{T-1}) - \text{netFlow}_T$
  - $\text{P/L \%} = \frac{\text{P/L Investment}}{\text{Total}_{T-1} + \max(0, \text{netFlow}_T)} \times 100$
  *(Tránh hiểu nhầm bị lỗ khi thực tế rút tiền ra chi tiêu).*
- **Biểu đồ diện tích (AreaChart):** Trực quan hóa lộ trình tăng trưởng tổng tài sản qua từng tháng.
- **Biểu đồ tròn (PieChart/Donut):** Hiển thị % cơ cấu thực tế của từng loại tài sản trong tháng mới nhất.
- **Bảng Lịch sử tổng hợp:** Thống kê chi tiết từng tháng, Dòng tiền Nạp/Rút, Lãi/Lỗ đầu tư ($\pm \text{VNĐ}$ & $\%$), Ghi chú và thao tác xóa.

---

### Popup Chi Tiết Vị Thế & Nhật Ký (`StockDetailModal`)
- **Khối điều khiển Reset riêng từng mã:**
  - **`Reset DCA`**: Bỏ tích 4 ô DCA và đưa % vốn đã vào về 0% của mã đó.
  - **`Reset Chốt lời`**: Bỏ tích 4 ô Chốt lời và đưa % đã chốt về 0% của mã đó.
  - **`Reset Vòng Mới`**: Xóa sạch trạng thái DCA, Chốt lời và lịch sử vị thế của riêng mã đó để bắt đầu chu kỳ mới.
- **Khối tiến độ:** Thanh tiến độ `Vốn đã vào (DCA %)` và `Tiến độ đã chốt lời (%)`.
- **Form Ghi nhận Mua DCA:** Chọn tầng DCA (DCA 1-4) + Ghi chú $\rightarrow$ Tự động tích nút DCA tương ứng và lưu log.
- **Form Ghi nhận Chốt lời:** Chọn % chốt (25%, 33%, 50%, 100%) + Ghi chú $\rightarrow$ Tự động tích nút Chốt lời tương ứng và lưu log.
- **Bảng Nhật ký (Logs):** Hiển thị `Thời gian`, `Hành động`, `Tỷ trọng (%)`, `Ghi chú` và `Nút xóa log`.

---

## 3. 🗄️ CẤU TRÚC DỮ LIỆU FIREBASE FIRESTORE

Collection: `stocks_tracker`  
Document ID: `{userId}__{SYMBOL}` (Ví dụ: `default_user__HPG`)

```typescript
export interface TransactionLog {
  id: string;                    // VD: "tx_1787112938_abc"
  date: string;                  // ISO String (VD: "2026-08-19T13:45:00.000Z")
  action: 'BUY_DCA' | 'TAKE_PROFIT';
  tier?: 'DCA 1' | 'DCA 2' | 'DCA 3' | 'DCA 4';
  price?: number;                // Tùy chọn (nếu có)
  volumePercent: number;         // % tỷ trọng (VD: 15, 25, 50...)
  note?: string;                 // Ghi chú giao dịch
}

export interface StockTrackerDoc {
  symbol: string;                // "HPG", "ACB"...
  userId?: string;               // ID người dùng (hỗ trợ multi-tenant)
  createdAt: string;
  updatedAt: string;
  
  // Cấu hình 4 mức giảm % từ đỉnh (Lưu động trên Firestore cho từng mã)
  dropLevels?: number[];         // VD: [-25, -40, -55, -65]

  // Trạng thái đã giải ngân 4 tầng DCA (true = đã mua)
  dcaFilled: {
    dca1: boolean;
    dca2: boolean;
    dca3: boolean;
    dca4: boolean;
  };

  // Trạng thái đã chốt lời 4 mức (true = đã chốt)
  tpFilled?: {
    tp25: boolean;
    tp33: boolean;
    tp50: boolean;
    tp100: boolean;
  };

  // Vị thế & Lịch sử
  position: {
    avgPrice: number;
    totalAllocatedPercent: number; // Tổng % vốn đã vào (VD: 40%)
    realizedProfitPercent: number; // Tổng % lượng hàng đã chốt (VD: 50%)
    targetProfitPercent?: number;
    logs: TransactionLog[];        // Mảng các giao dịch đã thực hiện
  };
}
```

---

## 4. ⚙️ CẤU HÌNH LOGIC NGHIỆP VỤ & TÙY CHỈNH TRỰC TIẾP TRÊN UI

### A. Cơ chế lưu trữ Động trên Firebase:
* Mỗi cổ phiếu khi tạo mới sẽ nhận mức giảm mặc định từ `DROP_LEVELS[symbol] || DEFAULT_DROP_LEVELS`.
* **Người dùng có thể tự chỉnh sửa 4 mức giảm DCA** trực tiếp trong Tab **`⚙️ Cấu hình mức giảm DCA`** của Modal Chi tiết cho từng mã:
  - Bấm nút chọn Preset nhanh: *Mặc định (-25, -40, -50, -60)*, *Bất động sản (-30, -45, -55, -65)*, *Thép (-20, -35, -50, -60)*, *Ngân hàng (-25, -40, -50, -55)* hoặc tự điền số tùy ý.
  - Bấm **"Lưu cấu hình mức giảm lên Firebase"** $\rightarrow$ Hệ thống tự động cập nhật và tính toán lại tín hiệu quét DCA theo đúng mức giảm mới!

### B. Bảng cấu hình mặc định tham khảo (`src/utils/dcaConfig.ts`):

```typescript
export const DROP_LEVELS: Record<string, number[]> = {
  DBC: [-25, -40, -55, -65], // Nông nghiệp chu kỳ
  HDG: [-30, -45, -55, -65], // Bất động sản
  IDC: [-25, -40, -55, -65], // Khu công nghiệp
  KDH: [-25, -40, -50, -60], // Bất động sản
  HPG: [-20, -35, -50, -60], // Thép / Vật liệu
  SSI: [-35, -50, -60, -65], // Chứng khoán
  VPB: [-25, -40, -50, -55], // Ngân hàng
  TCB: [-25, -40, -50, -55],
  ACB: [-25, -40, -50, -55],
  MBB: [-25, -40, -50, -55],
  REE: [-15, -25, -35, -45], // Năng lượng / Tiện ích
  FPT: [-30, -40, -45, -50], // Công nghệ
};

export const DEFAULT_DROP_LEVELS = [-25, -40, -50, -60];
export const DCA_WEIGHTS = [15, 25, 35, 25]; // DCA 1..4 tương ứng 15%, 25%, 35%, 25%
export const TOLERANCE = 2; // Biên độ ±2%
```

---

## 5. 📂 CẤU TRÚC THƯ MỤC SOURCE CODE

```text
src/
├── app/
│   ├── api/
│   │   └── stock-analysis/
│   │       └── route.ts                  # API fetch giá & tính đỉnh năm N-1 (VNDIRECT / DNSE)
│   └── tich-san/
│       ├── page.tsx                      # Entry point trang /tich-san
│       └── component/
│           ├── StockAnalyzer.tsx         # Container Navigation 2 Tabs
│           ├── stockService.ts           # Service gọi API /api/stock-analysis
│           ├── DcaScannerTab/
│           │   ├── DcaScannerView.tsx    # Giao diện chính Tab 1 (DCA Scanner)
│           │   └── PeakYearFilter.tsx    # Dropdown lọc năm đỉnh
│           └── DashboardTab/
│               ├── DashboardView.tsx     # Giao diện chính Tab 2 (Portfolio Tracker)
│               ├── AddStockInput.tsx     # Ô nhập + nút Thêm mã
│               ├── DcaCheckboxGroup.tsx  # Cụm 4 Micro-Badge DCA 1-4
│               ├── TpCheckboxGroup.tsx   # Cụm 4 Micro-Badge Chốt lời 25-100%
│               └── StockDetailModal.tsx  # Popup quản lý vị thế & nhật ký giao dịch
├── services/
│   └── stockFirebaseService.ts           # CRUD Firestore collection `stocks_tracker`
└── utils/
    ├── dcaConfig.ts                      # Cấu hình mức chiết khấu & tỷ trọng
    └── dcaCalculation.ts                 # Hàm tính tín hiệu DCA & xử lý chống lặp
```

---

## 6. 🚀 HƯỚNG DẪN DÀNH CHO LẬP TRÌNH VIÊN PHÁT TRIỂN TÍNH NĂNG MỚI

### A. Thêm mã cổ phiếu mới với cấu hình mức giảm riêng:
1. Mở file [src/utils/dcaConfig.ts](file:///d:/my%20app/quan-ly-tai-san/src/utils/dcaConfig.ts).
2. Bổ sung mã và 4 mức giảm vào object `DROP_LEVELS`:
   ```typescript
   MWG: [-25, -40, -50, -60],
   VCI: [-30, -45, -55, -65],
   ```

### B. Tích hợp Thông báo Cảnh báo Tự động (Telegram / Zalo Webhook):
1. Có thể tạo một API Route mới: `src/app/api/cron/check-dca-alerts/route.ts`.
2. Lặp qua danh sách cổ phiếu trong `stocks_tracker`, tính toán tín hiệu qua `getDcaScannerSignal(...)`.
3. Nếu phát hiện mã vừa chạm vùng DCA và `dcaFilled` là `false` $\rightarrow$ Gửi tin nhắn qua Telegram Bot API.

### C. Xuất Nhật Ký Giao Dịch ra Excel / CSV:
1. Dùng thư viện `xlsx` hoặc hàm tạo blob CSV từ mảng `position.logs` trong `StockTrackerDoc`.
2. Thêm nút "Xuất Excel" vào `StockDetailModal.tsx` để người dùng tải về báo cáo giao dịch.
