import os, json, asyncio, requests
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
API="http://localhost:8001/api"
KEY=os.environ.get("EMERGENT_LLM_KEY")
def log(*a): print(*a, flush=True)
tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}

def missing(r):
    n=r.get("nutricion") or {}
    return not str(n.get("calorias","")).strip()

PROMPT="""Eres nutricionista. Para cada receta, ESTIMA la información nutricional POR PORCIÓN según sus ingredientes.
Devuelve SOLO un array JSON: [{"id":"...","calorias":"XXX kcal","proteinas":"XX g","carbohidratos":"XX g","grasas":"XX g","fibra":"XX g"}]
Usa números realistas. calorias en 'kcal', el resto en 'g'. Nada de texto extra."""

async def estimate(batch):
    chat=LlmChat(api_key=KEY, session_id="nutri", system_message=PROMPT).with_model("gemini","gemini-2.5-flash")
    items=[{"id":r["id"],"nombre":r["nombre_plato"],"ingredientes":r.get("ingredientes",[])[:14]} for r in batch]
    full=""
    async for ev in chat.stream_message(UserMessage(text=json.dumps(items, ensure_ascii=False))):
        if isinstance(ev,TextDelta): full+=ev.content
        elif isinstance(ev,StreamDone): break
    t=full.strip()
    if "```" in t: t=t.split("```")[1].replace("json","",1)
    s=t.find("["); e=t.rfind("]")
    return json.loads(t[s:e+1])

async def main():
    recs=requests.get(f"{API}/admin/recipes", headers=H).json()
    todo=[r for r in recs if missing(r)]
    log("sin nutricion:", len(todo))
    byid={r["id"]:r for r in recs}
    updated=0
    for i in range(0,len(todo),15):
        batch=todo[i:i+15]
        try:
            data=await estimate(batch)
        except Exception as ex:
            log("batch err", ex); continue
        for d in data:
            r=byid.get(d.get("id"))
            if not r: continue
            nut={k:str(d.get(k,"")) for k in ["calorias","proteinas","carbohidratos","grasas","fibra"]}
            body={k:r[k] for k in ["nombre_plato","categoria","descripcion","imagen_url","ingredientes","preparacion","pasos_imagenes","emplatado","tiempo_preparacion","tiempo_coccion","dificultad","porciones","utensilios","published"]}
            body["nutricion"]=nut
            pr=requests.put(f"{API}/admin/recipes/{r['id']}?auto_generate=false", headers=H, json=body, timeout=60)
            if pr.status_code==200: updated+=1
        log(f"lote {i//15+1}: total actualizadas={updated}")
    log("DONE updated=",updated)

asyncio.run(main())
