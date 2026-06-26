import base64
import hashlib

from cryptography.fernet import Fernet
from app.config import get_settings


def _derive_key() -> bytes:
    settings = get_settings()
    key = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)


# Public alias kept for the SMTP/admin tests and callers importing the
# non-underscore name.
derive_key = _derive_key


_fernet = Fernet(_derive_key())


def encrypt(plaintext: str | None) -> str | None:
    """Encrypt a string. Returns None if input is None."""
    if plaintext is None:
        return None
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str | None) -> str | None:
    """Decrypt a string. Returns None if input is None."""
    if ciphertext is None:
        return None
    return _fernet.decrypt(ciphertext.encode()).decode()


def mask_url(url: str | None) -> str | None:
    """Mask a URL to show only the hostname, hiding path/token."""
    if not url:
        return None
    if url.startswith("http"):
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}/****"
    return "****"
