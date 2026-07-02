"""Allow multiple deployment assets for one ticket product."""

from alembic import op
import sqlalchemy as sa


revision = "0005_multi_server_deployment"
down_revision = "0004_deployment_guards"
branch_labels = None
depends_on = None


CONSTRAINT_NAME = "uq_server_asset_ticket_product"


def _unique_constraint_names() -> set[str]:
    return {
        item["name"]
        for item in sa.inspect(op.get_bind()).get_unique_constraints("server_assets")
    }


def upgrade() -> None:
    if CONSTRAINT_NAME in _unique_constraint_names():
        with op.batch_alter_table("server_assets") as batch:
            batch.drop_constraint(CONSTRAINT_NAME, type_="unique")


def downgrade() -> None:
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
    if CONSTRAINT_NAME not in _unique_constraint_names():
        with op.batch_alter_table("server_assets") as batch:
            batch.create_unique_constraint(
                CONSTRAINT_NAME,
                ["ticket_id", "product_type_id"],
            )
