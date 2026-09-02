import os, sys, json, requests

API = "http://localhost:8001/api"
PDF_URL = "https://customer-assets-gfyr7b9c.emergentagent.net/job_nutrition-recipe-app-3/artifacts/5v60bm5r_519637800-25-Recetas-de-Brunch-Saludables.pdf"

def log(*a): print(*a, flush=True)

# login
r = requests.post(f"{API}/auth/login", json={"email": "admin@saludnutrition.com", "password": "Admin2026!"})
r.raise_for_status()
token = r.json()["token"]
H = {"Authorization": f"Bearer {token}"}
log("logged in")

# download pdf
pdf = requests.get(PDF_URL, timeout=120).content
open("/tmp/recetas.pdf", "wb").write(pdf)
log("pdf downloaded", len(pdf), "bytes")

# extract
files = {"file": ("recetas.pdf", pdf, "application/pdf")}
er = requests.post(f"{API}/admin/pdf-extract", headers=H, files=files, timeout=600)
log("extract status", er.status_code)
if er.status_code != 200:
    log("ERROR", er.text[:2000]); sys.exit(1)
data = er.json()
recipes = data.get("recipes", [])
log("extracted", len(recipes), "recipes")

saved = 0
for rec in recipes:
    try:
        sr = requests.post(f"{API}/admin/recipes", headers=H, json=rec, timeout=60)
        if sr.status_code == 200:
            saved += 1
            log("saved:", rec.get("nombre_plato"))
        else:
            log("save failed", sr.status_code, sr.text[:300])
    except Exception as e:
        log("save exception", e)

log(f"DONE saved={saved}/{len(recipes)}")
