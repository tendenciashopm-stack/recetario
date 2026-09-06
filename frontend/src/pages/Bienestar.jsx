import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Droplets, Plus, Minus, RotateCcw, Bell, BellOff, Loader2, Clock } from "lucide-react";

const DEFAULT_REMINDERS = [
  { key: "desayuno", label: "Desayuno", time: "08:00", msg: "Ya es hora de tu desayuno 🍳", on: true },
  { key: "menu", label: "Revisar mi menú", time: "10:00", msg: "Recuerda revisar tu menú de hoy 📅", on: true },
  { key: "almuerzo", label: "Almuerzo", time: "13:00", msg: "Ya es hora de tu almuerzo 🍲", on: true },
  { key: "agua", label: "Tomar agua", time: "16:00", msg: "Toma un vaso de agua 💧", on: true },
  { key: "cena", label: "Cena", time: "20:00", msg: "Ya es hora de tu cena 🥗", on: true },
];

export default function Bienestar() {
  const [water, setWater] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(Number(localStorage.getItem("sn_agua_meta") || 8));
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sn_reminders")) || DEFAULT_REMINDERS; } catch { return DEFAULT_REMINDERS; }
  });
  const [permission, setPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const timers = useRef([]);

  const loadWater = () => api.get("/water").then((r) => setWater(r.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { loadWater(); }, []);

  const add = async (n) => { const { data } = await api.post(`/water/add?n=${n}`); setWater((w) => ({ ...w, vasos: data.vasos })); };
  const reset = async () => { const { data } = await api.post("/water/reset"); setWater((w) => ({ ...w, vasos: data.vasos })); };
  const saveMeta = (v) => { const n = Math.max(1, Number(v) || 8); setMeta(n); localStorage.setItem("sn_agua_meta", n); };

  // reminders scheduling
  useEffect(() => {
    localStorage.setItem("sn_reminders", JSON.stringify(reminders));
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    if (permission !== "granted") return;
    const now = new Date();
    reminders.filter((r) => r.on).forEach((r) => {
      const [h, m] = r.time.split(":").map(Number);
      const when = new Date(); when.setHours(h, m, 0, 0);
      const diff = when.getTime() - now.getTime();
      if (diff > 0 && diff < 24 * 3600 * 1000) {
        const id = setTimeout(() => { try { new Notification("Salud Nutrition", { body: r.msg }); } catch {} }, diff);
        timers.current.push(id);
      }
    });
    return () => { timers.current.forEach((t) => clearTimeout(t)); };
  }, [reminders, permission]);

  const enableNotifs = async () => {
    if (typeof Notification === "undefined") { toast.error("Tu navegador no soporta notificaciones"); return; }
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") { toast.success("¡Notificaciones activadas!"); try { new Notification("Salud Nutrition", { body: "Te avisaremos a las horas configuradas ✅" }); } catch {} }
    else toast.error("Permiso de notificaciones denegado");
  };

  const updateReminder = (key, patch) => setReminders((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const vasos = water?.vasos || 0;
  const pct = Math.min(100, Math.round((vasos / meta) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-11 h-11 rounded-xl bg-brand-green text-white flex items-center justify-center"><Droplets className="w-6 h-6" /></span>
        <div><p className="eyebrow">Hábitos diarios</p><h1 className="font-serif text-4xl font-bold text-brand-ink">Bienestar</h1></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* AGUA */}
        <div className="bg-white rounded-2xl border border-brand-line p-6" data-testid="water-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-brand-ink flex items-center gap-2"><Droplets className="w-5 h-5 text-sky-500" /> Recordatorio de agua</h2>
            <div className="flex items-center gap-1 text-sm text-brand-muted">Meta:
              <input type="number" min="1" value={meta} onChange={(e) => saveMeta(e.target.value)} className="w-14 ml-1 px-2 py-1 rounded-lg border border-brand-line text-center" data-testid="water-meta" /> vasos
            </div>
          </div>

          {loading ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div> : (
            <>
              <div className="text-center py-2">
                <p className="text-5xl font-serif font-bold text-sky-500" data-testid="water-count">{vasos}<span className="text-xl text-brand-muted font-sans"> / {meta}</span></p>
                <p className="text-xs text-brand-muted mt-1">vasos de agua hoy</p>
              </div>
              <div className="h-3 bg-brand-sand rounded-full overflow-hidden mt-3">
                <div className="h-full bg-sky-400 transition-all duration-500" style={{ width: `${pct}%` }} data-testid="water-progress" />
              </div>
              {vasos >= meta && <p className="text-center text-sm text-emerald-600 mt-2 font-medium">¡Meta cumplida! 🎉</p>}

              <div className="flex items-center justify-center gap-2 mt-5">
                <button onClick={() => add(-1)} className="w-10 h-10 rounded-full border border-brand-line flex items-center justify-center hover:bg-brand-sand" data-testid="water-minus"><Minus className="w-4 h-4" /></button>
                {[1, 2, 3].map((n) => (
                  <button key={n} onClick={() => add(n)} data-testid={`water-add-${n}`} className="px-4 h-10 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 flex items-center gap-1"><Plus className="w-4 h-4" /> {n}</button>
                ))}
                <button onClick={reset} className="w-10 h-10 rounded-full border border-brand-line flex items-center justify-center hover:bg-brand-sand" data-testid="water-reset"><RotateCcw className="w-4 h-4" /></button>
              </div>

              {water?.semana?.length > 0 && (
                <div className="mt-6 flex items-end justify-between gap-1 h-16">
                  {[...water.semana].reverse().map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-sky-200 rounded-t" style={{ height: `${Math.min(100, (d.vasos / meta) * 100)}%` }} title={`${d.vasos} vasos`} />
                      <span className="text-[9px] text-brand-muted">{d.fecha.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* RECORDATORIOS */}
        <div className="bg-white rounded-2xl border border-brand-line p-6" data-testid="reminders-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-brand-ink flex items-center gap-2"><Bell className="w-5 h-5 text-brand-terracotta" /> Recordatorios</h2>
            {permission === "granted" ? (
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1"><Bell className="w-3 h-3" /> Activas</span>
            ) : (
              <button onClick={enableNotifs} data-testid="reminders-enable" className="text-xs px-3 py-1.5 rounded-full bg-brand-green text-white font-medium flex items-center gap-1"><Bell className="w-3 h-3" /> Activar notificaciones</button>
            )}
          </div>

          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.key} className="flex items-center gap-3 p-3 rounded-xl border border-brand-line" data-testid={`reminder-${r.key}`}>
                <Clock className="w-4 h-4 text-brand-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-ink">{r.label}</p>
                  <p className="text-xs text-brand-muted truncate">{r.msg}</p>
                </div>
                <input type="time" value={r.time} onChange={(e) => updateReminder(r.key, { time: e.target.value })} className="px-2 py-1 rounded-lg border border-brand-line text-sm" />
                <button onClick={() => updateReminder(r.key, { on: !r.on })} data-testid={`reminder-toggle-${r.key}`} className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${r.on ? "bg-brand-green" : "bg-brand-line"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${r.on ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-brand-muted mt-4 flex items-start gap-1.5"><BellOff className="w-4 h-4 shrink-0 mt-0.5" /> Las notificaciones llegan mientras tienes la app abierta en tu navegador. Configura las horas que prefieras.</p>
        </div>
      </div>
    </div>
  );
}
