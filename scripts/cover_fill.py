import os, base64, asyncio, requests
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
from emergentintegrations.llm.chat import LlmChat, UserMessage
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

async def gen(prompt):
    chat=LlmChat(api_key=KEY, session_id="cov", system_message="Fotografo gastronomico profesional, fotos apetitosas realistas, sin texto.").with_model("gemini","gemini-3.1-flash-image-preview").with_params(modalities=["image","text"])
    _,imgs=await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not imgs: return None
    return base64.b64decode(imgs[0]["data"])

async def main():
    recs=requests.get(f"{API}/admin/recipes", headers=H).json()
    faltan=[r for r in recs if not r.get("imagen_url")]
    print("sin portada:", len(faltan))
    for r in faltan:
        data=await gen(f"Fotografía gastronómica cenital profesional del plato terminado '{r['nombre_plato']}', comida saludable, apetitoso, luz natural, fondo limpio, sin texto.")
        if not data: print("fallo", r["nombre_plato"]); continue
        p=put_object(f"{APP}/gen-covers/{r['id']}.png", data, "image/png")
        body={k:r[k] for k in ["nombre_plato","categoria","descripcion","ingredientes","preparacion","pasos_imagenes","emplatado","tiempo_preparacion","tiempo_coccion","dificultad","porciones","utensilios","nutricion","published"]}
        body["imagen_url"]=p
        requests.put(f"{API}/admin/recipes/{r['id']}?auto_generate=false", headers=H, json=body, timeout=60)
        print("portada IA:", r["nombre_plato"][:40])
    print("DONE")
asyncio.run(main())
