import { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, Flame, Info, CalendarDays, ArrowRight } from "lucide-react";

const ACTIVIDADES = [
  { id: "1.2", label: "Sedentario (poco o nada de ejercicio)" },
  { id: "1.375", label: "Ligero (ejercicio 1-3 días/semana)" },
  { id: "1.55", label: "Moderado (ejercicio 3-5 días/semana)" },
  { id: "1.725", label: "Activo (ejercicio 6-7 días/semana)" },
  { id: "1.9", label: "Muy activo (trabajo físico o 2x/día)" },
];

export default function Calculadora() {
  const [sexo, setSexo] = useState("hombre");
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [actividad, setActividad] = useState("1.55");
  const [objetivo, setObjetivo] = useState("mantener");
  const [res, setRes] = useState(null);

  const calcular = (e) => {
    e.preventDefault();
    const p = parseFloat(peso), a = parseFloat(altura), ed = parseFloat(edad), f = parseFloat(actividad);
    if (!p || !a || !ed) return;
    const s = sexo === "hombre" ? 5 : -161;
    const bmr = 10 * p + 6.25 * a - 5 * ed + s;
    const tdee = bmr * f;
    const objetivos = {
      mantener: Math.round(tdee),
      bajar: Math.round(tdee * 0.85),
      subir: Math.round(tdee * 1.15),
    };
    const cal = objetivos[objetivo];
    const macros = {
      proteinas: Math.round((cal * 0.30) / 4),
      carbohidratos: Math.round((cal * 0.40) / 4),
      grasas: Math.round((cal * 0.30) / 9),
    };
    const out = { bmr: Math.round(bmr), tdee: Math.round(tdee), objetivos, cal, macros };
    setRes(out);
    localStorage.setItem("sn_calorias", JSON.stringify(out));
  };

  const inputCls = "w-full mt-1 px-3 py-2.5 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-sm";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-11 h-11 rounded-xl bg-brand-green text-white flex items-center justify-center"><Calculator className="w-6 h-6" /></span>
        <div><p className="eyebrow">Herramienta diaria</p><h1 className="font-serif text-4xl font-bold text-brand-ink">Calculadora de Calorías</h1></div>
      </div>
      <p className="text-brand-muted mb-8 max-w-2xl">Calcula tu requerimiento calórico diario estimado según tus datos y objetivo.</p>

      <div className="grid lg:grid-cols-2 gap-8">
        <form onSubmit={calcular} className="bg-white rounded-2xl border border-brand-line p-6" data-testid="calc-form">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">Sexo</label>
              <div className="flex gap-2 mt-1">
                {["hombre", "mujer"].map((sx) => (
                  <button type="button" key={sx} onClick={() => setSexo(sx)} data-testid={`calc-sexo-${sx}`}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize transition-colors ${sexo === sx ? "border-brand-green bg-brand-greenLight text-brand-green" : "border-brand-line text-brand-muted hover:bg-brand-sand"}`}>{sx}</button>
                ))}
              </div>
            </div>
            <div><label className="text-sm font-medium">Edad (años)</label><input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} className={inputCls} data-testid="calc-edad" required /></div>
            <div><label className="text-sm font-medium">Peso (kg)</label><input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} className={inputCls} data-testid="calc-peso" required /></div>
            <div><label className="text-sm font-medium">Estatura (cm)</label><input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} className={inputCls} data-testid="calc-altura" required /></div>
            <div><label className="text-sm font-medium">Objetivo</label>
              <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className={inputCls} data-testid="calc-objetivo">
                <option value="bajar">Bajar de peso</option>
                <option value="mantener">Mantener peso</option>
                <option value="subir">Subir de peso</option>
              </select>
            </div>
            <div className="col-span-2"><label className="text-sm font-medium">Nivel de actividad</label>
              <select value={actividad} onChange={(e) => setActividad(e.target.value)} className={inputCls} data-testid="calc-actividad">
                {ACTIVIDADES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" data-testid="calc-submit" className="w-full mt-5 py-3 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover transition-all flex items-center justify-center gap-2"><Calculator className="w-4 h-4" /> Calcular</button>
        </form>

        <div>
          {res ? (
            <div className="bg-white rounded-2xl border border-brand-line p-6" data-testid="calc-result">
              <p className="text-sm text-brand-muted">Tu requerimiento estimado para <span className="font-semibold text-brand-ink">{objetivo === "bajar" ? "bajar de peso" : objetivo === "subir" ? "subir de peso" : "mantener tu peso"}</span></p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-5xl font-serif font-bold text-brand-green" data-testid="calc-calorias">{res.cal}</span>
                <span className="text-brand-muted mb-2">kcal / día</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                {[["Proteínas", res.macros.proteinas], ["Carbohidratos", res.macros.carbohidratos], ["Grasas", res.macros.grasas]].map(([l, v]) => (
                  <div key={l} className="bg-brand-sand rounded-xl px-3 py-3 text-center">
                    <p className="text-xl font-serif font-bold text-brand-ink">{v}<span className="text-xs text-brand-muted font-sans"> g</span></p>
                    <p className="text-[11px] text-brand-muted mt-0.5">{l}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-1.5 text-sm text-brand-muted border-t border-brand-line pt-4">
                <div className="flex justify-between"><span>Metabolismo basal (BMR)</span><span className="font-medium text-brand-ink">{res.bmr} kcal</span></div>
                <div className="flex justify-between"><span>Gasto total diario (TDEE)</span><span className="font-medium text-brand-ink">{res.tdee} kcal</span></div>
                <div className="flex justify-between"><span>Mantener</span><span>{res.objetivos.mantener} kcal</span></div>
                <div className="flex justify-between"><span>Bajar de peso</span><span>{res.objetivos.bajar} kcal</span></div>
                <div className="flex justify-between"><span>Subir de peso</span><span>{res.objetivos.subir} kcal</span></div>
              </div>

              <Link to="/mi-menu" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline"><CalendarDays className="w-4 h-4" /> Crear mi menú semanal <ArrowRight className="w-4 h-4" /></Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-brand-line p-8 text-center text-brand-muted h-full flex flex-col items-center justify-center">
              <Flame className="w-12 h-12 opacity-40 mb-3" />
              <p>Completa tus datos y presiona "Calcular" para ver tu estimación.</p>
            </div>
          )}

          <div className="mt-5 flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4" data-testid="calc-disclaimer">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">Esta es una <strong>estimación orientativa</strong> basada en la fórmula Mifflin-St Jeor, no una prescripción médica. Si tienes una enfermedad (diabetes, hipertensión u otra), consulta siempre con tu médico o nutricionista antes de cambiar tu alimentación.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
