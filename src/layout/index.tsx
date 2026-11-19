import type { PropsWithChildren } from 'react';
import { useState } from 'react';

import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import type { ProLayoutProps } from '@ant-design/pro-components';
import { ProLayout } from '@ant-design/pro-components';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { Breadcrumb, Button } from 'antd';

import { proLayoutTheme } from '@/providers/theme';
import { useThemeSettings } from '@/providers/theme-settings';

import { HeaderActions } from './HeaderActions';
import { navigation, navigationLinks } from './navigation';

import './index.less';

const useAppPath = () => {
  const { pathname } = useLocation();
  const basepath = import.meta.env.BASE_URL.replace(/\/$/u, '');
  return pathname.startsWith(`${basepath}/`) ? pathname.slice(basepath.length) : pathname;
};

const LayoutHeader = ({
  collapsed,
  onCollapse,
}: Pick<ProLayoutProps, 'collapsed' | 'onCollapse'>) => {
  const path = useAppPath();
  const current = navigationLinks.find((item) => item.path === path);
  const parent = navigation.find(
    (item) => !item.hideInMenu && item.children?.some((child) => child.path === path),
  );
  return (
    <div className="workbase-header-title">
      <Button
        type="text"
        aria-label={collapsed ? '展开导航' : '收起导航'}
        aria-expanded={!collapsed}
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => onCollapse?.(!collapsed)}
      />
      <Breadcrumb
        items={[
          { title: <Link to="/welcome">首页</Link> },
          ...(parent ? [{ title: parent.name }] : []),
          { title: current?.name ?? '工作台' },
        ]}
      />
    </div>
  );
};

const renderMenuItem: NonNullable<ProLayoutProps['menuItemRender']> = (item, dom) => (
  <Link to={item.path ?? '/welcome'}>{dom}</Link>
);
const renderMenuText: NonNullable<ProLayoutProps['menuTextRender']> = (item, text) => {
  // ProLayout 已渲染顶层图标，仅补充被默认省略的子级图标。
  if (!item.icon || navigation.some((root) => root.path === item.path)) return text;

  return (
    <span className="workbase-menu-label">
      <span aria-hidden="true">{item.icon}</span>
      <span>{text}</span>
    </span>
  );
};
const renderMenuHeader: NonNullable<ProLayoutProps['menuHeaderRender']> = (logo, title) => (
  <Link to="/welcome" className="workbase-brand">
    {logo}
    {title}
  </Link>
);
const renderHeaderContent: NonNullable<ProLayoutProps['headerContentRender']> = () => (
  <div className="workbase-mobile-header">
    <HeaderActions />
  </div>
);

/** 公共管理端框架；页面通过 children 或路由 Outlet 接入。 */
export const WorkbaseLayout = ({ children }: PropsWithChildren) => {
  const { settings } = useThemeSettings();
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const path = useAppPath();

  return (
    <div className="workbase-layout">
      <a className="workbase-skip-link" href="#workbase-content">
        跳转到内容
      </a>
      <ProLayout
        navTheme={settings.navTheme}
        colorPrimary={settings.colorPrimary}
        title="Workbase"
        logo={
          <span className="workbase-logo" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="24" height="24" fill="none">
              <path
                d="M7 8 13 31 20 17 27 31 33 8"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        }
        layout="side"
        siderWidth={240}
        fixedHeader
        fixSiderbar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsedButtonRender={false}
        siderMenuType="sub"
        menu={{ locale: false, defaultOpenAll: false }}
        menuProps={{
          inlineIndent: 16,
          selectedKeys: [path],
          onClick: () => {
            if (window.matchMedia('(max-width: 767px)').matches) setCollapsed(true);
          },
        }}
        route={{ routes: navigation }}
        location={{ pathname: path }}
        menuItemRender={renderMenuItem}
        menuTextRender={renderMenuText}
        menuHeaderRender={renderMenuHeader}
        headerContentRender={renderHeaderContent}
        token={proLayoutTheme}
      >
        <header className="workbase-desktop-header">
          <LayoutHeader collapsed={collapsed} onCollapse={setCollapsed} />
          <HeaderActions />
        </header>
        <div id="workbase-content" className="workbase-content" tabIndex={-1}>
          {children ?? <Outlet />}
        </div>
      </ProLayout>
    </div>
  );
};
