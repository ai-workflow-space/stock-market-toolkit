from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import logging
from app.config import get_settings

settings = get_settings()
log = logging.getLogger(__name__)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # bootstrap_default_user disabled — first admin created via /api/auth/bootstrap
    # await bootstrap_default_user()


async def bootstrap_default_user():
    """Create a default admin account if none exists."""
    from app.models import User
    from app.auth import hash_password
    from app.config import get_settings
    import secrets

    settings = get_settings()
    admin_email = settings.ADMIN_EMAIL or "admin@stocktoolkit.local"
    admin_username = settings.ADMIN_USERNAME or "admin"
    admin_password = settings.ADMIN_PASSWORD or "Admin@1234"

    async with AsyncSessionLocal() as session:
        from sqlalchemy import select

        result = await session.execute(select(User).where(User.email == admin_email))
        existing = result.scalar_one_or_none()
        if existing:
            log.info(f"Default admin user already exists ({admin_email})")
            return

        user = User(
            id=f"admin-{secrets.token_hex(4)}",
            email=admin_email,
            username=admin_username,
            hashed_password=hash_password(admin_password),
            is_active=True,
        )
        session.add(user)
        await session.commit()
        log.info(
            f"Default admin created — email: {admin_email}, password: {admin_password}"
        )
