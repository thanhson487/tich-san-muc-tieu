'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Divider,
  InputNumber,
  Radio,
  Table,
  Tag,
  Typography,
  message,
  Switch,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fbGetAveragePriceState,
  fbUpsertAveragePriceState,
} from '@/utils/firebaseDb'
import { useAuthStore } from '@/store/useAuthStore'

const { Text, Title } = Typography

// --- CẤU HÌNH CHIẾN THUẬT ---

// 1. Cấu hình BAN ĐÊM (Giữ nguyên cấu trúc 5 tầng gốc của bạn)
const NIGHT_STRATEGY = [
  { key: 1, label: 'Lệnh 1', lot: 0.22, offset: 0 },
  { key: 2, label: 'Lệnh 2.1', lot: 0.23, offset: 7.5 },
  { key: 3, label: 'Lệnh 2.2', lot: 0.23, offset: 15 },
  { key: 4, label: 'Lệnh 3.1', lot: 0.45, offset: 25 },
  { key: 5, label: 'Lệnh 3.2', lot: 0.45, offset: 35 },
  { key: 6, label: 'Lệnh 4', lot: 1.80, offset: 60 },
  { key: 7, label: 'Lệnh 5', lot: 3.62, offset: 100 },
]

// 2. Cấu hình BAN NGÀY (4 tầng chính, L2.1 tại 15, L2.2 tại 35)
// Tổng lot ~ 7.0
const DAY_STRATEGY = [
  { key: 1, label: 'Lệnh 1', lot: 0.46, offset: 0 },
  { key: 2, label: 'Lệnh 2.1', lot: 0.47, offset: 15 }, 
  { key: 3, label: 'Lệnh 2.2', lot: 0.47, offset: 35 }, 
  { key: 4, label: 'Lệnh 3', lot: 1.86, offset: 70 },
  { key: 5, label: 'Lệnh 4', lot: 3.74, offset: 100 },
]

