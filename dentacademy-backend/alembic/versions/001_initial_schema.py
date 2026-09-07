"""initial schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-08-11

Initial DentAcademy v1.0 schema.
The table definitions are authoritative in the SQLAlchemy models;
this migration materialises them so the schema is fully migration-managed.
"""

from alembic import op
import sqlalchemy as sa
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from database import Base
import models  # noqa: F401  (registers all tables on Base.metadata)

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_update")
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_delete")
    op.execute(
        "CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log "
        "FOR EACH ROW SIGNAL SQLSTATE '45000' "
        "SET MESSAGE_TEXT = 'audit_log is INSERT-ONLY; updates are forbidden'"
    )
    op.execute(
        "CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log "
        "FOR EACH ROW SIGNAL SQLSTATE '45000' "
        "SET MESSAGE_TEXT = 'audit_log is INSERT-ONLY; deletes are forbidden'"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_delete")
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_update")
    Base.metadata.drop_all(bind=op.get_bind())