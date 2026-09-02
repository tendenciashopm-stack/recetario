import requests, time
API="http://localhost:8001/api"
tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}
names=['Canapés de charqui','Olluquito de charqui','Chiriuchu','Chairo','Salmón de Salazón','Queque de chuño']
for _ in range(3):  # up to 3 passes to fill any that fail
    d=requests.get(f"{API}/admin/recipes", headers=H).json()
    pend=[]
    for n in names:
        r=[x for x in d if x['nombre_plato']==n][0]
        if len([x for x in r.get('pasos_imagenes',[]) if x]) < len(r.get('preparacion',[])):
            pend.append((r['id'],n))
    if not pend:
        print("TODO COMPLETO"); break
    for rid,n in pend:
        try:
            rr=requests.post(f"{API}/admin/recipes/{rid}/generate-steps", headers=H, timeout=300)
            r=rr.json()
            print(n, "->", len([x for x in r.get('pasos_imagenes',[]) if x]), "/", len(r.get('preparacion',[])))
        except Exception as e:
            print(n, "err", e)
print("FIN")
