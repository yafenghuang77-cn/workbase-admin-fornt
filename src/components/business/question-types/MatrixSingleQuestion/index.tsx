import { MatrixTable } from '../MatrixTable';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 矩阵单选：单元格为单选控件，支持新增行列。 */
export const MatrixSingleQuestion = ({
  rows,
  columns,
  onAddRow,
  onAddColumn,
}: QuestionTypeComponentProps) => (
  <div className="matrix-single-question">
    <MatrixTable
      rows={rows}
      columns={columns}
      cell="radio"
      onAddRow={onAddRow}
      onAddColumn={onAddColumn}
    />
  </div>
);
