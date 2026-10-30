import {
  GithubOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ProLayoutProps } from '@ant-design/pro-components';
import { DefaultFooter, PageContainer, ProLayout } from '@ant-design/pro-components';
import { Link, Outlet, useLocation, useMatches } from '@tanstack/react-router';
import { Button, Dropdown } from 'antd';

import type { NavigationEntry } from '@/router/navigation';
import { navigation, navigationEntries } from '@/router/navigation';

import './AdminLayout.css';

type LayoutRoute = NonNullable<ProLayoutProps['route']>;

function toLayoutRoute(item: NavigationEntry): LayoutRoute {
  return {
    path: item.path,
    name: item.name,
    icon: item.icon,
    ...(item.children ? { children: item.children.map(toLayoutRoute) } : {}),
  };
}

const menuData = navigation.map(toLayoutRoute);

function HeaderActions() {
  return (
    <>
      <Button
        type="text"
        href="https://pro.ant.design"
        target="_blank"
        rel="noreferrer"
        icon={<QuestionCircleOutlined />}
        aria-label="使用文档"
        title="使用文档"
      />
      <Button
        type="text"
        href="https://github.com/ant-design/ant-design-pro"
        target="_blank"
        rel="noreferrer"
        icon={<GithubOutlined />}
        aria-label="Ant Design Pro 源码"
        title="Ant Design Pro 源码"
      />
    </>
  );
}

function AccountMenu() {
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          {
            key: 'center',
            icon: <UserOutlined />,
            label: '个人中心（暂未开放）',
            disabled: true,
          },
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: '个人设置（暂未开放）',
            disabled: true,
          },
        ],
      }}
    >
      <Button type="text" icon={<UserOutlined />} aria-label="打开用户菜单">
        管理员
      </Button>
    </Dropdown>
  );
}

function renderBrand() {
  return (
    <Link className="workbase-brand" to="/welcome" aria-label="Workbase 首页">
      <img src={`${import.meta.env.BASE_URL}workbase.svg`} width={28} height={28} alt="" />
      <span>Workbase</span>
    </Link>
  );
}

const renderMenuHeader: Exclude<ProLayoutProps['menuHeaderRender'], false | undefined> = (
  _logo,
  _title,
  props,
) => {
  // mix 布局的品牌放在顶栏；移动端抽屉仍保留品牌入口。
  return props?.layout === 'mix' ? null : renderBrand();
};

const renderMenuItem: Exclude<ProLayoutProps['menuItemRender'], false | undefined> = (
  item,
  dom,
  menuProps,
) => {
  const entry = navigationEntries.find((candidate) => candidate.path === item.path);
  return entry ? (
    <Link
      to={entry.path}
      onClick={() => {
        if (menuProps.isMobile) {
          item.onClick();
        }
      }}
    >
      {dom}
    </Link>
  ) : (
    dom
  );
};

function renderHeaderActions() {
  return [<HeaderActions key="help" />, <AccountMenu key="account" />];
}

function renderFooter() {
  return (
    <DefaultFooter
      copyright={`${new Date().getFullYear()} Workbase`}
      links={[
        { key: 'pro', title: 'Ant Design Pro', href: 'https://pro.ant.design', blankTarget: true },
        {
          key: 'github',
          title: <GithubOutlined aria-label="GitHub" />,
          href: 'https://github.com/ant-design/ant-design-pro',
          blankTarget: true,
        },
        { key: 'antd', title: 'Ant Design', href: 'https://ant.design', blankTarget: true },
      ]}
    />
  );
}

export function AdminLayout() {
  const pathname = useLocation({
    select: (location) => location.pathname.replace(/\/+$/, '') || '/',
  });
  const page = useMatches({ select: (matches) => matches.at(-1)?.staticData.page });
  const trail = page?.breadcrumb ?? [];
  const title = page ? (page.name ?? 'Workbase') : '页面不存在';

  return (
    <>
      <a className="skip-navigation" href="#page-content">
        跳转到页面内容
      </a>
      <ProLayout
        title="Workbase"
        logo={`${import.meta.env.BASE_URL}workbase.svg`}
        layout="mix"
        navTheme="light"
        contentWidth="Fluid"
        fixSiderbar
        siderWidth={216}
        locale="zh-CN"
        route={{ routes: menuData }}
        location={{ pathname: page?.path ?? pathname }}
        menu={{ locale: false }}
        menuHeaderRender={renderMenuHeader}
        headerTitleRender={renderBrand}
        menuItemRender={renderMenuItem}
        actionsRender={renderHeaderActions}
        pageTitleRender={() => `${title} - Workbase`}
        footerRender={renderFooter}
      >
        <div id="page-content" className="page-content" tabIndex={-1}>
          <PageContainer
            title={title}
            breadcrumb={{
              items: [
                { title: <Link to="/welcome">首页</Link> },
                ...trail.map((item) => ({ title: item.name })),
              ],
            }}
          >
            <Outlet />
          </PageContainer>
        </div>
      </ProLayout>
    </>
  );
}
