# Synesis · Carbon Design System v11 全站验收台账

> 基准分支：`develop`  
> 基准提交：`5517df3b97a5c224ebc047635325f1828fb4febb`  
> 基准日期：2026-10-31  
> 范围：登录与认证、全局 Shell、五个主页面、研究项目五步工作流、分析视图、数据表格、所有模态框与表单控件。  
> 本文是持续更新的验收台账，不是合规声明。静态源码检查和 CI 通过不等于浏览器、键盘、屏幕阅读器或 WCAG 实测通过。

## 1. 验收规则

### 状态定义

| 状态 | 含义 | 关闭条件 |
|---|---|---|
| 未检查 | 尚未获得足够证据 | 完成源码检查与运行时验证 |
| 待整改 | 已发现明确偏差 | 修复并通过对应回归 |
| 部分通过 | 部分标准通过，仍有缺口或缺少运行时证据 | 补齐剩余检查并复测 |
| 静态通过 | 源码/自动化静态检查通过 | 仍需必要的浏览器验收 |
| 运行时通过 | 指定浏览器、视口、输入方式实测通过 | 记录环境、步骤和结果 |
| 已关闭 | 证据齐全，修复及回归均通过 | 回归范围变化时重新打开 |

**不得将“静态通过”升级为“运行时通过”。** 每项缺陷须有唯一编号；修复需记录 commit、测试结果和复测日期。

### 五层验收顺序

1. Shell：Header、导航、内容容器、主题、全局覆盖层、焦点路径。
2. 页面布局：页面骨架、栅格、间距、断点、密度、溢出与滚动。
3. 控件：Carbon 组件选择、语义、表单标签、按钮/链接、菜单、Tabs、表格、图表。
4. 交互状态：default、hover、focus、selected、disabled、read-only、error、warning、loading、empty、success。
5. 无障碍：键盘、焦点、名称/角色/值、ARIA、对比度、缩放、屏幕阅读器、动态内容。

## 2. 全站页面与控件清单

### 2.1 页面路由清单

