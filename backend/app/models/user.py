from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # watchlists = relationship("Watchlist", back_populates="user")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    notification_settings = relationship(
        "NotificationSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    triggered_alerts = relationship(
        "TriggeredAlert", back_populates="user", cascade="all, delete-orphan"
    )
