'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Card, Typography, Spin, Statistic, Button, InputNumber, Modal, Input } from 'antd';
import styled from 'styled-components';
import { Line } from '@ant-design/plots';
import type { Dayjs } from 'dayjs';
import { CheckCircleFilled } from '@ant-design/icons';
import { useSavingsStore } from '@/store/useSavingsStore';
import dayjs from 'dayjs';
import { PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/useAuthStore';

const { Title } = Typography;

const CalendarView: React.FC = () => {
  const { transactions, fetchTransactions, isLoading, setSelectedDate, addTransaction } = useSavingsStore();
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs());
  const [amount, setAmount] = useState<number | null>(310000);
  const { isAuthed, login } = useAuthStore();
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getListData = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    // Find all transactions for this date
    return transactions.filter((t) => t.date === dateStr);
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);
    
    if (listData.length === 0) return null;

    const totalAmount = listData.reduce((sum, item) => sum + item.amount, 0);

    return (
      <div className="flex flex-col items-center justify-start h-full">
        <CheckCircleFilled style={{ color: '#22c55e', fontSize: isMobile ? 14 : 20, marginTop: 2 }} />
        {!isMobile && totalAmount > 0 && (
          <span className="text-xs text-gray-500">{totalAmount.toLocaleString()}</span>
        )}
      </div>
    );
  };

  const cellRender = (current: Dayjs, info: { originNode: React.ReactNode; type: string }) => {
    if (info.type === 'date') return dateCellRender(current);
    return info.originNode;
  };

  const currentYear = dayjs().year();
  const yearTransactions = useMemo(() => {
    return transactions.filter(t => dayjs(t.date).year() === currentYear);
  }, [transactions, currentYear]);
  const totalSaved = useMemo(() => {
    return yearTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  const totalDays = useMemo(() => {
    return new Set(yearTransactions.map(t => t.date)).size;
  }, [yearTransactions]);
  
  const monthlyTotal = useMemo(() => {
    return transactions
      .filter(t => dayjs(t.date).isSame(calendarValue, 'month'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, calendarValue]);

  const monthlyDays = useMemo(() => {
    return new Set(
      transactions
        .filter(t => dayjs(t.date).isSame(calendarValue, 'month'))
        .map(t => t.date)
    ).size;
  }, [transactions, calendarValue]);
  
  const monthDailyData = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter(t => dayjs(t.date).isSame(calendarValue, 'month'))
      .forEach(t => {
        map.set(t.date, (map.get(t.date) || 0) + t.amount);
      });
    const arr = Array.from(map.entries())
      .sort((a, b) => dayjs(a[0]).unix() - dayjs(b[0]).unix())
      .map(([d, amt]) => ({ date: dayjs(d).format('DD/MM'), amount: amt }));
    return arr;
  }, [transactions, calendarValue]);
  
  const handleSave = async () => {
    if (!amount) {
      return;
    }
    if (!isAuthed) {
      setLoginOpen(true);
      return;
    }
    try {
      await addTransaction(amount);
    } catch (e: any) {
      // silent, header already shows message on failures; keep simple here
    }
  };
  
  const Controls = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    @media (min-width: 640px) {
      flex-direction: row;
    }
  `;
  const FullWidthInputNumber = styled(InputNumber)`
    width: 100% !important;
    .ant-input-number-input {
      width: 100% !important;
    }
  `;

  return (
    <Card variant="borderless" className="shadow-sm">
        <div className="mb-4">
            <Title level={4}>Lịch sử tích lũy</Title>
        </div>
        <Card className="mb-3">
          <Controls>
            <FullWidthInputNumber
              value={amount}
              onChange={setAmount}
              formatter={(value) => `${value} VND`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\s?VND|(,*)/g, '') as unknown as number}
              min={0}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleSave}
              loading={isLoading}
              className="rainbow-pulse w-full sm:w-auto"
            >
              Tích ngay
            </Button>
          </Controls>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white" size="small">
            <div className="grid grid-cols-1 gap-2">
              <Statistic
                title={`Tổng tháng ${calendarValue.format('MM/YYYY')}`}
                value={monthlyTotal}
                suffix="VND"
        
              />
              <Statistic
                title="Số ngày đã tích trong tháng"
                value={monthlyDays}
                suffix="ngày"
              />
            </div>
          </Card>
          <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white" size="small">
            <Statistic
              title={`Tổng tích lũy năm ${currentYear}`}
              value={totalSaved}
              precision={0}
              suffix="VND"
        
            />
          </Card>
          <Card className="bg-gradient-to-r from-rose-500 to-pink-600 text-white" size="small">
            <Statistic
              title={`Số ngày đã tích năm ${currentYear}`}
              value={totalDays}
              suffix="ngày"
            />
          </Card>
        </div>
        {isLoading && transactions.length === 0 ? (
             <div className="flex justify-center p-12"><Spin size="large" /></div>
        ) : (
          <>
            <Calendar
              value={calendarValue}
              onPanelChange={(value) => setCalendarValue(value)}
              cellRender={cellRender}
              onSelect={(value) => {
                setSelectedDate(value.format('YYYY-MM-DD'));
                setCalendarValue(value);
              }}
            />
            <Card className="mt-4 overflow-hidden">
              <Title level={5}>Biểu đồ theo ngày tháng {calendarValue.format('MM/YYYY')}</Title>
              <Line
                data={monthDailyData}
                xField="date"
                yField="amount"
                smooth
                autoFit
                point={{ size: 4, shape: 'circle' }}
                tooltip={{ showMarkers: true }}
                xAxis={{ tickCount: 10 }}
                yAxis={{ labelFormatter: (v: any) => Number(v).toLocaleString() }}
                color="#10b981"
              />
            </Card>
          </>
        )}
        <Modal
          open={loginOpen}
          title="Đăng nhập"
          centered
          onCancel={() => setLoginOpen(false)}
          onOk={() => {
            const ok = login(username, password);
            if (ok) {
              setLoginOpen(false);
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
    </Card>
  );
};

export default CalendarView;
