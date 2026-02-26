'use client';

import React, { useState } from 'react';
import { Layout, ConfigProvider, theme as antdTheme, Modal } from 'antd';
import viVN from 'antd/locale/vi_VN';
import Header from '@/components/Header';
import { useUIStore } from '@/store/useUIStore';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isDark } = useUIStore();
  const algorithm = isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm,
        token: {
          colorPrimary: '#7c3aed',
          colorInfo: '#06b6d4',
          borderRadius: 10,
          colorBgLayout: isDark ? '#0b1220' : '#f8fafc',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* <Header /> */}
        <Content className="px-3 md:px-6" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {children}
        </Content>
        <Modal
          open={welcomeOpen}
          onCancel={() => setWelcomeOpen(false)}
          onOk={() => setWelcomeOpen(false)}
          centered
          title="Bố mẹ ơi tích sản cho con mua biệt thự đi"
          okText="Đồng ý"
          cancelText="Đóng"
        >
          <img
            src="/image/biet-thu.jpg"
            alt="Biệt thự"
            style={{ width: '100%', borderRadius: 12 ,boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)' }}
        
          />
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default AppLayout;
