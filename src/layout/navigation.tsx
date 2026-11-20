import type { ReactNode } from 'react';

import {
  BarChartOutlined,
  FileTextOutlined,
  FormOutlined,
  HomeOutlined,
  UnorderedListOutlined,
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
  { key: '/welcome', path: '/welcome', name: '工作台', icon: <HomeOutlined /> },
  {
    name: '问卷管理',
    key: 'questionnaires',
    path: '/questionnaires',
    icon: <FormOutlined />,
    children: [{ path: '/questionnaires/list', name: '问卷列表', icon: <UnorderedListOutlined /> }],
  },
  {
    name: '开发资源',
    key: 'resources',
    path: '/development',
    icon: <BarChartOutlined />,
    children: [{ path: '/rich-text-editor', name: '富文本编辑器', icon: <FileTextOutlined /> }],
  },
];

export const navigationLinks = navigation.flatMap((item) => item.children ?? [item]);
