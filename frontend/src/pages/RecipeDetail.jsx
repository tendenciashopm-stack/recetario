import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, resolveImg, CATEGORY_META } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Clock, Timer, UtensilsCrossed, ChefHat, Lock, ArrowLeft, Loader2, Flame, Users, CheckCircle2, ArrowRight } from "lucide-react";

export default function RecipeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    setLoading(true);
    api.get(`/recipes/${id}`).then((r) => setRecipe(r.data)).catch(() => setRecipe(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>;
  if (!recipe) return <div className="py-32 text-center text-brand-muted">Receta no encontrada. <Link to="/recetas" className="text-brand-green underline">Volver</Link></div>;

  const meta = CATEGORY_META[recipe.categoria] || { label: recipe.categoria, cls: "bg-stone-100 text-stone-700" };
  const locked = recipe.locked;
  const nut = recipe.nutricion || {};

  return (
    <div>
      {/* header image */}
      <div className="relative h-[42vh] min-h-[320px] bg-brand-sand">
        {recipe.imagen_url ? (
          <img src={resolveImg(recipe.imagen_url)} alt={recipe.nombre_plato} className="w-full h-full object-cover" />
        ) : <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-16 h-16 text-brand-muted" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 pb-8">
          <button onClick={() => navigate(-1)} className="text-white/90 text-sm flex items-center gap-1 mb-4 hover:text-white"><ArrowLeft className="w-4 h-4" /> Volver</button>
          <span className={`text-xs px-3 py-1 rounded-full border font-medium ${meta.cls}`}>{meta.label}</span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mt-3 max-w-3xl leading-tight">{recipe.nombre_plato}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
        <p className="text-lg text-brand-muted leading-relaxed max-w-3xl">{recipe.descripcion}</p>

        {/* meta stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { icon: Clock, label: "Preparación", val: recipe.tiempo_preparacion },
            { icon: Timer, label: "Cocción", val: recipe.tiempo_coccion },
            { icon: Flame, label: "Dificultad", val: recipe.dificultad },
            { icon: Users, label: "Porciones", val: recipe.porciones },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-brand-line p-5">
              <s.icon className="w-5 h-5 text-brand-terracotta" />
              <p className="text-xs text-brand-muted mt-3 uppercase tracking-wide">{s.label}</p>
              <p className="font-semibold text-brand-ink mt-0.5">{s.val || "—"}</p>
            </div>
          ))}
        </div>

        {locked ? (
          <div className="mt-12 rounded-[2rem] border border-brand-line bg-brand-greenLight p-10 sm:p-14 text-center" data-testid="recipe-locked-panel">
            <span className="w-16 h-16 rounded-2xl bg-brand-green text-white flex items-center justify-center mx-auto"><Lock className="w-8 h-8" /></span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-ink mt-6">Receta completa exclusiva para suscriptores</h2>
            <p className="text-brand-muted mt-3 max-w-lg mx-auto">Suscríbete por solo S/ 15.00 al mes para ver los ingredientes, el modo de preparación paso a paso, el emplatado y la información nutricional.</p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {user ? (
                <Link to="/suscripcion" data-testid="recipe-subscribe-cta" className="px-7 py-3.5 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover transition-all hover:scale-[1.02] flex items-center gap-2">Suscribirme <ArrowRight className="w-4 h-4" /></Link>
              ) : (
                <>
                  <Link to="/register" data-testid="recipe-register-cta" className="px-7 py-3.5 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover transition-all">Crear cuenta</Link>
                  <Link to="/login" className="px-7 py-3.5 rounded-full border border-brand-line bg-white font-semibold hover:bg-brand-sand">Ya tengo cuenta</Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-10 mt-12">
            {/* ingredientes */}
            <div className="lg:col-span-1">
              <h2 className="font-serif text-2xl font-bold text-brand-ink flex items-center gap-2"><ChefHat className="w-6 h-6 text-brand-green" /> Ingredientes</h2>
              <ul className="mt-5 space-y-2" data-testid="recipe-ingredients">
                {(recipe.ingredientes || []).map((ing, i) => (
                  <li key={i}>
                    <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-brand-sand cursor-pointer transition-colors">
                      <input type="checkbox" checked={!!checked[i]} onChange={() => setChecked({ ...checked, [i]: !checked[i] })} className="mt-1 w-4 h-4 accent-brand-green" />
                      <span className={`text-sm ${checked[i] ? "line-through text-brand-muted" : "text-brand-ink"}`}>{ing}</span>
                    </label>
                  </li>
                ))}
              </ul>

              {recipe.utensilios?.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-sans font-bold text-brand-ink flex items-center gap-2"><UtensilsCrossed className="w-5 h-5 text-brand-terracotta" /> Utensilios</h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {recipe.utensilios.map((u, i) => <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-brand-terracottaLight text-brand-terracotta font-medium">{u}</span>)}
                  </div>
                </div>
              )}

              {(nut.calorias || nut.proteinas) && (
                <div className="mt-8 bg-white rounded-2xl border border-brand-line p-5">
                  <h3 className="font-sans font-bold text-brand-ink mb-3">Información Nutricional</h3>
                  <div className="space-y-2 text-sm">
                    {[["Calorías", nut.calorias], ["Proteínas", nut.proteinas], ["Carbohidratos", nut.carbohidratos], ["Grasas", nut.grasas], ["Fibra", nut.fibra]].map(([k, v]) => v ? (
                      <div key={k} className="flex justify-between border-b border-brand-line/60 pb-1.5"><span className="text-brand-muted">{k}</span><span className="font-medium text-brand-ink">{v}</span></div>
                    ) : null)}
                  </div>
                </div>
              )}
            </div>

            {/* preparacion */}
            <div className="lg:col-span-2">
              <h2 className="font-serif text-2xl font-bold text-brand-ink">Modo de Preparación</h2>
              <ol className="mt-6 space-y-6" data-testid="recipe-steps">
                {(recipe.preparacion || []).map((step, i) => (
                  <li key={i} className="flex gap-4" data-testid={`recipe-step-${i}`}>
                    <span className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-green text-white flex items-center justify-center font-semibold font-mono text-sm">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-brand-ink leading-relaxed pt-1">{step}</p>
                      {recipe.pasos_imagenes?.[i] && (
                        <img src={resolveImg(recipe.pasos_imagenes[i])} alt={`Paso ${i + 1}`} loading="lazy"
                          data-testid={`recipe-step-img-${i}`}
                          className="mt-3 w-full max-w-sm rounded-2xl border border-brand-line shadow-sm object-cover" />
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {recipe.pasos_imagenes?.length > (recipe.preparacion?.length || 0) && (
                <div className="mt-8">
                  <h3 className="font-sans font-bold text-brand-ink mb-3">Más fotos del proceso</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {recipe.pasos_imagenes.slice(recipe.preparacion?.length || 0).map((img, i) => (
                      <img key={i} src={resolveImg(img)} alt={`Proceso ${i + 1}`} loading="lazy" className="w-full aspect-square object-cover rounded-xl border border-brand-line" />
                    ))}
                  </div>
                </div>
              )}

              {recipe.emplatado && (
                <div className="mt-10 rounded-2xl bg-brand-greenLight border border-brand-green/20 p-6">
                  <h3 className="font-serif text-xl font-bold text-brand-green flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Emplatado y Servido</h3>
                  <p className="text-brand-ink mt-3 leading-relaxed">{recipe.emplatado}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
