# 自动化测试体系与完整用例计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在前后端分离开发完成后，能够自动执行从单元、接口、权限、安全到端到端业务闭环的完整测试。

**Architecture:** 测试体系按“前端组件与页面、后端服务与接口、跨端端到端流程、非功能质量”四层组织。后端以 pytest + httpx + 测试数据库覆盖业务规则，前端以 Vitest + Testing Library 覆盖组件逻辑，端到端以 Playwright 串起真实 UI、API、权限和关键业务闭环。

**Tech Stack:** Vue 3 + TypeScript + Vite + Vitest + Testing Library + Playwright；FastAPI + SQLAlchemy + Pydantic + pytest + httpx；PostgreSQL 测试库；Docker Compose；GitHub Actions 或本地同等 CI。

---

## 1. 测试目标

- 覆盖 V1 基础闭环：登录、菜单权限、客户信息、项目台账、协同支持四类表单、项目部署附件、用户角色。
- 覆盖 V2 配置与权限：流程配置、产品名称、使用类型、客户凭证加密、申请、审批、查看、审计。
- 覆盖 V3 运营分析：工作台待办、SLA 超时、项目维度统计、人员维度统计、运维资产增强。
- 保证后端业务规则是最终可信来源，前端校验只作为体验层辅助。
- 保证所有敏感接口鉴权、授权、审计可自动验证。
- 保证开发完成后可一键运行全量测试，并可在 CI 中自动阻断缺陷合入。

## 2. 自动化分层

| 层级 | 目标 | 推荐工具 | 触发时机 |
| --- | --- | --- | --- |
| 后端单元测试 | 服务层、权限、流程、凭证加密、统计计算 | pytest | 每次后端提交 |
| 后端接口测试 | REST API 请求、响应、鉴权、数据校验、事务 | pytest + httpx | 每次后端提交 |
| 前端单元测试 | 表单校验、菜单状态、权限组件、工具函数 | Vitest | 每次前端提交 |
| 前端组件测试 | 表格、搜索、弹窗、上传、权限按钮 | Testing Library | 每次前端提交 |
| E2E 测试 | 登录后真实页面操作和跨模块闭环 | Playwright | 每次主流程合入、发布前 |
| 安全测试 | 凭证明文、越权、审计、文件鉴权 | pytest + Playwright | 每次安全相关提交 |
| 性能冒烟 | 列表、搜索、统计、登录接口基础性能 | k6 或 Locust | 发布前 |

## 3. 建议测试目录

```text
frontend/
  tests/
    unit/
    component/
    e2e/
      specs/
      fixtures/
      pages/
      auth.setup.ts
backend/
  tests/
    unit/
    api/
    integration/
    security/
    fixtures/
    factories/
tests/
  contract/
  performance/
  reports/
```

## 4. 测试数据基线

每次自动化测试启动时创建独立测试数据，避免依赖生产或开发人员手工数据。

| 数据对象 | 必备样例 |
| --- | --- |
| 用户 | 系统管理员、运维管理员、运维人员、交付人员、研发人员、项目经理 |
| 客户 | 华南医疗集团、华东产业园、北方医院 |
| 产品名称 | edhr、edhr MAX、MedPro5 |
| 使用类型 | 项目部署、技术支持、项目需求、其他支持 |
| 项目 | 已上线项目、待部署项目、暂停维护项目、无凭证授权项目 |
| 支持单 | 待运维接收、待研发处理、运维处理中、待交付确认、已关闭、已挂起、已超时 |
| 凭证 | SSH、RDP、VPN、数据库、平台登录，均有脱敏展示值 |
| 权限 | 有凭证授权用户、无凭证授权用户、菜单受限用户、全部数据管理员 |

## 5. 后端单元测试用例

