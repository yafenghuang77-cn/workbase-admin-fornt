# 项目开发约定

先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，其中的组件优先级、场景选库表和验证要求是开发依据；以仓库实际安装版本和配置为准。

## 技术栈与边界

- 项目使用 Vite、React 19、TypeScript、Ant Design 6 和 ProComponents，不是 Umi Max 项目。
- 保留 TS 7 构建与 TS 6 提供 ESLint 解析 API 的现有分工，不擅自合并或降级。
- 使用 pnpm，版本见 `packageManager`；Node.js 版本见 `.nvmrc`。更新依赖时同步锁文件。
- 功能代码放入所属功能目录；仅真正复用的组件、Hook 和工具提升到共享目录。不要为尚未实现的功能创建空架构。
- API 调用放在普通服务函数中，服务端状态使用现有 TanStack Query；跨页面客户端状态按需使用 Zustand，局部状态留在组件附近。

## 页面构建与复用

- 构建页面优先使用 `@ant-design/pro-components` 和 `antd`：布局优先 ProLayout / PageContainer，列表优先 ProTable，编辑表格优先 EditableProTable，表单优先 ProForm / ModalForm / DrawerForm / StepsForm，详情优先 ProDescriptions；简单场景使用 antd 对应基础组件。
- 先用 `rg` 检索项目已有实现，再查已安装组件、Hook 和工具的能力。能通过公开 API 和组合完成的功能，不重复实现搜索表格、分页、表单校验、弹窗、上传或通用布局。
- 当前只有入口和 QueryClient 基础设施；路由、antd 应用级上下文、请求封装和业务页面尚未实现。按任务逐步接入，不把预装依赖或 Vite 预打包项当作已完成能力。
- ProForm / antd Form 与 React Hook Form 不共同管理同一表单；ProTable 自动请求与 `useQuery` 不同时请求同一数据。服务端状态由 Query 统一管理，默认通过受控数据接入表格，提交使用 Mutation 并精准失效缓存。
- 按 CONTRIBUTING 的场景表复用已有库：HTTP 用 Axios，路由用 TanStack Router，图表优先 ECharts，通用 Hook 优先 ahooks，工具优先原生 API / es-toolkit，日期用 Day.js，文档处理按格式选已有库。
- 对重叠库按场景选一个：虚拟列表先用组件现有能力，再评估 TanStack Virtual；Radash、其他 Hook 库、React Hook Form 等仅在已有首选能力不适合时使用。不要因已安装就全部接入。
- 新增依赖或自研基础能力前说明现有方案的具体缺口；封装只处理业务差异或真实复用，不建立万能 CRUD 框架。大体积功能按需加载，不从应用入口统一导入。
- 不自动批量删除 Knip 报告的依赖；先核对源码、配置、生成流程和预留用途。

## React 与 Ant Design

- 按任务使用用户配置的 React 架构、组合、模式与性能 skill；仅应用适合 Vite 客户端项目的规则。
- 修改 antd 代码前读取 `antd` skill，检查实际安装版本，优先通过 antd MCP 查询相关 API、示例、语义样式和 Token。MCP 不可用或无法确认版本匹配时，使用 CLI 并指定 `--version <实际版本> --format json`。关注弃用提示和破坏性变更，不凭记忆猜 API。
- ProComponents 专有 API 单独核对对应版本官方文档、发布说明和本地类型声明；不要将 antd MCP 结果当作 ProComponents 文档，也不要直接套用旧版本示例。
- 组件样式优先使用 Token 和语义样式；应用级主题、语言和反馈按需统一接入 ConfigProvider / App，避免逐页重复配置。
- 修改 antd 代码后，对改动文件运行 `antd lint`。
- 修改 React 代码后，按 `react-doctor` skill 进行检查，运行时使用 `--no-telemetry`。
- 保持 Hooks 调用顺序与完整依赖；避免用 effect 同步可在渲染中计算的状态。
- 不用 `any` 或非空断言规避类型问题；处理空值、失败状态和异步清理。

## 按任务使用 Skill 与插件

技能名称、场景和边界统一见 [CONTRIBUTING 的 Skill 清单](./CONTRIBUTING.md#当前项目-skill-清单)。开始任务时主动匹配并读取相关 `SKILL.md`，简要说明采用的技能，无需用户再次提醒；不要只列名称而不执行，也不要一次加载所有技能。

| 任务类型                     | 优先使用的 Skill                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| 新增或修改后台页面           | `antd` + React 架构实践 `react-best-practices` + `react-patterns`；视觉交互按需加 `ui-ux-pro-max` |
| 组件 API、组合和复用重构     | `vercel-composition-patterns` + React 架构实践；涉及 antd 同时使用 `antd`                         |
| 请求、渲染或包体性能问题     | `vercel-react-best-practices`，结合现有 TanStack Query 与 Vite 配置                               |
| 主题、颜色、间距和组件规范   | `design-system` + `antd`，必要时加 `ui-ux-pro-max`                                                |
| React 改动收尾或专项诊断     | `react-doctor`，必须带 `--no-telemetry`                                                           |
| 品牌、Banner 或图片资产      | 按需求选 `brand`、`design`、`banner-design`、`imagegen`                                           |
| 文档产物、外部应用或技能管理 | 按 CONTRIBUTING 的特定任务清单选择，不混入普通页面开发                                            |

- React 工作优先使用 `react-patterns`、`vercel-react-best-practices`、`vercel-composition-patterns` 和 React 架构实践 `react-best-practices`（位于 `react-architecture-practices` 目录）；不套用 Next.js 服务端方案，不机械添加缓存或组合抽象。
- 页面视觉与可访问性按需使用 `ui-ux-pro-max`，设计 Token 按需使用 `design-system`，同时保持 ProComponents / antd 技术选型。
- 有匹配需求时优先使用已配置插件或 MCP；不匹配或不可用时使用本地工具及对应版本官方资料，并说明限制。无需为本地开发安装无关外部服务。
- 项目不是 Umi Max，不因 ProComponents 组件名称触发而套用 Umi 路由、请求或 Model 约定。仅在技术栈实际变化后才选择对应框架 skill。

## 样式与文档

- CSS/Less/SCSS 使用 Stylelint 配置；样式使用类选择器，ID 保留给锚点或 DOM 标识。
- Markdown 使用仓库配置，代码块标明语言；禁止在文档或客户端代码中写入密钥。
- 格式统一交给 Prettier，不叠加有冲突的格式化工具。
- 新增忽略项或禁用规则需要具体理由与最小范围，不能为让检查通过而全局关闭规则。

## 验证与交付

- 提交前执行 `pnpm check` 和 `pnpm test`；影响构建、依赖或运行时代码时再执行 `pnpm build`。
- 验证规则配置时使用能触发规则的反例，不能只检查配置是否成功加载。
- 遵循 Conventional Commits；不自动提交、推送或发布用户未要求的内容。
- 尊重工作区已有改动，报告未运行或无法完成的检查，不将本地验证说成远程 CI 已通过。
