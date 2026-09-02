"""
Backend API tests for Salud Nutrition
Covers: auth, recipes (public), subscription, admin (users/recipes/payments/settings/stats).
"""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Read from frontend/.env as fallback
    envp = "/app/frontend/.env"
    if os.path.exists(envp):
        for line in open(envp):
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@saludnutrition.com"
ADMIN_PASSWORD = "Admin2026!"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def client_user():
    """Create a fresh client and return its creds/token/id."""
    email = f"TEST_client_{uuid.uuid4().hex[:8]}@example.com"
    password = "Client2026!"
    r = requests.post(f"{API}/auth/register", json={"name": "Test Client", "email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"Register failed: {r.text}"
    data = r.json()
    return {"email": email, "password": password, "token": data["token"], "id": data["user"]["id"], "headers": {"Authorization": f"Bearer {data['token']}"}}


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == ADMIN_EMAIL
        assert u["role"] == "admin"

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_register_duplicate(self, client_user):
        r = requests.post(f"{API}/auth/register", json={"name": "x", "email": client_user["email"], "password": "yyy"}, timeout=15)
        assert r.status_code == 400


# ---------------- Public content ----------------
class TestPublic:
    def test_categories(self):
        r = requests.get(f"{API}/categories", timeout=15)
        assert r.status_code == 200
        cats = r.json()
        ids = [c["id"] for c in cats]
        assert set(ids) == {"diabeticos", "bajar_peso", "comida_saludable", "veganos"}

    def test_settings(self):
        r = requests.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200
        s = r.json()
        assert "precio" in s and "yape" in s

    def test_recipes_list(self):
        r = requests.get(f"{API}/recipes", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_recipes_search_quinua(self):
        r = requests.get(f"{API}/recipes", params={"q": "quinua"}, timeout=15)
        assert r.status_code == 200
        assert any("quinua" in x["nombre_plato"].lower() or "quinua" in (x.get("descripcion") or "").lower() for x in r.json())

    def test_recipes_filter_category(self):
        r = requests.get(f"{API}/recipes", params={"categoria": "veganos"}, timeout=15)
        assert r.status_code == 200
        for x in r.json():
            assert x["categoria"] == "veganos"

    def test_recipe_detail_locked_public(self):
        recipes = requests.get(f"{API}/recipes", timeout=15).json()
        rid = recipes[0]["id"]
        r = requests.get(f"{API}/recipes/{rid}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("locked") is True
        assert "preparacion" not in data or not data.get("preparacion")


# ---------------- Subscription flow ----------------
class TestSubscription:
    def test_new_user_inactive(self, client_user):
        r = requests.get(f"{API}/subscription/me", headers=client_user["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "inactive"

    def test_recipe_locked_for_inactive_client(self, client_user):
        recipes = requests.get(f"{API}/recipes", timeout=15).json()
        rid = recipes[0]["id"]
        r = requests.get(f"{API}/recipes/{rid}", headers=client_user["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json().get("locked") is True

    def test_pay_and_admin_approve_flow(self, client_user, admin_headers):
        # submit payment with a fake image file
        files = {"file": ("proof.png", io.BytesIO(b"\x89PNG\r\n\x1a\nfakepngdata"), "image/png")}
        data = {"metodo": "yape"}
        r = requests.post(f"{API}/subscription/pay", headers=client_user["headers"], files=files, data=data, timeout=60)
        assert r.status_code == 200, f"pay: {r.text}"
        payment_id = r.json()["id"]

        # subscription now pending
        r = requests.get(f"{API}/subscription/me", headers=client_user["headers"], timeout=15)
        assert r.json()["status"] == "pending"

        # admin sees payment
        r = requests.get(f"{API}/admin/payments", headers=admin_headers, params={"status": "pending"}, timeout=15)
        assert r.status_code == 200
        assert any(p["id"] == payment_id for p in r.json())

        # admin approves
        r = requests.post(f"{API}/admin/payments/{payment_id}/approve", headers=admin_headers, timeout=15)
        assert r.status_code == 200

        # client now active
        r = requests.get(f"{API}/subscription/me", headers=client_user["headers"], timeout=15)
        assert r.json()["status"] == "active"

        # full recipe unlocked
        recipes = requests.get(f"{API}/recipes", timeout=15).json()
        rid = recipes[0]["id"]
        r = requests.get(f"{API}/recipes/{rid}", headers=client_user["headers"], timeout=15)
        d = r.json()
        assert d.get("locked") is False
        assert isinstance(d.get("preparacion"), list) and len(d["preparacion"]) > 0
        assert isinstance(d.get("ingredientes"), list) and len(d["ingredientes"]) > 0


# ---------------- Admin recipes CRUD ----------------
class TestAdminRecipes:
    created_id = None

    def test_create_recipe(self, admin_headers):
        payload = {
            "nombre_plato": "TEST_Receta_QA",
            "categoria": "comida_saludable",
            "descripcion": "receta test",
            "ingredientes": ["ing1", "ing2"],
            "preparacion": ["paso 1", "paso 2"],
            "utensilios": ["sarten"],
            "published": True,
        }
        r = requests.post(f"{API}/admin/recipes", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["nombre_plato"] == "TEST_Receta_QA"
        TestAdminRecipes.created_id = data["id"]

    def test_recipe_appears_public(self):
        assert TestAdminRecipes.created_id
        recipes = requests.get(f"{API}/recipes", timeout=15).json()
        assert any(x["id"] == TestAdminRecipes.created_id for x in recipes)

    def test_invalid_category_rejected(self, admin_headers):
        r = requests.post(f"{API}/admin/recipes", headers=admin_headers, json={
            "nombre_plato": "x", "categoria": "bad"
        }, timeout=15)
        assert r.status_code == 400

    def test_delete_recipe(self, admin_headers):
        assert TestAdminRecipes.created_id
        r = requests.delete(f"{API}/admin/recipes/{TestAdminRecipes.created_id}", headers=admin_headers, timeout=15)
        assert r.status_code == 200


# ---------------- Admin users ----------------
class TestAdminUsers:
    def test_list_users(self, admin_headers):
        r = requests.get(f"{API}/admin/users", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == ADMIN_EMAIL for u in users)

    def test_create_grant_revoke_delete(self, admin_headers):
        email = f"TEST_admincreated_{uuid.uuid4().hex[:6]}@ex.com"
        r = requests.post(f"{API}/admin/users", headers=admin_headers, json={
            "name": "TestCreated", "email": email, "password": "Pass1234!", "role": "client"
        }, timeout=15)
        assert r.status_code == 200
        uid = r.json()["id"]

        r = requests.post(f"{API}/admin/users/{uid}/grant", headers=admin_headers, params={"days": 30}, timeout=15)
        assert r.status_code == 200
        assert r.json()["subscription_status"] == "active"

        r = requests.post(f"{API}/admin/users/{uid}/revoke", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["subscription_status"] == "inactive"

        r = requests.delete(f"{API}/admin/users/{uid}", headers=admin_headers, timeout=15)
        assert r.status_code == 200

    def test_non_admin_blocked(self, client_user):
        r = requests.get(f"{API}/admin/users", headers=client_user["headers"], timeout=15)
        assert r.status_code == 403


# ---------------- Admin settings ----------------
class TestAdminSettings:
    def test_update_settings(self, admin_headers):
        payload = {
            "precio": "18.50", "moneda": "PEN",
            "yape": {"numero": "111 222 333", "titular": "QA"},
            "plin": {"numero": "444", "titular": "QA"},
            "bcp": {"cuenta": "1-2-3", "cci": "0", "titular": "QA"},
            "bbva": {"cuenta": "9-9", "cci": "0", "titular": "QA"},
            "instrucciones": "test",
        }
        r = requests.put(f"{API}/admin/settings", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200
        # verify via public settings
        s = requests.get(f"{API}/settings", timeout=15).json()
        assert s["precio"] == "18.50"
        assert s["yape"]["numero"] == "111 222 333"


# ---------------- Admin stats ----------------
class TestAdminStats:
    def test_stats(self, admin_headers):
        r = requests.get(f"{API}/admin/stats", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_users", "active_subscriptions", "pending_payments", "total_recipes"]:
            assert k in d
            assert isinstance(d[k], int)
