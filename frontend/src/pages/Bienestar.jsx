import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Droplets, Plus, Minus, RotateCcw, Bell, BellOff, Loader2, Clock, Send } from "lucide-react";
import { pushSupported, getCurrentPushSubscription, subscribePush, unsubscribePush, sendTestPush } from "@/lib/push";

const FALLBACK = [
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
  const [reminders, setReminders] = useState(FALLBACK);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();
  const saveTimer = useRef(null);
  const firstLoad = useRef(true);

  const loadWater = () => api.get("/water").then((r) => setWater(r.data)).catch(() => {}).finally(() => setLoading(false));
  const refreshWater = () => api.get("/water").then((r) => setWater(r.data)).catch(() => {});

  useEffect(() => {
    loadWater();
    api.get("/reminders").then((r) => setReminders(r.data.reminders || FALLBACK)).catch(() => {});
    if (supported) getCurrentPushSubscription().then((s) => setSubscribed(!!s)).catch(() => {});
  }, []); // eslint-disable-line

  // persist reminders to backend (debounced), skip first render
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.put("/reminders", { reminders }).catch(() => {});
    }, 700);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [reminders]);

  const add = async (n) => { await api.post(`/water/add?n=${n}`); refreshWater(); };
  const reset = async () => { await api.post("/water/reset"); refreshWater(); };
  const saveMeta = (v) => { const n = Math.max(1, Number(v) || 8); setMeta(n); localStorage.setItem("sn_agua_meta", n); };
  const metaInteligente = () => {
    const peso = Number(localStorage.getItem("sn_peso") || 0);
    if (!peso) { toast.info("Primero usa la Calculadora para registrar tu peso"); return; }
    const glasses = Math.max(4, Math.round((peso * 35) / 250));
    saveMeta(glasses);
    toast.success(`Meta ajustada a ${glasses} vasos según tu peso (${peso} kg)`);
  };
  const streak = (() => {
    if (!water?.semana?.length) return 0;
    const byDate = [...water.semana].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    let s = 0;
    for (const d of byDate) { if (d.vasos >= meta) s++; else break; }
    return s;
  })();

  const enableNotifs = async () => {
    setBusy(true);
    try {
      await subscribePush();
      setSubscribed(true);
      await api.put("/reminders", { reminders }).catch(() => {});
      await sendTestPush();
      toast.success("¡Notificaciones activadas! Te avisaremos aunque cierres la app.");
    } catch (e) {
      toast.error(e.message || "No se pudo activar las notificaciones");
    } finally { setBusy(false); }
  };

  const disableNotifs = async () => {
    setBusy(true);
    try { await unsubscribePush(); setSubscribed(false); toast.info("Notificaciones desactivadas"); }
    catch { toast.error("No se pudo desactivar"); }
    finally { setBusy(false); }
  };

  const testNotif = async () => {
    try { await sendTestPush(); toast.success("Enviamos una notificación de prueba 🔔"); }
    catch { toast.error("No se pudo enviar la prueba"); }
  };

  const updateReminder = (key, patch) => setReminders((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const vasos = water?.vasos || 0;
  const pct = Math.min(100, Math.round((vasos / meta) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-11 h-11 rounded-xl bg-brand-green text-white flex items-center justify-center"><Droplets className="w-6 h-6" /></span>
        <div><p className="eyebrow">Hábitos diarios</p><h1 className="font-serif text-3xl sm:text-4xl font-bold text-brand-ink">Bienestar</h1></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* AGUA */}
        <div className="bg-white rounded-2xl border border-brand-line p-5 sm:p-6 min-w-0" data-testid="water-card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-brand-ink flex items-center gap-2"><Droplets className="w-5 h-5 text-sky-500" /> Recordatorio de agua</h2>
            <div className="flex items-center gap-1 text-sm text-brand-muted">Meta:
              <input type="number" min="1" value={meta} onChange={(e) => saveMeta(e.target.value)} className="w-14 ml-1 px-2 py-1 rounded-lg border border-brand-line text-center" data-testid="water-meta" /> vasos
              <button onClick={metaInteligente} data-testid="water-auto-meta" className="ml-1 text-xs px-2 py-1 rounded-lg bg-sky-100 text-sky-700 font-medium hover:bg-sky-200">Auto</button>
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

              {streak > 0 && (
                <div className="mt-3 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl py-2" data-testid="water-streak">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-semibold text-amber-800">Racha de {streak} {streak === 1 ? "día" : "días"} cumpliendo tu meta</span>
                </div>
              )}

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
        <div className="bg-white rounded-2xl border border-brand-line p-5 sm:p-6 min-w-0" data-testid="reminders-card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-brand-ink flex items-center gap-2"><Bell className="w-5 h-5 text-brand-terracotta" /> Recordatorios</h2>
            {!supported ? (
              <span className="text-xs px-3 py-1 rounded-full bg-brand-sand text-brand-muted font-medium">No disponible en este navegador</span>
            ) : subscribed ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1"><Bell className="w-3 h-3" /> Activas</span>
                <button onClick={testNotif} data-testid="reminders-test" className="text-xs px-2.5 py-1 rounded-full border border-brand-line hover:bg-brand-sand flex items-center gap-1"><Send className="w-3 h-3" /> Prueba</button>
                <button onClick={disableNotifs} disabled={busy} data-testid="reminders-disable" className="text-xs px-2.5 py-1 rounded-full border border-brand-line hover:bg-brand-sand text-brand-muted">Desactivar</button>
              </div>
            ) : (
              <button onClick={enableNotifs} disabled={busy} data-testid="reminders-enable" className="text-xs px-3 py-1.5 rounded-full bg-brand-green text-white font-medium flex items-center gap-1 disabled:opacity-60">
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />} Activar notificaciones
              </button>
            )}
          </div>

          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.key} className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl border border-brand-line" data-testid={`reminder-${r.key}`}>
                <Clock className="w-4 h-4 text-brand-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-ink">{r.label}</p>
                  <p className="text-xs text-brand-muted truncate">{r.msg}</p>
                </div>
                <input type="time" value={r.time} onChange={(e) => updateReminder(r.key, { time: e.target.value })} className="px-2 py-1 rounded-lg border border-brand-line text-sm shrink-0" data-testid={`reminder-time-${r.key}`} />
                <button onClick={() => updateReminder(r.key, { on: !r.on })} data-testid={`reminder-toggle-${r.key}`} className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${r.on ? "bg-brand-green" : "bg-brand-line"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${r.on ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-brand-muted mt-4 flex items-start gap-1.5">
            <BellOff className="w-4 h-4 shrink-0 mt-0.5" />
            {subscribed
              ? "Recibirás estas notificaciones a la hora indicada, incluso con la app cerrada. Instala la app en tu celular para no perdértelas."
              : "Activa las notificaciones para recibir recordatorios a las horas que elijas, aunque tengas la app cerrada."}
          </p>
        </div>
      </div>
    </div>
  );
}
