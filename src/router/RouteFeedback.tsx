import { Link } from '@tanstack/react-router';
import { Result } from 'antd';

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="抱歉，你访问的页面不存在。"
      extra={<Link to="/welcome">返回首页</Link>}
    />
  );
}

export function RouteErrorPage() {
  return (
    <Result
      status="error"
      title="页面加载失败"
      subTitle="请刷新页面后重试。"
      extra={<Link to="/welcome">返回首页</Link>}
    />
  );
}

export function EmptyMenuPage() {
  return null;
}