| 页面 ID | 页面/状态 | 路由或入口 | 页面组件与证据 | 主要控件/内容 | 初始状态 |
|---|---|---|---|---|---|
| P-00 | 登录/注册 | 无有效 Session | `src/auth/AuthProvider.tsx:15-74` | 邮箱、密码、登录/注册切换、提交、错误/成功通知 | 部分通过（源码标签可见；键盘/错误态待实测） |
| P-01 | 情报总览 Dashboard | `#/dashboard` | `src/App.tsx:562`、`src/features/dashboard/WorkspaceDashboard.tsx:1-14` | KPI Tiles、状态 Tags、创建研究入口 | 部分通过（组件清单已建；布局/空状态待验收） |
| P-02 | 研究项目中心 - 项目列表 | `#/projects` | `src/App.tsx:572`、`src/features/research/ResearchWizard.tsx:271-422` | 研究需求表单、Accordion、Fluid 输入、国家/地区选择、地图、AI 解析、画像维度、项目列表 | 部分通过 |
| P-03 | 研究项目工作区 - Step 1 | 研究项目详情 | `ResearchWizard.tsx:452-455` | 已确认研究需求、画像展示 | 部分通过 |
| P-04 | 研究项目工作区 - Step 2 | 研究项目详情 | `ResearchWizard.tsx:455-480` | 平台分类 Tabs、平台 Checkbox、多选 Tags、Actor 候选、生成方案/审批入口 | 部分通过 |
| P-05 | 研究项目工作区 - Step 3 | 研究项目详情 | `ResearchWizard.tsx:481-486` | 采集进度 ProgressBar、任务状态、刷新/取消/结果查看、下一步 | 部分通过 |
| P-06 | 研究项目工作区 - Step 4 | 研究项目详情 | `ResearchWizard.tsx:488-499`、`App.tsx:794-800` | 项目统计、平台统计、统一数据集、平台结果表、分页、视图切换、分析图表 | 部分通过 |
| P-07 | 研究项目工作区 - Step 5 | 研究项目详情 | `ResearchWizard.tsx:503-514` | AI 报告生成、已保存报告、导出、暂存、步骤导航 | 部分通过 |
| P-08 | 标准化商品库 | `#/products` | `src/App.tsx:597`、`src/features/products/ProductLibrary.tsx:12-28` | 搜索、刷新、商品卡片、价格历史、分页、历史数据表 | 部分通过 |
| P-09 | 调研采集设置 | `#/settings` | `src/App.tsx:563`、`src/features/settings/CollectionSettingsPage.tsx:1-75` | NumberInput、快捷数量 Button、深度 RadioButtonGroup、保存 | 部分通过 |
| P-10 | AI 模型与 Key Vault | `#/vault` | `src/App.tsx:564`、`src/features/settings/CredentialVault.tsx:1-34` | PasswordInput、Cloudflare Account ID、外部集成字段、Provider Select、加密保存、连接测试 | 部分通过 |
| P-11 | 全局搜索弹窗 | Header 搜索 | `src/App.tsx:608-618` | Modal、TextInput、分组结果链接、商品库搜索动作 | 部分通过（键盘与焦点恢复待实测） |
| P-12 | 取消采集确认弹窗 | 任务取消动作 | `src/App.tsx:620` | 确认/保留、busy 禁用 | 部分通过 |
| P-13 | 采集结果弹窗 | 任务结果动作 | `src/App.tsx:623-626` | 结果表格、分页、关闭 | 部分通过 |
| P-14 | Apify 采集批准弹窗 | 研究计划审批 | `src/App.tsx:627` | 费用/范围确认、批准并开始、返回 | 部分通过 |
| P-15 | 研究分析视图 | Step 4 分析详情 | `src/App.tsx:802-840`、`ResearchWizard.tsx:243-260` | KPI、趋势图、环形图、漏斗、排名、词云、字段完整度、分析口径 | 部分通过（图表运行时可读性待验收） |

> 主路由类型见 `src/lib/router.ts:1-44`。研究项目列表与项目详情共用 projects 路由；研究工作区内部有五个步骤，必须分别验收，不得只把它算作一个页面。

### 2.2 控件/组件族清单

