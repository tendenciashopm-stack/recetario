import os, re, unicodedata, json, requests
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
    r=requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key":sk,"Content-Type":ct}, data=data, timeout=120); r.raise_for_status(); return r.json()

tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}

pdf=open("/tmp/andinas.pdf","rb").read()
log("extrayendo recetas del PDF...")
er=requests.post(f"{API}/admin/pdf-extract", headers=H, files={"file":("andinas.pdf",pdf,"application/pdf")}, timeout=600)
if er.status_code!=200:
    log("ERROR extract", er.status_code, er.text[:500]); raise SystemExit
drafts=er.json().get("recipes",[])
log("recetas extraidas:", len(drafts))

doc=pymupdf.open("/tmp/andinas.pdf")
page_text=[norm(doc[i].get_text()) for i in range(doc.page_count)]
def best_page(r):
    words=set(w for ing in r.get("ingredientes",[]) for w in norm(ing).split() if len(w)>=5)
    words|=set(w for w in norm(r.get("nombre_plato","")).split() if len(w)>=4)
    best,bs=None,0
    for i,t in enumerate(page_text):
        s=sum(1 for w in words if w in t)
        if s>bs: bs,best=s,i
    return best if bs>=2 else None
def page_images(pi):
    p=doc[pi]; out=[]
    seen=set()
    for im in p.get_images(full=True):
        x=im[0]
        if x in seen: continue
        seen.add(x)
        if min(im[2],im[3])<300: continue
        out.append((im[2]*im[3],x))
    out.sort(reverse=True)
    return [x for _,x in out]

used=set()
created=0
for r in drafts:
    pg=best_page(r)
    cover=None
    if pg is not None:
        for x in page_images(pg):
            if x not in used:
                used.add(x); cover=(pg,x); break
    imagen_url=""
    if cover:
        info=doc.extract_image(cover[1]); ext=info.get("ext","jpeg")
        ct={"jpeg":"image/jpeg","jpg":"image/jpeg","png":"image/png"}.get(ext,"image/jpeg")
        p=f"{APP}/andinas-covers/{r['nombre_plato'][:20].strip().replace(' ','_')}-{cover[1]}.{ext}"
        put_object(p, info["image"], ct); imagen_url=p
    body=dict(r); body["imagen_url"]=imagen_url; body["pasos_imagenes"]=[]
    cr=requests.post(f"{API}/admin/recipes", headers=H, json=body, timeout=60)
    if cr.status_code==200:
        created+=1; log("creada:", r["nombre_plato"][:40], "| portada:", "PDF" if imagen_url else "IA", "| pasos:", len(r.get("preparacion",[])))
    else:
        log("fallo crear", cr.status_code, cr.text[:200])
log(f"DONE creadas={created} (las fotos de proceso se generan con IA en segundo plano)")
