import type { ReactNode } from 'react';

import { routeConfig } from './routes';

type MenuConfig<TPath extends string> = {
  readonly path: TPath;
  readonly name?: string;
  readonly icon?: ReactNode;
  readonly hideInMenu?: boolean;
  readonly children?: ReadonlyArray<MenuConfig<TPath>>;
};

export type NavigationItem<TPath extends string = string> = {
  path: TPath;
  name: string;
  icon?: ReactNode;
  children?: Array<NavigationItem<TPath>>;
};

// 菜单只是路由配置的展示结果；隐藏菜单不会取消页面注册。
export function buildNavigation<TPath extends string>(
  configs: ReadonlyArray<MenuConfig<TPath>>,
): Array<NavigationItem<TPath>> {
  return configs.flatMap((item) => {
    if (item.hideInMenu) {
      return [];
    }
    const children = item.children ? buildNavigation(item.children) : [];
    if (!item.name) {
      return children;
    }
    return [
      {
        path: item.path,
        name: item.name,
        ...(item.icon !== undefined ? { icon: item.icon } : {}),
        ...(children.length ? { children } : {}),
      },
    ];
  });
}

export const navigation = buildNavigation(routeConfig);
export type NavigationEntry = (typeof navigation)[number];

function flattenNavigation(items: NavigationEntry[]): NavigationEntry[] {
  return items.flatMap((item) => [item, ...flattenNavigation(item.children ?? [])]);
}

export const navigationEntries = flattenNavigation(navigation);