export default function FinancialTool() {
  const { isAuthed, userId } = useAuthStore()
  const [basePrice, setBasePrice] = useState<number | null>(2400)
  const [tradeType, setTradeType] = useState<TradeType>('BUY')
  const [isNightMode, setIsNightMode] = useState<boolean>(false)
  
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)

  const dataSource = useMemo(() => {
    if (basePrice === null) return []
    return buildRows({ basePrice, tradeType, isNightMode })
  }, [basePrice, tradeType, isNightMode])

  const totalLot = useMemo(() => {
    return dataSource.reduce((sum, item) => sum + item.weight, 0)
  }, [dataSource])

  const totalValue = useMemo(() => {
    return dataSource.reduce((sum, item) => {
      return sum + (item.inputVal || 0) * item.weight
    }, 0)
  }, [dataSource])

  const averageValue = useMemo(() => {
    if (totalLot <= 0) return 0
    return totalValue / totalLot
  }, [totalLot, totalValue])

  const hydrateState = useCallback((state: any) => {
    if (!state) return
    setBasePrice(typeof state.basePrice === 'number' ? state.basePrice : 2400)
    setTradeType(state.tradeType === 'SELL' ? 'SELL' : 'BUY')
    setIsNightMode(state.isNightMode !== undefined ? state.isNightMode : false)
    setLastSyncedAt(getSafeTimestamp(state.updatedAt))
  }, [])

  const persistLocalState = useCallback(
    (updatedAt: number | null = lastSyncedAt) => {
      if (typeof window === 'undefined') return
      const payload = { basePrice, tradeType, isNightMode, updatedAt }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
    },
    [basePrice, tradeType, isNightMode, lastSyncedAt]
  )

  const handleSync = useCallback(async () => {
    if (!isAuthed || !userId) {
      message.error('Bạn cần đăng nhập để đồng bộ')
      return
    }
    setIsSyncing(true)
    try {
      const updatedAt = Date.now()
      await fbUpsertAveragePriceState(userId, {
        basePrice, tradeType, isNightMode, updatedAt, rows: dataSource
      } as any)
      setLastSyncedAt(updatedAt)
      persistLocalState(updatedAt)
      message.success('Đồng bộ cloud thành công')
    } catch {
      message.error('Đồng bộ cloud thất bại')
    } finally {
      setIsSyncing(false)
    }
  }, [basePrice, isNightMode, isAuthed, persistLocalState, tradeType, userId, dataSource])

  const handleRefresh = useCallback(async () => {
    if (!isAuthed || !userId) {
      message.error('Bạn cần đăng nhập để lấy dữ liệu cloud')
      return
    }
    setIsRefreshing(true)
    try {
      const cloudState = await fbGetAveragePriceState(userId)
      if (!cloudState) {
        message.info('Cloud chưa có dữ liệu')
        return
      }
      hydrateState(cloudState)
      message.success('Đã lấy dữ liệu từ cloud')
    } catch {
      message.error('Không lấy được dữ liệu cloud')
    } finally {
      setIsRefreshing(false)
    }
  }, [hydrateState, isAuthed, userId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const rawState = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (rawState) hydrateState(JSON.parse(rawState))
    } catch { setBasePrice(2400) } 
    finally { setIsHydrated(true) }
  }, [hydrateState])

  useEffect(() => {
    if (isHydrated) persistLocalState()
  }, [isHydrated, persistLocalState])

  const columns: ColumnsType<PriceRow> = [
    {
      title: 'Vị trí lệnh',
      dataIndex: 'range',
      key: 'range',
      render: (value, record) => (
        <div className='space-y-1'>
          <Text strong>{value}</Text>
          <div><Tag color='blue'>Cách gốc: {record.offset} giá</Tag></div>
        </div>
      ),
    },
    {
      title: 'Mức giá Entry',
      dataIndex: 'inputVal',
      key: 'inputVal',
      align: 'right',
      render: (value) => (
        <Text strong className='text-blue-600'>{value}</Text>
      ),
    },
    {
      title: 'Khối lượng',
      dataIndex: 'weight',
      key: 'weight',
      align: 'center',
      render: (value) => <Tag color='orange'>{value.toFixed(2)} lot</Tag>,
    },
  ]

  return (
    <div className='min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-6'>
      <div className='mx-auto max-w-5xl space-y-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>  
        </div>

        <div className=' flex flex-col gap-3 md:flex-row justify-between items-center '>
          <SummaryCard
            label='Giá trung bình'
            value={formatPrice(averageValue)}
            valueClassName='text-sky-600'
          />
           <div className='flex gap-2'>
            <Button loading={isRefreshing} onClick={handleRefresh}>Làm mới</Button>
            <Button type='primary' loading={isSyncing} onClick={handleSync}>Đồng bộ cloud</Button>
          </div>
        
        </div>

        <Card className='rounded-xl border-none shadow-sm'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Text strong className='mr-2'>Giá lệnh </Text>
              <InputNumber
                className='w-full'
                controls={false}
                size='large'
                value={basePrice}
                onChange={setBasePrice}
              />
            </div>

            <div className='space-y-2'>
              <Text strong>Chiều giao dịch</Text>
              <Radio.Group
                className='grid w-full grid-cols-2'
                optionType='button'
                size='large'
                value={tradeType}
                onChange={(e) => setTradeType(e.target.value)}
              >
                <Radio.Button value='BUY' className='!text-center'>BUY</Radio.Button>
                <Radio.Button value='SELL' className='!text-center'>SELL</Radio.Button>
              </Radio.Group>
            </div>

            <div className='flex flex-col justify-center space-y-2'>
              <Text strong>Cấu hình phiên</Text>
              <div className='flex items-center gap-3'>
                <Switch 
                  checked={isNightMode} 
                  onChange={setIsNightMode} 
                  checkedChildren="Đêm" 
                  unCheckedChildren="Ngày"
                />
               
              </div>
            </div>
          </div>
          <Divider className='!my-4' />
          <div className='text-xs text-gray-400'>
            {getSyncStatusLabel({ isAuthed, isRefreshing, lastSyncedAt })}
          </div>
        </Card>
<SummaryCard
            label='Tổng khối lượng'
            value={`${totalLot.toFixed(2)} lot`}
            valueClassName='text-orange-500'
          />
        {/* Desktop View */}
        <Card className='hidden rounded-xl border-none shadow-sm md:block'>
          <Table
            rowKey='key'
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            bordered
            size='middle'
          />
        </Card>

        {/* Mobile View */}
        <div className='space-y-3 md:hidden'>
          {dataSource.map((item) => (
            <Card key={item.key} size="small" className='rounded-xl border-none shadow-sm'>
              <div className='flex justify-between items-center'>
                <Text strong>{item.range} <Tag className='ml-1' color='blue'>{item.offset}g</Tag></Text>
                <Tag color='orange'>{item.weight.toFixed(2)} lot</Tag>
              </div>
              <div className='flex justify-between mt-2'>
                <Text type='secondary'>Entry</Text>
                <Text strong className='text-blue-600'>{formatPrice(item.inputVal)}</Text>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- COMPONENTS ---
function SummaryCard({ label, value, valueClassName }: { label: string, value: string, valueClassName: string }) {
  return (
    <Card className='rounded-xl border-none shadow-sm' bodyStyle={{ padding: '16px' }}>
      <Text type='secondary' className='text-xs uppercase tracking-wider'>{label}</Text>
      <div className={`mt-1 text-xl font-bold ${valueClassName}`}>{value}</div>
    </Card>
  )
}

// --- LOGIC HELPER ---
function buildRows({ basePrice, tradeType, isNightMode }: any): PriceRow[] {
  const strategy = isNightMode ? NIGHT_STRATEGY : DAY_STRATEGY
  return strategy.map((config) => {
    const rawPrice = tradeType === 'BUY' ? basePrice - config.offset : basePrice + config.offset
    return {
      key: config.key,
      range: config.label,
      inputVal: Number(rawPrice.toFixed(2)),
      weight: config.lot,
      offset: config.offset,
    }
  })
}

function formatPrice(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.00'
  return value.toFixed(2)
}

function getSafeTimestamp(value: unknown): number | null {
  return (typeof value === 'number' && !Number.isNaN(value)) ? value : null
}

function getSyncStatusLabel({ isAuthed, isRefreshing, lastSyncedAt }: any): string {
  if (!isAuthed) return 'Đăng nhập để đồng bộ'
  if (isRefreshing) return 'Đang tải...'
  return lastSyncedAt ? `Đồng bộ: ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}` : 'Chưa đồng bộ'
}

const LOCAL_STORAGE_KEY = 'average-price-tool-state'

interface PriceRow {
  key: number
  range: string
  inputVal: number | null
  weight: number
  offset: number
}

type TradeType = 'BUY' | 'SELL'