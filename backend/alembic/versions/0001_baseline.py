"""Create the initial operations management schema."""

from alembic import op
import sqlalchemy as sa


revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def timestamps():
    return (
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False, unique=True),
        sa.Column("data_scope", sa.String(80), nullable=False),
        sa.Column("menus", sa.Text(), nullable=False),
        sa.Column("credential_policy", sa.String(80), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("sales_name", sa.String(100), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "product_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "support_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("workflow_key", sa.String(40), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("password_hash", sa.String(200), nullable=False),
        sa.Column("dept", sa.String(80), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "workflow_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("support_type", sa.String(120), nullable=False),
        sa.Column("departments", sa.Text(), nullable=False),
        sa.Column("default_ops_handler_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("default_dev_handler_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("default_delivery_handler_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("product_type_id", sa.Integer(), sa.ForeignKey("product_types.id"), nullable=False),
        sa.Column("platform_version", sa.String(120), nullable=False),
        sa.Column("online_status", sa.String(40), nullable=False),
        sa.Column("project_manager_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("ops_owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("delivery_owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("dev_owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "project_service_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("service_name", sa.String(120), nullable=False),
        sa.Column("version", sa.String(120), nullable=False),
        sa.Column("remark", sa.Text(), nullable=False),
    )
    op.create_table(
        "project_update_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("version", sa.String(120), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "server_assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("environment", sa.String(40), nullable=False),
        sa.Column("inner_ip", sa.String(80), nullable=False),
        sa.Column("outer_ip", sa.String(80), nullable=False),
        sa.Column("hostname", sa.String(120), nullable=False),
        sa.Column("os", sa.String(120), nullable=False),
        sa.Column("purpose", sa.String(200), nullable=False),
        sa.Column("remark", sa.Text(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "support_tickets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_no", sa.String(40), nullable=False, unique=True),
        sa.Column("support_type", sa.String(80), nullable=False),
        sa.Column("project_name", sa.String(200), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("product_type_id", sa.Integer(), sa.ForeignKey("product_types.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("priority", sa.String(40), nullable=False),
        sa.Column("env", sa.String(40), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("current_handler_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "deployment_extras",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("support_tickets.id"), nullable=False),
        sa.Column("remote_method", sa.String(120), nullable=False),
        sa.Column("remote_info", sa.Text(), nullable=False),
        sa.Column("server_info", sa.Text(), nullable=False),
        sa.Column("authorization_text", sa.Text(), nullable=False),
    )
    op.create_table(
        "credentials",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("product_type_id", sa.Integer(), sa.ForeignKey("product_types.id"), nullable=False),
        sa.Column("credential_name", sa.String(160), nullable=False),
        sa.Column("credential_type", sa.String(80), nullable=False),
        sa.Column("account", sa.String(160), nullable=False),
        sa.Column("encrypted_secret", sa.Text(), nullable=False),
        sa.Column("secret_mask", sa.String(160), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("rule", sa.String(120), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "credential_authorizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("credential_id", sa.Integer(), sa.ForeignKey("credentials.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("credential_type", sa.String(80), nullable=False),
        sa.Column("approved_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "credential_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("credential_id", sa.Integer(), sa.ForeignKey("credentials.id"), nullable=False),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("operated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("client_ip", sa.String(80), nullable=False),
    )


def downgrade() -> None:
    for table_name in [
        "credential_audit_logs",
        "credential_authorizations",
        "credentials",
        "deployment_extras",
        "support_tickets",
        "server_assets",
        "project_update_logs",
        "project_service_versions",
        "projects",
        "workflow_templates",
        "users",
        "support_types",
        "product_types",
        "customers",
        "roles",
    ]:
        op.drop_table(table_name)
