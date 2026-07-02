from collections.abc import Callable
from contextlib import asynccontextmanager
from datetime import datetime
from ipaddress import ip_address
from uuid import uuid4

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from . import models, schemas
from .database import get_db
from .security import create_access_token, decode_access_token, decrypt_secret, encrypt_secret, mask_secret, verify_password
from .seed import ensure_database



@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_database()
    yield


app = FastAPI(title="运维项目管理系统 API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data if data is not None else {}, "traceId": f"req-{uuid4().hex[:12]}"}


def page(items: list[dict], page_no: int = 1, page_size: int = 20, total: int | None = None):
    return ok({"list": items, "page": page_no, "pageSize": page_size, "total": len(items) if total is None else total})


def split_csv(value: str) -> list[str]:
    return [item for item in value.split(",") if item]


SUPPORT_MENU_KEYS = ["customerInfo", "supportDeploy", "supportTech", "supportNeed", "supportOther"]
SUPER_ADMIN_ROLE_NAMES = {"系统管理员", "超级管理员"}
ALL_SUPPORT_DATA_SCOPES = {"全部数据", "全部运维项目"}


def effective_menus(user: models.User) -> list[str]:
    menus = split_csv(user.role.menus)
    for key in SUPPORT_MENU_KEYS:
        if key not in menus:
            menus.append(key)
    return menus


def is_super_admin(user: models.User) -> bool:
    return user.role.name in SUPER_ADMIN_ROLE_NAMES or user.role.data_scope == "全部数据"


def has_all_support_scope(user: models.User) -> bool:
    return is_super_admin(user) or user.role.data_scope in ALL_SUPPORT_DATA_SCOPES


def support_ticket_scope_filter(user: models.User):
    if has_all_support_scope(user):
        return None
    return or_(
        models.SupportTicket.requester_id == user.id,
        models.SupportTicket.current_handler_id == user.id,
        models.SupportTicket.received_by_id == user.id,
        models.SupportTicket.deployed_by_id == user.id,
    )


def can_view_support_ticket(user: models.User, ticket: models.SupportTicket) -> bool:
    if has_all_support_scope(user):
        return True
    return user.id in {
        ticket.requester_id,
        ticket.current_handler_id,
        ticket.received_by_id,
        ticket.deployed_by_id,
    }


def require_support_ticket_access(user: models.User, ticket: models.SupportTicket) -> None:
    if not can_view_support_ticket(user, ticket):
        raise HTTPException(status_code=403, detail="仅可查看与自己相关的支持单")


def require_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        username = decode_access_token(authorization.removeprefix("Bearer ").strip())
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    user = db.scalar(select(models.User).where(models.User.username == username, models.User.status == "enabled"))
    if not user:
        raise HTTPException(status_code=401, detail="User disabled or not found")
    return user


def user_read(user: models.User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "dept": user.dept,
        "roles": [user.role.name],
        "roleId": user.role_id,
        "menus": effective_menus(user),
        "credentialPolicy": user.role.credential_policy,
    }


def customer_read(customer: models.Customer) -> dict:
    return {"id": customer.id, "name": customer.name, "salesName": customer.sales_name, "note": customer.note}


def product_read(product: models.ProductType) -> dict:
    return {"id": product.id, "name": product.name, "enabled": product.enabled}


def support_type_read(item: models.SupportType) -> dict:
    return {"id": item.id, "name": item.name, "workflowKey": item.workflow_key, "enabled": item.enabled}


def project_read(project: models.Project) -> dict:
    return {
        "id": project.id,
        "customerId": project.customer_id,
        "customerName": project.customer.name,
        "productTypeId": project.product_type_id,
        "productName": project.product_type.name,
        "platformVersion": project.platform_version,
        "onlineStatus": project.online_status,
        "projectManagerId": project.project_manager_id,
        "projectManagerName": project.project_manager.name if project.project_manager else "",
        "createdAt": project.created_at,
        "updatedAt": project.updated_at,
    }


def ticket_products(ticket: models.SupportTicket) -> list[models.ProductType]:
    if ticket.support_type == "项目部署" and ticket.product_links:
        return [link.product_type for link in ticket.product_links]
    return [ticket.product_type]


def ticket_read(ticket: models.SupportTicket) -> dict:
    extra = ticket.deployment_extra
    products = ticket_products(ticket)
    product_items = [{"id": product.id, "name": product.name} for product in products]
    return {
        "id": ticket.id,
        "ticketNo": ticket.ticket_no,
        "supportType": ticket.support_type,
        "customerId": ticket.customer_id,
        "customerName": ticket.customer.name,
        "projectName": ticket.project_name,
        "productId": ticket.product_type_id,
        "productTypeId": ticket.product_type_id,
        "productName": ticket.product_type.name,
        "productIds": [product.id for product in products],
        "products": product_items,
        "title": ticket.title,
        "priority": ticket.priority,
        "env": ticket.env,
        "description": ticket.description,
        "status": ticket.status,
        "currentHandlerId": ticket.current_handler_id,
        "currentHandlerName": ticket.current_handler.name if ticket.current_handler else "",
        "requesterId": ticket.requester_id,
        "requesterName": ticket.requester.name if ticket.requester else "",
        "receivedById": ticket.received_by_id,
        "receivedByName": ticket.received_by.name if ticket.received_by else "",
        "receivedAt": ticket.received_at,
        "deployedById": ticket.deployed_by_id,
        "deployedByName": ticket.deployed_by.name if ticket.deployed_by else "",
        "deployedAt": ticket.deployed_at,
        "deploymentExtra": None if not extra else {
            "remoteMethod": extra.remote_method,
            "remoteInfo": extra.remote_info,
            "serverInfo": extra.server_info,
            "authorizationText": extra.authorization_text,
        },
        "createdAt": ticket.created_at,
        "updatedAt": ticket.updated_at,
    }


def asset_read(asset: models.ServerAsset) -> dict:
    return {
        "id": asset.id,
        "projectId": asset.project_id,
        "ticketId": asset.ticket_id,
        "ticketNo": asset.ticket.ticket_no if asset.ticket else "",
        "customerId": asset.customer_id,
        "customerName": asset.customer.name if asset.customer else "",
        "projectName": asset.project_name,
        "productTypeId": asset.product_type_id,
        "productName": asset.product_type.name if asset.product_type else "",
        "environment": asset.environment,
        "innerIp": asset.inner_ip,
        "outerIp": asset.outer_ip,
        "hostname": asset.hostname,
        "os": asset.os,
        "purpose": asset.purpose,
        "deploymentVersion": asset.deployment_version,
        "deployedById": asset.deployed_by_id,
        "deployedByName": asset.deployed_by.name if asset.deployed_by else "",
        "remark": asset.remark,
        "createdAt": asset.created_at,
        "updatedAt": asset.updated_at,
    }


def credential_read(credential: models.Credential) -> dict:
    return {
        "id": credential.id,
        "customerId": credential.customer_id,
        "customerName": credential.customer.name,
        "productTypeId": credential.product_type_id,
        "productName": credential.product_type.name,
        "credentialName": credential.credential_name,
        "credentialType": credential.credential_type,
        "account": credential.account,
        "secretMask": credential.secret_mask,
        "ownerId": credential.owner_id,
        "ownerName": credential.owner.name if credential.owner else "",
        "rule": credential.rule,
        "createdAt": credential.created_at,
    }


def get_or_404(db: Session, model, item_id: int):
    item = db.get(model, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return item


def require_deployment_ticket(db: Session, ticket_id: int) -> models.SupportTicket:
    ticket = get_or_404(db, models.SupportTicket, ticket_id)
    if ticket.support_type != "项目部署":
        raise HTTPException(status_code=409, detail="当前工单不是项目部署工单")
    return ticket


def require_ops_leader(user: models.User) -> None:
    if user.role.name != "运维 Leader" and not is_super_admin(user):
        raise HTTPException(status_code=403, detail="仅运维 Leader 可以执行该操作")


def require_system_admin(user: models.User) -> None:
    if not is_super_admin(user):
        raise HTTPException(status_code=403, detail="仅系统管理员可以执行该操作")


def require_deployment_requester(user: models.User) -> None:
    if user.role.name != "交付人员" and not is_super_admin(user):
        raise HTTPException(status_code=403, detail="仅交付人员可以提交项目部署申请")


def reject_generic_deployment_mutation(ticket: models.SupportTicket) -> None:
    if ticket.support_type == "项目部署":
        raise HTTPException(status_code=409, detail="项目部署必须使用专用流程操作")


def require_ticket_status(ticket: models.SupportTicket, allowed: set[str], action_name: str) -> None:
    if ticket.status not in allowed:
        raise HTTPException(status_code=409, detail=f"当前状态“{ticket.status}”不允许{action_name}")


def normalize_deployment_servers(payload: schemas.DeploymentCompletion) -> list[schemas.DeploymentServerInfo]:
    servers = payload.servers or [
        schemas.DeploymentServerInfo(
            environment=payload.environment,
            inner_ip=payload.inner_ip,
            outer_ip=payload.outer_ip,
            hostname=payload.hostname,
            os=payload.os,
            purpose=payload.purpose,
            deployment_version=payload.deployment_version,
            remark=payload.remark,
        )
    ]
    if not servers:
        raise HTTPException(status_code=422, detail="请至少填写一台服务器信息")

    required_labels: list[tuple[str, str]] = [
        ("environment", "环境类型"),
        ("inner_ip", "内网 IP"),
        ("hostname", "主机名"),
        ("os", "操作系统"),
        ("purpose", "用途"),
        ("deployment_version", "部署版本"),
    ]
    for index, server in enumerate(servers, start=1):
        for field_name, label in required_labels:
            if not getattr(server, field_name).strip():
                raise HTTPException(status_code=422, detail=f"第{index}台服务器请填写{label}")
        for field_name, label in [("inner_ip", "内网 IP"), ("outer_ip", "外网 IP")]:
            value = getattr(server, field_name).strip()
            if not value:
                continue
            try:
                ip_address(value)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=f"第{index}台服务器{label}格式不正确") from exc
    return servers


def commit_ticket(db: Session, ticket: models.SupportTicket) -> dict:
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(ticket)
    return ticket_read(ticket)


def next_ticket_no(db: Session) -> str:
    return f"SUP-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:8].upper()}"


def load_products(db: Session, product_ids: list[int]) -> list[models.ProductType]:
    rows = db.scalars(select(models.ProductType).where(models.ProductType.id.in_(product_ids))).all()
    products_by_id = {item.id: item for item in rows}
    missing_ids = [product_id for product_id in product_ids if product_id not in products_by_id]
    if missing_ids:
        raise HTTPException(status_code=400, detail=f"产品不存在: {', '.join(map(str, missing_ids))}")
    return [products_by_id[product_id] for product_id in product_ids]


def deployment_tickets(
    db: Session,
    *,
    customer_id: int | None = None,
    project_name: str | None = None,
) -> list[models.SupportTicket]:
    query = (
        select(models.SupportTicket)
        .options(
            joinedload(models.SupportTicket.customer),
            joinedload(models.SupportTicket.product_type),
            joinedload(models.SupportTicket.product_links).joinedload(models.SupportTicketProduct.product_type),
        )
        .where(models.SupportTicket.support_type == "项目部署")
    )
    if customer_id is not None:
        query = query.where(models.SupportTicket.customer_id == customer_id)
    if project_name is not None:
        query = query.where(models.SupportTicket.project_name == project_name)
    return list(db.execute(query.order_by(models.SupportTicket.project_name, models.SupportTicket.id)).unique().scalars().all())


def resolve_non_deployment_customer(
    db: Session,
    *,
    customer_id: int,
    project_name: str,
    product_id: int,
) -> int:
    same_name_tickets = deployment_tickets(db, project_name=project_name)
    if not same_name_tickets:
        raise HTTPException(status_code=400, detail="项目名称不存在，必须先提交项目部署申请")

    deployed_customer_ids = {ticket.customer_id for ticket in same_name_tickets}
    if customer_id not in deployed_customer_ids:
        raise HTTPException(status_code=400, detail="所选项目属于其他客户")

    customer_tickets = [ticket for ticket in same_name_tickets if ticket.customer_id == customer_id]
    deployed_product_ids = {
        product.id
        for ticket in customer_tickets
        for product in ticket_products(ticket)
    }
    if product_id not in deployed_product_ids:
        raise HTTPException(status_code=400, detail="所选产品未在该项目的部署申请中登记")
    return customer_id


def resolve_ticket_products(
    db: Session,
    payload: schemas.SupportTicketCreate,
) -> tuple[list[models.ProductType], int]:
    product_ids = payload.product_ids if payload.support_type == "项目部署" else [payload.product_type_id]
    products = load_products(db, [int(product_id) for product_id in product_ids if product_id is not None])
    if payload.support_type == "项目部署":
        get_or_404(db, models.Customer, payload.customer_id)
        customer_id = payload.customer_id
    else:
        customer_id = resolve_non_deployment_customer(
            db,
            customer_id=payload.customer_id,
            project_name=payload.project_name,
            product_id=products[0].id,
        )
    return products, customer_id


def replace_ticket_product_links(
    ticket: models.SupportTicket,
    products: list[models.ProductType],
) -> None:
    ticket.product_type_id = products[0].id
    ticket.product_links = []
    if ticket.support_type == "项目部署":
        ticket.product_links = [
            models.SupportTicketProduct(product_type_id=product.id, position=index)
            for index, product in enumerate(products)
        ]


def default_handler_id(db: Session, support_type: str, payload: schemas.SupportTicketCreate) -> int | None:
    if payload.ops_handler_id:
        return payload.ops_handler_id
    if support_type == "项目需求" and payload.dev_handler_id:
        return payload.dev_handler_id
    workflow = db.scalar(select(models.WorkflowTemplate).where(models.WorkflowTemplate.support_type == support_type, models.WorkflowTemplate.enabled.is_(True)))
    if workflow:
        if support_type == "项目需求" and workflow.default_dev_handler_id:
            return workflow.default_dev_handler_id
        if workflow.default_ops_handler_id:
            return workflow.default_ops_handler_id
    ops_user = db.scalar(select(models.User).where(models.User.name == "陈运维"))
    return ops_user.id if ops_user else None


def default_status(support_type: str) -> str:
    return "待研发处理" if support_type == "项目需求" else "待运维接收"


@app.get("/api/health")
async def health():
    return ok({"status": "ok"})


@app.post("/api/auth/login")
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.username == payload.username))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return ok({"accessToken": create_access_token(user.username), "tokenType": "bearer", "profile": user_read(user)})


