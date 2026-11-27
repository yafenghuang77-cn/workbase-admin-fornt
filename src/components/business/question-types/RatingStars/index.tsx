import { Rate } from 'antd';

import './index.less';

/** 五角星量表：打分题与矩阵打分单元格的统一呈现形态。 */
export const RatingStars = ({ count }: { count: number }) => (
  <Rate disabled count={count} value={0} className="question-type__stars" />
);