| 控件族 ID | 当前实现/出现位置 | 必验项 | 初始状态 |
|---|---|---|---|
| C-01 Header / HeaderGlobalBar | `App.tsx:547-553` | 品牌链接、导航切换、搜索、主题、账户动作的名称/焦点/触控尺寸 | 部分通过 |
| C-02 SideNav / SideNavMenu | `WorkspaceNavigation.tsx:31-61` | 覆盖层、Escape、点击遮罩、当前项、焦点进入/返回、导航后焦点 | 部分通过 |
| C-03 Breadcrumb / 页面标题 | `App.tsx:559` | 层级、当前页语义、标题唯一性 | 待运行时验收 |
| C-04 Button / Icon action | 全站 Carbon Button、HeaderGlobalAction | Button vs Link 选型、命名、危险动作确认、busy/disabled、重复提交 | 部分通过 |
| C-05 Link / 导航链接 | SideNavMenuItem、搜索结果、Carbon Link | 真实 href、可新窗口、无伪链接、焦点可见 | 部分通过 |
| C-06 TextInput / PasswordInput / TextArea | Auth、Vault、Research、Products、Global Search | 可见标签、helper/error、自动填充、密码遮蔽、必填提示 | 部分通过 |
| C-07 NumberInput / FluidNumberInput | Collection Settings、Research Wizard | min/max/step、单位、错误提示、键盘增减、边界值 | 部分通过 |
| C-08 Select / Dropdown / ComboBox / MultiSelect | Vault、Research Wizard | 标签、选项名称、搜索、清除、选中状态、弹层键盘行为 | 部分通过 |
| C-09 RadioButtonGroup / Checkbox | Collection Settings、Research Wizard | 组名、legend、checked、键盘方向键、禁用状态 | 部分通过 |
| C-10 Tabs / TabList / TabPanel | Research Step 2 | tablist/tab/tabpanel 关系、方向键、选中状态、切换保留选择 | 部分通过 |
| C-11 ProgressIndicator / ProgressBar / Loading | Research、App Shell | 当前步骤、进度值、忙碌语义、不会仅靠颜色表达状态 | 部分通过 |
| C-12 Accordion | Research intake、App 数据面板 | 展开状态、标题按钮语义、键盘、隐藏内容焦点 | 部分通过 |
| C-13 Modal | 搜索、取消任务、结果、审批 | 初始焦点、焦点陷阱、Escape、关闭后焦点返回、标题/描述 | 部分通过 |
| C-14 Tile / Tag / InlineNotification | 全站内容容器和状态反馈 | 组件语义、颜色对比、状态文本、交互性边界 | 部分通过 |
| C-15 HTML data table | App、Research、Products | caption、thead/tbody、scope、行标题、排序/分页语义、窄屏滚动 | 部分通过 |
| C-16 Carbon Charts | `App.tsx:825,832` | 图表主题、键盘/屏幕阅读器替代、图例、数据表替代、响应式 | 待运行时验收 |
| C-17 自定义地图/地理控件 | `ResearchWizard.tsx:84-154` | 地图可替代操作、标记名称、键盘、非颜色区分、加载失败回退 | 待检查 |
| C-18 自定义词云/漏斗/排名 | `App.tsx:826-835` | 语义替代、标签完整显示、对比信息不只依赖颜色/尺寸 | 待检查 |
| C-19 图片/品牌图标 | `ProductLibrary.tsx:19`、`BrandIcon.tsx` | 有信息图片的替代文本、装饰图隐藏、失败占位 | 待检查 |
| C-20 Auth / async feedback | `AuthProvider.tsx:15-74`、各页面 busy props | 认证加载、表单错误、提交中、网络失败、重复提交 | 部分通过 |

## 3. 五层验收台账

### Layer 1 — Shell

| ID | 验收项 | 证据/位置 | 初始结论 | 修复/验收记录 |
|---|---|---|---|---|
| S-01 | Carbon Header 与品牌入口 | `App.tsx:547-560`、`carbon-foundation.scss` | 静态通过：使用 Carbon Header/Name/GlobalAction，Header surface、hover 与 icon 已映射到 UI Shell 专用 tokens；品牌链接指向 dashboard。运行时布局待验收 | 桌面/移动端 Header 截图、键盘实测 |
| S-02 | 单一一级菜单与二/三级导航结构 | `WorkspaceNavigation.tsx:41-58` | 静态通过：一个 SideNavMenu，页面项为子菜单；符合 Carbon 左侧面板不支持三级层级的限制 | 确认无多余一级入口 |
| S-03 | 导航覆盖展开，不挤压内容区 | `WorkspaceNavigation.tsx:31-39`、`carbon-foundation.scss` | 部分通过：使用 Carbon SideNav overlay 模式；实际遮罩/层级/滚动待测 | 桌面/移动端实测 |
| S-04 | 当前导航项语义 | `WorkspaceNavigation.tsx:48-58`、`carbon-foundation.scss` | 静态通过：isActive、aria-current=page；选中背景/边框/图标使用 Carbon background-selected、border-interactive、icon-primary | 屏幕阅读器抽测 |
| S-05 | 菜单打开/关闭、Escape、遮罩 | `WorkspaceNavigation.tsx:8-21,31-39` | 部分通过：存在 close/focus handler；需验证 Carbon SideNav 事件顺序 | 键盘实测 |
| S-06 | 焦点返回与导航后主内容焦点 | `WorkspaceNavigation.tsx:8-24`、`App.tsx:557` | 部分通过：代码存在 focus 调用；未进行浏览器验证 | 键盘实测 |
| S-07 | 主内容 landmark | `App.tsx:565` | 静态通过：Carbon Content 带 id 与 tabIndex=-1；最终 DOM landmark 语义待 axe/Accessibility Tree 验证 | axe + 屏幕阅读器 |
| S-08 | 明暗主题 token 一致性 | `App.tsx:552`、`carbon-foundation.scss` | 部分通过：主题切换存在；所有自定义/Carbon 图表主题需逐屏核对 | 两主题截图对照 |
| S-09 | 全局搜索入口与账户操作可访问名称 | `App.tsx:551-553` | 静态通过：有 aria-label；tooltip、语义和触控尺寸待测 | 键盘/触屏 |
| S-10 | Shell 响应式、层级和页面边距 | `styles.scss`、`carbon-foundation.scss` | 未检查：没有视口截图与溢出记录 | 320/375/768/1024/1440px |
| S-11 | Skip to main 内容跳过链接 | `App.tsx:547-555`、`carbon-foundation.scss` | 已实现，静态通过：Header 内第一项可聚焦链接；点击后聚焦 `#main-content`；仅焦点时显示。需浏览器验证显示时机、焦点与滚动 | Tab 首焦点、Enter 跳转、NVDA/VoiceOver 抽测 |

