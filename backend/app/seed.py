from sqlalchemy.orm import Session

from . import models
from .database import SessionLocal
from .security import encrypt_secret, hash_password, mask_secret


def _csv(values: list[str]) -> str:
    return ",".join(values)


def _seed_initial_data(db: Session) -> None:
    if db.query(models.User).first():
        return

    admin_role = models.Role(
        name="系统管理员",
        data_scope="全部数据",
        menus=_csv(["dashboard", "projects", "customerInfo", "supportDeploy", "supportTech", "supportNeed", "supportOther", "assets", "flow", "projectNames", "supportTypes", "credentials", "users", "roles"]),
        credential_policy="可维护/审计",
    )
    ops_role = models.Role(
        name="运维管理员",
        data_scope="全部运维项目",
        menus=_csv(["dashboard", "projects", "customerInfo", "supportDeploy", "supportTech", "supportNeed", "supportOther", "assets", "flow", "credentials"]),
        credential_policy="审批查看",
    )
    delivery_role = models.Role(
        name="交付人员",
        data_scope="参与项目",
        menus=_csv(["dashboard", "projects", "customerInfo", "supportDeploy", "supportTech", "credentials"]),
        credential_policy="申请查看",
    )
    db.add_all([admin_role, ops_role, delivery_role])
    db.flush()

    users = [
        models.User(username="admin", name="管理员", password_hash=hash_password("admin123"), dept="系统", role_id=admin_role.id),
        models.User(username="ops", name="陈运维", password_hash=hash_password("user123"), dept="运维部", role_id=ops_role.id),
        models.User(username="delivery", name="李交付", password_hash=hash_password("user123"), dept="交付部", role_id=delivery_role.id),
        models.User(username="dev", name="王研发", password_hash=hash_password("user123"), dept="研发部", role_id=delivery_role.id),
        models.User(username="pm", name="周经理", password_hash=hash_password("user123"), dept="项目部", role_id=delivery_role.id),
    ]
    db.add_all(users)
    db.flush()

    products = [models.ProductType(name="edhr"), models.ProductType(name="edhr MAX"), models.ProductType(name="MedPro5")]
    supports = [
        models.SupportType(name="项目部署", workflow_key="ops"),
        models.SupportType(name="技术支持", workflow_key="ops"),
        models.SupportType(name="项目需求", workflow_key="devops"),
        models.SupportType(name="其他支持", workflow_key="ops"),
    ]
    customers = [
        models.Customer(name="华东产业园", sales_name="许销售", note="生产环境客户"),
        models.Customer(name="城投集团", sales_name="周销售", note="集团版客户"),
    ]
    db.add_all(products + supports + customers)
    db.flush()

    db.add_all([
        models.WorkflowTemplate(name="交付 -> 运维", support_type="项目部署", departments=_csv(["交付部", "运维部"]), default_ops_handler_id=2, default_delivery_handler_id=3),
        models.WorkflowTemplate(name="交付 -> 研发 -> 运维", support_type="项目需求", departments=_csv(["交付部", "研发部", "运维部"]), default_ops_handler_id=2, default_dev_handler_id=4, default_delivery_handler_id=3),
    ])
    db.add(
        models.Project(
            customer_id=customers[0].id,
            product_type_id=products[0].id,
            platform_version="edhr v2.8.1",
            online_status="运维中",
            project_manager_id=5,
            ops_owner_id=2,
            delivery_owner_id=3,
            dev_owner_id=4,
            created_by=1,
            versions=[models.ProjectServiceVersion(service_name="API", version="v2.8.1")],
            updates=[models.ProjectUpdateLog(version="v2.8.1", content="修复组织同步异常", updated_by=2)],
        )
    )
    sample_secret = "demo-db-secret"
    db.add(
        models.Credential(
            customer_id=customers[0].id,
            product_type_id=products[0].id,
            credential_name="数据库账号",
            credential_type="数据库",
            account="park_dba",
            encrypted_secret=encrypt_secret(sample_secret),
            secret_mask=mask_secret(sample_secret),
            owner_id=2,
            rule="运维管理员审批",
        )
    )
    db.commit()


def _get_or_create_role(
    db: Session,
    *,
    name: str,
    data_scope: str,
    menus: list[str],
    credential_policy: str,
) -> models.Role:
    role = db.query(models.Role).filter(models.Role.name == name).first()
    if role is None:
        role = models.Role(
            name=name,
            data_scope=data_scope,
            menus=_csv(menus),
            credential_policy=credential_policy,
        )
        db.add(role)
        db.flush()
    return role


def _ensure_workflow_accounts(db: Session) -> None:
    delivery_role = _get_or_create_role(
        db,
        name="交付人员",
        data_scope="参与项目",
        menus=["dashboard", "projects", "customerInfo", "supportDeploy", "supportTech", "credentials"],
        credential_policy="申请查看",
    )
    leader_role = _get_or_create_role(
        db,
        name="运维 Leader",
        data_scope="全部运维项目",
        menus=["dashboard", "projects", "customerInfo", "supportDeploy", "supportTech", "supportNeed", "supportOther", "assets", "flow", "credentials"],
        credential_policy="审批查看",
    )
    engineer_role = _get_or_create_role(
        db,
        name="运维工程师",
        data_scope="本人负责项目",
        menus=["dashboard", "projects", "customerInfo", "supportDeploy", "supportTech", "supportNeed", "supportOther", "assets", "credentials"],
        credential_policy="申请查看",
    )
    account_specs = [
        ("wanger", "王二", "交付部", delivery_role.id),
        ("zhangsan", "张三", "运维部", leader_role.id),
        ("lisi", "李四", "运维部", engineer_role.id),
    ]
    for username, name, dept, role_id in account_specs:
        user = db.query(models.User).filter(models.User.username == username).first()
        if user is None:
            user = models.User(username=username)
            db.add(user)
        user.name = name
        user.password_hash = hash_password("user123")
        user.dept = dept
        user.role_id = role_id
        user.status = "enabled"
    db.commit()


def seed(db: Session) -> None:
    _seed_initial_data(db)
    _ensure_workflow_accounts(db)


def ensure_database() -> None:
    from .database import Base, engine
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
