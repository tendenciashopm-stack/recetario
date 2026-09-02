import os, requests, pymupdf
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
API="http://localhost:8001/api"
STORAGE_BASE=(os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL=STORAGE_BASE.rstrip("/")+"/objstore/api/v1/storage"
KEY=os.environ.get("EMERGENT_LLM_KEY")
APP="salud-nutrition"
sk=requests.post(f"{STORAGE_URL}/init", json={"emergent_key":KEY}, timeout=30).json()["storage_key"]
def put_object(path,data,ct):
    r=requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key":sk,"Content-Type":ct}, data=data, timeout=120); r.raise_for_status(); return r.json()["path"]
tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}
doc=pymupdf.open("/tmp/andinas.pdf")
def cover(xref,name):
    info=doc.extract_image(xref); ext=info.get("ext","jpeg")
    return put_object(f"{APP}/andinas-covers/{name}-{xref}.{ext}", info["image"], "image/jpeg" if ext in("jpeg","jpg") else "image/png")

recetas=[
 {"nombre_plato":"Chicha de Jora","categoria":"veganos","descripcion":"Bebida ancestral andina de maíz de jora fermentado con especias, refrescante y tradicional.",
  "imagen_url":cover(70,"chicha_jora"),
  "ingredientes":["Maíz de jora (maíz morado)","Canela","Clavo de olor","Cáscara de plátano","Cáscara de naranja","Agua"],
  "preparacion":["Hacer hervir el maíz morado con canela, clavo, cáscara de plátano y cáscara de naranja.","Cocinar hasta que suelte todo su color y aroma.","Colar la preparación y dejar entibiar.","Colocar en un balde limpio y tapar bien.","Dejar fermentar hasta obtener el punto deseado.","Servir bien fría."],
  "emplatado":"Servir en vaso o mate de barro, bien fría, como refresco tradicional.",
  "tiempo_preparacion":"20 min","tiempo_coccion":"40 min","dificultad":"Media","porciones":"6 porciones",
  "utensilios":["Olla grande","Colador","Balde con tapa","Cuchara de madera"],"nutricion":{},"published":True,"pasos_imagenes":[]},
 {"nombre_plato":"Chicha Morada","categoria":"veganos","descripcion":"Refresco andino de maíz morado hervido con canela y un toque de limón, dulce y aromático.",
  "imagen_url":cover(72,"chicha_morada"),
  "ingredientes":["Maíz morado","Canela","Azúcar","1 limón","Agua"],
  "preparacion":["Hacer hervir el maíz morado con canela y azúcar.","Cocinar hasta que el agua tome un color morado intenso.","Colar y dejar enfriar.","Al terminar, agregar el jugo de un limón.","Servir con hielo."],
  "emplatado":"Servir bien fría en vaso con hielo.",
  "tiempo_preparacion":"15 min","tiempo_coccion":"40 min","dificultad":"Fácil","porciones":"6 porciones",
  "utensilios":["Olla grande","Colador","Jarra","Cuchara de madera"],"nutricion":{},"published":True,"pasos_imagenes":[]},
]
for r in recetas:
    cr=requests.post(f"{API}/admin/recipes", headers=H, json=r, timeout=60)
    print(r["nombre_plato"], cr.status_code)
print("DONE")
