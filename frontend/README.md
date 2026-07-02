# 运维项目管理系统前端

这是按 `docs/04-前后端分离开发文档.md` 创建的正式前端工程，不是根目录旧静态原型。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Fetch API 封装

## 启动

先启动后端：

```powershell
& "C:\Users\EDY\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001
```

再启动前端：

```powershell
cd frontend
npm.cmd install
npm.cmd exec vite -- --host 127.0.0.1 --port 5175
```

访问：

```text
http://127.0.0.1:5175
```

## 后端代理

开发服务通过 `vite.config.mjs` 把：

```text
/api -> http://127.0.0.1:8001
```

默认账号：

| 用户名 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `admin123` | 系统管理员 |
| `ops` | `user123` | 运维管理员 |
| `delivery` | `user123` | 交付人员 |

## 已对接接口

- 登录、当前用户、菜单权限
- 客户信息
- 项目台账、服务版本、更新记录
- 协同支持单创建、处理、关闭
- 项目部署接收、分配、自领、完成部署
- 运维资产只读台账
- 产品名称、使用类型、流程配置
- 客户凭证列表、申请、明文查看、审计日志
- 用户与角色列表

## 尚待后端补充

- 通用文件上传/下载接口仍未暴露，授权附件上传目前属于后续能力。
- 客户凭证 reveal 已写审计日志，但仍需补齐授权校验、审批角色校验和凭证列表数据范围过滤。

## 自动化测试

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```

`test:e2e` 使用 Playwright 自行启动隔离环境：

- 前端：`127.0.0.1:15175`
- 后端：`127.0.0.1:18001`
- 数据库：每次运行创建独立临时 SQLite 文件，结束后清理
- 端口已占用时直接失败，不会复用旧服务
- 总控脚本在测试通过、断言失败或收到终止信号时清理自己启动的进程树
- 失败截图、视频、trace 和请求/控制台证据写入 `test-results/`
- 前后端启动日志写入 `e2e-artifacts/service-logs/`
- HTML 报告写入 `playwright-report/`

首次运行需要安装 Chromium：

```powershell
npm.cmd run test:e2e:install
```

如默认 Python 不包含 FastAPI/uvicorn，可通过 `E2E_PYTHON` 指定解释器。

正式浏览器回归入口只有 `npm.cmd run test:e2e`。根目录 `scripts/chrome-*.js`
属于旧静态原型时期的临时 CDP 脚本，不再被正式前端工程调用。
