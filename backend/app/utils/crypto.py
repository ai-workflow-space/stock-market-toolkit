import base64
import hashlib
from cryptography.fernet import Fernet
from app.config import get_settings


def derive_key() -> bytes:
    settings = get_settings()
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt(plaintext: str) -> str:
    f = Fernet(derive_key())
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    f = Fernet(derive_key())
    return f.decrypt(ciphertext.encode()).decode()
