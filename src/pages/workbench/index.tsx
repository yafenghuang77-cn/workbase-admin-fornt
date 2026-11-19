import { useState } from 'react';

import {
  BarChartOutlined,
  CheckSquareOutlined,
  DownloadOutlined,
  FileTextOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type { TableColumnsType } from 'antd';
import { App, Button, Card, ConfigProvider, Form, Input, Modal, Table, Tag } from 'antd';
import dayjs from 'dayjs';

import { workbenchTheme } from '@/layout/theme';

import type { Task } from './data';
import { initialTasks } from './data';

import './index.less';

const statistics = [
  { value: '24', label: '待办任务', comparison: '较昨日 +12%', icon: <CheckSquareOutlined /> },
  { value: '128', label: '本月新增客户', comparison: '较上月 +8.2%', icon: <TeamOutlined /> },
  {
    value: '56',
    label: '处理中工单',
    comparison: '较昨日 −3%',
    icon: <FileTextOutlined />,
    negative: true,
  },
  { value: '99.9%', label: '服务可用率', comparison: '较上周 +0.1%', icon: <BarChartOutlined /> },
];

const statusColors: Record<string, string> = {
  进行中: 'processing',
  待处理: 'warning',
  已完成: 'success',
  已逾期: 'error',
};

type TaskValues = Pick<Task, 'name' | 'owner'>;

export const WorkbenchPage = () => {
  const { message, modal } = App.useApp();
  const [tasks, setTasks] = useState(initialTasks);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [form] = Form.useForm<TaskValues>();
  const openEditor = (task: Task | 'new') => {
    form.setFieldsValue(task === 'new' ? { name: '', owner: '王小明' } : task);
    setEditing(task);
  };
  const saveTask = (values: TaskValues) => {
    const task: Task = {
      ...values,
      id: editing && editing !== 'new' ? editing.id : crypto.randomUUID(),
      status: editing && editing !== 'new' ? editing.status : '待处理',
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    };
    setTasks((current) =>
      editing === 'new'
        ? [task, ...current]
        : current.map((item) => (item.id === task.id ? task : item)),
    );
    setEditing(null);
    void message.success('保存成功');
  };
  const columns: TableColumnsType<Task> = [
    { title: '任务名称', dataIndex: 'name', width: '32%' },
    { title: '负责人', dataIndex: 'owner', width: '14%', className: 'workbench-task-muted' },
    {
      title: '状态',
      dataIndex: 'status',
      width: '14%',
      render: (status: string) => (
        <Tag
          className="workbench-task-status"
          color={statusColors[status] ?? 'default'}
          variant="filled"
        >
          {status}
        </Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: '20%', className: 'workbench-task-muted' },
    {
      title: '操作',
      key: 'actions',
      render: (_, task) => (
        <div className="workbench-task-actions">
          <Button type="link" onClick={() => openEditor(task)}>
            编辑
          </Button>
          <Button
            type="link"
            onClick={() => {
              modal.info({
                title: task.name,
                content: (
                  <>
                    <p>负责人：{task.owner}</p>
                    <p>状态：{task.status}</p>
                    <p>更新时间：{task.updatedAt}</p>
                  </>
                ),
              });
            }}
          >
            详情
          </Button>
        </div>
      ),
    },
  ];
  const exportTasks = () => {
    const csv = [
      ['任务名称', '负责人', '状态', '更新时间'],
      ...tasks.map((task) => [task.name, task.owner, task.status, task.updatedAt]),
    ]
      .map((row) =>
        row.map((value) => `"${value.replace(/"/gu, '""').replace(/^[=+@-]/u, "'$&")}"`).join(','),
      )
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = '近期任务.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <ConfigProvider theme={workbenchTheme}>
      <div className="workbench">
        <PageContainer
          title={<h1 className="workbench-title">工作台</h1>}
          breadcrumbRender={false}
          token={{ paddingInlinePageContainerContent: 0, paddingBlockPageContainerContent: 0 }}
          content="欢迎回来，王小明。今天有 24 项待办任务等待处理。"
          extra={[
            <Button
              key="create"
              aria-label="新建任务"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEditor('new')}
            >
              新建任务
            </Button>,
            <Button
              aria-label="导出"
              key="export"
              icon={<DownloadOutlined />}
              onClick={exportTasks}
            >
              导出
            </Button>,
          ]}
        >
          <div className="workbench-statistics">
            {statistics.map((stat) => (
              <Card
                key={stat.label}
                variant="borderless"
                className="workbench-statistic"
                classNames={{ body: 'workbench-statistic-body' }}
              >
                <div className="workbench-statistic-content">
                  <span className="workbench-statistic-icon">{stat.icon}</span>
                  <div>
                    <div className="workbench-statistic-value">{stat.value}</div>
                    <div className="workbench-statistic-label">{stat.label}</div>
                    <div
                      className={
                        stat.negative
                          ? 'workbench-comparison workbench-comparison-negative'
                          : 'workbench-comparison'
                      }
                    >
                      {stat.comparison}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card
            className="workbench-tasks"
            variant="borderless"
            title="近期任务"
            extra={
              <Button type="link" onClick={() => setShowAll((value) => !value)}>
                {showAll ? '收起列表' : '查看全部'}
              </Button>
            }
            classNames={{ body: 'workbench-tasks-body' }}
          >
            <Table<Task>
              rowKey="id"
              columns={columns}
              dataSource={showAll ? tasks : tasks.slice(0, 5)}
              pagination={showAll ? { pageSize: 10, hideOnSinglePage: true } : false}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </PageContainer>
        <Modal
          title={editing === 'new' ? '新建任务' : '编辑任务'}
          open={editing !== null}
          onCancel={() => setEditing(null)}
          onOk={() => form.submit()}
          okText="保存"
        >
          <Form form={form} layout="vertical" onFinish={saveTask}>
            <Form.Item
              name="name"
              label="任务名称"
              rules={[{ required: true, whitespace: true, message: '请输入任务名称' }]}
            >
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item
              name="owner"
              label="负责人"
              rules={[{ required: true, whitespace: true, message: '请输入负责人' }]}
            >
              <Input maxLength={30} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};
