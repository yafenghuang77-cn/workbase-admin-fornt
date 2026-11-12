import WelcomePage from '@/pages/welcome';

import type { AppRouteConfig } from './register-routes';

export const routeConfig = [
  {
    path: '/',
    name: '首页',
    layout: false,
    component: WelcomePage,
  },
  { path: '/welcome', redirect: '/', hideInMenu: true },
] as const satisfies readonly AppRouteConfig[];
