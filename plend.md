# KẾ HOẠCH & ĐẶC TẢ TÍNH NĂNG: BÁO CÁO TÀI SẢN THEO THÁNG (MONTHLY ASSET TRACKER)

## 1. MỤC TIÊU & TỔNG QUAN
Xây dựng module theo dõi và báo cáo tài sản định kỳ theo tháng phục vụ chiến lược tích sản 3 lớp tài sản:
- **Tiền mặt (Cash):** Tỷ trọng mục tiêu 20% (100k/ngày).
- **Chứng chỉ quỹ (CCQ / Fund):** Tỷ trọng mục tiêu 30% (150k/ngày).
- **Cổ phiếu (Stock):** Tỷ trọng mục tiêu 50% (250k/ngày).

### Các tính năng cốt lõi:
1. **Form nhập liệu tháng:** Nhập số tiền thực tế của 3 khoản (Tiền mặt, CCQ, Cổ phiếu), tự động tính tổng tài sản trong tháng.
2. **Biểu đồ tròn (Donut/Pie Chart):** Hiển thị % cơ cấu thực tế của từng loại tài sản trong tháng mới nhất.
3. **Biểu đồ tăng trưởng (Area/Line Chart):** Trực quan hóa lộ trình tăng trưởng tổng tài sản lũy kế qua các tháng.
4. **Bảng lịch sử (History Table):** Thống kê chi tiết theo tháng, hỗ trợ cập nhật hoặc xóa dữ liệu.
5. **Đồng bộ Firebase Firestore:** Lưu trữ dữ liệu lâu dài và tự động cập nhật realtime.

---

## 2. CẤU TRÚC DỮ LIỆU FIRESTORE (`monthly_assets/{month}`)

Collection: `monthly_assets`  
Document ID: `YYYY-MM` (Ví dụ: `2026-08`)

```typescript
export interface MonthlyAssetDoc {
  month: string;           // Key dạng 'YYYY-MM' (VD: '2026-08')
  cash: number;            // Tiền mặt (VNĐ)
  fund: number;            // Chứng chỉ quỹ (VNĐ)
  stock: number;           // Cổ phiếu (VNĐ)
  total: number;           // cash + fund + stock (VNĐ)
  updatedAt: string;       // ISO Date
}
```

---

## 3. SERVICE FIRESTORE (`src/services/monthlyAssetService.ts`)

```typescript
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { MonthlyAssetDoc } from '../types';

const COLLECTION_NAME = 'monthly_assets';

/**
 * Lắng nghe danh sách tài sản theo tháng (Sắp xếp theo thứ tự thời gian tăng dần)
 */
export function subscribeMonthlyAssets(callback: (data: MonthlyAssetDoc[]) => void) {
  const q = query(collection(db, COLLECTION_NAME), orderBy('month', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map((docSnap) => docSnap.data() as MonthlyAssetDoc);
    callback(records);
  });
}

/**
 * Thêm hoặc Cập nhật dữ liệu tài sản của một tháng
 */
export async function saveMonthlyAsset(data: Omit<MonthlyAssetDoc, 'total' 'updatedAt' |>) {
  const total = (data.cash || 0) + (data.fund || 0) + (data.stock || 0);
  const payload: MonthlyAssetDoc = {
    ...data,
    total,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, COLLECTION_NAME, data.month), payload, { merge: true });
}

/**
 * Xóa bản ghi của một tháng
 */
export async function deleteMonthlyAsset(month: string) {
  await deleteDoc(doc(db, COLLECTION_NAME, month));
}
```

---

## 4. GIAO DIỆN COMPONENT CHÍNH (`src/components/MonthlyAssetTracker.tsx`)

Sử dụng **Ant Design (antd 5.x)** và **Recharts**:

```tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  InputNumber,
  DatePicker,
  Button,
  Table,
  Typography,
  Popconfirm,
  message,
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  PieChartOutlined,
  SaveOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  subscribeMonthlyAssets,
  saveMonthlyAsset,
  deleteMonthlyAsset,
} from '../services/monthlyAssetService';
import { MonthlyAssetDoc } from '../types';

const COLORS = ['#faad14', '#1677ff', '#52c41a']; // Vàng (Tiền mặt), Xanh dương (CCQ), Xanh lá (Cổ phiếu)

export const MonthlyAssetTracker: React.FC = () => {
  const [form] = Form.useForm();
  const [records, setRecords] = useState<MonthlyAssetDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Lắng nghe dữ liệu realtime từ Firestore
  useEffect(() => {
    const unsubscribe = subscribeMonthlyAssets((data) => {
      setRecords(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const latestRecord = records[records.length - 1] || {
    month: dayjs().format('YYYY-MM'),
    cash: 0,
    fund: 0,
    stock: 0,
    total: 0,
  };

  // Dữ liệu hiển thị biểu đồ tròn
  const pieData = [
    { name: 'Tiền mặt (20%)', value: latestRecord.cash },
    { name: 'Chứng chỉ quỹ (30%)', value: latestRecord.fund },
    { name: 'Cổ phiếu (50%)', value: latestRecord.stock },
  ].filter((item) => item.value > 0);

  const onFinish = async (values: any) => {
    try {
      setSubmitting(true);
      const monthStr = values.month.format('YYYY-MM');
      await saveMonthlyAsset({
        month: monthStr,
        cash: values.cash || 0,
        fund: values.fund || 0,
        stock: values.stock || 0,
      });
      message.success(`Đã lưu tài sản tháng ${monthStr}`);
      form.resetFields(['cash', 'fund', 'stock']);
    } catch (error) {
      message.error('Lỗi khi lưu dữ liệu lên Firebase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (month: string) => {
    try {
      await deleteMonthlyAsset(month);
      message.success(`Đã xóa dữ liệu tháng ${month}`);
    } catch (error) {
      message.error('Không thể xóa dữ liệu');
    }
  };

  const columns = [
    {
      title: 'Tháng',
      dataIndex: 'month',
      key: 'month',
      render: (text: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#fff' }}>{text}</span>
      ),
    },
    {
      title: 'Tiền mặt',
      dataIndex: 'cash',
      key: 'cash',
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ fontFamily: 'monospace', color: '#faad14' }}>
          {val.toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Chứng chỉ quỹ',
      dataIndex: 'fund',
      key: 'fund',
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ fontFamily: 'monospace', color: '#1677ff' }}>
          {val.toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Cổ phiếu',
      dataIndex: 'stock',
      key: 'stock',
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ fontFamily: 'monospace', color: '#52c41a' }}>
          {val.toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Tổng tài sản',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#fff', fontSize: 14 }}>
          {val.toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: MonthlyAssetDoc) => (
        <Popconfirm onConfirm="{()" title="Xóa bản ghi tháng này?"> handleDelete(record.month)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button danger icon="{<DeleteOutlined" type="text"/>} size="small" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, backgroundColor: '#0b0e14', minHeight: '100vh' }}>
      <Typography.Title '#fff', 20 color: level="{4}" marginBottom: style="{{" }}>
        Báo Cáo Tăng Trưởng Tài Sản Định Kỳ
      </Typography.Title>

      {/* Form nhập liệu nhanh */}
      <Card #1e222d', '#131722', '1px 20, backgroundColor: border: marginBottom: solid style="{{" }}>
        <Form dayjs() form="{form}" initialValues="{{" layout="inline" month: onFinish="{onFinish}" }}>
          <Form.Item '#848e9c' color: label="{<span" name="month" style="{{" }}>Tháng</span>}
            rules={[{ required: true, message: 'Chọn tháng' }]}
          >
            <DatePicker allowClear="{false}" format="YYYY-MM" picker="month"/>
          </Form.Item>
          <Form.Item '#faad14' color: label="{<span" name="cash" style="{{" }}>Tiền mặt</span>}
            rules={[{ required: true, message: 'Nhập số tiền mặt' }]}
          >
            <InputNumber 150 formatter="{(val)" placeholder="VD: 3.000.000" style="{{" width: }}> `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
          <Form.Item '#1677ff' color: label="{<span" name="fund" style="{{" }}>CCQ</span>}
            rules={[{ required: true, message: 'Nhập số tiền CCQ' }]}
          >
            <InputNumber 150 formatter="{(val)" placeholder="VD: 4.500.000" style="{{" width: }}> `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
          <Form.Item '#52c41a' color: label="{<span" name="stock" style="{{" }}>Cổ phiếu</span>}
            rules={[{ required: true, message: 'Nhập số tiền Cổ phiếu' }]}
          >
            <InputNumber 150 formatter="{(val)" placeholder="VD: 7.500.000" style="{{" width: }}> `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
          <Form.Item>
            <Button htmlType="submit" icon="{<SaveOutlined" type="primary"/>}
              loading={submitting}
            >
              Lưu dữ liệu
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Khối Biểu đồ Trực quan */}
      <Row 20 gutter="{16}" marginBottom: style="{{" }}>
        {/* Biểu đồ diện tích: Tăng trưởng tài sản */}
        <Col lg="{16}" xs="{24}">
          <Card '#fff' <span color: style="{{" title="{" }}>
                <RiseOutlined 8 marginRight: style="{{" }}/>
                Tăng trưởng tài sản qua từng tháng
              </span>
            }
            style={{ backgroundColor: '#131722', border: '1px solid #1e222d', height: 380 }}
          >
            <ResponsiveContainer height="{290}" width="100%">
              <AreaChart data="{records}">
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1677ff" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 'monospace' 12, dataKey="month" fontFamily: fontSize: stroke="#848e9c" style="{{" }}/>
                <YAxis 'monospace' 12, fontFamily: fontSize: stroke="#848e9c" style="{{" tickFormatter="{(v)" }}> `${(v / 1000000).toFixed(0)}M`}
                />
                <RechartsTooltip formatter="{(value:"> [`${Number(value).toLocaleString('vi-VN')} ₫`, 'Tổng tài sản']}
                  contentStyle={{ backgroundColor: '#1e222d', borderColor: '#2a2e39', color: '#fff' }}
                />
                <Area dataKey="total" fill="url(#colorTotal)" fillOpacity="{1}" stroke="#1677ff" type="monotone"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Biểu đồ tròn: Cơ cấu tháng mới nhất */}
        <Col lg="{8}" xs="{24}">
          <Card '#fff' <span color: style="{{" title="{" }}>
                <PieChartOutlined 8 marginRight: style="{{" }}/>
                Cơ cấu tháng mới ({latestRecord.month})
              </span>
            }
            style={{ backgroundColor: '#131722', border: '1px solid #1e222d', height: 380 }}
          >
            {pieData.length > 0 ? (
              <ResponsiveContainer height="{290}" width="100%">
                <PieChart>
                  <Pie cx="50%" cy="45%" data="{pieData}" dataKey="value" innerRadius="{55}" outerRadius="{85}" paddingAngle="{3}">
                    {pieData.map((_, index) => (
                      <Cell % COLORS.length]} fill="{COLORS[index" key="{`cell-${index}`}"/>
                    ))}
                  </Pie>
                  <RechartsTooltip formatter="{(value:"> [`${Number(value).toLocaleString('vi-VN')} ₫`, '']}
                    contentStyle={{ backgroundColor: '#1e222d', borderColor: '#2a2e39', color: '#fff' }}
                  />
                  <Legend height="{36}" verticalAlign="bottom"/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: '#848e9c', paddingTop: 100 }}>
                Chưa có dữ liệu phân bổ
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Bảng dữ liệu chi tiết */}
      <Card '#fff' <span color: style="{{" title="{" }}>
            <DollarOutlined 8 marginRight: style="{{" }}/>
            Lịch sử tổng hợp theo tháng
          </span>
        }
        style={{ backgroundColor: '#131722', border: '1px solid #1e222d' }}
      >
        <Table columns="{columns}" dataSource="{records}" loading="{loading}" pagination="{false}" rowKey="month" size="middle"/>
      </Card>
    </div>
  );
};
```