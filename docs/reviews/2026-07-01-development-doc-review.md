# 开发文档评审记录

评审日期：2026-07-01

评审范围：

- `docs/01-开发文档.md`
- `docs/04-前后端分离开发文档.md`
- `backend/README.md`
- `frontend/README.md`
- 当前前后端实现中的路由、schema、模型和启动配置

## 结论概览

当前文档已经覆盖了系统目标、角色、菜单、支持流程、凭证安全和前后端职责边界，但有多处目标设计与当前实现混写的问题。最需要优先处理的是：凭证权限能力、项目部署多产品字段、API 清单和开发启动配置。这些内容如果不分清“已实现”和“目标设计”，会直接影响联调、验收和安全判断。

## P1 问题

### 1. 凭证权限写成强约束，但当前实现缺口没有标明

证据：

- `docs/01-开发文档.md:160` 要求普通用户不可新增凭证，凭证明文必须按单个凭证类型申请。
- `docs/01-开发文档.md:161` 要求运维管理员按客户、产品和凭证类型审批，同意后申请人才可查看。
- `docs/04-前后端分离开发文档.md:230` 至 `docs/04-前后端分离开发文档.md:239` 描述菜单、操作、数据权限以及凭证细粒度授权。
- 当前后端 `backend/app/main.py:847` 的凭证列表接口返回全部凭证记录。
- 当前后端 `backend/app/main.py:895` 的 reveal 接口只要登录即可解密返回明文。

风险：

文档会让使用者误以为凭证明文查看已经具备完整授权控制。若按此进行验收或上线准备，安全能力会被高估。

建议：

- 在开发文档中增加“当前实现状态”列或章节，明确凭证列表过滤、授权校验、审批角色校验仍属于待补。
- 把 reveal 接口的目标规则写具体：必须校验申请状态、授权范围、凭证类型、客户/产品范围和操作人权限。
- 将“目标安全模型”和“当前 V1 实现”分开描述。

### 2. 项目部署请求示例仍是单产品字段，和当前多产品实现不一致

证据：

- `docs/04-前后端分离开发文档.md:552` 至 `docs/04-前后端分离开发文档.md:568` 的项目部署新增请求使用 `productTypeId`。
- 当前 schema 在 `backend/app/schemas.py:85` 至 `backend/app/schemas.py:91` 要求项目部署支持 `productIds`，并将首个产品回填到 `product_type_id`。
- 当前模型在 `backend/app/models.py:193` 至 `backend/app/models.py:205` 已增加 `support_ticket_products` 关联表。
- `backend/README.md:84` 至 `backend/README.md:95` 已记录部署多产品兼容策略。

风险：

前端或第三方调用方照 `docs/04` 对接时，只传单个 `productTypeId` 可能无法表达多产品部署，也会遗漏新旧字段兼容策略。

建议：

- 将项目部署请求示例改为 `productIds: [1, 2]`。
- 明确非部署支持单使用单产品字段 `productId` 或兼容字段 `productTypeId`。
- 在数据模型章节补充 `support_ticket_products` 表和 `productIds/products/productTypeId` 的响应兼容规则。

### 3. API 清单与真实接口不一致

证据：

- `docs/04-前后端分离开发文档.md:592` 至 `docs/04-前后端分离开发文档.md:594` 记录了 `/api/files/*`。
- 当前 `backend/app/main.py` 没有 `/api/files` 路由。
- 当前后端已提供 `/api/assets`，见 `backend/app/main.py:579`。
- 当前项目部署已提供专用动作接口 `/receive`、`/assign`、`/self-assign`、`/complete-deployment`，见 `backend/app/main.py:722`、`backend/app/main.py:738`、`backend/app/main.py:756`、`backend/app/main.py:770`。

风险：

联调人员会按不存在的文件接口开发，或继续使用通用 `/handle` 流程处理项目部署，导致工单状态流转和资产生成不符合当前实现。

建议：

- 以当前后端路由为准重建 API 清单。
- 对未实现但计划中的接口标记为“目标接口”或“待实现”。
- 将项目部署专用动作接口加入 `docs/04` 的协同支持 API 章节。

## P2 问题

### 4. 开发环境端口和技术栈说明已过期

证据：

- `docs/04-前后端分离开发文档.md:34` 写请求库为 Axios。
- 当前 `frontend/src/api/client.ts:39` 使用 Fetch API 封装。
- `docs/04-前后端分离开发文档.md:677` 至 `docs/04-前后端分离开发文档.md:687` 写前端 5173、后端 8000、代理到 `localhost:8000/api`。
- 当前 `frontend/vite.config.mjs:6` 默认代理到 `http://127.0.0.1:8001`，`frontend/vite.config.mjs:29` 固定端口为 5175。
- `docs/04-前后端分离开发文档.md:39` 至 `docs/04-前后端分离开发文档.md:44` 写 PostgreSQL、Redis、MinIO。
- 当前 `docker-compose.yml:13` 使用 SQLite 文件数据库，Compose 未配置 Redis 和 MinIO 服务。

风险：

新人按文档启动会遇到端口和代理不一致；部署方案也会让人误以为 Compose 已经包含 PostgreSQL、Redis、MinIO。

建议：

- 将 `docs/04` 的开发环境更新为当前真实端口：前端 5175、后端 8001、E2E 前端 15175、E2E 后端 18001。
- 技术栈中区分“当前实现：Fetch + SQLite”和“生产目标：PostgreSQL / Redis / MinIO”。
- 如果坚持 PostgreSQL/Redis/MinIO 作为目标架构，补充当前 Compose 的差距说明。

### 5. `frontend/README.md` 中资产页面说明过期

证据：

- `frontend/README.md:64` 写“运维资产页面目前只有正式路由和占位说明，因为后端 V1 尚未暴露资产接口”。
- 当前前端 `frontend/src/pages/AssetsPage.vue:48` 已调用 `api.assets()`。
- 当前前端 `frontend/src/api/index.ts:62` 至 `frontend/src/api/index.ts:63` 已封装 `/assets`。
- 当前后端 `backend/app/main.py:579` 已暴露 `/api/assets`。

风险：

README 会误导使用者忽略已实现的资产台账能力，也会影响测试范围判断。

建议：

- 更新 `frontend/README.md` 的“尚待后端补充”章节。
- 将资产接口和部署完成后自动生成资产的流程写入已对接接口。

## P3 问题

### 6. `docs/04` 章节编号错位

证据：

- `docs/04-前后端分离开发文档.md:136` 进入“后端开发设计”。
- `docs/04-前后端分离开发文档.md:138` 又出现 `3.4 前端通用组件`。
- `docs/04-前后端分离开发文档.md:149` 又出现 `3.5 前端状态`。

风险：

章节引用不稳定，后续在 issue、测试用例或任务拆分中引用小节时容易混淆。

建议：

- 将 `3.4 前端通用组件` 和 `3.5 前端状态` 移回前端开发设计章节。
- 将 `3.6 Vue 前端工程约定` 调整为连续编号。

## 建议整改顺序

1. 先修正文档中的接口清单和项目部署多产品字段，降低联调风险。
2. 再补充“目标设计 / 当前实现 / 待实现”状态说明，尤其是凭证权限。
3. 更新开发环境、技术栈和 README，避免新人启动失败。
4. 最后统一章节编号和术语。

## 备注

本次评审未修改业务代码，也未运行测试。结论来自文档、README、前后端路由、schema、模型和配置的静态对照。
