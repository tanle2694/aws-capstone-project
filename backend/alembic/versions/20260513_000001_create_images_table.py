"""create images table"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260513_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "images",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=True),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_path"),
    )
    op.create_index("ix_images_created_at", "images", ["created_at"], unique=False)
    op.create_index("ix_images_owner_id", "images", ["owner_id"], unique=False)
    op.create_index("ix_images_tags", "images", ["tags"], unique=False, postgresql_using="gin")


def downgrade() -> None:
    op.drop_index("ix_images_tags", table_name="images")
    op.drop_index("ix_images_owner_id", table_name="images")
    op.drop_index("ix_images_created_at", table_name="images")
    op.drop_table("images")
