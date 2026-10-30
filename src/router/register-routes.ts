import type { ReactNode } from 'react';

import type { AnyRootRoute, AnyRouter, RouteComponent } from '@tanstack/react-router';
import { createRoute, redirect } from '@tanstack/react-router';

export interface AppRouteConfig {
  /** 完整路径；动态参数沿用 TanStack Router 的 $param 语法。 */
  readonly path: `/${string}`;
  readonly name?: string;
  /** 在路由配置中直接提供图标节点，无需维护图标名称映射。 */
  readonly icon?: ReactNode;
  readonly component?: RouteComponent;
  /** 默认继承父项；false 表示全屏页面，true 表示后台布局。 */
  readonly layout?: boolean;
  /** 仅访问当前 path 时跳转，子页面不会继承此跳转。 */
  readonly redirect?: `/${string}`;
  readonly hideInMenu?: boolean;
  /** 页面与菜单的分组；子页面独立渲染，不要求父组件声明 Outlet。 */
  readonly children?: readonly AppRouteConfig[];
}

export interface RoutePageMetadata {
  readonly path: string;
  readonly name?: string;
  readonly layout: boolean;
  readonly breadcrumb: ReadonlyArray<{ path: string; name: string }>;
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    page?: RoutePageMetadata;
  }
}

type ConfigEntry<T> = T extends { readonly children: ReadonlyArray<infer Child> }
  ? T | ConfigEntry<Child>
  : T;

function createConfiguredRoute<TParent extends AnyRootRoute, const TPath extends string>(
  parent: TParent,
  path: TPath,
  config: AppRouteConfig,
  page: RoutePageMetadata,
) {
  return createRoute({
    getParentRoute: () => parent,
    path,
    ...(config.component ? { component: config.component } : {}),
    staticData: { page },
    beforeLoad: () => {
      if (config.redirect) {
        // 注册器服务任意配置树，不能依赖应用层 Register 的具体路径联合。
        throw redirect<AnyRouter, string>({ to: config.redirect, replace: true });
      }
    },
  });
}

// 按每个配置项分发 Route 类型，避免动态参数被合并到所有页面。
type RegisteredEntry<TParent extends AnyRootRoute, TEntry> = TEntry extends AppRouteConfig
  ? ReturnType<typeof createConfiguredRoute<TParent, TEntry['path']>>
  : never;

/** 将配置注册成独立页面路由；布局与面包屑通过 staticData.page 交给根布局。 */
export function registerRoutes<
  TParent extends AnyRootRoute,
  const TConfigs extends readonly AppRouteConfig[],
>(parent: TParent, configs: TConfigs) {
  const paths = new Set<string>();
  const entries: Array<{ config: AppRouteConfig; page: RoutePageMetadata }> = [];

  function collect(
    items: readonly AppRouteConfig[],
    inheritedLayout: boolean,
    breadcrumb: RoutePageMetadata['breadcrumb'],
  ) {
    for (const config of items) {
      const key = config.path.replace(/\/+$/, '').toLowerCase() || '/';
      if (paths.has(key)) {
        throw new Error(`重复的路由路径：${config.path}`);
      }
      paths.add(key);

      const page: RoutePageMetadata = {
        path: config.path,
        ...(config.name ? { name: config.name } : {}),
        layout: config.layout ?? inheritedLayout,
        breadcrumb: config.name
          ? [...breadcrumb, { path: config.path, name: config.name }]
          : breadcrumb,
      };
      entries.push({ config, page });
      if (config.children) {
        collect(config.children, page.layout, page.breadcrumb);
      }
    }
  }

  collect(configs, true, []);

  // collect 原样保留每项 path，map 每次只创建一条路由。TypeScript 无法跟踪
  // 运行时递归与各字面量的对应关系，故仅在此边界恢复逐项分发的联合类型。
  return entries.map(({ config, page }) =>
    createConfiguredRoute(parent, config.path, config, page),
  ) as Array<RegisteredEntry<TParent, ConfigEntry<TConfigs[number]>>>;
}
