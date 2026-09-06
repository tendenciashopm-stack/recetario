import requests, unicodedata, re
API="http://localhost:8001/api"
def norm(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode()
    return s.lower()
tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}
featured=["arroz tropical","causa limena","pizza de quinoa","lasana mixta","pasta alfredo",
          "pollo al curry con almendras","salmon naranjoso","zucchini pasta con salsa mediterranea",
          "pastel de sushi","bowl de quinoa"]
recs=requests.get(f"{API}/admin/recipes", headers=H).json()
targets=[]
for f in featured:
    for r in recs:
        if f in norm(r["nombre_plato"]):
            targets.append((r["id"], r["nombre_plato"])); break
print("seleccionadas:", len(targets))
for _ in range(3):
    d={r["id"]:r for r in requests.get(f"{API}/admin/recipes", headers=H).json()}
    pend=[(rid,n) for rid,n in targets if len([x for x in d[rid].get("pasos_imagenes",[]) if x]) < len(d[rid].get("preparacion",[]))]
    if not pend: print("COMPLETO"); break
    for rid,n in pend:
        try:
            rr=requests.post(f"{API}/admin/recipes/{rid}/generate-steps", headers=H, timeout=300).json()
            print(n[:38], "->", len([x for x in rr.get("pasos_imagenes",[]) if x]), "/", len(rr.get("preparacion",[])))
        except Exception as e:
            print(n[:38], "err", e)
print("FIN")
