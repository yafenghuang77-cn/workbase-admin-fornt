import { ItemList } from '../ItemList';
import { createDefaultScoreItems, getDefaultScale } from '../option-model';
import { ScaleRow } from '../ScaleRow';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 多项打分：每个打分项一行分值刻度。 */
export const MultiScaleQuestion = ({
  scale,
  scoreItems,
  scaleLabels,
}: QuestionTypeComponentProps) => (
  <div className="multi-scale-question">
    <ItemList items={scoreItems?.length ? scoreItems : createDefaultScoreItems()}>
      {() => <ScaleRow scale={scale ?? getDefaultScale('rating.scale')} labels={scaleLabels} />}
    </ItemList>
  </div>
);
