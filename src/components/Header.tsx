'use client';

import React, { useState } from 'react';
import { Layout, message, Menu, DatePicker, Switch } from 'antd';
import { PlusOutlined, CalendarOutlined, TableOutlined } from '@ant-design/icons';
import { useSavingsStore } from '@/store/useSavingsStore';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useUIStore } from '@/store/useUIStore';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const [amount, setAmount] = useState<number | null>(310000);
  const { addTransaction, isLoading, selectedDate, setSelectedDate, fetchTransactions } = useSavingsStore();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, setIsDark } = useUIStore();
  


  const menuItems = [
    {
      key: '/',
      icon: <CalendarOutlined />,
      label: <Link href="/">Lịch</Link>,
    },
    {
      key: '/history',
      icon: <TableOutlined />,
      label: <Link href="/history">Chi tiết</Link>,
    },
  ];

  return (
    <><AntHeader
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isDark ? '#0b1220' : '#fff',
        padding: '0 20px',
        borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <div className="flex items-center gap-4">
        <h1
          className="text-xl font-bold mr-4"
          style={{ color: isDark ? '#93c5fd' : '#2563eb' }}
        >
          Tích Lũy
        </h1>
        <Menu
          mode="horizontal"
          selectedKeys={[pathname]}
          items={menuItems}
          style={{ borderBottom: 'none', minWidth: '200px' }} />
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <div className="flex items-center gap-2 mr-3">
          <span style={{ color: isDark ? '#e5e7eb' : '#111827' }}>Dark</span>
          <Switch checked={isDark} onChange={setIsDark} />
        </div>

        <DatePicker
          value={dayjs(selectedDate)}
          onChange={(value) => value && setSelectedDate(value.format('YYYY-MM-DD'))}
          allowClear={false}
         />
      </div>
    </AntHeader></>
  );
};

export default Header;
