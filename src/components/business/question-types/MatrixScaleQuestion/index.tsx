import { MatrixTable } from '../MatrixTable';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 矩阵打分：单元格为五角星量表，支持新增行列。 */
export const MatrixScaleQuestion = ({
  rows,
  columns,
  onAddRow,
  onAddColumn,
}: QuestionTypeComponentProps) => (
  <div className="matrix-scale-question">
    <MatrixTable
      rows={rows}
      columns={columns}
      cell="rating"
      onAddRow={onAddRow}
      onAddColumn={onAddColumn}
    />
  </div>
);
