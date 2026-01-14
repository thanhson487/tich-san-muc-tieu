# Technical Architecture Document

## 1. Technology Stack
- **Frontend Framework**: Next.js (App Router preferred for modern React practices).
- **Language**: TypeScript.
- **UI Library**: Ant Design (antd) for pre-built components (Calendar, Table, Button, Input, Layout).
- **State Management**: Zustand (for managing the "refresh" trigger between components).
- **Database**: IndexedDB (using `idb` library for Promise-based interaction).
- **Styling**: Tailwind CSS (for layout utilities) + Ant Design styles.

## 2. Data Model (IndexedDB)
- **Database Name**: `savings_db`
- **Store Name**: `transactions`
- **Schema**:
    ```typescript
    interface Transaction {
      id?: number;      // Auto-increment key
      date: string;     // ISO Date string (YYYY-MM-DD) for easy querying
      amount: number;   // Amount in VND
      timestamp: number; // Created at timestamp
    }
    ```

## 3. Project Structure
```
/src
  /app
    /page.tsx         # Home Page (Calendar)
    /history/page.tsx # History Page (Table)
    /layout.tsx       # Main Layout (Header + Content)
  /components
    /Header.tsx       # Contains "Save Now" button and Input
    /CalendarView.tsx # Calendar component
    /HistoryTable.tsx # Table component
  /utils
    /db.ts            # IndexedDB service (init, add, getAll)
  /store
    /useStore.ts      # Zustand store
```

## 4. Key Workflows
1.  **Saving Money**:
    *   User clicks "Tích ngay".
    *   App reads value from Input (default 300,000).
    *   Call `db.addTransaction({ date: today, amount: value })`.
    *   Update Zustand state `lastUpdated`.
    *   Calendar and Table components re-fetch data based on `lastUpdated`.

2.  **Viewing Data**:
    *   `CalendarView` fetches all transactions on mount and when `lastUpdated` changes. Maps dates to ticks.
    *   `HistoryTable` fetches all transactions, calculates total, and renders table.
