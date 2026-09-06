from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import uuid
import json
import base64
import random
import asyncio
import logging
import tempfile
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import jwt
import bcrypt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Query, Header, Response, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response as StarletteResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType, TextDelta, StreamDone

# ---------------- Config ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_DAYS = 7
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "salud-nutrition"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("salud")

app = FastAPI()
api_router = APIRouter(prefix="/api")

CATEGORIES = [
    {"id": "diabeticos", "label": "Para Diabéticos", "description": "Bajo índice glucémico y control de carbohidratos"},
    {"id": "bajar_peso", "label": "Bajar de Peso", "description": "Bajas en calorías y altas en fibra y saciedad"},
    {"id": "comida_saludable", "label": "Comida Saludable", "description": "Nutrición balanceada diaria para toda la familia"},
    {"id": "veganos", "label": "Veganos", "description": "100% origen vegetal rico en proteínas vegetales"},
]
CATEGORY_IDS = [c["id"] for c in CATEGORIES]

# ---------------- Storage ----------------
storage_key = None

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf"}

# ---------------- AI image generation ----------------
async def generate_and_store_image(prompt: str, prefix: str) -> Optional[str]:
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                       system_message="Eres un fotógrafo gastronómico profesional. Genera fotos apetitosas, realistas y limpias, sin texto ni marcas de agua.")
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
        if not images:
            return None
        img = images[0]
        data = base64.b64decode(img["data"])
        mt = img.get("mime_type", "image/png")
        ext = "jpeg" if ("jpeg" in mt or "jpg" in mt) else "png"
        path = f"{APP_NAME}/{prefix}/{uuid.uuid4()}.{ext}"
        await asyncio.to_thread(put_object, path, data, mt)
        return path
    except Exception as e:
        logger.error(f"gen image failed: {e}")
        return None

async def fill_missing_images(recipe_id: str):
    r = await db.recipes.find_one({"id": recipe_id})
    if not r:
        return
    name = r.get("nombre_plato", "")
    cat = r.get("categoria", "")
    updates = {}
    if not r.get("imagen_url"):
        p = await generate_and_store_image(
            f"Fotografía gastronómica cenital profesional del plato terminado '{name}' (comida saludable, categoría {cat}). Emplatado apetitoso, luz natural suave, fondo rústico limpio. Sin texto.",
            "gen-covers")
        if p:
            updates["imagen_url"] = p
    steps = r.get("preparacion", []) or []
    imgs = list(r.get("pasos_imagenes", []) or [])
    while len(imgs) < len(steps):
        imgs.append("")
    changed = False
    for i, step in enumerate(steps):
        if imgs[i]:
            continue
        p = await generate_and_store_image(
            f"Fotografía gastronómica cenital, luz natural, fondo rústico de cocina. Paso de la receta '{name}': {step}. Comida saludable, estilo recetario profesional, realista, sin texto.",
            "gen-steps")
        if p:
            imgs[i] = p
            changed = True
    if changed:
        updates["pasos_imagenes"] = imgs
    if updates:
        updates["updated_at"] = now_iso()
        await db.recipes.update_one({"id": recipe_id}, {"$set": updates})

# ---------------- Auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_DAYS), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def public_user(u: dict) -> dict:
    return {
        "id": u["id"], "email": u["email"], "name": u.get("name", ""), "role": u.get("role", "client"),
        "subscription_status": subscription_status(u), "subscription_expires_at": u.get("subscription_expires_at"),
        "active": u.get("active", True), "created_at": u.get("created_at"),
    }

def subscription_status(u: dict) -> str:
    if u.get("role") == "admin":
        return "active"
    exp = u.get("subscription_expires_at")
    status = u.get("subscription_status", "inactive")
    if status == "active" and exp:
        try:
            if datetime.fromisoformat(exp) > datetime.now(timezone.utc):
                return "active"
            return "expired"
        except Exception:
            return "inactive"
    return status

def has_active_subscription(u: dict) -> bool:
    return subscription_status(u) == "active"

async def get_token_from_request(request: Request, auth: Optional[str]) -> Optional[str]:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:]
    if auth:
        return auth
    return request.cookies.get("access_token")

async def get_current_user(request: Request, auth: Optional[str] = Query(None)) -> dict:
    token = await get_token_from_request(request, auth)
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acceso solo para administradores")
    return user

async def require_active(user: dict = Depends(get_current_user)) -> dict:
    if not has_active_subscription(user):
        raise HTTPException(status_code=403, detail="Necesitas una suscripción activa")
    return user

# ---------------- Models ----------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class Nutricion(BaseModel):
    calorias: Optional[str] = ""
    proteinas: Optional[str] = ""
    carbohidratos: Optional[str] = ""
    grasas: Optional[str] = ""
    fibra: Optional[str] = ""

