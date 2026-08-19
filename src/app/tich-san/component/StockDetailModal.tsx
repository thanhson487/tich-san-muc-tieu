'use client';

import React, { useState } from 'react';
import {
    Modal,
    Tabs,
    Row,
    Col,
    Card,
    Statistic,
    Form,
    InputNumber,
    Select,
    Input,
    Button,
    Table,
    Tag,
    Popconfirm,
    message,
    Typography,
    Space,
    Progress,
    Divider,
} from 'antd';
import {
    ArrowUpOutlined,
    ArrowDownOutlined,
    PlusCircleOutlined,
    DollarCircleOutlined,
    HistoryOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import {
    StockTrackerDoc,
    TransactionLog,
    addTransactionLog,
    removeTransactionLog,
} from '@/services/stockFirebaseService';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;

interface StockDetailModalProps {
    visible: boolean;
    onClose: () => void;
    stockDoc: StockTrackerDoc | null;
    currentPrice: number;
    yearHigh: number;
    userId?: string;
    onRefresh?: () => void;
}

const DCA_TIER_OPTIONS = [
    { value: 'DCA 1', label: 'DCA 1 · 15% Vốn', weight: 15 },
    { value: 'DCA 2', label: 'DCA 2 · 25% Vốn', weight: 25 },
    { value: 'DCA 3', label: 'DCA 3 · 35% Vốn', weight: 35 },
    { value: 'DCA 4', label: 'DCA 4 · 25% Vốn', weight: 25 },
];

export default function StockDetailModal({
    visible,
    onClose,
    stockDoc,
    currentPrice,
    yearHigh,
    userId,
    onRefresh,
}: StockDetailModalProps) {
    const [buyForm] = Form.useForm();
    const [sellForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    if (!stockDoc) return null;

    const { symbol, position } = stockDoc;
    const { avgPrice, totalAllocatedPercent, realizedProfitPercent, logs = [] } = position;

    const hasPosition = avgPrice > 0 && totalAllocatedPercent > 0;
    const profitRate = hasPosition ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
    const isProfit = profitRate >= 0;

    const formatPrice = (p: number) => {
        if (!p && p !== 0) return '-';
        return new Intl.NumberFormat('vi-VN').format(p) + ' đ';
    };

    // Xử lý nộp form Mua DCA
    const handleBuySubmit = async (values: any) => {
        setSubmitting(true);
        try {
            const selectedTierObj = DCA_TIER_OPTIONS.find((t) => t.value === values.tier);
            const volumePercent = selectedTierObj ? selectedTierObj.weight : values.volumePercent || 15;

            await addTransactionLog(
                symbol,
                {
                    action: 'BUY_DCA',
                    tier: values.tier,
                    price: Number(values.price),
                    volumePercent: Number(volumePercent),
                    note: values.note || '',
                },
                userId
            );

            message.success(`Đã ghi nhận giao dịch Mua ${values.tier} cho ${symbol}`);
            buyForm.resetFields();
            if (onRefresh) onRefresh();
        } catch (err) {
            message.error('Lỗi khi ghi nhận giao dịch mua');
        } finally {
            setSubmitting(false);
        }
    };

    // Xử lý nộp form Chốt lời
    const handleSellSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            await addTransactionLog(
                symbol,
                {
                    action: 'TAKE_PROFIT',
                    price: Number(values.price),
                    volumePercent: Number(values.volumePercent),
                    note: values.note || '',
                },
                userId
            );

            message.success(`Đã ghi nhận chốt lời ${values.volumePercent}% cho ${symbol}`);
            sellForm.resetFields();
            if (onRefresh) onRefresh();
        } catch (err) {
            message.error('Lỗi khi ghi nhận chốt lời');
        } finally {
            setSubmitting(false);
        }
    };

    // Xóa một log giao dịch
    const handleDeleteLog = async (logId: string) => {
        try {
            await removeTransactionLog(symbol, logId, userId);
            message.success('Đã xóa log giao dịch');
            if (onRefresh) onRefresh();
        } catch (err) {
            message.error('Không thể xóa log');
        }
    };

    // Cấu hình bảng Logs
    const logColumns: ColumnsType<TransactionLog> = [
        {
            title: 'Thời gian',
            dataIndex: 'date',
            key: 'date',
            render: (d: string) => new Date(d).toLocaleDateString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            }),
        },
        {
            title: 'Hành động',
            dataIndex: 'action',
            key: 'action',
            render: (action: string, record: TransactionLog) => {
                if (action === 'BUY_DCA') {
                    return (
                        <Tag color="orange" icon={<PlusCircleOutlined />}>
                            {record.tier || 'MUA DCA'}
                        </Tag>
                    );
                }
                return (
                    <Tag color="green" icon={<DollarCircleOutlined />}>
                        CHỐT LỜI
                    </Tag>
                );
            },
        },
        {
            title: 'Giá khớp',
            dataIndex: 'price',
            key: 'price',
            render: (p: number) => <Text strong>{formatPrice(p)}</Text>,
        },
        {
            title: 'Tỷ trọng (%)',
            dataIndex: 'volumePercent',
            key: 'volumePercent',
            render: (v: number, record: TransactionLog) => (
                <Text style={{ color: record.action === 'BUY_DCA' ? '#f59e0b' : '#10b981' }}>
                    {record.action === 'BUY_DCA' ? `+${v}% vốn` : `Chốt ${v}% hàng`}
                </Text>
            ),
        },
        {
            title: 'Ghi chú',
            dataIndex: 'note',
            key: 'note',
            render: (note: string) => note || '-',
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: any, record: TransactionLog) => (
                <Popconfirm
                    title="Xác nhận xóa giao dịch này?"
                    description="Vị thế và giá vốn sẽ được tính toán lại tự động."
                    onConfirm={() => handleDeleteLog(record.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <Modal
            title={
                <Space>
                    <Tag color="purple" style={{ fontSize: 16, fontWeight: 700, padding: '4px 12px' }}>
                        {symbol}
                    </Tag>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>
                        Chi tiết vị thế, Nhật ký Mua DCA & Chốt lời
                    </span>
                </Space>
            }
            open={visible}
            onCancel={onClose}
            width={850}
            footer={null}
            destroyOnClose
            centered
        >
            {/* 1. Phần Tổng quan vị thế */}
            <div style={{ marginTop: 16, marginBottom: 20 }}>
                <Row gutter={[12, 12]}>
                    <Col xs={12} sm={6}>
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <Statistic
                                title="Giá vốn TB"
                                value={avgPrice ? formatPrice(avgPrice) : 'Chưa vào hàng'}
                                valueStyle={{ color: '#8b5cf6', fontSize: 15, fontWeight: 700 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <Statistic
                                title="Lãi / Lỗ tạm tính"
                                value={hasPosition ? Math.abs(profitRate).toFixed(2) + '%' : '0%'}
                                prefix={hasPosition ? (isProfit ? <ArrowUpOutlined /> : <ArrowDownOutlined />) : null}
                                valueStyle={{
                                    color: hasPosition ? (isProfit ? '#10b981' : '#ef4444') : '#6b7280',
                                    fontSize: 15,
                                    fontWeight: 700,
                                }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Vốn đã vào: <strong>{totalAllocatedPercent}%</strong>
                            </Text>
                            <Progress
                                percent={totalAllocatedPercent}
                                size="small"
                                status="active"
                                strokeColor="#f59e0b"
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Đã chốt lời: <strong>{realizedProfitPercent}%</strong>
                            </Text>
                            <Progress
                                percent={realizedProfitPercent}
                                size="small"
                                strokeColor="#10b981"
                            />
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* 2. Tabs thao tác giao dịch & lịch sử */}
            <Tabs
                defaultActiveKey="logs"
                items={[
                    {
                        key: 'buy',
                        label: (
                            <span>
                                <PlusCircleOutlined /> Ghi nhận Mua DCA
                            </span>
                        ),
                        children: (
                            <Card size="small" style={{ borderRadius: 10 }}>
                                <Form
                                    form={buyForm}
                                    layout="vertical"
                                    onFinish={handleBuySubmit}
                                    initialValues={{
                                        price: currentPrice || undefined,
                                        tier: 'DCA 1',
                                    }}
                                >
                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="tier"
                                                label="Tầng DCA khớp lệnh"
                                                rules={[{ required: true, message: 'Vui lòng chọn tầng DCA' }]}
                                            >
                                                <Select options={DCA_TIER_OPTIONS} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="price"
                                                label="Giá mua thực tế (VNĐ)"
                                                rules={[{ required: true, message: 'Vui lòng nhập giá mua' }]}
                                            >
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                    parser={(v) => Number(v?.replace(/\$\s?|(,*)/g, ''))}
                                                    step={100}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item name="note" label="Ghi chú">
                                        <Input placeholder="VD: Khớp phiên sáng, đạt chiết khấu đẹp..." />
                                    </Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={submitting}
                                        icon={<PlusCircleOutlined />}
                                        style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                                    >
                                        Lưu giao dịch Mua DCA
                                    </Button>
                                </Form>
                            </Card>
                        ),
                    },
                    {
                        key: 'sell',
                        label: (
                            <span>
                                <DollarCircleOutlined /> Ghi nhận Chốt lời
                            </span>
                        ),
                        children: (
                            <Card size="small" style={{ borderRadius: 10 }}>
                                <Form
                                    form={sellForm}
                                    layout="vertical"
                                    onFinish={handleSellSubmit}
                                    initialValues={{
                                        price: currentPrice || undefined,
                                        volumePercent: 50,
                                    }}
                                >
                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="price"
                                                label="Giá chốt lời (VNĐ)"
                                                rules={[{ required: true, message: 'Vui lòng nhập giá chốt lời' }]}
                                            >
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                    parser={(v) => Number(v?.replace(/\$\s?|(,*)/g, ''))}
                                                    step={100}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="volumePercent"
                                                label="% Lượng hàng chốt"
                                                rules={[{ required: true, message: 'Vui lòng nhập tỷ lệ % chốt' }]}
                                            >
                                                <Select
                                                    options={[
                                                        { value: 25, label: 'Chốt 25% danh mục' },
                                                        { value: 33, label: 'Chốt 1/3 (33%) danh mục' },
                                                        { value: 50, label: 'Chốt 1/2 (50%) danh mục' },
                                                        { value: 100, label: 'Chốt toàn bộ (100%)' },
                                                    ]}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item name="note" label="Ghi chú">
                                        <Input placeholder="VD: Đạt target mục tiêu 20%, chốt 50% hàng..." />
                                    </Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={submitting}
                                        icon={<DollarCircleOutlined />}
                                        style={{ background: '#10b981', borderColor: '#10b981' }}
                                    >
                                        Lưu giao dịch Chốt lời
                                    </Button>
                                </Form>
                            </Card>
                        ),
                    },
                    {
                        key: 'logs',
                        label: (
                            <span>
                                <HistoryOutlined /> Lịch sử vào / ra lệnh ({logs.length})
                            </span>
                        ),
                        children: (
                            <Table
                                rowKey="id"
                                columns={logColumns}
                                dataSource={logs}
                                pagination={false}
                                size="small"
                                bordered
                                locale={{ emptyText: 'Chưa có nhật ký giao dịch nào cho mã này' }}
                            />
                        ),
                    },
                ]}
            />
        </Modal>
    );
}
