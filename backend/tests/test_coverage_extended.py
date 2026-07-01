"""Extended API tests covering missing endpoints and edge cases."""
from fastapi.testclient import TestClient


def auth_headers(api: TestClient, username: str = "admin", password: str = "admin123"):
    response = api.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    token = response.json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def create_deployment(
    api: TestClient,
    *,
    project_name: str = "自动化测试项目",
    product_ids: list[int] | None = None,
) -> dict:
    """Helper: submit a deployment ticket so the project name is registered."""
    response = api.post(
        "/api/support-tickets",
        json={
            "supportType": "项目部署",
            "customerId": 1,
            "projectName": project_name,
            "productIds": product_ids or [1],
            "priority": "高",
            "env": "生产",
            "description": "测试部署申请",
        },
        headers=auth_headers(api, "delivery", "user123"),
    )
    assert response.status_code == 200
    return response.json()["data"]


# ─── Health ───────────────────────────────────────────────────────────────────


def test_health_endpoint(api: TestClient):
    response = api.get("/api/health")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "ok"


# ─── Logout ───────────────────────────────────────────────────────────────────


def test_logout_returns_ok(api: TestClient):
    headers = auth_headers(api)
    response = api.post("/api/auth/logout", headers=headers)
    assert response.status_code == 200
    assert response.json()["code"] == 0


# ─── Config / Product Types ───────────────────────────────────────────────────


def test_product_types_crud(api: TestClient):
    headers = auth_headers(api)

    response = api.get("/api/config/product-types", headers=headers)
    assert response.status_code == 200
    assert len(response.json()["data"]["list"]) >= 3  # edhr, edhr MAX, MedPro5

    created = api.post(
        "/api/config/product-types",
        json={"name": "新产品测试"},
        headers=headers,
    )
    assert created.status_code == 200
    assert created.json()["data"]["name"] == "新产品测试"
    assert created.json()["data"]["enabled"] is True


# ─── Config / Support Types ───────────────────────────────────────────────────


def test_support_types_list(api: TestClient):
    headers = auth_headers(api)
    response = api.get("/api/config/support-types", headers=headers)
    assert response.status_code == 200
    names = {item["name"] for item in response.json()["data"]["list"]}
    assert "项目部署" in names
    assert "技术支持" in names


def test_support_type_create(api: TestClient):
    headers = auth_headers(api)
    created = api.post(
        "/api/config/support-types",
        json={"name": "紧急支持", "workflowKey": "ops"},
        headers=headers,
    )
    assert created.status_code == 200
    assert created.json()["data"]["name"] == "紧急支持"
    assert created.json()["data"]["workflowKey"] == "ops"


# ─── Config / Workflows ───────────────────────────────────────────────────────


def test_workflows_list(api: TestClient):
    headers = auth_headers(api)
    response = api.get("/api/config/workflows", headers=headers)
    assert response.status_code == 200
    names = {item["name"] for item in response.json()["data"]["list"]}
    assert "交付 -> 运维" in names


def test_workflow_create(api: TestClient):
    headers = auth_headers(api)
    created = api.post(
        "/api/config/workflows",
        json={
            "name": "测试流程",
            "supportType": "技术支持",
            "departments": ["交付部", "运维部"],
            "defaultOpsHandlerId": 2,
        },
        headers=headers,
    )
    assert created.status_code == 200
    assert created.json()["data"]["name"] == "测试流程"


# ─── Customer CRUD ────────────────────────────────────────────────────────────


