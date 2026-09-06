import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, resolveImg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { RecipeCard } from "@/components/RecipeCard";
import { Activity, Scale, Apple, Sprout, Search, FileText, CheckCircle2, ArrowRight, Star, Clock, ShieldCheck, Droplets, Flame, CalendarDays } from "lucide-react";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function MemberPanel() {
  const { user } = useAuth();
  const [water, setWater] = useState(null);
  const [menu, setMenu] = useState(null);
  const active = user && (user.role === "admin" || user.subscription_status === "active");

  useEffect(() => {
    if (!active) return;
    api.get("/water").then((r) => setWater(r.data)).catch(() => {});
    api.get("/menu").then((r) => setMenu(r.data && r.data.dias ? r.data : null)).catch(() => {});
  }, [active]);

  if (!active) return null;

  const meta = Number(localStorage.getItem("sn_agua_meta") || 8);
  let cal = null;
  try { cal = JSON.parse(localStorage.getItem("sn_calorias") || "null"); } catch {}
  const hoy = WEEKDAYS[new Date().getDay()];
  const menuHoy = menu?.dias?.find((d) => d.dia === hoy);

  return (
    <section className="bg-brand-green text-white" data-testid="member-daily-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <p className="eyebrow text-brand-gold">Hola, {user.name?.split(" ")[0]} · Tu día de hoy ({hoy})</p>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <Link to="/bienestar" className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-5 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-brand-cream/80 text-sm"><Droplets className="w-4 h-4" /> Agua de hoy</div>
            <p className="text-3xl font-serif font-bold mt-2">{water?.vasos ?? 0}<span className="text-base text-brand-cream/70"> / {meta} vasos</span></p>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden mt-3"><div className="h-full bg-sky-300" style={{ width: `${Math.min(100, ((water?.vasos || 0) / meta) * 100)}%` }} /></div>
          </Link>

          <Link to="/calculadora" className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-5 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-brand-cream/80 text-sm"><Flame className="w-4 h-4" /> Meta de calorías</div>
            <p className="text-3xl font-serif font-bold mt-2">{cal?.cal ? `${cal.cal}` : "—"}<span className="text-base text-brand-cream/70"> kcal/día</span></p>
            <p className="text-xs text-brand-cream/70 mt-3">{cal?.cal ? "Según tu calculadora" : "Calcula tu requerimiento"}</p>
          </Link>

          <Link to="/mi-menu" className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-5 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-brand-cream/80 text-sm"><CalendarDays className="w-4 h-4" /> Menú de hoy</div>
            {menuHoy ? (
              <ul className="mt-2 space-y-0.5">
                {menuHoy.comidas.map((c, i) => (
                  <li key={i} className="text-sm truncate"><span className="text-brand-gold font-mono text-[11px] uppercase mr-1">{c.tipo}</span>{c.nombre}</li>
                ))}
              </ul>
            ) : <p className="text-sm text-brand-cream/70 mt-2">Genera tu menú semanal →</p>}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LandingWrapper() {
  return (<><MemberPanel /><Landing /></>);
}


const CAT_ICON = { diabeticos: Activity, bajar_peso: Scale, comida_saludable: Apple, veganos: Sprout };

function Landing() {
  const [categories, setCategories] = useState([]);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
    api.get("/recipes", { params: { limit: 6 } }).then((r) => setRecipes(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grain" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center relative">
          <div className="fade-up">
            <p className="eyebrow">Recetas saludables · Perú</p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-ink leading-[1.1] mt-4">
              Come <span className="text-brand-green">saludable</span>, siéntete <span className="text-brand-terracotta">increíble</span>.
            </h1>
            <p className="text-lg text-brand-muted mt-6 max-w-lg leading-relaxed">
              Cientos de recetas para diabéticos, control de peso, comida saludable y veganos. Con ingredientes, paso a paso, tiempos y utensilios. Todo en un solo lugar.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/register" data-testid="hero-cta-register" className="px-7 py-3.5 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover transition-all hover:scale-[1.02] flex items-center gap-2">
                Empezar ahora <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/recetas" data-testid="hero-cta-recipes" className="px-7 py-3.5 rounded-full border border-brand-line bg-white font-semibold hover:bg-brand-sand transition-colors flex items-center gap-2">
                <Search className="w-4 h-4" /> Explorar recetas
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-10 text-sm text-brand-muted">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand-green" /> Pago seguro</span>
              <span className="flex items-center gap-2"><Star className="w-4 h-4 text-brand-gold" /> Recetas verificadas</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-terracotta" /> Actualizado cada mes</span>
            </div>
          </div>
          <div className="relative fade-up" style={{ animationDelay: "150ms" }}>
            <div className="rounded-[2rem] overflow-hidden shadow-2xl rotate-1">
              <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" alt="Plato saludable" className="w-full h-[460px] object-cover" />
            </div>
            <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-xl p-4 border border-brand-line hidden sm:block">
              <p className="text-2xl font-serif font-bold text-brand-green leading-tight">Recetas<br/>saludables</p>
              <p className="text-xs text-brand-muted mt-1">Acceso ilimitado</p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="text-center mb-10">
          <p className="eyebrow">Categorías</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-brand-ink mt-2">Recetas para cada objetivo</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((c, i) => {
            const Icon = CAT_ICON[c.id] || Apple;
            return (
              <Link key={c.id} to={`/recetas?categoria=${c.id}`} data-testid={`category-card-${c.id}`}
                className="group bg-white rounded-2xl border border-brand-line p-6 hover:-translate-y-1 hover:shadow-lg transition-all fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                <span className="w-12 h-12 rounded-xl bg-brand-greenLight flex items-center justify-center text-brand-green group-hover:bg-brand-green group-hover:text-white transition-colors">
                  <Icon className="w-6 h-6" />
                </span>
                <h3 className="font-sans font-bold text-brand-ink mt-4 text-lg">{c.label}</h3>
                <p className="text-sm text-brand-muted mt-1 leading-relaxed">{c.description}</p>
                <p className="text-xs font-mono text-brand-terracotta mt-3">{c.count} recetas</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="eyebrow">Destacadas</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-brand-ink mt-2">Recetas populares</h2>
          </div>
          <Link to="/recetas" className="text-brand-green font-semibold text-sm hover:underline flex items-center gap-1">Ver todas <ArrowRight className="w-4 h-4" /></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((r, i) => <RecipeCard key={r.id} recipe={r} index={i} />)}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-brand-sand py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-12">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-brand-ink mt-2">Empieza en 3 pasos simples</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: CheckCircle2, t: "1. Crea tu cuenta", d: "Regístrate gratis con tu correo en menos de un minuto." },
              { icon: FileText, t: "2. Suscríbete", d: "Paga con Yape, Plin, BCP o BBVA y sube tu comprobante." },
              { icon: Search, t: "3. Cocina saludable", d: "Busca recetas y sigue el paso a paso con tiempos y utensilios." },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-brand-line p-8 text-center">
                <span className="w-14 h-14 rounded-2xl bg-brand-green text-white flex items-center justify-center mx-auto"><s.icon className="w-7 h-7" /></span>
                <h3 className="font-sans font-bold text-lg text-brand-ink mt-5">{s.t}</h3>
                <p className="text-sm text-brand-muted mt-2 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-20">
        <div className="rounded-[2rem] bg-brand-green text-white p-10 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 grain opacity-40" />
          <div className="relative">
            <p className="eyebrow text-brand-gold">Suscripción</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold mt-3 text-white">Recetas saludables ilimitadas</h2>
            <p className="text-brand-cream/80 mt-4 max-w-xl mx-auto">Accede a todas nuestras recetas saludables, actualizadas mes a mes. Suscríbete y empieza hoy.</p>
            <Link to="/register" data-testid="pricing-cta-register" className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-full bg-brand-terracotta text-white font-semibold hover:scale-[1.03] transition-transform">
              Suscribirme ahora <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
