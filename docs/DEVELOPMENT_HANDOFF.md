# Synesis 开发交接文档

更新时间：2026-10-31。新聊天请先读本文件，再检查远端状态，不要依赖旧聊天上下文。

## 项目与基础设施
- GitHub：`JackyCheungCode/Synesis`，开发分支 `develop`
- 当前 HEAD：`0674f9eb21599b7f79aa84affc1bf7e6c331665e`
- 前端：React + TypeScript + Vite + Carbon React
- Cloudflare Worker：`synesis`，https://synesis.xg-y.workers.dev
- Supabase Project：`vuyyaqsmlzixhdjvaidj`
- Supabase URL：https://vuyyaqsmlzixhdjvaidj.supabase.co
- Edge Function：`synesis-api`，https://vuyyaqsmlzixhdjvaidj.supabase.co/functions/v1/synesis-api

禁止另建 Cloudflare Zone/Worker 或 Supabase Project。不要在聊天、日志或文档中输出任何 API Token、Service Role Key、Apify Key 等秘密。曾有 Cloudflare Token 在聊天中暴露，应视为泄露并轮换；不要复述或再次索取旧 Token。

## 2026-10-31 最新部署状态
### 前端 / Cloudflare
- GitHub Actions：[run 41176581816](https://github.com/JackyCheungCode/Synesis/actions/runs/41176581816)
- 状态：completed / success
- 对应 commit：`0674f9eb21599b7f79aa84affc1bf7e6c331665e`
- Cloudflare 最新 deployment：`20ba9c7d-5675-425f-86d0-0828be13a903`
- Worker version：`4c9ce39d-c4f4-450a-8571-dea3743659e9`
- 流量：100% 指向上述 version
- 部署时间：2026-10-31T06:27:32Z
结论：最新移动端 CSS 提交 CI 成功且已部署到 Worker，deployment 流量 100%。

### Supabase
- `synesis-api` 状态 ACTIVE，Version 27。
- Edge Function 配置 `verify_jwt=false`，但入口手动读取 Bearer JWT 并调用 `admin.auth.getUser(jwt)` 验证；修改时保持认证和 user_id 数据隔离。
- Version 27 包含商品来源 URL 规范化等后端改动。

## 最近重要提交
- `0674f9eb21599b7f79aa84affc1bf7e6c331665e`：移动端页面布局与横向溢出修复
- `6e79581c6906f37d7eb6a8a1b63f6932fcbf7fcb`：修正来源 URL 规范化正则
- `1f771ecbe0c87d512bd12379d81356c825282bfe`：商品匹配规范化来源 URL
- `570784801011eaf7e6013ea31cf5b91ec255344b`：同步流程提前返回时释放同步租约

## 移动端布局改动与未完成验收
改动文件：`src/styles.scss`。已提交/部署的全局规则：
- html/body/#root 和 app 根容器限制在视口宽度内，减少整页横向溢出。
- Carbon 内容区、页面容器、卡片和网格使用 min-width:0 / max-width:100%。
- 平板/手机修正内容区左偏移。
- 手机端主卡片、项目卡片、分析卡片、商品卡片优先单栏；KPI 指标保留双栏，小于约 380px 再单栏。
- 标题、表单、通知和长文本允许收缩与换行。
- 表格、原始结果保留容器内横向滚动，页面 body 不应横向滚动。

**未完成：** 尚未在真实 Android/iOS 设备逐页手动验收。CSS 当前是在旧样式末尾追加覆盖规则，后续要逐步合并重复媒体查询，避免持续堆叠。
验收页面：总览、项目、任务、分析报告、商品库、凭证库。检查 Carbon Header、SideNav 展开/关闭、弹窗、表单、长标题、按钮组、表格局部滚动。建议视口：320、360、390、430、768 px。检查 document.documentElement.scrollWidth 是否大于 clientWidth，定位撑宽的具体元素；不要只用全局 overflow:hidden 掩盖问题。数据表/JSON 可局部滚动，但 body 不可横向滚动。

## 现有功能摘要
- React + TypeScript + Vite + Carbon React；研究项目、任务、分析、商品标准库、凭证配置等页面。
- 商品库已有分页/搜索/商品卡片/价格历史入口；任务列表已有运行、同步、取消操作。
- Edge Function 主入口：`supabase/functions/synesis-api/index.ts`。
- 已有凭证加密、AI Provider 路由、研究计划、任务操作、结果查询、分析、商品列表和历史等 action。
- Apify 结果同步支持分页、游标续传、upsert；同步锁字段 `sync_lock_token`、`sync_lock_expires_at`，用 token 条件更新释放。
- `tasks.cancel` 已有；取消与同步并发竞态仍需审查。
- `tasks.analytics` 以 500 行分页处理；价格分位数是样本近似值，不是严格常量内存，也不能宣称无限扩展。

已知数据表（执行数据库变更前必须检查真实 schema）：`collection_tasks`、`collection_task_results`、`products`、`product_source_records`、`product_price_history`、`ai_provider_configs`、`ai_provider_credentials`、`integration_connections`、`integration_credentials`。

## 已批准的 8 个工作包
用户明确要求持续开发直到 P0–P3 工作完成，按完整工作包交付，不要拆成零碎任务，也不要反复询问是否继续。
1. WP1 采集任务引擎：Apify 分页、断点续传、租约/并发、重试、取消、日志、超时、恢复。
2. WP2 商品数据平台：原始/标准化数据、跨平台匹配去重、来源映射、质量。
3. WP3 商品价格历史：快照、币种、趋势、价格变化、异常检测。
4. WP4 市场分析。
5. WP5 商品工作台：动态字段、筛选、排序、搜索、详情、批量操作、导出。
6. WP6 平台连接器：Alibaba、AliExpress、Apify 凭证/采集配置。
7. WP7 AI：模型路由、成本跟踪、属性抽取、报告。
8. WP8 安全与生产运维：RLS、限流、秘密管理、监控、备份恢复、自动化测试、发布验收。
推荐顺序：WP1/WP2 → WP3 → WP4/WP5 → WP6/WP7 → WP8。尽量完成 DB + API + UI + 测试 + 部署的纵向切片。

## WP1 / WP2 当前状态
### 已有
- Apify 结果分页和同步游标续传。
- UUID token 同步租约抢占/续期；try/finally 在提前返回路径释放锁。
- 商品库、价格历史 API/UI。
- 商品身份匹配初步逻辑：优先平台标识（ASIN/SKU/UPC/EAN/GTIN/product ID/item ID），无标识才用规范化来源 URL；不按标题直接合并。
- URL 清理 hash、常见追踪参数、hostname 大小写、query 排序、默认端口和尾部斜杠。来源记录/价格历史保留平台维度。

### WP1 优先待办
1. 审计 tasks.sync 每页 upsert 与 result_synced_count 游标推进顺序。
2. 数据库写入失败时绝不推进游标；部分成功必须可安全重试。
3. 检查续租失败、token 被替换、取消与同步并发行为。
4. 审查 finally 释放锁的错误处理：不覆盖原始响应/异常，同时提供安全日志/可观测性。
5. 审查 tasks.retry 状态机，保证失败/取消/部分同步可恢复。
6. 增加自动化测试或模拟测试；用大于 1,000 条数据验证分页、幂等、断点恢复。
7. 补充任务运行日志和错误原因。

### WP2 优先待办
1. 先检查 products 与 product_source_records 真实 schema 和现有 sync/upsert。
2. 匹配优先级需按可信度分层：平台+ASIN/平台商品 ID、GTIN/EAN/UPC、平台+卖家上下文 SKU、规范化来源 URL。
3. SKU 不可跨平台全局匹配；不同平台 ID 不可直接视为相同 ID。
4. URL 需考虑 canonical URL、移动端域名、国家站点和变体参数，避免误合并。
5. 标题/品牌/型号相似度只生成候选，不直接强制合并；需冲突保护/人工确认。
6. 保留所有商品来源记录；补充匹配置信度、冲突状态、合并审计与回滚。
7. 测试重复商品、同名不同型号、同 SKU 不同卖家、不同国家站点。

## 工程纪律
- 每轮先检查 develop 最新 HEAD。
- 任何 Supabase 工作前读取 `skills://plugins/supabase/supabase/skill.md`。
- DDL 用迁移流程，不用普通 SQL 执行接口直接改 schema。
- Edge Function 部署后核验 ACTIVE、Version 和代码内容。
- Cloudflare 与 Supabase 独立部署；CI 成功不等于 Worker 已部署。核验 deployment 和流量比例。
- GitHub Actions 检查 jobs/steps，不只看标题。
- 汇报区分已提交、CI 通过、已部署、真实环境验证；没有实机验证就明确说明。
- 不要声称聊天结束后后台仍自动开发；每轮完成可核验工作。
- 用户期待实际代码、测试、提交和必要部署，不要只给计划。
- 项目数据通过 GitHub/Supabase/Cloudflare 连接器获取，不用公共网页搜索替代。

## 新聊天窗口启动指令
请将下面内容作为新聊天第一条消息：

> 继续开发 Synesis。先读取仓库 docs/DEVELOPMENT_HANDOFF.md，检查 GitHub develop 最新 HEAD、CI、Cloudflare Worker deployment 和 Supabase Edge Function 状态。不要重新规划或重复已完成工作。优先完成移动端逐页布局验收与修复（body 横向溢出、页面边距、内容拥挤、表格局部滚动），然后继续 WP1 同步检查点可靠性和 WP2 商品身份匹配。直接执行代码修改、测试、提交和必要部署；每次汇报区分提交、CI、部署和真实设备验收。沿用现有 Cloudflare Worker 与 Supabase Project，不要新建基础设施，不要泄露秘密。
