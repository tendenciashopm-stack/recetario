import os, re, unicodedata, requests
import pymupdf
from collections import Counter
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

_sk=None
def init(force=False):
    global _sk
    if _sk and not force: return _sk
    r=requests.post(f"{STORAGE_URL}/init", json={"emergent_key":KEY}, timeout=30); r.raise_for_status()
    _sk=r.json()["storage_key"]; return _sk
def put_object(path, data, ct):
    k=init()
    r=requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key":k,"Content-Type":ct}, data=data, timeout=120)
    r.raise_for_status(); return r.json()

tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}
recipes=requests.get(f"{API}/admin/recipes", headers=H).json()
pdf_recipes=[r for r in recipes if "pdf-images/" in (r.get("imagen_url") or "")]

doc=pymupdf.open("/tmp/recetas.pdf")
freq=Counter()
for i in range(doc.page_count):
    for x in set(img[0] for img in doc[i].get_images(full=True)): freq[x]+=1
recurring=set(x for x,c in freq.items() if c>3)
page_text=[norm(doc[i].get_text()) for i in range(doc.page_count)]

def ing_page(r):
    words=set(w for ing in r.get("ingredientes",[]) for w in norm(ing).split() if len(w)>=5)
    if not words: return None
    best,bs=None,0
    for i,t in enumerate(page_text):
        s=sum(1 for w in words if w in t)
        if s>bs: bs,best=s,i
    return best if bs>=3 else None

def squares(pi):
    p=doc[pi]; out=[]
    for img in p.get_images(full=True):
        x=img[0]
        if x in recurring: continue
        w,h=img[2],img[3]
        if min(w,h)<250 or not (0.85<w/h<1.18): continue
        for rc in p.get_image_rects(x):
            out.append((round(rc.y0/5)*5, round(rc.x0), x))
    out.sort()
    seen=set(); res=[]
    for _,_,x in out:
        if x not in seen: seen.add(x); res.append(x)
    return res

for r in pdf_recipes: r["_ing"]=ing_page(r)
pdf_recipes=[r for r in pdf_recipes if r["_ing"] is not None]
pdf_recipes.sort(key=lambda r:r["_ing"])

total=0
for idx,r in enumerate(pdf_recipes):
    start=r["_ing"]
    end=(pdf_recipes[idx+1]["_ing"]-1) if idx+1<len(pdf_recipes) else min(doc.page_count-1, start+4)
    xrefs=[]
    for pi in range(start, end+1):
        for x in squares(pi):
            if x not in xrefs: xrefs.append(x)
    if not xrefs:
        log("SIN FOTOS:", r["nombre_plato"]); continue
    paths=[]
    for n,x in enumerate(xrefs, 1):
        info=doc.extract_image(x)
        ext=info.get("ext","jpeg"); ct={"jpeg":"image/jpeg","jpg":"image/jpeg","png":"image/png"}.get(ext,"image/jpeg")
        path=f"{APP}/pdf-steps/{r['id']}-{n}.{ext}"
        put_object(path, info["image"], ct)
        paths.append(path)
    body={k:r[k] for k in ["nombre_plato","categoria","descripcion","imagen_url","ingredientes","preparacion","emplatado","tiempo_preparacion","tiempo_coccion","dificultad","porciones","utensilios","nutricion","published"]}
    body["pasos_imagenes"]=paths
    pr=requests.put(f"{API}/admin/recipes/{r['id']}", headers=H, json=body, timeout=60)
    if pr.status_code==200:
        total+=1; log("OK", r["nombre_plato"][:40], "->", len(paths), "fotos de pasos")
    else:
        log("PUT FAIL", pr.status_code, pr.text[:200])
log(f"DONE recetas_actualizadas={total}")
