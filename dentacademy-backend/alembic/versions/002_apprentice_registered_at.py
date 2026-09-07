"""apprentice registration marker

Revision ID: 002_apprentice_registered_at
Revises: 001_initial_schema
Create Date: 2026-09-07

Adds apprentices.registered_at. A NULL value marks a placeholder record
created alongside a login account from the Users page, which still needs the
full registration form completed. Existing apprentices are backfilled from
created_at so they count as already registered.
"""

from alembic import op
import sqlalchemy as sa

revision = "002_apprentice_registered_at"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "apprentices",
        sa.Column("registered_at", sa.DateTime(), nullable=True),
    )
    op.execute("UPDATE apprentices SET registered_at = created_at")


def downgrade() -> None:
    op.drop_column("apprentices", "registered_at")
