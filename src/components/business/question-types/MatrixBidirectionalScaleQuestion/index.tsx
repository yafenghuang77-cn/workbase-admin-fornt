import { MatrixTable } from '../MatrixTable';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 矩阵双向打分：五角星量表附双向标记，支持新增行列。 */
export const MatrixBidirectionalScaleQuestion = ({
  rows,
  columns,
  onAddRow,
  onAddColumn,
}: QuestionTypeComponentProps) => (
  <div className="matrix-bidirectional-scale-question">
    <MatrixTable
      rows={rows}
      columns={columns}
      cell="rating"
      bidirectional
      onAddRow={onAddRow}
      onAddColumn={onAddColumn}
    />
  </div>
);
