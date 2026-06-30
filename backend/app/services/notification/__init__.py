"""
Notification delivery services.

Re-exports the notification functions so callers can import from a single package.
For backwards compatibility with existing patch targets, the underlying functions
are also re-exported directly from alert_checker.
"""

from app.services.notification.discord import _build_discord_embed, _send_discord_notification
from app.services.notification.email import _build_email_body

__all__ = [
    "_build_discord_embed",
    "_build_email_body",
    "_send_discord_notification",
]