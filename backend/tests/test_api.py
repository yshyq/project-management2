from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
from sqlalchemy import event

def auth_headers(api: TestClient, username: str = "admin", password: str = "admin123"):
    response = api.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    token = response.json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def create_deployment(
    api: TestClient,
    headers: dict[str, str],
    *,
    customer_id: int = 1,
    project_name: str = "生产项目",
    product_ids: list[int] | None = None,
):
    return api.post(
        "/api/support-tickets",
        json={
            "supportType": "项目部署",
            "customerId": customer_id,
            "projectName": project_name,
            "productIds": [1] if product_ids is None else product_ids,
            "priority": "高",
            "env": "生产",
            "description": "部署申请",
        },
        headers=headers,
    )


def test_login_returns_profile_and_menu_permissions(api: TestClient):
    headers = auth_headers(api)
    profile = api.get("/api/auth/profile", headers=headers)
    menus = api.get("/api/auth/menus", headers=headers)

    assert profile.json()["data"]["username"] == "admin"
    assert "系统管理员" in profile.json()["data"]["roles"]
    assert "projects" in menus.json()["data"]
    assert "credentials" in menus.json()["data"]


def test_collaborative_support_menus_are_available_to_every_user(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")
    profile = api.get("/api/auth/profile", headers=headers)
    menus = api.get("/api/auth/menus", headers=headers)
    support_menu_keys = {
        "customerInfo",
        "supportDeploy",
        "supportTech",
        "supportNeed",
        "supportOther",
    }

    assert profile.status_code == 200
    assert menus.status_code == 200
    assert support_menu_keys <= set(profile.json()["data"]["menus"])
    assert support_menu_keys <= set(menus.json()["data"])


def test_customer_and_project_can_be_created_and_listed(api: TestClient):
    headers = auth_headers(api)

    customer = api.post(
        "/api/customers",
        json={"name": "华南医疗集团", "salesName": "张销售", "note": "生产环境客户"},
        headers=headers,
    )
    assert customer.status_code == 200
    customer_id = customer.json()["data"]["id"]

    project = api.post(
        "/api/projects",
        json={
            "customerId": customer_id,
            "productTypeId": 1,
            "platformVersion": "edhr v2.8.1",
            "onlineStatus": "运维中",
            "projectManagerId": 5,
            "serviceVersions": [{"serviceName": "API", "version": "v2.8.1"}],
            "updateLogs": [{"version": "v2.8.1", "content": "修复组织同步异常"}],
        },
        headers=headers,
    )

    assert project.status_code == 200
    project_id = project.json()["data"]["id"]
    projects = api.get("/api/projects?keyword=华南", headers=headers).json()["data"]["list"]
    assert projects[0]["id"] == project_id
    assert projects[0]["customerName"] == "华南医疗集团"
    assert projects[0]["productName"] == "edhr"


def test_support_ticket_creation_sets_default_workflow_status_and_handler(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")

    response = api.post(
        "/api/support-tickets",
        json={
            "supportType": "项目部署",
            "customerId": 1,
            "projectName": "华东产业园生产部署",
            "productTypeId": 1,
            "priority": "高",
            "env": "生产",
            "description": "部署 v2.8.1 版本",
            "remoteMethod": "堡垒机 / SSH",
            "remoteInfo": "需要预约窗口",
            "serverInfo": "10.24.6.18:22 / Ubuntu / /opt/app",
            "authorizationText": "授权人：王总；有效期：2026-12-31",
        },
        headers=headers,
    )

    assert response.status_code == 200
    ticket = response.json()["data"]
    assert ticket["title"] == "华东产业园生产部署部署申请"
    assert ticket["status"] == "待运维接收"
    assert ticket["currentHandlerName"] == "陈运维"
    assert ticket["deploymentExtra"]["remoteMethod"] == "堡垒机 / SSH"


def test_support_ticket_list_supports_pagination(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")
    for index in range(3):
        assert create_deployment(
            api,
            headers,
            project_name=f"分页项目{index}",
            product_ids=[1],
        ).status_code == 200

    response = api.get(
        "/api/support-tickets?supportType=项目部署&keyword=分页项目&pageNo=2&pageSize=1",
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["page"] == 2
    assert data["pageSize"] == 1
    assert data["total"] == 3
    assert [item["projectName"] for item in data["list"]] == ["分页项目1"]


def test_support_ticket_list_filters_to_related_tickets_unless_role_has_all_support_scope(api: TestClient):
    wanger_headers = auth_headers(api, "wanger", "user123")
    delivery_headers = auth_headers(api, "delivery", "user123")
    admin_headers = auth_headers(api)
    ops_headers = auth_headers(api, "ops", "user123")

    assert create_deployment(
        api,
        wanger_headers,
        project_name="权限范围-王二相关",
        product_ids=[1],
    ).status_code == 200
    assert create_deployment(
        api,
        delivery_headers,
        project_name="权限范围-李交付相关",
        product_ids=[1],
    ).status_code == 200

    wanger_page = api.get(
        "/api/support-tickets?supportType=项目部署&keyword=权限范围&pageNo=1&pageSize=20",
        headers=wanger_headers,
    )
    admin_page = api.get(
        "/api/support-tickets?supportType=项目部署&keyword=权限范围&pageNo=1&pageSize=20",
        headers=admin_headers,
    )
    ops_page = api.get(
        "/api/support-tickets?supportType=项目部署&keyword=权限范围&pageNo=1&pageSize=20",
        headers=ops_headers,
    )

    assert wanger_page.status_code == 200
    assert wanger_page.json()["data"]["total"] == 1
    assert [item["projectName"] for item in wanger_page.json()["data"]["list"]] == ["权限范围-王二相关"]
    assert admin_page.json()["data"]["total"] == 2
    assert ops_page.json()["data"]["total"] == 2


def test_support_ticket_detail_requires_related_ticket_or_all_support_scope(api: TestClient):
    wanger_headers = auth_headers(api, "wanger", "user123")
    delivery_headers = auth_headers(api, "delivery", "user123")
    admin_headers = auth_headers(api)
    own_ticket = create_deployment(
        api,
        wanger_headers,
        project_name="详情权限-王二相关",
        product_ids=[1],
    ).json()["data"]
    other_ticket = create_deployment(
        api,
        delivery_headers,
        project_name="详情权限-李交付相关",
        product_ids=[1],
    ).json()["data"]

    own_detail = api.get(f"/api/support-tickets/{own_ticket['id']}", headers=wanger_headers)
    unrelated_detail = api.get(f"/api/support-tickets/{other_ticket['id']}", headers=wanger_headers)
    admin_detail = api.get(f"/api/support-tickets/{other_ticket['id']}", headers=admin_headers)

    assert own_detail.status_code == 200
    assert unrelated_detail.status_code == 403
    assert unrelated_detail.json()["detail"] == "仅可查看与自己相关的支持单"
    assert admin_detail.status_code == 200


def test_system_admin_can_run_deployment_workflow_actions(api: TestClient):
    wanger_headers = auth_headers(api, "wanger", "user123")
    admin_headers = auth_headers(api)
    ticket = create_deployment(
        api,
        wanger_headers,
        project_name="超级管理员部署权限",
        product_ids=[1],
    ).json()["data"]

    received = api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=admin_headers)
    self_assigned = api.post(f"/api/support-tickets/{ticket['id']}/self-assign", headers=admin_headers)
    completed = api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json={
            "environment": "生产",
            "innerIp": "10.20.30.50",
            "outerIp": "",
            "hostname": "admin-complete-01",
            "os": "Rocky Linux 9",
            "purpose": "应用服务",
            "deploymentVersion": "v2.8.1",
            "remark": "系统管理员完成部署",
        },
        headers=admin_headers,
    )

    assert received.status_code == 200
    assert self_assigned.status_code == 200
    assert completed.status_code == 200
    assert completed.json()["data"]["status"] == "已部署"


def test_deployment_can_create_and_update_multiple_products(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")

    created = create_deployment(
        api,
        headers,
        project_name="华东产业园人事平台",
        product_ids=[1, 2],
    )

    assert created.status_code == 200
    ticket = created.json()["data"]
    assert ticket["projectName"] == "华东产业园人事平台"
    assert ticket["productIds"] == [1, 2]
    assert ticket["products"] == [
        {"id": 1, "name": "edhr"},
        {"id": 2, "name": "edhr MAX"},
    ]
    assert ticket["productTypeId"] == 1
    assert ticket["productName"] == "edhr"

    updated = api.put(
        f"/api/support-tickets/{ticket['id']}",
        json={
            "supportType": "项目部署",
            "customerId": 1,
            "projectName": "华东产业园人事平台",
            "productIds": [2, 3],
            "priority": "紧急",
            "env": "生产",
            "description": "调整部署产品",
        },
        headers=headers,
    )

    assert updated.status_code == 409
    detail = api.get(f"/api/support-tickets/{ticket['id']}", headers=headers)
    assert detail.json()["data"]["products"] == [
        {"id": 1, "name": "edhr"},
        {"id": 2, "name": "edhr MAX"},
    ]


def test_deployment_rejects_empty_product_ids(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")

    response = create_deployment(api, headers, product_ids=[])

    assert response.status_code == 422
    assert "项目部署至少选择一个产品" in response.text


def test_deployment_rejects_unknown_product_id(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")

    response = create_deployment(api, headers, product_ids=[1, 999])

    assert response.status_code == 400
    assert response.json()["detail"] == "产品不存在: 999"


def test_deployment_deduplicates_products_and_normalizes_project_name(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")

    response = create_deployment(
        api,
        headers,
        project_name="  项目 A  ",
        product_ids=[2, 1, 2, 1],
    )

    assert response.status_code == 200
    assert response.json()["data"]["projectName"] == "项目 A"
    assert response.json()["data"]["productIds"] == [2, 1]
    options = api.get("/api/deployment-project-options?customerId=1", headers=headers)
    assert options.json()["data"] == [
        {
            "customerId": 1,
            "customerName": "华东产业园",
            "projectName": "项目 A",
            "products": [
                {"id": 1, "name": "edhr"},
                {"id": 2, "name": "edhr MAX"},
            ],
        }
    ]


def test_failed_deployment_update_rolls_back_existing_products(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")
    created = create_deployment(api, headers, project_name="事务项目", product_ids=[1, 2]).json()["data"]

    failed = api.put(
        f"/api/support-tickets/{created['id']}",
        json={
            "supportType": "项目部署",
            "customerId": 1,
            "projectName": "事务项目",
            "productIds": [2, 999],
        },
        headers=headers,
    )

    assert failed.status_code == 409
    detail = api.get(f"/api/support-tickets/{created['id']}", headers=headers)
    assert detail.json()["data"]["productIds"] == [1, 2]


def test_repeated_and_concurrent_deployments_get_unique_ticket_numbers(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")

    def submit(index: int):
        return create_deployment(
            api,
            headers,
            project_name="并发项目",
            product_ids=[1 + index % 3],
        )

    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(submit, range(4)))

    assert [response.status_code for response in responses] == [200, 200, 200, 200]
    ticket_numbers = [response.json()["data"]["ticketNo"] for response in responses]
    assert len(set(ticket_numbers)) == 4


def test_deployment_project_options_are_customer_scoped_and_aggregate_products(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")

    assert create_deployment(api, headers, project_name="项目A", product_ids=[1, 2]).status_code == 200
    assert create_deployment(api, headers, project_name="项目A", product_ids=[2, 3]).status_code == 200
    assert create_deployment(api, headers, project_name="项目B", product_ids=[2]).status_code == 200
    assert create_deployment(api, headers, customer_id=2, project_name="项目A", product_ids=[3]).status_code == 200

    response = api.get("/api/deployment-project-options?customerId=1", headers=headers)

    assert response.status_code == 200
    assert response.json()["data"] == [
        {
            "customerId": 1,
            "customerName": "华东产业园",
            "projectName": "项目A",
            "products": [
                {"id": 1, "name": "edhr"},
                {"id": 2, "name": "edhr MAX"},
                {"id": 3, "name": "MedPro5"},
            ],
        },
        {
            "customerId": 1,
            "customerName": "华东产业园",
            "projectName": "项目B",
            "products": [{"id": 2, "name": "edhr MAX"}],
        },
    ]


def test_deployment_project_options_can_list_all_projects_with_customer_identity(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")
    assert create_deployment(api, headers, customer_id=1, project_name="项目A", product_ids=[1, 2]).status_code == 200
    assert create_deployment(api, headers, customer_id=2, project_name="项目A", product_ids=[3]).status_code == 200

    response = api.get("/api/deployment-project-options", headers=headers)

    assert response.status_code == 200
    assert response.json()["data"] == [
        {
            "customerId": 1,
            "customerName": "华东产业园",
            "projectName": "项目A",
            "products": [
                {"id": 1, "name": "edhr"},
                {"id": 2, "name": "edhr MAX"},
            ],
        },
        {
            "customerId": 2,
            "customerName": "城投集团",
            "projectName": "项目A",
            "products": [{"id": 3, "name": "MedPro5"}],
        },
    ]


def test_customer_name_is_not_used_as_deployment_project_name(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")
    deployment_project_name = "智慧人事生产平台"
    customer_name = "华东产业园"

    created = create_deployment(
        api,
        headers,
        customer_id=1,
        project_name=deployment_project_name,
        product_ids=[1],
    )
    assert created.status_code == 200

    options = api.get("/api/deployment-project-options?customerId=1", headers=headers)
    assert options.json()["data"] == [
        {
            "customerId": 1,
            "customerName": customer_name,
            "projectName": deployment_project_name,
            "products": [{"id": 1, "name": "edhr"}],
        }
    ]
    assert all(item["projectName"] != customer_name for item in options.json()["data"])

    invalid = api.post(
        "/api/support-tickets",
        json={
            "supportType": "技术支持",
            "customerId": 1,
            "projectName": customer_name,
            "productId": 1,
            "title": "错误使用客户名称",
        },
        headers=headers,
    )
    assert invalid.status_code == 400
    assert invalid.json()["detail"] == "项目名称不存在，必须先提交项目部署申请"

    valid = api.post(
        "/api/support-tickets",
        json={
            "supportType": "技术支持",
            "customerId": 1,
            "projectName": deployment_project_name,
            "productId": 1,
            "title": "正确使用部署项目名称",
        },
        headers=headers,
    )
    assert valid.status_code == 200
    assert valid.json()["data"]["customerName"] == customer_name
    assert valid.json()["data"]["projectName"] == deployment_project_name


def test_deployment_project_options_has_bounded_query_count(api: TestClient, test_engine):
    headers = auth_headers(api, "delivery", "user123")
    for index in range(6):
        assert create_deployment(
            api,
            headers,
            project_name=f"项目{index}",
            product_ids=[1, 2, 3],
        ).status_code == 200

    select_count = 0

    def count_selects(_conn, _cursor, statement, _parameters, _context, _executemany):
        nonlocal select_count
        if statement.lstrip().upper().startswith("SELECT"):
            select_count += 1

    event.listen(test_engine, "before_cursor_execute", count_selects)
    try:
        response = api.get("/api/deployment-project-options?customerId=1", headers=headers)
    finally:
        event.remove(test_engine, "before_cursor_execute", count_selects)

    assert response.status_code == 200
    assert select_count <= 4


def test_non_deployment_support_accepts_deployed_project_and_product(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")
    assert create_deployment(api, headers, project_name="项目A", product_ids=[1, 2]).status_code == 200

    response = api.post(
        "/api/support-tickets",
        json={
            "supportType": "技术支持",
            "customerId": 1,
            "projectName": "项目A",
            "productId": 2,
            "priority": "高",
            "env": "生产",
            "title": "接口访问异常",
            "description": "管理后台超时",
        },
        headers=headers,
    )

    assert response.status_code == 200
    ticket = response.json()["data"]
    assert ticket["productId"] == 2
    assert ticket["productTypeId"] == 2
    assert ticket["products"] == [{"id": 2, "name": "edhr MAX"}]


def test_non_deployment_support_requires_customer_even_when_project_name_is_unique(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")
    assert create_deployment(api, headers, customer_id=2, project_name="唯一项目", product_ids=[2]).status_code == 200

    response = api.post(
        "/api/support-tickets",
        json={
            "supportType": "技术支持",
            "projectName": "唯一项目",
            "productId": 2,
            "title": "自动带出客户",
        },
        headers=headers,
    )

    assert response.status_code == 422
    assert "customerId" in response.text


def test_non_deployment_support_requires_customer_for_duplicate_project_name(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")
    assert create_deployment(api, headers, customer_id=1, project_name="同名项目", product_ids=[1]).status_code == 200
    assert create_deployment(api, headers, customer_id=2, project_name="同名项目", product_ids=[2]).status_code == 200

    response = api.post(
        "/api/support-tickets",
        json={
            "supportType": "其他支持",
            "projectName": "同名项目",
            "productId": 1,
            "title": "缺少客户消歧",
        },
        headers=headers,
    )

    assert response.status_code == 422
    assert "customerId" in response.text


def test_non_deployment_support_rejects_unknown_cross_customer_and_undeployed_product(api: TestClient):
    headers = auth_headers(api, "delivery", "user123")
    assert create_deployment(api, headers, customer_id=1, project_name="客户一项目", product_ids=[1]).status_code == 200
    assert create_deployment(api, headers, customer_id=2, project_name="客户二项目", product_ids=[2]).status_code == 200

    def submit(customer_id: int, project_name: str, product_id: int):
        return api.post(
            "/api/support-tickets",
            json={
                "supportType": "项目需求",
                "customerId": customer_id,
                "projectName": project_name,
                "productId": product_id,
                "priority": "中",
                "env": "生产",
                "title": "新增报表字段",
                "description": "需求说明",
            },
            headers=headers,
        )

    unknown = submit(1, "伪造项目", 1)
    cross_customer = submit(1, "客户二项目", 2)
    undeployed_product = submit(1, "客户一项目", 3)

    assert unknown.status_code == 400
    assert unknown.json()["detail"] == "项目名称不存在，必须先提交项目部署申请"
    assert cross_customer.status_code == 400
    assert cross_customer.json()["detail"] == "所选项目属于其他客户"
    assert undeployed_product.status_code == 400
    assert undeployed_product.json()["detail"] == "所选产品未在该项目的部署申请中登记"


def test_credential_list_masks_secret_and_reveal_writes_audit_log(api: TestClient):
    headers = auth_headers(api)

    created = api.post(
        "/api/credentials",
        json={
            "customerId": 1,
            "productTypeId": 1,
            "credentialName": "生产 SSH",
            "credentialType": "SSH",
            "account": "ops_admin",
            "secret": "Srv@park-2026",
            "ownerId": 2,
            "rule": "运维管理员审批",
        },
        headers=headers,
    ).json()["data"]

    listed = api.get("/api/credentials", headers=headers).json()["data"]["list"]
    assert next(item for item in listed if item["id"] == created["id"])["secretMask"] == "Sr*********26"

    revealed = api.post(
        f"/api/credentials/{created['id']}/reveal",
        json={"reason": "排查生产部署", "action": "view"},
        headers=headers,
    )
    assert revealed.json()["data"]["secret"] == "Srv@park-2026"

    audits = api.get("/api/credentials/audit", headers=headers).json()["data"]["list"]
    assert audits[0]["credentialId"] == created["id"]
    assert audits[0]["reason"] == "排查生产部署"