def test_customer_full_crud(api: TestClient):
    headers = auth_headers(api)

    # Create
    created = api.post(
        "/api/customers",
        json={"name": "CRUD测试客户", "salesName": "张销售", "note": "测试备注"},
        headers=headers,
    )
    assert created.status_code == 200
    customer_id = created.json()["data"]["id"]
    assert created.json()["data"]["name"] == "CRUD测试客户"

    # Read
    detail = api.get(f"/api/customers/{customer_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["data"]["name"] == "CRUD测试客户"
    assert detail.json()["data"]["salesName"] == "张销售"

    # Update
    updated = api.put(
        f"/api/customers/{customer_id}",
        json={"name": "CRUD测试客户已更新", "salesName": "李销售", "note": ""},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "CRUD测试客户已更新"
    assert updated.json()["data"]["salesName"] == "李销售"

    # Duplicate name
    dup = api.post(
        "/api/customers",
        json={"name": "CRUD测试客户已更新", "salesName": "", "note": ""},
        headers=headers,
    )
    assert dup.status_code == 409


# ─── Project Detail Endpoints ─────────────────────────────────────────────────


def test_project_detail_versions_updates_dashboard(api: TestClient):
    headers = auth_headers(api)

    # Create a project first
    project = api.post(
        "/api/projects",
        json={
            "customerId": 1,
            "productTypeId": 1,
            "platformVersion": "v3.0.0",
            "onlineStatus": "运维中",
            "projectManagerId": 5,
            "serviceVersions": [{"serviceName": "API", "version": "v3.0.0"}],
            "updateLogs": [{"version": "v3.0.0", "content": "初始版本"}],
        },
        headers=headers,
    )
    assert project.status_code == 200
    project_id = project.json()["data"]["id"]

    # Get project
    detail = api.get(f"/api/projects/{project_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["data"]["platformVersion"] == "v3.0.0"
    assert detail.json()["data"]["customerName"] == "华东产业园"

    # Get versions
    versions = api.get(f"/api/projects/{project_id}/versions", headers=headers)
    assert versions.status_code == 200
    assert len(versions.json()["data"]["list"]) == 1
    assert versions.json()["data"]["list"][0]["version"] == "v3.0.0"

    # Get updates
    updates = api.get(f"/api/projects/{project_id}/updates", headers=headers)
    assert updates.status_code == 200
    assert len(updates.json()["data"]["list"]) >= 1

    # Get dashboard
    dashboard = api.get(f"/api/projects/{project_id}/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["data"]["ticketTotal"] >= 0
    assert "byType" in dashboard.json()["data"]

    # 404 for non-existent project
    not_found = api.get("/api/projects/99999", headers=headers)
    assert not_found.status_code == 404

    not_found = api.get("/api/projects/99999/versions", headers=headers)
    assert not_found.status_code == 404

    not_found = api.get("/api/projects/99999/updates", headers=headers)
    assert not_found.status_code == 404

    not_found = api.get("/api/projects/99999/dashboard", headers=headers)
    assert not_found.status_code == 404


# ─── Support Ticket Logs ──────────────────────────────────────────────────────


def test_ticket_logs(api: TestClient):
    # First deploy the project name
    create_deployment(api, project_name="日志测试项目", product_ids=[1])

    delivery_headers = auth_headers(api, "delivery", "user123")
    created = api.post(
        "/api/support-tickets",
        json={
            "supportType": "技术支持",
            "customerId": 1,
            "projectName": "日志测试项目",
            "productTypeId": 1,
            "priority": "中",
            "env": "生产",
            "title": "日志测试工单",
            "description": "测试日志查询",
        },
        headers=delivery_headers,
    )
    assert created.status_code == 200
    ticket_id = created.json()["data"]["id"]

    # Get logs
    logs = api.get(f"/api/support-tickets/{ticket_id}/logs", headers=delivery_headers)
    assert logs.status_code == 200
    assert len(logs.json()["data"]["list"]) >= 1
    assert logs.json()["data"]["list"][0]["action"] == "created"

    # 404 for non-existent ticket
    not_found = api.get("/api/support-tickets/99999/logs", headers=delivery_headers)
    assert not_found.status_code == 404


# ─── Support Ticket Attachments ───────────────────────────────────────────────


def test_ticket_attachments_list(api: TestClient):
    # First deploy the project name
    create_deployment(api, project_name="附件测试项目", product_ids=[1])

    delivery_headers = auth_headers(api, "delivery", "user123")
    created = api.post(
        "/api/support-tickets",
        json={
            "supportType": "技术支持",
            "customerId": 1,
            "projectName": "附件测试项目",
            "productTypeId": 1,
            "title": "附件测试工单",
        },
        headers=delivery_headers,
    )
    assert created.status_code == 200
    ticket_id = created.json()["data"]["id"]

    # List attachments (empty)
    attachments = api.get(f"/api/support-tickets/{ticket_id}/attachments", headers=delivery_headers)
    assert attachments.status_code == 200
    assert attachments.json()["data"]["total"] == 0

    # 404 for non-existent ticket
    not_found = api.get("/api/support-tickets/99999/attachments", headers=delivery_headers)
    assert not_found.status_code == 404


# ─── Notifications ────────────────────────────────────────────────────────────


def test_notifications_flow(api: TestClient):
    headers = auth_headers(api)

    # List notifications
    listed = api.get("/api/notifications", headers=headers)
    assert listed.status_code == 200
    assert "list" in listed.json()["data"]

    # Unread count
    unread = api.get("/api/notifications/unread-count", headers=headers)
    assert unread.status_code == 200
    assert "count" in unread.json()["data"]

    # Mark all as read (idempotent)
    mark_all = api.put("/api/notifications/read-all", headers=headers)
    assert mark_all.status_code == 200

    # Verify unread count is 0
    unread_after = api.get("/api/notifications/unread-count", headers=headers)
    assert unread_after.json()["data"]["count"] == 0

    # Filter unread only
    unread_list = api.get("/api/notifications?unread=true", headers=headers)
    assert unread_list.status_code == 200
    assert unread_list.json()["data"]["total"] == 0


# ─── User Management ──────────────────────────────────────────────────────────


def test_list_users_requires_admin(api: TestClient):
    admin = auth_headers(api)
    delivery = auth_headers(api, "delivery", "user123")

    # Admin can list all users
    response = api.get("/api/users", headers=admin)
    assert response.status_code == 200
    usernames = {u["username"] for u in response.json()["data"]["list"]}
    assert "admin" in usernames
    assert "delivery" in usernames

    # Non-admin cannot list all users
    forbidden = api.get("/api/users", headers=delivery)
    assert forbidden.status_code == 403


def test_create_user_admin_only(api: TestClient):
    admin = auth_headers(api)
    delivery = auth_headers(api, "delivery", "user123")

    # Non-admin cannot create users
    forbidden = api.post(
        "/api/users",
        json={"username": "hacker", "name": "Hacker", "password": "test123", "dept": "系统", "roleId": 1},
        headers=delivery,
    )
    assert forbidden.status_code == 403

    # Admin can create user
    created = api.post(
        "/api/users",
        json={"username": "newuser", "name": "新用户", "password": "test123", "dept": "系统部", "roleId": 1},
        headers=admin,
    )
    assert created.status_code == 200
    assert created.json()["data"]["username"] == "newuser"
    assert created.json()["data"]["dept"] == "系统部"


def test_update_user(api: TestClient):
    admin = auth_headers(api)

    # Create a user to update
    created = api.post(
        "/api/users",
        json={"username": "updatable", "name": "可更新", "password": "user123", "dept": "系统部", "roleId": 1},
        headers=admin,
    )
    user_id = created.json()["data"]["id"]

    # Update user - all fields
    updated = api.put(
        f"/api/users/{user_id}",
        json={"name": "已更新", "dept": "运维部", "status": "disabled"},
        headers=admin,
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "已更新"
    assert updated.json()["data"]["dept"] == "运维部"

    # Update user - partial
    updated2 = api.put(
        f"/api/users/{user_id}",
        json={"name": "二次更新"},
        headers=admin,
    )
    assert updated2.status_code == 200
    assert updated2.json()["data"]["name"] == "二次更新"

    # 404 for non-existent user
    not_found = api.put("/api/users/99999", json={"name": "不存在"}, headers=admin)
    assert not_found.status_code == 404


# ─── Role Management ──────────────────────────────────────────────────────────


def test_role_management_admin_only(api: TestClient):
    admin = auth_headers(api)
    delivery = auth_headers(api, "delivery", "user123")

    # Non-admin cannot list roles
    assert api.get("/api/roles", headers=delivery).status_code == 403

    # Admin can list roles
    roles = api.get("/api/roles", headers=admin)
    assert roles.status_code == 200
    role_names = {r["name"] for r in roles.json()["data"]["list"]}
    assert "系统管理员" in role_names

    # Admin can create role
    created = api.post(
        "/api/roles",
        json={
            "name": "测试角色",
            "dataScope": "本人",
            "menus": ["dashboard", "projects"],
            "credentialPolicy": "申请查看",
        },
        headers=admin,
    )
    assert created.status_code == 200
    role_id = created.json()["data"]["id"]

    # Admin can update role
    updated = api.put(
        f"/api/roles/{role_id}",
        json={"name": "测试角色已更新", "menus": ["dashboard"]},
        headers=admin,
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "测试角色已更新"

    # Non-admin cannot create role
    assert api.post("/api/roles", json={"name": "非法角色"}, headers=delivery).status_code == 403

    # Non-admin cannot update role
    assert api.put(f"/api/roles/{role_id}", json={"name": "非法更新"}, headers=delivery).status_code == 403


# ─── Credential Apply / Approve ───────────────────────────────────────────────


def test_credential_apply_and_approve_flow(api: TestClient):
    headers = auth_headers(api)

    # Create a credential to test apply/approve
    created = api.post(
        "/api/credentials",
        json={
            "customerId": 1,
            "productTypeId": 1,
            "credentialName": "审批测试 SSH",
            "credentialType": "SSH",
            "account": "test_ops",
            "secret": "TestSecret@2026",
            "ownerId": 2,
            "rule": "运维管理员审批",
        },
        headers=headers,
    )
    assert created.status_code == 200
    credential_id = created.json()["data"]["id"]

    # Apply for credential
    delivery_headers = auth_headers(api, "delivery", "user123")
    apply = api.post(
        f"/api/credentials/{credential_id}/apply",
        json={"reason": "需要访问生产服务器"},
        headers=delivery_headers,
    )
    assert apply.status_code == 200
    assert apply.json()["data"]["status"] == "pending"

    # Approve credential
    approve = api.post(
        f"/api/credentials/{credential_id}/approve",
        json={"userId": 3, "approved": True},
        headers=headers,
    )
    assert approve.status_code == 200
    assert approve.json()["data"]["status"] == "approved"

    # Re-apply and reject
    apply2 = api.post(
        f"/api/credentials/{credential_id}/apply",
        json={"reason": "再次申请"},
        headers=delivery_headers,
    )
    assert apply2.status_code == 200

    reject = api.post(
        f"/api/credentials/{credential_id}/approve",
        json={"userId": 3, "approved": False},
        headers=headers,
    )
    assert reject.status_code == 200
    assert reject.json()["data"]["status"] == "rejected"

    # Reveal credential writes audit log
    reveal = api.post(
        f"/api/credentials/{credential_id}/reveal",
        json={"reason": "排查问题", "action": "view"},
        headers=headers,
    )
    assert reveal.status_code == 200
    assert reveal.json()["data"]["secret"] == "TestSecret@2026"

    # Check audit log
    audit = api.get("/api/credentials/audit", headers=headers)
    assert audit.status_code == 200
    audit_entries = audit.json()["data"]["list"]
    assert any(entry["credentialId"] == credential_id for entry in audit_entries)
    assert audit_entries[0]["reason"] == "排查问题"

    # 404 for non-existent credential
    not_found = api.get("/api/credentials/99999", headers=headers)
    assert not_found.status_code == 404


# ─── 404 Error Handling ───────────────────────────────────────────────────────


def test_404_on_non_existent_resources(api: TestClient):
    headers = auth_headers(api)

    endpoints = [
        ("GET", "/api/customers/99999"),
        ("GET", "/api/projects/99999"),
        ("GET", "/api/support-tickets/99999"),
        ("GET", "/api/credentials/99999"),
    ]
    for method, url in endpoints:
        if method == "GET":
            response = api.get(url, headers=headers)
        assert response.status_code == 404, f"{method} {url} should return 404"


# ─── 401 Unauthorized Access ──────────────────────────────────────────────────


def test_401_on_missing_token(api: TestClient):
    protected_endpoints = [
        ("GET", "/api/auth/profile"),
        ("GET", "/api/auth/menus"),
        ("GET", "/api/customers"),
        ("POST", "/api/customers"),
        ("GET", "/api/projects"),
        ("POST", "/api/projects"),
        ("GET", "/api/support-tickets"),
        ("POST", "/api/support-tickets"),
        ("GET", "/api/credentials"),
        ("POST", "/api/credentials"),
        ("GET", "/api/users"),
        ("POST", "/api/users"),
        ("GET", "/api/roles"),
        ("POST", "/api/roles"),
        ("GET", "/api/config/product-types"),
        ("GET", "/api/config/support-types"),
        ("GET", "/api/config/workflows"),
        ("GET", "/api/notifications"),
    ]
    for method, url in protected_endpoints:
        if method == "GET":
            response = api.get(url)
        elif method == "POST":
            response = api.post(url, json={})
        elif method == "PUT":
            response = api.put(url, json={})
        assert response.status_code == 401, f"{method} {url} should return 401, got {response.status_code}"


# ─── 422 Validation Errors ────────────────────────────────────────────────────


def test_422_on_invalid_input(api: TestClient):
    headers = auth_headers(api)

    # Empty project name
    response = api.post(
        "/api/support-tickets",
        json={
            "supportType": "项目部署",
            "customerId": 1,
            "projectName": "   ",
            "productIds": [1],
        },
        headers=auth_headers(api, "delivery", "user123"),
    )
    assert response.status_code == 422

    # Missing required field
    response = api.post(
        "/api/customers",
        json={},
        headers=headers,
    )
    assert response.status_code == 422

    # Invalid IP address in completion
    delivery_headers = auth_headers(api, "delivery", "user123")
    created = api.post(
        "/api/support-tickets",
        json={
            "supportType": "项目部署",
            "customerId": 1,
            "projectName": "422测试项目",
            "productIds": [1],
            "priority": "高",
            "env": "生产",
            "description": "测试422",
        },
        headers=delivery_headers,
    )
    assert created.status_code == 200
    ticket_id = created.json()["data"]["id"]

    # Receive and assign
    zhangsan = auth_headers(api, "zhangsan", "user123")
    api.post(f"/api/support-tickets/{ticket_id}/receive", headers=zhangsan)
    api.post(f"/api/support-tickets/{ticket_id}/self-assign", headers=zhangsan)

    # Invalid IP
    invalid = api.post(
        f"/api/support-tickets/{ticket_id}/complete-deployment",
        json={
            "environment": "生产",
            "innerIp": "not-an-ip",
            "hostname": "test-host",
            "os": "Linux",
            "purpose": "应用",
            "deploymentVersion": "v1",
        },
        headers=zhangsan,
    )
    assert invalid.status_code == 422, "Invalid IP should return 422"

    # Invalid page params
    invalid_page = api.get("/api/assets?pageNo=0", headers=headers)
    assert invalid_page.status_code == 422


# ─── Search & Filter ──────────────────────────────────────────────────────────


def test_customer_search(api: TestClient):
    headers = auth_headers(api)

    # Search with keyword
    result = api.get("/api/customers?keyword=华东", headers=headers)
    assert result.status_code == 200
    names = {item["name"] for item in result.json()["data"]["list"]}
    assert "华东产业园" in names

    # Search with no match
    empty = api.get("/api/customers?keyword=不存在的客户", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["data"]["total"] == 0


def test_project_search(api: TestClient):
    headers = auth_headers(api)
    result = api.get("/api/projects?keyword=edhr", headers=headers)
    assert result.status_code == 200
    # Should find at least the seed project with edhr


def test_support_ticket_filter_by_type(api: TestClient):
    headers = auth_headers(api)
    result = api.get("/api/support-tickets?supportType=项目部署", headers=headers)
    assert result.status_code == 200
    for ticket in result.json()["data"]["list"]:
        assert ticket["supportType"] == "项目部署"


# ─── Concurrent Access ────────────────────────────────────────────────────────


def test_concurrent_login(api: TestClient):
    """Verify that multiple concurrent login requests all succeed."""
    from concurrent.futures import ThreadPoolExecutor

    def login(index: int):
        response = api.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        assert response.status_code == 200
        return response.json()["data"]["accessToken"]

    with ThreadPoolExecutor(max_workers=4) as executor:
        tokens = list(executor.map(login, range(4)))

    # All 4 requests should succeed (tokens may be identical due to same-second timestamp)
    assert len(tokens) == 4

    # All tokens should be valid
    for token in tokens:
        response = api.get("/api/auth/profile", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["data"]["username"] == "admin"