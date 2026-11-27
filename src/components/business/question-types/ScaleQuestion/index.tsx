import { getDefaultScale } from '../option-model';
import { ScaleRow } from '../ScaleRow';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 打分题：1–5 分值刻度。 */
export const ScaleQuestion = ({ scale, scaleLabels }: QuestionTypeComponentProps) => (
  <div className="scale-question">
    <ScaleRow scale={scale ?? getDefaultScale('rating.scale')} labels={scaleLabels} />
  </div>
);
