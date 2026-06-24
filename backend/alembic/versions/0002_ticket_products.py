"""Add deployment ticket products and lookup indexes."""

from alembic import op
import sqlalchemy as sa


revision = "0002_ticket_products"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


TICKET_INDEX = "ix_support_tickets_type_customer_project"
PRODUCT_INDEX = "ix_support_ticket_products_product_type_id"


def index_names(table_name: str) -> set[str]:
    return {item["name"] for item in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "support_ticket_products" not in inspector.get_table_names():
        op.create_table(
            "support_ticket_products",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False),
            sa.Column("product_type_id", sa.Integer(), sa.ForeignKey("product_types.id"), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False),
            sa.UniqueConstraint("ticket_id", "product_type_id", name="uq_ticket_product"),
        )

    if TICKET_INDEX not in index_names("support_tickets"):
        op.create_index(
            TICKET_INDEX,
            "support_tickets",
            ["support_type", "customer_id", "project_name"],
        )
    if PRODUCT_INDEX not in index_names("support_ticket_products"):
        op.create_index(PRODUCT_INDEX, "support_ticket_products", ["product_type_id"])

    op.execute(
        sa.text(
            """
            INSERT INTO support_ticket_products (ticket_id, product_type_id, position)
            SELECT st.id, st.product_type_id, 0
            FROM support_tickets AS st
            WHERE st.support_type = '项目部署'
              AND NOT EXISTS (
                SELECT 1
                FROM support_ticket_products AS stp
                WHERE stp.ticket_id = st.id
                  AND stp.product_type_id = st.product_type_id
              )
            """
        )
    )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "support_ticket_products" in inspector.get_table_names():
        if PRODUCT_INDEX in index_names("support_ticket_products"):
            op.drop_index(PRODUCT_INDEX, table_name="support_ticket_products")
        op.drop_table("support_ticket_products")
    if TICKET_INDEX in index_names("support_tickets"):
        op.drop_index(TICKET_INDEX, table_name="support_tickets")
