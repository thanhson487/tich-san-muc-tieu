'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Table, Card, Typography, Statistic, Button, Modal, InputNumber, DatePicker, Popconfirm, message, Select, Input } from 'antd';
import { Line } from '@ant-design/plots';
import { useSavingsStore } from '@/store/useSavingsStore';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/useAuthStore';

const { Title } = Typography;

const HistoryTable: React.FC = () => {
  const { transactions, fetchTransactions, isLoading, updateTransaction, deleteTransaction } = useSavingsStore();
  const [editing, setEditing] = useState<{ id: number | string; amount: number; date: string } | null>(null);
  const { isAuthed, login } = useAuthStore();
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(transactions.map(t => dayjs(t.date).year())));
    return years.sort((a, b) => b - a);
  }, [transactions]);
  const yearTransactions = useMemo(() => {
    return transactions.filter(t => dayjs(t.date).year() === selectedYear);
  }, [transactions, selectedYear]);
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    yearTransactions.forEach(t => {
      const key = dayjs(t.date).format('YYYY-MM');
      map.set(key, (map.get(key) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));
  }, [yearTransactions]);

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      responsive: ['xs', 'sm', 'md', 'lg'],
      render: (text: string) => dayjs(text).format('DD/MM/YYYY'),
      sorter: (a: any, b: any) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Số tiền (VND)',
      dataIndex: 'amount',
      key: 'amount',
       responsive: ['xs', 'sm', 'md', 'lg'],
      render: (value: number) => (
        <span className="font-semibold text-green-600">
          {value.toLocaleString()}
        </span>
      ),
    },
    {
        title: 'Thời gian tạo',
        dataIndex: 'createdAt',
        key: 'createdAt',
        responsive: ['md', 'lg'],
        render: (ts: number) => dayjs(ts).format('HH:mm:ss'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <Button
            size="small"
            onClick={() => {
              if (!record.id) return;
              if (!isAuthed) {
                setLoginOpen(true);
                return;
              }
              setEditing({ id: record.id, amount: record.amount, date: record.date });
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xoá giao dịch?"
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={async () => {
              if (!record.id) return;
              if (!isAuthed) {
                setLoginOpen(true);
                return;
              }
              await deleteTransaction(record.id);
              message.success('Đã xoá giao dịch');
            }}
          >
            <Button danger size="small">Xoá</Button>
          </Popconfirm>
        </div>
      ),
    }
  ];

  const totalSaved = useMemo(() => {
    return yearTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Title level={4} className="bg-gradient-to-r from-fuchsia-600 to-sky-500 bg-clip-text text-transparent">Chi tiết theo năm</Title>
        <div className="flex items-center gap-2">
          <span>Năm</span>
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            className="w-24 sm:w-28 md:w-32"
            options={availableYears.map(y => ({ label: String(y), value: y }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Statistic
            title={`Tổng tích lũy năm ${selectedYear}`}
            value={totalSaved}
            precision={0}
            suffix="VND"
      
          />
        </Card>
        <Card className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          <Statistic
            title={`Số ngày đã tích năm ${selectedYear}`}
            value={new Set(yearTransactions.map(t => t.date)).size}
            suffix="ngày"
          />
        </Card>
      </div>
      <Card className="mt-4">
        <Title level={5}>Biểu đồ đường theo tháng năm {selectedYear}</Title>
        <Line
          data={monthlyData}
          xField="month"
          yField="amount"
          smooth
          autoFit
          point={{ size: 4, shape: 'circle' }}
          tooltip={{ showMarkers: true }}
          xAxis={{ label: { autoHide: true, autoRotate: true } }}
          yAxis={{ labelFormatter: (v: any) => Number(v).toLocaleString() }}
          color="#6366f1"
        />
      </Card>

      <Card title="Chi tiết giao dịch">
        <Table
          size="small"
          dataSource={yearTransactions}
          columns={columns}
          rowKey={(record) => record.id || record.createdAt}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
        />
      </Card>
      
      <Modal
        open={!!editing}
        title="Sửa giao dịch"
        centered
        onCancel={() => setEditing(null)}
        onOk={async () => {
          if (!editing) return;
          await updateTransaction(editing.id, { amount: editing.amount, date: editing.date });
          setEditing(null);
          message.success('Đã cập nhật giao dịch');
        }}
        okText="Lưu"
        cancelText="Huỷ"
      >
        {editing && (
          <div className="flex flex-col gap-3">
            <DatePicker
              value={dayjs(editing.date)}
              onChange={(v) => v && setEditing({ ...editing, date: v.format('YYYY-MM-DD') })}
              allowClear={false}
            />
            <InputNumber
              value={editing.amount}
              onChange={(v) => v !== null && setEditing({ ...editing, amount: v })}
              min={0}
              formatter={(value) => `${value} VND`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\s?VND|(,*)/g, '') as unknown as number}
              style={{ width: 200 }}
            />
          </div>
        )}
      </Modal>
      
      <Modal
        open={loginOpen}
        title="Đăng nhập"
        centered
        onCancel={() => setLoginOpen(false)}
        onOk={() => {
          const ok = login(username, password);
          if (ok) {
            setLoginOpen(false);
            message.success('Đăng nhập thành công');
          } else {
            message.error('Sai tài khoản hoặc mật khẩu');
          }
        }}
        okText="Đăng nhập"
        cancelText="Huỷ"
      >
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Tài khoản"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input.Password
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default HistoryTable;
