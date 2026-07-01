import logging
from email.mime.text import MIMEText
from typing import Any

import aiosmtplib

from app.utils.crypto import decrypt

log = logging.getLogger(__name__)


class SMTPCredentials:
    """Duck-typed SMTP config accepted by send_email / send_test_email."""

    host: str
    port: int
    use_tls: bool
    username: str | None
    password_encrypted: str | None
    from_address: str
    reply_to: str | None


async def send_email(cfg: Any, to: str, subject: str, html_body: str) -> bool:
    msg = MIMEText(html_body, "html")
    msg["Subject"] = subject
    msg["From"] = cfg.from_address
    msg["To"] = to
    if cfg.reply_to:
        msg["Reply-To"] = cfg.reply_to

    password = None
    if cfg.password_encrypted:
        try:
            password = decrypt(cfg.password_encrypted)
        except Exception:
            log.error("Failed to decrypt SMTP password")
            return False

    try:
        await aiosmtplib.send(
            msg,
            hostname=cfg.host,
            port=cfg.port,
            username=cfg.username,
            password=password,
            use_tls=cfg.use_tls,
            timeout=30,
        )
        return True
    except Exception as e:
        log.error(f"Failed to send email via SMTP: {e}")
        return False


async def send_test_email(cfg: Any, to: str) -> tuple[bool, str]:
    try:
        success = await send_email(
            cfg,
            to=to,
            subject="Stock Market Toolkit — SMTP Test",
            html_body="<h1>SMTP Test</h1><p>If you received this, your SMTP settings are working correctly.</p>",
        )
        if success:
            return (True, "Test email sent successfully")
        else:
            return (False, "Failed to send test email")
    except Exception as e:
        return (False, str(e))
