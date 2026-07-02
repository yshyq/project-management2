import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session

from backend.app import models
from backend.app.seed import seed
from backend.app.security import hash_password, verify_password


def auth_headers(api: TestClient, username: str, password: str = "user123") -> dict[str, str]:
    response = api.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['data']['accessToken']}"}


def create_deployment(
    api: TestClient,
    *,
    project_name: str = "自动化测试交付项目",
    product_ids: list[int] | None = None,
) -> dict:
    response = api.post(
        "/api/support-tickets",
        json={
            "supportType": "项目部署",
            "customerId": 1,
            "projectName": project_name,
            "productIds": product_ids or [1, 2],
            "priority": "高",
            "env": "生产",
            "description": "王二提交部署申请",
        },
        headers=auth_headers(api, "wanger"),
    )
    assert response.status_code == 200
    return response.json()["data"]


def completion_payload(**overrides) -> dict:
    payload = {
        "environment": "生产",
        "innerIp": "10.20.30.40",
        "outerIp": "203.0.113.40",
        "hostname": "prod-app-01",
        "os": "Rocky Linux 9",
        "purpose": "应用服务",
        "deploymentVersion": "v2.8.1",
        "remark": "自动化部署完成",
    }
    payload.update(overrides)
    return payload


def multi_server_completion_payload() -> dict:
    return {
        "servers": [
            completion_payload(hostname="prod-app-01", innerIp="10.20.30.40", purpose="应用服务"),
            completion_payload(hostname="prod-worker-01", innerIp="10.20.30.41", purpose="任务服务"),
        ]
    }


def test_seed_idempotently_adds_workflow_accounts(test_engine):
    with Session(test_engine) as db:
        models.Base.metadata.create_all(bind=test_engine)
        seed(db)
        wrong_role = db.scalar(select(models.Role).where(models.Role.name == "系统管理员"))
        wanger = db.scalar(select(models.User).where(models.User.username == "wanger"))
        wanger.name = "错误姓名"
        wanger.dept = "错误部门"
        wanger.role_id = wrong_role.id
        wanger.status = "disabled"
        wanger.password_hash = hash_password("wrong-password")
        db.commit()
        seed(db)

        users = db.scalars(
            select(models.User).where(models.User.username.in_(["wanger", "zhangsan", "lisi"]))
        ).all()
        role_names = {user.username: user.role.name for user in users}

    assert sorted(user.username for user in users) == ["lisi", "wanger", "zhangsan"]
    assert {user.username: user.name for user in users} == {
        "wanger": "王二",
        "zhangsan": "张三",
        "lisi": "李四",
    }
    assert {user.username: user.dept for user in users} == {
        "wanger": "交付部",
        "zhangsan": "运维部",
        "lisi": "运维部",
    }
    assert role_names == {
        "wanger": "交付人员",
        "zhangsan": "运维 Leader",
        "lisi": "运维工程师",
    }
    assert all(user.status == "enabled" for user in users)
    assert all(verify_password("user123", user.password_hash) for user in users)


def test_zhangsan_receives_assigns_lisi_and_lisi_completes_multi_product_deployment(api: TestClient):
    ticket = create_deployment(api)
    assert ticket["status"] == "待运维接收"
    assert ticket["requesterName"] == "王二"

    zhangsan = auth_headers(api, "zhangsan")
    received = api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan)
    assert received.status_code == 200
    assert received.json()["data"]["status"] == "待安排部署"
    assert received.json()["data"]["receivedByName"] == "张三"
    assert received.json()["data"]["receivedAt"]

    users = api.get("/api/users?dept=运维部", headers=zhangsan)
    assert users.status_code == 200
    ops_users = users.json()["data"]["list"]
    assert {user["username"] for user in ops_users} >= {"zhangsan", "lisi"}
    lisi_id = next(user["id"] for user in ops_users if user["username"] == "lisi")

    assigned = api.post(
        f"/api/support-tickets/{ticket['id']}/assign",
        json={"handlerId": lisi_id},
        headers=zhangsan,
    )
    assert assigned.status_code == 200
    assert assigned.json()["data"]["status"] == "部署中"
    assert assigned.json()["data"]["currentHandlerName"] == "李四"

    lisi = auth_headers(api, "lisi")
    invalid = api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json=completion_payload(hostname=""),
        headers=lisi,
    )
    assert invalid.status_code == 422

    completed = api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json=completion_payload(),
        headers=lisi,
    )
    assert completed.status_code == 200
    completed_ticket = completed.json()["data"]
    assert completed_ticket["status"] == "已部署"
    assert completed_ticket["deployedByName"] == "李四"
    assert completed_ticket["deployedAt"]

    assets = api.get(f"/api/assets?ticketId={ticket['id']}", headers=lisi)
    assert assets.status_code == 200
    asset_page = assets.json()["data"]
    assert asset_page["total"] == 2
    assert {asset["productName"] for asset in asset_page["list"]} == {"edhr", "edhr MAX"}
    for asset in asset_page["list"]:
        assert asset["ticketId"] == ticket["id"]
        assert asset["ticketNo"] == ticket["ticketNo"]
        assert asset["customerName"] == "华东产业园"
        assert asset["projectName"] == "自动化测试交付项目"
        assert asset["environment"] == "生产"
        assert asset["innerIp"] == "10.20.30.40"
        assert asset["outerIp"] == "203.0.113.40"
        assert asset["hostname"] == "prod-app-01"
        assert asset["os"] == "Rocky Linux 9"
        assert asset["purpose"] == "应用服务"
        assert asset["deploymentVersion"] == "v2.8.1"
        assert asset["deployedByName"] == "李四"
        assert asset["remark"] == "自动化部署完成"


