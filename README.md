# Workbase Admin Frontend

基于 Vite 8、React 19 和 TypeScript 的管理端前端基础工程，启用 React Compiler。页面开发优先使用 **`@ant-design/pro-components` 和 antd**，数据请求与缓存沿用 Axios 和 TanStack Query。

## 当前状态

目前处于业务开发前的基础设施阶段，启动后显示占位页面和开发模式的 React Query Devtools。

- 已接入：React 入口、共享 QueryClient、React Compiler、Vite 多环境命令、开发代理、构建分包与 Gzip，以及代码检查、Vitest 测试和 GitHub Actions。
- 尚未实现：业务页面、菜单路由、登录权限、统一请求封装、antd 应用级主题与反馈上下文、监控初始化。
- 已预装但按需接入：ProComponents、antd、TanStack Router、Zustand、图表、编辑器和文档处理库等。Router 的 Vite 插件目前仍被注释；Tailwind、Orval、MSW 和 Playwright 尚未形成对应业务工作流。

本项目使用 Vite 客户端架构，不是 Umi Max 或 Next.js 项目。依赖已安装、已预打包不代表功能已经实现。

## 环境与启动

| 工具                 | 当前约定                                                   |
| -------------------- | ---------------------------------------------------------- |
| Node.js              | `24.16.0`，以 `.nvmrc` 为准；`engines` 限定在 24.x         |
| pnpm                 | `12.10.1`，以 `package.json` 的 `packageManager` 为准      |
| React / React DOM    | `19.3.1`                                                   |
| Vite                 | `8.3.5`                                                    |
| antd / ProComponents | `6.6.8` / `3.1.15-8`（预发布版本）                         |
| TanStack Query       | `5.105.0`                                                  |
| TypeScript           | TS 7.0.2 用于构建与类型检查，TS 6.0.2 提供 ESLint 解析 API |

依赖版本是当前安装快照；以锁文件和 `pnpm list --depth 0` 的实际结果为准。保留项目现有 TS 7 / TS 6 依赖别名分工。

```sh
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

开发地址为 [http://localhost:8888/workbase/](http://localhost:8888/workbase/)。服务器已监听 `0.0.0.0`，可通过本机局域网地址访问；端口占用时直接报错，不自动换端口。

安装依赖时 `prepare` 会安装 Husky hooks；已有工作区可运行 `pnpm prepare`。编辑器建议见 `.vscode/extensions.json`，保存格式化和修复配置见 `.vscode/settings.json`。

## 常用命令

| 命令                               | 用途                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                         | 启动本地开发服务器                                   |
| `pnpm check`                       | ESLint、Stylelint、Markdownlint、Prettier 和类型检查 |
| `pnpm test`                        | 一次运行规范回归、组件和单元测试                     |
| `pnpm test:lint`                   | 仅运行规范回归测试                                   |
| `pnpm test:watch` / `pnpm test:ui` | 监听测试 / 打开 Vitest UI                            |
| `pnpm test:coverage`               | 运行 unit 项目并生成 V8 覆盖率报告                   |
| `pnpm typecheck`                   | 使用 TS 7 执行 `tsc -b`                              |
| `pnpm lint:fix` / `pnpm format`    | 自动修复代码规则 / 格式化项目                        |
| `pnpm lint:unused`                 | 用 Knip 审查未使用文件、导出和依赖                   |
| `pnpm build`                       | 类型检查并生成生产产物，输出到 `workbase/`           |
| `pnpm preview`                     | 本地预览最近一次构建的 `workbase/` 产物              |

`pnpm check` 不包含测试。提交前执行 `pnpm check` 和 `pnpm test`；涉及运行时代码、构建或依赖时再执行 `pnpm build`。

当前检查配置有一项待同步：构建目录已改为 `workbase/`，但 ESLint、Prettier 等工具的忽略项仍保留旧的 `dist/`。本地存在构建产物时，全量检查可能误扫产物；`.gitignore` 中已忽略 `workbase/`，但这不会自动更新其他检查工具的配置。不要对构建产物执行源码自动修复。

项目预装了较多待使用依赖，Knip 结果应逐项评估，不直接作为批量卸载依据或提交门槛。

## 多环境运行与构建

| 环境       | Vite mode     | 环境文件           | 开发命令           | 构建命令             |
| ---------- | ------------- | ------------------ | ------------------ | -------------------- |
| 本地开发   | `development` | `.env.development` | `pnpm dev`         | —                    |
| 测试环境   | `test`        | `.env.test`        | `pnpm dev:test`    | `pnpm build:test`    |
| 预发布环境 | `staging`     | `.env.staging`     | `pnpm dev:staging` | `pnpm build:staging` |
| 生产环境   | `production`  | `.env.production`  | —                  | `pnpm build`         |

各环境通过 `VITE_APP_ENV_NAME` 声明环境标签，应用可按需读取 `import.meta.env.VITE_APP_ENV_NAME`。当前入口没有使用此值；启动和构建日志中的中文环境名来自 `vite.config.ts` 对 `mode` 的映射。

部署路径、端口和代理目标直接写在 `vite.config.ts` 中，未按 mode 切换。`.env.development` 中留有 `DEV_API_PROXY_TARGET`，但当前配置没有读取它；填写该变量不会改变代理目标，已有相关注释也不代表实际行为。

本机覆盖值放入已被 Git 忽略的 `.env.[mode].local`。修改环境文件后需重启开发服务器；所有 `VITE_*` 变量都可能进入客户端产物，不能放入密钥。

`mode` 与 `NODE_ENV` 用途不同：未额外覆盖 `NODE_ENV` 时，`dev:test` / `dev:staging` 仍是开发服务器，`build:test` / `build:staging` 仍生成生产优化产物。`pnpm test` 运行 Vitest，与 `pnpm build:test` 用途不同；Vitest 默认使用 `test` mode。

所有构建模式输出到同一个 `workbase/` 目录，构建时会清空旧产物。预览不会重新构建或切换产物环境，例如：

```sh
pnpm build:staging
pnpm preview
```

## 本地服务与 API 代理

| 配置项              | 当前值                                         |
| ------------------- | ---------------------------------------------- |
| 页面基础路径        | `/workbase/`                                   |
| 开发监听地址 / 端口 | `0.0.0.0:8888`                                 |
| 预览端口            | Vite 默认 `4173`                               |
| API 代理目标        | `http://127.0.0.1:9999`                        |
| 匹配范围            | `/api`、`/api/…` 和 `/api?…`，不匹配 `/apiary` |
| 路径重写            | 去掉开头的 `/api`；空路径回退为 `/`            |

