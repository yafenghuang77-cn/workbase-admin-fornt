import type { ErrorComponentProps } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { Result } from 'antd';

import { isForbiddenError } from '@/utils/http/error';

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="抱歉，你访问的页面不存在。"
      extra={<Link to="/">返回首页</Link>}
    />
  );
}

export function RouteErrorPage({ error }: ErrorComponentProps) {
  const feedback = isForbiddenError(error)
    ? { status: '403' as const, title: '403', subTitle: '抱歉，你没有权限访问此页面。' }
    : { status: 'error' as const, title: '页面加载失败', subTitle: '请刷新页面后重试。' };

  return <Result {...feedback} extra={<Link to="/">返回首页</Link>} />;
}
