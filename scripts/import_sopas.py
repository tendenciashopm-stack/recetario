import os, requests
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

API = "http://localhost:8001/api"
ADMIN_EMAIL = "compratendencia0@gmail.com"
ADMIN_PASS = "Elmo2893"

def log(*a): print(*a, flush=True)

tok = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}).json()["token"]
H = {"Authorization": f"Bearer {tok}"}

def N(cal, p, c, g, f):
    return {"calorias": f"{cal} kcal", "proteinas": f"{p} g", "carbohidratos": f"{c} g", "grasas": f"{g} g", "fibra": f"{f} g"}

RECIPES = [
    {"nombre_plato": "Sopa Casera de Pollo con Verduras", "categoria": "comida_saludable",
     "descripcion": "Sopa reconfortante y casera que combina tiernos trozos de pollo con verduras frescas, nutritiva y llena de sabor.",
     "ingredientes": ["500 g de pechuga de pollo", "2 zanahorias en rodajas", "2 ramas de apio picado", "2 papas medianas en cubos", "1 choclo en rodajas", "1 cebolla", "3 dientes de ajo", "Sal, pimienta y culantro al gusto", "1.5 litros de agua"],
     "preparacion": ["Dorar la cebolla y el ajo en una olla con un chorrito de aceite.", "Agregar el pollo y sellar por 3 minutos.", "Añadir el agua y llevar a hervor.", "Incorporar zanahoria, apio, papa y choclo.", "Cocinar 25 minutos a fuego medio.", "Sazonar y añadir culantro al servir."],
     "tiempo_preparacion": "35 min", "porciones": "4", "nutricion": N(220, 22, 20, 6, 4)},

    {"nombre_plato": "Caldo de Pollo con Verduras", "categoria": "bajar_peso",
     "descripcion": "Caldo nutritivo y ligero, ideal para extraer el colágeno del pollo y combinarlo con vegetales enteros.",
     "ingredientes": ["1 kg de huesos y trozos de pollo con piel", "2 zanahorias enteras", "2 ramas de apio", "1 poro (parte blanca)", "1 nabo pequeño", "3 dientes de ajo", "1 cebolla entera", "Sal, pimienta en grano y laurel", "2 litros de agua"],
     "preparacion": ["Hervir el pollo con agua fría desde el inicio para extraer colágeno.", "Espumar el caldo durante los primeros 10 minutos.", "Agregar todas las verduras enteras, ajo y especias.", "Cocinar a fuego lento por 45 minutos.", "Colar el caldo y servir con verduras troceadas."],
     "tiempo_preparacion": "55 min", "porciones": "4", "nutricion": N(150, 18, 8, 5, 2)},

    {"nombre_plato": "Sopa de Quinua con Verduras", "categoria": "veganos",
     "descripcion": "Sopa vibrante y llena de nutrientes donde la quinua se combina con vegetales frescos, un plato completo y saludable.",
     "ingredientes": ["3/4 taza de quinua lavada", "2 zanahorias en cubos", "1 taza de espinaca fresca", "2 papas en cubos", "1 cebolla", "2 tomates", "3 dientes de ajo", "1 cucharada de aceite de oliva", "Sal, pimienta y orégano al gusto", "1.5 litros de agua o caldo natural"],
     "preparacion": ["Preparar un aderezo con cebolla, ajo y tomate en aceite.", "Agregar agua o caldo y llevar a hervor.", "Incorporar la quinua y cocinar 10 minutos.", "Añadir zanahoria y papa; cocinar 15 minutos más.", "Al final, agregar la espinaca y sazonar."],
     "tiempo_preparacion": "35 min", "porciones": "4", "nutricion": N(230, 8, 38, 6, 6)},

    {"nombre_plato": "Sopa de Lentejas", "categoria": "veganos",
     "descripcion": "Sopa sustanciosa y nutritiva a base de lentejas, con zanahoria y apio para un sabor y textura más completos.",
     "ingredientes": ["1 taza de lentejas remojadas", "2 zanahorias en cubos", "1 rama de apio picado", "2 tomates pelados y picados", "1 cebolla", "3 dientes de ajo", "1 hoja de laurel", "Sal, comino y pimienta al gusto", "1.5 litros de agua"],
     "preparacion": ["Sofreír cebolla, ajo y tomate hasta que estén suaves.", "Añadir las lentejas escurridas y el laurel.", "Agregar agua y hervir por 5 minutos a fuego alto.", "Incorporar zanahoria y apio; cocinar 20 minutos a fuego medio.", "Sazonar con sal y comino al gusto."],
     "tiempo_preparacion": "40 min", "porciones": "4", "nutricion": N(250, 14, 40, 4, 9)},

    {"nombre_plato": "Sopa de Verduras con Huevo", "categoria": "comida_saludable",
     "descripcion": "Sopa nutritiva y completa que combina vegetales frescos con la proteína del huevo escalfado en la sopa.",
     "ingredientes": ["4 huevos frescos", "2 zanahorias en rodajas", "1 taza de espinaca", "2 papas en cubos", "1 choclo desgranado", "1 cebolla", "2 dientes de ajo", "Sal, pimienta y culantro fresco", "1.5 litros de agua"],
     "preparacion": ["Preparar aderezo con cebolla y ajo en aceite caliente.", "Añadir agua y llevar a ebullición.", "Incorporar zanahoria, papa y choclo; cocinar 15 minutos.", "Agregar la espinaca y cocinar 3 minutos más.", "Casquear los huevos directamente en la sopa y cocinar 4 minutos.", "Servir con culantro fresco picado."],
     "tiempo_preparacion": "30 min", "porciones": "4", "nutricion": N(200, 10, 22, 8, 5)},

    {"nombre_plato": "Crema de Zapallo", "categoria": "veganos",
     "descripcion": "Crema suave y aterciopelada de zapallo, enriquecida con zanahoria y apio, de sabor dulce y natural.",
     "ingredientes": ["600 g de zapallo macre en cubos", "1 cebolla picada", "3 dientes de ajo", "1 zanahoria", "1 rama de apio", "1 cucharada de aceite de oliva", "Sal, pimienta y nuez moscada", "1 litro de agua o caldo de verduras"],
     "preparacion": ["Dorar cebolla y ajo en aceite de oliva.", "Agregar zapallo, zanahoria y apio; saltear 3 minutos.", "Añadir el caldo y cocinar 20 minutos hasta que estén tiernos.", "Licuar todo hasta obtener una crema homogénea.", "Volver al fuego, sazonar y servir con un hilo de aceite."],
     "tiempo_preparacion": "35 min", "porciones": "4", "nutricion": N(150, 4, 22, 6, 4)},

    {"nombre_plato": "Crema de Brócoli", "categoria": "bajar_peso",
     "descripcion": "Crema vibrante y nutritiva de brócoli, que usa la papa como espesante natural para una textura sedosa, sin harinas.",
     "ingredientes": ["1 brócoli grande (500 g) en ramilletes", "1 papa mediana en cubos", "1 cebolla picada", "3 dientes de ajo", "1 cucharada de aceite de oliva", "Sal y pimienta blanca al gusto", "1 litro de caldo de pollo o verduras"],
     "preparacion": ["Sofreír cebolla y ajo hasta transparentar.", "Añadir el brócoli y la papa; cocinar 2 minutos.", "Verter el caldo y hervir 18 minutos.", "Licuar hasta lograr una crema suave y uniforme.", "Sazonar, calentar nuevamente y servir de inmediato."],
     "tiempo_preparacion": "30 min", "porciones": "4", "nutricion": N(140, 6, 18, 5, 5)},

    {"nombre_plato": "Crema de Verduras", "categoria": "veganos",
     "descripcion": "Crema reconfortante que combina la dulzura del zapallo con zanahoria, espinaca y papa, cremosa y nutritiva.",
     "ingredientes": ["2 zanahorias en cubos", "1 taza de zapallo en cubos", "1 taza de espinaca fresca", "2 papas medianas", "1 rama de apio", "1 cebolla", "3 dientes de ajo", "Sal, pimienta y aceite de oliva", "1.2 litros de agua"],
     "preparacion": ["Preparar un aderezo base con cebolla y ajo en aceite.", "Agregar zanahoria, zapallo, papa y apio; saltear 3 minutos.", "Añadir agua y cocinar 20 minutos a fuego medio.", "Incorporar espinaca al final y cocinar 2 minutos.", "Licuar todo y rectificar la sazón al servir."],
     "tiempo_preparacion": "35 min", "porciones": "4", "nutricion": N(160, 5, 26, 5, 5)},

    {"nombre_plato": "Sopa de Pescado con Verduras", "categoria": "comida_saludable",
     "descripcion": "Sopa ligera y nutritiva, llena de sabor marino y vegetal, con trozos de pescado blanco, papas y zanahorias.",
     "ingredientes": ["500 g de filete de pescado blanco (merluza o caballa)", "2 papas en cubos", "2 zanahorias en rodajas", "1 tomate picado", "1 cebolla", "3 dientes de ajo", "Culantro, sal, pimienta y limón", "1 cucharada de ají amarillo (opcional)", "1.5 litros de agua"],
     "preparacion": ["Preparar aderezo con cebolla, ajo, tomate y ají amarillo.", "Añadir agua y llevar a hervor.", "Incorporar papa y zanahoria; cocinar 15 minutos.", "Agregar el pescado y cocinar 8 minutos más.", "Servir con culantro picado y un chorrito de limón."],
     "tiempo_preparacion": "35 min", "porciones": "4", "nutricion": N(230, 26, 18, 6, 4)},

    {"nombre_plato": "Sopa de Pollo con Quinua", "categoria": "comida_saludable",
     "descripcion": "Sopa reconfortante que combina la proteína del pollo con los beneficios de la quinua y vegetales frescos.",
     "ingredientes": ["400 g de pechuga de pollo en trozos", "3/4 taza de quinua lavada", "2 zanahorias en cubos", "2 papas en cubos", "1 rama de apio", "1 cebolla", "2 dientes de ajo", "Culantro, sal y pimienta al gusto", "1.5 litros de agua"],
     "preparacion": ["Dorar cebolla y ajo; añadir el pollo y sellar.", "Agregar agua y hervir 10 minutos.", "Incorporar la quinua y cocinar 10 minutos.", "Añadir zanahoria, papa y apio; cocinar 15 minutos.", "Sazonar y servir con culantro fresco."],
     "tiempo_preparacion": "45 min", "porciones": "4", "nutricion": N(280, 24, 30, 7, 5)},

    {"nombre_plato": "Sopa de Zapallo con Pollo", "categoria": "comida_saludable",
     "descripcion": "Sopa sustanciosa que mezcla la dulzura del zapallo con la proteína del pollo y la frescura de zanahorias y papas.",
     "ingredientes": ["350 g de pollo en trozos", "400 g de zapallo macre en cubos", "2 zanahorias en rodajas", "2 papas en cubos", "1 cebolla", "3 dientes de ajo", "1 rama de apio", "Culantro, sal y pimienta", "1.5 litros de agua"],
     "preparacion": ["Preparar aderezo con cebolla y ajo en aceite.", "Añadir el pollo y dorar por 4 minutos.", "Agregar agua y hervir 10 minutos.", "Incorporar zapallo, zanahoria y papa.", "Cocinar 20 minutos hasta que todo esté tierno.", "Sazonar y decorar con culantro."],
     "tiempo_preparacion": "40 min", "porciones": "4", "nutricion": N(250, 22, 26, 7, 5)},

    {"nombre_plato": "Caldo de Pescado", "categoria": "bajar_peso",
     "descripcion": "Caldo ligero y aromático, ideal para extraer el sabor puro del pescado, acompañado de zanahoria y papas.",
     "ingredientes": ["700 g de cabeza y carcasa de pescado", "1 cebolla entera", "3 dientes de ajo enteros", "1 zanahoria entera", "1 rama de apio", "1 hoja de laurel", "Sal, pimienta en grano y limón", "2 litros de agua"],
     "preparacion": ["Lavar bien las piezas de pescado con agua y limón.", "Colocar todo en la olla con agua fría.", "Llevar a hervor y espumar los primeros 10 minutos.", "Cocinar a fuego bajo por 30 minutos.", "Colar y servir el caldo limpio con un toque de limón."],
     "tiempo_preparacion": "45 min", "porciones": "4", "nutricion": N(120, 18, 6, 3, 1)},

    {"nombre_plato": "Sopa de Carne con Verduras", "categoria": "comida_saludable",
     "descripcion": "Sopa robusta y reconfortante, con tiernos trozos de carne de res y verduras como papas, zanahorias y nabos.",
     "ingredientes": ["400 g de carne de res en cubos (pecho o asado)", "2 papas en cubos", "2 zanahorias en rodajas", "1 choclo en rodajas", "1 nabo pequeño", "1 cebolla", "3 dientes de ajo", "1 tomate", "Sal, comino, pimienta y culantro", "1.5 litros de agua"],
     "preparacion": ["Sellar la carne en aceite con cebolla, ajo y tomate.", "Agregar agua y hervir 20 minutos espumando.", "Incorporar zanahoria, nabo y choclo; cocinar 10 minutos.", "Añadir la papa y cocinar 15 minutos más.", "Sazonar con sal, comino y servir con culantro."],
     "tiempo_preparacion": "55 min", "porciones": "4", "nutricion": N(300, 26, 28, 10, 5)},

    {"nombre_plato": "Sopa de Espinaca con Huevo", "categoria": "comida_saludable",
     "descripcion": "Sopa ligera y nutritiva con la frescura de la espinaca y la proteína del huevo escalfado en la sopa.",
     "ingredientes": ["2 atados de espinaca fresca", "4 huevos frescos", "2 papas medianas en cubos", "1 cebolla", "2 dientes de ajo", "1 tomate pelado y picado", "Sal, pimienta y aceite de oliva", "1.2 litros de agua o caldo"],
     "preparacion": ["Preparar aderezo con cebolla, ajo y tomate en aceite.", "Añadir agua y llevar a hervor.", "Incorporar la papa y cocinar 15 minutos.", "Agregar la espinaca picada y cocinar 3 minutos.", "Casquear los huevos en la sopa y cocinar 4 minutos.", "Sazonar y servir de inmediato."],
     "tiempo_preparacion": "30 min", "porciones": "4", "nutricion": N(190, 12, 18, 9, 4)},

    {"nombre_plato": "Sopa de Verduras con Pollo", "categoria": "comida_saludable",
     "descripcion": "Sopa vibrante y llena de color, con verduras frescas y tierno pollo desmenuzado, completa y nutritiva.",
     "ingredientes": ["350 g de pollo desmenuzado cocido", "1 taza de brócoli en ramilletes", "2 zanahorias en cubos", "1 taza de vainitas picadas", "2 papas en cubos", "1 cebolla", "3 dientes de ajo", "1 tomate", "Sal, pimienta, orégano y culantro", "1.5 litros de caldo de pollo natural"],
     "preparacion": ["Preparar aderezo con cebolla, ajo y tomate en aceite.", "Verter el caldo y llevar a hervor.", "Agregar zanahoria y papa; cocinar 10 minutos.", "Incorporar brócoli y vainitas; cocinar 8 minutos.", "Añadir el pollo desmenuzado y sazonar.", "Decorar con culantro y servir caliente."],
     "tiempo_preparacion": "35 min", "porciones": "4", "nutricion": N(240, 24, 24, 6, 5)},
]