@app.post("/api/auth/logout")
def logout(_: models.User = Depends(require_user)):
    return ok()


@app.get("/api/auth/profile")
def profile(current_user: models.User = Depends(require_user)):
    return ok(user_read(current_user))


@app.get("/api/auth/menus")
def menus(current_user: models.User = Depends(require_user)):
    return ok(effective_menus(current_user))


@app.get("/api/customers")
def list_customers(keyword: str = "", db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    query = select(models.Customer).order_by(models.Customer.id)
    if keyword:
        query = query.where(models.Customer.name.contains(keyword))
    return page([customer_read(item) for item in db.scalars(query).all()])


@app.post("/api/customers")
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    if db.scalar(select(models.Customer).where(models.Customer.name == payload.name)):
        raise HTTPException(status_code=409, detail="客户名称已存在")
    item = models.Customer(name=payload.name, sales_name=payload.sales_name, note=payload.note)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(customer_read(item))


@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    return ok(customer_read(get_or_404(db, models.Customer, customer_id)))


@app.put("/api/customers/{customer_id}")
def update_customer(customer_id: int, payload: schemas.CustomerCreate, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    item = get_or_404(db, models.Customer, customer_id)
    item.name = payload.name
    item.sales_name = payload.sales_name
    item.note = payload.note
    db.commit()
    return ok(customer_read(item))


@app.get("/api/config/product-types")
def list_product_types(db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    return page([product_read(item) for item in db.scalars(select(models.ProductType).order_by(models.ProductType.id)).all()])


@app.post("/api/config/product-types")
def create_product_type(payload: schemas.ProductTypeCreate, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    item = models.ProductType(name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(product_read(item))


@app.get("/api/config/support-types")
def list_support_types(db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    return page([support_type_read(item) for item in db.scalars(select(models.SupportType).order_by(models.SupportType.id)).all()])


@app.post("/api/config/support-types")
def create_support_type(payload: schemas.SupportTypeCreate, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    item = models.SupportType(name=payload.name, workflow_key=payload.workflow_key)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(support_type_read(item))


@app.get("/api/config/workflows")
def list_workflows(db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    workflows = db.scalars(select(models.WorkflowTemplate).order_by(models.WorkflowTemplate.id)).all()
    return page([{
        "id": item.id,
        "name": item.name,
        "supportType": item.support_type,
        "departments": split_csv(item.departments),
        "defaultOpsHandlerId": item.default_ops_handler_id,
        "defaultDevHandlerId": item.default_dev_handler_id,
        "defaultDeliveryHandlerId": item.default_delivery_handler_id,
        "enabled": item.enabled,
    } for item in workflows])


@app.post("/api/config/workflows")
def create_workflow(payload: schemas.WorkflowCreate, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    item = models.WorkflowTemplate(
        name=payload.name,
        support_type=payload.support_type,
        departments=",".join(payload.departments),
        default_ops_handler_id=payload.default_ops_handler_id,
        default_dev_handler_id=payload.default_dev_handler_id,
        default_delivery_handler_id=payload.default_delivery_handler_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok({"id": item.id, "name": item.name})


@app.get("/api/projects")
def list_projects(keyword: str = "", db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    query = select(models.Project).join(models.Customer).join(models.ProductType).order_by(models.Project.id.desc())
    if keyword:
        query = query.where(or_(models.Customer.name.contains(keyword), models.ProductType.name.contains(keyword), models.Project.platform_version.contains(keyword)))
    items = [project_read(item) for item in db.scalars(query).all()]
    return page(items)


@app.post("/api/projects")
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    get_or_404(db, models.Customer, payload.customer_id)
    get_or_404(db, models.ProductType, payload.product_type_id)
    item = models.Project(
        customer_id=payload.customer_id,
        product_type_id=payload.product_type_id,
        platform_version=payload.platform_version,
        online_status=payload.online_status,
        project_manager_id=payload.project_manager_id,
        ops_owner_id=payload.ops_owner_id,
        delivery_owner_id=payload.delivery_owner_id,
        dev_owner_id=payload.dev_owner_id,
        created_by=current_user.id,
        versions=[models.ProjectServiceVersion(service_name=row.service_name, version=row.version, remark=row.remark) for row in payload.service_versions],
        updates=[models.ProjectUpdateLog(version=row.version, content=row.content, updated_by=current_user.id) for row in payload.update_logs],
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(project_read(item))


@app.get("/api/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    return ok(project_read(get_or_404(db, models.Project, project_id)))


@app.get("/api/projects/{project_id}/versions")
def project_versions(project_id: int, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    get_or_404(db, models.Project, project_id)
    rows = db.scalars(select(models.ProjectServiceVersion).where(models.ProjectServiceVersion.project_id == project_id)).all()
    return page([{"id": row.id, "serviceName": row.service_name, "version": row.version, "remark": row.remark} for row in rows])


@app.get("/api/projects/{project_id}/updates")
def project_updates(project_id: int, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    get_or_404(db, models.Project, project_id)
    rows = db.scalars(select(models.ProjectUpdateLog).where(models.ProjectUpdateLog.project_id == project_id).order_by(models.ProjectUpdateLog.updated_at.desc())).all()
    return page([{"id": row.id, "version": row.version, "content": row.content, "updatedBy": row.updated_by, "updatedAt": row.updated_at} for row in rows])


@app.get("/api/projects/{project_id}/dashboard")
def project_dashboard(project_id: int, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    project = get_or_404(db, models.Project, project_id)
    tickets = db.scalars(select(models.SupportTicket).where(models.SupportTicket.customer_id == project.customer_id, models.SupportTicket.product_type_id == project.product_type_id)).all()
    return ok({
        "ticketTotal": len(tickets),
        "processingTotal": len([item for item in tickets if item.status not in ["已关闭", "已解决"]]),
        "closedTotal": len([item for item in tickets if item.status == "已关闭"]),
        "byType": {kind: len([item for item in tickets if item.support_type == kind]) for kind in ["项目部署", "技术支持", "项目需求", "其他支持"]},
    })


@app.get("/api/assets")
def list_assets(
    ticketId: int | None = None,
    pageNo: int = 1,
    pageSize: int = 20,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_user),
):
    if pageNo < 1 or pageSize < 1 or pageSize > 200:
        raise HTTPException(status_code=422, detail="分页参数无效")
    filters = []
    if ticketId is not None:
        filters.append(models.ServerAsset.ticket_id == ticketId)
    total = db.scalar(select(func.count(models.ServerAsset.id)).where(*filters)) or 0
    query = (
        select(models.ServerAsset)
        .options(
            joinedload(models.ServerAsset.ticket),
            joinedload(models.ServerAsset.customer),
            joinedload(models.ServerAsset.product_type),
            joinedload(models.ServerAsset.deployed_by),
        )
        .where(*filters)
        .order_by(models.ServerAsset.id.desc())
        .offset((pageNo - 1) * pageSize)
        .limit(pageSize)
    )
    return page(
        [asset_read(item) for item in db.scalars(query).all()],
        page_no=pageNo,
        page_size=pageSize,
        total=total,
    )


@app.get("/api/support-tickets")
def list_support_tickets(
    supportType: str = "",
    keyword: str = "",
    pageNo: int = 1,
    pageSize: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    if pageNo < 1 or pageSize < 1 or pageSize > 200:
        raise HTTPException(status_code=422, detail="分页参数无效")
    filters = []
    scope_filter = support_ticket_scope_filter(current_user)
    if scope_filter is not None:
        filters.append(scope_filter)
    if supportType:
        filters.append(models.SupportTicket.support_type == supportType)
    if keyword:
        filters.append(or_(
            models.SupportTicket.title.contains(keyword),
            models.SupportTicket.project_name.contains(keyword),
            models.SupportTicket.description.contains(keyword),
        ))
    total = db.scalar(select(func.count(models.SupportTicket.id)).where(*filters)) or 0
    query = (
        select(models.SupportTicket)
        .where(*filters)
        .order_by(models.SupportTicket.id.desc())
        .offset((pageNo - 1) * pageSize)
        .limit(pageSize)
    )
    return page(
        [ticket_read(item) for item in db.scalars(query).all()],
        page_no=pageNo,
        page_size=pageSize,
        total=total,
    )


@app.get("/api/deployment-project-options")
def deployment_project_options(
    customerId: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    if customerId is not None:
        get_or_404(db, models.Customer, customerId)
    grouped: dict[tuple[int, str], dict] = {}
    for ticket in deployment_tickets(db, customer_id=customerId):
        if not can_view_support_ticket(current_user, ticket):
            continue
        project = grouped.setdefault(
            (ticket.customer_id, ticket.project_name),
            {"customerName": ticket.customer.name, "products": {}},
        )
        for product in ticket_products(ticket):
            project["products"].setdefault(product.id, {"id": product.id, "name": product.name})
    return ok([
        {
            "customerId": customer_id,
            "customerName": project["customerName"],
            "projectName": project_name,
            "products": [project["products"][product_id] for product_id in sorted(project["products"])],
        }
        for (customer_id, project_name), project in sorted(grouped.items(), key=lambda item: (item[0][1], item[0][0]))
    ])


@app.post("/api/support-tickets")
def create_support_ticket(payload: schemas.SupportTicketCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    if payload.support_type == "项目部署":
        require_deployment_requester(current_user)
    products, customer_id = resolve_ticket_products(db, payload)
    title = payload.title.strip() if payload.title else f"{payload.project_name}部署申请"
    item = models.SupportTicket(
        ticket_no=next_ticket_no(db),
        support_type=payload.support_type,
        project_name=payload.project_name,
        customer_id=customer_id,
        product_type_id=products[0].id,
        title=title,
        priority=payload.priority,
        env=payload.env,
        description=payload.description,
        status=default_status(payload.support_type),
        current_handler_id=default_handler_id(db, payload.support_type, payload),
        requester_id=current_user.id,
    )
    if payload.support_type == "项目部署":
        item.deployment_extra = models.DeploymentExtra(
            remote_method=payload.remote_method,
            remote_info=payload.remote_info,
            server_info=payload.server_info,
            authorization_text=payload.authorization_text,
        )
    replace_ticket_product_links(item, products)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(ticket_read(item))


@app.put("/api/support-tickets/{ticket_id}")
def update_support_ticket(
    ticket_id: int,
    payload: schemas.SupportTicketCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_user),
):
    ticket = get_or_404(db, models.SupportTicket, ticket_id)
    if payload.support_type == "项目部署":
        raise HTTPException(status_code=409, detail="项目部署必须使用专用流程操作")
    reject_generic_deployment_mutation(ticket)
    products, customer_id = resolve_ticket_products(db, payload)
    ticket.support_type = payload.support_type
    ticket.customer_id = customer_id
    ticket.project_name = payload.project_name
    ticket.title = payload.title.strip() if payload.title else f"{payload.project_name}部署申请"
    ticket.priority = payload.priority
    ticket.env = payload.env
    ticket.description = payload.description
    if payload.support_type == "项目部署":
        if ticket.deployment_extra is None:
            ticket.deployment_extra = models.DeploymentExtra()
        ticket.deployment_extra.remote_method = payload.remote_method
        ticket.deployment_extra.remote_info = payload.remote_info
        ticket.deployment_extra.server_info = payload.server_info
        ticket.deployment_extra.authorization_text = payload.authorization_text
    else:
        ticket.deployment_extra = None
    ticket.product_links.clear()
    db.flush()
    replace_ticket_product_links(ticket, products)
    db.commit()
    db.refresh(ticket)
    return ok(ticket_read(ticket))


@app.get("/api/support-tickets/{ticket_id}")
def get_support_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    ticket = get_or_404(db, models.SupportTicket, ticket_id)
    require_support_ticket_access(current_user, ticket)
    return ok(ticket_read(ticket))


@app.post("/api/support-tickets/{ticket_id}/receive")
def receive_deployment(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    require_ops_leader(current_user)
    ticket = require_deployment_ticket(db, ticket_id)
    require_ticket_status(ticket, {"待运维接收"}, "接收")
    ticket.received_by_id = current_user.id
    ticket.received_at = models.now_utc()
    ticket.current_handler_id = current_user.id
    ticket.status = "待安排部署"
    return ok(commit_ticket(db, ticket))


@app.post("/api/support-tickets/{ticket_id}/assign")
def assign_deployment(
    ticket_id: int,
    payload: schemas.TicketAssignment,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    require_ops_leader(current_user)
    ticket = require_deployment_ticket(db, ticket_id)
    require_ticket_status(ticket, {"待安排部署", "部署中"}, "分配")
    handler = get_or_404(db, models.User, payload.handler_id)
    if handler.status != "enabled" or handler.dept != "运维部":
        raise HTTPException(status_code=400, detail="分配目标必须是启用中的运维人员")
    ticket.current_handler_id = handler.id
    ticket.status = "部署中"
    return ok(commit_ticket(db, ticket))


@app.post("/api/support-tickets/{ticket_id}/self-assign")
def self_assign_deployment(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    require_ops_leader(current_user)
    ticket = require_deployment_ticket(db, ticket_id)
    require_ticket_status(ticket, {"待安排部署", "部署中"}, "自领")
    ticket.current_handler_id = current_user.id
    ticket.status = "部署中"
    return ok(commit_ticket(db, ticket))


@app.post("/api/support-tickets/{ticket_id}/complete-deployment")
def complete_deployment(
    ticket_id: int,
    payload: schemas.DeploymentCompletion,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    ticket = require_deployment_ticket(db, ticket_id)
    require_support_ticket_access(current_user, ticket)
    require_ticket_status(ticket, {"部署中"}, "完成部署")
    if ticket.current_handler_id != current_user.id and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="仅当前部署负责人可以完成部署")

    products = ticket_products(ticket)
    servers = normalize_deployment_servers(payload)
    for server in servers:
        for product in products:
            db.add(
                models.ServerAsset(
                    project_id=None,
                    ticket_id=ticket.id,
                    customer_id=ticket.customer_id,
                    project_name=ticket.project_name,
                    product_type_id=product.id,
                    deployed_by_id=current_user.id,
                    environment=server.environment,
                    inner_ip=server.inner_ip,
                    outer_ip=server.outer_ip,
                    hostname=server.hostname,
                    os=server.os,
                    purpose=server.purpose,
                    deployment_version=server.deployment_version,
                    remark=server.remark,
                )
            )
    ticket.status = "已部署"
    ticket.deployed_by_id = current_user.id
    ticket.deployed_at = models.now_utc()
    try:
        return ok(commit_ticket(db, ticket))
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="该部署工单的资产已经生成") from exc


def mutate_ticket(ticket_id: int, action: Callable[[models.SupportTicket], None], db: Session, current_user: models.User) -> dict:
    ticket = get_or_404(db, models.SupportTicket, ticket_id)
    require_support_ticket_access(current_user, ticket)
    reject_generic_deployment_mutation(ticket)
    action(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket_read(ticket)


@app.post("/api/support-tickets/{ticket_id}/handle")
def handle_ticket(
    ticket_id: int,
    payload: schemas.TicketAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    def action(ticket: models.SupportTicket):
        ticket.status = payload.next_status or "待交付确认"
        if payload.handler_id:
            ticket.current_handler_id = payload.handler_id
    return ok(mutate_ticket(ticket_id, action, db, current_user))


@app.post("/api/support-tickets/{ticket_id}/transfer")
def transfer_ticket(
    ticket_id: int,
    payload: schemas.TicketAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    def action(ticket: models.SupportTicket):
        ticket.status = payload.next_status or "待研发处理"
        ticket.current_handler_id = payload.handler_id
    return ok(mutate_ticket(ticket_id, action, db, current_user))


@app.post("/api/support-tickets/{ticket_id}/close")
def close_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    def action(ticket: models.SupportTicket):
        ticket.status = "已关闭"
        ticket.closed_at = datetime.utcnow()
    return ok(mutate_ticket(ticket_id, action, db, current_user))


@app.get("/api/credentials")
def list_credentials(db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    return page([credential_read(item) for item in db.scalars(select(models.Credential).order_by(models.Credential.id.desc())).all()])


@app.post("/api/credentials")
def create_credential(payload: schemas.CredentialCreate, db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    secret_mask = mask_secret(payload.secret)
    item = models.Credential(
        customer_id=payload.customer_id,
        product_type_id=payload.product_type_id,
        credential_name=payload.credential_name,
        credential_type=payload.credential_type,
        account=payload.account,
        encrypted_secret=encrypt_secret(payload.secret),
        secret_mask=secret_mask,
        owner_id=payload.owner_id,
        rule=payload.rule,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(credential_read(item))


@app.post("/api/credentials/{credential_id}/apply")
def apply_credential(credential_id: int, payload: schemas.CredentialApplyRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    credential = get_or_404(db, models.Credential, credential_id)
    item = models.CredentialAuthorization(credential_id=credential.id, user_id=current_user.id, credential_type=credential.credential_type, reason=payload.reason)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok({"id": item.id, "status": item.status})


@app.post("/api/credentials/{credential_id}/approve")
def approve_credential(credential_id: int, payload: schemas.CredentialApproveRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    authorization = db.scalar(select(models.CredentialAuthorization).where(models.CredentialAuthorization.credential_id == credential_id, models.CredentialAuthorization.user_id == payload.user_id).order_by(models.CredentialAuthorization.id.desc()))
    if not authorization:
        authorization = models.CredentialAuthorization(credential_id=credential_id, user_id=payload.user_id, credential_type=get_or_404(db, models.Credential, credential_id).credential_type)
        db.add(authorization)
    authorization.status = "approved" if payload.approved else "rejected"
    authorization.approved_by = current_user.id
    authorization.approved_at = datetime.utcnow()
    db.commit()
    return ok({"id": authorization.id, "status": authorization.status})


@app.post("/api/credentials/{credential_id}/reveal")
def reveal_credential(credential_id: int, payload: schemas.CredentialRevealRequest, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    credential = get_or_404(db, models.Credential, credential_id)
    audit = models.CredentialAuditLog(
        credential_id=credential.id,
        operator_id=current_user.id,
        action=payload.action,
        reason=payload.reason,
        client_ip=request.client.host if request.client else "",
    )
    db.add(audit)
    db.commit()
    return ok({"id": credential.id, "secret": decrypt_secret(credential.encrypted_secret)})


@app.get("/api/credentials/audit")
def credential_audit(db: Session = Depends(get_db), _: models.User = Depends(require_user)):
    rows = db.scalars(select(models.CredentialAuditLog).order_by(models.CredentialAuditLog.id.desc())).all()
    return page([{
        "id": row.id,
        "credentialId": row.credential_id,
        "operatorId": row.operator_id,
        "operatorName": row.operator.name,
        "action": row.action,
        "reason": row.reason,
        "operatedAt": row.operated_at,
        "clientIp": row.client_ip,
    } for row in rows])


@app.get("/api/users")
def list_users(dept: str = "", db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    if dept:
        require_ops_leader(current_user)
        if dept != "运维部":
            raise HTTPException(status_code=403, detail="运维 Leader 仅可查询运维部人员")
    else:
        require_system_admin(current_user)
    query = select(models.User).where(models.User.status == "enabled").order_by(models.User.id)
    if dept:
        query = query.where(models.User.dept == dept)
    return page([user_read(item) for item in db.scalars(query).all()])


@app.post("/api/users")
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    from .security import hash_password

    require_system_admin(current_user)
    item = models.User(username=payload.username, name=payload.name, password_hash=hash_password(payload.password), dept=payload.dept, role_id=payload.role_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(user_read(item))


@app.get("/api/roles")
def list_roles(db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    require_system_admin(current_user)
    rows = db.scalars(select(models.Role).order_by(models.Role.id)).all()
    return page([{"id": row.id, "name": row.name, "dataScope": row.data_scope, "menus": split_csv(row.menus), "credentialPolicy": row.credential_policy} for row in rows])


@app.post("/api/roles")
def create_role(payload: schemas.RoleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_user)):
    require_system_admin(current_user)
    item = models.Role(name=payload.name, data_scope=payload.data_scope, menus=",".join(payload.menus), credential_policy=payload.credential_policy)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok({"id": item.id, "name": item.name})