| 用例 ID | 模块 | 场景 | 断言 |
| --- | --- | --- | --- |
| BE-UNIT-AUTH-001 | 认证 | 正确账号密码登录 | 返回 access token、refresh token、用户信息 |
| BE-UNIT-AUTH-002 | 认证 | 错误密码登录 | 返回认证失败，不生成 token |
| BE-UNIT-AUTH-003 | 认证 | 禁用用户登录 | 返回账号不可用 |
| BE-UNIT-PERM-001 | 权限 | 管理员获取菜单 | 返回全部后台菜单 |
| BE-UNIT-PERM-002 | 权限 | 普通用户获取菜单 | 仅返回被授权菜单 |
| BE-UNIT-PERM-003 | 权限 | 无菜单权限访问接口 | 返回 403 |
| BE-UNIT-PROJ-001 | 项目台账 | 创建项目编号 | 项目编号唯一且格式正确 |
| BE-UNIT-PROJ-002 | 项目台账 | 普通用户编辑关键字段 | 返回 403 |
| BE-UNIT-PROJ-003 | 项目台账 | 运维管理员编辑上线状态 | 更新成功并记录操作人 |
| BE-UNIT-SUPPORT-001 | 协同支持 | 创建项目部署单 | 自动生成“项目名称 + 部署申请”标题 |
| BE-UNIT-SUPPORT-002 | 协同支持 | 项目部署未填项目名称 | 返回字段校验失败 |
| BE-UNIT-SUPPORT-003 | 协同支持 | 技术支持手动标题 | 保存用户输入标题 |
| BE-UNIT-SUPPORT-004 | 协同支持 | 项目需求默认进研发 | 当前处理人或处理角色为研发 |
| BE-UNIT-SUPPORT-005 | 协同支持 | 其他支持默认进运维 | 当前处理人或处理角色为运维 |
| BE-UNIT-WF-001 | 流程 | 支持类型匹配流程模板 | 返回正确流程模板 |
| BE-UNIT-WF-002 | 流程 | 无处理人时兜底分派 | 使用项目负责人或默认角色处理人 |
| BE-UNIT-WF-003 | 流程 | 挂起后恢复 | 状态回到原处理节点 |
| BE-UNIT-CRED-001 | 凭证 | 新增凭证加密保存 | 数据库不出现明文 secret |
| BE-UNIT-CRED-002 | 凭证 | 凭证列表查询 | 只返回脱敏值，不返回明文 |
| BE-UNIT-CRED-003 | 凭证 | 已授权用户 reveal | 返回明文并写审计日志 |
| BE-UNIT-CRED-004 | 凭证 | 未授权用户 reveal | 返回 403 且不写明文响应 |
| BE-UNIT-CRED-005 | 凭证 | 审批授权 | 授权关系生成，审批人和时间正确 |
| BE-UNIT-FILE-001 | 文件 | 上传允许类型文件 | 返回文件元数据 |
| BE-UNIT-FILE-002 | 文件 | 上传超限文件 | 返回文件大小错误 |
| BE-UNIT-FILE-003 | 文件 | 未授权下载附件 | 返回 403 |
| BE-UNIT-STAT-001 | 统计 | 项目支持单总数 | 统计值等于测试数据数量 |
| BE-UNIT-STAT-002 | 统计 | 超时数量 | 只统计超过 SLA 且未关闭的支持单 |
| BE-UNIT-STAT-003 | 统计 | 人员处理量 | 按处理人聚合结果正确 |

## 6. 后端接口测试用例

