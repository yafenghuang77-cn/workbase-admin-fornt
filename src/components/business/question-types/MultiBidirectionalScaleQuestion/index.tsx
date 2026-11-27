import { ItemList } from '../ItemList';
import { createDefaultScoreItems, getDefaultScale } from '../option-model';
import { ScaleRow } from '../ScaleRow';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 多项双向打分：每个打分项一行分值刻度，附双向标记。 */
export const MultiBidirectionalScaleQuestion = ({
  scale,
  scoreItems,
  scaleLabels,
}: QuestionTypeComponentProps) => (
  <div className="multi-bidirectional-scale-question">
    <ItemList items={scoreItems?.length ? scoreItems : createDefaultScoreItems()}>
      {() => (
        <ScaleRow
          scale={scale ?? getDefaultScale('rating.scale')}
          labels={scaleLabels}
          bidirectional
        />
      )}
    </ItemList>
  </div>
);
