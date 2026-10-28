"""Tests run against a SEPARATE PostgreSQL database (name must end with _test)."""
import os
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent

env_file = BACKEND / ".env.test"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

TEST_URL = os.environ.get("TEST_DATABASE_URL", "")
if not TEST_URL:
    pytest.exit("Set TEST_DATABASE_URL (copy backend/.env.test.example to backend/.env.test).", returncode=2)
if not TEST_URL.split("?")[0].rstrip("/").endswith("_test"):
    pytest.exit("Refusing to run: the test database name must end with '_test'.", returncode=2)

os.environ["DATABASE_URL"] = TEST_URL
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production-use-1234567890")
os.environ["UPLOAD_DIR"] = str(BACKEND / "uploads_test")
os.environ["APP_ENV"] = "test"
os.environ["RESEND_API_KEY"] = ""

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.database import Base, engine  # noqa: E402
import app.models  # noqa: E402,F401
from app.main import app  # noqa: E402


def alembic_config() -> Config:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "migrations"))
    return cfg


def wipe_database() -> None:
    Base.metadata.drop_all(engine)
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))


@pytest.fixture(scope="session", autouse=True)
def database():
    """Build the schema with the real Alembic migration (this also tests the migration)."""
    wipe_database()
    command.upgrade(alembic_config(), "head")
    yield


@pytest.fixture(autouse=True)
def clean_tables(database):
    tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture()
def client():
    return TestClient(app)