| 用例 ID | 接口 | 场景 | 断言 |
| --- | --- | --- | --- |
| BE-API-AUTH-001 | POST `/api/auth/login` | 管理员登录 | `code=0`，返回 token |
| BE-API-AUTH-002 | GET `/api/auth/profile` | 携带有效 token | 返回当前用户、角色、权限 |
| BE-API-AUTH-003 | GET `/api/auth/profile` | 不带 token | 返回 401 |
| BE-API-CUSTOMER-001 | POST `/api/customers` | 新增唯一客户 | 创建成功 |
| BE-API-CUSTOMER-002 | POST `/api/customers` | 重复客户名称 | 返回唯一性错误 |
| BE-API-CUSTOMER-003 | GET `/api/customers` | 分页查询 | 返回 list、page、pageSize、total |
| BE-API-PROJ-001 | GET `/api/projects` | 按客户关键字搜索 | 只返回匹配客户 |
| BE-API-PROJ-002 | GET `/api/projects` | 按产品筛选 | 只返回匹配产品 |
| BE-API-PROJ-003 | GET `/api/projects/{id}/versions` | 查询服务版本 | 返回服务版本数组 |
| BE-API-PROJ-004 | GET `/api/projects/{id}/authorized-credentials` | 已授权用户 | 返回授权范围内凭证脱敏或可查看数据 |
| BE-API-PROJ-005 | GET `/api/projects/{id}/authorized-credentials` | 未授权用户 | 不返回明文 |
| BE-API-SUPPORT-001 | POST `/api/support-tickets` | 新增项目部署 | 标题自动生成，状态为待运维接收 |
| BE-API-SUPPORT-002 | POST `/api/support-tickets` | 新增技术支持 | 状态按流程进入运维或研发 |
| BE-API-SUPPORT-003 | POST `/api/support-tickets/{id}/handle` | 当前处理人处理 | 状态进入下一节点 |
| BE-API-SUPPORT-004 | POST `/api/support-tickets/{id}/handle` | 非当前处理人处理 | 返回 403 |
| BE-API-SUPPORT-005 | POST `/api/support-tickets/{id}/transfer` | 转办给具体人员 | current_handler_id 更新，生成通知 |
| BE-API-SUPPORT-006 | POST `/api/support-tickets/{id}/close` | 交付确认关闭 | 状态为已关闭，closed_at 有值 |
| BE-API-CONFIG-001 | POST `/api/config/product-types` | 管理员新增产品名称 | 新产品可用于支持单 |
| BE-API-CONFIG-002 | POST `/api/config/product-types` | 普通用户新增产品名称 | 返回 403 |
| BE-API-CONFIG-003 | POST `/api/config/support-types` | 新增使用类型 | 新类型可用于流程配置 |
| BE-API-WF-001 | POST `/api/config/workflows` | 新增流程模板 | 节点、默认处理人、适用规则保存正确 |
| BE-API-CRED-001 | GET `/api/credentials` | 普通用户列表 | 返回脱敏凭证 |
| BE-API-CRED-002 | POST `/api/credentials` | 普通用户新增凭证 | 返回 403 |
| BE-API-CRED-003 | POST `/api/credentials/{id}/apply` | 申请查看凭证 | 生成待审批申请 |
| BE-API-CRED-004 | POST `/api/credentials/{id}/approve` | 运维管理员审批 | 授权成功 |
| BE-API-CRED-005 | POST `/api/credentials/{id}/reveal` | 授权后查看明文 | 返回明文并生成审计日志 |
| BE-API-CRED-006 | GET `/api/credentials/audit` | 管理员查询审计 | 返回查看、复制、审批记录 |
| BE-API-USER-001 | POST `/api/users` | 新增用户 | 菜单权限和角色保存正确 |
| BE-API-ROLE-001 | PUT `/api/roles/{id}` | 更新角色权限 | 用户菜单随角色变更 |

## 7. 前端测试用例

| 用例 ID | 模块 | 场景 | 断言 |
| --- | --- | --- | --- |
| FE-UNIT-MENU-001 | 菜单 | 点击一级菜单 | 展开分组并进入默认二级菜单 |
| FE-UNIT-MENU-002 | 菜单 | 再次点击当前分组 | 二级菜单展开/隐藏切换 |
| FE-UNIT-PERM-001 | PermissionGuard | 无权限按钮 | 按钮不渲染或禁用 |
| FE-UNIT-PERM-002 | PermissionGuard | 有权限按钮 | 按钮可见且可点击 |
| FE-UNIT-FORM-001 | 项目部署表单 | 项目名称为空 | 显示必填错误 |
| FE-UNIT-FORM-002 | 项目部署表单 | 标题字段 | 不显示标题输入框 |
| FE-UNIT-FORM-003 | 技术支持表单 | 标题字段 | 显示标题输入框且必填 |
| FE-UNIT-FORM-004 | 支持单表单 | 客户名称选择后 | 产品类型下拉按客户筛选 |
| FE-UNIT-FORM-005 | 支持单表单 | 不存在产品 | 不能手动输入并提交 |
| FE-UNIT-UPLOAD-001 | 上传组件 | 选择允许文件 | 显示文件名和上传进度 |
| FE-UNIT-UPLOAD-002 | 上传组件 | 上传失败 | 显示错误提示，表单不可误提交 |
| FE-UNIT-TABLE-001 | DataTable | 分页切换 | 请求 page/pageSize 变化 |
| FE-UNIT-TABLE-002 | SearchBar | 重置查询 | 清空筛选并重新请求列表 |
| FE-UNIT-CRED-001 | 凭证列表 | 默认展示 | 只显示脱敏值 |
| FE-UNIT-CRED-002 | 凭证查看 | 未授权状态 | 显示申请查看入口 |
| FE-UNIT-CRED-003 | 凭证查看 | 已授权状态 | reveal 前不展示明文 |
| FE-UNIT-DASH-001 | 工作台 | 待办列表 | 只展示当前用户相关待办 |

