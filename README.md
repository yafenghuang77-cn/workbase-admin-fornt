# Workbase Admin Frontend

Workbase 管理端前端工程。基于 Vite 8、React 19、TypeScript 和 TanStack Router，启用 React Compiler，页面优先使用 Ant Design 6 和 ProComponents，项目样式使用 Less。

## 快速开始

使用 [`.nvmrc`](./.nvmrc) 指定的 Node.js 24.16.0，以及 [`package.json`](./package.json) 中 `packageManager` 指定的 pnpm 12.10.1。

```sh
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

开发地址为 [http://localhost:8888/workbase/](http://localhost:8888/workbase/)。开发服务器监听 `0.0.0.0:8888`，端口已占用时会报错。

当前开发模式存在渲染问题。入口会加载 React Query Devtools，但应用尚未提供 `QueryClientProvider`，因此页面会报 `No QueryClient set`。生产构建会跳过 Devtools，预览产物时需要按下文配置 Gzip 静态资源服务。

## 页面入口

| 路径                         | 当前功能                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| `/workbase/`                 | 独立欢迎页，提供 Ant Design、ProComponents 和 TanStack Router 的文档入口 |
| `/workbase/welcome`          | 旧欢迎页地址，自动跳转至首页                                             |
| `/workbase/rich-text-editor` | Tiptap 富文本演示，支持排版、链接、表格、图片、视频、附件和实时预览      |
| `/workbase/login`            | 登录占位页，等待接入表单和认证                                           |

富文本演示使用本地模拟上传，可切换浅色和深色主题、禁用编辑、重置或清空内容。复用组件导出 `RichTextEditor` 和 `RichTextViewer`，共用 Tiptap JSON 内容格式。业务上传通过组件回调接入。[富文本组件入口](./src/components/rich-text-editor/index.ts)

应用已配置 antd 中文语言、主题和反馈上下文，以及路由错误页和 404 页。Axios 和 TanStack Query 是后续业务请求与服务端缓存的选型，当前统一请求层、共享 QueryClient、认证和权限尚待接入。

## 常用命令

| 命令               | 用途                                                      |
| ------------------ | --------------------------------------------------------- |
| `pnpm dev`         | 启动本地开发服务器                                        |
| `pnpm check`       | 运行 ESLint、Stylelint、Markdownlint、Prettier 和类型检查 |
| `pnpm typecheck`   | 使用 TS 7 运行 `tsc -b`                                   |
| `pnpm test`        | 运行 Vitest 的 `lint` 和 `unit` 项目                      |
| `pnpm build`       | 执行类型检查并生成生产构建                                |
| `pnpm preview`     | 启动 Vite 本地预览服务，默认端口为 `4173`                 |
| `pnpm lint:unused` | 用 Knip 审查未使用的文件、导出和依赖                      |

构建和独立类型检查使用 TypeScript 7，ESLint 使用 TypeScript 6 提供解析 API。Vitest 项目已配置，当前分支没有提交测试文件，`pnpm test` 会以 `No test files found` 退出。提交前运行 `pnpm check` 和 `pnpm test`，并记录实际结果。涉及依赖、构建或运行时代码时，再运行 `pnpm build`。

## 环境配置

| 环境   | Vite mode     | 环境文件           | 开发命令           | 构建命令             |
| ------ | ------------- | ------------------ | ------------------ | -------------------- |
| 开发   | `development` | `.env.development` | `pnpm dev`         | —                    |
| 测试   | `test`        | `.env.test`        | `pnpm dev:test`    | `pnpm build:test`    |
| 预发布 | `staging`     | `.env.staging`     | `pnpm dev:staging` | `pnpm build:staging` |
| 生产   | `production`  | `.env.production`  | —                  | `pnpm build`         |

各环境文件预留了 `VITE_APP_ENV_NAME` 和 `VITE_API_BASE_URL`，API 默认值为 `/api`，当前运行时代码尚未读取这两个变量。终端中的环境名称由 Vite 配置根据 `mode` 决定。本机覆盖放在 `.env.[mode].local` 中，修改后重启开发服务器。客户端 `VITE_*` 变量只填写可公开的值。

Vite 将 `/api` 请求转发到 `http://127.0.0.1:9999` 并移除 `/api` 前缀。例如，`/api/users?page=1` 会转发到 `http://127.0.0.1:9999/users?page=1`。该规则由 Vite 配置直接定义，`DEV_API_PROXY_TARGET` 目前仅为预留项。应用页面前缀 `/workbase/` 独立于 API 前缀。[Vite 配置](./vite.config.ts)

## 构建与部署

- 所有构建命令均输出到 `workbase/`，每次构建会清空旧产物。JavaScript 输出到 `workbase/js/`，其他打包资源按扩展名分目录，清单位于 `workbase/.vite/manifest.json`。
- 部署时将产物挂载在 `/workbase/`，将应用路由回退到该目录的 `index.html`，按部署环境配置同源 `/api` 转发。
- 命中 10 KiB 阈值并成功压缩的资源只保留 `.gz` 文件，HTML 和模块仍引用原始资源 URL。静态服务需要在原始 URL 上返回对应的压缩文件，设置正确的媒体类型和 `Content-Encoding: gzip`。需要裸文件的环境应在打包时保留原始资源。
- 当前默认 Vite 预览配置不会替原始 URL 查找对应的 `.gz` 文件。即使预览服务正常启动，体积较大的脚本也无法加载。验证构建页面时需使用支持上述 Gzip 映射的静态服务。

## 项目结构

```text
src/
  main.tsx                       # 应用入口
  providers/                     # antd 应用级上下文
  routes/                        # TanStack Router 文件路由
  router/                        # 路由实例和错误反馈
  routeTree.gen.ts               # 生成的路由树
  pages/                         # 欢迎页、登录占位页、富文本演示
  components/rich-text-editor/  # 可复用的编辑器和只读展示组件
  assets/                        # 由应用引用的静态资源
  styles/                        # 全局 Less 样式
public/                          # 直接复制到构建目录的公共资源
config/                          # 检查工具的兼容性配置
vite.config.ts                   # 开发、构建和 Vitest 配置
```

新增路由时，将路由定义和插件生成的 `src/routeTree.gen.ts` 一并纳入版本控制。

## 贡献

JavaScript 使用 ES6+（ES2015 及后续版本）规范，样式使用 Less，格式统一由 Prettier 管理。Husky 在提交前通过 lint-staged 检查暂存文件，通过 Commitlint 校验 Conventional Commits 提交信息。当前分支未包含 GitHub Actions 工作流。

- [开发规范与选库指南](./CONTRIBUTING.md)
- [项目开发约定与 AI 执行规则](./AGENTS.md)
