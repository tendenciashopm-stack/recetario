import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ShoppingCart, Loader2, CalendarDays, RefreshCw, Check } from "lucide-react";

export default function Compras() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState({});

  const load = () => {
    setLoading(true);
    api.get("/menu/shopping-list").then((r) => setItems(r.data.items || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    try { setChecked(JSON.parse(localStorage.getItem("sn_compras") || "{}")); } catch {}
  }, []);

  const toggle = (it) => {
    const next = { ...checked, [it]: !checked[it] };
    setChecked(next);
    localStorage.setItem("sn_compras", JSON.stringify(next));
  };

  const done = items.filter((i) => checked[i]).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-11 h-11 rounded-xl bg-brand-terracotta text-white flex items-center justify-center"><ShoppingCart className="w-6 h-6" /></span>
        <div><p className="eyebrow">Lista automática</p><h1 className="font-serif text-4xl font-bold text-brand-ink">Compras</h1></div>
      </div>
      <p className="text-brand-muted mb-8">Todos los ingredientes de tu menú semanal en una sola lista.</p>

      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-brand-muted bg-white rounded-2xl border border-dashed border-brand-line">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="mb-4">Primero genera tu menú semanal para crear tu lista de compras.</p>
          <Link to="/mi-menu" className="inline-block px-6 py-3 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover">Ir a Mi Menú</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-line overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-line bg-brand-sand/50">
            <span data-testid="compras-progress" className="text-sm font-medium text-brand-ink">{done} / {items.length} comprados</span>
            <button onClick={load} className="text-sm text-brand-green flex items-center gap-1 hover:underline"><RefreshCw className="w-4 h-4" /> Actualizar</button>
          </div>
          <ul className="divide-y divide-brand-line">
            {items.map((it, i) => (
              <li key={i}>
                <label data-testid={`compras-item-${i}`} className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-brand-sand transition-colors">
                  <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${checked[it] ? "bg-brand-green border-brand-green" : "border-brand-line"}`}>{checked[it] && <Check className="w-3.5 h-3.5 text-white" />}</span>
                  <input type="checkbox" className="hidden" checked={!!checked[it]} onChange={() => toggle(it)} />
                  <span className={`text-sm ${checked[it] ? "line-through text-brand-muted" : "text-brand-ink"}`}>{it}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
