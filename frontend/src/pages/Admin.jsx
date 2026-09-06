import { useEffect, useState, useCallback } from "react";
import { api, API, resolveImg, CATEGORY_META } from "@/lib/api";
import { toast } from "sonner";
import {
  Users, BookOpen, CreditCard, Settings as SettingsIcon, LayoutDashboard, Plus, Trash2, Edit,
  FileUp, Loader2, CheckCircle2, XCircle, Save, X, Eye, ShieldCheck, Sparkles
} from "lucide-react";

const CATS = [
  { id: "diabeticos", label: "Para Diabéticos" },
  { id: "bajar_peso", label: "Bajar de Peso" },
  { id: "comida_saludable", label: "Comida Saludable" },
  { id: "veganos", label: "Veganos" },
];
const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "recetas", label: "Recetas", icon: BookOpen },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "pagos", label: "Pagos", icon: CreditCard },
  { id: "ajustes", label: "Ajustes de Pago", icon: SettingsIcon },
];

export default function Admin() {
  const [tab, setTab] = useState("resumen");
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-11 h-11 rounded-xl bg-brand-terracotta text-white flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></span>
        <div><p className="eyebrow">Panel de administración</p><h1 className="font-serif text-3xl font-bold text-brand-ink">Salud Nutrition Admin</h1></div>
      </div>

      <div className="flex gap-1 border-b border-brand-line mb-8 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? "border-brand-green text-brand-green" : "border-transparent text-brand-muted hover:text-brand-ink"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && <Resumen />}
      {tab === "recetas" && <RecetasTab />}
      {tab === "usuarios" && <UsuariosTab />}
      {tab === "pagos" && <PagosTab />}
      {tab === "ajustes" && <AjustesTab />}
    </div>
  );
}

