import type { PropsWithChildren } from 'react';
import { useState } from 'react';

import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import type { ProLayoutProps } from '@ant-design/pro-components';
import { ProLayout } from '@ant-design/pro-components';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { Breadcrumb, Button, ConfigProvider } from 'antd';

import { HeaderActions } from './HeaderActions';
import { navigation, navigationLinks } from './navigation';
import { layoutTheme } from './theme';

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
        items={[{ title: <Link to="/">首页</Link> }, { title: current?.name ?? '工作台' }]}
      />
    </div>
  );
};

const renderMenuItem: NonNullable<ProLayoutProps['menuItemRender']> = (item, dom) => (
  <Link to={item.path ?? '/'}>{dom}</Link>
);
const renderMenuHeader: NonNullable<ProLayoutProps['menuHeaderRender']> = (logo, title) => (
  <Link to="/" className="workbase-brand">
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
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const path = useAppPath();

  return (
    <ConfigProvider theme={layoutTheme}>
      <div className="workbase-layout">
        <a className="workbase-skip-link" href="#workbase-content">
          跳转到内容
        </a>
        <ProLayout
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
          siderMenuType="group"
          menu={{ locale: false }}
          menuProps={{
            selectedKeys: [path],
            onClick: () => {
              if (window.matchMedia('(max-width: 767px)').matches) setCollapsed(true);
            },
          }}
          route={{ routes: navigation }}
          location={{ pathname: path }}
          menuItemRender={renderMenuItem}
          menuHeaderRender={renderMenuHeader}
          headerContentRender={renderHeaderContent}
          token={{
            bgLayout: '#f5f5f5',
            header: { colorBgHeader: '#fff', colorBgScrollHeader: '#fff', heightLayoutHeader: 56 },
            sider: {
              colorMenuBackground: '#0d3da4',
              colorMenuItemDivider: 'transparent',
              colorTextMenuTitle: '#fff',
              colorTextMenu: '#dce7ff',
              colorTextMenuSecondary: '#a9c1ef',
              colorBgMenuItemSelected: '#0958d9',
              colorTextMenuSelected: '#fff',
              colorBgMenuItemHover: '#164fb0',
              colorTextMenuItemHover: '#fff',
              menuHeight: 40,
              paddingInlineLayoutMenu: 12,
              paddingBlockLayoutMenu: 4,
            },
          }}
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
    </ConfigProvider>
  );
};
