from pathlib import Path

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, inspect, text

from backend.app.database import Base


BACKEND_DIR = Path(__file__).resolve().parents[1]


def alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_migrations_upgrade_and_downgrade_fresh_database(tmp_path):
    database_url = f"sqlite:///{(tmp_path / 'fresh.db').as_posix()}"
    config = alembic_config(database_url)

    command.upgrade(config, "head")

    engine = create_engine(database_url)
    inspector = inspect(engine)
    assert "support_tickets" in inspector.get_table_names()
    assert "support_ticket_products" in inspector.get_table_names()
    ticket_indexes = {item["name"] for item in inspector.get_indexes("support_tickets")}
    product_indexes = {item["name"] for item in inspector.get_indexes("support_ticket_products")}
    assert "ix_support_tickets_type_customer_project" in ticket_indexes
    assert "ix_support_ticket_products_product_type_id" in product_indexes
    ticket_columns = {item["name"] for item in inspector.get_columns("support_tickets")}
    asset_columns = {item["name"]: item for item in inspector.get_columns("server_assets")}
    assert {"received_by_id", "received_at", "deployed_by_id", "deployed_at"} <= ticket_columns
    assert {
        "ticket_id",
        "customer_id",
        "project_name",
        "product_type_id",
        "deployed_by_id",
        "deployment_version",
    } <= asset_columns.keys()
    assert asset_columns["project_id"]["nullable"] is True

    command.downgrade(config, "base")

    assert inspect(engine).get_table_names() == ["alembic_version"]
    engine.dispose()