### Layer 2 — 页面布局

| ID | 页面 | 验收重点 | 证据 | 初始结论 |
|---|---|---|---|---|
| L-01 | 登录/注册 | 表单宽度、品牌区、错误通知、窄屏堆叠 | `AuthProvider.tsx:40-74`、`styles.scss` | 部分通过；无截图 |
| L-02 | Dashboard | KPI 信息层级、空状态、创建入口、卡片网格 | `WorkspaceDashboard.tsx:1-14` | 部分通过；需验证不同数据量 |
| L-03 | 项目列表/研究需求 | 四组 Accordion、字段密度、国家地图与表单响应式 | `ResearchWizard.tsx:338-422` | 部分通过；地图与长表单需实测 |
| L-04 | Step 1 需求确认 | 画像分组、必填/可选信息、长文本和动态维度 | `ResearchWizard.tsx:454`、`:401-418` | 部分通过 |
| L-05 | Step 2 平台选择 | 分类 Tabs、平台列表、已选 Tags、Actor 候选、滚动 | `ResearchWizard.tsx:455-480` | 部分通过 |
| L-06 | Step 3 采集监控 | 进度、任务列表、日志、错误状态、长平台名 | `ResearchWizard.tsx:481-486` | 部分通过 |
| L-07 | Step 4 数据统计 | KPI、对比、表格、分页、质量提示、图表的密度与顺序 | `ResearchWizard.tsx:488-499`、`App.tsx:814-837` | 部分通过 |
| L-08 | Step 5 报告 | 报告内容宽度、长报告滚动、导出与保存动作 | `ResearchWizard.tsx:503-514` | 部分通过 |
| L-09 | 商品库 | 卡片网格、图片比例、搜索区、历史表格横向滚动 | `ProductLibrary.tsx:15-28` | 部分通过 |
| L-10 | 采集设置 | NumberInput、快捷选项、深度说明的对齐与窄屏布局 | `CollectionSettingsPage.tsx:17-75` | 部分通过 |
| L-11 | Key Vault | Provider 卡片密度、密码字段、长 Key、集成特定字段 | `CredentialVault.tsx:17-34` | 部分通过 |
| L-12 | 所有弹窗 | 最大高度、窄屏内边距、长结果滚动、背景滚动锁定 | `App.tsx:608-627` | 未检查；需逐个弹窗截图 |

### Layer 3 — 控件

