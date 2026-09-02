import os, re, sys, unicodedata, json, requests
import pymupdf
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
API = "http://localhost:8001/api"
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
KEY = os.environ.get("EMERGENT_LLM_KEY")
APP = "salud-nutrition"

def log(*a): print(*a, flush=True)

def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]", " ", s.lower())

# storage
_sk = None
def init(force=False):
    global _sk
    if _sk and not force: return _sk
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": KEY}, timeout=30); r.raise_for_status()
    _sk = r.json()["storage_key"]; return _sk
def put_object(path, data, ct):
    k = init()
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": k, "Content-Type": ct}, data=data, timeout=120)
    r.raise_for_status(); return r.json()

# login
tok = requests.post(f"{API}/auth/login", json={"email": "admin@saludnutrition.com", "password": "Admin2026!"}).json()["token"]
H = {"Authorization": f"Bearer {tok}"}
recipes = requests.get(f"{API}/admin/recipes", headers=H).json()
log("recipes in db:", len(recipes))

doc = pymupdf.open("/tmp/recetas.pdf")
from collections import Counter
freq = Counter()
for i in range(doc.page_count):
    for x in set(img[0] for img in doc[i].get_images(full=True)):
        freq[x] += 1
recurring = set(x for x, c in freq.items() if c > 3)

# per page: best non-recurring portrait image xref, and normalized text
page_text = []
page_cover = []
for i in range(doc.page_count):
    p = doc[i]
    page_text.append(norm(p.get_text()))
    cands = [(img[2]*img[3], img[0]) for img in p.get_images(full=True) if img[0] not in recurring and img[2]*img[3] > 150000]
    cands.sort(reverse=True)
    page_cover.append(cands[0][1] if cands else None)

def find_ingredients_page(recipe):
    ings = recipe.get("ingredientes", [])
    if not ings: return None
    # significant words from ingredients
    words = set()
    for ing in ings:
        for w in norm(ing).split():
            if len(w) >= 5: words.add(w)
    if not words: return None
    best, best_score = None, 0
    for i, t in enumerate(page_text):
        # only consider pages that look like ingredient pages (contain bullet-ish many matches)
        score = sum(1 for w in words if w in t)
        if score > best_score:
            best_score, best = score, i
    if best_score >= 3:
        return best
    return None

def extract_cover(ing_page):
    # cover is usually the page just before ingredients
    for cand in [ing_page - 1, ing_page, ing_page - 2]:
        if 0 <= cand < doc.page_count and page_cover[cand]:
            return page_cover[cand]
    return None

updated = 0
used_xrefs = set()
for r in recipes:
    if r.get("imagen_url"):  # keep seeds/unsplash
        continue
    ip = find_ingredients_page(r)
    if ip is None:
        log("no page match:", r["nombre_plato"]); continue
    xref = extract_cover(ip)
    if not xref or xref in used_xrefs:
        # allow reuse fallback off; try ingredients page image
        xref2 = page_cover[ip] if page_cover[ip] and page_cover[ip] not in used_xrefs else None
        xref = xref2 or xref
    if not xref:
        log("no image:", r["nombre_plato"], "ing_page", ip); continue
    try:
        info = doc.extract_image(xref)
        img_bytes, ext = info["image"], info.get("ext", "png")
        ct = {"jpeg": "image/jpeg", "jpg": "image/jpeg", "png": "image/png"}.get(ext, "image/png")
        path = f"{APP}/pdf-images/{r['id']}.{ext}"
        put_object(path, img_bytes, ct)
        body = {k: r[k] for k in ["nombre_plato","categoria","descripcion","ingredientes","preparacion","emplatado","tiempo_preparacion","tiempo_coccion","dificultad","porciones","utensilios","nutricion","published"]}
        body["imagen_url"] = path
        pr = requests.put(f"{API}/admin/recipes/{r['id']}", headers=H, json=body, timeout=60)
        if pr.status_code == 200:
            updated += 1; used_xrefs.add(xref)
            log("OK", r["nombre_plato"], "-> page", ip-1, "xref", xref, f"({len(img_bytes)}b)")
        else:
            log("put failed", pr.status_code, pr.text[:200])
    except Exception as e:
        log("err", r["nombre_plato"], e)

log(f"DONE updated={updated}")
