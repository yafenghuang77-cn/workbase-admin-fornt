import type { ReactNode } from 'react';
import { useState } from 'react';

import {
  AppstoreOutlined,
  KeyOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { FormProps } from 'antd';
import { App, Button, Checkbox, Divider, Form, Input } from 'antd';

import './index.less';

const REMEMBERED_USERNAME_KEY = 'workbase-login-remembered-username';

/** 认证接口尚未接入，提交后仅演示加载反馈，随后提示对接状态。 */
const SUBMIT_DEMO_DELAY = 600;

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

interface BrandFeature {
  icon: ReactNode;
  title: string;
  description: string;
}

const brandFeatures: BrandFeature[] = [
  {
    icon: <AppstoreOutlined />,
    title: '统一入口',
    description: '常用工具与业务模块集中管理，减少来回切换。',
  },
  {
    icon: <TeamOutlined />,
    title: '协作有序',
    description: '组织、角色与权限清晰可见，团队配合更顺畅。',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: '安全可靠',
    description: '企业级的数据与访问保障，稳定支撑日常工作。',
  },
];

const readRememberedUsername = (): string => {
  try {
    return window.localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
};

const persistRememberedUsername = (username: string, remember: boolean): void => {
  try {
    if (remember) {
      window.localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
    } else {
      window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
    }
  } catch {
    // localStorage 不可用（如隐私模式）时静默降级，不影响登录流程。
  }
};

export const LoginPage = () => {
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [rememberedUsername] = useState(readRememberedUsername);

  const handleFinish: FormProps<LoginFormValues>['onFinish'] = (values) => {
    setSubmitting(true);
    window.setTimeout(() => {
      persistRememberedUsername(values.username, values.remember);
      setSubmitting(false);
      message.info('登录接口尚未接入，完成认证服务对接后即可登录。');
    }, SUBMIT_DEMO_DELAY);
  };

  const handleForgotPassword = () => {
    message.info('密码重置功能尚未开放，请联系企业管理员处理。');
  };

  const handleSsoLogin = () => {
    message.info('SSO 登录尚未接入，完成企业身份集成后即可使用。');
  };

  return (
    <div className="login-page">
      <aside className="login-brand" aria-label="Workbase 产品介绍">
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <svg
              className="login-brand-logo-mark"
              viewBox="0 0 32 32"
              aria-hidden="true"
              focusable="false"
            >
              <rect width="32" height="32" rx="8" fill="#ffffff" />
              <path
                d="M8.5 9.5 12 22.5 16 15.2 20 22.5 23.5 9.5"
                fill="none"
                stroke="#0958d9"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.6"
              />
            </svg>
            <span className="login-brand-name">Workbase</span>
          </div>
          <h2 className="login-brand-heading">让管理更清晰，让协作更有序</h2>
          <p className="login-brand-description">
            统一的工作台入口，把团队、数据与流程汇聚在同一处，帮助你更从容地完成每一天的工作。
          </p>
          <ul className="login-brand-features">
            {brandFeatures.map((feature) => (
              <li key={feature.title} className="login-brand-feature">
                <span className="login-brand-feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <div className="login-brand-feature-copy">
                  <h3 className="login-brand-feature-title">{feature.title}</h3>
                  <p className="login-brand-feature-description">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="login-brand-decoration" aria-hidden="true" />
      </aside>

      <main className="login-main">
        <section className="login-card" aria-labelledby="login-title">
          <h1 id="login-title" className="login-card-title">
            登录 Workbase
          </h1>
          <p className="login-card-subtitle">使用企业账号访问管理控制台</p>
          <Form<LoginFormValues>
            className="login-form"
            name="login"
            layout="vertical"
            size="large"
            validateTrigger="onBlur"
            scrollToFirstError
            initialValues={{
              username: rememberedUsername,
              password: '',
              remember: rememberedUsername.length > 0,
            }}
            onFinish={handleFinish}
          >
            <Form.Item
              label="账号"
              name="username"
              rules={[
                { required: true, whitespace: true, message: '请输入账号' },
                { max: 64, message: '账号不能超过 64 个字符' },
              ]}
            >
              <Input
                prefix={<UserOutlined aria-hidden="true" />}
                placeholder="请输入账号"
                autoComplete="username"
                allowClear
              />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined aria-hidden="true" />}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>
            <div className="login-form-meta">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住账号</Checkbox>
              </Form.Item>
              <Button type="link" className="login-form-forgot" onClick={handleForgotPassword}>
                忘记密码？
              </Button>
            </div>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              登录
            </Button>
            <Divider plain className="login-form-divider">
              或
            </Divider>
            <Button block icon={<KeyOutlined aria-hidden="true" />} onClick={handleSsoLogin}>
              SSO 单点登录
            </Button>
          </Form>
          <p className="login-card-footer">还没有账号？请联系企业管理员开通。</p>
        </section>
        <p className="login-copyright">© {new Date().getFullYear()} Workbase · 企业级工作台</p>
      </main>
    </div>
  );
};
