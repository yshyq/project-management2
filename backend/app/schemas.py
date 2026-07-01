from datetime import datetime

from ipaddress import ip_address

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator


def snake_to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=snake_to_camel, populate_by_name=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class CustomerCreate(CamelModel):
    name: str
    sales_name: str = ""
    note: str = ""


class ProductTypeCreate(BaseModel):
    name: str


class SupportTypeCreate(CamelModel):
    name: str
    workflow_key: str = "ops"


class ServiceVersionInput(CamelModel):
    service_name: str
    version: str
    remark: str = ""


class UpdateLogInput(BaseModel):
    version: str
    content: str


class ProjectCreate(CamelModel):
    customer_id: int
    product_type_id: int
    platform_version: str = ""
    online_status: str = "未上线"
    project_manager_id: int | None = None
    ops_owner_id: int | None = None
    delivery_owner_id: int | None = None
    dev_owner_id: int | None = None
    service_versions: list[ServiceVersionInput] = Field(default_factory=list)
    update_logs: list[UpdateLogInput] = Field(default_factory=list)


class SupportTicketCreate(CamelModel):
    support_type: str
    customer_id: int
    project_name: str = Field(min_length=1)
    product_type_id: int | None = Field(
        default=None,
        validation_alias=AliasChoices("productId", "productTypeId", "product_type_id"),
    )
    product_ids: list[int] | None = None
    priority: str = "中"
    env: str = "生产"
    title: str = ""
    description: str = ""
    ops_handler_id: int | None = None
    dev_handler_id: int | None = None
    delivery_handler_id: int | None = None
    remote_method: str = ""
    remote_info: str = ""
    server_info: str = ""
    authorization_text: str = ""

    @model_validator(mode="after")
    def validate_products(self):
        self.project_name = self.project_name.strip()
        if not self.project_name:
            raise ValueError("项目名称不能为空")
        if self.support_type == "项目部署":
            if self.product_ids is None and self.product_type_id is not None:
                self.product_ids = [self.product_type_id]
            self.product_ids = list(dict.fromkeys(self.product_ids or []))
            if not self.product_ids:
                raise ValueError("项目部署至少选择一个产品")
            self.product_type_id = self.product_ids[0]
        else:
            if self.product_type_id is None:
                raise ValueError("非部署支持必须选择一个产品")
            if self.product_ids:
                raise ValueError("非部署支持仅允许选择一个产品")
        return self


class TicketAction(CamelModel):
    handler_id: int | None = None
    result: str = ""
    next_status: str | None = None


class TicketAssignment(CamelModel):
    handler_id: int


class DeploymentCompletion(CamelModel):
    environment: str = Field(min_length=1)
    inner_ip: str = Field(min_length=1)
    outer_ip: str = ""
    hostname: str = Field(min_length=1)
    os: str = Field(min_length=1)
    purpose: str = Field(min_length=1)
    deployment_version: str = Field(min_length=1)
    remark: str = ""

    @field_validator("environment", "inner_ip", "outer_ip", "hostname", "os", "purpose", "deployment_version", "remark")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("environment", "inner_ip", "hostname", "os", "purpose", "deployment_version")
    @classmethod
    def require_non_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("字段不能为空")
        return value

    @field_validator("inner_ip", "outer_ip")
    @classmethod
    def validate_ip(cls, value: str) -> str:
        if value:
            ip_address(value)
        return value


class CredentialCreate(CamelModel):
    customer_id: int
    product_type_id: int
    credential_name: str
    credential_type: str
    account: str
    secret: str
    owner_id: int | None = None
    rule: str = "申请查看"


class CredentialRevealRequest(BaseModel):
    reason: str
    action: str = "view"


class CredentialApplyRequest(BaseModel):
    reason: str


class CredentialApproveRequest(CamelModel):
    user_id: int
    approved: bool = True


class UserCreate(CamelModel):
    username: str
    name: str
    password: str = "user123"
    dept: str = ""
    role_id: int


class UserUpdate(CamelModel):
    name: str | None = None
    password: str | None = None
    dept: str | None = None
    role_id: int | None = None
    status: str | None = None


class RoleCreate(CamelModel):
    name: str
    data_scope: str = "本人"
    menus: list[str] = Field(default_factory=list)
    credential_policy: str = "申请查看"


class RoleUpdate(CamelModel):
    name: str | None = None
    data_scope: str | None = None
    menus: list[str] | None = None
    credential_policy: str | None = None


class WorkflowCreate(CamelModel):
    name: str
    support_type: str = "全部"
    departments: list[str] = Field(default_factory=list)
    default_ops_handler_id: int | None = None
    default_dev_handler_id: int | None = None
    default_delivery_handler_id: int | None = None


class AuditRead(CamelModel):
    id: int
    credential_id: int
    operator_id: int
    action: str
    reason: str
    operated_at: datetime
    client_ip: str


class NotificationRead(BaseModel):
    id: int
    title: str
    content: str
    ref_type: str
    ref_id: int | None
    is_read: bool
    created_at: datetime


class NotificationUpdate(BaseModel):
    is_read: bool = True


class TicketProcessLogRead(BaseModel):
    id: int
    action: str
    from_status: str
    to_status: str
    operator_name: str
    handler_name: str
    remark: str
    created_at: datetime


class FileAttachmentRead(BaseModel):
    id: int
    file_name: str
    file_size: int
    mime_type: str
    created_at: datetime