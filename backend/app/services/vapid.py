"""VAPID key pair generation for Web Push notifications."""
import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def generate_vapid_keys() -> tuple[str, str]:
    """Generate a VAPID key pair. Returns (private_key, public_key) as URL-safe base64 strings."""
    private_key_obj = ec.generate_private_key(ec.SECP256R1())

    raw_private = private_key_obj.private_numbers().private_value.to_bytes(32, "big")
    private_key = base64.urlsafe_b64encode(raw_private).decode("utf-8").rstrip("=")

    raw_public = private_key_obj.public_key().public_bytes(
        encoding=Encoding.X962,
        format=PublicFormat.UncompressedPoint,
    )
    public_key = base64.urlsafe_b64encode(raw_public).decode("utf-8").rstrip("=")

    return private_key, public_key


if __name__ == "__main__":
    priv, pub = generate_vapid_keys()
    print(f"VAPID_PRIVATE_KEY={priv}")
    print(f"VAPID_PUBLIC_KEY={pub}")