## 8. 端到端 E2E 用例

### E2E-AUTH：登录与菜单权限

| 用例 ID | 步骤 | 断言 |
| --- | --- | --- |
| E2E-AUTH-001 | 管理员登录后台 | 可见项目台账、协同支持、运维资产、配置、用户管理 |
| E2E-AUTH-002 | 普通用户登录 | 可见工作台、项目台账、协同支持、客户凭证管理 |
| E2E-AUTH-003 | 菜单受限用户登录 | 不可见未授权菜单，直接访问路由被拦截 |

### E2E-PROJECT：项目台账

| 用例 ID | 步骤 | 断言 |
| --- | --- | --- |
| E2E-PROJECT-001 | 管理员创建客户和项目台账 | 项目出现在项目台账列表 |
| E2E-PROJECT-002 | 输入客户名称筛选项目 | 列表只剩匹配客户 |
| E2E-PROJECT-003 | 输入产品名称筛选项目 | 列表只剩匹配产品 |
| E2E-PROJECT-004 | 点击平台版本 | 弹窗展示服务版本号 |
| E2E-PROJECT-005 | 点击更新详情 | 弹窗展示更新记录 |
| E2E-PROJECT-006 | 未授权用户查看配置详情 | 不展示凭证明文，提示申请查看 |

### E2E-SUPPORT：项目部署闭环

| 用例 ID | 步骤 | 断言 |
| --- | --- | --- |
| E2E-SUPPORT-DEPLOY-001 | 交付登录，进入协同支持 / 项目部署 | 表单显示客户名称、项目名称、产品类型、优先级、环境、授权信息、远程方式、服务器信息、说明 |
| E2E-SUPPORT-DEPLOY-002 | 客户名称留空提交 | 显示必填错误，不发起创建请求 |
| E2E-SUPPORT-DEPLOY-003 | 填写项目部署并上传授权附件 | 支持单创建成功，标题自动生成为“项目名称 + 部署申请” |
| E2E-SUPPORT-DEPLOY-004 | 运维管理员登录处理部署单 | 可接收、处理，状态进入待交付确认 |
| E2E-SUPPORT-DEPLOY-005 | 交付确认通过并关闭 | 支持单状态为已关闭，项目统计更新 |

### E2E-SUPPORT：技术支持闭环

| 用例 ID | 步骤 | 断言 |
| --- | --- | --- |
| E2E-SUPPORT-TECH-001 | 交付创建技术支持单 | 标题可手动填写，状态按流程流转 |
| E2E-SUPPORT-TECH-002 | 非当前处理人打开支持单 | 只能查看进度，不能处理 |
| E2E-SUPPORT-TECH-003 | 当前处理人转办给具体人员 | 当前处理人变化，被转办用户收到待办 |
| E2E-SUPPORT-TECH-004 | 运维处理完成 | 状态进入待交付确认 |
| E2E-SUPPORT-TECH-005 | 交付验证不通过 | 支持单退回原处理链路 |

### E2E-SUPPORT：项目需求与研发流转

| 用例 ID | 步骤 | 断言 |
| --- | --- | --- |
| E2E-SUPPORT-REQ-001 | 交付创建项目需求 | 默认进入研发处理 |
| E2E-SUPPORT-REQ-002 | 研发处理并选择需要运维操作 | 状态进入运维处理中 |
| E2E-SUPPORT-REQ-003 | 运维完成部署配置 | 状态进入待交付确认 |
| E2E-SUPPORT-REQ-004 | 交付关闭 | 需求闭环，统计更新 |

### E2E-CONFIG：配置联动