| ID | 验收项 | 证据 | 初始结论 | 待补证据/动作 |
|---|---|---|---|---|
| C-01 | Button / Link 语义选择 | 全站组件；导航 `WorkspaceNavigation.tsx:48-58` | 部分通过 | 搜索全部 click handler，确认导航不使用伪按钮、动作不使用伪链接 |
| C-02 | 输入控件 label 与 helper | `AuthProvider.tsx:70-71`、`CredentialVault.tsx:20-31`、`CollectionSettingsPage.tsx:24-56`、`ResearchWizard.tsx:349-410` | 部分通过 | 检查 Fluid 控件的 label/legend/error DOM 输出 |
| C-03 | 数字输入边界 | `CollectionSettingsPage.tsx:24-39` | 静态通过：10–5000、step 10、helperText | 边界值与键盘实测 |
| C-04 | 快捷数量选择语义 | `CollectionSettingsPage.tsx:40-42` | 静态通过：aria-pressed；需确认是否更适合 RadioButtonGroup | 键盘/屏幕阅读器 |
| C-05 | Radio / Checkbox | `CollectionSettingsPage.tsx:46-56`、`ResearchWizard.tsx:391-394,470` | 部分通过 | 分组名称、方向键和选中朗读 |
| C-06 | Tabs / Progress Indicator | `ResearchWizard.tsx:156-162,461-466` | 静态通过：使用 Carbon 组件 | 键盘与 ARIA 运行时验证 |
| C-07 | Accordion | `ResearchWizard.tsx:350-389` | 部分通过 | heading 结构、展开按钮名称和隐藏内容焦点 |
| C-08 | Modal | `App.tsx:608-627` | 部分通过 | 每个弹窗单独验证初始焦点、Escape、焦点陷阱/返回 |
| C-09 | Table | `App.tsx:794-800`、`ResearchWizard.tsx:184-213`、`ProductLibrary.tsx:25` | 部分通过：部分列已显式 scope=col | caption、row header、排序语义、移动端阅读 |
| C-10 | Charts | `App.tsx:825,832` | 部分通过：已切换 Carbon Charts React | 需要图表无障碍替代表格和浏览器/屏幕阅读器验证 |
| C-11 | 自定义地图 | `ResearchWizard.tsx:84-154` | 未检查 | 地图是否有完整键盘替代控件；地图不可用时能否完成任务 |
| C-12 | Tag / Notification | 全站 | 部分通过 | 不能仅靠颜色表达状态；通知读屏播报与关闭行为 |
| C-13 | 图片替代文本 | `ProductLibrary.tsx:19`、`ResearchWizard.tsx:94-98` | 待整改/待判定：商品图 alt 为空，需确认是否装饰性 | 根据图像信息用途决定 alt，不得默认全部空 alt |
| C-14 | Icon-only controls | `App.tsx:551-553` | 静态通过：Header actions 有 aria-label | 检查全仓库 icon-only 控件与 tooltip/焦点名称 |

### Layer 4 — 交互状态

