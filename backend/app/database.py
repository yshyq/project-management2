import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import QueuePool, StaticPool


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend/dev.db")

IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_MEMORY_SQLITE = DATABASE_URL in {"sqlite://", "sqlite:///:memory:"} or DATABASE_URL.endswith(":memory:")

connect_args = {}
engine_options = {"pool_pre_ping": True}

if IS_SQLITE:
    connect_args = {
        "check_same_thread": False,
        "timeout": int(os.getenv("SQLITE_BUSY_TIMEOUT_SECONDS", "5")),
    }
    if IS_MEMORY_SQLITE:
        engine_options["poolclass"] = StaticPool
    else:
        engine_options.update(
            {
                "poolclass": QueuePool,
                "pool_size": int(os.getenv("DB_POOL_SIZE", "40")),
                "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "60")),
                "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT_SECONDS", "5")),
            }
        )

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