| 用例 ID | 步骤 | 断言 |
| --- | --- | --- |
| E2E-CONFIG-001 | 管理员新增产品名称 | 支持单和项目台账产品下拉出现新产品 |
| E2E-CONFIG-002 | 管理员新增使用类型 | 流程配置可选择新类型 |
| E2E-CONFIG-003 | 普通用户访问产品名称配置 | 路由拦截或菜单不可见 |
| E2E-CONFIG-004 | 管理员创建流程模板 | 新支持单按模板流转 |

### E2E-CREDENTIAL：凭证授权与审计

| 用例 ID | 步骤 | 断言 |
| --- | --- | --- |
| E2E-CRED-001 | 运维管理员新增客户凭证 | 列表显示脱敏值 |
| E2E-CRED-002 | 普通用户查看凭证列表 | 不显示新增按钮，不显示明文 |
| E2E-CRED-003 | 普通用户申请查看某类凭证 | 生成待审批申请 |
| E2E-CRED-004 | 运维管理员审批通过 | 授权记录生成 |
| E2E-CRED-005 | 普通用户 reveal 明文 | 成功展示明文，审计日志新增 |
| E2E-CRED-006 | 未授权用户 reveal 明文 | 请求失败，不展示明文 |
| E2E-CRED-007 | 管理员查看审计日志 | 能看到操作人、时间、凭证、原因、关联支持单 |

### E2E-FILE：附件与下载鉴权

| 用例 ID | 步骤 | 断言 |
| --- | --- | --- |
| E2E-FILE-001 | 支持单上传授权文件 | 文件元数据保存，详情可回显 |
| E2E-FILE-002 | 授权用户下载附件 | 下载成功 |
| E2E-FILE-003 | 无业务权限用户下载附件 | 返回 403 或页面提示无权限 |
| E2E-FILE-004 | 删除附件 | 详情不再显示该附件 |

### E2E-STAT：工作台与统计

| 用例 ID | 步骤 | 断言 |
| --- | --- | --- |
| E2E-STAT-001 | 创建待处理支持单 | 当前处理人工作台出现待办 |
| E2E-STAT-002 | 关闭支持单 | 待办消失，已关闭统计增加 |
| E2E-STAT-003 | 构造超时支持单 | 超时统计增加 |
| E2E-STAT-004 | 按项目查看统计 | 支持总数、处理中数、Bug 数、新需求数正确 |
| E2E-STAT-005 | 按人员查看统计 | 处理量、平均响应时长、平均解决时长正确 |

## 9. 安全与越权测试

| 用例 ID | 场景 | 断言 |
| --- | --- | --- |
| SEC-001 | 未登录访问任意 `/api/*` | 返回 401 |
| SEC-002 | 普通用户调用管理员接口 | 返回 403 |
| SEC-003 | 修改请求体中的 requester_id 冒充他人 | 后端以 token 用户为准 |
| SEC-004 | 修改 URL 访问他人支持单 | 无数据权限返回 403 |
| SEC-005 | 普通用户新增凭证 | 返回 403 |
| SEC-006 | 凭证列表接口响应体扫描 | 不包含 encrypted_secret、secret、password 明文字段 |
| SEC-007 | reveal 未授权凭证 | 返回 403 且不写明文到日志 |
| SEC-008 | reveal 授权凭证 | 必须新增审计日志 |
| SEC-009 | 文件下载越权 | 返回 403 |
| SEC-010 | 上传脚本文件 | 类型限制生效 |
| SEC-011 | Token 过期 | 返回 401 或刷新 token 成功 |
| SEC-012 | Refresh token 失效 | 需要重新登录 |

## 10. 性能冒烟测试

| 用例 ID | 场景 | 基准 |
| --- | --- | --- |
| PERF-001 | 登录接口 50 并发 | P95 小于 500ms |
| PERF-002 | 项目台账 1000 条分页查询 | P95 小于 800ms |
| PERF-003 | 项目台账快速搜索 | P95 小于 800ms |
| PERF-004 | 支持单列表 5000 条分页查询 | P95 小于 1000ms |
| PERF-005 | 工作台统计 | P95 小于 1000ms |
| PERF-006 | 凭证列表脱敏查询 | P95 小于 800ms |
| PERF-007 | 文件上传 20MB | 成功且不阻塞其他请求 |

