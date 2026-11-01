# Synesis 开发交接文档

更新时间：2026-11-01。

## 项目与基础设施
- GitHub：`JackyCheungCode/Synesis`，开发分支 `develop`
- Cloudflare Worker：https://synesis.xg-y.workers.dev
- Supabase Project：`vuyyaqsmlzixhdjvaidj`
- Supabase Edge Function：`synesis-api`

## 产品结构
Synesis 当前产品范围为全球客户发现：
- 一级菜单：全球客户发现
- 页面：Import Export Leads Finder
- 平台配置：API 与 AI 配置（保留原有 BYOK 凭证管理）

Import Export Leads Finder 的工作流：
1. 填写产品关键词、HS Code、进口目标国家、供应来源、日期、进口次数/货值、企业类型、行业、联系方式和采购决策人等条件。
2. 后端按贸易数据来源与条件匹配推荐 Apify Actor。
3. 读取所选 Actor 的实时 Input Schema，展示支持与不支持的条件。
4. 生成可编辑 Actor Input JSON，后端再次按真实 Schema 校验。
5. 启动 Apify Run，读取运行状态及 Dataset 结果。

贸易记录与企业目录/联系方式补全必须区分；Actor 不支持的条件不能宣称已经生效。不同 Actor 的参数由 Schema 驱动，不能将统一搜索对象直接当作所有 Actor 的原生输入。

旧版跨境市场分析工作台、研究项目、商品库、研究采集任务和报告功能已从主应用与 Edge Function API 路由中退役。历史 Supabase migration 保留，不回滚或删除现有用户数据。

## UI 与设计
- 采用 Synesis 自有原生组件、样式 token 和图标。
- 默认 Light，支持 Dark；标题左对齐；导航以叠加抽屉呈现。
- 字体仅使用 DM Sans / Manrope。
- 不依赖第三方企业 UI 组件体系。
- 设计说明：`docs/SYNESIS_DESIGN_SYSTEM.md`。

## 安全约束
- Provider API Key 与 Apify Token 使用 BYOK。
- 前端只负责安全提交和脱敏状态展示；密钥由后端加密管理。
- 不得写入浏览器本地存储或日志。
- 不要修改现有 Supabase Project / Cloudflare Worker 身份，不创建替代基础设施。

## 验收要求
每次改动分别核对源码提交、CI、Cloudflare 部署、Supabase Edge Function 部署和真实浏览器验收。CI 通过不等于浏览器视觉验收完成。覆盖 320、375、768、1024、1440px，检查键盘操作、焦点、表格局部滚动、弹窗和异步状态。
