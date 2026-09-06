import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, resolveImg, CATEGORY_META, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { CalendarDays, Sparkles, Loader2, ShoppingCart, ChefHat, Wand2 } from "lucide-react";

const OBJETIVOS = [
  { id: "todas", label: "Variado (todas)" },
  { id: "diabeticos", label: "Para Diabéticos" },
  { id: "bajar_peso", label: "Bajar de Peso" },
  { id: "comida_saludable", label: "Comida Saludable" },
  { id: "veganos", label: "Veganos" },
];

export default function Menu() {
  const [menu, setMenu] = useState(null);
  const [nutri, setNutri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const loadNutri = () => api.get("/menu/nutrition").then((r) => setNutri(r.data)).catch(() => {});
  const [objetivo, setObjetivo] = useState("todas");
  const [comidas, setComidas] = useState(3);
  const [evitar, setEvitar] = useState("");

  useEffect(() => {
    api.get("/menu").then((r) => {
      if (r.data && r.data.dias) { setMenu(r.data); loadNutri(); } else { setMenu(null); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post("/menu/generate", {
        objetivo, comidas_por_dia: Number(comidas),
        evitar: evitar.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setMenu(data);
      loadNutri();
      toast.success("¡Tu menú semanal está listo!");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="py-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-11 h-11 rounded-xl bg-brand-green text-white flex items-center justify-center"><CalendarDays className="w-6 h-6" /></span>
        <div><p className="eyebrow">Planificador</p><h1 className="font-serif text-4xl font-bold text-brand-ink">Mi Menú Semanal</h1></div>
      </div>
      <p className="text-brand-muted mb-8 max-w-2xl">Responde unas preguntas y crearemos tu semana completa. Luego genera tu lista de compras con un clic.</p>

      <div className="bg-white rounded-2xl border border-brand-line p-6 mb-10">
        <h2 className="font-serif text-xl font-bold text-brand-ink flex items-center gap-2 mb-5"><Wand2 className="w-5 h-5 text-brand-terracotta" /> Generar mi menú</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">¿Cuál es tu objetivo?</label>
            <select data-testid="menu-objetivo" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-sm">
              {OBJETIVOS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Comidas por día</label>
            <select data-testid="menu-comidas" value={comidas} onChange={(e) => setComidas(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-sm">
              <option value={2}>2 (Almuerzo y Cena)</option>
              <option value={3}>3 (Desayuno, Almuerzo y Cena)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Ingredientes a evitar</label>
            <input data-testid="menu-evitar" value={evitar} onChange={(e) => setEvitar(e.target.value)} placeholder="ej. maní, mariscos" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-sm" />
          </div>
        </div>
        <button onClick={generate} disabled={generating} data-testid="menu-generate-btn" className="mt-5 px-6 py-3 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover transition-all disabled:opacity-60 flex items-center gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generar mi menú semanal
        </button>
      </div>

      {menu ? (
        <>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-2xl font-bold text-brand-ink">Tu semana</h2>
            <Link to="/compras" data-testid="menu-to-compras" className="text-sm font-semibold text-brand-green hover:underline flex items-center gap-1"><ShoppingCart className="w-4 h-4" /> Ver lista de compras</Link>
          </div>

          {nutri?.promedio && (
            <div className="bg-brand-greenLight border border-brand-green/20 rounded-2xl p-5 mb-6" data-testid="menu-nutrition-summary">
              <p className="text-sm font-semibold text-brand-ink mb-3">Promedio nutricional por día <span className="font-normal text-brand-muted">(aproximado)</span></p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[["Calorías", nutri.promedio.calorias, "kcal"], ["Proteínas", nutri.promedio.proteinas, "g"], ["Carbohidratos", nutri.promedio.carbohidratos, "g"], ["Grasas", nutri.promedio.grasas, "g"], ["Fibra", nutri.promedio.fibra, "g"]].map(([l, v, u]) => (
                  <div key={l} className="bg-white rounded-xl border border-brand-line px-3 py-2 text-center">
                    <p className="text-lg font-serif font-bold text-brand-green">{v}<span className="text-xs text-brand-muted font-sans"> {u}</span></p>
                    <p className="text-[11px] text-brand-muted">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {menu.dias.map((d, i) => {
              const nd = (nutri?.dias || []).find((x) => x.dia === d.dia);
              return (
              <div key={i} className="bg-white rounded-2xl border border-brand-line overflow-hidden fade-up" style={{ animationDelay: `${i * 50}ms` }} data-testid={`menu-day-${i}`}>
                <div className="bg-brand-green text-white px-4 py-2.5 font-semibold font-sans flex items-center justify-between">
                  <span>{d.dia}</span>
                  {nd && <span className="text-xs font-mono font-normal text-brand-cream/90">{nd.calorias} kcal</span>}
                </div>
                {nd && (
                  <div className="px-4 py-2 border-b border-brand-line bg-brand-sand/40 text-[11px] text-brand-muted flex gap-3" data-testid={`menu-day-nutri-${i}`}>
                    <span>P {nd.proteinas}g</span><span>C {nd.carbohidratos}g</span><span>G {nd.grasas}g</span><span>Fibra {nd.fibra}g</span>
                  </div>
                )}
                <div className="divide-y divide-brand-line">
                  {d.comidas.map((c, j) => (
                    <Link to={`/recetas/${c.recipe_id}`} key={j} className="flex items-center gap-3 p-3 hover:bg-brand-sand transition-colors">
                      {c.imagen_url ? <img src={resolveImg(c.imagen_url)} alt={c.nombre} className="w-14 h-14 rounded-xl object-cover shrink-0" /> : <span className="w-14 h-14 rounded-xl bg-brand-sand flex items-center justify-center shrink-0"><ChefHat className="w-5 h-5 text-brand-muted" /></span>}
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono uppercase tracking-wide text-brand-terracotta">{c.tipo}</p>
                        <p className="text-sm font-medium text-brand-ink leading-tight line-clamp-2">{c.nombre}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );})}
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-brand-muted bg-white rounded-2xl border border-dashed border-brand-line">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aún no tienes un menú. Completa las preguntas y genera tu primera semana.</p>
        </div>
      )}
    </div>
  );
}
