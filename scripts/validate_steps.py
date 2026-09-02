import os, re, unicodedata, requests
import pymupdf
from collections import Counter

API = "http://localhost:8001/api"
def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]", " ", s.lower())

tok = requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H = {"Authorization": f"Bearer {tok}"}
recipes = requests.get(f"{API}/admin/recipes", headers=H).json()
pdf_recipes = [r for r in recipes if "pdf-images/" in (r.get("imagen_url") or "")]

doc = pymupdf.open("/tmp/recetas.pdf")
freq = Counter()
for i in range(doc.page_count):
    for x in set(img[0] for img in doc[i].get_images(full=True)): freq[x]+=1
recurring = set(x for x,c in freq.items() if c>3)
page_text=[norm(doc[i].get_text()) for i in range(doc.page_count)]

def ing_page(r):
    words=set(w for ing in r.get("ingredientes",[]) for w in norm(ing).split() if len(w)>=5)
    if not words: return None
    best,bs=None,0
    for i,t in enumerate(page_text):
        s=sum(1 for w in words if w in t)
        if s>bs: bs,best=s,i
    return best if bs>=3 else None

# square step photos per page in reading order
def squares(pi):
    if pi<0 or pi>=doc.page_count: return []
    p=doc[pi]; out=[]
    for img in p.get_images(full=True):
        xref=img[0]
        if xref in recurring: continue
        w,h=img[2],img[3]
        if min(w,h)<300 or not (0.75<w/h<1.34): continue
        for rc in p.get_image_rects(xref):
            out.append((rc.y0,rc.x0,xref))
    out.sort()
    return [x[2] for x in out]

# map ing pages
for r in pdf_recipes:
    r["_ing"]=ing_page(r)
pdf_recipes=[r for r in pdf_recipes if r["_ing"] is not None]
pdf_recipes.sort(key=lambda r:r["_ing"])
ings=[r["_ing"] for r in pdf_recipes]

for idx,r in enumerate(pdf_recipes):
    start=r["_ing"]+1
    end = (pdf_recipes[idx+1]["_ing"]-2) if idx+1<len(pdf_recipes) else min(doc.page_count-1,start+3)
    xrefs=[]
    for pi in range(start,end+1):
        xrefs+=squares(pi)
    print(f"{r['nombre_plato'][:40]:40s} ing_p{r['_ing']:3d} pasos_txt={len(r.get('preparacion',[])):2d} fotos={len(xrefs)} paginas[{start}-{end}]")
