import { Tag } from 'antd';

import { createScaleValues } from '../option-model';
import { RatingStars } from '../RatingStars';
import type { RatingScale } from '../types';

import './index.less';

interface ScaleRowProps {
  scale: RatingScale;
  labels?: [string, string] | undefined;
  /** 双向打分：标注分值可反向。 */
  bidirectional?: boolean | undefined;
  /** 呈现形态：默认五角星，NPS 使用数字块。 */
  variant?: 'stars' | 'numbers';
}

/** 分值刻度行：默认五角星，NPS 用数字块；仅作预览。 */
export const ScaleRow = ({ scale, labels, bidirectional, variant = 'stars' }: ScaleRowProps) => (
  <div className="question-type__scale">
    {bidirectional ? <Tag color="purple">双向分值</Tag> : null}
    {variant === 'numbers' ? (
      <div className="question-type__scale-values">
        {createScaleValues(scale).map((value) => (
          <span className="question-type__scale-value" key={value}>
            {value}
          </span>
        ))}
      </div>
    ) : (
      <RatingStars count={createScaleValues(scale).length} />
    )}
    {labels ? (
      <div className="question-type__scale-labels">
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
      </div>
    ) : null}
  </div>
);
