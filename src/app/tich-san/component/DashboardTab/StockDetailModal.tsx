'use client';

import React, { useState } from 'react';
import {
    Modal,
    Tabs,
    Row,
    Col,
    Card,
    Form,
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
} from 'antd';
import {
    PlusCircleOutlined,
    DollarCircleOutlined,
    HistoryOutlined,
    DeleteOutlined,
    RedoOutlined,
    SettingOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import {
    StockTrackerDoc,
    TransactionLog,
    addTransactionLog,
    removeTransactionLog,
    resetStockDca,
    resetStockTp,
    resetStockCycle,
    updateStockDropLevels,
} from '@/services/stockFirebaseService';
import { DROP_LEVELS, DEFAULT_DROP_LEVELS } from '@/utils/dcaConfig';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface StockDetailModalProps {
    visible: boolean;
    onClose: () => void;
    stockDoc: StockTrackerDoc | null;
    currentPrice?: number;
    yearHigh?: number;
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
    userId,
    onRefresh,
}: StockDetailModalProps) {
    const [buyForm] = Form.useForm();
    const [sellForm] = Form.useForm();
    const [configForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // Tự động set giá trị ban đầu khi mở Modal
    React.useEffect(() => {
        if (visible && stockDoc) {
            buyForm.setFieldsValue({ tier: 'DCA 1' });
            sellForm.setFieldsValue({ volumePercent: 50 });

            const levels = stockDoc.dropLevels && stockDoc.dropLevels.length === 4
                ? stockDoc.dropLevels
                : (DROP_LEVELS[stockDoc.symbol] || DEFAULT_DROP_LEVELS);

            configForm.setFieldsValue({
                dca1: levels[0],
                dca2: levels[1],
                dca3: levels[2],
                dca4: levels[3],
            });
        }
    }, [visible, stockDoc]);

    if (!stockDoc) return null;

    const { symbol, position } = stockDoc;
    const { totalAllocatedPercent = 0, realizedProfitPercent = 0, logs = [] } = position || {};

    // Xử lý nộp form Mua DCA (theo % tỷ trọng)
    const handleBuySubmit = async (values: any) => {
        setSubmitting(true);
        try {
            const selectedTierObj = DCA_TIER_OPTIONS.find((t) => t.value === values.tier);
            const volumePercent = selectedTierObj ? selectedTierObj.weight : 15;

            await addTransactionLog(
                symbol,
                {
                    action: 'BUY_DCA',
                    tier: values.tier,
                    volumePercent: Number(volumePercent),
                    note: values.note || '',
                },
                userId
            );

            message.success(`Đã ghi nhận Mua ${values.tier} (${volumePercent}% vốn) cho ${symbol}`);
            buyForm.resetFields();
            if (onRefresh) onRefresh();
            onClose(); // Tự động đóng modal
        } catch (err: any) {
            console.error('Lỗi lưu giao dịch Mua DCA:', err);
            message.error(err?.message || 'Lỗi khi ghi nhận giao dịch mua');
        } finally {
            setSubmitting(false);
        }
    };

    // Xử lý nộp form Chốt lời (theo % lượng hàng)
    const handleSellSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            await addTransactionLog(
                symbol,
                {
                    action: 'TAKE_PROFIT',
                    volumePercent: Number(values.volumePercent),
                    note: values.note || '',
                },
                userId
            );

            message.success(`Đã ghi nhận chốt lời ${values.volumePercent}% cho ${symbol}`);
            sellForm.resetFields();
            if (onRefresh) onRefresh();
            onClose(); // Tự động đóng modal
        } catch (err: any) {
            console.error('Lỗi lưu giao dịch Chốt lời:', err);
            message.error(err?.message || 'Lỗi khi ghi nhận chốt lời');
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
        } catch (err: any) {
            console.error('Lỗi xóa log:', err);
            message.error(err?.message || 'Không thể xóa log');
        }
    };

    // Reset DCA của mã này
    const handleResetDca = async () => {
        try {
            await resetStockDca(symbol, userId);
            message.success(`${symbol}: Đã reset 4 tầng DCA để bắt đầu vòng mua mới`);
            if (onRefresh) onRefresh();
            onClose(); // Tự động đóng modal
        } catch (err: any) {
            message.error('Lỗi khi reset DCA');
        }
    };

    // Reset Chốt lời của mã này
    const handleResetTp = async () => {
        try {
            await resetStockTp(symbol, userId);
            message.success(`${symbol}: Đã reset 4 mức Chốt lời`);
            if (onRefresh) onRefresh();
            onClose(); // Tự động đóng modal
        } catch (err: any) {
            message.error('Lỗi khi reset Chốt lời');
        }
    };

    // Reset Toàn bộ Chu kỳ của mã này
    const handleResetCycle = async () => {
        try {
            await resetStockCycle(symbol, userId);
            message.success(`${symbol}: Đã reset toàn bộ vị thế để bắt đầu chu kỳ năm mới`);
            if (onRefresh) onRefresh();
            onClose(); // Tự động đóng modal
        } catch (err: any) {
            message.error('Lỗi khi reset chu kỳ');
        }
    };

    // Lưu cấu hình 4 mức giảm DCA
    const handleSaveConfig = async (values: any) => {
        setSubmitting(true);
        try {
            const d1 = Number(values.dca1);
            const d2 = Number(values.dca2);
            const d3 = Number(values.dca3);
            const d4 = Number(values.dca4);

            const newLevels = [
                d1 > 0 ? -d1 : d1,
                d2 > 0 ? -d2 : d2,
                d3 > 0 ? -d3 : d3,
                d4 > 0 ? -d4 : d4,
            ];

            await updateStockDropLevels(symbol, newLevels, userId);
            message.success(`Đã lưu cấu hình mức giảm DCA cho ${symbol}: [${newLevels.join('%, ')}%]`);
            if (onRefresh) onRefresh();
            onClose(); // Tự động đóng modal
        } catch (err: any) {
            console.error('Lỗi lưu cấu hình:', err);
            message.error('Không thể lưu cấu hình mức giảm');
        } finally {
            setSubmitting(false);
        }
    };

    // Áp dụng Preset nhanh
    const applyPreset = (presetLevels: number[]) => {
        configForm.setFieldsValue({
            dca1: presetLevels[0],
            dca2: presetLevels[1],
            dca3: presetLevels[2],
            dca4: presetLevels[3],
        });
    };

    // Cấu hình bảng Logs (Thuần theo tỷ trọng %)
    const logColumns: ColumnsType<TransactionLog> = [
        {
            title: 'Thời gian',
            dataIndex: 'date',
            key: 'date',
            render: (d: string) =>
                new Date(d).toLocaleDateString('vi-VN', {
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
            title: 'Tỷ trọng (%)',
            dataIndex: 'volumePercent',
            key: 'volumePercent',
            render: (v: number, record: TransactionLog) => (
                <Text strong style={{ color: record.action === 'BUY_DCA' ? '#f59e0b' : '#10b981' }}>
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
                    description="Vị thế sẽ được tính toán lại tự động."
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 28 }}>
                    <Space>
                        <Tag color="purple" style={{ fontSize: 16, fontWeight: 700, padding: '4px 12px' }}>
                            {symbol}
                        </Tag>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>
                            Quản lý Vị thế & Nhật ký Giao dịch
                        </span>
                    </Space>

                    <Space size={8}>
                        <Popconfirm
                            title={`Reset DCA cho ${symbol}?`}
                            description="Sẽ bỏ tích 4 ô DCA và đưa vốn đã vào về 0% để bắt đầu vòng mua mới."
                            onConfirm={handleResetDca}
                            okText="Reset DCA"
                            cancelText="Hủy"
                        >
                            <Button size="small" icon={<RedoOutlined />}>
                                Reset DCA
                            </Button>
                        </Popconfirm>

                        <Popconfirm
                            title={`Reset Chốt lời cho ${symbol}?`}
                            description="Sẽ bỏ tích 4 ô Chốt lời và đưa tỷ lệ đã chốt về 0%."
                            onConfirm={handleResetTp}
                            okText="Reset Chốt lời"
                            cancelText="Hủy"
                        >
                            <Button size="small" icon={<RedoOutlined />}>
                                Reset Chốt lời
                            </Button>
                        </Popconfirm>

                        <Popconfirm
                            title={`Bắt đầu chu kỳ năm mới cho ${symbol}?`}
                            description="Sẽ xóa sạch trạng thái DCA, Chốt lời và lịch sử của mã này."
                            onConfirm={handleResetCycle}
                            okText="Reset Tất Cả"
                            okButtonProps={{ danger: true }}
                            cancelText="Hủy"
                        >
                            <Button size="small" danger icon={<RedoOutlined />}>
                                Reset Vòng Mới
                            </Button>
                        </Popconfirm>
                    </Space>
                </div>
            }
            open={visible}
            onCancel={onClose}
            width={780}
            footer={null}
            destroyOnClose
            centered
        >
            {/* 1. Phần Tổng quan vị thế */}
            <div style={{ marginTop: 16, marginBottom: 20 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    Vốn đã vào (DCA)
                                </Text>
                                <Text strong style={{ color: '#f59e0b', fontSize: 14 }}>
                                    {totalAllocatedPercent}%
                                </Text>
                            </div>
                            <Progress
                                percent={totalAllocatedPercent}
                                size="small"
                                status="active"
                                strokeColor="#f59e0b"
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    Tiến độ đã chốt lời
                                </Text>
                                <Text strong style={{ color: '#10b981', fontSize: 14 }}>
                                    {realizedProfitPercent}%
                                </Text>
                            </div>
                            <Progress
                                percent={realizedProfitPercent}
                                size="small"
                                strokeColor="#10b981"
                            />
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* 2. Tabs thao tác giao dịch, lịch sử & cấu hình */}
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
                                        tier: 'DCA 1',
                                    }}
                                >
                                    <Form.Item
                                        name="tier"
                                        label="Chọn tầng DCA đã khớp"
                                        rules={[{ required: true, message: 'Vui lòng chọn tầng DCA' }]}
                                    >
                                        <Select options={DCA_TIER_OPTIONS} size="large" />
                                    </Form.Item>
                                    <Form.Item name="note" label="Ghi chú (Tùy chọn)">
                                        <Input placeholder="VD: Khớp phiên sáng, bắt đầu giải ngân..." />
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
                                        volumePercent: 50,
                                    }}
                                >
                                    <Form.Item
                                        name="volumePercent"
                                        label="Tỷ lệ % lượng hàng chốt"
                                        rules={[{ required: true, message: 'Vui lòng chọn tỷ lệ % chốt' }]}
                                    >
                                        <Select
                                            size="large"
                                            options={[
                                                { value: 25, label: 'Chốt 25% danh mục' },
                                                { value: 33, label: 'Chốt 1/3 (33%) danh mục' },
                                                { value: 50, label: 'Chốt 1/2 (50%) danh mục' },
                                                { value: 100, label: 'Chốt toàn bộ (100%)' },
                                            ]}
                                        />
                                    </Form.Item>
                                    <Form.Item name="note" label="Ghi chú (Tùy chọn)">
                                        <Input placeholder="VD: Đạt target mục tiêu, chốt 50% bảo toàn vốn..." />
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
                        key: 'config',
                        label: (
                            <span>
                                <SettingOutlined /> Cấu hình mức giảm DCA
                            </span>
                        ),
                        children: (
                            <Card size="small" style={{ borderRadius: 10 }}>
                                <div style={{ marginBottom: 12 }}>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        Tùy chỉnh 4 mức % giảm từ đỉnh kích hoạt tín hiệu DCA cho <strong>{symbol}</strong> (Lưu trên Firebase):
                                    </Text>
                                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        <Button size="small" onClick={() => applyPreset([-25, -40, -50, -60])}>
                                            Mặc định (-25, -40, -50, -60)
                                        </Button>
                                        <Button size="small" onClick={() => applyPreset([-30, -45, -55, -65])}>
                                            Bất động sản (-30, -45, -55, -65)
                                        </Button>
                                        <Button size="small" onClick={() => applyPreset([-20, -35, -50, -60])}>
                                            Thép / Vật liệu (-20, -35, -50, -60)
                                        </Button>
                                        <Button size="small" onClick={() => applyPreset([-25, -40, -50, -55])}>
                                            Ngân hàng (-25, -40, -50, -55)
                                        </Button>
                                    </div>
                                </div>

                                <Form form={configForm} layout="vertical" onFinish={handleSaveConfig}>
                                    <Row gutter={12}>
                                        <Col xs={12} sm={6}>
                                            <Form.Item
                                                name="dca1"
                                                label="DCA 1 (15% Vốn)"
                                                rules={[{ required: true, message: 'Nhập % DCA 1' }]}
                                            >
                                                <Input suffix="%" placeholder="-25" style={{ fontWeight: 600 }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={12} sm={6}>
                                            <Form.Item
                                                name="dca2"
                                                label="DCA 2 (25% Vốn)"
                                                rules={[{ required: true, message: 'Nhập % DCA 2' }]}
                                            >
                                                <Input suffix="%" placeholder="-40" style={{ fontWeight: 600 }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={12} sm={6}>
                                            <Form.Item
                                                name="dca3"
                                                label="DCA 3 (35% Vốn)"
                                                rules={[{ required: true, message: 'Nhập % DCA 3' }]}
                                            >
                                                <Input suffix="%" placeholder="-50" style={{ fontWeight: 600 }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={12} sm={6}>
                                            <Form.Item
                                                name="dca4"
                                                label="DCA 4 (25% Vốn)"
                                                rules={[{ required: true, message: 'Nhập % DCA 4' }]}
                                            >
                                                <Input suffix="%" placeholder="-60" style={{ fontWeight: 600 }} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={submitting}
                                        icon={<SaveOutlined />}
                                        style={{ background: '#6366f1', borderColor: '#6366f1' }}
                                    >
                                        Lưu cấu hình mức giảm lên Firebase
                                    </Button>
                                </Form>
                            </Card>
                        ),
                    },
                    {
                        key: 'logs',
                        label: (
                            <span>
                                <HistoryOutlined /> Lịch sử giao dịch ({logs.length})
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
