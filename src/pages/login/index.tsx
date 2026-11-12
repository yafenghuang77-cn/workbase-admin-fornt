import { useEffect, useRef, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { Alert, Button, Card, Form, Input } from 'antd';

import { useAuthStore } from '@/stores/auth';
import { getErrorMessage } from '@/utils/http/error';

import type { LoginCredentials } from './service';
import { signIn } from './service';

import './index.less';

export function LoginPage() {
  const navigate = useNavigate();
  const activeRequest = useRef<AbortController | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  function submitCredentials(credentials: LoginCredentials): void {
    if (activeRequest.current !== null) return;

    const controller = new AbortController();
    const { sessionVersion } = useAuthStore.getState();
    activeRequest.current = controller;
    setSubmitting(true);
    setErrorMessage(null);

    signIn(credentials, controller.signal)
      .then((tokens) => {
        const auth = useAuthStore.getState();
        if (controller.signal.aborted || auth.sessionVersion !== sessionVersion) return;

        auth.setTokens(tokens);
        return navigate({ to: '/', replace: true });
      })
      .finally(() => {
        activeRequest.current = null;
        if (!controller.signal.aborted) setSubmitting(false);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setErrorMessage(getErrorMessage(error));
      });
  }

  return (
    <main className="login-page">
      <Card className="login-card">
        <h1 className="login-heading">Workbase 登录</h1>
        {errorMessage === null ? null : (
          <Alert className="login-error" title={errorMessage} type="error" showIcon />
        )}
        <Form<LoginCredentials>
          name="login"
          layout="vertical"
          size="large"
          disabled={submitting}
          onFinish={submitCredentials}
        >
          <Form.Item<LoginCredentials>
            label="用户名"
            name="username"
            rules={[{ required: true, whitespace: true, message: '请输入用户名' }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item<LoginCredentials>
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            登录
          </Button>
        </Form>
      </Card>
    </main>
  );
}
