# 可调主题与项目部署闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现可持久化主题主色设置，并完成王二、张三、李四参与的项目部署状态机和自动化验收。

**Architecture:** 后端以专用动作接口维护严格状态机和角色权限，迁移新增接收、完成、资产关联字段；前端用独立主题模块驱动 CSS 变量，用角色和状态决定详情操作。Playwright 依次登录三个账号，覆盖分配李四及张三自领两条路径。

**Tech Stack:** FastAPI、SQLAlchemy、Alembic、Pydantic、Vue 3、Pinia、TypeScript、Vitest、Playwright。

---

## 文件结构

- `backend/app/models.py`：部署流程字段、资产关联字段。
- `backend/app/schemas.py`：分配和部署结果请求模型。
- `backend/app/main.py`：状态机、权限检查和动作 API。
- `backend/app/seed.py`：王二、张三、李四及角色种子数据。
- `backend/alembic/versions/0003_deployment_workflow.py`：兼容现有数据库的增量迁移。
- `backend/tests/test_deployment_workflow.py`：后端流程、权限、事务和资产测试。
- `frontend/src/theme/theme.ts`：主题预设、颜色计算、持久化。
- `frontend/src/components/ThemePicker.vue`：主题设置面板。
- `frontend/src/layouts/MainLayout.vue`：调色板入口。
- `frontend/src/pages/SupportPage.vue`：部署动作和完成表单。
- `frontend/src/api/index.ts`、`frontend/src/api/types.ts`：动作 API 与类型。
- `frontend/src/theme/theme.test.ts`、`frontend/src/pages/SupportPage.test.ts`：前端单元测试。
- `frontend/e2e/deployment-lifecycle.spec.mjs`：跨账号完整验收。

### Task 1: 后端状态机测试

- [ ] 在 `backend/tests/test_deployment_workflow.py` 创建测试数据辅助函数，分别登录 `wanger`、`zhangsan`、`lisi`。
- [ ] 写失败测试：王二提交后只能处于 `待运维接收`，张三接收后变为 `待安排部署`。
- [ ] 写失败测试：张三分配李四后状态为 `部署中` 且负责人为李四。
- [ ] 写失败测试：李四缺少必填环境信息不能完成，完整提交后状态为 `已部署` 并生成资产。
- [ ] 写失败测试：张三接收后可自领并完成，实际部署人为张三。
- [ ] 写失败测试：王二越权、李四处理他人工单、重复接收和错误状态动作分别返回 `403` 或 `409`。
- [ ] 运行 `python -m pytest backend/tests/test_deployment_workflow.py -q`，确认测试因接口或字段缺失而失败。

### Task 2: 数据模型与迁移

- [ ] 在 `SupportTicket` 增加 `received_by_id`、`received_at`、`deployed_by_id`、`deployed_at` 及关系。
- [ ] 在 `ServerAsset` 增加可空 `ticket_id`、`customer_id`、`project_name`、`product_type_id`、`deployed_by_id`、`deployment_version`，并将旧 `project_id` 改为可空。
- [ ] 新建 `0003_deployment_workflow.py`，使用批量表变更兼容 SQLite，并创建必要索引。
- [ ] 为迁移测试增加从 `0002_ticket_products` 升级到 head、数据保留和 downgrade 验证。
- [ ] 运行迁移测试，确认通过。

### Task 3: 后端动作 API

- [ ] 在 `schemas.py` 定义 `TicketAssignment` 和 `DeploymentCompletion`，用 `Field(min_length=1)` 校验必填文本。
- [ ] 在 `main.py` 增加角色判断、状态判断、当前负责人判断辅助函数。
- [ ] 实现 `/receive`：仅张三所属运维 Leader 角色可接收 `待运维接收` 工单。
- [ ] 实现 `/assign`：仅运维 Leader 可将 `待安排部署` 或 `部署中` 工单分配给启用中的运维人员。
- [ ] 实现 `/self-assign`：运维 Leader 将本人设为负责人并进入 `部署中`。
- [ ] 实现 `/complete-deployment`：仅当前负责人可完成；事务内写资产、部署人、完成时间和 `已部署` 状态。
- [ ] 扩展 `ticket_read` 返回接收人、实际部署人和时间字段。
- [ ] 扩展用户列表按部门筛选。
- [ ] 运行后端新增测试及全量 `python -m pytest backend/tests -q`。

### Task 4: 测试账号与兼容

- [ ] 更新 `seed.py`，在新库创建王二、张三、李四和对应角色。
- [ ] 对已有数据库采用幂等补种：按用户名检查并创建缺失账号，不因已有用户直接退出。
- [ ] 保留原 `admin`、`ops`、`delivery` 等账号，避免破坏旧测试和人工使用。
- [ ] 增加测试确认重复启动不会创建重复账号。

### Task 5: 主题模块测试与实现

- [ ] 在 `frontend/src/theme/theme.test.ts` 写失败测试：四个预设存在、合法 HEX 可应用、非法 HEX 回退、保存和恢复默认。
- [ ] 创建 `theme.ts`，定义默认主题、预设、HEX 规范化、RGB 混色和 CSS 变量映射。
- [ ] 使用 `localStorage` 键 `ops-project-theme` 持久化 `{ preset, primary }`。
- [ ] 运行 `npm test -- theme/theme.test.ts`，确认通过。

### Task 6: 主题设置界面

- [ ] 创建 `ThemePicker.vue`，包含调色板图标按钮、四个色板、自定义颜色 input、HEX input 和恢复默认按钮。
- [ ] 在 `MainLayout.vue` 顶部操作区接入组件，并在应用加载时恢复主题。
- [ ] 把 `styles.css` 中固定蓝色交互值替换为主题 CSS 变量；背景和中性色保持稳定可读。
- [ ] 在桌面和移动端验证面板不遮挡业务按钮、文字不溢出。

### Task 7: 部署流程前端测试与实现

- [ ] 扩展 API 类型，增加接收、分配、自领、完成接口及部署环境字段。
- [ ] 在 `SupportPage.test.ts` 写失败测试：不同角色与状态显示正确按钮，非负责人无完成按钮，缺少必填项不能提交。
- [ ] 在 `SupportPage.vue` 加载运维用户，展示接收、自领、分配、重新分配和提交部署结果动作。
- [ ] 使用 `AppModal` 实现部署完成表单；环境、内网 IP、主机名、操作系统、用途、版本必填，外网 IP 和备注选填。
- [ ] `已部署` 详情展示实际部署人和环境资产摘要。
- [ ] 运行前端单测、类型检查和构建。

### Task 8: 跨账号 Playwright 验收

- [ ] 新建 `frontend/e2e/deployment-lifecycle.spec.mjs`。
- [ ] 主路径依次登录王二、张三、李四，验证提交、接收、分配、必填拦截、完成和资产记录。
- [ ] 分支路径登录王二与张三，验证张三自领并完成。
- [ ] 主题路径验证预设、自定义主色、刷新持久化和恢复默认。
- [ ] 收集 console error、page error、请求失败和非预期 HTTP 错误。
- [ ] 运行 `npm run test:e2e`，确认全部通过。

### Task 9: 集成回归

- [ ] 备份 `backend/dev.db` 并运行 `alembic upgrade head`。
- [ ] 重启前后端服务。
- [ ] 运行后端全量测试、前端单测、类型检查、构建和 Playwright。
- [ ] 用浏览器检查桌面与移动视口、主题面板和两条部署流程。
- [ ] 报告地址、测试账号、测试结果和任何剩余风险。