请求示例：前端调用 `/api/users?page=1`，本地代理转发到 `http://127.0.0.1:9999/users?page=1`。API 路径不拼接页面的 `/workbase/` 基础路径。

预览地址为 [http://localhost:4173/workbase/](http://localhost:4173/workbase/)。当前没有单独配置 `preview`；已安装的 Vite 会继承 `server.host`、`server.strictPort` 和 `server.proxy`，因此预览也会使用该本地代理。`pnpm preview` 仅用于本地验证；生产部署需要独立配置静态资源服务与 API 转发，Vite 代理不会打包进前端产物。

## 构建与加载策略

配置集中在 [vite.config.ts](./vite.config.ts)：

- 使用 React 插件和 Babel React Compiler 预设，`@/` 解析到 `src/`，React 与 React DOM 配置去重。
- 开发预打包显式包含 React 相关入口、TanStack Router / Query、Ant Design 图标、ProComponents、antd、`react-intl` 和 Zustand；其他依赖按引用发现。预打包清单不是生产功能清单。
- 开发服务器预热 `src/main.tsx`，额外忽略覆盖率与 Playwright 报告目录的文件监听。
- CSS 开启开发 sourcemap；CSS Modules 开发类名保留文件和局部名称，生产类名使用 hash。已安装 Less，Tailwind 的 Vite 插件尚未启用。
- 生产目标为 `baseline-widely-available`，JavaScript 使用 Oxc 压缩，CSS 使用 Lightning CSS 压缩，关闭生产 sourcemap，保留 CSS 分包并生成 manifest。
- 输出目录为 `workbase/`，JavaScript 位于 `assets/js`，其他打包资源按扩展名放入 `assets/[ext]`，文件名带 hash；`public/` 资源原样复制。
- Gzip 插件对超过 10 KB 的资源生成压缩文件，并保留原文件。部署端需配置压缩资源的正确响应方式，生成 `.gz` 不等于服务端自动启用 Gzip。

手动分组仅包含 `react-vendor`（React、React DOM、Scheduler）和 `antd-vendor`（antd、ProComponents、图标及底层组件），两组均启用 `entriesAware`。其余模块交给 Rolldown 按实际引用分包。

**分包不等于懒加载。** 页面与重型功能应通过动态导入按需加载；图表、编辑器、PDF、Excel、Word 等依赖不要统一从应用入口导入。当前入口实际接入的是 React 与 Query 基础设施，没有业务页面或 antd 组件。

部署时将产物映射到 `/workbase/`；后续接入客户端路由时，再配置对应的页面回退规则。更改基础路径时需同步路由与部署配置。

## 数据请求与状态

[src/main.tsx](./src/main.tsx) 已接入 `QueryClientProvider`，共享 [src/query-client.ts](./src/query-client.ts) 中的实例。开发模式显示初始收起的 Query Devtools。

| 策略           | 当前配置                                                                         |
| -------------- | -------------------------------------------------------------------------------- |
| 数据新鲜度     | `staleTime: 30_000`，不是每 30 秒轮询                                            |
| 无订阅缓存回收 | `gcTime: 300_000`                                                                |
| 自动刷新       | 挂载、窗口聚焦、网络重连时允许刷新过期查询                                       |
| 查询重试       | Axios 网络 / 超时错误及 HTTP 408、500、502、503、504 最多重试 2 次，间隔 1、2 秒 |
| 不重试的情况   | 取消请求、其他 HTTP 错误、非 Axios 错误及未识别的错误类型                        |
| 写操作         | Mutation 不自动重试                                                              |
| 离线行为       | `networkMode: 'online'`，离线暂停；不提供持久化离线队列                          |

业务开发遵循以下约定：

- API 调用放在所属功能目录的普通服务函数中，Query 管理服务端缓存；跨页面客户端状态按需使用 Zustand，局部状态留在组件附近。
- queryKey 包含影响结果的参数，查询函数传递取消信号；失败应抛出错误，不将失败伪装为空数据。保留 Axios 错误信息供重试策略识别。
- 写操作使用 Mutation，成功后精准失效相关缓存；不在 effect 中把 Query 数据复制到另一份状态。
- ProTable 默认消费 Query 的受控数据，避免表格自动请求和 `useQuery` 同时请求同一数据；ProForm / antd Form 与 React Hook Form 不共同管理同一份表单状态。
- 业务错误协议、超时、认证刷新、退出或切换租户时的缓存清理、统一反馈和监控按实际接口契约接入，目前没有这些实现。

## 目录与测试

```text
src/
  main.tsx                 # 应用入口与 Query Provider
  query-client.ts          # Query 默认缓存与重试策略
  assets/                  # 静态素材
public/                    # 原样复制的公共资源
tests/
  lint-config.test.mjs     # 代码规范正反例回归
  setup.ts                 # 组件测试初始化与清理
  unit/                    # 组件与单元测试
config/                    # 检查工具兼容配置
.github/workflows/         # CI 工作流
vite.config.ts             # 开发、构建与 Vitest 配置
CONTRIBUTING.md             # 开发规范、场景选库与 Skill 清单
AGENTS.md                  # AI 执行约定
```

业务代码随功能新增目录；共享组件、Hook 和工具仅在确有复用时提取，不预建空架构。

Vitest 包含两个测试项目：`lint` 在 Node 环境运行规范回归，`unit` 在 jsdom 环境运行组件与单元测试。当前测试覆盖入口渲染、Query 策略和检查规则；测试 API 从 `vitest` 显式导入，组件测试复用 Testing Library 和清理配置。MSW handler 与 Playwright E2E 尚未接入。

## 开发约定与协作

页面、布局、列表、表单和详情优先复用 ProComponents，基础交互使用 antd。先搜索项目已有实现和依赖能力，再编写必要的业务组合；新增依赖或自研基础能力需说明已有方案的缺口。

- [CONTRIBUTING.md](./CONTRIBUTING.md)：开发与提交规范、按场景选库、测试和验证要求。
- [Skill 清单](./CONTRIBUTING.md#当前项目-skill-清单)：按任务选用 antd、React 架构 / 模式 / 性能、设计和诊断技能。
- [AGENTS.md](./AGENTS.md)：AI 执行规则、组件复用、版本核对与插件使用边界。

Git 提交遵循 Conventional Commits；Husky 与 lint-staged 检查暂存文件及提交信息。GitHub Actions 的 `Frontend quality` 在 PR、main 推送或手动触发时执行冻结安装、完整检查、测试与构建，并按事件校验提交信息。本地验证通过不代表远程 CI 已通过。
