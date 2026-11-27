import { MatrixTable } from '../MatrixTable';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 矩阵多选：单元格为复选控件，支持新增行列。 */
export const MatrixMultipleQuestion = ({
  rows,
  columns,
  onAddRow,
  onAddColumn,
}: QuestionTypeComponentProps) => (
  <div className="matrix-multiple-question">
    <MatrixTable
      rows={rows}
      columns={columns}
      cell="checkbox"
      onAddRow={onAddRow}
      onAddColumn={onAddColumn}
    />
  </div>
);
