from inspect import iscoroutinefunction

from backend.app import database
from backend.app.main import health


def test_health_check_does_not_require_worker_threadpool():
    assert iscoroutinefunction(health)


def test_sqlite_engine_has_explicit_concurrency_headroom():
    if not database.DATABASE_URL.startswith("sqlite"):
        return

    assert database.engine.pool.size() >= 40
    assert database.engine.pool._max_overflow >= 60
    assert database.engine.pool._timeout <= 5