class RecipeIn(BaseModel):
    nombre_plato: str
    categoria: str
    descripcion: str = ""
    imagen_url: str = ""
    ingredientes: List[str] = []
    preparacion: List[str] = []
    pasos_imagenes: List[str] = []
    emplatado: str = ""
    tiempo_preparacion: str = ""
    tiempo_coccion: str = ""
    dificultad: str = "Media"
    porciones: str = ""
    utensilios: List[str] = []
    nutricion: Nutricion = Field(default_factory=Nutricion)
    published: bool = True

class SettingsIn(BaseModel):
    precio: str
    moneda: str = "PEN"
    yape: dict = {}
    plin: dict = {}
    bcp: dict = {}
    bbva: dict = {}
    instrucciones: str = ""

class UserCreateIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "client"
    grant_days: int = 0

# ---------------- Recipe helpers ----------------
def recipe_summary(r: dict) -> dict:
    return {
        "id": r["id"], "nombre_plato": r["nombre_plato"], "categoria": r["categoria"],
        "descripcion": r.get("descripcion", ""), "imagen_url": r.get("imagen_url", ""),
        "tiempo_preparacion": r.get("tiempo_preparacion", ""), "tiempo_coccion": r.get("tiempo_coccion", ""),
        "dificultad": r.get("dificultad", ""), "porciones": r.get("porciones", ""),
        "num_ingredientes": len(r.get("ingredientes", [])), "num_pasos": len(r.get("preparacion", [])),
        "published": r.get("published", True), "created_at": r.get("created_at"),
    }

# ---------------- Auth routes ----------------
@api_router.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Este correo ya está registrado")
    uid = str(uuid.uuid4())
    doc = {"id": uid, "email": email, "name": body.name, "password_hash": hash_password(body.password),
           "role": "client", "active": True, "subscription_status": "inactive",
           "subscription_expires_at": None, "created_at": now_iso()}
    await db.users.insert_one(doc)
    token = create_access_token(uid, email)
    return {"token": token, "user": public_user(doc)}

@api_router.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Tu cuenta está desactivada. Contacta al administrador.")
    token = create_access_token(user["id"], email)
    return {"token": token, "user": public_user(user)}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}

# ---------------- Public content ----------------
@api_router.get("/categories")
async def get_categories():
    counts = {}
    pipeline = [{"$match": {"published": True}}, {"$group": {"_id": "$categoria", "n": {"$sum": 1}}}]
    async for row in db.recipes.aggregate(pipeline):
        counts[row["_id"]] = row["n"]
    return [{**c, "count": counts.get(c["id"], 0)} for c in CATEGORIES]

@api_router.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"key": "payment_info"}, {"_id": 0})
    if not s:
        return DEFAULT_SETTINGS
    return s

@api_router.get("/recipes")
async def list_recipes(q: Optional[str] = None, categoria: Optional[str] = None, limit: int = 100):
    query = {"published": True}
    if categoria and categoria in CATEGORY_IDS:
        query["categoria"] = categoria
    if q:
        query["$or"] = [
            {"nombre_plato": {"$regex": q, "$options": "i"}},
            {"descripcion": {"$regex": q, "$options": "i"}},
            {"ingredientes": {"$regex": q, "$options": "i"}},
        ]
    recipes = await db.recipes.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [recipe_summary(r) for r in recipes]

@api_router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str, request: Request, auth: Optional[str] = Query(None)):
    r = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    # determine access
    locked = True
    token = await get_token_from_request(request, auth)
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            u = await db.users.find_one({"id": payload["sub"]})
            if u and has_active_subscription(u):
                locked = False
        except Exception:
            locked = True
    if locked:
        summ = recipe_summary(r)
        summ["locked"] = True
        return summ
    r["locked"] = False
    return r

# ---------------- Subscription (client) ----------------
@api_router.get("/subscription/me")
async def my_subscription(user: dict = Depends(get_current_user)):
    payments = await db.payments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"status": subscription_status(user), "expires_at": user.get("subscription_expires_at"), "payments": payments}

