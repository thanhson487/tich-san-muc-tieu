# UI Design Document

## 1. General Layout
- **Theme**: Light mode, clean and minimal.
- **Navigation**:
    - Top Header: Logo/Title on the left.
    - Right Side Header: [Input: 300,000] [Button: Tích ngay]
    - Sub-navigation (Tabs or Links): "Lịch" (Calendar) | "Chi tiết" (History).

## 2. Components

### 2.1. Header Area
- **Container**: Flexbox, justify-between.
- **Controls**:
    - **InputNumber**: Antd component. Default value `300000`. Formatter to show currency (e.g., `300,000`).
    - **Button**: Type `primary`. Label `Tích ngay`. Icon `PlusOutlined`.

### 2.2. Calendar View (Home)
- **Component**: `antd.Calendar`.
- **Cell Render**:
    - Check if the date exists in the transaction list.
    - If yes, render a green `CheckCircleFilled` icon.
    - Optional: Show the amount saved on that day in small text.

### 2.3. History View
- **Component**: `antd.Table`.
- **Columns**:
    - **Ngày** (Date): Format DD/MM/YYYY.
    - **Số tiền** (Amount): Format currency (VND).
- **Footer**: Display "Tổng cộng: [Total Amount] VND".
