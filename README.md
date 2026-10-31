# Synesis

Global Trade Intelligence Platform.

Synesis 将跨境市场研究、数据采集、跨平台分析、商品情报和 AI 报告组织在同一个工作台中。

## 产品模块
- 情报总览与研究项目管理
- 五步研究流程、数据源规划与人工审批
- Apify 采集任务、运行日志、结果同步与导出
- 跨平台标准化分析与 AI 研究报告
- 标准化商品库与价格历史
- AI Provider / 数据平台凭证管理（BYOK）
- 账户级采集设置、全局搜索、明暗主题

## 技术栈
- React 19、TypeScript、Vite
- Synesis 自有原生 UI primitives 与设计 token
- Supabase Auth、Postgres、Edge Functions
- Cloudflare Workers
- Leaflet 地理可视化

## 设计原则
详见 [Synesis 独立设计系统](docs/SYNESIS_DESIGN_SYSTEM.md)。默认浅色主题、支持深色主题；标题左对齐；导航采用叠加式抽屉；界面字体为 DM Sans 与 Manrope。

## 开发
```bash
npm install
npm run test:product-identity
npm run test:design-system
npm run build
npm run dev
```

## 部署
CI 在 `develop` 分支执行测试、类型检查、构建，并在凭证可用时部署 Cloudflare Worker 与 Supabase Edge Function。
