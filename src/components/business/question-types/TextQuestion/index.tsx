import { Input } from 'antd';

import './index.less';

/** 文本填空：多行文本域预览。 */
export const TextQuestion = () => (
  <Input.TextArea
    className="text-question"
    disabled
    autoSize={{ minRows: 2, maxRows: 3 }}
    placeholder="请输入您的回答"
    aria-label="文本回答"
  />
);
