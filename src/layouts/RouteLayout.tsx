import { useEffect } from 'react';

import { Outlet, useMatches } from '@tanstack/react-router';

import { AdminLayout } from './AdminLayout';

export function RouteLayout() {
  const page = useMatches({ select: (matches) => matches.at(-1)?.staticData.page });
  const title = page ? (page.name ?? 'Workbase') : '页面不存在';

  const fullscreen = page?.layout === false;

  useEffect(() => {
    // 后台页由 ProLayout 管理标题；全屏页没有 ProLayout，需同步浏览器标题。
    if (fullscreen) {
      document.title = `${title} - Workbase`;
    }
  }, [fullscreen, title]);

  return fullscreen ? <Outlet /> : <AdminLayout />;
}
