import { InputNumber } from 'antd';

import './index.less';

/** 数值：数字输入预览。 */
export const NumberQuestion = () => (
  <InputNumber className="number-question" disabled placeholder="请输入数值" aria-label="数值" />
);
