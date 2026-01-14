import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AppLayout from '@/components/AppLayout';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ứng dụng Tích Lũy',
  description: 'Theo dõi tích lũy hàng ngày',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, padding: 0 }}>
        <AntdRegistry>
          <AuthProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </AuthProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
