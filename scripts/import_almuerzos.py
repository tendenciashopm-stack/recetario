import os, re, unicodedata, json, requests, io
import pymupdf
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
API="http://localhost:8001/api"
STORAGE_BASE=(os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL=STORAGE_BASE.rstrip("/")+"/objstore/api/v1/storage"
KEY=os.environ.get("EMERGENT_LLM_KEY")
APP="salud-nutrition"
def log(*a): print(*a, flush=True)
def norm(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode()
    return re.sub(r"[^a-z0-9 ]"," ",s.lower())
sk=requests.post(f"{STORAGE_URL}/init", json={"emergent_key":KEY}, timeout=30).json()["storage_key"]
def put_object(path,data,ct):
    r=requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key":sk,"Content-Type":ct}, data=data, timeout=120); r.raise_for_status(); return r.json()["path"]
tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}

doc=pymupdf.open("/tmp/almuerzos.pdf")
page_text=[norm(doc[i].get_text()) for i in range(doc.page_count)]

chunks=[(8,24),(25,40),(41,56),(57,70)]
all_recipes=[]
for a,b in chunks:
    nd=pymupdf.open(); nd.insert_pdf(doc, from_page=a, to_page=b)
    buf=nd.tobytes(); nd.close()
    log(f"extrayendo paginas {a}-{b} ({len(buf)} bytes)...")
    er=requests.post(f"{API}/admin/pdf-extract", headers=H, files={"file":(f"chunk_{a}_{b}.pdf",buf,"application/pdf")}, timeout=600)
    if er.status_code!=200:
        log("  ERROR", er.status_code, er.text[:300]); continue
    recs=er.json().get("recipes",[])
    log(f"  -> {len(recs)} recetas")
    all_recipes+=recs

# dedupe by name
seen=set(); recipes=[]
for r in all_recipes:
    k=norm(r.get("nombre_plato",""))
    if not k or k in seen: continue
    seen.add(k); recipes.append(r)
log("total unicas:", len(recipes))

def best_page(r):
    words=set(w for ing in r.get("ingredientes",[]) for w in norm(ing).split() if len(w)>=5)
    words|=set(w for w in norm(r.get("nombre_plato","")).split() if len(w)>=4)
    best,bs=None,0
    for i,t in enumerate(page_text):
        s=sum(1 for w in words if w in t)
        if s>bs: bs,best=s,i
    return best if bs>=2 else None
def page_img(pi,used):
    p=doc[pi]
    for im in sorted(p.get_images(full=True), key=lambda z:z[2]*z[3], reverse=True):
        if im[0] in used: continue
        if min(im[2],im[3])<250: continue
        return im[0]
    return None

used=set(); created=0
for r in recipes:
    pg=best_page(r); imagen_url=""
    if pg is not None:
        x=page_img(pg,used)
        if x:
            used.add(x); info=doc.extract_image(x); ext=info.get("ext","jpeg")
            ct="image/jpeg" if ext in("jpeg","jpg") else "image/png"
            nm=re.sub(r'[^a-zA-Z0-9]','_',r['nombre_plato'])[:24]
            imagen_url=put_object(f"{APP}/almuerzos-covers/{nm}-{x}.{ext}", info["image"], ct)
    body=dict(r); body["imagen_url"]=imagen_url; body["pasos_imagenes"]=[]
    cr=requests.post(f"{API}/admin/recipes?auto_generate=false", headers=H, json=body, timeout=60)
    if cr.status_code==200:
        created+=1; log("creada:", r["nombre_plato"][:40], "| portada:", "PDF" if imagen_url else "no")
    else:
        log("fallo", cr.status_code, cr.text[:150])
log(f"DONE creadas={created}")
