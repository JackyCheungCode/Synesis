# Synesis

Global Customer Discovery Platform.

Synesis 聚焦全球进口商与 B2B 潜在客户发现：以产品关键词、HS Code、进口市场、供应来源、提单时间与企业画像为搜索条件，推荐适合的 Apify Actor，按 Actor 原生 Input Schema 校验参数，执行采集并查看结果。

## 产品模块
- 全球客户发现：Import Export Leads Finder
- 多维度贸易与企业筛选条件
- Apify Actor 推荐、Schema 覆盖检查与人工选择
- Actor 输入参数映射、校验、运行与结果读取
- API 与 AI 配置（BYOK），管理 Apify 和其他数据连接及 AI Provider 凭证

## 技术栈
- React 19、TypeScript、Vite
- Synesis 自有原生 UI primitives 与设计 token
- Supabase Auth、Postgres、Edge Functions
- Cloudflare Workers
- Apify Actors API

## 设计原则
详见 [Synesis 独立设计系统](docs/SYNESIS_DESIGN_SYSTEM.md)。默认浅色主题、支持深色主题；标题左对齐；导航采用叠加式抽屉；界面字体为 DM Sans 与 Manrope。

## 开发
```bash
npm install
npm run test:leads-finder
npm run test:design-system
npm run test:provider-model-actions
npm run build
npm run dev
```

## 部署
CI 在 `develop` 分支执行测试、类型检查和构建，并在部署凭证可用时部署现有 Cloudflare Worker 与 Supabase Edge Function。API Key 继续由后端加密管理，不在浏览器持久化或明文保存。