@api_router.post("/subscription/pay")
async def submit_payment(request: Request, metodo: str = Form(...), file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png")
    path = f"{APP_NAME}/proofs/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    ct = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    result = put_object(path, data, ct)
    pid = str(uuid.uuid4())
    payment = {"id": pid, "user_id": user["id"], "user_name": user.get("name"), "user_email": user["email"],
               "metodo": metodo, "proof_path": result["path"], "status": "pending",
               "created_at": now_iso(), "reviewed_at": None}
    await db.payments.insert_one(payment)
    await db.users.update_one({"id": user["id"]}, {"$set": {"subscription_status": "pending"}})
    payment.pop("_id", None)
    return payment

# ---------------- Mi Menú / Compras / Progreso ----------------
DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

class MenuGenIn(BaseModel):
    objetivo: str = "comida_saludable"
    comidas_por_dia: int = 3
    evitar: List[str] = []

class ProgressIn(BaseModel):
    fecha: str
    recetas_cocinadas: int = 0
    peso: Optional[str] = ""
    nota: Optional[str] = ""

@api_router.post("/menu/generate")
async def generate_menu(body: MenuGenIn, user: dict = Depends(require_active)):
    query = {"published": True}
    if body.objetivo in CATEGORY_IDS:
        query["categoria"] = body.objetivo
    pool = await db.recipes.find(query, {"_id": 0}).to_list(2000)
    if len(pool) < 4:
        pool = await db.recipes.find({"published": True}, {"_id": 0}).to_list(2000)
    evit = [e.strip().lower() for e in body.evitar if e.strip()]
    def ok(r):
        text = " ".join(r.get("ingredientes", [])).lower() + " " + r.get("nombre_plato", "").lower()
        return not any(e in text for e in evit)
    filtered = [r for r in pool if ok(r)] or pool
    meals = ["Desayuno", "Almuerzo", "Cena"] if body.comidas_por_dia >= 3 else ["Almuerzo", "Cena"]
    dias = []
    for d in DIAS_SEMANA:
        if len(filtered) >= len(meals):
            picks = random.sample(filtered, len(meals))
        else:
            picks = [random.choice(filtered) for _ in meals]
        comidas = [{"tipo": meals[i], "recipe_id": p["id"], "nombre": p["nombre_plato"],
                    "imagen_url": p.get("imagen_url", ""), "categoria": p["categoria"]} for i, p in enumerate(picks)]
        dias.append({"dia": d, "comidas": comidas})
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "objetivo": body.objetivo,
           "comidas_por_dia": len(meals), "dias": dias, "created_at": now_iso()}
    await db.menus.replace_one({"user_id": user["id"]}, doc, upsert=True)
    doc.pop("_id", None)
    return doc

@api_router.get("/menu")
async def get_menu(user: dict = Depends(require_active)):
    m = await db.menus.find_one({"user_id": user["id"]}, {"_id": 0})
    return m or {}

@api_router.get("/menu/shopping-list")
async def shopping_list(user: dict = Depends(require_active)):
    m = await db.menus.find_one({"user_id": user["id"]})
    if not m:
        return {"items": [], "count": 0}
    ids = list({c["recipe_id"] for d in m["dias"] for c in d["comidas"]})
    recs = await db.recipes.find({"id": {"$in": ids}}, {"_id": 0}).to_list(2000)
    seen = {}
    for r in recs:
        for ing in r.get("ingredientes", []):
            k = ing.strip().lower()
            if k and k not in seen:
                seen[k] = ing.strip()
    items = sorted(seen.values(), key=lambda x: x.lower())
    return {"items": items, "count": len(items)}

def _num(s):
    m = re.search(r"[\d]+(?:[.,]\d+)?", str(s or ""))
    return float(m.group().replace(",", ".")) if m else 0.0

@api_router.get("/menu/nutrition")
async def menu_nutrition(user: dict = Depends(require_active)):
    m = await db.menus.find_one({"user_id": user["id"]})
    if not m:
        return {"dias": [], "semana": {}, "promedio": {}}
    ids = list({c["recipe_id"] for d in m["dias"] for c in d["comidas"]})
    recs = {r["id"]: r for r in await db.recipes.find({"id": {"$in": ids}}, {"_id": 0}).to_list(2000)}
    keys = ["calorias", "proteinas", "carbohidratos", "grasas", "fibra"]
    dias = []
    semana = {k: 0 for k in keys}
    for d in m["dias"]:
        tot = {k: 0.0 for k in keys}
        for c in d["comidas"]:
            n = (recs.get(c["recipe_id"], {}) or {}).get("nutricion", {}) or {}
            for k in keys:
                tot[k] += _num(n.get(k))
        tot = {k: round(v) for k, v in tot.items()}
        for k in keys:
            semana[k] += tot[k]
        dias.append({"dia": d["dia"], **tot})
    nd = len(dias) or 1
    promedio = {k: round(semana[k] / nd) for k in keys}
    return {"dias": dias, "semana": semana, "promedio": promedio}

@api_router.post("/progress")
async def add_progress(body: ProgressIn, user: dict = Depends(require_active)):
    doc = body.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await db.progress.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/progress")
