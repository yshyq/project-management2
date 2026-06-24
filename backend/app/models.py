from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    data_scope: Mapped[str] = mapped_column(String(80), default="全部数据")
    menus: Mapped[str] = mapped_column(Text, default="")
    credential_policy: Mapped[str] = mapped_column(String(80), default="申请查看")

    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(200))
    dept: Mapped[str] = mapped_column(String(80), default="")
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    status: Mapped[str] = mapped_column(String(32), default="enabled")

    role: Mapped[Role] = relationship(back_populates="users")


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    sales_name: Mapped[str] = mapped_column(String(100), default="")
    note: Mapped[str] = mapped_column(Text, default="")


class ProductType(Base, TimestampMixin):
    __tablename__ = "product_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class SupportType(Base, TimestampMixin):
    __tablename__ = "support_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    workflow_key: Mapped[str] = mapped_column(String(40), default="ops")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class WorkflowTemplate(Base, TimestampMixin):
    __tablename__ = "workflow_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    support_type: Mapped[str] = mapped_column(String(120), default="全部")
    departments: Mapped[str] = mapped_column(Text, default="")
    default_ops_handler_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    default_dev_handler_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    default_delivery_handler_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    product_type_id: Mapped[int] = mapped_column(ForeignKey("product_types.id"))
    platform_version: Mapped[str] = mapped_column(String(120), default="")
    online_status: Mapped[str] = mapped_column(String(40), default="未上线")
    project_manager_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    ops_owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    delivery_owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    dev_owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    customer: Mapped[Customer] = relationship()
    product_type: Mapped[ProductType] = relationship()
    project_manager: Mapped[User | None] = relationship(foreign_keys=[project_manager_id])
    versions: Mapped[list["ProjectServiceVersion"]] = relationship(cascade="all, delete-orphan")
    updates: Mapped[list["ProjectUpdateLog"]] = relationship(cascade="all, delete-orphan")


class ProjectServiceVersion(Base):
    __tablename__ = "project_service_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    service_name: Mapped[str] = mapped_column(String(120))
    version: Mapped[str] = mapped_column(String(120))
    remark: Mapped[str] = mapped_column(Text, default="")


class ProjectUpdateLog(Base):
    __tablename__ = "project_update_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    version: Mapped[str] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(Text)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class ServerAsset(Base, TimestampMixin):
    __tablename__ = "server_assets"
    __table_args__ = (
        UniqueConstraint("ticket_id", "product_type_id", name="uq_server_asset_ticket_product"),
        Index("ix_server_assets_ticket_id", "ticket_id"),
        Index("ix_server_assets_customer_project", "customer_id", "project_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    ticket_id: Mapped[int | None] = mapped_column(ForeignKey("support_tickets.id"), nullable=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    project_name: Mapped[str] = mapped_column(String(200), default="")
    product_type_id: Mapped[int | None] = mapped_column(ForeignKey("product_types.id"), nullable=True)
    deployed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    environment: Mapped[str] = mapped_column(String(40), default="")
    inner_ip: Mapped[str] = mapped_column(String(80), default="")
    outer_ip: Mapped[str] = mapped_column(String(80), default="")
    hostname: Mapped[str] = mapped_column(String(120), default="")
    os: Mapped[str] = mapped_column(String(120), default="")
    purpose: Mapped[str] = mapped_column(String(200), default="")
    deployment_version: Mapped[str] = mapped_column(String(120), default="")
    remark: Mapped[str] = mapped_column(Text, default="")

    ticket: Mapped["SupportTicket | None"] = relationship(foreign_keys=[ticket_id])
    customer: Mapped[Customer | None] = relationship(foreign_keys=[customer_id])
    product_type: Mapped[ProductType | None] = relationship(foreign_keys=[product_type_id])
    deployed_by: Mapped[User | None] = relationship(foreign_keys=[deployed_by_id])


class SupportTicket(Base, TimestampMixin):
    __tablename__ = "support_tickets"
    __table_args__ = (
        Index("ix_support_tickets_type_customer_project", "support_type", "customer_id", "project_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_no: Mapped[str] = mapped_column(String(40), unique=True)
    support_type: Mapped[str] = mapped_column(String(80))
    project_name: Mapped[str] = mapped_column(String(200))
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    product_type_id: Mapped[int] = mapped_column(ForeignKey("product_types.id"))
    title: Mapped[str] = mapped_column(String(200))
    priority: Mapped[str] = mapped_column(String(40), default="中")
    env: Mapped[str] = mapped_column(String(40), default="生产")
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="待运维接收")
    current_handler_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    requester_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    received_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deployed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    customer: Mapped[Customer] = relationship()
    product_type: Mapped[ProductType] = relationship()
    current_handler: Mapped[User | None] = relationship(foreign_keys=[current_handler_id])
    requester: Mapped[User | None] = relationship(foreign_keys=[requester_id])
    received_by: Mapped[User | None] = relationship(foreign_keys=[received_by_id])
    deployed_by: Mapped[User | None] = relationship(foreign_keys=[deployed_by_id])
    deployment_extra: Mapped["DeploymentExtra | None"] = relationship(cascade="all, delete-orphan", uselist=False)
    product_links: Mapped[list["SupportTicketProduct"]] = relationship(
        cascade="all, delete-orphan",
        order_by="SupportTicketProduct.position",
    )


class SupportTicketProduct(Base):
    __tablename__ = "support_ticket_products"
    __table_args__ = (
        UniqueConstraint("ticket_id", "product_type_id", name="uq_ticket_product"),
        Index("ix_support_ticket_products_product_type_id", "product_type_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("support_tickets.id", ondelete="CASCADE"))
    product_type_id: Mapped[int] = mapped_column(ForeignKey("product_types.id"))
    position: Mapped[int] = mapped_column(Integer, default=0)

    product_type: Mapped[ProductType] = relationship()


class DeploymentExtra(Base):
    __tablename__ = "deployment_extras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("support_tickets.id"))
    remote_method: Mapped[str] = mapped_column(String(120), default="")
    remote_info: Mapped[str] = mapped_column(Text, default="")
    server_info: Mapped[str] = mapped_column(Text, default="")
    authorization_text: Mapped[str] = mapped_column(Text, default="")


class Credential(Base, TimestampMixin):
    __tablename__ = "credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    product_type_id: Mapped[int] = mapped_column(ForeignKey("product_types.id"))
    credential_name: Mapped[str] = mapped_column(String(160))
    credential_type: Mapped[str] = mapped_column(String(80))
    account: Mapped[str] = mapped_column(String(160))
    encrypted_secret: Mapped[str] = mapped_column(Text)
    secret_mask: Mapped[str] = mapped_column(String(160))
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    rule: Mapped[str] = mapped_column(String(120), default="申请查看")

    customer: Mapped[Customer] = relationship()
    product_type: Mapped[ProductType] = relationship()
    owner: Mapped[User | None] = relationship()


class CredentialAuthorization(Base, TimestampMixin):
    __tablename__ = "credential_authorizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    credential_id: Mapped[int] = mapped_column(ForeignKey("credentials.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    credential_type: Mapped[str] = mapped_column(String(80))
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="pending")
    reason: Mapped[str] = mapped_column(Text, default="")


class CredentialAuditLog(Base):
    __tablename__ = "credential_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    credential_id: Mapped[int] = mapped_column(ForeignKey("credentials.id"))
    operator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str] = mapped_column(Text, default="")
    operated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    client_ip: Mapped[str] = mapped_column(String(80), default="")

    credential: Mapped[Credential] = relationship()
    operator: Mapped[User] = relationship()