| ID | 状态/行为 | 覆盖范围 | 当前证据 | 初始结论 |
|---|---|---|---|---|
| I-01 | Default | 所有页面和控件 | 源码结构存在 | 未运行时验收 |
| I-02 | Hover | Header、SideNav、Button、Link、Tile、Tabs、表格行 | `styles.scss`、`carbon-foundation.scss` | 未逐项检查 |
| I-03 | Focus-visible | 所有可交互控件 | 存在若干 CSS focus 规则；无键盘录像/截图 | 部分通过 |
| I-04 | Selected / Active | SideNav、Tabs、Radio、Checkbox、视图切换 | `WorkspaceNavigation.tsx`、`ResearchWizard.tsx:461-470`、`App.tsx:796` | 部分通过 |
| I-05 | Disabled | busy、分页、表单前置条件 | `ResearchWizard.tsx:486,510-514`、`ProductLibrary.tsx:16-26` | 部分通过；需检查所有异步按钮 |
| I-06 | Read-only | 已保存画像、报告、历史数据 | `ResearchWizard.tsx:454`、`ProductLibrary.tsx:24-26` | 未检查 |
| I-07 | Error | Auth、API 请求、采集失败、字段校验 | `AuthProvider.tsx:68`、`App.tsx:560` | 部分通过；需检查错误聚焦和恢复路径 |
| I-08 | Warning | 分析覆盖不足、数据质量、费用提示 | `App.tsx:815`、`ResearchWizard.tsx:347` | 部分通过 |
| I-09 | Loading / Busy | App、Vault、Research、Products | `App.tsx:561`、`CredentialVault.tsx:22,29`、`ResearchWizard.tsx` | 部分通过；需验证 aria-busy/live region |
| I-10 | Empty | 项目、商品、统计、报告、搜索结果 | `ResearchWizard.tsx:421-422`、`ProductLibrary.tsx:28`、`App.tsx:610-617` | 部分通过；需覆盖所有空态 |
| I-11 | Success | 保存、认证、任务完成、分析快照 | 全站通知与状态 Tag | 未检查通知是否可感知且不打断 |
| I-12 | 重复提交/竞态 | 保存、审批、取消、同步、搜索 | busy 禁用逻辑局部存在 | 未完成全链路检查 |
| I-13 | 浏览器返回/刷新 | Hash 路由、研究步骤持久化 | `src/lib/router.ts:1-44` | 未运行时验收 |
| I-14 | 文本截断与溢出 | 表格、图表、标签、JSON、日志、按钮 | `styles.scss` | 未全量扫描和实测 |

### Layer 5 — 无障碍

| ID | WCAG/Carbon 验收项 | 初始结论 | 必须取得的证据 |
|---|---|---|---|
| A-01 | 颜色对比度：普通文本至少 4.5:1，大文本至少 3:1，非文本 UI 边界至少 3:1（适用 WCAG 2.2 AA） | 未完成 | 两主题全部 token 与真实组件背景组合的自动化对比度报告 |
| A-02 | 键盘可达：所有功能不依赖鼠标 | 部分通过：新增首焦点 Skip to main 链接；其余页面与控件仍未全流程验证 | Tab/Shift+Tab/Enter/Space/方向键/Escape 全流程记录 |
| A-03 | 焦点可见且不被 Header/Modal/SideNav 遮挡 | 未完成 | 各路由和覆盖层键盘截图 |
| A-04 | 焦点顺序与焦点返回 | 部分通过（代码有 handler，未实测） | 打开/关闭菜单、四类弹窗、导航后焦点路径 |
| A-05 | 名称、角色、值 | 部分通过（部分显式 label/aria） | axe 报告与 Accessibility Tree 抽查 |
| A-06 | 页面 landmark 与标题层级 | 部分通过 | 每页一个主标题、main/nav/header/region 结构验证 |
| A-07 | 表单错误关联与说明 | 未完成 | label、描述、错误 id/aria-describedby、提交失败焦点 |
| A-08 | 动态通知与进度播报 | 未完成 | live region / status / progressbar 读屏验证 |
| A-09 | 表格结构与数据关联 | 部分通过 | caption、scope、row header、复杂表头关联 |
| A-10 | 图表替代信息 | 未完成 | 每个图表有可访问摘要及等价数据表/文本结论 |
| A-11 | 200%/400% 缩放与窄视口重排 | 未完成 | 320px、200%/400% 缩放下无双向页面滚动（数据表等必要例外） |
| A-12 | 触控目标尺寸与间距 | 未完成 | 移动端主要交互目标尺寸测量 |
| A-13 | 减少动态效果 | 静态部分通过 | 检查 reduced-motion 下图表、加载、地图和动画 |
| A-14 | 语言与读序 | 未完成 | 页面 lang、中文/英文混排、数字/货币/时间读屏 |

## 4. 当前自动化检查覆盖边界

当前 CI 命令：`npm run test:carbon-foundation`，脚本：`scripts/carbon-foundation.test.mjs`。