function Resumen() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {}); }, []);
  const cards = [
    { label: "Clientes registrados", val: stats?.total_users, icon: Users, c: "text-brand-green bg-brand-greenLight" },
    { label: "Suscripciones activas", val: stats?.active_subscriptions, icon: CheckCircle2, c: "text-emerald-700 bg-emerald-50" },
    { label: "Pagos por revisar", val: stats?.pending_payments, icon: CreditCard, c: "text-amber-700 bg-amber-50" },
    { label: "Recetas publicadas", val: stats?.total_recipes, icon: BookOpen, c: "text-brand-terracotta bg-brand-terracottaLight" },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((c, i) => (
        <div key={i} className="bg-white rounded-2xl border border-brand-line p-6" data-testid={`stat-card-${i}`}>
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.c}`}><c.icon className="w-5 h-5" /></span>
          <p className="text-3xl font-serif font-bold text-brand-ink mt-4">{c.val ?? "—"}</p>
          <p className="text-sm text-brand-muted mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

const emptyRecipe = {
  nombre_plato: "", categoria: "comida_saludable", descripcion: "", imagen_url: "",
  ingredientes: [], preparacion: [], emplatado: "", tiempo_preparacion: "", tiempo_coccion: "",
  dificultad: "Media", porciones: "", utensilios: [], nutricion: {}, published: true,
};

function RecetasTab() {
  const [recipes, setRecipes] = useState([]);
  const [editing, setEditing] = useState(null); // recipe obj or null
  const [showForm, setShowForm] = useState(false);
  const load = useCallback(() => api.get("/admin/recipes").then((r) => setRecipes(r.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!window.confirm("¿Eliminar esta receta?")) return;
    await api.delete(`/admin/recipes/${id}`);
    toast.success("Receta eliminada");
    load();
  };

  const [genId, setGenId] = useState(null);
  const genSteps = async (id) => {
    setGenId(id);
    toast.info("Generando fotos con IA... puede tardar un momento.");
    try {
      await api.post(`/admin/recipes/${id}/generate-steps`, {}, { timeout: 240000 });
      toast.success("Fotos generadas con IA");
      load();
    } catch {
      toast.error("No se pudieron generar las fotos");
    } finally { setGenId(null); }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="admin-new-recipe-btn"
          className="px-5 py-2.5 rounded-full bg-brand-green text-white font-semibold text-sm hover:bg-brand-greenHover transition-colors flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva receta manual</button>
        <PdfExtractor onImported={load} />
      </div>

      {showForm && <RecipeForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}

      <div className="bg-white rounded-2xl border border-brand-line overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead className="bg-brand-sand text-brand-muted text-left"><tr>
            <th className="px-5 py-3 font-medium">Receta</th><th className="px-5 py-3 font-medium">Categoría</th>
            <th className="px-5 py-3 font-medium hidden md:table-cell">Pasos</th><th className="px-5 py-3 font-medium text-right">Acciones</th>
          </tr></thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r.id} className="border-t border-brand-line" data-testid={`admin-recipe-row-${r.id}`}>
                <td className="px-5 py-3 font-medium text-brand-ink">{r.nombre_plato}</td>
                <td className="px-5 py-3"><span className={`text-xs px-2.5 py-1 rounded-full border ${CATEGORY_META[r.categoria]?.cls}`}>{CATEGORY_META[r.categoria]?.label}</span></td>
                <td className="px-5 py-3 text-brand-muted hidden md:table-cell">{r.preparacion?.length || 0} pasos</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => genSteps(r.id)} disabled={genId === r.id} data-testid={`admin-genimg-recipe-${r.id}`} title="Generar fotos de pasos con IA" className="p-2 rounded-lg hover:bg-brand-terracottaLight text-brand-terracotta disabled:opacity-50">{genId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}</button>
                    <button onClick={() => { setEditing(r); setShowForm(true); }} data-testid={`admin-edit-recipe-${r.id}`} className="p-2 rounded-lg hover:bg-brand-sand text-brand-green"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => del(r.id)} data-testid={`admin-delete-recipe-${r.id}`} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {recipes.length === 0 && <tr><td colSpan="4" className="px-5 py-10 text-center text-brand-muted">No hay recetas aún.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function toLines(arr) { return (arr || []).join("\n"); }
function fromLines(str) { return str.split("\n").map((s) => s.trim()).filter(Boolean); }

function RecipeForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState(initial ? {
    ...initial,
    ingredientes: toLines(initial.ingredientes), preparacion: toLines(initial.preparacion), utensilios: toLines(initial.utensilios),
    nutricion: initial.nutricion || {},
  } : { ...emptyRecipe, ingredientes: "", preparacion: "", utensilios: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF({ ...f, [k]: v });
  const setNut = (k, v) => setF({ ...f, nutricion: { ...f.nutricion, [k]: v } });

  const uploadImg = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    set("imagen_url", data.path);
    toast.success("Imagen subida");
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...f,
      ingredientes: fromLines(f.ingredientes), preparacion: fromLines(f.preparacion), utensilios: fromLines(f.utensilios),
      nutricion: f.nutricion || {},
    };
    try {
      if (initial?.id) await api.put(`/admin/recipes/${initial.id}`, payload);
      else await api.post("/admin/recipes", payload);
      toast.success("Receta guardada");
      onSaved();
    } catch (err) { toast.error("Error al guardar la receta"); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-sm";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8 px-4" data-testid="recipe-form-modal">
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-2xl p-7 my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-2xl font-bold text-brand-ink">{initial ? "Editar receta" : "Nueva receta"}</h2>
          <button type="button" onClick={onClose}><X className="w-6 h-6 text-brand-muted" /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="text-sm font-medium">Nombre del plato</label><input required value={f.nombre_plato} onChange={(e) => set("nombre_plato", e.target.value)} className={inputCls} data-testid="recipe-form-name" /></div>
          <div><label className="text-sm font-medium">Categoría</label><select value={f.categoria} onChange={(e) => set("categoria", e.target.value)} className={inputCls} data-testid="recipe-form-category">{CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <div><label className="text-sm font-medium">Dificultad</label><select value={f.dificultad} onChange={(e) => set("dificultad", e.target.value)} className={inputCls}><option>Fácil</option><option>Media</option><option>Difícil</option></select></div>
          <div className="sm:col-span-2"><label className="text-sm font-medium">Descripción</label><textarea value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={2} className={inputCls} /></div>
          <div><label className="text-sm font-medium">Tiempo de preparación</label><input value={f.tiempo_preparacion} onChange={(e) => set("tiempo_preparacion", e.target.value)} placeholder="20 min" className={inputCls} /></div>
          <div><label className="text-sm font-medium">Tiempo de cocción</label><input value={f.tiempo_coccion} onChange={(e) => set("tiempo_coccion", e.target.value)} placeholder="15 min" className={inputCls} /></div>
          <div><label className="text-sm font-medium">Porciones</label><input value={f.porciones} onChange={(e) => set("porciones", e.target.value)} placeholder="4 porciones" className={inputCls} /></div>
          <div><label className="text-sm font-medium">Imagen</label><input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImg(e.target.files[0])} className="text-xs mt-2" data-testid="recipe-form-image" />{f.imagen_url && <span className="text-xs text-brand-green block mt-1">✓ imagen lista</span>}</div>
          <div className="sm:col-span-2"><label className="text-sm font-medium">Ingredientes (uno por línea)</label><textarea value={f.ingredientes} onChange={(e) => set("ingredientes", e.target.value)} rows={4} className={inputCls} data-testid="recipe-form-ingredients" /></div>
          <div className="sm:col-span-2"><label className="text-sm font-medium">Modo de preparación (un paso por línea)</label><textarea value={f.preparacion} onChange={(e) => set("preparacion", e.target.value)} rows={5} className={inputCls} data-testid="recipe-form-steps" /></div>
          <div className="sm:col-span-2"><label className="text-sm font-medium">Emplatado / Servido</label><textarea value={f.emplatado} onChange={(e) => set("emplatado", e.target.value)} rows={2} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className="text-sm font-medium">Utensilios (uno por línea)</label><textarea value={f.utensilios} onChange={(e) => set("utensilios", e.target.value)} rows={2} className={inputCls} /></div>
          <div className="sm:col-span-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[["calorias", "Calorías"], ["proteinas", "Proteínas"], ["carbohidratos", "Carbos"], ["grasas", "Grasas"], ["fibra", "Fibra"]].map(([k, l]) => (
              <div key={k}><label className="text-xs text-brand-muted">{l}</label><input value={f.nutricion?.[k] || ""} onChange={(e) => setNut(k, e.target.value)} className={inputCls} /></div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={saving} data-testid="recipe-form-save" className="px-6 py-2.5 rounded-full bg-brand-green text-white font-semibold text-sm hover:bg-brand-greenHover flex items-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar receta</button>
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-full border border-brand-line font-semibold text-sm">Cancelar</button>
        </div>
      </form>
    </div>
  );
}

function PdfExtractor({ onImported }) {
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);

  const extract = async (file) => {
    setLoading(true);
    setDrafts([]);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/admin/pdf-extract", fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
      if (!data.recipes?.length) { toast.error("No se detectaron recetas en el PDF"); return; }
      setDrafts(data.recipes);
      toast.success(`${data.count} receta(s) extraída(s). Revísalas y guárdalas.`);
    } catch (err) {
      toast.error("No se pudo procesar el PDF. Verifica que contenga recetas.");
    } finally { setLoading(false); }
  };

  const saveDraft = async (idx) => {
    try {
      await api.post("/admin/recipes", drafts[idx]);
      toast.success("Receta guardada en el catálogo");
      setDrafts(drafts.filter((_, i) => i !== idx));
      onImported();
    } catch { toast.error("Error al guardar"); }
  };

  const saveAll = async () => {
    for (const d of drafts) { try { await api.post("/admin/recipes", d); } catch {} }
    toast.success("Recetas guardadas");
    setDrafts([]); onImported();
  };

  return (
    <>
      <label className="px-5 py-2.5 rounded-full border border-brand-terracotta text-brand-terracotta font-semibold text-sm hover:bg-brand-terracottaLight transition-colors flex items-center gap-2 cursor-pointer" data-testid="admin-pdf-upload-button">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} {loading ? "Extrayendo con IA..." : "Importar recetas desde PDF"}
        <input type="file" accept="application/pdf" className="hidden" disabled={loading} onChange={(e) => e.target.files[0] && extract(e.target.files[0])} />
      </label>

      {drafts.length > 0 && (
        <div className="w-full mt-4 bg-white rounded-2xl border border-brand-line p-5" data-testid="pdf-drafts-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-bold text-brand-ink flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-terracotta" /> Recetas extraídas ({drafts.length})</h3>
            <button onClick={saveAll} className="text-sm font-semibold text-brand-green hover:underline">Guardar todas</button>
          </div>
          <div className="space-y-3">
            {drafts.map((d, i) => (
              <div key={i} className="flex items-center justify-between border border-brand-line rounded-xl p-4">
                <div><p className="font-semibold text-brand-ink">{d.nombre_plato}</p>
                  <p className="text-xs text-brand-muted">{CATEGORY_META[d.categoria]?.label} · {d.ingredientes?.length || 0} ingredientes · {d.preparacion?.length || 0} pasos</p></div>
                <div className="flex gap-2">
                  <button onClick={() => saveDraft(i)} data-testid={`pdf-draft-save-${i}`} className="px-4 py-2 rounded-full bg-brand-green text-white text-xs font-semibold hover:bg-brand-greenHover">Guardar</button>
                  <button onClick={() => setDrafts(drafts.filter((_, x) => x !== i))} className="p-2 rounded-full hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function UsuariosTab() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [nf, setNf] = useState({ name: "", email: "", password: "", role: "client", grant_days: 30 });
  const load = useCallback(() => api.get("/admin/users").then((r) => setUsers(r.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try { await api.post("/admin/users", { ...nf, grant_days: Number(nf.grant_days) }); toast.success("Cuenta creada"); setShowForm(false); setNf({ name: "", email: "", password: "", role: "client", grant_days: 30 }); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Error al crear la cuenta"); }
  };
  const grant = async (id) => { await api.post(`/admin/users/${id}/grant?days=30`); toast.success("Suscripción activada 30 días"); load(); };
  const revoke = async (id) => { await api.post(`/admin/users/${id}/revoke`); toast.success("Suscripción revocada"); load(); };
  const del = async (id) => { if (!window.confirm("¿Eliminar usuario?")) return; try { await api.delete(`/admin/users/${id}`); toast.success("Usuario eliminado"); load(); } catch (e) { toast.error(e.response?.data?.detail || "Error"); } };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-sm";

  return (
    <div>
      <button onClick={() => setShowForm(!showForm)} data-testid="admin-new-user-btn" className="px-5 py-2.5 rounded-full bg-brand-green text-white font-semibold text-sm hover:bg-brand-greenHover flex items-center gap-2 mb-6"><Plus className="w-4 h-4" /> Crear cuenta de cliente</button>

      {showForm && (
        <form onSubmit={create} className="bg-white rounded-2xl border border-brand-line p-6 mb-6 grid sm:grid-cols-2 gap-4" data-testid="admin-user-form">
          <input required placeholder="Nombre" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} className={inputCls} data-testid="new-user-name" />
          <input required type="email" placeholder="Correo" value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} className={inputCls} data-testid="new-user-email" />
          <input required placeholder="Contraseña" value={nf.password} onChange={(e) => setNf({ ...nf, password: e.target.value })} className={inputCls} data-testid="new-user-password" />
          <select value={nf.role} onChange={(e) => setNf({ ...nf, role: e.target.value })} className={inputCls}><option value="client">Cliente</option><option value="admin">Administrador</option></select>
          <input type="number" placeholder="Días de suscripción" value={nf.grant_days} onChange={(e) => setNf({ ...nf, grant_days: e.target.value })} className={inputCls} />
          <button type="submit" data-testid="admin-create-user-submit" className="px-6 py-2.5 rounded-full bg-brand-green text-white font-semibold text-sm">Crear cuenta</button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-brand-line overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-brand-sand text-brand-muted text-left"><tr>
            <th className="px-5 py-3 font-medium">Nombre</th><th className="px-5 py-3 font-medium">Correo</th><th className="px-5 py-3 font-medium">Rol</th><th className="px-5 py-3 font-medium">Suscripción</th><th className="px-5 py-3 font-medium text-right">Acciones</th>
          </tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-brand-line" data-testid={`admin-user-row-${u.id}`}>
                <td className="px-5 py-3 font-medium text-brand-ink">{u.name}</td>
                <td className="px-5 py-3 text-brand-muted">{u.email}</td>
                <td className="px-5 py-3">{u.role === "admin" ? <span className="text-xs px-2.5 py-1 rounded-full bg-brand-terracottaLight text-brand-terracotta">Admin</span> : <span className="text-xs text-brand-muted">Cliente</span>}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${u.subscription_status === "active" ? "bg-emerald-100 text-emerald-700" : u.subscription_status === "pending" ? "bg-amber-100 text-amber-700" : u.subscription_status === "expired" ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-600"}`}>{u.subscription_status === "active" ? "Activa" : u.subscription_status === "pending" ? "Pendiente" : u.subscription_status === "expired" ? "Vencida" : "Inactiva"}</span>
                  {u.role !== "admin" && u.subscription_expires_at && <div className="text-xs text-brand-muted mt-1">Vence: {new Date(u.subscription_expires_at).toLocaleDateString("es-PE")}</div>}
                </td>
                <td className="px-5 py-3">
                  {u.role !== "admin" && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => grant(u.id)} data-testid={`admin-grant-${u.id}`} className="text-xs px-3 py-1.5 rounded-full bg-brand-green text-white hover:bg-brand-greenHover">{u.subscription_status === "active" ? "Renovar 30d" : "Activar 30d"}</button>
                      {u.subscription_status === "active" && (
                        <button onClick={() => revoke(u.id)} data-testid={`admin-revoke-${u.id}`} className="text-xs px-3 py-1.5 rounded-full border border-brand-line hover:bg-brand-sand">Revocar</button>
                      )}
                      <button onClick={() => del(u.id)} data-testid={`admin-delete-user-${u.id}`} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PagosTab() {
  const [payments, setPayments] = useState([]);
  const load = useCallback(() => api.get("/admin/payments").then((r) => setPayments(r.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const approve = async (id) => { await api.post(`/admin/payments/${id}/approve?days=30`); toast.success("Pago aprobado, suscripción activada"); load(); };
  const reject = async (id) => { await api.post(`/admin/payments/${id}/reject`); toast.success("Pago rechazado"); load(); };

  return (
    <div className="space-y-3">
      {payments.length === 0 && <div className="bg-white rounded-2xl border border-brand-line p-10 text-center text-brand-muted">No hay comprobantes de pago.</div>}
      {payments.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl border border-brand-line p-5 flex flex-wrap items-center gap-4" data-testid={`admin-payment-row-${p.id}`}>
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold text-brand-ink">{p.user_name} <span className="text-brand-muted font-normal text-sm">· {p.user_email}</span></p>
            <p className="text-sm text-brand-muted mt-1">Método: <span className="capitalize font-medium text-brand-ink">{p.metodo}</span> · {new Date(p.created_at).toLocaleString("es-PE")}</p>
          </div>
          <a href={`${API}/files/${p.proof_path}`} target="_blank" rel="noreferrer" data-testid={`admin-view-proof-${p.id}`} className="text-sm px-4 py-2 rounded-full border border-brand-line hover:bg-brand-sand flex items-center gap-1"><Eye className="w-4 h-4" /> Ver comprobante</a>
          {p.status === "pending" ? (
            <div className="flex gap-2">
              <button onClick={() => approve(p.id)} data-testid={`admin-approve-payment-btn-${p.id}`} className="text-sm px-4 py-2 rounded-full bg-brand-green text-white font-semibold flex items-center gap-1 hover:bg-brand-greenHover"><CheckCircle2 className="w-4 h-4" /> Aprobar</button>
              <button onClick={() => reject(p.id)} data-testid={`admin-reject-payment-btn-${p.id}`} className="text-sm px-4 py-2 rounded-full border border-red-200 text-red-600 font-semibold flex items-center gap-1 hover:bg-red-50"><XCircle className="w-4 h-4" /> Rechazar</button>
            </div>
          ) : (
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${p.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{p.status === "approved" ? "Aprobado" : "Rechazado"}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function AjustesTab() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/settings").then((r) => setS(r.data)).catch(() => {}); }, []);
  if (!s) return <Loader2 className="w-6 h-6 animate-spin text-brand-green" />;

  const setMethod = (m, k, v) => setS({ ...s, [m]: { ...(s[m] || {}), [k]: v } });
  const save = async () => {
    try {
      await api.put("/admin/settings", { precio: s.precio, moneda: s.moneda || "PEN", yape: s.yape || {}, plin: s.plin || {}, bcp: s.bcp || {}, bbva: s.bbva || {}, instrucciones: s.instrucciones || "" });
      toast.success("Ajustes guardados");
    } catch { toast.error("Error al guardar"); }
  };
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-sm";

  return (
    <div className="max-w-3xl space-y-6" data-testid="admin-settings">
      <div className="bg-white rounded-2xl border border-brand-line p-6">
        <h3 className="font-serif text-lg font-bold text-brand-ink mb-4">Precio de suscripción</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Precio (S/)</label><input value={s.precio || ""} onChange={(e) => setS({ ...s, precio: e.target.value })} className={inputCls} data-testid="settings-price" /></div>
          <div><label className="text-sm font-medium">Moneda</label><input value={s.moneda || "PEN"} onChange={(e) => setS({ ...s, moneda: e.target.value })} className={inputCls} /></div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[["yape", "Yape"], ["plin", "Plin"]].map(([m, label]) => (
          <div key={m} className="bg-white rounded-2xl border border-brand-line p-6">
            <h3 className="font-serif text-lg font-bold text-brand-ink mb-4">{label}</h3>
            <label className="text-sm font-medium">Número</label><input value={s[m]?.numero || ""} onChange={(e) => setMethod(m, "numero", e.target.value)} className={inputCls + " mb-3"} />
            <label className="text-sm font-medium">Titular</label><input value={s[m]?.titular || ""} onChange={(e) => setMethod(m, "titular", e.target.value)} className={inputCls} />
          </div>
        ))}
        {[["bcp", "BCP"], ["bbva", "BBVA"]].map(([m, label]) => (
          <div key={m} className="bg-white rounded-2xl border border-brand-line p-6">
            <h3 className="font-serif text-lg font-bold text-brand-ink mb-4">{label}</h3>
            <label className="text-sm font-medium">Cuenta</label><input value={s[m]?.cuenta || ""} onChange={(e) => setMethod(m, "cuenta", e.target.value)} className={inputCls + " mb-3"} />
            <label className="text-sm font-medium">CCI</label><input value={s[m]?.cci || ""} onChange={(e) => setMethod(m, "cci", e.target.value)} className={inputCls + " mb-3"} />
            <label className="text-sm font-medium">Titular</label><input value={s[m]?.titular || ""} onChange={(e) => setMethod(m, "titular", e.target.value)} className={inputCls} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-brand-line p-6">
        <label className="text-sm font-medium">Instrucciones para el cliente</label>
        <textarea value={s.instrucciones || ""} onChange={(e) => setS({ ...s, instrucciones: e.target.value })} rows={3} className={inputCls} />
      </div>

      <button onClick={save} data-testid="settings-save-btn" className="px-6 py-3 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover flex items-center gap-2"><Save className="w-4 h-4" /> Guardar ajustes</button>
    </div>
  );
}
