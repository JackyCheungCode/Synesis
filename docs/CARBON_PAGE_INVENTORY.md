# Synesis Carbon 页面重构验收清单

> 本文是实施台账，不将源码检查、CI 或部署成功误记为真实浏览器验收。所有页面采用 Carbon productive workbench 模式：左对齐标题、统一内容起点、任务优先。

## 五层架构

| 层级 | 统一规则 | 当前证据 | 状态 |
|---|---|---|---|
| 1. 全局 Shell | Carbon Header、单一一级导航组、叠加式 SideNav、Skip link、主内容焦点目标 | `src/App.tsx`、`src/components/WorkspaceNavigation.tsx` | 源码已存在；键盘与移动端待浏览器验收 |
| 2. 页面布局 | Carbon Grid/Column；左对齐 Page Header；统一标题、内容、操作区域；桌面/平板/手机 gutter | `src/App.tsx`、`src/styles/carbon-foundation.scss` | 本轮统一页面框架；逐页结构审查待完成 |
| 3. 控件 | 优先使用 `@carbon/react` 正式组件与 Carbon token；可见 Label；不以 placeholder 代替 Label | Dashboard、Research、Products、Settings、Vault 页面组件 | 组件基础已使用；逐控件规格审查待完成 |
| 4. 交互状态 | Loading、Empty、Error、Success、Disabled、Busy；错误不静默；保存和异步操作有反馈 | App 状态、Research ErrorBoundary、各页面状态组件 | 覆盖不完整；逐页面补齐与验证中 |
| 5. 无障碍 | H1-H3 顺序、键盘可达、可见焦点、状态播报、焦点回归、缩放与对比度 | Skip link、aria-live、表单 Label、Research Progress | 源码检查部分完成；读屏与键盘实测待完成 |

## 页面清单

| 页面 | 入口 | 页面标题规则 | 内容重点 | 真实浏览器验收 |
|---|---|---|---|---|
| 情报总览 | `src/features/dashboard/WorkspaceDashboard.tsx` | 左对齐唯一 H1 | KPI、待办与新建研究主操作 | 待测 |
| 研究项目中心 | `src/features/research/ResearchWizard.tsx` | 页面列表 H1；详情页项目名 H1 | 需求、平台、采集、统计、报告五步 | 待测；白屏项目专项 |
| 标准化商品库 | `src/features/products/ProductLibrary.tsx` | 左对齐唯一 H1 | 搜索、商品列表、价格历史 | 待测 |
| 调研采集设置 | `src/features/settings/CollectionSettingsPage.tsx` | 左对齐唯一 H1 | 数量、深度、保存 | 待测 |
| AI 模型与 Key Vault | `src/features/settings/CredentialVault.tsx` | 左对齐唯一 H1 | Provider、凭证状态、连接测试、默认路由 | 待测 |

## 视口与交互验收

- 视口：320、375、768、1024、1440px。
- 布局：无页面级水平溢出；标题、内容、操作区左边界一致；无重复 max-width/padding 造成的双重缩进。
- 键盘：Tab 顺序、可见焦点、Enter/Space、Modal 焦点陷阱与关闭后焦点回归。
- 屏幕阅读器：标题层级、表单标签、错误和成功播报、进度状态。
- 状态：loading、empty、success、error、disabled、busy。
- Research 回归项目：`0510ceeb-2942-4aec-af0c-949bc499f371`；不得删除或重建原项目。

## 验收纪律

1. 静态测试通过只证明代码约束通过。
2. GitHub Actions 成功只证明构建/部署步骤成功。
3. Cloudflare 最新版本 100% 流量只证明 Worker 部署切换。
4. 只有真实浏览器截图、交互记录和 Console 无错误证据，才能将对应页面标记为浏览器通过。
