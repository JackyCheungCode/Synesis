# Synesis Carbon 全站页面与控件清单

> 目标：用统一 Carbon Design Foundation 管理全站 Shell、页面布局、控件、交互状态与无障碍。该清单记录代码级整改和验收证据，不将静态测试等同真实浏览器验收。

## 全站基线

- 视觉：Carbon White Theme；IBM Plex Sans；白色画布、Carbon 中性色和 IBM Blue 60 作为主要交互强调色。
- 布局：桌面 16 列、平板 8 列、移动 4 列；统一 gutter 32/24/16px；不允许页面容器与内部 padding 双重限宽。
- 排版：任务型页面使用 Carbon productive typography；一个 H1、一句必要说明；模块按 H2/H3 降级。
- 内容：先显示用户要做的任务、关键指标和主要操作；删除重复宣传语、重复标题和无效装饰；保留必要标签、验证、帮助和数据口径。
- 组件：优先 Carbon React；控件标签可见；按钮/输入/卡片 0 圆角、无阴影；尺寸与间距使用 Carbon tokens。
- 状态：每个异步操作必须有 loading、success、error；列表需有 empty；危险操作需确认；状态变化可被辅助技术感知。
- 无障碍：语义标题顺序、键盘可达、可见焦点、表单标签、状态播报、对比度、缩放和读屏。

## 页面清单

| 页面 | 代码入口 | Shell / 标题 | 内容层级 | 布局 | 控件与状态 | 浏览器验收 |
|---|---|---|---|---|---|---|
| Dashboard | src/features/dashboard/WorkspaceDashboard.tsx | 已统一全局 H1 | KPI 与主操作优先；精简说明 | 已有响应式 KPI / workflow | Carbon Tile、Button；空项目状态 | 待测 |
| Research | src/features/research/ResearchWizard.tsx | 项目详情名称为 H1 | 五步工作流；第一步表单、第二步数据源 | 进度条小屏滚动；表单断点 | Carbon ProgressIndicator、Tabs、Checkbox、表单、Error Boundary | 待测，白屏项目专项 |
| Products | src/features/products/ProductLibrary.tsx | 已统一全局 H1 | 数量、搜索、商品、价格历史 | 商品网格、历史表格 | TextInput、Button、Tile、空状态 | 待测 |
| Collection settings | src/features/settings/CollectionSettingsPage.tsx | 已统一全局 H1 | 每平台数量、采集深度 | 设置卡片 | NumberInput、RadioButton、保存状态 | 待测 |
| Credential vault | src/features/settings/CredentialVault.tsx | 已统一全局 H1 | Provider、外部 API、默认路由 | 密钥卡片网格 | PasswordInput、Select、保存/测试状态 | 待测 |
| Workspace Shell | src/App.tsx、src/components/WorkspaceNavigation.tsx | 全局 Header、导航、唯一页面 H1 | 通知、加载状态、页面主体 | 统一 page-wrap 与 gutter | Carbon Header、SideNav、InlineNotification、Loading | 待测 |

## 本轮变更证据

- 页面文案精简、标题层级与统一节奏：提交 a55111789fae34375ec7cc8672ba0a34086846bc。
- 静态测试 fixture 修正：提交 a3341fb69d7f3e397e31dfbde72f83fcf3bd7e8f。
- Research 详情页 H1 修正：本轮提交记录待补。
- 相关 CI：https://github.com/JackyCheungCode/Synesis/actions。

## 验收矩阵

| 视口 | 页面 | 验收内容 |
|---|---|---|
| 320 / 375px | 全部 | 无水平页面溢出；标题可读；按钮可触达；表单单列 |
| 768 / 1024px | 全部 | 8 列/平板布局；卡片不挤压；导航可用 |
| 1440px | 全部 | 16 列布局；左右 gutter 正确；内容不被过度限宽 |
| 键盘 | 全部 | Tab 顺序、焦点可见、Enter/Space 操作、弹层焦点管理 |
| 屏幕阅读器 | 全部 | H1-H3 层级、表单标签、动态状态、错误通知 |
| 状态 | 全部 | loading、empty、success、error、disabled、busy |
| Research | 项目 0510ceeb-2942-4aec-af0c-949bc499f371 | 直接打开、步骤 1→2、平台分类、数据源选择、方案生成；保留原项目数据 |

> 只有取得真实浏览器证据后，才能将“待测”改为“通过”。
