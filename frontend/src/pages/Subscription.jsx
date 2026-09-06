import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Smartphone, Building2, Upload, CheckCircle2, Clock, Loader2, CreditCard, Copy } from "lucide-react";

const METHODS = [
  { id: "yape", label: "Yape", icon: Smartphone, color: "bg-purple-100 text-purple-700" },
  { id: "plin", label: "Plin", icon: Smartphone, color: "bg-cyan-100 text-cyan-700" },
  { id: "bcp", label: "BCP", icon: Building2, color: "bg-orange-100 text-orange-700" },
  { id: "bbva", label: "BBVA", icon: Building2, color: "bg-blue-100 text-blue-700" },
];

export default function Subscription() {
  const { user, refresh } = useAuth();
  const [settings, setSettings] = useState(null);
  const [sub, setSub] = useState(null);
  const [method, setMethod] = useState("yape");
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState("1m");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadSub = () => api.get("/subscription/me").then((r) => setSub(r.data)).catch(() => {});
  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
    api.get("/plans").then((r) => setPlans(r.data.plans || [])).catch(() => {});
    loadSub();
  }, []);

  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Copiado al portapapeles"); };
  const selectedPlan = plans.find((p) => p.id === plan);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Sube tu comprobante de pago"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("metodo", method);
      fd.append("plan", plan);
      fd.append("file", file);
      await api.post("/subscription/pay", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("¡Comprobante enviado! Un administrador validará tu pago pronto.");
      setFile(null);
      await loadSub();
      await refresh();
    } catch (err) {
      toast.error("No se pudo enviar el comprobante. Inténtalo de nuevo.");
    } finally { setUploading(false); }
  };

  const status = user?.subscription_status;
  const m = settings ? settings[method] || {} : {};

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <p className="eyebrow">Suscripción mensual</p>
      <h1 className="font-serif text-4xl font-bold text-brand-ink mt-2">Planes y Pago</h1>

      {/* status banner */}
      <div className="mt-6 mb-10" data-testid="subscription-status-banner">
        {status === "active" ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div><p className="font-semibold text-emerald-800">Suscripción Activa</p>
              <p className="text-sm text-emerald-700">Tienes acceso completo a todas las recetas{sub?.expires_at ? ` hasta el ${new Date(sub.expires_at).toLocaleDateString("es-PE")}` : ""}.</p></div>
          </div>
        ) : status === "pending" ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-600" />
            <div><p className="font-semibold text-amber-800">Pago en revisión</p>
              <p className="text-sm text-amber-700">Tu comprobante fue enviado. Un administrador lo validará pronto.</p></div>
          </div>
        ) : (
          <div className="rounded-2xl bg-brand-greenLight border border-brand-green/20 p-5 flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-brand-green" />
            <div><p className="font-semibold text-brand-ink">Sin suscripción activa</p>
              <p className="text-sm text-brand-muted">Elige un plan, realiza el pago y sube tu comprobante para activar tu acceso.</p></div>
          </div>
        )}
      </div>

      {/* plan selection */}
      <div className="mb-10" data-testid="plan-selection">
        <h2 className="font-serif text-2xl font-bold text-brand-ink mb-1">Elige tu plan</h2>
        <p className="text-sm text-brand-muted mb-4">Acceso renovable. Al renovar, los días se suman a los que ya tienes.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {plans.map((p) => {
            const active = plan === p.id;
            const saving = 10 * p.meses - parseFloat(p.monto);
            return (
              <button key={p.id} type="button" onClick={() => setPlan(p.id)} data-testid={`plan-${p.id}`}
                className={`relative text-left rounded-2xl border-2 p-5 transition-all ${active ? "border-brand-green bg-brand-greenLight shadow-md" : "border-brand-line bg-white hover:border-brand-green/40"}`}>
                {saving > 0 && <span className="absolute -top-2.5 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-terracotta text-white">Ahorra S/ {saving}</span>}
                <p className="font-serif text-lg font-bold text-brand-ink">{p.label}</p>
                <p className="text-3xl font-serif font-bold text-brand-green mt-1">S/ {p.monto}</p>
                <p className="text-xs text-brand-muted mt-1">{p.dias} días de acceso</p>
                <span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${active ? "text-brand-green" : "text-brand-muted"}`}>
                  <CheckCircle2 className="w-4 h-4" /> {active ? "Seleccionado" : "Elegir"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* payment info */}
        <div className="bg-white rounded-2xl border border-brand-line p-7">
          <h2 className="font-serif text-2xl font-bold text-brand-ink">1. Realiza el pago</h2>
          <p className="text-3xl font-serif font-bold text-brand-green mt-2">S/ {selectedPlan?.monto || settings?.precio || "10.00"} <span className="text-base text-brand-muted font-sans">· {selectedPlan?.label || "1 mes"}</span></p>

          <div className="flex gap-2 mt-6">
            {METHODS.map((mt) => (
              <button key={mt.id} onClick={() => setMethod(mt.id)} data-testid={`payment-method-${mt.id}`}
                className={`flex-1 py-3 rounded-xl border font-semibold text-sm transition-all ${method === mt.id ? "border-brand-green bg-brand-greenLight text-brand-green" : "border-brand-line text-brand-muted hover:bg-brand-sand"}`}>
                {mt.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3 text-sm" data-testid="payment-details">
            {m.numero && <InfoRow label="Número" value={m.numero} onCopy={copy} />}
            {m.cuenta && <InfoRow label="Cuenta" value={m.cuenta} onCopy={copy} />}
            {m.cci && <InfoRow label="CCI" value={m.cci} onCopy={copy} />}
            {m.titular && <InfoRow label="Titular" value={m.titular} onCopy={copy} />}
          </div>
          {settings?.instrucciones && <p className="text-xs text-brand-muted mt-5 leading-relaxed bg-brand-sand p-3 rounded-xl">{settings.instrucciones}</p>}
        </div>

        {/* upload proof */}
        <form onSubmit={submit} className="bg-white rounded-2xl border border-brand-line p-7">
          <h2 className="font-serif text-2xl font-bold text-brand-ink">2. Sube tu comprobante</h2>
          <p className="text-sm text-brand-muted mt-2">Adjunta una captura o foto de tu pago (JPG, PNG o PDF).</p>

          <label className="mt-5 block border-2 border-dashed border-brand-line rounded-2xl p-8 text-center cursor-pointer hover:border-brand-green hover:bg-brand-sand transition-colors">
            <input type="file" accept="image/*,application/pdf" className="hidden" data-testid="payment-proof-file-input" onChange={(e) => setFile(e.target.files[0])} />
            <Upload className="w-8 h-8 mx-auto text-brand-muted" />
            <p className="text-sm mt-3 text-brand-ink font-medium">{file ? file.name : "Haz clic para seleccionar tu comprobante"}</p>
          </label>

          <button type="submit" disabled={uploading} data-testid="payment-submit-btn"
            className="w-full mt-6 py-3.5 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Enviar comprobante
          </button>
        </form>
      </div>

      {sub?.payments?.length > 0 && (
        <div className="mt-10">
          <h3 className="font-serif text-xl font-bold text-brand-ink mb-4">Historial de pagos</h3>
          <div className="space-y-2">
            {sub.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-brand-line px-5 py-3 text-sm">
                <span className="font-medium capitalize">{p.metodo}{p.plan_label ? ` · ${p.plan_label} (S/ ${p.monto})` : ""}</span>
                <span className="text-brand-muted">{new Date(p.created_at).toLocaleDateString("es-PE")}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.status === "approved" ? "bg-emerald-100 text-emerald-700" : p.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {p.status === "approved" ? "Aprobado" : p.status === "rejected" ? "Rechazado" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, onCopy }) {
  return (
    <div className="flex items-center justify-between bg-brand-sand rounded-xl px-4 py-3">
      <div><span className="text-xs text-brand-muted uppercase tracking-wide">{label}</span><p className="font-semibold text-brand-ink">{value}</p></div>
      <button type="button" onClick={() => onCopy(value)} className="text-brand-green hover:opacity-70"><Copy className="w-4 h-4" /></button>
    </div>
  );
}