def test_incremental_migration_preserves_baseline_ticket(tmp_path):
    database_url = f"sqlite:///{(tmp_path / 'incremental.db').as_posix()}"
    config = alembic_config(database_url)
    command.upgrade(config, "0001_baseline")

    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO roles (id, name, data_scope, menus, credential_policy, created_at, updated_at)
                VALUES (1, '系统管理员', '全部数据', '', '可维护/审计', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO users (id, username, name, password_hash, dept, role_id, status, created_at, updated_at)
                VALUES (1, 'admin', '管理员', 'hash', '系统', 1, 'enabled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO customers (id, name, sales_name, note, created_at, updated_at)
                VALUES (1, '客户A', '', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO product_types (id, name, enabled, created_at, updated_at)
                VALUES (1, '产品A', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO support_tickets (
                    id, ticket_no, support_type, project_name, customer_id, product_type_id,
                    title, priority, env, description, status, requester_id, created_at, updated_at
                ) VALUES (
                    1, 'SUP-LEGACY-1', '项目部署', '历史项目', 1, 1,
                    '历史部署', '中', '生产', '', '待运维接收', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )

    command.upgrade(config, "head")

    with engine.connect() as connection:
        ticket_no = connection.scalar(text("SELECT ticket_no FROM support_tickets WHERE id = 1"))
        linked_product_id = connection.scalar(
            text("SELECT product_type_id FROM support_ticket_products WHERE ticket_id = 1")
        )
        version = connection.scalar(text("SELECT version_num FROM alembic_version"))
    assert ticket_no == "SUP-LEGACY-1"
    assert linked_product_id == 1
    assert version == "0005_multi_server_deployment"
    engine.dispose()


def test_existing_create_all_database_can_be_stamped_and_upgraded(tmp_path):
    database_url = f"sqlite:///{(tmp_path / 'existing.db').as_posix()}"
    engine = create_engine(database_url)
    Base.metadata.create_all(bind=engine)
    config = alembic_config(database_url)

    command.stamp(config, "0001_baseline")
    command.upgrade(config, "head")

    inspector = inspect(engine)
    assert "support_ticket_products" in inspector.get_table_names()
    assert "ix_support_tickets_type_customer_project" in {
        item["name"] for item in inspector.get_indexes("support_tickets")
    }
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "0005_multi_server_deployment"
    engine.dispose()


def test_deployment_workflow_migration_preserves_existing_asset(tmp_path):
    database_url = f"sqlite:///{(tmp_path / 'workflow.db').as_posix()}"
    config = alembic_config(database_url)
    command.upgrade(config, "0002_ticket_products")

    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO roles (id, name, data_scope, menus, credential_policy, created_at, updated_at)
                VALUES (1, '系统管理员', '全部数据', '', '可维护/审计', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO users (id, username, name, password_hash, dept, role_id, status, created_at, updated_at)
                VALUES (1, 'admin', '管理员', 'hash', '系统', 1, 'enabled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO customers (id, name, sales_name, note, created_at, updated_at)
                VALUES (1, '客户A', '', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO product_types (id, name, enabled, created_at, updated_at)
                VALUES (1, '产品A', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO projects (
                    id, customer_id, product_type_id, platform_version, online_status,
                    created_by, created_at, updated_at
                ) VALUES (
                    1, 1, 1, 'v1', '运维中', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO server_assets (
                    id, project_id, environment, inner_ip, outer_ip, hostname, os,
                    purpose, remark, created_at, updated_at
                ) VALUES (
                    1, 1, '生产', '10.0.0.1', '', 'legacy-01', 'Linux',
                    '旧资产', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )

    command.upgrade(config, "head")

    with engine.connect() as connection:
        legacy_asset = connection.execute(
            text("SELECT project_id, hostname, ticket_id FROM server_assets WHERE id = 1")
        ).mappings().one()
        version = connection.scalar(text("SELECT version_num FROM alembic_version"))
    assert dict(legacy_asset) == {"project_id": 1, "hostname": "legacy-01", "ticket_id": None}
    assert version == "0005_multi_server_deployment"

    command.downgrade(config, "0002_ticket_products")
    inspector = inspect(engine)
    assert "ticket_id" not in {item["name"] for item in inspector.get_columns("server_assets")}
    assert {item["name"]: item for item in inspector.get_columns("server_assets")}["project_id"]["nullable"] is False
    engine.dispose()


def test_multi_server_migration_allows_same_ticket_product_on_multiple_hosts(tmp_path):
    database_url = f"sqlite:///{(tmp_path / 'multi-server.db').as_posix()}"
    config = alembic_config(database_url)
    command.upgrade(config, "0004_deployment_guards")
    engine = create_engine(database_url)

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO roles (id, name, data_scope, menus, credential_policy, created_at, updated_at)
                VALUES (1, '系统管理员', '全部数据', '', '可维护/审计', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO users (id, username, name, password_hash, dept, role_id, status, created_at, updated_at)
                VALUES (1, 'admin', '管理员', 'hash', '系统', 1, 'enabled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO customers (id, name, sales_name, note, created_at, updated_at)
                VALUES (1, '客户A', '', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO product_types (id, name, enabled, created_at, updated_at)
                VALUES (1, '产品A', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO support_tickets (
                    id, ticket_no, support_type, project_name, customer_id, product_type_id,
                    title, priority, env, description, status, requester_id, created_at, updated_at
                ) VALUES (
                    1, 'SUP-GUARD-1', '项目部署', '防重项目', 1, 1,
                    '部署申请', '中', '生产', '', '部署中', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO server_assets (
                    id, ticket_id, customer_id, project_name, product_type_id, deployed_by_id,
                    environment, inner_ip, outer_ip, hostname, os, purpose,
                    deployment_version, remark, created_at, updated_at
                ) VALUES (
                    1, 1, 1, '多服务器项目', 1, 1,
                    '生产', '10.0.0.1', '', 'app-01', 'Linux', '应用',
                    'v1', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )

    command.upgrade(config, "head")

    with engine.connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "0005_multi_server_deployment"

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO server_assets (
                    ticket_id, customer_id, project_name, product_type_id, deployed_by_id,
                    environment, inner_ip, outer_ip, hostname, os, purpose,
                    deployment_version, remark, created_at, updated_at
                ) VALUES (
                    1, 1, '多服务器项目', 1, 1,
                    '生产', '10.0.0.2', '', 'app-02', 'Linux', '应用',
                    'v1', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )

    with engine.connect() as connection:
        assert connection.scalar(text("SELECT COUNT(*) FROM server_assets WHERE ticket_id = 1")) == 2
    engine.dispose()