# existing names to avoid duplicates
existing = {}
try:
    for r in requests.get(f"{API}/admin/recipes", headers=H, timeout=30).json():
        existing[r.get("nombre_plato", "").strip().lower()] = r.get("id")
except Exception as e:
    log("no se pudo listar recetas:", e)

ids = []
for r in RECIPES:
    key = r["nombre_plato"].strip().lower()
    if key in existing:
        log("ya existe, omito creacion:", r["nombre_plato"])
        ids.append(existing[key])
        continue
    body = dict(r)
    body["imagen_url"] = ""
    body["pasos_imagenes"] = []
    cr = requests.post(f"{API}/admin/recipes?auto_generate=false", headers=H, json=body, timeout=60)
    if cr.status_code == 200:
        rid = cr.json()["id"]
        ids.append(rid)
        log("creada:", r["nombre_plato"])
    else:
        log("FALLO crear", r["nombre_plato"], cr.status_code, cr.text[:200])

log(f"--- {len(ids)} recetas listas, generando imagenes (portada + pasos) ---")

for rid, r in zip(ids, RECIPES):
    try:
        resp = requests.post(f"{API}/admin/recipes/{rid}/generate-steps", headers=H, timeout=1200)
        if resp.status_code == 200:
            d = resp.json()
            n_steps = len([x for x in d.get("pasos_imagenes", []) if x])
            log(f"imagenes OK: {r['nombre_plato']} | portada={'si' if d.get('imagen_url') else 'no'} | pasos={n_steps}/{len(r['preparacion'])}")
        else:
            log("FALLO imagenes", r["nombre_plato"], resp.status_code, resp.text[:200])
    except Exception as e:
        log("ERROR imagenes", r["nombre_plato"], str(e)[:200])

log("DONE")
