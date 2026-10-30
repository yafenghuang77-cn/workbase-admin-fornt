import { SmileOutlined } from '@ant-design/icons';
import { lazyRouteComponent } from '@tanstack/react-router';

import type { AppRouteConfig } from './register-routes';

// component 指定页面；layout: false 为全屏页面，省略时使用后台布局。
// children 组织页面分组；redirect 显式指定分组入口，不受菜单排序影响。
export const routeConfig = [
  { path: '/', name: '首页', redirect: '/welcome', hideInMenu: true },
  {
    path: '/welcome',
    name: '欢迎',
    icon: <SmileOutlined aria-hidden />,
    component: lazyRouteComponent(() => import('@/pages/welcome')),
  },
] as const satisfies readonly AppRouteConfig[];