## 11. 自动执行命令

开发完成后建议统一提供这些命令。

```bash
# 后端
cd backend
pytest tests/unit -q
pytest tests/api -q
pytest tests/security -q

# 前端
cd frontend
npm run test:unit
npm run test:component
npm run test:e2e

# 全量
npm run test:all
```

建议在根目录增加 `scripts/test-all.ps1`，串联前端、后端、E2E、报告生成。

## 12. CI 阻断规则

- 后端单元测试和接口测试必须全部通过。
- 前端单元测试和组件测试必须全部通过。
- E2E 冒烟用例必须全部通过：登录、菜单、项目台账、项目部署闭环、凭证授权。
- 安全测试必须全部通过，尤其是凭证明文、越权访问、文件下载鉴权。
- 覆盖率建议阈值：后端服务层 80%，前端业务组件 70%，关键权限和凭证服务 90%。
- Playwright 失败时保留 trace、截图、视频，保存到 `tests/reports/`。

## 13. 实施任务

### Task 1: 后端测试基础设施

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/factories/users.py`
- Create: `backend/tests/factories/projects.py`
- Create: `backend/tests/factories/support.py`
- Create: `backend/tests/factories/credentials.py`

- [ ] **Step 1: 建立测试数据库和事务回滚夹具**

运行后端测试时，每个测试用例使用独立事务，测试结束自动回滚。

- [ ] **Step 2: 建立认证夹具**

准备管理员、运维管理员、运维人员、交付人员、研发人员、项目经理 token。

- [ ] **Step 3: 建立业务数据工厂**

准备客户、产品、项目、支持单、凭证、授权、流程模板数据。

- [ ] **Step 4: 运行后端空测试**

Run: `pytest -q`

Expected: PASS。

### Task 2: 后端业务规则与接口测试

**Files:**
- Create: `backend/tests/unit/test_auth_service.py`
- Create: `backend/tests/unit/test_permission_service.py`
- Create: `backend/tests/unit/test_workflow_service.py`
- Create: `backend/tests/unit/test_credential_service.py`
- Create: `backend/tests/api/test_projects_api.py`
- Create: `backend/tests/api/test_support_tickets_api.py`
- Create: `backend/tests/api/test_credentials_api.py`
- Create: `backend/tests/security/test_authorization.py`

- [ ] **Step 1: 编写认证和菜单权限测试**

覆盖 BE-UNIT-AUTH、BE-UNIT-PERM、BE-API-AUTH。

- [ ] **Step 2: 编写项目台账测试**

覆盖 BE-UNIT-PROJ、BE-API-PROJ。

- [ ] **Step 3: 编写协同支持测试**

覆盖 BE-UNIT-SUPPORT、BE-API-SUPPORT。

- [ ] **Step 4: 编写流程配置测试**

覆盖 BE-UNIT-WF、BE-API-WF。

- [ ] **Step 5: 编写凭证与审计测试**

覆盖 BE-UNIT-CRED、BE-API-CRED、SEC-006、SEC-007、SEC-008。

- [ ] **Step 6: 运行后端测试**

Run: `pytest backend/tests -q`

Expected: PASS。

### Task 3: 前端单元和组件测试

**Files:**
- Create: `frontend/tests/unit/menu.spec.ts`
- Create: `frontend/tests/unit/permission-guard.spec.ts`
- Create: `frontend/tests/component/support-form.spec.ts`
- Create: `frontend/tests/component/data-table.spec.ts`
- Create: `frontend/tests/component/credential-list.spec.ts`
- Create: `frontend/tests/component/upload-field.spec.ts`

- [ ] **Step 1: 编写菜单展开收起测试**

覆盖 FE-UNIT-MENU。

- [ ] **Step 2: 编写权限组件测试**

覆盖 FE-UNIT-PERM。

- [ ] **Step 3: 编写协同支持表单测试**

覆盖项目部署、技术支持、项目需求、其他支持字段差异。

- [ ] **Step 4: 编写表格和搜索测试**

覆盖分页、筛选、重置。

- [ ] **Step 5: 编写凭证脱敏展示测试**

覆盖凭证列表、申请查看、授权后 reveal 前状态。

- [ ] **Step 6: 运行前端测试**

Run: `npm run test:unit && npm run test:component`

Expected: PASS。

### Task 4: Playwright E2E 测试

**Files:**
- Create: `frontend/tests/e2e/auth.setup.ts`
- Create: `frontend/tests/e2e/pages/login-page.ts`
- Create: `frontend/tests/e2e/pages/projects-page.ts`
- Create: `frontend/tests/e2e/pages/support-page.ts`
- Create: `frontend/tests/e2e/pages/credentials-page.ts`
- Create: `frontend/tests/e2e/specs/auth.spec.ts`
- Create: `frontend/tests/e2e/specs/projects.spec.ts`
- Create: `frontend/tests/e2e/specs/support-deploy.spec.ts`
- Create: `frontend/tests/e2e/specs/support-workflow.spec.ts`
- Create: `frontend/tests/e2e/specs/credentials.spec.ts`
- Create: `frontend/tests/e2e/specs/statistics.spec.ts`

- [ ] **Step 1: 建立登录态复用**

管理员、普通用户、运维管理员、研发人员、交付人员分别保存 storage state。

- [ ] **Step 2: 编写登录和菜单权限 E2E**

覆盖 E2E-AUTH。

- [ ] **Step 3: 编写项目台账 E2E**

覆盖 E2E-PROJECT。

- [ ] **Step 4: 编写项目部署闭环 E2E**

覆盖 E2E-SUPPORT-DEPLOY。

- [ ] **Step 5: 编写技术支持、项目需求流转 E2E**

覆盖 E2E-SUPPORT-TECH、E2E-SUPPORT-REQ。

- [ ] **Step 6: 编写凭证授权与审计 E2E**

覆盖 E2E-CRED。

- [ ] **Step 7: 运行 E2E**

Run: `npm run test:e2e`

Expected: PASS，并生成截图、trace 和 HTML report。

### Task 5: 全量测试脚本与 CI

**Files:**
- Create: `scripts/test-all.ps1`
- Create: `.github/workflows/test.yml`
- Modify: `frontend/package.json`
- Modify: `backend/pyproject.toml` or `backend/requirements-dev.txt`

- [ ] **Step 1: 增加后端测试命令**

命令包含单元、接口、安全测试。

- [ ] **Step 2: 增加前端测试命令**

命令包含 Vitest、组件测试、Playwright。

- [ ] **Step 3: 增加全量测试脚本**

脚本顺序：安装依赖检查、启动测试服务、执行后端测试、执行前端测试、执行 E2E、收集报告。

- [ ] **Step 4: 增加 CI 工作流**

CI 自动启动 PostgreSQL、Redis、MinIO、后端、前端，然后运行全量测试。

- [ ] **Step 5: 验证 CI 阻断**

故意制造一个失败测试，确认 CI 失败；恢复后确认 CI 通过。

## 14. 发布前测试清单

- [ ] `pytest backend/tests -q` 通过。
- [ ] `npm run test:unit` 通过。
- [ ] `npm run test:component` 通过。
- [ ] `npm run test:e2e` 通过。
- [ ] 凭证明文未出现在列表接口、日志、截图、测试报告中。
- [ ] 普通用户不能访问管理员菜单和接口。
- [ ] 非当前处理人不能处理支持单。
- [ ] 支持单全流程可从创建、处理、确认到关闭。
- [ ] 项目统计、人员统计、超时统计与测试数据一致。
- [ ] Playwright trace、截图、视频可在失败时留存。

## 15. 覆盖自检

- 登录与菜单权限：已覆盖。
- 客户信息：已覆盖接口新增、唯一性、分页。
- 项目台账：已覆盖搜索、版本、更新、凭证查看。
- 协同支持：已覆盖四类支持单和项目部署专属字段。
- 流程配置：已覆盖模板匹配、默认处理人、流转。
- 产品名称和使用类型：已覆盖配置和表单联动。
- 客户凭证：已覆盖加密、脱敏、申请、审批、reveal、审计。
- 文件上传：已覆盖上传、下载鉴权、删除。
- 用户角色：已覆盖菜单权限、角色权限更新。
- 工作台与统计：已覆盖待办、项目统计、人员统计、超时统计。
- 安全越权：已覆盖鉴权、菜单越权、数据越权、敏感信息泄露。
