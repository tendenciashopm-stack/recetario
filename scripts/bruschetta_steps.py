import os, requests
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
API="http://localhost:8001/api"
STORAGE_BASE=(os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL=STORAGE_BASE.rstrip("/")+"/objstore/api/v1/storage"
KEY=os.environ.get("EMERGENT_LLM_KEY")
APP="salud-nutrition"
RID="7da1492e-80d0-467c-93c6-5842dce94a07"
urls=[
 "https://static.prod-images.emergentagent.com/jobs/6d151a38-c124-4715-a097-51646dc7f340/images/8ad9811ee1dcc2dd138ffd1146514a6d71599082e590b66f220f43631e40671a.jpeg",
 "https://static.prod-images.emergentagent.com/jobs/6d151a38-c124-4715-a097-51646dc7f340/images/19d4a2e88b712956e9015a3f9739cd7ceac8cfe8d0345c4ed661164f6e6660aa.jpeg",
 "https://static.prod-images.emergentagent.com/jobs/6d151a38-c124-4715-a097-51646dc7f340/images/085d6cc22e53ff6301f10a60f99f4c2c0e27790b43a2093ba9bca42d21cd49fa.jpeg",
 "https://static.prod-images.emergentagent.com/jobs/6d151a38-c124-4715-a097-51646dc7f340/images/f940b1e8256f32cab11b5d63952554c1c65e12abbff4fe9576e17bfa169a6549.jpeg",
]
sk=requests.post(f"{STORAGE_URL}/init", json={"emergent_key":KEY}, timeout=30).json()["storage_key"]
paths=[]
for i,u in enumerate(urls,1):
    data=requests.get(u,timeout=60).content
    path=f"{APP}/pdf-steps/{RID}-gen{i}.jpeg"
    r=requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key":sk,"Content-Type":"image/jpeg"}, data=data, timeout=120)
    r.raise_for_status(); paths.append(r.json()["path"]); print("uploaded",path)
tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}
r=[x for x in requests.get(f"{API}/admin/recipes",headers=H).json() if x["id"]==RID][0]
body={k:r[k] for k in ["nombre_plato","categoria","descripcion","imagen_url","ingredientes","preparacion","emplatado","tiempo_preparacion","tiempo_coccion","dificultad","porciones","utensilios","nutricion","published"]}
body["pasos_imagenes"]=paths
pr=requests.put(f"{API}/admin/recipes/{RID}", headers=H, json=body, timeout=60)
print("update", pr.status_code, len(paths), "fotos")
