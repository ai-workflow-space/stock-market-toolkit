from sqlalchemy import (
    Column,
    String,
    DateTime,
    Float,
    Boolean,
    Text,
    Integer,
    ForeignKey,
)
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


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    symbol_name = Column(String, nullable=True)
    condition_type = Column(
        String, nullable=False
    )  # above, below, pct_change_up, pct_change_down
    threshold = Column(Float, nullable=False)
    period = Column(String, nullable=False, default="1h")  # 5m, 15m, 30m, 1h, 4h, 1d
    enabled = Column(Boolean, default=True)
    cooldown_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="alerts")
    triggered = relationship(
        "TriggeredAlert", back_populates="alert", cascade="all, delete-orphan"
    )


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    discord_webhook_url = Column(Text, nullable=True)
    email_address = Column(String, nullable=True)
    email_enabled = Column(Boolean, default=False)
    discord_enabled = Column(Boolean, default=True)
    default_period = Column(String, default="1h")
    timezone = Column(String, default="UTC")
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="notification_settings")


class TriggeredAlert(Base):
    __tablename__ = "triggered_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    condition_type = Column(String, nullable=False)
    trigger_price = Column(Float, nullable=False)
    threshold_value = Column(Float, nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    notified = Column(Boolean, default=False)
    read = Column(Boolean, default=False)

    user = relationship("User", back_populates="triggered_alerts")
    alert = relationship("Alert", back_populates="triggered")
    deliveries = relationship(
        "NotificationDelivery",
        back_populates="triggered_alert",
        cascade="all, delete-orphan",
    )


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    triggered_alert_id = Column(
        Integer, ForeignKey("triggered_alerts.id"), nullable=True
    )
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    channel = Column(String, nullable=False)  # discord | email | webhook
    status = Column(String, nullable=False)  # success | failed
    http_status = Column(Integer, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    triggered_alert = relationship("TriggeredAlert", back_populates="deliveries")


class InviteCode(Base):
    __tablename__ = "invite_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, index=True, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    used_by = Column(String, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
    redeemer = relationship("User", foreign_keys=[used_by])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False, index=True)
    target = Column(String, nullable=True)
    meta = Column(Text, nullable=True)
    ip = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    actor = relationship("User", foreign_keys=[actor_id])
