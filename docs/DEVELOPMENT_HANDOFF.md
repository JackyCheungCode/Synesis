# Synesis 开发交接文档

更新时间：2026-11-01。

## 项目与基础设施
- GitHub：`JackyCheungCode/Synesis`，分支 `develop`
- Cloudflare Worker：https://synesis.xg-y.workers.dev
- Supabase Project：`vuyyaqsmlzixhdjvaidj`
- Supabase Edge Function：`synesis-api`

## 产品结构
Synesis 是综合型跨境商业智能平台，包含情报总览、研究项目与五步研究流程、采集任务、跨平台分析与报告、标准化商品库、凭证管理和采集设置。

## UI 与设计
- 采用 Synesis 自有原生组件、样式 token 和图标。
- 默认 Light，支持 Dark；标题左对齐；导航以叠加抽屉呈现。
- 字体仅使用 DM Sans / Manrope。
- 不依赖第三方企业 UI 组件体系。
- 设计说明：`docs/SYNESIS_DESIGN_SYSTEM.md`。

## 安全约束
- Provider API Key 使用 BYOK，前端只负责安全提交和脱敏状态展示。
- 密钥由后端加密管理，不得写入浏览器本地存储或日志。
- 不要修改现有 Supabase Project / Cloudflare Worker 身份，不创建替代基础设施。

## 验收要求
每次改动分别核对源码提交、CI、Cloudflare 部署、Supabase Edge Function 部署和真实浏览器验收。CI 通过不等于浏览器视觉验收完成。覆盖 320、375、768、1024、1440px，检查键盘操作、焦点、表格局部滚动、弹窗和异步状态。