已覆盖（静态断言）：
- 旧全局样式直接 HEX 色值检查。
- 部分 Carbon 语义 token 存在性。
- CSS 间距声明 4px 刻度。
- 16/8/4 列网格断点与 reduced-motion 规则。
- Carbon 字体与 typography mixin。
- 主题、导航 aria-current、Escape、inert 等源码模式。
- 部分快捷选项和 busy/disabled 代码模式。
- Carbon Charts 依赖样式入口。

**不覆盖：**
- React 最终 DOM 的 ARIA 正确性。
- 浏览器布局、截图差异、断点与滚动。
- 键盘焦点真实路径、焦点陷阱和焦点返回。
- axe/WAVE/Accessibility Tree。
- WCAG 实际对比度（含透明度、hover、disabled、主题组合）。
- 屏幕阅读器与移动触控。
- API 错误、异步竞态和真实业务数据下的所有状态。

因此，CI 成功只证明构建和有限静态规则通过，不构成全站 Carbon/WCAG 验收通过。

## 5. 验收执行记录

| 记录 ID | 日期 | 基准/提交 | 执行内容 | 结果 | 证据 |
|---|---|---|---|---|---|
| RUN-001 | 2026-10-31 | `5517df3b97a5c224ebc047635325f1828fb4febb` | GitHub Actions：Build、产品身份测试、Carbon Foundation 静态测试、TypeScript/Vite 构建 | 成功 | [GitHub Actions run 41209410457](https://github.com/JackyCheungCode/Synesis/actions/runs/41209410457) |
| RUN-002 | 2026-10-31 | 同上 | 浏览器全站手动验收、axe、键盘、屏幕阅读器、响应式截图 | 未执行 | 尚无证据 |
| RUN-003 | 2026-10-31 | Shell remediation commits: `a8ba9a2e`, `51fc540d`, `3c4f83cf`, `052fa8a7`, `3b60d3b7`, `d7894c80`, `8ad390b2` | 新增 skip link；按 Carbon UI Shell spec 修正 Header/SideNav surface 与交互 tokens；增加静态回归断言 | CI 待确认 | [最新工作流](https://github.com/JackyCheungCode/Synesis/actions) |

## 6. 修复优先级与变更治理

### P0 — 先确保全站 Shell 与安全交互
- S-03 至 S-07：导航遮罩、焦点管理、main landmark、主题覆盖。
- A-02 至 A-05：键盘、焦点、名称/角色/值。
- C-08：所有 Modal 的焦点与 Escape 行为。
- I-07 至 I-12：错误、警告、加载、空状态、成功和重复提交。

### P1 — 页面布局与控件一致性
- L-01 至 L-12：逐页截图验收，桌面/平板/手机断点。
- C-01 至 C-14：控件语义、标签、表格、图表、地图、图标。
- A-01、A-09 至 A-14：对比度、表格/图表替代、缩放与触控。

### 变更规则（防止修复一个页面破坏其他页面）
1. 一次只处理一个验收 ID 或一个共享组件，不做跨页面无关 CSS 覆盖。
2. 修改共享 token / Shell / 基础组件时，必须跑全套 CI，并对 Dashboard、Research、Products、Settings、Vault 五个主页面做视觉回归。
3. 修改某页面组件时，至少回归该页面的空、正常、错误、加载状态及 320/768/1440px 三种视口。
4. CSS 优先作用于组件作用域；禁止为修复单页而增加无边界的全局 `!important` 规则。
5. 每次修复更新本台账：缺陷 ID、原问题、文件/行、commit、测试、复测结果；证据不足保持“部分通过/未检查”。
6. 不触发真实 Apify 采集来做 UI 验收；需要数据时使用脱敏 fixture/mock。
7. 本台账所有“通过”均需指明是静态还是运行时；没有截图/测试报告，不得标记为运行时通过。

## 7. Layer 1 — Shell 首轮执行记录

### 已完成的源码整改

| 缺陷 ID | 发现 | 修复 | 证据 | 状态 |
|---|---|---|---|---|
| SH-01 | Carbon Shell 缺少跳过重复导航的入口；Carbon UI Shell 键盘指导建议在首个可聚焦控件前提供 Skip to main | 在 Carbon Header 中增加“跳至主要内容”链接；点击后聚焦 `#main-content`，并用 Carbon 语义 token 实现仅在焦点时显示 | `src/App.tsx` Header 首个子元素；`src/styles/carbon-foundation.scss` `.synesis-skip-link` | 静态实现完成；浏览器/屏幕阅读器复测待执行 |
| SH-02 | 旧样式中存在未被 React Shell 渲染的 `.nav-dismiss-overlay` 样式和多组历史 SideNav z-index 规则 | 本轮暂不删除：需先通过全仓库引用与运行时 DOM 核对，避免清理仍被间接使用的规则 | `src/styles.scss` 早期移动端规则；当前 `WorkspaceNavigation.tsx` 使用 Carbon SideNav 内置 overlay | 待核实，不作为已修复 |
| SH-03 | SideNav 自定义 z-index 为 9000，需与 Carbon Modal/Toast/Tooltip 层级核对 | 未修改，避免凭猜测改变浮层层级 | `src/styles/carbon-foundation.scss` `.synesis-carbon-side-nav` | 待层级实测 |
| SH-04 | Header 与 SideNav 使用 layer/layer-hover/layer-selected 作为 Shell 表面，偏离 Carbon v11 UI Shell 专用 token 规范；选中边框宽度为 3px | Header/SideNav surface 改为 `background`，hover 改为 `background-hover`，选中态改为 `background-selected` + 4px `border-interactive`，图标状态改用 `icon-secondary`/`icon-primary`；同步修正早期重复规则以避免 cascade 回退 | `src/styles.scss`、`src/styles/carbon-foundation.scss` | 静态整改完成；需 light/dark 浏览器视觉回归 |

### Shell 代码审查结论

- Header 使用 Carbon Header / HeaderMenuButton / HeaderName / HeaderGlobalAction；主导航使用 Carbon SideNav / SideNavMenu / SideNavMenuItem。
- 菜单保持单一一级入口“跨境市场分析”，五个页面作为二级项；符合当前 IA 要求。Carbon UI Shell Left Panel 本身不支持三级导航，后续若要增加三级信息，应使用页面内 Tabs/局部导航，不应嵌套第三层 SideNav。
- 主内容使用 Carbon Content，设置 `id="main-content"` 和 `tabIndex={-1}`；导航项触发后尝试将焦点移至主内容。
- Header 菜单按钮具有 `aria-label`、`aria-expanded`、`aria-controls`；页面导航项提供 `aria-current="page"`。
- 新增 Skip to main 链接后，静态上具备绕过全局导航的入口。仍未证明浏览器实际焦点顺序、SideNav Escape/遮罩关闭焦点返回、Modal/SideNav 层级、窄视口布局。

### 本轮证据边界

Carbon 官方依据：
- UI Shell Header 指南建议提供 Skip to main 链接，避免键盘用户逐项穿过全局导航。https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-header/guidelines
- UI Shell Left Panel 键盘行为说明：链接可通过 Tab 到达，菜单可用 Space/Enter 展开，激活链接后主内容应获得焦点。https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-left-panel/accessibility
- UI Shell Left Panel 不支持三级导航。https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-left-panel/guidelines

本轮只有源码检查，没有可用的浏览器自动化/计算机控制工具，因此不将焦点、滚动、遮罩和层级标为运行时通过。

## 8. 本轮基线结论

- 页面清单：已建立，覆盖认证、5 个主页面、研究五步、分析视图和 4 类弹窗/全局搜索。
- 控件清单：已建立，覆盖 20 类组件族。
- 五层验收台账：已建立，含 10 项 Shell、12 项页面布局、14 项控件、14 项交互状态、14 项无障碍检查。
- 全站运行时验收：尚未执行。
- 当前没有在本轮修改业务页面、组件样式或触发真实采集；本轮只建立审计台账和验收基线。
