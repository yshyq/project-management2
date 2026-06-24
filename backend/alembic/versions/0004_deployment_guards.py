"""Prevent duplicate deployment assets."""

from alembic import op
import sqlalchemy as sa


revision = "0004_deployment_guards"
down_revision = "0003_deployment_workflow"
branch_labels = None
depends_on = None


CONSTRAINT_NAME = "uq_server_asset_ticket_product"


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM server_assets
            WHERE ticket_id IS NOT NULL
              AND product_type_id IS NOT NULL
              AND id NOT IN (
                SELECT MIN(id)
                FROM server_assets
                WHERE ticket_id IS NOT NULL
                  AND product_type_id IS NOT NULL
                GROUP BY ticket_id, product_type_id
              )
            """
        )
    )
    unique_names = {
        item["name"]
        for item in sa.inspect(op.get_bind()).get_unique_constraints("server_assets")
    }
    if CONSTRAINT_NAME not in unique_names:
        with op.batch_alter_table("server_assets") as batch:
            batch.create_unique_constraint(
                CONSTRAINT_NAME,
                ["ticket_id", "product_type_id"],
            )


def downgrade() -> None:
    unique_names = {
        item["name"]
        for item in sa.inspect(op.get_bind()).get_unique_constraints("server_assets")
    }
    if CONSTRAINT_NAME in unique_names:
        with op.batch_alter_table("server_assets") as batch:
            batch.drop_constraint(CONSTRAINT_NAME, type_="unique")