def test_zhangsan_can_self_assign_and_complete(api: TestClient):
    ticket = create_deployment(api, project_name="张三自领项目", product_ids=[3])
    zhangsan = auth_headers(api, "zhangsan")

    assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan).status_code == 200
    self_assigned = api.post(f"/api/support-tickets/{ticket['id']}/self-assign", headers=zhangsan)

    assert self_assigned.status_code == 200
    assert self_assigned.json()["data"]["status"] == "部署中"
    assert self_assigned.json()["data"]["currentHandlerName"] == "张三"

    completed = api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json=completion_payload(hostname="ops-leader-01"),
        headers=zhangsan,
    )
    assert completed.status_code == 200
    assert completed.json()["data"]["deployedByName"] == "张三"


def test_completion_accepts_multiple_servers_and_creates_assets_per_product_and_server(api: TestClient):
    ticket = create_deployment(api, project_name="多服务器部署项目", product_ids=[1, 2])
    zhangsan = auth_headers(api, "zhangsan")

    assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan).status_code == 200
    assert api.post(f"/api/support-tickets/{ticket['id']}/self-assign", headers=zhangsan).status_code == 200

    completed = api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json=multi_server_completion_payload(),
        headers=zhangsan,
    )
    assert completed.status_code == 200
    assert completed.json()["data"]["status"] == "已部署"

    assets = api.get(f"/api/assets?ticketId={ticket['id']}", headers=zhangsan)
    assert assets.status_code == 200
    asset_page = assets.json()["data"]
    assert asset_page["total"] == 4
    assert {
        (asset["productName"], asset["hostname"], asset["innerIp"], asset["purpose"])
        for asset in asset_page["list"]
    } == {
        ("edhr", "prod-app-01", "10.20.30.40", "应用服务"),
        ("edhr MAX", "prod-app-01", "10.20.30.40", "应用服务"),
        ("edhr", "prod-worker-01", "10.20.30.41", "任务服务"),
        ("edhr MAX", "prod-worker-01", "10.20.30.41", "任务服务"),
    }


def test_completion_validation_errors_are_chinese_and_identify_server_row(api: TestClient):
    ticket = create_deployment(api, project_name="中文校验项目", product_ids=[1])
    zhangsan = auth_headers(api, "zhangsan")

    assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan).status_code == 200
    assert api.post(f"/api/support-tickets/{ticket['id']}/self-assign", headers=zhangsan).status_code == 200

    invalid = api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json={"servers": [completion_payload(hostname="", innerIp="not-an-ip")]},
        headers=zhangsan,
    )
    assert invalid.status_code == 422
    assert invalid.json()["detail"] == "第1台服务器请填写主机名"


