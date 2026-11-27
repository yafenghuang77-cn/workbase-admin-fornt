import { getDefaultScale } from '../option-model';
import { ScaleRow } from '../ScaleRow';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** NPS：0–10 分值刻度与两端说明。 */
export const NpsQuestion = ({ scale }: QuestionTypeComponentProps) => (
  <div className="nps-question">
    <ScaleRow scale={scale ?? getDefaultScale('rating.nps')} variant="numbers" />
  </div>
);
