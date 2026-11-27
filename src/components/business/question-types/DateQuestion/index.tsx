import { DatePicker } from 'antd';

import './index.less';

/** 日期：日期选择预览。 */
export const DateQuestion = () => (
  <DatePicker className="date-question" disabled placeholder="请选择日期" />
);
