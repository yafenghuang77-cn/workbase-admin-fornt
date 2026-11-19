import { Link } from '@tanstack/react-router';
import { Result } from 'antd';

export const NotFoundPage = () => {
  return (
    <Result
      status="404"
      title="404"
      subTitle="抱歉，你访问的页面不存在。"
      extra={<Link to="/welcome">返回首页</Link>}
    />
  );
};

export const RouteErrorPage = () => {
  const feedback = {
    status: 'error' as const,
    title: '页面加载失败',
    subTitle: '请刷新页面后重试。',
  };

  return <Result {...feedback} extra={<Link to="/welcome">返回首页</Link>} />;
};