async def get_progress(user: dict = Depends(require_active)):
    rows = await db.progress.find({"user_id": user["id"]}, {"_id": 0}).sort("fecha", -1).to_list(365)
    total = sum(r.get("recetas_cocinadas", 0) for r in rows)
    return {"entries": rows, "total_recetas": total, "dias_registrados": len(rows)}

@api_router.delete("/progress/{entry_id}")
async def del_progress(entry_id: str, user: dict = Depends(require_active)):
    await db.progress.delete_one({"id": entry_id, "user_id": user["id"]})
    return {"ok": True}

# ---------------- Files ----------------
@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, ct = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return StarletteResponse(content=data, media_type=ct)

@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    ext = (file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png")
    path = f"{APP_NAME}/images/{uuid.uuid4()}.{ext}"
    data = await file.read()
    ct = MIME_TYPES.get(ext, file.content_type or "image/png")
    result = put_object(path, data, ct)
    return {"path": result["path"]}

# ---------------- Admin: recipes ----------------
@api_router.post("/admin/recipes")
async def create_recipe(body: RecipeIn, background: BackgroundTasks, auto_generate: bool = Query(True), admin: dict = Depends(require_admin)):
    if body.categoria not in CATEGORY_IDS:
        raise HTTPException(status_code=400, detail="Categoría inválida")
    rid = str(uuid.uuid4())
    doc = body.model_dump()
    doc.update({"id": rid, "created_at": now_iso(), "updated_at": now_iso()})
    await db.recipes.insert_one(doc)
    doc.pop("_id", None)
    needs = (not doc.get("imagen_url")) or (len(doc.get("pasos_imagenes", []) or []) < len(doc.get("preparacion", []) or []))
    if auto_generate and needs:
        background.add_task(fill_missing_images, rid)
    return doc

@api_router.post("/admin/recipes/{recipe_id}/generate-steps")
async def generate_step_images(recipe_id: str, admin: dict = Depends(require_admin)):
    r = await db.recipes.find_one({"id": recipe_id})
    if not r:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    await fill_missing_images(recipe_id)
    updated = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    return updated

@api_router.put("/admin/recipes/{recipe_id}")
async def update_recipe(recipe_id: str, body: RecipeIn, admin: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["updated_at"] = now_iso()
    res = await db.recipes.update_one({"id": recipe_id}, {"$set": doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    updated = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, admin: dict = Depends(require_admin)):
    await db.recipes.delete_one({"id": recipe_id})
    return {"ok": True}

@api_router.get("/admin/recipes")
async def admin_list_recipes(admin: dict = Depends(require_admin)):
    recipes = await db.recipes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return recipes

# ---------------- Admin: PDF AI extraction ----------------
PDF_PROMPT = """Eres un asistente experto en nutrición. Analiza el PDF adjunto que contiene una o varias recetas de cocina saludable.
Extrae TODAS las recetas encontradas y devuélvelas ESTRICTAMENTE como un ARRAY JSON válido (sin texto adicional, sin markdown).
Cada receta debe tener EXACTAMENTE esta estructura:
{
  "nombre_plato": "string",
  "categoria": "uno de: diabeticos, bajar_peso, comida_saludable, veganos (elige el más adecuado)",
  "descripcion": "breve descripción apetitosa en español (1-2 frases)",
  "ingredientes": ["ingrediente con cantidad", ...],
  "preparacion": ["Paso 1 ...", "Paso 2 ...", ...],
  "emplatado": "cómo se sirve y presenta el plato al final",
  "tiempo_preparacion": "ej. 20 min",
  "tiempo_coccion": "ej. 15 min",
  "dificultad": "Fácil | Media | Difícil",
  "porciones": "ej. 4 porciones",
  "utensilios": ["utensilio", ...],
  "nutricion": {"calorias": "", "proteinas": "", "carbohidratos": "", "grasas": "", "fibra": ""}
}
Todo el contenido debe estar en español. Devuelve SOLO el array JSON."""

def parse_json_array(text: str):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if "```" in text else text
        if text.startswith("json"):
            text = text[4:]
        text = text.strip("` \n")
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    data = json.loads(text)
    if isinstance(data, dict):
        data = [data]
    return data

@api_router.post("/admin/pdf-extract")
async def pdf_extract(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    data = await file.read()
    # store the pdf
    path = f"{APP_NAME}/pdfs/{uuid.uuid4()}.pdf"
    try:
        put_object(path, data, "application/pdf")
    except Exception as e:
        logger.error(f"pdf store failed: {e}")
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(data)
    tmp.flush()
    tmp.close()
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()), system_message=PDF_PROMPT).with_model("gemini", "gemini-2.5-flash")
        pdf_file = FileContentWithMimeType(file_path=tmp.name, mime_type="application/pdf")
        full = ""
        async for ev in chat.stream_message(UserMessage(text="Extrae todas las recetas de este PDF y devuélvelas como array JSON.", file_contents=[pdf_file])):
            if isinstance(ev, TextDelta):
                full += ev.content
            elif isinstance(ev, StreamDone):
                break
        recipes = parse_json_array(full)
    except Exception as e:
        logger.error(f"pdf extract failed: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo extraer la receta del PDF: {str(e)}")
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
    # normalize
    cleaned = []
    for r in recipes:
        if not isinstance(r, dict):
            continue
        cat = r.get("categoria", "comida_saludable")
        if cat not in CATEGORY_IDS:
            cat = "comida_saludable"
        cleaned.append({
            "nombre_plato": r.get("nombre_plato", "Receta sin nombre"),
            "categoria": cat,
            "descripcion": r.get("descripcion", ""),
            "imagen_url": "",
            "ingredientes": r.get("ingredientes", []) or [],
            "preparacion": r.get("preparacion", []) or [],
            "emplatado": r.get("emplatado", ""),
            "tiempo_preparacion": r.get("tiempo_preparacion", ""),
            "tiempo_coccion": r.get("tiempo_coccion", ""),
            "dificultad": r.get("dificultad", "Media"),
            "porciones": r.get("porciones", ""),
            "utensilios": r.get("utensilios", []) or [],
            "nutricion": r.get("nutricion", {}) or {},
            "published": True,
        })
    return {"count": len(cleaned), "recipes": cleaned, "pdf_path": path}

# ---------------- Admin: users ----------------
@api_router.get("/admin/users")
async def admin_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return [public_user(u) for u in users]

@api_router.post("/admin/users")
async def admin_create_user(body: UserCreateIn, admin: dict = Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Este correo ya está registrado")
    uid = str(uuid.uuid4())
    role = "admin" if body.role == "admin" else "client"
    sub_status = "inactive"
    exp = None
    if body.grant_days > 0:
        sub_status = "active"
        exp = (datetime.now(timezone.utc) + timedelta(days=body.grant_days)).isoformat()
    doc = {"id": uid, "email": email, "name": body.name, "password_hash": hash_password(body.password),
           "role": role, "active": True, "subscription_status": sub_status,
           "subscription_expires_at": exp, "created_at": now_iso()}
    await db.users.insert_one(doc)
    return public_user(doc)

@api_router.post("/admin/users/{user_id}/grant")
async def admin_grant(user_id: str, days: int = Query(30), admin: dict = Depends(require_admin)):
    exp = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    await db.users.update_one({"id": user_id}, {"$set": {"subscription_status": "active", "subscription_expires_at": exp}})
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    return public_user(u)

@api_router.post("/admin/users/{user_id}/revoke")
async def admin_revoke(user_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"subscription_status": "inactive", "subscription_expires_at": None}})
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    return public_user(u)

@api_router.patch("/admin/users/{user_id}/active")
async def admin_toggle_active(user_id: str, active: bool = Query(...), admin: dict = Depends(require_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"active": active}})
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    return public_user(u)

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id})
    if target and target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar una cuenta de administrador")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}