def test_deployment_actions_enforce_roles_ownership_and_state_order(api: TestClient):
    ticket = create_deployment(api, project_name="权限校验项目", product_ids=[1])
    wanger = auth_headers(api, "wanger")
    zhangsan = auth_headers(api, "zhangsan")
    lisi = auth_headers(api, "lisi")

    assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=wanger).status_code == 403
    assert api.post(f"/api/support-tickets/{ticket['id']}/self-assign", headers=zhangsan).status_code == 409
    assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan).status_code == 200
    assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan).status_code == 409

    users = api.get("/api/users?dept=运维部", headers=zhangsan).json()["data"]["list"]
    lisi_id = next(user["id"] for user in users if user["username"] == "lisi")
    assert api.post(
        f"/api/support-tickets/{ticket['id']}/assign",
        json={"handlerId": lisi_id},
        headers=zhangsan,
    ).status_code == 200

    assert api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json=completion_payload(),
        headers=wanger,
    ).status_code == 403
    assert api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json=completion_payload(),
        headers=zhangsan,
    ).status_code == 403
    assert api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json=completion_payload(),
        headers=lisi,
    ).status_code == 200
    assert api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json=completion_payload(),
        headers=lisi,
    ).status_code == 409


def test_assign_rejects_disabled_or_non_ops_users(api: TestClient, test_engine):
    ticket = create_deployment(api, project_name="无效分配目标", product_ids=[1])
    zhangsan = auth_headers(api, "zhangsan")
    assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan).status_code == 200

    wanger_profile = api.get("/api/auth/profile", headers=auth_headers(api, "wanger")).json()["data"]
    invalid = api.post(
        f"/api/support-tickets/{ticket['id']}/assign",
        json={"handlerId": wanger_profile["id"]},
        headers=zhangsan,
    )
    assert invalid.status_code == 400

    with Session(test_engine) as db:
        lisi = db.scalar(select(models.User).where(models.User.username == "lisi"))
        lisi.status = "disabled"
        lisi_id = lisi.id
        db.commit()

    disabled = api.post(
        f"/api/support-tickets/{ticket['id']}/assign",
        json={"handlerId": lisi_id},
        headers=zhangsan,
    )
    assert disabled.status_code == 400


def test_completion_rolls_back_ticket_when_asset_insert_fails(api: TestClient, test_engine):
    ticket = create_deployment(api, project_name="事务回滚项目", product_ids=[1])
    zhangsan = auth_headers(api, "zhangsan")
    assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan).status_code == 200
    assert api.post(f"/api/support-tickets/{ticket['id']}/self-assign", headers=zhangsan).status_code == 200

    def reject_asset_insert(*_):
        raise RuntimeError("asset insert failed")

    event.listen(models.ServerAsset, "before_insert", reject_asset_insert)
    try:
        with pytest.raises(RuntimeError, match="asset insert failed"):
            api.post(
                f"/api/support-tickets/{ticket['id']}/complete-deployment",
                json=completion_payload(),
                headers=zhangsan,
            )
    finally:
        event.remove(models.ServerAsset, "before_insert", reject_asset_insert)

    detail = api.get(f"/api/support-tickets/{ticket['id']}", headers=zhangsan)
    assert detail.json()["data"]["status"] == "部署中"
    assets = api.get(f"/api/assets?ticketId={ticket['id']}", headers=zhangsan)
    assert assets.json()["data"]["total"] == 0


def test_assets_support_pagination_and_ticket_filter(api: TestClient):
    zhangsan = auth_headers(api, "zhangsan")
    for index in range(2):
        ticket = create_deployment(api, project_name=f"资产分页项目{index}", product_ids=[1])
        assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan).status_code == 200
        assert api.post(f"/api/support-tickets/{ticket['id']}/self-assign", headers=zhangsan).status_code == 200
        assert api.post(
            f"/api/support-tickets/{ticket['id']}/complete-deployment",
            json=completion_payload(hostname=f"asset-{index}"),
            headers=zhangsan,
        ).status_code == 200

    first_page = api.get("/api/assets?pageNo=1&pageSize=1", headers=zhangsan)
    assert first_page.status_code == 200
    assert first_page.json()["data"]["page"] == 1
    assert first_page.json()["data"]["pageSize"] == 1
    assert first_page.json()["data"]["total"] == 2
    assert len(first_page.json()["data"]["list"]) == 1


