import os, json, asyncio, requests
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

API="http://localhost:8001/api"
KEY=os.environ.get("EMERGENT_LLM_KEY")
tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}
recipes=requests.get(f"{API}/admin/recipes",headers=H).json()

items=[{"id":r["id"],"nombre":r["nombre_plato"],"ingredientes":r.get("ingredientes",[])[:12]} for r in recipes]
PROMPT="""Eres nutricionista. Clasifica cada receta en UNA sola categoria segun sus ingredientes.
Aplica esta PRIORIDAD y equilibra el uso de las 4 categorias (todas deben tener recetas):
1. "bajar_peso": platos LIGEROS y bajos en calorias/grasa: cremas y sopas de verduras, ensaladas, chips al horno, preparaciones a la plancha o al vapor, snacks vegetales ligeros. Usa esta categoria con generosidad para lo ligero.
2. "diabeticos": salado y bajo en azucar/carbohidratos refinados, bajo indice glucemico, sin azucar añadida ni harinas blancas (huevos, pescado/pollo magro, verduras low-carb, masas de coliflor/quinoa).
3. "veganos": 100% origen vegetal (sin carne, pescado, huevo, lacteos ni miel) que NO encaje mejor en bajar_peso (ej. panes, galletas, brownies, smoothies, bebidas, bowls energeticos).
4. "comida_saludable": equilibrada del dia a dia cuando no encaje claramente en las anteriores.
Devuelve SOLO un array JSON: [{"id":"...","categoria":"..."}]. Nada mas."""

async def main():
    chat=LlmChat(api_key=KEY, session_id="clasif", system_message=PROMPT).with_model("gemini","gemini-2.5-flash")
    full=""
    async for ev in chat.stream_message(UserMessage(text="Recetas:\n"+json.dumps(items, ensure_ascii=False))):
        if isinstance(ev, TextDelta): full+=ev.content
        elif isinstance(ev, StreamDone): break
    t=full.strip()
    if "```" in t: t=t.split("```")[1].replace("json","",1)
    s=t.find("["); e=t.rfind("]")
    data=json.loads(t[s:e+1])
    m={d["id"]:d["categoria"] for d in data if d.get("categoria") in ["veganos","diabeticos","bajar_peso","comida_saludable"]}
    changed=0
    for r in recipes:
        newc=m.get(r["id"])
        if newc and newc!=r["categoria"]:
            body={k:r[k] for k in ["nombre_plato","descripcion","imagen_url","ingredientes","preparacion","pasos_imagenes","emplatado","tiempo_preparacion","tiempo_coccion","dificultad","porciones","utensilios","nutricion","published"]}
            body["categoria"]=newc
            pr=requests.put(f"{API}/admin/recipes/{r['id']}", headers=H, json=body, timeout=60)
            if pr.status_code==200: changed+=1; print(f"{r['nombre_plato'][:38]:38s} {r['categoria']:16s} -> {newc}")
    print("cambiadas:",changed)

asyncio.run(main())