# ---------------- Admin: payments ----------------
@api_router.get("/admin/payments")
async def admin_payments(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    query = {}
    if status:
        query["status"] = status
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return payments

@api_router.post("/admin/payments/{payment_id}/approve")
async def approve_payment(payment_id: str, days: int = Query(30), admin: dict = Depends(require_admin)):
    p = await db.payments.find_one({"id": payment_id})
    if not p:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    exp = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    await db.payments.update_one({"id": payment_id}, {"$set": {"status": "approved", "reviewed_at": now_iso()}})
    await db.users.update_one({"id": p["user_id"]}, {"$set": {"subscription_status": "active", "subscription_expires_at": exp}})
    return {"ok": True}

@api_router.post("/admin/payments/{payment_id}/reject")
async def reject_payment(payment_id: str, admin: dict = Depends(require_admin)):
    p = await db.payments.find_one({"id": payment_id})
    if not p:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    await db.payments.update_one({"id": payment_id}, {"$set": {"status": "rejected", "reviewed_at": now_iso()}})
    await db.users.update_one({"id": p["user_id"], "subscription_status": "pending"}, {"$set": {"subscription_status": "inactive"}})
    return {"ok": True}

@api_router.put("/admin/settings")
async def update_settings(body: SettingsIn, admin: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["key"] = "payment_info"
    await db.settings.update_one({"key": "payment_info"}, {"$set": doc}, upsert=True)
    doc.pop("_id", None)
    return doc

@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({"role": "client"})
    active_subs = await db.users.count_documents({"subscription_status": "active", "role": "client"})
    pending_payments = await db.payments.count_documents({"status": "pending"})
    total_recipes = await db.recipes.count_documents({})
    return {"total_users": total_users, "active_subscriptions": active_subs,
            "pending_payments": pending_payments, "total_recipes": total_recipes}

# ---------------- Defaults / seed ----------------
DEFAULT_SETTINGS = {
    "key": "payment_info", "precio": "10.00", "moneda": "PEN",
    "yape": {"numero": "", "titular": "Julio Aro"},
    "plin": {"numero": "", "titular": "Julio Aro"},
    "bcp": {"cuenta": "", "cci": "", "titular": "Julio Aro"},
    "bbva": {"cuenta": "", "cci": "", "titular": "Julio Aro"},
    "instrucciones": "Realiza el pago de S/ 10.00 por el mes de suscripción y sube tu comprobante. Un administrador validará tu pago y activará tu acceso.",
}

SAMPLE_RECIPES = [
    {"nombre_plato": "Ensalada de Quinua Andina", "categoria": "veganos",
     "descripcion": "Un bowl vibrante de quinua peruana con vegetales frescos y palta, rico en proteína vegetal.",
     "imagen_url": "https://images.unsplash.com/photo-1567575990843-105a1c70d76e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwyfHxwZXJ1dmlhbiUyMGN1bGluYXJ5JTIwaGVhbHRoeSUyMGRpc2hlcyUyMHZlZ2FuJTIwYm93bHxlbnwwfHx8fDE3ODgzMjk0MzV8MA&ixlib=rb-4.1.0&q=85",
     "ingredientes": ["1 taza de quinua cocida", "1 palta madura en cubos", "1 tomate picado", "1/2 taza de choclo desgranado", "Jugo de 1 limón", "Cilantro fresco", "Sal y pimienta al gusto"],
     "preparacion": ["Enjuaga y cocina la quinua durante 15 minutos, deja enfriar.", "Pica el tomate, la palta y el cilantro.", "Mezcla todos los ingredientes en un bowl grande.", "Aliña con jugo de limón, sal y pimienta.", "Refrigera 10 minutos antes de servir."],
     "emplatado": "Sirve en un bowl hondo, decora con láminas de palta y hojas de cilantro por encima. Acompaña con una rodaja de limón.",
     "tiempo_preparacion": "15 min", "tiempo_coccion": "15 min", "dificultad": "Fácil", "porciones": "2 porciones",
     "utensilios": ["Olla", "Bowl grande", "Cuchillo", "Tabla de picar"],
     "nutricion": {"calorias": "320 kcal", "proteinas": "12 g", "carbohidratos": "38 g", "grasas": "14 g", "fibra": "8 g"}},
    {"nombre_plato": "Lentejas Guisadas Ligeras", "categoria": "veganos",
     "descripcion": "Guiso reconfortante de lentejas con verduras, alto en fibra y 100% vegetal.",
     "imagen_url": "https://images.unsplash.com/photo-1629793980444-11a91aa44476?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHw0fHxwZXJ1dmlhbiUyMGN1bGluYXJ5JTIwaGVhbHRoeSUyMGRpc2hlcyUyMHZlZ2FuJTIwYm93bHxlbnwwfHx8fDE3ODgzMjk0MzV8MA&ixlib=rb-4.1.0&q=85",
     "ingredientes": ["1 taza de lentejas", "1 zanahoria en cubos", "1 cebolla picada", "2 dientes de ajo", "1 tomate", "Comino y sal al gusto", "3 tazas de agua"],
     "preparacion": ["Remoja las lentejas 30 minutos.", "Sofríe cebolla, ajo y tomate hasta dorar.", "Agrega las lentejas, la zanahoria y el agua.", "Cocina a fuego medio 30 minutos hasta que estén tiernas.", "Sazona con comino y sal."],
     "emplatado": "Sirve caliente en plato hondo, espolvorea perejil fresco y acompaña con arroz integral.",
     "tiempo_preparacion": "10 min", "tiempo_coccion": "35 min", "dificultad": "Fácil", "porciones": "4 porciones",
     "utensilios": ["Olla mediana", "Cuchara de madera", "Cuchillo"],
     "nutricion": {"calorias": "280 kcal", "proteinas": "16 g", "carbohidratos": "42 g", "grasas": "3 g", "fibra": "15 g"}},
    {"nombre_plato": "Pechuga a la Plancha con Ensalada", "categoria": "bajar_peso",
     "descripcion": "Pechuga de pollo magra a la plancha acompañada de ensalada fresca, baja en calorías.",
     "imagen_url": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxoZWFsdGh5JTIwZm9vZCUyMGdvdXJtZXQlMjBzYWxhZCUyMHBsYXRlfGVufDB8fHx8MTc4ODMyOTQzNXww&ixlib=rb-4.1.0&q=85",
     "ingredientes": ["1 pechuga de pollo (150 g)", "Mix de lechugas", "1 tomate", "1/2 pepino", "1 cdta de aceite de oliva", "Jugo de limón", "Sal y pimienta"],
     "preparacion": ["Sazona la pechuga con sal y pimienta.", "Cocina a la plancha 5 minutos por lado.", "Lava y corta los vegetales.", "Arma la ensalada y aliña con aceite y limón.", "Sirve la pechuga fileteada sobre la ensalada."],
     "emplatado": "Coloca la ensalada como base y la pechuga fileteada en abanico encima. Un chorrito de limón al final.",
     "tiempo_preparacion": "10 min", "tiempo_coccion": "10 min", "dificultad": "Fácil", "porciones": "1 porción",
     "utensilios": ["Plancha o sartén", "Cuchillo", "Bowl"],
     "nutricion": {"calorias": "260 kcal", "proteinas": "35 g", "carbohidratos": "8 g", "grasas": "9 g", "fibra": "3 g"}},
    {"nombre_plato": "Crema de Verduras Detox", "categoria": "bajar_peso",
     "descripcion": "Crema ligera de verduras verdes, saciante y muy baja en calorías.",
     "imagen_url": "https://images.unsplash.com/photo-1494859802809-d069c3b71a8a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxoZWFsdGh5JTIwZm9vZCUyMGdvdXJtZXQlMjBzYWxhZCUyMHBsYXRlfGVufDB8fHx8MTc4ODMyOTQzNXww&ixlib=rb-4.1.0&q=85",
     "ingredientes": ["2 tazas de brócoli", "1 calabacín", "1 poro", "1 diente de ajo", "3 tazas de caldo de verduras", "Sal y pimienta"],
     "preparacion": ["Corta todas las verduras en trozos.", "Sofríe el poro y el ajo.", "Añade el resto de verduras y el caldo.", "Cocina 20 minutos.", "Licúa hasta obtener una crema suave."],
     "emplatado": "Sirve en bowl, decora con semillas de girasol y un hilo de aceite de oliva.",
     "tiempo_preparacion": "10 min", "tiempo_coccion": "20 min", "dificultad": "Fácil", "porciones": "3 porciones",
     "utensilios": ["Olla", "Licuadora", "Cuchillo"],
     "nutricion": {"calorias": "120 kcal", "proteinas": "6 g", "carbohidratos": "14 g", "grasas": "4 g", "fibra": "6 g"}},
    {"nombre_plato": "Tortilla de Espinaca al Horno", "categoria": "diabeticos",
     "descripcion": "Tortilla horneada de huevo y espinaca, de bajo índice glucémico.",
     "imagen_url": "https://images.unsplash.com/photo-1505576633757-0ac1084af824?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHw0fHxoZWFsdGh5JTIwZm9vZCUyMGdvdXJtZXQlMjBzYWxhZCUyMHBsYXRlfGVufDB8fHx8MTc4ODMyOTQzNXww&ixlib=rb-4.1.0&q=85",
     "ingredientes": ["3 huevos", "1 taza de espinaca", "1/4 de cebolla", "2 cdas de queso fresco", "Sal y pimienta", "1 cdta de aceite de oliva"],
     "preparacion": ["Precalienta el horno a 180°C.", "Bate los huevos y sazona.", "Saltea la espinaca y la cebolla.", "Mezcla con los huevos y el queso.", "Hornea 15 minutos en molde engrasado."],
     "emplatado": "Corta en porciones triangulares, sirve tibia con una porción de palta.",
     "tiempo_preparacion": "10 min", "tiempo_coccion": "15 min", "dificultad": "Fácil", "porciones": "2 porciones",
     "utensilios": ["Horno", "Molde", "Sartén", "Bowl"],
     "nutricion": {"calorias": "210 kcal", "proteinas": "16 g", "carbohidratos": "5 g", "grasas": "14 g", "fibra": "2 g"}},
    {"nombre_plato": "Pescado al Vapor con Vegetales", "categoria": "diabeticos",
     "descripcion": "Filete de pescado al vapor con vegetales, sin azúcares y de digestión ligera.",
     "imagen_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwZm9vZCUyMGdvdXJtZXQlMjBzYWxhZCUyMHBsYXRlfGVufDB8fHx8MTc4ODMyOTQzNXww&ixlib=rb-4.1.0&q=85",
     "ingredientes": ["1 filete de pescado blanco (150 g)", "1 zanahoria en bastones", "1/2 taza de vainitas", "1 rama de brócoli", "Jugo de limón", "Sal, pimienta y eneldo"],
     "preparacion": ["Sazona el pescado con limón, sal y pimienta.", "Coloca en vaporera junto a los vegetales.", "Cocina al vapor 12 minutos.", "Verifica que el pescado esté firme.", "Espolvorea eneldo fresco."],
     "emplatado": "Sirve el filete sobre la cama de vegetales, decora con eneldo y una rodaja de limón.",
     "tiempo_preparacion": "10 min", "tiempo_coccion": "12 min", "dificultad": "Media", "porciones": "1 porción",
     "utensilios": ["Vaporera", "Cuchillo", "Tabla de picar"],
     "nutricion": {"calorias": "230 kcal", "proteinas": "30 g", "carbohidratos": "10 g", "grasas": "7 g", "fibra": "4 g"}},
    {"nombre_plato": "Bowl de Avena y Frutas", "categoria": "comida_saludable",
     "descripcion": "Desayuno energético de avena con frutas frescas y semillas.",
     "imagen_url": "https://images.pexels.com/photos/13222803/pexels-photo-13222803.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "ingredientes": ["1/2 taza de avena", "1 taza de leche vegetal", "1 plátano", "1/2 taza de fresas", "1 cda de semillas de chía", "Miel al gusto"],
     "preparacion": ["Cocina la avena con la leche 5 minutos.", "Corta las frutas.", "Sirve la avena en un bowl.", "Agrega las frutas y las semillas encima.", "Endulza con un toque de miel."],
     "emplatado": "Decora el bowl por secciones de color con las frutas y espolvorea chía al centro.",
     "tiempo_preparacion": "5 min", "tiempo_coccion": "5 min", "dificultad": "Fácil", "porciones": "1 porción",
     "utensilios": ["Olla pequeña", "Bowl", "Cuchillo"],
     "nutricion": {"calorias": "340 kcal", "proteinas": "10 g", "carbohidratos": "58 g", "grasas": "8 g", "fibra": "9 g"}},
    {"nombre_plato": "Salteado de Verduras y Tofu", "categoria": "comida_saludable",
     "descripcion": "Salteado colorido de verduras con tofu, equilibrado y nutritivo.",
     "imagen_url": "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHw1fHxwZXJ1dmlhbiUyMGN1bGluYXJ5JTIwaGVhbHRoeSUyMGRpc2hlcyUyMHZlZ2FuJTIwYm93bHxlbnwwfHx8fDE3ODgzMjk0MzV8MA&ixlib=rb-4.1.0&q=85",
     "ingredientes": ["200 g de tofu firme", "1 pimiento", "1 zanahoria", "1 taza de brócoli", "2 cdas de salsa de soya baja en sodio", "1 cdta de aceite de ajonjolí", "Jengibre rallado"],
     "preparacion": ["Corta el tofu en cubos y dóralo.", "Corta las verduras en juliana.", "Saltea las verduras a fuego alto 5 minutos.", "Agrega el tofu, la soya y el jengibre.", "Saltea 2 minutos más y sirve."],
     "emplatado": "Sirve caliente sobre arroz integral, decora con semillas de ajonjolí.",
     "tiempo_preparacion": "15 min", "tiempo_coccion": "10 min", "dificultad": "Media", "porciones": "2 porciones",
     "utensilios": ["Wok o sartén", "Cuchillo", "Rallador"],
     "nutricion": {"calorias": "300 kcal", "proteinas": "18 g", "carbohidratos": "22 g", "grasas": "16 g", "fibra": "6 g"}},
]

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@saludnutrition.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin2026!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"id": str(uuid.uuid4()), "email": admin_email, "password_hash": hash_password(admin_password),
                                   "name": "Administrador", "role": "admin", "active": True,
                                   "subscription_status": "active", "subscription_expires_at": None, "created_at": now_iso()})
        logger.info("Admin seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})

async def seed_data():
    if await db.settings.find_one({"key": "payment_info"}) is None:
        await db.settings.insert_one(dict(DEFAULT_SETTINGS))
    if await db.recipes.count_documents({}) == 0:
        for r in SAMPLE_RECIPES:
            doc = dict(r)
            doc.update({"id": str(uuid.uuid4()), "published": True, "created_at": now_iso(), "updated_at": now_iso()})
            await db.recipes.insert_one(doc)
        logger.info("Sample recipes seeded")

@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.recipes.create_index("categoria")
    except Exception as e:
        logger.error(f"index error: {e}")
    try:
        init_storage()
    except Exception as e:
        logger.error(f"storage init failed: {e}")
    await seed_admin()
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
