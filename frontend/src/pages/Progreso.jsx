import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { BarChart3, Loader2, Plus, Trash2, Flame, CalendarCheck, ChefHat } from "lucide-react";

export default function Progreso() {
  const [data, setData] = useState({ entries: [], total_recetas: 0, dias_registrados: 0 });
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [recetas, setRecetas] = useState(1);
  const [peso, setPeso] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api.get("/progress").then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/progress", { fecha, recetas_cocinadas: Number(recetas), peso, nota });
      toast.success("¡Progreso registrado!");
      setNota(""); setPeso("");
      load();
    } catch { toast.error("No se pudo registrar"); }
    finally { setSaving(false); }
  };

  const del = async (id) => { await api.delete(`/progress/${id}`); load(); };

  const inputCls = "w-full mt-1 px-3 py-2.5 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-sm";
  const cards = [
    { label: "Recetas cocinadas", val: data.total_recetas, icon: ChefHat, c: "text-brand-green bg-brand-greenLight" },
    { label: "Días registrados", val: data.dias_registrados, icon: CalendarCheck, c: "text-brand-terracotta bg-brand-terracottaLight" },
    { label: "Racha actual", val: data.dias_registrados, icon: Flame, c: "text-amber-700 bg-amber-50" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-11 h-11 rounded-xl bg-brand-green text-white flex items-center justify-center"><BarChart3 className="w-6 h-6" /></span>
        <div><p className="eyebrow">Seguimiento</p><h1 className="font-serif text-4xl font-bold text-brand-ink">Mi Progreso</h1></div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-brand-line p-5" data-testid={`progress-stat-${i}`}>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.c}`}><c.icon className="w-5 h-5" /></span>
            <p className="text-3xl font-serif font-bold text-brand-ink mt-3">{c.val}</p>
            <p className="text-xs text-brand-muted mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="bg-white rounded-2xl border border-brand-line p-6 mb-8" data-testid="progress-form">
        <h2 className="font-serif text-xl font-bold text-brand-ink mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-brand-green" /> Registrar día</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          <div><label className="text-sm font-medium">Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} data-testid="progress-fecha" /></div>
          <div><label className="text-sm font-medium">Recetas cocinadas</label><input type="number" min="0" value={recetas} onChange={(e) => setRecetas(e.target.value)} className={inputCls} data-testid="progress-recetas" /></div>
          <div><label className="text-sm font-medium">Peso (kg) opcional</label><input value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="ej. 72" className={inputCls} data-testid="progress-peso" /></div>
          <div><label className="text-sm font-medium">Nota</label><input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="¿Cómo te sentiste?" className={inputCls} data-testid="progress-nota" /></div>
        </div>
        <button type="submit" disabled={saving} data-testid="progress-save-btn" className="mt-5 px-6 py-2.5 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover disabled:opacity-60 flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Guardar
        </button>
      </form>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
      ) : data.entries.length === 0 ? (
        <p className="text-center text-brand-muted py-10">Aún no tienes registros. ¡Empieza hoy!</p>
      ) : (
        <div className="space-y-2">
          {data.entries.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border border-brand-line px-5 py-3 flex items-center gap-4" data-testid={`progress-entry-${e.id}`}>
              <span className="text-sm font-semibold text-brand-ink w-28">{new Date(e.fecha).toLocaleDateString("es-PE")}</span>
              <span className="text-sm text-brand-muted flex items-center gap-1"><ChefHat className="w-4 h-4" /> {e.recetas_cocinadas} recetas</span>
              {e.peso && <span className="text-sm text-brand-muted">{e.peso} kg</span>}
              {e.nota && <span className="text-sm text-brand-muted italic truncate flex-1">"{e.nota}"</span>}
              <button onClick={() => del(e.id)} className="ml-auto p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
