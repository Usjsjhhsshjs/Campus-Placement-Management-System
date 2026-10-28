from alembic import command
from sqlalchemy import inspect

from app.core.database import Base, engine
from tests.conftest import alembic_config


def test_migration_creates_every_model_table():
    assert set(Base.metadata.tables) <= set(inspect(engine).get_table_names())


def test_migration_downgrades_and_upgrades_from_clean():
    command.downgrade(alembic_config(), "base")
    assert "users" not in inspect(engine).get_table_names()
    command.upgrade(alembic_config(), "head")
    assert "users" in inspect(engine).get_table_names()
