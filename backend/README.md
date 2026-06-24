# 运维项目管理系统后端

FastAPI 后端服务，按 `docs/04-前后端分离开发文档.md` 的 V1 范围实现：

- 认证与菜单权限：`/api/auth/login`、`/api/auth/profile`、`/api/auth/menus`
- 客户信息：`/api/customers`
- 项目台账：`/api/projects`、版本、更新记录、项目统计
- 协同支持：`/api/support-tickets`，含项目部署扩展字段和默认流转
- 部署项目选项：`/api/deployment-project-options`，可选按 `customerId` 筛选
- 配置：产品名称、使用类型、流程模板
- 客户凭证：加密保存、列表脱敏、申请、审批、明文查看审计
- 用户与角色：基础列表和创建

## 启动

首次启动或代码升级后，必须先执行数据库迁移：

```powershell
$env:DATABASE_URL="sqlite:///./backend/dev.db"
& "C:\Users\EDY\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m alembic -c backend\alembic.ini upgrade head
& "C:\Users\EDY\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

默认账号：

| 用户名 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `admin123` | 系统管理员 |
| `ops` | `user123` | 运维管理员 |
| `delivery` | `user123` | 交付人员 |
| `wanger` | `user123` | 王二 / 交付人员 |
| `zhangsan` | `user123` | 张三 / 运维 Leader |
| `lisi` | `user123` | 李四 / 运维工程师 |

## 测试

```powershell
& "C:\Users\EDY\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m pytest backend\tests -q
```

测试使用 pytest `tmp_path` 下的独立 SQLite 文件，并通过 FastAPI dependency override 注入会话。测试不会删除、重建或写入 `backend/dev.db`。

## 数据库

开发默认使用 SQLite，方便直接运行。生产可通过 `DATABASE_URL` 切换到 PostgreSQL，例如：

```text
postgresql+psycopg://user:password@localhost:5432/ops_pm
```

生产和开发数据库升级均由 Alembic 管理，应用启动不再调用 `create_all()`。

### 全新数据库

```powershell
$env:DATABASE_URL="sqlite:///./backend/dev.db"
python -m alembic -c backend\alembic.ini upgrade head
```

### 现有未纳入 Alembic 的数据库

首次接管前必须备份数据库。现有数据库由旧版 `create_all()` 建立时：

```powershell
$env:DATABASE_URL="sqlite:///./backend/dev.db"
python -m alembic -c backend\alembic.ini stamp 0001_baseline
python -m alembic -c backend\alembic.ini upgrade head
```

`0002_ticket_products` 会检查表和索引是否已经存在，因此兼容已经由旧代码创建过 `support_ticket_products` 的数据库；同时会为历史“项目部署”支持单回填首产品关联。

`0003_deployment_workflow` 会按现有列和索引补缺，兼容已经由新版模型 `create_all()` 建出的数据库；历史服务器资产保留原 `project_id`，新部署资产允许直接关联部署工单而不要求先创建传统项目台账。

### 回滚

仅回滚多产品增量：

```powershell
python -m alembic -c backend\alembic.ini downgrade 0001_baseline
```

回滚会删除多产品关联表，因此执行前必须备份。完全删除业务结构可使用 `downgrade base`，仅适用于临时或可重建数据库。

### 部署多产品兼容策略

- `support_ticket_products` 关联表保存项目部署申请与产品的多对多关系及顺序。
- `support_tickets.product_type_id` 继续保存首个产品，兼容旧接口和旧数据。
- `0002_ticket_products` 迁移创建关联表、必要索引并回填历史首产品。
- 历史部署单如果没有关联行，读取时自动回退到 `product_type_id`。

### 索引

- `ix_support_tickets_type_customer_project`：覆盖部署项目查询和“支持类型 + 客户 + 项目名称”校验。
- `uq_ticket_product`：保证单张支持单内产品不重复，同时支持按 `ticket_id` 读取关联。
- `ix_support_ticket_products_product_type_id`：支持按产品反向查找关联工单。

## 项目部署与项目支持

字段语义：

- `customerId/customerName` 表示客户。
- `projectName` 表示项目部署申请中手工登记的项目名称，它是独立业务字段，不等于客户名称。
- 技术支持、项目需求、其他支持直接选择已有部署项目，客户由项目自动带出。
- 同一项目包含多个产品时，支持单必须再选择一个本次涉及的具体产品。
- 客户名称即使真实存在，只要没有作为项目部署的 `projectName` 登记，也不能提交为项目名称。

项目部署创建或更新：

```json
{
  "supportType": "项目部署",
  "customerId": 1,
  "projectName": "华东产业园人事平台",
  "productIds": [1, 2],
  "priority": "高",
  "env": "生产",
  "description": "部署申请"
}
```

非部署支持单只允许选择一个已部署产品：

```json
{
  "supportType": "技术支持",
  "customerId": 1,
  "projectName": "华东产业园人事平台",
  "productId": 2,
  "priority": "高",
  "env": "生产",
  "title": "接口访问异常",
  "description": "管理后台超时"
}
```

支持单产品响应同时提供新旧字段：

```json
{
  "productId": 1,
  "productTypeId": 1,
  "productName": "edhr",
  "productIds": [1, 2],
  "products": [
    {"id": 1, "name": "edhr"},
    {"id": 2, "name": "edhr MAX"}
  ]
}
```

查询全部可选项目、所属客户与已部署产品：

```http
GET /api/deployment-project-options
```

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "customerId": 1,
      "customerName": "华东产业园",
      "projectName": "华东产业园人事平台",
      "products": [
        {"id": 1, "name": "edhr"},
        {"id": 2, "name": "edhr MAX"}
      ]
    }
  ],
  "traceId": "req-example"
}
```

## 项目部署闭环

部署工单使用以下专用动作接口：

```http
POST /api/support-tickets/{id}/receive
POST /api/support-tickets/{id}/assign
POST /api/support-tickets/{id}/self-assign
POST /api/support-tickets/{id}/complete-deployment
```

- 张三接收后，状态由 `待运维接收` 变为 `待安排部署`。
- 张三可以自领，也可以用 `{"handlerId": 用户ID}` 分配给启用中的运维人员。
- 当前负责人提交完整环境信息后，状态变为 `已部署`。
- 多产品部署会为每个产品创建一条服务器资产，资产写入和工单完成在同一事务中。
- `GET /api/users?dept=运维部` 返回可供前端选择的运维用户。

完成部署请求示例：

```json
{
  "environment": "生产",
  "innerIp": "10.20.30.40",
  "outerIp": "203.0.113.40",
  "hostname": "prod-app-01",
  "os": "Rocky Linux 9",
  "purpose": "应用服务",
  "deploymentVersion": "v2.8.1",
  "remark": "部署完成"
}
```

资产台账提供只读分页查询：

```http
GET /api/assets?pageNo=1&pageSize=20
GET /api/assets?ticketId=123
```

响应包含部署工单号、客户、项目、产品、环境、IP、主机、操作系统、用途、版本、部署人和备注。
