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
  Checkbox,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fbGetAveragePriceState,
  fbUpsertAveragePriceState,
} from '@/utils/firebaseDb'
import { useAuthStore } from '@/store/useAuthStore'

const { Text, Title } = Typography

// --- CẤU HÌNH CHIẾN THUẬT ---
const NIGHT_STRATEGY = [
  { key: 1, label: 'Lệnh 1', lot: 0.22, offset: 0 },
  { key: 2, label: 'Lệnh 2.1', lot: 0.23, offset: 7.5 },
  { key: 3, label: 'Lệnh 2.2', lot: 0.23, offset: 15 },
  { key: 4, label: 'Lệnh 3.1', lot: 0.45, offset: 25 },
  { key: 5, label: 'Lệnh 3.2', lot: 0.45, offset: 35 },
  { key: 6, label: 'Lệnh 4', lot: 1.80, offset: 60 },
  { key: 7, label: 'Lệnh 5', lot: 3.62, offset: 100 },
]

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
  
  // State mới: Lưu ID các lệnh đã khớp
  const [checkedKeys, setCheckedKeys] = useState<number[]>([1]) 
  
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [hasLoadedCloud, setHasLoadedCloud] = useState(false)

  const dataSource = useMemo(() => {
    if (basePrice === null) return []
    return buildRows({ basePrice, tradeType, isNightMode })
  }, [basePrice, tradeType, isNightMode])

  // Logic tính toán cho các lệnh ĐÃ TÍCH (Lệnh đã khớp)
  const activeStats = useMemo(() => {
    const activeRows = dataSource.filter(item => checkedKeys.includes(item.key))
    const totalLotActive = activeRows.reduce((sum, item) => sum + item.weight, 0)
    const totalValueActive = activeRows.reduce((sum, item) => sum + (item.inputVal || 0) * item.weight, 0)
    const avgActive = totalLotActive > 0 ? totalValueActive / totalLotActive : 0
    return { avgActive, totalLotActive }
  }, [dataSource, checkedKeys])

  const totalLotFull = useMemo(() => dataSource.reduce((sum, item) => sum + item.weight, 0), [dataSource])
  const cloudPayload = useMemo<AveragePriceCloudState>(() => {
    return {
      basePrice,
      tradeType,
      isNightMode,
      checkedKeys,
      rows: dataSource,
      summary: {
        avgActive: activeStats.avgActive,
        totalLotActive: activeStats.totalLotActive,
        totalLotFull,
      },
      updatedAt: lastSyncedAt,
    }
  }, [
    activeStats.avgActive,
    activeStats.totalLotActive,
    basePrice,
    checkedKeys,
    dataSource,
    isNightMode,
    lastSyncedAt,
    totalLotFull,
    tradeType,
  ])

  // --- HANDLERS ---
  const toggleCheck = (key: number) => {
    setCheckedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const hydrateState = useCallback((state: AveragePriceCloudState | null) => {
    if (!state) return
    setBasePrice(typeof state.basePrice === 'number' ? state.basePrice : 2400)
    setTradeType(state.tradeType === 'SELL' ? 'SELL' : 'BUY')
    setIsNightMode(state.isNightMode !== undefined ? state.isNightMode : false)
    if (Array.isArray(state.checkedKeys)) setCheckedKeys(state.checkedKeys.filter((key) => typeof key === 'number'))
    setLastSyncedAt(getSafeTimestamp(state.updatedAt))
  }, [])

  const persistLocalState = useCallback(
    (updatedAt: number | null = lastSyncedAt) => {
      if (typeof window === 'undefined') return
      const payload: AveragePriceCloudState = {
        ...cloudPayload,
        updatedAt,
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
    },
    [cloudPayload, lastSyncedAt]
  )

  const handleSync = useCallback(async () => {
    if (!isAuthed || !userId) { message.error('Bạn cần đăng nhập'); return }
    setIsSyncing(true)
    try {
      const updatedAt = Date.now()
      await fbUpsertAveragePriceState(userId, {
        ...cloudPayload,
        updatedAt,
      })
      setLastSyncedAt(updatedAt)
      persistLocalState(updatedAt)
      message.success('Đồng bộ cloud thành công')
    } catch { message.error('Thất bại') } 
    finally { setIsSyncing(false) }
  }, [cloudPayload, isAuthed, persistLocalState, userId])

  const handleRefresh = useCallback(async () => {
    if (!isAuthed || !userId) { message.error('Bạn cần đăng nhập'); return }
    setIsRefreshing(true)
    try {
      const cloudState = await fbGetAveragePriceState(userId)
      if (cloudState) hydrateState(cloudState)
    } catch { message.error('Lỗi tải dữ liệu') } 
    finally { setIsRefreshing(false) }
  }, [hydrateState, isAuthed, userId])

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) persistLocalState()
  }, [isHydrated, persistLocalState])

  useEffect(() => {
    if (!isHydrated || !isAuthed || !userId || hasLoadedCloud) return

    let isCancelled = false

    async function loadCloudState() {
      setIsRefreshing(true)
      try {
        const cloudState = await fbGetAveragePriceState(userId)
        if (isCancelled) return
        if (cloudState) hydrateState(cloudState)
      } catch {
        if (!isCancelled) message.error('Không tải được dữ liệu cloud')
      } finally {
        if (!isCancelled) {
          setHasLoadedCloud(true)
          setIsRefreshing(false)
        }
      }
    }

    loadCloudState()

    return () => {
      isCancelled = true
    }
  }, [hasLoadedCloud, hydrateState, isAuthed, isHydrated, userId])

  useEffect(() => {
    if (isAuthed && userId) return
    setHasLoadedCloud(false)
  }, [isAuthed, userId])

  const columns: ColumnsType<PriceRow> = [
    {
      title: 'Khớp',
      key: 'check',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <Checkbox 
          checked={checkedKeys.includes(record.key)} 
          onChange={() => toggleCheck(record.key)} 
        />
      ),
    },
    {
      title: 'Vị trí lệnh',
      dataIndex: 'range',
      key: 'range',
      render: (value, record) => (
        <div className='space-y-1'>
          <Text strong>{value}</Text>
          <div><Tag color='blue' size="small">-{record.offset} giá</Tag></div>
        </div>
      ),
    },
    {
      title: 'Mức giá Entry',
      dataIndex: 'inputVal',
      key: 'inputVal',
      align: 'right',
      render: (value) => <Text strong className='text-blue-600'>{value}</Text>,
    },
    {
      title: 'Khối lượng',
      dataIndex: 'weight',
      key: 'weight',
      align: 'center',
      render: (value) => <Tag color='orange'>{value.toFixed(2)}</Tag>,
    },
  ]

  return (
    <div className='min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-6 '>
      <div className='mx-auto max-w-5xl space-y-4'>
        
        {/* Hàng Card thông số */}
        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <SummaryCard
            label='Giá TB Hiện Tại (Đã khớp)'
            value={formatPrice(activeStats.avgActive)}
            valueClassName='text-green-600'
            subValue={`Khối lượng: ${activeStats.totalLotActive.toFixed(2)} lot`}
          />
          <SummaryCard
            label='Tổng Lot Kế Hoạch'
            value={`${totalLotFull.toFixed(2)} lot`}
            valueClassName='text-orange-500'
          />
          <Card size="small" className='rounded-xl shadow-sm flex items-center justify-center border-none'>
             <div className='flex gap-2'>
              <Button loading={isRefreshing} onClick={handleRefresh}>Tải lại</Button>
              <Button type='primary' loading={isSyncing} onClick={handleSync}>Đồng bộ</Button>
            </div>
          </Card>
        </div>

        {/* Bảng điều khiển */}
        <Card className='rounded-xl border-none shadow-sm'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div className='space-y-1'>
              <Text type="secondary" className='text-xs'>GIÁ LỆNH 1</Text>
              <InputNumber
                className='w-full'
                controls={false}
                size='large'
                value={basePrice}
                onChange={setBasePrice}
              />
            </div>
            <div className='space-y-1'>
              <Text type="secondary" className='text-xs'>CHIỀU GIAO DỊCH</Text>
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
            <div className='flex flex-col justify-end pb-1'>
              <div className='flex items-center gap-3'>
                <Switch checked={isNightMode} onChange={setIsNightMode} />
                <Text strong>{isNightMode ? "CHẾ ĐỘ BAN ĐÊM" : "CHẾ ĐỘ BAN NGÀY"}</Text>
              </div>
            </div>
          </div>
          <Divider className='!my-3' />
          <div className='text-[10px] text-gray-400 uppercase tracking-tighter'>
            {getSyncStatusLabel({ isAuthed, isRefreshing, lastSyncedAt })}
          </div>
        </Card>

        {/* Desktop Table */}
        <Card className='hidden md:block rounded-xl border-none shadow-sm overflow-hidden'>
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
            <Card 
              key={item.key} 
              size="small" 
              className={`rounded-xl border-none shadow-sm ${checkedKeys.includes(item.key) ? 'bg-green-50' : ''}`}
              onClick={() => toggleCheck(item.key)}
            >
              <div className='flex justify-between items-center'>
                <div className='flex items-center gap-2'>
                  <Checkbox checked={checkedKeys.includes(item.key)} />
                  <Text strong>{item.range}</Text>
                  <Tag color='blue' size="small">-{item.offset}g</Tag>
                </div>
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
function SummaryCard({ label, value, valueClassName, subValue }: { label: string, value: string, valueClassName: string, subValue?: string }) {
  return (
    <Card className='rounded-xl border-none shadow-sm' bodyStyle={{ padding: '12px 16px' }}>
      <Text type='secondary' className='text-[10px] uppercase font-bold tracking-wider'>{label}</Text>
      <div className={`text-xl font-black ${valueClassName}`}>{value}</div>
      {subValue && <div className='text-[11px] text-gray-400'>{subValue}</div>}
    </Card>
  )
}

// --- HELPERS ---
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
  if (!value || Number.isNaN(value)) return '0.00'
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getSafeTimestamp(value: unknown): number | null {
  return (typeof value === 'number' && !Number.isNaN(value)) ? value : null
}

function getSyncStatusLabel({ isAuthed, isRefreshing, lastSyncedAt }: any): string {
  if (!isAuthed) return 'Offline Mode'
  if (isRefreshing) return 'Đang cập nhật...'
  return lastSyncedAt ? `Đồng bộ: ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Chưa đồng bộ'
}

const LOCAL_STORAGE_KEY = 'average-price-tool-state'

interface PriceRow {
  key: number
  range: string
  inputVal: number | null
  weight: number
  offset: number
}

interface AveragePriceCloudState {
  basePrice: number | null
  tradeType: TradeType
  isNightMode: boolean
  checkedKeys: number[]
  rows: PriceRow[]
  summary: {
    avgActive: number
    totalLotActive: number
    totalLotFull: number
  }
  updatedAt: number | null
}

type TradeType = 'BUY' | 'SELL'
