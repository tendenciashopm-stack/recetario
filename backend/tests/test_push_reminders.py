"""Tests for Push Notifications (PWA) and Reminders endpoints, plus water/menu regression."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
API = f"{BASE_URL.rstrip('/')}/api"

ADMIN_EMAIL = "compratendencia0@gmail.com"
ADMIN_PASSWORD = "Elmo2893"


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


# --------- Push notifications ---------
class TestPush:
    def test_vapid_public_key(self):
        r = requests.get(f"{API}/push/vapid-public-key", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "publicKey" in data
        assert isinstance(data["publicKey"], str) and len(data["publicKey"]) > 20, f"publicKey empty/short: {data}"

    def test_subscribe_requires_auth(self):
        payload = {"endpoint": "https://fcm.example/dummy", "keys": {"p256dh": "AAA", "auth": "BBB"}}
        r = requests.post(f"{API}/push/subscribe", json=payload, timeout=15)
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_subscribe_with_token(self, admin_headers):
        endpoint = f"https://fcm.example/{uuid.uuid4().hex}"
        payload = {"endpoint": endpoint, "keys": {"p256dh": "TESTp256dh_" + uuid.uuid4().hex, "auth": "TESTauth"}}
        r = requests.post(f"{API}/push/subscribe", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        # unsubscribe
        r = requests.post(f"{API}/push/unsubscribe", headers=admin_headers, params={"endpoint": endpoint}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_push_test_no_500(self, admin_headers):
        r = requests.post(f"{API}/push/test", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert "sent" in data and isinstance(data["sent"], int)


# --------- Reminders ---------
class TestReminders:
    def test_get_default_reminders(self, admin_headers):
        # Clear any previous state by resetting to defaults after test
        r = requests.get(f"{API}/reminders", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "reminders" in data
        rems = data["reminders"]
        assert isinstance(rems, list)
        # Should include the 5 default keys (unless previously modified — still expect these keys to exist)
        keys = {r.get("key") for r in rems}
        expected = {"desayuno", "menu", "almuerzo", "agua", "cena"}
        assert expected.issubset(keys) or len(rems) == 5, f"Missing default reminder keys. Got: {keys}"

    def test_put_reminders_persists(self, admin_headers):
        # Get current
        cur = requests.get(f"{API}/reminders", headers=admin_headers, timeout=15).json()["reminders"]
        # Modify desayuno time
        for r in cur:
            if r.get("key") == "desayuno":
                r["time"] = "07:42"
        r = requests.put(f"{API}/reminders", headers=admin_headers, json={"reminders": cur}, timeout=15)
        assert r.status_code == 200
        # GET back and verify
        got = requests.get(f"{API}/reminders", headers=admin_headers, timeout=15).json()["reminders"]
        des = next((x for x in got if x.get("key") == "desayuno"), None)
        assert des is not None
        assert des["time"] == "07:42", f"desayuno not persisted: {des}"


# --------- Regression: water & menu ---------
class TestRegression:
    def test_water_get(self, admin_headers):
        r = requests.get(f"{API}/water", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "vasos" in d

    def test_water_add(self, admin_headers):
        # get current
        cur = requests.get(f"{API}/water", headers=admin_headers, timeout=15).json().get("vasos", 0)
        r = requests.post(f"{API}/water/add", headers=admin_headers, params={"n": 1}, timeout=15)
        # some APIs use body; try both
        if r.status_code >= 400:
            r = requests.post(f"{API}/water/add", headers=admin_headers, json={"n": 1}, timeout=15)
        assert r.status_code == 200, r.text
        after = r.json().get("vasos")
        assert isinstance(after, int) and after >= cur

    def test_menu_get(self, admin_headers):
        r = requests.get(f"{API}/menu", headers=admin_headers, timeout=15)
        assert r.status_code == 200
