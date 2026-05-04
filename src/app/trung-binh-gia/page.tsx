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
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fbGetAveragePriceState,
  fbUpsertAveragePriceState,
} from '@/utils/firebaseDb'
import { useAuthStore } from '@/store/useAuthStore'

const { Text, Title } = Typography

export default function FinancialTool() {
  const { isAuthed, userId } = useAuthStore()
  const [basePrice, setBasePrice] = useState<number | null>(2400)
  const [tradeType, setTradeType] = useState<TradeType>('BUY')
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)

  const dataSource = useMemo(() => {
    if (basePrice === null) return []
    return buildRows({ basePrice, tradeType })
  }, [basePrice, tradeType])

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

  const hydrateState = useCallback((state: AveragePriceCloudState | null) => {
    if (!state) return
    setBasePrice(typeof state.basePrice === 'number' ? state.basePrice : 2400)
    setTradeType(state.tradeType === 'SELL' ? 'SELL' : 'BUY')
    setLastSyncedAt(getSafeTimestamp(state.updatedAt))
  }, [])

  const persistLocalState = useCallback(
    (updatedAt: number | null = lastSyncedAt) => {
      if (typeof window === 'undefined') return
      const payload: AveragePriceCloudState = {
        basePrice,
        tradeType,
        rows: dataSource,
        updatedAt,
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
    },
    [basePrice, dataSource, lastSyncedAt, tradeType]
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
        basePrice,
        tradeType,
        rows: dataSource,
        updatedAt,
      })
      setLastSyncedAt(updatedAt)
      persistLocalState(updatedAt)
      message.success('Đồng bộ cloud thành công')
    } catch {
      message.error('Đồng bộ cloud thất bại')
    } finally {
      setIsSyncing(false)
    }
  }, [basePrice, dataSource, isAuthed, persistLocalState, tradeType, userId])

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
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudState))
      }
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
      if (!rawState) {
        setIsHydrated(true)
        return
      }

      const parsedState = JSON.parse(rawState)
      hydrateState(parsedState)
    } catch {
      setBasePrice(2400)
      setTradeType('BUY')
    } finally {
      setIsHydrated(true)
    }
  }, [hydrateState])

  useEffect(() => {
    if (!isHydrated) return
    persistLocalState()
  }, [isHydrated, persistLocalState])

  useEffect(() => {
    if (!isHydrated || !isAuthed || !userId) return

    let isCancelled = false

    async function loadCloudState() {
      setIsRefreshing(true)

      try {
        const cloudState = await fbGetAveragePriceState(userId)
        if (isCancelled || !cloudState) return
        hydrateState(cloudState)
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudState))
        }
      } catch {
        if (!isCancelled) message.error('Không tải được dữ liệu cloud')
      } finally {
        if (!isCancelled) setIsRefreshing(false)
      }
    }

    loadCloudState()

    return () => {
      isCancelled = true
    }
  }, [hydrateState, isAuthed, isHydrated, userId])

  const columns: ColumnsType<PriceRow> = [
    {
      title: 'Vị trí lệnh',
      dataIndex: 'range',
      key: 'range',
      render: (value, record) => {
        return (
          <div className='space-y-1'>
            <Text strong>{value}</Text>
            <div>
              <Tag color='blue'>Cách gốc: {record.offset} giá</Tag>
            </div>
          </div>
        )
      },
    },
    {
      title: 'Mức giá Entry',
      dataIndex: 'inputVal',
      key: 'inputVal',
      align: 'right',
      render: (value) => {
        return (
          <Text strong className='text-blue-600'>
            {formatPrice(value)}
          </Text>
        )
      },
    },
    {
      title: 'Khối lượng',
      dataIndex: 'weight',
      key: 'weight',
      align: 'center',
      render: (value) => {
        return <Tag color='orange'>{value} lot</Tag>
      },
    },
    
  ]

  return (
    <div className='min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-6'>
      <div className='mx-auto max-w-5xl space-y-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
       
          <div className='flex gap-2'>
            <Button
              className='flex-1 sm:flex-none'
              loading={isRefreshing}
              onClick={handleRefresh}
            >
              Làm mới
            </Button>
            <Button
              type='primary'
              className='flex-1 sm:flex-none'
              loading={isSyncing}
              onClick={handleSync}
            >
              Đồng bộ cloud
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
    
          <SummaryCard
            label='Giá trung bình'
            value={`${formatPrice(averageValue)}`}
            valueClassName='text-sky-600'
          />
          <SummaryCard
            label='Tổng khối lượng'
            value={`${formatPrice(totalLot)} lot`}
            valueClassName='text-orange-500'
          />
        </div>

        <Card className='rounded-xl border-none shadow-sm'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Text strong className='mr-5'>Giá lệnh 1</Text>
              <InputNumber
                aria-label='Giá lệnh 1'
                className='w-full'
                controls={false}
                inputMode='decimal'
                min={0}
                size='large'
                placeholder='Nhập giá vàng hiện tại'
                value={basePrice}
                onChange={handleBasePriceChange}
              />
            </div>

            <div className='space-y-2'>
              <Text strong>Chiều giao dịch</Text>
              <Radio.Group
                aria-label='Chiều giao dịch'
                className='grid w-full grid-cols-2'
                optionType='button'
              
                size='large'
                value={tradeType}
                onChange={handleTradeTypeChange}
              >
                <Radio.Button value='BUY' className=' !mb-5 !text-center'>
                  BUY
                </Radio.Button>
                <Radio.Button value='SELL' className=' mb-5 !text-center'>
                  SELL
                </Radio.Button>
              </Radio.Group>
            </div>
          </div>

          <Divider className='!my-4' />

          <div className='text-sm text-gray-500'>
            {getSyncStatusLabel({
              isAuthed,
              isRefreshing,
              lastSyncedAt,
            })}
          </div>
        </Card>

        <div className='space-y-3 md:hidden'>
          {dataSource.map((item) => {
            const gap = Math.abs((item.inputVal || 0) - averageValue)

            return (
              <Card key={item.key} className='rounded-xl border-none shadow-sm'>
                <div className='space-y-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <Text strong>{item.range}</Text>
                      <div>
                        <Tag color='blue'>Cách gốc: {item.offset} giá</Tag>
                      </div>
                    </div>
                    <Tag color='orange'>{item.weight} lot</Tag>
                  </div>

                  <div className='rounded-lg  p-3'>
                    <div className='flex items-center justify-between'>
                      <Text type='secondary'>Entry</Text>
                      <Text strong className='text-blue-600'>
                        {formatPrice(item.inputVal)}
                      </Text>
                    </div>
                  </div>

                  <div className='rounded-lg  p-3'>
                    <div className='flex items-center justify-between'>
                      <Text type='secondary'>Khoảng hồi</Text>
                      <Text type='danger'>{formatPrice(gap)} giá</Text>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className='hidden overflow-hidden rounded-xl border-none shadow-sm md:block'>
          <Table
            rowKey='key'
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            bordered
            size='middle'
          />
        </Card>
      </div>
    </div>
  )

  function handleBasePriceChange(value: number | null) {
    setBasePrice(value)
  }

  function handleTradeTypeChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const nextValue = event.target.value === 'SELL' ? 'SELL' : 'BUY'
    setTradeType(nextValue)
  }
}

function buildRows({
  basePrice,
  tradeType,
}: BuildRowsOptions): PriceRow[] {
  return DCA_STRATEGY_CONFIG.map((config) => {
    const rawPrice =
      tradeType === 'BUY'
        ? basePrice - config.offset
        : basePrice + config.offset

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
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getSafeTimestamp(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value
}

function getSyncStatusLabel({
  isAuthed,
  isRefreshing,
  lastSyncedAt,
}: SyncStatusLabelOptions): string {
  if (!isAuthed) return 'Đăng nhập để đồng bộ dữ liệu lên cloud'
  if (isRefreshing) return 'Đang lấy dữ liệu từ cloud...'
  if (!lastSyncedAt) return 'Chưa có lần đồng bộ nào'
  return `Đồng bộ gần nhất: ${new Date(lastSyncedAt).toLocaleString('vi-VN')}`
}

function SummaryCard({
  label,
  value,
  valueClassName,
}: SummaryCardProps) {
  return (
    <Card className='rounded-xl border-none shadow-sm'>
      <Text type='secondary'>{label}</Text>
      <div className={`mt-2 text-2xl font-bold ${valueClassName}`}>
        {value}
      </div>
    </Card>
  )
}

const LOCAL_STORAGE_KEY = 'average-price-tool-state'

const DCA_STRATEGY_CONFIG = [
  { key: 1, label: 'Lệnh 1', lot: 0.22, offset: 0 },
  
  // Lệnh 2 (Khoảng cách 15 giá) -> Tách đôi
  { key: 2, label: 'Lệnh 2.1', lot: 0.23, offset: 7.5 }, 
  { key: 3, label: 'Lệnh 2.2', lot: 0.23, offset: 15 },
  
  // Lệnh 3 (Khoảng cách thêm 20 giá = tổng 35) -> Tách đôi
  { key: 4, label: 'Lệnh 3.1', lot: 0.45, offset: 25 }, 
  { key: 5, label: 'Lệnh 3.2', lot: 0.45, offset: 35 },
  
  // Lệnh 4 (Khoảng cách thêm 25 giá = tổng 60)
  { key: 6, label: 'Lệnh 4', lot: 1.80, offset: 60 },
  
  // Lệnh 5 (Khoảng cách thêm 40 giá = tổng 100)
  { key: 7, label: 'Lệnh 5', lot: 3.62, offset: 100 },
]


interface PriceRow {
  key: number
  range: string
  inputVal: number | null
  weight: number
  offset: number
}

interface DcaStrategyItem {
  key: number
  label: string
  lot: number
  offset: number
}

interface AveragePriceCloudState {
  basePrice: number | null
  tradeType: TradeType
  rows: PriceRow[]
  updatedAt: number | null
}

interface BuildRowsOptions {
  basePrice: number
  tradeType: TradeType
}

interface SummaryCardProps {
  label: string
  value: string
  valueClassName: string
}

interface SyncStatusLabelOptions {
  isAuthed: boolean
  isRefreshing: boolean
  lastSyncedAt: number | null
}

type TradeType = 'BUY' | 'SELL'
