'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Button, Card, Divider, InputNumber, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fbGetAveragePriceState,
  fbUpsertAveragePriceState,
} from '@/utils/firebaseDb'
import { useAuthStore } from '@/store/useAuthStore'

const { Text, Title } = Typography

function FinancialTool() {
  const { isAuthed, userId } = useAuthStore()
  const [dataSource, setDataSource] = useState<PriceRow[]>(() => getDefaultRows())
  const [isHydrated, setIsHydrated] = useState(false)
  const [isFetchingCloud, setIsFetchingCloud] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasLoadedCloud, setHasLoadedCloud] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)

  const totalValue = useMemo(
    () =>
      dataSource.reduce((total, item) => {
        return total + getCalculatedValue(item)
      }, 0),
    [dataSource]
  )

  const averageValue = useMemo(() => {
    const validRows = dataSource.filter((item) => {
      return typeof item.inputVal === 'number' && item.inputVal > 0
    })

    if (validRows.length === 0) return 0

    const totalInput = validRows.reduce((total, item) => {
      return total + (item.inputVal || 0)
    }, 0)

    return totalInput / validRows.length
  }, [dataSource])

  const handleValueChange = useCallback(
    (key: number, field: 'inputVal' | 'weight', value: number | null) => {
      setDataSource((currentRows) => {
        return currentRows.map((item) => {
          if (item.key !== key) return item

          if (field === 'inputVal') {
            return {
              ...item,
              inputVal: value,
            }
          }

          return {
            ...item,
            weight: value ?? 0,
          }
        })
      })
    },
    []
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
        rows: dataSource,
        updatedAt,
      })
      setLastSyncedAt(updatedAt)
      message.success('Đồng bộ thành công')
    } catch {
      message.error('Đồng bộ thất bại')
    } finally {
      setIsSyncing(false)
    }
  }, [dataSource, isAuthed, userId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const rawState = localStorage.getItem(LOCAL_STORAGE_KEY)

      if (!rawState) {
        setIsHydrated(true)
        return
      }

      const parsedState = JSON.parse(rawState)
      setDataSource(normalizeRows(parsedState?.rows))
      setLastSyncedAt(getSafeTimestamp(parsedState?.updatedAt))
    } catch {
      setDataSource(getDefaultRows())
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return

    const payload: StoredAveragePriceState = {
      rows: dataSource,
      updatedAt: lastSyncedAt,
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
  }, [dataSource, isHydrated, lastSyncedAt])

  useEffect(() => {
    if (!isHydrated || !isAuthed || !userId || hasLoadedCloud) return

    let isCancelled = false

    async function loadCloudState() {
      setIsFetchingCloud(true)

      try {
        const cloudState = await fbGetAveragePriceState(userId)
        if (isCancelled || !cloudState) return

        const normalizedRows = normalizeRows(cloudState.rows)
        const updatedAt = getSafeTimestamp(cloudState.updatedAt)

        setDataSource(normalizedRows)
        setLastSyncedAt(updatedAt)
      } catch {
        if (!isCancelled) message.error('Không tải được dữ liệu đồng bộ')
      } finally {
        if (!isCancelled) {
          setIsFetchingCloud(false)
          setHasLoadedCloud(true)
        }
      }
    }

    loadCloudState()

    return () => {
      isCancelled = true
    }
  }, [hasLoadedCloud, isAuthed, isHydrated, userId])

  useEffect(() => {
    if (isAuthed && userId) return
    setHasLoadedCloud(false)
  }, [isAuthed, userId])

  const columns: ColumnsType<PriceRow> = [
    {
      title: 'Khoảng giá',
      dataIndex: 'range',
      key: 'range',
      align: 'center',
      width: 140,
    },
    {
      title: 'Giá trị nhập (VNĐ)',
      dataIndex: 'inputVal',
      key: 'inputVal',
      align: 'center',
      render: (_, record) => {
        return (
          <InputNumber
            aria-label={`Giá trị nhập ${record.range}`}
            className='w-full'
            controls={false}
            inputMode='decimal'
            min={0}
            parser={parseNumericString}
            placeholder='Nhập giá trị'
            value={record.inputVal}
        
            onChange={(value) => {
              handleValueChange(record.key, 'inputVal', value)
            }}
          />
        )
      },
    },
    {
      title: 'Tỷ trọng',
      dataIndex: 'weight',
      key: 'weight',
      align: 'center',
      width: 140,
      render: (_, record) => {
        return (
          <InputNumber
            aria-label={`Tỷ trọng ${record.range}`}
            className='w-full'
            controls={false}
            inputMode='decimal'
            min={0}
            parser={parseNumericString}
            step={0.1}
            value={record.weight}
            onChange={(value) => {
              handleValueChange(record.key, 'weight', value)
            }}
          />
        )
      },
    },
    {
      title: 'Giá trị tính toán',
      key: 'calculated',
      align: 'center',
      render: (_, record) => {
        return <Text strong>{formatCurrency(getCalculatedValue(record))}</Text>
      },
    },
  ]

  return (
    <div className='min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-6'>
      <div className='mx-auto max-w-5xl space-y-4'>
        <div className='space-y-1'>
          <Title level={3} className='!mb-0'>
            Trung bình giá
          </Title>
          <Text type='secondary'>
            Nhập giá và tỷ trọng, dữ liệu sẽ được lưu tại máy và có thể
            đồng bộ theo tài khoản.
          </Text>
        </div>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <Card className='rounded-xl'>
            <Text type='secondary'>Tổng cộng</Text>
            <div className='mt-2 text-2xl font-bold text-red-500'>
              {totalValue} VNĐ
            </div>
          </Card>
          <Card className='rounded-xl'>
            <Text type='secondary'>Trung bình</Text>
            <div className='mt-2 text-2xl font-bold text-sky-600'>
              {averageValue} VNĐ
            </div>
          </Card>
        </div>

        <Card className='rounded-xl'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='space-y-1'>
              <Text strong>Đồng bộ dữ liệu</Text>
              <div className='text-sm text-gray-500'>
                {getSyncMessage({
                  isAuthed,
                  isFetchingCloud,
                  lastSyncedAt,
                })}
              </div>
            </div>

            <Button
              type='primary'
              className='w-full sm:w-auto'
              loading={isSyncing}
              disabled={!isAuthed || !userId}
              onClick={handleSync}
            >
              Đồng bộ
            </Button>
          </div>
        </Card>

        <div className='space-y-3 md:hidden'>
          {dataSource.map((item) => {
            return (
              <Card key={item.key} className='rounded-xl'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Text strong>{item.range}</Text>
                    <Text type='secondary'>
                      {formatCurrency(getCalculatedValue(item))} VNĐ
                    </Text>
                  </div>

                  <div className='space-y-2'>
                    <Text type='secondary'>Giá trị nhập</Text>
                    <InputNumber
                      aria-label={`Giá trị nhập ${item.range}`}
                      className='w-full'
                      controls={false}
                      inputMode='decimal'
                      min={0}
                      parser={parseNumericString}
                      placeholder='Nhập giá trị'
                      value={item.inputVal}
                      formatter={formatInputValue}
                      onChange={(value) => {
                        handleValueChange(item.key, 'inputVal', value)
                      }}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Text type='secondary'>Tỷ trọng</Text>
                    <InputNumber
                      aria-label={`Tỷ trọng ${item.range}`}
                      className='w-full'
                      controls={false}
                      inputMode='decimal'
                      min={0}
                      parser={parseNumericString}
                      step={0.1}
                      value={item.weight}
                      onChange={(value) => {
                        handleValueChange(item.key, 'weight', value)
                      }}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className='hidden rounded-xl md:block'>
          <Table
            rowKey='key'
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            bordered
          />
        </Card>

        <Divider className='!my-2' />
        <Text italic type='secondary'>
          Chúc bạn quản lý tài chính hiệu quả!
        </Text>
      </div>
    </div>
  )
}

function getDefaultRows(): PriceRow[] {
  return DEFAULT_ROWS.map((item) => {
    return {
      ...item,
      inputVal: null,
    }
  })
}

function normalizeRows(input: unknown): PriceRow[] {
  if (!Array.isArray(input)) return getDefaultRows()

  return DEFAULT_ROWS.map((defaultRow) => {
    const matchedRow = input.find((item) => {
      return typeof item === 'object' && item !== null &&
        'key' in item && item.key === defaultRow.key
    })

    if (!matchedRow || typeof matchedRow !== 'object') {
      return {
        ...defaultRow,
        inputVal: null,
      }
    }

    const inputVal =
      typeof matchedRow.inputVal === 'number' ? matchedRow.inputVal : null
    const weight =
      typeof matchedRow.weight === 'number' ? matchedRow.weight : defaultRow.weight

    return {
      key: defaultRow.key,
      range: defaultRow.range,
      inputVal,
      weight,
    }
  })
}

function getCalculatedValue(item: PriceRow): number {
  return (item.inputVal || 0) * item.weight
}

function getSafeTimestamp(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value
}

function parseNumericString(value: string | undefined): string {
  if (!value) return ''
  return value.replace(/[^\d.]/g, '')
}

function formatInputValue(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return ''
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatCurrency(value: number): string {
  return value
}

function getSyncMessage({
  isAuthed,
  isFetchingCloud,
  lastSyncedAt,
}: SyncMessageOptions): string {
  if (!isAuthed) return 'Đăng nhập để đồng bộ dữ liệu giữa các thiết bị'
  if (isFetchingCloud) return 'Đang tải dữ liệu đã đồng bộ...'
  if (!lastSyncedAt) return 'Chưa có lần đồng bộ nào'
  return `Lần đồng bộ gần nhất: ${new Date(lastSyncedAt).toLocaleString(
    'vi-VN'
  )}`
}

export default FinancialTool

const LOCAL_STORAGE_KEY = 'average-price-tool-state'

const DEFAULT_ROWS: DefaultPriceRow[] = [
  { key: 1, range: 'Giá 1', weight: 0.5 },
  { key: 2, range: 'Giá 2', weight: 0.5 },
  { key: 3, range: 'Giá 3', weight: 0.5 },
  { key: 4, range: 'Giá 4', weight: 0.5 },
  { key: 5, range: 'Giá 5', weight: 1 },
  { key: 6, range: 'Giá 6', weight: 1 },
  { key: 7, range: 'Giá 7', weight: 1.5 },
  { key: 8, range: 'Giá 8', weight: 1.5 },
]

interface PriceRow {
  key: number
  range: string
  inputVal: number | null
  weight: number
}

interface DefaultPriceRow {
  key: number
  range: string
  weight: number
}

interface StoredAveragePriceState {
  rows: PriceRow[]
  updatedAt: number | null
}

interface SyncMessageOptions {
  isAuthed: boolean
  isFetchingCloud: boolean
  lastSyncedAt: number | null
}
