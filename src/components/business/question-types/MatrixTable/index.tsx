import { PlusOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { Button, Checkbox, Radio, Table, Tag } from 'antd';

import { DEFAULT_MATRIX_COLUMNS, DEFAULT_MATRIX_ROWS } from '../option-model';
import { RatingStars } from '../RatingStars';

import './index.less';

interface MatrixRow {
  key: string;
  label: string;
}

interface MatrixTableProps {
  rows?: string[] | undefined;
  columns?: string[] | undefined;
  /** 单元格控件形态。 */
  cell: 'radio' | 'checkbox' | 'rating';
  /** 双向分值标记。 */
  bidirectional?: boolean | undefined;
  onAddRow?: (() => void) | undefined;
  onAddColumn?: (() => void) | undefined;
}

/** 矩阵表格：行标题 + 列选项，单元格为禁用态控件，支持新增行列。 */
export const MatrixTable = ({
  rows,
  columns,
  cell,
  bidirectional,
  onAddRow,
  onAddColumn,
}: MatrixTableProps) => {
  const rowLabels = rows?.length ? rows : DEFAULT_MATRIX_ROWS;
  const columnLabels = columns?.length ? columns : DEFAULT_MATRIX_COLUMNS;

  const tableColumns: TableProps<MatrixRow>['columns'] = [
    { title: '题项', dataIndex: 'label', key: 'label' },
    ...columnLabels.map((column, columnIndex) => ({
      title: column,
      key: `column-${columnIndex}`,
      align: 'center' as const,
      // 打分单元格需容纳五颗常规尺寸星，其余控件列给统一可读宽度
      width: cell === 'rating' ? 220 : 120,
      render: () => {
        if (cell === 'rating') return <RatingStars count={5} />;
        if (cell === 'checkbox') return <Checkbox disabled aria-label={column} />;
        return <Radio disabled aria-label={column} />;
      },
    })),
  ];

  return (
    <div className="question-type__matrix">
      {bidirectional ? <Tag color="purple">双向分值</Tag> : null}
      <Table<MatrixRow>
        pagination={false}
        columns={tableColumns}
        dataSource={rowLabels.map((label, index) => ({ key: `row-${index}`, label }))}
        tableLayout="auto"
        styles={{
          root: { width: 'auto', maxWidth: '100%' },
          content: { width: 'auto' },
          header: { cell: { padding: '12px 16px' } },
          body: { cell: { padding: '14px 16px' } },
        }}
      />
      {onAddRow || onAddColumn ? (
        <div className="question-type__matrix-actions">
          {onAddRow ? (
            <Button
              className="question-type__matrix-action"
              type="dashed"
              icon={<PlusOutlined />}
              aria-label="添加行"
              onClick={onAddRow}
            >
              添加行
            </Button>
          ) : null}
          {onAddColumn ? (
            <Button
              className="question-type__matrix-action"
              type="dashed"
              icon={<PlusOutlined />}
              aria-label="添加列"
              onClick={onAddColumn}
            >
              添加列
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
