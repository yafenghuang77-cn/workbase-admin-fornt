import type { ReactNode } from 'react';

import {
  // AppstoreOutlined,
  BarChartOutlined,
  // CheckSquareOutlined,
  FileTextOutlined,
  HomeOutlined,
  ReadOutlined,
  // SettingOutlined,
  // SlidersOutlined,
  // TeamOutlined,
} from '@ant-design/icons';

interface NavigationItem {
  name: string;
  key?: string;
  path?: string;
  icon?: ReactNode;
  children?: NavigationItem[];
  hideInMenu?: boolean;
}

export const navigation: NavigationItem[] = [
  { key: '/', path: '/', name: '工作台', icon: <HomeOutlined /> },
  // {
  //   name: '业务管理',
  //   key: 'business',
  //   path: '/business',
  //   icon: <AppstoreOutlined />,
  //   children: [
  //     { path: '/modules/customers', name: '客户管理', icon: <TeamOutlined /> },
  //     { path: '/modules/tasks', name: '任务中心', icon: <CheckSquareOutlined /> },
  //     { path: '/modules/tickets', name: '工单管理', icon: <FileTextOutlined /> },
  //   ],
  // },
  // {
  //   name: '数据分析',
  //   key: 'analytics',
  //   path: '/analytics',
  //   icon: <BarChartOutlined />,
  //   children: [
  //     { path: '/modules/reports', name: '数据报表', icon: <BarChartOutlined /> },
  //     { path: '/modules/monitoring', name: '服务监控', icon: <AppstoreOutlined /> },
  //   ],
  // },
  // {
  //   name: '系统',
  //   key: 'system',
  //   path: '/system',
  //   icon: <SettingOutlined />,
  //   children: [{ path: '/modules/settings', name: '系统设置', icon: <SlidersOutlined /> }],
  // },
  {
    name: '开发资源',
    key: 'resources',
    path: '/development',
    icon: <BarChartOutlined />,
    children: [
      { path: '/resources', name: '欢迎与资源', icon: <ReadOutlined /> },
      { path: '/rich-text-editor', name: '富文本编辑器', icon: <FileTextOutlined /> },
    ],
  },
];

export const navigationLinks = navigation.flatMap((item) => item.children ?? [item]);
