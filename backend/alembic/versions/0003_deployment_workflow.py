"""Add deployment workflow tracking and asset links."""

from alembic import op
import sqlalchemy as sa


revision = "0003_deployment_workflow"
down_revision = "0002_ticket_products"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    ticket_columns = {item["name"] for item in inspector.get_columns("support_tickets")}
    missing_ticket_columns = {
        "received_by_id",
        "received_at",
        "deployed_by_id",
        "deployed_at",
    } - ticket_columns
    if missing_ticket_columns:
        with op.batch_alter_table("support_tickets") as batch:
            if "received_by_id" in missing_ticket_columns:
                batch.add_column(sa.Column("received_by_id", sa.Integer(), nullable=True))
                batch.create_foreign_key("fk_support_tickets_received_by", "users", ["received_by_id"], ["id"])
            if "received_at" in missing_ticket_columns:
                batch.add_column(sa.Column("received_at", sa.DateTime(timezone=True), nullable=True))
            if "deployed_by_id" in missing_ticket_columns:
                batch.add_column(sa.Column("deployed_by_id", sa.Integer(), nullable=True))
                batch.create_foreign_key("fk_support_tickets_deployed_by", "users", ["deployed_by_id"], ["id"])
            if "deployed_at" in missing_ticket_columns:
                batch.add_column(sa.Column("deployed_at", sa.DateTime(timezone=True), nullable=True))

    inspector = sa.inspect(op.get_bind())
    asset_columns = {item["name"]: item for item in inspector.get_columns("server_assets")}
    missing_asset_columns = {
        "ticket_id",
        "customer_id",
        "project_name",
        "product_type_id",
        "deployed_by_id",
        "deployment_version",
    } - asset_columns.keys()
    project_requires_nullable = not asset_columns["project_id"]["nullable"]
    if missing_asset_columns or project_requires_nullable:
        with op.batch_alter_table("server_assets") as batch:
            if project_requires_nullable:
                batch.alter_column("project_id", existing_type=sa.Integer(), nullable=True)
            if "ticket_id" in missing_asset_columns:
                batch.add_column(sa.Column("ticket_id", sa.Integer(), nullable=True))
                batch.create_foreign_key("fk_server_assets_ticket", "support_tickets", ["ticket_id"], ["id"])
            if "customer_id" in missing_asset_columns:
                batch.add_column(sa.Column("customer_id", sa.Integer(), nullable=True))
                batch.create_foreign_key("fk_server_assets_customer", "customers", ["customer_id"], ["id"])
            if "project_name" in missing_asset_columns:
                batch.add_column(sa.Column("project_name", sa.String(200), nullable=False, server_default=""))
            if "product_type_id" in missing_asset_columns:
                batch.add_column(sa.Column("product_type_id", sa.Integer(), nullable=True))
                batch.create_foreign_key("fk_server_assets_product_type", "product_types", ["product_type_id"], ["id"])
            if "deployed_by_id" in missing_asset_columns:
                batch.add_column(sa.Column("deployed_by_id", sa.Integer(), nullable=True))
                batch.create_foreign_key("fk_server_assets_deployed_by", "users", ["deployed_by_id"], ["id"])
            if "deployment_version" in missing_asset_columns:
                batch.add_column(sa.Column("deployment_version", sa.String(120), nullable=False, server_default=""))

    asset_indexes = {item["name"] for item in sa.inspect(op.get_bind()).get_indexes("server_assets")}
    if "ix_server_assets_ticket_id" not in asset_indexes:
        op.create_index("ix_server_assets_ticket_id", "server_assets", ["ticket_id"])
    if "ix_server_assets_customer_project" not in asset_indexes:
        op.create_index("ix_server_assets_customer_project", "server_assets", ["customer_id", "project_name"])


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM server_assets WHERE project_id IS NULL"))

    with op.batch_alter_table("server_assets") as batch:
        batch.drop_index("ix_server_assets_customer_project")
        batch.drop_index("ix_server_assets_ticket_id")
        batch.drop_column("deployment_version")
        batch.drop_column("deployed_by_id")
        batch.drop_column("product_type_id")
        batch.drop_column("project_name")
        batch.drop_column("customer_id")
        batch.drop_column("ticket_id")
        batch.alter_column("project_id", existing_type=sa.Integer(), nullable=False)

    with op.batch_alter_table("support_tickets") as batch:
        batch.drop_column("deployed_at")
        batch.drop_column("deployed_by_id")
        batch.drop_column("received_at")
        batch.drop_column("received_by_id")
