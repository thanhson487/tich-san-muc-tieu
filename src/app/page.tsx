import CalendarView from '@/components/CalendarView';
import HistoryTable from '@/components/HistoryTable';
import { Tabs } from 'antd';

export default function Home() {
  return (
    <main>
      <Tabs
        className="tabs-equal"
        defaultActiveKey="calendar"
        items={[
          { key: 'calendar', label: 'Lịch', children: <CalendarView /> },
          { key: 'history', label: 'Chi tiết', children: <HistoryTable /> },
        ]}
      />
    </main>
  );
}
