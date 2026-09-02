import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { RecipeCard } from "@/components/RecipeCard";
import { Activity, Scale, Apple, Sprout, Search, FileText, CheckCircle2, ArrowRight, Star, Clock, ShieldCheck } from "lucide-react";

const CAT_ICON = { diabeticos: Activity, bajar_peso: Scale, comida_saludable: Apple, veganos: Sprout };

export default function Landing() {
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
              Cientos de recetas para diabéticos, control de peso, comida saludable y veganos. Con ingredientes, paso a paso, tiempos y utensilios. Todo por <span className="font-semibold text-brand-ink">S/ 15.00 al mes</span>.
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
              <p className="text-3xl font-serif font-bold text-brand-green">S/ 15<span className="text-base text-brand-muted">/mes</span></p>
              <p className="text-xs text-brand-muted">Acceso ilimitado</p>
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
              { icon: FileText, t: "2. Suscríbete por S/ 15", d: "Paga con Yape, Plin, BCP o BBVA y sube tu comprobante." },
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
            <p className="eyebrow text-brand-gold">Suscripción mensual</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold mt-3 text-white">Solo S/ 15.00 al mes</h2>
            <p className="text-brand-cream/80 mt-4 max-w-xl mx-auto">Acceso ilimitado a todas nuestras recetas saludables, actualizadas mes a mes. Cancela cuando quieras.</p>
            <Link to="/register" data-testid="pricing-cta-register" className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-full bg-brand-terracotta text-white font-semibold hover:scale-[1.03] transition-transform">
              Suscribirme ahora <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
