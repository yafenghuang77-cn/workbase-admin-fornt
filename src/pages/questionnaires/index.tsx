import { useState } from 'react';

import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useNavigate } from '@tanstack/react-router';
import { App, Button, Dropdown, Space } from 'antd';

import type { Questionnaire, QuestionnaireStatus } from './data';
import { mockQuestionnaires, statusOptions } from './data';

import './index.less';

interface SearchValues {
  id?: string;
  questionnaireId?: string;
  status?: QuestionnaireStatus;
  creator?: string;
  createdAtRange?: [string, string];
  publishedAtRange?: [string, string];
}

const matchesDateRange = (value: string, range?: [string, string]) => {
  if (!range) return true;
  const date = value.slice(0, 10);
  return date >= range[0] && date <= range[1];
};

const actionsByStatus: Record<QuestionnaireStatus, readonly string[]> = {
  draft: ['编辑', '详情', '删除', '预览', '上线'],
  published: ['详情', '预览', '下线'],
  closed: ['编辑', '详情', '删除', '预览', '上线'],
};

export const QuestionnaireListPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [filters, setFilters] = useState<SearchValues>({});
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const idKeyword = filters.id?.trim().toLocaleLowerCase() ?? '';

  const data = mockQuestionnaires.filter(
    (item) =>
      (!filters.questionnaireId || item.id === filters.questionnaireId) &&
      item.id.toLocaleLowerCase().includes(idKeyword) &&
      (!filters.status || item.status === filters.status) &&
      (!filters.creator || item.creator === filters.creator) &&
      matchesDateRange(item.createdAt, filters.createdAtRange) &&
      matchesDateRange(item.publishedAt, filters.publishedAtRange),
  );
  const showActionMessage = (action: string) => {
    void message.info(`${action}功能暂未实现`);
  };

  const columns: Array<ProColumns<Questionnaire>> = [
    {
      title: '问卷编号',
      dataIndex: 'id',
      className: 'questionnaire-table__id',
      width: 110,
      fixed: 'left',
      fieldProps: { placeholder: '请输入问卷编号' },
    },
    {
      title: '问卷名称',
      dataIndex: 'title',
      className: 'questionnaire-table__name',
      fixed: 'left',
      width: 240,
      ellipsis: true,
      search: false,
    },
    {
      title: '问卷名称',
      dataIndex: 'questionnaireId',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        placeholder: '输入 ID 或名称',
        allowClear: true,
        showSearch: { optionFilterProp: 'label' },
        options: mockQuestionnaires.map((item) => ({
          label: `${item.title}（${item.id}）`,
          value: item.id,
        })),
        notFoundContent: '未找到匹配问卷',
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      valueType: 'select',
      valueEnum: statusOptions,
    },
    { title: '题目数', dataIndex: 'questionCount', width: 90, search: false },
    {
      title: '回收份数',
      dataIndex: 'responseCount',
      width: 110,
      search: false,
      sorter: (a, b) => a.responseCount - b.responseCount,
    },
    {
      title: '创建人',
      dataIndex: 'creator',
      width: 90,
      valueType: 'select',
      fieldProps: {
        placeholder: '请选择创建人',
        options: [...new Set(mockQuestionnaires.map((item) => item.creator))].map((creator) => ({
          label: creator,
          value: creator,
        })),
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      className: 'questionnaire-table__date',
      search: false,
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
    },
    {
      title: '上线时间',
      dataIndex: 'publishedAt',
      width: 180,
      search: false,
      className: 'questionnaire-table__date',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAtRange',
      colSize: 1,
      hideInTable: true,
      valueType: 'dateRange',
      fieldProps: { format: 'YYYY-MM-DD', placeholder: ['创建起始', '创建结束'] },
    },
    {
      title: '上线时间',
      dataIndex: 'publishedAtRange',
      colSize: 1,
      hideInTable: true,
      valueType: 'dateRange',
      fieldProps: { format: 'YYYY-MM-DD', placeholder: ['上线起始', '上线结束'] },
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_, record) => {
        const actions = actionsByStatus[record.status];
        const visibleActions = actions.length > 3 ? actions.slice(0, 2) : actions;
        const moreActions = actions.length > 3 ? actions.slice(2) : [];
        return (
          <Space size={4}>
            {visibleActions.map((action) => (
              <Button
                key={action}
                color={
                  action === '删除'
                    ? 'danger'
                    : ['详情', '预览'].includes(action)
                      ? 'default'
                      : 'primary'
                }
                variant="link"
                size="small"
                className="questionnaire-table__action"
                onClick={() => showActionMessage(action)}
              >
                {action}
              </Button>
            ))}
            {moreActions.length > 0 ? (
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{
                  items: moreActions.map((action) => ({
                    key: action,
                    label: action,
                    danger: action === '删除',
                  })),
                  onClick: ({ key }) => showActionMessage(key),
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<EllipsisOutlined />}
                  aria-label="更多操作"
                />
              </Dropdown>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer className="questionnaire-page" title={false} breadcrumbRender={false}>
      <ProTable<Questionnaire, SearchValues>
        className="questionnaire-table"
        cardProps={{
          className: 'questionnaire-table__card',
          classNames: { body: 'questionnaire-table__card-body' },
        }}
        rowKey="id"
        bordered
        headerTitle={
          <Space size={8}>
            <span>全部问卷</span>
            <span className="questionnaire-table__count">{data.length}</span>
          </Space>
        }
        columns={columns}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              navigate({ to: '/questionnaires/create' }).catch(() => {
                message.error('无法打开新增问卷页面，请重试');
              });
            }}
          >
            新增问卷
          </Button>,
        ]}
        dataSource={data}
        dateFormatter="string"
        search={{
          className: 'questionnaire-table__search',
          layout: 'horizontal',
          labelWidth: 64,
          span: { xs: 24, sm: 24, md: 12, lg: 6, xl: 6, xxl: 6 },
          searchGutter: [20, 16],
          defaultCollapsed: false,
        }}
        options={{ reload: false, density: true, setting: true }}
        scroll={{ x: 1360, y: '100%' }}
        onSubmit={(values) => {
          setFilters(values);
          setCurrent(1);
        }}
        onReset={() => {
          setFilters({});
          setCurrent(1);
        }}
        pagination={{
          current,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: [5, 10, 20],
          showTotal: (total) => `共 ${total} 份问卷`,
          onChange: (page, size) => {
            setCurrent(size === pageSize ? page : 1);
            setPageSize(size);
          },
        }}
      />
    </PageContainer>
  );
};
