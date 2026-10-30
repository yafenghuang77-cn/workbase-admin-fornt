# 前端开发规范

本文是项目开发、组件选型和验证的统一入口；AI 执行要求见 [AGENTS.md](./AGENTS.md)。

本项目参考[阿里巴巴前端规约](https://github.com/alibaba/f2e-spec)，结合 React 19、Vite 和 ESLint 9 Flat Config 进行适配。Prettier 直接继承 `prettier-config-ali`；ESLint 使用现有插件实现适用规则，并增加 Hooks、无障碍和导入排序检查。未直接继承 `eslint-config-ali`，也不宣称覆盖阿里文档中的全部人工审查项。

## 项目现状与选型原则

当前是 Vite 客户端管理端工程，不是 Umi Max 或 Next.js 项目。以 `package.json`、`pnpm-lock.yaml`、实际安装包和源码配置为准，不直接套用其他框架的路由、请求或服务端组件方案。

本次核对的核心安装版本为 React 19.3.1、Vite 8.3.5、antd 6.6.8、`@ant-design/pro-components` 3.1.15-8、TanStack Query 5.105.0 和 TanStack Router 1.170.46。这里记录的是扫描快照；后续开发使用 `pnpm list --depth 0` 重新确认，尤其不要将 ProComponents 2.x 示例直接套到当前 3.x 预发布版本。

- 已接入：React Compiler、共享 QueryClient、开发模式 Query Devtools，以及代码、样式、文档、类型和 Vitest 检查。
- 尚未接入：业务页面、antd 应用级主题与反馈上下文、业务路由、统一 Axios 请求封装、登录权限和监控初始化。`src/main.tsx` 当前只有占位内容和 Query Provider。
- Router 包已安装，但 Vite 中的 Router 插件仍被注释；Tailwind、Orval、MSW、Playwright 等已预装，但尚无对应业务接入或完整工作流。依赖预打包配置不代表功能已经实现。
- 当前 Vite 配置为基础路径 `/workbase/`、开发端口 `8888`、API 代理目标 `http://127.0.0.1:9999`、构建目录 `workbase`。这些值以 `vite.config.ts` 为准。

开发前先搜索所属功能、共享代码和已安装依赖。复用顺序为：已有业务能力 → 适合该场景的 ProComponents / antd 或现有专用库 → 少量业务组合代码 → 有明确缺口时才新增依赖或自研。不要为了复用而引入通用 CRUD 引擎，也不要因依赖已安装就全部接入。

## 页面与组件优先级

**构建管理端页面时，优先使用 `@ant-design/pro-components` 和 `antd`。** 能通过公开 API、配置和组合实现的能力，不另写一套基础组件。

| 场景                           | 优先选择                                          | 使用边界                                                     |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------ |
| 后台框架、菜单、页头           | `ProLayout`、`PageContainer`                      | 配合实际 Router 与权限数据；不另写通用布局框架               |
| 搜索列表、分页、排序、工具栏   | `ProTable`                                        | 简单展示表格可用 antd `Table`；不重复拼装完整列表框架        |
| 行内编辑                       | `EditableProTable`                                | 按业务处理校验、保存失败与取消，不复制一套可编辑表格         |
| 新增、编辑、分步录入           | `ProForm`、`ModalForm`、`DrawerForm`、`StepsForm` | 简单表单可用 antd `Form`，不强制复杂封装                     |
| 详情、数据卡片、业务列表       | `ProDescriptions`、`ProCard`、`ProList`           | 核对当前版本导出与弃用信息，避免沿用旧示例                   |
| 按钮、选择、弹窗、反馈、上传等 | antd 对应组件                                     | 使用公开 API、Token 与语义样式；图标优先 `@ant-design/icons` |

- 首次实现页面时按需接入 `ConfigProvider` 和 antd `App` 上下文，统一主题、语言与反馈入口，避免每页重复配置。
- ProComponents 与 antd 可组合使用；只有现有组件确实不能满足交互、可访问性或性能要求时，才实现局部自定义能力，并在交付说明中解释缺口。
- 表单优先沿用 ProForm / antd Form 的状态与校验。同一个表单不要再由 React Hook Form 管理第二份值；仅在明确需要独立表单引擎的场景使用已有 `react-hook-form`、`@hookform/resolvers` 和 Zod。
- 服务端数据统一由 TanStack Query 管理。表格筛选、分页和排序进入查询参数与 queryKey；默认将 Query 结果以受控数据传入 ProTable，不让 ProTable 的自动请求和 `useQuery` 同时请求同一数据。使用 `request` 适配时需明确单一请求入口与刷新策略，写操作走 Mutation，并精准失效缓存。
- 不把 Query 结果复制到 Zustand 或组件 state；只有编辑草稿等确实需要独立生命周期的状态才单独维护。
- 页面、图表、编辑器和文档处理能力按需加载。已有 React Compiler，不为所有组件机械添加 `memo`、`useMemo` 或 `useCallback`，先确认性能问题与接口稳定性需求。

## 按场景复用已安装能力

下表是本项目的默认选型约定，不表示这些能力均已接入。实现时先确认当前版本的官方文档、类型声明和项目调用方式；库不能覆盖的业务规则再自行实现。

| 场景                       | 默认选择                                                   | 避免重复实现或重叠使用                                                                 |
| -------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| HTTP 与服务端缓存          | Axios + TanStack Query                                     | 普通服务函数处理接口；不再用 effect、`ahooks/useRequest` 或 Zustand 建第二套服务端缓存 |
| 页面路由                   | TanStack Router                                            | 按需启用已有插件，适配 `/workbase/`；不引入 Umi 或另一套路由                           |
| 客户端状态                 | 组件局部状态，跨页面按需 Zustand                           | 不为局部状态建立全局 store                                                             |
| OpenAPI 类型与客户端       | Orval                                                      | 有可信接口契约后再生成，复用 Query 和请求层；不手写重复接口类型或直接改生成文件        |
| 常用 Hook                  | React 原生 Hook，通用行为优先 ahooks                       | ahooks 缺少能力时再评估 `@uidotdev/usehooks`；不要包装无业务价值的同名 Hook            |
| 工具、日期、类名           | 原生 API、es-toolkit、Day.js、clsx                         | 简单操作用原生；Radash 仅补缺，不为同一能力并用两套工具库                              |
| 图表与地图                 | ECharts；特殊可视化按需 D3、TopoJSON                       | 不为常规图表手写 SVG / Canvas 图表引擎；按需处理实例销毁和尺寸变化                     |
| 大列表与虚拟滚动           | 先评估组件自身能力，再用 TanStack Virtual                  | 不对同一列表嵌套两套虚拟化；`react-virtualized` 仅用于有明确适配需求的场景             |
| 拖拽排序                   | `@dnd-kit/react`、`@dnd-kit/helpers`                       | 检查当前包的 API，不照搬旧 `@dnd-kit/core` 示例                                        |
| 富文本、Markdown、代码高亮 | Tiptap、`@uiw/react-md-editor`、highlight.js               | 根据内容格式选一种编辑器；处理不可信内容的输出安全，不自建编辑器内核                   |
| Excel、Word、ZIP           | ExcelJS、docx / docx-preview、JSZip                        | 区分生成与预览，导出操作按需动态导入                                                   |
| PDF                        | `react-pdf` 阅读、`@react-pdf/renderer` 生成、pdf-lib 修改 | 按任务选择，不把三者当作可互换的同一能力                                               |
| 国际化、行政区划           | `react-intl`、china-division                               | 按业务接入文案和数据，校验地区编码与后端协议                                           |
| 实时通信、监控             | socket.io-client、`@sentry/react`、web-vitals              | 确认服务端协议与上报配置后启用，处理连接或订阅清理                                     |
| 测试与请求模拟             | Vitest、Testing Library、MSW；E2E 用 Playwright            | 延续现有测试入口，不再引入第二套测试框架                                               |

已有依赖存在重叠不等于需要立即删除。新增依赖前说明现有能力的缺口、兼容性和包体影响；清理时结合源码、配置和生成流程逐项确认，不能只按 Knip 输出批量卸载。

## Skill、MCP 与插件使用

- 修改 antd 相关代码时先使用 `antd` skill，优先通过已配置的 antd MCP 查询相关组件 API、示例、语义样式和 Token。查询版本必须与实际安装版本匹配；无法确认 MCP 目标版本或 MCP 不可用时，改用 antd CLI，知识查询显式传入 `--version <实际版本> --format json`。
- antd MCP 不能代替 ProComponents 专有 API 的核对。ProComponents 以对应版本官方文档、发布说明和已安装包类型声明为依据，特别检查预发布版及弃用提示。
- React 工作使用 `react-patterns`、`vercel-react-best-practices`、`vercel-composition-patterns` 和 React 架构实践 `react-best-practices`（`react-architecture-practices` 目录），只应用适合 Vite 客户端项目的规则。
- 页面视觉、响应式和可访问性任务按需使用 `ui-ux-pro-max`；设计 Token 任务按需使用 `design-system`。这些 skill 不改变本项目的 ProComponents / antd 优先级，不因此引入 `shadcn/ui` 或另一套组件体系。
- 其他插件或 MCP 只在任务确有对应能力需求时使用；优先已配置且能完成任务的工具。不可用时使用本地工具或对应版本官方文档，并说明限制，不为了使用插件安装无关服务。
- 本项目不因使用 ProTable / ProForm 就套用 Umi Max skill，也不因预装工具而引入 Next.js、NestJS 或数据库架构。先核对实际技术栈再选择对应 skill。
- 修改 antd 代码后对改动文件运行 `antd lint <文件路径> --format json`；修改 React 代码后按 `react-doctor` skill 检查，CLI 必须使用 `--no-telemetry`。这些检查补充项目检查，不能替代 `pnpm check` 与 `pnpm test`。

### 当前项目 Skill 清单

以下清单按本项目需求筛选，不要求每次任务加载全部 skill。开始任务时先判断改动类型，读取命中的 `SKILL.md`，说明本次采用的技能，再按项目版本与已有约定执行。同一任务可以组合多个相关 skill；不适用的规则不机械套用。名称和可用性以当前会话提供的技能目录为准，不把个人机器的绝对路径写入项目配置。

| Skill                                    | 合适的使用场景                                                   | 本项目使用边界                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `antd`                                   | 新增、修改、调试和审查 antd 页面、组件、主题、弃用 API           | 先核对安装版本并查询 MCP / CLI，改动后执行 antd lint；ProComponents 专有 API 单独核对 |
| `react-best-practices`（React 架构实践） | 功能目录、组件职责、自定义 Hook、状态与 Provider 边界、数据 Hook | 对应 `react-architecture-practices` 目录，避免与 Vercel 性能技能混淆                  |
| `react-patterns`                         | 日常 React 组件、Hook、TypeScript 和状态逻辑                     | 遵循 React 19 与现有代码约定，避免 effect 同步派生状态                                |
| `vercel-react-best-practices`            | React 性能审查、请求瀑布、重渲染、懒加载和包体优化               | 仅使用适合 Vite 客户端的部分，不引入 Next.js 专属方案                                 |
| `vercel-composition-patterns`            | 组件组合、复用 API、过多布尔属性和复杂组件重构                   | 有真实复用需求再抽象，不把所有组件都改成复合组件                                      |
| `react-doctor`                           | React 功能或修复完成后、提交前、专项诊断                         | 使用 `--no-telemetry`，检查本次改动，区分既有问题；不替代项目验证                     |
| `ui-ux-pro-max`                          | 页面布局、响应式、交互、可访问性、图表与视觉审查                 | 基于 ProComponents / antd 落地，不自动更换组件库                                      |
| `design-system`                          | 统一颜色、字号、间距、语义 Token 和组件规范                      | 优先映射 antd Token，避免维护重复主题体系                                             |
| `design`、`brand`                        | 需要完整视觉方向、品牌规范或品牌一致性检查                       | 有明确品牌或设计任务时使用，不作为普通功能开发的前置步骤                              |
| `banner-design`                          | 网站横幅、活动 Banner、营销图片                                  | 用于对应素材任务，不替代业务页面组件实现                                              |
| `imagegen`                               | 生成或编辑插画、背景、位图素材                                   | 仅在需要图片资产时使用；现有 SVG 或代码原生视觉优先直接修改                           |
| `visualize:visualize`                    | 在对话中解释架构、交互流程、数据或方案比较                       | 用于讨论和说明，不自动成为项目运行时依赖                                              |

### 特定任务才使用的 Skill

| Skill                                                                                        | 触发场景与边界                                                                         |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `documents:documents`、`pdf:pdf`、`spreadsheets:Spreadsheets`、`presentations:Presentations` | 用户要求实际制作、读取或编辑对应文档产物时使用；实现网页中的导出按钮仍优先用项目已有库 |
| `google-drive:google-drive` 及对应 Docs / Sheets / Slides 技能                               | 任务涉及已连接的 Google Drive 文件时使用，不用于本地普通源码修改                       |
| `openai-docs`                                                                                | 查询 Codex 配置、技能机制或 OpenAI 产品 / API 时使用，不用于普通前端任务               |
| `skill-creator`、`skill-installer`                                                           | 明确创建、更新或安装技能时使用；本清单只是项目使用约定，不是新的 skill                 |
| `plugin-management:plugin-management`                                                        | 需要发现、连接或管理插件，或现有工具无法访问所需外部服务时使用                         |
| `token-collector`                                                                            | 安装、诊断、运行或查询 Zhixiao TokenCollector 时使用                                   |

`umi-max`（目录 `umi-max-enterprise`）、NestJS 和 Prisma 系列技能目前不适用于本仓库，只有实际任务涉及对应技术栈时才启用。`ui-styling` 面向的 `shadcn/ui` / Tailwind 实现不能覆盖本项目的 antd 优先级。Pages、Sites、宠物、模板和其他外部应用技能，仅在用户请求对应产物或服务时使用，不因可用就接入当前项目。

## 常用命令

```sh
pnpm lint          # 检查代码，任何警告都会阻止通过
pnpm lint:fix      # 自动修复可修复的 ESLint 问题
pnpm format        # 格式化项目
pnpm format:check  # 只检查格式，不改文件
pnpm typecheck     # 使用 TS 7 执行 tsc -b
pnpm test          # Vitest 规范回归、组件与单元测试
pnpm lint:unused   # Knip 检查未使用文件、导出和依赖，独立于提交检查
pnpm check         # 代码、样式、文档、格式和类型检查
pnpm build         # 类型检查和生产构建
```

首次安装依赖后，`prepare` 自动安装 Husky hooks。已有依赖的工作区可运行 `pnpm prepare`。CI 如不需要 hooks，可设置 `HUSKY=0`。

## 格式与代码检查

- Prettier 负责两空格缩进、单引号、分号、100 列目标宽度、尾逗号和 LF 换行；JSX 属性使用双引号。`package.json` 使用已有插件排序。
- ESLint 覆盖 JS、JSX、TS、TSX，同时包含 MJS、CJS、MTS、CTS；JSX 写在 `.jsx` 或 `.tsx` 中。
- JS 遵守推荐规则及严格比较、使用 const/let、禁止 eval、禁止 debugger、回调必须正确返回等检查。`console.log` 产生警告，允许 `console.warn/error`；Node 配置和脚本不限制 console。
- TS 使用 typescript-eslint 推荐规则，并检查 `any`、非空断言、未使用变量、重载分组、类型导入和统一签名。刻意不用的参数和捕获异常参数可使用 `_` 前缀。
- 未使用的变量、函数、导入、类型声明和参数由 ESLint 报告为 warning；提交检查及 `pnpm lint` 使用 `--max-warnings=0`，因此会阻止通过。TypeScript 的 `noUnusedLocals/noUnusedParameters` 显式关闭，避免编辑器重复报错；其他严格类型检查不变。
- React 使用推荐规则和自动 JSX runtime，检查列表 key、组件命名、嵌套组件、按钮类型及无障碍问题。不强制 React 19 已移除运行时检查的 `propTypes`。
- Hooks 使用当前插件的推荐规则，包括 Hooks 调用顺序、依赖完整性和编译器相关诊断；不能通过随意关闭规则来规避设计问题。
- `src` 和 `tests/unit` 使用浏览器环境；根目录配置、`scripts` 和规范回归测试使用 Node 环境。测试文件启用 Vitest 推荐规则，`test`、`expect` 等 API 从 `vitest` 显式导入，不注入测试全局变量。
- `src` 中 TS 文件、`tests` 中 TS/TSX 和 `vite.config.ts` 开启类型感知检查：未处理 Promise、Promise 误用、await 非 Promise 和联合类型 switch 漏分支。`void promise()` 不能绕过检查；应等待、向上传递或处理失败。ESLint 使用 TS 6 API，构建及独立类型检查仍使用 TS 7。
- 同一类型感知范围还检查隐式 any 的赋值、调用、成员访问、传参和返回。`JSON.parse` 等边界值先用 `unknown` 接收，再校验或收窄类型；不能只靠禁止手写 any。业务异常使用 Error 或其子类，允许原样重新抛出 catch 捕获值，并按包来源精确放行 TanStack Router 的 Redirect、NotFoundError 控制流类型。
- TanStack Query 使用官方推荐规则，检查 queryKey 依赖、QueryClient 生命周期、不稳定依赖、无返回值查询和选项顺序；避免对查询结果做 rest 解构。
- 列表还检查无 key 的 Fragment、可静态识别的重复 key，以及 key 在 spread 之前。业务 ID 是否唯一且稳定仍需审查；不在渲染中用随机数生成 key。
- React 额外检查不安全的旧类组件生命周期和 iframe sandbox；Hooks 以已安装版本的推荐预设为准，不开启已废弃的规则。未来自定义 effect Hook 需精确登记依赖检查范围。
- JS 额外检查构造函数错误返回、未更新的循环条件、可选链参与算术运算；TS 类型感知检查还拒绝误展开 Promise / Map 等值及意外的 `[object Object]` 字符串转换。
- Prettier 冲突规则在 ESLint 配置末尾关闭；格式检查使用独立命令。
- 忽略范围以各检查工具配置为准，通常包括依赖、覆盖率、测试报告、Husky 内部文件、`src/generated` 和路由生成文件；Prettier 还忽略锁文件。当前构建输出已改为 `workbase/`，但 ESLint 与 Prettier 的构建目录忽略项仍需同步；已有产物会导致全量检查误扫。不能假定 `.gitignore` 会自动作用于所有检查工具。

## 导入顺序

通过 `simple-import-sort` 自动检查并修复，组间空一行：

1. 非样式的副作用导入；保留这些导入之间的执行顺序。
2. `node:` 内置模块。
3. React、React DOM。
4. 其他第三方依赖。
5. `@/` 项目内部导入（映射到 `src/`，Vitest 复用 Vite 对 TypeScript 路径配置的解析）。
6. 上级目录相对导入。
7. 当前目录相对导入。
8. 不绑定变量的 CSS、Less、SCSS 样式导入；置于最后，保留样式之间的原始顺序。

类型使用 `import type`；具名导入和可排序的重导出也会排序。不要叠加另一个 import 排序插件。

跨目录引用可使用 `@/`，例如 `import App from '@/App';`；同目录引用仍可使用 `./`。测试继承应用的 TypeScript 路径配置，Vitest 通过现有 Vite 配置解析到同一目录。样式副作用导入即使使用别名，也放在最后。

应用和测试中的 JS、JSX、TS、TSX 模块导入可省略文件后缀，例如 `@/App` 或 `./utils`。Vite 原生解析和 TypeScript `bundler` 模式已支持，无需额外插件；VS Code 的 `js/ts.preferences.importModuleSpecifierEnding` 设置为 `minimal`，自动导入优先省略后缀和末尾的 `/index`。CSS、Less、SCSS、图片及带 `?raw`、`?url` 等查询参数的资源引用保留完整文件名；直接由 Node 执行的 ESM 配置和脚本按 Node 的要求保留后缀。

## Git 提交

`pre-commit` 使用 lint-staged，仅处理暂存文件：代码先执行 ESLint 修复，再执行 Prettier；其他支持的文本文件执行 Prettier。修复结果由 lint-staged 自动暂存，无法修复的错误会阻止提交。

`commit-msg` 使用 Commitlint 检查：

```text
type(scope): 简洁描述
```

scope 可省略；填写时使用小写。标题最多 100 个字符，不以英文句号结尾；允许中文描述与 React 等技术名称。正文、footer 与前一部分之间保留空行。

支持 `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`。相对阿里规约基础类型，项目保留 Conventional Commits 的 `perf/build/ci`。

```text
feat(user): 新增用户列表
fix(auth): 修复登录状态失效
chore: 配置前端代码规范
```

本地 hooks 与 CI 使用同一套规范。hooks 可被绕过，CI 会重新执行全量检查。

## 样式规范

`stylelint.config.mjs` 继承 `stylelint-config-ali`，使用其 CSS、Less 和 SCSS 支持；不与 standard 预设重复叠加。检查无效颜色、未知属性、重复声明、重复选择器、未知单位和 ID 选择器等问题。项目将错误级别设为 error，并额外拒绝空样式块和未知 CSS at-rule。

- 使用类选择器编写样式，ID 仅作为锚点或 DOM 标识。
- 不重复定义同一声明块的 CSS 自定义属性；字体列表提供通用字体回退。普通 CSS 额外检查属性值拼写、遗漏 var、无效媒体查询和错误的 @import 位置。
- Less 使用 `postcss-less`，支持变量和混入；SCSS 使用规则包自带解析器及 `scss/at-rule-no-unknown`，正确区分合法指令与拼写错误。具备检查能力不意味着项目已接入 Sass 构建。
- 允许 Tailwind CSS 4 的已知指令，普通拼写错误仍会报错。Tailwind 的运行时接入是独立任务。
- antd 样式优先使用 Token、语义样式与组件公开 API，避免依赖内部 `.ant-*` 结构。
- 无需同时维护 `.stylelintignore`，统一在配置的 `ignoreFiles` 中管理忽略项。

## Markdown 规范

`.markdownlint.cjs` 复用阿里规则，适配当前 CLI 使用的引擎；`.markdownlint-cli2.jsonc` 统一排除依赖和生成产物。

- 标题层级连续，列表使用短横线，代码块声明语言。
- 使用规范技术名词拼写，如 JavaScript、TypeScript、React。
- 保留阿里允许行内 HTML、不限制行宽和允许重复标题的选择；表格对齐交给 Prettier，Markdownlint 验证结果。
- 命令行与编辑器共享配置；MDX 当前仅由 Prettier 格式化，不假定普通 Markdown 规则能解析任意 JSX。

## 类型、目录和环境

- 应用与构建配置均显式开启 `strict`、`noUncheckedIndexedAccess` 和 `noImplicitOverride`。对数组索引和字典取值处理可能的 undefined。
- 额外开启 `exactOptionalPropertyTypes`、`noImplicitReturns` 和 `noPropertyAccessFromIndexSignature`，测试配置继承应用配置。可选属性默认允许缺失，不等于允许显式传入 undefined；需要后者时在类型中明确声明。返回值函数需完整处理返回路径；仅由索引签名提供的字段使用方括号访问，已声明字段仍可用点访问。
- React 组件使用 PascalCase，Hook 使用 `use` 前缀，普通函数和变量使用 camelCase。一个文件聚焦一项职责，相关逻辑放在所属功能附近。
- 共享代码只在确有复用时提取；服务端状态、客户端共享状态、组件局部状态分开管理。
- Node.js 固定参考 `.nvmrc`，pnpm 固定参考 `packageManager`。偏好最新版时应显式升级、更新锁文件并重新验证；CI 使用冻结锁文件安装。
- 客户端环境变量可能进入产物，不放置服务端密钥。新增变量记录用途，避免提交真实敏感值。

## 编辑器与自动检查

`.vscode/settings.json` 设置 Prettier 保存格式化、ESLint/Stylelint 保存修复及语言范围；`.editorconfig` 为其他编辑器提供缩进和换行基线。`.vscode/extensions.json` 推荐官方 Vitest 扩展 `vitest.explorer`，便于在编辑器中运行和调试测试。扩展只推荐，不会自动安装。

JS、JSX、TS、TSX 分别指定 Prettier，避免用户级语言设置中的其他格式化器覆盖项目配置。自动保存使用 `onFocusChange`：手动保存或离开当前编辑器时格式化，并执行 ESLint/Stylelint 可自动修复的规则。不要改成 `afterDelay` 并期待延迟保存触发格式化，VS Code 会跳过该保存方式的格式化步骤。

若保存未生效，先确认以项目根目录打开工作区，并已安装、启用推荐扩展；通过“格式化文档的方式…”确认当前文件使用 Prettier，在“输出 → Prettier / ESLint / Stylelint”查看配置加载错误。

```sh
pnpm lint:style      # 检查 CSS / Less / SCSS
pnpm lint:style:fix  # 修复可自动处理的样式问题
pnpm lint:md         # 检查 Markdown
pnpm lint:md:fix     # 修复可自动处理的文档问题
```

暂存区任务按扩展名分组，避免并发修改同一文件：代码先 ESLint 后 Prettier；样式先 Stylelint 后 Prettier；Markdown 先 Prettier 后 Markdownlint。`pnpm check` 汇总 ESLint、Stylelint、Markdownlint、Prettier 和 TS 7 类型检查。

GitHub Actions 的 `Frontend quality` 工作流在 PR、main 分支推送和手动运行时执行冻结安装、完整检查、Vitest 测试和构建。PR 校验 base 到 head 的提交，push 校验本次推送的提交；新建分支只校验最新提交，避免将历史遗留信息当成本次错误。CI 中关闭 Husky，并直接运行检查命令。

## 测试与代码清理

- 所有测试统一使用 Vitest。`vite.config.ts` 定义 `lint` 和 `unit` 两个测试项目：前者在 Node 环境运行规范回归，后者在 jsdom 环境运行组件与单元测试；共用现有 Vite 插件和路径解析配置。
- 组件测试放在 `tests/unit`，推荐 `.test.tsx`，工具函数测试推荐 `.test.ts`；`unit` 项目识别 `.test`、`.spec` 命名及 JS/JSX/TS/TSX 扩展名。测试 API 和类型从 `vitest` 显式导入，测试的 TypeScript 配置放在 `tests/tsconfig.json`，不向应用注入测试全局类型。
- `tests/setup.ts` 加载 `@testing-library/jest-dom/vitest`，并通过 `afterEach(cleanup)` 清理组件测试的 DOM；样式和资源导入交给 Vite 处理。
- 通过 `screen.getByRole` 等语义查询和 `userEvent` 测试用户行为；等待异步事件和查询，不依赖组件内部状态、CSS 选择器或直接 DOM 遍历。
- `pnpm test` 一次运行全部测试项目；`pnpm test:lint` 仅运行规范回归；`pnpm test:watch` 监听全部测试；`pnpm test:ui` 打开 Vitest UI。`pnpm test:coverage` 仅运行 `unit` 项目并输出 V8 覆盖率，暂不设置任意覆盖率阈值。`pnpm check` 不包含测试，CI 单独执行 `pnpm test`。
- Testing Library 7.16.2 的两个 waitFor 规则有自动修复缺陷；`config/eslint-testing-library.js` 保留错误诊断，仅移除这两个规则的自动修复。`lint` 项目通过正反例验证兼容处理、Vitest 和其他规范规则；升级插件时需重新验证后移除兼容层。
- E2E 优先覆盖登录、权限和关键提交流程；用 Playwright 的可访问性定位器和自动等待，不用固定 sleep。现阶段未接入 E2E 配置或 CI 浏览器测试。
- API 集成测试按需用已有 MSW 模拟成功、空数据、失败和取消；避免请求真实业务服务。当前未创建 MSW handler。
- `pnpm lint:unused` 是独立审查命令，发现问题会以非零状态退出。项目预装了很多待使用依赖，先逐项评估，不把当前清单直接当作提交门槛。

工作流提交到 GitHub 后才会运行。若需要阻止未通过检查的合并，应由仓库管理员在分支保护中将 `quality` 设为必需检查。
