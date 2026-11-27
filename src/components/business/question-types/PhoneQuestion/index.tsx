import { MobileOutlined } from '@ant-design/icons';
import { Input } from 'antd';

import './index.less';

/** 手机号：带手机图标的单行输入预览。 */
export const PhoneQuestion = () => (
  <Input
    className="phone-question"
    disabled
    prefix={<MobileOutlined />}
    placeholder="请输入手机号"
    aria-label="手机号"
  />
);
