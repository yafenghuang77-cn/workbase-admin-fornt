import { MailOutlined } from '@ant-design/icons';
import { Input } from 'antd';

import './index.less';

/** 邮箱：带邮件图标的单行输入预览。 */
export const EmailQuestion = () => (
  <Input
    className="email-question"
    disabled
    prefix={<MailOutlined />}
    placeholder="请输入邮箱"
    aria-label="邮箱"
  />
);