def test_generic_ticket_mutations_cannot_bypass_deployment_state_machine(api: TestClient):
    ticket = create_deployment(api, project_name="禁止旁路项目", product_ids=[1])
    wanger = auth_headers(api, "wanger")
    payload = {
        "supportType": "项目部署",
        "customerId": 1,
        "projectName": "禁止旁路项目",
        "productIds": [1],
        "priority": "高",
        "env": "生产",
        "description": "尝试通用修改",
    }

    assert api.put(f"/api/support-tickets/{ticket['id']}", json=payload, headers=wanger).status_code == 409
    assert api.post(
        f"/api/support-tickets/{ticket['id']}/handle",
        json={"nextStatus": "已部署"},
        headers=wanger,
    ).status_code == 409
    assert api.post(
        f"/api/support-tickets/{ticket['id']}/transfer",
        json={"handlerId": ticket["requesterId"], "nextStatus": "部署中"},
        headers=wanger,
    ).status_code == 409
    assert api.post(f"/api/support-tickets/{ticket['id']}/close", headers=wanger).status_code == 409

    zhangsan = auth_headers(api, "zhangsan")
    assert api.post(f"/api/support-tickets/{ticket['id']}/receive", headers=zhangsan).status_code == 200
    assert api.post(f"/api/support-tickets/{ticket['id']}/self-assign", headers=zhangsan).status_code == 200
    assert api.post(
        f"/api/support-tickets/{ticket['id']}/complete-deployment",
        json=completion_payload(),
        headers=zhangsan,
    ).status_code == 200

    assert api.put(f"/api/support-tickets/{ticket['id']}", json=payload, headers=zhangsan).status_code == 409
    assert api.post(
        f"/api/support-tickets/{ticket['id']}/handle",
        json={"nextStatus": "待交付确认"},
        headers=zhangsan,
    ).status_code == 409
    assert api.post(
        f"/api/support-tickets/{ticket['id']}/transfer",
        json={"handlerId": ticket["requesterId"]},
        headers=zhangsan,
    ).status_code == 409
    assert api.post(f"/api/support-tickets/{ticket['id']}/close", headers=zhangsan).status_code == 409


def test_user_and_role_management_is_admin_only_and_ops_listing_is_enabled_only(
    api: TestClient,
    test_engine,
):
    wanger = auth_headers(api, "wanger")
    zhangsan = auth_headers(api, "zhangsan")
    admin = auth_headers(api, "admin", "admin123")

    roles = api.get("/api/roles", headers=admin)
    assert roles.status_code == 200
    leader_role_id = next(item["id"] for item in roles.json()["data"]["list"] if item["name"] == "运维 Leader")

    assert api.get("/api/roles", headers=wanger).status_code == 403
    assert api.post(
        "/api/users",
        json={
            "username": "attacker",
            "name": "越权账号",
            "password": "user123",
            "dept": "运维部",
            "roleId": leader_role_id,
        },
        headers=wanger,
    ).status_code == 403
    assert api.post(
        "/api/roles",
        json={"name": "伪造 Leader", "menus": []},
        headers=wanger,
    ).status_code == 403
    assert api.get("/api/users", headers=wanger).status_code == 403
    assert api.get("/api/users?dept=交付部", headers=zhangsan).status_code == 403

    with Session(test_engine) as db:
        lisi = db.scalar(select(models.User).where(models.User.username == "lisi"))
        lisi.status = "disabled"
        db.commit()

    ops_users = api.get("/api/users?dept=运维部", headers=zhangsan)
    assert ops_users.status_code == 200
    assert "lisi" not in {item["username"] for item in ops_users.json()["data"]["list"]}


def test_server_assets_allow_multiple_servers_for_same_ticket_product(test_engine):
    models.Base.metadata.create_all(bind=test_engine)
    with Session(test_engine) as db:
        seed(db)
        ticket = models.SupportTicket(
            ticket_no="SUP-UNIQUE-1",
            support_type="项目部署",
            project_name="唯一约束项目",
            customer_id=1,
            product_type_id=1,
            title="部署申请",
            requester_id=1,
        )
        db.add(ticket)
        db.commit()
        asset_data = {
            "ticket_id": ticket.id,
            "product_type_id": 1,
            "environment": "生产",
            "inner_ip": "10.0.0.1",
            "hostname": "asset-01",
            "os": "Linux",
            "purpose": "应用",
            "deployment_version": "v1",
        }
        db.add(models.ServerAsset(**asset_data))
        db.commit()
        db.add(models.ServerAsset(**{**asset_data, "inner_ip": "10.0.0.2", "hostname": "asset-02"}))
        db.commit()

        assert db.scalar(
            select(func.count(models.ServerAsset.id)).where(models.ServerAsset.ticket_id == ticket.id)
        ) == 2
