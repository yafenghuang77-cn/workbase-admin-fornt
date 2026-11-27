import { getDefaultScale } from '../option-model';
import { ScaleRow } from '../ScaleRow';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 双向打分：分值刻度附双向标记。 */
export const BidirectionalScaleQuestion = ({ scale, scaleLabels }: QuestionTypeComponentProps) => (
  <div className="bidirectional-scale-question">
    <ScaleRow scale={scale ?? getDefaultScale('rating.scale')} labels={scaleLabels} bidirectional />
  </div>
);
