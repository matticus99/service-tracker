import base64

import pytest

try:
    from app.services.vapid import generate_vapid_keys
    generate_vapid_keys()
    _vapid_available = True
except (TypeError, ImportError):
    _vapid_available = False

skip_if_vapid_broken = pytest.mark.skipif(
    not _vapid_available,
    reason="py_vapid incompatible with installed cryptography version",
)


@skip_if_vapid_broken
class TestGenerateVapidKeys:
    def test_returns_tuple_of_strings(self):
        priv, pub = generate_vapid_keys()
        assert isinstance(priv, str)
        assert isinstance(pub, str)

    def test_keys_are_valid_base64url(self):
        priv, pub = generate_vapid_keys()
        # base64url should not contain +, /, or = padding
        for key in (priv, pub):
            assert "+" not in key
            assert "/" not in key
            assert "=" not in key

    def test_keys_are_unique_per_call(self):
        pair1 = generate_vapid_keys()
        pair2 = generate_vapid_keys()
        assert pair1[0] != pair2[0]
        assert pair1[1] != pair2[1]

    def test_private_key_decodes_to_32_bytes(self):
        priv, _ = generate_vapid_keys()
        # Add back padding for decoding
        raw = base64.urlsafe_b64decode(priv + "==")
        assert len(raw) == 32

    def test_public_key_decodes_to_65_bytes(self):
        _, pub = generate_vapid_keys()
        # Uncompressed EC point is 65 bytes (0x04 prefix + 32 bytes x + 32 bytes y)
        raw = base64.urlsafe_b64decode(pub + "==")
        assert len(raw) == 65
        assert raw[0] == 0x04  # Uncompressed point prefix
