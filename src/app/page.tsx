'use client';

import React, { useState, useEffect } from 'react';
import { Layout, ConfigProvider, theme as antdTheme, Modal } from 'antd';
import viVN from 'antd/locale/vi_VN';
import Header from '@/components/Header';
import { useUIStore } from '@/store/useUIStore';
import { useRouter, usePathname } from 'next/navigation';

export default function Home() {
    const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/trade') {
      router.replace('/trade');
    }
  }, [pathname, router]);
  return (
    <main>
      {/* <Tabs
        className="tabs-equal"
        defaultActiveKey="calendar"
        items={[
          { key: 'calendar', label: 'Lịch', children: <CalendarView /> },
          { key: 'history', label: 'Chi tiết', children: <HistoryTable /> },
        ]}
      /> */}
    </main>
  );
}
